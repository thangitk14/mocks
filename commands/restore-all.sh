#!/bin/bash

# Script to restore Docker data only (no source code)
# Usage: ./commands/restore-all.sh <backup-name>
# Example: ./commands/restore-all.sh backup-20231115-143022

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
BACKUP_NAME=$1
PROJECT_NAME="mocks"

if [ -z "$BACKUP_NAME" ]; then
    echo -e "${RED}Error: Backup name required${NC}"
    echo "Usage: ./commands/restore-all.sh <backup-name>"
    echo ""
    echo "Available backups:"
    ls -1d ./backups/*/ 2>/dev/null | sed 's/.*\///' | sed 's/\/$//' || echo "No backups found"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Docker Data Restore Script${NC}"
echo -e "${GREEN}(Volumes, Databases, Configurations)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if backup directory exists
BACKUP_DIR="./backups/${BACKUP_NAME}"

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Error: Backup folder not found!${NC}"
    echo "Looking for: $BACKUP_DIR"
    echo ""
    echo "Available backups:"
    ls -1d ./backups/*/ 2>/dev/null | sed 's/.*\///' | sed 's/\/$//' || echo "No backups found"
    exit 1
fi

# Display backup info
if [ -f "${BACKUP_DIR}/backup-info.txt" ]; then
    echo -e "${YELLOW}Backup Information:${NC}"
    cat "${BACKUP_DIR}/backup-info.txt"
    echo ""
fi

# Confirm restore
echo -e "${YELLOW}WARNING: This will replace Docker volumes and database!${NC}"
echo -e "${YELLOW}NOTE: Source code will NOT be restored. Make sure it's already deployed.${NC}"
echo -e "${RED}Press Ctrl+C to cancel, or Enter to continue...${NC}"
read

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

# 1. Stop and remove existing containers
echo -e "${YELLOW}Stopping and removing existing containers...${NC}"
docker compose down -v 2>/dev/null || true

# 2. Restore docker-compose.yml
echo -e "${YELLOW}Restoring docker-compose.yml...${NC}"
if [ -f "${BACKUP_DIR}/docker-compose.yml" ]; then
    cp "${BACKUP_DIR}/docker-compose.yml" ./
    echo "  - docker-compose.yml restored"
else
    echo -e "${RED}  - docker-compose.yml not found in backup!${NC}"
    exit 1
fi

# 3. Restore environment files
echo -e "${YELLOW}Restoring environment files...${NC}"
if [ -d "${BACKUP_DIR}/env" ]; then
    cp -f "${BACKUP_DIR}/env"/.env.* . 2>/dev/null || true
    echo "  - Environment files restored"
else
    echo -e "${YELLOW}  - No environment files in backup${NC}"
fi

# 4. Restore Docker volumes
echo -e "${YELLOW}Restoring Docker volumes...${NC}"
if [ -d "${BACKUP_DIR}/volumes" ]; then
    # Create volumes first
    echo "  - Creating Docker volumes..."
    docker volume create mock_mysql_data 2>/dev/null || true
    docker volume create certbot_gateway_data 2>/dev/null || true
    docker volume create certbot_gateway_www 2>/dev/null || true
    # docker volume create gitlab_config 2>/dev/null || true
    # docker volume create gitlab_logs 2>/dev/null || true
    # docker volume create gitlab_data 2>/dev/null || true

    # Restore each volume
    for volume_backup in "${BACKUP_DIR}/volumes"/*.tar.gz; do
        if [ -f "$volume_backup" ]; then
            volume_name=$(basename "$volume_backup" .tar.gz)
            echo "  - Restoring volume: ${volume_name}..."

            docker run --rm \
                -v "${volume_name}:/target" \
                -v "$(pwd)/${BACKUP_DIR}/volumes:/backup" \
                alpine \
                sh -c "rm -rf /target/* /target/..?* /target/.[!.]* 2>/dev/null || true && tar xzf /backup/${volume_name}.tar.gz -C /target"
        fi
    done
    echo "  - Docker volumes restored"
else
    echo -e "${YELLOW}  - No volume backups found${NC}"
fi

# 5. Create network
echo -e "${YELLOW}Creating Docker network...${NC}"
docker network create mock_service_network 2>/dev/null || true

# 6. Start services (without GitLab first for faster startup)
echo -e "${YELLOW}Starting services...${NC}"
echo "  - Starting core services (MySQL, Service, Gateway, Host Forward, Portal)..."
docker compose up -d mock_mysql mock_service gateway_nginx host_forward portal

# Wait for MySQL to be ready
echo "  - Waiting for MySQL to be ready..."
sleep 10

# Check MySQL health
MYSQL_READY=false
for i in {1..30}; do
    if docker exec mock_service_mysql mysqladmin ping -h localhost -uroot -p"${DB_PASSWORD:-Test@123}" --silent 2>/dev/null; then
        MYSQL_READY=true
        break
    fi
    echo "    Waiting for MySQL... ($i/30)"
    sleep 2
done

if [ "$MYSQL_READY" = false ]; then
    echo -e "${RED}  - MySQL failed to start properly${NC}"
else
    echo -e "${GREEN}  - MySQL is ready${NC}"

    # 7. Restore MySQL database from SQL dump (if exists)
    if [ -f "${BACKUP_DIR}/database/all-databases.sql" ]; then
        echo -e "${YELLOW}Restoring MySQL database from SQL dump...${NC}"

        # Load environment variables
        if [ -f .env.production ]; then
            export $(cat .env.production | grep -v '^#' | xargs)
        elif [ -f .env.developer ]; then
            export $(cat .env.developer | grep -v '^#' | xargs)
        fi

        DB_PASSWORD=${DB_PASSWORD:-Test@123}

        docker exec -i mock_service_mysql mysql \
            -uroot -p"${DB_PASSWORD}" \
            < "${BACKUP_DIR}/database/all-databases.sql"

        echo -e "${GREEN}  - MySQL database restored from SQL dump${NC}"
    else
        echo -e "${YELLOW}  - No SQL dump found. Using data from volume backup.${NC}"
    fi
fi

# # 8. GitLab restore (DISABLED)
# if [ -d "${BACKUP_DIR}/gitlab" ] || [ -f "${BACKUP_DIR}/volumes/gitlab_data.tar.gz" ]; then
#     echo ""
#     echo -e "${YELLOW}GitLab backup found. Do you want to restore GitLab?${NC}"
#     echo -e "${YELLOW}(GitLab is large and may take several minutes to start)${NC}"
#     echo -e "Type 'yes' to restore GitLab, or press Enter to skip:"
#     read RESTORE_GITLAB

#     if [ "$RESTORE_GITLAB" = "yes" ]; then
#         echo -e "${YELLOW}Starting GitLab...${NC}"
#         docker-compose up -d gitlab_ce

#         echo "  - Waiting for GitLab to be ready (this may take 2-3 minutes)..."
#         sleep 30

#         # Restore GitLab backup if exists
#         if [ -d "${BACKUP_DIR}/gitlab" ]; then
#             GITLAB_BACKUP=$(ls -t "${BACKUP_DIR}/gitlab" 2>/dev/null | grep -E ".*_gitlab_backup.tar$" | head -1 || echo "")

#             if [ -n "$GITLAB_BACKUP" ]; then
#                 echo "  - Found GitLab backup: ${GITLAB_BACKUP}"
#                 echo "  - Copying backup to GitLab container..."

#                 docker cp "${BACKUP_DIR}/gitlab/${GITLAB_BACKUP}" gitlab_ce:/var/opt/gitlab/backups/ 2>/dev/null

#                 BACKUP_TIMESTAMP=$(echo "$GITLAB_BACKUP" | sed 's/_gitlab_backup.tar//')

#                 echo "  - Restoring GitLab from backup..."
#                 echo "  - This may take several minutes. Please be patient..."

#                 docker exec -it gitlab_ce gitlab-backup restore BACKUP=${BACKUP_TIMESTAMP} force=yes 2>/dev/null

#                 echo "  - Reconfiguring GitLab..."
#                 docker exec gitlab_ce gitlab-ctl reconfigure 2>/dev/null

#                 echo -e "${GREEN}  - GitLab restored successfully${NC}"
#             fi
#         fi
#     else
#         echo -e "${YELLOW}  - Skipping GitLab restore${NC}"
#     fi
# fi

# 9. Display service status
echo ""
echo -e "${YELLOW}Checking service status...${NC}"
docker compose ps

# 10. Create restore log
echo -e "${YELLOW}Creating restore log...${NC}"
cat > "restore-log-$(date +%Y%m%d-%H%M%S).txt" << EOF
Restore completed at: $(date)
Backup restored from: ${BACKUP_NAME}
Hostname: $(hostname)
Docker Version: $(docker --version)

Restored components (Docker data only):
- Docker volumes (MySQL data, SSL certificates)
- MySQL database
- docker-compose.yml and .env files

NOTE: Source code was NOT restored from backup.
NOTE: GitLab is DISABLED and not restored.

Service Status:
$(docker compose ps)

Next steps:
1. Verify all services are running: docker compose ps
2. Check service logs: docker compose logs -f
3. Test the application endpoints
4. Update DNS/hosts file if on a different machine
5. Renew SSL certificates if needed: docker exec mock_gateway_nginx certbot renew
EOF

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Docker Restore Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}What was restored:${NC}"
echo "- Docker volumes (MySQL data, SSL certs)"
echo "- MySQL database"
echo "- docker-compose.yml and .env files"
echo ""
echo -e "${GREEN}NOTE: Source code was NOT restored (managed via Git)${NC}"
echo -e "${GREEN}NOTE: GitLab is disabled (not restored)${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check service status: docker compose ps"
echo "2. View logs: docker compose logs -f"
echo "3. Test application endpoints"
echo ""
echo -e "${YELLOW}If you restored on a different machine:${NC}"
echo "1. Update domain configurations in .env.production"
echo "2. Run: ./setup-internal-hosts.sh (if applicable)"
echo "3. Renew SSL certificates if domains changed"
echo ""
