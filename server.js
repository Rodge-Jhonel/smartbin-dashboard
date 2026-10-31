const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 3000;

// Para sa pagtanggap ng mga imahe mula sa ESP32-CAM nang walang lag
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ginagawang pampubliko ang laman ng public folder para mabuksan sa Chrome
app.use(express.static(path.join(__dirname, 'public')));

// DATA STORAGE (Dito itatabi ang data habang umaandar ang server sa background)
let binStatus = {
    bioLevel: 0,        // Porsyento ng Bio compartment (0-100%)
    nonBioLevel: 0,     // Porsyento ng Non-Bio compartment (0-100%)
    bioCount: 0,
    nonBioCount: 0,
    lastItem: "Wala Pa",
    lastTime: "N/A"
};

// Array para sa History Log Table
let collectionHistory = [];

// ==========================================
// 1. ENDPOINT PARA SA ULTRASONIC SENSORS (Level Tracking)
// ==========================================
app.post('/api/bin/update-levels', (req, res) => {
    const { bioPercentage, nonBioPercentage } = req.body;

    if (bioPercentage !== undefined) binStatus.bioLevel = parseInt(bioPercentage);
    if (nonBioPercentage !== undefined) binStatus.nonBioLevel = parseInt(nonBioPercentage);

    res.json({ success: true, message: "Compartment levels updated!" });
});

// ==========================================
// 2. AUTOMATIC AI SEGREGATION (CAMERA-TRIGGERED LOOP)
// ==========================================
app.post('/api/bin/auto-segregate', upload.single('imageFile'), (req, res) => {

    // Ang AI ngayon ay may 3 classes: Empty (Walang Basura), Bio, at Non-Bio
    // Gumagamit tayo ng weights para mas madalas mag-trigger ang basura sa simulation
    const weights = ["Empty", "Biodegradable", "Biodegradable", "Non-Biodegradable", "Non-Biodegradable"];
    const aiResult = weights[Math.floor(Math.random() * weights.length)];

    // A. KUNG WALANG BASURA SA CAMERA (EMPTY) - Walang gagawin ang basurahan at dashboard
    if (aiResult === "Empty") {
        return res.json({
            prediction: "Empty",
            servoAngle: 0, // Mananatili sa gitna o rest position ang servo
            actionTaken: false
        });
    }

    // B. KUNG MAY BASURANG NA-DETECT (BIO O NON-BIO) - Awtomatikong magse-segregate
    const ngayon = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });

    binStatus.lastItem = aiResult;
    binStatus.lastTime = ngayon;

    if (aiResult === "Biodegradable") {
        binStatus.bioCount++;
    } else {
        binStatus.nonBioCount++;
    }

    // Isulat sa History Log Record
    collectionHistory.unshift({
        id: collectionHistory.length + 1,
        timestamp: ngayon,
        category: aiResult,
        status: "Successfully Segregated"
    });

    // Limitahan sa huling 50 items para hindi bumagal ang application
    if (collectionHistory.length > 50) collectionHistory.pop();

    // Ang servoAngle na ito ang babasahin ng ESP32 para iikot ang flap (e.g., 45 o 135 degrees)
    const angle = aiResult === "Biodegradable" ? 45 : 135;

    res.json({
        prediction: aiResult,
        servoAngle: angle,
        timestamp: ngayon,
        actionTaken: true
    });
});

// ==========================================
// 3. ENDPOINT PARA SA INTERFACE (Chrome Fetch)
// ==========================================
app.get('/api/bin/dashboard-data', (req, res) => {
    res.json({
        status: binStatus,
        history: collectionHistory
    });
});

app.listen(PORT, () => console.log(`Dashboard link: http://localhost:${PORT}`));
