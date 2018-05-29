'use strict';

/**
 * Hierarchy by pixel Widget/Table object.
 * @param {*} chartData - chart data from the server
 * @constructor
 */
var HBPElasticWidget = function (chartData, bap) {
   
    this.config = chartData;
    var hierarchy = [];
    this.bap = bap
    this.level = 0
    let that = this;

    this.getHtml = function () {
        return getHtmlFromJsRenderTemplate('#pixelHierarchyPlaceholder', { id: that.bap.id });
    };

    this.getInitializedHtml = function () {
        var html = '';
        for (var i = 0; i < hierarchy.length; i++) {
            var level = hierarchy[i];
            //data is returned from lowest hierarchy level (ecological system) to highest (class) while bioscape lists them in opposite order
            level.isOn = this.level == ((hierarchy.length - 1) - i);
            level.isLast = i === hierarchy.length - 1;
            if (i === 0) {
                level.url = that.elasticUrl;
                html = getHtmlFromJsRenderTemplate('#identifyUnitTemplate', level);
            } else {
                level.additionalHtml = html;
                html = getHtmlFromJsRenderTemplate('#identifyUnitTemplate', level);
            }
        }

        html = '<div style="border: 1px solid rgba(245,245,245,.2); background: rgba(30,30,35,.5); border-radius: 1em;">' + html +
            `</div> <div style="margin-top: 40px;" id ="hierarchyTable${that.bap.id}"></div>`;

        return html;
    };

    this.getPdfLayout = function () {
        var content = [];

        for (var i = hierarchy.length - 1; i > -1; i--) {
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

    this.reformatData = function (obj) {
        var prefixes = [
            "ecosystem_",
            "group_",
            "macrogroup_",
            "division_",
            "formation_",
            "subclass_",
            "class_"
        ];

        var levels = [];
        that.config.layerIndex = that.bap.actionRef.updatedParams.layerLevel;

        for (var i = 0; i < prefixes.length; i++) {
            var prefix = prefixes[i];
            levels.push({
                id: "hierarchyLevel" + i,
                code: obj[prefix + "code"],
                description: obj[prefix + "description"],
                title: obj[prefix + "title"],
                type: obj[prefix + "type"]
            });
        }
        hierarchy = levels;
    };

  
    this.initializeWidget = function(){
        this.getNewData()
        bindLayers()
    }

    this.getNewData = function () {
        var that = this;

        var elasticQuery = {
            "query": {
                "term": {}
            }
        };

        elasticQuery["query"]["term"][this.config.elasticTerm] = that.bap.actionRef.result.geojson.properties[that.bap.actionRef.lookupProperty];

        that.elasticUrl = this.config.elasticUrl + encodeURI(JSON.stringify(elasticQuery));
        $.getJSON(that.elasticUrl, function (data) {
            if (data.error) {
                console.log("An Error Has Occured")
            }
            else if (data.success.hits.hits.length) {
                var hit = data["success"]["hits"]["hits"][0]["_source"]["properties"];
                that.reformatData(hit);
                that.bap.rawJson = hit;
                that.reInitilize()
            }

            else {
                console.log("The Querry Returned No Data")
            }
        });
    };

    function bindClicks() {
        $(".hierarchyExpanders").on('click', function () {
            var id = $(this).data('section');
            toggleContainer(id);
        });
    };

    function bindLayers() {
        let layers = that.bap.GetBapLayers()
        $.each(layers, function (index, layer) {
            $(`#${that.bap.id}BAP #toggleLayer${layer.id}`).change(function () {
                    that.level = layer.actionConfig.additionalParams.layerLevel
                    that.reInitilize()
            })
        })
    }

    this.reInitilize = function () {
        let initializedPackage = that.getInitializedHtml();
        $("#hierarchyChart" + that.bap.id).html(initializedPackage);
        bindClicks()
    }

};
