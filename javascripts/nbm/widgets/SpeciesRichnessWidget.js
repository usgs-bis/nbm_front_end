'use strict';

var SpeciesRichnessWidget = function (chartConfig) {
    var speciesRichness = chartConfig;

    this.getHtml = function() {
        return getHtmlFromJsRenderTemplate('#reportSpeciesTemplate');
    };

    this.initializeWidget = function() {
        initializeLmeTopTenChart();
    };

    this.getPdfLayout = function() {
        return {
            content: [
                {image: lmeSpeciesChart.div.id, alignment: 'center', width: 500}
            ],
            charts: [lmeSpeciesChart]
        };
    };

    /**
     * Create the top ten most common species chart.
     */
    var lmeSpeciesChart;
    function initializeLmeTopTenChart() {
        lmeSpeciesChart = AmCharts.makeChart("lmeSpeciesChart", {
            "titles": [{
                size: 18,
                text: "Most Reported Species"
            }],
            "borderAlpha":0,
            "creditsPosition": "top-right",
            "color": AmChartsHelper.getChartColor(),
            "type": "serial",
            "theme": "light",
            "marginLeft": 10,
            "marginRight": 10,
            "dataProvider": speciesRichness.chart_data,
            "valueAxes": [{
                "axisAlpha": 0,
                "position": "left",
                "title": "Number of Species Reported"
            }],
            "startDuration": 1,
            "graphs": [{
                "balloonText": "<b>[[category]]: [[value]]</b>",
                "fillColorsField": "color",
                "fillAlphas": 0.9,
                "lineAlpha": 0.2,
                "type": "column",
                "valueField": "occur_count"
            }],
            "balloon": AmChartsHelper.getChartBalloonSettings(),
            "chartCursor": {
                "categoryBalloonEnabled": false,
                "cursorAlpha": 0,
                "zoomable": false
            },
            "categoryField": "scientific_name",
            "categoryAxis": {
                "labelsEnabled": false,
                "title": "Species by Scientific Name"
            },
            "export": {
                "enabled": true,
                "menu": []
            }

        });

        lmeSpeciesChart.addListener("clickGraphItem", function (myObject) {
            openLmeSpeciesJson(myObject.item.category);
        });
    }
};