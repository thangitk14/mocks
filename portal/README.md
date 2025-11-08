# Portal System

Ứng dụng Portal quản lý hệ thống authentication và authorization.

## Công nghệ sử dụng

- React 18
- Vite
- Tailwind CSS
- React Router DOM
- Axios

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
# hoặc
yarn install
```

2. Tạo file `.env.developer` và `.env.production` (đã có sẵn):
```
VITE_API_BASE_URL=http://localhost:3000
```

3. Chạy ứng dụng:
```bash
npm run dev
# hoặc
yarn dev
```

## Cấu trúc project

```
portal/
├── src/
│   ├── components/       # Các component tái sử dụng
│   │   ├── Header.jsx
│   │   ├── LeftNavigator.jsx
│   │   └── ErrorDialog.jsx
│   ├── contexts/         # React Contexts
│   │   ├── AuthContext.jsx
│   │   └── ErrorContext.jsx
│   ├── pages/           # Các trang chính
│   │   ├── Login.jsx
│   │   ├── MainPage.jsx
│   │   ├── Roles.jsx
│   │   ├── RoleUser.jsx
│   │   └── Users.jsx
│   ├── services/        # API services
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── roleService.js
│   │   └── roleUserService.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.developer
├── .env.production
└── package.json
```

## Tính năng

1. **Authentication**: Đăng nhập/đăng xuất
2. **Roles Management**: Quản lý roles (CRUD)
3. **Role-User Management**: Gán roles cho users
4. **Permission-based Navigation**: Chỉ hiển thị menu items khi user có permission
5. **Error Handling**: Hiển thị lỗi qua dialog ở giữa màn hình

## API Endpoints

Ứng dụng sử dụng các API từ `service/postman.json`:
- `/api/auth/login` - Đăng nhập
- `/api/auth/register` - Đăng ký
- `/api/auth/profile` - Lấy thông tin user
- `/api/roles` - Quản lý roles
- `/api/role-user/*` - Quản lý role-user relationships

## Lưu ý

- Đảm bảo service backend đang chạy tại `http://localhost:3000`
- Token được lưu trong localStorage
- Permissions được extract từ roles của user sau khi đăng nhập
