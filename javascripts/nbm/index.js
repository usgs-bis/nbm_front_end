'use strict';

var map;
var bioScape;
var RightPanelBar;
var MenuPanel;
var actionHandlers = [];
var actionHandlerHelper = new ActionHandlerHelper();
var widgetHelper = new WidgetHelper();

window.onload = function() {
    LeafletMapService.initializeMap();
    setUpIndexPage(preventMultipleOpenPanels(), isVerticalOrientation());
    Initializer.initialize();
};