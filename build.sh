#!/bin/bash

npm run build
echo "Building TS Build"

docker build -t cex-backend .
echo "Docker Image Build"
