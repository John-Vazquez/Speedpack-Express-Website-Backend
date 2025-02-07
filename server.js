const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'jobLogs.json');

// Load logs from file (if exists)
let jobLogs = [];
if (fs.existsSync(LOG_FILE)) {
    jobLogs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
}

// Endpoint to log a job
app.post('/api/log-job', (req, res) => {
    const jobData = req.body;
    jobLogs.push(jobData);
    
    // Save to file
    fs.writeFileSync(LOG_FILE, JSON.stringify(jobLogs, null, 2));

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
