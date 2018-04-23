'use strict';


// this plot tags along with the box and whisker 
function HistogramWidget(config, bap) {
    let id = bap.id
    let selector = "#" + id + "BAP";
    let dataURI = ""
    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#histogramTemplate', { id: id });
    }
    this.initializeWidget = function () {}

    this.getPdfLayout = function() {
   
        return {
            content: [
           
                {text: $(selector).find("#histogramTitle").text(), style: ['titleChart']},
                {text: $(selector).find("#histogramSubTitle").text(), style: ['subTitleChart']},
                {image: dataURI}
        
            ],
            charts: []
        }  
    };

    this.buildChart = function (chartData, id) {

        

        $(selector).find(`#histogramPlot${id}`).show()
        $(selector).find("#ridgeLinePlotRangeValue").html(3);
        $(selector).find("#ridgeLinePlotRange").val(3);

        d3.select(`#histogramPlot${id}`).select("svg").remove()


        let margin = { top: 20, right: 20, bottom: 25, left: 60 },
            width = $(`#histogramPlot${id}`).width() - margin.left - margin.right,
            height = 550 - margin.top - margin.bottom;

        let pos = $(`#histogramPlot${id}`).position()

        let x = d3.scaleLinear()
            .rangeRound([0, width]);

        let y = d3.scaleLinear()
            .range([height, 0]);

        let formatTime = d3.timeFormat("%b %d");

        let totalCount = 0;


        function updateChart(dta, buk) {

            let years = Object.getOwnPropertyNames(dta)

            let data = processData(dta, buk)

            let domain = getDomain(data)

            x.domain([domain.xMin + 1, domain.xMax + 2]);
            y.domain([0, domain.yMax]);

            let xAxis = d3.axisBottom(x)
                .ticks(((domain.xMax - domain.xMin) * buk) / 30.5)
                .tickFormat(x => { return dateFromDay(2018, x * buk) })

            let yAxis = d3.axisLeft(y)

            let histogram = d3.select(`#histogramPlot${id}`)

            // Remove old titles on change
            histogram.selectAll("text").remove()

            // Title
            let location = actionHandlerHelper.sc.headerBap.config.title
            histogram.select("#histogramTitle").append("text")
                .text(`Spring Index ${location ? location : ""}`);

            // Subtitle    
            histogram.select("#histogramSubTitle").append("text")
                .text(`Annual Spring Index for the Period ${years[0]} to ${years[years.length - 1]}`);

            histogram.transition()

            histogram.select("svg").remove()

            var svg = histogram.select("#histogramChart").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .attr("font-size", "11px")
                .call(xAxis);

            svg.append("g")
                .attr("class", "y axis")
                .attr("font-size", "11px")
                .call(yAxis)

            svg.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("fill", "rgb(56, 155, 198)")
                .attr("stroke", "rgb(0, 0, 0)")
                .attr("x", function (d) { return x(d.day); })
                .attr("width", width / (domain.xMax - domain.xMin))
                .attr("y", function (d) { return y(d.count); })
                .attr("height", function (d) { return height - y(d.count); })
                .on('mouseover', function (d) {
                    var xPos, yPos;
                    //Get this bar's x/y values, then augment for the tooltip
                    xPos = parseFloat(d3.select(this).attr("x")) + 2 * buk;
                    yPos = (height / 2) + pos.top;

                    d3.select('#tooltip')
                        .style('left', xPos + 'px')
                        .style('top', yPos + 'px')
                        .select('#value')
                        .html(toolTipLabel(d, buk));

                    //Show the tooltip
                    d3.select('#tooltip').classed('hidden', false);
                })
                .on('mouseout', function () {
                    //Remove the tooltip
                    d3.select('#tooltip').classed('hidden', true);
                });


            // // set the gradient
            // svg.append("linearGradient")				
            //     .attr("id", "area-gradient")			
            //     .attr("gradientUnits", "userSpaceOnUse")	
            //     .attr("x1", x(0)).attr("y1", 0)			
            //     .attr("x2", x(365/buk)).attr("y2", 0)				
            //     .selectAll("stop")						
            //     .data([
            //         {offset: "0.000000000%", color: "#cc4c03"}, // Jan 1
            //         {offset: "4.166666700%", color: "#ec6f14"},
            //         {offset: "8.333333400%", color: "#f8982b"}, // Feb 1
            //         {offset: "12.50000010%", color: "#fac450"},
            //         {offset: "16.66666680%", color: "#fce490"}, // Mar 1
            //         {offset: "20.83333350%", color: "#fdf7bc"},
            //         {offset: "25.00000020%", color: "#edf8b2"}, // Apr 1
            //         {offset: "29.16666690%", color: "#d9f0a3"},
            //         {offset: "33.33333360%", color: "#addd8e"}, // May 1
            //         {offset: "37.50000030%", color: "#78c678"},
            //         {offset: "41.66666700%", color: "#41ab5d"}, // Jun 1
            //         {offset: "45.83333370%", color: "#7accc4"},
            //         {offset: "50.00000040%", color: "#41b6c5"}, // Jly 1
            //         {offset: "54.16666710%", color: "#3090c0"},
            //         {offset: "58.33333380%", color: "#225ea8"}, // Aug 1
            //         {offset: "62.50000050%", color: "#253494"},
            //         {offset: "66.66666720%", color: "#091e58"}  // Sep 1

            //     ])					
            //     .enter().append("stop")			
            //     .attr("offset", function(d) { return d.offset; })	
            //     .attr("stop-color", function(d) { return d.color; });


            // text label for the x axis
            svg.append("text")
                .attr("transform", "translate(" + (width / 2) + " ," + (height + 35) + ")")
                .attr("fill", "rgb(0, 0, 0)")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .text("Day of Year");


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
                .text("Count");

            getDataURI()

        }

        async function getDataURI(){
            let elm = $(selector).find(`#histogramPlot${id}`).find("#histogramChart")
            html2canvas(elm.get(0),{width: elm.width() , height: elm.height()}).then( function (canvas) {
                dataURI = canvas.toDataURL() 
                });
        }


        function type(d) {
            d.count = d.count;
            d.day = +d.day;
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
            let days_of_year = emptyYear()
            let processedData = []
            totalCount = 0;
            for (let currentYear in rawData) {
                for (let i = 0; i < rawData[currentYear].length; i++) {
                    days_of_year[rawData[currentYear][i]] += 1
                    totalCount++;
                }
            }
            let bucket_days_of_year = transformData(days_of_year, factor)
            for (let i = 0; i < bucket_days_of_year.length; i++) {
                let c = bucket_days_of_year[i]
                processedData.push({ day: i + 1, count: c })
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
                transformedData.push(sum)
            }
            return transformedData
        };

        function getDomain(rawData) {
            let xMin = 365;
            let xMax = 0;
            let yMax = 0;
            for (let i = 0; i < rawData.length; i++) {
                let c = rawData[i].count
                if (c > yMax) {
                    yMax = c;
                }
                if (c > 0 && i < xMin) {
                    xMin = i;
                }
                else if (c > 0 && i > xMax) {
                    xMax = i;
                }

            }
            return { xMin: xMin, xMax: xMax, yMax: yMax };
        };

        function dateFromDay(year, day) {
            var date = new Date(year, 0);
            return formatTime(new Date(date.setDate(day)));
        }
        function toolTipLabel(d, buk) {
            let count = `Count: <label>${parseInt(d.count)} </label> of <label>${parseInt(totalCount)} </label>  <br /> `
            if (buk == 1) {
                return `${count}  Day: <label> ${dateFromDay(2018, d.day)} </label>`
            }
            else {
                return `${count}  Days: <label> ${dateFromDay(2018, d.day * buk - buk)} </label> to <label> ${dateFromDay(2018, d.day * buk - 1)} </label>`
            }
        }

        let bucketSize = parseInt($(selector).find("#ridgeLinePlotRange").val());
        updateChart(chartData, bucketSize)
        $(selector).find("#ridgeLinePlotRange").change(function () {
            bucketSize = parseInt($(selector).find("#ridgeLinePlotRange").val());
            updateChart(chartData, bucketSize)
        });

    }
}