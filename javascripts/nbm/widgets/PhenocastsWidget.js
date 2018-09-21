'use strict';


// this plot tags along with the box and whisker 
function PhenocastsWidget(config, bap) {
    let id = bap.id
    let selector = "#" + id + "BAP";
    let dataURI = ""
    let that = this;
    // Class level variables for mouseover tooltip.
    var startYear;
    var endYear;

    let charts = [];

    let chartData = {
        "agdd":{
            "Apple Maggot": {
                "Not Approaching Treatment Window": {
                    "range": [0,650],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [650,900],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [900,2000],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [2000],
                    "color": "#C19A6B"
                },
            },
            "Emerald Ash Borer": {
                "Not Approaching Treatment Window": {
                    "range": [0,350],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [350,450],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [450,1500],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [1500],
                    "color": "#C19A6B"
                },
            },
            "Lilac Borer": {
                "Not Approaching Treatment Window": {
                    "range": [0,350],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [350,500],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [500,1300],
                    "color": "#41AB5D"
                },
                "Treatment Window Passed": {
                    "range": [1300],
                    "color": "#C19A6B"
                },
            },
            "Winter Moth": {
                "Not Approaching Treatment Window": {
                    "range": [0,20],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [20,350],
                    "color": "#FFED6F"
                },
                "Treatment Window Passed": {
                    "range": [350],
                    "color": "#C19A6B"
                },
            }
        },
        "agdd_50f": {
            "Apple Maggot": {
                "Not Approaching Treatment Window": {
                    "range": [0,25],
                    "color": "#999999"
                },
                "Approaching Treatment Window": {
                    "range": [25,1000],
                    "color": "#FFED6F"
                },
                "Treatment Window": {
                    "range": [1000,2200],
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

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#histogramTemplate', { id: id });
    }
    this.initializeWidget = function () {
        let that = this;
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        var yyyy = today.getFullYear();
        if(dd<10) {
            dd = '0'+dd
        }

        if(mm<10) {
            mm = '0'+mm
        }

        var futureDate = new Date();
        var numberOfDaysToAdd = 6;
        futureDate.setDate(futureDate.getDate() + numberOfDaysToAdd);
        var fdd = futureDate.getDate();
        var fmm = futureDate.getMonth()+1; //January is 0!
        var fyyyy = futureDate.getFullYear();

        if(fdd<10) {
            fdd = '0'+fdd
        }

        if(fmm<10) {
            fmm = '0'+fmm
        }

        dateStrings["Current"] = yyyy + '-' + mm + '-' + dd
        dateStrings["Six-Day"] = fyyyy + '-' + fmm + '-' + fdd

        today = yyyy + '-' + mm + '-' + dd + 'T00:00:00.000Z';
        futureDate = fyyyy + '-' + fmm + '-' + fdd + 'T00:00:00.000Z';
        this.getData(today, futureDate)
            .then(function (data) {
                that.createChartData(data)
            });
    }

    this.inRange = function(num, bucket) {
        if (bucket.length === 1) {
            return num >= bucket[0]
        } else {
            return num >= bucket[0] && bucket <= bucket[1]
        }
    };

    this.createChartData = function () {
        let that = this;

        console.log("RAW", rawData)

        $.each(rawData, function (layer, times) {
            $.each(times, function(time, list) {
                list.forEach(function(num) {
                    $.each(chartData[layer], function (speciesName, dataObj) {
                        $.each(dataObj, function(bucketName, bucketData) {
                            if (!bucketData[time]) bucketData[time] = 0;
                            if (that.inRange(num, bucketData["range"])) {
                                bucketData[time] = bucketData[time] + 1
                            }
                        })
                    })
                });
            });
        });

        console.log(chartData);
        this.buildCharts(chartData)
    };

    this.buildCharts = function(chartData) {
        let count = 0;
        let that = this;
        $.each(chartData, function (key, pestDatas) {
            $.each(pestDatas, function(pestName, pestData) {
                count++
                that.buildBarChart(pestName, pestData, count)
            });
        });
    };

    this.buildBarChart = function(pestName, pestData, num) {

        let currentList = [];
        let futureList = [];

        $.each(pestData, function(category, data) {
            currentList.push({"helper": "", "Category": category, "Count": data["Current"], "color": data["color"]})
            futureList.push({"helper": "", "Category": category, "Count": data["Six-Day"], "color": data["color"]})
        });

        let curId = id + "PhenocastCurrent" + num;
        let sixId = id + "PhenocastSixDay" + num;
        $("#"+id+"BAP").append('<div style="width: 90%; height: 200px;" id="' + curId + '"></div>')
        $("#"+id+"BAP").append('<div style="width: 90%; height: 200px;" id="' + sixId + '"></div>')
        charts.push(this.getChart(currentList, curId, pestName, "Current"))
        charts.push(this.getChart(futureList, sixId, pestName, "Six-Day"))

    }

    this.getChart = function(data, id, name, forecast) {
        return AmCharts.makeChart(id, {
            // "numberFormatter": formatter,
            "theme": 'light',
            "borderAlpha": 0,
            "creditsPosition": "top-right",
            "color": AmChartsHelper.getChartColor(),
            "rotate": true,
            "marginLeft": 10,
            "marginRight": 15,
            "type": "serial",
            "dataProvider": data,
            "categoryField": "helper",
            "autoWrap": true,
            "graphs": [{
                "valueField": "Count",
                "type": "column",
                "balloonText": "<b>[[category]]: [[Count]]" + "</b>",
                "fillColorsField": "color",
                "fillAlphas": .9,
                "lineAlpha": 0.3,
                "alphaField": "opacity",

            }],
            "categoryAxis": {
                "axisAlpha": 1,
                "axisColor": AmChartsHelper.getChartColor(),
                "autoGridCount": false,
                "gridCount": data.length,
                "gridPosition": "start",
                "title": name + "\n" + dateStrings[forecast]
            },
            "valueAxes": [
                {
                    "title": "Cell Count",
                    "axisColor": AmChartsHelper.getChartColor(),
                    "axisAlpha": 1,
                }
            ],
            "export": {
                "enabled": true,
                "menu": []
            }
        });
    }

    this.getData = function(today, futureDate) {
        let requests = []
        requests.push(widgetHelper.getSingleRequest(
            that.bap.feature,
            {featureName:"agdd"},
            today,
            "AGDD")
            .then(function(data) {
                rawData["agdd"]["Current"] = data
            }));

        requests.push(widgetHelper.getSingleRequest(
            that.bap.feature,
            {featureName:"agdd"},
            futureDate,
            "AGDD")
            .then(function(data) {
                rawData["agdd"]["Six-Day"] = data
            }));

        requests.push(widgetHelper.getSingleRequest(
            that.bap.feature,
            {featureName:"agdd_50f"},
            today,
            "AGDD")
            .then(function(data) {
                rawData["agdd_50f"]["Current"] = data
            }));
        requests.push(widgetHelper.getSingleRequest(
            that.bap.feature,
            {featureName:"agdd_50f"},
            futureDate,
            "AGDD")
            .then(function(data) {
                rawData["agdd_50f"]["Six-Day"] = data
            }));

        return Promise.all(requests)
    }

    this.getPdfLayout = function() {

        try{
            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            d3.select(`#histogramPlot${id}`).select("svg").attr("height",500)
            d3.select(`#histogramPlot${id}`).select("svg").attr("width",500)

            let c = document.getElementById(`myCanvas${id}`);
            let ctx = c.getContext('2d');
            ctx.drawSvg($(`#histogramChart${id} .svg-container-plot`).html(), 0, 0, 800, 800);

            // clean up
            d3.select(`#histogramPlot${id}`).select("svg").attr("height",null)
            d3.select(`#histogramPlot${id}`).select("svg").attr("width",null)
            $("#canvasHolder").html("")

            return {
                content: [
                    {text: $(selector).find("#histogramTitle").text(),style: ['titleChart'], pageBreak: 'before'},
                    {text: $(selector).find("#histogramSubTitle").text(),style: ['subTitleChart']},
                    {image: c.toDataURL(),  alignment: 'center', width:500}
                ],
                charts: []
            }

        }
        catch(error){
            //showErrorDialog("Error printing one or more charts to report.",false);
            return {content:[],charts:[]}
        }
    }


    let ts = widgetHelper.addTimeSlider()


    this.buildChart = function (chartData, id) {



        $(selector).find(`#histogramPlot${id}`).show()
        $(selector).find(".ridgeLinePlotRangeValue").html(3);
        $(selector).find(".ridgeLinePlotRange").val(3);

        d3.select(`#histogramPlot${id}`).select(".svg-container-plot").remove()


        let margin = { top: 20, right: 20, bottom: 25, left: 60 },
            width = $(`#histogramPlot${id}`).width() - margin.left - margin.right,
            height = 450 - margin.top - margin.bottom;

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
                .ticks(5)
                .tickFormat(x => { return dateFromDay(2018, (x) * buk) })

            let yAxis = d3.axisLeft(y)

            let histogram = d3.select(`#histogramPlot${id}`)

            // Remove old titles on change
            histogram.selectAll("text").remove()

            // Title
            let location = actionHandlerHelper.sc.headerBap.config.title
            histogram.select("#histogramTitle").append("text")
                .text(`${config.title} ${location ? location : ""}`);

            // Subtitle    
            histogram.select("#histogramSubTitle").append("text")
                .text(`Annual ${config.title} for the Period ${years[0]} to ${years[years.length - 1]}`);
            startYear = years[0];
            endYear = years[years.length-1];

            histogram.transition()

            histogram.select(".svg-container-plot").remove()

            var svg = histogram.select(`#histogramChart${id}`)
                .append("div")
                .classed("svg-container-plot", true)
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
                .classed("svg-content-responsive", true)
                .attr("version", "1.1")
                .attr("baseProfile", "full")
                .attr("xmlns","http://www.w3.org/2000/svg")
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


            let div =  histogram.select(`#histogramChart${id}`)
                .append("div")
                .attr("class", "chartTooltip histogramToolTip")
                .style("opacity", 0)
                .style("border", "3px solid rgb(56, 155, 198)");

            svg.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("fill", "rgb(56, 155, 198)")
                .attr("stroke", "rgb(0, 0, 0)")
                .attr("x", function (d) { return x(d.day); })
                .attr("width", width / (1 + (domain.xMax - domain.xMin)))
                .attr("y", function (d) { return y(d.count); })
                .attr("height", function (d) { return height - y(d.count); })
                .on("mouseover", function(d) {
                    d3.select(this)
                        .attr("fill", "rgb(45, 125, 159)");
                    div.transition()
                        .duration(200)
                        .style("opacity", .9);
                    div	.html(toolTipLabel(d, buk))
                        .style("left", (d3.event.layerX < 300 ? d3.event.layerX + 10 : d3.event.layerX - 185  ) + "px")
                        .style("top", (d3.event.layerY) + "px");
                })
                .on("mouseout", function(d) {
                    d3.select(this).attr("fill", "rgb(56, 155, 198)");
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);
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
            svg.append("g")
                .append("text")
                .attr("y",  height + margin.bottom + margin.top - 5)
                .attr("x", width/2)
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
                .text("Number of Grid Cells");



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
            var percentage = parseInt(parseInt(d.count)/parseInt(totalCount) * 100);
            if (percentage < 1) {
                percentage = '< 1' ;
            }
            else{
                percentage = percentage.toString();
            }

            let count = `Number of Grid Cells: <label>${parseInt(d.count)} </label> of <label>${parseInt(totalCount)} </label> ( ~ ${percentage}%)<br />  Number of Grid Cells = values that occur ${dateFromDay(2018, (d.day * buk) + 1)} to ${dateFromDay(2018, (d.day * buk) + buk)} for all selected years (${startYear} to ${endYear}). <br />`
            if (buk == 1) {
                return ` <p>  Day: <label> ${dateFromDay(2018, d.day)} </label><br />${count} </p>`
            }
            else {
                return `<p> Days: <label> ${dateFromDay(2018, (d.day * buk) +1)} </label> to <label> ${dateFromDay(2018, (d.day * buk) + buk)} </label><br />${count} </p>`
            }
        }

        let bucketSize = parseInt($(selector).find(".ridgeLinePlotRange").val());
        updateChart(chartData, bucketSize)
        $(selector).find(".ridgeLinePlotRange").change(function () {
            bucketSize = parseInt($(selector).find(".ridgeLinePlotRange").val());
            updateChart(chartData, bucketSize)
        });

    }
}