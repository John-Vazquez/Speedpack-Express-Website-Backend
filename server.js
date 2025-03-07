const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ======= LIVE UPLOAD STATS (In-Memory) =======

// This in-memory array holds job logs for your live upload stats.
// Note: In a production app, you'd persist this data.
let jobLogs = [];

// Root route
app.get('/', (req, res) => {
  res.send("Speedpack Express Backend is running!");
});

// Endpoint to log a job (live upload stats)
app.post('/api/log-job', (req, res) => {
  const jobData = req.body;
  if (!jobData.jobNumber || !jobData.dateTime || !jobData.status) {
    return res.status(400).json({ error: "Missing required job data" });
  }
  jobLogs.push(jobData);
  res.status(201).json({ message: "Job logged successfully" });
});

// Endpoint to get all live job logs
app.get('/api/logs', (req, res) => {
  res.json(jobLogs);
});

// Endpoint to search jobs by job number
app.get('/api/search', (req, res) => {
  const { jobNumber } = req.query;
  if (!jobNumber) {
    return res.status(400).json({ error: 'jobNumber query parameter is required' });
  }
  const results = jobLogs.filter(log => log.jobNumber === jobNumber);
  res.json(results);
});

// ======= PERFORMANCE STATS (Using PostgreSQL) =======

// Initialize the Postgres pool only if DATABASE_URL is set.
// On Render, ensure DATABASE_URL is set to your External Database URL.
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
}

// Endpoint to update performance stats for a given category
app.post('/api/update-performance-stats', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "Database not configured" });
  }
  const { category, successful_uploads, failed_uploads } = req.body;
  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }
  try {
    await pool.query(
      `INSERT INTO performance_stats (category, successful_uploads, failed_uploads)
       VALUES ($1, $2, $3)
       ON CONFLICT (category)
       DO UPDATE SET successful_uploads = EXCLUDED.successful_uploads,
                     failed_uploads = EXCLUDED.failed_uploads`,
      [category, successful_uploads || 0, failed_uploads || 0]
    );
    res.status(201).json({ message: "Performance stats updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Endpoint to retrieve all performance stats
app.get('/api/performance-stats', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "Database not configured" });
  }
  try {
    const result = await pool.query('SELECT * FROM performance_stats');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
