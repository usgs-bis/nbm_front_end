let dev_biogeography_bioscape = {
    "id": "5667130ee4b06a3ea36c8be8",
    "title": "National Biogeographic Map",
    "summary": "The National Biogeographic Map is a concept being pursued within the Core Science Analytics, Synthesis and Libraries program. It is intended as a cohesive point of entry to view and interact with all of the biogeographic and biodiversity data systems produced by our program or used within the analytical processes of our group. This bioscape provides the configuration details behind the National Biogeographic Map that drives an online mapping interface.",
    "lastUpdated": "Aug 29, 2018",
    "hideHowToUse": true,
    "defaultPriority": "58bf0b61e4b014cc3a3a9c10",
    "defaultBapMessage": " ",
    "globalTimeSlider": {
        "autoRangeAdjust": true,
        "startDate": "1981",
        "endDate": "2018",
        "defaultDate": 2010,
        "rangeMinStart": 2005,
        "rangeMaxStart": 2015
    },
    "elevation": {
        "elevationSource": "https://nationalmap.gov/epqs/pqs.php?",
        "elevationTimeout": "250"
    },
    "placeOfInterestSearch": {
        "sfrPoint": "https://sciencebase.usgs.gov/staging/bis/api/v1/places/search/point?",
        "sfrText": "https://sciencebase.usgs.gov/staging/bis/api/v1/places/search/text?q=",
        "sfrFeature": "https://sciencebase.usgs.gov/staging/bis/api/v1/places/search/feature?feature_id=",
        "actionConfig": {
            "displayCriteria": "search",
            "lookupProperty": "feature_name",
            "clickToSearch": true,
            "actionType": "searchPoi",
            "headerBap": "5a28413be4b03852bafe148e",
            "baps": [
                "58bf0b61e4b014cc3a3a9c10",
                "5abd5fede4b081f61abfc472",
                "5b685d1ce4b006a11f75b0a8",
                "5aa2b21ae4b0b1c392e9d968",
                "5b747802e4b0f5d5787ed299",
                "5b7c1ef2e4b0f5d5788601be",
                "5b86d48ce4b0702d0e7962b5",
                "5b96d589e4b0702d0e82700a"
            ],
            "priority": "58bf0b61e4b014cc3a3a9c10"
        }
    },
    "layerSections": [
        {
            "title": "Analysis Layers",
            "opacityControl": true,
            "selectionType": "checkbox",
            "layers": [
                {
                    "title": "First Leaf by Year",
                    "serviceUrl": "https://geoserver.usanpn.org/geoserver/si-x/wms?",
                    "serviceType": "tileLayer.wms",
                    "metadataSBId": "591c6ec6e4b0a7fdb43dea8a",
                    "featureName": "average_leaf_prism",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "average_leaf_prism",
                        "time": "2010-01-01",
                        "transparent": true,
                        "opacity": 0.5,
                        "zIndex": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "globalTimeSlider": true,
                        "actionType": "drawPolygon",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "58bf0b61e4b014cc3a3a9c10",
                            "5b685d1ce4b006a11f75b0a8"
                        ]
                    }
                },
                {
                    "title": "First Bloom",
                    "serviceUrl": "https://geoserver.usanpn.org/geoserver/si-x/wms?",
                    "serviceType": "tileLayer.wms",
                    "metadataSBId": "5ac3b12ee4b0e2c2dd0c2b95",
                    "featureName": "average_bloom_prism",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "average_bloom_prism",
                        "time": "2010-01-01",
                        "transparent": true,
                        "opacity": 0.5,
                        "zIndex": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "globalTimeSlider": true,
                        "actionType": "drawPolygon",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "5abd5fede4b081f61abfc472",
                            "5b685d1ce4b006a11f75b0a8"
                        ]
                    }
                },
                {
                    "title": "PAD-US v1.4 GAP Status Code",
                    "serviceUrl": "https://gis1.usgs.gov/arcgis/rest/services/PADUS1_4/GAP_Status_Code/MapServer",
                    "serviceType": "esri.tiledMapLayer",
                    "featureName": "Primary Designation Name",
                    "metadataSBId": "56bba50ce4b08d617f657956",
                    "leafletProperties": {
                        "layers": [
                            0
                        ],
                        "zIndex": 2,
                        "transparent": true,
                        "opacity": 0.5
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "actionType": "none",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "5b747802e4b0f5d5787ed299",
                            "5b86d48ce4b0702d0e7962b5"
                        ]
                    }
                },
                {
                    "title": "Species Range",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/CONUS_Range_2001/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "",
                    "hideCheckbox": true,
                    "zoomLimits": {
                        "minZoom": 1,
                        "maxZoom": 18
                    },
                    "leafletProperties": {
                        "format": "image/png",
                        // "layers": "CONUS_Range_2001v1:Species_CONUS_Range_2001v1",
                        "transparent": true
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "actionType": "none",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "5b86d48ce4b0702d0e7962b5"
                        ]
                    }
                },
                {
                    "title": "Habitat Map",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/CONUS_HabMap_2001/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "",
                    "hideCheckbox": true,
                    "zoomLimits": {
                        "minZoom": 1,
                        "maxZoom": 18
                    },
                    "leafletProperties": {
                        "format": "image/png",
                        "transparent": true
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "actionType": "none",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "5b86d48ce4b0702d0e7962b5"
                        ]
                    }
                },
                {
                    "title": "GAP Landcover 2011 Ecological System",
                    "serviceUrl": "https://www.sciencebase.gov/geoserver/nvcs/wms",
                    "serviceType": "WMS.overlay",
                    "metadataSBId": "58d1bb47e4b0236b68f6b8a7",
                    "zoomLimits": {
                        "minZoom": 8,
                        "maxZoom": 18
                    },
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "ecological_system",
                        "transparent": true
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "actionType": "none",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "5b747802e4b0f5d5787ed299"
                        ]
                    }
                },
                {
                    "title": "Phenocasts",
                    "serviceUrl": "https://geoserver.usanpn.org/geoserver/gdd/wms?",
                    "serviceType": "tileLayer.wms",
                    "metadataSBId": "5bacf0e3e4b08583a5d10c7f",
                    "featureName": "agdd",
                    "leafletProperties": {
                        "format": "image/png",
                        "layers": "agdd_50f,agdd",
                        "transparent": true,
                        "opacity": 0.5,
                        "zIndex": 1
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "actionType": "drawPolygon",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "5b96d589e4b0702d0e82700a"
                        ]
                    }
                },
                {
                    "title": "Fish Habitat Condition Index",
                    "serviceUrl": "https://gis1.usgs.gov/arcgis/rest/services/nfhp2015/HCI_Dissolved_NFHP2015_v20160907/MapServer",
                    "serviceType": "esri.dynamicMapLayer",
                    "metadataSBId": "58c8542ce4b0849ce97961e4",
                    "leafletProperties": {
                        "layers": [
                            0,
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14
                        ],
                        "zIndex": 2
                    },
                    "actionConfig": {
                        "displayCriteria": "defaultAlways",
                        "actionType": "none",
                        "headerBap": "58dd6032e4b02ff32c68596b",
                        "baps": [
                            "5aa2b21ae4b0b1c392e9d968"
                        ]
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
                    "thumbnailImage": "https://www.arcgis.com/sharing/rest/content/items/48b8cec7ebf04b5fbdcaf70d09daff21/info/thumbnail/tempoceans.jpg",
                    "leafletProperties": {
                        "zIndex": 0
                    }
                }
            ]
        }
    ]
}
