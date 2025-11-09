#!/bin/bash

# Script để setup Split DNS bằng cách cấu hình file hosts
# Domain sẽ trỏ về Private IP (0.0.0.0) cho mạng nội bộ

set -e

# Danh sách các domains cần cấu hình
DOMAINS=(
    "fw.thangvnnc.io.vn"
    "tp.thangvnnc.io.vn"
    "sv.thangvnnc.io.vn"
)

PRIVATE_IP="0.0.0.0"
HOSTS_FILE="/etc/hosts"
BACKUP_FILE="/etc/hosts.backup.$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Split DNS Hosts Configuration ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Backup existing hosts file
if [ -f "$HOSTS_FILE" ]; then
    echo -e "${YELLOW}Backing up existing hosts file to: $BACKUP_FILE${NC}"
    cp "$HOSTS_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created${NC}"
else
    echo -e "${YELLOW}Hosts file not found, will create new one${NC}"
fi

# Check if there's a Split DNS section
if ! grep -q "# Split DNS" "$HOSTS_FILE" 2>/dev/null; then
    echo "" >> "$HOSTS_FILE"
    echo "# Split DNS - Internal Network" >> "$HOSTS_FILE"
    echo "# Domain trỏ về Private IP ($PRIVATE_IP) cho mạng nội bộ" >> "$HOSTS_FILE"
fi

# Process each domain
for DOMAIN in "${DOMAINS[@]}"; do
    echo ""
    echo -e "${YELLOW}Processing domain: $DOMAIN${NC}"
    
    # Check if domain already exists in hosts file
    if grep -q "$DOMAIN" "$HOSTS_FILE" 2>/dev/null; then
        echo -e "${YELLOW}Domain $DOMAIN already exists in hosts file${NC}"
        read -p "Do you want to update it? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Remove existing entry (handle both with and without leading spaces)
            sed -i.bak "/[[:space:]]*$DOMAIN/d" "$HOSTS_FILE"
            echo -e "${GREEN}✓ Removed existing entry${NC}"
        else
            echo -e "${YELLOW}Skipping $DOMAIN...${NC}"
            continue
        fi
    fi
    
    # Add new entry
    echo -e "${YELLOW}Adding Split DNS entry: $PRIVATE_IP -> $DOMAIN${NC}"
    echo "$PRIVATE_IP    $DOMAIN" >> "$HOSTS_FILE"
    echo -e "${GREEN}✓ Entry added successfully${NC}"
done

echo ""
echo -e "${GREEN}Configuration complete!${NC}"
echo ""
echo "Current hosts file entries for configured domains:"
for DOMAIN in "${DOMAINS[@]}"; do
    echo "  $DOMAIN:"
    grep "$DOMAIN" "$HOSTS_FILE" 2>/dev/null || echo "    No entries found"
done
echo ""
echo -e "${YELLOW}Note: You may need to flush DNS cache for changes to take effect:${NC}"
echo "  Linux: sudo systemd-resolve --flush-caches"
echo "  macOS: sudo dscacheutil -flushcache"
echo ""

