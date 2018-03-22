'use strict';

function smoothLinePlotWidget(chartData, bucketSize = 3) {
    $("#smoothplot").show()
    d3.select("#ridgeLinePlot").selectAll("svg").remove()
    $("#ridgeLinePlotRangeValue").html(3);
    $("#ridgeLinePlotRange").val(3);
  
    let margin = { top: 2, right: 20, bottom: 25, left: 20 },
        width = $("#ridgeLinePlot").width() - margin.left - margin.right,
        height = 80 - margin.top - margin.bottom;

    let x = d3.scaleLinear().range([0, width]);
    let y = d3.scaleLinear().rangeRound([height, 0]);
    
    let formatTime = d3.timeFormat("%b %d");

    
    function updateChart(dta, buk) {

        let data = processData(dta, buk)


        let dataNest = d3.nest()
            .key(function (d) { return d.year; })
            .entries(data);


        let minMax = getMinMax(dataNest)

        x.domain([minMax.dayMin -1, minMax.dayMax +1]);

        d3.select("#ridgeLinePlot").transition()

        d3.select("#ridgeLinePlot").selectAll("svg").remove()

        let svg = d3.select("#ridgeLinePlot").selectAll("svg")
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

        // area fill
        svg.append("path")
            .attr("class", "area")
            .attr("d", function (year) {
                return d3.area()
                    .curve(d3.curveBasis)
                    .x(function (d) { return x(d.DOY); })
                    .y1(function (d) { return year.y(d.value); })
                    .y0(height)
                    (year.values)
            });

        // year label
        svg.append("g")
            .append("text")
            .attr("fill", "rgb(204, 204, 204)")
            .attr("x", 0)
            .attr("y", height - 20)
            .attr("dy", "0.71em")
            .attr("text-anchor", "start")
            .text(function (year) { return year.key; });

        // X-axis 
        let xAxis = d3.axisBottom(x)
            .ticks(((minMax.dayMax - minMax.dayMin) * buk )/30.5)
            .tickFormat(x => {return dateFromDay(2018,x*buk)})
            
        svg.append("g")
            .attr("transform", "translate(0," + (height) + ")")
            .attr("class", "axis-label")
            .call(xAxis)

    }


    function type(d) {
        d.value = +d.value;
        d.DOY = d.DOY;
        return d;
    }

    function emptyYear() {
        let year = new Array(365)
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
                let d = i+1;
                processedData.push({ year: currentYear, DOY: d, value: v})
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

    function dateFromDay(year, day){
        var date = new Date(year, 0);
        return formatTime(new Date(date.setDate(day)));
      }

    updateChart(chartData, bucketSize)

    $("#ridgeLinePlotRange").change(function () {
        bucketSize = parseInt($("#ridgeLinePlotRange").val());
        $("#ridgeLinePlotRangeValue").html(bucketSize);
        updateChart(chartData, bucketSize)
    });

}

