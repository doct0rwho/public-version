#!/bin/bash

# Copy static files from Docker container to server
echo "Copying static files from Docker container to server..."
docker cp dev-api-container:/usr/src/app/static ./

# Stop existing Docker container
echo "Stopping existing dev-api-container..."
docker stop dev-api-container

# Remove existing Docker container
echo "Removing existing dev-api-container..."
docker rm dev-api-container


# Git pull
echo "Pulling latest changes from the repository..."
git pull

# Build Docker image
echo "Building Docker image..."
docker build -t dev-api .

# Run new Docker container
echo "Starting new docker-api-container..."
docker run -d -p 4000:4000 -p 2222:22 --name dev-api-container dev-api

# Update container restart policy
echo "Updating restart policy for dev-api-container..."
docker update --restart=always dev-api-container

echo "Operations completed successfully!"
