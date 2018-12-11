'use strict';

function NFHPAnalysisD3(config, bap) {
    let that = this;
    let id = bap.id
    let selector = "#" + id + "BAP";
    let dataURI = ""

    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#NFHPAnalysisTemplate', { id: id });
    }
    this.initializeWidget = function () {


        let AOI = bap.gid;
        if (AOI && AOI.includes('OBIS_Areas:')) {
            $(`#${bap.id}BapCase`).hide()
            return
        }

        let featureId = that.bap.actionRef.result.geojson.properties["feature_id"];
        let url = config.elasticEndpoint + featureId;


        $.getJSON(url)
            .done(function (data) {
                if (data.error) {
                    $(`#${id}BapCase`).hide()
                }
                else if (data.hits.hits.length) {
                    buildChart(data.hits.hits[0])
                }
                else {
                    $(`#${id}BapCase`).hide()
                }
            })
            .fail(function () {
                $(`#${id}BapCase`).hide()
            });
    }

    this.getPdfLayout = function () {

        try {
            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            d3.select(`#NFHPPlot${id}`).select("svg").attr("height", 500)
            d3.select(`#NFHPPlot${id}`).select("svg").attr("width", 500)

            let c = document.getElementById(`myCanvas${id}`);
            let ctx = c.getContext('2d');
            ctx.drawSvg($(`#NFHPChart${id} .svg-container-plot`).html(), 0, 0, 800, 800);

            // clean up
            d3.select(`#NFHPPlot${id}`).select("svg").attr("height", null)
            d3.select(`#NFHPPlot${id}`).select("svg").attr("width", null)
            $("#canvasHolder").html("")

            return {
                content: [
                    { text: $(selector).find("#NFHPTitle").text(), style: ['titleChart'], pageBreak: 'before' },
                    { text: $(selector).find("#NFHPSubTitle").text(), style: ['subTitleChart'] },
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



    this.hideChart = function () {
        $(selector).find(`#NFHPPlot${id}`).hide()
    }


    // this.buildChart = function (chartData, id) {
    function buildChart(data) {
        data = data._source.properties

        $(selector).find(`#NFHPPlot${id}`).show()


        let NFHP = d3.select(`#NFHPPlot${id}`)

        // Remove old titles on change
        NFHP.selectAll("text").remove()

        data.scored_km = parseFloat(data.scored_km);
        data.not_scored_km = parseFloat(data.not_scored_km)
        let val1 = numberWithCommas((data.scored_km).toFixed(0))
        let val2 = numberWithCommas((data.scored_km + data.not_scored_km).toFixed(0))
        let title = 'Risk to Fish Habitat Degradation in ' + data.place_name;
        let subTitle = 'Fish habitat condition was scored on ' + val1 + ' of ' + val2 + ' NHDPlusV1 stream kilometers within ' + data.place_name;

        // Title
        NFHP.select("#NFHPTitle").append("text")
            .text(title);

        // Subtitle    
        NFHP.select("#NFHPSubTitle").append("text")
            .text(subTitle);

        NFHP.transition()

        function getPercent(value) {
            value = parseFloat(value)
            return parseFloat(((value / data.scored_km) * 100).toFixed(1))
        }
        let chartData = [
            { "Risk": "Very high", "Percent": getPercent(data.veryhigh_km), "color": "#FF0000" },
            { "Risk": "High", "Percent": getPercent(data.high_km), "color": "#FFAA00" },
            { "Risk": "Moderate", "Percent": getPercent(data.moderate_km), "color": "#A3FF73" },
            { "Risk": "Low", "Percent": getPercent(data.low_km), "color": "#00C5FF" },
            { "Risk": "Very low", "Percent": getPercent(data.verylow_km), "color": "#C500FF" }
        ]
        chartData.reverse()

        let margin = { top: 20, right: 20, bottom: 25, left: 75 },
            width = $(`#NFHPPlot${id}`).width() - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;


        let x = d3.scaleLinear().range([0, width]);
        let y = d3.scaleBand().range([height, 0]);

        let max = chartData.map(d => { return d.Percent }).sort(function (a, b) { return a - b; })[chartData.length - 1]
        x.domain([0, max]);
        y.domain(chartData.map(function(d) { return d.Risk; })).padding(0.1);

        let xAxis = d3.axisBottom(x)
            .ticks(5)
            .tickFormat(function (d) { return `${parseInt(d)}%` })

        let yAxis = d3.axisLeft(y)

        NFHP.select(".svg-container-plot").remove()

        let svg = NFHP.select(`#NFHPChart${id}`)
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
            .attr("transform", "translate(" + -1+ "," + 0 + ")")
            .attr("class", "y axis")
            .attr("font-size", "11px")
            .call(yAxis)

        let div = NFHP.select(`#NFHPChart${id}`)
            .append("div")
            .attr("class", "chartTooltip NFHPToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)");

        svg.selectAll(".bar")
            .data(chartData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("height", y.bandwidth())
            .attr("fill", function (d) { return d.color })
            .attr("y", function (d) { return y(d.Risk); })
            .attr("width", function (d) { return x(d.Percent); })
            .on("mouseover", function (d) {
                // d3.select(this)
                //     .attr("fill", "rgb(45, 125, 159)");
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
            .attr("y", height + margin.bottom + margin.top - 5)
            .attr("x", width / 2)
            .attr("fill", "rgb(0, 0, 0)")
            .attr("font-size", "14px")
            .style("text-anchor", "middle")
            .text("NFHP Scored Stream Kilometers [%]");


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
            .text("Risk To Fish Habitat Degradation");


        function toolTipLabel(d) {

            return `<p>${d.Risk}: ${d.Percent}%</p>`

        }



        // $(selector).find(`#NFHPPlot${id}`).show()
        // $(selector).find(".ridgeLinePlotRangeValue").html(3);
        // $(selector).find(".ridgeLinePlotRange").val(3);

        // d3.select(`#NFHPPlot${id}`).select(".svg-container-plot").remove()


        // let margin = { top: 20, right: 20, bottom: 25, left: 60 },
        //     width = $(`#NFHPPlot${id}`).width() - margin.left - margin.right,
        //     height = 450 - margin.top - margin.bottom;

        // let pos = $(`#NFHPPlot${id}`).position()

        // let x = d3.scaleLinear()
        //     .rangeRound([0, width]);

        // let y = d3.scaleLinear()
        //     .range([height, 0]);

        // let formatTime = d3.timeFormat("%b %d");

        // let totalCount = 0;


        // function updateChart(dta, buk) {

        //     let years = Object.getOwnPropertyNames(dta)

        //     let data = processData(dta, buk)

        //     let domain = getDomain(data)

        //     x.domain([domain.xMin + 1, domain.xMax + 2]);
        //     y.domain([0, domain.yMax]);

        //     let xAxis = d3.axisBottom(x)
        //         .ticks(5)
        //         .tickFormat(x => { return dateFromDay(2018, (x) * buk) })

        //     let yAxis = d3.axisLeft(y)

        //     let NFHP = d3.select(`#NFHPPlot${id}`)

        //     // Remove old titles on change
        //     NFHP.selectAll("text").remove()

        //     // Title
        //     let location = actionHandlerHelper.sc.headerBap.config.title
        //     NFHP.select("#NFHPTitle").append("text")
        //         .text(`${config.title} ${location ? "for " + location : ""}`);

        //     // Subtitle    
        //     NFHP.select("#NFHPSubTitle").append("text")
        //         .text(`All Years for the Period ${years[0]} to ${years[years.length - 1]}`);
        //     startYear = years[0];
        //     endYear = years[years.length-1];

        //     NFHP.transition()

        //     NFHP.select(".svg-container-plot").remove()

        //     var svg = NFHP.select(`#NFHPChart${id}`)
        //         .append("div")
        //         .classed("svg-container-plot", true)
        //         .append("svg")
        //         .attr("preserveAspectRatio", "xMinYMin meet")
        //         .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
        //         .classed("svg-content-responsive", true)
        //         .attr("version", "1.1")
        //         .attr("baseProfile", "full")
        //         .attr("xmlns","http://www.w3.org/2000/svg")
        //         .append("g")
        //         .attr("transform", "translate(" + margin.left + "," + 0 + ")");


        //     svg.append("g")
        //         .attr("class", "x axis")
        //         .attr("transform", "translate(0," + height + ")")
        //         .attr("font-size", "11px")
        //         .call(xAxis);

        //     svg.append("g")
        //         .attr("class", "y axis")
        //         .attr("font-size", "11px")
        //         .call(yAxis)


        //     let div =  NFHP.select(`#NFHPChart${id}`)
        //         .append("div")	
        //         .attr("class", "chartTooltip NFHPToolTip")		
        //         .style("opacity", 0)
        //         .style("border", "3px solid rgb(56, 155, 198)");

        //     svg.selectAll(".bar")
        //         .data(data)
        //         .enter().append("rect")
        //         .attr("class", "bar")
        //         .attr("fill", "rgb(56, 155, 198)")
        //         .attr("stroke", "rgb(0, 0, 0)")
        //         .attr("x", function (d) { return x(d.day); })
        //         .attr("width", width / (1 + (domain.xMax - domain.xMin)))
        //         .attr("y", function (d) { return y(d.count); })
        //         .attr("height", function (d) { return height - y(d.count); })
        //         .on("mouseover", function(d) {
        //             d3.select(this)
        //             .attr("fill", "rgb(45, 125, 159)");		
        //             div.transition()		
        //                 .duration(200)		
        //                 .style("opacity", .9);		
        //             div	.html(toolTipLabel(d, buk))	
        //                 .style("left", (d3.event.layerX < 300 ? d3.event.layerX + 10 : d3.event.layerX - 185  ) + "px")		
        //                 .style("top", (d3.event.layerY) + "px");	
        //             })					
        //         .on("mouseout", function(d) {
        //             d3.select(this).attr("fill", "rgb(56, 155, 198)");
        //             div.transition()		
        //                 .duration(500)		
        //                 .style("opacity", 0);	
        //         });



        //     // // set the gradient
        //     // svg.append("linearGradient")				
        //     //     .attr("id", "area-gradient")			
        //     //     .attr("gradientUnits", "userSpaceOnUse")	
        //     //     .attr("x1", x(0)).attr("y1", 0)			
        //     //     .attr("x2", x(365/buk)).attr("y2", 0)				
        //     //     .selectAll("stop")						
        //     //     .data([
        //     //         {offset: "0.000000000%", color: "#cc4c03"}, // Jan 1
        //     //         {offset: "4.166666700%", color: "#ec6f14"},
        //     //         {offset: "8.333333400%", color: "#f8982b"}, // Feb 1
        //     //         {offset: "12.50000010%", color: "#fac450"},
        //     //         {offset: "16.66666680%", color: "#fce490"}, // Mar 1
        //     //         {offset: "20.83333350%", color: "#fdf7bc"},
        //     //         {offset: "25.00000020%", color: "#edf8b2"}, // Apr 1
        //     //         {offset: "29.16666690%", color: "#d9f0a3"},
        //     //         {offset: "33.33333360%", color: "#addd8e"}, // May 1
        //     //         {offset: "37.50000030%", color: "#78c678"},
        //     //         {offset: "41.66666700%", color: "#41ab5d"}, // Jun 1
        //     //         {offset: "45.83333370%", color: "#7accc4"},
        //     //         {offset: "50.00000040%", color: "#41b6c5"}, // Jly 1
        //     //         {offset: "54.16666710%", color: "#3090c0"},
        //     //         {offset: "58.33333380%", color: "#225ea8"}, // Aug 1
        //     //         {offset: "62.50000050%", color: "#253494"},
        //     //         {offset: "66.66666720%", color: "#091e58"}  // Sep 1

        //     //     ])					
        //     //     .enter().append("stop")			
        //     //     .attr("offset", function(d) { return d.offset; })	
        //     //     .attr("stop-color", function(d) { return d.color; });


        //     // text label for the x axis
        //     svg.append("g")
        //         .append("text")
        //         .attr("y",  height + margin.bottom + margin.top - 5)
        //         .attr("x", width/2)
        //         .attr("fill", "rgb(0, 0, 0)")
        //         .attr("font-size", "14px")
        //         .style("text-anchor", "middle")
        //         .text("Day of Year");


        //     // text label for the y axis
        //     svg.append("g")
        //         .append("text")
        //         .attr("transform", "rotate(-90)")
        //         .attr("y", 0 - margin.left)
        //         .attr("x", 0 - (height / 2))
        //         .attr("dy", "1em")
        //         .attr("fill", "rgb(0, 0, 0)")
        //         .attr("font-size", "14px")
        //         .style("text-anchor", "middle")
        //         .text("Number of Grid Cells");



        // }


        // function type(d) {
        //     d.count = d.count;
        //     d.day = +d.day;
        //     return d;
        // }

        // function emptyYear() {
        //     let year = new Array(366)
        //     for (let i = 0; i < year.length; i++) {
        //         year[i] = 0
        //     }
        //     return year
        // };


        // function processData(rawData, factor) {
        //     let days_of_year = emptyYear()
        //     let processedData = []
        //     totalCount = 0;
        //     for (let currentYear in rawData) {
        //         for (let i = 0; i < rawData[currentYear].length; i++) {
        //             days_of_year[rawData[currentYear][i]] += 1
        //             totalCount++;
        //         }
        //     }
        //     let bucket_days_of_year = transformData(days_of_year, factor)
        //     for (let i = 0; i < bucket_days_of_year.length; i++) {
        //         let c = bucket_days_of_year[i]
        //         processedData.push({ day: i + 1, count: c })
        //     }
        //     return processedData
        // };


        // function transformData(rawData, factor) {
        //     let transformedData = []

        //     for (let i = 0; i < rawData.length - factor; i += factor) {
        //         let sum = 0
        //         for (let j = 0; j < factor; j++) {
        //             sum += rawData[i + j]
        //         }
        //         transformedData.push(sum)
        //     }
        //     return transformedData
        // };

        // function getDomain(rawData) {
        //     let xMin = 365;
        //     let xMax = 0;
        //     let yMax = 0;
        //     for (let i = 0; i < rawData.length; i++) {
        //         let c = rawData[i].count
        //         if (c > yMax) {
        //             yMax = c;
        //         }
        //         if (c > 0 && i < xMin) {
        //             xMin = i;
        //         }
        //         else if (c > 0 && i > xMax) {
        //             xMax = i;
        //         }

        //     }
        //     return { xMin: xMin, xMax: xMax, yMax: yMax };
        // };

        // function dateFromDay(year, day) {
        //     var date = new Date(year, 0);
        //     return formatTime(new Date(date.setDate(day)));
        // }
        // function toolTipLabel(d, buk) {
        //     var percentage = parseInt(parseInt(d.count)/parseInt(totalCount) * 100);
        //     if (percentage < 1) {
        //         percentage = '< 1' ;
        //     }
        //     else{
        //         percentage = percentage.toString();
        //     }

        //     let count = `Number of Grid Cells: <label>${parseInt(d.count)} </label> of <label>${parseInt(totalCount)} </label> ( ~ ${percentage}%)<br />  Number of Grid Cells = values that occur ${dateFromDay(2018, (d.day * buk) + 1)} to ${dateFromDay(2018, (d.day * buk) + buk)} for all selected years (${startYear} to ${endYear}). <br />`
        //     if (buk == 1) {
        //         return ` <p>  Day: <label> ${dateFromDay(2018, d.day)} </label><br />${count} </p>`
        //     }
        //     else {
        //         return `<p> Days: <label> ${dateFromDay(2018, (d.day * buk) +1)} </label> to <label> ${dateFromDay(2018, (d.day * buk) + buk)} </label><br />${count} </p>`
        //     }
        // }

        // let bucketSize = parseInt($(selector).find(".ridgeLinePlotRange").val());
        // updateChart(chartData, bucketSize)
        // $(selector).find(".ridgeLinePlotRange").change(function () {
        //     bucketSize = parseInt($(selector).find(".ridgeLinePlotRange").val());
        //     updateChart(chartData, bucketSize)
        // });

    }
}

inherit(Analysis, NFHPAnalysisD3);