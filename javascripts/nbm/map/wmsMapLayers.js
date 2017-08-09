//= require FileDownloader.js
//= require MapLayerBase.js
//= require leafletProxyObjects.js
'use strict';

/**
 * Base class for wms layers. Calls the MapLayerBase constructor.
 * @param {string} serviceUrl - service url of the layer's service
 * @param {*} leafletLayer - the layer object appropriate for the service
 * @param {Array.<string>} identifyAttributes - attributes to display when identify is run on this layer
 * @constructor
 * @extends MapLayerBase
 */
var WmsMapLayer = function(serviceUrl, leafletLayer, identifyAttributes) {
    this.layers = leafletLayer.wmsParams.layers;
    this.sld = leafletLayer.wmsParams.sld;
    this.timeControl = leafletLayer.options && leafletLayer.options.time;

    if(this.sld) {
        this.parseSldMap();
    }
    //if the serviceUrl does not have a '?' or the '?' is the last character in the url than add the getCapabilities string
    this.notCompatable = false;
    var index = serviceUrl.indexOf('?');
    if((index > 0) && (index < (serviceUrl.length - 1) )) {
        this.notCompatable = true;
    } else {
        serviceUrl = serviceUrl.replace('?', '') + '?request=GetCapabilities&service=WMS';
    }
    if (this.timeControl) {
        this.timeMap = {};
    }

    MapLayerBase.call(this, serviceUrl, leafletLayer, identifyAttributes);
    this.crs = 'EPSG:4326';//default to the leaflet crs
    this.wmsCapabilitiesInfo = undefined;
};
inherit(MapLayerBase, WmsMapLayer);

// WmsMapLayer.prototype.getMetadataFromMapService = function() {
//     var self = this;
//     return this.getInfoFromWmsGetCapabilities()
//         .then(function(data) {
//             self.layerMetadata = {
//                 serviceTitle: data.serviceTitle,
//                 abstract: data.serviceAbstract,
//                 layerInfo: {
//                     name: data.name,
//                     title: data.title,
//                     abstract: data.abstract
//                 }
//             };
//             return {metadata: self.layerMetadata, template: '#bioScapeWMSMetadataTemplate'};
//         })
//         .catch(function() {
//             return self.getGenericMapServiceInfo();
//         });
// };
WmsMapLayer.prototype.getIdentifyRequestInfo = function(latLng) {
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var bbox1, bbox2, bbox3, bbox4;

    bbox1 = sw.lng;
    bbox2 = sw.lat;
    bbox3 = ne.lng;
    bbox4 = ne.lat;

    var relW = bbox3 - bbox1;
    var relH = bbox4 - bbox2;

    var mapSize = map.getSize();
    var width = mapSize.x;
    var height = mapSize.y;

    var xCoord = Math.floor((latLng.lng - bbox1) / relW * width);
    var yCoord = Math.floor((bbox4 - latLng.lat) / relH * height);

    var boundingBoxString = bbox1 + ',' + bbox2 + ',' + bbox3 + ',' + bbox4;

    var requestParams = {
        service: 'WMS',
        version: 1.3,
        request: 'GetFeatureInfo',
        crs: 'EPSG:4326',
        bbox: boundingBoxString,
        width: width,
        height: height,
        exceptions: 'xml',
        format: 'image/png',
        info_format: 'application/json',
        feature_count: 50,
        x: xCoord,
        y: yCoord,
        buffer: 1,
        layers: this.layers,
        query_layers: this.layers
    };

    if(this.timeControl) {
        requestParams.time = this.timeControl;
    }

    return {
        url: this.leafletLayer._url,
        params: requestParams
    };
};
WmsMapLayer.prototype.getIdentifyResults = function(latLng) {
    if(this.notCompatable) {
        return Promise.reject();
    }
    var info = this.getIdentifyRequestInfo(latLng);
    var that = this;
    return sendJsonAjaxRequest(info.url, info.params)
        .then(function(data) {
            try {
                if(!data.features.length) {
                    return data;
                }
                return attemptGetFeatureRequest(data.features)
                    .then(function (newFeatures) {
                        data.features = newFeatures;
                    })
                    .catch(function (error) {
                        console.log('There was an error attempting a GetFeature request: ' + error.message);
                    })
                    .then(function() {
                        data.features.map(function(feature) {
                            return getAdjustedGeojson(feature);
                        });
                        return data;
                    });
            } catch(ex) {
                var message = 'Error message: ' + ex.message + '. Stack trace: ' + ex.stack;
                console.log(message);
                throw new Error(message);
            }
        })
        .then(function(data) {
            return that.getFilteredAttributes(data);
        });

    function attemptGetFeatureRequest(features) {
        if(!hasId(features)) {
            return Promise.resolve(features);
        }

        var promises = features.map(function(feature) {
            var wfsRequestParams = {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                outputFormat: 'application/json',
                typeNames: that.layers,
                featureId: feature.id
            };
            return sendJsonAjaxRequest(that.leafletLayer._url, wfsRequestParams);
        });

        return Promise.all(promises)
            .then(function(responseFeatures) {
                return responseFeatures.map(function(responseFeature) {
                    return responseFeature.features[0];
                });
            });

        function hasId(features) {
            if (!features) return false;

            for (var i = 0; i < features.length; i++) {
                var f = features[i];
                if (f.id) return f.id;
            }

            return false;
        }
    }

    /**
     * Returns geojson adjusted for our map.
     * @param {*} geojson
     * @returns {*} - adjusted geojson
     */
    function getAdjustedGeojson(geojson) {
        if(!geojson.geometry) {
            return geojson;
        }
        for (var j = 0; j < geojson.geometry.coordinates.length; j++) {
            var a0 = geojson.geometry.coordinates[j];
            for (var i = 0; i < a0.length; i++) {
                var c = a0[i];

                if (isNaN(c[0])) {
                    for (var k = 0; k < c.length; k++) {
                        var other0 = c[k];
                        var oll = GoogleBingToWGS84Mercator(other0[0], other0[1]);
                        a0[i][k][0] = oll.lng;
                        a0[i][k][1] = oll.lat;
                    }
                } else {
                    var ll = GoogleBingToWGS84Mercator(a0[i][0], a0[i][1]);
                    a0[i][1] = ll.lat;
                    a0[i][0] = ll.lng;
                }

            }
            geojson.geometry.coordinates[j] = a0;
        }

        return geojson;
    }

    // This equation and a good explanation of the projection problems can be seen here:
    // https://alastaira.wordpress.com/2011/01/23/the-google-maps-bing-maps-spherical-mercator-projection/
    // We can't use the projection plugin for leaflet because it projects the coordinates with an offset in the
    // y-direction.
    function GoogleBingToWGS84Mercator (x, y) {
        var lon = (x / 20037508.34) * 180;
        var lat = (y / 20037508.34) * 180;

        lat = 180/Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);

        return {'lat':lat, 'lng':lon};
    }
};
WmsMapLayer.prototype.verifyService = function() {
    return MapLayerBase.prototype.verifyService.call(this, function() { return this.getInfoFromWmsGetCapabilities();}, setDownloader);

    function setDownloader(data) {
        var that = this;
        var url = this.leafletLayer._url;
        getFileDownloader(url, this.layers, data.crs)
            .then(function (data) {
                that.downloader = data;
            });
    }
};
/**
 * Parses the sld map from the sld url.
 */
WmsMapLayer.prototype.parseSldMap = function () {
    var self = this;
    self.sldMap = {};
    $.ajax({
        type: "GET",
        url: this.sld,
        dataType: "xml",
        success: function (xml) {
            var json = xmlToJson(xml);
            var colorList = json["sld:StyledLayerDescriptor"]
                ["sld:NamedLayer"]
                ["sld:UserStyle"]
                ["sld:FeatureTypeStyle"]
                ["sld:Rule"]
                ["sld:RasterSymbolizer"]
                ["sld:ColorMap"]
                ["sld:ColorMapEntry"];

            for (var i = 0; i < colorList.length; i++) {
                var o = colorList[i]["@attributes"];
                self.sldMap[o["quantity"]] = {
                    label: o["label"],
                    color: o["color"]
                };
            }
        }
    });
};
/**
 * Sends a GetCapabilities request to the service and returns data about the service.
 * @promise {*} - data about the service
 */
WmsMapLayer.prototype.getInfoFromWmsGetCapabilities = function() {
    var self = this;
    if(this.notCompatable) {
        return Promise.reject();
    }
    var layerName = self.layers;
    if(this.wmsCapabilitiesInfo) {
        return Promise.resolve(this.wmsCapabilitiesInfo);
    }

    return sendXmlAjaxRequest(this.serviceUrl)
        .then(function(data) {
            if (data.error) {
                return Promise.reject();
            }
            var layerInfo = {
                name: layerName,
                title: 'No title was found for this layer',
                abstract: 'No abstract was found for this layer',
                serviceTitle: 'No title was found for this service',
                serviceAbstract: 'No abstract was found for this service',
                crs: 'EPSG:4326'
            };
            var json = xmlToJson(data);
            var layers = json['WMS_Capabilities']['Capability']['Layer']['Layer'];
            for(var i =0; i < layers.length; i++) {
                var layer = layers[i];
                if(layer['Name']['#text'] === layerName) {
                    layerInfo.title = getValueOrDefault(layer['Title']['#text'], layerInfo.title);
                    layerInfo.abstract = getValueOrDefault(layer['Abstract']['#text'], layerInfo.abstract);
                    layerInfo.crs = getValueOrDefault(layer['CRS'][0]['#text'], layerInfo.crs);
                }
                if (self.timeControl && layer["Dimension"] && layer["Dimension"]["@attributes"] && layer["Dimension"]["@attributes"]["name"] == "time") {
                    var legendUrlObject = layer['Style'].length ? layer['Style'][0]['LegendURL'] : layer['Style']['LegendURL'];
                    var legendUrl = legendUrlObject ? legendUrlObject['OnlineResource']['@attributes']['xlink:href'] : undefined;
                    self.timeMap[layer["Name"]["#text"]] = getTimeMap(layer['Dimension']['#text'], self.timeControl, legendUrl);
                }
            }
            layerInfo.serviceTitle = getValueOrDefault(json['WMS_Capabilities']['Service']['Title']['#text'], layerInfo.serviceTitle);
            layerInfo.serviceAbstract = getValueOrDefault(json['WMS_Capabilities']['Service']['Abstract']['#text'], layerInfo.serviceAbstract);
            self.wmsCapabilitiesInfo = layerInfo;
            return layerInfo;
        })
        .catch(function(err) {
            console.log(err);
            return Promise.reject();
        });

    function getTimeMap(dimensionText, defaultDate, legendUrl) {
        var dateRange = dimensionText.split("/");
        var dates = [];
        var format = Date.prototype.getUTCFullYear;
        var label = 'Year';
        if (dateRange.length > 1) {
            dates = getDateList(dateRange[0], dateRange[1], format);
        } else {
            format = function() {return this.toISOString().substring(0, 10)};
            dates = getDisplayDates(dimensionText.split(','), format);
            label = 'Date';
        }
        var defaultIndex = dates.indexOf(format.call(new Date(defaultDate)));
        return {
            dates: dates,
            defaultDateIndex: defaultIndex,
            label: label,
            legendUrl: legendUrl
        };
    }

    function getDateList(startDate, endDate, compareFunction) {
        var dates = [];
        var start = new Date(startDate);
        var end = new Date(endDate);

        var numDates = compareFunction.call(end) - compareFunction.call(start);
        for(var i = 0;i <= numDates;i++) {
            dates.push(compareFunction.call(start) + i);
        }

        return dates;
    }

    function getDisplayDates(dates, format) {
        return dates.map(function(date) {
            return format.call(new Date(date));
        });
    }
};

/**
 * Class for layers of type "WMS.overlay". Calls the WmsMapLayer constructor.
 * @param {string} serviceUrl - the location of GetCapabilities for this service
 * @param {*} properties - leaflet properties to apply to this layer
 * @param {Array.<string>} identifyAttributes
 * @constructor
 * @extends WmsMapLayer
 */
var WmsOverlayMapLayer = function(serviceUrl, properties, identifyAttributes) {
    WmsMapLayer.call(this, serviceUrl, L.WMS.overlay(serviceUrl, properties), identifyAttributes);
};
inherit(WmsMapLayer, WmsOverlayMapLayer);

/**
 * Class for layers of type "tileLayer.wms". Calls the WmsMapLayer constructor.
 * @param {string} serviceUrl
 * @param {*} properties - leaflet properties to apply to this layer
 * @param {Array.<string>} identifyAttributes
 * @constructor
 * @extends WmsMapLayer
 */
var WmsTileMapLayer = function(serviceUrl, properties, identifyAttributes) {
    WmsMapLayer.call(this, serviceUrl, L.tileLayer.wms(serviceUrl, properties), identifyAttributes);
    bindTileLayerEvents(this.leafletLayer);
};
inherit(WmsMapLayer, WmsTileMapLayer);