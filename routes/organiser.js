const express = require("express");
const router = express.Router();

// Display the organiser dashboard
router.get("/", (req, res, next) => {
    const settingsQuery = "SELECT * FROM site_settings LIMIT 1";
    
    global.db.get(settingsQuery, function (err, settings) {
        if (err) {
            next(err);
        } else {
            // Get published events by this user (or all if admin) with remaining tickets
            const publishedQuery = req.session.user.role === 'admin' ? `
                SELECT e.*, u.name as creator_name,
                       (e.full_price_tickets - COALESCE(SUM(b.full_price_tickets_booked), 0)) as full_tickets_remaining,
                       (e.concession_tickets - COALESCE(SUM(b.concession_tickets_booked), 0)) as concession_tickets_remaining
                FROM events e 
                LEFT JOIN bookings b ON e.event_id = b.event_id 
                LEFT JOIN users u ON e.created_by = u.user_id
                WHERE e.status = 'published' 
                GROUP BY e.event_id
                ORDER BY e.event_date ASC
            ` : `
                SELECT e.*, 
                       (e.full_price_tickets - COALESCE(SUM(b.full_price_tickets_booked), 0)) as full_tickets_remaining,
                       (e.concession_tickets - COALESCE(SUM(b.concession_tickets_booked), 0)) as concession_tickets_remaining
                FROM events e 
                LEFT JOIN bookings b ON e.event_id = b.event_id 
                WHERE e.status = 'published' AND e.created_by = ?
                GROUP BY e.event_id
                ORDER BY e.event_date ASC
            `;
            
            const publishedParams = req.session.user.role === 'admin' ? [] : [req.session.user.user_id];
            
            global.db.all(publishedQuery, publishedParams, function (err, publishedEvents) {
                if (err) {
                    next(err);
                } else {
                    // Get draft events by user (or all if admin)
                    const draftQuery = req.session.user.role === 'admin' ? 
                        "SELECT e.*, u.name as creator_name FROM events e LEFT JOIN users u ON e.created_by = u.user_id WHERE e.status = 'draft' ORDER BY e.created_date DESC" :
                        "SELECT * FROM events WHERE status = 'draft' AND created_by = ? ORDER BY created_date DESC";
                    
                    const draftParams = req.session.user.role === 'admin' ? [] : [req.session.user.user_id];
                    
                    global.db.all(draftQuery, draftParams, function (err, draftEvents) {
                        if (err) {
                            next(err);
                        } else {
                            res.render('organiser-dashboard', {
                                user: req.session.user,
                                settings: settings || { site_name: 'Event Manager', site_description: 'Organize and manage events' },
                                publishedEvents: publishedEvents || [],
                                draftEvents: draftEvents || []
                            });
                        }
                    });
                }
            });
        }
    });
});

// Create a new draft event
router.post("/create-event", (req, res, next) => {
    const now = new Date().toISOString();
    const query = `
        INSERT INTO events (title, description, event_date, full_price_tickets, full_price_cost, 
                           concession_tickets, concession_cost, status, created_by, created_date, modified_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `;
    
    global.db.run(query, ['New Event', '', now, 0, 0, 0, 0, req.session.user.user_id, now, now], function (err) {
        if (err) {
            next(err);
        } else {
            res.redirect(`/organiser/edit-event/${this.lastID}`);
        }
    });
});

// Display event edit page
router.get("/edit-event/:id", (req, res, next) => {
    const eventId = req.params.id;
    const query = req.session.user.role === 'admin' ?
        "SELECT * FROM events WHERE event_id = ?" :
        "SELECT * FROM events WHERE event_id = ? AND created_by = ?";
    
    const params = req.session.user.role === 'admin' ? [eventId] : [eventId, req.session.user.user_id];
    
    global.db.get(query, params, function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found or access denied');
        } else {
            res.render('organiser-edit-event', { 
                user: req.session.user,
                event: event 
            });
        }
    });
});

// Update event details
router.post("/edit-event/:id", (req, res, next) => {
    const eventId = req.params.id;
    const { title, description, event_date, full_price_tickets, full_price_cost, concession_tickets, concession_cost, action } = req.body;
    const now = new Date().toISOString();
    
    const checkQuery = req.session.user.role === 'admin' ?
        "SELECT event_id FROM events WHERE event_id = ?" :
        "SELECT event_id FROM events WHERE event_id = ? AND created_by = ?";
    
    const checkParams = req.session.user.role === 'admin' ? [eventId] : [eventId, req.session.user.user_id];
    
    global.db.get(checkQuery, checkParams, function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found or access denied');
        } else {
            // Publish event or not
            const shouldPublish = action === 'publish';
            const status = shouldPublish ? 'published' : undefined;
            const publishedDate = shouldPublish ? now : undefined;
            
            let updateQuery, updateParams;
            
            if (shouldPublish) {
                updateQuery = `
                    UPDATE events 
                    SET title = ?, description = ?, event_date = ?, full_price_tickets = ?, full_price_cost = ?, 
                        concession_tickets = ?, concession_cost = ?, modified_date = ?, status = ?, published_date = ?
                    WHERE event_id = ?
                `;
                updateParams = [title, description, event_date, full_price_tickets, full_price_cost, 
                               concession_tickets, concession_cost, now, status, publishedDate, eventId];
            } else {
                updateQuery = `
                    UPDATE events 
                    SET title = ?, description = ?, event_date = ?, full_price_tickets = ?, full_price_cost = ?, 
                        concession_tickets = ?, concession_cost = ?, modified_date = ?
                    WHERE event_id = ?
                `;
                updateParams = [title, description, event_date, full_price_tickets, full_price_cost, 
                               concession_tickets, concession_cost, now, eventId];
            }
            
            global.db.run(updateQuery, updateParams, function (err) {
                if (err) {
                    next(err);
                } else {
                    res.redirect('/organiser');
                }
            });
        }
    });
});

// Publish draft event
router.post("/publish-event/:id", (req, res, next) => {
    const eventId = req.params.id;
    const now = new Date().toISOString();
    
    const checkQuery = req.session.user.role === 'admin' ?
        "SELECT event_id FROM events WHERE event_id = ?" :
        "SELECT event_id FROM events WHERE event_id = ? AND created_by = ?";
    
    const checkParams = req.session.user.role === 'admin' ? [eventId] : [eventId, req.session.user.user_id];
    
    global.db.get(checkQuery, checkParams, function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found or access denied');
        } else {
            const query = "UPDATE events SET status = 'published', published_date = ? WHERE event_id = ?";
            
            global.db.run(query, [now, eventId], function (err) {
                if (err) {
                    next(err);
                } else {
                    res.redirect('/organiser');
                }
            });
        }
    });
});

// Delete an event
router.post("/delete-event/:id", (req, res, next) => {
    const eventId = req.params.id;
    
    const checkQuery = req.session.user.role === 'admin' ?
        "SELECT event_id FROM events WHERE event_id = ?" :
        "SELECT event_id FROM events WHERE event_id = ? AND created_by = ?";
    
    const checkParams = req.session.user.role === 'admin' ? [eventId] : [eventId, req.session.user.user_id];
    
    global.db.get(checkQuery, checkParams, function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found or access denied');
        } else {
            const query = "DELETE FROM events WHERE event_id = ?";
            
            global.db.run(query, [eventId], function (err) {
                if (err) {
                    next(err);
                } else {
                    res.redirect('/organiser');
                }
            });
        }
    });
});

module.exports = router;