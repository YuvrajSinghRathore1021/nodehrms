const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const multer = require('multer');
const fs = require('fs');
const path = require('path')
const { AdminCheck } = require('../../model/functlity/AdminCheck');


// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/icons/'); // Make sure this folder exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        cb(null, true); // accept all files
    }
});

router.post('/api/add', async (req, res) => {
    const { title, url, parent_id, is_admin_view, sort_order, is_active, userData, icon } = req.body;



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
    let iconPath = icon || null;


    const query = `
        INSERT INTO menus (title,is_admin_view, url, icon, parent_id, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?,?)
    `;

    db.query(query, [title, is_admin_view, url, iconPath, parent_id || 0, sort_order || 0, is_active], (err, result) => {
        if (err) return res.status(500).json({ status: false, error: err });
        res.json({ status: true, message: 'Menu added successfully', menu_id: result.insertId });
    });
});




router.post('/api/getUrl', async (req, res) => {
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
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);


    const employee_id = decodedUserData.id;

    let query = `
    SELECT id, title, url, icon, parent_id
    FROM menus 
    WHERE is_active = 1 
    AND id NOT IN (
        SELECT menu_id FROM employee_menu_restrictions WHERE employee_id = ? AND company_id = ?
    )
`;

    if (isAdmin) {
        query += ` AND (is_admin_view = 0 OR is_admin_view = 1)`;
    } else {
        query += ` AND is_admin_view = 0`;
    }

    query += ` ORDER BY sort_order ASC`;

    db.query(query, [employee_id, decodedUserData.company_id], (err, menus) => {
        if (err) return res.status(500).json({ status: false, error: err });

        const menuMap = {};
        const parentMenus = [];
        const validUrls = [];

        // Group menus
        menus.forEach(menu => {
            if (!menu.parent_id) {
                menuMap[menu.id] = {
                    title: menu.title,
                    iName: menu.icon,
                    links: []
                };
                parentMenus.push(menu.id);
            } else {
                validUrls.push(menu.url?.replace("/", ""));
                if (menuMap[menu.parent_id]) {
                    menuMap[menu.parent_id].links.push({
                        to: menu.url,
                        icon: menu.icon,
                        label: menu.title
                    });
                }
            }
        });

        // Final structured menu array
        const structuredMenus = Object.values(menuMap);

        res.json({
            status: true,
            data: structuredMenus,
            ValidUrl: validUrls,
            // adminCheck: decodedUserData.role === 'is_admin_view' || decodedUserData.is_admin === true
            adminCheck: isAdmin
        });
    });
});


// router.post('/api/menulist', async (req, res) => {
//     const { userData } = req.body;
//     let decodedUserData = null;

//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }

//     if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//         return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//     }
//     const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);


//     const employee_id = decodedUserData.id;

//     let query = `
//     SELECT id, title, url, icon, parent_id
//     FROM menus 
//     WHERE is_active = 1 and (parent_id ='' OR parent_id =0)

// `;

//     db.query(query,  (err, menus) => {
//         if (err) return res.status(500).json({ status: false, error: err });



//         res.json({
//             status: true,
//             data: menus
//         });
//     });
// });

router.post('/api/menu/restrict', async (req, res) => {
    const { userData, menu_id } = req.body;
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
    let employee_id = decodedUserData.id;
    const query = `
        INSERT INTO employee_menu_restrictions (employee_id,company_id, menu_id)
        VALUES (?, ?)
    `;

    db.query(query, [employee_id, decodedUserData.company_id, menu_id], (err) => {
        if (err) return res.status(500).json({ status: false, error: err });
        res.json({ status: true, message: 'Menu access restricted for employee' });
    });
});

router.post('/api/menu/unrestrict', async (req, res) => {
    const { employee_id, menu_id, userData } = req.body;
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
    const query = `
        DELETE FROM employee_menu_restrictions 
        WHERE employee_id = ? AND menu_id = ?
    `;

    db.query(query, [employee_id, menu_id], (err) => {
        if (err) return res.status(500).json({ status: false, error: err });
        res.json({ status: true, message: 'Menu restriction removed for employee' });
    });
});

router.post('/api/update', async (req, res) => {
    const { id, title, url, is_admin_view, parent_id, sort_order, is_active, userData ,icon} = req.body;


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

    let iconPath = req.body.icon; // default from body (in case no new file uploaded)
    if (icon !="") {
        iconPath =icon; 
    }

    const query = `
        UPDATE menus
        SET title = ?, url = ?,is_admin_view=?, icon = ?, parent_id = ?, sort_order = ?, is_active = ?
        WHERE id = ?
    `;

    db.query(query, [title, url, is_admin_view, iconPath, parent_id || null, sort_order || 0, is_active, id], (err) => {
        if (err) return res.status(500).json({ status: false, error: err });
        res.json({ status: true, message: 'Menu updated successfully' });
    });
});




router.post('/api/menu/delete', async (req, res) => {
    const { id, userData } = req.body;
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
    const query = `DELETE FROM menus WHERE id = ?`;

    db.query(query, [id], (err) => {
        if (err) return res.status(500).json({ status: false, error: err });
        res.json({ status: true, message: 'Menu deleted successfully' });
    });
});

router.post('/api/list', async (req, res) => {
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
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);

    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    const limit = parseInt(req.body.limit, 10) || 10;
    const page = parseInt(req.body.page, 10) || 1;
    const offset = (page - 1) * limit;

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    // Build the base query
    let query = `SELECT id, type, title, url, icon, parent_id, sort_order, is_active, is_admin_view, created_at, updated_at FROM menus WHERE 1=1`;

    const queryParams = [];

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Execute query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        // Add serial number (srno) to each result
        const dataWithSrno = results.map((item, index) => ({
            srno: offset + index + 1, // Generate serial number based on offset
            ...item
        }));

        // Get total count of records (for pagination)
        let countQuery = 'SELECT COUNT(id) AS total FROM menus WHERE 1=1';


        db.query(countQuery, (err, countResults) => {
            if (err) {
                console.error('Error counting data records:', err);
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            const total = countResults[0].total;
            res.json({
                status: true,
                data: dataWithSrno,
                total,
                page,
                limit
            });
        });
    });
})


router.post('/api/subMenuAddBulk', async (req, res) => {
    const { sub_pages, userData } = req.body;

    if (!Array.isArray(sub_pages) || sub_pages.length === 0) {
        return res.status(400).json({ status: false, error: 'sub_pages must be a non-empty array' });
    }

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

    const values = sub_pages.map((page) => [
        page.title,
        page.admin || 0,
        page.url,
        null, // icon
        page.parent_id || 0,
        page.sort_order || 0,
        page.is_active === true || page.is_active === 'true' ? 1 : 0,
    ]);

    const query = `
        INSERT INTO menus (title, admin, url, icon, parent_id, sort_order, is_active)
        VALUES ?
    `;

    db.query(query, [values], (err, result) => {
        if (err) return res.status(500).json({ status: false, error: err });
        return res.json({ status: true, message: 'Sub pages added successfully', inserted_count: result.affectedRows });
    });
});




///////addBulk menu
router.post('/api/addBulk', upload.any(), async (req, res) => {
    const { userData } = req.body;
    let menuData = req.body.menuData;

    let decodedUserData = null;
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, error: 'Invalid userData format' });
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    // Parse JSON string if menuData is sent as string
    if (typeof menuData === 'string') {
        try {
            menuData = JSON.parse(menuData);
        } catch (err) {
            return res.status(400).json({ status: false, error: 'Invalid menuData JSON format' });
        }
    }

    const uploadedFiles = {};
    if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
            uploadedFiles[file.originalname] = `/uploads/icons/${file.filename}`;
        });
    }

    const insertMenu = async (menu, parentId = 0) => {
        return new Promise((resolve, reject) => {
            const {
                title,
                url,
                is_admin_view = 0,
                sort_order = 0,
                is_active,
                icon
            } = menu;


            const iconPath = icon && uploadedFiles[icon] ? uploadedFiles[icon] : null;

            const query = `
                INSERT INTO menus (title, is_admin_view, url, icon, parent_id, sort_order, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(query, [title, is_admin_view, url, iconPath, parentId, sort_order, is_active], (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            });
        });
    };

    try {
        for (const menu of menuData) {
            const parentId = await insertMenu(menu);

            if (menu.sub_pages && Array.isArray(menu.sub_pages)) {
                for (const subMenu of menu.sub_pages) {
                    await insertMenu(subMenu, parentId);
                }
            }
        }

        res.json({ status: true, message: 'Bulk menu and submenus added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, error: 'Internal server error', detail: err });
    }
});



// Helper to save base64 image
const saveBase64Image = (base64String) => {
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const ext = matches[1].split('/')[1].split('+')[0]; // handle svg+xml
    const data = matches[2];
    const fileName = `icon_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const uploadDir = path.join(__dirname, '../../uploads/icons'); // correct absolute path

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true }); // ensure path exists
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return `/uploads/icons/${fileName}`;
};

router.post('/api/addBulkBase64', async (req, res) => {
    const { menu_items } = req.body;


    let menuData;
    try {
        menuData = typeof menu_items === 'string' ? JSON.parse(menu_items) : menu_items;
    } catch (e) {
        return res.status(400).json({ status: false, error: 'Invalid menu_items format' });
    }


    const insertMenu = async (menu, parentId = 0) => {
        return new Promise((resolve, reject) => {
            const {
                title,
                url,
                is_admin_view = 0,
                sort_order = 0,
                is_active = false,
                icon
            } = menu;


            const iconPath = icon?.startsWith('data:') ? saveBase64Image(icon) : null;

            const query = `
                INSERT INTO menus (title, is_admin_view, url, icon, parent_id, sort_order, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(query, [title, is_admin_view, url, iconPath, parentId, sort_order, is_active], (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            });
        });
    };

    try {
        for (const menu of menuData) {
            const parentId = await insertMenu(menu);

            if (Array.isArray(menu.sub_pages)) {
                for (const subMenu of menu.sub_pages) {
                    await insertMenu(subMenu, parentId);
                }
            }
        }

        res.json({ status: true, message: 'Bulk menu and submenus added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, error: 'Internal server error', detail: err });
    }
});




router.post('/api/getMenuUrl', async (req, res) => {
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
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);


    const employee_id = decodedUserData.id;

    let query = `
    SELECT id, title, url, icon, parent_id,is_active,sort_order
    FROM menus 
    WHERE 1=1
    
`;

    // if (isAdmin) {
    //     query += ` AND (is_admin_view = 0 OR is_admin_view = 1)`;
    // } else {
    //     query += ` AND is_admin_view = 0`;
    // }

    query += ` ORDER BY id ASC`;

    db.query(query, [employee_id, decodedUserData.company_id], (err, menus) => {
        if (err) return res.status(500).json({ status: false, error: err });

        const menuMap = {};
        const parentMenus = [];

        // Group menus
        menus.forEach(menu => {
            if (!menu.parent_id) {
                menuMap[menu.id] = {
                    id: menu.id,
                    url: menu.url,
                    icon: menu.icon,
                    title: menu.title,
                    parent_id: menu.parent_id,
                    is_active: menu.is_active,
                    sort_order: menu.sort_order,
                    sub_pages: []
                };
                parentMenus.push(menu.id);
            } else {

                if (menuMap[menu.parent_id]) {
                    menuMap[menu.parent_id].sub_pages.push({
                        id: menu.id,
                        url: menu.url,
                        icon: menu.icon,
                        title: menu.title,
                        parent_id: menu.parent_id,
                        is_active: menu.is_active,
                        sort_order: menu.sort_order


                    });
                }
            }
        });

        // Final structured menu array
        const structuredMenus = Object.values(menuMap);

        res.json({
            status: true,
            data: structuredMenus,
            adminCheck: isAdmin
        });
    });
});
module.exports = router;
