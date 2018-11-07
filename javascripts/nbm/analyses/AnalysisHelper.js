'use strict';

var AnalysisHelper = function () {
    this.marker = undefined;
    this.timeSlider = false;
};

AnalysisHelper.prototype.getWidget = function (config, bap) {
    if (config.type === "hierarchyByPixel") {
        return new HierarchyByPixelAnalysis(config);
    } else if (config.type === "hierarchyTable") {
        return new HierarchyTableAnalysis(config);
    } else if (config.type === "eco_AOI") {
        return new AOIEcosystemProtectionAnalysis(config,bap);
    } else if (config.type === "species_AOI") {
        return new AOISpeciesProtectionAnalysis(config,bap);
    } else if (config.type === "richness") {
        return new SpeciesRichnessAnalysis(config);
    } else if (config.type === "dynamicMatrix") {
        return new CnrMatrixAnalysis(config);
    } else if (config.type === "boxAndWhisker") {
        return new BoxAndWhiskerAnalysis(config, bap);
    } else if (config.type === "rasterQuery") {
        return new BarChartAnalysis(config);
    } else if (config.type === "vectorQuery") {
        return new BarChartAnalysis(config);
    } else if (config.type === "nfhp") {
        return new NFHPAnalysis(config,bap);
    } else if (config.type === "nfhp_disturbance") {
        return new NFHPDisturbanceAnalysis(config);
    } else if (config.type === "hierarchyByPixelElastic") {
        return new HBPElasticAnalysis(config, bap);
    } else if (config.type === "hierarchyTableElastic") {
        return new HierarchyTableAnalysisElastic(config, bap);
    } else if (config.type === "histogram") {
        return new HistogramAnalysis(config, bap);
    } else if (config.type === "smoothPlot") {
        return new SmoothPlotAnalysis(config, bap);
    } else if (config.type === "comparePlot") {
        return new CompareAnalysis(config, bap);
    } else if (config.type === "obis") {
        return new ObisAnalysis(config, bap);
    } else if (config.type === "Phenocasts") {
        return new PhenocastsAnalysis(config, bap);
}
};

AnalysisHelper.prototype.addTimeSlider = function () {
    if (this.timeSlider) {
        let t = $("#GlobalTimeSliderRange")
        t.trigger('slidechange');
        return (t)
    }

    $("#GlobalTimeControl").find("#GlobalTimeSliderInner").append('<div id="GlobalTimeSliderRange" class=" GlobalTimeSliderRange"></div>')
    let globalTs = $("#GlobalTimeSlider").slider("widget");
    let ts = $("#GlobalTimeSliderRange")

    let min = globalTs.slider("option", "min");
    let max = globalTs.slider("option", "max");

    let t1Value = widgetHelper.initialTsConfig.rangeMinStart ?
        widgetHelper.initialTsConfig.rangeMinStart :
        (min + .25 * (max - min)).toFixed(0)
    let t2Value = widgetHelper.initialTsConfig.rangeMaxStart ?
        widgetHelper.initialTsConfig.rangeMaxStart :
        (min + .5 * (max - min)).toFixed(0)

    var sliderTooltip = function (event, ui) {

        if (ui.values) {
            t1Value = ui.values[0]
            t2Value = ui.values[1]
        }

        var tooltip1 = '<div class="gts-tooltip"><div class="tooltip-inner">' + t1Value + '</div><div class="tooltip-arrow"></div></div>';
        var tooltip2 = '<div class="gts-tooltip"><div class="tooltip-inner">' + t2Value + '</div><div class="tooltip-arrow"></div></div>';
        ts.find('span:eq( 0 )').html(tooltip1);
        ts.find('span:eq( 1 )').html(tooltip2);
    };

    ts.slider({
        range: true,
        min: min,
        max: max,
        step: 1,
        values: [t1Value, t2Value],
        create: sliderTooltip,
        slide: sliderTooltip,
        change: sliderTooltip
    });
    ts.find('.ui-slider-handle').removeClass("ui-corner-all ui-state-default").addClass("glyphicon glyphicon-tag customSliderHandleRange ");

    this.timeSlider = true;
    return ts
}

AnalysisHelper.prototype.getBufferedFeature = function (feature) {
    var geojson = JSON.stringify(feature.geojson.geometry);
    var token = Math.random().toString();
    var numChunks = Math.floor(geojson.length / WAF_LIMIT);
    return sendGeojsonChunks(geojson, token)
        .then(function () {
            geojson = geojson.substring(numChunks * WAF_LIMIT, geojson.length);
            var params = {
                geojson: geojson
            };
            return sendPostRequest(myServer + '/main/getBufferedShape', params, true).then(function (bufferedFeature) {
                bufferedFeature.geometry.crs = { "type": "name", "properties": { "name": "EPSG:4326" } };
                bufferedFeature.type = "Feature";
                actionHandlerHelper.bufferedFeature = bufferedFeature
                return bufferedFeature
            });
        })
        .catch(function(ex) {
            console.log("Getting an error", ex);
        });
};

AnalysisHelper.prototype.getRasterData = function (inputFeature, layer, years, npnProperty) {

    return this.handleRequests(this.getDataRequests(inputFeature, layer, years[0], years[1], npnProperty))

}

AnalysisHelper.prototype.getSingleRasterData = function (inputFeature, layer, timeString, npnProperty) {

    return this.handleRequests(this.getSingleRequest(inputFeature, layer, timeString, npnProperty))

}


AnalysisHelper.prototype.getDataRequests = function (inputFeature, layer, minIdx, maxIdx, npnProperty) {
    var geojsonString = JSON.stringify(inputFeature.geojson.geometry);
    var requests = [];
    var length = maxIdx - minIdx;
    var featureBounds = inputFeature.getLeafetFeatureBounds();
    var bounds = {
        sw: featureBounds.getSouthWest(),
        ne: featureBounds.getNorthEast()
    };
    var yearsPerRequest = 50;
    var years = [];
    var j = 0;
    for (var i = 0; i <= length; i++) {
        var year = (+minIdx + i).toString();
        if (year.indexOf("-01-01") === -1) year += "-01-01T00:00:00.000Z";
        years.push(year);
        ++j;
        if (j === yearsPerRequest || i === length) {
            var request = this.getSendGeojsonRequest(layer, years, geojsonString, bounds, npnProperty);
            requests.push({ years: years, promise: request });
            years = [];
            j = 0;
        }
    }

    return requests;
}

AnalysisHelper.prototype.getSingleRequest = function(inputFeature, layer, timeString, npnProperty) {
    var geojsonString = JSON.stringify(inputFeature.geojson.geometry);
    var featureBounds = inputFeature.getLeafetFeatureBounds();
    var bounds = {
        sw: featureBounds.getSouthWest(),
        ne: featureBounds.getNorthEast()
    };

    return this.getSendGeojsonRequest(layer, [timeString], geojsonString, bounds, npnProperty)
        .then (function (data) {
            // var obj = {};
            // let key = layer.featureName + "," + timeString
            // obj[key] = data[0];
            // return obj

            return data[0]
        });
};

AnalysisHelper.prototype.handleRequests = function (requests) {
    let jsonData = {};
    return requests.reduce(function (sequence, request) {
        return sequence.then(function () {
            return request.promise;
        }).then(function (data) {
            data.forEach(function (d, index) {
                jsonData[request.years[index].substr(0, 4)] = d;
            })
            return jsonData

        }).catch(function (e) {
            console.log(e)
            return false
        });
    }, Promise.resolve())
        .catch(function (e) {
            console.log(e)
            return false
        });
};

AnalysisHelper.prototype.getSendGeojsonRequest = function (layer, years, geojson, bounds, feature) {
    if (geojson.length > WAF_LIMIT) {
        var token = Math.random().toString();
        var numChunks = Math.floor(geojson.length / WAF_LIMIT);
        return sendGeojsonChunks(geojson, token)
            .then(function () {
                geojson = geojson.substring(numChunks * WAF_LIMIT, geojson.length);
                var params = {
                    chunkToken: token,
                    layerName: layer.featureName,
                    'years[]': years,
                    geojson: geojson,
                    south: bounds.sw.lat,
                    west: bounds.sw.lng,
                    north: bounds.ne.lat,
                    east: bounds.ne.lng,
                    npnToken: NPNTOKEN,
                    npnProperty: feature
                };

                return sendPostRequest(myServer + '/main/sendData', params, true);
            });
    } else {
        var params = {
            layerName: layer.featureName,
            'years[]': years,
            geojson: geojson,
            south: bounds.sw.lat,
            west: bounds.sw.lng,
            north: bounds.ne.lat,
            east: bounds.ne.lng,
            npnToken: NPNTOKEN,
            npnProperty: feature
        };

        return sendPostRequest(myServer + '/main/sendData', params, true);
    }
};



