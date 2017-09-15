'use strict';

var EcosystemProtectionWidget = function (chartData) {
    Widget.call(this, chartData);
    var ecoProtection = chartData;

    //var ecoProtection = serverAP.charts ? serverAP.charts[0] : serverAP.data;
    var ecosystems = ecoProtection.ecological_systems;

    this.getHtml = function() {
        var viewData = {
            ecosystems: ecosystems
        };
        var helpers = {format: formatStatusPercentage};
        return getHtmlFromJsRenderTemplate('#ecosystemProtectionInfoTemplate', viewData, helpers);
    };

    this.initializeWidget = function() {
        initializeEcoProtectionChart();
        initializeGapCharts();
        initializeCoverageChart();
        $("#resetEcosTable").click(function() {
            resetEcosTable();
        });
    };

    this.getPdfLayout = function() {
        var ecosRows = $('#ecosTable tbody').children();
        var ecosBody = this.getTableBody(ecosRows);

        return {
            content: [
                {text: $('#regionProtectionSubtitle').text(), style: ['bapContent', 'subtitle']},
                {image: protectionChart.div.id, alignment: 'center', width: 300},
                {text: $('#ecoProtectionSubtitle').text(), style: ['bapContent', 'subtitle']},
                {
                    alignment: 'center',
                    columns: [
                        {
                            text: ''
                        },
                        {
                            width: 150,
                            image: gap12chart.div.id
                        },
                        {
                            text: ''
                        },
                        {
                            width: 150,
                            image: gap123chart.div.id
                        },
                        {
                            text: ''
                        }
                    ]
                },
                {text: $('#ecosystemTableTitle').text(), style: 'bapContent', margin: [0,15,0,5], bold: true, alignment: 'center'},
                {
                    style: 'tableStyle',
                    table: {
                        headerRows: 1,
                        body: ecosBody
                    }
                },
                {text: $('#ecoCoverageSubtitle').text(), style: ['bapContent', 'subtitle']},
                {image: ecoCoverageChart.div.id, alignment: 'center', width: 300}
            ],
            charts: [protectionChart,gap12chart,gap123chart,ecoCoverageChart]
        };
    };

    /**
     * Create the ecosystem protection chart.
     */
    var protectionChart;
    function initializeEcoProtectionChart() {
        var ecoregionData = ecoProtection.ecoregion_protection.ecoregion_data;
        var conusData = ecoProtection.ecoregion_protection.conus_data;
        var ecoregionChartData = AmChartsHelper.getChartDataFromJsonArray(ecoregionData.chart_data, 2);
        var conusChartData = AmChartsHelper.getChartDataFromJsonArray(conusData.chart_data, 2);

        var dataProviders = [
            getDataProvider(ecoregionData.name, ecoregionChartData),
            getDataProvider(conusData.name, conusChartData)
        ];

        var chartColor = AmChartsHelper.getChartColor();
        protectionChart = AmCharts.makeChart("protectionChart", {
            "type": "serial",
            "creditsPosition": "bottom-right",
            "color": chartColor,
            "marginTop": 0,
            "marginBottom": 0,
            "balloon": AmChartsHelper.getChartBalloonSettings({
                "fixedPosition": false
            }),
            "legend": {
                "color": chartColor,
                "horizontalGap": 2,
                "spacing": 2,
                "maxColumns": 1,
                "position": "bottom",
                "useGraphSettings": true,
                "markerSize": 15,
                "valueWidth":15,
                "switchable": false
            },
            "dataProvider": dataProviders,
            "valueAxes": [{
                "stackType": "regular",
                "axisAlpha": 0.5,
                "gridAlpha": 0,
                "maximum": 100.0,
                "labelFrequency": 1,
                "gridCount": 10,
                "autoGridCount": false,
                "labelFunction": function (value) {if (value % 20 == 0) {return value + "%"} return " "}
            }],
            "graphs": [{
                "balloonText": "<b>[[Status12value]] acres</b><br><b>[[Status12percent]]%</b>",
                "fillAlphas": 1,
                "lineAlpha": 0.3,
                "lineColor": chartColor,
                "title": "GAP Status 1 & 2",
                "type": "column",
                "fillColors": "#5a8f29",
                "valueField": "Status12displayValue",
                "precision": 2
            }, {
                "balloonText": "<b>[[Status3value]] acres</b><br><b>[[Status3percent]]%</b>",
                "fillAlphas": 1,
                "lineAlpha": 0.3,
                "lineColor": chartColor,
                "title": "GAP Status 3",
                "type": "column",
                "fillColors": "#bbbbbb",
                "valueField": "Status3displayValue",
                "precision": 2
            }, {
                "balloonText": "<b>[[Status4value]] acres</b><br><b>[[Status4percent]]%</b>",
                "fillAlphas": 0,
                "lineAlpha": 0.3,
                "lineColor": chartColor,
                "title": "GAP Status 4",
                "type": "column",
                "fillColors": "#f1eee3",
                "valueField": "Status4displayValue",
                "precision": 2
            }],
            "rotate": true,
            "categoryField": "Name",
            "categoryAxis": {
                "gridPosition": "start",
                "axisAlpha": 0,
                "position": "left"
            },
            "export": {
                "enabled": true,
                "menu": []
            }
        });
    }

    /**
     * Returns a data provider for an AmCharts chart from the server data (chartData).
     * @param {string} name - name of the data provider
     * @param {*} chartData - data used to populate the data provider
     * @returns {*}
     */
    function getDataProvider(name, chartData) {
        var dataProvider = {
            "Name": name
        };
        chartData.forEach(function(data) {
            var percentProp = data.id + "percent";
            dataProvider[percentProp] = data.percent;
            var valProp = data.id + "value";
            dataProvider[valProp] = data.value;
            var displayValueProp = data.id + "displayValue";
            dataProvider[displayValueProp] = data.displayValue;
        });

        return dataProvider;
    }

    /**
     * Create the ecosystem GAP status charts.
     */
    var gap12chart, gap123chart;
    function initializeGapCharts() {
        var balloonText = "<span style='font-size:14px'><b>[[name]]<br>[[count]] ecosystems</b></span>";

        var gap12title = 'GAP Status 1 & 2';
        var gap12ChartData = AmChartsHelper.getChartDataFromJsonArray(ecoProtection.gap1_2, 0, true);
        gap12chart = AmChartsHelper.getAmPieChart(gap12title, gap12ChartData, balloonText, AmChartsHelper.getAmLegend(), true);
        gap12chart.addListener('clickSlice', function(event) {
            gap12chart.validateData();
            updateEcosTable(gap12title, event.dataItem);
        });

        var gap123title = 'GAP Status 1, 2 & 3';
        var gap123ChartData = AmChartsHelper.getChartDataFromJsonArray(ecoProtection.gap1_2_3, 0, true);
        gap123chart = AmChartsHelper.getAmPieChart(gap123title, gap123ChartData, balloonText, AmChartsHelper.getAmLegend(), true);
        gap123chart.addListener('clickSlice', function(event) {
            gap123chart.validateData();
            updateEcosTable(gap123title, event.dataItem);
        });

        // WRITE
        gap12chart.write("gap12chart");
        gap123chart.write("gap123chart");
    }

    /**
     * Update the ecosystem GAP status table.
     * @param {string} chartName - name of the chart calling this method
     * @param {*} dataItem - data used to filter and update the table
     */
    function updateEcosTable(chartName, dataItem) {
        $("#ecosReset").show();

        var displayString = dataItem.dataContext.name;
        var bounds = getHigherAndLowerBounds(displayString);

        var myList = [];
        var gapStatusProperty = chartName == 'GAP Status 1 & 2' ? 'status_1_2' : 'status_1_2_3';

        for (var i = 0; i < ecosystems.length; i++) {
            var myEco = ecosystems[i];
            var value = myEco[gapStatusProperty];

            if (value >= bounds.lower && value < bounds.higher) {
                myList.push({name: myEco['name'], acres: myEco['acres'], percent: value});
            }
        }

        var sorted = sortByPercent(myList);

        var viewData = {
            ecosystems: sorted
        };
        var helpers = {acresFormat: formatEcosAcresProtected, format: formatStatusPercentage};
        var html = getHtmlFromJsRenderTemplate('#updateEcosTableTemplate', viewData, helpers);
        $('#ecosTable').html(html);

        var plural = myList.length == 1 ? '' : 's';
        var title = myList.length + " Ecological System" + plural + " with " + displayString + " protection on " + chartName + " Lands";
        updateTableTitle('ecosystemTableTitle', title, dataItem.color, dataItem.index);
    }

    /**
     * Reset the ecosystem GAP status to it's original state.
     */
    function resetEcosTable() {
        $("#ecosReset").hide();

        var viewData = {
            ecosystems: ecosystems
        };
        var helpers = {format: formatStatusPercentage};
        var html = getHtmlFromJsRenderTemplate('#ecosTableContainerTemplate', viewData, helpers);

        $("#ecosTableContainer").html(html);
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
    function initializeCoverageChart() {
        var balloonText = "[[name]]<br><span style='font-size:14px'><b>[[percent]]%</b></span>";
        var pieChartData = AmChartsHelper.getChartDataFromJsonArray(ecoProtection.ecosystem_coverage_data, 2);
        ecoCoverageChart = AmChartsHelper.getAmPieChart('', pieChartData, balloonText);
        ecoCoverageChart.marginTop = -40;
        ecoCoverageChart.numberFormatter = {precision:0, decimalSeparator:'.', thousandsSeparator:','};
        ecoCoverageChart.marginBottom = -40;

        var legend = AmChartsHelper.getAmLegend();
        ecoCoverageChart.addLegend(legend, "ecoCoverageLegend");

        // WRITE
        ecoCoverageChart.write("ecoCoverageChart");
    }
};

inherit(Widget, EcosystemProtectionWidget);