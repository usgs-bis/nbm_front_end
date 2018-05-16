FROM httpd:2.4
COPY . /usr/local/apache2/htdocs/biogeography/
COPY . /usr/local/apache2/htdocs/phenology/
COPY . /usr/local/apache2/htdocs/nvcs/
COPY . /usr/local/apache2/htdocs/npn/
COPY . /usr/local/apache2/htdocs/terrestrial-ecosystems-2011/