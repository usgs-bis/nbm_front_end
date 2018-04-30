'use strict';

// this plot tags along with the box and whisker 

function SmoothPlotWidget(config, bap) {
    let id = bap.id
    let selector = "#" + id + "BAP";
    let dataURI = ""

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#smoothPlotTemplate', { id: id });
    }

    this.initializeWidget = function () { }
    
    this.getPdfLayout = function() {
        return {
            content: [
                {text: $(selector).find("#ridgeLinePlotTitle").text(),style: ['titleChart']},
                {text: $(selector).find("#ridgeLinePlotSubTitle").text(),style: ['subTitleChart']},
                {image: dataURI},
            ],
            charts: []
        }
    }

    let ts = widgetHelper.addTimeSlider()

    this.buildChart = function (chartData, id) {

        let that = this
        


        $(selector).find("#ridgeLinePlot" + id).show()

        d3.select(`#ridgeLinePlot${id}`).selectAll("svg").remove()

        let bucketSize = 3

        let margin = { top: 2, right: 20, bottom: 25, left: 55 },
            width = $(`#ridgeLinePlot${id}`).width() - margin.left - margin.right,
            height = 80 - margin.top - margin.bottom;

        let x = d3.scaleLinear().range([0, width]);
        let y = d3.scaleLinear().rangeRound([height, 0]);

        let formatTime = d3.timeFormat("%b %d");
        let pos = $(`#ridgeLinePlot${id}`).position()

        // defining a custom selectors to ge the last element
        // in a slect all.
        d3.selection.prototype.last = function () {
            var last = this["_groups"][0].length - 1;
            return d3.select(this["_groups"][0][last]);
        };

        d3.selection.prototype.middle = function () {
            var mid = parseInt(this["_groups"][0].length/2);

            return d3.select(this["_groups"][0][mid]);
        };


        function updateChart(dta, buk) {

            let data = processData(dta, buk)

            let dataNest = d3.nest()
                .key(function (d) { return d.year; })
                .entries(data);

            dataNest.reverse()

            let minMax = getMinMax(dataNest)

            x.domain([minMax.dayMin - 1, minMax.dayMax + 1]);

            d3.select(`#ridgeLinePlot${id}`).transition()

            d3.select(`#ridgeLinePlot${id}`).selectAll("svg").remove()

            let ridgelineplot = d3.select(`#ridgeLinePlot${id}`)


            // Remove old titles on change
            ridgelineplot.selectAll("text").remove()

            // Title
            let location = actionHandlerHelper.sc.headerBap.config.title
            ridgelineplot.select("#ridgeLinePlotTitle").append("text")
                .text(`Spring Index ${location ? location : ""}`);

            // Subtitle    
            ridgelineplot.select("#ridgeLinePlotSubTitle").append("text")
                .text(`Annual Spring Index by Year for the Period ${dataNest[dataNest.length - 1].key} to ${dataNest[0].key}`);

            $(selector).find("#ridgeLinePlotChart").height( 80 + (35 * dataNest.length))

            let svg = ridgelineplot.select("#ridgeLinePlotChart").selectAll("svg")
                .data(dataNest)
                .enter()
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .each(function (year) {
                    year.y = d3.scaleLinear()
                        .domain([0, d3.max(year.values, function (d) { return d.value; })])
                        .range([height, 0])
                })


            // clip rectangle
            svg.append("defs")
                .append("clipPath")
                .attr("id", "cut-off-path")
                .append("rect")
                .attr("width", width)
                .attr("height", height);


            // set the gradient
            svg.append("linearGradient")
            .attr("id", `area-gradient${id}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", x(0)).attr("y1", 0)
            .attr("x2", x(365 / buk)).attr("y2", 0)
            .selectAll("stop")
            .data([
                { offset: "0.000000000%", color: "#cc4c03" }, // Jan 1
                { offset: "4.166666700%", color: "#ec6f14" },
                { offset: "8.333333400%", color: "#f8982b" }, // Feb 1
                { offset: "12.50000010%", color: "#fac450" },
                { offset: "16.66666680%", color: "#fce490" }, // Mar 1
                { offset: "20.83333350%", color: "#fdf7bc" },
                { offset: "25.00000020%", color: "#edf8b2" }, // Apr 1
                { offset: "29.16666690%", color: "#d9f0a3" },
                { offset: "33.33333360%", color: "#addd8e" }, // May 1
                { offset: "37.50000030%", color: "#78c678" },
                { offset: "41.66666700%", color: "#41ab5d" }, // Jun 1
                { offset: "45.83333370%", color: "#7accc4" },
                { offset: "50.00000040%", color: "#41b6c5" }, // Jly 1
                { offset: "54.16666710%", color: "#3090c0" },
                { offset: "58.33333380%", color: "#225ea8" }, // Aug 1
                { offset: "62.50000050%", color: "#253494" },
                { offset: "66.66666720%", color: "#091e58" }  // Sep 1
            ])
            .enter().append("stop")
            .attr("offset", function (d) { return d.offset; })
            .attr("stop-color", function (d) { return d.color; });


            // area fill
            svg.append("path")
                //.attr("fill", "rgb(56, 155, 198)")
                .attr("fill",`url(#area-gradient${id})`)
                .attr("stroke", "rgb(0, 0, 0)")
                .attr("class", "area")
                .attr("clip-path", "url(#cut-off-path)")
                .attr("d", function (year) {
                    return d3.area()
                        .curve(d3.curveBasis)
                        .x(function (d) { return x(d.DOY); })
                        .y1(function (d) { return year.y(d.value); })
                        .y0(height)
                        (year.values)
                })
                .on('mouseover', function (d) {
                    var xPos, yPos;
                    //Get this bar's x/y values, the augment for the tooltip
                    xPos = parseFloat(d3.select(this).attr("x")) + ((width + margin.left + margin.right) * 0.5);
                    yPos = pos.top + (hoverYPostionFactor(d, dataNest) * 32) + 50;

                    d3.select('#tooltip')
                        .style('left', xPos + 'px')
                        .style('top', yPos + 'px')
                        .select('#value')
                        .html(d.key);

                    //Show the tooltip
                    d3.select('#tooltip').classed('hidden', false);
                })
                .on('mouseout', function () {
                    //Remove the tooltip
                    d3.select('#tooltip').classed('hidden', true);
                });;


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
                .ticks(((minMax.dayMax - minMax.dayMin) * buk) / 30.5)
                .tickFormat(x => { return dateFromDay(2018, x * buk) })

            let last = svg.last()
             
            last.append("g")
                .attr("transform", "translate(0," + (height) + ")")
                .attr("class", "axis-label")
                .attr("font-size", "11px")
                .attr("fill", "rgb(0, 0, 0)")
                .call(xAxis)

            
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

             let lables = ridgelineplot.select("#ridgeLinePlotChart").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .append("text")
                .attr("y",  60)
                .attr("x", 210)
                .attr("fill", "rgb(0, 0, 0)")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .text("Day of Year");

            getDataURI()
        }
      
        async function getDataURI(){
            let elm = $(selector).find(`#ridgeLinePlot${id}`).find("#ridgeLinePlotChart")
            html2canvas(elm.get(0),{width: elm.width() , height: elm.height()}).then( function (canvas) {
                dataURI = canvas.toDataURL() 
                });
        }


        function type(d) {
            d.value = +d.value;
            d.DOY = d.DOY;
            return d;
        }

        function emptyYear() {
            let year = new Array(366)
            for (let i = 0; i < year.length; i++) {
                year[i] = 0
            }
            return year
        };


        function processData(rawData, factor) {
            let processedData = []
            for (let currentYear in rawData) {
                let days_of_year = emptyYear()
                for (let i = 0; i < rawData[currentYear].length; i++) {
                    days_of_year[rawData[currentYear][i]] += 1
                }
                let bucket_days_of_year = transformData(days_of_year, factor)
                for (let i = 0; i < bucket_days_of_year.length; i++) {
                    let v = bucket_days_of_year[i]
                    let d = i + 1;
                    processedData.push({ year: currentYear, DOY: d, value: v })
                }
            }
            return processedData
        };

        function transformData(rawData, factor) {
            let transformedData = []
            for (let i = 0; i < rawData.length - factor; i += factor) {
                let sum = 0
                for (let j = 0; j < factor; j++) {
                    sum += rawData[i + j]
                }
                transformedData.push(sum / factor)
            }
            return transformedData
        };

        function getMinMax(rawData) {
            let min = 365;
            let max = 0;
            for (let i = 0; i < rawData.length; i++) {
                for (let j = 0; j < rawData[i].values.length; j++) {
                    let v = rawData[i].values[j].value
                    if (v > 0 && j < min) {
                        min = j
                    }
                    else if (v > 0 && j > max) {
                        max = j
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

        updateChart(chartData, bucketSize)
        
        $(selector).find("#ridgeLinePlotRange").change(function () {
            bucketSize = parseInt($(selector).find("#ridgeLinePlotRange").val());
            $(selector).find("#ridgeLinePlotRangeValue").html(bucketSize);
            updateChart(chartData, bucketSize)
        });
    }

}