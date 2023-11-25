const express = require('express');
const http = require('http');
const mysql = require('mysql2');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
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



app.get('/api/surveyResultDownload', (req, res) => {
  const query = 'SELECT * FROM survey_results';

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Error fetching data from the database');
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=survey_results.csv');

    const csvWriter = createCsvWriter({
      path: 'survey_csv/survey_results.csv', 
      header: [
        { id: 'sur_id', title: 'Survey ID' },
        { id: 'sur_height', title: 'Height' },
        { id: 'sur_weight', title: 'Weight' },
        { id: 'sur_split_ext', title: 'Split Exp.' },
        { id: 'sur_botox_trt', title: 'Botox Exp.' },
        { id: 'sur_sleep_disd', title: 'Sleep Disorder' },
        { id: 'sur_dur_brx', title: 'Duration of Brx' },
        { id: 'sur_pain_area', title: 'Pain Area' },
        { id: 'sur_sick_tzone', title: 'Sick Time Zone' },
        { id: 'sur_pain_lvl', title: 'Pain Level' },
        { id: 'sur_apr_obs', title: 'Aperture obstruction' },
        { id: 'sur_jaw_jmg', title: 'Jaw jamming' },
        { id: 'sur_fc_asmy', title: 'facial Asymmetry' },
        { id: 'sur_headache', title: 'Headache' },
        { id: 'sur_chr_ftg', title: 'Chronic Fatigue' },
        { id: 'sur_pain_ttgm', title: 'Teeth and Gum Pain' },
        { id: 'sur_tth_hysn', title: 'Teeth Hypersensitive' },
        { id: 'sur_strs_lvl', title: 'Stress Level' },
        { id: 'sur_smkg', title: 'Smoking' },
        { id: 'sur_drnk', title: 'Drinking' },
        { id: 'sur_ent_date', title: 'Entry Date' },
        { id: 'cust_id', title: 'Customer ID' },
      ],
    });

    csvWriter.writeRecords([{}]).then(() => {
      rows.forEach((row) => {
        csvWriter.writeRecords([row]);
      });

      const fileStream = fs.createReadStream('survey_csv/survey_results.csv');
      fileStream.pipe(res);
    });
  });
});

app.get('/api/scoringResultDownload', (req, res) => {
  const query = 'SELECT * FROM scoring_results';

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Error fetching data from the database');
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=score_results.csv');

    const csvWriter = createCsvWriter({
      path: 'score_csv/score_results.csv', 
      header: [
        { id: 'score_id', title: 'Score ID' },
        { id: 'scor_msrt_date', title: 'Measurement Date' },
        { id: 'scor_trsm_date', title: 'Transmission Date' },
        { id: 'scor_vas_value', title: 'VAS Score' },
        { id: 'scor_vib_inten', title: 'Vibration Intensity Score' },
        { id: 'scor_vib_freq', title: 'Vibration Frequency Score' },
        { id: 'cust_id', title: 'Customer ID' },
      ],
    });

    csvWriter.writeRecords([{}]).then(() => {
      rows.forEach((row) => {
        csvWriter.writeRecords([row]);
      });

      const fileStream = fs.createReadStream('score_csv/score_results.csv');
      fileStream.pipe(res);
    });
  });
});

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yellowreeds@gmail.com',
    pass: 'gvrd kcwt yqaw vnjm',
  },
});

const random6DigitCode = () => {
  const min = 100000;
  const max = 999999;
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(randomNum).padStart(6, '0');
};


app.get('/', (req, res) => {
  // Generate a verification code
  
});

app.post('/api/customers/binUpload', upload.single('cust_file'), (req, res) => {
  // Check if the 'bin' directory exists, and create it if not
  const dir = 'bin';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const fileName = req.file.originalname;
  const filePath = `${dir}/${fileName}`;

  fs.writeFile(filePath, req.file.buffer, (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.status(200).json({ message: 'File uploaded successfully', filePath: filePath });
  });
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
});

app.post('/api/customers/getProfileInfo', upload.fields([
  { name: 'cust_username', maxCount: 1 },
]), (req, res) => {
  const { cust_username } = req.body;
  
  const selectSql = 'SELECT * FROM customers WHERE cust_username = ?';
  const selectValues = [cust_username];
  db.query(selectSql, selectValues, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ data: results[0] });
  });
});

app.get('/api/customers/checkIdExist', (req, res) => {
  const query = 'SELECT cust_username FROM customers';

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Error fetching data from the database');
      return;
    }

    // Convert the rows to an array of objects
    const data = rows.map((row) => ({
      cust_username: row.cust_username
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  });
});


app.post('/api/customers/checkPassword', upload.fields([
  { name: 'username', maxCount: 1 },
  { name: 'password', maxCount: 1 },
]), async (req, res) => {
  const { username, password } = req.body;

  const selectSql = 'SELECT cust_password, cust_username, cust_name FROM customers WHERE cust_username = ?';
  const selectValues = [username];

  db.query(selectSql, selectValues, async (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 1) {
      const hashedPasswordFromDB = results[0].cust_password;

      try {
        const isPasswordCorrect = await verifyPassword(password, hashedPasswordFromDB);

        if (isPasswordCorrect) {
          res.status(200).json({ message: results[0].cust_name });
        } else {
          res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (error) {
        console.error('Error verifying password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });
});


app.post('/api/customers/login', upload.fields([
  { name: 'username', maxCount: 1 },
  { name: 'password', maxCount: 1 },
  { name: 'ipAddress', maxCount: 1 }
]), async (req, res) => {
  const { username, password, ipAddress } = req.body;

  const selectSql = 'SELECT cust_password, cust_username, cust_name FROM customers WHERE cust_username = ?';
  const selectValues = [username];

  db.query(selectSql, selectValues, async (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 1) {
      const hashedPasswordFromDB = results[0].cust_password;

      try {
        const isPasswordCorrect = await verifyPassword(password, hashedPasswordFromDB);

        if (isPasswordCorrect) {
          const logData = {
            cust_username: username,
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
              res.status(200).json({ message: results[0].cust_name });
            }
          });
        } else {
          res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (error) {
        console.error('Error verifying password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });
});

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

app.post('/api/customers/update', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'cust_password', maxCount: 1 },
  { name: 'cust_phone_num', maxCount: 1 },
  { name: 'cust_address', maxCount: 1 },
  { name: 'cust_detail_address', maxCount: 1 }
]), async (req, res) => {
  const {
    cust_username,
    cust_password, 
    cust_phone_num,
    cust_address,
    cust_detail_address,
  } = req.body;

  const updateQuery = `
    UPDATE customers SET
    ${cust_password ? 'cust_password = ?,' : ''}
    cust_phone_num = ?,
    cust_address = ?,
    cust_detail_address = ?
    WHERE cust_username = ?
  `;

  const values = [
    ...(cust_password ? [cust_password] : []),
    cust_phone_num,
    cust_address,
    cust_detail_address,
    cust_username,
  ];

  db.query(updateQuery, values, (updateErr, updateResult) => {
    if (updateErr) {
      console.error('Error executing update SQL query:', updateErr);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (updateResult.affectedRows === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.status(200).json({ message: 'Customer updated successfully' });
  });
});

app.post('/api/customers/register', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'cust_password', maxCount: 1 },
  { name: 'cust_name', maxCount: 1 },
  { name: 'cust_dob', maxCount: 1 },
  { name: 'cust_email', maxCount: 1 },
  { name: 'cust_gender', maxCount: 1 },
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
    cust_gender,
    cust_email,
    cust_phone_num,
    cust_address,
    cust_detail_address,
    prod_registration_key,
    cust_join_date,
  } = req.body;

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
        cust_gender,
        cust_email,
        cust_phone_num,
        cust_address,
        cust_detail_address,
        prod_registration_key,
        cust_join_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      nextCustId,
      cust_username,
      cust_password,
      cust_name,
      cust_dob,
      cust_gender,
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
  { name: 'scor_vib_freq', maxCount: 1 },
]), (req, res) => {
  const {
    cust_username,
    scor_msrt_date,
    scor_trsm_date,
    scor_vas_value,
    scor_vib_inten,
    scor_vib_freq,
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
      scor_vib_freq: scor_vib_freq,
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

app.post('/api/customers/searchID', upload.fields([
  { name: 'cust_phone_num', maxCount: 1 },
  { name: 'cust_email', maxCount: 1 },
]), (req, res) => {
  const {
    cust_phone_num,
    cust_email,
  } = req.body;

  const sql = 'SELECT cust_username FROM customers WHERE cust_phone_num = ? AND cust_email = ?';
  const values = [cust_phone_num, cust_email];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (results.length === 1) {
        const cust_username = results[0].cust_username;
        res.status(200).json({ message: cust_username });
      } else {
        res.status(404).json({ error: 'Customer not found' });
      }
    }
  });
});

app.post('/api/customers/changePassword', upload.fields([
  { name: 'cust_phone_num', maxCount: 1 },
  { name: 'cust_email', maxCount: 1 },
  { name: 'cust_password', maxCount: 1 },
]), (req, res) => {
  const {
    cust_phone_num,
    cust_email,
    cust_password,
  } = req.body;
  
  const sql = 'UPDATE customers set cust_password = ? WHERE cust_phone_num = ? AND cust_email = ?';
  const values = [cust_password, cust_phone_num, cust_email];
  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (results.affectedRows === 1) {
        res.status(200).json({ message: 'OK' });
      } else {
        res.status(404).json({ error: 'Customer not found' });
      }
    }
  });
});

app.post('/api/customers/requestVerificationNumber', upload.fields([
  { name: 'cust_email', maxCount: 1 },
]), (req, res) => {
  const {
    cust_email,
  } = req.body;

  const verificationCode = random6DigitCode();

  // Compose the email
  const mailOptions = {
    from: 'yellowreeds@gmail.com',
    to: cust_email,
    subject: 'Verification Code',
    text: `Your verification code is: ${verificationCode}`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Email sent:', info.response);
      res.send(verificationCode);
    }
  });
  
});


function generateCustId(count) {
  const maxCount = 999999;
  const paddedCount = String(count).padStart(6, '0');
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
