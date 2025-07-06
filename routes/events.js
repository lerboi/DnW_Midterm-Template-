const express = require("express");
const router = express.Router();

// Display the events page with events
router.get("/", (req, res, next) => {
    // Get site settings first
    const settingsQuery = "SELECT * FROM site_settings LIMIT 1";
    
    global.db.get(settingsQuery, function (err, settings) {
        if (err) {
            next(err);
        } else {
            // Get published events ordered by event date
            const eventsQuery = "SELECT * FROM events WHERE status = 'published' ORDER BY event_date ASC";
            
            global.db.all(eventsQuery, function (err, events) {
                if (err) {
                    next(err);
                } else {
                    res.render('events-list', {
                        user: req.session.user,
                        settings: settings || { site_name: 'Event Manager', site_description: 'Organize and manage events' },
                        events: events || []
                    });
                }
            });
        }
    });
});

// Display event page for booking
router.get("/:id", (req, res, next) => {
    const eventId = req.params.id;
    
    // Get event details with remaining tickets
    const eventQuery = `
        SELECT e.*, 
               (e.full_price_tickets - COALESCE(SUM(b.full_price_tickets_booked), 0)) as full_tickets_remaining,
               (e.concession_tickets - COALESCE(SUM(b.concession_tickets_booked), 0)) as concession_tickets_remaining
        FROM events e 
        LEFT JOIN bookings b ON e.event_id = b.event_id 
        WHERE e.event_id = ? AND e.status = 'published'
        GROUP BY e.event_id
    `;
    
    global.db.get(eventQuery, [eventId], function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found');
        } else {
            // If user is admin or organiser, get booking data for this event
            if (req.session.user.role === 'admin' || req.session.user.role === 'organiser') {
                const bookingsQuery = `
                    SELECT b.booking_id, b.event_id, b.user_id, b.attendee_name, b.attendee_email,
                           b.full_price_tickets_booked, b.concession_tickets_booked, b.booking_date,
                           u.name as booker_name, u.email as booker_email
                    FROM bookings b
                    JOIN users u ON b.user_id = u.user_id
                    WHERE b.event_id = ?
                    ORDER BY b.booking_date DESC
                `;
                
                global.db.all(bookingsQuery, [eventId], function (err, bookings) {
                    if (err) {
                        next(err);
                    } else {
                        res.render('event-details', { 
                            user: req.session.user,
                            event: event,
                            bookings: bookings || []
                        });
                    }
                });
            } else {
                res.render('event-details', { 
                    user: req.session.user,
                    event: event,
                    bookings: null
                });
            }
        }
    });
});

// Process ticket booking 
router.post("/:id/book", (req, res, next) => {
    const eventId = req.params.id;
    const { attendee_name, attendee_email, full_price_tickets, concession_tickets } = req.body;
    const fullTickets = parseInt(full_price_tickets) || 0;
    const concessionTickets = parseInt(concession_tickets) || 0;
    
    // Validatation
    if (fullTickets === 0 && concessionTickets === 0) {
        return res.status(400).send('Please select at least one ticket');
    }

    // Check ticket availability
    const checkQuery = `
        SELECT e.*, 
               (e.full_price_tickets - COALESCE(SUM(b.full_price_tickets_booked), 0)) as full_tickets_remaining,
               (e.concession_tickets - COALESCE(SUM(b.concession_tickets_booked), 0)) as concession_tickets_remaining
        FROM events e 
        LEFT JOIN bookings b ON e.event_id = b.event_id 
        WHERE e.event_id = ?
        GROUP BY e.event_id
    `;
    
    global.db.get(checkQuery, [eventId], function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found');
        } else {
            // Check if enough tickets are available
            if (fullTickets > event.full_tickets_remaining || concessionTickets > event.concession_tickets_remaining) {
                return res.status(400).send('Not enough tickets available');
            }
            
            // Create booking with attendee information
            const bookingQuery = `
                INSERT INTO bookings (event_id, user_id, attendee_name, attendee_email, 
                                    full_price_tickets_booked, concession_tickets_booked, booking_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const now = new Date().toISOString();
            
            global.db.run(bookingQuery, [
                eventId, 
                req.session.user.user_id, 
                attendee_name,
                attendee_email,
                fullTickets, 
                concessionTickets, 
                now
            ], function (err) {
                if (err) {
                    next(err);
                } else {
                    res.redirect('/events');
                }
            });
        }
    });
});

// Display user booking info
router.get("/my/bookings", (req, res, next) => {
    const query = `
        SELECT b.*, e.title, e.event_date, e.full_price_cost, e.concession_cost
        FROM bookings b
        JOIN events e ON b.event_id = e.event_id
        WHERE b.user_id = ?
        ORDER BY b.booking_date DESC
    `;
    
    global.db.all(query, [req.session.user.user_id], function (err, bookings) {
        if (err) {
            next(err);
        } else {
            res.render('my-bookings', {
                user: req.session.user,
                bookings: bookings || []
            });
        }
    });
});

module.exports = router;