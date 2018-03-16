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

    $("#unit_info_search").show().prepend(this.poi.getSearchButton());
    ActionHandler.call(this, config.actionConfig, layer);
};

SearchActionHandler.prototype.bestGuessFields = function (bap) {
    if (!this.feature || !this.feature.geojson || !this.feature.geojson.properties) return;
    bap.config.title = this.poi.selectedName;
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
                that.bestGuessFields(bap);
            }

            bap.initializeBAP(headerBapId);
            that.addHeaderBaptoSC(bap);
            return Promise.resolve();
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
                    tempBap = new BAP({id: bapId});
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
                                        var bap = that.getBapValue(data.id);
                                        bap.reconstruct(data, true);

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
                            bap.reconstruct(data, true);

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
    this.geojson = this.poi.polygon.geometry;
    this.geojson.crs = {"type":"name","properties":{"name":"EPSG:4326"}};

    this.result = {geojson:this.poi.polygon};

    if (this.geojson.coordinates[0].length === 0) return Promise.resolve();

    this.feature = new Feature(this.poi.polygon, undefined, "", false);
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
    // this.elasticEndpoint = "http://34.229.92.5/api/v1/elasticsearch/search/jjuszakusgsgov/public/colorado_padus2_dissolve/_search?q=";
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
            this.clearSearchButton.show();
            $(".googleResults").remove();
        }
    }

};

PlaceOfInterestSearch.prototype.submitSearch = function () {
    var text = this.searchButton.val();
    if (text && !this.searching) {
        // this.searching = true;
        this.clearSearchButton.text("Searching...");
        // actionHandlerHelper.cleanUp(true);
        this.lookup(text);
    }
};

PlaceOfInterestSearch.prototype.clearSearch = function () {
    this.searchButton.val("");
    $(".googleResults").remove();
    this.clearSearchButton.hide();
};

// This will need to be rewritten to look at the right gc2 db and maybe make elastic search.
PlaceOfInterestSearch.prototype.lookup = function (text) {
    var elasticQuery = {
        "query" : {
            "multi_match" : {
                "fields" : ["properties." + this.lookupProperty],
                "query" : text,
                "type" : "phrase_prefix"
            }
        }
    };

    var that = this;
    this.clearSearchButton.show();
    $(".googleResults").remove();
    var testElastic = this.elasticEndpoint + JSON.stringify(elasticQuery);
    $.getJSON(testElastic, function (data) {
        if (that.searchButton.val() !== text) return;
        that.searching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.hits ) {
            var added = [];
            data.hits.hits.sort(function (a, b) {return b._score-a._score});
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
    this.id = result._source.properties.gid;
    this.name = result._source.properties[searchParent.lookupProperty];
    this.searchParent = searchParent;
    this.htmlElement = $('<a href="#" class="list-group-item googleResults">\n' +
        '    <h4 class="list-group-item-heading">' + this.name + '</h4>\n'
        +
        '  </a>');
    this.initialize();
};

SearchResult.prototype.initialize = function () {
    var that = this;
    this.htmlElement.on("click", function (event) {
        var elem = that.htmlElement[0];
        var query = elem.firstElementChild.innerText;
        event.preventDefault();
        $(".list-group-item").removeClass("active");
        that.htmlElement.addClass("active");
        that.getSelectedUnit(query);
        //    that.panTo();
    });
};
SearchResult.prototype.getSelectedUnit = function (query){
    // var elasticQuery = {
    //     "query" : {
    //         "multi_match" : {
    //             "fields" : ["properties.gid"],
    //             "query" : this.id,
    //             "type": "phrase"
    //         }
    //     }
    // };

    var that = this;
    var selectShape = "" + this.searchParent.sqlEndpoint + this.id;
    $.getJSON(selectShape, function (data) {
        that.searchParent.selectedId = that.id;
        that.searchParent.selectedName = that.name;
        that.searchParent.polygon = data.features[0];
        actionHandlerHelper.handleSearchActions();
    });

};
