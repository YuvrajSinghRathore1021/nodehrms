// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const router = express.Router();
// const db = require('../../DB/ConnectionSql');

// // Set up multer for file uploads
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const dir = path.join(__dirname, 'uploads');
//         if (!fs.existsSync(dir)) {
//             fs.mkdirSync(dir, { recursive: true });
//         }
//         cb(null, dir);
//     },
//     filename: (req, file, cb) => {
//         const ext = path.extname(file.originalname);
//         cb(null, `${Date.now()}${ext}`);
//     }
// });

// const upload = multer({ storage: storage });

// // Insert file information into the database, using only the file name
// const insertFile = async (Emp_id, company_id, name, fileName, res) => {
//     const query = 'INSERT INTO documents (employee_id, company_id, name, file_path) VALUES (?, ?, ?, ?)';
//     const values = [Emp_id, company_id, name, fileName]; 

//     db.query(query, values, (err, results) => {
//         if (err) {
//             console.error('Database error:', err);
//             return res.status(500).json({ status: false, message: 'Database error', error: err });
//         }
//     });
// };

// // Route to upload documents
// router.post('/upload', upload.fields([{ name: 'images' }, { name: 'otherImages' }]), async (req, res) => {
//     const { selectedDocuments, Emp_id, company_id, otherDocumentName } = req.body;
//     const images = req.files['images'] || [];
//     const otherImages = req.files['otherImages'] || [];

//     try {
//         const selectedDocs = selectedDocuments ? JSON.parse(selectedDocuments) : [];
//         const regularDocument = selectedDocs.find(doc => doc.code !== 'other');

//         // Insert regular document images
//         for (const file of images) {
//             const docName = regularDocument ? regularDocument.name : 'Unknown';
//             const fileName = path.basename(file.path); // Extract file name from the file path
//             await insertFile(Emp_id, company_id, docName, fileName, res);  // Use fileName here
//         }

//         // Insert 'other' document images
//         for (const file of otherImages) {
//             const fileName = path.basename(file.path); // Extract file name from the file path
//             await insertFile(Emp_id, company_id, otherDocumentName, fileName, res);  // Use fileName here
//         }

//         res.status(200).send('Documents uploaded and data inserted successfully!');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error while processing documents');
//     }
// });

// module.exports = router;













const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/documents');
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
const insertFile = (Emp_id, company_id, name, fileName, res) => {
    const query = 'INSERT INTO documents (employee_id, company_id, document_name, file_path) VALUES (?, ?, ?, ?)';
    const values = [Emp_id, company_id, name, fileName];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        } else {
            return res.status(200).json({ status: true, message: 'File uploaded and data inserted successfully!' });
        }
    });
};

// Upload route (single file only) 
// app cheak A 
router.post('/documentPost', async (req, res) => {
    // const { Emp_id, company_id, documentName } = req.body;
    const { userData, documentName, document } = req.body;
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

    const fileName = document;
    try {
        await insertFile(Emp_id, company_id, documentName, fileName, res);
    } catch (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ status: false, message: 'Error while uploading document' });
    }
});

// app cheak A
router.post('/documentGet', async (req, res) => {
    const { userData, document_name } = req.body;
    // let document_name=['Aadhar Card','Pan Card','Passport','Driving License'];
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
        let query = `SELECT id, employee_id, company_id, document_name, file_path, status, add_stamp, uploaded_at FROM documents WHERE company_id = ? And employee_id = ?`;
        let values = [decodedUserData.company_id, decodedUserData.id];
        if (document_name) {

            if (!Array.isArray(document_name)) {
                return res.status(400).json({ status: false, message: 'document_name should be an array' });
            }
            if (document_name.length === 0) {
                return res.status(400).json({ status: false, message: 'document_name array should not be empty' });
            }
            query += ' AND document_name IN (' + document_name.map(() => '?').join(',') + ')';
            values = values.concat(document_name);
        }
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
