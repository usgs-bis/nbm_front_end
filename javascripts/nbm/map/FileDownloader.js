'use strict';

/**
 * Gets a file downloader.
 * @param {string} url - the service url
 * @param {string} layerId - the layer ot capture from the service
 * @param {string} outputCrs - coordinate reference system of the downloaded file
 * @promise {*} - file downloader
 */
function getFileDownloader(url, layerId, outputCrs) {
    url = url.split('?')[0];//only use the url before the question mark
    var downloader = new WCS(url.replace('wms', 'wcs'), layerId, outputCrs);
    return downloader.initialize()
        .then(function(data) {
            if(data) {
                return downloader;
            }
            downloader = new WFS(url.replace('wcs', 'wfs'), layerId, outputCrs);
            downloader.initialize();
            return downloader;
        });
}

/**
 * WCS service file downloader.
 * @param {string} url - the service url
 * @param {string} layerId - id of the layer for download
 * @param {string} [outputCrs] - crs to use for the download
 * @constructor
 */
var WCS = function(url, layerId, outputCrs) {
    url = url.replace('/rest', '');
    this.originalServiceUrl = url;
    this.getCapabilitiesUrl = url + '?request=GetCapabilities&service=WCS';
    this.getUrl = undefined;

    /**
     * Initialize the downloader.
     * @promise {boolean} - true if the downloader was successfully initialized, false otherwise
     */
    this.initialize = function() {
        var that = this;
        return sendXmlAjaxRequest(this.getCapabilitiesUrl)
            .then(function(xml) {
                var json = xmlToJson(xml);
                var capabilities = json['wcs:Capabilities'] ? json['wcs:Capabilities'] : json['Capabilities'];
                var operations = capabilities['ows:OperationsMetadata']['ows:Operation'];
                var getCoverage = undefined;
                for(var i = 0; i < operations.length; i++) {
                    if(operations[i]['@attributes']['name'] === 'GetCoverage') {
                        getCoverage = operations[i];
                        break;
                    }
                }
                var contents = capabilities['wcs:Contents'] ? capabilities['wcs:Contents'] : capabilities['Contents'];
                if(getCoverage && !$.isEmptyObject(contents)) {
                    var parameters = getCoverage['ows:Parameter'] ? getCoverage['ows:Parameter'] : [];
                    var identifier = undefined;
                    var version = undefined;
                    for(var j = 0; j < parameters.length; j++) {
                        var name = parameters[j]['@attributes']['name'];
                        if(name === 'Identifier') {
                            identifier = parameters[j];
                        } else if (name === 'version') {
                            version = parameters[j];
                        }
                    }
                    var urlQuery;
                    if(identifier) {
                        var ids = identifier['ows:AllowedValues']['ows:Value'];
                        urlQuery = new WCSUrlQuery(that.originalServiceUrl, ids[layerId]['#text'], outputCrs);
                    } else {
                        urlQuery = new WCSUrlQuery(that.originalServiceUrl, layerId, outputCrs);
                    }
                    if(!version) {
                        //if there are no version specifications then use version 2.0 specs
                        that.getUrl = urlQuery.getVersion2;
                    } else {
                        var values = version['ows:AllowedValues']['ows:Value'];
                        var has1 = false;
                        var has2 = false;
                        for (var k = 0; k < values.length; k++) {
                            var versionText = values[k]['#text'];
                            if (versionText === '1.0.0') {
                                has1 = true;
                            } else if (versionText === '2.0.1') {
                                has2 = true;
                            }
                        }
                        that.getUrl = has2 ? urlQuery.getVersion2 : (has1 ? urlQuery.getVersion1 : undefined);
                    }
                    return true;
                }
                return false;
            })
            .catch(function(error) {
                console.log(error.message);
                return false;
            });
    };

    /**
     * Downloads a file in a new tab if a url for download is set. Throws an error to the user otherwise.
     */
    this.download = function() {
        if(!this.getUrl) {
            showErrorDialog('There was an error trying to create a request to this service. Make sure the service accepts WCS GetCoverage requests.');
            return;
        }
        window.open(this.getUrl());
    };
};

/**
 * Creates download urls for WCS services.
 * @param serviceUrl
 * @param layerId
 * @param outputCrs
 * @constructor
 */
var WCSUrlQuery = function(serviceUrl, layerId, outputCrs) {

    /**
     * Returns a version 1.0.0 WCS GeoTiff file download url.
     * @returns {string} - the download url
     */
    this.getVersion1 = function() {
        var params = getUrlParameters();
        var boundingBoxString = params.bbox1 + ',' + params.bbox2 + ',' + params.bbox3 + ',' + params.bbox4;
        return serviceUrl + '?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&FORMAT=GeoTIFF&COVERAGE=' + layerId +
            '&BBOX=' +boundingBoxString + '&CRS=EPSG:4326' + (outputCrs ? '&RESPONSE_CRS=' + outputCrs : '')  + '&WIDTH=' + params.width + '&HEIGHT=' + params.height;
    };

    /**
     * Returns a version 2.0.1 WCS GeoTiff file download url.
     * @returns {string} - the download url
     */
    this.getVersion2 = function() {
        var params = getUrlParameters();
        return serviceUrl + '?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&FORMAT=GeoTIFF&GEOTIFF:COMPRESSION=LZW&COVERAGEID=' + layerId +
            '&SUBSET=Long(' + params.bbox1 + ',' + params.bbox3 + ')&SUBSET=Lat(' + params.bbox2 + ',' + params.bbox4 + ')&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326' +
            (outputCrs ? '&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/' + outputCrs.replace('EPSG:', '') : '') + '&SIZE=Long(' + params.width + ')&SIZE=Lat(' + params.height + ')';
    };
};

/**
 * WFS service file downloader.
 * @param {string} url - the service url
 * @param {string} layerId - id of the layer for download
 * @param {string} [outputCrs] - crs to use for the download
 * @constructor
 */
var WFS = function(url, layerId, outputCrs) {
    url = url.replace('/rest', '');
    this.originalServiceUrl = url;
    this.getCapabilitiesUrl = url + '?request=GetCapabilities&service=WFS';
    this.getUrl = undefined;

    /**
     * Initialize the downloader.
     * @promise {boolean} - true if the downloader was successfully initialized, false otherwise
     */
    this.initialize = function() {
        var that = this;
        return sendXmlAjaxRequest(this.getCapabilitiesUrl)
            .then(function(xml) {
                var json = xmlToJson(xml);
                var success = false;
                var capabilities = json['wfs:WFS_Capabilities'] ? json['wfs:WFS_Capabilities'] : json['WFS_Capabilities'];
                var operations = capabilities['ows:OperationsMetadata']['ows:Operation'];
                var getFeature = undefined;
                for(var i = 0; i < operations.length; i++) {
                    if(operations[i]['@attributes']['name'] === 'GetFeature') {
                        getFeature = operations[i];
                        break;
                    }
                }
                if (getFeature) {
                    var parameters = getFeature['ows:Parameter'];
                    var outputFormat = undefined;
                    for (var j = 0; j < parameters.length; j++) {
                        var name = parameters[j]['@attributes']['name'];
                        if(name === 'outputFormat') {
                            outputFormat = parameters[j];
                        }
                    }
                    if(outputFormat) {
                        var values = outputFormat['ows:AllowedValues']['ows:Value'];
                        var hasFeatures = capabilities['FeatureTypeList'];
                        for (var k = 0; k < values.length; k++) {
                            var formatText = values[k]['#text'];
                            if (formatText.toLowerCase() === 'shape-zip' && hasFeatures) {
                                that.getUrl = function () {
                                    var params = getUrlParameters(outputCrs);
                                    var boundingBoxString = params.bbox1 + ',' + params.bbox2 + ',' + params.bbox3 + ',' + params.bbox4;
                                    return that.originalServiceUrl + '?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TypeNames=' + layerId +
                                        '&BBOX=' + boundingBoxString + '&outputFormat=shape-zip';
                                };
                                success = true;
                                break;
                            }
                        }
                    }
                }

                return success;
            })
            .catch(function(error) {
                console.log(error.message);
                return false;
            });
    };

    /**
     * Downloads a file in a new tab if a url for download is set. Throws an error to the user otherwise.
     */
    this.download = function() {
        if(!this.getUrl) {
            showErrorDialog('There was an error trying to create a request to this service. Make sure the service accepts WFS GetFeature requests for shape files.');
            return;
        }
        window.open(this.getUrl());
    };
};

/**
 * Returns url parameters for the current area displayed to the user. When an outputCrs is provided, attempts to project
 *  the current coordinates into that crs, on failure returns the unprojected values.
 * @param {string} [outputCrs] - outputCrs to project the data into
 * @returns {{bbox1: number, bbox2: number, bbox3: number, bbox4: number, width: number, height: number}}
 */
function getUrlParameters(outputCrs) {
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var bbox1, bbox2, bbox3, bbox4;

    if(outputCrs) {
        try {
            sw = proj4(outputCrs, [sw.lng, sw.lat]);
            ne = proj4(outputCrs, [ne.lng, ne.lat]);
            bbox1 = sw[0];
            bbox2 = sw[1];
            bbox3 = ne[0];
            bbox4 = ne[1];
        } catch(ex) {
            bbox1 = sw.lng;
            bbox2 = sw.lat;
            bbox3 = ne.lng;
            bbox4 = ne.lat;
        }
    } else {
        bbox1 = sw.lng;
        bbox2 = sw.lat;
        bbox3 = ne.lng;
        bbox4 = ne.lat;
    }

    var mapSize = map.getSize();
    var width = mapSize.x;
    var height = mapSize.y;

    return {
        bbox1: bbox1,
        bbox2: bbox2,
        bbox3: bbox3,
        bbox4: bbox4,
        width: width,
        height: height
    }
}

/**
 * Map of the service type to the service downloader.
 * @type {{WFSServer: WFS, WCSServer: WCS}}
 */
var MAP_SERVICE_MAP = {
    WFSServer: WFS,
    WCSServer: WCS
};