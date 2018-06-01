'use strict';

/**
 * The action object for when polygons are submitted. Calls the parent ActionHandler object.
 * @param {Object} config - the actionConfig inside the bioscape for this layer
 * @param {Object} layer

 * @constructor
 */
var DrawPolygonActionHandler = function (config, layer) {
    this.geojson = undefined;
    ActionHandler.call(this, config, layer);
};

inherit(ActionHandler, DrawPolygonActionHandler);

/**
 * The "header BAP" is treated a bit differently than the other BAPs since it is more basic data about a specified region
 * @param additionalParams
 * @param headerBapId
 * @returns {*}
 */
DrawPolygonActionHandler.prototype.processHeaderBap = function (additionalParams, headerBapId) {
    var that = this;
    var gj = JSON.stringify(this.geojson);

    var myMap = {};
    myMap.id = this.headerBap;
    myMap.featureValue = gj;

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
            bap.initializeBAP(headerBapId);
            that.addHeaderBaptoSC(bap);
            return Promise.resolve();
        });
};

/**
 * Creates the BAPs associated with this action, and creates a pseudo feature. The pseudo feature is basically only
 * used at this point with the BoxAndWhiskerWidget.
 */
DrawPolygonActionHandler.prototype.processBaps = function () {
    var gj = JSON.stringify(this.geojson);
    var that = this;

    var promises = [];

    var bapsToProcess = this.getAllBapsToProcess();

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

        myMap.sbId = bapId;
        myMap.featureValue = gj;

        // that.setBapValue(bapId, undefined);

        promises.push(sendPostRequest(myServer + "/bap/get", myMap)
            .then(function(data) {
                var bap = that.getBapValue(data.id);
                bap.reconstruct(data, false);
              
                bap.feature = that.feature;
                bap.feature.userDefined = true;
                bap.initializeBAP();
                that.setBapValue(data.id, bap);
                return Promise.resolve();
            })
            .catch(function (ex) {
                console.log(ex)
            }));
    });

    return Promise.all(promises);
};

/**
 * Sets this actions polygon/feature object for use by its baps
 * @param isHeader
 * @param headerBapId
 */
DrawPolygonActionHandler.prototype.sendTriggerAction = function (isHeader, headerBapId) {
    var that = this;
    var promises = [];

    if (!drawnItems) return Promise.resolve();

    this.geojson = {
        type: "MultiPolygon",
        crs: {"type":"name","properties":{"name":"EPSG:4326"}},
        coordinates: [
            [
            ]
        ]
    };
    drawnItems.eachLayer(function (layer) {
        var arr = [];
        for (var i = 0; i < layer["_latlngs"][0].length; i++) {
            arr.push([layer["_latlngs"][0][i]["lng"], layer["_latlngs"][0][i]["lat"]]);
        }

        arr.push([layer["_latlngs"][0][0]["lng"], layer["_latlngs"][0][0]["lat"]]);

        that.geojson.coordinates[0].push(arr);
    });

    if (this.geojson.coordinates[0].length == 0) return Promise.resolve();

    this.feature = this.createPseudoFeature(this.geojson);

    try {
        if (!isVerticalOrientation()) {
            centerMapRight(that.feature.getLeafetFeatureBounds());
        } else {
            centerMapBottom(that.feature.getLeafetFeatureBounds());
        }
    } catch(ex) {
        console.log("Error zooming to drawn feature", ex);
    }

    if (isHeader) {
        if (!actionHandlerHelper.headerSent) {
            promises.push(this.processHeaderBap({}, headerBapId));
            actionHandlerHelper.headerSent = true;
        }
        promises.push(this.processBaps());
        //     .then(function () {
        //         return that.processBaps();
        //     }).
        // catch(function (ex) {
        //     console.log("Error:", ex);
        //     actionHandlerHelper.decrementJobWaiting(that);
        // });
    } else {
        promises.push(this.processBaps());
    }

    return Promise.all(promises);
};

DrawPolygonActionHandler.prototype.cleanUp = function () {
    this.geojson = undefined;

    this.cleanUpBaps();

    actionHandlerHelper.cleanUpDrawnPolygons();
};