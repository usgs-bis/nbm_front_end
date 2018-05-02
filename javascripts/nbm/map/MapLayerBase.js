'use strict';

/**
 * This is the base class that all of the MapLayers extend/overwrite.
 * @param {string} serviceUrl
 * @param {*} leafletLayer - the layer object appropriate for the service
 * @param {Array.<string>} identifyAttributes - attributes to display when identify is run on this layer
 * @constructor
 */
var MapLayerBase = function(serviceUrl, leafletLayer, identifyAttributes) {
    this.serviceUrl = serviceUrl;
    this.leafletLayer = leafletLayer;
    this.layerMetadata = undefined;
    this.identifyAttributes = identifyAttributes;
    this.downloader = undefined;
    this.isValid = undefined;
};
/**
 * Adds the layer to the Leaflet map.
 */
MapLayerBase.prototype.addToMap = function() {
    map.addLayer(this.leafletLayer);
};
/**
 * Removes the layer from the Leaflet map.
 */
MapLayerBase.prototype.removeFromMap = function() {
    map.removeLayer(this.leafletLayer);
};
// /**
//  * Retrieves metadata about the map service from the map service itself.
//  * @promise {*} - the metadata retrieved from the map service or an empty object and the template to use for rendering the html
//  */
// MapLayerBase.prototype.getMetadataFromMapService = function() {
//     return Promise.resolve(this.getGenericMapServiceInfo());
// };
// /**
//  * Return generic metadata and template id for when a map service doesn't override
//  *  getMetaDataFromMapService or when a call to get metadata fails
//  * @returns {{metadata: {}, template: string}}
//  */
// MapLayerBase.prototype.getGenericMapServiceInfo = function() {
//     return {metadata: {}, template: '#emptyTemplate'};
// };
/**
 * Makes an identify request to the map server and returns a promise.
 * @param {Object} latLng - L.LatLng
 * @promise {*} - the data retrieved from the identify
 */
MapLayerBase.prototype.getIdentifyResults = function(latLng) {
    return Promise.resolve(undefined);
};
/**
 * If specific attributes were specified in the config return only those, return all attributes otherwise.
 * @param {Object} data - the data returned from the server identify function
 * @returns {Array.<Object>} - a list of the data that has (or hasn't) had it's attributes filtered
 */
MapLayerBase.prototype.getFilteredAttributes = function(data) {
    var results = [];

    data.features.forEach(function(feature) {
        if(this.identifyAttributes && feature.properties) {
            var filteredAttributes = {};
            var attributesUpdated = false;
            this.identifyAttributes.forEach(function(prop) {
                var dataProp = feature.properties[prop];
                if(dataProp) {
                    attributesUpdated = true;
                    filteredAttributes[prop] = dataProp;
                }
            });
            if(attributesUpdated) {
                feature.properties = filteredAttributes;
            }
        }
        if(feature.properties) {
            if (this.sldMap) {
                var st = "" + feature["properties"]["Pixel Value"];
                $.each(this.sldMap, function (key, value) {
                    if (parseFloat(key) == parseFloat(st)) {
                        feature["properties"]["Pixel Value"] = value["label"];
                    }
                });
            }
            results.push({
                geojson: feature
            });
        }
    }, this);

    return results;
};

/**
 * Sends an ajax request to get information from the service.
 * @callback getInfoRequest
 * @returns {jqXHR} - response from the ajax request
 */

/**
 * Handles data from an ajax request.
 * @callback onSuccessCallback
 * @param {*} data - the data from the server
 */

/**
 * Makes sure the service is up and returns information by sending a request for information. Returns
 *  true if the service appears to be working, false otherwise.
 * @param {getInfoRequest} getInfoRequest - function to get the service information
 * @param {onSuccessCallback} onSuccessCallback - called to handle the successful response from the getInfoRequest
 * @promise {boolean}
 */
MapLayerBase.prototype.verifyService = function(getInfoRequest, onSuccessCallback) {
    var that = this;
    if(getInfoRequest) {
        return getInfoRequest.call(that)
            .then(function (data) {
                that.isValid = true;
                onSuccessCallback.call(that, data);
                return true;
            })
            .catch(function (err) {
                //if this service is not compatible we assume that it is valid, will probably bite us when this kind of a
                // service is down... Not sure what else to do though
                if(that.notCompatable) {
                    that.isValid = true;
                    return true;
                }
                // if(err.statusText !== 'timeout') {
                //     that.isValid = false;
                // }
                return false;
            });
    }
    return Promise.resolve(true);
};

/**
 * Update the leafletLayer's opacity with newOpacity.
 * @param {number} newOpacity - value between 1 and 0 for the layer's new opacity (1 is totally opaque,
 *  0 totally clear)
 */
MapLayerBase.prototype.updateOpacity = function(newOpacity) {
    if(this.leafletLayer.options.opacity == newOpacity) {
        return;
    }
    this.leafletLayer.setOpacity(newOpacity);
};
/**
 * Get the opacity of the leafletLayer.
 * @returns {number} - opacity of the layer between 1 and 0
 */
MapLayerBase.prototype.getOpacity = function() {
    return getValueOrDefault(this.leafletLayer.options.opacity, .75);
};