'use strict';

var AOIEcosystemProtectionAnalysisD3 = function (bapConfig, bap) {
    let that = this;
    let id = bap.id
    let selector = "#" + id + "BAP";
    let dataURI = ""
    let chartData = {
        ecoregion_protection: {},
        ecosystem_coverage: [],
        ecological_systems: [],
        gap1_2: [],
        gap1_2_3: [],
    }

    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#EcoSysAnalysisTemplate', { id: id });
    };

    this.initializeWidget = function () {

        const poi = actionHandlerHelper.getSearchActionHandler().getPOI()

        if (poi && poi.selectedId) {
            const placeName = poi.selectedName
            this.getData(poi.selectedId, placeName)
                .then(function (flag) {
                    if (!flag) return;
                    that.bap.rawJson = chartData

                    let viewData = {
                        ecosystems: chartData.ecological_systems
                    };



                    $(selector).find(`#EcoSysPlot${id}`).show()
                    let EcoBar = d3.select(`#EcoSysPlot${id}`)
                    EcoBar.selectAll("text").remove()



                    initializeEcoProtectionChart(chartData.ecoregion_protection, placeName);
                    initializeGapCharts(chartData.gap1_2, chartData.gap1_2_3, placeName);
                    initializeCoverageChart(chartData.ecosystem_coverage);
                    $("#resetEcosTable").on('click', function () {
                        resetEcosTable();
                    });
                    resetEcosTable()
                })
        }
        else {
            $(`#${bap.id}BapCase`).hide()
        }
    };

    this.getPdfLayout = function () {

        try {
            let content = [
                { text: $(selector).find("#EcoSysBarChartTitle").text(), style: ['titleChart'], pageBreak: 'before' },
                { text: $(selector).find("#EcoSysBarChartSubTitle").text(), style: ['subTitleChart'] }
            ]

            let c, d, ctx
            let ecoPlot = d3.select(`#EcoSysPlot${id}`)
            var ecosRows = $('#ecosTable tbody').children();
            var ecosBody = this.getTableBody(ecosRows);


            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            ecoPlot.select(`#EcoSysBarChart${id}`).select("svg").attr("height", 500)
            ecoPlot.select(`#EcoSysBarChart${id}`).select("svg").attr("width", 500)
            c = document.getElementById(`myCanvas${id}`);
            ctx = c.getContext('2d');
            ctx.drawSvg($(`#EcoSysBarChart${id} .svg-container-plot`).html(), 0, 0, 800, 800);
            // clean up
            ecoPlot.select(`#EcoSysBarChart${id}`).select("svg").attr("height", null)
            ecoPlot.select(`#EcoSysBarChart${id}`).select("svg").attr("width", null)
            $("#canvasHolder").html("")

            content.push({ image: c.toDataURL(), alignment: 'center', width: 500 })
            content.push({ text: $(selector).find("#EcoSysProtectionPieChartTitle").text(), style: ['titleChart'], pageBreak: 'before' })
            content.push({ text: $(selector).find("#EcoSysProtectionPieChartSubTitle").text(), style: ['subTitleChart'] })


            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            ecoPlot.select(`#EcoSysProtectionPieChartLeft`).select("svg").attr("height", 200)
            ecoPlot.select(`#EcoSysProtectionPieChartLeft`).select("svg").attr("width", 200)
            c = document.getElementById(`myCanvas${id}`);
            ctx = c.getContext('2d');
            ctx.drawSvg($(`#EcoSysProtectionPieChartLeft .svg-container-plot`).html(), 0, 0, 800, 800);
            // clean up
            ecoPlot.select(`#EcoSysProtectionPieChartLeft`).select("svg").attr("height", null)
            ecoPlot.select(`#EcoSysProtectionPieChartLeft`).select("svg").attr("width", null)
            $("#canvasHolder").html("")

            //content.push({ image: c.toDataURL(), alignment: 'center', width: 200 })

            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            ecoPlot.select(`#EcoSysProtectionPieChartRight`).select("svg").attr("height", 200)
            ecoPlot.select(`#EcoSysProtectionPieChartRight`).select("svg").attr("width", 200)
            d = document.getElementById(`myCanvas${id}`);
            ctx = d.getContext('2d');
            ctx.drawSvg($(`#EcoSysProtectionPieChartRight .svg-container-plot`).html(), 0, 0, 800, 800);
            // clean up
            ecoPlot.select(`#EcoSysProtectionPieChartRight`).select("svg").attr("height", null)
            ecoPlot.select(`#EcoSysProtectionPieChartRight`).select("svg").attr("width", null)
            $("#canvasHolder").html("")

            //content.push({ image: c.toDataURL(), alignment: 'center', width: 200 })
            content.push(
                {
                    alignment: 'center',
                    columns: [
                        {
                            text: ''
                        },
                        {
                            width: 300,
                            image: c.toDataURL()
                        },
                        {
                            text: ''
                        },
                        {
                            width: 300,
                            image: d.toDataURL()
                        },
                        {
                            text: ''
                        }
                    ]
                }
            )
            content.push({ text: $('#ecosystemTableTitle').text(), style: 'bapContent', margin: [0, 15, 0, 5], bold: true, alignment: 'center' })
            content.push({
                style: 'tableStyle',
                table: {
                    headerRows: 0,
                    body: ecosBody
                }
            }
            )
            content.push({ text: $(selector).find("#EcoSysCoveragePieChartTitle").text(), style: ['titleChart'], pageBreak: 'before' })


            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            ecoPlot.select(`#EcoSysCoveragePieChart`).select("svg").attr("height", 400)
            ecoPlot.select(`#EcoSysCoveragePieChart`).select("svg").attr("width", 400)
            c = document.getElementById(`myCanvas${id}`);
            ctx = c.getContext('2d');
            ctx.drawSvg($(`#EcoSysCoveragePieChart .svg-container-plot`).html(), 0, 0, 800, 800);
            // clean up
            ecoPlot.select(`#EcoSysCoveragePieChart`).select("svg").attr("height", null)
            ecoPlot.select(`#EcoSysCoveragePieChart`).select("svg").attr("width", null)
            $("#canvasHolder").html("")

            content.push({ image: c.toDataURL(), alignment: 'center', width: 400 })



            return {
                content: content,
                charts: []
            }

        }
        catch (error) {
            //showErrorDialog("Error printing one or more charts to report.",false);
            return { content: [], charts: [] }
        }
    }


    this.getEcoregionCoverage = function (coverage) {

        let coverageData = []

        coverage.forEach(row => {

            let c = {
                color: that.getColorFromName(row.nvc_name),
                name: row.nvc_name,
                percent: row.percent_nvcs_cover
            }
            coverageData.push(c)

        })

        return coverageData.sort(function (a, b) {
            if (a.percent > b.percent) return -1;
            if (a.percent < b.percent) return 1;
            return 0;
        })
    }


    this.getEcologicalSystems = function (systems) {

        let systemsData = []
        let gap1_2 = [
            { color: '#660000', count: 0, name: '< 1%', },
            { color: '#FF0000', count: 0, name: '1 - 10%', },
            { color: '#EDCB62', count: 0, name: '10 - 17%', },
            { color: '#9CCB19', count: 0, name: '17 - 50%', },
            { color: '#228B22', count: 0, name: '> 50%', },
        ]
        let gap1_2_3 = [
            { color: '#660000', count: 0, name: '< 1%', },
            { color: '#FF0000', count: 0, name: '1 - 10%', },
            { color: '#EDCB62', count: 0, name: '10 - 17%', },
            { color: '#9CCB19', count: 0, name: '17 - 50%', },
            { color: '#228B22', count: 0, name: '> 50%', },
        ]

        systems.forEach(row => {

            if (!row.eco_code || !row.eco_code.includes('.')) {
                let c = {
                    acres: row.totalac,
                    name: row.nvc_name,
                    code: row.nvc_code,
                    status_1_2: row.gapstat12perc,
                    status_1_2_3: row.gapstat123perc,
                }
                systemsData.push(c)

                let total = systems.length

                if (row.gapstat12group == '<1') gap1_2[0].count += 1
                else if (row.gapstat12group == '1-10') gap1_2[1].count += 1
                else if (row.gapstat12group == '10-17') gap1_2[2].count += 1
                else if (row.gapstat12group == '17-50') gap1_2[3].count += 1
                else if (row.gapstat12group == '>50') gap1_2[4].count += 1

                if (row.gapstat123group == '<1') gap1_2_3[0].count += 1
                else if (row.gapstat123group == '1-10') gap1_2_3[1].count += 1
                else if (row.gapstat123group == '10-17') gap1_2_3[2].count += 1
                else if (row.gapstat123group == '17-50') gap1_2_3[3].count += 1
                else if (row.gapstat123group == '>50') gap1_2_3[4].count += 1

                gap1_2.forEach(x => {
                    x.percent = parseFloat(x.count / total) * 100
                })
                gap1_2_3.forEach(x => {
                    x.percent = parseFloat(x.count / total) * 100
                })
            }
        })

        systemsData = systemsData.sort(function (a, b) {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        })
        return {
            ecological_systems: systemsData,
            gap1_2: gap1_2,
            gap1_2_3: gap1_2_3
        }

    }

    this.getEcoregionProtection = function (protection, placeName) {

        let chunk = {
            CONUS_data: {
                name: "CONUS",
                chart_data: []
            },
            ecoregion_data: {
                name: placeName,
                chart_data: []
            }
        }

        if (protection.CONUS) {
            let total = parseFloat(protection.CONUS.gapstat1ac)
                + parseFloat(protection.CONUS.gapstat2ac)
                + parseFloat(protection.CONUS.gapstat3ac)
                + parseFloat(protection.CONUS.gapstat4ac);
            let temp = [
                {
                    id: "Status12",
                    value: numberWithCommas(parseInt(protection.CONUS.gapstat1ac + protection.CONUS.gapstat2ac)),
                    percent: ((protection.CONUS.gapstat1ac + protection.CONUS.gapstat2ac) / total) * 100
                },
                {
                    id: "Status3",
                    value: numberWithCommas(parseInt(protection.CONUS.gapstat3ac)),
                    percent: (protection.CONUS.gapstat3ac / total) * 100
                },
                {
                    id: "Status4",
                    value: numberWithCommas(parseInt(protection.CONUS.gapstat4ac)),
                    percent: (protection.CONUS.gapstat4ac / total) * 100
                }
            ]
            chunk.CONUS_data.chart_data = temp
        }
        if (protection[placeName]) {
            let total = parseFloat(protection[placeName].gapstat1ac)
                + parseFloat(protection[placeName].gapstat2ac)
                + parseFloat(protection[placeName].gapstat3ac)
                + parseFloat(protection[placeName].gapstat4ac);
            let temp = [
                {
                    id: "Status12",
                    value: numberWithCommas(parseInt(protection[placeName].gapstat1ac + protection[placeName].gapstat2ac)),
                    percent: ((protection[placeName].gapstat1ac + protection[placeName].gapstat2ac) / total) * 100
                },
                {
                    id: "Status3",
                    value: numberWithCommas(parseInt(protection[placeName].gapstat3ac)),
                    percent: (protection[placeName].gapstat3ac / total) * 100
                },
                {
                    id: "Status4",
                    value: numberWithCommas(parseInt(protection[placeName].gapstat4ac)),
                    percent: (protection[placeName].gapstat4ac / total) * 100
                }
            ]
            chunk.ecoregion_data.chart_data = temp
        }

        return chunk
    }

    this.getData = function (feature_id, placeName) {
        let url = this.bap.config.charts[0].apiEndpoint + feature_id
        return $.getJSON(url).then(function (data) {
            if (!data.success) {
                $(`#${bap.id}BapCase`).hide()
                return false;
            }
            else {
                chartData.ecoregion_protection = that.getEcoregionProtection(data.result.protection, placeName)
                chartData.ecosystem_coverage = that.getEcoregionCoverage(data.result.coverage)
                let ecologicalSystems = that.getEcologicalSystems(data.result.systems)
                chartData.ecological_systems = ecologicalSystems.ecological_systems
                chartData.gap1_2 = ecologicalSystems.gap1_2
                chartData.gap1_2_3 = ecologicalSystems.gap1_2_3
                return true
            }
        })

    }

    this.getColorFromName = function (name) {
        const colorMap = {

            'Forest & Woodland': '#267300',
            'Shrubland & Herb Vegetation': '#F6C467',
            'Shrub & Herb Vegetation': '#F6C467',
            'Desert and Semi-Desert': '#D2B48C',
            'Desert & Semi-Desert': '#D2B48C',
            'Polar & High Montane Scrub Grassland & Barrens': '#EDE0F2',
            'Polar & High Montane Scrub, Grassland & Barrens': '#EDE0F2',
            'Aquatic Vegetation': '#00C5FF',
            'Open Rock Vegetation': '#555857',
            'Agricultural And Developed Vegetation': '#FEFEC1',
            'Agricultural & Developed Vegetation': '#FEFEC1',
            'Developed & Other Human Use': '#C94D42',
            'Introduced & Semi Natural Vegetation': '#A1459C',
            'Recently Disturbed or Modified': '#872E26',
            'Open Water': '#002EC2',
            'Nonvascular & Sparse Vascular Rock Vegetation': '#8C8F91'
        }
        return colorMap[name] ? colorMap[name] : '#000000'
    }

    /**
     * Create the ecosystem protection chart.
     */
    function initializeEcoProtectionChart(chartData, placeName) {

        let EcoBar = d3.select(`#EcoSysPlot${id}`)


        // Title
        EcoBar.select("#EcoSysBarChartTitle").append("text")
            .text(`Protection Status of ${placeName} Compared to the Continental United States`);


        let data = [
            {
                name: placeName,
                total: 100,
                status12_v: chartData.ecoregion_data.chart_data[0].value,
                'Gap Status 1 & 2': chartData.ecoregion_data.chart_data[0].percent,
                status3_v: chartData.ecoregion_data.chart_data[1].value,
                'Gap Status 3': chartData.ecoregion_data.chart_data[1].percent,
                status4_v: chartData.ecoregion_data.chart_data[2].value,
                'Gap Status 4': chartData.ecoregion_data.chart_data[2].percent
            },
            {
                name: 'CONUS',
                total: 100,
                status12_v: chartData.CONUS_data.chart_data[0].value,
                'Gap Status 1 & 2': chartData.CONUS_data.chart_data[0].percent,
                status3_v: chartData.CONUS_data.chart_data[1].value,
                'Gap Status 3': chartData.CONUS_data.chart_data[1].percent,
                status4_v: chartData.CONUS_data.chart_data[2].value,
                'Gap Status 4': chartData.CONUS_data.chart_data[2].percent
            }
        ]
        data.columns = ["name", 'Gap Status 1 & 2', 'Gap Status 3', 'Gap Status 4']

        let margin = { top: 20, right: 20, bottom: 125, left: 60 },
            width = 385 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

        let x = d3.scaleLinear().range([0, width]);
        let y = d3.scaleBand().range([height, 0]);
        var z = d3.scaleOrdinal(d3.schemeCategory20)
            .range(["#5a8f29", "#cccccc", "#424243"]);

        var stack = d3.stack();

        x.domain([0, 100]);
        y.domain(data.map(function (d) { return d.name; })).padding(0.1);

        z.domain(data.columns.slice(1));

        let xAxis = d3.axisBottom(x)
            .ticks(5)
            .tickFormat(function (d) { return `${parseInt(d)}%` })

        let yAxis = d3.axisLeft(y)

        let svg = EcoBar.select(`#EcoSysBarChart${id}`)
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
            .attr("transform", "translate(" + -2 + "," + 0 + ")")
            .attr("class", "y axis")
            .attr("font-size", "11px")
            .call(yAxis)

        let tooltip = EcoBar.select(`#EcoSysBarChart${id}`)
            .append("div")
            .attr("class", "chartTooltip EcoSysBarChartToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)");


        svg.selectAll(".serie")
            .data(stack.keys(data.columns.slice(1))(data))
            .enter().append("g")
            .attr("class", "serie")
            .attr("fill", function (d) { return z(d.key); })
            .selectAll("rect")
            .data(function (d) { return d; })
            .enter().append("rect")
            .attr("data-legend", function (d) { return d.data.name })
            .attr("y", function (d) { return y(d.data.name); })
            .attr("x", function (d) { return x(d[0]); })
            .attr("width", function (d) { return x(d[1]) - x(d[0]); })
            .attr("height", y.bandwidth())
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(toolTipLabel(d))
                    .style("left", (d3.event.layerX < 300 ? d3.event.layerX + 10 : d3.event.layerX - 100) + "px")
                    .style("top", (d3.event.layerY) + "px")
                    .style("border", `3px solid ${toolTipColor(d)}`);

            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);

            })

        var legendRectSize = 18;
        var legendSpacing = 4;

        var legend = svg.selectAll('.legend')
            .data(z.domain())
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                return 'translate(' + 0 + ',' + (height + 40 + (25 * i)) + ')';
            });

        legend.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', z)
            .style("stroke", "black")
            .style("stroke-width", "1px");

        legend.append('text')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .text(function (d) { return d; });


        function toolTipLabel(d) {
            let p = ""
            let v = ""
            let g = ""
            if (d && d[1] - d[0] == d.data['Gap Status 1 & 2']) {
                p = parseFloat(d.data['Gap Status 1 & 2']).toFixed(2).toString() + "%"
                v = d.data.status12_v + " acers"
                g = "Gap Status 1 & 2"
            }
            else if (d && d[1] - d[0] == d.data['Gap Status 3']) {
                p = parseFloat(d.data['Gap Status 3']).toFixed(2).toString() + "%"
                v = d.data.status3_v + " acers"
                g = "Gap Status 3"
            }
            else if (d && d[1] - d[0] == d.data['Gap Status 4']) {
                p = parseFloat(d.data['Gap Status 4']).toFixed(2).toString() + "%"
                v = d.data.status4_v + " acers"
                g = "Gap Status 4"
            }
            return `<div"><div>${g}</div><div>${p}</div><div>${v}</div></div>`

        }
        function toolTipColor(d) {
            if (d && d[1] - d[0] == d.data.status12_p) {
                return "#5a8f29"
            }
            else if (d && d[1] - d[0] == d.data.status3_p) {
                return "#cccccc"
            }
            else if (d && d[1] - d[0] == d.data.status4_p) {
                return "#424243"
            }
            return 'black'

        }

    }


    /**
     * Create the ecosystem GAP status charts.
     */
    function initializeGapCharts(gap1_2, gap1_2_3, placeName) {

        let EcoPie = d3.select(`#EcoSysPlot${id}`)

        // Title
        EcoPie.select("#EcoSysProtectionPieChartTitle").append("text")
            .text(`Protection Status of ${placeName}`);

        // SubTitle
        EcoPie.select("#EcoSysProtectionPieChartSubTitle").append("text")
            .text(`(Click on a slice to filter the table and see only systems with that percent of protection.)`);



        let width = 385
        let height = width
        let padding = 10
        let opacity = .8
        var opacityHover = 1;
        var otherOpacityOnHover = .8;


        var radius = Math.min(width - padding, height - padding) / 2;

        var titleLeft = EcoPie.select(`#EcoSysProtectionPieChartLeft`)
            .append("div")
            .attr("class", "ridgeLinePlotSubTitle contextSubHeader subHeaderTitle")
            .html('GAP Status 1 & 2');

        var titleRight = EcoPie.select(`#EcoSysProtectionPieChartRight`)
            .append("div")
            .attr("class", "ridgeLinePlotSubTitle contextSubHeader subHeaderTitle")
            .html('GAP Status 1, 2 & 3');

        var svgLeft = EcoPie.select(`#EcoSysProtectionPieChartLeft`)
            .append("div")
            .classed("svg-container-plot", true)
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + width + " " + (height + 250))
            .classed("svg-content-responsive", true)
            .attr("version", "1.1")
            .attr("baseProfile", "full")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .append("g")
            .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');


        var svgRight = EcoPie.select(`#EcoSysProtectionPieChartRight`)
            .append("div")
            .classed("svg-container-plot", true)
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + width + " " + (height + 250))
            .classed("svg-content-responsive", true)
            .attr("version", "1.1")
            .attr("baseProfile", "full")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .append("g")
            .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');


        var arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        var pie = d3.pie()
            .value(function (d) { return d.percent; })
            .sort(null);


        let tooltipR = EcoPie.select(`#EcoSysProtectionPieChartRight`)
            .append("div")
            .attr("class", "chartTooltip EcoSysBarChartToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)")
            .style("position", "fixed")
            .style("display", "inline-block");


        let tooltipL = EcoPie.select(`#EcoSysProtectionPieChartLeft`)
            .append("div")
            .attr("class", "chartTooltip EcoSysBarChartToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)")
            .style("position", "fixed")
            .style("display", "inline-block");


        var gap12title = 'GAP Status 1 & 2';

        var left = svgLeft.selectAll('path')
            .data(pie(gap1_2))
            .enter()
            .append("g")
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return d.data.color })
            .style('opacity', opacity)
            .style('stroke', 'white')
            .on("click", function (d) {
                updateEcosTable(gap12title, d.data);
            })
            .on("mouseover", function (d) {
                d3.selectAll('path')
                    .style("opacity", otherOpacityOnHover);
                d3.select(this)
                    .style("opacity", opacityHover);
                tooltipL.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipL.html(toolTipLabel(d))
                    .style("left", (d3.event.x < 150 ? d3.event.x + 10 : d3.event.x - 125) + "px")
                    .style("top", (d3.event.y + "px"))
                    .style("border", `3px solid ${d.data.color}`);

            })
            .on("mouseout", function (d) {
                tooltipL.transition()
                    .duration(500)
                    .style("opacity", 0);

            });

        var gap123title = 'GAP Status 1, 2 & 3';

        var right = svgRight.selectAll('path')
            .data(pie(gap1_2_3))
            .enter()
            .append("g")
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return d.data.color })
            .style('opacity', opacity)
            .style('stroke', 'white')
            .on("click", function (d) {
                updateEcosTable(gap123title, d.data);
            })
            .on("mouseover", function (d) {
                d3.selectAll('path')
                    .style("opacity", otherOpacityOnHover);
                d3.select(this)
                    .style("opacity", opacityHover);
                tooltipR.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipR.html(toolTipLabel(d))
                    .style("left", (d3.event.x < 150 ? d3.event.x + 10 : d3.event.x - 125) + "px")
                    .style("top", (d3.event.y + "px"))
                    .style("border", `3px solid ${d.data.color}`);

            })
            .on("mouseout", function (d) {
                tooltipR.transition()
                    .duration(500)
                    .style("opacity", 0);

            });

        var legendRectSize = 30;
        var legendSpacing = 10;

        var legendL = svgLeft.selectAll('.legend')
            .data(gap1_2)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                return 'translate(' + (-1 * (width / 4)) + ',' + (height / 2 + 25 + (35 * i)) + ')';
            });

        legendL.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', function (d, i) {
                return d.color
            })
            .style("stroke", "black")
            .style("stroke-width", "1px");

        legendL.append('text')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .attr('font-size', 'x-large')
            .text(function (d) { return d.name; });



        var legendR = svgRight.selectAll('.legend')
            .data(gap1_2_3)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                return 'translate(' + (-1 * (width / 4)) + ',' + (height / 2 + 25 + (35 * i)) + ')';
            });

        legendR.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', function (d, i) {
                return d.color
            })
            .style("stroke", "black")
            .style("stroke-width", "1px");

        legendR.append('text')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .attr('font-size', 'x-large')
            .text(function (d) { return d.name; });


        function toolTipLabel(d) {
            return `<div><div>${d.data.name}</div><div>${d.data.count} Ecosystems</div></div>`
        }


    }

    /**
     * Update the ecosystem GAP status table.
     * @param {string} chartName - name of the chart calling this method
     * @param {*} data - data used to filter and update the table
     */
    function updateEcosTable(chartName, data) {
        let ecosystems = chartData.ecological_systems
        $("#ecosReset").show();

        var bounds = getHigherAndLowerBounds(data.name);

        var myList = [];
        var gapStatusProperty = chartName == 'GAP Status 1 & 2' ? 'status_1_2' : 'status_1_2_3';

        for (var i = 0; i < ecosystems.length; i++) {
            var myEco = ecosystems[i];
            var value = myEco[gapStatusProperty];

            if (value >= bounds.lower && value < bounds.higher) {
                myList.push({ name: myEco['name'], acres: myEco['acres'], percent: value });
            }
        }

        var sorted = sortByPercent(myList);

        var viewData = {
            ecosystems: sorted
        };
        var helpers = { acresFormat: formatEcosAcresProtected, format: formatStatusPercentage };
        var html = getHtmlFromJsRenderTemplate('#updateEcosTableTemplate', viewData, helpers);
        $('#ecosTable').html(html);

        var plural = myList.length == 1 ? '' : 's';
        var title = myList.length + " Ecological System" + plural + " with " + data.name + " protection on " + chartName + " Lands";
        updateTableTitle('ecosystemTableTitle', title, data.color, data.count);
        if (!that.bap.priority) {
            $(`#${that.bap.id}BapCase #priorityBap${that.bap.id}`).click()
        }
    }

    /**
     * Reset the ecosystem GAP status to it's original state.
     */
    function resetEcosTable() {
        let ecosystems = chartData.ecological_systems
        $("#ecosReset").hide();

        var viewData = {
            ecosystems: ecosystems
        };
        var helpers = { format: formatStatusPercentage };
        var html = getHtmlFromJsRenderTemplate('#ecosTableContainerTemplate', viewData, helpers);

        $(`#EcoSysProtectionTable`).html(html);
    }

    /**
     * Returns a formatted string of the number of acres protected.
     * @param {number} totalAcres
     * @param {number} percent - percent of totalAcres protected
     * @returns {string}
     */
    function formatEcosAcresProtected(totalAcres, percent) {
        var protectedAcres = totalAcres / 100.0 * percent;
        return protectedAcres < 1 && protectedAcres > 0 ? '< 1' : formatAcres(protectedAcres);
    }

    /**
     * Create the coverage chart.
     */
    var ecoCoverageChart;
    function initializeCoverageChart(ecosystem_coverage) {

        let EcoPie = d3.select(`#EcoSysPlot${id}`)

        // Title
        EcoPie.select("#EcoSysCoveragePieChartTitle").append("text")
            .text(`Percent Coverage by National Vegetation Classification Class`);



        let width = 190
        let height = width
        let padding = 10
        let opacity = .8
        var opacityHover = 1;
        var otherOpacityOnHover = .8;


        var radius = Math.min(width - padding, height - padding) / 2;



        var svg = EcoPie.select(`#EcoSysCoveragePieChart`)
            .append("div")
            .classed("svg-container-plot", true)
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + (width + 80) + " " + (height + 200))
            .classed("svg-content-responsive", true)
            .attr("version", "1.1")
            .attr("baseProfile", "full")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .append("g")
            .attr('transform', 'translate(' + ((width / 2) + 40) + ',' + (height / 2) + ')');


        var arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        var pie = d3.pie()
            .value(function (d) { return d.percent; })
            .sort(null);

        let tooltip = EcoPie.select(`#EcoSysCoveragePieChart`)
            .append("div")
            .attr("class", "chartTooltip EcoSysBarChartToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)")
            .style("position", "fixed")
            .style("display", "inline-block");



        var chart = svg.selectAll('path')
            .data(pie(ecosystem_coverage))
            .enter()
            .append("g")
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return d.data.color })
            .style('opacity', opacity)
            .style('stroke', 'white')
            .on("mouseover", function (d) {
                d3.selectAll('path')
                    .style("opacity", otherOpacityOnHover);
                d3.select(this)
                    .style("opacity", opacityHover);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(toolTipLabel(d))
                    .style("left", (d3.event.x < 150 ? d3.event.x + 10 : d3.event.x - 125) + "px")
                    .style("top", (d3.event.y + "px"))
                    .style("border", `3px solid ${d.data.color}`);

            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);

            });

        var legendRectSize = 12;
        var legendSpacing = 4;

        var legend = svg.selectAll('.legend')
            .data(ecosystem_coverage)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                return 'translate(' + ((-1 * (width / 2)) -40 ) + ',' + (height / 2 + 20 + (15 * i)) + ')';
            });

        legend.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', function (d, i) {
                return d.color
            })
            .style("stroke", "black")
            .style("stroke-width", "1px");

        legend.append('text')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .attr('font-size', 'smaller')
            .text(function (d) { return d.name; });




        function toolTipLabel(d) {
            return `<div><div>${d.data.name}</div><div>${parseFloat(d.data.percent).toFixed(2)} %</div></div>`
        }

    }

};
inherit(Analysis, AOIEcosystemProtectionAnalysisD3);