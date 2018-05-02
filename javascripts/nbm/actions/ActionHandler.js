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
var ActionHandler = function (config, layer, noAction) {
    this.noAction = noAction ? true : false;
    this.type = config.actionType;
    this.displayCriteria = config.displayCriteria;
    this.lookupProperty = config.lookupProperty;
    this.placeNameProperty = config.placeNameProperty;
    this.headerBap = config.headerBap ? config.headerBap : undefined;
    this.baps = config.baps;
    this.result = undefined;
    this.additionalParams = config.additionalParams;
    this.crossoverBaps = config.crossoverBaps;
    this.spinner = $('<div class="spinnerContainer"><i class="fa fa-spinner fa-pulse"></i></div>');
    this.synthesisComposition = config.synthesisComposition;
    this.updatedParams = config.additionalParams;

    this.layer = layer;
    this.html = "";
    this.trigger = undefined;
    this.noDataValue = config.noDataValue;
    this.config = config
};

ActionHandler.prototype.getAllBapsToProcess = function () {
    var bapsToProcess = [];

    if (this.baps) {
        $.each(this.baps, function (index, bap) {
            bapsToProcess.push(bap);
        });
    }

    $.each(actionHandlerHelper.crossoverBaps, function (index, bap) {
        if (bapsToProcess.indexOf(bap) == -1) {
            bapsToProcess.push(bap);
        }
    });

    return bapsToProcess;
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

    var bapsToProcess = this.getAllBapsToProcess();

    $.each(bapsToProcess, function (index, bapId) {
        var tempBap = that.getBapValue(bapId);

        if (tempBap) {
            tempBap.setEmptyBap();
        } else {
            tempBap = new BAP({id: bapId}, undefined, that);
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
        that.updatedParams = myMap;

        // that.setBapValue(bapId, undefined);

        promises.push(sendJsonAjaxRequest(myServer + "/bap/get", myMap)
            .then(function (myJson) {
                if (myJson.error) {
                    console.log("Got an error: ", myJson);
                    var message = "Error sending request to the BCB API, ";
                    message += "please contact site admin if the problem continues.";

                    if (!actionHandlerHelper.handleBapError(myJson.requestParams.id, message)) {
                        console.log("Could not set BAP error, BAP does not exist");
                    }
                    return Promise.resolve();
                }

                var bap = that.getBapValue(myJson.id);
                bap.reconstruct(myJson);
                bap.initializeBAP();
                that.setBapValue(myJson.id, bap);

                return Promise.resolve();
            }).catch(function(ex) {
                console.log("Getting an error here?", ex);
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

            // Header bap is elastic 
            if(myJson.elastic){
         
                let elasticQuery = {
                    "from" : 0, "size" : 1,
                    "query" : {
                        "bool" : {
                            "must" : [
                            ]
                        }
                    }
                };

                let match = {match:{}}
                let lc = myJson.lookupColumnElastic
                match["match"][lc] = myMap.featureValue
                elasticQuery["query"]["bool"]["must"].push(match);
                let elasticUrl = myJson.elasticUrl + encodeURI(JSON.stringify(elasticQuery));

                let data =  $.getJSON(elasticUrl)
                    .then(function (data) {
                        return Promise.resolve(data["success"]["hits"]["hits"][0]["_source"]["properties"]);
                    }).then(function(data) {

                        myJson.returnedFields.map(x =>{
                            myJson[x.returnMapping] = data[x.column] 
                        })

                        myJson.description = myJson.description ?  myJson.description :  `Summarized data for ${myJson.title}`
                        myJson.type = myJson.bapType
                        if(myJson.featureInfoBap) {
                            that.bestGuessFields(bap);
                        }
                        bap.initializeBAP(headerBapId);
                        that.addHeaderBaptoSC(bap);
                        return Promise.resolve();

                    })
                    .fail(function () {
                        console.log("An Header Bap Elastic Search Error Has Occured")
                        actionHandlerHelper.showTempPopup("An Elastic Search Error Has Occured");
                        bap.initializeBAP(headerBapId);
                    });

                }
                else{                    
                    if(myJson.featureInfoBap) {
                        that.bestGuessFields(bap);
                    }
                    bap.initializeBAP(headerBapId);
                    that.addHeaderBaptoSC(bap);
                    return Promise.resolve();

                }
           
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
ActionHandler.prototype.sendTriggerAction = function (latLng, isHeader, additionalParams, headerBapId, zoomOutFlag) {
    this.cleanUp();

    $("#synthesisCompositionBody").append(this.spinner);

    this.trigger = new ActionTrigger(latLng, isHeader, additionalParams, headerBapId, this, zoomOutFlag);
    return this.trigger.initialize();
};

/**
 * Set the header bap reference in the synthesis composition object.
 * @param headerBap
 */
ActionHandler.prototype.addHeaderBaptoSC = function (headerBap) {
    actionHandlerHelper.sc.headerBap = headerBap;

    $('#buildReportPdf').on('click', function () {
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
    var allBaps = this.getAllBapsToProcess();
    if (!allBaps) return;
    var that = this;
    $.each(allBaps, function (index, id) {
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

var ActionTrigger = function (latLng, isHeader, additionalParams, headerBapId, parent, zoomOutFlag) {
    var myself = this;
    var that = parent;

    if (typeof zoomOutFlag == 'undefined') {
        zoomOutFlag = true;
    }

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
                        if (zoomOutFlag){
                            if (!isVerticalOrientation()) {
                                centerMapRight(that.feature.getLeafetFeatureBounds());
                            } else {
                                centerMapBottom(that.feature.getLeafetFeatureBounds());
                            }
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

ActionHandler.prototype.sendPostRequest = function (url, params) {
    return sendAjaxRequest({
        type: 'POST',
        url: url,
        data: params,
        dataType: 'json',
        error: function (xhr, options, thrownError) {
            var message = "Error sending request to the BCB API, ";
            message += "the dynamic polygon may be too complex.";

            if (!actionHandlerHelper.handleBapError(params.sbId, message)) {
                console.log("Could not set BAP error, BAP does not exist");
            }
        }
    })
};

ActionHandler.prototype.getSimplifiedGeojson = function(geojson) {
    var MIN_LIMIT = 100000;
    var SIG_FIGS = 6;
    var MAX_LOOPS = 4;

    var geojsonLength = JSON.stringify(geojson.geometry).length;

    if (geojsonLength <= MIN_LIMIT) {
        return Promise.resolve(geojson);
    } else if (geojsonLength > 8000000) {
        SIG_FIGS = 4;
    } else if (geojsonLength > 3000000) {
        SIG_FIGS = 5;
    }

    actionHandlerHelper.showTempPopup("The returned complex polygon is being simplified for analysis");

    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            if (G_LIMIT) MIN_LIMIT = G_LIMIT;
            if (G_FIGS) SIG_FIGS = G_FIGS;
            if (G_LOOPS) MAX_LOOPS = G_LOOPS;

            if (DEBUG_MODE) {
                console.log("\nInitial geometry length: ", geojsonLength.toLocaleString());
                console.log("String length limit: ", MIN_LIMIT.toLocaleString());
                console.log("Sig figs: ", SIG_FIGS.toLocaleString());
                console.log("Max loops: ", MAX_LOOPS.toLocaleString());
            }

            // geojson = getRoundedGeometry(geojson, SIG_FIGS);

            // if (DEBUG_MODE) {
            //     console.log("Length after rounding points: ", JSON.stringify(geojson.geometry).length.toLocaleString());
            // }

            // geojsonLength = JSON.stringify(geojson.geometry).length;
            // if (geojsonLength <= MIN_LIMIT) {
            //     return Promise.resolve(geojson);
            // }

            var mult = Math.pow(10, 4);
            var p;
            var count = 0;

            while(geojsonLength >= MIN_LIMIT && count < MAX_LOOPS) {
                count++;
                p = Math.floor(MIN_LIMIT / geojsonLength * mult) / mult;
                if (DEBUG_MODE) {
                    console.log("Length: ", geojsonLength);
                    console.log("p: ", p);
                }
                geojson = getSimplifiedGeojsonObject(geojson, p);
                geojsonLength = JSON.stringify(geojson.geometry).length;
            }

            if (DEBUG_MODE) {
                console.log("Number of simplification iterations: ", count.toLocaleString());
                console.log("Final geometry length: ", JSON.stringify(geojson.geometry).length.toLocaleString(), "\n");
            }

            geojson.geometry.crs = {"type":"name","properties":{"name":"EPSG:4326"}};

            resolve(geojson);
        }, 0);
    });

};