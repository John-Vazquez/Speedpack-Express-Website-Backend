// server.js

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Add ssl config to fix "SSL/TLS required" error
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Temporary storage for live upload logs (resets on server restart)
let jobLogs = [];

// Root route
app.get('/', (req, res) => {
  res.send("Speedpack Express Backend is running!");
});

// ------------------------------------------------------------------
// POST /api/log-job
// Logs a job and updates performance_stats if a category is provided
// ------------------------------------------------------------------
app.post('/api/log-job', async (req, res) => {
  try {
    const jobData = req.body;

    if (!jobData.jobNumber || !jobData.dateTime || !jobData.status) {
      return res.status(400).json({ error: "Missing required job data" });
    }

    // Add job to the in-memory array
    jobLogs.push(jobData);

    // If category is given, update performance_stats in PostgreSQL
    if (jobData.category) {
      if (jobData.status.toLowerCase() === 'success') {
        await pool.query(
          `INSERT INTO performance_stats (category, successful_uploads, failed_uploads)
           VALUES ($1, 1, 0)
           ON CONFLICT (category)
           DO UPDATE SET successful_uploads = performance_stats.successful_uploads + 1`,
          [jobData.category]
        );
      } else {
        await pool.query(
          `INSERT INTO performance_stats (category, successful_uploads, failed_uploads)
           VALUES ($1, 0, 1)
           ON CONFLICT (category)
           DO UPDATE SET failed_uploads = performance_stats.failed_uploads + 1`,
          [jobData.category]
        );
      }
    }

    res.status(201).json({ message: "Job logged successfully" });
  } catch (error) {
    console.error("Error in /api/log-job:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------------------------------------------------------
// GET /api/performance-stats
// Returns all rows from the performance_stats table
// ------------------------------------------------------------------
app.get('/api/performance-stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM performance_stats');
    res.json(result.rows);
  } catch (err) {
    console.error("Error in /api/performance-stats:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ------------------------------------------------------------------
// LIVE UPLOAD STATS ENDPOINTS (in-memory, not permanent)
// ------------------------------------------------------------------
app.get('/api/logs', (req, res) => {
  res.json(jobLogs);
});

app.get('/api/search', (req, res) => {
  const { jobNumber } = req.query;
  if (!jobNumber) {
    return res.status(400).json({ error: 'jobNumber query parameter is required' });
  }
  const results = jobLogs.filter(log => log.jobNumber === jobNumber);
  res.json(results);
});

// Start the server
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
