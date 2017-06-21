'use strict';

/**
 * Most of this code was copied from gnibeda's demo on parsing html into pdfMake format: https://github.com/bpampuch/pdfmake/issues/205
 */
var HtmlToPdfMakeParser = (function(parser) {
    function parseContainer(cnt, e, p, styles) {
        var elements = [];
        var children = e.childNodes;
        var i;
        if (children.length != 0) {
            for (i = 0; i < children.length; i++) p = parseElement(elements, children[i], p, styles);
        }
        if (elements.length != 0) {
            for (i = 0; i < elements.length; i++) cnt.push(elements[i]);
        }
        return p;
    }

    function computeStyle(o, styles) {
        for (var i = 0; i < styles.length; i++) {
            var st = styles[i].trim().toLowerCase().split(":");
            if (st.length == 2) {
                switch (st[0]) {
                    case "font-size":
                    {
                        o.fontSize = parseInt(st[1]);
                        break;
                    }
                    case "text-align":
                    {
                        switch (st[1]) {
                            case "right":
                                o.alignment = 'right';
                                break;
                            case "center":
                                o.alignment = 'center';
                                break;
                        }
                        break;
                    }
                    case "font-weight":
                    {
                        switch (st[1]) {
                            case "bold":
                                o.bold = true;
                                break;
                        }
                        break;
                    }
                    case "text-decoration":
                    {
                        switch (st[1]) {
                            case "underline":
                                o.decoration = "underline";
                                break;
                        }
                        break;
                    }
                    case "font-style":
                    {
                        switch (st[1]) {
                            case "italic":
                                o.italics = true;
                                break;
                        }
                        break;
                    }
                    default:
                    {
                        console.log("Parsing for style " + st[0] + " not found");
                        break;
                    }
                }
            }
        }
    }

    function parseElement(cnt, e, p, styles) {
        var t, k, st;
        if (!styles) styles = [];
        if (e.getAttribute) {
            var nodeStyle = e.getAttribute("style");
            if (nodeStyle) {
                var ns = nodeStyle.split(";");
                for (k = 0; k < ns.length; k++) styles.push(ns[k]);
            }
        }

        switch (e.nodeName.toLowerCase()) {
            case "#text":
            {
                t = {text: e.textContent.replace(/\n/g, "")};
                if (styles) computeStyle(t, styles);
                p.text.push(t);
                break;
            }
            case "a":
            {
                t = {text: e.textContent, link: e.href, color: 'blue'};
                if (styles) computeStyle(t, styles.concat(["text-decoration:underline"]));
                p.text.push(t);
                break;
            }
            //right now there isn't support for superscript so we'll make it bold to differentiate
            case "b":
            case "strong":
            case "sup":
            {
                parseContainer(cnt, e, p, styles.concat(["font-weight:bold"]));
                break;
            }
            case "u":
            {
                parseContainer(cnt, e, p, styles.concat(["text-decoration:underline"]));
                break;
            }
            case "h4":
            {
                t = {text: e.textContent, fontSize: 12, bold: true, margin: [0,10,0,5]};
                if (styles) computeStyle(t, styles.concat(["text-decoration:underline"]));
                p.text.push(t);
                break;
            }
            case "i":
            case "em":
            {
                parseContainer(cnt, e, p, styles.concat(["font-style:italic"]));
                break;
            }
            case "span":
            {
                parseContainer(cnt, e, p, styles);
                break;
            }
            case "br":
            {
                p = createParagraph();
                cnt.push(p);
                break;
            }
            case "table":
            {
                p = createParagraph();
                t = {
                    table: {
                        widths: [],
                        body: []
                    }
                };
                var border = e.getAttribute("border");
                var isBorder = false;
                if (border) if (parseInt(border) == 1) isBorder = true;
                if (!isBorder) t.layout = 'noBorders';
                parseContainer(t.table.body, e, p, styles);

                var widths = e.getAttribute("widths");
                if (!widths) {
                    if (t.table.body.length != 0) {
                        if (t.table.body[0].length != 0) for (k = 0; k < t.table.body[0].length; k++) t.table.widths.push("*");
                    }
                } else {
                    var w = widths.split(",");
                    for (k = 0; k < w.length; k++) t.table.widths.push(w[k]);
                }
                cnt.push(t);
                cnt.push(p);
                break;
            }
            case "tbody":
            {
                parseContainer(cnt, e, p, styles);
                break;
            }
            case "tr":
            {
                var row = [];
                parseContainer(row, e, p, styles);
                cnt.push(row);
                break;
            }
            case "td":
            {
                p = createParagraph();
                st = {stack: []};
                st.stack.push(p);

                var rspan = e.getAttribute("rowspan");
                if (rspan) st.rowSpan = parseInt(rspan);
                var cspan = e.getAttribute("colspan");
                if (cspan) st.colSpan = parseInt(cspan);

                parseContainer(st.stack, e, p, styles);
                cnt.push(st);
                break;
            }
            case "ul":
            case"ol":
            {
                p = createParagraph();
                var l = {};
                l[e.nodeName.toLowerCase()] = [];
                parseContainer(l[e.nodeName.toLowerCase()], e, p, styles);
                cnt.push(l);
                cnt.push(p);
                break;
            }
            case "li":
            {
                p = createParagraph();
                st = {stack: []};
                st.stack.push(p);
                parseContainer(st.stack, e, p, styles);
                cnt.push(st);
                break;
            }
            case "div":
            case "p":
            {
                p = createParagraph();
                st = {stack: []};
                st.stack.push(p);
                computeStyle(st, styles);
                parseContainer(st.stack, e, p);

                cnt.push(st);
                break;
            }
            default:
            {
                console.log("Parsing for node " + e.nodeName + " not found");
                break;
            }
        }
        return p;
    }

    /**
     * Parses the given HTML into an array of objects for pdfMake to read for PDF output.
     *  Note: The HTML passed in must be wrapped in a div or span tag in order for this to work.
     * @param {string} htmlText - must be wrapped in div or span
     * @returns {Array}
     */
    function parseHtml(htmlText) {
        var cnt = [];
        var html = $(htmlText.replace(/\t/g, "").replace(/\n/g, ""));
        var p = createParagraph();
        for (var i = 0; i < html.length; i++) parseElement(cnt, html.get(i), p);
        return cnt
    }

    function createParagraph() {
        return {text: []};
    }

    parser = {
        parseHtml: parseHtml
    };

    return parser;
})(HtmlToPdfMakeParser || {});
