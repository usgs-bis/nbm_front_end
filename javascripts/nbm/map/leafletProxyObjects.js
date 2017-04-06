'use strict';
var LAT_MAX = 85;
var LAT_MIN = -60;
var MAP_COORDINATES_WIDTH = 360;
var MAP_OFFSET = 180;
var EDGE_OF_MAP_THRESHOLD = 35;
var MAP_ITITIAL_CENTER = [40,-95];
var MAP_INITIAL_ZOOM = 5;

L.LatLng.prototype.getLatForDisplay = function() {
    return getDisplay(this.lat);
};

L.LatLng.prototype.getLngForDisplay = function() {
    return getDisplay(this.lng);
};

function getDisplay(num) {
    return num.toFixed(5);
}

L.Map.include({
    getState: function() {
        var center = this.getCenter();
        return {
            zoom: this.getZoom(),
            center: center.lat + ',' + center.lng
        }
    }
});

/**
 * Binds functionality to the events we want to listen to.
 * @param {*} leafletLayer - the layer object appropriate for the service
 */
var bindTileLayerEvents = function(leafletLayer) {
    leafletLayer.on("tileloadstart", showSpinner);
    leafletLayer.on("load", hideSpinner);
};

/**
 * Leaflet map helper service.
 *
 * Public methods:
 * initializeMap() - start the leaflet map
 */
var LeafletMapService = (function (leafletMapService){
    /**
     * Creates the Leaflet map.
     */
    function initializeMap() {
        var southWest = L.latLng(-86, -270),
            northEast = L.latLng(86, 270),
            bounds = L.latLngBounds(southWest, northEast);//limit the area the user can view

        // var maxZoom = 15;
        // if (window.location.hostname.indexOf("igs") && window.location.hostname != "localhost") {
        //     maxZoom = 10;
        // }
        map = L.map('map', {
            maxBounds: bounds,
            minZoom: 2
            // maxZoom: maxZoom
        });

        map.setView(MAP_ITITIAL_CENTER, MAP_INITIAL_ZOOM);
        var scale = new Scale();
        updateLatLngDisplay(map.getCenter());
        map
            .on("click", function(d) {
                //do nothing if the user is selecting an area to zoom to or if the default was prevented
                if(d.originalEvent.shiftKey || d.originalEvent.defaultPrevented || drawing) {
                    return false;
                }
                actionHandlerHelper.handleEverything(d.latlng);
            })
            .on('zoomend', function () {
                map.getContainer().focus();
                toggleLegendCullButton();
                resetLegendCull();
                adjustLayersToZoom();
            })
            .on('move', function() {
                resetLegendCull();
                scale.update();
            })
            .on('mousemove', function(e) {
                updateLatLngDisplay(e.latlng);
            });

        map.createPane('180Line');
        map.getPane('180Line').style.zIndex = 475;
        var longitude180Line = L.WMS.overlay('https://my-beta.usgs.gov/geoserver/bcb/wms', {
            "format":"image/png",
            "layers":"long180",
            "transparent":true,
            "pane":"180Line"
        });
        map.addLayer(longitude180Line);

        map.createPane('featurePane');
        map.getPane('featurePane').style.zIndex = 425;

        map.createPane('summarizationPane');
        //put the summarization layer pane just above the overlay pane
        map.getPane('summarizationPane').style.zIndex = 402;
    }

    /**
     * Update the lat lng display.
     * @param {Object} latlng - L.LatLng
     */
    function updateLatLngDisplay(latlng) {
        $('#latCoordinates').text(latlng.getLatForDisplay());
        $('#lngCoordinates').text(latlng.getLngForDisplay());
    }

    /**
     * Turns layers on or off according to their availability.
     */
    function adjustLayersToZoom() {
        var sections = bioScape.getAllSections();
        sections.forEach(function(section) {
            var layers = section.getLayers();
            //loops through all of the layers in the section
            layers.forEach(function(layer) {
                if (!layer.updateAvailabilityAndReturnIsAvailable() && layer.isVisible()) {
                    layer.turnOffLayer(true);
                    layer.displayLayerHiddenWarning();
                } else if (layer.updateAvailabilityAndReturnIsAvailable() && layer.selected && !layer.isVisible()) {
                    layer.turnOnLayer();
                }
            });
        });
    }

    leafletMapService = {
        initializeMap: initializeMap
    };

    return leafletMapService;
})(LeafletMapService || {});

/**
 * This is our own wrapper around the leaflet L.marker class.
 * @param {Object} latLng - L.LatLng
 * @param {boolean} [overrideTranslationToMainMap] - if true the marker will be drawn where the user clicked no matter the coordinates,
 *  otherwise the marker and latLng are translated to real coordinates (i.e. between -180 and 180 degrees longitude) - optional
 * @constructor
 */
var Marker = function(latLng, overrideTranslationToMainMap) {
    this.trueLatLng = latLng;
    this.leafletMarker = undefined;
    this.latLng = getAdjustedLatLng(latLng, overrideTranslationToMainMap);

    this.dummyMarkers = new DummyLayers(function(direction) {
        var lng = this.latLng.lng + (direction * MAP_COORDINATES_WIDTH);
        return L.marker([this.latLng.lat,lng]);
    }, this);

    /**
     * Adjust the latLng so it is between -180 and 180 degrees.
     * @param {Object} latLng - L.LatLng
     * @param {boolean} [overrideTranslationToMainMap] - if true the marker will be drawn where the user clicked no matter the coordinates,
     *  otherwise the marker and latLng are translated to real coordinates (i.e. between -180 and 180 degrees longitude) - optional
     * @returns {Object} - L.LatLng
     */
    function getAdjustedLatLng(latLng, overrideTranslationToMainMap) {
        if(overrideTranslationToMainMap) {
            return latLng;
        }

        var subtractVal = (Math.floor((Math.abs(latLng.lng)+MAP_OFFSET) / MAP_COORDINATES_WIDTH) * (Math.abs(latLng.lng)/latLng.lng) * MAP_COORDINATES_WIDTH);
        var correctedMarkerLng = latLng.lng - subtractVal;//always put the marker on the main map from -180 to 180

        return L.latLng({lon: correctedMarkerLng, lat: latLng.lat});
    }

    /**
     * This callback is called when the user clicks the marker.
     * @callback markerOnClickCallback
     */
    /**
     * Add the marker and dummies to the map.
     * @param {markerOnClickCallback} onClick - callback called when the user clicks the marker
     */
    this.addToMap = function(onClick) {
        this.leafletMarker = L.marker(this.latLng).addTo(map);
        this.leafletMarker.on('click', onClick);
        this.dummyMarkers.addToMap();
    };

    /**
     * Remove the marker and dummies from the map.
     */
    this.remove = function() {
        this.leafletMarker.remove();
        this.dummyMarkers.removeFromMap();
    };

    /**
     * Get the latitude and longitude of the marker.
     * @returns {Object} - L.LatLng
     */
    this.getLatLng = function() {
        return this.leafletMarker.getLatLng();
    };
};

/**
 * This is our own wrapper around the leaflet L.geoJson class.
 * @param {*} geojson - geojson to create the object with
 * @param {Object} latLng - L.LatLng
 * @param {string} [color='#FF0000'] - color of the feature when drawn on the map - optional
 * @param {boolean} [displayFeatureNegative] - display negative
 * @constructor
 */
var Feature = function(geojson, latLng, color, displayFeatureNegative) {
    color = getValueOrDefault(color, '#FF0000');
    this.geojson = geojson;
    this.latLng = latLng;
    this.leafletFeature = getLeafletFeature(geojson, latLng, color, displayFeatureNegative);
    this.featureNegative = undefined;
    if (displayFeatureNegative) {
        this.featureNegative = getNegativeFeature(geojson);
    }
    this.outline = getOutlineFeature(this.leafletFeature.toGeoJSON(), displayFeatureNegative);

    this.dummyFeatures = new DummyLayers(function(direction) {
        var geojsonCopy = $.extend(true, {}, this.geojson);

        for (var j = 0; j < geojsonCopy.geometry.coordinates.length; j++) {
            var a0 = geojsonCopy.geometry.coordinates[j];
            for (var i = 0; i < a0.length; i++) {
                var c = a0[i];
                if (isNaN(c[0])) {
                    for (var k = 0; k < c.length; k++) {
                        var clng = c[k][0];
                        a0[i][k][0] = clng + (direction * MAP_COORDINATES_WIDTH);
                    }
                } else {
                    var lng = c[0];
                    a0[i][0] = lng + (direction * MAP_COORDINATES_WIDTH);
                }
            }
        }

        return getLGeoJson(geojsonCopy);
    }, this);

    /**
     * This callback is called when the user clicks the feature. The user's click event is passed in as an argument.
     * @callback onClickCallback
     * @param {Object} newClick - L.MouseEvent
     */
    /**
     * Display the created Leaflet feature and dummies on the map.
     * @param {onClickCallback} [onClick] - callback called when the user clicks the feature - optional
     */
    this.show = function(onClick) {
        this.leafletFeature
            .addTo(map);
        if (this.featureNegative) {
            this.featureNegative
                .addTo(map);
        }

        //centerMapRight(this.leafletFeature.getBounds());
        if(onClick) {
            this.leafletFeature
                .on('click', function (newClick) {
                    onClick(newClick);
                });
        }
        this.outline
            .addTo(map)
            .bringToBack();
        this.dummyFeatures.addToMap();
    };

    /**
     * Removes the feature and dummies from the map.
     */
    this.remove = function() {
        this.leafletFeature.remove();
        if (this.featureNegative) this.featureNegative.remove();
        this.outline.remove();
        this.dummyFeatures.removeFromMap();
    };

    /**
     * Gets the bounds of the leafletFeature.
     * @returns {Object} - L.Bounds
     */
    this.getLeafetFeatureBounds = function() {
        return this.leafletFeature.getBounds();
    };

    function getNegativeFeature (geojson) {
        var coordinates = geojson.geometry.coordinates;
        var darkPolygons = [];
        var holePolygons = [];
        var latLngs = [];
        var j = 0;
        for (var i=0; i<coordinates.length; i++) {
            var poly = coordinates[i];
            //MultiPolygons are basically arrays of Polygons, so they have another nested array
            if (geojson.geometry.type == "MultiPolygon") {
                for (j = 0; j < poly.length; j++) {
                    var newPoly = poly[j];
                    latLngs = [];
                    for (var k = 0; k < newPoly.length; k++) {
                        latLngs.push(new L.LatLng(poly[j][k][1], poly[j][k][0]));
                    }
                    //If it's the first array of the polygon, it's the outline of the original polygon,
                    //which now means it's a "hole" in the overlay polygon
                    if (j == 0) {
                        holePolygons.push(latLngs);
                    } else {
                        //If it used to be a hole in the original polygon, it is now added as another "outline" polygon
                        darkPolygons.push(latLngs);
                    }
                }
            } else if (geojson.geometry.type == "Polygon") {
                latLngs = [];
                for (j = 0; j < poly.length; j++) {
                    latLngs.push(new L.LatLng(poly[j][1], poly[j][0]));
                }
                //If it's the first array of the polygon, it's the outline of the original polygon,
                //which now means it's a "hole" in the overlay polygon
                if (i == 0) {
                    holePolygons.push(latLngs);
                } else {
                    //If it used to be a hole in the original polygon, it is now added as another "outline" polygon
                    darkPolygons.push(latLngs);
                }
            }
        }
        return new L.OverlayPolygon(darkPolygons, holePolygons);
    }

    /**
     * Returns a Leaflet feature.
     * @param {*} geojson - geojson of the object
     * @param {Object} latLng - L.LatLng
     * @param {string} color - color of the feature when drawn on the map
     * @param {boolean} displayFeatureNegative - display negative
     * @returns {Object} - L.GeoJSON
     */
    function getLeafletFeature(geojson, latLng, color, displayFeatureNegative) {
        geojson.geometry.coordinates = convertCoordinatesToSpan180degrees(geojson.geometry.coordinates, latLng);
        if (displayFeatureNegative) {
            return getLGeoJson(geojson, 3, '#eee');
        }
        return getLGeoJson(geojson);
    }

    function getOutlineFeature(geojson, displayFeatureNegative) {
        if (displayFeatureNegative) {
            return getLGeoJson(geojson, 3, '#eee');
        } else {
            return getLGeoJson(geojson, 5, '#000000');
        }
    }

    /**
     * Returns an L.GeoJSON object.
     * @param {*} geoJson - the geoJson for constructing an L.geoJson object
     * @param {number} [weight] - the weight of the outline, default = 2 - optional
     * @param {string} [featureColor] - the color of the outline, default = color - optional
     * @returns {Object} - L.GeoJSON
     */
    function getLGeoJson(geoJson, weight, featureColor) {
        weight = getValueOrDefault(weight, 2);
        featureColor = getValueOrDefault(featureColor, color);
        return L.geoJson(geoJson,
            {
                style: function() {
                    return {
                        color: featureColor,
                        fillOpacity: 0,
                        weight: weight
                    };
                },
                pane: 'featurePane'
            });
    }

    /**
     * Updates coordinates on the opposite side of the international dateline of the latLng to display next to
     *  the coordinates on the same side of the international dateline.
     * @param {*} coordinates - the coordinates to be converted
     * @param {Object} latLng - L.LatLng
     */
    function convertCoordinatesToSpan180degrees(coordinates, latLng) {
        var newCoordinates = $.extend(true, [], coordinates);

        var isCloseToAPole = featureIsCloseToAPole(newCoordinates);

        for (var j = 0; j < newCoordinates.length; j++) {
            var a0 = newCoordinates[j];
            for (var i = 0; i < a0.length; i++) {
                var c = a0[i];
                if (isNaN(c[0])) {
                    for (var k = 0; k < c.length; k++) {
                        var clng = c[k][0];
                        a0[i][k][0] = getAdjustedLng(clng, latLng.lng, isCloseToAPole);
                    }
                } else {
                    var lng = c[0];
                    a0[i][0] = getAdjustedLng(lng, latLng.lng, isCloseToAPole)
                }
            }
        }

        return newCoordinates;
    }

    /**
     * Returns true if a feature is close to the north or south pole, false otherwise.
     * @param {*} coordinates - the coordinates of the feature
     * @returns {boolean}
     */
    function featureIsCloseToAPole(coordinates) {
        for (var j = 0; j < coordinates.length; j++) {
            var a0 = coordinates[j];
            for (var i = 0; i < a0.length; i++) {
                var c = a0[i];
                if (isNaN(c[0])) {
                    for (var k = 0; k < c.length; k++) {
                        var clat = c[k][1];
                        if (isCloseToThePole(clat)) {
                            return true;
                        }
                    }
                } else {
                    var lat = c[1];
                    if (isCloseToThePole(lat)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Returns true if lat is > LAT_MAX (85) or < LAT_MIN (-60).
     * @param {number} lat - latitude
     * @returns {boolean}
     */
    function isCloseToThePole(lat) {
        return lat > LAT_MAX || lat < LAT_MIN;
    }

    /**
     * Returns the appropriate longitude for displaying:
     *      if !isCloseToAPole and !isCloseToTheEdge(lng) then translate the lng to the main map
     *          between -180 and 180
     *      if lng is on the opposite side of the map as markerLng or it's in a different half of the world move it + or - the width of the map
     * @param {number} lng - longitude
     * @param {number} markerLng - longitude of the marker (where the user clicked)
     * @param {boolean} isCloseToAPole
     * @returns {number} - the new longitude after adjustment
     */
    function getAdjustedLng(lng, markerLng, isCloseToAPole) {
        var translateNum = Math.round(Math.abs(markerLng)/MAP_COORDINATES_WIDTH);
        var sign = getSign(markerLng);
        lng = lng + sign * translateNum * MAP_COORDINATES_WIDTH;
        var multiplier = Math.floor(Math.abs(markerLng)/(MAP_COORDINATES_WIDTH/2));
        var lngMultiplier = Math.floor(Math.abs(lng)/(MAP_COORDINATES_WIDTH/2));
        var lngSign = getSign(lng);

        if(!isCloseToAPole && isCloseToTheEdge(lng)) {
            if ((sign != lngSign)) {
                lng = lng + sign * (lngMultiplier + 1) * MAP_COORDINATES_WIDTH;
            } else if((multiplier != lngMultiplier)) {
                lng = lng + (sign * multiplier - sign * lngMultiplier) * MAP_COORDINATES_WIDTH;
            }
        }

        return lng;
    }

    /**
     * Returns -1 or 1 depending on if lng is positive or negative.
     * @param {number} lng - longitude
     * @returns {number} - -1 or 1
     */
    function getSign(lng) {
        return Math.abs(lng)/lng;
    }

    /**
     * Returns true if lng is within 35 degrees of the international dateline, false otherwise.
     * @param {number} lng - longitude
     * @returns {boolean}
     */
    function isCloseToTheEdge(lng) {
        var mod = Math.abs(MAP_OFFSET - (Math.abs(lng) % MAP_COORDINATES_WIDTH));
        return mod <= EDGE_OF_MAP_THRESHOLD;
    }
};

/**
 * This is a basic copy of the L.control.scale class in Leaflet. Created this so the styling would be
 *  consistent with the rest of our application.
 * @constructor
 */
var Scale = function() {
    var maxWidth = 150;

    /**
     * Update the scale.
     */
    this.update = function() {
        var y = map.getSize().y/2;
        var maxMeters = map.distance(map.containerPointToLatLng([0,y]), map.containerPointToLatLng([maxWidth, y]));
        var maxFeet = maxMeters * 3.2808399;

        if(maxFeet > 5280) {
            var maxMiles = maxFeet/5280;
            var miles = getRoundNum(maxMiles);
            updateScale(miles + 'mi', miles/maxMiles);
        } else {
            var feet = getRoundNum(maxFeet);
            updateScale(feet + 'ft', feet/maxFeet);
        }
    };
    this.update();

    /**
     * Update the scale on the map.
     * @param {string} text - text to display on the scale
     * @param {number} ratio - ratio of maxWidth to determine scale's width
     */
    function updateScale(text, ratio) {
        var scale = $('#mapScale');
        var width = Math.round(ratio * maxWidth);
        scale.text(text);
        scale.width(width + 'px');
    }

    /**
     * Returns a round number.
     * @param {number} number - the number to round
     * @returns {number}
     */
    function getRoundNum(number) {
        var pow10 = Math.pow(10, (Math.floor(number) + '').length - 1);
        var d = number / pow10;

        d = d >= 10 ? 10 :
            d >= 5 ? 5 :
                d >= 3 ? 3 :
                    d >= 2 ? 2 : 1;

        return pow10 * d;
    }
};

/**
 * Called to create the dummy objects. Accepts the direction (1|-1) to draw the layer and interprets based on the actual layer's
 *  inputs what is needed for the dummy object inputs.
 * @callback objectCallback
 * @param {number} direction - Either 1 for the map beyond 180 degrees or -1 for the map beyond -180
 * @returns {Object) - any object that inherits L.Layer
 */

/**
 * A dummy layer put on the map to display copies of objects on the main map (-180 to 180 degrees) on
 *  the adjacent maps.
 * @param {objectCallback} objectCallback - called to create the dummy Leaflet layers
 * @param {*} [callbackContext] - object to set as this in the objectCallback - optional
 * @constructor
 */
var DummyLayers = function(objectCallback, callbackContext) {
    this.posDummy = objectCallback.call(callbackContext, 1);
    this.negDummy = objectCallback.call(callbackContext,-1);

    /**
     * Add the dummies to the map.
     */
    this.addToMap = function() {
        this.posDummy.addTo(map);
        this.negDummy.addTo(map);
    };

    /**
     * Remove the dummies from the map.
     */
    this.removeFromMap = function() {
        this.posDummy.remove();
        this.negDummy.remove();
    };
};

L.OverlayPolygon = L.Polygon.extend({
    options: {
        fill: true,
        fillColor: "#333",
        fillOpacity: 0.6,
        clickable: true,

        outerBounds: new L.LatLngBounds([-90, -360], [90, 360])
    },

    initialize: function (addedPoints, holePoints, options) {

        var outerBoundsLatLngs = [
            this.options.outerBounds.getSouthWest(),
            this.options.outerBounds.getNorthWest(),
            this.options.outerBounds.getNorthEast(),
            this.options.outerBounds.getSouthEast()
        ];
        var myArray = [outerBoundsLatLngs];
        for (var i = 0; i < holePoints.length; i++) {
            myArray.push(holePoints[i]);
        }
        var fullArray = myArray;
        if (addedPoints) {
            fullArray = [myArray, addedPoints]
        }
        L.Polygon.prototype.initialize.call(this, fullArray, options);
    }

});

