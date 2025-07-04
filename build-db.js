
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Read the schema file
const schemaPath = path.join(__dirname, 'db_schema.sql');

if (!fs.existsSync(schemaPath)) {
    console.error('Error: db_schema.sql file not found');
    process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');

// Remove existing database if it exists
const dbPath = path.join(__dirname, 'database.db');
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed existing database');
}

// Create new database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error creating database:', err);
        process.exit(1);
    }
    console.log('Database created successfully');
});

// Execute schema
db.exec(schema, (err) => {
    if (err) {
        console.error('Error executing schema:', err);
        process.exit(1);
    }
    console.log('Database schema created successfully');
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database build complete');
        }
    });
});