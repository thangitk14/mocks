#!/bin/bash

# Script to backup Docker data only (no source code)
# Usage: ./commands/backup-all.sh [backup-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Configuration
BACKUP_NAME=${1:-"backup-$(date +%Y%m%d-%H%M%S)"}
BACKUP_DIR="./backups/${BACKUP_NAME}"
PROJECT_NAME="mocks"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Docker Data Backup Script${NC}"
echo -e "${GREEN}(Volumes, Databases, Configurations)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Create backup directory
echo -e "${YELLOW}Creating backup directory: ${BACKUP_DIR}${NC}"
mkdir -p "${BACKUP_DIR}"

# 1. Backup Docker Compose file
echo -e "${YELLOW}Backing up docker-compose.yml...${NC}"
cp docker-compose.yml "${BACKUP_DIR}/"

# 2. Backup environment files
echo -e "${YELLOW}Backing up environment files...${NC}"
mkdir -p "${BACKUP_DIR}/env"
if [ -f .env.developer ]; then
    cp .env.developer "${BACKUP_DIR}/env/"
    echo "  - .env.developer backed up"
fi
if [ -f .env.production ]; then
    cp .env.production "${BACKUP_DIR}/env/"
    echo "  - .env.production backed up"
fi
if [ -f .env.example ]; then
    cp .env.example "${BACKUP_DIR}/env/"
    echo "  - .env.example backed up"
fi

# 3. Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Skipping Docker volumes backup.${NC}"
    echo -e "${YELLOW}Please start Docker to backup volumes.${NC}"
    exit 1
else
    # 4. Backup Docker volumes
    echo -e "${YELLOW}Backing up Docker volumes...${NC}"
    mkdir -p "${BACKUP_DIR}/volumes"

    # Get list of volumes
    VOLUMES=$(docker volume ls --filter "name=${PROJECT_NAME}" --format "{{.Name}}" 2>/dev/null || echo "")

    if [ -z "$VOLUMES" ]; then
        # Try without project name filter (exclude GitLab volumes)
        VOLUMES=$(docker volume ls --format "{{.Name}}" 2>/dev/null | grep -E "(mock_mysql_data|certbot_gateway_data|certbot_gateway_www)" || echo "")
    fi

    if [ -n "$VOLUMES" ]; then
        for volume in $VOLUMES; do
            echo "  - Backing up volume: ${volume}..."
            docker run --rm \
                -v "${volume}:/source:ro" \
                -v "$(pwd)/${BACKUP_DIR}/volumes:/backup" \
                alpine \
                tar czf "/backup/${volume}.tar.gz" -C /source .
        done
        echo "  - All volumes backed up"
    else
        echo "  - No volumes found to backup"
    fi

    # 5. Backup MySQL database
    echo -e "${YELLOW}Backing up MySQL database...${NC}"
    mkdir -p "${BACKUP_DIR}/database"

    # Check if MySQL container is running
    if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "mock_service_mysql"; then
        echo "  - Exporting MySQL database..."

        # Load environment variables
        if [ -f .env.production ]; then
            export $(cat .env.production | grep -v '^#' | xargs)
        elif [ -f .env.developer ]; then
            export $(cat .env.developer | grep -v '^#' | xargs)
        fi

        DB_PASSWORD=${DB_PASSWORD:-Test@123}
        DB_NAME=${DB_NAME:-service_dev}

        docker exec mock_service_mysql mysqldump \
            -uroot -p"${DB_PASSWORD}" \
            --all-databases \
            --single-transaction \
            --quick \
            --lock-tables=false \
            > "${BACKUP_DIR}/database/all-databases.sql" 2>/dev/null

        echo "  - MySQL database exported successfully"
    else
        echo -e "${YELLOW}  - MySQL container not running. Skipping database dump.${NC}"
        echo -e "${YELLOW}  - Database will be restored from volume backup.${NC}"
    fi

    # # 6. Backup GitLab (DISABLED)
    # echo -e "${YELLOW}Checking GitLab container...${NC}"
    # if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "gitlab_ce"; then
    #     echo "  - GitLab container is running"
    #     echo "  - Creating GitLab backup (this may take a while)..."

    #     docker exec -t gitlab_ce gitlab-backup create SKIP=registry,artifacts,lfs 2>/dev/null || echo "  - Failed to create GitLab backup"

    #     # Copy the backup to our backup directory
    #     GITLAB_BACKUP=$(docker exec gitlab_ce ls -t /var/opt/gitlab/backups/ 2>/dev/null | head -1 || echo "")
    #     if [ -n "$GITLAB_BACKUP" ]; then
    #         mkdir -p "${BACKUP_DIR}/gitlab"
    #         docker cp gitlab_ce:/var/opt/gitlab/backups/${GITLAB_BACKUP} "${BACKUP_DIR}/gitlab/" 2>/dev/null
    #         echo "  - GitLab backup: ${GITLAB_BACKUP}"
    #     fi
    # else
    #     echo "  - GitLab container not running. Skipping GitLab backup."
    # fi
fi

# 7. Create backup metadata
echo -e "${YELLOW}Creating backup metadata...${NC}"
cat > "${BACKUP_DIR}/backup-info.txt" << EOF
Backup Name: ${BACKUP_NAME}
Backup Date: $(date)
Hostname: $(hostname)
Docker Version: $(docker --version 2>/dev/null || echo "Docker not running")
Docker Compose Version: $(docker-compose --version 2>/dev/null || echo "Not installed")

Backed up components (Docker data only):
- Docker Compose configuration (docker-compose.yml)
- Environment files (.env.*)
- Docker volumes (MySQL data, SSL certificates)
- MySQL database dump (SQL export)

NOTE: Source code is NOT included in this backup.
The source code should be managed via Git repository.
NOTE: GitLab is DISABLED and not backed up.

To restore this backup on another machine:
1. Ensure source code is already deployed on target machine (via Git)
2. Copy the entire backup folder to the target machine
3. Install Docker and Docker Compose
4. Run: ./commands/restore-all.sh ${BACKUP_NAME}
EOF

# 8. Calculate backup size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Docker Backup Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Backup location: ${BACKUP_DIR}"
echo -e "Size: ${BACKUP_SIZE}"
echo ""
echo -e "${YELLOW}What was backed up:${NC}"
echo "- Docker volumes (MySQL data, SSL certs)"
echo "- MySQL database dump"
echo "- docker-compose.yml and .env files"
echo ""
echo -e "${GREEN}NOTE: GitLab is disabled (not backed up)${NC}"
echo ""
echo -e "${YELLOW}Next steps to restore on another machine:${NC}"
echo "1. Deploy source code via Git on target machine"
echo "2. Copy backup folder: ${BACKUP_DIR}"
echo "3. Run restore: ./commands/restore-all.sh ${BACKUP_NAME}"
echo ""
