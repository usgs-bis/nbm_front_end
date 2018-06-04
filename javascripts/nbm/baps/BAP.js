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
    this.hasZoomed = false;
    this.rawJson = {};
    this.actionRef = actionRef;
    this.state = {}
    this.initConfig = {}

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

BAP.prototype.bindClicks = function () {
    var that = this;

    $("#" + this.config.id + "BapCase div.layerExpander").on('click', function () {
        var id = $(this).data('section');
        let toggle = toggleContainer(id);
        that.switchPriorityBap(toggle)
    });
    $("#" + this.config.id + "BapCase div.inputExpander").on('click', function () {
        var id = $(this).data('section');
        let toggle = toggleContainer(id);
    });

    $("#" + this.config.id).on('click', function (e) {
        $("#" + that.config.id + "Modal").modal('show');
        e.stopPropagation();
    });


    let layers = that.GetBapLayers()
    $.each(layers, function (index, layer) {
        $(`#${that.id}BAP #toggleLayer${layer.id}`).click(function () {
            if (this.checked) {
                that.turnOffBapLayers()
                layer.turnOnLayer()
                    .then(function () {
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
    this.htmlElement.html(getHtmlFromJsRenderTemplate('#bapSpinner', {}));
};

BAP.prototype.initializeBAP = function () {
    showSpinner(true)
    let that = this;
    if (bioScape.initBapState.id == this.id) {
        this.initConfig = bioScape.initBapState
    }

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

    if (this.initConfig.id == this.id && !this.initConfig.userDefined) {
        this.switchPriorityBap(false)
        that.initConfig.layers.forEach(l => {
            let layer = bioScape.getLayer(l.id)
            if (!layer.summarizationRegion && !layer.baseMap) {
                $(`#${that.id}BAP #toggleLayer${layer.id}`).click()

                try { layer.section.updateLayerOpacity(layer.id, l.opacity) }
                catch (error) { }
                $(`#${that.id}BAP #opacitySliderInput${layer.id}`).val(l.opacity)

                if (l.time) {
                    actionHandlerHelper.globalTimeSlider().setToTime(l.time)
                }
                hideSpinner(true)
            }
        });
        this.initConfig = {}
        bioScape.initBapState = {}
        bioScape.initBapState.found = true
        // this is a hack! when we are initlizing all the baps we dont want to open others
        // after 4 seconds we will default to the priority bap
        setTimeout(function () { bioScape.initBapState.found = false }, 4000);
    }
    else {

        if (!bioScape.initBapState.found && ((that.actionRef || {} ).config || {} ).priority == this.id) {
            this.switchPriorityBap(true)
        }
        else if(!that.actionRef){
            this.switchPriorityBap(true)
        }
        else {
            try { collapseContainer(this.id + "BAP") }
            catch (error) { }
        }
    }
    hideSpinner(true)


};

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

BAP.prototype.toggleSimplifiedFeature = function () {
    if (!this.feature || !this.feature.geojson || !this.feature.geojson.geometry) {
        return;
    }

    if (!this.simplifiedFeature) {
        this.simplifiedFeature = L.geoJson(this.feature.geojson.geometry,
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
    }

    if (map.hasLayer(this.simplifiedFeature)) {
        this.simplifiedFeature.remove();
    } else {
        this.simplifiedFeature.addTo(map);
        if (!this.hasZoomed) {
            this.hasZoomed = true;
            if (!isVerticalOrientation()) {
                centerMapRight(this.simplifiedFeature.getBounds());
            } else {
                centerMapBottom(this.simplifiedFeature.getBounds());
            }
        }
    }
};

BAP.prototype.setErrorMessage = function (message) {
    var that = this;
    this.htmlElement.removeClass().html(getHtmlFromJsRenderTemplate('#bapErrorInfo', { error: message, id: that.id }));
};

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

BAP.prototype.switchPriorityBap = function (toggle) {
    let that = this
    let thisLayer = this.GetBapLayers()[0]
    $("#mySpinner").hide()
    if (!thisLayer) return

    this.turnOffBapLayers()

    $.each(bioScape.getAllBaps(), function (index, bap) {
        if (bap != that.id) {
            try { collapseContainer(bap + "BAP") }
            catch (error) { }
        }
    })

    if (toggle && thisLayer) {
        $(`#${that.id}BAP #opacitySliderInput${thisLayer.id}`).val(parseFloat(thisLayer.getOpacity()));
        $(`#${that.id}BAP #toggleLayer${thisLayer.id}`)[0].checked = false;
        $(`#${that.id}BAP #toggleLayer${thisLayer.id}`).click()
    }
    else {
        that.updateState(false)
    }
};

BAP.prototype.turnOffBapLayers = function () {
    let that = this;
    this.showTimeSlider(false)
    var visibleLayers = bioScape.getVisibleLayers();

    $.each(visibleLayers, function (index, layer) {
        if (!layer.baseMap && !layer.summarizationRegion) {

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

BAP.prototype.updateState = function (enabled) {

    let s = this.state
    s.id = this.id
    s.enabled = false
    if (enabled) s.enabled = true
    bioScape.updateState(s)
}

BAP.prototype.showTimeSlider = function (show) {

    try { actionHandlerHelper.globalTimeSlider().showTimeSlider(show) }
    catch (error) { }
}