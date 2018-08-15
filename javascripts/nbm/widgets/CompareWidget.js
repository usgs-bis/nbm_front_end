'use strict';


function CompareWidget(config, bap) {
    let that = this
    let id = bap.id;
    let selector = "#" + id + "BAP";
    let timeSlider = null;
    let button = null;
    let layer = null;
    let alreadySentBuffer = false


    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#comparePlotTemplate', { id: id });
    }

    this.initializeWidget = function (feature) {

        if (that.bap.GetBapLayers().length) {
            layer = that.bap.GetBapLayers()[0]
        }
        else {
            return;
        }

        timeSlider = widgetHelper.addTimeSlider();
        let time = layer.getTimeInfo();

        button = $(selector).find('#getData');
        button.on('click', function () {
            that.submitData("Larger or more complex polygons will take longer to process", feature);
        });

        let checkRange = function (min, max) {

            if ((max - min) <= 0) {
                $(selector).find('#bapRangeSlider').html('Please select a range to analyze.');
                button.hide()
            }
          
            else if (time.startDate > min || time.endDate < max) {
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

        button.hide();
        $(selector).find('#comparePlotError').html('');
        toggleSpinner();
        timeSlider.slider('disable');

        $(selector).find(".ridgeLinePlot").hide();

        let promises = []
        that.bap.GetBapLayers().forEach(function (layer) {

            promises.push(widgetHelper.getRasterData(inputFeature, layer, [values[0], values[1]], that.bap.config.bapProperties[layer.featureName])
                .then(function (data) {
                    return data
                })
            )
        })

        Promise.all(promises).then(function (data) {
            that.bap.rawJson = data;
            let missingYears = []

            if (data.length != 2 || !data[0] || !data[1]) {
                setError(' An error has occured. If the problem continues, please contact site admin.');
            }
            else {
                for (let i = values[0]; i <= values[1]; i++) {
                    if (!data[0][i] || !data[1][i]) {
                        missingYears.push(i)
                    }
                }
                if (!data[0][values[0]].length || !data[1][values[0]].length) {
                    if (!alreadySentBuffer) {
                        alreadySentBuffer = true;
                        widgetHelper.getBufferedFeature(inputFeature)
                            .then(function (bufferedFeature) {
                                if (!bufferedFeature || !bufferedFeature.geometry) {
                                    setError(' An error has occured. If the problem continues, please contact site admin.');
                                }
                                else {
                                    that.bap.feature = ActionHandler.prototype.createPseudoFeature(bufferedFeature.geometry);
                                    that.bap.simplified = true;
                                    that.bap.showSimplifiedDiv();
                                    that.submitData("No data received, resending polygon with buffer", that.bap.feature);
                                }
                            })
                    }
                    else {
                        setError(' Your polygon falls outside the geographic extent of the data you\'re trying to analyze. ');
                    }
                }
                else {
                    if (missingYears.length) {
                        setError(' There was an error analyzing data for the following years: ' + missingYears + '. ' +
                            'They will not be displayed in the chart. If the problem continues, please contact site admin.');
                    }
                    else if (alreadySentBuffer) {
                        setError(' Your polygon was buffered so it overlaps with the center of the nearest raster cell. ' +
                            'You can click the \'square\' icon next to the polygon title to view the buffered polygon.');
                    }
                    that.buildChart(data, id);
                }
            }

            $(selector).find("#" + that.bap.id + "JsonDiv").show();
            timeSlider.slider('enable');
            toggleSpinner(true);
            bioScape.bapLoading(that.bap.id, true)
        });
    };


    function toggleSpinner(hide) {
        if (hide) {
            $(selector).find('#bapSpinner').hide()
        }
        else {
            $(selector).find('#bapSpinner').show()
        }
    }

    function setError(message) {
        $(selector).find('#comparePlotError').html(
            '<div style="font-size: 16px; line-height: 20px;" class="myNpnInfo">' +
            '<span class="fa fa-circle fa-first" aria-hidden="true" style="margin-right: -14px;color: red; opacity: .8; font-size: 14px;"></span>' +
            '<span class="glyphicon glyphicon-exclamation-sign exclamation" aria-hidden="true"></span>'
            + '<span>' + message + '</span>' +
            '</div>'
        );
    }


    this.getPdfLayout = function () {

        try {

            let svg = $(`#comparePlotChart${id}`)

            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="500" height="${svg.height()}" style="position: fixed;"></canvas>`)

            let c = document.getElementById(`myCanvas${id}`);
            let ctx = c.getContext('2d');
            ctx.drawSvg(svg.find(".svg-container-plot").html(), 0, 0, 500, svg.height());

            $("#canvasHolder").html("")

            return {
                content: [
                    { text: $(selector).find("#histogramTitle").text(), style: ['titleChart'], pageBreak: 'before' },
                    { text: $(selector).find("#histogramSubTitle").text(), style: ['subTitleChart'] },
                    { image: c.toDataURL(), alignment: 'center', width: 500 }
                ],
                charts: []
            }
        }

        catch (error) {
            showErrorDialog("Error printing one or more charts to report.", false);
            return { content: [], charts: [] }
        }
    }


    this.buildChart = function (chartData, id) {


        $(selector).find("#comparePlot" + id).show()

        d3.select(`#comparePlot${id}`).selectAll(".svg-container-smoothPlot").remove()
        $(`#${id}BAP .ridgeLinePlotNumberPickerDiv`).css("margin-top", "0px")


        let bucketSize = 1

        let margin = { top: 2, right: 20, bottom: 25, left: 55 },
            width = $(`#comparePlot${id}`).width() - margin.left - margin.right,
            height = 80 - margin.top - margin.bottom;

        let x = d3.scaleLinear().range([0, width]);
        let y = d3.scaleLinear().rangeRound([height, 0]);

        let formatTime = d3.timeFormat("%b %d");
        let pos = $(`#comparePlot${id}`).position()

        // defining a custom selectors to ge the last element
        // in a slect all.
        d3.selection.prototype.last = function () {
            var last = this["_groups"][0].length - 1;
            return d3.select(this["_groups"][0][last]);
        };

        d3.selection.prototype.middle = function () {
            var mid = parseInt(this["_groups"][0].length / 2);

            return d3.select(this["_groups"][0][mid]);
        };


        function updateChart(dta, buk) {



            let data = processData(dta, buk)

            let dataNest = d3.nest()
                .key(function (d) { return d.year; })
                .entries(data);

            dataNest.reverse()

            let minMax = getMinMax(dataNest)

            x.domain([minMax.dayMin - 5, minMax.dayMax + 5]);


            d3.select(`#comparePlot${id}`).transition()

            d3.select(`#comparePlot${id}`).selectAll("svg").remove()

            let comparePlot = d3.select(`#comparePlot${id}`)


            // Remove old titles on change
            comparePlot.selectAll("text").remove()

            // Title
            let location = actionHandlerHelper.sc.headerBap.config.title
            comparePlot.select("#comparePlotTitle").append("text")
                .text(`${config.title} ${location ? location : ""}`);

            // Subtitle    
            comparePlot.select("#comparePlotSubTitle").append("text")
                .text(`Annual ${config.title} by Year for the Period ${dataNest[dataNest.length - 1].key} to ${dataNest[0].key}`);


            let svgContainer = comparePlot.select(`#comparePlotChart${id}`)
                .append("div")
                .classed("svg-container-plot", true)
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (80 + parseInt(dataNest.length * 35)))
                .classed("svg-content-responsive", true)
                .attr("version", "1.1")
                .attr("baseProfile", "full")
                .attr("xmlns", "http://www.w3.org/2000/svg")

            let svg = svgContainer.selectAll("smooth")
                .data(dataNest)
                .enter()
                .append("g")
                .attr("transform", function (d, i) { return "translate(" + margin.left + "," + parseInt(i * 30) + ")" })
                // .attr("transform", "translate(" + margin.left + ",2)")
                .each(function (year) {
                    year.y = d3.scaleLinear()
                        .domain([0, 50])
                        .range([height, 0])
                })



            // clip rectangle
            svg.append("defs")
                .append("clipPath")
                .attr("id", "cut-off-path")
                .append("rect")
                .attr("width", width)
                .attr("height", height);


            // area fill
            svg.append("path")
                .attr("stroke", "rgb(56, 155, 198)")
                .attr("stroke-width", "3")
                .attr("clip-path", "url(#cut-off-path)")
                .attr("d", function (year) {
                    return d3.line()
                        .x(function (d) { return x(d.DOY); })
                        .y(function (d) { return year.y(d.value); })
                        (year.values)
                })


            let tooltip1 = comparePlot.select(`#comparePlotChart${id}`)
                .append("div")
                .attr("class", "chartTooltip comparePlotToolTipRed")
                .style("opacity", 0)
                .style("border", "3px solid red");


            let tooltip2 = comparePlot.select(`#comparePlotChart${id}`)
                .append("div")
                .attr("class", "chartTooltip comparePlotToolTipGreen")
                .style("opacity", 0)
                .style("border", "3px solid green");



            // Add the scatterplot
            svg.append("circle")
                .attr("r", 8)
                .attr("cx", function (d) {
                    return x(d.values[0].DOY);
                })
                .attr("cy", 37)
                .attr("fill", "red")
                .on("mouseover", function (d) {
                    d3.select(this).attr("r", 10)
                    tooltip1.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip1.html(getToolTipHTML(d, "BLOOM"))
                        .style("left", (d3.event.layerX < 300 ? d3.event.layerX +15: d3.event.layerX - 130) + "px")
                        .style("top", (d3.event.layerY) + "px");
                })
                .on("mouseout", function (d) {
                    d3.select(this).attr("r", 8)
                    tooltip1.transition()
                        .duration(500)
                        .style("opacity", 0);
                });


            svg.append("circle")
                .attr("r", 8)
                .attr("cx", function (d) {
                    return x(d.values[1].DOY);
                })
                .attr("cy", 37)
                .attr("fill", "green")
                .on("mouseover", function (d) {
                    d3.select(this).attr("r", 10)
                    tooltip2.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip2.html(getToolTipHTML(d, "LEAF"))
                        .style("left", (d3.event.layerX < 300 ? d3.event.layerX +15: d3.event.layerX - 130) + "px")
                        .style("top", (d3.event.layerY) + "px");
                })
                .on("mouseout", function (d) {
                    d3.select(this).attr("r", 8)
                    tooltip2.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            svg.append("text")
                .attr("x", function (d) {
                    return x(((d.values[1].DOY + d.values[0].DOY) / 2) - 4);
                })
                .attr("y", 27)
                .attr("dy", ".35em")
                .attr("font-size", "12px")
                .text(function (d) { return parseInt((d.values[1].DOY - d.values[0].DOY)) + " Days" });


            // year label
            svg.append("g")
                .append("text")
                .attr("fill", "rgb(0, 0, 0)")
                .attr("x", -30)
                .attr("y", height - 20)
                .attr("dy", "0.71em")
                .attr("text-anchor", "start")
                .attr("font-size", "11px")
                .text(function (year) { return year.key; });

            // y-axis 
            let yAxis = d3.axisLeft(y)
                .tickSize(0)
                .tickFormat("");

            svg.append("g")
                .attr("transform", "translate(0,0)")
                .call(yAxis)

            // X-axis 
            let xAxis = d3.axisBottom(x)
                .ticks(((minMax.dayMax - minMax.dayMin)) / 10)
                .tickFormat(x => { return dateFromDay(2018, x) })

            let last = svg.last()

            last.append("g")
                .attr("transform", "translate(0," + (height) + ")")
                .attr("class", "axis-label")
                .attr("font-size", "11px")
                .attr("fill", "rgb(0, 0, 0)")
                .call(xAxis)

            last.append("g")
                .attr("transform", "translate(0," + (33) + ")")
                .append("text")
                .attr("y", 60)
                .attr("x", 210)
                .attr("fill", "rgb(0, 0, 0)")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .text("Day of Year");



            let mid = svg.middle()

            mid.append("g")
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -55)
                .attr("x", -25)
                .attr("dy", "1em")
                .attr("fill", "rgb(0, 0, 0)")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .text("Year");

        }


        function type(d) {
            d.value = +d.value;
            d.DOY = d.DOY;
            return d;
        }


        function processData(rawData) {
            let processedData = []
            for (let currentYear in rawData[0]) {
                let adv = rawData[0][currentYear].reduce(getSum) / rawData[0][currentYear].length
                processedData.push({ year: currentYear, DOY: adv, value: 15 })
            }
            for (let currentYear in rawData[1]) {
                let adv = rawData[1][currentYear].reduce(getSum) / rawData[1][currentYear].length
                processedData.push({ year: currentYear, DOY: adv, value: 15 })
            }
            return processedData

            function getSum(total, num) {
                return total + num;
            }
        };


        function getMinMax(rawData) {
            let min = 365;
            let max = 0;
            for (let i = 0; i < rawData.length; i++) {
                for (let j = 0; j < rawData[i].values.length; j++) {
                    let v = rawData[i].values[j].DOY
                    if (v < min) {
                        min = v
                    }
                    else if (v > max) {
                        max = v
                    }
                }
            }

            return { dayMin: min, dayMax: max }
        }

        function dateFromDay(year, day) {
            var date = new Date(year, 0);
            return formatTime(new Date(date.setDate(day)));
        }

        function hoverYPostionFactor(d, data) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].key == d.key) {
                    return i
                }
            }
            return 1
        }

        function getToolTipHTML(d, type) {

            let detail = type == "BLOOM" ? `Bloom Index: <label>${dateFromDay(2018, d.values[0].DOY)} </label> <br>` : `Leaf Index: <label>${dateFromDay(2018, d.values[1].DOY)}</label>`

            let html =
                `<p>
                Year: <label>${d.key}</label> <br>
                ${detail}
            </p>`
            return html
        }

        updateChart(chartData, bucketSize)
    }

}