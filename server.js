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

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'miraclare'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MariaDB:', err);
    return;
  }
  console.log('Connected to MariaDB');
});

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.post('/api/customers/survey', upload.fields([
  { name: 'sur_id', maxCount: 1 },
  { name: 'sur_height', maxCount: 1 },
  { name: 'sur_weight', maxCount: 1 },
  { name: 'sur_split_ext', maxCount: 1 },
  { name: 'sur_botox_trt', maxCount: 1 },
  { name: 'sur_sleep_disd', maxCount: 1 },
  { name: 'sur_dur_brx', maxCount: 1 },
  { name: 'sur_pain_area', maxCount: 1 },
  { name: 'sur_sick_tzone', maxCount: 1 },
  { name: 'sur_pain_lvl', maxCount: 1 },
  { name: 'sur_apr_obs', maxCount: 1 },
  { name: 'sur_jaw_jmg', maxCount: 1 },
  { name: 'sur_fc_asmy', maxCount: 1 },
  { name: 'sur_headache', maxCount: 1 },
  { name: 'sur_chr_ftg', maxCount: 1 },
  { name: 'sur_pain_ttgm', maxCount: 1 },
  { name: 'sur_tth_hysn', maxCount: 1 },
  { name: 'sur_strs_lvl', maxCount: 1 },
  { name: 'sur_smkg', maxCount: 1 },
  { name: 'sur_drnk', maxCount: 1 },
  { name: 'sur_ent_date', maxCount: 1 },
  { name: 'cust_id', maxCount: 1 }
]), (req, res) => {
  const {
    sur_id,
    sur_height,
    sur_weight,
    sur_split_ext,
    sur_botox_trt,
    sur_sleep_disd,
    sur_dur_brx,
    sur_pain_area,
    sur_sick_tzone,
    sur_pain_lvl,
    sur_apr_obs,
    sur_jaw_jmg,
    sur_fc_asmy,
    sur_headache,
    sur_chr_ftg,
    sur_pain_ttgm,
    sur_tth_hysn,
    sur_strs_lvl,
    sur_smkg,
    sur_drnk,
    sur_ent_date,
    cust_id
  } = req.body;

  // Perform an SQL query to insert the survey data into the "survey_results" table
  const sql = `
    INSERT INTO survey_results (
      sur_id,
      sur_height,
      sur_weight,
      sur_split_ext,
      sur_botox_trt,
      sur_sleep_disd,
      sur_dur_brx,
      sur_pain_area,
      sur_sick_tzone,
      sur_pain_lvl,
      sur_apr_obs,
      sur_jaw_jmg,
      sur_fc_asmy,
      sur_headache,
      sur_chr_ftg,
      sur_pain_ttgm,
      sur_tth_hysn,
      sur_strs_lvl,
      sur_smkg,
      sur_drnk,
      sur_ent_date,
      cust_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    sur_id,
    sur_height,
    sur_weight,
    sur_split_ext,
    sur_botox_trt,
    sur_sleep_disd,
    sur_dur_brx,
    sur_pain_area,
    sur_sick_tzone,
    sur_pain_lvl,
    sur_apr_obs,
    sur_jaw_jmg,
    sur_fc_asmy,
    sur_headache,
    sur_chr_ftg,
    sur_pain_ttgm,
    sur_tth_hysn,
    sur_strs_lvl,
    sur_smkg,
    sur_drnk,
    sur_ent_date,
    cust_id
  ];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.status(201).json({ message: 'Survey data saved successfully' });
  });
});

app.post('/api/customers/logout', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'ipAddress', maxCount: 1 },
]), (req, res) => {
  const { cust_username, ipAddress } = req.body;
  const logData = {
    cust_username: cust_username,
    log_status: 0,
    log_ipadd: ipAddress,
    log_access_date: new Date().toISOString().slice(0, 10)
  };

  const insertSql = 'INSERT INTO log_history SET ?';
  db.query(insertSql, logData, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.status(201).json({ message: 'OK' });
  });

})


app.post('/api/customers/login', upload.fields([
  { name: 'username', maxCount: 1 },
  { name: 'password', maxCount: 1 },
  { name: 'ipAddress', maxCount: 1 }
]), (req, res) => {
  const { username, password, ipAddress } = req.body;

  const sql = 'SELECT * FROM customers WHERE cust_username = ? AND cust_password = ?';
  const values = [username, password, ipAddress];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 1) {
      const logData = {
        cust_username: results[0].cust_username,
        log_status: 1,
        log_ipadd: ipAddress,
        log_access_date: new Date().toISOString().slice(0, 10)
      };

      const insertSql = 'INSERT INTO log_history SET ?';

      db.query(insertSql, logData, (insertErr) => {
        if (insertErr) {
          console.error('Error inserting data into the table:', insertErr);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          res.status(200).json({ message: 'OK' });
        }
      });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });
});




// Define a route to retrieve customer data
app.get('/api/customers', (req, res) => {
  db.query('SELECT * FROM customers', (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  });
});

app.post('/api/customers/register', upload.fields([
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
  } = req.body;

  // First, query to get the count of existing data
  const countQuery = 'SELECT COUNT(*) AS count FROM customers';

  db.query(countQuery, (countErr, countResult) => {
    if (countErr) {
      console.error('Error executing count SQL query:', countErr);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    const existingDataCount = (countResult[0].count) + 1;
    const nextCustId = generateCustId(existingDataCount);
    const insertQuery = `
      INSERT INTO customers (
        cust_id,
        cust_username,
        cust_password,
        cust_name,
        cust_dob,
        cust_email,
        cust_phone_num,
        cust_address,
        cust_detail_address,
        prod_registration_key,
        cust_join_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      nextCustId,
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
    ];

    db.query(insertQuery, values, (insertErr, insertResult) => {
      if (insertErr) {
        console.error('Error executing insert SQL query:', insertErr);
        if (insertErr['sqlMessage'].toLowerCase().includes('duplicate')) {
          res.status(409).json({ error: 'Duplicate Entry' });
        } else {
          res.status(500).json({ error: 'Internal Server Error' });
        }
        return;
      }

      res.status(201).json({message: 'Customer added successfully', cust_id: nextCustId});
    });
  });
});

app.post('/api/customers/scoring', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'scor_msrt_date', maxCount: 1 },
  { name: 'scor_trsm_date', maxCount: 1 },
  { name: 'scor_vas_value', maxCount: 1 },
  { name: 'scor_vib_inten', maxCount: 1 },
  { name: 'score_vib_freq', maxCount: 1 },
]), (req, res) => {
  const {
    cust_username,
    scor_msrt_date,
    scor_trsm_date,
    scor_vas_value,
    scor_vib_inten,
    score_vib_freq,
  } = req.body;

  const sql = 'SELECT cust_id FROM customers WHERE cust_username = ?';
  const values = [cust_username];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 1) {
      
    const values = {
      scor_msrt_date: scor_msrt_date,
      scor_trsm_date: scor_trsm_date,
      scor_vas_value: scor_vas_value,
      scor_vib_inten: scor_vib_inten,
      score_vib_freq: score_vib_freq,
      cust_id: results[0].cust_id
    };

      const insertSql = 'INSERT INTO scoring_results SET ?';

      db.query(insertSql, values, (insertErr) => {
        if (insertErr) {
          console.error('Error inserting data into the table:', insertErr);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          res.status(200).json({ message: 'OK' });
        }
      });
    } else {
      res.status(401).json({ error: 'Error' });
    }
  });
});

app.post('/api/customers/calibration', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'cal_mean_raw', maxCount: 1 },
  { name: 'cal_std_raw', maxCount: 1 },
  { name: 'cal_mean_emg', maxCount: 1 },
  { name: 'cal_max_emg', maxCount: 1 },
  { name: 'cal_min_emg', maxCount: 1 },
  { name: 'cal_std_emg', maxCount: 1 },
  { name: 'cal_maa', maxCount: 1 },
]), (req, res) => {
  const {
    cust_username,
    cal_mean_raw,
    cal_std_raw,
    cal_mean_emg,
    cal_max_emg,
    cal_min_emg,
    cal_std_emg,
    cal_maa,
  } = req.body;

  const sql = 'SELECT cust_id FROM customers WHERE cust_username = ?';
  const values = [cust_username];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 1) {
      
    const values = {
      cal_mean_raw: cal_mean_raw,
      cal_std_raw: cal_std_raw,
      cal_mean_emg: cal_mean_emg,
      cal_max_emg: cal_max_emg,
      cal_min_emg: cal_min_emg,
      cal_std_emg: cal_std_emg,
      cal_maa: cal_maa,
      cust_id: results[0].cust_id,
      cal_msrd_date: new Date().toISOString().slice(0, 10),
      cal_trns_date: new Date().toISOString().slice(0, 10),
    };

      const insertSql = 'INSERT INTO calibration_results SET ?';

      db.query(insertSql, values, (insertErr) => {
        if (insertErr) {
          console.error('Error inserting data into the table:', insertErr);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          res.status(200).json({ message: 'OK' });
        }
      });
    } else {
      res.status(401).json({ error: 'Error' });
    }
  });
});

// Function to generate the cust_id based on the count
function generateCustId(count) {
  const maxCount = 999999; // Maximum allowed count
  const paddedCount = String(count).padStart(6, '0'); // Pad count with leading zeros
  if (count > maxCount) {
    return 'C' + String(maxCount).padStart(6, '0');
  } else {
    return 'C' + paddedCount;
  }
}


const port = 3000;

http.createServer(app).listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
