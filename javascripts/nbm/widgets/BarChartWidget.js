'use strict';

var BarChartWidget = function (chartConfig) {
    var config = chartConfig;

    var formatter = {precision:0, decimalSeparator:'.', thousandsSeparator:','};

    this.getHtml = function() {
        var noDataArea = AmCharts.addPrefix(config.noDataArea, '', '', formatter);
        return getHtmlFromJsRenderTemplate('#barChartWidget', {
            id: config.id + "BarChart",
            noData: noDataArea + " " + config.areaUnit
        });
    };

    this.getPdfLayout = function() {
        return {
            content: [
                {image: barChart.div.id, alignment: 'center', width: 500}
            ],
            charts: [barChart]
        };
    };

    /**
     * Create the top ten most common species chart.
     */
    var barChart;
    this.initializeWidget = function () {
        barChart = AmCharts.makeChart(config.id + "BarChart", {
            //"titles": [{
            //    size: 18,
            //    text: config.title
            //}],
            "numberFormatter": formatter,
            "borderAlpha":0,
            "creditsPosition": "top-right",
            "color": AmChartsHelper.getChartColor(),
            "type": "serial",
            "theme": "light",
            "marginLeft": 10,
            "marginRight": 10,
            "dataProvider": config.data,
            "valueAxes": [{
                "axisAlpha": 0,
                "position": "left",
                "title": config.yAxisLabel
            }],
            "startDuration": 1,
            "graphs": [{
                "balloonText": "<b>[[category]]: [[value]]" + config.areaUnit + "</b>",
                "fillColorsField": "color",
                "fillAlphas":"opacity",
                "lineAlpha":0.3,
                "type": "column",
                "valueField":"acres",
                "alphaField":"opacity"
            }],
            "balloon": AmChartsHelper.getChartBalloonSettings(),
            "chartCursor": {
                "categoryBalloonEnabled": false,
                "cursorAlpha": 0,
                "zoomable": false
            },
            "categoryField": "label",
            "categoryAxis": {
                "labelsEnabled": false,
                "title": config.xAxisLabel
            },
            "export": {
                "enabled": true,
                "menu": []
            }
        });

        // barChart.addListener("clickGraphItem", function (myObject) {
        //     openLmeSpeciesJson(myObject.item.category);
        // });
    }
};