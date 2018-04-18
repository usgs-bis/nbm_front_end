'use strict';

let NFHPWidget = function (chartConfig) {
   
    let that = this;
    let config = chartConfig;
    let jsonData = {}
    let formatter = { precision: 0, decimalSeparator: '.', thousandsSeparator: ',' };

    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
      

    this.getHtml = function () {
        config = that.bap.config
        let noDataArea = AmCharts.addPrefix(config.noDataArea, '', '', formatter);
        return getHtmlFromJsRenderTemplate('#NFHPWidget', {
            id: config.id + "NFHPChart",
            json: config.id + "json",
            bapID: config.id,
            noData: config.id + "noData",
            title: ""
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


    let NFHPChart;
    let chartData = []
    this.initializeWidget = function () {
        $("#" + config.id + "json").hide();
        $("#" + config.id + "NFHPChart").hide();
        $("#" + config.id + "noData").hide();
        $("#" + config.id + "BapTitle").hide();


        let lookUpProp = that.bap.actionRef.placeNameProperty;
        let placeName = that.bap.actionRef.result.geojson.properties[lookUpProp];
        let lookupColumn = `properties.${config.charts[0].lookupColumn}`;

        let q = {
            "query": {
                "match_phrase": {}
            }
        };
        q['query']['match_phrase'][lookupColumn] = placeName

        let url = config.charts[0].elasticEndpoint + JSON.stringify(q);
        let e = {
            error: "An Error has occurred. Unable to retrieve data for this widget.",
            title: "Risk To Fish Habitat Degradation",
            id: that.bap.id,
            bap: "NFHP"
        }
        let html = getHtmlFromJsRenderTemplate('#widgetErrorInfoTitle', e)

        $.getJSON(url)
            .done(function (data) {

               

                if (data.error) {
                    $("#" + config.id + "noData").replaceWith(html);
                    $("#" + config.id + "noData").show();
                }
                else if (data.hits.hits.length) {
                    buildChart(data.hits.hits[0])
                    $("#" + config.id + "json").show();
                    $("#" + config.id + "NFHPChart").show();
                    $("#" + config.id + "BapTitle").show();
                    let d = data.hits.hits[0]._source.properties
                    let val1 = numberWithCommas((d.scored_km).toFixed(0))
                    let val2 = numberWithCommas((d.scored_km + d.not_scored_km).toFixed(0))
                    $("#" + config.id + "BapTitle").html(`Fish habitat condition was scored on ${val1} of ${val2} NHDPlusV1 stream kms within ${d.place_name}.`)
                }
                else {
                    $("#" + config.id + "noData").replaceWith(html);
                    $("#" + config.id + "noData").show();
                }


            })
            .fail(function () {
                $("#" + config.id + "noData").replaceWith(html);
                $("#" + config.id + "noData").show();
            });


    }

     
    function buildChart(data) {

        that.bap.rawJson = data;
        data = data._source.properties
        let placeName = data.place_name
        let scored_km = data.scored_km
        function getPercent(value) {
            return ((value / scored_km) * 100).toFixed(1)
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
                    "color": "#f3f3f3"
                }
            ],
            "export": {
                "enabled": true,
                "menu": []
            }
        });

    }


};
