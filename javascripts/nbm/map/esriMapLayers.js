//= require FileDownloader.js
//= require MapLayerBase.js
'use strict';

/**
 * Base class for all esri MapLayers. Calls the MapLayerBase constructor.
 * @param {string} serviceUrl
 * @param {*} leafletLayer - the layer object appropriate for the service
 * @param {Array.<string>} identifyAttributes
 * @constructor
 * @extends MapLayerBase
 */
var EsriMapLayer = function(serviceUrl, leafletLayer, identifyAttributes) {
    MapLayerBase.call(this, serviceUrl, leafletLayer, identifyAttributes);

    bindEsriLayerEvents(this);

    function bindEsriLayerEvents(self) {
        self.leafletLayer.on("requeststart", showSpinner);
        self.leafletLayer.on("load", hideSpinner);
        self.leafletLayer.on("tileerror", function () {
            hideSpinner();
            // self.removeFromMap();
            console.log("An error occured while loading the map from '"+self.serviceUrl+".' Some of the tiles might not have loaded. " +
                "If the problem continues, please try again later as the layer might be under maintenance.");
            // showErrorDialog("Error loading map layer, '"+self.serviceUrl+".' If the problem continues, please try again later as the layer might be under maintenance.");
        });
    }
};
inherit(MapLayerBase, EsriMapLayer);

// EsriMapLayer.prototype.getMetadataFromMapService = function() {
//     var that = this;
//     var layerIndex = that.leafletLayer.options.layers[0]; //only support one layer right now
//     //send a request for the general service's information json and the specific layer's information json
//     return Promise.all([$.getJSON(this.serviceUrl + '?f=pjson'), $.getJSON(this.serviceUrl + '/' + layerIndex + '?f=pjson')])
//         .then(function(data) {
//             var serviceData = data[0];
//             var layerData = data[1];
//             var layerInfo = {
//                 name: layerData.name,
//                 description: layerData.description
//             };
//             that.layerMetadata = {
//                 serviceDescription: serviceData.serviceDescription,
//                 mapName: serviceData.mapName,
//                 layerInfo: layerInfo,
//                 description: serviceData.description,
//                 copyrightText: serviceData.copyrightText,
//                 documentInfo: serviceData.documentInfo
//             };
//             return {metadata: that.layerMetadata, template: '#bioScapeEsriMetadataTemplate'};
//         })
//         .catch(function() {
//             return that.getGenericMapServiceInfo();
//         });
// };
EsriMapLayer.prototype.getIdentifyResults = function(latLng) {
    var that = this;
    var layersString = 'all:' + (this.leafletLayer.getLayers ? this.leafletLayer.getLayers().join(',') : this.leafletLayer.options.layers.join(','));
    return new Promise(function(resolve) {
        that.leafletLayer.identify().on(map).at(latLng).tolerance(1).simplify(map, 0).layers(layersString)//.returnGeometry(false)
            .run(function(err, data) {
                resolve(that.getFilteredAttributes(data));
            })
    });
};
EsriMapLayer.prototype.verifyService = function() {
    return MapLayerBase.prototype.verifyService.call(this, function() {return sendJsonRequestHandleError(this.serviceUrl + '?f=pjson');}, setDownloader);

    function setDownloader(data) {
        var supportedExtns = data.supportedExtensions.split(',');
        for(var i = 0;i < supportedExtns.length; i++) {
            var service = supportedExtns[i].trim();
            if(MAP_SERVICE_MAP[service]) {
                this.downloader = new MAP_SERVICE_MAP[service](this.serviceUrl + '/' + service, this.leafletLayer.options.layers[0]);
                this.downloader.initialize();
                return;
            }
        }
    }
};

/**
 * Class for layers of type "esri.tiledMapLayer". Calls the MapLayerBase constructor.
 * @param {*} properties - leaflet properties to apply to this layer
 * @param {Array.<string>} identifyAttributes
 * @constructor
 * @extends EsriMapLayer
 */
var EsriTiledMapLayer = function(properties, identifyAttributes) {
    EsriMapLayer.call(this, properties.url, L.esri.tiledMapLayer(properties), identifyAttributes);
};
inherit(EsriMapLayer, EsriTiledMapLayer);

// EsriTiledMapLayer.prototype.getMetadataFromMapService = function() {
//     return EsriMapLayer.prototype.getMetadataFromMapService.call(this)
//         .then(function(data) {
//             //We don't want/need layer information for tiled services right now
//             data.metadata.layerInfo = undefined;
//             return data;
//         });
// };

/**
 * Class for layers of type "esri.dynamicMapLayer". Calls the MapLayerBase constructor.
 * @param {*} properties - leaflet properties to apply to this layer
 * @param {Array.<string>} identifyAttributes
 * @constructor
 * @extends EsriMapLayer
 */
var EsriDynamicMapLayer = function(properties, identifyAttributes) {
    //displays this layer on the same Leaflet pane as the other tileLayers
    // otherwise EsriDynamicLayers would always overlay all other tileLayers
    properties.pane = 'tilePane';
    EsriMapLayer.call(this, properties.url, L.esri.dynamicMapLayer(properties), identifyAttributes);
    //since we are adding this element to the tilePane keep track of the zIndex
    // (Leaflet won't for L.esri.dynamicMapLayers)
    //if zIndex from the config isn't present default zIndex to 1 (base maps are usually 0)
    this.zIndex = properties.zIndex ? properties.zIndex : 1;

    var self = this;
    //once the layer has been added to the map we update the zIndex so it'll display correctly
    // relative to the other layers in the 'tilePane' pane
    this.leafletLayer.on('load', function () {
        self.updateZIndex();
    });
};
inherit(EsriMapLayer, EsriDynamicMapLayer);

var esriDynamicLayerQueue = [];

EsriDynamicMapLayer.prototype.updateZIndex = function () {
    var self = this;
    for (var i = esriDynamicLayerQueue.indexOf(self) + 1; i < esriDynamicLayerQueue.length; i++) {
        if (esriDynamicLayerQueue[i].zIndex == self.zIndex) {
            esriDynamicLayerQueue[i].leafletLayer.bringToFront();
        }
    }

    $.each(esriDynamicLayerQueue, function (index, layer) {
        if (layer.zIndex > self.zIndex) {
            layer.leafletLayer.bringToFront();
        }
    });
};

EsriDynamicMapLayer.prototype.addToMap = function() {
    esriDynamicLayerQueue.push(this);
    MapLayerBase.prototype.addToMap.call(this);
};


EsriDynamicMapLayer.prototype.removeFromMap = function () {
    esriDynamicLayerQueue.splice(esriDynamicLayerQueue.indexOf(this), 1);
    MapLayerBase.prototype.removeFromMap.call(this);
};