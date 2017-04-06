'use strict';

/**
 * Class for layers of type "tileLayer". Calls the MapLayerBase constructor.
 * @param {string} serviceUrl
 * @param {*} properties - leaflet properties to apply to this layer
 * @param {Array.<string>} identifyAttributes
 * @constructor
 * @extends MapLayerBase
 */
var TileMapLayer = function(serviceUrl, properties, identifyAttributes) {
    MapLayerBase.call(this, serviceUrl, L.tileLayer(serviceUrl, properties), identifyAttributes);
    bindTileLayerEvents(this.leafletLayer);
};
inherit(MapLayerBase, TileMapLayer);
