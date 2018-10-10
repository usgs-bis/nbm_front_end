'use strict';

var CnrMatrixAnalysis = function (config) {
    var chart = config;

    this.getHtml = function() {
        if (chart.error) {
            return getHtmlFromJsRenderTemplate('#widgetErrorInfo', {error: "Error retrieving data to create CNR matrix"});
        }
        var helpers = {acresFormat: formatAcres, format: formatPercent};
        return getHtmlFromJsRenderTemplate('#matrixTemplate', {data: chart.data, noData: chart.noDataArea}, helpers);
    };

    this.initializeWidget = function() {
        $('.matrix-html-tooltip').tooltip({
            html: true,
            container: 'body',
            placement: 'left'
        });
        initializeBigMatrix();
    };

    this.getPdfLayout = function() {
        var data = chart.data;

        var labels = ['High', 'Moderate', 'Low'];
        var table = {
            headerRows: 1,
            keepWithHeaderRows: 4,
            dontBreakRows: true,
            widths: [50,'*','*','*'],
            body: [
                [
                    {text: ''},
                    {text: 'Low (0.25 to < 0.5 probability)', style: 'tableHeader' },
                    {text: 'Moderate (0.5 to < 0.75 probability)', style: 'tableHeader'},
                    {text: 'High (≥ 0.75 probability)', style: 'tableHeader'}],
                [
                    {text: ''},
                    {text: 'Landscape context is likely limiting habitat suitability. If limiting factors are within management control, significant restoration may be needed. These landscapes may still be important for other seasonal habitat needs or connectivity.', fontSize: 10, alignment: 'center'},
                    {text: 'Landscape context may be affecting habitat suitability and could be aided by restoration. These landscapes may be at higher risk of becoming unsuitable with additional disturbances that degrade habitat.', fontSize: 10, alignment: 'center'},
                    {text: 'Landscape context is highly suitable to support breeding habitat. Management strategies to maintain and enhance these landscapes have a high likelihood of benefiting sage-grouse.', fontSize: 10, alignment: 'center'}
                ]
            ]
        };
        var row = [];
        var rowCount = 0;
        data.forEach(function(box, i) {
            if(i%3 === 0) {
                row = [{text: '\n\n' + labels[rowCount] + '\n\n'}];
                rowCount++;
            }
            row.push({
                text: '\n' + box.label + '\nArea: ' + formatAcres(box.acres) + '\n(' + formatPercent(box.percent) + '% of total area)\n\n',
                color: box.color,
                fillColor: box.backgroundColor,
                alignment: 'center'
            });
            if(row.length === 4) {
                table.body.push(row);
            }
        });
        return {
            content: [
                {
                    columns: [
                        {
                            text: 'Ecosystem Resilience to Disturbance and Resistance to Invasion',
                            width: 100,
                            style: 'tableHeader',
                            margin: [0,225,0,0]
                        },
                        [
                            {
                                text: 'Landscape-Scale Sage-Grouse Breeding Habitat Probability',
                                width: 100,
                                style: 'tableHeader',
                                alignment: 'center',
                                margin: [50,0,0,0]
                            },
                            {
                                style: 'tableExample',
                                table: table,
                                layout: 'noBorders'
                            }
                        ]
                    ],
                    pageBreak: 'before'
                },
                {text: 'Ecosystem Resilience to Disturbance and Resistance to Invasion Definitions:', bold: true, alignment: 'center', margin:[0,10,0,0]},
                {text: 'Low', bold: true},
                {text: 'Potential for favorable perennial herbaceous species recovery after disturbance without seeding is usually low.\n' +
                'Risk of invasive annual grasses becoming dominant is high. EDRR can be used to address problematic invasive plants in relatively intact areas.\n' +
                'Seeding/transplanting success depends on site characteristics, extent of annual invasive plants, and posttreatment precipitation, but is often low. More than one intervention likely will be required.\n' +
                'Recovery following inappropriate livestock use is unlikely without active restoration.'},
                {text: 'Moderate', bold: true},
                {text: 'Potential for favorable perennial herbaceous species recovery after disturbance without seeding is usually moderately high, especially on cooler and moister sites.\n' +
                'Risk of invasive annual grasses becoming dominant is moderate, especially on warmer sites. EDRR can be used to address problematic invasive plants in many areas.\n' +
                'Tree removal can increase habitat availability and connectivity in expansion areas.\n' +
                'Seeding-transplanting success depends on site characteristics, and more than one intervention may be required especially on warmer and drier sites.\n' +
                'Recovery following inappropriate livestock use depends on site characteristics and management.'},
                {text: 'High', bold: true},
                {text: 'Potential for favorable perennial herbaceous species recovery after disturbance without seeding is typically high.\n' +
                'Risk of invasive annual grasses becoming dominant is relatively low. EDRR can be used to address problematic invasive plants.\n' +
                'Tree removal can increase habitat availability and connectivity in expansion areas.\n' +
                'Seeding/transplanting success is typically high.\nRecovery following inappropriate livestock use is often possible given changes in management.'}
            ],
            charts: []
        }
    };

    function formatPercent (value) {
        var percent = value * 100;
        return percent < 1 && percent > 0 ? '< 1' : percent.toFixed(0);
    }

    function formatAcres(value) {
        var v = value.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        v+= "" + config.unit ? config.unit : "";
        return v;
    }

    /**
     * Initialize the enlarged matrix html.
     */
    function initializeBigMatrix() {
        var helpers = {acresFormat: formatAcres, format: formatPercent};
        var html = getHtmlFromJsRenderTemplate('#bigMatrixTemplate', {data: chart.data}, helpers);

        $('#enlargedBAPHtmlContainer').html(html);
        $('#cnrButton').on('click', function() {
            showEnlargedBAP();
        });
    }
};

inherit(Analysis, CnrMatrixAnalysis);