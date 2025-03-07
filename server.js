const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Make sure you set DATABASE_URL in Render's environment variables 
// to your External Database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Endpoint to update (insert or overwrite) stats for a category
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

// Endpoint to retrieve all performance stats
app.get('/api/performance-stats', async (req, res) => {
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
