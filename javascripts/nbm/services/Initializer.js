//= require BioScapeParser.js
//= require ../map/leafletProxyObjects.js
'use strict';

/**
 * Initializer service.
 *
 * Public methods:
 * initialize() - setup the website functionality
 */
var Initializer = (function(initializer) {
    var disclaimerModal = {
        closeRightPanel: true,
        closeLeftPanel: false,
        element: undefined
    };

    let bioscapeMap = {
        "biogeography": "bioscapes/nbm_config.json",
        "terrestrial-ecosystems-2011": "bioscapes/nvcs_class_config.json"
    }

    function getConfig(bioscape, state) {
        let path = bioscapeMap[bioscape]
        let bioscapeJson = {}

        return $.getJSON(myServer + "/bioscape/config/" + bioscape + "/" + myEnv)
            .then(function (apiConfig) {
                bioscapeJson = {
                    id: apiConfig.sbItem.id,
                    title: apiConfig.sbItem.title,
                    summary: apiConfig.sbItem.body,
                    lastUpdated: apiConfig.sbItem.provenance ? apiConfig.sbItem.provenance.lastUpdated : new Date()
                };

                document.title = apiConfig.sbItem.title;

                if (path) {
                    return $.getJSON(path, function(config) {
                        setupPage(bioscapeJson, config, state)
                    })
                } else {
                    setupPage(bioscapeJson, apiConfig.config, state);
                }
            })
    }

    function initialize() {
        displayBetaBanner();
        var state = {};
        var bioscapeName = "biogeography";

        var name = window.location.pathname.replace(homePath, '');
        var chunks = name.split("/");
        var path = chunks[chunks.length - 2];

        for (var i = chunks.length - 1; i > -1; i--) {
            if (chunks[i]) {
                path = chunks[i];
                i = -1
            }
        }

        if (path.length > 1) {
            bioscapeName = path.replace(/\//g, '');
        }
        //if there is a hash in the url get the bioScapeId and initial map setting from the url elements after the hash
        if (window.location.hash.length > 0) {
            state = parseHash(window.location.hash);
        }

        if (state.customBioscape) {
            bioscapeName = state.customBioscape;
        }

        disclaimerModal.element = $('#disclaimerModal');

        getConfig(bioscapeName, state);
    }

    /**
     * Displays the beta banner to the user if the site appears to be a beta environment.
     */
    function displayBetaBanner() {
        if(isBetaEnvironment()) {
            var html = getHtmlFromJsRenderTemplate('#betaBannerTemplate');
            $('.not-map').append(html);
        }
    }

    /**
     * Parses out the initial state of the site from the hash.
     * @param {string} hash
     * @returns {*|undefined} - the parsed information or undefined if no information was successfully parsed
     */
    function parseHash(hash) {
        //take out the hash
        if(0===hash.indexOf("#")) {
            hash=hash.substr(1)
        }
        //get all of the elements of the url
        var oldElems=hash.split("/");

        var elems = [];

        for (var j = 0; j < oldElems.length; j++) {
            //filter out any empty strings
            if (oldElems[j] != "") elems.push(oldElems[j])
        }

        if(elems.length) {
            return parseStateFromHashElements(elems);
        }
        return {};
    }

    /**
     * Returns an object of the sites's state created from the array of hash elements.
     * @param {Array} stateArray - array of the elements parsed from the hash
     * @returns {*}
     */
    function parseStateFromHashElements(stateArray) {
        var state = {};
        stateArray.forEach(function(el) {
            var split = el.split('=');
            state[split[0]] = split[1];
        });
        if(state.lat && state.lng) {
            state.latLng = new L.LatLng(state.lat, state.lng)
        }
        return state;
    }

    /**
     * Get the url for the BioScape configuration.
     * @param data - data from ScienceBase
     * @returns {string}
     */
    function getConfigUrl(data) {
        var configUrl = '';
        if(data.webLinks) {
            //get the configuration file location from the webLinks property
            var configWebLink = findConfig(data.webLinks);
            //if a url was found use it to get the bioScape configuration
            configUrl = configWebLink ? configWebLink.uri : '';
        }
        return configUrl
    }

    /**
     * Searches the webLinks for a webLink of type 'configFile' to return.
     * @param {Array.<Object>} webLinks
     * @returns {*|undefined} - returns the webLink JSON object or undefined if none is found
     */
    function findConfig(webLinks) {
        for(var i = 0; i < webLinks.length; i++) {
            if(webLinks[i].type === 'configFile') {
                return webLinks[i];
            }
        }
        return undefined;
    }

    /**
     * Shows the disclaimer modal, initializes the Leaflet map and loads the Bioscape.
     * @param {*} bioscapeJson - json from the Bioscape
     * @param {*} configJson - json from the configuration file
     * @param {Object} state - state of the application
     */
    function setupPage(bioscapeJson, configJson, state) {
        disclaimerModal.element
            .on('hide.bs.modal', function() {
                if(disclaimerModal.closeRightPanel) {
                    RightPanelBar.close();
                }
                if(disclaimerModal.closeLeftPanel) {
                    //MenuPanel.close();
                }
            })
            .on('show.bs.modal', function() {
                disclaimerModal.closeRightPanel = !RightPanelBar.isOpen();
                disclaimerModal.closeLeftPanel = !MenuPanel.isOpen();
                MenuPanel.open();
                if(!preventMultipleOpenPanels()) {
                    RightPanelBar.open();
                }
            });

        updateBioscapeJson(bioscapeJson, configJson);

        if (!bioscapeJson.hideHowToUse) {
            disclaimerModal.element.modal('show');
            $("#userHelpLink").attr("data-target", "#disclaimerModal").show();
        }

        if (bioscapeJson.elevation.elevationSource){
            let timeout = bioscapeJson.elevation.elevationTimeout
            timeout = timeout ? timeout : 1000
            startElevationService(bioscapeJson.elevation.elevationSource,timeout)
        }

        loadBioScape(bioscapeJson, state);
    }

    

    /**
     * Return the BioScape json with any additional settings from the config.
     * @param {*} bioscapeJson - the json used to create the BioScape
     * @param {*} data - additional data to add to the
     * @returns {*}
     */
    function updateBioscapeJson(bioscapeJson, data) {
        var json = data;
        //if the returned object has lines it came from BitBucket and we need to parse the file out
        if(data.lines) {
            json = parseConfigFromBitBucket(data.lines);
        }

        return updateObjectProperties(bioscapeJson, json);
    }

      /**
     * display the elevation on the map at the point of the mouse
     * @param {*} source - the api source
     * @param {*} timeout how long to wait so we dont spam the service. (ms)
     * @returns {*}
     */
    function startElevationService(source, timeout) {
        timeout = parseInt(timeout)
        var identifiedElevationValue;
        var pane = $('#elevationValue');

        let lastTimeMouseMoved = 0;
        map.on('mousemove', function (e) {
            pane.html('Loading');
            lastTimeMouseMoved = new Date().getTime();
            var t = setTimeout(function () {
                var currentTime = new Date().getTime();
                if (currentTime - lastTimeMouseMoved >= timeout) {
                     pane.html('Loading');
                    $.getJSON(`${source}x=${e.latlng.lng}&y=${e.latlng.lat}&units=Feet&output=json`, function (data) {
                        identifiedElevationValue = data.USGS_Elevation_Point_Query_Service
                        let elev = identifiedElevationValue.Elevation_Query.Elevation;
                        elev = elev > -20 ? numberWithCommas(parseInt(elev))  + 'ft' : "No Data"
                        pane.html(elev);
                    });
                }
            }, timeout)
        });
        const numberWithCommas = (x) => {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    /**
     * Add all of the properties from one object to another if they do't exist on that object.
     * @param {*} updateObject - the object to add properties to
     * @param {*} additionalPropertiesObject - the object with properties to copy from
     * @returns {*}
     */
    function updateObjectProperties(updateObject, additionalPropertiesObject) {
        for(var prop in additionalPropertiesObject) {
            if(additionalPropertiesObject.hasOwnProperty(prop) && !updateObject.hasOwnProperty(prop)) {
                updateObject[prop] = additionalPropertiesObject[prop];
            }
        }

        return updateObject;
    }

    /**
     * Parses the config file JSON from the BitBucket format, which is a lines array
     *  with each element in the array containing the text of the file from that line.
     * @param {Array.<Object>} lines
     * @returns {*} - a JSON object created from the parsed file
     */
    function parseConfigFromBitBucket(lines) {
        var json = '';
        lines.forEach(function (line) {
            json += line.text;
        });

        return JSON.parse(json);
    }

    /**
     * Loads and populates the website panels (left panel is the BioScape and the right panel
     *  is the Synthesis Composition).
     * @param {*} data - JSON from the configuration file
     * @param {Object} state - state of the application
     */
    function loadBioScape(data, state) {  
        map.attributionControl.remove();
        bioScape = BioScapeParser.parse(data, state);
        bioScape.bapLoading("bioscape",false)
        bioScape.initializeBioScape()
            .then(function() {
                //populate the right panel with the default empty look. This just hits all the possible baps specified in the
                //action configs, grabs the title from the returned json, then stores that in a map.
               
                return actionHandlerHelper.initializeAllBaps()
            })
            .then(function() {
                if(state.search) {
                    actionHandlerHelper.initPOISearch(state.search)
                }
            })
            .then(function() {
                //hide the current bioScape from the bioScape selection list
                $('#' + bioScape.id).hide();
                var latLng = state.latLng;
                if(latLng) {
                    disclaimerModal.closeRightPanel = false;
                    //start as if the user clicked on the latLng coordinates
                    return actionHandlerHelper.handleEverything(latLng);
                }
            })    
            .then(function() {
                if(state.center && state.zoom) {
                    map.setView(L.latLng(state.center.split(',')), state.zoom);
                }
                updateUrlWithState();
                bioScape.bapLoading("bioscape",true)
            });
            
        //bind all of the click events for the bioScape
        bindBioScapeEvents();
       
    }

    /**
     * Binds all events to BioScape related DOM elements and functionality.
     */
    function bindBioScapeEvents() {
        //when a user clicks one of the layer section titles
        $('div.layerExpander').on('click', function() {
            var id = $(this).data('section');
            toggleContainer(id);
        });
        //when a user clicks any layer control in the pane
        $('.layer-control').on('click', function(e) {
            if(isDisabled(e.currentTarget)) {
                return;
            }
            toggleLayer(this.parentElement.id, this.parentElement.parentElement.id);
        });
        //when the user clicks an information icon
        $('.layerMoreInfo').on('click', function() {
            displayInfo($(this).data('layer'));
        });

        // hide the info icon on the base baps
        $("#baseMapSelector .hideBaseMapLayer").hide()

        //when the user changes the opacity slider
        $('.opacitySlider').on("change mousemove", function() {
            updateLayerOpacity(this.parentElement.parentElement.id, this.parentElement.parentElement.parentElement.id, $(this).val());
        });
        //when user clicks the show legend button
        $('.displayLegendLink').on('click', function(e) {
            if(isDisabled(e.currentTarget)) {
                return;
            }
            showLegendDialog();
        });
        //when a user selects a bioScape from the bioScape selection modal
        // $('.bioScapeSelect').on('click', function(e) {
        //     //set the hash to the value of the clicked element (the ScienceBase id)
        //     window.location.href = "#" + $(this).val();
        //     //reload the page with the new hash
        //     location.reload();
        //     //stop any other events from happening
        //     e.stopPropagation();
        // });
        // //when the user leaves the bioScape selection modal
        // $('#bioScapeSelectorModal').on('hide.bs.modal', function() {
        //     //collapse any description that may have been opened
        //     $('.modal-body .layerSection:visible').each(function(idx, el) {
        //         toggleContainer(el.id);
        //     });
        // });
        $('body').tooltip({
            selector: '[data-toggle="tooltip"]',
            container: 'body',
            trigger: 'hover'
        });
    }

    /**
     * Toggle the visibility of the layer on the map.
     * @param {string} layerId
     * @param {string} sectionId
     */
    function toggleLayer(layerId, sectionId) {
        var section = bioScape.getSection(sectionId);
        section.toggleLayer(layerId);
    }

    /**
     * Display metadata about the layer.
     * @param {string} layerId
     */
    function displayInfo(layerId) {
        var layer = bioScape.getLayer(layerId);
        if(layer) {
            layer.displayLayerInformation();
        }
    }

    /**
     * Change the opacity of the layer.
     * @param {string} layerId
     * @param {string} sectionId
     * @param {number} newOpacity - between 0 and 1
     */
    function updateLayerOpacity(layerId, sectionId, newOpacity) {
        var section = bioScape.getSection(sectionId);
        section.updateLayerOpacity(layerId, newOpacity);
  
    }

    /**
     * Display the legend dialog to the user.
     */
    function showLegendDialog() {
        if(preventMultipleOpenPanels()) {
            var mobileContainer = $('#mobileBioScapeLegendContainer');
            mobileContainer.html( mobileContainer.html() ? '' : $('#legendDialog').html());
        } else {
            if ($("#legendDialog").is(":visible")) {
                $("button.ui-dialog-titlebar-close").click();
            } else {
                createDialog('#legendDialog', 'Legend', {height: 500, width: 400});
            }
        }
        // toggleLegendCullButton();
    }

    /**
     * Define public methods of the service.
     */
    initializer = {
        initialize: initialize
    };

    return initializer;
})(Initializer || {});
