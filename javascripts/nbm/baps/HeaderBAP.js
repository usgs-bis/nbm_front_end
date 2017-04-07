'use strict';

/**
 * Base object for the header bap.
 * @param {*} serverAP - analysis package from the server
 * @param {String} headerBapId - ID of the DOM element for where to put the html
 * @constructor
 */
var HeaderBAP = function(serverAP, headerBapId) {
    this.config = serverAP;
    this.featureValue = serverAP.featureValue;
    this.sbId = serverAP.id;
    this.headerBapId = headerBapId;
    this.spinner = $('<div class="spinnerContainer"><i class="fa fa-spinner fa-pulse"></i></div>');
};

HeaderBAP.prototype.getHtml = function () {
    var details = this.config;

    var html = '';
    if (details.error) {
        html = getHtmlFromJsRenderTemplate('#synthesisCompositionDetailsError', details);
    } else if (details) {
        var shortSummary;
        if (details.description.length > 175) {
            shortSummary = details.description.substring(0, 175) + "...";
        }

        var longDisplay = shortSummary ? "none" : "inline";

        var viewData = {
            type: details.type,
            title: details.title,
            approximate: details.bapType == "User Defined Polygon",
            acres: formatAcres(details.acres),
            hasSummaryData: !!(details.description.length || details.webLinks.length),
            summaryData: {
                summary: details.description,
                shortSummary: shortSummary,
                longDisplayCss: longDisplay,
                webLinks: (details.webLinks && details.webLinks.length) ? details.webLinks : undefined,
                toggleId: 'synthesisComposition'
            }
        };
        html = getHtmlFromJsRenderTemplate('#synthesisCompositionDetailsTemplate', viewData);
    }

    html += getHtmlFromJsRenderTemplate('#buttonBar', {viewJson: actionHandlerHelper.sc.id});

    return html;
};

HeaderBAP.prototype.showSpinner = function () {
    $("#"+this.headerBapId).html(getHtmlFromJsRenderTemplate('#headerBapSpinner', {}));
};

HeaderBAP.prototype.initializeBAP = function () {
    $("#"+this.headerBapId).html(this.getHtml());
};

HeaderBAP.prototype.cleanUp = function () {

};