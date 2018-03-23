'use strict';

function HistogramWidget(chartData) {
    $("#histogramPlot").show()
    d3.select("#histogramPlot").select("svg").remove()


    let margin = { top: 75, right: 20, bottom: 25, left: 35 },
        width = $("#histogramPlot").width() - margin.left - margin.right,
        height = 550 - margin.top - margin.bottom;

    let pos = $("#histogramPlot").position()
    
    let x = d3.scaleLinear()
        .rangeRound([0, width]);

    let y = d3.scaleLinear()
        .range([height, 0]);

    let formatTime = d3.timeFormat("%b %d");


    function updateChart(dta, buk) {

        let data = processData(dta, buk)

        let domain = getDomain(data)

        x.domain([domain.xMin - 1, domain.xMax + 1]);
        y.domain([0, domain.yMax]);

        let xAxis = d3.axisBottom(x)
            .ticks(((domain.xMax - domain.xMin) * buk) / 30.5)
            .tickFormat(x => { return dateFromDay(2018, x * buk) })

        let yAxis = d3.axisLeft(y)



        d3.select("#histogramPlot").transition()

        d3.select("#histogramPlot").select("svg").remove()



        var svg = d3.select("#histogramPlot").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class","y axis")
            .call(yAxis)



        svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function (d) { return x(d.day); })
            .attr("width", 2 * buk)
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
                    .html(toolTipLabel(d,buk));

                //Show the tooltip
                d3.select('#tooltip').classed('hidden', false);
            })
            .on('mouseout', function () {
                //Remove the tooltip
                d3.select('#tooltip').classed('hidden', true);
            });


        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", 0 - (margin.top * .33))
            .attr("fill", "rgb(204, 204, 204)")
            .attr("text-anchor", "middle")  
            .style("font-size", "16px") 
            .text("Histogram of Spring Leaf Index");


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
        for (let currentYear in rawData) {
            for (let i = 0; i < rawData[currentYear].length; i++) {
                days_of_year[rawData[currentYear][i]] += 1
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
            transformedData.push(sum / factor)
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
    function toolTipLabel(d,buk) {
        let count = `Count: <label>${parseInt(d.count)} </label> <br /> `
        if (buk == 1) {
            return `${count}  Day: <label> ${d.day} </label>`
        }
        else {
            return `${count}  Day Range: <label> ${d.day * buk - buk} - ${d.day * buk - 1} </label>`
        }
    }

    let bucketSize = parseInt($("#ridgeLinePlotRange").val());
    updateChart(chartData, bucketSize)
    $("#ridgeLinePlotRange").change(function () {
        bucketSize = parseInt($("#ridgeLinePlotRange").val());
        updateChart(chartData, bucketSize)
    });


}

