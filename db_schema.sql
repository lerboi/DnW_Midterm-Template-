-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create tables for the event manager application with authentication

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin', 'organiser', 'user'
    created_date TEXT NOT NULL,
    last_login TEXT
);

-- Site settings table to store site name and description
CREATE TABLE IF NOT EXISTS site_settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT NOT NULL DEFAULT 'Event Manager',
    site_description TEXT NOT NULL DEFAULT 'Organize and manage events'
);

-- Events table to store event information
CREATE TABLE IF NOT EXISTS events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    full_price_tickets INTEGER NOT NULL DEFAULT 0,
    full_price_cost REAL NOT NULL DEFAULT 0.0,
    concession_tickets INTEGER NOT NULL DEFAULT 0,
    concession_cost REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' or 'published'
    created_by INTEGER NOT NULL, -- user who created the event
    created_date TEXT NOT NULL,
    modified_date TEXT NOT NULL,
    published_date TEXT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Bookings table to store ticket bookings
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL, -- user who made the booking
    full_price_tickets_booked INTEGER NOT NULL DEFAULT 0,
    concession_tickets_booked INTEGER NOT NULL DEFAULT 0,
    booking_date TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Insert default site settings
INSERT INTO site_settings (site_name, site_description) VALUES ('Event Manager', 'Organize and manage events');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, name, role, created_date) 
VALUES ('admin@gmail.com', 'admin123', 'System Administrator', 'admin', datetime('now'));

-- Insert sample organiser (password: organiser123)
INSERT INTO users (email, password, name, role, created_date) 
VALUES ('organiser@gmail.com', 'organiser123', 'Event Organiser', 'organiser', datetime('now'));

-- Insert sample user (password: user123)
INSERT INTO users (email, password, name, role, created_date) 
VALUES ('user@gmail.com', 'user123', 'Regular User', 'user', datetime('now'));

COMMIT;