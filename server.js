const express = require('express');
const cors = require('cors');

const app = express();  
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let jobLogs = []; // Temporary storage, replace with a database later

// Root route (optional)
app.get('/', (req, res) => {
    res.send("Speedpack Express Backend is running!");
});

// ✅ Endpoint to log a job
app.post('/api/log-job', (req, res) => {
    const jobData = req.body;
    if (!jobData.jobNumber || !jobData.dateTime || !jobData.status) {
        return res.status(400).json({ error: "Missing required job data" });
    }
    jobLogs.push(jobData);
    res.status(201).json({ message: "Job logged successfully" });
});

// ✅ Endpoint to get all logs (for dashboard)
app.get('/api/logs', (req, res) => {
    res.json(jobLogs);
});

// ✅ Endpoint to search jobs by job number
app.get('/api/search', (req, res) => {
    const { jobNumber } = req.query;
    if (!jobNumber) {
        return res.status(400).json({ error: 'jobNumber query parameter is required' });
    }
    const results = jobLogs.filter(log => log.jobNumber === jobNumber);
    res.json(results);
});

// ✅ Start the server
app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
});
