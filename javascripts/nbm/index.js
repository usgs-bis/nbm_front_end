'use strict';

var map;
var bioScape;
var RightPanelBar;
var MenuPanel;
var actionHandlers = [];
var actionHandlerHelper = new ActionHandlerHelper();
var widgetHelper = new WidgetHelper();

window.onload = function() {
    loadHtmlTemplates()
        .then(function () {
            LeafletMapService.initializeMap();
            setUpIndexPage(preventMultipleOpenPanels(), isVerticalOrientation());
            if (window.location.pathname.indexOf("phenology") !== -1) {
                var p = "";
                var c = 0;
                var flag = false;
                while (!flag && c < 3) {
                    p = window.prompt("Password: ", "");
                    c++;
                    if (p === "npn4us") flag = true;
                }
                if (flag) {
                    Initializer.initialize();
                } else {
                    $("html, body").html("Wrong password");
                }
            } else {
                Initializer.initialize();
            }
        });
};