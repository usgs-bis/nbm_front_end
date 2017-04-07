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
    var PRETTY_URL_MAP = {
        biogeography: '58c9c471e4b0849ce97b4c0d',
        cnr: '58d1942ce4b0236b68f6b7d1',
        nvcs: '58d2bbc0e4b0236b68f84dc8',
        npn: '58d1a934e4b0236b68f6b840'
    };
    var disclaimerModal = {
        closeRightPanel: true,
        closeLeftPanel: false,
        element: undefined
    };

    function initialize() {
        displayBetaBanner();
        var state = {};
        var bioScapeId = '58d1942ce4b0236b68f6b7d1';//Default is set to the National Biogeographic Map

        var path = window.location.pathname.replace(homePath, '');
        if (path.length > 1) {
            var id = path.replace(/\//g, '');
            bioScapeId = PRETTY_URL_MAP[id] ? PRETTY_URL_MAP[id] : id;
        }
        //if there is a hash in the url get the bioScapeId and initial map setting from the url elements after the hash
        if (window.location.hash.length > 0) {
            state = parseHash(window.location.hash);
        }

        disclaimerModal.element = $('#disclaimerModal');

        var bioscapeJson = {};

        //request information from the bioScape ScienceBase item
        sendScienceBaseItemRequest(bioScapeId, 5000)
            .then(function(data) {
                //add the general ScienceBase information to the bioScapeJson object
                bioscapeJson = {
                    id: data.id,
                    title: data.title,
                    summary: data.body,
                    lastUpdated: data.provenance ? data.provenance.lastUpdated : new Date()
                };

                document.title = data.title;

                var configUrl = getConfigUrl(data);

                if(configUrl === '') {
                    alert('This collection doesn\'t seem to have a config file. Please add one otherwise the site may not work correctly. SB Item #: ' + bioScapeId);
                }
                return configUrl;
            })
            .then(function(data) {
                return Promise.resolve($.getJSON(data));
            })
            .then(function(data) {
                setupPage(bioscapeJson, data, state);
            })
            .catch(function(err) {
                console.log('There was an error trying to receive information from ScienceBase: ' + err + '. The default National Biogeographic Map will be loaded.');
                $.getJSON('https://my.usgs.gov/bitbucket/projects/BCB/repos/bioscapes/browse/nbm_config.json')
                    .done(function(data) {
                        var json = parseConfigFromBitBucket(data.lines);
                        setupPage(bioscapeJson, json, state);
                    });
            });
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
                    MenuPanel.close();
                }
            })
            .on('show.bs.modal', function() {
                disclaimerModal.closeRightPanel = !RightPanelBar.isOpen();
                disclaimerModal.closeLeftPanel = !MenuPanel.isOpen();
                MenuPanel.open();
                if(!preventMultipleOpenPanels()) {
                    RightPanelBar.open();
                }
            })
            .modal('show');
        updateBioscapeJson(bioscapeJson, configJson);
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
        bioScape = BioScapeParser.parse(data, state);
        bioScape.initializeBioScape()
            .then(function() {
                //populate the right panel with the default empty look. This just hits all the possible baps specified in the
                //action configs, grabs the title from the returned json, then stores that in a map.
                return actionHandlerHelper.initializeAllBaps()
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
            });

        //bind all of the click events for the bioScape
        bindBioScapeEvents();
    }

    /**
     * Binds all events to BioScape related DOM elements and functionality.
     */
    function bindBioScapeEvents() {
        //when a user clicks one of the layer section titles
        $('div.layerExpander').click(function() {
            var id = $(this).data('section');
            toggleContainer(id);
        });
        //when a user clicks any layer control in the pane
        $('.layer-control').click(function(e) {
            if(isDisabled(e.currentTarget)) {
                return;
            }
            toggleLayer(this.parentElement.id, this.parentElement.parentElement.id);
        });
        //when the user clicks an information icon
        $('.layerMoreInfo').click(function() {
            displayInfo($(this).data('layer'));
        });
        //when the user changes the opacity slider
        $('.opacitySlider').on("change mousemove", function() {
            updateLayerOpacity(this.parentElement.parentElement.id, this.parentElement.parentElement.parentElement.id, $(this).val());
        });
        //when user clicks the show legend button
        $('.displayLegendLink').click(function(e) {
            if(isDisabled(e.currentTarget)) {
                return;
            }
            showLegendDialog();
        });
        //when a user selects a bioScape from the bioScape selection modal
        // $('.bioScapeSelect').click(function(e) {
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
            createDialog('#legendDialog', 'Legend', {height: 500, width: 400});
        }
        toggleLegendCullButton();
    }

    /**
     * Define public methods of the service.
     */
    initializer = {
        initialize: initialize
    };

    return initializer;
})(Initializer || {});
