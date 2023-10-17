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

app.get('/api/customers', (req, res) => {
  db.query('SELECT `cust_name` FROM customer', (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    console.log(results);
    res.json(results);
  });
});

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
