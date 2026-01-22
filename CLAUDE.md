# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a MERN stack meal management system for managing breakfast, lunch, and dinner in a shared living environment (e.g., mess/hostel). The application supports role-based access control with Bengali language error messages and UI elements.

**Tech Stack:**
- Backend: Node.js, Express, MongoDB (Mongoose)
- Frontend: React, React Router, TailwindCSS
- Authentication: JWT with bcrypt

## Development Commands

### Initial Setup
```bash
npm run install-all  # Install dependencies for both server and client
```

### Running the Application
```bash
npm run dev          # Run both server and client concurrently
npm run server       # Run backend only (with nodemon auto-reload)
npm run client       # Run frontend only
npm start            # Run backend in production mode
```

### Frontend-Specific Commands (from client/ directory)
```bash
npm start            # Start React dev server (port 3000)
npm run build        # Build for production
npm test             # Run tests
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

## Architecture

### Role Hierarchy
The system implements a 4-tier role hierarchy (enforced in both frontend and backend):
1. **user**: Basic users who can manage their own meals
2. **manager**: Can manage all users' meals, set daily costs, view reports
3. **admin**: Can manage users, holidays, and all manager functions
4. **superadmin**: Full system access including user role management

Role authorization is handled via:
- Backend: Middleware in [server/middleware/auth.js](server/middleware/auth.js) (`protect`, `isManager`, `isAdmin`, `isSuperAdmin`)
- Frontend: Context in [client/src/context/AuthContext.js](client/src/context/AuthContext.js) (`hasRole`, `isManager`, `isAdmin`, `isSuperAdmin`)

### Multi-Balance System
Each user has three separate balances tracked in [server/models/User.js](server/models/User.js):
- `balances.breakfast`: For breakfast expenses
- `balances.lunch`: For lunch expenses
- `balances.dinner`: For dinner expenses

Balances are modified through the Transaction model, which maintains a complete audit trail.

### Meal Management

**Lunch System:**
- Users can toggle lunch on/off for specific dates
- Tracked via [server/models/Meal.js](server/models/Meal.js) with `isOn` status
- Supports guest meals via `count` field (can be > 1)
- Manager can bulk-manage meals via date ranges

**Breakfast System:**
- Manager submits daily breakfast costs via [server/models/Breakfast.js](server/models/Breakfast.js)
- Cost is split equally among all active users
- Auto-deduction from user breakfast balances
- Once finalized, entries cannot be edited

**Dinner System:**
- Similar to lunch but with separate balance tracking
- Rate configured per month via MonthSettings

### Month Settings
[server/models/MonthSettings.js](server/models/MonthSettings.js) defines:
- Custom month date ranges (not strictly calendar months)
- Meal rates for lunch and dinner
- Maximum 31-day range per month
- `isFinalized` flag to lock month calculations
- Unique constraint on year+month combination

### Transaction System
All balance changes are logged in [server/models/Transaction.js](server/models/Transaction.js):
- Types: `deposit`, `deduction`, `adjustment`, `refund`
- Tracks `previousBalance` and `newBalance` for audit trail
- Links to source document via polymorphic reference (`reference` + `referenceModel`)
- Indexed by user and date for efficient queries

### Holiday Management
[server/models/Holiday.js](server/models/Holiday.js) supports:
- One-time and recurring yearly holidays
- Types: `government`, `optional`, `religious`
- Bengali and English names
- Used to auto-disable meals on holidays

## API Structure

All routes are mounted in [server/index.js](server/index.js):
- `/api/auth`: Login, register, get current user
- `/api/users`: User CRUD (admin/manager only)
- `/api/meals`: Lunch meal toggling and management
- `/api/breakfast`: Breakfast cost submission and deduction
- `/api/transactions`: Balance deposits, deductions, history
- `/api/month-settings`: Monthly rate and date range configuration
- `/api/holidays`: Holiday management
- `/api/reports`: Monthly reports and user balances

### Authentication Flow
1. User logs in → Backend returns JWT + user data
2. Token stored in localStorage
3. Axios instance ([client/src/services/api.js](client/src/services/api.js)) auto-attaches token to all requests
4. Backend middleware [server/middleware/auth.js](server/middleware/auth.js) verifies token
5. 401 responses trigger auto-logout and redirect to login

## Frontend Architecture

### Context
- [client/src/context/AuthContext.js](client/src/context/AuthContext.js): Global auth state, login/logout, role checks

### Routing Structure
- Public routes: `/login`, `/register`
- Protected routes (all require authentication):
  - `/dashboard`: User dashboard
  - `/meals`: Meal calendar for toggling lunch/dinner
  - `/profile`: User profile management
  - `/transactions`: View transaction history
  - Manager routes: `/manager/*` (breakfast management, user balances, reports, daily meals)
  - Admin routes: `/admin/*` (user management, holiday management)

### Components
- [client/src/components/Auth/ProtectedRoute.js](client/src/components/Auth/ProtectedRoute.js): Route guard with role-based access
- [client/src/components/Layout/Layout.js](client/src/components/Layout/Layout.js): Main layout with navigation

## Important Patterns

### Date Handling
- All dates stored as UTC in MongoDB
- [server/utils/dateUtils.js](server/utils/dateUtils.js) provides date manipulation utilities
- Frontend uses `date-fns` library for date formatting

### Error Messages
- Most validation errors and responses are in Bengali (Bangla)
- Maintain this pattern when adding new features

### Database Indexes
Critical indexes for performance:
- Meal: Compound unique index on `(user, date, mealType)`
- MonthSettings: Unique index on `(year, month)`
- Transaction: Indexes on `(user, createdAt)` and `(user, balanceType, createdAt)`
- Breakfast: Unique index on `date`

### Middleware Chain Pattern
Protected routes use chained middleware:
```javascript
router.get('/path', protect, isManager, handlerFunction);
```

## Testing
The project uses `@testing-library/react` and `@testing-library/jest-dom` for frontend testing. Run tests with `npm test` in the client directory.

## Key Business Rules

1. **Month finalization**: Once a month is finalized via MonthSettings, calculations are locked
2. **Breakfast finalization**: Finalized breakfast entries cannot be edited
3. **Balance separation**: Three separate balances prevent cross-contamination between meal types
4. **Transaction immutability**: Transactions are append-only for audit trail integrity
5. **Month range validation**: Maximum 31 days per month period
6. **Inactive users**: Cannot authenticate even with valid credentials
