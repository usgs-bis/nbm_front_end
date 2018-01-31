'use strict';

var map;
var bioScape;
var RightPanelBar;
var MenuPanel;
var actionHandlers = [];
var actionHandlerHelper = new ActionHandlerHelper();
var widgetHelper = new WidgetHelper();
var NPNTOKEN = "";

window.onload = function() {
    loadHtmlTemplates()
        .then(function () {
            LeafletMapService.initializeMap();
            setUpIndexPage(preventMultipleOpenPanels(), isVerticalOrientation());
            if (window.location.pathname.indexOf("phenology") !== -1) {
                console.log("Got here...");
                $("#npnPwModal").modal("show").on ("hidden.bs.modal", function () {
                    sendPostRequest(myServer + "/main/getNpnToken", {p:$("#pwInput").val()})
                        .then(function (data) {
                            if (data.success) {
                                NPNTOKEN = data.success;
                                Initializer.initialize();
                            } else {
                                $("html, body").html("Wrong password");
                            }
                        });
                });
                $("#pwInput").on("keyup", function (event) {
                    if (event.keyCode === 13) {
                        $("#npnPwModal").modal("hide");
                    }
                });
            } else {
                Initializer.initialize();
            }
        });
};