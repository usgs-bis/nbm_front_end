'use strict';

/**
 * BioScapeGroup for any group that is not base map layers. Calls the BioScapeGroupBase constructor.
 * @param {string} id - id of the group
 * @param {*} serverGroup - section json from the server
 * @param {Array} layers - ids of the layers to turn on (from the saved state)
 * @constructor
 * @extends BioScapeGroupBase
 */
var BioScapeGroup = function(id, serverGroup, layers) {
    this.legend = false;
    this.expand = serverGroup.expand;
    this.displayOpacityControl = serverGroup.opacityControl && serverGroup.opacityControl !== undefined;
    var layerHtmlControl = new LayerHtmlControl(this, serverGroup.selectionType, function(layerId) {return $("#" + layerId + " .layer-control")});
    BioScapeGroupBase.call(this, id, serverGroup, layers, layerHtmlControl);
};
inherit(BioScapeGroupBase, BioScapeGroup);

BioScapeGroup.prototype.createLayer = function(serverLayer, layerId) {
    var newLayer = new BioScapeLayer(layerId, this, serverLayer);
    if(newLayer.legend) {
        this.legend = true;
    }
    return newLayer;
};
BioScapeGroup.prototype.initializeGroup = function() {

    var promise = BioScapeGroupBase.prototype.initializeGroup.call(this);
    if(this.expand) {
        toggleContainer(this.id);
    }
    $('#' + this.id + ' [title]').tooltip({
        placement: 'right',
        container: 'body'
    });
    this.getLayers().forEach(function(layer) {
        layer.updateAvailabilityAndReturnIsAvailable();
    });

    return promise;
};
BioScapeGroup.prototype.addHtmlToPage = function() {
    var layersInfo = [];
    var layers = this.getLayers();
    layers.forEach(function(layer) {
        var toggle = layer.selected ? this.layerHtmlControl.layerOnCss : this.layerHtmlControl.layerOffCss;
        var opacitySettings = undefined;
        if(this.displayOpacityControl) {
            var opacity = layer.getOpacity();
            opacitySettings = {
                opacity: opacity,
                displayCss: layer.selected ? 'block' : 'none'
            }
        }
        layersInfo.push({
            divId: layer.id,
            title: layer.title,
            toggle: toggle,
            opacitySettings: opacitySettings,
            zoomLimits: layer.zoomLimits,
            timeControl: layer.mapLayer.timeControl,
            imagePath: homePath,
            disableControl: layer.disableControl
        });
    }, this);

    var viewData = {
        divId: this.id,
        title: this.title,
        layers: layersInfo
    };

    if(this.legend) {
        $('#bioScapeLegend').show();
    }

    var html = getHtmlFromJsRenderTemplate('#bioScapeGroupTemplate', viewData);
    $("#bioScape").append(html);
};
BioScapeGroup.prototype.updateLayerOpacity = function(layerId, newOpacity) {
    var layer = this.layers[layerId];
    layer.updateOpacity(newOpacity);
};