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
const path = require('path');
app.set('view engine', 'ejs');
const archiver = require('archiver');
const { spawn } = require('child_process');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const zipFileName = 'binEMG.zip';
const sourceFolder = 'bin';

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


app.get('/api/EMGdownload', (req, res) => {
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
  res.setHeader('Content-Type', 'application/zip');

  archive.pipe(res);
  archive.directory(sourceFolder, false);
  archive.finalize();
});

app.get('/api/EMGdownload2', (req, res) => {
  const custID = req.query.custID;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  if (!custID || !startDate || !endDate) {
    return res.status(400).json({ error: 'Invalid request. Missing parameters.' });
  }

  const zipFileName = `${custID}_${startDate}_${endDate}.zip`;
  const sourceFolder = `bin/${custID}`;

  res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  archive.pipe(res);

  // Function to filter files based on their names between startDate and endDate
  const filterFiles = (filename) => {
    const fileDate = filename.split('.')[0]; // Remove the .bin extension
    return fileDate >= startDate && fileDate <= endDate;
  };

  // List all files in the source folder
  fs.readdir(sourceFolder, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading files.' });
    }

    // Add files to the zip archive based on the filter
    files.forEach((filename) => {
      if (filterFiles(filename)) {
        archive.append(fs.createReadStream(`${sourceFolder}/${filename}`), { name: filename });
      }
    });

    archive.finalize();
  });
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
  const custUsername = req.body.custUsername;

  if (!custUsername || !req.file) {
    return res.status(400).json({ error: 'Invalid request. Missing custUsername or cust_file.' });
  }

  db.query('SELECT cust_id FROM customers WHERE cust_username = ?', [custUsername], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const custId = results[0].cust_id;
    const dir = `bin/${custId}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
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

app.post('/api/sleepDataProcess', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'fileName', maxCount: 1 },
]), (req, res) => {
  const { cust_username, fileName } = req.body;

  if (!cust_username || !fileName) {
    return res.status(400).json({ error: 'Invalid request. Missing cust_username or fileName.' });
  }

  // Query the database to obtain cust_id based on cust_username
  db.query('SELECT cust_id FROM customers WHERE cust_username = ?', [cust_username], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const custId = results[0].cust_id;

    // Modify the fileName to include cust_id/bin/
    const modifiedFileName = `bin/${custId}/${fileName}`;

    // Create a temporary Python script file
    const tempPythonScript = `from sleep_data_func import summary;import json;result = summary("${modifiedFileName}");print(json.dumps(result))`;

    const tempScriptPath = path.join(__dirname, 'temp_script.py');

    fs.writeFileSync(tempScriptPath, tempPythonScript);

    // Spawn a Python process to run the temporary script
    const pythonProcess = spawn('python3', [tempScriptPath]);

    let pythonOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });

    // Handle the exit of the Python process
    pythonProcess.on('close', (code) => {
      // Remove the temporary script file
      fs.unlinkSync(tempScriptPath);

      if (code === 0) {
        // Python script executed successfully
        try {
          console.log(pythonOutput.trim());
          const result = JSON.parse(pythonOutput.trim());

          // Get the current date and time
          const now = new Date();
          const year = now.getFullYear().toString().substr(-2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const date = String(now.getDate()).padStart(2, '0');
          const day = now.getDay(); // 0 for Sunday, 1 for Monday, ...

          // Create the MySQL date format
          const analysisYear = year;
          const analysisMonth = month;
          const analysisDate = date;
          const analysisDay = day.toString();

          // Prepare the data for insertion into the database
          const sleepData = {
            sleep_start: result.str_time,
            sleep_stop: result.stp_time,
            sleep_br_episode: result.br_episode,
            sleep_file_name: modifiedFileName,
            sleep_vth: result.VTH,
            sleep_duration: result.sleep_duration,
            sleep_emg_max: result.emg_max,
            sleep_emg_mean: result.emg_mean,
            sleep_emg_min: result.emg_min,
            sleep_win_size: result.win_size,
            sleep_vib_int: result.vib_int,
            sleep_analysis_year: analysisYear,
            sleep_analysis_month: analysisMonth,
            sleep_analysis_date: analysisDate,
            sleep_analysis_day: analysisDay,
            cust_id: custId
          };

          db.query('INSERT INTO sleep_data SET ?', sleepData, (err, results) => {
            if (err) {
              console.error('Error inserting data into the database:', err);
              res.status(500).json({ error: 'Error inserting data into the database' });
            } else {
              res.status(200).json({ message: 'Data uploaded to the database successfully', data: sleepData });
            }
          });
        } catch (err) {
          res.status(500).json({ error: 'Error parsing Python output' });
        }
      } else {
        // Python script encountered an error
        res.status(500).json({ error: 'Python script encountered an error' });
      }
    });
  });
});


app.post('/api/customers/sleepDataResult', upload.fields([
  { name: 'cust_username', maxCount: 1 },
  { name: 'fromDate', maxCount: 1 },
  { name: 'todate', maxCount: 1 },
]), (req, res) => {
  const { cust_username, fromDate, toDate } = req.body;

  if (!cust_username || !fromDate || !toDate) {
    return res.status(400).json({ error: 'Missing parameters in the request body.' });
  }

  // Initialize the result object
  const result = {
    latest_br_episode: 0,
    highest_br_max: 0,
    latest_data: '',
    average_br_episode: 0,
    br_data: {}, // New field for bruxism data
  };

  // Step 1: Get the cust_id based on cust_username
  db.query(
    'SELECT cust_id FROM customers WHERE cust_username = ?',
    [cust_username],
    (err, results0) => {
      if (err) {
        console.error('Error retrieving cust_id:', err);
        return res.status(500).json({ error: 'Error retrieving data' });
      }

      const cust_id = results0[0]?.cust_id || null;

      if (!cust_id) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Step 2: Get the latest sleep_br_episode
      const toDateEndLatestBR = new Date(toDate);
      toDateEndLatestBR.setHours(23, 59, 59, 999);
      db.query(
        'SELECT sleep_br_episode AS latest_br_episode, ' +
        'sleep_start, sleep_stop, sleep_duration, sleep_analysis_year, sleep_analysis_month, sleep_analysis_date ' +
        'FROM sleep_data ' +
        'WHERE cust_id = ? ' +
        'AND sleep_analysis_year = ? ' +
        'AND sleep_analysis_month = ? ' +
        'AND sleep_analysis_date = ? ' +
        'ORDER BY sleep_analysis_year DESC, sleep_analysis_month DESC, ' +
        'sleep_analysis_date DESC, sleep_analysis_day DESC, sleep_start DESC ' +
        'LIMIT 1',
        [cust_id, (toDateEndLatestBR.getFullYear() % 100).toString(),
          (toDateEndLatestBR.getMonth() + 1).toString().padStart(2, '0'),
          toDateEndLatestBR.getDate().toString().padStart(2, '0')],
        (err, results1) => {
          if (err) {
            console.error('Error retrieving latest sleep_br_episode:', err);
            return res.status(500).json({ error: 'Error retrieving data' });
          }

          const latestData = results1[0] || null;
          if (latestData) {
            const fullYear = new Date().getFullYear();
            const yearPrefix = fullYear.toString().substring(0, 2); // Extract the first two digits of the current year
            result.latest_br_episode = latestData.latest_br_episode || 0;
            result.sleep_duration = latestData.sleep_duration || 0;
            result.sleep_start = latestData.sleep_start;
            result.sleep_stop = latestData.sleep_stop;
            result.latest_data = `${yearPrefix}${latestData.sleep_analysis_year}. ${latestData.sleep_analysis_month}. ${latestData.sleep_analysis_date}`;
          }

          const fromDateStart = new Date(fromDate);
          fromDateStart.setHours(0, 0, 0, 0);
          const toDateEnd = new Date(toDate);
          toDateEnd.setHours(23, 59, 59, 999);

          // Step 3: Get the highest sleep_emg_max for the last 7 days
          db.query(
            'SELECT MAX(sleep_br_episode) AS highest_br_episode ' +
            'FROM sleep_data ' +
            'WHERE cust_id = ? ' +
            'AND sleep_analysis_year >= ? ' +
            'AND sleep_analysis_month >= ? ' +
            'AND sleep_analysis_date >= ? ' +
            'AND sleep_analysis_year <= ? ' +
            'AND sleep_analysis_month <= ? ' +
            'AND sleep_analysis_date <= ? ' +
            'ORDER BY sleep_br_episode DESC ' +
            'LIMIT 1',
            [cust_id, fromDateStart.getFullYear() % 100, fromDateStart.getMonth() + 1, fromDateStart.getDate(), toDateEnd.getFullYear() % 100, toDateEnd.getMonth() + 1, toDateEnd.getDate()],
            (err, results2) => {
              if (err) {
                console.error('Error retrieving highest sleep_emg_max:', err);
                return res.status(500).json({ error: 'Error retrieving data' });
              }
          
              result.highest_br_max = results2[0]?.highest_br_episode || 0;
          
              // Step 4: Get every sleep_br_episode data for the specified date range and sum them
          
              db.query(
                'SELECT sleep_br_episode, sleep_analysis_year, sleep_analysis_month, sleep_analysis_date ' +
                'FROM sleep_data ' +
                'WHERE cust_id = ? ' +
                'AND (' +
                '(sleep_analysis_year = ? AND sleep_analysis_month = ? AND sleep_analysis_date >= ?) ' +
                'OR (sleep_analysis_year = ? AND sleep_analysis_month = ? AND sleep_analysis_date <= ?) ' +
                ') ' +
                'ORDER BY sleep_analysis_year DESC, sleep_analysis_month DESC, sleep_analysis_date DESC',
                [
                  cust_id,
                  (fromDateStart.getFullYear() % 100).toString(),
                  (fromDateStart.getMonth() + 1).toString().padStart(2, '0'),
                  fromDateStart.getDate().toString().padStart(2, '0'),
                  (toDateEnd.getFullYear() % 100).toString(),
                  (toDateEnd.getMonth() + 1).toString().padStart(2, '0'),
                  toDateEnd.getDate().toString().padStart(2, '0')
                ],
                (err, results3) => {
                  if (err) {
                    console.error('Error retrieving sleep_br_episode data:', err);
                    return res.status(500).json({ error: 'Error retrieving data' });
                  }
          
                  const brData = {};
          
                  results3.forEach((row) => {
                    const dateKey = `${row.sleep_analysis_year}.${row.sleep_analysis_month}.${row.sleep_analysis_date}`;
                    if (!brData[dateKey]) {
                      brData[dateKey] = 0;
                    }
                    brData[dateKey] += row.sleep_br_episode;
                  });
          
                  result.br_data = brData;
          
                  // Step 5: Calculate the average
                  if (Object.keys(brData).length > 0) {
                    let totalSum = 0;
                    Object.keys(brData).forEach((key) => {
                      totalSum += brData[key] || 0;
                    });
                    result.average_br_episode = totalSum / Object.keys(brData).length;
                  }                  
          
                  res.status(200).json(result);
                }
              );
            }
          );
        }
      );
    }
  );
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

app.get('/api/customers/checkEmailExist', (req, res) => {
  const query = 'SELECT cust_email FROM customers';

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Error fetching data from the database');
      return;
    }

    // Convert the rows to an array of objects
    const data = rows.map((row) => ({
      cust_email: row.cust_email
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  });
});

app.post('/api/customers/checkAlignProcess', upload.fields([
  { name: 'cust_username', maxCount: 1 }, // Change the field name to 'cust_name'
]), async (req, res) => {
  const cust_username = req.body.cust_username;

  if (!cust_username) {
    res.status(400).send('cust_username is required in form-data');
    return;
  }

  const custIdQuery = 'SELECT cust_id FROM customers WHERE cust_username = ?';

  db.query(custIdQuery, [cust_username], (err, custRows) => {
    if (err) {
      console.error('Error fetching cust_id from the database:', err);
      res.status(500).send('Error fetching cust_id from the database');
      return;
    }

    if (custRows.length === 0) {
      res.status(404).send('Customer not found');
      return;
    }

    // Extract the cust_id from the result
    const cust_id = custRows[0].cust_id;

    // Use the obtained cust_id to check data in align_process_results
    const query = 'SELECT cust_id FROM align_process_results WHERE cust_id = ?';

    db.query(query, [cust_id], (calibrationErr, calibrationRows) => {
      if (calibrationErr) {
        console.error('Error fetching data from the align_process_results table:', calibrationErr);
        res.status(500).send('Error fetching data from the align_process_results table');
        return;
      }

      if (calibrationRows.length === 0) {
        res.status(404).send('No calibration results found for ' + cust_username);
        return;
      }

      res.status(200).json({ message: 'OK' });
    });
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
  { name: 'cust_password_original', maxCount: 1 },
  { name: 'cust_phone_num', maxCount: 1 },
  { name: 'cust_address', maxCount: 1 },
  { name: 'cust_detail_address', maxCount: 1 }
]), async (req, res) => {
  const {
    cust_username,
    cust_password, 
    cust_password_original, 
    cust_phone_num,
    cust_address,
    cust_detail_address,
  } = req.body;

  // First, retrieve the current password from the database
  const getPasswordSql = 'SELECT cust_password FROM customers WHERE cust_username = ?';
  const getPasswordValues = [cust_username];
  
  db.query(getPasswordSql, getPasswordValues, async (getPasswordErr, getPasswordResults) => {
    if (getPasswordErr) {
      console.error('Error executing SQL query:', getPasswordErr);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (getPasswordResults.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const currentPassword = getPasswordResults[0].cust_password;
    
    try {
      const isPasswordCorrect = await verifyPassword(cust_password_original, currentPassword);
      if (!isPasswordCorrect) {
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
          } else {
            if (updateResult.affectedRows === 0) {
              res.status(404).json({ error: 'Customer not found' });
            } else {
              res.status(200).json({ message: 'Customer updated successfully' });
            }
          }
        });
      } else {
        res.status(403).json({ error: 'New password matches the current password' });
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
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

  var nextCustId;
  const countQuery = 'SELECT COUNT(*) AS count FROM customers';
  db.query(countQuery, (countErr, countResult) => {
    if (countErr) {
      console.error('Error executing count SQL query:', countErr);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    var currentCount = (countResult[0].count);
    var existingDataCount = currentCount + 1;
    nextCustId = generateCustId(existingDataCount);

    const checkQuery = `SELECT cust_id FROM customers WHERE cust_id = '${nextCustId}'`;

    db.query(checkQuery, (checkErr, checkResult) => {
      if (checkErr) {
        console.error('Error executing check SQL query:', checkErr);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      const recordExists = checkResult.length > 0;
      if (recordExists) {
        var existingDataCount = currentCount + 2;
        nextCustId = generateCustId(existingDataCount);
      }
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

      const insertSql = 'INSERT INTO align_process_results SET ?';

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
  { name: 'cust_password_original', maxCount: 1 },
]), (req, res) => {
  const {
    cust_phone_num,
    cust_email,
    cust_password,
    cust_password_original,
  } = req.body;

  // First, retrieve the current password from the database
  const getPasswordSql = 'SELECT cust_password FROM customers WHERE cust_phone_num = ? AND cust_email = ?';
  const getPasswordValues = [cust_phone_num, cust_email];
  db.query(getPasswordSql, getPasswordValues, async (getPasswordErr, getPasswordResults) => {
    if (getPasswordErr) {
      console.error('Error executing SQL query:', getPasswordErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (getPasswordResults.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
      } else {
        const currentPassword = getPasswordResults[0].cust_password;
        try {
          const isPasswordCorrect = await verifyPassword(cust_password_original, currentPassword);
          if (!isPasswordCorrect) {
          const updatePasswordSql = 'UPDATE customers SET cust_password = ? WHERE cust_phone_num = ? AND cust_email = ?';
          const updatePasswordValues = [cust_password, cust_phone_num, cust_email];
          db.query(updatePasswordSql, updatePasswordValues, (updatePasswordErr, updatePasswordResults) => {
            if (updatePasswordErr) {
              console.error('Error executing SQL query:', updatePasswordErr);
              res.status(500).json({ error: 'Internal Server Error' });
            } else {
              if (updatePasswordResults.affectedRows === 1) {
                res.status(200).json({ message: 'OK' });
              } else {
                res.status(404).json({ error: 'Customer not found' });
              }
            }
          });
          } else {
            res.status(403).json({ error: 'New password matches the current password' });
          }
        } catch (error) {
          console.error('Error verifying password:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
        
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
