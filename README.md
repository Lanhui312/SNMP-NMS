# SNMP Network Device Management System

A full-stack web application that simulates SNMP-capable network device management. Users can add, view, and delete mock SNMP devices through a user-friendly web interface.

---

## Technology Stack

- **Frontend:** React.js + Custom CSS
- **Backend:** Node.js, Express.js
- **Database:** MySQL (via connection pool)
- **Authentication:** JWT (JSON Web Token)
- **SNMP Parsing:** Local MIB text file parsing with custom logic

---

## Features

- User login & registration with role-based access (Admin & User)
- Add SNMP devices by IP, version (v2c/v3), and credentials
- Parse mock MIB data and store device info to MySQL
- List and delete devices (admin-only for deletion)
- View logs of all user activities (e.g., login, add/delete device)

---

## Project Structure (Backend)

```
project-root/
├── config/
│   └── database.js
├── controllers/
│   ├── authController.js
│   ├── deviceController.js
│   └── logController.js
├── models/
│   ├── Device.js
│   ├── Log.js
│   └── User.js
├── snmptranslate/
│   ├── test.js
│   └── mib/ (MIB text files)
├── data/
│   └── snmp-data.json
├── routes/
├── server.js
├── .env.example
└── .gitignore
```

---

## Environment Setup

Copy `.env.example` into `.env` and fill in your own credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=snmpdb

JWT_SECRET=your_jwt_secret_key
ADMIN_CODE=your_admin_code
```

---

## Running the Project

### 1. Install Backend

```bash
cd backend
npm install
npm start
```

### 2. Install Frontend

```bash
cd frontend
npm install
npm start
```

> Backend runs at: `http://localhost:5000`  
> Frontend runs at: `http://localhost:3000`

---

## Mock SNMP Parsing

This project uses pre-collected SNMP MIB output saved in `.txt` files under `snmptranslate/mibs/`, and parsed via `test.js`. It does **not** connect to real devices.

---

## Admin Permissions

- Only admin can delete devices
- Admin registration requires `ADMIN_CODE`

---

## API Summary

| Method | Endpoint                  | Description             |
| ------ | ------------------------- | ----------------------- |
| POST   | `/api/auth/login`         | User login              |
| POST   | `/api/auth/register`      | User registration       |
| GET    | `/api/devices`            | List all devices        |
| POST   | `/api/devices`            | Add a new device        |
| DELETE | `/api/devices/:ipAddress` | Delete a device (admin) |
| GET    | `/api/logs`               | Get all user logs       |

---

## Notes

- JWT is stored in localStorage for authenticated API calls
- SNMP simulation is based on text input parsing from `.txt` files
- SQL schema assumes tables: `users`, `devices`, `logs`
