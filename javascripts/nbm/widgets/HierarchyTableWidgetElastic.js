'use strict';

var HierarchyTableWidgetElastic = function (chart, bap) {

    chart.data = {}
    this.bap = bap
    this.config = chart;
    let rows = [];
    let that = this
    this.level = 0



    function buildChart(chart) {
        $.each(chart.data, function (key, value) {
            rows.push({ text: key.substr(0, key.length - 2), area: formatArea(value.area) })
        });

        // let title = that.bap.actionRef.updatedParams.levelName
        let title = getLayerTitle(that.config.layerLevels.values[that.level])

        that.viewModel = {
            title: title ? title : that.config.title,
            description: `The data displayed in this summary table is based on the ${title ? title : ""} hierarchy level, as selected in the Bioscape.`,
            textHeader: chart.returnedValueText,
            areaHeader: chart.areaColumn.text,
            rows: rows
        };
        let html = getHtmlFromJsRenderTemplate('#hierarchyTableTemplate', that.viewModel)
        $("#hierarchyTable" + that.bap.id).html(html)
    }

    this.initializeWidget = function(){
        this.getNewData()
        bindLayers()
    }

    this.getNewData = function () {
        var elasticQuery = {
            "from": 0, "size": 50,
            "query": {
                "bool": {
                    "must": [
                    ]
                }
            }
        };

        let match = { match: {} }
        let val = that.bap.actionRef.result.geojson.properties[that.bap.actionRef.lookupProperty];
        match["match"][this.config.elasticTerm] = val
        elasticQuery["query"]["bool"]["must"].push(match);

        match = { match: {} }
        match["match"][this.config.layerLevels.column] = this.config.layerLevels.values[that.bap.actionRef.updatedParams.layerLevel || that.level]
        elasticQuery["query"]["bool"]["must"].push(match);



        that.elasticUrl = this.config.elasticUrl + encodeURI(JSON.stringify(elasticQuery));
        $.getJSON(that.elasticUrl)
            .done(function (data) {

                rows = []
                chart.data = {}
                if (data.error) {
                    console.log("An Error Has Occured")
                }
                else if (data.success.hits.hits.length) {
                    let count = 0;
                    let hits = data.success.hits.hits
                    hits.sort(function (a, b) {
                        return (a._source.properties.nvcs_name > b._source.properties.nvcs_name) ? 1 : ((b._source.properties.nvcs_name > a._source.properties.nvcs_name) ? -1 : 0);
                    });

                    for (let result of hits) {
                        let row = chart.data
                        let name = result._source.properties.nvcs_name + " " + count
                        row[name] = { id: that.bap.id + "Table" + count, area: result._source.properties.acres.toFixed(2).toString(), level: 0, parent: null }
                        count++;
                    }
                    that.bap.rawJson = rows;
                    buildChart(chart)

                }
                else {
                    console.log("The Querry Returned No Data")
                }


            })
            .fail(function () {
                console.log("An Error Has Occured")
            });
    };

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#hierarchyTablePlaceholder', { id: that.bap.id });
    };

    this.getPdfLayout = function () {
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
                        text: chart.returnedValueText,
                        bold: true,
                        fontSize: 12
                    },
                    {
                        alignment: "right",
                        width: "25%",
                        text: chart.areaColumn.text,
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

        return {
            content: content,
            charts: []
        };
    };

    function formatArea(area) {
        return area >= 1 ? formatAcres(Math.round(area)) : (area > 0 ? '< 1' : 0);
    }

    function bindLayers() {
        let layers = that.bap.GetBapLayers()
        $.each(layers, function (index, layer) {
            $(`#${that.bap.id}BAP #toggleLayer${layer.id}`).change(function(){
                if($(this).is(':checked')){
                    that.level = layer.actionConfig.additionalParams.layerLevel
                    that.getNewData()
                }
            })
        })
    }

    function getLayerTitle(level) {
        let layers = that.bap.GetBapLayers()
        let title = ""
        $.each(layers, function (index, layer) {
            if ((layer.actionConfig.additionalParams || {}).refName == level) {
                title = layer.actionConfig.additionalParams.levelName
            }
        })
        return title
    }
};