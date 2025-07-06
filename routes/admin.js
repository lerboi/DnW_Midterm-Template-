const express = require("express");
const router = express.Router();

// Display admin dashboard with its data
router.get("/", (req, res, next) => {
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

// Display user data
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

// Update user role 
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

// Display all events 
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

// Delete any event 
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

// Display site settings configuration page
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

// Update site settings (site name and description)
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

module.exports = router;