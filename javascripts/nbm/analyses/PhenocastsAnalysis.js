'use strict';


// this plot tags along with the box and whisker 
function PhenocastsAnalysis(config, bap) {
    let id = bap.id
    let selector = "#" + id + "BAP";
    let dataURI = ""
    let that = this;
    // Class level variables for mouseover tooltip.
    var startYear;
    var endYear;
    let button = null;
    let submitted = false;
    let featureId = null;

    let charts = {};

    let chartData = {
        "agdd_50f":{
            "Apple Maggot": {
                "Not Approaching Treatment Window": {
                    "range": [0,650],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [650,900],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [900,2000],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [2000],
                    "color": "#C19A6B"
                },
            },
            "Emerald Ash Borer": {
                "Not Approaching Treatment Window": {
                    "range": [0,350],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [350,450],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [450,1500],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [1500],
                    "color": "#C19A6B"
                },
            },
            "Lilac Borer": {
                "Not Approaching Treatment Window": {
                    "range": [0,350],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [350,500],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [500,1300],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [1300],
                    "color": "#C19A6B"
                },
            },
            "Winter Moth": {
                "Not Approaching Treatment Window": {
                    "range": [0,20],
                    "color": "#999999"
                },
                "Treatment Window": {
                    "range": [20,350],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [350],
                    "color": "#C19A6B"
                },
            }
        },
        "agdd": {
            "Hemlock Woolly Adelgid": {
                "Not Approaching Treatment Window": {
                    "range": [0,25],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [25,1000],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [1000,2200],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [2200],
                    "color": "#C19A6B"
                },
            }
        }
    }

    let rawData = {
        "agdd": {
            "Current": [],
            "Six-Day": []
        },
        "agdd_50f": {
            "Current": [],
            "Six-Day": []
        }
    }

    let dateStrings = {}
    let today = "";
    let futureDate = "";

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#phenocastTemplate', { id: id });
    }
    this.initializeWidget = function () {
        if (bap.actionRef && bap.actionRef.result.geojson.properties["feature_id"]) {
            featureId = bap.actionRef.result.geojson.properties["feature_id"]
        } else {
            featureId = null;
        }
        let AOI = bap.gid;
        if(AOI && AOI.includes('OBIS_Areas:')) {
            $(`#${bap.id}BapCase`).hide()
            return
        }

        let that = this;
        today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        var yyyy = today.getFullYear();
        if(dd<10) {
            dd = '0'+dd
        }

        if(mm<10) {
            mm = '0'+mm
        }

        futureDate = new Date();
        var numberOfDaysToAdd = 6;
        futureDate.setDate(futureDate.getDate() + numberOfDaysToAdd);
        var fdd = futureDate.getDate();
        var fmm = futureDate.getMonth()+1; //January is 0!
        var fyyyy = futureDate.getFullYear();

        if(fdd<10) {
            fdd = '0'+fdd
        }

        if(fmm<10) {
            fmm = '0'+fmm
        }

        dateStrings["Current"] = yyyy + '-' + mm + '-' + dd
        dateStrings["Six-Day"] = fyyyy + '-' + fmm + '-' + fdd

        today = yyyy + '-' + mm + '-' + dd;
        futureDate = fyyyy + '-' + fmm + '-' + fdd;

        button = $(selector).find('#getData');
        button.on('click', function () {
            if (!that.bap.priority) {
                $(`#${that.bap.id}BapCase #priorityBap${that.bap.id}`).click()
            }
            $(selector).find('.afterSubmitAttribution').show();
            actionHandlerHelper.showTempPopup("Submitted polygon. Larger or more complex polygons will take longer to process");
            toggleSpinner();
            that.getData(today, futureDate)
                .then(function () {
                    that.createChartData()
                    toggleSpinner(true);
                })
                .catch(function() {
                    actionHandlerHelper.showTempPopup("Error submitting polygon, please try again");
                });
        });
    }

    this.inRange = function(num, bucket, name) {
        if (bucket.length === 1) {
            return num > bucket[0]
        } else {
            return num > bucket[0] && num <= bucket[1]
        }
    };

    this.createChartData = function () {
        let that = this;

        $.each(rawData, function (layer, times) {
            $.each(times, function(time, list) {
                list.forEach(function(num) {
                    $.each(chartData[layer], function (speciesName, categoryData) {
                        $.each(categoryData, function(categoryLabel, categoryInfo) {
                            if (chartData[layer][speciesName][categoryLabel][time] === undefined) {
                                chartData[layer][speciesName][categoryLabel][time] = 0;
                            }
                            if (that.inRange(num, chartData[layer][speciesName][categoryLabel]["range"], speciesName)) {
                                chartData[layer][speciesName][categoryLabel][time] = chartData[layer][speciesName][categoryLabel][time] + 1
                            }
                        })
                    })
                });
            });
        });

        this.buildCharts()
    };

    function toggleSpinner(hide) {
        if (hide) {
            $(selector).find('#bapSpinner').hide()
        }
        else {
            $(selector).find('#bapSpinner').show()
        }
    }

    this.buildCharts = function() {
        let count = 0;
        let that = this;
        $.each(chartData, function (layerName, pestDatas) {
            $.each(pestDatas, function(pestName, pestData) {
                that.buildBarChart(pestName, pestData, count, layerName)
                count++
            });
        });
    };

    this.getBlock = function(id, val, checked) {
        let hide = !bap.priority ? "display: none;" : "";
        return `
        <div style="position: relative; display: block;">
        <label style="position: relative; top: 90px; left: 425px; z-index: 9999999; ${hide}" class="clickSearch layerRadio">
        <input id="${id}Radio" type="radio" ${checked} name="phenocastGroup" class="clickSearch" value="${val}"/>
        <span class=" fa clickSearch-target" data-toggle="tooltip" data-placement="top" 
        title="Turn On Layer"></span>
        </label>
        <div style="width: 400px; height: 200px; margin-right: 0;" id="${id}"></div>
        </div>
        `
    };

    this.convertToAcres = function(number) {
        return number * 2000 * 2370 * 0.000247105
    };

    this.buildBarChart = function(pestName, pestData, num, layerName) {
        let that = this;
        let currentList = [];
        let futureList = [];

        $.each(pestData, function(category, data) {
            currentList.push({"helper": "", "Category": category,
                "Count": Math.round(that.convertToAcres(data["Current"])),
                "color": data["color"]});
            futureList.push({"helper": "", "Category": category,
                "Count": Math.round(that.convertToAcres(data["Six-Day"])),
                "color": data["color"]});
        });

        let curId = id + "PhenocastCurrent" + num;
        let sixId = id + "PhenocastSixDay" + num;
        let curRadio = [layerName, today, pestName.toLowerCase().replace(/ /g, '_')].join(",")
        let sixRadio = [layerName, futureDate, pestName.toLowerCase().replace(/ /g, '_')].join(",")

        let chartHolder = $(selector).find(".chartHolder")
        chartHolder.append('<div class="contextSubHeader subHeaderTitle">' + pestName + '</div>');
        chartHolder.append(this.getBlock(curId, curRadio, num ? "" : "checked"));
        chartHolder.append(this.getBlock(sixId, sixRadio, ""));

        charts[pestName] = []

        charts[pestName].push(this.getChart(currentList, curId, pestName, "Current"));
        charts[pestName].push(this.getChart(futureList, sixId, pestName, "Six-Day"));

        $("#"+curId+"Radio" + "," + "#"+sixId+"Radio").on("change", function(){
            if ($(this).is(":checked")) {
                let visLayers = bioScape.getVisibleLayers(false);

                if (visLayers) {
                    let val = $(this).val().split(",")
                    visLayers.forEach(function (layer) {
                        layer.mapLayer.leafletLayer.setParams({
                            layers:val[0],
                            time:val[1],
                            styles:val[2]
                        });
                        layer.updateLegendUrl();
                    })
                }
            }
        })

        let primaryLayer = bap.GetBapLayers().filter(l => {
            return !l.summarizationRegion
        })[0]

        primaryLayer.mapLayer.leafletLayer.setParams({
            layers:"agdd_50f",
            time:today,
            styles:"apple_maggot"
        });

        if (that.bap.priority) {
            primaryLayer.turnOnLayer();

            $("#" + bap.id + "Inputs").show();
        }

        primaryLayer.updateLegendUrl();
        submitted = true;
    }

    this.togglePriority = function(priority) {
        bap.hideInputs = !submitted;
        if (priority) {
            $(".layerRadio").show();
            let primaryLayer = bap.GetBapLayers().filter(l => {
                return !l.summarizationRegion
            })[0]

            if (submitted) {
                primaryLayer.turnOnLayer();
            }
        } else {
            $(".layerRadio").hide();
        }
    }


    this.getChart = function(data, id, name, forecast) {
        return AmCharts.makeChart(id, {
            // "numberFormatter": formatter,
            "theme": 'light',
            "borderAlpha": 0,
            "creditsPosition": "top-right",
            "color": AmChartsHelper.getChartColor(),
            "rotate": true,
            "marginLeft": 10,
            "marginRight": 15,
            "type": "serial",
            "dataProvider": data,
            "categoryField": "helper",
            "autoWrap": true,
            "numberFormatter": {precision:0, decimalSeparator:'.', thousandsSeparator:','},
            "graphs": [{
                "valueField": "Count",
                "type": "column",
                "balloonText": "<b>[[Category]]: [[Count]] acres" + "</b>",
                "fillColorsField": "color",
                "fillAlphas": .9,
                "lineAlpha": 0.3,
                "alphaField": "opacity",
                "balloonFunction": function(item) {
                    return `<b>${item.dataContext.Category}: ${item.dataContext.Count.toLocaleString()} acres</b>`
                }

            }],
            "categoryAxis": {
                "axisAlpha": 1,
                "axisColor": AmChartsHelper.getChartColor(),
                "autoGridCount": false,
                "gridCount": data.length,
                "gridPosition": "start",
                "title": forecast + "\n" + dateStrings[forecast]
            },
            "valueAxes": [
                {
                    "title": "Approximate Acreage",
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

    this.sendAgdd32FeatureRequest = function(date) {
        var params = {
            feature_id: featureId,
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendJsonAjaxRequest(BIS_API + '/api/v1/phenocast/place/agdd_32', params);
    };

    this.sendAgdd50FeatureRequest = function(date) {
        var params = {
            feature_id: featureId,
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendJsonAjaxRequest(BIS_API + '/api/v1/phenocast/place/agdd_50', params);
    };

    this.sendAgdd32PolygonRequest = function(date) {
        var params = {
            geojson: JSON.stringify(that.bap.feature.geojson.geometry),
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendPostRequest(BIS_API + '/api/v1/phenocast/polygon/agdd_32', params, true);
    };

    this.sendAgdd50PolygonRequest = function(date) {
        var params = {
            geojson: JSON.stringify(that.bap.feature.geojson.geometry),
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendPostRequest(BIS_API + '/api/v1/phenocast/polygon/agdd_50', params, true);
    };

    this.getData = function(today, futureDate) {
        let requests = []
        if (featureId) {
            requests.push(this.sendAgdd32FeatureRequest(today)
                .then(function(data) {
                    rawData["agdd"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd32FeatureRequest(futureDate)
                .then(function(data) {
                    rawData["agdd"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50FeatureRequest(today)
                .then(function(data) {
                    rawData["agdd_50f"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50FeatureRequest(futureDate)
                .then(function(data) {
                    rawData["agdd_50f"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
        } else {
            requests.push(this.sendAgdd32PolygonRequest(today)
                .then(function(data) {
                    rawData["agdd"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd32PolygonRequest(futureDate)
                .then(function(data) {
                    rawData["agdd"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50PolygonRequest(today)
                .then(function(data) {
                    rawData["agdd_50f"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50PolygonRequest(futureDate)
                .then(function(data) {
                    rawData["agdd_50f"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
        }

        return Promise.all(requests)
    }

    this.getPdfLayout = function() {

        let ret = {
            content: [],
            charts: []
        }

        $.each(charts, function(pestName, pestCharts) {
            ret["content"].push({text: pestName,style: ['subTitleChart'], pageBreak: 'before'})
            ret["content"].push({ image: pestCharts[0].div.id, alignment: 'center', width: 500 })
            ret["content"].push({ image: pestCharts[1].div.id, alignment: 'center', width: 500 })

            ret["charts"].push(pestCharts[0])
            ret["charts"].push(pestCharts[1])
        });

        return ret;
    }


    let ts = widgetHelper.addTimeSlider()

}

inherit(Analysis, PhenocastsAnalysis);