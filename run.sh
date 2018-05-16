#!/usr/bin/env bash
docker stop nbm
docker rm nbm
docker build -t nbm .
docker run  -p 80:80 --name nbm nbm
