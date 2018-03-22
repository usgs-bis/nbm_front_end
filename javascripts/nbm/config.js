var DEBUG_MODE = false;
var myServer = location.host;

if (myServer.indexOf("igskbac") !== -1) {
    myServer = "http://" + myServer + ":8080/bcb";
} else if (myServer.indexOf("my-beta.usgs.gov") !== -1){
    myServer = "https://my-beta.usgs.gov/bcb"
} else if (myServer.indexOf("dev-") !== -1){
    myServer = "https://dev-api.sciencebase.gov/bcb"
} else {
    myServer = "https://www.sciencebase.gov/bcb"
}
// console.log(myServer);
// myServer = "http://logocalhost:8080/bcb";
// myServer = "https://dev-api.sciencebase.gov/bcb";
var allowsMixedContent = undefined;
var supportEmail = 'bcb@usgs.gov';
var colorMap = {};
var loadMap = {};
var drawnItems;
var drawing = false;

var G_LOOPS;
var G_FIGS;
var G_LIMIT;
var WAF_LIMIT = 9000;
