.PHONY: help up down build restart logs logs-service logs-mysql clean test

help: ## Hiển thị hướng dẫn các commands
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Chạy tất cả services (foreground)
	docker compose up

up-d: ## Chạy tất cả services (background)
	docker compose up -d

down: ## Dừng tất cả services
	docker compose down

down-v: ## Dừng services và XÓA volumes (XÓA DATABASE!)
	docker compose down -v

build: ## Build lại images
	docker compose build

rebuild: ## Build lại images (no cache) và restart
	docker compose build --no-cache
	docker compose up -d

restart: ## Restart tất cả services
	docker compose restart

restart-service: ## Restart chỉ Node.js service
	docker compose restart service

logs: ## Xem logs tất cả services
	docker compose logs -f

logs-service: ## Xem logs Node.js service
	docker compose logs -f service

logs-mysql: ## Xem logs MySQL
	docker compose logs -f mysql

ps: ## Xem containers đang chạy
	docker compose ps

shell-service: ## Truy cập shell của service container
	docker exec -it service_app sh

shell-mysql: ## Truy cập shell của MySQL container
	docker exec -it service_mysql bash

mysql-cli: ## Kết nối MySQL CLI
	docker exec -it service_mysql mysql -uroot -pTtct@835!! service_dev

clean: ## Xóa containers, images, volumes (CẢNH BÁO: XÓA TẤT CẢ!)
	docker compose down -v
	docker system prune -f

backup-db: ## Backup database
	docker exec service_mysql mysqldump -uroot -pTtct@835!! service_dev > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Database backed up to backup_$$(date +%Y%m%d_%H%M%S).sql"

test: ## Test API health check
	@echo "Testing health endpoint..."
	@curl -s http://localhost:3000/health | json_pp || echo "Service not running or curl/json_pp not available"

status: ## Kiểm tra status của services
	@echo "=== Docker Compose Status ==="
	@docker compose ps
	@echo "\n=== Resource Usage ==="
	@docker stats --no-stream service_app service_mysql
