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
    this.retry = true;

    $("#unit_info_search").show().prepend(this.poi.getSearchButton());
    if (config.actionConfig.clickToSearch) {
        let that = this
        //$("#unit_info_click_search_div").show()
        $('#unit_info_click_search').click(function () {
            if ($(this).is(':checked')) {
                that.clickToSearch = true
            } else {
                that.clickToSearch = false
            }
        });
    }
    ActionHandler.call(this, config.actionConfig, layer);
};


inherit(ActionHandler, SearchActionHandler);

SearchActionHandler.prototype.getPOI = function () {
    return this.poi
}


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
        actionHandlerHelper.sc.featureValue = this.poi.selectedName;//that.result.geojson.properties[that.lookupProperty];
    }

    $.each(additionalParams, function (index, obj) {
        $.each(obj, function (key, value) {
            myMap[key] = value;
        });
    });

    var bap = new HeaderBAP({}, headerBapId);
    bap.requestOptions = myMap;
    bap.showSpinner();
    return sendJsonAjaxRequest(myServer + "/bap/get", myMap)
        .then(function (myJson) {
            if (myJson.error) {
                console.log("Got an error: ", myJson);
            }
            that.spinner.remove();
            bap.config = myJson;
            bap.sbId = myJson.id;
            bap.featureValue = myJson.featureValue;

            if (myJson.featureInfoBap) {
                //that.bestGuessFields(bap);
                bap.config.title = that.poi.selectedName;
                bap.config.acres = that.poi.selectedArea;
                bap.config.type = that.poi.selectedType;
            }

            bap.initializeBAP(headerBapId);
            that.addHeaderBaptoSC(bap);
            return Promise.resolve();
        })
        .catch(function (ex) {
            console.log("Getting an error", ex);
        });
};

/**
 * Creates the BAPs associated with this action, and creates a pseudo feature. The pseudo feature is basically only
 * used at this point with the BoxAndWhiskerAnalysis.
 */
SearchActionHandler.prototype.processBaps = function (additionalParams) {
    var gj = { geometry: this.geojson };
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
                    tempBap = new BAP({ id: bapId }, false, that);
                    that.setBapValue(bapId, tempBap);
                }

                var myMap = {};
                myMap.id = bapId;
                $.each(additionalParams, function (index, obj) {
                    $.each(obj, function (key, value) {
                        myMap[key] = value;
                    });
                });

                myMap.sbId = bapId;
                myMap.featureValue = "not really used anymore in this action, but should not be null"

                return that.sendPostRequest(myServer + "/bap/get", myMap)
                    .then(function (data) {
                        if (data.error) {
                            console.log("Got an error: ", data);
                            showErrorDialog('There was an error analysing this Area of Interest. ' +
                                'Reselect the A.O.I. to reload all analysis packages. ', false);
                            bioScape.bapLoading(data.requestParams.id, false)
                            return Promise.resolve();
                        }
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

    if (this.config.clickToSearch && isHeader.lat && isHeader.lng) {
        if (this.clickToSearch) {
            PlaceOfInterestClick(isHeader, this.poi)
        }
        return Promise.resolve();
    }

    this.geojson = this.poi.polygon.geometry;
    this.geojson.crs = { "type": "name", "properties": { "name": "EPSG:4326" } };

    this.result = { geojson: this.poi.polygon };

    if (this.geojson.coordinates[0].length === 0) return Promise.resolve();

    // OLD WAY, SPLITTING GEOM ON THE 180
    // this.feature = new Feature(this.poi.polygon, undefined, "", undefined);
    // this.feature.show();
    
    let polyLineCollection = [];
    let polyLineCollectionOtherWorld = [];
    let edgeOfMap = 10 
    let leftEdge=false // close to left edge
    let rightEdge = false // close to right edge

    // convert 
    this.geojson.coordinates.forEach(feature => {
        feature.forEach(polygon => {
            let lineCoord = {
                "type": "LineString",
                "coordinates": []
            }
            let lineCoordCopy = {
                "type": "LineString",
                "coordinates": []
            }
            let crossed22 = false
            for(let i=0; i < polygon.length; i++){
                let coordinates = polygon[i]
                if ((coordinates[0] < -179.99 || coordinates[0] > 179.99) && lineCoord.coordinates.length) {
                    if(lineCoord.coordinates.length > 1){
                        polyLineCollection.push(lineCoord)
                        if (crossed22) {
                            lineCoordCopy = {
                                "type": "LineString",
                                "coordinates": []
                            }
                            lineCoord.coordinates.forEach(coordinates => {
                                lineCoordCopy.coordinates.push([coordinates[0] - 360, coordinates[1]])
                            })
                            polyLineCollectionOtherWorld.push(lineCoordCopy)
                        }
                    }
                    lineCoord = {
                        "type": "LineString",
                        "coordinates": []
                    }
                }
                if (coordinates[0] > -179.99 && coordinates[0] < 179.99) {
                    lineCoord.coordinates.push(coordinates)
                    if (coordinates[0] > 22.5) crossed22 = true
                    if (coordinates[0] > 180 - edgeOfMap) rightEdge = true
                    if (coordinates[0] < -180 + edgeOfMap) leftEdge = true
                }
                else{
                    if(i+1 < polygon.length && polygon[i+1][0] > -179.99 && polygon[i+1][0] < 179.99){
                        lineCoord.coordinates.push(coordinates)
                    }
                }
    
            }
            polyLineCollection.push(lineCoord)
            if (crossed22) {
                lineCoordCopy = {
                    "type": "LineString",
                    "coordinates": []
                }
                lineCoord.coordinates.forEach(coordinates => {
                    lineCoordCopy.coordinates.push([coordinates[0] - 360, coordinates[1]])
                })
                polyLineCollectionOtherWorld.push(lineCoordCopy)
            }
        })
    });

        if(rightEdge && leftEdge){ // if its close to both edges draw on both sides of map
        polyLineCollectionOtherWorld.forEach(line =>{
            polyLineCollection.push(line)
        })
    }

    var featureStyle = {
        "color": "black",
        "weight": 4,
        "opacity": 1,
    };
    var featureCopyStyle = {
        "color": "red",
        "weight": 2,
        "opacity": 1,
    };

    this.feature = L.geoJSON(polyLineCollection, {
        style: featureStyle
    })

    this.featureCopy = L.geoJSON(polyLineCollection, {
        style: featureCopyStyle
    })

    this.feature.addTo(map);
    this.featureCopy.addTo(map);



    try {
        if (!isVerticalOrientation()) {
            centerMapRight(that.feature.getBounds());
        } else {
            centerMapBottom(that.feature.getBounds());
        }
    } catch (ex) {
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
        this.featureCopy.remove();
        this.feature = undefined;
        this.featureCopy = undefined;
    }

    if (this.result) {
        this.result = undefined;
    }

    this.poi.clearSearch();

    this.cleanUpBaps();
};


var PlaceOfInterestClick = function (latlng, that) {

    ///clicking west most alaska
    if (latlng.lng < - 180) {
        latlng.lng += 360
    }

    $(".googleResults").remove();
    that.clearSearchButton.html('Searching...<i style="float:right;"class="fa fa-spinner fa-pulse"></i>');
    that.searchButton.focus()
    let url = that.sfrPoint + `lat=${latlng.lat}&lng=${latlng.lng}`
    $.getJSON(url, function (data) {
        that.poisearching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.hits.hits.length) {
            data.hits.hits.sort(function (a, b) { return b._score - a._score });
            $.each(data.hits.hits, function (index, obj) {
                var result = new SearchResult(obj, that);
                that.resultsElement.append(result.htmlElement);
            });
        } else {
            that.resultsElement.append(that.noResults);
        }
    });

}

var PlaceOfInterestSearch = function (config, parent) {
    this.parent = parent;
    this.lookupProperty = config.actionConfig.lookupProperty;
    this.searchButton = $('<input type="text" style="position: relative; top: 0;" class="form-control" placeholder="Search for a place of interest or click on the map" />');
    this.resultsElement = $('#searchResults');
    this.clearSearchButton = $('<a style="display: none;" href="#" class="list-group-item">Clear Search</a>');
    this.noResults = $('<a href="#" class="list-group-item list-group-item-danger googleResults">No Results</a>');
    this.searching = false;
    this.sfrPoint = config.sfrPoint;
    this.sfrText = config.sfrText;
    this.sfrFeature = config.sfrFeature;
    this.polygon = undefined;
    this.selectedId = undefined;
    this.selectedName = undefined;
};

PlaceOfInterestSearch.prototype.initialize = function () {
    var that = this;
    this.searchButton.on("keypress", function (event) {
        that.onKeyPress(event);
    });

    this.searchButton.on("keyup", function (event) {
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

PlaceOfInterestSearch.prototype.onKeyUp = function (event) {
    var s = this.searchButton[0];
    if (s) {
        var cs = s.value.length;
        if (cs > 3) {
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


// Get the geometry from the index directly
PlaceOfInterestSearch.prototype.getSelectedGeometry = function (feature_id) {
    
    var selectShape = "" + this.sfrFeature + feature_id
    let that = this;

    $.getJSON(selectShape, function (data) {
        if(data.hits.hits.length){
            data = data.hits.hits[0]
            that.selectedId = data._source.properties.feature_id;
            that.selectedName = data._source.properties.feature_name;
            that.selectedType = data._source.properties.feature_class
            that.selectedArea = 0 //parseInt(data.features[0].properties.st_area) * 0.000247105;
            that.polygon = data._source;
            actionHandlerHelper.handleSearchActions();
            bioScape.resetState()
            updateUrlWithState();
        }
    })
}

PlaceOfInterestSearch.prototype.lookup = function (text) {

    var that = this;
    var url = this.sfrText + text

    $.getJSON(url, function (data) {
        if (that.searchButton.val() !== text) return;
        that.searching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.hits.hits.length) {
            var added = [];
            data.hits.hits.sort(function (a, b) { return b._score - a._score }); //sort by best match
            $.each(data.hits.hits, function (index, obj) {
                var result = new SearchResult(obj, that);
                that.resultsElement.append(result.htmlElement);
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
    this.type = result._source.properties.feature_class
    this.searchParent = searchParent;
    this.htmlElement = $('<a href="#" class="list-group-item googleResults">\n' +
        '    <h6 class="list-group-item-heading">' + this.name + '  (' + this.type + ')' + '</h6>\n'
        +
        '  </a>');
    this.initialize(result);
};

SearchResult.prototype.initialize = function (result) {
    var that = this;
    this.htmlElement.on("click", function (event) {

        event.preventDefault();
        $(".list-group-item").removeClass("active");
        that.htmlElement.addClass("active");
        that.searchParent.getSelectedGeometry(result._source.properties.feature_id);
    });
};

