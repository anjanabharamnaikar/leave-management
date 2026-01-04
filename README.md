# Leave & Attendance Management System

A comprehensive leave and attendance management system built with React (MUI) frontend and Node.js/Express/MongoDB backend.

## Features

- **Role-Based Access Control**: Three distinct roles (Admin, Manager, Employee) with specific permissions
- **Leave Management**: Apply, approve, reject, and track leave requests
- **Leave Balances**: Track casual, sick, and earned leave balances
- **Approval Workflow**: Managers can approve/reject leave requests from their team members
- **Calendar View**: Visual calendar showing all leaves and holidays
- **Holiday Configuration**: Admin can configure holidays (national, regional, company)
- **Reports**: Admin and Manager can view detailed leave and attendance reports
- **User Management**: Admin can manage all users in the system

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- React
- Material-UI (MUI)
- React Router
- Axios
- React Big Calendar

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas connection string)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/leave_management
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

4. Start MongoDB (if running locally):
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
net start MongoDB
```

5. Seed the database with initial data:
```bash
npm run seed
```

6. Start the backend server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation (change in production)
- `NODE_ENV`: Environment (development/production)

## Role Credentials

After running the seed script, you can use the following credentials:

### Admin
- **Email**: admin@example.com
- **Password**: admin123
- **Permissions**: 
  - Manage users ✓
  - Apply leave ✗
  - Approve leave ✗
  - View reports ✓

### Manager
- **Email**: manager@example.com
- **Password**: manager123
- **Permissions**: 
  - Manage users ✗
  - Apply leave ✓
  - Approve leave ✓
  - View reports ✓

### Employee
- **Email**: employee1@example.com
- **Password**: employee123
- **Permissions**: 
  - Manage users ✗
  - Apply leave ✓
  - Approve leave ✗
  - View reports ✗

### Employee 2
- **Email**: employee2@example.com
- **Password**: employee123
- **Permissions**: Same as Employee 1

## API Documentation

### Authentication

#### Register User (Admin Only)
```
POST /api/auth/register
Headers: Authorization: Bearer <token>
Body: {
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "admin|manager|employee",
  "managerId": "string (optional)"
}
```

#### Login
```
POST /api/auth/login
Body: {
  "email": "string",
  "password": "string"
}
Response: {
  "token": "string",
  "user": { ... }
}
```

#### Get Current User
```
GET /api/auth/me
Headers: Authorization: Bearer <token>
```

### Users

#### Get All Users (Admin Only)
```
GET /api/users
Headers: Authorization: Bearer <token>
```

#### Get User by ID
```
GET /api/users/:id
Headers: Authorization: Bearer <token>
```

#### Update User (Admin Only)
```
PUT /api/users/:id
Headers: Authorization: Bearer <token>
Body: {
  "name": "string (optional)",
  "email": "string (optional)",
  "role": "string (optional)",
  "managerId": "string (optional)",
  "leaveBalance": { ... } (optional)
}
```

#### Delete User (Admin Only)
```
DELETE /api/users/:id
Headers: Authorization: Bearer <token>
```

#### Get Team Members (Manager Only)
```
GET /api/users/team/members
Headers: Authorization: Bearer <token>
```

### Leaves

#### Apply for Leave (Manager/Employee)
```
POST /api/leaves
Headers: Authorization: Bearer <token>
Body: {
  "type": "casual|sick|earned",
  "startDate": "ISO date string",
  "endDate": "ISO date string",
  "reason": "string"
}
```

#### Get Leaves
```
GET /api/leaves
Headers: Authorization: Bearer <token>
Query params (optional):
  - userId: filter by user
  - status: filter by status
  - type: filter by type
```

#### Get Leave by ID
```
GET /api/leaves/:id
Headers: Authorization: Bearer <token>
```

#### Approve Leave (Manager Only)
```
PUT /api/leaves/:id/approve
Headers: Authorization: Bearer <token>
```

#### Reject Leave (Manager Only)
```
PUT /api/leaves/:id/reject
Headers: Authorization: Bearer <token>
Body: {
  "rejectedReason": "string"
}
```

#### Cancel Leave
```
DELETE /api/leaves/:id
Headers: Authorization: Bearer <token>
```

### Holidays

#### Create Holiday (Admin Only)
```
POST /api/holidays
Headers: Authorization: Bearer <token>
Body: {
  "name": "string",
  "date": "ISO date string",
  "type": "national|regional|company"
}
```

#### Get Holidays
```
GET /api/holidays
Headers: Authorization: Bearer <token>
Query params (optional):
  - year: filter by year
  - month: filter by month
```

#### Get Holiday by ID
```
GET /api/holidays/:id
Headers: Authorization: Bearer <token>
```

#### Update Holiday (Admin Only)
```
PUT /api/holidays/:id
Headers: Authorization: Bearer <token>
Body: {
  "name": "string (optional)",
  "date": "ISO date string (optional)",
  "type": "string (optional)"
}
```

#### Delete Holiday (Admin Only)
```
DELETE /api/holidays/:id
Headers: Authorization: Bearer <token>
```

### Reports

#### Get Leave Reports (Admin/Manager Only)
```
GET /api/reports/leaves
Headers: Authorization: Bearer <token>
Query params (optional):
  - startDate: ISO date string
  - endDate: ISO date string
  - userId: filter by user
  - status: filter by status
  - type: filter by type
```

#### Get Attendance Reports (Admin/Manager Only)
```
GET /api/reports/attendance
Headers: Authorization: Bearer <token>
Query params (optional):
  - startDate: ISO date string
  - endDate: ISO date string
  - userId: filter by user
```

## Testing

### Run Backend Tests
```bash
cd backend
npm test
```

The test suite includes:
- **Leave Overlap Validation Tests**: Ensures overlapping leave dates are prevented
- **Approval Workflow Tests**: Tests the complete approval/rejection workflow

### Test Coverage
- Leave overlap validation
- Approval workflow
- Leave balance deduction
- Role-based access control

## Project Structure

```
.
├── backend/
│   ├── models/          # MongoDB models (User, Leave, Holiday)
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   ├── scripts/         # Seed script
│   ├── tests/           # Unit tests
│   ├── server.js        # Express server
│   └── package.json
├── frontend/
│   ├── public/          # Public assets
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # React context (Auth)
│   │   ├── pages/       # Page components
│   │   ├── App.js       # Main app component
│   │   └── index.js     # Entry point
│   └── package.json
└── README.md
```

## Key Features Implementation

### Leave Overlap Validation
The system prevents users from applying for leaves that overlap with existing approved or pending leaves. The validation checks:
- Date ranges overlap
- Only considers pending and approved leaves
- Rejected leaves don't block new applications

### Approval Workflow
- Employees and Managers can apply for leave
- Only Managers can approve/reject leave requests
- Managers can only approve leaves for their team members
- When approved, leave balance is automatically deducted
- Working days calculation excludes weekends and holidays

### Calendar View
- Displays all leaves and holidays
- Color-coded by status (pending, approved, rejected)
- Holidays shown in distinct color
- Interactive calendar with month/week/day views

### Holiday Configuration
- Admin can add/edit/delete holidays
- Holidays are excluded from working days calculation
- Supports national, regional, and company holidays

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check connection string in `.env` file
- For MongoDB Atlas, ensure IP whitelist includes your IP

### Port Already in Use
- Change PORT in `.env` file
- Or kill the process using the port:
  ```bash
  # Find process
  lsof -i :5000
  # Kill process
  kill -9 <PID>
  ```

### Frontend Not Connecting to Backend
- Ensure backend is running on port 5000
- Check proxy setting in `frontend/package.json`
- Verify CORS is enabled in backend

## License

This project is created for educational purposes.

## Author

Assignment 4 - Leave & Attendance Management System

