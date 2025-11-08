const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const path = require('path');
const fs = require('fs');

// Rules
// SELECT `id`, `employee_id`, `company_id`, `face_authentication`, `face_url`, `embeddings`,
//  `created_at` FROM `face_auth` WHERE 1


// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/face');
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


// router.post('/faceRegister', upload.single('face'), async (req, res) => {

//     const { userData, embeddings, employeeId } = req.body;

//     let decodedUserData = null;


//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             // decodedUserData=userData;
//             return res.status(400).json({ status: false, error: 'Invalid userData' });
//         }
//     }

//     const company_id = decodedUserData.company_id;
//     const id = employeeId || decodedUserData.id;
//     // Server-side validation
//     if (!company_id && !id) {
//         return res.status(400).json({ status: false, message: 'Invalid input data' });
//     }


//     const query = `SELECT id FROM face_auth WHERE employee_id = ? AND company_id = ?`;
//     const values = [id, company_id];

//     try {
//         const [rows] = await db.promise().query(query, values);

//         if (rows.length > 0) {
//             // Update existing record
//             const updateQuery = `UPDATE face_auth SET face_url = ? ,embeddings=? ,face_authentication=1 WHERE employee_id = ? AND company_id = ?`;
//             const updateValues = ['/uploads/face/' + req.file.filename, embeddings, id, company_id];
//             await db.promise().query(updateQuery, updateValues);
//             return res.status(200).json({ status: true, message: 'Face data updated successfully!' });
//         } else {
//             // Insert new record
//             const insertQuery = `INSERT INTO face_auth (employee_id, company_id, face_url,embeddings,face_authentication) VALUES (?,?,?, ?, ?)`;
//             const insertValues = [1, id, company_id, '/uploads/face/' + req.file.filename, embeddings];
//             await db.promise().query(insertQuery, insertValues);
//             return res.status(200).json({ status: true, message: 'Face data registered successfully!' });
//         }
//     } catch (err) {
//         return { status: false, message: err.message };
//     }


// });

// delete

router.post('/faceRegister', upload.single('face'), async (req, res) => {
    const { userData, embeddings, employeeId } = req.body;
    let decodedUserData = null;

    // Decode userData safely
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData?.company_id;
    const id = employeeId || decodedUserData?.id;

    if (!company_id || !id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }
    let faceUrl = '';
    // Handle missing file upload
    if (!req.file) {
        faceUrl = '';
    } else {
        faceUrl = '/uploads/face/' + req.file.filename;
    }



    try {
        const [rows] = await db.promise().query(
            `SELECT id FROM face_auth WHERE employee_id = ? AND company_id = ?`,
            [id, company_id]
        );

        if (rows.length > 0) {
            // Update existing record
            await db.promise().query(
                `UPDATE face_auth 
                 SET face_url = ?, embeddings = ?, face_authentication = 1 
                 WHERE employee_id = ? AND company_id = ?`,
                [faceUrl, embeddings, id, company_id]
            );
            return res.status(200).json({ status: true, message: 'Face data updated successfully!' });
        } else {
            // Insert new record
            await db.promise().query(
                `INSERT INTO face_auth (employee_id, company_id, face_url, embeddings, face_authentication) 
                 VALUES (?, ?, ?, ?, ?)`,
                [id, company_id, faceUrl, embeddings, 1]
            );
            return res.status(200).json({ status: true, message: 'Face data registered successfully!' });
        }
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});





router.post('/faceDelete', async (req, res) => {
    const { userData, employeeId } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;
    const id = employeeId || decodedUserData.id;
    // Server-side validation
    if (!company_id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }


    const query = `SELECT id FROM face_auth WHERE employee_id = ? AND company_id = ?`;

    const values = [id, company_id];

    try {
        const [rows] = await db.promise().query(query, values);
        if (rows.length > 0) {
            // Delete existing record
            const deleteQuery = `DELETE FROM face_auth WHERE employee_id = ? AND company_id = ? and face_authentication=1`;
            const deleteValues = [id, company_id];
            await db.promise().query(deleteQuery, deleteValues);
            return res.status(200).json({ status: true, message: 'Face data deleted successfully!' });
        } else {
            return res.status(404).json({ status: false, message: 'No face data found to delete!' });
        }


    } catch (err) {
        return { status: false, message: err.message };
    }


});


///refaceUplode


///get face details 

router.post('/faceDetails', async (req, res) => {
    const { userData } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;
    // Server-side validation
    if (!company_id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }


    const query = `SELECT concat(e.first_name,' ',e.last_name) as name,e.id,e.employee_id, fa.face_authentication, fa.face_url, fa.embeddings FROM face_auth fa
INNER JOIN employees e on e.id=fa.employee_id WHERE fa.company_id = ? and fa.face_authentication=1`;

    const values = [company_id];

    try {
        const [rows] = await db.promise().query(query, values);
        if (rows.length > 0) {
            return res.status(200).json({ status: true, data: rows });
        } else {
            return res.status(404).json({ status: false, message: 'No face data found!' });
        }
    } catch (err) {
        return { status: false, message: err.message };
    }


});



// Export the router
module.exports = router;
