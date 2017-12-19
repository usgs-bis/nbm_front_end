'use strict';

/**
 * Helper class for AmCharts.
 *
 * Public methods:
 * getChartColor() - returns the default chart color
 * getChartBalloonSettings(additionalSettings) - returns the default chart balloon settings
 * getAmPieChart(title, data, balloonText, legend, disableLabels) - returns a new AmPieChart
 * getAmLegend() - returns a new AmLegend
 * getChartDataFromJsonArray(jsonArray, decimalPlaces, keepOrder) - returns chart data parsed from json
 * getBoxAndWhiskerChart() - returns a box and whisker chart
 */
var AmChartsHelper = (function(helper) {
    /**
     * Gets the default chart color.
     * @returns {string} '#CCCCCC'
     */
    function getChartColor() {
        var chartColor = '#CCCCCC';
        return chartColor;
    }

    /**
     * Returns chart balloon settings with defaults and additional setting if provided.
     * @param {*} [additionalSettings] - additional settings for the chart balloon in addition to the default settings
     * @returns {*}
     */
    function getChartBalloonSettings(additionalSettings) {
        var settings = {
            fillColor: "rgba(30, 30, 50)",
            color: '#f3f3f3'
        };
        for(var setting in additionalSettings) {
            if(additionalSettings.hasOwnProperty(setting)) {
                settings[setting] = additionalSettings[setting];
            }
        }
        return settings;
    }

    function getGenericAmPieChart(title, data, balloonText, legend, disableLabels, retValText) {
        var chart = new AmCharts.AmPieChart();
        chart.addTitle(title, 12);
        chart.creditsPosition = 'bottom-right';
        chart.marginTop = 0;
        chart.color = getChartColor();
        chart.backgroundColor = '#344';
        chart.colorField = 'color';
        chart.labelsEnabled = false;
        if(!disableLabels) {
            var labelChangeThreshold = 5;
            var labelRadius = 1;
            var labelRadiusIncrement = 9;
            var labelColorField = 'labelColor';
            var labelRadiusField = 'labelRadius';
            for(var i = 0;i < data.length; i++) {
                if(data[i].displayValue > labelChangeThreshold) {
                    data[i][labelColorField] = '#000000';
                    data[i][labelRadiusField] = -25;
                } else {
                    data[i][labelColorField] = getChartColor();
                    data[i][labelRadiusField] = labelRadius;
                    labelRadius = labelRadius + labelRadiusIncrement;
                }
            }
            chart.labelsEnabled = true;
            chart.labelColorField = labelColorField;
            chart.labelRadiusField = labelRadiusField;
            chart.labelTickAlpha = 1;
            chart.labelText = "[[value]]"+retValText;
        }
        chart.dataProvider = data;
        chart.numberFormatter = {precision:0, decimalSeparator:'.', thousandsSeparator:','};
        chart.gradientRatio = [];
        chart.titleField = "name";
        chart.valueField = "displayValue";
        chart.sequencedAnimation = true;
        chart.startEffect = "elastic";
        chart.startDuration = 1.5;
        chart.marginBottom = 2;
        chart.balloonText = balloonText;
        chart.balloon = getChartBalloonSettings();
        chart.pullOutRadius = 0;
        if(legend) {
            chart.legend = legend;
        }
        chart.export = {
            "enabled": true,
            "menu": [],
            "legend": {
                "position": "bottom"
            }
        };

        return chart;
    }

    /**
     * Returns an AmPieChart.
     * @param {string} title - title of the chart
     * @param {*} data - the data for the chart
     * @param {string} balloonText - text template for the balloon
     * @param {Object} [legend] - AmCharts.AmLegend - legend for the chart - optional
     * @param {boolean} [disableLabels] - disable chart labels, if undefined labels are included on the chart - optional
     * @returns {Object} - AmCharts.AmPieChart
     */
    function getAmPieChart(title, data, balloonText, legend, disableLabels) {
        var chart = new AmCharts.AmPieChart();
        chart.addTitle(title, 12);
        chart.creditsPosition = 'bottom-right';
        chart.marginTop = 0;
        chart.color = getChartColor();
        chart.backgroundColor = '#344';
        chart.colorField = 'color';
        chart.labelsEnabled = false;
        if(!disableLabels) {
            var labelChangeThreshold = 5;
            var labelRadius = 1;
            var labelRadiusIncrement = 9;
            var labelColorField = 'labelColor';
            var labelRadiusField = 'labelRadius';
            for(var i = 0;i < data.length; i++) {
                if(data[i].displayValue > labelChangeThreshold) {
                    data[i][labelColorField] = '#000000';
                    data[i][labelRadiusField] = -25;
                } else {
                    data[i][labelColorField] = getChartColor();
                    data[i][labelRadiusField] = labelRadius;
                    labelRadius = labelRadius + labelRadiusIncrement;
                }
            }
            chart.labelsEnabled = true;
            chart.labelColorField = labelColorField;
            chart.labelRadiusField = labelRadiusField;
            chart.labelTickAlpha = 1;
            chart.labelText = "[[percent]]%";
        }
        chart.dataProvider = data;
        chart.numberFormatter = {precision:0, decimalSeparator:'.', thousandsSeparator:','};
        chart.gradientRatio = [];
        chart.titleField = "name";
        chart.valueField = "displayValue";
        chart.sequencedAnimation = true;
        chart.startEffect = "elastic";
        chart.startDuration = 1.5;
        chart.marginBottom = 2;
        chart.balloonText = balloonText;
        chart.balloon = getChartBalloonSettings();
        chart.pullOutRadius = 0;
        if(legend) {
            chart.legend = legend;
        }
        chart.export = {
            "enabled": true,
            "menu": [],
            "legend": {
                "position": "bottom"
            }
        };

        return chart;
    }

    /**
     * Returns an AmCharts.AmLegend.
     * @returns {Object} - AmCharts.AmLegend
     */
    function getAmLegend() {
        var legend = new AmCharts.AmLegend();
        legend.spacing = 10;
        legend.verticalGap = 5;
        legend.switchable = false;
        legend.align = 'center';
        legend.valueText = '';
        legend.valueWidth = 10;
        legend.markerLabelGap = 5;
        legend.color = getChartColor();
        legend.maxColumns = 1;
        legend.labelWidth = 200;

        return legend;
    }

    function getChartDataFromGenericJsonArray(jsonArray, decimalPlaces, keepOrder) {
        // sort from largest to smallest
        var sortedArray = jsonArray.slice().sort(function (a, b) {
            if (a.value > b.value) {
                return -1;
            }
            if (a.value < b.value) {
                return 1;
            }
            // a must be equal to b
            return 0;
        });
        sortedArray.forEach(function(data, index, array) {
            var minDisplaySize = 0.2;
            var percent = data.value;
            // we rely on the chartData being ordered and assume that the largest percentage object will never be below minDisplaySize%
            if( percent < minDisplaySize && percent != 0) {
                data.displayValue = "<" + minDisplaySize;
            } else {
                data.displayValue = percent;
            }
            //data.displayValue = percent;

            var finalDisplay = percent > 0 && percent < 0.2 ? '< 0.2' : percent.toFixed(decimalPlaces);
            data.value = finalDisplay;
        });

        return keepOrder ? jsonArray : sortedArray;
    }

    /**
     * Get chart data from a json array.
     * @param {Array.<*>} jsonArray - json data array
     * @param {number} decimalPlaces - the number of decimal places for numbers
     * @param {boolean} [keepOrder] - if true keep the current order of the array otherwise sort from
     *  largest to smallest values
     * @returns {Array.<*>}
     */
    function getChartDataFromJsonArray(jsonArray, decimalPlaces, keepOrder) {
        // sort from largest to smallest
        var sortedArray = jsonArray.slice().sort(function (a, b) {
            if (a.percent > b.percent) {
                return -1;
            }
            if (a.percent < b.percent) {
                return 1;
            }
            // a must be equal to b
            return 0;
        });
        sortedArray.forEach(function(data, index, array) {
            var minDisplaySize = 1.4;
            var percent = data.percent;
            // we rely on the chartData being ordered and assume that the largest percentage object will never be below minDisplaySize%
            if( percent < minDisplaySize && percent != 0) {
                var diff = minDisplaySize - percent;
                //change the displayValue of the biggest percentage so everything always adds up to 100%
                array[0].displayValue -= diff;
                data.displayValue = minDisplaySize;
            } else {
                data.displayValue = percent;
            }

            var finalDisplay = percent > 0 && percent < .01 ? '< 0.01' : percent.toFixed(decimalPlaces);
            data.percent = finalDisplay;
        });

        return keepOrder ? jsonArray : sortedArray;
    }

    function getBoxAndWhiskerChart(data) {
        var chart = new AmCharts.AmSerialChart();
        chart.theme = 'light';
        chart.color = getChartColor();
        chart.dataDateFormat = "MM-DD";
        chart.valueAxes = [{
            type: 'date',
            position: 'left',
            axisColor: getChartColor(),
            title: 'Day of the year',
            boldPeriodBeginning: false,
            // minimumDate: "01-01",
            minPeriod: 'DD',
            markPeriodChange: false
        }];
        chart.graphs = [ {
            "type": "candlestick",
            "title": "Box and Whisker",
            "closeField": "lowerHinge",
            "fillColors": "#389bc6",
            "highField": "highThreshold",
            "lineColor": getChartColor(),
            "lineAlpha": 1,
            "lowField": "lowThreshold",
            "fillAlphas": 0.9,
            "openField": "upperHinge",
            "valueField": "upperHinge",
            "columnWidth": 0.4,
            "balloonFunction": function(item) {
                return "Maximum: <b>" + formatDate(item.dataContext.maximum, item.dataContext.date.getFullYear()) + "</b><br>" +
                    "3rd Quartile: <b>" + formatDate(item.dataContext.upperHinge, item.dataContext.date.getFullYear()) + "</b><br>" +
                    "Median: <b>" + formatDate(item.dataContext.median, item.dataContext.date.getFullYear()) + "</b><br>" +
                    "1st Quartile: <b>" + formatDate(item.dataContext.lowerHinge, item.dataContext.date.getFullYear()) + "</b><br>" +
                    "Minimum: <b>" + formatDate(item.dataContext.minimum, item.dataContext.date.getFullYear()) + "</b><br>";
            },
            "balloon": getChartBalloonSettings(),
            "visibleInLegend": false
        }, {
            "type": "step",
            "title": "Max/min values",
            "valueField": "highThreshold",
            "noStepRisers": true,
            "lineColor": getChartColor(),
            "lineThickness": 2,
            "showBalloon": false,
            "columnWidth": 0.3
        }, {
            "type": "step",
            "valueField": "lowThreshold",
            "noStepRisers": true,
            "lineColor": getChartColor(),
            "lineThickness": 2,
            "showBalloon": false,
            "columnWidth": 0.3,
            "visibleInLegend": false
        }, {
            "type": "step",
            "title": "Median",
            "valueField": "median",
            "noStepRisers": true,
            "lineColor": "#d71e27",
            "lineThickness": 4,
            "showBalloon": false,
            "columnWidth": 0.4
        }//,
            // {
            // "title": "Mean",
            // "bulletSize": 8,
            // "valueField": "mean",
            // "lineColor": "#fff600",
            // "lineAlpha": 0,
            // "bullet": "round",
            // "balloonFunction": function(item) {
            //     return "Mean: <b>" + formatDate(item.dataContext.mean) + "</b>";
            // }
        // }
        ];

        var bW = getNewBoxAndWhiskerGraphsAndData(data);
        chart.graphs = chart.graphs.concat(bW.graphs);

        var dataProvider = [bW.data];
        chart.categoryField = 'date';
        chart.categoryAxis = {
            "tickLength": 0,
            "axisAlpha": 0,
            "labelFunction": function(valueText) {
                return new Date(valueText).getUTCFullYear().toString();
            },
            "title": "Year"//,
            // "parseDates": true,
            // "equalSpacing": true,
            // "minPeriod": "YYYY"
        };
        chart.export = {
            "enabled": true,
            "menu": []
        };
        chart.dataProvider = dataProvider;

        return chart;

        function formatDate(date, year) {
            //The year sent in is the end of the prior year. The number here doesn't even really matter that much,
            //since we just display MMM DD. But we have to add the year because FF browsers don't support parsing
            //dates from just the month and day we were sending in.
            year++;
            return AmCharts.formatDate(new Date(year + "-" + date), "MMM DD");
        }
    }

    function getNewBoxAndWhiskerGraphsAndData(data, lastGraph) {
        var graphs = [];
        data.outliers.forEach(function(outlier, index) {
            var key = '' + index;
            data[key] = outlier;
            if(!lastGraph || index > parseInt(lastGraph, 10)) {
                graphs.push({
                    "title": "Outlier",
                    "bulletSize": 4,
                    "valueField": key,
                    "lineColor": getChartColor(),
                    "lineAlpha": 0,
                    "bullet": "round",
                    "showBalloon": false
                });
            }
        });

        return {
            graphs: graphs,
            data: data
        };
    }

    helper = {
        getChartColor: getChartColor,
        getChartBalloonSettings: getChartBalloonSettings,
        getAmPieChart: getAmPieChart,
        getAmLegend: getAmLegend,
        getChartDataFromJsonArray: getChartDataFromJsonArray,
        getChartDataFromGenericJsonArray: getChartDataFromGenericJsonArray,
        getGenericAmPieChart: getGenericAmPieChart,
        getBoxAndWhiskerChart: getBoxAndWhiskerChart,
        getNewBoxAndWhiskerGraphsAndData: getNewBoxAndWhiskerGraphsAndData
    };

    return helper;
})(AmChartsHelper || {});
