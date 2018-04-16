'use strict';

var NFHPDisturbanceWidget = function (chart) {
    let that = this
    let config = chart;
    let rows = [];
   

    this.initializeWidget = function () {
        
        let elasticQuery = {
            "from": 0, "size": 500,
            "sort": [
                { "properties.gid": { "order": "asc", "unmapped_type": "integer" } }
            ],
            "query": { "match_all": {} }
        };
        let url = config.elasticEndpointDistVariables  + JSON.stringify(elasticQuery);
        $.getJSON(url)
            .done(function (data) {
                if (data.error) {
                    console.log("An Error Has Occured")
                }
                else if (data.success.hits.hits.length) {
                    data = data.success.hits.hits
                    let allRows = {}
                    data.map(d => {
                        let r = {
                            disturbance: d._source.properties.disturbance,
                            local_catchment: "",
                            network_catchment: "",
                            local_buffer: "",
                            network_buffer: "",
                        }
                        allRows[d._source.properties.disturbance] = r
                    })

                    let locationData = getLocation()
                    locationData.then(function (loc) {
                        loc = loc.success.hits.hits[0]._source.properties
                        that.placeName = loc.place_name
                        data.map(d => {
                            let scale = d._source.properties.scale.replace(/ /g, "_");
                            let dist = d._source.properties.disturbance
                            allRows[dist][scale] = d._source.properties.tested ? "" : "NT"
                            if (scale == 'local_catchment') {
                                allRows[dist][scale] = cleanData(loc.lc_list_dist).includes(dist) ? 'Significant' : allRows[dist][scale]
                            }
                            else if (scale == 'network_catchment') {
                                allRows[dist][scale] = cleanData(loc.nc_list_dist).includes(dist) ? 'Significant' : allRows[dist][scale]
                            }
                            else if (scale == 'local_buffer') {
                                allRows[dist][scale] = cleanData(loc.lb_list_dist).includes(dist) ? 'Significant' : allRows[dist][scale]
                            }
                            else if (scale == 'network_buffer') {
                                allRows[dist][scale] = cleanData(loc.nb_list_dist).includes(dist) ? 'Significant' : allRows[dist][scale]
                            }

                        })

                        Object.getOwnPropertyNames(allRows).map(r => {
                            rows.push(allRows[r])
                        })
                        buildChart(chart)
                    })

                }
                else {
                    console.log("The Querry Returned No Data")
                }


            })
            .fail(function () {
                console.log("An Error Has Occured")
            });
    }



     this.getHtml = function () {
        let e = {
            error: "An Error has occred. Unable to retrieve data for this widget.",
            title: "Disturbances Influencing Risk to Fish Habitat Condition",
            id: that.bap.id,
            bap: "NFHPD"
        }
        let html = getHtmlFromJsRenderTemplate('#widgetErrorInfoTitle', e)
        return html
    }


    this.getPdfLayout = function () {
        var content = [];

        content.push({
            text: config.description, style: ['bapContent', 'subtitle']
        });

        content.push(
            {
                columns: [
                    {
                        alignment: "left",
                        width: "20%",
                        text: that.viewModel.col0,
                        bold: true,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: that.viewModel.col1,
                        bold: true,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: that.viewModel.col0,
                        bold: true,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: that.viewModel.col0,
                        bold: true,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: that.viewModel.col0,
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
                        width: "20%",
                        text: rows[j].disturbance,
                        bold: false,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: rows[j].local_catchment,
                        bold: false,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: rows[j].network_catchment,
                        bold: false,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: rows[j].local_buffer,
                        bold: false,
                        fontSize: 12
                    },
                    {
                        alignment: "left",
                        width: "20%",
                        text: rows[j].network_buffer,
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


    function buildChart(chart) {
        that.bap.rawJson["NFHPDisturbance"] = rows;
        that.viewModel = {
            bapID: that.bap.id,
            title: `Disturbances Influencing Risk to Fish Habitat Condition in ${that.placeName}`,
            //description: config.description,
            col0: "Disturbance Variable",
            col1: "Local Catchment",
            col2: "Network Catchment",
            col3: "Local Buffer",
            col4: "Network Buffer",
            rows: rows
        };
        let html = getHtmlFromJsRenderTemplate('#NFHPTableTemplate', that.viewModel)
        $("#" + that.bap.id + "NFHPDerror").remove()
        $("#" + that.bap.id + "BAP").append(html)
        var tableRows =  $("#" + that.bap.id + "BAP").find('.NFHPTable > tbody > tr > td')
        for (let tRow of tableRows){
            if(tRow.innerText=="Significant"){
                tRow.style.color = 'rgb(243, 243, 243)'; 
            }
        }
        
    }



    function getLocation() {
        let lookUpProp = that.bap.actionRef.placeNameProperty;
        let placeName = that.bap.actionRef.result.geojson.properties[lookUpProp];
        let lookupColumn = `properties.${config.lookupColumn}`;

        let elasticQuery = {
            "query": {
                "match_phrase": {}
            }
        };
        elasticQuery['query']['match_phrase'][lookupColumn] = placeName

        let url = config.elasticEndpoint + JSON.stringify(elasticQuery);
        return $.getJSON(url)
            .done(function (data) {
                if (data.error) {
                    console.log("An Error Has Occured")
                }
                else if (data.success.hits.hits.length) {
                    return Promise.resolve();
                }
                else {
                    console.log("The Querry Returned No Data")
                }


            })
            .fail(function () {
                console.log("An Error Has Occured")
            });
    }

    function cleanData(data) {
        let set_data = []
        data = data.replace(/{/g, '')
        data = data.replace(/}/g, '')
        data = data.replace(/"/g, '')

        for (let word of data.split(',')) {
            if (!['No limiting disturbace', 'No limiting disturbance', 'No limiting disurbance'].includes(word)) {

                if (['CERCLIS site denistyLIS site density', 'CERCLIS site density'].includes(word)) {
                    word = 'CERCLIS site density'
                }
                else if (['COAL', 'Coal mine density mine density', 'Coal mine density'].includes(word)) {
                    word = 'Coal mine density'
                }
                else if (['Cultivated Cultivated cropss', 'Cultivated crop', 'Cultivated crops', 'Cultivated crop density', 'Cultviated crops', 'Cultviated crops'].includes(word)) {
                    word = 'Cultivated crops'
                }
                else if (['Downstream mainstem dam density.1', 'Downstream maistem dam density', 'Downstream mainstem dam density'].includes(word)) {
                    word = 'Downstream mainstem dam density'
                }
                else if (['High intenisty urban', 'High intensity urban ', 'High intensity urban'].includes(word)) {
                    word = 'High intensity urban'
                }
                else if (['Impervious Surface', 'Impervious surfaceervious surface', 'Impervious surface'].includes(word)) {
                    word = 'Impervious surface'
                }
                else if (['Industrial water withdawal'].includes(word)) {
                    word = 'Industrial water withdrawal'
                }
                else if (['Pasture', 'PastureURE'].includes(word)) {
                    word = 'Pasture and hay'
                }
                else if (['TOTWW', 'Total water withdrawal'].includes(word)) {
                    word = 'Total water withdrawal'
                }
                else if (['TRI site denisty', 'TRI site density'].includes(word)) {
                    word = 'TRI site density'
                }
                else if (['Upstream network dam density'].includes(word)) {
                    word = 'Upstream mainstem dam density'
                }
            }

            set_data.push(word)
        }
        return set_data
    }

};
