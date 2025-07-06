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
        process.exit(1); 
    } else {
        console.log("Database connected");
        global.db.run("PRAGMA foreign_keys=ON");
    }
});

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login');
    }
}

// Middleware to check if user has required role
function requireRole(roles) {
    return function(req, res, next) {
        if (req.session && req.session.user && roles.includes(req.session.user.role)) {
            return next();
        } else {
            return res.status(403).send('Access denied');
        }
    };
}

// Handle requests to the main home page
app.get('/', (req, res) => {
    // Check if user is logged in and redirect to appropriate page
    if (req.session && req.session.user) {
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

// Display login page
app.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
});

// Process login form
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

// Display registration page
app.get('/register', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    res.render('register', { error: null });
});

// Process registration form
app.post('/register', (req, res) => {
    const { name, email, password, confirm_password } = req.body;
    
    // Validation
    if (!name || !email || !password || !confirm_password) {
        return res.render('register', { error: 'All fields are required' });
    }
    
    if (password.length < 6) {
        return res.render('register', { error: 'Password must be at least 6 characters long' });
    }
    
    if (password !== confirm_password) {
        return res.render('register', { error: 'Passwords do not match' });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('register', { error: 'Please enter a valid email address' });
    }
    
    // Check if email already exists
    const checkEmailQuery = "SELECT user_id FROM users WHERE email = ?";
    
    global.db.get(checkEmailQuery, [email], function (err, existingUser) {
        if (err) {
            console.error(err);
            return res.render('register', { error: 'Database error' });
        }
        
        if (existingUser) {
            return res.render('register', { error: 'An account with this email already exists' });
        }
        
        // Create new user account
        const insertUserQuery = `
            INSERT INTO users (email, password, name, role, created_date) 
            VALUES (?, ?, ?, 'user', datetime('now'))
        `;
        
        global.db.run(insertUserQuery, [email, password, name], function (err) {
            if (err) {
                console.error(err);
                return res.render('register', { error: 'Failed to create account. Please try again.' });
            }
            
            // Registration successful - redirect to login with success message
            res.render('login', { 
                error: null,
                success: 'Account created successfully! Please log in with your new credentials.' 
            });
        });
    });
});

// Logout user
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

app.listen(port, () => {
    console.log(`Event Manager app listening on port ${port}`);
    console.log('Default login credentials:');
    console.log('Admin: admin@gmail.com / admin123');
    console.log('Organiser: organiser@gmail.com / organiser123');
    console.log('User: user@gmail.com / user123');
    console.log('\nYou can also create new accounts at: http://localhost:3000/register');
})