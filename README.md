# Event Manager

An Event management system built with Express.js, SQLite, and EJS. This application allows multiple users to create, manage, and book events with role-based authentication and administrative controls.

## Features

### Core Functionality
- Event Management: Create, edit, publish, and delete events
- Ticket System: Support for full-price and concession tickets with availability tracking
- User Authentication: Secure login and registration system
- Booking System: Users can book tickets for published events
- Site Configuration: Customizable site name and description

### Advanced Features (Extensions)
- Multi-Role Authentication: Admin, Organiser, and User roles with appropriate permissions
- User Management: Admin interface for managing users and role assignments
- Personal Booking History: Users can view their booking history
- Session Management: Secure session handling with express-session
- Role-Based Access Control: Middleware protection for different user levels

## Technology Stack

- Backend: Node.js with Express.js framework
- Database: SQLite3 for data persistence
- Frontend: Server-side rendering with EJS templates
- Styling: Bootstrap 5 for responsive design
- Session Management: express-session for user authentication

## Default User Accounts

The system comes with pre-configured demo accounts:

- Admin: admin@gmail.com / admin123
- Organiser: organiser@gmail.com / organiser123  
- User: user@gmail.com / user123

You can also create new accounts using the registration system.

## User Roles and Permissions

### Admin
- Full system access
- Manage all users and change roles
- View and manage all events (created by any user)
- Access to site settings configuration
- User management dashboard

### Organiser  
- Create, edit, and publish events
- Manage their own events
- Delete their own events
- View published events as attendees

### User (Attendee)
- Browse and view published events
- Book tickets for events
- View personal booking history
- Register for new accounts

## Application Structure

Main Files:
- index.js - Main application entry point
- db_schema.sql - Database schema

Routes Folder:
- admin.js - Admin-specific routes
- organiser.js - Organiser/event management routes
- events.js - User/attendee routes

Views Folder (EJS Templates):
- login.ejs - Login page
- register.ejs - Registration page
- admin-*.ejs - Admin interface templates
- organiser-*.ejs - Organiser interface templates
- events-*.ejs - User templates
- my-bookings.ejs - User booking history

Public Folder:
- main.css - CSS styling

## Database Schema

The application uses four main tables:

- users: User accounts with role-based permissions
- events: Event information with ticket configuration
- bookings: User ticket bookings and history
- site_settings: Application configuration

## Additional Libraries Used

- express-session: Session middleware for authentication
- sqlite3: SQLite database 
- bootstrap: Frontend CSS framework