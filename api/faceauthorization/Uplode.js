


const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/faceauthorization');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});

const upload = multer({ storage: storage });

// DB insert function
const insertFile = (Emp_id, company_id, fileName, res) => {
    const query = 'INSERT INTO face_auth (employee_id, company_id,  image_path) VALUES (?, ?, ?)';
    const values = [Emp_id, company_id, '/uploads/faceauthorization/' + fileName];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        } else {
            return res.status(200).json({ status: true, message: 'File uploaded and data inserted successfully!' });
        }
    });
};

// DB update function
const updateFile = (Emp_id, company_id, fileName, res) => {
    const query = 'UPDATE face_auth SET image_path = ? WHERE employee_id = ? AND company_id = ?';
    const values = ['/uploads/faceauthorization/' + fileName, Emp_id, company_id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        } else {
            return res.status(200).json({ status: true, message: 'File updated successfully!' });
        }
    });
};

// Check if file already exists in the database
const fileExists = (Emp_id, company_id) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM face_auth WHERE employee_id = ? AND company_id = ?';
        db.query(query, [Emp_id, company_id], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results.length > 0);
            }
        });
    });
};

// Upload route (single file only)  
router.post('/registerFace', upload.single('face'), async (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: "Invalid userData" });
        }
    }

    if (!decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: "Company ID is missing or invalid" });
    }

    let company_id = decodedUserData.company_id;
    let Emp_id = decodedUserData.id;

    if (!req.file) {
        return res.status(400).json({ status: false, message: 'No file uploaded' });
    }

    const fileName = path.basename(req.file.path);

    try {
        const exists = await fileExists(Emp_id, company_id);

        if (exists) {
            // If file already exists, update it
            await updateFile(Emp_id, company_id, fileName, res);
        } else {
            // If file does not exist, insert it
            await insertFile(Emp_id, company_id, fileName, res);
        }
    } catch (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ status: false, message: 'Error while uploading document' });
    }
});



router.post('/faceGet', async (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }
    try {
        let query = `SELECT id, employee_id, company_id, image_path, created_at FROM face_auth WHERE company_id = ? And employee_id = ?`;
        let values = [decodedUserData.company_id, decodedUserData.id];


        db.query(query, values, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            res.json({
                status: true,
                data: results,
                message: 'fetched successfully',
            });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
    }

});

module.exports = router;








