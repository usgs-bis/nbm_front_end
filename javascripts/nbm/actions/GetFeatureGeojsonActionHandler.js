'use strict';

var GetFeatureGeojsonActionHandler = function (config, layer) {
    this.feature = undefined;

    ActionHandler.call(this,
        config, layer);
};

inherit(ActionHandler, GetFeatureGeojsonActionHandler);

GetFeatureGeojsonActionHandler.prototype.processBaps = function (additionalParams) {
    var that = this;
    var promises = [];

    var gj = that.result.geojson;
    gj.geometry.crs = {"type":"name","properties":{"name":"EPSG:4326"}};

    return this.getSimplifiedGeojson(gj)
        .then(function (newGj) {
            var simplified = (newGj != gj);

            var bapsToProcess = that.getAllBapsToProcess();

            $.each(bapsToProcess, function (index, bapId) {
                var tempBap = that.getBapValue(bapId);

                if (tempBap) {
                    tempBap.setEmptyBap();
                } else {
                    tempBap = new BAP({id: bapId});
                    that.setBapValue(bapId, tempBap);
                }

                var myMap = {};
                myMap.id = bapId;
                $.each (additionalParams, function (index, obj) {
                    $.each(obj, function (key, value) {
                        myMap[key] = value;
                    });
                });

                myMap.sbId = bapId;
                myMap.featureValue = JSON.stringify(newGj.geometry);

                if (myMap.featureValue.length > WAF_LIMIT) {
                    var token = Math.random().toString();
                    var numChunks = Math.floor(myMap.featureValue.length / WAF_LIMIT);

                    if (myMap.featureValue.length % WAF_LIMIT == 0) {
                        numChunks--;
                    }

                    if (DEBUG_MODE) console.log("Number of early chunks: ", numChunks);

                    var tempPromises = [];
                    var ok = true;

                    for (var i = 0; i < numChunks; i++) {
                        var sentMap = {
                            chunkToken: token,
                            numChunks: numChunks,
                            featureValue: myMap.featureValue.substring(i * WAF_LIMIT, (i + 1) * WAF_LIMIT),
                            index: i
                        };
                        tempPromises.push(that.sendPostRequest(myServer + "/bap/sendChunk", sentMap)
                            .then(function (chunkReturn) {
                                if (!chunkReturn.success) {
                                    console.log("Got an error in a chunk");
                                    ok = false;
                                }
                                Promise.resolve();
                            }));
                    }

                    promises.push(Promise.all(tempPromises)
                        .then(function () {
                            if (ok) {
                                myMap.chunkToken = token;
                                myMap.featureValue = myMap.featureValue.substring(numChunks * WAF_LIMIT, myMap.featureValue.length);
                                return that.sendPostRequest(myServer + "/bap/get", myMap)
                                    .then(function (data) {
                                        var bap = that.getBapValue(data.id);
                                        bap.reconstruct(data, true);

                                        var feature = that.createPseudoFeature(newGj.geometry);
                                        feature.layer = that.layer;
                                        bap.feature = feature;
                                        bap.simplified = simplified;
                                        bap.initializeBAP();
                                        that.setBapValue(data.id, bap);
                                        return Promise.resolve();
                                    })
                                    .catch(function (ex) {
                                        console.log("Got an error", ex);
                                        return Promise.resolve();
                                    });
                            } else {
                                showErrorDialog('There was an error sending chunked geometry to the API. ' +
                                    'If the problem continues, please contact site admin', false);
                                return Promise.resolve();
                            }
                        }));
                } else {
                    if (DEBUG_MODE) console.log("Sending 1 request");
                    promises.push(that.sendPostRequest(myServer + "/bap/get", myMap)
                        .then(function(data) {
                            var bap = that.getBapValue(data.id);
                            bap.reconstruct(data, true);

                            var feature = that.createPseudoFeature(newGj.geometry);
                            feature.layer = that.layer;
                            bap.feature = feature;
                            bap.simplified = simplified;
                            bap.initializeBAP();
                            that.setBapValue(data.id, bap);
                            return Promise.resolve();
                        })
                        .catch(function (ex) {
                            console.log("Got an error", ex);
                            return Promise.resolve();
                        }));
                }
            });

            return Promise.all(promises);
        });
};

GetFeatureGeojsonActionHandler.prototype.getSimplifiedGeojson = function(geojson) {
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

            geojsonLength = JSON.stringify(geojson.geometry).length;
            if (geojsonLength <= MIN_LIMIT) {
                return Promise.resolve(geojson);
            }

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

GetFeatureGeojsonActionHandler.prototype.cleanUp = function () {
    if (this.feature) {
        this.feature.remove();
        this.feature = undefined;
    }

    if (this.result) {
        this.result = undefined;
    }

    this.cleanUpBaps();
};

GetFeatureGeojsonActionHandler.prototype.sendPostRequest = function (url, params) {
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