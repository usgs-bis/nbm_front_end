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

                    promises.push(sendGeojsonChunks(myMap.featureValue, token)
                        .then(function () {
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
