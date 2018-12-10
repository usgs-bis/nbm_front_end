var DEBUG_MODE = false;
var myServer = location.host;
var myEnv = "prod";
let BIS_API = "https://api.sciencbase.gov/bis";
let PUBLIC_TOKEN = "nfkEdjAWPE2zwG8FyE9n";

if (myServer.indexOf("igskbac") !== -1) {
    myServer = "http://" + myServer + ":8080/bcb";
    myEnv = "dev";
    BIS_API = "http://" + myServer + ":5000";
} else if (myServer.indexOf("localhost") !== -1){
    myServer = "https://dev-api.sciencebase.gov/bcb";
    myEnv = "dev";
    BIS_API = "http://master.staging.sciencebase.gov/bis";
} else if (myServer.indexOf("my-beta.usgs.gov") !== -1){
    myServer = "https://my-beta.usgs.gov/bcb";
    myEnv = "beta";
    BIS_API = "https://sciencebase.usgs.gov/staging/bis"
} else if (myServer.indexOf("dev-") !== -1){
    myServer = "https://dev-api.sciencebase.gov/bcb";
    myEnv = "dev";
    BIS_API = "https://dev-api.sciencebase.gov/bis";
} else {
    myServer = "https://my-beta.usgs.gov/bcb";
    myEnv = "prod";
    BIS_API = "https://sciencebase.usgs.gov/staging/bis"
}

// FOR DEVELOPMENT 
// myEnv = "dev"
// myServer = "http://localhost:8080/bcb";
// myServer = "https://dev-api.sciencebase.gov/bcb";
// myServer = "https://my-beta.usgs.gov/bcb";
// BIS_API = "http://localhost:5000";


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
