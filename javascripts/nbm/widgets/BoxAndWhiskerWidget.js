'use strict';

var BoxAndWhiskerWidget = function(serverAP,bap) {
    var REQUEST_LIMIT = 50;
    var layer = getLayer(bap);
    var time = undefined;
    var minIdx = undefined;
    var maxIdx = undefined;
    var chart = undefined;
    var hourMinutes;
    var that = this;
    var feature;
    var timeSlider = widgetHelper.addTimeSlider();
    var button;
    var alreadySentBuffer = false;
    var noDatas = [];
    var gotAnyData = false;
    var jsonData = {};
    if(layer) {
        time = layer.getTimeInfo();
        maxIdx = time.end;
        minIdx = maxIdx - 5;
        hourMinutes = time.hourMinutes;
    }
    Widget.call(this, serverAP);
    

    this.buildChart = function(chartData, id){}

    this.getHtml = function() {
        if(!layer) {
            return 'A time enabled layer must be turned on for this Analysis Package to work.';
        }
        let values = timeSlider.slider( "values" )
        let location = actionHandlerHelper.sc.headerBap.config.title
        var viewData = {
            id: that.bap.id,
            startDate: time.startDate,
            min: values[0],
            max: values[1],
            endDate: time.endDate,
            title: `Spring Index ${location ? location : ""}`,
            subTitle: `Annual Spring Index for the Period ${time.dates[minIdx]} to ${time.dates[maxIdx]}`
        };
        return getHtmlFromJsRenderTemplate('#boxAndWhiskerTemplate', viewData);
    };

    this.initializeWidget = function(originalFeature) {

        let movehtml = $("#" + that.bap.id + "BapHeader").html()
        $("#" + that.bap.id + "BapHeader").html("")
        $("#" + that.bap.id + "BAP").prepend(movehtml)

        feature = originalFeature;
        if(!layer) {
            return;
        }
        button = $("#" + that.bap.id + "BAP").find('#getBWData');

        let checkRange = function(min,max){
            if(time.startDate > min || time.endDate < max){
                $("#" + that.bap.id + "BAP").find('#bapRangeSlider').html('OUT OF RANGE: ' + time.startDate + '-' + time.endDate);
                button.hide()
            }
            else{
                $("#" + that.bap.id + "BAP").find('#bapRangeSlider').html('Analyze Time Period: ' + min + '-' + max);
                button.show();
            }    
        }
        checkRange(timeSlider.slider( "values", 0 ),timeSlider.slider( "values", 1 ))
       

        timeSlider.on("slide", function (event, ui) {
            var min = ui.values[0];
            var max = ui.values[1];

            var diff = max - min;
            if (diff < 0) {
                return false;
            }
            if (diff > REQUEST_LIMIT) { //limit the range to a maximum
                if (ui.handleIndex == 0) {
                    max = min + REQUEST_LIMIT;
                } else {
                    min = max - REQUEST_LIMIT;
                }
                timeSlider.slider("values", [min, max]);
            }
            checkRange(min, max)

        });

        button.on('click', function() {
            that.submitData("Larger or more complex polygons will take longer to process", feature);
        });
    };

    this.submitData = function(message, inputFeature) {
        noDatas = [];
        gotAnyData = false;
        actionHandlerHelper.showTempPopup(message);
        if(chart) {
            chart.clear();
        }
        var values = timeSlider.slider('values');
        chart = undefined;
        button.hide();
        $("#" + that.bap.id + "BAP").find('#boxAndWhiskerError').html('');
        toggleSpinner();
        timeSlider.slider('disable');
        $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"JsonDiv").hide();
        $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"BwTitle").hide();
        $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"BwSubTitle").hide();
        $("#" + that.bap.id + "BAP").find(".ridgeLinePlot").hide();
        $("#" + that.bap.id + "BAP").find(".histogramPlot").hide();
        handleRequests(getDataRequests(inputFeature, values[0], values[1]))
            .then(function () {
                that.bap.rawJson = jsonData;
               
                // that.bap.showJsonDiv();
                if (!gotAnyData) {
                    if (alreadySentBuffer) {
                        setError('An error occurred retrieving data from the NPN dataset. ' +
                            'The input polygon may be too small for the Geoserver Web Processing Service to analyze');
                        alreadySentBuffer = false;
                        $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"JsonDiv").show();
                    } else {
                        alreadySentBuffer = true;
                        that.sendBufferedFeature();
                    }
                } else if (noDatas.length) {
                    $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"JsonDiv").show();
                    alreadySentBuffer = false;
                    var years = noDatas.join(", ");
                    setError('There was an error analyzing data for the following years: ' + years + '. ' +
                        'They will not be displayed in the chart. If the problem continues, please contact site admin');
                } else {
                    that.updateTitle(jsonData)
                    

                    $.each(that.bap.widgets, function (index, widget) {
                        widget.buildChart(jsonData,that.bap.id);
                    });
                  

                    $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"JsonDiv").show();
                    if (alreadySentBuffer) {
                        setError('The polygon was too small and did not overlap the center of any of the raster cells. ' +
                            'We\'ve added a buffer to the polygon and resumbitted for analysis. To view the buffered ' +
                            'polygon, click the button to the top right of the chart.');
                    }
                    // alreadySentBuffer = false;
                }
                timeSlider.slider('enable');
                toggleSpinner();
            });
    };

    this.updateTitle = function(data){
        let years = Object.getOwnPropertyNames(data)
        $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"BwSubTitle").html(`Annual Spring Index for the Period ${years[0]} to ${years[years.length-1]}`)
    
    }

    this.getPdfLayout = function() {
        if(!chart) {
            return {
                content: [
                    {text: 'No analysis was performed.', style: ['bapContent', 'subtitle']}
                ],
                charts: []
            }
        }
        return  { 
            content: [
                {text:  $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"BwTitle").text(), style: ['titleChart']},
                {text:  $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"BwSubTitle").text(), style: ['subTitleChart']},
                {image: chart.div.id, alignment: 'center', width: 400}
            ],
            charts: [chart]
        }
    };

    this.getGraph = function() {

    };

    this.sendBufferedFeature = function () {
        var geojson = JSON.stringify(feature.geojson.geometry);
        var token = Math.random().toString();
        var numChunks = Math.floor(geojson.length / WAF_LIMIT);
        sendGeojsonChunks(geojson, token)
            .then(function () {
                geojson = geojson.substring(numChunks * WAF_LIMIT, geojson.length);
                var params = {
                    geojson: geojson
                };

                sendPostRequest(myServer + '/main/getBufferedShape', params, true).then(function (something) {
                    something.geometry.crs = {"type":"name","properties":{"name":"EPSG:4326"}};
                    something.type = "Feature";
                    that.bap.feature = ActionHandler.prototype.createPseudoFeature(something.geometry);
                    that.bap.simplified = true;
                    that.bap.showSimplifiedDiv();
                    feature = that.bap.feature;
                    that.submitData("No data received, resending polygon with buffer", that.bap.feature);
                });
            });
    };

    function buildChart(chartData, id){return}

    function getLayer(bap) {
        var visibleLayers = bioScape.getAllLayers();
        
        let thisLayer = visibleLayers.filter(layer =>{
            if(layer.actionConfig){
                return layer.actionConfig.baps[0] == bap.config.id && layer.mapLayer.timeControl
            } return false
        })[0]

        if(thisLayer){
            return thisLayer
        }


        return undefined;
    }

    function getDataRequests(inputFeature, minIdx, maxIdx) {
        var geojsonString = JSON.stringify(inputFeature.geojson.geometry);
        var requests =[];
        var length = maxIdx - minIdx;
        var featureBounds = inputFeature.getLeafetFeatureBounds();
        var bounds = {
            sw: featureBounds.getSouthWest(),
            ne: featureBounds.getNorthEast()
        };
        var yearsPerRequest = 3;
        var years = [];
        var j = 0;
        for(var i = 0; i <= length; i++) {
            var year = (+minIdx + i).toString();
            if (year.indexOf("-01-01") === -1) year += "-01-01";
            if (hourMinutes) year += hourMinutes;
            years.push(year);
            ++j;
            if(j === yearsPerRequest || i === length) {
                var request = getSendGeojsonRequest(years, geojsonString, bounds);
                requests.push({years: years, promise: request});
                years = [];
                j = 0;
            }
        }

        return requests;
    }

    function getSendGeojsonRequest(years, geojson, bounds) {
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
                        npnToken: NPNTOKEN
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
                npnToken: NPNTOKEN
            };

            return sendPostRequest(myServer + '/main/sendData', params, true);
        }
    }

    function toggleSpinner() {
        var el = $("#" + that.bap.id + "BAP").find('#bapSpinner');
        toggleVisibility(el);
    }

    function setError(message) {
        $("#" + that.bap.id + "BAP").find('#boxAndWhiskerError').html('<div style="font-size: 16px;" class="myNpnInfo">' +
            message +
            '</div>');
    }

    function handleRequests(requests) {
        jsonData = {};
        return requests.reduce(function(sequence, request) {
            return sequence.then(function() {
                return request.promise;
            }).then(function(datas) {

                datas.forEach(function(data, index) {
                    jsonData[request.years[index].substr(0, 4)] = data;
                    if (!data || !data.length) {
                        noDatas.push(request.years[index].substr(0, 4));
                    } else {
                        var bWData = getBoxPlotData(request.years[index], data);
                        if(!chart) {
                            chart = AmChartsHelper.getBoxAndWhiskerChart(bWData);
                            let chartdiv = that.bap.id + 'boxAndWhisker'
                            chart.write(chartdiv);
                            $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"BwTitle").show();
                            $("#" + that.bap.id + "BAP").find("#"+that.bap.id+"BwSubTitle").show();
                        } else {
                            var graphsAndData = AmChartsHelper.getNewBoxAndWhiskerGraphsAndData(bWData, chart.graphs[chart.graphs.length-1].valueField);
                            chart.dataProvider.push(graphsAndData.data);
                            chart.graphs = chart.graphs.concat(graphsAndData.graphs);
                            chart.validateData();
                        }
                        gotAnyData= true;
                    }
                });
            }).catch(function(e) {
                setError('There was an error processing one or more of the box plots, they will not be displayed in the chart')
            });
        }, Promise.resolve())
            .catch(function() {
                $("#" + that.bap.id + "BAP").find('#boxAndWhisker').html('<div style="font-size: 16px;" class="myNpnInfo">Error processing NPN data</div>');
            });
    }

    function getBoxPlotData(date, arr) {
        arr.sort(function(a,b) {
            return a - b;
        });

        // var mean = parseInt(getMean(arr), 10);
        var median = getMedian(arr);
        var lowerHinge = getTukeyQuartile(arr, 1);
        var upperHinge = getTukeyQuartile(arr, 3);

        var iqr = upperHinge - lowerHinge;
        var highOutliers = iqr * 1.5 + upperHinge;
        var lowOutliers = lowerHinge - iqr * 1.5;
        var maximum = arr[arr.length-1];
        var minimum = arr[0];

        var outliers = arr.reduce(function(newArr, value) {
            if(value > highOutliers || value < lowOutliers) {
                var val = getDateForChart(value, date);
                if(newArr.indexOf(val) < 0) {
                    newArr.push(val);
                }
            }
            return newArr;
        }, []);

        return {
            date: new Date(date),
            highThreshold: getDateForChart(highOutliers > maximum ? maximum : highOutliers , date),
            lowThreshold: getDateForChart(lowOutliers < minimum ? minimum : lowOutliers, date),
            lowerHinge: getDateForChart(lowerHinge, date),
            median: getDateForChart(median, date),
            minimum: getDateForChart(minimum, date),
            maximum: getDateForChart(maximum, date),
            upperHinge: getDateForChart(upperHinge, date),
            // mean: getDateForChart(mean, date),
            outliers: outliers
        }
    }

    function getMedian(arr) {
        var middleIndex = getMiddleIndex(arr);
        var index = middleIndex.index;
        return middleIndex.inArray ? arr[Math.floor(index)] : getMean([arr[index-1], arr[index]]);
    }

    function getMiddleIndex(arr) {
        var index = arr.length/2;
        return {
            index: index,
            inArray: index  % 1 != 0
        }
    }

    function getTukeyQuartile(arr, quar) {
        var len = arr.length;
        var even = len % 2 === 0;
        var index = even ? (quar*len + 2)/4 - 1 : (quar*len + 3/quar)/4 - 1;
        var remainder = index - Math.floor(index);
        if(remainder === 0) {
            return arr[index];
        }
        index = index - remainder;
        return (arr[index] + arr[index + 1]) * remainder;
    }

    function getMean(arr) {
        var total = arr.reduce(function(tot, val) {
            return tot + val;
        }, 0);

        return arr.length ? total/arr.length : total;
    }

    function getDateForChart(dayOfYear, baseDate) {
        return addDays(baseDate, dayOfYear);
    }

    function addDays(date, addDays) {
        var newDate = new Date(date);
        newDate.setDate(newDate.getDate() + addDays);
        return AmCharts.formatDate(newDate, "MM-DD");
    }
};
inherit(Widget, BoxAndWhiskerWidget);
