'use strict';

/**
 * The action object for when polygons are submitted. Calls the parent ActionHandler object.
 * @param {Object} config - the actionConfig inside the bioscape for this layer
 * @param {Object} layer

 * @constructor
 */
var SearchActionHandler = function (config, layer) {
    this.geojson = undefined;
    this.poi = new PlaceOfInterestSearch(config, this);
    this.poi.initialize();
    this.clickToSearch = true

    $("#unit_info_search").show().prepend(this.poi.getSearchButton());
    if(config.actionConfig.clickToSearch){
        let that = this
        //$("#unit_info_click_search_div").show()
        $('#unit_info_click_search').click(function(){
            if($(this).is(':checked')){
                that.clickToSearch = true
            } else {
                that.clickToSearch = false
            }
        });
    }
    ActionHandler.call(this, config.actionConfig, layer);
};


inherit(ActionHandler, SearchActionHandler);

/**
 * The "header BAP" is treated a bit differently than the other BAPs since it is more basic data about a specified region
 * @param additionalParams
 * @param headerBapId
 * @returns {*}
 */
SearchActionHandler.prototype.processHeaderBap = function (additionalParams, headerBapId) {
    var that = this;
    // var gj = JSON.stringify(this.geojson);

    var myMap = {};
    myMap.id = this.headerBap;
    myMap.featureValue = {};//gj;

    if (this.synthesisComposition) {
        actionHandlerHelper.sc.featureValue =  this.poi.selectedName;//that.result.geojson.properties[that.lookupProperty];
    }

    $.each (additionalParams, function (index, obj) {
        $.each(obj, function (key, value) {
            myMap[key] = value;
        });
    });

    var bap = new HeaderBAP({},headerBapId);
    bap.requestOptions = myMap;
    bap.showSpinner();
    return sendJsonAjaxRequest(myServer + "/bap/get", myMap)
        .then(function (myJson) {
            that.spinner.remove();
            bap.config = myJson;
            bap.sbId = myJson.id;
            bap.featureValue = myJson.featureValue;

            if(myJson.featureInfoBap) {
                //that.bestGuessFields(bap);
                bap.config.title = that.poi.selectedName;
                bap.config.acres = that.poi.selectedArea;
                bap.config.type = that.poi.selectedType;
            }

            bap.initializeBAP(headerBapId);
            that.addHeaderBaptoSC(bap);
            return Promise.resolve();
        })
        .catch(function(ex) {
            console.log("Getting an error", ex);
        });
};

/**
 * Creates the BAPs associated with this action, and creates a pseudo feature. The pseudo feature is basically only
 * used at this point with the BoxAndWhiskerWidget.
 */
SearchActionHandler.prototype.processBaps = function (additionalParams) {
    var gj = {geometry: this.geojson};
    var that = this;

    var promises = [];

    return this.getSimplifiedGeojson(gj)
        .then(function (newGj) {
            var simplified = (newGj != gj);

            var bapsToProcess = that.getAllBapsToProcess();

            $.each(bapsToProcess, function (index, bapId) {
                var tempBap = that.getBapValue(bapId);

                if (tempBap) {
                    tempBap.setEmptyBap();
                } else {
                    tempBap = new BAP({id: bapId}, false, that);
                    that.setBapValue(bapId, tempBap);
                }

                var myMap = {};
                myMap.id = bapId;
                $.each (additionalParams, function (index, obj) {
                    $.each(obj, function (key, value) {
                        myMap[key] = value;
                    });
                });

                myMap.sbId = bapId;
                myMap.featureValue = JSON.stringify(newGj.geometry);

                if (myMap.featureValue.length > WAF_LIMIT) {
                    var token = Math.random().toString();
                    var numChunks = Math.floor(myMap.featureValue.length / WAF_LIMIT);

                    if (myMap.featureValue.length % WAF_LIMIT == 0) {
                        numChunks--;
                    }

                    if (DEBUG_MODE) console.log("Number of early chunks: ", numChunks);

                    var tempPromises = [];
                    var ok = true;

                    for (var i = 0; i < numChunks; i++) {
                        var sentMap = {
                            chunkToken: token,
                            numChunks: numChunks,
                            featureValue: myMap.featureValue.substring(i * WAF_LIMIT, (i + 1) * WAF_LIMIT),
                            index: i
                        };
                        tempPromises.push(that.sendPostRequest(myServer + "/bap/sendChunk", sentMap)
                            .then(function (chunkReturn) {
                                if (!chunkReturn.success) {
                                    console.log("Got an error in a chunk");
                                    ok = false;
                                }
                                Promise.resolve();
                            }));
                    }

                    promises.push(Promise.all(tempPromises)
                        .then(function () {
                            if (ok) {
                                myMap.chunkToken = token;
                                myMap.featureValue = myMap.featureValue.substring(numChunks * WAF_LIMIT, myMap.featureValue.length);
                                return that.sendPostRequest(myServer + "/bap/get", myMap)
                                    .then(function (data) {
                                        if(data.error) return Promise.resolve();
                                        var bap = that.getBapValue(data.id);
                                        bap.reconstruct(data, false);

                                        var feature = that.createPseudoFeature(newGj.geometry);
                                        feature.layer = that.layer;
                                        bap.feature = feature;
                                        bap.simplified = simplified;
                                        bap.gc2 = that.poi.sqlEndpoint;
                                        bap.gid = that.poi.selectedId;
                                        bap.initializeBAP();
                                        that.setBapValue(data.id, bap);
                                        return Promise.resolve();
                                    })
                                    .catch(function (ex) {
                                        console.log("Got an error", ex);
                                        return Promise.resolve();
                                    });
                            } else {
                                showErrorDialog('There was an error sending chunked geometry to the API. ' +
                                    'If the problem continues, please contact site admin', false);
                                return Promise.resolve();
                            }
                        }));
                } else {
                    if (DEBUG_MODE) console.log("Sending 1 request");
                    promises.push(that.sendPostRequest(myServer + "/bap/get", myMap)
                        .then(function(data) {
                            var bap = that.getBapValue(data.id);
                            bap.reconstruct(data, false);

                            var feature = that.createPseudoFeature(newGj.geometry);
                            feature.layer = that.layer;
                            bap.feature = feature;
                            bap.simplified = simplified;
                            bap.gc2 = that.poi.sqlEndpoint;
                            bap.gid = that.poi.selectedId;
                            bap.initializeBAP();
                            that.setBapValue(data.id, bap);
                            return Promise.resolve();
                        })
                        .catch(function (ex) {
                            console.log("Got an error", ex);
                            return Promise.resolve();
                        }));
                }
            });

            return Promise.all(promises);
        });
};

/**
 * Sets this actions geojson object for use by its baps
 * @param isHeader
 * @param headerBapId
 */
SearchActionHandler.prototype.sendTriggerAction = function (isHeader, headerBapId) {
    var that = this;
    var promises = [];

    if(this.config.clickToSearch && isHeader.lat && isHeader.lng){
        if(this.clickToSearch){
            PlaceOfInterestClick(isHeader,this.poi)
        }
        return Promise.resolve();
    }

    this.geojson = this.poi.polygon.geometry;
    this.geojson.crs = {"type":"name","properties":{"name":"EPSG:4326"}};

    this.result = {geojson:this.poi.polygon};

    if (this.geojson.coordinates[0].length === 0) return Promise.resolve();

    this.feature = new Feature(this.poi.polygon, undefined, "", undefined);
    this.feature.show();

    try {
        if (!isVerticalOrientation()) {
            centerMapRight(that.feature.getLeafetFeatureBounds());
        } else {
            centerMapBottom(that.feature.getLeafetFeatureBounds());
        }
    } catch(ex) {
        console.log("Error zooming to feature", ex);
    }

    if (isHeader) {
        if (!actionHandlerHelper.headerSent) {
            promises.push(this.processHeaderBap({}, headerBapId));
            promises.push(this.processBaps({}));
            actionHandlerHelper.headerSent = true;
        }
    } else {
        promises.push(this.processBaps({}));
    }

    return Promise.all(promises);
};

SearchActionHandler.prototype.cleanUp = function () {
    this.geojson = undefined;
    if (this.feature) {
        this.feature.remove();
        this.feature = undefined;
    }

    if (this.result) {
        this.result = undefined;
    }

    this.poi.clearSearch();

    this.cleanUpBaps();
};


var PlaceOfInterestClick = function (latlng, that) {

    ///clicking west most alaska
    if(latlng.lng < - 180){
        latlng.lng += 360
    }
    let query = getElasticGeoQuery(latlng)

    //do the lookup then put the results in the drop down
  
    $(".googleResults").remove();
    that.clearSearchButton.html('Searching...<i style="float:right;"class="fa fa-spinner fa-pulse"></i>');
    //that.clearSearchButton.show();
    that.searchButton.focus()
    $.getJSON(that.elasticEndpoint + query, function (data) {
        //that.clearSearchButton.show();
        that.poisearching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.hits ) {
            var added = [];
            data.hits.hits.sort(function (a, b) {return b._score-a._score});
            $.each (data.hits.hits, function (index, obj) {
                var result = new SearchResult(obj, that);
                that.resultsElement.append(result.htmlElement);
            });
        } else {
            that.resultsElement.append(that.noResults);
        }
    });

    function  getElasticGeoQuery(latLng) {
        var qJson = {
            "from": 0, "size": 15,
            "_source": "properties.*",
            "query":{
                "bool": {
                    "must": {
                        "match_all": {}
                    },
                    "filter": {
                        "geo_shape": {
                            "geometry": {
                                "shape": {
                                    "type": "point",
                                    "coordinates" : [latLng.lng, latLng.lat]
                                },
                                "relation": "intersects"
                            }
                        }
                    }
                }
            }
        };
    
        return JSON.stringify(qJson)
    }
}

var PlaceOfInterestSearch = function (config, parent) {
    this.parent = parent;
    this.lookupProperty = config.actionConfig.lookupProperty;
    this.searchButton = $('<input type="text" style="position: relative; top: 0;" class="form-control" placeholder="Search for Place of Interest" />');
    this.resultsElement = $('#searchResults');
    this.clearSearchButton = $('<a style="display: none;" href="#" class="list-group-item">Clear Search</a>');
    this.noResults = $('<a href="#" class="list-group-item list-group-item-danger googleResults">No Results</a>');
    this.searching = false;
    this.elasticEndpoint = config.elasticEndpoint;
    this.sqlEndpoint = config.sqlEndpoint;
    this.polygon = undefined;
    this.selectedId = undefined;
    this.selectedName = undefined;
    // this.geojson = undefined;
    // this.featureGroup = undefined;
};

PlaceOfInterestSearch.prototype.initialize = function () {
    var that = this;
    this.searchButton.on("keypress", function (event) {
        that.onKeyPress(event);
    });

    this.searchButton.on("keyup", function(event){
        that.onKeyUp(event);
    });

    this.clearSearchButton.on("click", function (event) {
        event.preventDefault();
        that.clearSearch();
    });

    this.noResults.on("click", function (event) {
        event.preventDefault();
    });

    this.resultsElement.append(this.clearSearchButton);    
};

PlaceOfInterestSearch.prototype.onKeyPress = function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        this.submitSearch();
    }
};

PlaceOfInterestSearch.prototype.onKeyUp = function(event){
    var s = this.searchButton[0];
    if (s){
        var cs = s.value.length;
        if (cs > 3){
            this.submitSearch();
        } else if (cs === 0) {
            this.clearSearch();
        } else {
            //this.clearSearchButton.show();
            $(".googleResults").remove();
        }
    }

};

PlaceOfInterestSearch.prototype.submitSearch = function () {
    var text = this.searchButton.val();
    if (text && !this.searching) {
        // this.searching = true;
        this.clearSearchButton.html('Searching...<i style="float:right;"class="fa fa-spinner fa-pulse"></i>');
        // actionHandlerHelper.cleanUp(true);
        this.lookup(text);
    }
};

PlaceOfInterestSearch.prototype.clearSearch = function () {
    this.searchButton.val("");
    $(".googleResults").remove();
    this.clearSearchButton.hide();
    $(".searchRessultsBox").hide()
};


// hit sql endpoint
PlaceOfInterestSearch.prototype.getSelectedUnit = function (id) {
    var selectShape = "" + this.sqlEndpoint + id
    let that = this;
    $.getJSON(selectShape, function (data) {
        that.selectedId = id;
        that.selectedName = data.features[0].properties.place_name;
        that.selectedType = data.features[0].properties.ftype.replace("_", " ");;
        that.selectedArea = parseInt(data.features[0].properties.st_area) * 0.000247105;
        that.polygon = data.features[0];
        actionHandlerHelper.handleSearchActions();
        bioScape.resetState()
        updateUrlWithState();
    })

}
// This will need to be rewritten to look at the right gc2 db and maybe make elastic search.
PlaceOfInterestSearch.prototype.lookup = function (text) {
    var elasticQuery = 
        {
            "from": 0, "size": 100,
            "_source": "properties.*",
            "query": {
                "match_phrase_prefix" : {
                }
            }
        }
        elasticQuery.query.match_phrase_prefix[`properties.${this.lookupProperty}`] = {"query":text,'max_expansions':100};
        
        
    var that = this;
    //this.clearSearchButton.show();
    $(".googleResults").remove();
    var testElastic = this.elasticEndpoint + JSON.stringify(elasticQuery);
    $.getJSON(testElastic, function (data) {
        if (that.searchButton.val() !== text) return;
        that.searching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.hits ) {
            var added = [];
            data.hits.hits.sort(function (a, b) {return b._score-a._score}); //sort by best match
            // data.hits.hits.sort(function (a, b) {
            //      if(a._source.properties.place_name < b._source.properties.place_name) return -1
            //      if(a._source.properties.place_name > b._source.properties.place_name) return 1
            //      return 0
            //     }); // sort alpha
            $.each (data.hits.hits, function (index, obj) {
                // if (added.indexOf(obj._source.properties.unit_nm) === -1) {
                var result = new SearchResult(obj, that);
                that.resultsElement.append(result.htmlElement);
                // added.push(obj._source.properties.unit_nm);
                // }
            });
        } else {
            that.resultsElement.append(that.noResults);
        }
    });
};

PlaceOfInterestSearch.prototype.getSearchButton = function () {
    return this.searchButton;
};

PlaceOfInterestSearch.prototype.getClearButton = function () {
    return this.clearSearchButton;
};


var SearchResult = function (result, searchParent) {
    $(".searchRessultsBox").show()
    this.id = result._source.properties.gid;
    this.name = result._source.properties[searchParent.lookupProperty];
    this.type = result._source.properties.ftype.replace('_',' ');
    this.searchParent = searchParent;
    this.htmlElement = $('<a href="#" class="list-group-item googleResults">\n' +
        '    <h6 class="list-group-item-heading">' + this.name + '  (' + this.type + ')'+'</h6>\n'
        +
        '  </a>');
    this.initialize();
};

SearchResult.prototype.initialize = function () {
    var that = this;
    this.htmlElement.on("click", function (event) {
        //var elem = that.htmlElement[0];
        //var query = elem.firstElementChild.innerText;
        event.preventDefault();
        $(".list-group-item").removeClass("active");
        that.htmlElement.addClass("active");
        that.searchParent.getSelectedUnit(that.id);
        //    that.panTo();
    });
};

