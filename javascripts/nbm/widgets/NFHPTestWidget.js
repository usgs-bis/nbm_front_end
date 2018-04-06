'use strict';

var NFHPTestWidget = function (chartConfig) {
    var that = this;
    var config = chartConfig;
    var jsonData = {}
    var formatter = { precision: 0, decimalSeparator: '.', thousandsSeparator: ',' };

    this.getHtml = function () {
        config = that.bap.config
        var noDataArea = AmCharts.addPrefix(config.noDataArea, '', '', formatter);
        return getHtmlFromJsRenderTemplate('#NFHPTestWidget', {
            id: config.id + "NFHPChart",
            json: config.id + "json",
            bapID: config.id,
            noData: config.id + "noData"
        });
    };

    this.getPdfLayout = function () {
        return {
            content: [
                { image: NFHPChart.div.id, alignment: 'center', width: 500 }
            ],
            charts: [NFHPChart]
        };
    };


    var NFHPChart;
    var chartData = []
    this.initializeWidget = function () {
        $("#" + config.id + "json").hide();
        $("#" + config.id + "NFHPChart").hide();
        $("#" + config.id + "noData").hide();


        let lookUpProp = that.bap.actionRef.placeNameProperty;
        let placeName = that.bap.actionRef.result.geojson.properties[lookUpProp];
        let lookupColumn = `properties.${config.charts[0].lookupColumn}`;

        var q = {
            "query": {
                "match_phrase": {}
            }
        };
        q['query']['match_phrase'][lookupColumn] = placeName

        let url = config.charts[0].elasticEndpoint + JSON.stringify(q);


        $.getJSON(url)
            .done(function (data) {

                if (data.error) {
                    $("#" + config.id + "noData").replaceWith('An Error has occured.');
                    $("#" + config.id + "noData").show();
                }
                else if (data.hits.hits.length) {
                    buildChart(data.hits.hits[0])
                    $("#" + config.id + "json").show();
                    $("#" + config.id + "NFHPChart").show();
                }
                else {
                    $("#" + config.id + "noData").replaceWith('No Data found for this Area.');
                    $("#" + config.id + "noData").show();
                }


            })
            .fail(function () {
                $("#" + config.id + "noData").replaceWith('An Error has occured.');
                $("#" + config.id + "noData").show();
            });


    }

    function buildChart(data) {

        that.bap.rawJson = data;
        data = data._source.properties
        let placeName = data.place_name
        let scored_km = data.scored_km
        function getPercent(value) {
            return ((value / scored_km) * 100).toFixed(6)
        }
        chartData = [
            { "Risk": "Very high", "Precent": getPercent(data.veryhigh_km), "color": "#FF0000" },
            { "Risk": "High", "Precent": getPercent(data.high_km), "color": "#FFAA00" },
            { "Risk": "Moderate", "Precent": getPercent(data.moderate_km), "color": "#A3FF73" },
            { "Risk": "Low", "Precent": getPercent(data.low_km), "color": "#00C5FF" },
            { "Risk": "Very low", "Precent": getPercent(data.verylow_km), "color": "#C500FF" }

        ]

        NFHPChart = AmCharts.makeChart(config.id + "NFHPChart", {
            "numberFormatter": formatter,
            "theme": 'light',
            "borderAlpha": 0,
            "creditsPosition": "top-right",
            "color": AmChartsHelper.getChartColor(),
            "theme": "light",
            "rotate": true,
            "marginLeft": 10,
            "marginRight": 10,
            "type": "serial",
            "dataProvider": chartData,
            "categoryField": "Risk",
            "graphs": [{
                "valueField": "Precent",
                "type": "column",
                "balloonText": "<b>[[category]]: [[Precent]]%" + "</b>",
                "fillColorsField": "color",
                "fillAlphas": .9,
                "lineAlpha": 0.3,
                "alphaField": "opacity",

            }],
            "categoryAxis": {
                "axisAlpha": 1,
                "axisColor": AmChartsHelper.getChartColor(),
                "autoGridCount": false,
                "gridCount": chartData.length,
                "gridPosition": "start",
                "title": "Risk To Fish Habitat Degradation"
            },
            "valueAxes": [
                {
                    "title": "NFHP Scored Stream Kms [%]",
                    "axisColor": AmChartsHelper.getChartColor(),
                    "axisAlpha": 1,
                }
            ],
            "titles": [
                {
                    "text": `Risk To Fish Habitat Degradation\n ${placeName}`,
                    "size": 15,
                    "axisColor": AmChartsHelper.getChartColor()
                }
            ]
        });

    }


};
