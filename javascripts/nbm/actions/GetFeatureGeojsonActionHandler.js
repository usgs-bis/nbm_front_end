'use strict';

var GetFeatureGeojsonActionHandler = function (config, layer) {
    this.feature = undefined;

    ActionHandler.call(this,
        config, layer);
};

inherit(ActionHandler, GetFeatureGeojsonActionHandler);

GetFeatureGeojsonActionHandler.prototype.processBaps = function (additionalParams) {
    var that = this;
    var promises = [];

    var gj = that.result.geojson;
    gj.geometry.crs = {"type":"name","properties":{"name":"EPSG:4326"}};

    return this.getSimplifiedGeojson(gj)
        .then(function (newGj) {
            var simplified = (newGj != gj);

            var bapsToProcess = that.getAllBapsToProcess();


            console.log(that.baps);
            console.log(bapsToProcess);

            $.each(bapsToProcess, function (index, bapId) {
                var tempBap = that.getBapValue(bapId);

                if (tempBap) {
                    tempBap.setEmptyBap();
                } else {
                    tempBap = new BAP({id: bapId});
                    that.setBapValue(bapId, tempBap);
                }

                var myMap = {};
                myMap.id = bapId;
                $.each (additionalParams, function (index, obj) {
                    $.each(obj, function (key, value) {
                        myMap[key] = value;
                    });
                });

                myMap.sbId = bapId;
                myMap.featureValue = JSON.stringify(newGj.geometry);

                promises.push(that.sendPostRequest(myServer + "/bap/get", myMap)
                    .then(function(data) {
                        // console.log("Ret data: ", data);
                        var bap = that.getBapValue(data.id);
                        bap.reconstruct(data, true);

                        var feature = that.createPseudoFeature(newGj.geometry);
                        feature.layer = that.layer;
                        bap.feature = feature;
                        bap.simplified = simplified;
                        bap.initializeBAP();
                        that.setBapValue(data.id, bap);
                        return Promise.resolve();
                    })
                    .catch(function (ex) {
                        console.log("Got an error", ex);
                        return Promise.resolve();
                    }));
            });

            return Promise.all(promises);
        });
};

GetFeatureGeojsonActionHandler.prototype.getSimplifiedGeojson = function(geojson) {
    var MIN_LIMIT = 17500;
    var gjString = JSON.stringify(geojson.geometry);
    if (gjString.length <= MIN_LIMIT) {
        console.log ('No Simplification Needed resolve the promise gjString size = '+ gjString.length);
        return Promise.resolve(geojson);
    }

    actionHandlerHelper.showTempPopup("The returned complex polygon is being simplified for analysis");
    return getSimplifiedGeojsonObject(geojson)
        .then(function(newGj) {
            var myObj = newGj.geometry;
            myObj.crs = {"type":"name","properties":{"name":"EPSG:4326"}};

            return newGj;
        });


    function getSimplifiedGeojsonObject(geojson, p) {
        var MAX_LIMIT = 875000;  /// Leave for later... reference
        console.log ('In getSimplifiedGeojsonObject');
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                if (geojson.pseudo) {
                    resolve(JSON.stringify(geojson.geometry));
                    return;
                }
                var geoCopy = $.extend(true, {}, geojson);
                p = p ? p : .025;
                var topo = topojson.topology(geoCopy);
                presimplify(topo);
                var quantile = topojson.quantile(topo, p);
                topojson.simplify(topo, quantile);
                var simple = topojson.feature(topo, topo.objects.geometry);
                var simpjson = JSON.stringify(simple.geometry);
                if (simpjson.length > 20000) {
                    console.log('invoking getSimplifiedGeojsonObject simpjson.length = '+ simpjson.length);
                    resolve(getSimplifiedGeojsonObject(geojson, (p * .5)));
                    return;
                }
                // var obj = L.geoJson(simple,
                //     {
                //         style: function () {
                //             return {
                //                 color: '#0000FF',
                //                 fillOpacity: .2,
                //                 weight: 1
                //             };
                //         },
                //         pane: 'featurePane'
                //     });
                // obj.addTo(map);
                //
                // var featjson = JSON.stringify(geojson.geometry);
                // console.log('feature length: ' + featjson.length + ' simple length: ' + simpjson.length);

                resolve(simple);
            }, 0);
        });
    }

    //The following code was taken and altered from Jason Davies post on line simplification:
    //https://www.jasondavies.com/simplify/
    function presimplify(topology) {
        var heap = minHeap(),
            tree = rbush(),
            maxArea = 0;
        var arcs = topology.arcs;
        for(var j = 0, length = arcs.length; j < length; ++j) {
            var points = arcs[j],
                previous = null,
                boxes = [];

            var i = 0,
                n = points.length - 1,
                point = points[i];
            while(++i <= n) {
                boxes.push(bbox(point, point = points[i]));
            }
            tree.load(boxes);

            for(i = 1; i < n; ++i) {
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

        while(triangle = heap.pop()) {
            // If the area of the current point is less than that of the previous point
            // to be eliminated, use the latter’s area instead. This ensures that the
            // current point cannot be eliminated without eliminating previously-
            // eliminated points.
            if (triangle.b[2] < maxArea) triangle.b[2] = maxArea;
            else maxArea = triangle.b[2];

            if(intersect(tree, triangle)) {
                intersecting.push(triangle);
                continue;
            }
            while(t = intersecting.pop()) {
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

            push: function(object) {
                array.push(object);
                up(array, object.index = size++);
                return size;
            },

            pop: function() {
                if (size <= 0) return;
                var removed = array[0],
                    object = array.pop();
                if (--size) {
                    array[object.index = 0] = object;
                    down(array, 0);
                }
                return removed;
            },

            remove: function(removed) {
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
};

GetFeatureGeojsonActionHandler.prototype.cleanUp = function () {
    if (this.feature) {
        this.feature.remove();
        this.feature = undefined;
    }

    if (this.result) {
        this.result = undefined;
    }

    this.cleanUpBaps();
};

GetFeatureGeojsonActionHandler.prototype.sendPostRequest = function (url, params) {
        console.log ('ready to send ajax request');
  //      console.log ('params = '+ params);
        var x = params.featureValue;
        var y = truncatePoints(x,6);
        if (y != null){
             params.featureValue = y;
        }
        return sendAjaxRequest({
            type: 'POST',
            url: url,
            data: params,
            dataType: 'json',
            error: function (xhr, options, thrownError) {
                    var message = "Error sending request to the BCB API, ";
                        message += "the dynamic polygon may be too complex.";

                    if (!actionHandlerHelper.handleBapError(params.sbId, message)) {
                        console.log("Could not set BAP error, BAP does not exist");
                    }
            }
        });

    function truncatePoints(cs, sigdigits){
        console.log('TruncatePoints Input String length = ' + cs.length);
        if (!sigdigits || typeof sigdigits != 'number'  ){
            sigdigits = 6;
        }
        var localString = cs;
        var startIdx = localString.indexOf('coordinates') + 11 ;
        var end = localString.indexOf('crs');
        var idx = startIdx;
        var dpoint = startIdx;
        var pcounts = 1;
        var e = 0;
        var et = 0;
        var eb = 0;
  //      console.log (' RAW STRING =  CS = '+ cs);
        while(idx < end ){
           dpoint = localString.indexOf(".",idx);
            if (dpoint > 0){
                idx = dpoint+ 1;
            }
            else {
                idx = end+1;
            }
            pcounts++;
            et = localString.indexOf(",",dpoint);
            eb = localString.indexOf("]", dpoint);
            if (et < eb && eb != -1 && et > startIdx){
                var t = localString.slice(dpoint+sigdigits,et-1);
                // should never happen... but jic only replace string if no special char's got mixed in.
                if (checkExtraSpecials(t) && checkDupString(localString, t, dpoint+sigdigits) ) {
                    localString = localString.replace(t, '');
                }
            }
            if (eb < et && et != -1){
                var t2 = localString.slice(dpoint+sigdigits,eb-1);
                if (checkExtraSpecials(t2) && checkDupString(localString, t2, dpoint+sigdigits)) {
                    localString = localString.replace(t2, '');
                }
            }
        }
     //   console.log('Numbers shortened = '+ pcounts);
     //   console.log ('Modified String = ' + localString);
    //    console.log ('Modified String length = '+ localString.length);
        return localString ;
    }
    function checkExtraSpecials(instr){
        var l1 = instr.includes("]");
        var l2 = instr.includes(",");
        var l3 = instr.includes("[");
        var l4 = instr.includes("{");
        var l5 = instr.includes(":");
        if (!l1 && !l2 && !l3 && !l4 && !l5){
            return true;
        }
        return false;
    }
    function checkDupString(s1, s2, idx){
      //  console.log('checking a dup string');
        var chk1 = s1.indexOf(s2,idx+2);
        var chk2 = s1.indexOf(s2);
        if (chk1 == -1 && chk2 == idx){
            return true;
        }
        return false;
    }
};