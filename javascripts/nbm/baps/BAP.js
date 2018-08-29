'use strict';

/**
 * This is the base class all of the analysis packages extend/overwrite.
 * @param {*} serverAP - analysis package from the server
 * @param {*} leaveOutJson - if this is set, don't show the "View BAP JSON" button
 * @constructor
 */
var BAP = function (serverAP, leaveOutJson, actionRef) {
    this.featureValue = serverAP.featureValue;
    this.config = serverAP;
    this.title = serverAP.title;
    this.alternateTitles = serverAP.alternateTitles;
    this.contacts = serverAP.contacts;
    this.webLinks = serverAP.webLinks;

    this.id = serverAP.id
    this.unique = this.guidGenerator();
    if (!this.config.data) this.config.data = {};
    this.description = this.config.data.description || "";
    this.bapReference = this.config.url || "";
    this.lastUpdated = this.config.data.lastUpdated || "";
    this.widgets = [];
    this.feature = undefined;
    this.leaveOutJson = leaveOutJson;
    this.htmlElement = undefined;
    this.simplified = false;
    this.simplifiedFeature = undefined;
    this.rawJson = {};
    this.actionRef = actionRef;
    this.state = {}
    this.initConfig = {}
    this.priority = false

    if (!$(`#${this.id}BAP`).length) $("#synthesisCompositionBody").append(getHtmlFromJsRenderTemplate('#emptyBapTemplate', { id: this.id }));
    this.htmlElement = $("#" + this.id + "BapCase");

};

BAP.prototype.guidGenerator = function () {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

BAP.prototype.reconstruct = function (serverAP, leaveOutJson) {
    this.featureValue = serverAP.featureValue;
    this.config = serverAP;
    this.title = serverAP.title;
    this.alternateTitles = serverAP.alternateTitles;
    this.contacts = serverAP.contacts;
    this.webLinks = serverAP.webLinks;

    this.id = serverAP.id
    this.unique = this.guidGenerator();
    if (!this.config.data) this.config.data = {};
    this.description = this.config.data.description;
    this.bapReference = this.config.url;
    this.lastUpdated = this.config.data.lastUpdated;
    this.widgets = [];
    this.feature = undefined;
    this.leaveOutJson = leaveOutJson;

    this.htmlElement = $("#" + this.id + "BapCase");
};

BAP.prototype.getInfoDivModel = function () {
    return {
        divId: this.id,
        title: this.title,
        alternateTitles: this.alternateTitles,
        contacts: this.contacts,
        webLinks: this.webLinks,
        description: this.description,
        bapReference: this.bapReference,
        lastUpdated: this.lastUpdated
    }
};

BAP.prototype.getInfoDivInfo = function () {
    return {
        divId: this.id,
        title: this.title,
        alternateTitles: this.alternateTitles,
        contacts: this.contacts,
        webLinks: this.webLinks,
        description: this.description,
        bapReference: this.bapReference,
        lastUpdated: this.lastUpdated
    }
};

BAP.prototype.initializeWidgets = function () {

    if (!this.config.charts) return;

    var that = this;

    $.each(that.config.charts, function (index, chart) {
        if (chart.error) {
            actionHandlerHelper.showTempPopup("Error retrieving chart data for BAP, " + that.title);
        } else {
            var w = widgetHelper.getWidget(chart, that);
            w.bap = that;
            that.widgets.push(w)
        }
    });
};

BAP.prototype.getWidgetHtml = function () {
    var html = "";

    var that = this;

    $.each(that.widgets, function (index, widget) {
        if (!widget) return;
        html += widget.getHtml();
    });

    return html;
};

BAP.prototype.getFullHtml = function () {
    var widgetHtml = this.getWidgetHtml();
    var infoDivModel = this.getInfoDivModel();

    var title = this.title;
    var altTitle = this.alternateTitles;

    if (altTitle) {
        title = altTitle[0];
    }

    let layerInputs = this.GetBapLayers().filter(l => {
        return !l.summarizationRegion
    })

    var apViewModel = {
        id: this.config.id,
        title: title,
        hasInfoDiv: infoDivModel,
        simplified: this.simplified,
        openByDefault: this.config.openByDefault,
        leaveOutJson: this.leaveOutJson,
        hasInputs: layerInputs.length ? true : false,
        layerInputs: layerInputs,
        sectionHtml: widgetHtml,
        imagePath: "", // <-- what is this for?
    };

    createAndPushInfoDiv(infoDivModel);
    return getHtmlFromJsRenderTemplate('#bapSectionTemplate', apViewModel);

    /**
     * Create an information div and add it to the DOM.
     * @param {{divId: string, title: string, description: string, bapReference: string, lastUpdated: string}} info -
     *  information to display to the user
     */
    function createAndPushInfoDiv(info) {
        if (!info) {
            return;
        }
        var containerId = info.divId + "InfoDiv";
        var selector = "#" + containerId;
        if ($(selector).length === 0) {
            addModalContainerDivToBody(containerId);
        }

        var viewData = {
            id: info.divId + "Modal",
            title: info.title,
            alternateTitles: info.alternateTitles,
            contacts: info.contacts,
            webLinks: info.webLinks,
            description: info.description,
            bapReference: info.bapReference,
            lastUpdated: info.lastUpdated
        };
        var html = getHtmlFromJsRenderTemplate('#infoDivTemplate', viewData);
        $(selector).html(html);
    }

    /**
     * Add a modal container div element to the DOM body.
     * @param {string} id - id for the new container
     */
    function addModalContainerDivToBody(id) {
        var div = document.createElement("div");
        div.id = id;
        document.body.appendChild(div);
    }
};

BAP.prototype.initializeChartLibraries = function () {
    var that = this;
    $.each(this.widgets, function (index, widget) {
        widget.initializeWidget(that.feature);
    });
};

/**
 * initiate logic when an element in the bap is clicked
 * layer inputs, priority switch, show json ect
 * clicking on charts is handeled in the widget
 */
BAP.prototype.bindClicks = function () {
    var that = this;

    $("#" + this.config.id + "BapCase div.layerExpander").on('click', function () {
        if( actionHandlerHelper.closeExpandedBap(that.config.id)) return 
        var id = $(this).data('section');
        let toggle = toggleContainer(id);
        if (!that.priority) {
            $(`#${that.id}Inputs`).hide()
        }
        that.updateState(toggle)
    });
    $("#" + this.config.id + "BapCase div.inputExpander").on('click', function () {
        var id = $(this).data('section');
        toggleContainer(id);
    });

    $("#" + this.config.id).on('click', function (e) {
        $("#" + that.config.id + "Modal").modal('show');
        e.stopPropagation();
    });

    $(`#${that.id}BapCase #priorityBap${that.id}`).on('click', function (e) {
        that.setPriorityBap(e.target.checked)
        e.stopPropagation();
    });
    $(`#${that.id}BapCase #priorityBapInput${that.id}`).on('click', function (e) {
        e.stopPropagation();
    });


    let layers = that.GetBapLayers()
    $.each(layers, function (index, layer) {
        $(`#${that.id}BAP #toggleLayer${layer.id}`).click(function () {
            if (this.checked) {
                that.turnOffOtherLayers(layer.id)
                layer.turnOnLayer()
                    .then(function () {
                        that.checked = true
                        that.showTimeSlider(layer.timeIndex)
                        that.updateState(true)
                    })
            } else {
                layer.turnOffLayer()
                that.updateState(true)

            }


        })
        $(`#${that.id}BAP #opacitySliderInput${layer.id}`).on("change mousemove", function () {

            layer.section.updateLayerOpacity(layer.id, $(`#${that.id}BAP #opacitySliderInput${layer.id}`).val());
            that.updateState(true)
        });

        //when the user clicks an information icon
        $(`#${that.id}BAP #${layer.id}layerMoreInfo`).on('click', function () {
            layer.displayLayerInformation();
        });
    })
};

BAP.prototype.showSimplifiedDiv = function () {
    $("#" + this.id + "SimplifiedDiv").show();
};

BAP.prototype.showRawJson = function () {
    var jsonModal = $("#jsonModal");
    jsonModal.modal("show");
    $("#prettyText").html(JSON.stringify(this.rawJson, undefined, 4));
    $("#uglyText").html(JSON.stringify(this.rawJson, undefined, 4));
    this.togglePretty();
    $("#prettyCheckbox").on("change", this.togglePretty);

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.rawJson));
    var dlAnchorElem = document.getElementById('downloadMe');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "npn-json.json");
};

BAP.prototype.togglePretty = function () {
    var pretty = $("#prettyCheckbox").is(":checked");
    var prettyText = $("#prettyText");
    var uglyText = $("#uglyText");

    if (pretty) {
        prettyText.show();
        uglyText.hide();
    } else {
        prettyText.hide();
        uglyText.show();
    }
};

BAP.prototype.setHtml = function (html) {
};

BAP.prototype.setEmptyBap = function () {
    // this.htmlElement.html(getHtmlFromJsRenderTemplate('#bapSpinner', {}));
    this.htmlElement.html('');
};


/**
 * Try to load the bap state from the url/bioscape
 * otherwise start bap as default
 */
BAP.prototype.initializeBAP = function () {

    let that = this;

    // set this baps initconfig to the correct part of the entire config
    bioScape.initBapState.baps.forEach(function (initBap) {
        if (initBap.id == that.id && !initBap.userDefined) {
            that.initConfig = initBap
            bioScape.bapLoading(that.id,false)
        }
    })

    // build the widgets
    this.initializeWidgets();
    this.htmlElement = $("#" + this.id + "BapCase");
    this.htmlElement.removeClass().html(this.getFullHtml());
    this.initializeChartLibraries();

    this.bindClicks();
    if (this.simplified) {
        this.showSimplifiedDiv();
    }

    if ((this.feature || {}).userDefined) {
        this.state.userDefined = true
    }
    else {
        this.state.userDefined = false
    }

    // try to load the bap state
    try {
        if (this.loadBapState()) { } // bap state loaded successfully 
        else {
            // bap state did not load or there is no state to load 
            const p = ((that.actionRef || {}).config || {}).priority
            if (p == this.id || (!p && bioScape.defaultPriority == this.id)) {
                $(`#${that.id}BapCase #priorityBap${that.id}`).click()
            }
            else {
                collapseContainer(this.id + "BAP")
            }
        }
    }
    catch (error) {
        showErrorDialog('Unable to load the captured state. ', false);
    }

    bioScape.bapLoading(this.id, true)
};


// load the bap state from the shared url
// determine if this bap is the priority and load the correct layers
// the widget it's self takes care of any initlization related to the charts
BAP.prototype.loadBapState = function () {
    let that = this;
    if (!bioScape.initBapState.baps.length) return false
    let found = false
    bioScape.initBapState.baps.forEach(function (initBap) {
        if (initBap.id == that.id && !initBap.userDefined) {
            found = true
            if (initBap.priority) {
                $(`#${that.id}BapCase #priorityBap${that.id}`).click()
                // setting a timeout so that the priority bap has a chance to load default before we change its inputs
                // it would be nice to call async functions directly but calling click also handels alot of the html changes
                setTimeout(function () {
                    bioScape.initBapState.layers.forEach(l => {
                        let layer = bioScape.getLayer(l.id)
                        if (!layer.summarizationRegion && !layer.baseMap) {
                            try {
                                if (!$(`#${that.id}BAP #toggleLayer${layer.id}`)[0].checked) {
                                    $(`#${that.id}BAP #toggleLayer${layer.id}`).click()
                                }
                            }
                            catch (error) { console.log("unable to locate layer ", error) }

                            try { layer.section.updateLayerOpacity(layer.id, l.opacity) }
                            catch (error) { console.log("unable to locate layer ", error) }
                            $(`#${that.id}BAP #opacitySliderInput${layer.id}`).val(l.opacity)

                            if (l.time) {
                                actionHandlerHelper.globalTimeSlider().setToTime(l.time)
                            }
                        }
                    });

                    if (!initBap.enabled) {
                        collapseContainer(that.id + "BAP")
                    }
                    that.initConfig = {}
                    bioScape.initBapState = { baps: [], layers: [] }
                    that.updateState(true)
                }, 1000)
            }
            else {
                $(`#${that.id}Inputs`).hide()

                // was getting a weird svg render in the colapsed contaner
               // if (initBap.enabled) {
                    showContainer(that.id + "BAP")
               // }
                
                // else {
                //     collapseContainer(that.id + "BAP")
                // }
            }
        }
    })
    if (!found) {
        collapseContainer(this.id + "BAP")
    }
    return true
}


BAP.prototype.isVisible = function () {
    return $('#' + this.config.id + 'BAP').is(':visible');
};

BAP.prototype.getPdfLayout = function () {

};

BAP.prototype.viewJson = function (additionalParams) {
    window.open("")
};

BAP.prototype.cleanUp = function () {
    if (this.htmlElement) {
        this.htmlElement.remove();
    }

    if (this.simplifiedFeature) {
        this.simplifiedFeature.remove();
    }

    this.simplifiedFeature = undefined;
};


BAP.prototype.setErrorMessage = function (message) {
    var that = this;
    this.htmlElement.removeClass().html(getHtmlFromJsRenderTemplate('#bapErrorInfo', { error: message, id: that.id }));
};

/**
 * Get all the layers associated with this bap
 * layers can be asociated with more then one bap
 */
BAP.prototype.GetBapLayers = function () {
    let bapLayers = false
    try {
        var allLayers = bioScape.getAllLayers();
        bapLayers = allLayers.filter(layer => {
            let id = this.id;
            let found = false
            if (layer.actionConfig) {
                $.each(layer.actionConfig.baps, function (index, b) {
                    if (b == id) {
                        found = true;
                    }
                })
            } return found
        })
    }
    catch (error) { }
    return bapLayers
}

/**
 * turn off all layers asociated with baps
 * skips things like basemaps, sumerization regions ect.
 * by providing the false flag to getVisableLayers()
 */
BAP.prototype.turnOffOtherLayers = function (skipID) {
    let that = this;
    this.showTimeSlider(false)
    var visibleLayers = bioScape.getVisibleLayers(false);

    $.each(visibleLayers, function (index, layer) {
        if (!layer.summarizationRegion && layer.id != skipID) {

            if (($(`#${that.id}BAP #toggleLayer${layer.id}`)[0] || {}).checked) {
                $(`#${that.id}BAP #toggleLayer${layer.id}`).click()
            }
            else {
                layer.turnOffLayer(true)
                layer.section.layerHtmlControl.handleTurnOff(layer.id)
            }
        }
    })
}

/**
 *  Send off the state of this bap to be added to the url
 */
BAP.prototype.updateState = function (enabled) {

    let s = this.state
    s.id = this.id
    s.enabled = enabled
    s.priority = this.priority
    bioScape.updateState(s)
}


BAP.prototype.showTimeSlider = function (show) {

    try { actionHandlerHelper.globalTimeSlider().showTimeSlider(show !=undefined ? show:false) }
    catch (error) { }
}


/**
 * When priority bap is changed turn on the default layers for that bap
 * Hide the inputs to the other baps
 */
BAP.prototype.setPriorityBap = function (checked) {
    let that = this

    if (checked && !this.priority) {
        this.priority = true
        let thisLayer = this.GetBapLayers()[0]
       
        this.turnOffOtherLayers()
        $.each(bioScape.getAllBaps(), function (index, bap) {
            try {
                if (bap != that.id && $(`#priorityBap${bap}`)[0].checked) {
                    $(`#priorityBap${this}`).click()
                }
            }
            catch (error) { }
            if (bap != that.id) {
                $(`#${bap}Inputs`).hide()
            }
        })

        showContainer(that.id + "BAP")
        $(`#${that.id}Inputs`).show()

        if (!thisLayer) return
        
        $(`#${that.id}BAP #opacitySliderInput${thisLayer.id}`).val(parseFloat(thisLayer.getOpacity()));
        $(`#${that.id}BAP #toggleLayer${thisLayer.id}`)[0].checked = false;
        $(`#${that.id}BAP #toggleLayer${thisLayer.id}`).click()

       
        
        if (!this.feature || !this.feature.geojson || !this.feature.geojson.geometry) {
            setTimeout(function(){ $(".modifiedPoly").hide() }, 1000);
        }
        else{
            actionHandlerHelper.bufferedFeature = this.feature.geojson.geometry
            setTimeout(function(){ $(".modifiedPoly").show() }, 1000);
        }

        that.updateState(true)

    }
    else {
        this.priority = false
        $(".modifiedPoly").hide()
        this.updateState(true)
    }
};