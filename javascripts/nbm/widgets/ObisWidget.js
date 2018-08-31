'use strict';

var ObisWidget = function (bapConfig, bap) {
    let that = this;

    this.getHtml = function () {
        return `<div id='${bap.id + 'Chart'}'><div id='${'ObisPlot' + bap.id}' class='ObisPlot'></div></div>`
    };

    this.initializeWidget = function () {

        let AOI = bap.gid //"OBIS_Areas:267"
        try{
            if (!AOI.includes('OBIS_Areas:')) {
                $(`#${bap.id}BapCase`).hide()
                return
            }
            AOI = parseInt(AOI.split(':')[1])
            $(`#priorityBap${bap.id}`).click()
            // Temp
            bap.turnOffOtherLayers()
    
        }
        catch(error){
            $(`#${bap.id}BapCase`).hide()
            console.log("Not an OBIS Geometry")
            return 
        }
       


        $.getJSON(bapConfig.endpoint + AOI, function (data) {
            bap.rawJson = data
            that.buildChart(data)
        })
    };

    this.getPdfLayout = function () {

        try {
            $("#canvasHolder").html(`<canvas id="myCanvas${bap.id}" width="800" height="800" style="position: fixed;"></canvas>`)
            d3.select(`#ObisPlot${bap.id}`).select("svg").attr("height", 500)
            d3.select(`#ObisPlot${bap.id}`).select("svg").attr("width", 500)

            let c = document.getElementById(`myCanvas${bap.id}`);
            let ctx = c.getContext('2d');
            ctx.drawSvg($(`#ObisPlot${bap.id} .svg-container-plot`).html(), 0, 0, 800, 800);

            // clean up
            d3.select(`#ObisPlot${bap.id}`).select("svg").attr("height", null)
            d3.select(`#ObisPlot${bap.id}`).select("svg").attr("width", null)
            $("#canvasHolder").html("")

            return {
                content: [
                    { text: $(`#ObisPlot${bap.id}`).find(".obisPlotTitle").text(), style: ['titleChart'], pageBreak: 'before' },
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

    this.buildChart = function (chartData) {
        let data = []

        let obis = d3.select(`#ObisPlot${bap.id}`)

        Object.keys(chartData).forEach(d => {
            data.push(
                {
                    name: d + ` (${chartData[d].species})`,
                    value: chartData[d].records,
                    species: chartData[d].species,
                    shortName: d
                }
            )
        })


        data = data.sort(function (a, b) {
            return d3.ascending(a.value, b.value);
        })

        let location = actionHandlerHelper.sc.headerBap.config.title
        obis.append("div")
            .classed("ridgeLinePlotTitle", true)
            .classed("contextSubHeader", true)
            .classed("obisPlotTitle", true)
            .append("text")
            .text(`${bapConfig.title} In ${location ? location : ""}`);

        let tooltip = obis.append("div")
            .attr("class", "chartTooltip obisToolTip")
            .style("opacity", 0)
            .style("border", "3px solid red");


        var margin = {
            top: 15,
            right: 25,
            bottom: 15,
            left: 120
        };

        let width = 450 - margin.left - margin.right
        let height = 25 * data.length;


        var svg = obis
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

        var x = d3.scaleLinear().range([0, width]);
        var y = d3.scaleBand().range([height, 0]);



        x.domain([-200, 200 + d3.max(data, function (d) { return d.value; })]);
        y.domain(data.map(function (d) { return d.name; })).padding(0.1);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) { return parseInt(d); }).tickSizeInner([-height]));

        svg.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(y).tickSize(-width));

        svg.selectAll(".circle")
            .data(data)
            .enter().append("circle")
            .attr("class", "circle")
            .attr("r", y.bandwidth() / 4)
            .attr("cy", function (d) { return y(d.name) + y.bandwidth() / 2; })
            .attr("cx", function (d) { return x(d.value); })
            .attr("fill", "red")
            .on("mouseover", function (d) {
                d3.select(this).attr("r", y.bandwidth() / 2)
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(getToolTipHTML(d))
                    .style("left", (d3.event.layerX < 300 ? d3.event.layerX + 15 : d3.event.layerX - 190) + "px")
                    .style("top", (d3.event.layerY) + "px");
            })
            .on("mouseout", function (d) {
                d3.select(this).attr("r", y.bandwidth() / 4)
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        svg.append("g")
            .append("text")
            .attr("y", height + margin.bottom + margin.top)
            .attr("x", width / 2)
            .attr("fill", "rgb(0, 0, 0)")
            .attr("font-size", "14px")
            .style("text-anchor", "middle")
            .text("records");


        svg.append("g")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .attr("fill", "rgb(0, 0, 0)")
            .attr("font-size", "14px")
            .style("text-anchor", "middle")
            .text("Class");


    }

    function getToolTipHTML(d) {


        let html =
            `<p>
        Name: <label>${d.shortName}</label> <br>
        Records: <label>${d.value}</label> <br>
        Species: <label>${d.species}</label> <br>
        </p>`
        return html
    }


}