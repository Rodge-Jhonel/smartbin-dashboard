const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let binStatus = {
    bioLevel: 0,
    nonBioLevel: 0,
    bioCount: 0,
    nonBioCount: 0,
    lastItem: "None Yet",
    lastTime: "N/A"
};

let collectionHistory = [];

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

// PANG-TEST KUNG BUHAY ANG SERVER
app.get('/health', (req, res) => {
    res.send("Server is perfectly running!");
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
