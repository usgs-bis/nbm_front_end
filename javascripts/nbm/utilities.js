'use strict';

$(document)
    .on('keyup', function (e) {
        // Hide things if the <esc> key is pressed
        if (e.keyCode === 27) {
            closeAllUnitInfoBars();
        }
    })
    .ready(function () {
        //set up the copy to clipboard functionality for the page's url
        var clipboard = new Clipboard("#copyToClipboard", {
            text: function () {
                return window.location.href.replace(window.location.hash, '') + StateKeeper.getState();
            }
        });
        clipboard.on('success', function (e) {
            var el = $(e.trigger);
            el.html('Copied');
            window.setTimeout(function () {
                el.html('Share');
                //$("#dropdownButtonGroup").removeClass("open").addClass("closed");
            }, 2000);
            window.setTimeout(function () {
                $("#dropdownButtonGroup").addClass("open");
            }, 0);
        });
        clipboard.on('error', function (e) {
            var el = $(e.trigger);
            var id = 'clipboardCopy';
            var input = document.getElementById(id);
            if (!input) {
                input = document.createElement('input');
                input.id = id;
                input.setAttribute('data-toggle', 'tooltip');
                input.setAttribute('title', 'Copy this to get the URL to share.');
                input.value = window.location.href.replace(window.location.hash, '') + StateKeeper.getState();
                el.before(input);
            }
            input.setSelectionRange(0, input.value.length);
            input.focus();
        });

        // And finally, make things fast
        // var attachFastClick = Origami.fastclick;
        // attachFastClick(document.getElementsByClassName("not-map")[0]);
    });
/**
 * Returns true if mixed content is allowed, false otherwise. Displays a warning to the user if
 * mixed content isn't allowed.
 * @param {string} layerTitle - the title of the layer being turned on
 * @returns {boolean}
 */
function checkMixedContent(layerTitle) {
    var promise = Promise.resolve(allowsMixedContent);
    if (allowsMixedContent === undefined) {
        promise = sendAjaxRequest({
            url: 'http://my-beta.usgs.gov/bcb/main/jsTest.js',
            dataType: 'script',
            timeout: '2000'
        }).then(function () {
            return true;
        }).catch(function () {
            return false;
        }).then(function (data) {
            allowsMixedContent = data;
        });
    }
    return promise.then(function () {
        if (!allowsMixedContent) {
            displayMixedContentWarning(layerTitle);
        }
        return allowsMixedContent;
    });
}
/**
 * Displays a dialog to the user explaining how to allow mixed content.
 * @param {string} layerTitle - the title of the http layer
 */
function displayMixedContentWarning(layerTitle) {
    showErrorDialog("You must allow mixed content in order to display the " + layerTitle + " layer because it is loaded over http, not https.<br><br>" +
        "<b>Chrome: </b>Click on the shield on the right-hand side of the URL box, then click \"Load unsafe scripts.\"<br><br>" +
        "<b>Firefox: </b>Click on the lock on the left-hand side of the URL box, then click \"Disable protection for now.\"<br><br>" +
        "<b>Internet Explorer: </b>In the popup box at the bottom, click \"Show all content.\" If the popup box isn't there, refresh your browser.", true);
}
/**
 * Show the spinner to the user.
 */
function showSpinner(bool) {
    if (bool === true) {
        $("#mySpinner2").fadeIn('fast');
    }
    else {
        $("#mySpinner").fadeIn('fast');
    }

}

/**
 * Hide the spinner from the user.
 */
function hideSpinner(bool) {
    if (bool === true) {
        $("#mySpinner2").fadeOut('fast');
    }
    else {
        $("#mySpinner").fadeOut('fast');
    }
}


/**
 * Display error dialog to the user.
 * @param {string} html
 * @param {boolean} warning - True if it is a warning instead of an error
 * @param {boolean} options - If this is present, attempt to notify admin of failed service
 */
function showErrorDialog(html, warning, options) {
    hideSpinner()
    hideSpinner(true)
    createDialog(
        "#myDialog",
        warning ? "Warning" : "Error",
        {
            resizable: false,
            buttons: [
                {
                    text: "Ok",
                    icons: {
                        primary: "ui-icon-closethick"
                    },
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ]
        },
        html);

    if (options) {
        $.getJSON(myServer + "/main/checkService", options)
            .done(function (data) {
                if (DEBUG_MODE) {
                    console.log("Check service response:", data);
                }
            });
    }
}

/**
 * Creates and displays a jQueryUI dialog to the user.
 * @param {string} target
 * @param {string} title
 * @param {*} [additionalSettings] - additional settings for jQueryUI dialog
 * @param {string} [html]
 */
function createDialog(target, title, additionalSettings, html) {
    target = target.indexOf('#') === 0 ? target : '#' + target;
    var targetEl = $(target);
    if (html) {
        targetEl.html(html);
    }

    var settings = {
        show: { effect: "drop", duration: 200 },
        title: title,
        open: function () {
            //Wait until the dialog is loaded then remove focus on all buttons within the
            // dialog div
            setTimeout(function () {
                $('.ui-dialog :button').trigger('blur');
            }, 500);
        }
    };
    for (var setting in additionalSettings) {
        if (additionalSettings.hasOwnProperty(setting)) {
            settings[setting] = additionalSettings[setting];
        }
    }

    targetEl.dialog(settings);
}

/**
 * Display JSON error dialog to the user.
 * @param {string} url - url of the error source
 * @param {string} errorMessage
 */
function jsonError(url, errorMessage) {
    console.log('url: ' + url + '\n error:' + errorMessage);
    // showErrorDialog("Warning, issue retrieving data from " + url + " \n Error Message: '" + errorMessage + ".' Some data may be missing. Please contact site admin.")
}

/**
 * Open the summarization container from the right or bottom depending on the screen's width and height ratio.
 *  Then center the area not covered by the summarization container on bounds. If no bounds provided don't change
 *  the view.
 * @param {Object} [bounds] - L.Bounds - optional
 */
function toggleUnitInfoBar(bounds) {
    // Landscape
    RightPanelBar.open();
    if (!isVerticalOrientation()) {
        if (bounds) {
            centerMapRight(bounds);
        }
    } else {
        // Portrait
        if (bounds) {
            centerMapBottom(bounds);
        }
    }
}

/**
 * Center the map when the summarization container is displayed on the right.
 * @param {Object} bounds - L.Bounds
 */
function centerMapRight(bounds) {
    if (bounds._northEast.lng > 180) {
        bounds._northEast.lng -= 360;
        bounds._southWest.lng -= 360;
    }
    else if (bounds._southWest.lng > 180) {
        bounds._southWest.lng -= 360;
        bounds._northEast.lng -= 360;
    }
    var padding = [$("#unit_info_right").width(), 0];
    centerPolygonInViewWindow(bounds, padding);
}

/**
 * Center the map when the summarization container is displayed on the left.
 * @param {Object} bounds - L.Bounds
 */
function centerMapLeft(bounds) {
    var padding = [$("#unit_info_left").width(), 0];
    console.log("Padding:", padding);
    map.fitBounds(bounds, { paddingTopLeft: padding });
    // centerPolygonInViewWindow(bounds, padding);
}

/**
 * Center the map when the summarization container is displayed on the bottom.
 * @param {Object} bounds - L.Bounds
 */
function centerMapBottom(bounds) {
    var padding = [0, $("#unit_info_right").height()];
    centerPolygonInViewWindow(bounds, padding);
}

/**
 * Call map.fitBounds with the given bounds and padding.
 * @param {Object} bounds - L.Bounds
 * @param {*} padding
 */
function centerPolygonInViewWindow(bounds, padding) {
    map.fitBounds(bounds, { paddingBottomRight: padding });
}

function componentToHex(c) {
    var hex = c.toString(16).toUpperCase();
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


function getMap() {
    return map;
}

function getColorMap() {
    return colorMap;
}

function narrowLegend() {
    var flag = true;
    //If images are still loading for the larger legends, we can't start culling yet.
    $.each(loadMap, function (key, value) {
        if (!value) {
            flag = false;
        }
    });
    if (!flag) {
        alert("Please wait for all legend images to finish loading before culling the legend.");
        return false;
    }

    //This is the array that will store all unique colors in the map image.
    var shown = [];

    //Grab all the colors that have been mapped in the image
    var l = getColorMap();

    //Some colors are off by 1 or 2 in an rgb value. This gives a little room for error
    var buffer = 5;

    $(".hideLegendItem").removeClass("hideLegendItem").addClass("showLegendItem");

    var m = $(".legendMessage");
    m.text("Analyzing Map Image...");

    //Grab the map as an image
    html2canvas(map.getContainer(), { useCORS: true })
        .then(function (canvas) {
            var imgData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
            var data = imgData.data;

            //Iterate through each pixel on the map and store each unique color. It is stored as hex so we can just
            //store a string
            for (var i = 0; i < data.length; i += 4) {
                var red = data[i];
                var green = data[i + 1];
                var blue = data[i + 2];
                var hex = rgbToHex(red, green, blue);

                if (shown.indexOf(hex) == -1) {
                    shown.push(hex);
                }
            }

            //Iterate through each color in the legend and see if it is in the "shown" list. Or see if each color is
            //close enough depending on what the buffer is set at.
            $.each(l, function (key, value) {
                var there = false;
                var rgb1 = hexToRgb(key);

                for (var k = 0; k < shown.length; k++) {
                    var rgb2 = hexToRgb(shown[k]);

                    if (Math.abs(rgb1.r - rgb2.r) < buffer && Math.abs(rgb1.g - rgb2.g) < buffer && Math.abs(rgb1.b - rgb2.b) < buffer) {
                        there = true;
                        k = shown.length;
                    }
                }

                //If the legend color is not present in the map, hide it.
                var o = $("img[src='" + value + "']");
                if (!there) {
                    o.parent().removeClass("showLegendItem").addClass("hideLegendItem");
                } else {
                    o.parent().removeClass("hideLegendItem").addClass("showLegendItem");
                }
            });
            m.text("Finished Culling Legend")
        });
}

function addToColorMap(e) {
    e.onload = null;
    var img = new Image();

    img.crossOrigin = "anonymous";
    //Convert the img element to an Image object in javascript and find out what color it is.
    img.onload = function () {
        img.onload = null;
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);

        var imgData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
        var data = imgData.data;

        //Grab the first color in the image that is not black. A lot of the returned images have black borders.
        for (var i = 0; i < data.length; i += 4) {
            var red = data[i];
            var green = data[i + 1];
            var blue = data[i + 2];
            var hex = rgbToHex(red, green, blue);

            if (hex != "#000000") {
                if (!colorMap[hex]) {
                    colorMap[hex] = $(e).prop("src");
                }
                i = data.length;
            }
        }
    };
    img.src = $(e).prop("src");
}

/**
 * Toggles the visibility of the container with id. Returns if the container is visible after toggling.
 * @param {string} id
 * @returns {boolean} - true if the container is now visible to the user, false otherwise
 */
function toggleContainer(id) {
    var group = $("#" + id);
    var mySpan = $("#" + id + 'Control');

    if (group.is(':visible')) {
        mySpan.html('&#9658;');
        group.slideUp('fast');
        return false;
    }
    mySpan.html('&#9660;');
    group.slideDown('fast');
    return true;
}

/**
 * hides the container
 * @param {string} id
 * @returns {boolean} - true if the container closed
 */
function collapseContainer(id) {
    var group = $("#" + id);
    var mySpan = $("#" + id + 'Control');

    if (group.is(':visible')) {
        mySpan.html('&#9658;');
        group.slideUp('fast');
        return true;
    }
    return false;
}

/**
 * Create a div with an id if no other div with the same id exists on the page.
 * @param {string} divId - id of the div
 * @param {string} parentId - id of the element to add this div to
 * @param {string} [innerHtml] - innerHtml to render in the div
 * @param {Object<{property: value, ...}>} [cssProperties] - css properties to apply the element
 * @returns {jQuery} - the element
 */
function createDivIfDoesNotExist(divId, parentId, innerHtml, cssProperties) {
    var el = $('#' + divId);
    if (el.length === 0) {
        var div = document.createElement('div');
        div.id = divId;
        if (innerHtml) {
            div.innerHTML = innerHtml;
        }
        var $div = $(div);
        if (cssProperties) {
            $div.css(cssProperties);
        }
        $('#' + parentId).append(div);
        return $div;
    }
    return el;
}

/**
 * Returns true if el has the class 'disabled'.
 * @param {Object} el - DOM Element
 * @returns {boolean}
 */
function isDisabled(el) {
    return $(el).hasClass('disabled');
}

/**
 * Shows the element if it is hidden, hides it if it is shown.
 * @param {jQuery} $el - the element to show or hide
 */
function toggleVisibility($el) {
    if ($el.is(':visible')) {
        $el.hide();
        return;
    }
    $el.show();
}

/**
 * Renders and returns the given jsrender template html or in the case of an error returns an error message as
 * the html.
 *
 * @param {string} templateId - can be just the id or #id
 * @param {*} [viewData] - viewData object for jsrender to use for this template
 * @param {*} [helpers] - object with helpers for jsrender to use for this template
 * @returns {string} html - the rendered html string
 */
function getHtmlFromJsRenderTemplate(templateId, viewData, helpers) {
    var id = templateId.indexOf('#') === 0 ? templateId : '#' + templateId;
    var template = $.templates(id);
    var html = '';
    try {
        html = template.render(viewData, helpers);
    } catch (ex) {
        html = 'There was an error building the html for the template ' + templateId + ': ' + ex;
    }

    return html;
}

/**
 * Makes the derived class inherit from the base class.
 * @param {Object} base - the class to be inherited
 * @param {Object} derived - the class to inherit from base
 */
function inherit(base, derived) {
    derived.prototype = Object.create(base.prototype);
    derived.prototype.constructor = derived;
}

/**
 * Returns the value if it is truthy returns the default otherwise.
 * @param value - value to return if it is truthy
 * @param def - default value to return if value is falsy
 * @returns {*}
 */
function getValueOrDefault(value, def) {
    return value ? value : def;
}

function getVisibleSummaryOrDefault() {
    var visibleLayers = bioScape.getVisibleLayers();
    var index = 0;

    for (var i = 0; i < visibleLayers.length; i++) {
        var checker = summarizationLayers.indexOf(visibleLayers[i].mapLayer);
        if (checker != -1) {
            index = checker;
            i = visibleLayers.length;
        }
    }

    return index;
}

/**
 * Parse XML to JSON. Code credit: https://davidwalsh.name/convert-xml-json
 * @param {xml} xml Object
 * @returns {object} - json object
 */
function xmlToJson(xml) {

    // Create the return object
    var obj = {};

    if (xml.nodeType == 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType == 3) { // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof (obj[nodeName]) == "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof (obj[nodeName].push) == "undefined") {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
}

/**
 * Determines if the current environment is non-production by checking the url for known 'beta' type strings.
 * @returns {boolean} - false if urls seems to be a production url, true otherwise
 */
function isBetaEnvironment() {
    var betaIndicators = [
        'beta',
        'localhost',
        'staging',
        'dev-'
    ];

    var url = window.location.toString();
    return urlContainsAnyString(betaIndicators);

    function urlContainsAnyString(stringArray) {
        var isPresent = false;
        stringArray.forEach(function (str) {
            if (isPresentInUrl(str)) {
                isPresent = true;
            }
        });
        return isPresent;
    }

    function isPresentInUrl(str) {
        return url.indexOf(str) >= 0;
    }
}

var DEFAULT_AJAX_TIMEOUT = 15000;
/**
 * Sends an ajax request and handles when the data returned is an error object or the request returns an error state.
 *  In either error case scenario we reject the promise with the returned data. Otherwise we resolve the promise.
 * @param {string} url - url for the request
 * @param {number|undefined} [timeout] - timeout in milliseconds for the request, defaults to 15000 (15 seconds)
 * @param {*} [params] - parameters to send with the request
 * @promise {*} - the data retrieved from the JSON request
 */
function sendJsonRequestHandleError(url, timeout, params) {
    return sendJsonAjaxRequest(url, params, timeout)
        .then(function (data) {
            if (data.error) {
                return Promise.reject(data);
            }
            return data;
        });
}

function sendAjaxRequest(options, skipErrorMessage) {
    return Promise.resolve(
        $.ajax(options)
            .fail(function () {
                if (!skipErrorMessage) {
                    showErrorDialog('Error making request to ' + options.url +
                        '. If the problem continues, please contact site admin.', 'Error', options);
                }
            })
    );
}

function sendPostRequest(url, params, skipErrorMessage) {
    return sendAjaxRequest({
        type: 'POST',
        url: url,
        data: params,
        dataType: 'json'
    }, skipErrorMessage)
}

function sendJsonAjaxRequest(url, params, timeout) {
    return sendAjaxRequest({
        type: 'GET',
        url: url,
        dataType: 'json',
        data: params,
        timeout: getValueOrDefault(timeout, DEFAULT_AJAX_TIMEOUT)
    });
}

function sendXmlAjaxRequest(url) {
    return sendAjaxRequest({
        type: 'GET',
        url: url,
        dataType: 'xml',
        timeout: DEFAULT_AJAX_TIMEOUT
    });
}

function sendScienceBaseItemRequest(sbId, timeout) {
    var sbItemUrl = 'https://www.sciencebase.gov/catalog/item/';
    return sendJsonAjaxRequest(sbItemUrl + sbId, { format: 'json' }, timeout);
}

/**
 * Get the local date in a ISO-8601 format string.
 * @returns {string}
 */
function formatLocalDateToISO8601() {
    var now = new Date(),
        // tzo = -now.getTimezoneOffset(),
        // dif = tzo >= 0 ? '+' : '-',
        pad = function (num) {
            var norm = Math.abs(Math.floor(num));
            return (norm < 10 ? '0' : '') + norm;
        };
    return now.getFullYear()
        + '-' + pad(now.getMonth() + 1)
        + '-' + pad(now.getDate());
    // + 'T' + pad(now.getHours())
    // + ':' + pad(now.getMinutes())
    // + ':' + pad(now.getSeconds())
    // + dif + pad(tzo / 60)
    // + ':' + pad(tzo % 60);
}

function resetLegendCull() {
    $(".legendMessage").text("");
    $(".hideLegendItem").removeClass("hideLegendItem").addClass("showLegendItem");
}

function updateUrlWithState() {
    window.location.href = window.location.href.replace(window.location.hash, '') + StateKeeper.getState();
}

function toggleLegendCullButton() {
    if (map.getZoom() < 9 || (window.location.hostname != "localhost" && window.location.hostname.indexOf("igs"))) {
        $(".narrowLegend").hide();
    } else {
        $(".narrowLegend").show();
    }
}

/**
 * Show the enlarged BAP container.
 */
function showEnlargedBAP() {
    closeAllUnitInfoBars();
    $("#enlargedBAPContainer").fadeIn(300);
}

/**
 * If the window width is less than 517 we are in a vertical orientation mode. Returns true
 *  if the window width is < 517.
 * @returns {boolean}
 */
function isVerticalOrientation() {
    return $(window).width() < 517;
}

/**
 * If the window width is less than 933 we don't allow the user to have both panels open
 *  at the same time. Returns true if the window width is < 933.
 * @returns {boolean}
 */
function preventMultipleOpenPanels() {
    return $(window).width() < 933;
}

function getDrawnPolygons(items) {
    var gj = {
        coordinates: [
            [
            ]
        ],
        crs: { "type": "name", "properties": { "name": "EPSG:4326" } },
        type: "MultiPolygon"
    };
    items.eachLayer(function (layer) {
        console.log(layer["_latlngs"]);
        var arr = [];
        for (var i = 0; i < layer["_latlngs"][0].length; i++) {
            //console.log(layer[i])
            arr.push([layer["_latlngs"][0][i]["lng"], layer["_latlngs"][0][i]["lat"]]);
        }

        arr.push([layer["_latlngs"][0][0]["lng"], layer["_latlngs"][0][0]["lat"]]);

        gj.coordinates[0].push(arr);
    });

    return gj;
}

function showSubmitPopup() {
    $("#submitDrawingModal").modal("show");
}

function isEquivalent(a, b) {
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
        return false;
    }

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if (a[propName] !== b[propName]) {
            return false;
        }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
}

function getTemplateHtml(path) {
    if (path && path.indexOf("javascripts/templates/") == 0 && path.indexOf("..") == -1) {
        return sendAjaxRequest({
            type: 'GET',
            url: path,
            dataType: 'html',
            timeout: getValueOrDefault(undefined, DEFAULT_AJAX_TIMEOUT)
        })
            .then(function (data) {
                return Promise.resolve(data);
            })
            .catch(function (ex) {
                return Promise.resolve(ex)
            });
    } else {
        return Promise.resolve("Error retrieving template data");
    }
}

function getHtmlTemplateElements() {
    return $("div[html-template]");
}

function getTemplatePath(el) {
    return $(el).attr("html-template");
}

function loadHtmlTemplates() {
    var promises = [];

    var templateHolder = $("#templateHolder");

    getHtmlTemplateElements().each(function () {
        promises.push(
            getTemplateHtml(getTemplatePath(this))
                .then(function (data) {
                    templateHolder.append(data);
                    return Promise.resolve();
                })
                .catch(function (ex) {
                    showErrorDialog("Some html templates were not loaded in the page. " +
                        "Some elements may not render properly. Please refresh the page and try again. " +
                        "Contact website admin if the problem continues.", "Warning");
                    return Promise.resolve();
                })
        );
    });

    return Promise.all(promises);
}

function roundNumber(number, multiplier) {
    return Math.round(number * multiplier) / multiplier;
}

function getRoundedGeometry(geojson, sigFigs) {
    var multiplier = Math.pow(10, sigFigs);
    for (var j = 0; j < geojson.geometry.coordinates.length; j++) {
        for (var i = 0; i < geojson.geometry.coordinates[j].length; i++) {
            if (isNaN(geojson.geometry.coordinates[j][i][0])) {
                for (var k = 0; k < geojson.geometry.coordinates[j][i].length; k++) {
                    geojson.geometry.coordinates[j][i][k][0] = roundNumber(geojson.geometry.coordinates[j][i][k][0], multiplier);
                    geojson.geometry.coordinates[j][i][k][1] = roundNumber(geojson.geometry.coordinates[j][i][k][1], multiplier);
                }
            } else {
                geojson.geometry.coordinates[j][i][1] = roundNumber(geojson.geometry.coordinates[j][i][1], multiplier);
                geojson.geometry.coordinates[j][i][0] = roundNumber(geojson.geometry.coordinates[j][i][0], multiplier);
            }
        }
    }

    return geojson;
}

function getSimplifiedGeojsonObject(geojson, p) {
    var geoCopy = $.extend(true, {}, geojson);
    p = p ? p : .025;
    var topo = topojson.topology(geoCopy);
    presimplify(topo);
    var quantile = topojson.quantile(topo, p);
    topojson.simplify(topo, quantile);
    return topojson.feature(topo, topo.objects.geometry);
}

//The following code was taken and altered from Jason Davies post on line simplification:
//https://www.jasondavies.com/simplify/
function presimplify(topology) {
    var heap = minHeap(),
        tree = rbush(),
        maxArea = 0;
    var arcs = topology.arcs;
    for (var j = 0, length = arcs.length; j < length; ++j) {
        var points = arcs[j],
            previous = null,
            boxes = [];

        var i = 0,
            n = points.length - 1,
            point = points[i];
        while (++i <= n) {
            boxes.push(bbox(point, point = points[i]));
        }
        tree.load(boxes);

        for (i = 1; i < n; ++i) {
            var triangle = {
                a: points[i - 1],
                b: points[i],
                c: points[i + 1],
                index: 0,
                previous: previous,
                next: null,
                ab: boxes[i - 1],
                bc: boxes[i]
            };
            triangle.b[2] = cartesianArea(triangle);
            if (previous) previous.next = triangle;
            previous = triangle;
            heap.push(triangle);
        }

        points[0][2] = points[n][2] = Infinity;
    }

    var intersecting = [], t;

    while (triangle = heap.pop()) {
        // If the area of the current point is less than that of the previous point
        // to be eliminated, use the latter’s area instead. This ensures that the
        // current point cannot be eliminated without eliminating previously-
        // eliminated points.
        if (triangle.b[2] < maxArea) triangle.b[2] = maxArea;
        else maxArea = triangle.b[2];

        if (intersect(tree, triangle)) {
            intersecting.push(triangle);
            continue;
        }
        while (t = intersecting.pop()) {
            heap.push(t);
        }

        tree.remove(triangle.ab);
        tree.remove(triangle.bc);

        var box = bbox(triangle.a, triangle.c);
        tree.insert(box);

        previous = triangle.previous;
        var next = triangle.next;

        if (previous) {
            previous.bc = box;
            previous.next = next;
            previous.c = triangle.c;
            update(previous);
        }

        if (next) {
            next.ab = box;
            next.previous = previous;
            next.a = triangle.a;
            update(next);
        }
    }

    function update(triangle) {
        heap.remove(triangle);
        triangle.b[2] = cartesianArea(triangle);
        heap.push(triangle);
    }

    return topology;

    function bbox(a, b) {
        var x0 = a[0], y0 = a[1],
            x1 = b[0], y1 = b[1],
            t;
        if (x0 > x1) t = x0, x0 = x1, x1 = t;
        if (y0 > y1) t = y0, y0 = y1, y1 = t;
        return {
            minX: x0,
            minY: y0,
            maxX: x1,
            maxY: y1,
            a: a,
            b: b
        }
    }

    function cartesianArea(t) {
        var a = t.a, b = t.b, c = t.c;
        return Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]));
    }

    function intersect(tree, triangle) {
        if (!cartesianIntersect) return false;
        var a = triangle.a,
            c = triangle.c,
            candidates = tree.search(bbox(a, c));
        for (var i = 0, n = candidates.length; i < n; ++i) {
            var candidate = candidates[i],
                ca = candidate.a,
                cb = candidate.b;
            if (!equal(ca, a) && !equal(ca, c) && !equal(cb, a) && !equal(cb, c) && cartesianIntersect(ca, cb, a, c)) {
                return true;
            }
        }
        return false;
    }

    function cartesianIntersect(p1, p2, p3, p4) {
        return (ccw(p1, p3, p4) ^ ccw(p2, p3, p4)) & (ccw(p1, p2, p3) ^ ccw(p1, p2, p4));
    }

    function ccw(p1, p2, p3) {
        var a = p1[0], b = p1[1],
            c = p2[0], d = p2[1],
            e = p3[0], f = p3[1];
        return (f - b) * (c - a) > (d - b) * (e - a);
    }

    function equal(a, b) {
        return a[0] === b[0]
            && a[1] === b[1];
    }
}

function compare(a, b) {
    return a.b[2] - b.b[2];
}

function minHeap() {
    var array = [],
        size = 0;

    var heap = {

        push: function (object) {
            array.push(object);
            up(array, object.index = size++);
            return size;
        },

        pop: function () {
            if (size <= 0) return;
            var removed = array[0],
                object = array.pop();
            if (--size) {
                array[object.index = 0] = object;
                down(array, 0);
            }
            return removed;
        },

        remove: function (removed) {
            var i = removed.index,
                object = array.pop();
            if (i !== --size) {
                array[object.index = i] = object;
                (compare(object, removed) < 0 ? up : down)(array, i);
            }
            return i;
        }
    };

    return heap;
}

function up(array, i) {
    var object = array[i];
    while (i > 0) {
        var up = ((i + 1) >> 1) - 1,
            parent = array[up];
        if (compare(object, parent) >= 0) break;
        array[parent.index = i] = parent;
        array[object.index = i = up] = object;
    }
}

function down(array, i) {
    var object = array[i];
    while (true) {
        var right = (i + 1) << 1,
            left = right - 1,
            down = i,
            child = array[down];
        if (left < array.length && compare(array[left], child) < 0) child = array[down = left];
        if (right < array.length && compare(array[right], child) < 0) child = array[down = right];
        if (down === i) break;
        array[child.index = i] = child;
        array[object.index = i = down] = object;
    }
}

function sendGeojsonChunks(featureValue, token) {
    var numChunks = Math.floor(featureValue.length / WAF_LIMIT);

    if (featureValue.length % WAF_LIMIT === 0) {
        numChunks--;
    }

    if (DEBUG_MODE) console.log("Number of early chunks: ", numChunks);

    var tempPromises = [];
    var ok = true;

    for (var i = 0; i < numChunks; i++) {
        var sentMap = {
            chunkToken: token,
            numChunks: numChunks,
            featureValue: featureValue.substring(i * WAF_LIMIT, (i + 1) * WAF_LIMIT),
            index: i
        };
        tempPromises.push(sendPostRequest(myServer + "/bap/sendChunk", sentMap)
            .then(function (chunkReturn) {
                if (!chunkReturn.success) {
                    console.log("Got an error in a chunk");
                    ok = false;
                }
                Promise.resolve();
            }));
    }

    return Promise.all(tempPromises);
}