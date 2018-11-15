'use strict';

/**
 * BioScape object.
 * @param {string} id - the bioScape id
 * @param {string} title - the bioScape title
 * @param {string} summary - the summary/description of the bioScape
 * @param {string|undefined} rightPanelMessage - the message to display in the right panel when no area is selected
 * @param {Array.<*>} sections - the sections in this bioScape
 * @param {Array.<Object>} summarizationLayers - array of any object inheriting BioScapeLayerBase - the all of
 *  summarization layers to use for this bioScape
 * @constructor
 */
var BioScape = function (id, data, sections, summarizationLayers, customBioscape, additionalParams, initBapState) {
    this.id = id;
    this.title = data.title;
    this.summary = data.summary;
    this.sections = sections;
    this.radioSelections = data.radioSelections;
    this.summarizationLayers = summarizationLayers;
    this.definitionUrl = 'https://www.sciencebase.gov/catalog/item/5667124be4b06a3ea36c8be6';
    this.definition = 'There is no definition available currently, ScienceBase was unreachable.';
    this.rightPanelMessage = data.rightPanelMessage;
    this.customBioscape = customBioscape;
    setDefinition(this);
    this.state = {baps:[],layers:[]}
    this.initBapState = initBapState;
    this.additionalParams = additionalParams;
    this.pendingLayers=[]
    this.loadingBaps = []
    this.defaultPriority = data.defaultPriority

    /**
     * Send a json request to ScienceBase for the definition of 'Bioscape'. Set the definition if there is a
     *  successful response.
     * @param {BioScape} that - this BioScape
     */
    function setDefinition(that) {
        sendJsonRequestHandleError(that.definitionUrl)
            .then(function (data) {
                if (data && data.body) {
                    that.definition = data.body;
                }
            })
            .catch(function () {
                console.log('There was an issue trying to get a definition from ScienceBase.');
            });
    }

    this.resetState = function(){
        let state = {baps:[],layers:[]}
        this.state = state
        return state
    }

    /**
     * Initializes the BioScape by initializing all of the sections. Promise is resolved once all
     *  sections complete initialization.
     * @promise
     */
    this.initializeBioScape = function () {
        let that = this;
        var promises = this.sections.map(function (section) {
            return section.initializeGroup();
        });

        bioScape.initBapState.baps.forEach(function(initBap){
            if (initBap.enabled && !initBap.userDefined) {
                showSpinner(true)
                
                //bioScape.bapLoading(initBap.id,false)

            }
            if (initBap.userDefined) {
                showErrorDialog('Unable to load user drawn polygon. ', false);
            }
        });
       
        try{
            if (this.initBapState.layers.length) {
                this.initBapState.layers.forEach(function (l) {
                    let layer = that.getLayer(l.id)
                    if (layer.summarizationRegion || layer.baseMap) {
                        layer.turnOffLayer()
                        bioScape.getSection(layer.section.id).toggleLayer(layer.id);
                        
                    }
                })
            }
        }
        catch(error){
            showErrorDialog('Unable to load the captured state. ', false);
        }
        
        //this.updateState();
        return Promise.all(promises);
    };

    this.bapLoading = function(id,doneLoading){
        if(!doneLoading){
            if (this.loadingBaps.length == 0){
                $("#initializeLoader").show()
            }
            this.loadingBaps.push(id)
        }
        else{
            let index = this.loadingBaps.indexOf(id);
            let lastItem = this.loadingBaps[index]
            if (index > -1) {
                this.loadingBaps.splice(index, 1);
            }
            if(this.loadingBaps.length == 0){
                $("#initializeLoader").hide()
            }
        }
    }

    /**
     * Return the bioScape section with id or undefined if no section with id is found.
     * @param {string} id - id of the section to return
     * @returns {*|undefined}
     */
    this.getSection = function (id) {
        var result = undefined;
        this.sections.forEach(function (section) {
            if (section.id === id) {
                result = section;
            }
        });
        return result
    };

    /**
     * Returns all bioScape sections that don't have an id of 'basemaps', unless includeBasemap is true.
     * @param {boolean} [includeBasemap] - include basemap sections - optional
     * @returns {Array.<*>}
     */
    this.getAllSections = function (includeBasemap) {
        var result = [];
        this.sections.forEach(function (section) {
            if (section.title.toLowerCase().includes("basemap") && !includeBasemap) {
                return;
            }
            result.push(section);
        });

        return result;
    };


     /**
     * Returns the layer with id or undefined.
     * @param {string} id - id of the layer to return
     * @returns {undefined|Object}
     */
    this.getLayer = function (id) {
        var layers = this.getAllLayers();

        for (var i = 0; i < layers.length; i++) {
            if (layers[i].id === id) {
                return layers[i];
            }
        }

        return undefined;
    };

      /**
     * Returns all layers that are currently visible on the map
     * or are in the process of being added to the map
     * @returns {Array.<*>}
     */
    this.getVisibleLayers = function (includeBasemaps) {
        var result = [];
        var layers = this.getAllLayers(includeBasemaps);
        layers.forEach(function (layer) {
            if (layer.isVisible()) {
                result.push(layer);
            }
        });
        this.pendingLayers.forEach(function (layer) {
            result.push(layer);
        });

        return result;
    };

    /**
     * Returns all non base map layers in the BioScape, unless includeBasemaps is true.
     * @param {boolean} [includeBasemaps - include basemaps - optional
     * @returns {Array.<*>}
     */
    this.getAllLayers = function (includeBasemaps) {
        var result = [];
        var sections = this.getAllSections(includeBasemaps);
        sections.forEach(function (section) {
            result = result.concat(section.getLayers());
        });

        return result;
    };


    /**
     * Returns the current state of the BioScape.
     * @returns {{}|{layers: string}}
     */
    this.getState = function () {
        return btoa(JSON.stringify(this.state));
    };

    this.getCustomState = function () {
        if (this.customBioscape) {
            return {customBioscape:this.customBioscape};
        }
        return {}
    };


    /**
     * Updates the state of the BioScape and calls StateKeeper.updateUrl.
     */
    this.updateState = function (bap) {
        let that = this
        
        let oldState = JSON.parse(JSON.stringify(this.state))
        this.resetState()
        if (!bap) bap = {}

       let update = false; 
        oldState.baps.forEach(function(currentBap){
            if(currentBap.id == bap.id ){
                    if (bap.range) currentBap.range = bap.range
                    if (bap.userDefined) currentBap.userDefined = bap.userDefined
                    currentBap.enabled = bap.enabled
                    currentBap.priority = bap.priority
                    that.state.baps.push(currentBap)
                    update = true
            }
            else{
                that.state.baps.push(currentBap)
            }
        })
        if(!update && bap.id){
            this.state.baps.push(bap)
        }

        var layers = this.getVisibleLayers();

        layers.forEach(function (layer) {
            let l = {}
            l.id = layer.id
            l.opacity = layer.getOpacity()
            if (layer.mapLayer.timeControl) {
                l.time = layer.mapLayer.timeControl
            }
            that.state.layers.push(l)
        });

        updateUrlWithState()
    }

    this.getAllBaps = function () {
        let allBaps = []
        $.each(actionHandlerHelper.enabledActions, function (index, action) {
            $.each(action.config.baps, function (index, bap) {
                allBaps.push(bap)
            })
        })
        return allBaps
    }

};