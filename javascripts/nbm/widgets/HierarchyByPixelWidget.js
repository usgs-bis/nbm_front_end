'use strict';

/**
 * Hierarchy by pixel Widget/Table object.
 * @param {*} chartData - chart data from the server
 * @constructor
 */
var HierarchyByPixelWidget = function(chartData) {
    var hierarchy;
    var newHierarchy;
    this.chartData = chartData;
    console.log("Chartdata: ", chartData);
    console.log(chartData.hierarchy);

    this.getHtml = function () {

    };

    this.getHtml = function() {
        var html = '';
        hierarchy = chartData.hierarchy;
        for(var i = 0; i < hierarchy.length; i++) {
            var level = hierarchy[i];
            //data is returned from lowest hierarchy level (ecological system) to highest (class) while bioscape lists them in opposite order
            level.isOn = ((hierarchy.length - 1) - i) == chartData.layerIndex;
            level.isLast = i == hierarchy.length - 1;
            if(i == 0) {
                html = getHtmlFromJsRenderTemplate('#identifyUnitTemplate', level);
            } else {
                level.additionalHtml = html;
                html = getHtmlFromJsRenderTemplate('#identifyUnitTemplate', level);
            }
        }

        html = '<div style="border: 1px solid rgba(245,245,245,.2); background: rgba(30,30,35,.5); border-radius: 1em;">' + html + '</div>';

        return html;
    };

    this.getPdfLayout = function() {
        var content = [];

        for(var i = hierarchy.length - 1; i > -1; i--) {
            var level = hierarchy[i];
            //data is returned from lowest hierarchy level (ecological system) to highest (class) while bioscape lists them in opposite order
            level.isOn = ((hierarchy.length - 1) - i) == chartData.layerIndex;

            var indent = 5 * (hierarchy.length - 1 - i);

            content.push({
                columns: [
                    {
                        width: "100%",
                        text: level.type + ": " + level.title,
                        bold: level.isOn,
                        margin: [indent, 0, 0, 0],
                        fontSize: 12
                    },
                    {
                        width: "0%",
                        text: ""
                    }
                ]
            });

            content.push({
                columns: [
                    {
                        width: "100%",
                        text: level.description,
                        margin: [indent + 10, 0, 0, 0],
                        fontSize: 10
                    },
                    {
                        width: "0%",
                        text: ""
                    }
                ]
            });
        }

        return {
            content: content,
            charts: []
        }
    };

    this.initializeWidget = function() {
        var that = this;
        // console.log(chartData);
        console.log(that.bap.actionRef.result.geojson.properties[that.bap.actionRef.lookupProperty]);

        var elasticQuery = {
            "query" : {
                "term" : {
                    "properties.gid": that.bap.actionRef.result.geojson.properties[that.bap.actionRef.lookupProperty]
                }
            }
        };

        var testElastic = "http://localhost:8080/elastic/search?index=bcbapi&type=nvcs_hierarchy&q=" + encodeURI(JSON.stringify(elasticQuery));
        $.getJSON(testElastic, function (data) {
            console.log("DATA:", data);
        });
    };
};
