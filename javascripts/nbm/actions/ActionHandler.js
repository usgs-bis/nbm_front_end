//= require ../baps/BAP.js
//= require ../baps/HeaderBAP.js
//= require ../SynthesisComposition.js

'use strict';

/**
 * This is the base class for all of the action handler objects.
 * @param {Object} config - the actionConfig inside the bioscape for this layer
 * @param {Object} layer

 * @constructor
 */
var ActionHandler = function (config, layer) {
    this.type = config.actionType;
    this.displayCriteria = config.displayCriteria;
    this.lookupProperty = config.lookupProperty;
    this.headerBap = config.headerBap ? config.headerBap : undefined;
    this.baps = config.baps;
    this.result = undefined;
    this.additionalParams = config.additionalParams;
    this.spinner = $('<div class="spinnerContainer"><i class="fa fa-spinner fa-pulse"></i></div>');
    this.synthesisComposition = config.synthesisComposition;

    this.layer = layer;
    this.html = "";
    this.trigger = undefined;
    this.noDataValue = config.noDataValue;
};

/**
 * Send all of the BAP requests for this action and create the BAPs in the context report.
 * @param additionalParams - additional parameters to send to the BAP API.
 */
ActionHandler.prototype.processBaps = function (additionalParams) {
    var that = this;
    if (this.synthesisComposition) {
        actionHandlerHelper.sc.featureValue = that.result.geojson.properties[that.lookupProperty];
    }

    var promises = [];

    $.each(this.baps, function (index, bapId) {
        var tempBap = that.getBapValue(bapId);

        if (tempBap) {
            tempBap.setEmptyBap();
        } else {
            tempBap = new BAP({id: bapId});
            that.setBapValue(bapId, tempBap);
        }

        var myMap = {};
        myMap.id = bapId;
        myMap.featureValue = that.result.geojson.properties[that.lookupProperty];
        $.each (additionalParams, function (index, obj) {
            $.each(obj, function (key, value) {
                myMap[key] = value;
            });
        });

        // that.setBapValue(bapId, undefined);

        promises.push(sendJsonAjaxRequest(myServer + "/bap/get", myMap)
            .then(function (myJson) {
                var bap = that.getBapValue(myJson.id);
                bap.reconstruct(myJson);
                bap.initializeBAP();
                that.setBapValue(myJson.id, bap);

                return Promise.resolve();
            }).catch(function(ex) {
                return Promise.resolve();
            }));
    });

    return Promise.all(promises);
};

/**
 * The "header BAP" is treated a bit differently than the other BAPs since it is more basic data about a specified region
 * @param additionalParams
 * @param headerBapId
 * @returns {*}
 */
ActionHandler.prototype.processHeaderBap = function (additionalParams, headerBapId) {
    var that = this;
    var myMap = {};
    myMap.id = this.headerBap;
    myMap.featureValue = this.result.geojson.properties[this.lookupProperty];

    if (this.synthesisComposition) {
        actionHandlerHelper.sc.featureValue = that.result.geojson.properties[that.lookupProperty];
    }

    $.each (additionalParams, function (index, obj) {
        $.each(obj, function (key, value) {
            myMap[key] = value;
        });
    });

    var bap = new HeaderBAP({},headerBapId);
    bap.requestOptions = myMap;
    bap.showSpinner();

    return sendJsonAjaxRequest(myServer + "/bap/get", myMap)
        .then(function (myJson) {
            that.spinner.remove();
            bap.config = myJson;
            bap.sbId = myJson.id;
            bap.featureValue = myJson.featureValue;

            if(myJson.featureInfoBap) {
                that.bestGuessFields(bap);
            }

            bap.initializeBAP(headerBapId);
            that.addHeaderBaptoSC(bap);
            return Promise.resolve();
        });
};

ActionHandler.prototype.bestGuessFields = function (bap) {
    if (!this.feature || !this.feature.geojson || !this.feature.geojson.properties) return;

    bap.config.title = "";
    bap.config.acres = 0;
    bap.config.type = "";

    $.each(this.feature.geojson.properties, function (key, value) {
        if (!bap.config.title && key.indexOf("name") != -1) {
            bap.config.title = value;
        } else if (!bap.config.title && key.indexOf("title") != -1) {
            bap.config.title = value;
        }

        if (!bap.config.acres && key.indexOf("acre") != -1) {
            bap.config.acres = value;
        }
    });
};

/**
 * Most actions use this as their trigger to get the data they need to send into the BAP API.
 * @param {Object} latLng - L.LatLng
 * @param {boolean} isHeader - if this is true, process the header bap before doing the other baps for this action
 * @param additionalParams
 * @param headerBapId
 */
ActionHandler.prototype.sendTriggerAction = function (latLng, isHeader, additionalParams, headerBapId) {
    this.cleanUp();

    $("#synthesisCompositionBody").append(this.spinner);

    this.trigger = new ActionTrigger(latLng, isHeader, additionalParams, headerBapId, this);
    return this.trigger.initialize();
};

/**
 * Set the header bap reference in the synthesis composition object.
 * @param headerBap
 */
ActionHandler.prototype.addHeaderBaptoSC = function (headerBap) {
    actionHandlerHelper.sc.headerBap = headerBap;

    $('#buildReportPdf').click(function () {
        if (!actionHandlerHelper.canDownloadPdf) {
            actionHandlerHelper.showTempPopup("Please wait for all analysis packages to process before downloading the PDF");
            return;
        }
        actionHandlerHelper.sc.setPdf(actionHandlerHelper.marker ? actionHandlerHelper.marker.leafletMarker : undefined);
    });
};

/**
 * Sets the value of the bap in the bap map in the synthesis composition. The bap map comes in really handy for the
 * PDF creation
 * @param id
 * @param value
 */
ActionHandler.prototype.setBapValue = function (id, value) {
    actionHandlerHelper.sc.baps[id] = value;
};

/**
 * Sets the value of the bap in the bap map in the synthesis composition. The bap map comes in really handy for the
 * PDF creation
 * @param id
 * @param value
 */
ActionHandler.prototype.getBapValue = function (id) {
    return actionHandlerHelper.sc.baps[id];
};

/**
 * The base function for the other actions to overwrite
 */
ActionHandler.prototype.cleanUp = function () {
    this.cleanUpBaps();
};

ActionHandler.prototype.cleanUpBaps = function () {
    if (!this.baps) return;
    var that = this;
    $.each(this.baps, function (index, id) {
        var bap = that.getBapValue(id);
        if (bap) bap.cleanUp();
    });
};

/**
 * This is used in a couple of cases. The drawPolygon actions use this to create a feature to store in their
 * associated baps.
 * The other case it is used in is when the getFeatureGeojson action has a very complex polygon.
 * The pseudo flag is set to true so the BoxAndWhiskerWidget won't try to simplify this feature.
 * @param gj
 * @returns {{geojson: {geometry: *, pseudo: boolean}, layer: (Object|*), getLeafetFeatureBounds: getLeafetFeatureBounds}}
 */
ActionHandler.prototype.createPseudoFeature = function (gj) {
    var that = this;
    var geojson = new L.geoJson(gj);

    return {
        geojson: {
            geometry: gj,
            pseudo: true
        },
        layer: that.layer,
        getLeafetFeatureBounds: function () {
            return geojson.getBounds();
        }
    };
};

var ActionTrigger = function (latLng, isHeader, additionalParams, headerBapId, parent) {
    var myself = this;
    var that = parent;

    this.initialize = function () {
        return that.layer.getIdentifyResults(latLng)
            .then(function(data) {
                var promises = [];

                if (that.trigger !== myself) {
                    return Promise.resolve();
                }
                that.spinner.remove();
                that.result = data[0];

                if(!that.result || (that.lookupProperty && that.result.geojson.properties[that.lookupProperty] == that.noDataValue)) {
                    throw 'No result was identified at this point';
                }

                if (actionHandlerHelper.headerSent && isHeader) {
                    console.log("Two synthesis compositions have data here, only displaying the first.");
                    return Promise.resolve({headerSent: true});
                }

                actionHandlerHelper.sc.id = that.synthesisComposition;

                if (isHeader) {
                    actionHandlerHelper.headerSent = true;
                    promises.push(that.processHeaderBap(additionalParams, headerBapId));
                    promises.push(that.processBaps(additionalParams));
                    // .then(function () {
                    //     return that.processBaps(additionalParams);
                    // })
                    // .catch(function (ex) {
                    //     return Promise.resolve();
                    // });
                } else {
                    promises.push(that.processBaps(additionalParams));
                }

                if (that.result.geojson && that.result.geojson.geometry) {
                    try {
                        if (that.feature) that.feature.remove();
                        that.feature = new Feature(that.result.geojson, latLng, "", that.layer.displayFeatureNegative);
                        that.feature.show();
                        if (!isVerticalOrientation()) {
                            centerMapRight(that.feature.getLeafetFeatureBounds());
                        } else {
                            centerMapBottom(that.feature.getLeafetFeatureBounds());
                        }
                    } catch(ex) {
                        throw new Error('Error creating a feature from the returned data');
                    }
                }

                return Promise.all(promises);
            })
            .catch(function (ex) {
                that.spinner.remove();
                console.log("No result was identified at this point");
                return Promise.resolve({noData: true});
            });
    }
};