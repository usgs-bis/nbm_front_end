//= require services/HtmlToPdfMakeParser.js
//= require_tree ../third_party/pdfmake/
'use strict';

var PDF = function(bioScape, title, type, acres, summary, webLinks, definition, definitionUrl, map, analysisPackages) {
    this.bioScape = bioScape;
    this.title = title;
    this.type = type;
    this.acres = acres;
    this.summary = summary;
    this.webLinks = webLinks;
    this.definition = definition;
    this.definitionUrl = definitionUrl;
    this.map = map;
    this.analysisPackages = analysisPackages;

    this.MAX_WIDTH = 500;
};
PDF.prototype.buildAndDownload = function(marker) {
    var self = this;
    $(`.tooltip`).remove()
    this.getMapImage(marker)
        .then(function(data) {
            return self.createLayoutAndGetCharts(data);
        })
        .then(function(pdfInfo) {
            self.download(pdfInfo, hideSpinner);
        })
        .catch(function(err) {
            console.log(err);
            hideSpinner();
            showErrorDialog('The pdf failed to be created. Error: ' + err.message);
        });
};
//Get an image the same way Terria (v1.0.50) does: terriajs/lib/Models/Leaflet.js
PDF.prototype.getMapImage = function(marker) {
    // Temporarily remove the map credits and zoom control so they aren't displayed in the PDF.
    //this.map.attributionControl.remove();

    var controls = $('.leaflet-control-container');
    controls.hide();

    var mapPaneTransforms = getTransformXAndY(this.map.getPane('mapPane'));

    var featureLayer = $("svg.leaflet-zoom-animated")[0];
    var oldViewbox = featureLayer.getAttribute("viewBox");
    var featureWidth = featureLayer.getAttribute("width");
    var featureHeight = featureLayer.getAttribute("height");
    var oldFeatureTransform = getTransformXAndY(featureLayer);
    featureLayer.style.transform = "";
    featureLayer.setAttribute("viewBox", "0 0 " + featureWidth + " " + featureHeight);

    var featureCanvas = document.createElement('canvas');
    featureCanvas.setAttribute("width", featureWidth);
    featureCanvas.setAttribute("height", featureHeight);
    // canvg(
    //     featureCanvas,
    //     $('<div>').append($(featureLayer).clone()).html(), //gets the svg element as a string
    //     { offsetX: mapPaneTransforms.x, offsetY: mapPaneTransforms.y}
    // );

     // var self = this;
    var promise = html2canvas(this.map.getContainer(), { useCORS: true,  logging: false })
        .then(function(canvas) {
            //add the feature image to the canvas
            var destCtx = canvas.getContext('2d');
            destCtx.drawImage(featureCanvas,0,0);

            //add the marker image to the canvas
            if (marker) {
                var markerEl = marker.getElement();
                var transformVals = getTransformXAndY(markerEl);
                var x = (transformVals.x + mapPaneTransforms.x - markerEl.width/2);
                var y = (transformVals.y + mapPaneTransforms.y - markerEl.height);
                destCtx.drawImage(markerEl, x, y);
            }

            try {
                return canvas.toDataURL("image/jpeg");
            } catch (e) {
                throw e;
            }
        });

    //Put the zoom control and map credits back on the map
    //self.map.attributionControl.addTo(map);

    controls.show();

    //Return the feature to it's old state
    featureLayer.style.transform = "translate(" + (oldFeatureTransform.x) + "px," + (oldFeatureTransform.y) + "px)";
    featureLayer.setAttribute("viewBox", oldViewbox);

    return promise;

    function getTransformXAndY(el) {
        var val = {x: 0, y: 0};
        if(el.style && el.style.transform) {
            var transforms = el.style.transform.split(",");
            val.x = parseFloat(transforms[0].split("(")[1].replace("px", ""));
            val.y = parseFloat(transforms[1].replace("px", ""));
        }
        return val;
    }
};
PDF.prototype.createLayoutAndGetCharts = function(mapImageDataUrl) {
    var dd = {
        header: function(currentPage, pageCount) {
            // you can apply any logic and return any valid pdfmake element
            var pageText = 'Page: ' + currentPage.toString();

            return currentPage == 1 ? '' : {
                table: {
                    headerRows: 0,
                    widths: ['*'],
                    body: [
                        [
                            {
                                text: pageText,
                                alignment: 'right'
                            }
                        ]
                    ]
                },
                layout: 'noBorders',
                margin: [48,24,48,0]
            };
        },
        footer: function() {
            return {
                stack: [
                    {text:'U.S. Department of the Interior'},
                    {text:'U.S. Geological Survey'}
                ],
                style: 'footer'
            };
        },
        content: [],
        images: {},
        defaultStyle: {
            fontSize: 10
        },
        styles: {
            title: {
                fontSize: 18
            },
            bapHeader: {
                fontSize: 16,
                bold: true,
                margin: [5,10,0,5]
            },
            header: {
                fontSize: 12,
                bold: true,
                margin: [0,10,0,5]
            },
            bapContent: {
                margin: [10,5,0,5]
            },
            subtitle: {
                fontSize: 14,
                bold: true
            },
            subTitleChart: {
                fontSize: 12,
                bold: true,
                margin: [10,5,20,5]
            },
            titleChart: {
                fontSize: 14,
                bold: true,
                margin: [10,5,0,5]
            },
            tableHeader: {
                bold: true,
                fontSize: 10,
                color: 'black'
            },
            tableStyle: {
                fontSize: 9,
                margin: [0,0,0,20]
            },
            link: {
                color: 'blue',
                decoration: 'underline'
            },
            titlePageHeader: {
                fontSize: 24,
                bold: true,
                alignment: 'left',
                margin: [0,72,0,0]
            },
            sectionHeader: {
                fontSize: 20,
                bold: true,
                alignment: 'center'
            },
            footer: {
                fontSize: 10,
                margin: [48,10,48,0]
            },
            appendixContent: {
                margin: [0,2,0,2]
            }
        },
        pageMargins: [48,48,48,48]
    };

    return this.getPdfInfoContent(mapImageDataUrl)
        .then(function(pdfContent) {
            dd.content = dd.content.concat(pdfContent.content);
            return {
                content: dd,
                charts: pdfContent.charts
            };
        });
};
PDF.prototype.getPdfInfoContent = function(mapImageDataUrl) {
    let that = this;
    var info = [];
    info = info.concat(this.getTitlePage(mapImageDataUrl));
    info = info.concat(this.getBioScapeSection(mapImageDataUrl));
    return this.getSynthesisCompositionSection()
    .then(function (synthComp) {
        info = info.concat(synthComp.content);
        return {
            content: info,
            charts: synthComp.charts
        };
        // return that.getAppendix()
        //     .then(function (data) {
        //         info = info.concat(data);
        //         return {
        //             content: info,
        //             charts: synthComp.charts
        //         };
        //     });
    })
};
PDF.prototype.getTitlePage = function(mapImageDataUrl) {
    var info = [];
    //Title page
    info.push({
        image: 'data:image/png;base64,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',
        width: 192,
        alignment: 'left',
        marginTop: -24
    });
    info.push({
        text: this.bioScape.title + '\nSummary Report: ' + this.title + (this.type ? '\n' + this.type : ''),
        style: 'titlePageHeader'
    });
    info.push({
        image: mapImageDataUrl,
        alignment: 'center',
        width: this.MAX_WIDTH * 0.8,
        margin: [0,20,0,20]
    });
    let fullDate = formatLocalDateToISO8601().split(",");
    let time = fullDate[0]
    let date = fullDate[1]
    info.push({
        text: [
            {text: 'This summary report was generated on ' + date + ' at ' + time + ' using USGS National ' +
            'Biogeographic Map analytics and data assets. The analysis packages and data sources used for this ' +
            'synthesis are documented below. To recreate the synthesis with current data and analytical methods, ' +
            'click this '},
            {text: 'link', link: window.location.href, style: 'link'},
            // {text: '.\n\nTo cite this report: '},
            // {text: window.location.href, link: window.location.href, style: 'link'},
            {text: '.\n\nFor questions or comments please contact: ' + supportEmail + '. Please include the provided link ' +
            'with all correspondence.'}
        ],
        margin: [0,10,0,0],
        fontSize: 10,
        pageBreak: 'after'
    });

    return info;
};
PDF.prototype.getBioScapeSection = function(mapImageDataUrl) {
    var info = [];
    // info.push({text: 'Bioscape Section', style: 'sectionHeader'});
    // info.push({image: mapImageDataUrl, alignment: 'center', width: this.MAX_WIDTH});
    // info.push({text: $('.coordinates').text()});
    info.push(this.getLegendContent());
    info.push({text: this.bioScape.title, style: ['header','title']});
    // info.push(
    //     {text: 'Definition', bold: true},
    //     this.getParsedHtml(this.bioScape.definition, {style: 'bapContent', italics: true}),
    //     {
    //         text: [
    //             {text: 'See the ScienceBase item for more information: '},
    //             {text: this.bioScape.definitionUrl, link: this.bioScape.definitionUrl, style: 'link'}
    //         ],
    //         style: 'bapContent'
    //     }
    // );
    info.push({text: 'Summary', bold: true});
    info.push(this.getParsedHtml(this.bioScape.summary,{style:'bapContent'}));
    // info.push({text: 'Sections', bold: true});
    // this.bioScape.getAllSections().forEach(function(section) {
    //     info.push({text: section.title, style: ['bapContent', 'subtitle']});
    //     section.getLayers().forEach(function(layer) {
    //         info.push({text: layer.title, margin: [15,5,0,5]});
    //     });
    // });

    return info;
};
PDF.prototype.getLegendContent = function() {
    var LABEL_COLUMN_WIDTH = 200;
    var self = this;
    var content = [];
    var contentObj = {};
    var layers = this.bioScape.getVisibleLayers();
    if(layers.length < 1) {
        return [];
    }
    var oneColumn = false;
    layers.forEach(function(layer) {
        if(layer.legend) {
            var legendContent = [
                [{
                    text: layer.legend.layerTitle,
                    margin: [10, 5, 0, 0],
                    fontSize: 10,
                    bold: true
                }]
            ];
            var largestImageWidth = 0;
            var table = {
                table: {
                    headerRows: 0,
                    body: []
                },
                layout: {
                    hLineWidth: function(i, node) { return 0; },
                    vLineWidth: function(i, node) { return 0; },
                    paddingLeft: function(i, node) { return 2; },
                    paddingRight: function(i, node) { return 0; },
                    paddingTop: function(i, node) { return 0; }
                },
                margin: [15, 0, 0, 0]
            };
            if(layer.legend.pdfLegendItems.length < 1) {
                table.table.body.push(
                    [
                        '',
                        'There was an error retrieving the legend for this service.'
                    ]
                )
            } else {
                layer.legend.pdfLegendItems.forEach(function (item) {
                    //I can't use the :contains jquery selector here because some of the labels contain an apostrophe.
                    //Using the filter instead works just fine.
                    var o = $("span.legendLabel").filter(function (i) {
                        return $(this).text() === item.label;
                    });
                    if (o.parent().hasClass("hideLegendItem")) return;
                    var imageWidth = item.image.width / 2;
                    if (imageWidth > largestImageWidth) {
                        largestImageWidth = imageWidth;
                    }
                    table.table.body.push(
                        [
                            {
                                image: item.image.url,
                                width: imageWidth,
                                height: item.image.height / 2
                            },
                            {
                                text: item.label,
                                fontSize: 9
                            }
                        ]
                    );
                });
            }
            table.table.widths = [largestImageWidth, LABEL_COLUMN_WIDTH];
            if((largestImageWidth + LABEL_COLUMN_WIDTH) > (self.MAX_WIDTH/2)) {
                oneColumn = true;
            }
            legendContent.push([table]);
            if(!contentObj[layer.section.title]) {
                contentObj[layer.section.title] = {
                    table: {
                        headerRows: 0,
                        body: [],
                        widths: ['*']
                    },
                    dontBreakRows: true,
                    layout:
                        {
                            hLineWidth: function(i, node) {
                                return (i < 2) ? 1 : 0;
                            },
                            hLineColor: function(i, node) {
                                return (i === 0) ? 'black' : 'lightgray';
                            },
                            vLineColor: function() {
                                return 'white';
                            }
                        }
                };
            }
            contentObj[layer.section.title].table.body = contentObj[layer.section.title].table.body.concat(legendContent);
        }
    });
    for(var prop in contentObj) {
        if(contentObj.hasOwnProperty(prop)) {
            var legend = contentObj[prop];
            legend.table.body = [
                // [{
                //     text: "",
                //     fontSize: 12
                // }]
            ].concat(legend.table.body);
            content = content.concat(legend);
        }
    }
    var leftColumn = {
        width:'*',
        stack: []
    };
    var rightColumn = {
        width:'*',
        stack: []
    };
    var row = [];
    content.forEach(function(item, idx) {
        row.push(item);
        if(idx % 2 == 0 || oneColumn) {
            leftColumn.stack.push(item);
        } else {
            rightColumn.stack.push(item);
        }
    });

    return [
        {
            columns: [
                leftColumn,
                rightColumn
            ],
            margin: [0,10,0,20]
        }
    ];
};
PDF.prototype.getSynthesisCompositionSection = function() {
    var info = [];
    info.push({text: 'Analysis', style: 'sectionHeader', pageBreak: 'before'});
    if (this.title) info.push({text: this.title, style: ['header','title']});
    if (this.type) info.push({text: this.type, style: 'bapContent'});
    // if (this.definitionUrl) {
    //     info.push({text: 'Definition', bold: true},
    //         this.getParsedHtml(this.definition, {style: 'bapContent', italics: true}),
    //         {
    //             text: [
    //                 {text: 'See the ScienceBase item for more information: '},
    //                 {text: this.definitionUrl, link: this.definitionUrl, style: 'link'}
    //             ],
    //             style: 'bapContent'
    //         }
    //     );
    // }
    if (this.acres) info.push({text: 'Area', bold: true}, {text: this.acres + ' acres', style: 'bapContent'});
    if (this.summary) info.push({text: 'Summary', bold: true}, {text: this.summary, italics: true, style: 'bapContent'});
    // if(this.webLinks) {
    //     info.push({text: "Web Links", bold: true, margin: [0,10,0,0]});
    //     this.webLinks.forEach(function (webLink) {
    //         info.push({text: webLink.title, link: webLink.uri, italics: true, style: ['link', 'bapContent']});
    //     });
    // }
    return this.getAnalysisPackageContent()
    .then(function(analysisPackageContent){
        info = info.concat(analysisPackageContent.content);
        return {
            content: info,
            charts: analysisPackageContent.charts
        };
    })
};
PDF.prototype.getAnalysisPackageContent = function() {
    var content = [];
    var that = this;
    let lastVisible = 0;
    this.analysisPackages.forEach(function (ap, idx) {
        if (ap.isVisible()){
            lastVisible = idx;
        }
    });
    this.analysisPackages.forEach(function(ap, idx) {
    
        if(ap.isVisible()) {
            content.push(getGeneralAnalysisPackageContent(ap, that.getParsedHtml));
         
            if (ap.widgets !== undefined) {
                $.each(ap.widgets, function (index, widget) {
                    content.push(widget.getPdfLayout());

                });
                if (idx !== lastVisible) {
                    content.push({
                        text: "",
                        pageBreak: 'after'
                    });
                }
            } else {
                content.push( ap.getPdfLayout());

            }
        }
    });

    return Promise.all(content)
        .then(function(c){
            var contents = [];
            var charts = [];
            c.forEach(function(data){
                if(data.content){
                    contents.push(data.content)
                }
                else{
                    contents.push(data)
                }
                if(data.charts){
                    data.charts.forEach(function(chart) {
                        charts.push(chart);
                    });
                }
            })
         
            let d = {}
            d.content = contents;
            d.charts = charts;
            return d        

        })
   
    function getGeneralAnalysisPackageContent(ap, parser) {
        var content = [];
        content.push({text: ap.title, style: 'bapHeader'});
        var scienceBaseData = ap.getInfoDivInfo();
        content.push({text: 'Description', bold: true, margin: [5,0,0,5]});
        content.push(parser(scienceBaseData.description, {margin: [10,0,0,0]}));
        content.push({text: 'Science base item', bold: true, margin: [7,10,0,5]},
            {text: scienceBaseData.bapReference, link: scienceBaseData.bapReference,
                style: 'link', margin: [10,0,0,0], });
        return content;
    }
};
PDF.prototype.getAppendix = function () {
    var that = this;
    var layers = this.bioScape.getVisibleLayers();
    if(!layers.length) {
        return Promise.resolve([]);
    }
    var textMap = {
        title: 'Layer Title',
        body: 'Description',
        url: 'ScienceBase Url',
        contacts: 'Contacts',
        webLinks: 'Web Links',
        alternateTitles: 'Alternate Titles'
    };

    var info = [];
    info.push({text: 'Appendix A', style: 'sectionHeader', pageBreak: 'before'});
    info.push({text: 'Map Metadata', style: 'title', alignment: 'center'});
    var promises = layers.map(function(layer) {
        return layer.getMetadata();
    });
    // var that = this;
    return Promise.all(promises)
        .then(function(data) {
            return data.reduce(function (info, metadata) {
                var layerContent = [
                    {text: metadata.title, style: ['appendixContent', 'subtitle']}
                ];
                if(metadata.url) {
                    layerContent.push({text: metadata.url, link: metadata.url, style: 'link', margin: [10,0,0,0]});
                    var parsedContent = getMetadataAsPDFContent(metadata);
                    layerContent = layerContent.concat(parsedContent);
                } else {
                    layerContent.push({text: 'No description or metadata available.'});
                }
                return info.concat(layerContent);
            }, info)
        });

    function getMetadataAsPDFContent(metadata) {
        var content = [];
        for(var prop in metadata) {
            if(metadata.hasOwnProperty(prop)) {
                var info = metadata[prop];
                if(info) {
                    content.push(getTitleEl(prop));
                    if( Object.prototype.toString.call( info ) === '[object Array]' ) {
                        $.each(info, function (index, obj) {
                            var text = obj.title;
                            if (!text) {
                                text = obj.name;

                                if (text) {
                                    if (obj.email) {
                                        text += " (" + obj.email + ")";
                                    }
                                }
                            }
                            if (!text) text = obj;

                            if (obj.uri || obj.url) {
                                content.push({text: text, link: obj.uri ? obj.uri : obj.url, style: 'link', margin: [5, 0, 0, 0]});
                            } else {
                                content.push({text: text, margin: [5, 0, 0, 0]})
                            }
                        });
                    } else {
                        if (typeof info === 'object') {
                            for (var prp in info) {
                                if (info.hasOwnProperty(prp)) {
                                    content.push({
                                        stack: [
                                            getTitleEl(prp),
                                            {text: info[prp]}
                                        ],
                                        margin: [5, 0, 0, 0]
                                    });
                                }
                            }
                        } else {
                            content.push(that.getParsedHtml(info, {style: 'appendixContent'}));
                        }
                    }
                }
            }
        }
        return content;
    }

    function getTitleEl(title) {
        return {text: textMap[title] ? textMap[title] : title + ':', bold: true};
    }
};
PDF.prototype.getParsedHtml = function(html, options) {
    var parsedContent = HtmlToPdfMakeParser.parseHtml('<div>' + html + '</div>');
    if(options) {
        for(var option in options) {
            if(options.hasOwnProperty(option) && parsedContent.length === 1) {
                parsedContent[0][option] = options[option];
            }
        }
    }

    return parsedContent;
};
PDF.prototype.download = function(pdfInfo, onCompletion) {
    var pdfLayout = pdfInfo.content;
    var charts = pdfInfo.charts;
    var pdfTitle = this.bioScape.title + ' Summary Report for ' + this.title + '.pdf';

    if(charts.length < 1) {
        pdfMake.createPdf(pdfLayout).download(pdfTitle);
        onCompletion();
        return;
    }

    var completedCharts = 0;
    for (var i = 0; i < charts.length; i++) {
        // Capture current state of the chart
        charts[i].export.capture({}, addChart);
    }

    function addChart() {
        // Export to PNG
        this.toPNG({}, function (data) {
            completedCharts++;
            pdfLayout.images[this.setup.chart.div.id] = data;
            if (completedCharts == charts.length) {
                // Save as single PDF and offer as download
                this.toPDF(pdfLayout, function (myData) {
                    this.download(myData, this.defaults.formats.PDF.mimeType, pdfTitle);
                    onCompletion();
                });
            }
        });
    }
};
