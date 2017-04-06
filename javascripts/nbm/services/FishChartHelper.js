'use strict';
/**
 * Helper class for creating fish charts.
 * @param {*} fishPotential - server data for this chart
 * @constructor
 */
var FishChartHelper = function(fishPotential) {
    /**
     * Returns an AmXYChart.
     * @param {string} title - title of the chart
     * @param {number} titleSize - title size in pixels
     * @param {string} bulletSizeField - chart bullet size
     * @param {boolean} includeCursor - true creates cursor on chart, non created otherwise
     * @returns {Object} - AmCharts.AmXYChart
     */
    this.getFishChart = function(title, titleSize, bulletSizeField, includeCursor) {
        var newTitle = title;

        if (newTitle.length > 60) {
            var myTitle = newTitle;
            var myIndex = Math.floor(myTitle.length / 2);
            for (var i = myIndex; i < myTitle.length; i++) {
                if (myTitle[i] == ' ') {
                    newTitle = myTitle.substr(0, i) + '\n' + myTitle.substr(i + 1, myTitle.length);
                    i = myTitle.length;
                }
            }
        }
        var chart = new AmCharts.AmXYChart();
        chart.addTitle(newTitle, titleSize);
        chart.dataProvider = fishPotential.chart_data;
        chart.startDuration = 0;
        chart.sequencedAnimation = false;
        chart.balloon.fillAlpha = 1;
        chart.borderAlpha = 0;
        chart.creditsPosition = 'bottom-right';
        chart.export = {
            "enabled": true,
            menu: []
        };

        // data
        var graph = new AmCharts.AmGraph();
        graph.lineColor = "#4581ac";
        graph.balloonText = "<b>Ecoregion Name:</b> [[description]]<br><b>Biological Potential:</b> [[y]]<br><b>Risk of Habitat Degradation:</b> [[x]]";
        graph.descriptionField = "name";
        graph.xField = "xVal";
        graph.yField = "yVal";
        graph.lineAlpha = 0;
        graph.bullet = "diamond";
        graph.bulletSizeField = bulletSizeField;
        graph.colorField = 'color';
        graph.precision = 3;
        chart.addGraph(graph);

        // CURSOR
        if(includeCursor) {
            var chartCursor = new AmCharts.ChartCursor();
            chart.addChartCursor(chartCursor);
        }

        return chart;
    };

    /**
     * Returns a ValueAxis for the x axis.
     * @param {number} titleFontSize - axis title font size
     * @returns {Object} - AmCharts.ValueAxis
     */
    this.getFishChartXAxis = function(titleFontSize) {
        var min = 1, max = 5, position = 'bottom';
        var xAxis = this.getFishChartAxis(fishPotential.x_axis_title, min, max, position);
        xAxis.labelRotation = 45;
        xAxis.titleFontSize = titleFontSize;
        xAxis.labelFunction = function (value, valueText, valueAxis) {
            if (value == min) return "Highest"; //lower risk is worse?
            if (value == max) return "Lowest";
            return "";
        };

        return xAxis;
    };

    /**
     * Returns a ValueAxis for the y axis.
     * @param {number} titleFontSize - axis title font size
     * @returns {Object} - AmCharts.ValueAxis
     */
    this.getFishChartYAxis = function(titleFontSize) {
        var min = 0, max = 50, position = 'left';
        var yAxis = this.getFishChartAxis(fishPotential.y_axis_title, min, max, position);
        yAxis.titleFontSize = titleFontSize;
        yAxis.labelFunction = function (value, valueText, valueAxis) {
            if (value == min) return "Lowest";
            if (value == max) return "Highest";
            return "";
        };

        return yAxis;
    };

    /**
     * Returns a ValueAxis.
     * @param {string} axisTitle - axis title
     * @param {number} min - axis minimum
     * @param {number} max - axis maximum
     * @param {string} position - position of the axis
     * @returns {Object} - AmCharts.ValueAxis
     */
    this.getFishChartAxis = function(axisTitle, min, max, position) {
        var axis = new AmCharts.ValueAxis();
        axis.boldLabels = true;
        axis.gridCount = 0;
        axis.gridCountR = 0;
        axis.baseValue = 0;
        axis.minimum = min;
        axis.maximum = max;
        axis.title = axisTitle;
        axis.position = position;
        axis.dashLength = 0;
        axis.axisAlpha = 1;
        axis.axisThickness = 2;
        axis.tickLength = 0;

        return axis;
    };
};