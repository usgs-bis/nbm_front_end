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

                if ((max - min) < 0) {
                    return false;
                }

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
            else{
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
                                if (!bufferedFeature.geometry) {
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

            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="500" height="1000" style="position: fixed;"></canvas>`)
            d3.select(`#comparePlotChart${id}`).selectAll("svg").attr("height", 80)
            d3.select(`#comparePlotChart${id}`).selectAll("svg").attr("width", 500)
            let c = document.getElementById(`myCanvas${id}`);
            let ctx = c.getContext('2d');


            let maxIndex = 0
            $(`#comparePlotChart${id} .svg-container-smoothPlot`).each(function (index) {
                ctx.drawSvg($(this).html(), 0, 80 * index, 500, 80);
                maxIndex = index
            })

            $("#canvasHolder").append(`<canvas id="myCanvasCrop${id}" width="500" height="${80 + (35 * maxIndex)}" style="position: fixed;"></canvas>`)
            let cCrop = document.getElementById(`myCanvasCrop${id}`);
            let ctxCrop = cCrop.getContext('2d');
            ctxCrop.drawImage(c, 0, 0);


            // clean up
            d3.select(`#comparePlotChart${id}`).selectAll("svg").attr("height", null)
            d3.select(`#comparePlotChart${id}`).selectAll("svg").attr("width", null)
            $("#canvasHolder").html("") // could have problem here? erase other baps drawing

            return {
                content: [
                    { text: $(selector).find("#histogramTitle").text(), style: ['titleChart'], pageBreak: 'before' },
                    { text: $(selector).find("#histogramSubTitle").text(), style: ['subTitleChart'] },
                    { image: cCrop.toDataURL(), alignment: 'center', width: 500 }
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

            d3.select(`#comparePlot${id}`).selectAll(".svg-container-smoothPlot").remove()

            let ridgelineplot = d3.select(`#comparePlot${id}`)


            // Remove old titles on change
            ridgelineplot.selectAll("text").remove()

            // Title
            let location = actionHandlerHelper.sc.headerBap.config.title
            ridgelineplot.select("#comparePlotTitle").append("text")
                .text(`${config.title} ${location ? location : ""}`);

            // Subtitle    
            ridgelineplot.select("#comparePlotSubTitle").append("text")
                .text(`Annual ${config.title} by Year for the Period ${dataNest[dataNest.length - 1].key} to ${dataNest[0].key}`);

            $(selector).find(`#comparePlotChart${id}`).height(80 + (35 * dataNest.length))

            let svg = ridgelineplot.select(`#comparePlotChart${id}`).selectAll(".svg-container-smoothPlot")
                .data(dataNest)
                .enter()
                .append("div")
                .classed("svg-container-smoothPlot", true)
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", function (d, i) { return "0 " + parseInt(i * 50) + " " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom) })
                .classed("svg-content-responsive", true)
                .attr("version", "1.1")
                .attr("baseProfile", "full")
                .attr("xmlns", "http://www.w3.org/2000/svg")
                .append("g")
                .attr("transform", "translate(" + margin.left + ",2)")
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
                .on('mouseover', function (d) {
                    var xPos, yPos;
                    //Get this bar's x/y values, the augment for the tooltip
                    try {
                        xPos = event.clientX
                        yPos = event.clientY - 50
                    }
                    catch (error) {
                        xPos = parseFloat(d3.select(this).attr("x")) + ((width + margin.left + margin.right) * 0.5);
                        yPos = pos.top + (hoverYPostionFactor(d, dataNest) * 32) + 50;
                    }
                    ridgelineplot.select('.tooltipValues')
                        .style('left', xPos + 'px')
                        .style('top', yPos + 'px')
                        .select('#value')
                        .html(getToolTipHTML(d));

                    //Show the tooltip
                    ridgelineplot.select('.tooltipValues').classed('hidden', false);
                })
                .on('mouseout', function () {
                    //Remove the tooltip
                    ridgelineplot.select('.tooltipValues').classed('hidden', true);
                });

            // Add the scatterplot
            svg.append("circle")
                .attr("r", 8)
                .attr("cx", function (d) {
                    return x(d.values[0].DOY);
                })
                .attr("cy", 37)
                .attr("fill", "red")
                .on('mouseover', function (d) {
                    var xPos, yPos;
                    //Get this bar's x/y values, the augment for the tooltip
                    try {
                        xPos = event.clientX
                        yPos = event.clientY - 50
                    }
                    catch (error) {
                        xPos = parseFloat(d3.select(this).attr("x")) + ((width + margin.left + margin.right) * 0.5);
                        yPos = pos.top + (hoverYPostionFactor(d, dataNest) * 32) + 50;
                    }
                    ridgelineplot.select('.tooltipValues')
                        .style('left', xPos + 'px')
                        .style('top', yPos + 'px')
                        .select('#value')
                        .html(getToolTipHTML(d));

                    //Show the tooltip
                    ridgelineplot.select('.tooltipValues').classed('hidden', false);
                })
                .on('mouseout', function () {
                    //Remove the tooltip
                    ridgelineplot.select('.tooltipValues').classed('hidden', true);
                });


            svg.append("circle")
                .attr("r", 8)
                .attr("cx", function (d) {
                    return x(d.values[1].DOY);
                })
                .attr("cy", 37)
                .attr("fill", "green")
                .on('mouseover', function (d) {
                    var xPos, yPos;
                    //Get this bar's x/y values, the augment for the tooltip
                    try {
                        xPos = event.clientX
                        yPos = event.clientY - 50
                    }
                    catch (error) {
                        xPos = parseFloat(d3.select(this).attr("x")) + ((width + margin.left + margin.right) * 0.5);
                        yPos = pos.top + (hoverYPostionFactor(d, dataNest) * 32) + 50;
                    }
                    ridgelineplot.select('.tooltipValues')
                        .style('left', xPos + 'px')
                        .style('top', yPos + 'px')
                        .select('#value')
                        .html(getToolTipHTML(d));

                    //Show the tooltip
                    ridgelineplot.select('.tooltipValues').classed('hidden', false);
                })
                .on('mouseout', function () {
                    //Remove the tooltip
                    ridgelineplot.select('.tooltipValues').classed('hidden', true);
                });


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

        function getToolTipHTML(d) {
            let html =
                `
            <div>Year: <label>${d.key}</label> </div>
            <div>Bloom Index: <label>${dateFromDay(2018, d.values[0].DOY)} </label></div>
            <div>Leaf Index: <label>${dateFromDay(2018, d.values[1].DOY)}</label> </div>
            `
            return html
        }

        updateChart(chartData, bucketSize)
    }

}