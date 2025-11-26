#!/bin/bash

# Script to run migrations in Docker container
# Usage: ./run-migrations-docker.sh [migration-name]
# Examples:
#   ./run-migrations-docker.sh                    # Run all migrations
#   ./run-migrations-docker.sh disable-state      # Run specific migration
#   ./run-migrations-docker.sh domain-id          # Run specific migration

CONTAINER_NAME="mock_service_app"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container ${CONTAINER_NAME} is not running"
    echo "Please start the container first: docker compose up -d mock_service"
    exit 1
fi

# Run migration based on argument
if [ -z "$1" ]; then
    echo "Running all migrations..."
    docker exec -it ${CONTAINER_NAME} npm run migrate
elif [ "$1" == "disable-state" ]; then
    echo "Running migrate-add-disable-state..."
    docker exec -it ${CONTAINER_NAME} npm run migrate:disable-state
elif [ "$1" == "domain-id" ]; then
    echo "Running migrate-add-domain-id-to-mock-groups..."
    docker exec -it ${CONTAINER_NAME} npm run migrate:domain-id
elif [ "$1" == "update-domain-id" ]; then
    echo "Running migrate-update-mock-groups-domain-id..."
    docker exec -it ${CONTAINER_NAME} npm run migrate:update-domain-id
else
    echo "Unknown migration: $1"
    echo "Available migrations: disable-state, domain-id, update-domain-id"
    exit 1
fi

