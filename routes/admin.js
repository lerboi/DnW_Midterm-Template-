/**
 * admin.js
 * Routes for admin functionality including user management and event management
 */

const express = require("express");
const router = express.Router();

/**
 * @desc Display admin dashboard
 * @input None
 * @output Renders admin dashboard with user and event statistics
 */
router.get("/", (req, res, next) => {
    // Get user statistics
    const userStatsQuery = `
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
    `;
    
    global.db.all(userStatsQuery, function (err, userStats) {
        if (err) {
            next(err);
        } else {
            // Get event statistics
            const eventStatsQuery = `
                SELECT status, COUNT(*) as count 
                FROM events 
                GROUP BY status
            `;
            
            global.db.all(eventStatsQuery, function (err, eventStats) {
                if (err) {
                    next(err);
                } else {
                    res.render('admin-dashboard', {
                        user: req.session.user,
                        userStats: userStats || [],
                        eventStats: eventStats || []
                    });
                }
            });
        }
    });
});

/**
 * @desc Display all users for management
 * @input None
 * @output Renders user management page with list of all users
 */
router.get("/users", (req, res, next) => {
    const query = "SELECT user_id, email, name, role, created_date, last_login FROM users ORDER BY created_date DESC";
    
    global.db.all(query, function (err, users) {
        if (err) {
            next(err);
        } else {
            res.render('admin-users', {
                user: req.session.user,
                users: users || []
            });
        }
    });
});

/**
 * @desc Update user role
 * @input user_id, role from form
 * @output Updates user role and redirects back to user management
 */
router.post("/users/:id/role", (req, res, next) => {
    const userId = req.params.id;
    const { role } = req.body;
    
    if (!['admin', 'organiser', 'user'].includes(role)) {
        return res.status(400).send('Invalid role');
    }
    
    const query = "UPDATE users SET role = ? WHERE user_id = ?";
    
    global.db.run(query, [role, userId], function (err) {
        if (err) {
            next(err);
        } else {
            res.redirect('/admin/users');
        }
    });
});

/**
 * @desc Display all events for admin management
 * @input None
 * @output Renders event management page with all events
 */
router.get("/events", (req, res, next) => {
    const query = `
        SELECT e.*, u.name as creator_name
        FROM events e
        JOIN users u ON e.created_by = u.user_id
        ORDER BY e.created_date DESC
    `;
    
    global.db.all(query, function (err, events) {
        if (err) {
            next(err);
        } else {
            res.render('admin-events', {
                user: req.session.user,
                events: events || []
            });
        }
    });
});

/**
 * @desc Delete any event (admin privilege)
 * @input event_id from URL parameter
 * @output Removes event from database and redirects back
 */
router.post("/events/:id/delete", (req, res, next) => {
    const eventId = req.params.id;
    const query = "DELETE FROM events WHERE event_id = ?";
    
    global.db.run(query, [eventId], function (err) {
        if (err) {
            next(err);
        } else {
            res.redirect('/admin/events');
        }
    });
});

/**
 * @desc Display site settings (admin only)
 * @input None
 * @output Renders site settings form
 */
router.get("/settings", (req, res, next) => {
    const query = "SELECT * FROM site_settings LIMIT 1";
    
    global.db.get(query, function (err, settings) {
        if (err) {
            next(err);
        } else {
            res.render('admin-settings', {
                user: req.session.user,
                settings: settings || { site_name: 'Event Manager', site_description: 'Organize and manage events' }
            });
        }
    });
});

/**
 * @desc Update site settings
 * @input site_name, site_description from form
 * @output Updates settings and redirects to admin dashboard
 */
router.post("/settings", (req, res, next) => {
    const { site_name, site_description } = req.body;
    
    if (!site_name || !site_description) {
        return res.status(400).send('All fields are required');
    }
    
    const query = "UPDATE site_settings SET site_name = ?, site_description = ? WHERE setting_id = 1";
    
    global.db.run(query, [site_name, site_description], function (err) {
        if (err) {
            next(err);
        } else {
            res.redirect('/admin');
        }
    });
});

// Export the router object so index.js can access it
module.exports = router;