const express = require('express');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let binStatus = {
    bioLevel: 0,
    nonBioLevel: 0,
    bioCount: 0,
    nonBioCount: 0,
    lastItem: "None Yet",
    lastTime: "N/A"
};

let collectionHistory = [];

// ==========================================================
// DYNAMIC DASHBOARD HTML INJECTION
// ==========================================================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Waste Segregator Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 1100px; margin: 0 auto; }
        h1 { text-align: center; color: #2c3e50; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #7f8c8d; margin-bottom: 25px; }
        .alert-box { display: none; background-color: #e74c3c; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; margin-bottom: 20px; font-size: 1.2rem; animation: blink 1.5s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; position: relative; }
        .card h3 { margin: 0 0 10px 0; color: #34495e; font-size: 1.1rem; }
        .value { font-size: 2.3rem; font-weight: bold; color: #2c3e50; }
        .progress-bg { background: #e0e0e0; border-radius: 10px; height: 12px; margin-top: 15px; overflow: hidden; }
        .progress-fill { height: 100%; width: 0%; transition: width 0.5s ease; }
        .bg-safe { background: #2ecc71; }
        .bg-warning { background: #e67e22; }
        .bg-danger { background: #e74c3c; }
        .history-section { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 25px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left; }
        th, td { padding: 12px; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; color: #2c3e50; }
        .badge { padding: 5px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; color: white; }
        .badge-bio { background: #27ae60; }
        .badge-nonbio { background: #7f8c8d; }
        .simulator { background: #ebeeec; border: 2px dashed #bdc3c7; }
        .btn-sim { background: #2980b9; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin: 5px; font-weight: bold; }
        .btn-sim:hover { background: #21618c; }
    </style>
</head>
<body>
<div class="container">
    <h1>Smart AI Waste Segregator Dashboard</h1>
    <div class="subtitle">Real-time IoT Monitoring & Autonomous AI Analytics</div>
    <div id="warningAlert" class="alert-box">⚠️ WARNING: COMPARTMENT LEVEL CRITICAL!</div>
    <div class="grid">
        <div class="card">
            <h3>Biodegradable Capacity</h3>
            <div id="bioLevelText" class="value">0%</div>
            <div class="progress-bg"><div id="bioBar" class="progress-fill"></div></div>
        </div>
        <div class="card">
            <h3>Non-Biodegradable Capacity</h3>
            <div id="nonBioLevelText" class="value">0%</div>
            <div class="progress-bg"><div id="nonBioBar" class="progress-fill"></div></div>
        </div>
        <div class="card">
            <h3>Total Biodegradable Collected</h3>
            <div id="bioCount" class="value" style="color: #27ae60;">0</div>
        </div>
        <div class="card">
            <h3>Total Non-Biodegradable Collected</h3>
            <div id="nonBioCount" class="value" style="color: #7f8c8d;">0</div>
        </div>
    </div>
    <div class="card" style="text-align: left; padding: 15px 25px; margin-bottom: 20px;">
        <strong>Last Autonomous Segregation:</strong> 
        <span id="lastItemText" style="color: #e67e22; font-weight: bold; margin-left: 5px;">None Yet</span> 
        <span id="lastTimeText" style="color: #7f8c8d; font-size: 0.9rem; margin-left: 15px;"></span>
    </div>
    <div class="history-section">
        <h2>📋 Waste Collection History</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Date & Time Logged</th>
                    <th>Waste Category</th>
                    <th>Segregation Status</th>
                </tr>
            </thead>
            <tbody id="historyTableBody">
                <tr>
                    <td colspan="4" style="text-align: center; color: #7f8c8d;">Awaiting autonomous object detection from camera...</td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="card simulator" style="margin-top: 30px;">
        <h3>🛠️ Hardware Loop Simulator (System Testing)</h3>
        <p style="margin: 5px 0; font-size: 0.9rem; color: #555;">Test the system automation capabilities without physical hardware triggers:</p>
        <button class="btn-sim" onclick="triggerAutoSegregation()">1. Simulate: Camera Scan (Random: Empty, Bio, Non-Bio)</button>
        <button class="btn-sim" style="background: #27ae60;" onclick="changeLevels(21, 15)">2. Set Bin Levels (Bio: 21% | Non-Bio: 15%)</button>
        <button class="btn-sim" style="background: #c0392b;" onclick="changeLevels(85, 40)">3. Simulate Level Warning (Bio: 85% | Non-Bio: 40%)</button>
        <button class="btn-sim" style="background: #9b59b6;" onclick="changeLevels(0, 0)">4. Collect Waste (Reset to 0%)</button>
    </div>
</div>
<script>
    setInterval(fetchDashboardUpdates, 500);
    async function fetchDashboardUpdates() {
        try {
            const response = await fetch('/api/bin/dashboard-data');
            const data = await response.json();
            document.getElementById('bioLevelText').innerText = data.status.bioLevel + '%';
            document.getElementById('nonBioLevelText').innerText = data.status.nonBioLevel + '%';
            document.getElementById('bioCount').innerText = data.status.bioCount;
            document.getElementById('nonBioCount').innerText = data.status.nonBioCount;
            document.getElementById('lastItemText').innerText = data.status.lastItem;
            document.getElementById('lastTimeText').innerText = data.status.lastTime !== "N/A" ? "(" + data.status.lastTime + ")" : "";
            updateProgressBar('bioBar', data.status.bioLevel);
            updateProgressBar('nonBioBar', data.status.nonBioLevel);
            const alertBox = document.getElementById('warningAlert');
            if (data.status.bioLevel >= 80 || data.status.nonBioLevel >= 80) {
                alertBox.style.display = "block";
                let fullCompartments = [];
                if(data.status.bioLevel >= 80) fullCompartments.push("BIODEGRADABLE (" + data.status.bioLevel + "%)");
                if(data.status.nonBioLevel >= 80) fullCompartments.push("NON-BIODEGRADABLE (" + data.status.nonBioLevel + "%)");
                alertBox.innerText = "⚠️ WARNING: THE FOLLOWING COMPARTMENT IS ALMOST FULL: " + fullCompartments.join(' AND ') + "!";
            } else {
                alertBox.style.display = "none";
            }
            const tableBody = document.getElementById('historyTableBody');
            if(data.history.length > 0) {
                tableBody.innerHTML = data.history.map(item => "<tr><td>#" + item.id + "</td><td>" + item.timestamp + "</td><td><span class='badge " + (item.category === 'Biodegradable' ? 'badge-bio' : 'badge-nonbio') + "'>" + item.category + "</span></td><td style='color: #27ae60; font-weight: bold;'>Successfully Segregated</td></tr>").join('');
            }
        } catch (err) { console.error("Dashboard link fetch error:", err); }
    }
    function updateProgressBar(barId, level) {
        const bar = document.getElementById(barId);
        bar.style.width = level + '%';
        bar.className = "progress-fill"; 
        if (level >= 80) bar.classList.add('bg-danger');
        else if (level >= 50) bar.classList.add('bg-warning');
        else bar.classList.add('bg-safe');
    }
    async function triggerAutoSegregation() {
        const blob = new Blob(["test"], { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("imageFile", blob, "cam_capture.jpg");
        await fetch('/api/bin/auto-segregate', { method: 'POST', body: formData });
    }
    async function changeLevels(bio, nonBio) {
        await fetch('/api/bin/update-levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bioPercentage: bio, nonBioPercentage: nonBio })
        });
    }
</script>
</body>
</html>
    `);
});

// ==========================================
// REST OF API ENDPOINTS
// ==========================================
app.post('/api/bin/update-levels', (req, res) => {
    const { bioPercentage, nonBioPercentage } = req.body;
    if (bioPercentage !== undefined) binStatus.bioLevel = parseInt(bioPercentage);
    if (nonBioPercentage !== undefined) binStatus.nonBioLevel = parseInt(nonBioPercentage);
    res.json({ success: true, message: "Levels updated!" });
});

app.post('/api/bin/auto-segregate', upload.single('imageFile'), (req, res) => {
    const weights = ["Empty", "Biodegradable", "Biodegradable", "Non-Biodegradable", "Non-Biodegradable"];
    const aiResult = weights[Math.floor(Math.random() * weights.length)];
if (aiResult === "Empty") {
return res.json({ prediction: "Empty", servoAngle: 0, actionTaken: false });
}
const ngayon = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
binStatus.lastItem = aiResult;
binStatus.lastTime = ngayon;
if (aiResult === "Biodegradable") {
binStatus.bioCount++;
} else {
binStatus.nonBioCount++;
}
collectionHistory.unshift({
id: collectionHistory.length + 1,
timestamp: ngayon,
category: aiResult,
status: "Successfully Segregated"
});
if (collectionHistory.length > 50) collectionHistory.pop();
const angle = aiResult === "Biodegradable" ? 45 : 135;
res.json({ prediction: aiResult, servoAngle: angle, timestamp: ngayon, actionTaken: true });
});
app.get('/api/bin/dashboard-data', (req, res) => {
res.json({ status: binStatus, history: collectionHistory });
});
app.listen(PORT, () => console.log(Server listening on port ${PORT}));
