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
    }
    return new ActionHandler(actionConfig, layer);
};

/**
 * If the draw capability hasn't been added to the map, this function is used to add it
 */
ActionHandlerHelper.prototype.addDrawCapability = function () {
    var that = this;
    if (!drawnItems) {
        //Create the object to store the drawn polygon and add it to the map
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        map.addControl(new L.Control.Draw({
            // edit: {
            //     featureGroup: drawnItems,
            //     poly: {
            //         allowIntersection: false
            //     }
            // },
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true
                },
                marker: false,
                circle: false,
                rectangle: false,
                polyline: false
            }
        }));

        //The 'drawing' boolean is a global variable used to prevent the click from propagating to the map if the user
        //is currently drawing
        map.on(L.Draw.Event.CREATED, function (event) {
            drawing = false;
            var layer = event.layer;

            drawnItems.addLayer(layer);

            that.showTempPopup("Click the \"Submit Polygon\" button at the top to submit this polygon for analysis.");
            that.showSubmitButton();
        });

        map.on(L.Draw.Event.DRAWSTART, function () {
            drawing = true;
            that.cleanUpDrawnPolygons();
            that.cleanUp(false);
        });

        map.on(L.Draw.Event.DRAWSTOP, function () {
            drawing = false;
        });

        map.on(L.Draw.Event.DELETESTART, function () {
            drawing = true;
        });

        map.on(L.Draw.Event.DELETESTOP, function () {
            drawing = false;
        });

        map.on(L.Draw.Event.EDITSTART, function () {
            drawing = true;
        });

        map.on(L.Draw.Event.EDITSTOP, function () {
            drawing = false;
        });

        this.initializeSubmitButton();
    }
};

/**
 * Create and show the submit button. The button is shown only if there are layers turned on with the "drawPolygon" action
 */
ActionHandlerHelper.prototype.initializeSubmitButton = function () {
    this.submitPolygonButton = $("<a id='submitPolygonButton' class='unit_info_poly overMap mapControl grayLink' " +
        "style='padding: 4px 5px 5px 5px;' data-toggle='tooltip' data-placement='bottom' title='Click on the polygon below the zoom " +
        "controls to begin drawing a polygon on the map. When the polygon is finished, click this button to submit it " +
        "for analysis.'>Submit Polygon</a>");
    $("#mapControlContainer").append(this.submitPolygonButton);

    var that = this;

    this.submitPolygonButton.on ("click", function () {
        that.canDownloadPdf = false;
        that.handleDrawPolygonActions()
            .then(function () {
                that.canDownloadPdf = true;
            });
    });
};

/**
 * When a polygon is submitted, trigger the actions for all enabled "drawPolygon" action handlers
 */
ActionHandlerHelper.prototype.handleDrawPolygonActions = function () {
    if (!drawnItems) return;
    this.headerSent = false;
    this.cleanUp(false, true);

    this.populateBottomBarWithClick();
    this.initializeRightPanel();

    var promises = [];

    $.each(actionHandlers, function (index, actionHandler) {
        if (actionHandler.type == "drawPolygon" && map.hasLayer(actionHandler.layer.leafletLayer)) {
            if (!actionHandler.headerBap) {
                promises.push(actionHandler.sendTriggerAction(false));
            } else {
                $("#synthesisCompositionBody").prepend("<div id='HeaderBap" + index + "'></div>");
                promises.push(actionHandler.sendTriggerAction(true, "HeaderBap" + index));
            }
        }
    });

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
};

/**
 * Open the synthesis composition panel and bind a couple of events
 */
ActionHandlerHelper.prototype.initializeRightPanel = function () {
    var that = this;
    RightPanelBar.open();
    // this.populateBottomBarWithClick();

    $('#rightPanelReset').click(function() {
        that.cleanUp(true);
        updateUrlWithState();
    });
    $("#closeOverlay").click(function () {
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
        $(".leaflet-draw, #submitPolygonButton").show()
    } else {
        $(".leaflet-draw, #submitPolygonButton").hide();
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
                that.loadEmptySynthComp("No data is available for the point clicked.");
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
    this.headerSent = false;
    this.cleanUp(false);
    this.updateClick(latLng);

    this.setCurrentActions();

    var that = this;

    var promises = [];

    $.each(this.enabledActions, function (index, actionHandler) {
        if (actionHandler.type != "drawPolygon") {
            if (!actionHandler.headerBap) {
                promises.push(actionHandler.sendTriggerAction(latLng, false, that.additionalParams,undefined, isDifferentFeatureSelected));
            } else {
                $("#synthesisCompositionBody").prepend("<div id='HeaderBap" + index + "'></div>");
                promises.push(actionHandler.sendTriggerAction(latLng, true, that.additionalParams, "HeaderBap" + index, isDifferentFeatureSelected));
            }
        }
    });

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
    var bap = this.sc.baps[id];
    bap.toggleSimplifiedFeature();
};

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
 * This just adds a little animation effect to the "Submit Polygon" button when the user finishes drawing a polygon.
 */
ActionHandlerHelper.prototype.showSubmitButton = function () {
    var that = this;
    this.submitPolygonButton.animate({
        "padding": "7px",
        "color": "white"
    }, 300, "swing", function () {
        that.submitPolygonButton.animate({
            "padding": "4px 5px 5px 5px",
            "color": "#f3f3f3"
        }, 300, "swing");
    });
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
    $.each(actionHandlers, function (index, handler) {
        if (handler.getAllBapsToProcess().length) {
            $.each(handler.getAllBapsToProcess(), function (index, bap) {
                promises.push(sendJsonAjaxRequest(myServer + "/bap/get", {id: bap})
                    .then(function (myJson) {
                        that.allBaps[myJson.id] = {
                            title: myJson.title
                        };
                    }).catch(function(ex) {
                    }));
            });
        }
    });

    return Promise.all(promises)
        .then(function() {
            that.loadEmptySynthComp();
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
    var marker = this.marker;
    if(marker) {
        return {
            lat: marker.latLng.getLatForDisplay(),
            lng: marker.latLng.getLngForDisplay()
        }
    }
    return {};
};
/**
 * Display the default empty right panel.
 */
ActionHandlerHelper.prototype.loadEmptySynthComp = function(message) {
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
            // console.log("Got here: ", html);
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