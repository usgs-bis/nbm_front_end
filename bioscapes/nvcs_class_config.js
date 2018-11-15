let nvcs_bioscape = {
    "id": "5810cd6fe4b0f497e7975237",
    "title": "GAP/LANDFIRE National Terrestrial Ecosystems 2011",
    "summary": "The GAP/LANDFIRE National Terrestrial Ecosystems represents a highly thematically detailed land cover map of the U.S.  The GAP/LANDFIRE National Terrestrial Ecosystems dataset is produced by the U.S. Geological Survey in collaboration with the LANDIFRE Program. The GAP produces data and tools that help meet critical national challenges such as biodiversity conservation, renewable energy development, climate change adaptation, and infrastructure investment. Learn more about GAP and other GAP data (including protected areas and species habitat maps) at http://gapanalysis.usgs.gov.",
    "lastUpdated": "April 7, 2017",
    "defaultBapMessage": " ",
    "hideHowToUse": true,
    "elevation" : {
        "elevationSource" : "https://nationalmap.gov/epqs/pqs.php?",
        "elevationTimeout" : "250"
    },
    "rightPanelMessage": "Identify a location on the map to find out about the Ecosystems that occur there.",
    "radioSelections": {
        "580ff6e4e4b0f497e7960b53":true,
        "580ffa58e4b0f497e7960b5e":true,
        "580a50ece4b0f497e7906700":true,
        "5811385de4b0f497e799c5da":true,
        "582a1819e4b01fad8726554a":true
    },
    "layerSections": [
        {
            "title": "Analysis Layers",
            "expand": true,
            "opacityControl": true,
            "layers": [

                {
                    "title": "Class",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d1b8ade4b0236b68f6b88e",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "class",
                        "transparent": true
                    },
                    "actionConfig": {
                        "actionType": "none",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53",
                            "580ffa58e4b0f497e7960b5e",
                            "580a50ece4b0f497e7906700",
                            "5811385de4b0f497e799c5da",
                            "582a1819e4b01fad8726554a"
                        ],
                        "additionalParams": {
                            "layerLevel": 0,
                            "levelName": "NVCS Class",
                            "refName": "nvc_class"
                        }
                    }
                },
                {
                    "title": "Subclass",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d2b96ce4b0236b68f84d9f",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "subclass",
                        "transparent": true
                    },
                    "actionConfig": {
                        "actionType": "none",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53",
                            "580ffa58e4b0f497e7960b5e",
                            "580a50ece4b0f497e7906700",
                            "5811385de4b0f497e799c5da",
                            "582a1819e4b01fad8726554a"
                        ],
                        "additionalParams": {
                            "layerLevel": 1,
                            "levelName": "NVCS Subclass",
                            "refName": "nvc_subcl"
                        }
                    }
                },
                {
                    "title": "Formation",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d1ba7ae4b0236b68f6b8a3",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "formation",
                        "transparent": true
                    },
                    "actionConfig": {
                        "actionType": "none",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53",
                            "580ffa58e4b0f497e7960b5e",
                            "580a50ece4b0f497e7906700",
                            "5811385de4b0f497e799c5da",
                            "582a1819e4b01fad8726554a"
                        ],
                        "additionalParams": {
                            "layerLevel": 2,
                            "levelName": "NVCS Formation",
                            "refName": "nvc_form"
                        }
                    }
                },
                {
                    "title": "Division",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d2ba5ae4b0236b68f84db5",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "division",
                        "transparent": true
                    },
                    "actionConfig": {
                        "actionType": "none",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53",
                            "580ffa58e4b0f497e7960b5e",
                            "580a50ece4b0f497e7906700",
                            "5811385de4b0f497e799c5da",
                            "582a1819e4b01fad8726554a"
                        ],
                        "additionalParams": {
                            "layerLevel": 3,
                            "levelName": "NVCS Division",
                            "refName": "nvc_div"
                        }
                    }
                },
                {
                    "title": "Macrogroup",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d1bad8e4b0236b68f6b8a5",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "macrogroup",
                        "transparent": true
                    },
                    "actionConfig": {
                        "actionType": "none",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53",
                            "580ffa58e4b0f497e7960b5e",
                            "580a50ece4b0f497e7906700",
                            "5811385de4b0f497e799c5da",
                            "582a1819e4b01fad8726554a"
                        ],
                        "additionalParams": {
                            "layerLevel": 4,
                            "levelName": "NVCS Macrogroup",
                            "refName": "nvc_macro"
                        }
                    }
                },
                {
                    "title": "Group",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d2bab6e4b0236b68f84dba",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "group",
                        "transparent": true
                    },
                    "actionConfig": {
                        "actionType": "none",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53",
                            "580ffa58e4b0f497e7960b5e",
                            "580a50ece4b0f497e7906700",
                            "5811385de4b0f497e799c5da",
                            "582a1819e4b01fad8726554a"
                        ],
                        "additionalParams": {
                            "layerLevel": 5,
                            "levelName": "NVCS Group",
                            "refName": "nvc_group"
                        }
                    }
                },
                {
                    "title": "Ecological System",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d1bb47e4b0236b68f6b8a7",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "ecological_system",
                        "transparent": true
                    },
                    "actionConfig": {
                        "actionType": "none",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53",
                            "580ffa58e4b0f497e7960b5e",
                            "580a50ece4b0f497e7906700",
                            "5811385de4b0f497e799c5da"
                        ],
                        "additionalParams": {
                            "layerLevel": 6,
                            "levelName": "NVCS Ecological System",
                            "refName": "ecosys_lu"
                        }
                    }
                },
                {
                    "title": "HBP",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d1bb47e4b0236b68f6b8a7",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "ecological_system",
                        "transparent": true,
                        "opacity": 0.5,
                        "zIndex": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "actionType": "identify",
                        "noDataValue": 0,
                        "lookupProperty": "pixel_value",
                        "baps": [
                            "582a1819e4b01fad8726554a"
                        ],
                        "priority": "5ab93f5fe4b081f61ab9c97f",
                        "additionalParams": {
                            "layerLevel": 6,
                            "levelName": "NVCS Ecological System",
                            "refName": "ecosys_lu"
                        }
                    }
                }
            ]
        },
        {
            "title": "Basemaps",
            "selectionType": "radio",
            "layers": [
                {
                    "title": "USGS Topographic",
                    "serviceUrl": "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer",
                    "serviceType": "esri.tiledMapLayer",
                    "noLegend": true,
                    "selected": true,
                    "thumbnailImage": "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/info/thumbnail",
                    "leafletProperties": {
                        "zIndex": 0
                    }
                },
                {
                    "title": "USGS Imagery with Labels",
                    "serviceUrl": "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer",
                    "serviceType": "esri.tiledMapLayer",
                    "noLegend": true,
                    "thumbnailImage": "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/info/thumbnail",
                    "leafletProperties": {
                        "zIndex": 0
                    }
                },
                {
                    "title": "Open Street Map",
                    "serviceUrl": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    "serviceType": "tileLayer",
                    "thumbnailImage": "http://www.arcgis.com/sharing/rest/content/items/5d2bfa736f8448b3a1708e1f6be23eed/info/thumbnail/temposm.jpg",
                    "leafletProperties": {
                        "zIndex": 0
                    }
                },
                {
                    "title": "Elevation and Bathymetry",
                    "serviceUrl": "http://gmrt.marine-geo.org/cgi-bin/mapserv?map=/public/mgg/web/gmrt.marine-geo.org/htdocs/services/map/wms_merc.map",
                    "serviceType": "tileLayer.wms",
                    "noLegend": true,
                    "thumbnailImage": "images/elv-bath-image.png",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "topo",
                        "zIndex": 0
                    }
                },
                {
                    "title": "ESRI World Oceans",
                    "serviceUrl": "//services.arcgisonline.com/arcgis/rest/services/Ocean_Basemap/MapServer",
                    "serviceType": "esri.tiledMapLayer",
                    "noLegend": true,
                    "selected": false,
                    "thumbnailImage": "https://www.arcgis.com/sharing/rest/content/items/48b8cec7ebf04b5fbdcaf70d09daff21/info/thumbnail/tempoceans.jpg",
                    "leafletProperties": {
                        "zIndex": 0
                    }
                },
                {
                    "title": "ESRI World Street Map",
                    "serviceUrl": "//services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer",
                    "serviceType": "esri.tiledMapLayer",
                    "noLegend": true,
                    "selected": false,
                    "thumbnailImage": "https://www.arcgis.com/sharing/rest/content/items/3b93337983e9436f8db950e38a8629af/info/thumbnail/ago_downloaded.jpg",
                    "leafletProperties": {
                        "zIndex": 0
                    }
                }
            ]
        },
        {
            "title": "Summarization Regions",
            "selectionType": "radio",
            "expand": true,
            "layers": [
                {
                    "title": "Omernik Level III Ecoregion",
                    "serviceUrl": "https://my-beta.usgs.gov/geoserver/bcb/wms",
                    "serviceType": "WMS.overlay",
                    "includeIdentifyLayer": "layer6section0",
                    "defaultSummaryLayer": true,
                    "layerSectionLink": 0,
                    "selected": true,
                    "metadataSBId": "55c77f7be4b08400b1fd82d4",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "ecoregion_geom",
                        "transparent": true,
                        "pane": "summarizationPane",
                        "opacity": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultConditional",
                        "actionType": "getFeature",
                        "lookupProperty": "us_l3code",
                        "headerBap": "58b737a3e4b01ccd54ff854d",
                        "baps": [
                            "580ff6e4e4b0f497e7960b53"
                        ]
                    }
                },
                {
                    "title": "Landscape Conservation Cooperative",
                    "serviceUrl": "https://my-beta.usgs.gov/geoserver/bcb/wms",
                    "serviceType": "WMS.overlay",
                    "includeIdentifyLayer": "layer6section0",
                    "layerSectionLink": 0,
                    "metadataSBId": "55b943ade4b09a3b01b65d78",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "lcc_geom",
                        "transparent": true,
                        "pane": "summarizationPane",
                        "opacity": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "conditional",
                        "actionType": "getFeature",
                        "lookupProperty": "area_num",
                        "headerBap": "58c04dece4b014cc3a3bf3cf",
                        "baps": [
                            "580ffa58e4b0f497e7960b5e"
                        ]
                    }
                },
                {
                    "title": "State",
                    "serviceUrl": "https://my-beta.usgs.gov/geoserver/bcb/wms",
                    "serviceType": "WMS.overlay",
                    "includeIdentifyLayer": "layer6section0",
                    "layerSectionLink": 0,
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "state_geom",
                        "transparent": true,
                        "pane": "summarizationPane",
                        "opacity": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "conditional",
                        "actionType": "getFeature",
                        "lookupProperty": "state_fips",
                        "headerBap": "58c04da0e4b014cc3a3bf3cb",
                        "baps": [
                            "580a50ece4b0f497e7906700"
                        ]
                    }
                },
                {
                    "title": "County",
                    "serviceUrl": "https://my-beta.usgs.gov/geoserver/bcb/wms",
                    "serviceType": "WMS.overlay",
                    "includeIdentifyLayer": "layer6section0",
                    "layerSectionLink": 0,
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "county_geom",
                        "transparent": true,
                        "pane": "summarizationPane",
                        "opacity": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "conditional",
                        "actionType": "getFeature",
                        "lookupProperty": "stco_fipsc",
                        "headerBap": "58c04dc5e4b014cc3a3bf3cd",
                        "baps": [
                            "5811385de4b0f497e799c5da"
                        ]
                    }
                }
            ]
        }
    ]
}
