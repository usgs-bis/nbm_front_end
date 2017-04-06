'use strict';

/**
 * BioScape layer for base map layers. Calls the BioScapeLayer constructor.
 * @param {string} id - id for this layer
 * @param {*} section - section this layer is a part of
 * @param {*} layer - json from the server for this layer
 * @constructor
 * @extends BioScapeLayerBase
 */
var BioScapeBaseMapLayer = function(id, section, layer) {
    BioScapeLayerBase.call(this, id, section, layer);
    this.parsePropertiesFromServer(function (bsbml) {
        bsbml.thumbnailImage = layer.thumbnailImage;
    }, this);
};
inherit(BioScapeLayerBase, BioScapeBaseMapLayer);