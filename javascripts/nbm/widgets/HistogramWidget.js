'use strict';


// this plot tags along with the box and whisker 
// it can be made to stand alone 
// HistogramWidget(jsonData,that.bap.id)
function HistogramWidget(chartData, id) {

    let selector = "#" + id + "BAP";
    $(selector).find(`#histogramPlot${id}`).show()

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

        x.domain([domain.xMin +1, domain.xMax +2]);
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
            .text(`Annual Spring Index for the Period ${years[0]} to ${years[years.length-1]}`);


        histogram.transition()

        histogram.select("svg").remove()



        var svg = histogram.append("svg")
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
            .attr("x", function (d) { return x(d.day); })
            .attr("width", width/ (domain.xMax - domain.xMin))
            //.attr("width", 5 * buk)
           // .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
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


        // text label for the x axis
        svg.append("text")             
            .attr("transform",
                    "translate(" + (width/2) + " ," + 
                                (height + 35) + ")")
            .attr("fill", "rgb(204, 204, 204)")
            .attr("font-size", "14px")
            .style("text-anchor", "middle")
            .text("Day of Year");


        // text label for the y axis
        svg.append("g")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .attr("fill", "rgb(204, 204, 204)")
            .attr("font-size", "14px")
            .style("text-anchor", "middle")
            .text("Year");      



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
                totalCount ++;
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
            return `${count}  Day: <label> ${dateFromDay(2018,d.day)} </label>`
        }
        else {
            return `${count}  Days: <label> ${dateFromDay(2018,d.day * buk - buk)} </label> to <label> ${dateFromDay(2018,d.day * buk - 1)} </label>`
        }
    }

    let bucketSize = parseInt($(selector).find("#ridgeLinePlotRange").val());
    updateChart(chartData, bucketSize)
    $(selector).find("#ridgeLinePlotRange").change(function () {
        bucketSize = parseInt($(selector).find("#ridgeLinePlotRange").val());
        updateChart(chartData, bucketSize)
    });


}

