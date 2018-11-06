'use strict';

/**
 * This is the base class all of the BioScapeGroups extend/overwrite.
 * @param {string} id
 * @param {*} serverGroup - the group json from the server
 * @param {Array} layers - ids of the layers to turn on (from the saved state)
 * @param {Object} layerHtmlControl - LayerHtmlControl
 * @constructor
 */
var BioScapeGroupBase = function(id, serverGroup, layers, layerHtmlControl) {
    this.id = id;
    this.title = serverGroup.title;
    this.http = false;
    this.layerInitializationPromises = [];
    this.updateMapOnChangeOverride = getValueOrDefault(serverGroup.updateMapOnChangeOverride, false);

    this.layers = this.createLayers(serverGroup.layers, layers);
    this.layerHtmlControl = layerHtmlControl;
};
/**
 * Builds and returns the layer objects from the server side json.
 * @param {*} serverLayers - layer json from the server
 * @param {Array} stateLayers - ids of the layers to turn on (from the saved state)
 * @returns {Object} - map of layer id to corresponding layer object inheriting BioScapeLayerBase
 */
BioScapeGroupBase.prototype.createLayers = function(serverLayers, stateLayers) {
    var layers = {};
    var self = this;
    serverLayers.forEach(function(serverLayer, idx) {
        var layerId = 'layer' + idx + self.id;
        if(stateLayers.length) {
            serverLayer.selected = stateLayers.indexOf(layerId) !== -1;
        }
        var layer = self.createLayer(serverLayer, layerId);
        if(layer.http) {
            self.http = layer.http;
        }
        self.layerInitializationPromises.push(
            layer.initializeLayer()
                .then(function(data) {
                        if(!data) {
                            self.toggleLayer(layer.id);
                        }
                    })
        );
        layers[layerId] = layer;
    });
    return layers;
};
/**
 * Must be overwriting by inheriting class. Creates a BioScapeLayer from the server json.
 * @param {*} serverLayer - layer json from the server
 * @param {string} layerId - id for the new layer
 * @returns {Object} - object inheriting from BioScapeLayer
 */
BioScapeGroupBase.prototype.createLayer = function(serverLayer, layerId) { };
/**
 * If a layer is selected toggle the layer.
 */
BioScapeGroupBase.prototype.handleOtherLayers = function(secondPass) {
    //if there is another layer turned on get it
    var selectedLayer;
    this.getLayers().forEach(function(layer) {
        if (layer.selected) {
            selectedLayer = layer;
        }
    });
    if(!selectedLayer) {
        //if no layer was found return right away
        return;
    }
    this.toggleLayer(selectedLayer.id, secondPass);
};
/**
 * Handles toggling the layer from off to on and vice versa.
 * @param {string} layerId - the id of the layer to toggle
 * @param {string} secondPass - this helps in resending requests
 */
BioScapeGroupBase.prototype.toggleLayer = function(layerId, secondPass) {

    var layer = this.layers[layerId];

    var timeControl = $("#" + layerId+ "TimeControl");
    if (layer.selected) {
        timeControl.hide();
        layer.turnOffLayer();
        this.layerHtmlControl.handleTurnOff(layerId);

        onFinish();
    } else {
        var that = this;
        layer.mixedContentCheck()
            .then(function(success) {
                if(!success) {
                    return;
                }
                that.layerHtmlControl.handleOtherLayers(true);
                layer.turnOnLayer()
                    .then(function(data) {
                        if(data) {
                            timeControl.show();
                            that.layerHtmlControl.handleTurnOn(layerId);
                            // dynamic map layers need to be brought to top manualy when a basemap is turned on
                            bioScape.getVisibleLayers().forEach(function(l){
                                try{l.mapLayer.updateZIndex()}
                                catch(error){}                           
                            })
                            onFinish();
                        } else {
                            showErrorDialog('The following map service is not available: ' + layer.serviceUrl +
                                '. Some site functionality may not work properly while this service is down' +
                                '. If the problem continues, please contact site admin.');
                        }
                    });
            });
    }

    function onFinish() {
        bioScape.updateState();
        if (!secondPass) {
            actionHandlerHelper.handleLayerChange();
            updateUrlWithState();
        }
    }
};
/**
 * Initialize the group. Returns once all of the layers have been initialized.
 * @promise {*} deferred
 */
BioScapeGroupBase.prototype.initializeGroup = function() {
    this.addHtmlToPage();
    return Promise.all(this.layerInitializationPromises);
};
/**
 * Must be overwritten by the inheriting class. Adds the html of this group to the page.
 */
BioScapeGroupBase.prototype.addHtmlToPage = function() {};
/**
 * Returns all of the summarization layers in this group.
 * @returns {Array.<Object>} - array of any object inheriting BioScapeLayerBase
 */
BioScapeGroupBase.prototype.getSummarizationLayers = function() {
    var result = [];
    var layers = this.getLayers();
    layers.forEach(function(layer) {
        if(layer.isSummarizationLayer()) {
            result.push(layer);
        }
    });
    return result;
};
/**
 * Returns all visible layers in this group.
 * @returns {Array.<Object>} - array of any object inheriting BioScapeLayerBase
 */
BioScapeGroupBase.prototype.getVisibleLayers = function() {
    var result = [];
    var layers = this.getLayers();
    layers.forEach(function(layer) {
        if(layer.isVisible()) {
            result.push(layer);
        }
    });
    return result;
};
/**
 * Returns all layers in this group.
 * @returns {Array.<Object>} - array of any object inheriting BioScapeLayerBase
 */
BioScapeGroupBase.prototype.getLayers = function() {
    var result = [];

    for(var layerId in this.layers) {
        if(this.layers.hasOwnProperty(layerId)) {
            var layer = this.layers[layerId];
            result.push(layer);
        }
    }

    return result;
};