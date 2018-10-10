'use strict';

var map;
var bioScape;
var RightPanelBar;
var MenuPanel;
var actionHandlers = [];
var actionHandlerHelper = new ActionHandlerHelper();
var widgetHelper = new AnalysisHelper();
var NPNTOKEN = "";
let noPW = true // setting the backend password to fixed value and sending that in without user interaction

window.onload = function() {
    loadHtmlTemplates()
        .then(function () {
            LeafletMapService.initializeMap();
            setUpIndexPage(preventMultipleOpenPanels(), isVerticalOrientation());
            if(noPW){
                sendPostRequest(myServer + "/main/getNpnToken",{p:"abc",e:"nbm"})
                .then(function (data) {
                    if (data.success) {
                        NPNTOKEN = data.success;
                        Initializer.initialize();
                    } else {
                        $("html, body").html("Wrong password");
                    }
                });

            }
            else if (window.location.pathname.indexOf("phenology") !== -1 || window.location.pathname.indexOf("biogeography") !== -1) {
                let env = "nbm"
                if (window.location.pathname.indexOf("phenology") !== -1) {
                    env = "npn"
                }
                $("#npnPwModal").modal("show").on ("hidden.bs.modal", function () {
                    sendPostRequest(myServer + "/main/getNpnToken",{p:$("#pwInput").val(),e:env})
                        .then(function (data) {
                            if (data.success) {
                                NPNTOKEN = data.success;
                                Initializer.initialize();
                            } else {
                                $("html, body").html("Wrong password");
                            }
                        });
                }).on ("shown.bs.modal", function () {
                    $("#pwInput").focus();
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