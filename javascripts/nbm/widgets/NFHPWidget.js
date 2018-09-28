'use strict';

let NFHPWidget = function (chartConfig,bap) {
   
    let that = this;
    let config = chartConfig;
    let jsonData = {}
    let formatter = { precision: 0, decimalSeparator: '.', thousandsSeparator: ',' };
    var titleLine;
    var subTitleLine;

    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
      

    this.getHtml = function () {
        config = that.bap.config
        let noDataArea = AmCharts.addPrefix(config.noDataArea, '', '', formatter);

        let lookUpProp = that.bap.actionRef.placeNameProperty ? that.bap.actionRef.placeNameProperty : that.bap.actionRef.lookupProperty;
        let placeName = that.bap.actionRef.result.geojson.properties[lookUpProp];
        return getHtmlFromJsRenderTemplate('#NFHPWidget', {
            id: config.id + "NFHPChart",
            json: config.id + "json",
            bapID: config.id,
            noData: config.id + "noData",
            title: `Risk to Fish Habitat Degradation in ${placeName}`,
        });
    };

    this.getPdfLayout = function () {
        return {
            content: [
                {text: titleLine, style:['titleChart'], pageBreak: 'before'},
                {text: subTitleLine,style: ['subTitleChart']},
                { image: NFHPChart.div.id, alignment: 'center', width: 500 }
            ],
            charts: [NFHPChart]
        };
    };


    let NFHPChart;
    let chartData = []
    this.initializeWidget = function () {


        let AOI = bap.gid;
        if(AOI && AOI.includes('OBIS_Areas:')) {
            $(`#${bap.id}BapCase`).hide()
            return
        }

        $("#" + config.id + "json").hide();
        $("#" + config.id + "NFHPChart").hide();
        $("#" + config.id + "noData").hide();
        $("#" + config.id + "BapTitle").hide();


        let featureId = that.bap.actionRef.result.geojson.properties["feature_id"];

        let url = config.charts[0].elasticEndpoint + featureId;

        let e = {
            error: "There is no analysis data for the chosen geometry.",
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
                    $(`#${config.id}BapCase`).hide()

                }
                else if (data.hits.hits.length) {
                    buildChart(data.hits.hits[0])
                    $("#" + config.id + "json").show();
                    $("#" + config.id + "NFHPChart").show();
                    $("#" + config.id + "BapTitle").show();
                    let d = data.hits.hits[0]._source.properties
                    d.scored_km = parseFloat(d.scored_km);
                    d.not_scored_km = parseFloat(d.not_scored_km)
                    let val1 = numberWithCommas((d.scored_km).toFixed(0))
                    let val2 = numberWithCommas((d.scored_km + d.not_scored_km).toFixed(0))
                    $("#" + config.id + "BapTitle").html(`Fish habitat condition was scored on ${val1} of ${val2} NHDPlusV1 stream kilometers within ${d.place_name}.`)

                    titleLine = 'Fish habitat condition was scored on ' + val1+' of '+ val2 + ' NHDPlusV1 stream kilometers within ' + d.place_name ;
                    subTitleLine = 'Risk to Fish Habitat Degradation in ' + d.place_name;
                }
                else {
                    $("#" + config.id + "noData").replaceWith(html);
                    $("#" + config.id + "noData").show();
                    $(`#${config.id}BapCase`).hide()

                }


            })
            .fail(function () {
                $("#" + config.id + "noData").replaceWith(html);
                $("#" + config.id + "noData").show();
                $(`#${config.id}BapCase`).hide()

            });


    }

     
    function buildChart(data) {

        that.bap.rawJson["Location"] = data;
        data = data._source.properties
        let placeName = data.place_name
        let scored_km = data.scored_km
        function getPercent(value) {
            value = parseFloat(value)
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
            "autoWrap": true, 
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
                    "title": "NFHP Scored Stream Kilometers [%]",
                    "axisColor": AmChartsHelper.getChartColor(),
                    "axisAlpha": 1,
                }
            ],
            "export": {
                "enabled": true,
                "menu": []
            }
        });

    }


};

inherit(Widget, NFHPWidget);
