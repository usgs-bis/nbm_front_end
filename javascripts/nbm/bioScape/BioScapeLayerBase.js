'use strict';

/**
 * Base class all of the BioScape layers inherit/overwrite.
 * @param {string} id - layer id
 * @param {Object} group - class that inherits BioScapeGroup - the group this layer belongs to
 * @param layer
 * @constructor
 */
var BioScapeLayerBase = function(id, group, layer) {
    this.id = id;
    this.section = group;
    this.metadataSBId = layer.metadataSBId;

    if (this.metadataSBId) {
        this.fetchAlternateTitle(layer.sbAltTitleIndx);
    }
    this.parsePropertiesFromServer(function(bslb) {
        bslb.title = layer.title;
        bslb.serviceUrl = layer.serviceUrl;
        bslb.http = bslb.serviceUrl.indexOf("http://") == 0;
        bslb.selected = getValueOrDefault(layer.selected, false);
        bslb.featureName = layer.featureName;
        bslb.actionConfig = layer.actionConfig;
        //anything that changes with the layer.serviceType is retrieved here
        bslb.setServiceTypeDependantProperties(layer);
    }, this);
};

/**
 * AJAX call to ScienceBase to check if alternate title exists for item.
 * Retrieves the first alternate title, if that doesn't exist it grabs the main title from ScienceBase.
 * notifies user if there is an error retrieving info from ScienceBase
 * The variable in the bioscape config is "sbAltTitleIndx"
 */
BioScapeLayerBase.prototype.fetchAlternateTitle = function (idx) {
    var that = this;
    that.altTitleIndx = idx;
    sendJsonAjaxRequest("https://www.sciencebase.gov/catalog/item/" + this.metadataSBId)
        .then(function (data) {
            var altTitles = data.alternateTitles;
            if (altTitles) {
                if (that.altTitleIndx && that.altTitleIndx <= altTitles.length){
                    that.title = altTitles[that.altTitleIndx -1 ];
                }
                else {
                    that.title = altTitles[0];
                }
            }
            else {
                that.title = data.title;
            }
            if (that.legend) {
                that.legend.layerTitle = that.title;
            }
            $( "#" + that.id +" > div.layerTitle > span:first-child" ).text(that.title);
        })
        .catch(function (ex) {
            $( "#" + that.id +" > div.layerTitle > span:first-child" ).text("Error loading title from ScienceBase");
        });
};

/**
 * This callback is called to set the server properties on the BioScape layer.
 * @callback propertySetterCallback
 * @param {*} layer - layer to set the properties on
 */

/**
 * Sets the properties from the server on the layer, handles the error scenario by displaying an error to the user.
 * @param {propertySetterCallback} callback - callback to get all of the properties
 * @param {Object} layer - argument for the propertySetterCallback, layer to set properties on
 */
BioScapeLayerBase.prototype.parsePropertiesFromServer = function(callback, layer) {
    try {
        callback(layer);
    } catch(ex) {
        alert('There was an error processing the collection of services for the left hand panel, please check the config or select another collection. Error: ' + ex + ' Object: ' + layer);
    }
};
/**
 * Sets the properties on the layer that depend on the map service type.
 * @param {*} serverLayer - layer json from the server
 */
BioScapeLayerBase.prototype.setServiceTypeDependantProperties = function(serverLayer) {
    var mapLayer;
    var url = serverLayer.serviceUrl;
    var legend = undefined;

    var sectionTitle = this.section.title;
    var properties = serverLayer.leafletProperties;
    properties.nativeCrs = serverLayer.nativeCrs;
    properties.queryUrl = serverLayer.queryUrl;
    properties.elasticUrl = serverLayer.elasticUrl;
    var identifyAttributes = serverLayer.identifyAttributes;
    var addLegend = !serverLayer.noLegend;
    var title = serverLayer.title;

    this.allowDrawPolygons = serverLayer.allowDrawPolygons;

    switch (serverLayer.serviceType) {
        case "tileLayer":
            mapLayer = new TileMapLayer(url, properties, identifyAttributes);
            break;
        case "tileLayer.wms":
            mapLayer = new WmsTileMapLayer(url, properties, identifyAttributes);
            legend = getWmsLegend(this.id, mapLayer);
            break;
        case "esri.tiledMapLayer":
            properties.url = url;
            mapLayer = new EsriTiledMapLayer(properties, identifyAttributes);
            legend = getEsriLegend(this.id);
            break;
        case "esri.dynamicMapLayer":
            properties.url = url;
            mapLayer = new EsriDynamicMapLayer(properties, identifyAttributes);
            legend = getEsriLegend(this.id);
            break;
        case "WMS.overlay":
            mapLayer = new WmsOverlayMapLayer(url, properties, identifyAttributes);
            legend = getWmsLegend(this.id, mapLayer, serverLayer.legendUrl);
            break;
    }

    if (serverLayer.actionConfig) {
        actionHandlers.push(actionHandlerHelper.createActionHandler(serverLayer.actionConfig, mapLayer));
    }

    this.mapLayer = mapLayer;
    this.legend = legend;

    function getWmsLegend(id, mapLayer, lUrl) {
        //https://beta-gc2.datadistillery.org/api/v1/legend/html/jjuszakusgsgov/wms_test?l=wms_test.us_eco_l3
        if(!addLegend) {
            return undefined;
        }
        if (lUrl) {
            return new BioScapeWmsLegend(title, lUrl, url, id, sectionTitle, mapLayer.sld);
        } else {
            var styleParam = properties.styles ? '&style=' + properties.styles : '';
            var legendUrl = url + '?service=wms&request=GetLegendGraphic&format=image%2Fpng&layer=' + mapLayer.layers + styleParam;
            return new BioScapeWmsLegend(title, legendUrl, url, id, sectionTitle, mapLayer.sld);
        }
    }

    function getEsriLegend(id) {
        if(!addLegend) {
            return undefined;
        }
        return new BioScapeLegend(title, url + '/legend?f=pjson', url, id, sectionTitle, properties.layers);
    }
};
/**
 * Returns true if this layer is on the map, false otherwise.
 * @returns {boolean}
 */
BioScapeLayerBase.prototype.isVisible = function() {
    return map.hasLayer(this.mapLayer.leafletLayer);
};
/**
 * Determines if the layer is currently available. True if the layer is still available, false otherwise.
 * @returns {boolean}
 */
BioScapeLayerBase.prototype.updateAvailabilityAndReturnIsAvailable = function() {
    return true;
};
/**
 * Remove the layer from the map and deselect it if appropriate.
 * @param {boolean} keepSelected - if true the layer stays selected
 */
BioScapeLayerBase.prototype.turnOffLayer = function(keepSelected) {
    if(!keepSelected) {
        this.selected = false;
    }
    this.removeLayerFromMap();
};
/**
 * Checks to see if a layer is valid, if it is valid, selects the layer and adds it to the map.
 * @promise {*} - resolves to true if the layer was turned on false otherwise
 */
BioScapeLayerBase.prototype.turnOnLayer = function() {
    var that = this;
    if(this.mapLayer.isValid === undefined) {
        showSpinner();
        return this.verifyService()
            .then(function (data) {
                if (data) {
                    that.selected = true;
                    that.addLayerToMap();
                } else {
                    hideSpinner();
                }
                return data;
            });
    } else {
        if(this.mapLayer.isValid) {
            that.selected = true;
            that.addLayerToMap();
        }
        return Promise.resolve(this.mapLayer.isValid);
    }
};
/**
 * Remove the layer from the map.
 */
BioScapeLayerBase.prototype.removeLayerFromMap = function() {
    this.mapLayer.removeFromMap();
};
/**
 * Add the layer to the map.
 */
BioScapeLayerBase.prototype.addLayerToMap = function() {
    this.mapLayer.addToMap();
};
/**
 * Verify the mapLayer service.
 */
BioScapeLayerBase.prototype.verifyService = function() {
    return this.mapLayer.verifyService();
};
/**
 * Returns true if this layer is a summarization layer, false otherwise.
 * @returns {boolean}
 */
BioScapeLayerBase.prototype.isSummarizationLayer = function() {
    return this.summarizationInfo && !this.summarizationInfo.identifyOnly;
};
/**
 * Returns the index of this layer in its group.
 * @returns {number}
 */
BioScapeLayerBase.prototype.getIndex = function() {
    return this.id.split('section')[0].split('layer')[1];
};
/**
 * Returns true if a legend is present false otherwise.
 * @returns {boolean}
 */
BioScapeLayerBase.prototype.hasLegend = function() {
    return this.legend !== undefined;
};
/**
 * Returns the opacity of the mapLayer.
 * @returns {number} - opacity of the layer between 1 and 0
 */
BioScapeLayerBase.prototype.getOpacity = function() {
    return this.mapLayer.getOpacity();
};
/**
 * Initialize the layer.
 * @promise {*} - returns true if the initialization was successful, false otherwise
 */
BioScapeLayerBase.prototype.initializeLayer = function() {
    var verify = verifyImmediately([this.selected, this.mapLayer.timeControl]);
    if(!verify) {
        return Promise.resolve(true);
    }
    var that = this;
   
    return this.mixedContentCheck()
        .then(function(success) {
            if(!success) {
                return false;
            }
            return that.verifyService()
                .then(function(data) {
                    that.addAdditionalHtml();
                    that.checkGlobalSlider();
                    if (that.selected) {
                        return that.turnOnLayer();
                    } else {
                        return data;
                    }
                })
                .then(function(data) {
                    return data;
                });
        });

    function verifyImmediately(properties) {
        for(var i = 0; i < properties.length; i++) {
            if(properties[i]) {
                return true;
            }
        }
        return false;
    }
};

/**
 * Add any additional html that may be needed after the rest of the bioscape has loaded.
 */
BioScapeLayerBase.prototype.addAdditionalHtml = function() {
    if (this.mapLayer.timeControl) {
        var layerId = this.id;
        var that = this;
        var time = this.getTimeInfo();
        this.timeIndex = time.default;
        var html = getHtmlFromJsRenderTemplate('#timeSliderTemplate', time);
        var timeSlider = $("#" + layerId+ "TimeControl");
        timeSlider.html(html);
        if(this.selected) {
            timeSlider.show();
        }

        var sl = $("#"+layerId+"TimeSlider");
        var yearLabel = $('#' + layerId + 'YearVal');

        sl
            .on("change", function () {
                that.timeIndex = $(this).val();
                var val = time.dates[that.timeIndex];
                yearLabel.text('Current ' + time.stepLabel + ": " + val);
                that.mapLayer.timeControl = val;
                that.mapLayer.leafletLayer.setParams({
                    "time": val
                });
            })
            .on("mousemove", function () {
                yearLabel.text('Current ' + time.stepLabel + ": " + time.dates[$(this).val()]);
            });

        // var tl = $("#" + layerId + "TimeSliderLabel");
        //
        // if (this.layerSelector) {
        //     var ts = $("#" + layerId + "TimeSelector");
        //
        //     ts.on("change", function () {
        //         var val = $(this).val();
        //         time = that.mapLayer.timeMap[val];
        //         if(that.hasLegend()) {
        //             var legend = that.legend;
        //             if (val == that.featureName) {
        //                 legend.updateLegendWithNewLayer(legend.originalUrl);
        //             } else if (time.legendUrl) {
        //                 legend.updateLegendWithNewLayer(time.legendUrl);
        //             }
        //         }
        //
        //         startDate = time.dates[0];
        //         endIndex = time.dates.length - 1;
        //         endDate = time.dates[endIndex];
        //         var defaultDate = time.dates[time.defaultDateIndex];
        //
        //         that.mapLayer.leafletLayer.setParams({
        //             "layers": val,
        //             "time": defaultDate
        //         });
        //
        //         sl.attr('max', endIndex);
        //         sl.val(Number(time.defaultDateIndex));
        //        yearLabel.text(time.label + ": " + defaultDate);
        //
        //         if (startDate == endDate) {
        //             sl.prop("disabled", "disabled");
        //             tl.css("color", "gray");
        //         } else {
        //             sl.prop("disabled", false);
        //             tl.css("color", "white");
        //         }
        //     });
        // }
    }
};



/**
 * Determine if the layer should be controlled by the global time slider
 * If so, subscribe to the slider so updates can be pushed on change
 */
BioScapeLayerBase.prototype.checkGlobalSlider = function() {

    if (this.mapLayer.timeControl) {
        let timeControl = actionHandlerHelper.globalTimeSlider()
        if(timeControl.ts){
            timeControl.subscribe(this);
        }
    }
};


BioScapeLayerBase.prototype.getTimeInfo = function() {
    if (!this.mapLayer.timeControl) {
        return undefined;
    }
    var layerId = this.id;

    var time = this.mapLayer.timeMap[this.featureName];
    // var layerOptions = [];
    // if(this.layerSelector) {
    //     var timeMap = this.mapLayer.timeMap;
    //     for(var layerName in timeMap) {
    //         if(timeMap.hasOwnProperty(layerName)) {
    //             layerOptions.push({
    //                 name: layerName,
    //                 selected: layerName == that.featureName
    //             });
    //         }
    //     }
    // }

    var startDate = time.dates[0],
        endIndex = time.dates.length - 1,
        endDate = time.dates[endIndex];
    var viewData = {
        layerId: layerId,
        start: 0,
        end: endIndex,
        startDate: startDate,
        endDate: endDate,
        disableSlider: startDate == endDate,
        default: time.defaultDateIndex,
        stepLabel: time.label,
        defaultDate: time.dates[time.defaultDateIndex],
        dates: time.dates,
        hourMinutes: time.hourMinutes,
        currentValue: this.timeIndex,
        currentYear: this.mapLayer.timeControl//,
        // layers: layerOptions
    };

    return viewData;
};
/**
 * Checks to see if this layer is mixed content and if that is allowed. Returns
 * true if layer is not http or mixed content is allowed, false otherwise.
 * @returns {boolean} - a promise that resolves to true or false
 */
BioScapeLayerBase.prototype.mixedContentCheck = function() {
    if(!this.http) {
        return Promise.resolve(true);
    }
    return checkMixedContent(this.title);
};