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

                promises.push(that.sendPostRequest(myServer + "/bap/get", myMap)
                    .then(function(data) {
                        // console.log("Ret data: ", data);
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
            });

            return Promise.all(promises);
        });
};

GetFeatureGeojsonActionHandler.prototype.getSimplifiedGeojson = function(geojson) {
    var MIN_LIMIT = 21000;
    var SIG_FIGS = 6;
    var MAX_LOOPS = 3;

    var initialLength = JSON.stringify(geojson.geometry).length;

    if (initialLength <= MIN_LIMIT) {
        return Promise.resolve(geojson);
    } else if (initialLength > 8000000) {
        SIG_FIGS = 4;
    } else if (initialLength > 3000000) {
        SIG_FIGS = 5
    }

    actionHandlerHelper.showTempPopup("The returned complex polygon is being simplified for analysis");

    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            if (G_LIMIT) MIN_LIMIT = G_LIMIT;
            if (G_FIGS) SIG_FIGS = G_FIGS;
            if (G_LOOPS) MAX_LOOPS = G_LOOPS;

            if (DEBUG_MODE) {
                console.log("\nInitial geometry length: ", initialLength.toLocaleString());
                console.log("String length limit: ", MIN_LIMIT.toLocaleString());
                console.log("Sig figs: ", SIG_FIGS.toLocaleString());
                console.log("Max loops: ", MAX_LOOPS.toLocaleString());
            }

            geojson = getRoundedGeometry(geojson, SIG_FIGS);

            if (DEBUG_MODE) {
                console.log("Length after rounding points: ", JSON.stringify(geojson.geometry).length.toLocaleString());
            }

            if (JSON.stringify(geojson.geometry).length <= MIN_LIMIT) {
                return Promise.resolve(geojson);
            }

            var count = 0;

            while(JSON.stringify(geojson.geometry).length >= MIN_LIMIT && count < MAX_LOOPS) {
                count++;
                geojson = getSimplifiedGeojsonObject(geojson);
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