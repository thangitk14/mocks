FROM node:20

# Cài đặt Netlify CLI
RUN npm install -g netlify-cli

# Tạo thư mục app
WORKDIR /app

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Cài dependencies nếu cần (nếu bạn dùng framework như React/Vite/etc.)
RUN if [ -f package.json ]; then npm install; fi

# Build Netlify (nếu có)
RUN netlify build || echo "Skip build if not configured"

# Mở port 9999
EXPOSE 9999

# Lệnh khởi chạy netlify serve trên port 9999
CMD ["netlify", "serve", "--port=9999"]
