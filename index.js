/**
* index.js
* This is your main app entry point with authentication
*/

// Set up express, bodyparser, sessions and EJS
const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;
var bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // set the app to use ejs for rendering
app.use(express.static(__dirname + '/public')); // set location of static files

// Set up sessions
app.use(session({
    secret: 'event-manager-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Set up SQLite
const sqlite3 = require('sqlite3').verbose();
global.db = new sqlite3.Database('./database.db',function(err){
    if(err){
        console.error(err);
        process.exit(1); // bail out we can't connect to the DB
    } else {
        console.log("Database connected");
        global.db.run("PRAGMA foreign_keys=ON"); // tell SQLite to pay attention to foreign key constraints
    }
});

/**
 * @desc Middleware to check if user is authenticated
 * @input req, res, next
 * @output redirects to login if not authenticated, continues if authenticated
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login');
    }
}

/**
 * @desc Middleware to check if user has required role
 * @input roles - array of allowed roles
 * @output middleware function
 */
function requireRole(roles) {
    return function(req, res, next) {
        if (req.session && req.session.user && roles.includes(req.session.user.role)) {
            return next();
        } else {
            return res.status(403).send('Access denied. Insufficient permissions.');
        }
    };
}

/**
 * @desc Handle requests to the main home page
 * @input None
 * @output Renders the login page or dashboard based on authentication
 */
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        // User is logged in, redirect to appropriate dashboard
        switch (req.session.user.role) {
            case 'admin':
                res.redirect('/admin');
                break;
            case 'organiser':
                res.redirect('/organiser');
                break;
            case 'user':
                res.redirect('/events');
                break;
            default:
                res.redirect('/login');
        }
    } else {
        res.redirect('/login');
    }
});

/**
 * @desc Display login page
 * @input None
 * @output Renders login form
 */
app.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
});

/**
 * @desc Process login form
 * @input email, password from form
 * @output Authenticates user and redirects to appropriate dashboard
 */
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.render('login', { error: 'Please enter both email and password' });
    }
    
    const query = "SELECT * FROM users WHERE email = ? AND password = ?";
    
    global.db.get(query, [email, password], function (err, user) {
        if (err) {
            console.error(err);
            return res.render('login', { error: 'Database error' });
        }
        
        if (user) {
            // Update last login
            global.db.run("UPDATE users SET last_login = datetime('now') WHERE user_id = ?", [user.user_id]);
            
            // Store user in session
            req.session.user = {
                user_id: user.user_id,
                email: user.email,
                name: user.name,
                role: user.role
            };
            
            res.redirect('/');
        } else {
            res.render('login', { error: 'Invalid email or password' });
        }
    });
});

/**
 * @desc Logout user
 * @input None
 * @output Destroys session and redirects to login
 */
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/login');
    });
});

// Add all the route handlers with authentication
const adminRoutes = require('./routes/admin');
app.use('/admin', requireAuth, requireRole(['admin']), adminRoutes);

const organiserRoutes = require('./routes/organiser');
app.use('/organiser', requireAuth, requireRole(['admin', 'organiser']), organiserRoutes);

const eventsRoutes = require('./routes/events');
app.use('/events', requireAuth, eventsRoutes);

// Make the web application listen for HTTP requests
app.listen(port, () => {
    console.log(`Event Manager app listening on port ${port}`);
    console.log('Default login credentials:');
    console.log('Admin: admin@eventmanager.com / admin123');
    console.log('Organiser: organiser@eventmanager.com / organiser123');
    console.log('User: user@eventmanager.com / user123');
})