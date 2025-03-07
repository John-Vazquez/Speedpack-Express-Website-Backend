// server.js

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Create a PostgreSQL pool using the DATABASE_URL environment variable.
// Make sure DATABASE_URL is set in Render to your external PostgreSQL URL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Temporary storage for live upload logs (this resets on server restart)
let jobLogs = [];

// Root route
app.get('/', (req, res) => {
  res.send("Speedpack Express Backend is running!");
});

// ------------------------------------------------------------------
// UPDATED /api/log-job endpoint:
// This endpoint logs a job in the temporary live logs array
// and, if a "category" is provided, updates performance_stats in PostgreSQL.
// ------------------------------------------------------------------
app.post('/api/log-job', async (req, res) => {
  try {
    const jobData = req.body;

    // Validate required fields: jobNumber, dateTime, and status
    if (!jobData.jobNumber || !jobData.dateTime || !jobData.status) {
      return res.status(400).json({ error: "Missing required job data" });
    }

    // Add job to live logs (these logs are temporary and reset on server restart)
    jobLogs.push(jobData);

    // If a category is provided, update the performance_stats table in the database.
    // This happens automatically—no need for you to check in Postman manually.
    if (jobData.category) {
      // If the job status is "success" (case-insensitive), increment successful count.
      if (jobData.status.toLowerCase() === 'success') {
        await pool.query(
          `INSERT INTO performance_stats (category, successful_uploads, failed_uploads)
           VALUES ($1, 1, 0)
           ON CONFLICT (category)
           DO UPDATE SET successful_uploads = performance_stats.successful_uploads + 1`,
          [jobData.category]
        );
      } else {
        // Otherwise, increment the failed count.
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
// PERFORMANCE STATS ENDPOINTS:
// - GET /api/performance-stats returns the data from the performance_stats table.
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
// LIVE UPLOAD STATS ENDPOINTS (temporary in-memory storage)
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
