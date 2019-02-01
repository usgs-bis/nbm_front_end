'use strict';

var AOISpeciesProtectionAnalysisD3 = function (bapConfig, bap) {

    let that = this;
    let id = bap.id
    let chartData = {}
    var currentSpeciesTaxaType = 'all';
    var currentSpeciesData;
    var speciesTitleMap = {
        'a': 'Amphibians',
        'b': 'Birds',
        'm': 'Mammals',
        'r': 'Reptiles',
        'all': 'Species'
    };
    let Specieslayer = []
    var currentPlaceName


    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    this.getHtml = function () {

        return `<div id='${bap.id + 'Chart'}'></div>`
    };

    this.turnOffSpecies = function () {
        if (Specieslayer.length) {
            $(`#${bap.id}Chart .species-layer-radio`).prop('checked', false);
            Specieslayer[0].mapLayer.leafletLayer.setParams({ layers: `` })
        }
    }

    this.initializeWidget = function () {
        const poi = actionHandlerHelper.getSearchActionHandler().getPOI()

        if (poi && poi.selectedId) {
            currentPlaceName = poi.selectedName
            this.getSpeciesProtection(poi.selectedId)
                .then(function (data) {
                    chartData = data
                    currentSpeciesData = data.species.all
                    that.bap.rawJson = chartData

                    var viewData = {
                        speciesType: speciesTitleMap[currentSpeciesTaxaType],
                        totalSpecies: chartData.species.all.length,
                        totalAmphibians: chartData.species.amphibian_species.length,
                        totalBirds: chartData.species.bird_species.length,
                        totalMammals: chartData.species.mammal_species.length,
                        totalReptiles: chartData.species.reptile_species.length,
                        species: chartData.species.all
                    };
                    var helpers = { format: escapeSingleQuotesInString };
                    let html = getHtmlFromJsRenderTemplate('#speciesProtectionInfoTemplate', viewData, helpers);
                    $(`#${bap.id}Chart`).append(html)
                    $(`#${bap.id}Chart`).find('#speciesBAPSubtitle').html(`Protection Status of Species in ${currentPlaceName}`)
                    $(`#${bap.id}Chart`).find('#speciesTableTitle').html(`${viewData.speciesType} in ${currentPlaceName} (${viewData.totalSpecies})`)

                    initializeSpeciesCharts(chartData);
                    $("input[name='taxaType']").on('change', function () {
                        currentSpeciesTaxaType = this.value;
                        currentSpeciesData = getSpeciesListForTaxaType();
                        resetSpeciesTable();
                        updateSpeciesCharts();
                        that.turnOffSpecies();
                        hideSpinner();
                        if (!that.bap.priority) {
                            $(`#${that.bap.id}BapCase #priorityBap${that.bap.id}`).click()
                        }
                    });
                    $("#resetSpeciesTable").on('click', function () {
                        resetSpeciesTable();
                        that.turnOffSpecies()

                    });
                    $("#spNameCheckbox").on('click', function () {
                        toggleSpeciesName(this);
                    });

                    that.togglePriority(bap.priority)
                })
        }
        else {
            $(`#${bap.id}BapCase`).hide()
        }
    };

    this.getPdfLayout = function () {

        try {
            var spRows = $('#spTable tbody').children();
            var spBody = this.getTableBody(spRows);
            let updatedSpBody=[]
            for(let row of spBody){
                updatedSpBody.push([row[0]])
            }


            let c, d, ctx
            let l = d3.select(`#sp12chart`)
            let r = d3.select(`#sp123chart`)

            let content = []
            content.push({ text: $('#speciesBAPSubtitle').text(), style: ['bapContent', 'subtitle'], pageBreak: 'before' })

            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            l.select("svg").attr("height", 200)
            l.select("svg").attr("width", 200)
            c = document.getElementById(`myCanvas${id}`);
            ctx = c.getContext('2d');
            ctx.drawSvg($(`#sp12chart .svg-container-plot`).html(), 0, 0, 800, 800);
            // clean up
            l.select("svg").attr("height", null)
            l.select("svg").attr("width", null)
            $("#canvasHolder").html("")

            //content.push({ image: c.toDataURL(), alignment: 'center', width: 200 })

            $("#canvasHolder").html(`<canvas id="myCanvas${id}" width="800" height="800" style="position: fixed;"></canvas>`)
            r.select("svg").attr("height", 200)
            r.select("svg").attr("width", 200)
            d = document.getElementById(`myCanvas${id}`);
            ctx = d.getContext('2d');
            ctx.drawSvg($(`#sp123chart .svg-container-plot`).html(), 0, 0, 800, 800);
            // clean up
            r.select("svg").attr("height", null)
            r.select("svg").attr("width", null)
            $("#canvasHolder").html("")

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
            content.push({ text: $('#speciesTableTitle').text(), style: 'bapContent', margin: [0, 15, 0, 5], bold: true, alignment: 'center'})
            content.push({
                style: 'tableStyle',
                table: {
                    headerRows: 0,
                    body: updatedSpBody
                }
            })

            return {
                content: content,
                charts: []
            }

        }
        catch (error) {
            //showErrorDialog("Error printing one or more charts to report.",false);
            return { content: [], charts: [] }
        }


    };



    this.getSpeciesProtection = function (place) {

        let chunk = {
            status_1_2: [
                { color: '#660000', count: 0, name: '< 1%', percent: 0.0 },
                { color: '#FF0000', count: 0, name: '1 - 10%', percent: 0.0 },
                { color: '#EDCB62', count: 0, name: '10 - 17%', percent: 0.0 },
                { color: '#9CCB19', count: 0, name: '17 - 50%', percent: 0.0 },
                { color: '#228B22', count: 0, name: '> 50%', percent: 0.0 },
            ],
            status_1_2_3: [
                { color: '#660000', count: 0, name: '< 1%', percent: 0.0 },
                { color: '#FF0000', count: 0, name: '1 - 10%', percent: 0.0 },
                { color: '#EDCB62', count: 0, name: '10 - 17%', percent: 0.0 },
                { color: '#9CCB19', count: 0, name: '17 - 50%', percent: 0.0 },
                { color: '#228B22', count: 0, name: '> 50%', percent: 0.0 },
            ],
            species: {
                all: [],
                amphibian_species: [],
                bird_species: [],
                mammal_species: [],
                reptile_species: []
            }
        }


        let url = this.bap.config.charts[0].apiEndpoint + place

        return $.getJSON(url).then(function (searchResult) {
            if (!searchResult.success) {
                $(`#${bap.id}BapCase`).hide()
            }
            else if (searchResult.result.length) {
                searchResult.result.forEach(row => {

                    let c = {
                        common_name: row.spp_comname ? row.spp_comname : "",
                        scientific_name: row.spp_sciname ? row.spp_sciname : "",
                        status_1_2: row.gapstat12perc,
                        status_1_2_3: row.gapstat123perc,
                        taxaletter: row.taxa,
                        sppcode: row.sppcode
                    }
                    chunk.species.all.push(c)
                    if (c.taxaletter == 'A') chunk.species.amphibian_species.push(c)
                    if (c.taxaletter == 'B') chunk.species.bird_species.push(c)
                    if (c.taxaletter == 'M') chunk.species.mammal_species.push(c)
                    if (c.taxaletter == 'R') chunk.species.reptile_species.push(c)

                    let total = searchResult.result.length

                    if (row.gapstat12group == '<1') chunk.status_1_2[0].count += 1
                    else if (row.gapstat12group == '1-10') chunk.status_1_2[1].count += 1
                    else if (row.gapstat12group == '1-17') chunk.status_1_2[2].count += 1
                    else if (row.gapstat12group == '17-50') chunk.status_1_2[3].count += 1
                    else if (row.gapstat12group == '>50') chunk.status_1_2[4].count += 1

                    if (row.gapstat123group == '<1') chunk.status_1_2_3[0].count += 1
                    else if (row.gapstat123group == '1-10') chunk.status_1_2_3[1].count += 1
                    else if (row.gapstat123group == '1-17') chunk.status_1_2_3[2].count += 1
                    else if (row.gapstat123group == '17-50') chunk.status_1_2_3[3].count += 1
                    else if (row.gapstat123group == '>50') chunk.status_1_2_3[4].count += 1

                    chunk.status_1_2.forEach(x => {
                        x.percent = parseFloat(x.count / total) * 100
                    })
                    chunk.status_1_2_3.forEach(x => {
                        x.percent = parseFloat(x.count / total) * 100
                    })

                })

            }
            else {
                $(`#${bap.id}BapCase`).hide()
                console.log(searchResult)
            }
            return chunk
        })
            .catch(function (err) {
                console.log(err.message);
            });

    }

    /**
     * Create the species GAP status charts.
     */
    var sp12chart, sp123chart;
    function initializeSpeciesCharts(chartData) {

        let l = d3.select(`#sp12chart`)
        l.selectAll(".ridgeLinePlotSubTitle").remove()
        l.transition()
        l.select(".svg-container-plot").remove()

        let r = d3.select(`#sp123chart`)
        r.selectAll(".ridgeLinePlotSubTitle").remove()
        r.transition()
        r.select(".svg-container-plot").remove()

        let width = 385
        let height = width
        let padding = 10
        let opacity = .8
        var opacityHover = 1;
        var otherOpacityOnHover = .8;


        var radius = Math.min(width - padding, height - padding) / 2;

        var titleLeft = d3.select(`#sp12chart`)
            .append("div")
            .attr("class", "ridgeLinePlotSubTitle contextSubHeader subHeaderTitle")
            .html('GAP Status 1 & 2');

        var titleRight = d3.select(`#sp123chart`)
            .append("div")
            .attr("class", "ridgeLinePlotSubTitle contextSubHeader subHeaderTitle")
            .html('GAP Status 1, 2 & 3');

        var svgLeft = d3.select(`#sp12chart`)
            .append("div")
            .classed("svg-container-plot", true)
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + width + " " + (height + 150))
            .classed("svg-content-responsive", true)
            .attr("version", "1.1")
            .attr("baseProfile", "full")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .append("g")
            .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');


        var svgRight = d3.select(`#sp123chart`)
            .append("div")
            .classed("svg-container-plot", true)
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + width + " " + (height + 150))
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
            .value(function (d) { return d.count; })
            .sort(null);


        let tooltipR = d3.select(`#sp123chart`)
            .append("div")
            .attr("class", "chartTooltip EcoSysBarChartToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)")
            .style("position", "fixed")
            .style("display", "inline-block");


        let tooltipL = d3.select(`#sp12chart`)
            .append("div")
            .attr("class", "chartTooltip EcoSysBarChartToolTip")
            .style("opacity", 0)
            .style("border", "3px solid rgb(56, 155, 198)")
            .style("position", "fixed")
            .style("display", "inline-block");


        var gap12title = 'GAP Status 1 & 2';

        var left = svgLeft.selectAll('path')
            .data(pie(chartData.status_1_2))
            .enter()
            .append("g")
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return d.data.color })
            .style('opacity', opacity)
            //.style('stroke', 'white')
            .on("click", function (d) {
                updateSpeciesTable(gap12title, d.data);

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
            .data(pie(chartData.status_1_2_3))
            .enter()
            .append("g")
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return d.data.color })
            .style('opacity', opacity)
            //.style('stroke', 'white')
            .on("click", function (d) {
                updateSpeciesTable(gap123title, d.data);
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

        var legendRectSize = 18;
        var legendSpacing = 4;

        var legendL = svgLeft.selectAll('.legend')
            .data(chartData.status_1_2)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                return 'translate(' + (-1 * (width / 4)) + ',' + (height / 2 + 20 + (22 * i)) + ')';
            });

        legendL.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', function (d, i) {
                return d.color
            })
            // .style("stroke", "black")
            // .style("stroke-width", "1px");

        legendL.append('text')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .attr('font-size', 'small')
            .text(function (d) { return d.name; });



        var legendR = svgRight.selectAll('.legend')
            .data(chartData.status_1_2_3)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                return 'translate(' + (-1 * (width / 4)) + ',' + (height / 2 + 25 + (22 * i)) + ')';
            });

        legendR.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', function (d, i) {
                return d.color
            })
            // .style("stroke", "black")
            // .style("stroke-width", "1px");

        legendR.append('text')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .attr('font-size', 'small')
            .text(function (d) { return d.name; });


        function toolTipLabel(d) {
            return (
                `
<div style="font-weight: bold; font-size: 14px;">
<div>${d.data.name}</div>
<div>${d.data.count} Species</div>
</div>
`
            )
        }

    }

    /**
     * Update the species GAP status table.
     * @param {string} chartName - name of the chart calling this method
     * @param {*} data - data used to filter and update the table
     */
    function updateSpeciesTable(chartName, data) {
        $('#spNameCheckbox').attr('checked', false);
        $("#spNameToggle").show();

        var displayString = data.name;
        var bounds = getHigherAndLowerBounds(displayString);

        var myList = [];
        var gapStatusProperty = chartName == 'GAP Status 1 & 2' ? 'status_1_2' : 'status_1_2_3';

        for (var i = 0; i < currentSpeciesData.length; i++) {
            var mySp = currentSpeciesData[i];
            var value = mySp[gapStatusProperty];

            if (value >= bounds.lower && value < bounds.higher) {
                myList.push({ common_name: mySp['common_name'], scientific_name: mySp['scientific_name'], percent: value, sppcode: mySp['sppcode'] });
            }
        }

        var sorted = sortByPercent(myList);

        var viewData = {
            species: sorted
        };
        var helpers = { format: formatStatusPercentage, formatName: escapeSingleQuotesInString };
        var html = getHtmlFromJsRenderTemplate('#updateSpeciesProtectionTableTemplate', viewData, helpers);
        $("#spTable").html(html);

        var selected = speciesTitleMap[currentSpeciesTaxaType];

        $('#speciesReset').show();
        $(".spProtRadio").show();
        toggleLayerOffGeneric('Species Range', true);
        toggleLayerOffGeneric('Habitat Map', true);

        var title = myList.length + " " + selected + " with " + displayString + " within " + chartName + " in " + currentPlaceName;
        updateTableTitle('speciesTableTitle', title, data.color, data.count);
        if (data.name == '< 1%') {
            $('#speciesTableTitle').css('background-color', 'rgb(255,255,255,0.7)')
        }
        else {
            $('#speciesTableTitle').css('background-color', 'rgb(0,0,0,0.7)')

        }
        if (!that.bap.priority) {
            $(`#${that.bap.id}BapCase #priorityBap${that.bap.id}`).click()
        }
    }

    /**
     * Get the list of species based on currentSpeciesTaxaType.
     * @returns {Array.<*>}
     */
    function getSpeciesListForTaxaType() {
        var lilMapper = {
            'a': 'amphibian_species',
            'b': 'bird_species',
            'm': 'mammal_species',
            'r': 'reptile_species'
        };
        var collectionName = lilMapper[currentSpeciesTaxaType];
        return collectionName ? chartData.species[collectionName] : chartData.species['all'];
    }

    /**
     * Reset the species GAP status table.
     */
    function resetSpeciesTable() {
        $("#spNameToggle").hide();
        $('#speciesReset').hide();
        var viewData = {
            speciesType: speciesTitleMap[currentSpeciesTaxaType],
            species: currentSpeciesData,
            placeName: currentPlaceName
        };
        var helpers = { format: escapeSingleQuotesInString };
        var html = getHtmlFromJsRenderTemplate('#speciesTableContainerTemplate', viewData, helpers);
        toggleLayerOffGeneric('Species Range', true);
        toggleLayerOffGeneric('Habitat Map', true);
        $("#speciesTableContainer").html(html);
        $(".spProtRadio").show();
    }

    this.togglePriority = function (priority) {
        if (priority) {
            $(".spProtRadio").show();
        } else {
            highlightRow(null);
            $(".spProtRadio").show();
        }
    }

    /**
     * Update the species charts with the currentSpeciesData.
     */
    function updateSpeciesCharts() {

        var low = 0, lowMid = 0, mid = 0, highMid = 0, high = 0;
        var low23 = 0, lowMid23 = 0, mid23 = 0, highMid23 = 0, high23 = 0;
        var total = 0;

        for (var j = 0; j < currentSpeciesData.length; j++) {
            if (currentSpeciesData[j]['status_1_2'] < 1) low++;
            else if (currentSpeciesData[j]['status_1_2'] < 10) lowMid++;
            else if (currentSpeciesData[j]['status_1_2'] < 17) mid++;
            else if (currentSpeciesData[j]['status_1_2'] < 50) highMid++;
            else high++;

            if (currentSpeciesData[j]['status_1_2_3'] < 1) low23++;
            else if (currentSpeciesData[j]['status_1_2_3'] < 10) lowMid23++;
            else if (currentSpeciesData[j]['status_1_2_3'] < 17) mid23++;
            else if (currentSpeciesData[j]['status_1_2_3'] < 50) highMid23++;
            else high23++;

            total++;
        }

        var sp12chartData = getChartData(low, lowMid, mid, highMid, high, total);

        var sp123chartData = getChartData(low23, lowMid23, mid23, highMid23, high23, total);

        updateSpeciesChartData(sp12chartData, sp123chartData);
    }

    /**
     * Get data for a pie chart.
     * @param {number} low - number of species in a low GAP protection area
     * @param {number} lowMid - number of species in a low medium GAP protection area
     * @param {number} mid - number of species in a medium GAP protection area
     * @param {number} highMid - number of species in a high medium GAP protection area
     * @param {number} high - number of species in a high GAP protection area
     * @param {number} total - total number of species
     * @returns {Array.<{name: {string}, count: {number}, percent: {number}, color: {string}}>}
     */
    function getChartData(low, lowMid, mid, highMid, high, total) {
        return [
            { name: '< 1%', count: low, percent: low / total * 100, color: '#660000' },
            { name: '1 - 10%', count: lowMid, percent: lowMid / total * 100, color: '#FF0000' },
            { name: '10 - 17%', count: mid, percent: mid / total * 100, color: '#EDCB62' },
            { name: '17 - 50%', count: highMid, percent: highMid / total * 100, color: '#9CCB19' },
            { name: '> 50%', count: high, percent: high / total * 100, color: '#228B22' }
        ];
    }

    /**
     * Update the species charts.
     * @param {Array.<{name: {string}, count: {number}, percent: {number}, color: {string}}>} status12Data - the GAP status 1 & 2 data
     * @param {Array.<{name: {string}, count: {number}, percent: {number}, color: {string}}>} status123Data - the GAP status 1, 2, & 3 data
     */
    function updateSpeciesChartData(status12Data, status123Data) {
        let chartData = { status_1_2: status12Data, status_1_2_3: status123Data }
        initializeSpeciesCharts(chartData)
    }

    /**
     * If the scientific names are currently being displayed than switch to common names and vice versa.
     * @param {*} el - the element clicked by the user
     */
    function toggleSpeciesName(el) {
        var title = $("#spLeftColTitle");
        var commonName = $(".spCommonName");
        var sciName = $(".spScientificName");

        if ($(el).is(":checked")) {
            title.text("Scientific Name");
            commonName.removeClass('shownTd').addClass('hiddenTd');
            sciName.removeClass('hiddenTd').addClass('shownTd');
        } else {
            title.text("Common Name");
            sciName.removeClass('shownTd').addClass('hiddenTd');
            commonName.removeClass('hiddenTd').addClass('shownTd');
        }
    }
};

inherit(Analysis, AOISpeciesProtectionAnalysisD3);