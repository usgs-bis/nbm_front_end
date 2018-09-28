'use strict';

var HierarchyTableWidget = function (chart) {
    //this.chart = chart;
    var rows = [];

    $.each(chart.data, function (key, value) {
        rows.push({text: key.substr(0, key.length - 2), area: formatArea(value.area)})
    });

    this.viewModel = {
        title: chart.title,
        description: chart.description,
        textHeader: chart.config.returnedValueText,
        areaHeader: chart.config.areaColumn.text,
        rows: rows
    };

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#hierarchyTableTemplate', this.viewModel);
    };

    this.initializeWidget = function () {

    };

    this.getPdfLayout = function() {
        var content = [];

        content.push({
            text: this.viewModel.description, style: ['bapContent', 'subtitle']
        });

        content.push(
            {
                columns: [
                    {
                        alignment: "left",
                        width: "75%",
                        text: chart.config.returnedValueText,
                        bold: true,
                        fontSize: 12
                    },
                    {
                        alignment: "right",
                        width: "25%",
                        text: chart.config.areaColumn.text,
                        bold: true,
                        fontSize: 12
                    }
                ]
            }
        );

        for (var j = 0; j < rows.length; j++) {
            content.push({
                columns: [
                    {
                        alignment: "left",
                        width: "75%",
                        text: rows[j]["text"],
                        bold: false,
                        fontSize: 12
                    },
                    {
                        alignment: "right",
                        width: "25%",
                        text: rows[j]["area"],
                        bold: false,
                        fontSize: 12
                    }
                ]
            });
        }

        return  {
            content: content,
            charts: []
        };
    };

    function formatArea(area) {
        return area >= 1 ? formatAcres(Math.round(area)) : (area > 0 ? '< 1' : 0);
    }
};

inherit(Widget, HierarchyTableWidget);