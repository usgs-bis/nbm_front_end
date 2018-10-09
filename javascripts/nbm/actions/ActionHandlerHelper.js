'use strict';

/**
 * This is the main object used in directing which actions are triggered, based on what layers are turned on in
 * the bioscape.
 * @constructor
 */
var ActionHandlerHelper = function () {
    this.marker = undefined;
    this.enabledActions = [];
    this.additionalParams = [];
    this.submitPolygonButton = undefined;
    this.sc = new SynthesisComposition();
    this.featureList = [];
    this.allBaps = {};
    this.state = {};
    this.canDownloadPdf = false;
    this.headerSent = false;
    this.crossoverBaps = [];
    this.bufferedFeature = null;
};

/**
 * Update the lat lng display.
 * @param {Object} actionConfig - the config json in the bioscape json for the specified layer
 * @param {Object} layer - The layer object associated with the specified action
 */
ActionHandlerHelper.prototype.createActionHandler = function (actionConfig, layer) {
    if (actionConfig.actionType == "identify") {
        return new IdentifyActionHandler(actionConfig, layer);
    } else  if (actionConfig.actionType == "getFeature") {
        return new GetFeatureActionHandler(actionConfig, layer);
    } else if (actionConfig.actionType == "getFeatureGeojson") {
        return new GetFeatureGeojsonActionHandler(actionConfig, layer);
    } else if (actionConfig.actionType == "drawPolygon") {
        this.addDrawCapability();
        return new DrawPolygonActionHandler(actionConfig, layer);
    } else if (actionConfig.actionType == "none") {
        return new ActionHandler(actionConfig, layer,true)
    }
    return new ActionHandler(actionConfig, layer);
};

/**
 * If the draw capability hasn't been added to the map, this function is used to add it
 */
ActionHandlerHelper.prototype.addDrawCapability = function () {
    var that = this;
    if (!drawnItems) {
        $("#mapControlContainer").append(getHtmlFromJsRenderTemplate('drawPolygon'));//add the controls
        var controls = $('#polygonControls');
        controls.on('hide.bs.dropdown', function(e) {
            if(drawing) {
                e.preventDefault();
            }
        });

        //Create the object to store the drawn polygon and add it to the map
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        //The 'drawing' boolean is a global variable used to prevent the click from propagating to the map if the user
        //is currently drawing
        map.on(L.Draw.Event.CREATED, function (event) {
            controls.removeClass('open');//closes the dropdown options for drawing
            var layer = event.layer;

            drawnItems.addLayer(layer);

            //that.showTempPopup("Click the \"Submit\" button at the top to submit this polygon for analysis.");
            that.canDownloadPdf = false;
            that.handleDrawPolygonActions()
                .then(function () {
                    that.canDownloadPdf = true;
                });
        });

        map.on(L.Draw.Event.DRAWSTART, function () {
            drawing = true;
            that.cleanUpDrawnPolygons();
            that.cleanUp(false);
        });

        map.on(L.Draw.Event.DRAWSTOP, function () {
            setTimeout(function() {
                drawing = false;
            }, 500);
        });

        let lastAdded = 1000;
        map.on(L.Draw.Event.DRAWVERTEX, function () {
            lastAdded = new Date();
        });
        $(".leaflet-control-zoom-in,.leaflet-control-zoom-out").on("click", function(e) {
            let delta = new Date() - lastAdded;
            if (delta < 500) {
                $("#deletePoint").click();
            }
        });

        this.initializeSubmitButton();
    }
};

/**
 * Create and show the submit button. The button is shown only if there are layers turned on with the "drawPolygon" action
 */
ActionHandlerHelper.prototype.initializeSubmitButton = function () {
    var polygonDraw = new L.Draw.Polygon(map, {
        allowIntersection: false,
        showArea: true
    });

    $('#polygonDropdown').on('click', function() {
        polygonDraw.enable();
    });
    $('#finishPolygon').on('click', function() {
        polygonDraw.completeShape();
    });
    $('#deletePoint').on('click', function() {
        polygonDraw.deleteLastVertex();
    });
    $('#cancelPolygonDraw').on('click', function() {
        polygonDraw.disable();
    });

    var that = this;
    $('#submitPolygon').on('click', function () {
        that.canDownloadPdf = false;
        that.handleDrawPolygonActions()
            .then(function () {
                that.canDownloadPdf = true;
            });
    });
};

ActionHandlerHelper.prototype.getSearhActionHandler = function () {

    let searchAH = actionHandlers.filter(ah => ah.type == "searchPoi" )
    if(searchAH.length) return searchAH[0]
    return null
}

/**
 * When a polygon is submitted, trigger the actions for all enabled "drawPolygon" action handlers
 */
ActionHandlerHelper.prototype.handleDrawPolygonActions = function () {
    if (!drawnItems || !drawnItems.getLayers().length) return Promise.resolve();
    this.headerSent = false;
    this.cleanUp(false, true);

    this.populateBottomBarWithClick();
    this.initializeRightPanel();
    var promises = [];

    $("#synthesisCompositionTitle").html('')
    $.each(actionHandlers, function (index, actionHandler) {
        if (actionHandler.type == "drawPolygon" ) { //&& map.hasLayer(actionHandler.layer.leafletLayer)
            if (!actionHandler.headerBap) {
                promises.push(actionHandler.sendTriggerAction(false));
            } else {
                if($("#HeaderBap" + index).length == 0){
                    $("#synthesisCompositionTitle").append("<div id='HeaderBap" + index + "'></div>");
                }
                promises.push(actionHandler.sendTriggerAction(true, "HeaderBap" + index));
            }
        }
    });

    return Promise.all(promises);
};


ActionHandlerHelper.prototype.initPOISearch = function (search){
    let searchHandler = actionHandlers.filter(h =>{
        return h.type == "searchPoi"
    })[0]
    searchHandler.poi.getSelectedGeometry(search)
}

/**
 * When a Search is submitted, trigger the actions for all enabled "searchPoi" action handlers
 */
ActionHandlerHelper.prototype.handleSearchActions = function (geojson) {
    this.headerSent = false;
    this.cleanUp(false, false);
    this.canDownloadPdf = false;
    this.populateBottomBarWithClick();
    this.initializeRightPanel();
    var promises = [];

    $.each(actionHandlers, function (index, actionHandler) {
        if (actionHandler.type == "searchPoi") {
            if (!actionHandler.headerBap) {
                promises.push(actionHandler.sendTriggerAction(false, undefined, geojson));
            } else {
                $("#synthesisCompositionTitle").html("<div id='HeaderBap" + index + "'></div>");
                promises.push(actionHandler.sendTriggerAction(true, "HeaderBap" + index, geojson));
            }
        }
    });
    this.canDownloadPdf = true;
    return Promise.all(promises);
};

/**
 * Updates the marker on the map and initializes a few things in the synthesis composition
 * @param {Object} latLng - L.LatLng
 */
ActionHandlerHelper.prototype.updateClick = function (latLng) {
    if (this.marker) {
        this.marker.remove();
    }

    if (latLng) {
        this.marker = new Marker(latLng, true);
        this.marker.addToMap(function () {});
        this.populateBottomBarWithClick(latLng);
        this.initializeRightPanel();
    } else {
        this.populateBottomBarWithClick();
        this.initializeRightPanel();
    }
    updateUrlWithState()
};

/**
 * Open the synthesis composition panel and bind a couple of events
 */
ActionHandlerHelper.prototype.initializeRightPanel = function () {
    var that = this;
    RightPanelBar.open();
    // this.populateBottomBarWithClick();

    $('#rightPanelReset').on('click', function() {
        that.cleanUp(true);
        updateUrlWithState();
    });
    $("#closeOverlay").on('click', function () {
        $("#enlargedBAPContainer").fadeOut(300, function () {
            toggleUnitInfoBar();
        });
    });
};

/**
 * Clear the page of anything no longer applicable.
 */
ActionHandlerHelper.prototype.cleanUp = function(hideBar, skipPolygonHandler) {
    if (this.marker) {
        this.marker.remove();
        this.marker = undefined;
    }

    $.each (actionHandlers, function (index, handler) {
        if (!skipPolygonHandler) {
            handler.cleanUp();
        } else if (handler.type != "drawPolygon") {
            handler.cleanUp();
        }
    });

    this.emptyBapMap();

    $.each(this.featureList, function (index, feature) {
        if (feature) map.remove(feature);
    });

    if (hideBar) {
        this.loadEmptySynthComp();
        RightPanelBar.close();
        MenuPanel.open();
    } else {
        clearSynthComp();
    }
    function clearSynthComp() {
        $('#synthesisCompositionDetails').html('');
        $('#synthCompBottomBar').html('');
        $('#synthesisCompositionBody').html('');
    }
};



/**
 * If the action was a click, show the lat/lng of the click. Otherwise, the action could have been a polygon submission.
 * @param ll - the lat/lng of the click event, or undefined if the event was a polygon submission
 */
ActionHandlerHelper.prototype.populateBottomBarWithClick = function (ll) {
    var viewData = {
        lat: 0,
        lng: 0
    };

    if (ll) {
        viewData = {
            lat: ll.getLatForDisplay(),
            lng: ll.getLngForDisplay()
        };
    }

    var html = getHtmlFromJsRenderTemplate('#synthCompBottomBarTemp', viewData);
    $('#synthCompBottomBar').html(html);
};

/**
 * Iterate through all possible actions as specified in the bioscape. If the associated layer is turned on, or the
 * action is a default action, add it the enabledActions list.
 */
ActionHandlerHelper.prototype.setCurrentActions = function () {
    var visibleLayers = bioScape.getVisibleLayers();
    this.enabledActions = [];
    this.additionalParams = [];
    this.crossoverBaps = [];

    var that = this;
    $.each(actionHandlers, function (index, actionHandler) {
        var isVisible = map.hasLayer(actionHandler.layer.leafletLayer);

        if (actionHandler.displayCriteria == "defaultAlways") {
            that.enabledActions.push(actionHandler);
        } else if (actionHandler.displayCriteria == "defaultConditional" && (visibleLayers.length == 0 || isVisible)) {
            that.enabledActions.push(actionHandler);
        } else if (actionHandler.displayCriteria == "conditional" && isVisible) {
            that.enabledActions.push(actionHandler)
        } else if (actionHandler.displayCriteria == "search") {
            that.enabledActions.push(actionHandler)
        }

        if (isVisible) {
            if (actionHandler.additionalParams) {
                that.additionalParams.push(actionHandler.additionalParams)
            }
            if (actionHandler.crossoverBaps) {
                $.each(actionHandler.crossoverBaps, function (index, bap) {
                    if (that.crossoverBaps.indexOf(bap) == -1) {
                        that.crossoverBaps.push(bap);
                    }
                });
            }
        }
    });

    var canDraw = false;

    $.each(this.enabledActions, function (index, action) {
        if (action.type == "drawPolygon") {
            canDraw = true;
        }
        // if (action.synthesisComposition) {
        //     that.sc.id = action.synthesisComposition;
        // }
    });

    if (canDraw) {
        $(".leaflet-draw, #polygonControls").show()
    } else {
        $(".leaflet-draw, #polygonControls").hide();
        this.cleanUpDrawnPolygons();
    }
};

ActionHandlerHelper.prototype.handleEverything = function (latLng, isDifferentFeatureSelected) {
    var that = this;
    this.canDownloadPdf = false;
    return this.handleActions(latLng, isDifferentFeatureSelected)
        .then(function (data) {
            var hasData = false;
            $.each(data, function (index, obj) {
                if (obj != null && !obj.noData) {
                    hasData = true;
                }
            });
            if (!hasData) {
                if(that.enabledActions.filter(action => {return action.type != "drawPolygon"  && action.type != "searchPoi"  && !action.noAction}).length > 0){
                    that.loadEmptySynthComp("No data is available for the point clicked.");
                }
                
            }
            that.canDownloadPdf = true;
        });
};

/**
 * This sends the trigger action for each of the enabled actions, with the given click event. It skips the "drawPolygon"
 * actions.
 * @param {Object} latLng - L.LatLng
 */
ActionHandlerHelper.prototype.handleActions = function (latLng, isDifferentFeatureSelected) {
    var that = this;
    var promises = [];

    let otherActions = this.enabledActions.filter(action => {return action.type != "drawPolygon" && action.type != "searchPoi" && !action.noAction})
    let searchActions = this.enabledActions.filter(action => {return action.type == "searchPoi"})

    if(otherActions.length > 0){

        this.headerSent = false;
        this.cleanUp(false);
        this.updateClick(latLng);
        this.setCurrentActions();

        $.each(otherActions, function (index, actionHandler) {
                if (!actionHandler.headerBap) {
                    promises.push(actionHandler.sendTriggerAction(latLng, false, that.additionalParams,undefined, isDifferentFeatureSelected));
                } else {
                    $("#synthesisCompositionTitle").html("<div id='HeaderBap" + index + "'></div>");
                    promises.push(actionHandler.sendTriggerAction(latLng, true, that.additionalParams, "HeaderBap" + index, isDifferentFeatureSelected));
                }
        });
    }
    else if(searchActions.length > 0){
        this.headerSent = false;
        this.updateClick(latLng);
        this.setCurrentActions();
        promises.push(searchActions[0].sendTriggerAction(latLng, true, that.additionalParams, "HeaderBap0", isDifferentFeatureSelected));
    }

    return Promise.all(promises);
};

/**
 * This is called whenever the layers change in the bioscape. If anything of the actions have changed as a result
 * of the layers changing, resend all of the trigger actions with the updated enabledActions
 */
ActionHandlerHelper.prototype.handleLayerChange = function () {
    var currentActions = [];
    var currentParams = [];

    $.each(this.enabledActions, function (i, v) {
        currentActions.push(v);
    });

    $.each(this.additionalParams, function (i, v) {
        currentParams.push(v);
    });

    this.setCurrentActions();

    if (!isEquivalent(currentActions, this.enabledActions) || !isEquivalent(currentParams, this.additionalParams)) {
        var hasClickActions = false;
        var hasDrawActions = false;
        $.each(this.enabledActions, function (index, action) {
            if (action.type != "drawPolygon") {
                hasClickActions = true;
            } else {
                hasDrawActions = true;
            }
        });

        if (!this.enabledActions.length) {
            this.cleanUp(false);
            this.loadEmptySynthComp();
        } else if (this.marker && hasClickActions) {
            this.handleEverything(this.marker.latLng);
        } else if (!this.marker && !hasDrawActions) {
            this.cleanUp(false);
            this.loadEmptySynthComp();
        } else if (this.marker && !hasClickActions) {
            this.cleanUp(false);
            this.loadEmptySynthComp();
        } else {
            this.handleDrawPolygonActions();
        }
    }
};

/**
 * This opens up a new tab with the JSON data behind the BAP with the specified ID
 * @param id - the ScienceBase ID of the BAP
 */
ActionHandlerHelper.prototype.viewBapJson = function (id) {
    var bap = this.sc.baps[id];
    window.open(bap.config.jsonUrl);
};

/**
 * This opens up a new tab with the full JSON driving a synthesis composition. Not all bioscapes have references to
 * synthesis compositions, many of them just have lists of BAPs.
 */
ActionHandlerHelper.prototype.viewSynthCompJson = function () {
    this.sc.viewJson();
};

ActionHandlerHelper.prototype.showSimplifiedJson = function (id) {

    if (map.hasLayer(this.simplifiedFeature)) {
        this.simplifiedFeature.remove();
    }
    else if (!this.bufferedFeature){
        return
    }
    else {
        this.simplifiedFeature = L.geoJson( this.bufferedFeature,
            {
                style: function () {
                    return {
                        color: '#0000FF',
                        fillOpacity: .2,
                        weight: 1
                    };
                },
                pane: 'featurePane'
            });
        this.simplifiedFeature.addTo(map);

        if (!isVerticalOrientation()) {
            centerMapRight(this.simplifiedFeature.getBounds());
        } else {
            centerMapBottom(this.simplifiedFeature.getBounds());
        }
    }
    
};

ActionHandlerHelper.prototype.showRawJson = function (id) {
    var bap = this.sc.baps[id];
    bap.showRawJson();
};


ActionHandlerHelper.prototype.closeExpandedBap = function (id){

    if(! $(`#compareBapModal${id}`).length) return false

    // put html back in left container
    $(`#${id}BAP .bap-expand-button`).show()
    $(`#${id}BAP`).appendTo($(`#${id}BapCase`))
    
    // unbind any handlers on the popup 
    $(`#compareBapModal${id}`).off()
    $(`#compareBapModalHeader${id}`).off()
    $(`#compareBapModal${id}`).remove()

    // enable reporting if last pop up to close
    if(! $("#compareBapModalHolder div").length){
        $("#buildReportPdf").prop("disabled",false);
    }

    // switch colapse icon 
    $("#" + id + 'BAPControl').html('&#9660;');
   
    return true
}


ActionHandlerHelper.prototype.expandBap = function (id){

    $("#" + id + 'BAPControl').html('&#9658;');
    $(`.tooltip`).remove()

    $(`#${id}BAP .bap-expand-button`).hide()
    if(!$(`#compareBapModal${id}`).length){
        
        $("#compareBapModalHolder").append(`<div id="compareBapModal${id}" class="compareBapModal-container"></div>`)

        let compareBapModal = $(`#compareBapModal${id}`)
    
        compareBapModal.css("left",`${window.innerWidth - (550 + parseInt(Math.random()*100)) }px`)
        let modalHtml = getHtmlFromJsRenderTemplate('#compareBapTemplate',{id:id});
        compareBapModal.html(modalHtml)
       
        $(`#${id}BAP`).appendTo($(".compareBap"))
        compareBapModal.find(".compareModalTitle").text($(`#${id}BapCase .bapTitle`).text())
    
    
        compareBapModal.resizable({
            aspectRatio: false,
            // maxWidth: 700,
            // maxHeight: 933,
            minHeight:400,
            minWidth:300
          });
    
        compareBapModal.draggable({});
    
        $("#buildReportPdf").prop("disabled",true);
    
        compareBapModal.show()
        $(`#${id}BAP`).show()
    }

    
}


/**
 * Remove the drawn polygons from the map
 */
ActionHandlerHelper.prototype.cleanUpDrawnPolygons = function () {
    if (drawnItems) {
        map.removeLayer(drawnItems);
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
    }
};

/**
 * Shows a message for a few seconds before fading out
 * @param message - the message to show on the screen.
 */
ActionHandlerHelper.prototype.showTempPopup = function (message) {
    var popupMessage = $("#tempPopupMessage");
    var showDelay = 3000;
    var fadeDelay = 2000;

    popupMessage.stop(true, false);

    popupMessage.text(message);

    popupMessage.show();
    popupMessage.css ({
        opacity: "1"
    });

    popupMessage.animate({
        opacity: "1"
    }, showDelay, function () {
        popupMessage.animate({
            opacity: "0"
        }, fadeDelay, function () {
            popupMessage.hide()
        })
    });
};

/**
 * The initial call to the server to grap the BAP configs. Only the titles are used for now.
 * @returns {*}
 */
ActionHandlerHelper.prototype.initializeAllBaps = function () {
    var that = this;
    var promises = [];
    showSpinner()
    $.each(actionHandlers, function (index, handler) {
        if (handler.getAllBapsToProcess().length) {
            $.each(handler.getAllBapsToProcess(), function (index, bap) {
                promises.push(sendJsonAjaxRequest(myServer + "/bap/get", {id: bap})
                    .then(function (myJson) {
                        that.allBaps[myJson.id] = {
                            title: myJson.title
                        };
                    }).catch(function(ex) {
                        console.log("error initilizing bap")
                    }));
            });
        }
    });

    return Promise.all(promises)
        .then(function() {
            that.loadEmptySynthComp();
            hideSpinner()
        });
};

/**
 * Returns all of the BAPs that are reference by enabled actions
 * @returns {Array} - the list of BAPs that are enabled
 */
ActionHandlerHelper.prototype.getEnabledBaps = function () {
    this.setCurrentActions();
    var retBaps = [];
    var that = this;

    $.each(this.enabledActions, function (index, handler) {
        $.each(handler.getAllBapsToProcess(), function (index, bap) {
            if (bap) {
                if (retBaps.indexOf(that.allBaps[bap]) == -1) {
                    retBaps.push(that.allBaps[bap]);
                }
            }
        });
    });

    return retBaps;
};

ActionHandlerHelper.prototype.emptyBapMap = function () {
    this.sc.baps = {};
};

ActionHandlerHelper.prototype.getState = function() {
    let result = {}
    let searchHandler = actionHandlers.filter(h =>{
        return h.type == "searchPoi"
    })[0]

    try {
        result.search = searchHandler.result.geojson.properties.feature_id
    }
    catch(error) {}
    var marker = this.marker;
    if(marker) {
        result = {}
        result.lat = marker.latLng.getLatForDisplay()
        result.lng = marker.latLng.getLngForDisplay()
    }
    
    return result;
};
/**
 * Display the default empty right panel.
 */
ActionHandlerHelper.prototype.loadEmptySynthComp = function(message) {
    if(!message){
        message = bioScape.additionalParams.defaultBapMessage
    }
    $('#synthesisCompositionDetails').html('');
    $('#synthCompBottomBar').html('');
    var synthCompBody = $('#synthesisCompositionBody');
    if(!bioScape) {
        synthCompBody.html(getHtmlFromJsRenderTemplate('#emptySynthesisCompositionTemplate', {message: message}));
        return;
    }
    var html = getHtmlFromJsRenderTemplate('#emptySynthesisCompositionTemplate', {message: message ? message : bioScape.rightPanelMessage});
    synthCompBody.html(html);

    //Layers in the bioscape can have actions associated with them. This grabs all of the BAPs associated with enabled
    //actions and lists them in the context report.
    getBapHtmlFromEnabledActions(this.getEnabledBaps())
        .then(function(html) {
            if(html) {
                $('.bapList').html(getHtmlFromJsRenderTemplate('#emptySynthCompBapListTemplate', {html: html}));
            }
        });

    function getBapHtmlFromEnabledActions(enabledBaps) {
        var html = "";

        $.each(enabledBaps, function (key, bapObj){
            if (bapObj) {
                html += bapObj.title + "<br><br>"
            }
        });

        return Promise.resolve(html);
    }
};

ActionHandlerHelper.prototype.handleBapError = function (id, message) {
    var bap = this.sc.baps[id];

    if (!bap) return false;

    bap.setErrorMessage(message);

    return true;
};

ActionHandlerHelper.prototype.globalTimeSlider = function () {

    let found = {};

    $.each(actionHandlers, function (index, actionHandler) {
        if(actionHandler.gts){
            found = actionHandler.gts;
        }
    })
    return found;

}
