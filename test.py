import requests
from datetime import datetime, timezone

LOG_ENDPOINT = "https://speedpack-express-website-backend.onrender.com/api/log-job"

def send_job_log(job_data):
    response = requests.post(LOG_ENDPOINT, json=job_data)
    print("Status Code:", response.status_code)
    print("Response:", response.text)

# Test log data
test_log = {
    "jobNumber": "TEST123",
    "dateTime": datetime.now(timezone.utc).isoformat(),
    "status": "failure",
    "error": "Test error message",
    "orderType": "Local Delivery"
}

send_job_log(test_log)
