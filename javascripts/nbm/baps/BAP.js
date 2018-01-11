'use strict';

/**
 * This is the base class all of the analysis packages extend/overwrite.
 * @param {*} serverAP - analysis package from the server
 * @param {*} leaveOutJson - if this is set, don't show the "View BAP JSON" button
 * @constructor
 */
var BAP = function(serverAP, leaveOutJson) {
    this.featureValue = serverAP.featureValue;
    this.config = serverAP;
    this.title = serverAP.title;
    this.alternateTitles = serverAP.alternateTitles;
    this.contacts = serverAP.contacts;
    this.webLinks = serverAP.webLinks;

    this.id = serverAP.id;
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

    $("#synthesisCompositionBody").append(getHtmlFromJsRenderTemplate('#emptyBapTemplate', {id: this.id}));

    this.htmlElement = $("#" + this.id + "BapCase");
};

BAP.prototype.reconstruct = function (serverAP, leaveOutJson) {
    this.featureValue = serverAP.featureValue;
    this.config = serverAP;
    this.title = serverAP.title;
    this.alternateTitles = serverAP.alternateTitles;
    this.contacts = serverAP.contacts;
    this.webLinks = serverAP.webLinks;

    this.id = serverAP.id;
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
            var w = widgetHelper.getWidget(chart);
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

    var apViewModel = {
        id: this.config.id,
        title: title,
        hasInfoDiv: infoDivModel,
        simplified: this.simplified,
        openByDefault: this.config.openByDefault,
        leaveOutJson: this.leaveOutJson,
        sectionHtml: widgetHtml,
        imagePath: "" // <-- what is this for?
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
        toggleContainer(id);
    });

    $("#"+this.config.id).on('click', function(e) {
        $("#"+that.config.id+"Modal").modal('show');
        e.stopPropagation();
    });
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
    }
};

BAP.prototype.setErrorMessage = function (message) {
    var that = this;
    this.htmlElement.removeClass().html(getHtmlFromJsRenderTemplate('#bapErrorInfo', {error: message, id: that.id}));
};