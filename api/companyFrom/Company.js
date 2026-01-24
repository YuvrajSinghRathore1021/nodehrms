const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadFile = require('../../model/functlity/uploadfunclite')
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const db = require('../../DB/ConnectionSql');
const { Console } = require('console');
router.use(cors());
const uploadsDir = path.join(__dirname, '../../uploads/logo/');
const { AdminCheck } = require('../../model/functlity/AdminCheck');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File type filtering
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error(`Error: File upload only supports the following file types - ${filetypes}`));
    }
});

// Route to handle company submissions

// web cheak A
router.post('/api/Add', async (req, res) => {
    const { company_name, owner_name, industry, headquarters, website, phone_number, email, address, member } = req.body;
    const logo = '/uploads/logo/logodummy.png';
    // const logo = '/uploads/logo/'.req.file ? req.file.filename : null;
    // Check for required fields
    if (!company_name || !owner_name || !industry || !phone_number || !email || !address) {
        return res.status(200).json({ status: false, message: 'All fields are required.' });
    }
    // Check if the phone number already exists
    db.query('SELECT * FROM companies WHERE phone_number = ?', [phone_number], (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error.',
                error: err
            });
        }
        if (results.length === 0) {
            // Insert new company
            db.query(
                'INSERT INTO companies (member,company_name, owner_name, industry, headquarters, website, phone_number, email, address, logo) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [member, company_name, owner_name, industry, headquarters, website, phone_number, email, address, logo],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            status: false,
                            message: 'Failed to add company.',
                            error: err
                        });
                    }
                    const companyId = result.insertId;
                    db.query('SELECT * FROM employees WHERE contact_number = ?', [phone_number], (err, results) => {
                        if (results.length == 0) {
                            db.query('INSERT INTO employees (company_id,contact_number,email_id,first_name,type) VALUES (?,?,?,?,?)',
                                [companyId, phone_number, email, owner_name, 'Company_Admin'])
                            return res.status(200).json({
                                status: true,
                                message: 'Company Add'
                            });
                        } else {
                            return res.status(200).json({
                                status: true,
                                message: 'pls connect with yuvraj singh - ph. 7976929440.'
                            });
                        }
                    });
                }
            );
        } else {
            return res.status(200).json({
                status: false,
                message: 'Company with this phone number already exists.'
            });
        }
    });
});


router.post('/api/Edit', async (req, res) => {
    const {
        company_name,
        owner_name,
        industry,
        headquarters,
        website,
        phone_number,
        email,
        address,
        editId,
        member, logo
    } = req.body;

    // Check for required fields
    if (!company_name || !owner_name || !industry || !phone_number || !email || !address || !editId) {
        return res.status(400).json({ status: false, message: 'All fields are required.' });
    }

    // Get the new logo filename if it exists
    const newLogo = logo ? logo : null;

    // Fetch the current logo from the database
    db.query('SELECT logo FROM companies WHERE id = ?', [editId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: 'Failed to fetch current logo.',
                error: err.message
            });
        }

        // Check if the company exists
        if (results.length === 0) {
            return res.status(404).json({ status: false, message: 'Company not found.' });
        }

        // Use the existing logo if no new logo is uploaded
        const currentLogo = results[0].logo;
        const logoToUse = newLogo || currentLogo;
        // Update company details
        db.query(
            'UPDATE companies SET company_name = ?,member = ?, owner_name = ?, industry = ?, headquarters = ?, website = ?, phone_number = ?, email = ?, address = ?, logo = ? WHERE id = ?',
            [company_name, member, owner_name, industry, headquarters, website, phone_number, email, address, logoToUse, editId],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        status: false,
                        message: 'Failed to edit company.',
                        error: err.message
                    });
                }
                return res.status(200).json({
                    status: true,
                    message: 'Company edited successfully.'
                });
            }
        );
    });
});
// web cheak A
router.post('/api/UploadLogo', async (req, res) => {
    const { userData, logo } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }


    const filePath = logo ? logo : null;

    db.query('SELECT logo FROM companies WHERE id = ?', [decodedUserData.company_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, message: 'Failed to fetch current logo.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, message: 'Company not found.' });
        }
        const currentLogo = results[0].logo;
        const logoToUse = filePath || currentLogo;

        db.query('UPDATE companies SET logo = ? WHERE id = ?', [logoToUse, decodedUserData.company_id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: 'Failed to update company logo.' });
            }
            return res.status(200).json({
                status: true,
                message: 'Logo uploaded and updated successfully.',

            });
        });
    });
});




// web cheak A
router.get('/api/data', (req, res) => {
    const { userData, type } = req.query;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;
    let companyId = req?.user?.company_id;

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    let query = 'SELECT a.id, a.company_name, a.owner_name,a.member, a.logo, a.industry, a.headquarters, a.website, a.phone_number, a.email, a.address_id FROM companies a WHERE ';
    const queryParams = [];
    if (companyId == 6) {
        query += ' 1=1 ';
    } else {
        query += ' a.id = ? ';
        queryParams.push(companyId);
    }
    if (type != 'directory') {
        query += '  ORDER BY a.company_name ASC LIMIT ? OFFSET ? ';
        queryParams.push(limit, offset);
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching attendance records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }
        // Count total records for pagination
        const countQuery = 'SELECT COUNT(id) AS total FROM companies WHERE 1=1';
        db.query(countQuery, (err, countResults) => {
            if (err) {
                console.error('Error counting attendance records:', err);
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            const total = countResults[0].total;
            // Add srnu to each result
            const companiesWithSrnu = results.map((company, index) => ({
                srnu: offset + index + 1,
                ...company
            }));

            res.json({
                status: true,
                companies: companiesWithSrnu,
                total,
                page,
                limit
            });

        });
    });
});


// new for company 
// web check A
router.get('/api/fetchDetails', (req, res) => {
    const { userData, type } = req.query;
    let decodedUserData = null;
    // Decode userData

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    // Validate decoded userData
    if (!decodedUserData || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    // Determine the query based on type
    let query;
    let queryParams = [decodedUserData.company_id];
    if (type === 'Overview') {
        query = `SELECT id, company_name, logo, industry, website, phone_number, email, address_id, domain_name, brand_name FROM companies WHERE id = ?`;
    } else if (type === 'Address') {
        query = `SELECT  id,  parent_id, address_title, address_line1, address_line2, city, state, country, pincode FROM address WHERE parent_id = ?`;
    } else {
        return res.status(400).json({ status: false, error: 'Invalid type specified' });
    }

    // Execute the query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }
        // Check if any results were found
        if (results.length == 0) {
            return res.status(200).json({ status: false, error: 'No data found' });
        }
        res.json({
            data: results[0],
            status: true,
            message: 'Data found'
        });
    });
});
// web cheak A
router.post('/api/Update', upload.none(), (req, res) => {
    const { type, id, activeSection, company_name, brand_name, domain_name, industry, website, phone_number, email, parent_id, address_title, address_line1, address_line2, city, state, country, pincode } = req.body;

    if (!id || !activeSection) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id and activeSection' });
    }
    let query;
    let values;
    // if (type == 'Overview') {
    switch (activeSection) {
        case 'Overview':
            query = 'UPDATE companies SET company_name=?,domain_name=?, brand_name=?, industry=?,  website=?, phone_number=?, email=? WHERE id=?';
            values = [company_name, domain_name, brand_name, industry, website, phone_number, email, id];
            break;
        case 'Address':
            query = 'UPDATE address SET address_line1=?, address_line2=?, city=?, state=?, country=?, pincode=? WHERE id=?';
            values = [address_line1, address_line2, city, state, country, pincode, id];
            break;
        default:
            return res.status(400).json({ status: false, message: 'Invalid activeSection provided' });
    }

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }

        res.json({ status: true, message: 'Update successful', data: results });
    });
});
// web cheak A
router.get('/api/AddressDetails', (req, res) => {
    const { userData } = req.query;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    // Validate decoded userData
    if (!decodedUserData || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    const companyId = decodedUserData.company_id;

    // Queries for each address type
    const queries = {
        RegisteredOffice: `SELECT address_line1, address_line2, city, state, country, pincode FROM address WHERE type = 'RegisteredOffice' AND parent_id = ?`,
        CorporateOffice: `SELECT address_line1, address_line2, city, state, country, pincode FROM address WHERE type = 'CorporateOffice' AND parent_id = ?`,
        CustomAddressTitle: `SELECT address_line1, address_line2, city, state, country, pincode FROM address WHERE type = 'CustomAddressTitle' AND parent_id = ?`
    };

    const fetchAddressData = (query, params) => {
        return new Promise((resolve, reject) => {
            db.query(query, params, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0] || null);
                }
            });
        });
    };

    // Fetch all address types concurrently
    Promise.all([
        fetchAddressData(queries.RegisteredOffice, [companyId]),
        fetchAddressData(queries.CorporateOffice, [companyId]),
        fetchAddressData(queries.CustomAddressTitle, [companyId])
    ])
        .then(([registeredOffice, corporateOffice, customAddressTitle]) => {
            // Construct the response object
            const response = {
                RegisteredOffice: registeredOffice || {
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: '',
                    country: '',
                    pincode: ''
                },
                CorporateOffice: corporateOffice || {
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: '',
                    country: '',
                    pincode: ''
                },
                CustomAddressTitle: customAddressTitle || {
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: '',
                    country: '',
                    pincode: ''
                }
            };
            // Send the successful response
            res.json({
                data: response,
                status: true,
                message: 'Data found'
            });
        })
        .catch(err => {
            res.status(500).json({ status: false, error: 'Failed to fetch address details' });
        });
});
const checkIfAddressExists = (companyId, type) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM address WHERE parent_id = ? AND type = ? LIMIT 1`;
        db.query(query, [companyId, type], (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0 ? results[0] : null);
        });
    });
};

// API to insert or update address
// web cheak A
router.post('/api/AddressUpdate', (req, res) => {
    const { id, activeSection, type, address_line1, address_line2, city, state, country, userData, pincode } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(403).json({ status: false, error: 'Invalid userData format' });
        }
    }
    // Validate decoded userData
    if (!decodedUserData || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }
    const company_id = decodedUserData.company_id;
    if (!activeSection || !company_id || !type || !address_line1 || !city || !state || !country || !pincode) {
        return res.status(400).json({ status: false, message: 'Missing required fields' });
    }
    checkIfAddressExists(company_id, activeSection)
        .then(existingAddress => {
            let query;
            let values;
            if (existingAddress) {
                // Update the address if it already exists
                query = `UPDATE address SET address_line1 = ?, address_line2 = ?, city = ?, state = ?, country = ?, pincode = ? WHERE id = ?`;
                values = [address_line1, address_line2, city, state, country, pincode, existingAddress.id];
            } else {
                // Insert a new address if it doesn't exist
                query = `INSERT INTO address (parent_id, type, address_line1, address_line2, city, state, country, pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                values = [company_id, activeSection, address_line1, address_line2, city, state, country, pincode];
            }
            // Execute the query (insert or update)
            db.query(query, values, (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ status: false, message: 'Database error', error: err });
                }
                if (existingAddress) {
                    res.json({ status: true, message: 'Update successful', data: results });
                } else {
                    res.json({ status: true, message: 'Insert successful', data: results });
                }
            });
        })
        .catch(err => {
            console.error('Error checking address existence:', err);
            res.status(500).json({ status: false, message: 'Error checking address existence', error: err });
        });
});

// Department page api start----
// app cheak A
router.post('/api/DepartmentDetails', (req, res) => {
    const { userData, type, UserId } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // Validate decoded userData
    const company_id = decodedUserData.company_id;
    if (!company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }
    db.query(
        'SELECT id, name, type, parent_id, company_id FROM departments WHERE company_id = ?',
        [company_id],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Database error occurred while fetching department details',
                    error: err.message || err
                });
            }
            // Check if any departments are found
            if (results.length === 0) {
                return res.status(200).json({ status: false, message: 'No departments found for this company' });
            }
            // Organize departments into a nested structure
            const departments = results.filter(dep => dep.type === 1); // Get main departments
            const subDepartments = results.filter(dep => dep.parent_id !== null);
            // Add sub-departments to their parent departments
            departments.forEach(dep => {
                dep.subDepartments = subDepartments.filter(sub => sub.parent_id === dep.id);
            });
            // Return the structured data
            res.json({
                status: true,
                data: departments
            });
        }
    );
});

// Endpoint to add a new department
// app cheak A
router.post('/api/AddDepartment', (req, res) => {
    const { name, userData, type } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    const company_id = decodedUserData.company_id;
    if (!name || !company_id || !type) {
        return res.status(400).json({ status: false, error: 'Department name, company ID, and type are required' });
    }

    // Insert the new department into the database

    db.query(
        'INSERT INTO departments (name, company_id, type) VALUES (?, ?, ?)',
        [name, company_id, type],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, error: 'Error while adding department' });
            }
            res.status(201).json({ status: true, message: 'Department added successfully' });
        }
    );
});

// Endpoint to add a new department
// app cheak A
router.post('/api/EditDepartment', (req, res) => {
    const { name, userData, type, Id, parent_id = 0 } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    const company_id = decodedUserData.company_id;
    if (!name || !company_id || !type) {
        return res.status(400).json({ status: false, error: 'Department name, company ID, and type are required' });
    }

    // Insert the new department into the database

    db.query(
        'UPDATE departments SET name=?, type=?,parent_id=? Where id =? And company_id=?',
        [name, type, parent_id, Id, company_id],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, error: 'Error while UPDATE department' });
            }
            res.status(200).json({ status: true, message: 'UPDATE successfully' });
        }
    );
});
// Endpoint to add a new sub-department
// app cheak A
router.post('/api/AddSubDepartment', (req, res) => {
    const { name, userData, parent_id, type } = req.body;
    let decodedUserData = null;
    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // Validate decoded userData
    const company_id = decodedUserData.company_id;

    // Validate input
    if (!name || !company_id || !parent_id || !type) {
        return res.status(400).json({ status: false, error: 'Sub-department name, company ID, parent department ID, and type are required' });
    }

    // Insert the new sub-department into the database
    db.query(
        'INSERT INTO departments (name, company_id, parent_id, type) VALUES (?, ?, ?, ?)',
        [name, company_id, parent_id, type],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, error: 'Error while adding sub-department' });
            }
            res.status(201).json({ status: true, message: 'Sub-department added successfully' });
        }
    );
});

// web cheak A
router.post('/api/departmentDelete', (req, res) => {
    const { userData, id } = req.body;
    let decodedUserData = null;
    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // Validate decoded userData
    const company_id = decodedUserData.company_id;

    // Validate input
    if (!company_id || !id) {
        return res.status(400).json({ status: false, error: ' All Filds are required' });
    }

    // Insert the new sub-department into the database
    db.query(
        'DELETE FROM `departments` WHERE company_id=? and id=?',
        [company_id, id],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, error: 'Error' });
            }


            res.status(201).json({ status: true, message: 'Department DELETE successfully' });
        }
    );
});


// Department page api End----




// Department page api start----

// app cheak A
router.post('/api/DesignationDetails', (req, res) => {

    const { userData, type, UserId } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // Validate decoded userData
    const company_id = decodedUserData.company_id;
    if (!company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }
    db.query(
        `SELECT designation, COUNT(*) AS employee_count,GROUP_CONCAT(CONCAT(first_name, ' ', last_name) SEPARATOR ', ') AS employee_names,GROUP_CONCAT(id SEPARATOR ', ') AS id FROM employees WHERE company_id = ? GROUP BY designation`,
        // 'SELECT d.id AS department_id, d.name AS department_name, d.type AS department_type, d.parent_id, COUNT(e.id) AS employee_count, GROUP_CONCAT(e.first_name) AS employee_names, d.company_id FROM departments AS d INNER JOIN employees AS e ON e.sub_department = d.id WHERE d.company_id = ? AND d.type = 2 GROUP BY d.id, d.name, d.type, d.parent_id, d.company_id;',
        // 'SELECT d.id, d.name, d.type, d.parent_id, COUNT(e.id) AS employee_count, d.company_id FROM departments AS d INNER JOIN employees AS e ON e.sub_department = d.id WHERE d.company_id = ? AND d.type = 2 GROUP BY d.id, d.name, d.type, d.parent_id, d.company_id',
        [company_id],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Database error occurred while fetching department details',
                    error: err.message || err
                });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, message: 'No Designation found for this company' });
            }
            res.json({
                status: true,
                data: results,
                message: ''
            });
        }
    );
});
// app cheak A
router.post('/api/Designation', (req, res) => {

    const { userData } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // Validate decoded userData
    const company_id = decodedUserData.company_id;
    if (!company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }
    db.query(`SELECT designation
FROM employees
WHERE company_id = ?
  AND designation IS NOT NULL
  AND designation != 'null'
GROUP BY designation`, [company_id],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Database error occurred while fetching details',
                    error: err.message || err
                });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, message: 'No Designation found for this company' });
            }
            res.json({
                status: true,
                data: results,
                message: ''
            });
        }
    );
});
// web cheak A
router.post('/api/DesignationUpdate', async (req, res) => {
    const { userData, Designation, oldDesignation, employeesId } = req.body;

    let parsed = JSON.parse(employeesId); // parsed = [1,2,3]
    if (!Array.isArray(parsed) || parsed.length === 0) {
        return res.status(400).json({ status: false, error: 'No employee IDs provided for designation update' });
    }

    let DesignationOld = oldDesignation || 'null';

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    if (!Designation) {
        return res.status(400).json({ status: false, error: 'Designation is required' });
    }

    // Safe query
    let idPlaceholders = parsed.map(() => '?').join(', '); // e.g. ?, ?, ?
    const UpdateQuery = `
      UPDATE employees 
      SET designation = ? 
      WHERE employee_status = 1 
        AND status = 1 
        AND delete_status = 0 
        AND company_id = ? 
        AND (id IN (${idPlaceholders}) And designation = ?)
    `;

    const UpdateValues = [Designation, decodedUserData.company_id, ...parsed, DesignationOld];

    db.query(UpdateQuery, UpdateValues, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: 'Failed to edit designation.',
                error: err.message
            });
        }
        return res.status(200).json({
            status: true,
            message: 'Designation edited successfully.',
            data: result
        });
    });
});
// get logo 
// web cheak A
router.post('/api/GetCompanyLogo', async (req, res) => {

    const { userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    db.query(
        'SELECT logo,company_name FROM companies WHERE id = ?',
        [decodedUserData.company_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: 'Database error occurred while fetching department details',
                    error: err.message || err
                });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, message: 'No found for this company' });
            }
            res.json({
                status: true,
                data: results
            });
        }
    );
});


router.post('/api/SocialLink', async (req, res) => {

    const { userData, instagram, facebook, linkedin, type } = req.body;
    let decodedUserData = null;

    // Decode and parse userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    // Validate required user data fields
    if (!decodedUserData || !decodedUserData.id || !decodedUserData?.company_id) {
        return res.status(400).json({
            status: false,
            error: 'Invalid user data. Employee ID and Company ID are required.'
        });
    }

    // Prepare the query and data array
    let query = "SELECT instagram, facebook, linkedin FROM social_profile WHERE company_id = ?";
    let dataArray = [decodedUserData.company_id];

    if (type === 'Company_Profile') {
        query += " AND type = ?";
        dataArray.push(type);
    } else {
        query += " AND employee_id = ?";
        dataArray.push(decodedUserData.id);
    }

    // Execute the database query
    db.query(query, dataArray, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error.',
                error: err
            });
        }

        if (results.length === 0) {
            // Insert new social profile
            db.query(
                `INSERT INTO social_profile (company_id, employee_id, instagram, facebook, linkedin, type) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [decodedUserData.company_id, decodedUserData.id, instagram, facebook, linkedin, type],
                (err) => {
                    if (err) {
                        return res.status(500).json({
                            status: false,
                            message: 'Failed to add Social Profile.',
                            error: err
                        });
                    }
                    return res.status(200).json({
                        status: true,
                        message: 'Social Profile added successfully.'
                    });
                }
            );
        } else {
            // Update existing social profile
            db.query(
                `UPDATE social_profile 
                 SET instagram = ?, facebook = ?, linkedin = ?, type = ? 
                 WHERE company_id = ? AND employee_id = ?`,
                [instagram, facebook, linkedin, type, decodedUserData.company_id, decodedUserData.id],
                (err) => {
                    if (err) {
                        return res.status(500).json({
                            status: false,
                            message: 'Failed to update Social Profile.',
                            error: err
                        });
                    }
                    return res.status(200).json({
                        status: true,
                        message: 'Social Profile updated successfully.'
                    });
                }
            );
        }
    });
});

router.post('/api/GetSocialLink', async (req, res) => {
    const { userData, type } = req.body;
    let decodedUserData = null;

    // Decode and parse userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    // Validate required user data fields
    if (!decodedUserData || !decodedUserData.id || !decodedUserData?.company_id) {
        return res.status(400).json({
            status: false,
            error: 'Invalid user data. Employee ID and Company ID are required.'
        });
    }

    // Prepare the query and data array
    let query = "SELECT instagram, facebook, linkedin FROM social_profile WHERE company_id = ?";
    let dataArray = [decodedUserData.company_id];

    if (type === 'Company_Profile') {
        query += " AND type = ?";
        dataArray.push(type);
    } else {
        query += " AND employee_id = ?";
        dataArray.push(decodedUserData.id);
    }

    // Execute the database query
    db.query(query, dataArray, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error.',
                error: err
            });
        }
        if (results.length === 0) {
            return res.status(200).json({
                status: false,
                data: [],
                message: 'No data Found.'
            });
        } else {
            return res.status(200).json({
                status: true,
                data: results,
                message: 'Social Profile Get.'
            });
        }
    });
});





// app cheak A / web cheak A
router.post('/employee-hierarchyTeam', (req, res) => {
    const { userData } = req.body;
    let CheckId = req.body.CheckId || null;
    if (!CheckId || CheckId === 'undefined' || CheckId === 'null') {
        CheckId = null;
    }

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: "Invalid userData" });
        }
    }
    if (!decodedUserData?.company_id) {
        return res
            .status(400)
            .json({ status: false, error: "Company ID is missing or invalid" });
    }
    const id = CheckId || decodedUserData.id;
    const company_id = decodedUserData.company_id;
    db.query(
        'SELECT id, type,profile_image, company_id,   CONCAT(first_name, " ", last_name,"-",employee_id) AS first_name, reporting_manager FROM employees WHERE company_id = ? and status=1',
        [company_id],
        (err, employees) => {
            if (err) return res.status(500).json({ error: err.message });

            const currentUser = employees.find(emp => emp.id == id);
            if (!currentUser) return res.status(404).json({ error: 'Employee not found' });

            // Normalize reporting_manager
            const normalizedEmployees = employees.map(emp => ({
                ...emp,
                reporting_manager: (
                    emp.reporting_manager === null ||
                    emp.reporting_manager === 0 ||
                    emp.reporting_manager === "0" ||
                    emp.reporting_manager === "" ||
                    emp.reporting_manager === "null"
                ) ? null : Number(emp.reporting_manager)
            }));

            // Create a map
            const map = {};
            normalizedEmployees.forEach(emp => {
                map[emp.id] = {
                    id: emp.id,
                    name: emp.first_name,
                    profile_image: emp.profile_image,
                    reporting_manager: emp.reporting_manager,
                    children: []
                };
            });

            // Build hierarchy
            const tree = [];
            normalizedEmployees.forEach(emp => {
                const node = map[emp.id];
                if (emp.reporting_manager && map[emp.reporting_manager]) {
                    map[emp.reporting_manager].children.push(node);
                } else {
                    tree.push(node); // top-level
                }
            });

            // HR/ADMIN/CEO - get full tree
            if (['ceo', 'hr', 'admin'].includes(currentUser.type)) {
                return res.json(tree);
            }

            // Regular employee - return only their subtree
            const getSubtree = (id) => {
                return map[id] || null;
            };

            return res.json([getSubtree(currentUser.id)]);
        }
    );

});







// Branch code 
// web cheak A
router.get("/Branchfetch", (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    const { userData } = req.query;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: "Invalid userData" });
        }
    }

    if (!decodedUserData?.company_id) {
        return res
            .status(400)
            .json({ status: false, error: "Company ID is missing or invalid" });
    }

    // Fetch branches with pagination
    const branchesQuery = `
    SELECT * FROM branches 
    WHERE company_id = ? 
    ORDER BY id DESC 
    LIMIT ? OFFSET ?;
  `;

    db.query(
        branchesQuery,
        [decodedUserData.company_id, limit, offset],
        (err, branches) => {
            if (err) {
                console.error("Error fetching branches:", err);
                return res.status(500).json({ status: false, error: "Server error" });
            }

            if (branches.length === 0) {
                return res.json({ status: true, records: [], total: 0, page, limit });
            }

            const branchIds = branches.map((b) => b.id);

            // Fetch employees for all these branches
            const empQuery = `
        SELECT 
          id AS value,
          CONCAT(first_name, ' ', last_name) AS label,
          branch_id
        FROM employees
        WHERE company_id = ? 
          AND branch_id IN (${branchIds.map(() => "?").join(",")})
          AND status = 1 
          AND delete_status = 0;
      `;

            db.query(empQuery, [decodedUserData.company_id, ...branchIds], (empErr, employees) => {
                // console.log(employees)
                if (empErr) {
                    console.error("Error fetching employees:", empErr);
                    return res.status(500).json({ status: false, error: "Server error" });
                }

                // Group employees by branch_id
                const empMap = {};
                employees.forEach((emp) => {
                    if (!empMap[emp.branch_id]) empMap[emp.branch_id] = [];
                    empMap[emp.branch_id].push({ label: emp.label, value: emp.value });
                });

                // Attach employees to branches
                const recordsWithEmployees = branches.map((branch, index) => ({
                    srnu: offset + index + 1,
                    ...branch,
                    branch_employee: empMap[branch.id] || []
                }));

                // Count total branches
                const countQuery = `SELECT COUNT(id) as total FROM branches WHERE company_id=?`;
                db.query(countQuery, [decodedUserData.company_id], (countErr, countResults) => {
                    if (countErr) {
                        console.error("Error fetching total branches:", countErr);
                        return res.status(500).json({ status: false, error: "Server error" });
                    }

                    const total = countResults[0].total;

                    res.json({
                        status: true,
                        records: recordsWithEmployees,
                        total,
                        page,
                        limit
                    });
                });
            });
        }
    );
});

// web cheak A
router.post("/BranchUpdate", async (req, res) => {
    const { id, userData, name, latitude, longitude, location_required, location_break, radius, ip, ip_status, is_admin, location_status, branch_employee } = req.body;


    // Decode userData
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: "Invalid userData" });
        }
    }
    if (!id) {
        return res.status(400).json({ status: false, message: "ID is required to update branch." });
    }


    if (!decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: "Company ID is missing or invalid" });
    }

    try {
        // 1. Update branch details
        const [updateResult] = await db.promise().query(
            `UPDATE branches 
             SET name=?, location_status=?, latitude=?, longitude=?, radius=?, ip=?, ip_status=? ,is_admin=?
             ,location_required=? ,location_break =? WHERE id = ? AND company_id=?`,
            [name, location_status, latitude, longitude, radius, ip, ip_status, is_admin, location_required, location_break, id, decodedUserData.company_id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ status: false, message: "Branch not found or no changes made." });
        }

        // 2. Handle branch employees
        if (branch_employee) {
            let employeeIds = [];

            try {
                if (Array.isArray(branch_employee)) {
                    // Already an array [7,8,10]
                    employeeIds = branch_employee;
                } else if (typeof branch_employee === "string") {
                    let cleaned = branch_employee.trim();

                    // Remove wrapping quotes if present
                    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                        cleaned = cleaned.slice(1, -1);
                    }

                    // Remove [ ] if present
                    cleaned = cleaned.replace(/^\[|\]$/g, "");

                    // Convert to array
                    employeeIds = cleaned.split(",").map(e => parseInt(e.trim(), 10));
                }

                // Keep only valid numbers
                employeeIds = employeeIds.filter(Number.isInteger);

            } catch (err) {
                return res.status(400).json({ status: false, error: "Invalid branch_employee format" });
            }

            // console.log("Parsed employeeIds:", employeeIds);

            // Fetch old employee IDs for this branch
            const [oldEmpResults] = await db.promise().query(
                "SELECT id FROM employees WHERE branch_id = ? AND company_id = ?",
                [id, decodedUserData.company_id]
            );
            const oldEmployeeIds = oldEmpResults.map(row => row.id);

            // Find employees to remove and to add
            const toRemove = oldEmployeeIds.filter(empId => !employeeIds.includes(empId));
            const toAdd = employeeIds.filter(empId => !oldEmployeeIds.includes(empId));

            if (toRemove.length > 0) {
                await db.promise().query(
                    "UPDATE employees SET branch_id = 0 WHERE id IN (?) AND company_id = ?",
                    [toRemove, decodedUserData.company_id]
                );
            }

            if (toAdd.length > 0) {
                await db.promise().query(
                    "UPDATE employees SET branch_id = ? WHERE id IN (?) AND company_id = ?",
                    [id, toAdd, decodedUserData.company_id]
                );
            }
        }

        return res.status(200).json({ status: true, message: "Branch updated successfully." });

    } catch (error) {
        console.error("Error in BranchUpdate:", error);
        return res.status(500).json({
            status: false,
            message: "Error updating branch.",
            error: error.message
        });
    }
});


// web cheak A
router.post("/BranchAdd", (req, res) => {
    const { name, latitude, longitude, radius, location_required, location_break, userData, ip, ip_status, location_status, is_admin } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, message: "Invalid userData format." });
        }
    }
    if (!decodedUserData || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, message: "Company ID is missing or invalid." });
    }

    const companyId = decodedUserData.company_id;
    db.query(
        "INSERT INTO branches (name,location_status, latitude, longitude, radius , company_id,ip,ip_status,is_admin,location_required,location_break) VALUES (?,?,?,?,?,?, ?, ?,?,?,?)",
        [name, location_status, latitude, longitude, radius, companyId, ip, ip_status, is_admin, location_required, location_break],
        (err, insertResult) => {
            if (err) {
                console.error("Error inserting branch:", err);
                return res.status(200).json({
                    status: false,
                    message: "Error creating branch record.",
                    error: err.message,
                });
            }

            res.status(200).json({
                status: true,
                message: "branch inserted successfully.",
                id: insertResult.insertId,
            });
        }
    );



});


router.post('/assign-manager', async (req, res) => {
    const {
        employeeId,
        userData,
        managerId
    } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    // Check for required fields
    if (!employeeId || !managerId) {
        return res.status(400).json({ status: false, message: 'All fields are required.' });
    }


    // Fetch the current logo from the database
    db.query(
        'UPDATE employees SET reporting_manager = ? WHERE id = ? and company_id=?',
        [managerId, employeeId, decodedUserData.company_id],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to edit company.',
                    error: err.message
                });
            }
            return res.status(200).json({
                status: true,
                message: 'Manager Update successfully.'
            });
        }
    );
});
// web cheak A
router.post('/assign-manager-bulk', async (req, res) => {
    const { employeeId, userData, managerId } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    if (!employeeId || !managerId) {
        return res.status(400).json({ status: false, message: 'All fields are required.' });
    }

    // let employeeIdsArray = employeeId.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    // ✅ Normalize employeeId to always be an array of numbers
    let employeeIdsArray = [];

    if (typeof employeeId === 'string') {
        // case: "1,2,3"
        employeeIdsArray = employeeId
            .split(',')
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));
    } else if (Array.isArray(employeeId)) {
        // case: [1, 2, "3"]
        employeeIdsArray = employeeId
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));
    } else if (typeof employeeId === 'number') {
        // case: single number
        employeeIdsArray = [employeeId];
    }

    if (employeeIdsArray.length === 0) {
        return res.status(200).json({ status: false, message: 'Employee ID Not Found' });
    }

    db.query(
        'UPDATE employees SET reporting_manager = ? WHERE id IN (?) and company_id=?',
        [managerId, employeeIdsArray, decodedUserData.company_id],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to edit company.',
                    error: err.message
                });
            }
            return res.status(200).json({
                status: true,
                message: 'Manager Update successfully.'
            });
        }
    );
});


// app cheak A / web cheak A
router.post("/branchName", async (req, res) => {

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

    if (!decodedUserData?.company_id) {
        return res
            .status(400)
            .json({ status: false, error: "Company ID is missing or invalid" });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    // Fetch branches with pagination
    let branchesQuery = `SELECT id,name FROM branches WHERE company_id = ? and status=1 `;
    if (isAdmin == true) {

    } else {
        branchesQuery += ' and is_admin=0';
    }
    branchesQuery += ' ORDER BY name ASC ';

    db.query(branchesQuery, [decodedUserData.company_id], (err, branches) => {
        if (err) {
            console.error("Error fetching branches:", err);
            return res.status(500).json({ status: false, error: "Server error" });
        }

        if (branches.length === 0) {
            return res.json({ status: true, records: [], oldBranch: [] });
        }

        db.query('SELECT b.id,  b.name FROM branches as b INNER JOIN employees as e on b.id=e.branch_id WHERE e.company_id=? and e.id=?', [decodedUserData?.company_id, decodedUserData?.id], (err, oldBranch) => {
            if (err) {
                console.error("Error fetching branches:", err);
                return res.status(500).json({ status: false, error: "Server error" });
            }
            res.json({
                status: true,
                records: branches,
                oldBranch: oldBranch
            });
        });
    });

});



// changeBranch  
// app cheak A
router.post('/changeBranch', async (req, res) => {
    const { userData, branchId } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    let employeeId = decodedUserData.id;
    // Check for required fields
    if (!employeeId || !branchId) {
        return res.status(400).json({ status: false, message: 'All fields are required.' });
    }


    // Fetch the current logo from the database
    db.query(
        'UPDATE employees SET branch_id = ? WHERE id = ? and company_id=?',
        [branchId, employeeId, decodedUserData.company_id],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to edit company.',
                    error: err.message
                });
            }
            return res.status(200).json({
                status: true,
                message: 'Branch Update successfully.'
            });
        }
    );
});



// Export the router
module.exports = router;
