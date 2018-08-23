# The National Biogeographic Map

This project consists of a lightweight, Leaflet-based map viewer. The main goal of this mapping application is to give the user more capabilities than the standard 'viewing' and 'identify' capabilities. The National Biogeographic Map allows the user to construct different maps via a JSON configuration file. With little development effort, the webapp can be tailered to allow different analysis packages to be viewed. The resulting analysis reports will help managers make informed decisions based on summarizations, calculations, graphs, and PDFs. The main functionalities of The National Geograghic Map are:  
- Table of contents containing map 'layers' whose origin can be ArcGIS, WMS or other brand.
- Changeable table of contents via JSON configuration file without the need for separate deploy.
- Dynamic GIS Service metadata visualization (ArcGIS and open source).
- Summarization analysis and report generation for areas of interest.
- Map sharing via simple URLs.
- Summarization report sharing via PDF downloads.
- Content is driven from a back end API, code repo here: https://my.usgs.gov/bitbucket/projects/BCB/repos/national_biogeographic_map/

## Technologies Used for Application development and Deployment:

Apache HTTP Server - https://httpd.apache.org/  
Leaflet - http://leafletjs.com/  
leaflet.wms -  https://github.com/heigeo/leaflet.wms  
esri-leaflet - https://github.com/Esri/esri-leaflet  
amCharts - https://www.amcharts.com/  
canvg - https://github.com/canvg/canvg  
clipboard.js - https://clipboardjs.com/  
Bootstrap - http://getbootstrap.com/  
html2canvas - https://html2canvas.hertzen.com/  
jQuery - https://jquery.com/  
jQuery-UI - https://jqueryui.com/  
jsrender - https://www.jsviews.com  
pdfmake - http://pdfmake.org/index.html  
proj4js - http://proj4js.org/ 

## Installing

1. Clone The National Biogeographic Map front-end repository project: https://bitbucket/scm/bcb/nbm_front_end.git
2. Copy the project files to a local Apache web server.


## Deployment

Copy the project files to an Apache web server.

## Versioning

Application uses semantic versioning - http://semver.org/

Before deploying to a Beta or Prod environment run this script to update the version
and push the resulting version increase in its own commit.  

```
python version-helper.py -h
usage: version-helper.py [-h] [-j] [-m] [-p] [-f FILE]

Update an applications semantic versioning XX.XX.XX

optional arguments:
  -h, --help            show this help message and exit
  -j, --major           major version increase. XX.xx.xx
  -m, --minor           major version increase. xx.XX.xx
  -p, --patch           patch version increase. xx.xx.XX
  -f FILE, --file FILE  path to file containing the application version string

  ```

## Authors

Jake Juszak  
Ben Lohre  
Scott Dawson
Ben Gotthold

## Acknowledgments

The National Biogeographic Map interface was heavily influenced by the UW-Macrostrat project on Github:
https://github.com/UW-Macrostrat/burwell-app

## Copyright and License

This USGS product is considered to be in the U.S. public domain, and is licensed under <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank">CC0 1.0</a>.
Although this software program has been used by the U.S. Geological Survey (USGS), no warranty, expressed or implied, is made by the USGS or the U.S. Government as to the accuracy and functioning of the program and related program material nor shall the fact of distribution constitute any such warranty, and no responsibility is assumed by the USGS in connection therewith.
