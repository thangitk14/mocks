import { useState } from 'react'

function Users() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Quản lý Users</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">
          Trang quản lý users. API endpoint cho users chưa có trong postman.json,
          vui lòng thêm API endpoint để hiển thị danh sách users.
        </p>
      </div>
    </div>
  )
}

export default Users

