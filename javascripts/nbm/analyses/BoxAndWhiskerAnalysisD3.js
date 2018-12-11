'use strict';


// this plot tags along with the box and whisker 
function BoxAndWhiskerAnalysisD3(config, bap) {
    let that = this
    let id = bap.id
    let selector = "#" + id + "BAP";

    // Class level variables for mouseover tooltip.
    var startYear;
    var endYear;

    let timeSlider = null;
    let button = null;
    let layer = null;
    let featureId = null;

    let urlFeatureMap = {
        "LEAF_OUT_DAY": BIS_API + "/api/v1/phenology/place/firstleaf",
        "BLOOM_DAY": BIS_API + "/api/v1/phenology/place/firstbloom"
    }

    let urlPolygonMap = {
        "LEAF_OUT_DAY": BIS_API + "/api/v1/phenology/polygon/firstleaf",
        "BLOOM_DAY": BIS_API + "/api/v1/phenology/polygon/firstbloom"
    }

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#boxAndWhiskerTemplate', { id: id });
    }
    this.initializeWidget = function (feature) {


        let AOI = bap.gid;
        if (AOI && AOI.includes('OBIS_Areas:')) {
            $(`#${bap.id}BapCase`).hide()
            return
        }

        if (bap.actionRef && bap.actionRef.result.geojson.properties["feature_id"]) {
            featureId = bap.actionRef.result.geojson.properties["feature_id"]
        } else {
            featureId = null;
        }

        let movehtml = $(selector).find(".bapHeader").html()
        $(selector).find(".bapHeader").html("")
        $("#" + that.bap.id + "Inputs").after(movehtml)

        if (that.bap.GetBapLayers().length) {
            layer = that.bap.GetBapLayers()[0]
        }
        else {
            return;
        }

        timeSlider = widgetHelper.addTimeSlider();
        let time = layer.getTimeInfo();

        if (!time) {
            return;
        }

        button = $(selector).find('#getData');
        button.on('click', function () {
            that.submitData("Larger or more complex polygons will take longer to process", feature);
        });

        let checkRange = function (min, max) {

            if ((max - min) <= 0) {
                $(selector).find('#bapRangeSlider').html('Please select a range to analyze.');
                button.hide()
            }

            if (time.startDate > min || time.endDate < max) {
                $(selector).find('#bapRangeSlider').html('OUT OF RANGE: ' + time.startDate + ' to ' + time.endDate);
                button.hide()
            }
            else {
                $(selector).find('#bapRangeSlider').html('Analyze Time Period: ' + min + ' to ' + max);
                button.show();
            }
        }
        checkRange(timeSlider.slider("values", 0), timeSlider.slider("values", 1))

        timeSlider.on("slidechange", function (event, ui) {
            if (ui) {
                var min = ui.values[0];
                var max = ui.values[1];

                checkRange(min, max)
            }
        });

        if (this.bap.initConfig.range) {
            bioScape.bapLoading(that.bap.id, false)
            actionHandlerHelper.globalTimeSlider().setToRange(this.bap.initConfig.range)
            button.click()
            this.bap.initConfig.range = undefined
        }
    };



    this.submitData = function (message, inputFeature) {

        var values = timeSlider.slider('values');
        this.bap.state.range = values
        this.bap.updateState(true)
        actionHandlerHelper.showTempPopup(message);

        $(selector).find('.afterSubmitAttribution').show();

        button.hide();
        $(selector).find('#boxAndWhiskerError').html('');
        toggleSpinner();
        timeSlider.slider('disable');
        $(selector).find(".boxPlot").hide();
        $.each(that.bap.widgets, function (index, widget) {
            widget.hideChart();
        });

        this.sendPhenologyRequest(inputFeature)
            .then(function (data) {
                if (!data) {
                    setError(' An error has occured. If the problem continues, please contact site admin.');
                } else {
                    if (!data[values[0]] || !data[values[0]].length) {
                        setError(`Your polygon is either too small to intersect the center of any raster cells or it 
                        falls outside the geographic extent of the data you're trying to analyze.`);
                    } else {
                        $.each(that.bap.widgets, function (index, widget) {
                            widget.buildChart(data, that.bap.id);
                        });
                    }
                }

                $(selector).find("#" + that.bap.id + "JsonDiv").show();
                timeSlider.slider('enable');
                toggleSpinner(true);
                bioScape.bapLoading(that.bap.id, true)
            })

    };

    this.sendPhenologyFeatureRequest = function () {
        let params = {
            year_min: this.bap.state.range[0],
            year_max: this.bap.state.range[1],
            feature_id: featureId,
            token: PUBLIC_TOKEN
        }

        return sendJsonAjaxRequest(urlFeatureMap[that.bap.config.bapProperties.npnProperty], params);
    }

    this.sendPhenologyPolygonRequest = function (inputFeature) {
        let params = {
            year_min: this.bap.state.range[0],
            year_max: this.bap.state.range[1],
            geojson: JSON.stringify(inputFeature.geojson.geometry),
            token: PUBLIC_TOKEN
        }

        return sendPostRequest(urlPolygonMap[that.bap.config.bapProperties.npnProperty], params, true);
    }

    this.sendPhenologyRequest = function (inputFeature) {
        if (featureId) {
            return this.sendPhenologyFeatureRequest()
        } else {
            return this.sendPhenologyPolygonRequest(inputFeature)
        }
    }

    function toggleSpinner(hide) {
        if (hide) {
            $(selector).find('#bapSpinner').hide()
        }
        else {
            $(selector).find('#bapSpinner').show()
        }
    }

    this.getPdfLayout = function () {

        try {
            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            d3.select(`#boxAndWhiskerPlot${id}`).select("svg").attr("height", 500)
            d3.select(`#boxAndWhiskerPlot${id}`).select("svg").attr("width", 500)

            let c = document.getElementById(`myCanvas${id}`);
            let ctx = c.getContext('2d');
            ctx.drawSvg($(`#boxAndWhiskerChart${id} .svg-container-plot`).html(), 0, 0, 800, 800);

            // clean up
            d3.select(`#boxAndWhiskerPlot${id}`).select("svg").attr("height", null)
            d3.select(`#boxAndWhiskerPlot${id}`).select("svg").attr("width", null)
            $("#canvasHolder").html("")

            return {
                content: [
                    { text: $(selector).find("#boxAndWhiskerTitle").text(), style: ['titleChart'], pageBreak: 'before' },
                    { text: $(selector).find("#boxAndWhiskerSubTitle").text(), style: ['subTitleChart'] },
                    { image: c.toDataURL(), alignment: 'center', width: 500 }
                ],
                charts: []
            }

        }
        catch (error) {
            //showErrorDialog("Error printing one or more charts to report.",false);
            return { content: [], charts: [] }
        }
    }


    let ts = widgetHelper.addTimeSlider()

    this.hideChart = function () {
        $(selector).find(`#boxAndWhiskerPlot${id}`).hide()
    }


    this.buildChart = function (chartData, id) {



        $(selector).find(`#boxAndWhiskerPlot${id}`).show()
        $(selector).find(".ridgeLinePlotRangeValue").html(3);
        $(selector).find(".ridgeLinePlotRange").val(3);

        d3.select(`#boxAndWhiskerPlot${id}`).select(".svg-container-plot").remove()


        let margin = { top: 20, right: 20, bottom: 25, left: 65 },
            width = $(`#boxAndWhiskerPlot${id}`).width() - margin.left - margin.right,
            height = 450 - margin.top - margin.bottom;

        let pos = $(`#boxAndWhiskerPlot${id}`).position()

        let x = d3.scalePoint();

        let y = d3.scaleLinear();

        let formatTime = d3.timeFormat("%b %d");

        let totalCount = 0;


        function updateChart(dta, buk) {

            let years = Object.getOwnPropertyNames(dta)
            var globalCounts = [];

            for (let year of years) {
                dta[year].sort((a, b) => (parseInt(a) < parseInt(b)) ? 1 : ((parseInt(b) < parseInt(a)) ? -1 : 0));
                globalCounts.push(dta[year][0])
                globalCounts.push(dta[year][dta[year].length - 1])

            }

            setSharedData(dta)

            x.domain(Object.keys(dta))
                .rangeRound([0, width])
                .padding([0.5]);

            //   // Compute a global y scale based on the global counts
            var min = d3.min(globalCounts);
            var max = d3.max(globalCounts);
            y.domain([min - 5, max + 5])
                .range([height, 0]);

            var barWidth = 35 - years.length;
            barWidth = barWidth > 5 ? barWidth : 5

            let xAxis = d3.axisBottom(x)

            let yAxis = d3.axisLeft(y)
                .ticks(5)
                .tickFormat(x => { return dateFromDay(2018, (x)) })


            // Prepare the data for the box plots
            var boxPlotData = [];
            for (var [key, groupCount] of Object.entries(dta)) {

                var record = {};
                var localMin = d3.min(groupCount);
                var localMax = d3.max(groupCount);

                record["key"] = key;
                record["counts"] = groupCount;
                record["quartile"] = boxQuartiles(groupCount);
                record["whiskers"] = [localMin, localMax];

                boxPlotData.push(record);
            }



            let boxAndWhisker = d3.select(`#boxAndWhiskerPlot${id}`)

            // Remove old titles on change
            boxAndWhisker.selectAll("text").remove()

            // Title
            let location = actionHandlerHelper.sc.headerBap.config.title
            boxAndWhisker.select("#boxAndWhiskerTitle").append("text")
                .text(`${config.title} ${location ? "for " + location : ""}`);

            // Subtitle    
            boxAndWhisker.select("#boxAndWhiskerSubTitle").append("text")
                .text(`All Years for the Period ${years[0]} to ${years[years.length - 1]}`);
            startYear = years[0];
            endYear = years[years.length - 1];

            boxAndWhisker.transition()

            boxAndWhisker.select(".svg-container-plot").remove()

            var svg = boxAndWhisker.select(`#boxAndWhiskerChart${id}`)
                .append("div")
                .classed("svg-container-plot", true)
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
                .classed("svg-content-responsive", true)
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
                .attr("class", "y axis")
                .attr("font-size", "11px")
                .call(yAxis)




            // // Setup the group the box plot elements will render in
            var g = svg.append("g")
                .attr("transform", `translate(-${parseInt(barWidth / 2)},0)`);

            // Draw the box plot vertical lines
            var verticalLines = g.selectAll(".verticalLines")
                .data(boxPlotData)
                .enter()
                .append("line")
                .attr("x1", function (datum) {
                    return x(datum.key) + barWidth / 2;
                }
                )
                .attr("y1", function (datum) {
                    var whisker = datum.whiskers[0];
                    return y(whisker);
                }
                )
                .attr("x2", function (datum) {
                    return x(datum.key) + barWidth / 2;
                }
                )
                .attr("y2", function (datum) {
                    var whisker = datum.whiskers[1];
                    return y(whisker);
                }
                )
                .attr("stroke", "#000")
                .attr("stroke-width", 1)
                .attr("fill", "none");


            let div = boxAndWhisker.select(`#boxAndWhiskerChart${id}`)
                .append("div")
                .attr("class", "chartTooltip boxAndWhiskerToolTip")
                .style("opacity", 0)
                .style("border", "3px solid rgb(56, 155, 198)");

            // Draw the boxes of the box plot on top of vertical lines
            var rects = g.selectAll("rect")
                .data(boxPlotData)
                .enter()
                .append("rect")
                .attr("width", barWidth)
                .attr("height", function (datum) {
                    var quartiles = datum.quartile;
                    var height = y(quartiles[2]) - y(quartiles[0]);
                    return height;
                }
                )
                .attr("x", function (datum) {
                    return x(datum.key);
                }
                )
                .attr("y", function (datum) {
                    return y(datum.quartile[0]);
                }
                )
                .attr("fill", function (datum) {
                    return datum.color;
                }
                )
                .attr("fill", "rgb(56, 155, 198)")
                .attr("stroke", "#000")
                .attr("stroke-width", 1)
                .on("mouseover", function (d) {
                    d3.select(this)
                        .attr("fill", "rgb(45, 125, 159)");
                    div.transition()
                        .duration(200)
                        .style("opacity", .9);
                    div.html(toolTipLabel(d, buk))
                        .style("left", (d3.event.layerX < 350 ? d3.event.layerX + 10 : d3.event.layerX - 50) + "px")
                        .style("top", (d3.event.layerY) + "px");
                })
                .on("mouseout", function (d) {
                    d3.select(this).attr("fill", "rgb(56, 155, 198)");
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);
                });


            // text label for the x axis
            svg.append("g")
                .append("text")
                .attr("y", height + margin.bottom + margin.top - 5)
                .attr("x", width / 2)
                .attr("fill", "rgb(0, 0, 0)")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .text("Year");


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
                .text("Day of year");

            // Now render all the horizontal lines  - the whiskers
            var horizontalLineConfigs = [
                // Top whisker
                {
                    x1: function (datum) { return x(datum.key) },
                    y1: function (datum) { return y(datum.whiskers[0]) },
                    x2: function (datum) { return x(datum.key) + barWidth },
                    y2: function (datum) { return y(datum.whiskers[0]) }
                },

                // Bottom whisker
                {
                    x1: function (datum) { return x(datum.key) },
                    y1: function (datum) { return y(datum.whiskers[1]) },
                    x2: function (datum) { return x(datum.key) + barWidth },
                    y2: function (datum) { return y(datum.whiskers[1]) }
                }
            ];

            for (var i = 0; i < horizontalLineConfigs.length; i++) {
                var lineConfig = horizontalLineConfigs[i];

                // Draw the whiskers at the min for this series
                var horizontalLine = g.selectAll(".whiskers")
                    .data(boxPlotData)
                    .enter()
                    .append("line")
                    .attr("x1", lineConfig.x1)
                    .attr("y1", lineConfig.y1)
                    .attr("x2", lineConfig.x2)
                    .attr("y2", lineConfig.y2)
                    .attr("stroke", "#000")
                    .attr("stroke-width", 1)
                    .attr("fill", "none");
            }

            // draw median line separate in red
            let median =
            {
                x1: function (datum) { return x(datum.key) },
                y1: function (datum) { return y(datum.quartile[1]) },
                x2: function (datum) { return x(datum.key) + barWidth },
                y2: function (datum) { return y(datum.quartile[1]) }
            }
            g.selectAll(".whiskers")
                .data(boxPlotData)
                .enter()
                .append("line")
                .attr("x1", median.x1)
                .attr("y1", median.y1)
                .attr("x2", median.x2)
                .attr("y2", median.y2)
                .attr("stroke", "#FF0000")
                .attr("stroke-width", 1)
                .attr("fill", "rgb(255, 0, 0)")
                .attr("class", " boxAndWhiskerMedianLine");




            function boxQuartiles(d) {
                return [
                    d3.quantile(d, .25),
                    d3.quantile(d, .5),
                    d3.quantile(d, .75)
                ];
            }

        }


        function type(d) {
            d.count = d.count;
            d.day = +d.day;
            return d;
        }
        function dateFromDay(year, day) {
            var date = new Date(year, 0);
            return formatTime(new Date(date.setDate(day)));
        }
        function setSharedData(dta) {
            bap.sharedData = {}
            let years = Object.getOwnPropertyNames(dta)
            const reducer = (accumulator, currentValue) => accumulator + currentValue;

            for (let year of years) {
                let sd = {
                    mean: dta[year].reduce(reducer) / dta[year].length,
                    median: dta[year][parseInt(dta[year].length / 2)],
                    maximum: dta[year][0],
                    minimum: dta[year][parseInt(dta[year].length - 1)]
                }
                bap.sharedData[year] = sd
            }
        }



        function toolTipLabel(d, buk) {
            return "Year: <b>" + d.key + "</b><br>" +
                "Mean: <b>" + dateFromDay(2018, bap.sharedData[d.key].mean, d.key) + "</b><br>" +
                "Median: <b>" + dateFromDay(2018, bap.sharedData[d.key].median, d.key) + "</b><br>" +
                "Minimum: <b>" + dateFromDay(2018, bap.sharedData[d.key].minimum, d.key) + "</b><br>" +
                "Maximum: <b>" + dateFromDay(2018, bap.sharedData[d.key].maximum, d.key) + "</b><br>"
        }

        let bucketSize = parseInt($(selector).find(".ridgeLinePlotRange").val());
        updateChart(chartData, bucketSize)
        $(selector).find(".ridgeLinePlotRange").change(function () {
            bucketSize = parseInt($(selector).find(".ridgeLinePlotRange").val());
            updateChart(chartData, bucketSize)
        });

    }
}

inherit(Analysis, BoxAndWhiskerAnalysisD3);