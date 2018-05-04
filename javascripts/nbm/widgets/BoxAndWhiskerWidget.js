'use strict';

var BoxAndWhiskerWidget = function(serverAP) {
    var REQUEST_LIMIT = 50;
    var layer = getLayer();
    var time = undefined;
    var minIdx = undefined;
    var maxIdx = undefined;
    var chart = undefined;
    if(layer) {
        time = layer.getTimeInfo();
        maxIdx = time.end;
        minIdx = maxIdx - 5;
    }
    Widget.call(this, serverAP);

    this.getHtml = function() {
        if(!layer) {
            return 'A time enabled layer must be turned on for this Analysis Package to work.';
        }
        var viewData = {
            startDate: time.startDate,
            min: time.dates[minIdx],
            max: time.dates[maxIdx],
            endDate: time.endDate
        };
        return getHtmlFromJsRenderTemplate('#boxAndWhiskerTemplate', viewData);
    };

    this.initializeWidget = function(feature) {
        if(!layer) {
            return;
        }
        var button = $('#getBWData');
        var timeSlider = $('#rangeSlider');
        timeSlider.slider({
            range: true,
            min: time.start,
            max: time.end,
            values: [minIdx, maxIdx],
            slide: function(event, ui) {
                var min = ui.values[0];
                var max = ui.values[1];
                var diff = max - min;
                if(diff < 0) {
                    return false;
                }
                if(diff > REQUEST_LIMIT) {//limit the range to a maximum 3 date span
                    if(ui.handle.nextSibling) {
                        max = min + REQUEST_LIMIT;
                    } else {
                        min = max - REQUEST_LIMIT;
                    }
                    timeSlider.slider("values", [min, max]);
                }
                $('#bapRangeSlider').html('Current selection: ' + time.dates[min] + '-' + time.dates[max]);
            },
            change: function() {
                button.show();
            }
        });

        button.on('click', function() {
            actionHandlerHelper.showTempPopup("Larger or more complex polygons will take longer to process");
            if(chart) {
                chart.clear();
            }
            var values = timeSlider.slider('values');
            chart = undefined;
            button.hide();
            $('#boxAndWhiskerError').html('');
            toggleSpinner();
            timeSlider.slider('disable');
            handleRequests(getDataRequests(feature.serverId, feature, feature.layer, values[0], values[1]))
                .then(function () {
                    timeSlider.slider('enable');
                    toggleSpinner();
                });
        });
    };

    this.getPdfLayout = function() {
        if(!chart) {
            return {
                content: [
                    {text: 'No analysis was performed.', style: ['bapContent', 'subtitle']}
                ],
                charts: []
            }
        }
        return {

            content: [
                {text: $('#bapRangeSlider').text(), style: ['bapContent', 'subtitle']},
                {image: chart.div.id, alignment: 'center', width: 400}
            ],
            charts: [chart]
        }
    };

    this.getGraph = function() {

    };

    function getLayer() {
        var visibleLayers = bioScape.getVisibleLayers();
        for(var i = 0; i < visibleLayers.length; i++) {
            if(visibleLayers[i].mapLayer.timeControl) {
                return visibleLayers[i];
            }
        }

        return undefined;
    }

    function getDataRequests(id, feature, mapLayer, minIdx, maxIdx) {
        var geojsonString = JSON.stringify(feature.geojson.geometry);
        var requests =[];
        var length = maxIdx - minIdx;
        var featureBounds = feature.getLeafetFeatureBounds();
        var bounds = {
            sw: featureBounds.getSouthWest(),
            ne: featureBounds.getNorthEast()
        };
        var yearsPerRequest = 3;
        var years = [];
        var j = 0;
        for(var i = 0; i <= length; i++) {
            var year = time.dates[minIdx + i].toString();
            if (year.indexOf("-01-01") == -1) year += "-01-01";
            year += "T00:00:00.000Z";
            years.push(year);
            ++j;
            if(j === yearsPerRequest || i === length) {
                var request = getSendGeojsonRequest(id, feature, mapLayer, years, geojsonString, bounds);
                requests.push({years: years, promise: request});
                years = [];
                j = 0;
            }
        }

        return requests;
    }

    function getServerIdentifyRequest(id, feature, mapLayer, years, bounds) {
        var info = mapLayer.getIdentifyRequestInfo(feature.latLng);
        var params = {
            layerName: layer.featureName,
            'years[]': years,
            url: info.url,
            id: id,
            south: bounds.sw.lng,
            west: bounds.sw.lat,
            north: bounds.ne.lat,
            east: bounds.ne.lng
        };
        for(var prop in info.params) {
            if(info.params.hasOwnProperty(prop)) {
                params[prop] = info.params[prop];
            }
        }
        console.log('identify');
        return sendPostRequest(myServer + '/main/identifyAndSendData', params);
    }

    function getSendGeojsonRequest(id, feature, mapLayer, years, geojson, bounds) {
        console.log('normal');
        var params = {
            layerName: layer.featureName,
            'years[]': years,
            geojson: geojson,
            south: bounds.sw.lng,
            west: bounds.sw.lat,
            north: bounds.ne.lat,
            east: bounds.ne.lng
        };

        return sendPostRequest(myServer + '/main/sendData', params)
            .catch(function() {
                console.log('attempting to send identify request.');
                return getServerIdentifyRequest(id, feature, mapLayer, years, bounds);
            });
    }

    function toggleSpinner() {
        var el = $('#bapSpinner');
        toggleVisibility(el);
    }

    function handleRequests(requests) {
        return requests.reduce(function(sequence, request) {
            return sequence.then(function() {
                return request.promise;
            }).then(function(datas) {
                datas.forEach(function(data, index) {
                    var bWData = getBoxPlotData(request.years[index], data);
                    if(!chart) {
                        chart = AmChartsHelper.getBoxAndWhiskerChart(bWData);
                        // chart.addLegend(AmChartsHelper.getAmLegend());
                        chart.write('boxAndWhisker');
                    } else {
                        var graphsAndData = AmChartsHelper.getNewBoxAndWhiskerGraphsAndData(bWData, chart.graphs[chart.graphs.length-1].valueField);
                        chart.dataProvider.push(graphsAndData.data);
                        chart.graphs = chart.graphs.concat(graphsAndData.graphs);
                        chart.validateData();
                    }
                });
            }).catch(function(e) {
                console.log('there was an error processing the box and whisker plot requests: ', e);
                $('#boxAndWhiskerError').html('<div style="font-size: 16px;" class="myNpnInfo">There was an error processing one or more of the box plots, they will not be displayed in the chart</div>');
            });
        }, Promise.resolve())
            .catch(function() {
                console.log('there was an error process the box and whisker plot requests');
                $('#boxAndWhisker').html('<div style="font-size: 16px;" class="myNpnInfo">Error processing NPN data :(</div>');
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
