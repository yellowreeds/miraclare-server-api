const express = require('express');
const http = require('http');
const mysql = require('mysql2');
const multer = require('multer'); // Add multer
const bodyParser = require('body-parser');

const app = express();
app.set('view engine', 'ejs');

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Create a database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'miraclare'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MariaDB:', err);
    return;
  }
  console.log('Connected to MariaDB');
});

// Define a route to display "Hello, world!" when accessing the root URL
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

// Define a route for user login using a POST request with form data
app.post('/api/customers/login', upload.fields([
  { name: 'username', maxCount: 1 },
  { name: 'password', maxCount: 1 }
]), (req, res) => {
  const { username, password } = req.body; // Assuming username and password are sent as form fields

  // Perform a SQL query to check if the user exists and the password is correct
  const sql = 'SELECT * FROM customer WHERE cust_username = ? AND cust_password = ?';
  const values = [username, password];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 1) {
      // User exists and password is correct
      res.status(200).json({ message: 'OK' });
    } else {
      // User does not exist or password is incorrect
      res.status(401).json({ error: 'Unauthorized' });
    }
  });
});

// Define a route to retrieve customer data
app.get('/api/customers', (req, res) => {
  db.query('SELECT * FROM customer', (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    console.log(results);
    res.json(results);
  });
});

// Define a route to add a new customer
app.post('/api/customers/add', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'cust_password', maxCount: 1 },
  { name: 'cust_name', maxCount: 1 },
  { name: 'cust_dob', maxCount: 1 },
  { name: 'cust_email', maxCount: 1 },
  { name: 'cust_phone_num', maxCount: 1 },
  { name: 'cust_address', maxCount: 1 },
  { name: 'cust_detail_address', maxCount: 1 },
  { name: 'prod_registration_key', maxCount: 1 },
  { name: 'cust_join_date', maxCount: 1 },
  { name: 'cust_id', maxCount: 1 }
]), (req, res) => {
  const {
    cust_username,
    cust_password,
    cust_name,
    cust_dob,
    cust_email,
    cust_phone_num,
    cust_address,
    cust_detail_address,
    prod_registration_key,
    cust_join_date,
    cust_id
  } = req.body;

  const sql = `
    INSERT INTO customer (
      cust_username,
      cust_password,
      cust_name,
      cust_dob,
      cust_email,
      cust_phone_num,
      cust_address,
      cust_detail_address,
      prod_registration_key,
      cust_join_date,
      cust_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    cust_username,
    cust_password,
    cust_name,
    cust_dob,
    cust_email,
    cust_phone_num,
    cust_address,
    cust_detail_address,
    prod_registration_key,
    cust_join_date,
    cust_id
  ];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.status(201).json({ message: 'Customer added successfully' });
  });
});

const port = 3000;

http.createServer(app).listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
