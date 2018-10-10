'use strict';

var BoxAndWhiskerAnalysis = function (serverAP, bap) {
    let that = this
    let id = bap.id;
    let selector = "#" + id + "BAP";
    let timeSlider = null;
    let button = null;
    let layer = null;
    let alreadySentBuffer = false
    let chart = undefined;
    let chartCopy = undefined;


    this.getHtml = function () {

        return getHtmlFromJsRenderTemplate('#boxAndWhiskerTemplate', { id: id });
    };

    this.initializeWidget = function (feature) {


        let AOI = bap.gid;
        if(AOI && AOI.includes('OBIS_Areas:')) {
            $(`#${bap.id}BapCase`).hide()
            return
        }

        let movehtml = $(selector).find(".bapHeader").html()
        $(selector).find(".bapHeader").html("")
        $("#" + that.bap.id + "Inputs").after(movehtml)

        if (that.bap.GetBapLayers().length) {
            layer = that.bap.GetBapLayers()[0]
        }
        else {
            return;
        }

        timeSlider = widgetHelper.addTimeSlider();
        let time = layer.getTimeInfo();

        button = $(selector).find('#getData');
        button.on('click', function () {
            that.submitData("Larger or more complex polygons will take longer to process", feature);
        });

        let checkRange = function (min, max) {

            if ((max - min) <= 0) {
                $(selector).find('#bapRangeSlider').html('Please select a range to analyze.');
                button.hide()
            }

            if (time.startDate > min || time.endDate < max) {
                $(selector).find('#bapRangeSlider').html('OUT OF RANGE: ' + time.startDate + ' to ' + time.endDate);
                button.hide()
            }
            else {
                $(selector).find('#bapRangeSlider').html('Analyze Time Period: ' + min + ' to ' + max);
                button.show();
            }
        }
        checkRange(timeSlider.slider("values", 0), timeSlider.slider("values", 1))

        timeSlider.on("slidechange", function (event, ui) {
            if (ui) {
                var min = ui.values[0];
                var max = ui.values[1];

                checkRange(min, max)
            }
        });

        if (this.bap.initConfig.range) {
            bioScape.bapLoading(that.bap.id, false)
            actionHandlerHelper.globalTimeSlider().setToRange(this.bap.initConfig.range)
            button.click()
            this.bap.initConfig.range = undefined
        }
    };

    this.submitData = function (message, inputFeature) {

        var values = timeSlider.slider('values');
        this.bap.state.range = values
        this.bap.updateState(true)
        actionHandlerHelper.showTempPopup(message);

        $(selector).find('.afterSubmitAttribution').show();

        button.hide();
        $(selector).find('#boxAndWhiskerError').html('');
        toggleSpinner();
        timeSlider.slider('disable');
        $(selector).find(".boxPlot").hide();
        widgetHelper.getRasterData(inputFeature, layer, [values[0], values[1]], that.bap.config.bapProperties.npnProperty)
            .then(function (data) {
                that.bap.rawJson = data;
                let missingYears = []

                if (!data) {
                    setError(' An error has occured. If the problem continues, please contact site admin.');
                }
                else {
                    for (let i = values[0]; i <= values[1]; i++) {
                        if (!data[i]) {
                            missingYears.push(i)
                        }
                    }
                    if (!data[values[0]].length) {
                        if (!alreadySentBuffer) {
                            alreadySentBuffer = true;
                            widgetHelper.getBufferedFeature(inputFeature)
                                .then(function (bufferedFeature) {
                                    if (!bufferedFeature || !bufferedFeature.geometry) {
                                        setError(' An error has occured. If the problem continues, please contact site admin.');
                                    }
                                    else {
                                        that.bap.feature = ActionHandler.prototype.createPseudoFeature(bufferedFeature.geometry);
                                        that.bap.simplified = true;
                                        that.bap.showSimplifiedDiv();
                                        that.submitData("No data received, resending polygon with buffer", that.bap.feature);
                                    }
                                })
                        }
                        else {
                            setError(' Your polygon falls outside the geographic extent of the data you\'re trying to analyze. ');
                        }
                    }
                    else {
                        if (missingYears.length) {
                            setError(' There was an error analyzing data for the following years: ' + missingYears + '. ' +
                                'They will not be displayed in the chart. If the problem continues, please contact site admin.');
                        }
                        else if (alreadySentBuffer) {
                            setError(' Your polygon was buffered so it overlaps with the center of the nearest raster cell. ' +
                                'You can click the \'square\' icon next to the polygon title to view the buffered polygon.');
                        }
                        $.each(that.bap.widgets, function (index, widget) {
                            widget.buildChart(data, that.bap.id);
                        });
                    }
                }

                $(selector).find("#" + that.bap.id + "JsonDiv").show();
                timeSlider.slider('enable');
                toggleSpinner(true);
                bioScape.bapLoading(that.bap.id, true)
            });

    };


    this.buildChart = function (chartData, id) {
        that.updateTitle(chartData)
        $(selector).find(".boxPlot").show()

        Object.keys(chartData).forEach(function (year) {
            var bWData = getBoxPlotData(year,chartData[year]);
            if (!chart) {
                chart = AmChartsHelper.getBoxAndWhiskerChart(bWData);
                let chartdiv =  'boxPlotChart' + that.bap.id
                chart.write(chartdiv);
                $(selector).find("#boxPlotTitle").show();
                $(selector).find("#boxPlotSubTitle").show();

                // $('<div id="boxPlotChartCopy' + that.bap.id +
                //     '" style="position: absolute; top: -10000px; left: -10000px; width: 500px; height: 500px;"></div>')
                //     .appendTo('#boxPlot'+that.bap.id);
                // let copyDiv = "boxPlotChartCopy" + that.bap.id;
                // chartCopy = AmChartsHelper.getBoxAndWhiskerChart(bWData, true);
                // chartCopy.write(copyDiv)
            } else {
                var graphsAndData = AmChartsHelper.getNewBoxAndWhiskerGraphsAndData(bWData, chart.graphs[chart.graphs.length - 1].valueField);
                chart.dataProvider.push(graphsAndData.data);
                chart.graphs = chart.graphs.concat(graphsAndData.graphs);
                chart.validateData();

                // var graphsAndDataCopy =
                //     AmChartsHelper.getNewBoxAndWhiskerGraphsAndData(bWData, chart.graphs[chart.graphs.length - 1].valueField);
                // chartCopy.dataProvider.push(graphsAndDataCopy.data);
                // chartCopy.graphs = chartCopy.graphs.concat(graphsAndDataCopy.graphs);
                // chartCopy.validateData();
            }
        })

    }

    this.updateTitle = function (data) {
        let years = Object.getOwnPropertyNames(data)
        let location = ((actionHandlerHelper.sc.headerBap || {}).config || {}).title
        $(selector).find("#boxPlotTitle").html(`${serverAP.title} ${location ? "for " + location : ""}`)
        $(selector).find("#boxPlotSubTitle").html(`By Year for the Period ${years[0]} to ${years[years.length - 1]}`)

    }

    this.getPdfLayout = function () {
        if (!chart) {
            return {
                content: [
                    { text: 'No analysis was performed.', style: ['bapContent', 'subTitleChart'] }
                ],
                charts: []
            }
        }
        return {
            content: [
                { text: $(selector).find("#boxPlotTitle").text(), style: ['titleChart'], pageBreak: 'before' },
                { text: $(selector).find("#boxPlotSubTitle").text(), style: ['subTitleChart'] },
                { image: chart.div.id, alignment: 'center', width: 500, }
            ],
            charts: [chart]
        }
    };

    this.getGraph = function () {

    };


    function toggleSpinner(hide) {
        if (hide) {
            $(selector).find('#bapSpinner').hide()
        }
        else {
            $(selector).find('#bapSpinner').show()
        }
    }

    function setError(message) {
        $(selector).find('#boxAndWhiskerError').html(
            '<div style="font-size: 16px; line-height: 20px;" class="myNpnInfo">' +
            '<span class="fa fa-circle fa-first" aria-hidden="true" style="color: red; opacity: .8; font-size: 14px;"></span>' +
            '<span class="glyphicon glyphicon-exclamation-sign exclamation" aria-hidden="true"></span>'
            + '<span>' + message + '</span>' +
            '</div>'
        );
    }


    function getBoxPlotData(date, arr) {
        arr.sort(function (a, b) {
            return a - b;
        });

        // var mean = parseInt(getMean(arr), 10);
        var median = getMedian(arr);
        var lowerHinge = getTukeyQuartile(arr, 1);
        var upperHinge = getTukeyQuartile(arr, 3);

        var iqr = upperHinge - lowerHinge;
        var highOutliers = iqr * 1.5 + upperHinge;
        var lowOutliers = lowerHinge - iqr * 1.5;
        var maximum = arr[arr.length - 1];
        var minimum = arr[0];

        var outliers = arr.reduce(function (newArr, value) {
            if (value > highOutliers || value < lowOutliers) {
                var val = getDateForChart(value, date);
                if (newArr.indexOf(val) < 0) {
                    newArr.push(val);
                }
            }
            return newArr;
        }, []);

        return {
            date: new Date(date),
            highThreshold: getDateForChart(highOutliers > maximum ? maximum : highOutliers, date),
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
        return middleIndex.inArray ? arr[Math.floor(index)] : getMean([arr[index - 1], arr[index]]);
    }

    function getMiddleIndex(arr) {
        var index = arr.length / 2;
        return {
            index: index,
            inArray: index % 1 != 0
        }
    }

    function getTukeyQuartile(arr, quar) {
        var len = arr.length;
        var even = len % 2 === 0;
        var index = even ? (quar * len + 2) / 4 - 1 : (quar * len + 3 / quar) / 4 - 1;
        var remainder = index - Math.floor(index);
        if (remainder === 0) {
            return arr[index];
        }
        index = index - remainder;
        return (arr[index] + arr[index + 1]) * remainder;
    }

    function getMean(arr) {
        var total = arr.reduce(function (tot, val) {
            return tot + val;
        }, 0);

        return arr.length ? total / arr.length : total;
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
inherit(Analysis, BoxAndWhiskerAnalysis);
