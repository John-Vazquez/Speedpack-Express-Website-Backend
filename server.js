const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let jobLogs = []; // Temporary storage, replace with a database later

// Endpoint to log a job
app.post('/api/log-job', (req, res) => {
    const jobData = req.body;
    jobLogs.push(jobData);
    res.status(201).json({ message: "Job logged successfully" });
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

app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
});
