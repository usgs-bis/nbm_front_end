'use strict';

/**
 * This is the base class all of the analysis packages extend/overwrite.
 * @param {*} serverAP - analysis package from the server
 * @param {*} leaveOutJson - if this is set, don't show the "View BAP JSON" button
 * @constructor
 */
var BAP = function(serverAP, leaveOutJson, actionRef) {
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
    this.htmlElement = undefined;
    this.simplified = false;
    this.simplifiedFeature = undefined;
    this.hasZoomed = false;
    this.rawJson = {};
    this.actionRef = actionRef;

    $("#synthesisCompositionBody").append(getHtmlFromJsRenderTemplate('#emptyBapTemplate', {id: this.id}));

    this.htmlElement = $("#" + this.id + "BapCase");



};

BAP.prototype.guidGenerator = function() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
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
            var w = widgetHelper.getWidget(chart,that);
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

    var title =  this.title;
    var altTitle = this.alternateTitles;

    if ( altTitle ) {
        title = altTitle[0];
    }
    var allLayers = bioScape.getAllLayers();
    let thisLayer = this.GetThisLayer()
   
    var apViewModel = {
        id: this.config.id,
        title: title,
        hasInfoDiv: infoDivModel,
        simplified: this.simplified,
        openByDefault: this.config.openByDefault,
        leaveOutJson: this.leaveOutJson,
        inputs: thisLayer ? true : false,
        sectionHtml: widgetHtml,
        imagePath: "", // <-- what is this for?
        divId: thisLayer ? thisLayer.id : "",
        layerTitle: thisLayer ? thisLayer.title : ""
    };

    createAndPushInfoDiv(infoDivModel);
    return getHtmlFromJsRenderTemplate('#bapSectionTemplate', apViewModel);

    /**
     * Create an information div and add it to the DOM.
     * @param {{divId: string, title: string, description: string, bapReference: string, lastUpdated: string}} info -
     *  information to display to the user
     */
    function createAndPushInfoDiv(info) {
        if(!info) {
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

    $("#" + this.config.id + "BapCase div.layerExpander").on('click', function() {
        var id = $(this).data('section');
        let toggle = toggleContainer(id);
        that.switchPriorityBap(toggle)
    });
    $("#" + this.config.id + "BapCase div.inputExpander").on('click', function() {
        var id = $(this).data('section');
        let toggle = toggleContainer(id);
    });

    $("#"+this.config.id).on('click', function(e) {
        $("#"+that.config.id+"Modal").modal('show');
        e.stopPropagation();
    });

    $('#toggleLayer' + this.config.id).click(function(){

       
        var allLayers = bioScape.getAllLayers();
        let thisLayer = that.GetThisLayer()
        if(this.checked){
            thisLayer.turnOnLayer()
        } else {
            thisLayer.turnOffLayer()
        }
    });

    $('#opacitySliderInput' + this.config.id).on("change mousemove", function() {
        let thisLayer = that.GetThisLayer()
        thisLayer.section.updateLayerOpacity(thisLayer.id, $('#opacitySliderInput' + that.config.id).val());
    });

     //when the user clicks an information icon
     $('#' + this.config.id + 'BAP ' +'.layerMoreInfo').on('click', function() {
        that.GetThisLayer().displayLayerInformation();
    });
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
    dlAnchorElem.setAttribute("href",     dataStr     );
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
    this.initializeWidgets();
    this.htmlElement = $("#" + this.id + "BapCase");
    this.htmlElement.removeClass().html(this.getFullHtml());
    this.initializeChartLibraries();

    this.bindClicks();
    if (this.simplified) {
        this.showSimplifiedDiv();
    }
    this.switchPriorityBap(true)

    // this.htmlElement = $("#"+this.id+"BapCase");
};

BAP.prototype.isVisible = function() {
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
    this.htmlElement.removeClass().html(getHtmlFromJsRenderTemplate('#bapErrorInfo', {error: message, id: that.id}));
};

BAP.prototype.GetThisLayer = function (toggle) {
    let thisLayer = false
    try{
        var allLayers = bioScape.getAllLayers();
        thisLayer = allLayers.filter(layer =>{
            if(layer.actionConfig){
                return layer.actionConfig.baps[0] == this.id
            } return false
        })[0]
    }
    catch(error){}
    return thisLayer
}

BAP.prototype.switchPriorityBap = function (toggle) {

    let thisLayer = this.GetThisLayer()
    if(!thisLayer) return
    var visibleLayers = bioScape.getVisibleLayers();
   
    $.each(visibleLayers, function (index, layer) {
        if(!layer.baseMap && !layer.summarizationRegion){
            layer.turnOffLayer(true)
            layer.section.layerHtmlControl.handleTurnOff(layer.id)
            if(layer.id != thisLayer.id){
                try { toggleContainer(layer.actionConfig.baps[0] + "BAP")}
                catch(error){}
            }
        }
    })

    if(toggle && thisLayer){
        $('#opacitySliderInput' + this.config.id).val(parseFloat(thisLayer.getOpacity()));
        $('#toggleLayer' + this.config.id)[0].checked=true;
        thisLayer.turnOnLayer()
        thisLayer.section.layerHtmlControl.handleTurnOn(thisLayer.id)
    }
    
};


