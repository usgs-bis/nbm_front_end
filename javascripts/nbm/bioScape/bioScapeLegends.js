'use strict';

/**
 * Map layer legend
 * @param {string} layerTitle
 * @param {string} url
 * @param {string} serviceUrl
 * @param {string} parentId
 * @param {string} parentTitle
 * @param {Array.<number>} layerIds
 * @constructor
 */
var BioScapeLegend = function(layerTitle, url, serviceUrl, parentId, parentTitle, layerIds) {
    this.layerTitle = layerTitle;
    this.url = url;
    this.setUrl = function(url) {this.url = url;};
    this.originalUrl = url;//used to keep track of initial url since this.url can change
    this.serviceBaseUrl = serviceUrl;
    this.layerIds = layerIds;
    this.id = parentId + 'Legend';
    this.containerId = createAndGetLegendContainer(parentTitle);
    this.htmlMap = {};//need a map because there could be multiple legends per layer
    this.getHtml = function() {return this.htmlMap[this.url];};
    this.setHtml = function(html) {this.htmlMap[this.url] = html;};
    this.legendItems = [];
    this.pdfLegendItems = [];

    //create the container for the legend for this layer
    createDivIfDoesNotExist(this.id, this.containerId, '', {display: 'none'});

    /**
     * Creates a div element if none exists for this layer section and returns the id of the element
     * @param {string} parentTitle
     * @returns {string}
     */
    function createAndGetLegendContainer(parentTitle) {
        var divId = parentTitle.replace(/ /g,'');
        var innerHtml = '<div class="title">' + parentTitle + '</div>';
        var div = createDivIfDoesNotExist(divId, 'legendDialog', innerHtml, {display: 'none'});
        div.addClass('well');
        return divId;
    }
};
/**
 * Setup the legend if needed and display the legend to the user.
 */
BioScapeLegend.prototype.displayLegend = function() {
    if (this.getHtml()) {
        this.showLegend();
        return;
    }
    this.setupLegendFromServer();
};
/**
 * Show the legend to the user.
 */
BioScapeLegend.prototype.showLegend = function() {
    $('.displayLegendLink').removeClass('disabled');
    var div = $('#' + this.id);
    if(div.html() === '') {
        div.html(this.getHtml());
        $(".legendImg").each (function () {
            if ($(this).prop("src").toLowerCase().indexOf("getlegendgraphic") == -1) {
                if (!loadMap[$(this).prop("src")]) {
                    loadMap[$(this).prop("src")] = false;
                }

                $(this).on("load", function () {
                    addToColorMap(this);
                    loadMap[$(this).prop("src")] = true;
                });
            }
        });
    }
    div.show();
    $('#' + this.containerId).show();
};
/**
 * Gets all of the information needed for the legend and displays the legend if data retrieval was successful.
 */
BioScapeLegend.prototype.setupLegendFromServer = function() {
    var self = this;

    $.getJSON(this.url)
        .done(function (data) {
            if(data.error) {
                showErrorDialog('The following map service is not available: ' + self.serviceBaseUrl +
                    ' Please try again later.');
                self.clear();
                return;
            }
            self.setHtml(self.getLegendHtml(data.layers));
            self.convertImagesToDataURLsForPDF();
            self.showLegend();
        })
        .error(function () {
            self.clear();
        });
};
/**
 * Creates the legend html.
 * @param {Array.<Object>} layers - layers retrieved from the server
 * @returns {string} - the html of the legend
 */
BioScapeLegend.prototype.getLegendHtml = function(layers) {
    var self = this;
    if(this.layerIds) {
        this.layerIds.forEach(function(layerId) {
            var legend = layers[layerId].legend;
            self.legendItems = self.getLegendItems(legend, layerId);
        });
    } else {
        for (var i = 0; i < layers.length; i++) {
            var legend = layers[i].legend;
            this.legendItems = this.getLegendItems(legend, i);
        }
    }
    var viewData = {
        title: this.layerTitle,
        legendItems: this.legendItems
    };

    return getHtmlFromJsRenderTemplate('#bioScapeLayerLegendTemplate', viewData);
};
/**
 * Returns the items making up the legend.
 * @param {*} legend - legend object retrieved from server json.
 * @param {number} layerId
 * @returns {Array.<{label: {string}, imageUrl: {string}}>}
 */
BioScapeLegend.prototype.getLegendItems = function(legend, layerId) {
    var legendItems = [];
    for (var j = 0; j < legend.length; j++) {
        var item = legend[j];
        var label = item.label;
        var imageUrl = this.serviceBaseUrl + '/' + layerId + '/images/' + item.url;
        legendItems.push({
            label: label,
            imageUrl: imageUrl
        });
    }
    return legendItems;
};
/**
 * Hide the legend from the user.
 */
BioScapeLegend.prototype.clear = function() {
    $('#' + this.id).hide();
    this.handleLegendContainer();
    this.handleShowLegendButton();
};
/**
 * Hide the legend container if no other legends in the container are being displayed.
 */
BioScapeLegend.prototype.handleLegendContainer = function() {
    var container = $('#' + this.containerId);
    var legends = container.children().toArray();
    // remove the first element in the array of children because it is the div title, not a legend
    legends.shift();
    var legendVisible = false;
    legends.forEach(function(legend) {
        if($(legend).css('display') !== 'none') {
            legendVisible = true;
        }
    });

    if(!legendVisible) {
        container.hide();
    }
};
/**
 * Disable the "Show Legend" button if all legends are currently hidden.
 */
BioScapeLegend.prototype.handleShowLegendButton = function() {
    var allLegends = $("#legendDialog .well");
    var otherLayerOn = function() {
        for(var i = 0; i < allLegends.length; i++) {
            if($(allLegends[i]).css('display') !== 'none') {
                return true;
            }
        }
        return false;
    };
    if(!otherLayerOn()) {
        $('.displayLegendLink').addClass('disabled');
    }
};
/**
 * Converts the images in this.legendItems into dataUrls so they can be inserted into the pdf document
 * on download.
 * @promise {Array.<{label: {string}, image: {string}}>} - an array of the updated legendItems
 */
BioScapeLegend.prototype.convertImagesToDataURLsForPDF = function() {
    var self = this;
    var promises = this.legendItems.map(function(item) {
        return self.getLegendItemWithImageDataUrl(item.label, item.imageUrl);
    });
    Promise.all(promises)
        .catch(function(err) {
            console.log(err);
            return [];
        })
        .then(function(data) {
            self.pdfLegendItems = data;
        });
};
/**
 * Draws the image on a canvas object and gets the dataUrl from the canvas.
 * @param label {string} - label of the legend item
 * @param url {string} - url of the image location
 * @promise {{label: {string}, image: {url: {string}, width: {number}, height: {number}}}} - an updated
 *  image item with the dataUrl instead of a link for the image
 */
BioScapeLegend.prototype.getLegendItemWithImageDataUrl = function(label, url) {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
        img.onload = function() {
            try {
                var canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                resolve({label: label, image: {url: canvas.toDataURL('image/jpeg'), width: img.width, height: img.height}});
            } catch(ex) {
                reject(Error(ex.message));
            }
        };
    });
};

/**
 * Legend for layers of type "WMS.overlay". Calls the BioScapeLegend constructor.
 * @param {string} layerTitle
 * @param {string} url
 * @param {string} serviceUrl
 * @param {string} parentId
 * @param {string} parentTitle
 * @param {string} [sldUrl] - optional
 * @constructor
 * @extends BioScapeLegend
 */
var BioScapeWmsLegend = function(layerTitle, url, serviceUrl, parentId, parentTitle, sldUrl) {
    BioScapeLegend.call(this, layerTitle, url, serviceUrl, parentId, parentTitle);
    this.sldUrl = sldUrl;
};
inherit(BioScapeLegend, BioScapeWmsLegend);

BioScapeWmsLegend.prototype.setupLegendFromServer = function() {
    var self = this;
    //If there is a url for the sld file, create our own legend instead of using the getLegendGraphic
    if (self.sldUrl) {
        self.url = self.sldUrl;
        self.sldMap = {};
        var d = 16;
        //Grab the sld xml
        $.ajax({
            type: "GET",
            url: this.sldUrl,
            dataType: "xml",
            success: function (xml) {
                //Convert the xml to json
                var json = xmlToJson(xml);

                //Get the colors and labels from the json
                var colorList = json["sld:StyledLayerDescriptor"]
                    ["sld:NamedLayer"]
                    ["sld:UserStyle"]
                    ["sld:FeatureTypeStyle"]
                    ["sld:Rule"]
                    ["sld:RasterSymbolizer"]
                    ["sld:ColorMap"]
                    ["sld:ColorMapEntry"];

                //create the map of colors for our own easier use
                for (var i = 0; i < colorList.length; i++) {
                    var o = colorList[i]["@attributes"];
                    self.sldMap[o["quantity"]] = {
                        label: o["label"],
                        color: o["color"]
                    };
                }

                self.legendItems = [];
                //Iterate through each color in the map. Create an image of the color, then get its data uri, and add
                //that uri as the source for the legendItem to be added
                $.each(self.sldMap, function (key, value) {
                    var c = document.createElement("canvas");
                    c.width = d;
                    c.height = d;

                    var ctx = c.getContext("2d");
                    var imgData = ctx.createImageData(d, d);

                    var rgb = hexToRgb(value["color"]);

                    var i;
                    for (i = 0; i < imgData.data.length; i += 4) {
                        imgData.data[i] = rgb.r;
                        imgData.data[i+1] = rgb.g;
                        imgData.data[i+2] = rgb.b;
                        imgData.data[i+3] = 255;
                    }

                    ctx.putImageData(imgData, 0, 0);
                    document.body.appendChild(c);

                    self.legendItems.push({
                        label: value["label"],
                        imageUrl: c.toDataURL("image/png")
                    });
                });

                //This code is redundant with the code in the else block below, but had to separate them since this
                //is in an ajax callback
                self.convertImagesToDataURLsForPDF();
                var viewData = {
                    title: self.layerTitle,
                    legendItems:  self.legendItems
                };
                self.setHtml(getHtmlFromJsRenderTemplate('#bioScapeLayerLegendTemplate', viewData));
                self.showLegend();
            }
        });

    } else {
        //If there is no sld file, just use the GetLegendGraphic url to pull in the single image.
        self.legendItems = [{
            label: '',
            imageUrl: self.url
        }];
        self.convertImagesToDataURLsForPDF();
        var viewData = {
            title: self.layerTitle,
            legendItems:  self.legendItems
        };
        self.setHtml(getHtmlFromJsRenderTemplate('#bioScapeLayerLegendTemplate', viewData));
        self.showLegend();
    }
};
/**
 * Update the legend using the new legend url.
 * @param {string} url
 */
BioScapeWmsLegend.prototype.updateLegendWithNewLayer = function(url) {
    if(this.url !== url) {
        this.setUrl(url);
        $('#' + this.id).html('');
        this.setupLegendFromServer();
    }
};