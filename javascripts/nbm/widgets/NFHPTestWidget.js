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
        $("#"+config.id+"json").hide();
        $("#"+config.id + "NFHPChart").hide();

        let stateName = that.bap.actionRef.result.geojson.properties.state_name
        let url = `https://beta-gc2.datadistillery.org/api/v1/sql/bcb/nfhp
                ?q=SELECT place_name, scored_km, not_scored_km, verylow_km, low_km, moderate_km, high_km, veryhigh_km
                 FROM nfhp.hci2015_summaries_mp WHERE place_name = '${stateName}'`
        $.getJSON(url)
            .done(function (data) {
                if(data.features.length){
                    $("#"+config.id+"json").show();
                    $("#"+config.id + "NFHPChart").show();
                    $("#"+config.id + "noData").hide();
                }
                
                that.bap.rawJson = data;
                data = data.features[0].properties
                let scored_km = data.scored_km
                function getPercent(value){
                    return ((value /scored_km) * 100).toFixed(6)
                }
                chartData = [
                    { "Risk": "veryhigh", "Precent": getPercent(data.veryhigh_km),"color":"#FF0000" },
                    { "Risk": "high", "Precent": getPercent(data.high_km),"color":"#FFAA00" },
                    { "Risk": "moderate", "Precent": getPercent(data.moderate_km),"color":"#A3FF73" },
                    { "Risk": "low", "Precent": getPercent(data.low_km),"color":"#00C5FF" },
                    { "Risk": "verylow", "Precent": getPercent(data.verylow_km),"color":"#C500FF" }
            
                ]
                
                


                NFHPChart = AmCharts.makeChart(config.id + "NFHPChart", {
                    "numberFormatter": formatter,
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
                        "autoGridCount": false,
                        "gridCount": chartData.length,
                        "gridPosition": "start",
                        "title": "Risk To Fish Habitat Degradation"
                    },
                    "valueAxes": [
                        {
                            "title": "NFHP Scored Stream Kms [%]"
                        }
                    ],
                    "titles": [
                        {
                            "text": `Risk To Fish Habitat Degradation in ${stateName} Streams`,
                            "size": 15
                        }
                    ]
                });
             
                
            })
     }


};
