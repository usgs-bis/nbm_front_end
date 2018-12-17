'use strict';


// this plot tags along with the box and whisker 
function PhenocastsAnalysisD3(config, bap) {
    let id = bap.id
    let selector = "#" + id + "BAP";
    let that = this;
    let button = null;
    let submitted = false;
    let featureId = null;

    let charts = {};

    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }


    let chartData = {
        "agdd_50f": {
            "Apple Maggot": {
                "Not Approaching Treatment Window": {
                    "range": [0, 650],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [650, 900],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [900, 2000],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [2000],
                    "color": "#C19A6B"
                },
            },
            "Emerald Ash Borer": {
                "Not Approaching Treatment Window": {
                    "range": [0, 350],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [350, 450],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [450, 1500],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [1500],
                    "color": "#C19A6B"
                },
            },
            "Lilac Borer": {
                "Not Approaching Treatment Window": {
                    "range": [0, 350],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [350, 500],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [500, 1300],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [1300],
                    "color": "#C19A6B"
                },
            },
            "Winter Moth": {
                "Not Approaching Treatment Window": {
                    "range": [0, 20],
                    "color": "#999999"
                },
                "Treatment Window": {
                    "range": [20, 350],
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
                    "range": [0, 25],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [25, 1000],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [1000, 2200],
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
        if (AOI && AOI.includes('OBIS_Areas:')) {
            $(`#${bap.id}BapCase`).hide()
            return
        }

        let that = this;
        today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd
        }

        if (mm < 10) {
            mm = '0' + mm
        }

        futureDate = new Date();
        var numberOfDaysToAdd = 6;
        futureDate.setDate(futureDate.getDate() + numberOfDaysToAdd);
        var fdd = futureDate.getDate();
        var fmm = futureDate.getMonth() + 1; //January is 0!
        var fyyyy = futureDate.getFullYear();

        if (fdd < 10) {
            fdd = '0' + fdd
        }

        if (fmm < 10) {
            fmm = '0' + fmm
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
                .catch(function () {
                    actionHandlerHelper.showTempPopup("Error submitting polygon, please try again");
                });
        });
    }

    this.inRange = function (num, bucket, name) {
        if (bucket.length === 1) {
            return num > bucket[0]
        } else {
            return num > bucket[0] && num <= bucket[1]
        }
    };

    this.createChartData = function () {
        let that = this;

        $.each(rawData, function (layer, times) {
            $.each(times, function (time, list) {
                list.forEach(function (num) {
                    $.each(chartData[layer], function (speciesName, categoryData) {
                        $.each(categoryData, function (categoryLabel, categoryInfo) {
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

    this.buildCharts = function () {
        let count = 0;
        let that = this;
        $.each(chartData, function (layerName, pestDatas) {
            $.each(pestDatas, function (pestName, pestData) {
                that.buildBarChart(pestName, pestData, count, layerName)
                count++
            });
        });
    };

    this.getBlock = function (id, val, checked) {
        let hide = !bap.priority ? "display: none;" : "";
        return `
        <div style="position: relative; display: block;">
        <label style="position: absolute; top: 10%; left: 90%; z-index: 9999999; ${hide}" class="clickSearch layerRadio">
        <input id="${id}Radio" type="radio" ${checked} name="phenocastGroup" class="clickSearch" value="${val}"/>
        <span class=" fa clickSearch-target" data-toggle="tooltip" data-placement="top" 
        title="Turn On Layer"></span>
        </label>
        <div  id="${id}"></div>
        </div>
        `
    };

    this.convertToAcres = function (number) {
        return number * 2000 * 2370 * 0.000247105
    };

    this.buildBarChart = function (pestName, pestData, num, layerName) {
        let that = this;
        let currentList = [];
        let futureList = [];

        $.each(pestData, function (category, data) {
            currentList.push({
                "helper": "", "Category": category,
                "Count": Math.round(that.convertToAcres(data["Current"])),
                "color": data["color"]
            });
            futureList.push({
                "helper": "", "Category": category,
                "Count": Math.round(that.convertToAcres(data["Six-Day"])),
                "color": data["color"]
            });
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

        $("#" + curId + "Radio" + "," + "#" + sixId + "Radio").on("change", function () {
            if ($(this).is(":checked")) {
                let visLayers = bioScape.getVisibleLayers(false);

                if (visLayers) {
                    let val = $(this).val().split(",")
                    visLayers.forEach(function (layer) {
                        layer.mapLayer.leafletLayer.setParams({
                            layers: val[0],
                            time: val[1],
                            styles: val[2]
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
            layers: "agdd_50f",
            time: today,
            styles: "apple_maggot"
        });

        if (that.bap.priority) {
            primaryLayer.turnOnLayer();

            $("#" + bap.id + "Inputs").show();
        }

        primaryLayer.updateLegendUrl();
        submitted = true;
    }

    this.togglePriority = function (priority) {
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


    this.getChart = function (data, id, name, forecast) {

        let currChart = d3.select(`[id="${id}"]`)


        currChart.transition()


        data.reverse()

        let margin = { top: 20, right: 50, bottom: 35, left: 30 },
            width = 465 - margin.left - margin.right,
            height = 195 - margin.top - margin.bottom;

        var opacityHover = 1;
        var otherOpacityOnHover = .8;

        let x = d3.scaleLinear().range([0, width]);
        let y = d3.scaleBand().range([height, 0]);

        let max = data.map(d => { return d.Count }).sort(function (a, b) { return a - b; })[data.length - 1]
        x.domain([0, max]);
        y.domain(data.map(function (d) { return d.Category; })).padding(0.1);

        let xAxis = d3.axisBottom(x)
            .ticks(4)
            .tickFormat(function (d) { return `${numberWithCommas(parseInt(d))}` })

        let yAxis = d3.axisLeft(y)
            .ticks(0)
            .tickFormat(function (d) { return `` })

        currChart.select(".svg-container-plot").remove()

        let svg = currChart
            .append("div")
            .classed("svg-container-plot", true)
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
            .classed("svg-content-responsive phenology-forecast", true)
            .attr("version", "1.1")
            .attr("baseProfile", "full")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + 0 + ")");


        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .attr("font-size", "11px")
            .call(xAxis);

        svg.append("g")
            .attr("transform", "translate(" + -1 + "," + 0 + ")")
            .attr("class", "y axis")
            .attr("font-size", "11px")
            .call(yAxis)

        let div = currChart
            .append("div")
            .attr("class", "chartTooltip currChartToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)");

        svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("height", y.bandwidth())
            .attr("fill", function (d) { return d.color })
            .attr("y", function (d) { return y(d.Category); })
            .attr("width", function (d) { return x(d.Count); })
            .on("mouseover", function (d) {
                d3.selectAll('path')
                .style("opacity", otherOpacityOnHover);
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html(toolTipLabel(d))
                    .style("left", (d3.event.layerX < 300 ? d3.event.layerX + 10 : d3.event.layerX - 100) + "px")
                    .style("top", (d3.event.layerY) + "px")
                    .style("border", `3px solid ${d.color}`);

            })
            .on("mouseout", function (d) {
                //   d3.select(this).attr("fill", function (d) { return d.color });
                div.transition()
                    .duration(500)
                    .style("opacity", 0);

            });

        // text label for the x axis
        svg.append("g")
            .append("text")
            .attr("y", height + margin.bottom + margin.top - 20)
            .attr("x", width / 2)
            .attr("fill", "rgb(0, 0, 0)")
            .attr("font-size", "14px")
            .style("text-anchor", "middle")
            .text("Approximate Acreage");


        // text label for the y axis
        svg.append("g")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .attr("fill", "rgb(0, 0, 0)")
            .attr("font-size", "14px")
            .style("text-anchor", "middle")
            .text(`${forecast} - ${dateStrings[forecast]}`);


        function toolTipLabel(d) {

            return `<p>${d.Category}: ${numberWithCommas(d.Count)} Acres</p>`

        }
        return id

    }

    this.sendAgdd32FeatureRequest = function (date) {
        var params = {
            feature_id: featureId,
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendJsonAjaxRequest(BIS_API + '/api/v1/phenocast/place/agdd_32', params);
    };

    this.sendAgdd50FeatureRequest = function (date) {
        var params = {
            feature_id: featureId,
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendJsonAjaxRequest(BIS_API + '/api/v1/phenocast/place/agdd_50', params);
    };

    this.sendAgdd32PolygonRequest = function (date) {
        var params = {
            geojson: JSON.stringify(that.bap.feature.geojson.geometry),
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendPostRequest(BIS_API + '/api/v1/phenocast/polygon/agdd_32', params, true);
    };

    this.sendAgdd50PolygonRequest = function (date) {
        var params = {
            geojson: JSON.stringify(that.bap.feature.geojson.geometry),
            date: date,
            token: PUBLIC_TOKEN
        };

        return sendPostRequest(BIS_API + '/api/v1/phenocast/polygon/agdd_50', params, true);
    };

    this.getData = function (today, futureDate) {
        let requests = []
        if (featureId) {
            requests.push(this.sendAgdd32FeatureRequest(today)
                .then(function (data) {
                    rawData["agdd"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd32FeatureRequest(futureDate)
                .then(function (data) {
                    rawData["agdd"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50FeatureRequest(today)
                .then(function (data) {
                    rawData["agdd_50f"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50FeatureRequest(futureDate)
                .then(function (data) {
                    rawData["agdd_50f"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
        } else {
            requests.push(this.sendAgdd32PolygonRequest(today)
                .then(function (data) {
                    rawData["agdd"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd32PolygonRequest(futureDate)
                .then(function (data) {
                    rawData["agdd"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50PolygonRequest(today)
                .then(function (data) {
                    rawData["agdd_50f"]["Current"] = data[today]
                    return Promise.resolve();
                }))
            requests.push(this.sendAgdd50PolygonRequest(futureDate)
                .then(function (data) {
                    rawData["agdd_50f"]["Six-Day"] = data[futureDate]
                    return Promise.resolve();
                }))
        }

        return Promise.all(requests)
    }

    this.getPdfLayout = function () {

        try {

            let content = []
            let c, d, ctx

            $.each(charts, function (pestName, pestCharts) {
                content.push({ text: pestName, style: ['subTitleChart'], pageBreak: 'before' })

                $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
                d3.select(`[id="${pestCharts[0]}"]`).select("svg").attr("height", 200)
                d3.select(`[id="${pestCharts[0]}"]`).select("svg").attr("width", 200)
                c = document.getElementById(`myCanvas${id}`);
                ctx = c.getContext('2d');
                ctx.drawSvg($(`#${pestCharts[0]} .svg-container-plot`).html(), 0, 0, 800, 800);
                // clean up
                d3.select(`[id="${pestCharts[0]}"]`).select("svg").attr("height", null)
                d3.select(`[id="${pestCharts[0]}"]`).select("svg").attr("width", null)
                $("#canvasHolder").html("")

                $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
                d3.select(`[id="${pestCharts[1]}"]`).select("svg").attr("height", 200)
                d3.select(`[id="${pestCharts[1]}"]`).select("svg").attr("width", 200)
                d = document.getElementById(`myCanvas${id}`);
                ctx = d.getContext('2d');
                ctx.drawSvg($(`#${pestCharts[1]} .svg-container-plot`).html(), 0, 0, 800, 800);
                // clean up
                d3.select(`[id="${pestCharts[1]}"]`).select("svg").attr("height", null)
                d3.select(`[id="${pestCharts[1]}"]`).select("svg").attr("width", null)
                $("#canvasHolder").html("")

                // content.push({ image: c.toDataURL(), alignment: 'center', width: 400 })
                // content.push({ image: d.toDataURL(), alignment: 'center', width: 400 })
                content.push(
                    {
                        alignment: 'center',
                        columns: [
                            {
                                text: ''
                            },
                            {
                                width: 250,
                                image: c.toDataURL()
                            },
                            {
                                text: ''
                            },
                            {
                                width: 250,
                                image: d.toDataURL()
                            },
                            {
                                text: ''
                            }
                        ]
                    }
                )


            })

            return {
                content: content,
                charts: []
            }
        }
        catch (error) {
            //showErrorDialog("Error printing one or more charts to report.",false);
            return { content: [], charts: [] }
        }
    }


    let ts = widgetHelper.addTimeSlider()

}

inherit(Analysis, PhenocastsAnalysisD3);