//= require BioScapeLayerBase.js
'use strict';

/**
 * BioScape layer class for any layer that isn't a base map layer. Calls the BioScapeLayerBase.
 * @param {string} id - id for this layer
 * @param {*} section - section this layer is a part of
 * @param {*} layer - json from the server for this layer
 * @constructor
 * @extends BioScapeLayerBase
 */
var BioScapeLayer = function(id, section, layer) {
    BioScapeLayerBase.call(this, id, section, layer);
    this.parsePropertiesFromServer(function (bsl) {
        bsl.zoomLimits = layer.zoomLimits;
        bsl.includeIdentifyLayer = layer.includeIdentifyLayer;
        bsl.layerSectionLink = layer.layerSectionLink;
        bsl.defaultSummaryLayer = layer.defaultSummaryLayer;
        bsl.disableControl = getValueOrDefault(layer.disableControl, false);
        bsl.displayFeatureNegative = layer.displayFeatureNegative;
        bsl.layerSelector = layer.layerSelector;
        bsl.metadataSBId = layer.metadataSBId;
        bsl.addSummarizationInformation(layer.summarizationInfo);
        bsl.addSynthCompInformation(layer.synthesisComposition);
        //bsl.actionHandler = ActionHandler.createActionHandler(layer.actionConfig);
    }, this);
    this.layerMetadata = undefined;
};
inherit(BioScapeLayerBase, BioScapeLayer);

BioScapeLayer.prototype.turnOffLayer = function(keepSelected) {
    BioScapeLayerBase.prototype.turnOffLayer.call(this, keepSelected);
    if (this.hasLegend()) {
        this.legend.clear();
    }
};
BioScapeLayer.prototype.turnOnLayer = function() {
    var that = this;
    return BioScapeLayerBase.prototype.turnOnLayer.call(this)
        .then(function(data) {
            if(data) {
                if(that.legend) {
                    that.legend.displayLegend();
                }
            }
            return data;
        });
};
BioScapeLayer.prototype.updateAvailabilityAndReturnIsAvailable = function() {
    if(!this.zoomLimits) {
        return true;
    }

    return this.isAvailable() ? this.enableLayer() : this.disableLayer();
};
/**
 * Add summarization information to this layer.
 * @param {*} summarizationInfo
 */
BioScapeLayer.prototype.addSummarizationInformation = function(summarizationInfo) {
    if(summarizationInfo) {
        this.summarizationInfo = {
            identifyOnly: getValueOrDefault(summarizationInfo.identifyOnly, false),
            featureIdentifier: summarizationInfo.featureIdentifier
        }
    }
};
/**
 * Add synthesis composition information to this layer.
 * @param {String} synthComp
 */
BioScapeLayer.prototype.addSynthCompInformation = function(synthComp) {
    if (synthComp) {
        this.synthComp = synthComp;
    }
};
/**
 * Returns true if the layer is available at the current zoom level, false otherwise.
 * @returns {boolean}
 */
BioScapeLayer.prototype.isAvailable = function() {
    var currentZoom = map.getZoom();
    return this.zoomLimits.minZoom <= currentZoom && this.zoomLimits.maxZoom >= currentZoom;
};
/**
 * Enables the layer to be toggled on and off by the user.
 * @returns {boolean} - always returns true
 */
BioScapeLayer.prototype.enableLayer = function() {
    $('#' + this.id + ' i')
        .removeClass('disabled')
        .attr('data-original-title', '')
        .tooltip('fixTitle');
    return true;
};
/**
 * Disables the layer from being toggled on and off by the user.
 * @returns {boolean} - always returns false
 */
BioScapeLayer.prototype.disableLayer = function() {
    $('#' + this.id + ' i')
        .addClass('disabled')
        .attr('data-original-title', 'This layer is not available at this zoom level')
        .tooltip('fixTitle');
    return false;
};
/**
 * Display a warning to the user that the layer was removed from the map.
 */
BioScapeLayer.prototype.displayLayerHiddenWarning = function() {
    var selector = $('#' + this.id + ' i');
    //show the popover for 2.5 seconds so the user knows why the layer disappeared
    selector.tooltip('show');
    setTimeout(function() {
        selector.tooltip('hide');
    }, 2500);
};
/**
 * Display metadata information about the layer to the user.
 */
BioScapeLayer.prototype.displayLayerInformation = function() {
    var that = this;
    showSpinner();
    this.getMetadata()
        .then(function(metadata) {
            that.layerMetadata = metadata;
            that.displayMetadata(getHtmlFromJsRenderTemplate('#bioScapeInfoDiv', metadata));
            hideSpinner();
        });
};
/**
 * Get the metadata for this layer from the map service and display it to the user.
 */
BioScapeLayer.prototype.getMetadata = function() {
    var that = this;
    if(this.layerMetadata) {
        return Promise.resolve(this.layerMetadata);
    }

    if(!this.metadataSBId) {
        return Promise.resolve({
            title: this.title
        });
    }

    return sendScienceBaseItemRequest(this.metadataSBId)
        .then(function(data) {
            return {
                title: that.title,
                body: data.body,
                citation: data.citation,
                url: data.link.url
            }
        });

    // return this.mapLayer.getMetadataFromMapService()
    //     .then(function(data) {
    //         var metadata = data.metadata;
    //         return {
    //             title: that.title,
    //             bapReference: that.mapLayer.serviceUrl,
    //             metadata: metadata,
    //             metadataHtml: getHtmlFromJsRenderTemplate(data.template, metadata)
    //         };
    //     });
};
/**
 * Display a modal to the user with the metadata about this layer.
 * @param {string} metadataHtml - html to display in the modal
 */
BioScapeLayer.prototype.displayMetadata = function(metadataHtml) {
    $('#generalModalContent').html(metadataHtml);
    $("#generalModal").modal('show');
};
/**
 * Update the layer's opacity with newOpacity.
 * @param {number} newOpacity - value between 1 and 0 for the layer's new opacity (1 is totally opaque,
 *  0 totally clear)
 */
BioScapeLayer.prototype.updateOpacity = function(newOpacity) {
    this.mapLayer.updateOpacity(newOpacity);
};

/**
 * Send an identify request for latLng and add any additional information to the features the user may want from
 *  this layer.
 * @param {Object} latLng - L.LatLng
 * @promise {Array.<{*}>} - array of objects returned by identify
 */
BioScapeLayer.prototype.getIdentifyResultsForDisplay = function(latLng) {
    var that = this;
    return this.getIdentifyResults(latLng)
        .then(function(features) {
            return features.map(function(feature) {
                feature.name = that.featureName ? feature.geojson.properties[that.featureName] : feature.geojson.id;
                feature.layerName = that.title;
                return feature;
            });
        });
};
/**
 * Send an identify request for latLng to the map service and return the results.
 * @param {Object} latLng - L.LatLng
 * @promise {Array.<{*}>} - array of objects returned by identify
 */
BioScapeLayer.prototype.getIdentifyResults = function(latLng) {
    return this.mapLayer.getIdentifyResults(latLng)
        .catch(function(err) {
            console.log('There was an error identifying at [' + latLng.lng + ', ' + latLng.lat + ']. Error: ' + err.message);
            return [];
        });
};