var DEBUG_MODE = false;
var myServer = location.host;
var myEnv = "prod"

if (myServer.indexOf("igskbac") !== -1) {
    myServer = "http://" + myServer + ":8080/bcb";
    myEnv = "dev"
} else if (myServer.indexOf("my-beta.usgs.gov") !== -1){
    myServer = "https://my-beta.usgs.gov/bcb"
    myEnv = "beta"
} else if (myServer.indexOf("dev-") !== -1){
    myServer = "https://dev-api.sciencebase.gov/bcb"
    myEnv = "dev"
} else {
    myServer = "https://my-beta.usgs.gov/bcb"
    myEnv = "beta"
}

// FOR DEVELOPMENT 
myEnv = "dev"
myServer = "http://localhost:8080/bcb";
//myServer = "https://dev-api.sciencebase.gov/bcb";
//myServer = "https://my-beta.usgs.gov/bcb";


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
