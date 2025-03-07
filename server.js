const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ----------------------
// CONNECT TO POSTGRES
// ----------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL // Make sure this is set in Render
});

// Temporary storage for live upload logs (still used by GET /api/logs)
let jobLogs = [];

// ----------------------
// AUTOMATICALLY UPDATE performance_stats WHEN A JOB IS LOGGED
// ----------------------
app.post('/api/log-job', async (req, res) => {
  try {
    const jobData = req.body;
    
    // 1) Validate required fields for the live logs
    if (!jobData.jobNumber || !jobData.dateTime || !jobData.status) {
      return res.status(400).json({ error: "Missing required job data" });
    }
    // 2) Store in memory array (existing behavior)
    jobLogs.push(jobData);

    // 3) Also update performance_stats IF a category is provided
    if (jobData.category) {
      if (jobData.status.toLowerCase() === 'success') {
        // Increment successful_uploads by 1 for that category
        await pool.query(
          `INSERT INTO performance_stats (category, successful_uploads, failed_uploads)
           VALUES ($1, 1, 0)
           ON CONFLICT (category)
           DO UPDATE SET successful_uploads = performance_stats.successful_uploads + 1`,
          [jobData.category]
        );
      } else {
        // Increment failed_uploads by 1 for that category
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
    console.error("Error in log-job:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------------------
// PERFORMANCE STATS ENDPOINTS
// ----------------------
app.post('/api/update-performance-stats', async (req, res) => {
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

app.get('/api/performance-stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM performance_stats');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ----------------------
// LIVE UPLOAD STATS ENDPOINTS
// ----------------------
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

// Root route
app.get('/', (req, res) => {
  res.send("Speedpack Express Backend is running!");
});

// ----------------------
// START THE SERVER
// ----------------------
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
