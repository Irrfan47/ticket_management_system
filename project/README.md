# HelpDesk System

A comprehensive helpdesk system built with React and Node.js, featuring MySQL database integration, user management, and ticket tracking.

## Features

### User Roles
- **Admin**: Full system access including user and group management
- **Regular User (ruser)**: Can create and manage their own tickets

### Core Functionality
- **Authentication**: Secure login system with JWT tokens
- **User Management**: Create, edit, and delete users with group assignments
- **Group Management**: Create and manage departments/groups
- **Ticket System**: Create, track, and manage support tickets
- **Comments**: Add comments to tickets with internal/external visibility
- **Dashboard**: Overview of ticket statistics and recent activity

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- npm or yarn package manager

### Database Setup
1. Create a MySQL database named `helpdesk_system`
2. Update the database configuration in `.env` file:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=helpdesk_system
   JWT_SECRET=your_jwt_secret_key
   PORT=3001
   ```

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the backend server:
   ```bash
   npm run server
   ```

3. In a new terminal, start the frontend development server:
   ```bash
   npm run dev
   ```

### Default Admin Credentials
- **Email**: admin@gmail.com
- **Password**: admin

## Database Schema

The system automatically creates the following tables:
- `users`: User accounts with roles and group assignments
- `groups`: Departments/groups for organizing users
- `tickets`: Support tickets with priority, status, and category
- `comments`: Comments on tickets with internal/external visibility

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Groups (Admin only)
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Tickets
- `GET /api/tickets` - Get tickets (filtered by user role)
- `POST /api/tickets` - Create new ticket (ruser only)
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket (admin only)

### Comments
- `GET /api/tickets/:id/comments` - Get ticket comments
- `POST /api/tickets/:id/comments` - Add comment to ticket

## Technology Stack

### Frontend
- React 18
- React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons

### Backend
- Node.js with Express
- MySQL with mysql2 driver
- JWT for authentication
- bcryptjs for password hashing

## Features Overview

### Admin Features
- Create and manage users
- Create and manage groups/departments
- Assign users to groups
- View all tickets
- Update ticket status and assignments
- Add internal comments

### Regular User Features
- Create support tickets
- View their own tickets
- Add comments to their tickets
- Track ticket progress

### Ticket Management
- Priority levels: Low, Medium, High, Critical
- Status tracking: Open, In Progress, Resolved, Closed
- Categories: Technical, Billing, Feature Request, Bug Report, Account, Other
- Tag system for better organization
- Comment system with internal/external visibility

## Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Protected API endpoints

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.