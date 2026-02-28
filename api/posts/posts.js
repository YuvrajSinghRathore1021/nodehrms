// const express = require('express');
// const router = express.Router();
// const db = require('../../DB/ConnectionSql');
// const decodeUserData = require("../../model/decodeUserData");

// // ==================== ROUTES ====================

// // GET all posts with filters
// router.get('/posts', async (req, res) => {

//     try {
//         const { userData, category, company, search, priority, pinned, page = 1, limit = 10,
//             sortBy = 'pinned DESC, published_date DESC' } = req.query;

//         let decodedUserData = null;
//         if (userData) {
//             decodedUserData = decodeUserData(userData);
//             if (!decodedUserData) {
//                 return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
//             }
//         }
//         if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//             return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
//         }

//         let query = `
//             SELECT 
//                 p.*,
//                 c.id as category_id,
//                 c.label as category_label,
//                 c.color as category_color,
//                 c.icon as category_icon,
//                 c.light_bg as category_light_bg,
//                 comp.company_name
//             FROM posts p
//             JOIN categories c ON p.category_id = c.id
//             JOIN companies comp ON p.company_id = comp.id
//             WHERE 1=1
//         `;

//         const params = [];

//         if (category && category !== 'all') {
//             query += ' AND p.category_id = ?';
//             params.push(category);
//         }

//         if (company && company !== 'All Companies') {
//             query += ' AND (comp.company_name = ? OR comp.company_name = "All Companies")';
//             params.push(company);
//         }

//         if (priority) {
//             query += ' AND p.priority = ?';
//             params.push(priority);
//         }

//         if (pinned !== undefined) {
//             query += ' AND p.pinned = ?';
//             params.push(pinned === 'true');
//         }

//         if (search) {
//             query += ' AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)';
//             const searchTerm = `%${search}%`;
//             params.push(searchTerm, searchTerm, searchTerm);
//         }
//         if (decodedUserData?.company_id != 6) {
//             query += ' AND p.company_id = ?';
//             params.push(decodedUserData?.company_id);
//         }

//         // Get total count for pagination
//         const countQuery = query.replace(
//             /SELECT[\s\S]*?FROM/,
//             'SELECT COUNT(*) as total FROM'
//         );
//         const [countResult] = await db.promise().query(countQuery, params);
//         const total = countResult[0].total;

//         // Add pagination
//         const offset = (page - 1) * limit;
//         query += ` ORDER BY ${sortBy} LIMIT ? OFFSET ?`;
//         params.push(parseInt(limit), parseInt(offset));

//         const [rows] = await db.promise().query(query, params);

//         // Format posts to match frontend structure
//         const posts = rows.map(row => ({
//             id: row.id,
//             category: row.category_id,
//             title: row.title,
//             excerpt: row.excerpt,
//             content: row.content,
//             company: row.company_name,
//             author: row.author,
//             date: new Date(row.published_date).toLocaleDateString('en-US', {
//                 month: 'short',
//                 day: 'numeric',
//                 year: 'numeric'
//             }),
//             pinned: Boolean(row.pinned),
//             views: row.views,
//             priority: row.priority,
//             // Additional metadata for UI
//             categoryMeta: {
//                 label: row.category_label,
//                 color: row.category_color,
//                 icon: row.category_icon,
//                 light: row.category_light_bg
//             }
//         }));

//         res.json({
//             status: 1,
//             posts,
//             pagination: {
//                 total,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 totalPages: Math.ceil(total / limit)
//             }
//         });

//     } catch (error) {
//         console.error('Error fetching posts:', error);
//         res.status(500).json({ error: 'Failed to fetch posts' });
//     }
// });

// // GET single post by ID
// router.get('/posts/:id', async (req, res) => {
//     try {
//         const [rows] = await db.promise().query(`
//             SELECT 
//                 p.*,
//                 c.id as category_id,
//                 c.label as category_label,
//                 c.color as category_color,
//                 c.icon as category_icon,
//                 c.light_bg as category_light_bg,
//                 comp.company_name 
//             FROM posts p
//             JOIN categories c ON p.category_id = c.id
//             JOIN companies comp ON p.company_id = comp.id
//             WHERE p.id = ?
//         `, [req.params.id]);

//         if (rows.length === 0) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         const row = rows[0];

//         // Increment view count
//         await db.promise().query(
//             'UPDATE posts SET views = views + 1 WHERE id = ?',
//             [req.params.id]
//         );

//         // Track view for analytics
//         await db.promise().query(
//             'INSERT INTO post_views (post_id, viewer_ip, user_agent) VALUES (?, ?, ?)',
//             [req.params.id, req.ip, req.headers['user-agent']]
//         );

//         const post = {
//             id: row.id,
//             category: row.category_id,
//             title: row.title,
//             excerpt: row.excerpt,
//             content: row.content,
//             company: row.company_name,
//             author: row.author,
//             date: new Date(row.published_date).toLocaleDateString('en-US', {
//                 month: 'short',
//                 day: 'numeric',
//                 year: 'numeric'
//             }),
//             pinned: Boolean(row.pinned),
//             views: row.views + 1,
//             priority: row.priority,
//             categoryMeta: {
//                 label: row.category_label,
//                 color: row.category_color,
//                 icon: row.category_icon,
//                 light: row.category_light_bg
//             }
//         };

//         res.json({ status: 1, post });

//     } catch (error) {
//         console.error('Error fetching post:', error);
//         res.status(500).json({ error: 'Failed to fetch post' });
//     }
// });

// // CREATE new post
// router.post('/posts', async (req, res) => {
//     try {
//         const {
//             title,
//             excerpt,
//             content,
//             category,
//             company,
//             author,
//             priority = 'medium',
//             pinned = false,
//             image,        // single image path
//             images
//         } = req.body;

//         // Validation
//         if (!title || !excerpt || !content || !category || !company || !author) {
//             return res.status(400).json({ error: 'Missing required fields' });
//         }

//         // Get company ID
//         const [companyRows] = await db.promise().query(
//             'SELECT id FROM companies WHERE company_name = ?',
//             [company]
//         );

//         if (companyRows.length === 0) {
//             return res.status(400).json({ error: 'Invalid company' });
//         }

//         const companyId = companyRows[0].id;

//         // Insert post
//         const [result] = await db.promise().query(`
//             INSERT INTO posts 
//             (title, excerpt, content, category_id, company_id, author, priority, pinned, published_date)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
//         `, [title, excerpt, content, category, companyId, author, priority, pinned]);

//         res.status(201).json({
//             status: 1,
//             id: result.insertId,
//             message: 'Post created successfully'
//         });

//     } catch (error) {
//         console.error('Error creating post:', error);
//         res.status(500).json({ error: 'Failed to create post' });
//     }
// });

// // UPDATE post
// router.post('/posts/:id', async (req, res) => {
//     try {
//         const {
//             title,
//             excerpt,
//             content,
//             category,
//             company,
//             author,
//             priority,
//             pinned,
//             image,        // single image path
//             images
//         } = req.body;

//         // Get company ID
//         const [companyRows] = await db.promise().query(
//             'SELECT id FROM companies WHERE company_name = ?',
//             [company]
//         );

//         if (companyRows.length === 0) {
//             return res.status(400).json({ error: 'Invalid company' });
//         }

//         const companyId = companyRows[0].id;

//         const [result] = await db.promise().query(`
//             UPDATE posts 
//             SET title = ?, excerpt = ?, content = ?, category_id = ?, 
//                 company_id = ?, author = ?, priority = ?, pinned = ?
//             WHERE id = ?
//         `, [title, excerpt, content, category, companyId, author, priority, pinned, req.params.id]);

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         res.json({ status: 1, message: 'Post updated successfully' });

//     } catch (error) {
//         console.error('Error updating post:', error);
//         res.status(500).json({ error: 'Failed to update post' });
//     }
// });

// // DELETE post
// router.post('/posts/delete/:id', async (req, res) => {
//     try {
//         const [result] = await db.promise().query(
//             'DELETE FROM posts WHERE id = ?',
//             [req.params.id]
//         );

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         res.json({ status: 1, message: 'Post deleted successfully' });

//     } catch (error) {
//         console.error('Error deleting post:', error);
//         res.status(500).json({ error: 'Failed to delete post' });
//     }
// });

// // GET all companies
// router.get('/companies', async (req, res) => {
//     try {
//         const { userData } = req.query;
//         let decodedUserData = null;
//         if (userData) {
//             decodedUserData = decodeUserData(userData);
//             if (!decodedUserData) {
//                 return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
//             }
//         }
//         if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//             return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
//         }
//         const [rows] = await db.promise().query('SELECT company_name as name FROM companies');
//         if (decodedUserData?.company_id != 6) {
//             query += ' company_id = ?';
//             params.push(decodedUserData?.company_id);
//         }
//         res.json(rows.map(r => r.name));
//     } catch (error) {
//         console.error('Error fetching companies:', error);
//         res.status(500).json({ error: 'Failed to fetch companies' });
//     }
// });

// // GET dashboard stats
// router.get('/stats', async (req, res) => {
//     try {
//         const [totalPosts] = await db.promise().query('SELECT COUNT(*) as count FROM posts');
//         const [pinnedPosts] = await db.promise().query('SELECT COUNT(*) as count FROM posts WHERE pinned = 1');
//         const [highPriority] = await db.promise().query('SELECT COUNT(*) as count FROM posts WHERE priority = "high"');
//         const [totalCompanies] = await db.promise().query('SELECT COUNT(*) as count FROM companies WHERE company_name != "All Companies"');

//         const [viewsToday] = await db.promise().query(`
//             SELECT COUNT(*) as count FROM post_views 
//             WHERE DATE(viewed_at) = CURDATE()
//         `);

//         const [popularPosts] = await db.promise().query(`
//             SELECT p.id, p.title, COUNT(pv.id) as view_count
//             FROM posts p
//             LEFT JOIN post_views pv ON p.id = pv.post_id
//             GROUP BY p.id
//             ORDER BY view_count DESC
//             LIMIT 5
//         `);

//         res.json({
//             status: 1,
//             totalPosts: totalPosts[0].count,
//             pinnedPosts: pinnedPosts[0].count,
//             highPriority: highPriority[0].count,
//             totalCompanies: totalCompanies[0].count,
//             viewsToday: viewsToday[0].count,
//             popularPosts
//         });

//     } catch (error) {
//         console.error('Error fetching stats:', error);
//         res.status(500).json({ error: 'Failed to fetch stats' });
//     }
// });


// // Export the router
// module.exports = router;







const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const decodeUserData = require("../../model/decodeUserData");

// ==================== ROUTES ====================

// GET all posts with filters
router.get('/posts', async (req, res) => {
    try {
        const { userData, category, company, search, priority, pinned, page = 1, limit = 10,
            sortBy = 'pinned DESC, published_date DESC' } = req.query;

        let decodedUserData = null;
        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData) {
                return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
            }
        }
        if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
            return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
        }

        let query = `
            SELECT 
                p.*,
                c.id as category_id,
                c.label as category_label,
                c.color as category_color,
                c.icon as category_icon,
                c.light_bg as category_light_bg,
                comp.company_name
            FROM posts p
            JOIN categories c ON p.category_id = c.id
            JOIN companies comp ON p.company_id = comp.id
            WHERE 1=1
        `;

        const params = [];

        if (category && category !== 'all') {
            query += ' AND p.category_id = ?';
            params.push(category);
        }

        if (company && company !== 'All Companies') {
            query += ' AND (comp.company_name = ? OR comp.company_name = "All Companies")';
            params.push(company);
        }

        if (priority) {
            query += ' AND p.priority = ?';
            params.push(priority);
        }

        if (pinned !== undefined) {
            query += ' AND p.pinned = ?';
            params.push(pinned === 'true');
        }

        if (search) {
            query += ' AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (decodedUserData?.company_id != 6) {
            query += ' AND p.company_id = ?';
            params.push(decodedUserData?.company_id);
        }

        // Get total count for pagination
        const countQuery = query.replace(
            /SELECT[\s\S]*?FROM/,
            'SELECT COUNT(*) as total FROM'
        );
        const [countResult] = await db.promise().query(countQuery, params);
        const total = countResult[0].total;

        // Add pagination
        const offset = (page - 1) * limit;
        query += ` ORDER BY ${sortBy} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.promise().query(query, params);

        // Format posts to match frontend structure
        const posts = rows.map(row => ({
            id: row.id,
            category: row.category_id,
            title: row.title,
            excerpt: row.excerpt,
            content: row.content,
            company: row.company_name,
            author: row.author,
            date: new Date(row.published_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            pinned: Boolean(row.pinned),
            views: row.views,
            priority: row.priority,
            // Image fields
            image: row.featured_image, // single featured image (for announcements)
            images: row.gallery_images ? JSON.parse(row.gallery_images) : [], // multiple gallery images
            // Additional metadata for UI
            categoryMeta: {
                label: row.category_label,
                color: row.category_color,
                icon: row.category_icon,
                light: row.category_light_bg
            }
        }));

        res.json({
            status: 1,
            posts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// GET single post by ID
router.get('/posts/:id', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                p.*,
                c.id as category_id,
                c.label as category_label,
                c.color as category_color,
                c.icon as category_icon,
                c.light_bg as category_light_bg,
                comp.company_name 
            FROM posts p
            JOIN categories c ON p.category_id = c.id
            JOIN companies comp ON p.company_id = comp.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const row = rows[0];

        // Increment view count
        await db.promise().query(
            'UPDATE posts SET views = views + 1 WHERE id = ?',
            [req.params.id]
        );

        // Track view for analytics
        await db.promise().query(
            'INSERT INTO post_views (post_id, viewer_ip, user_agent) VALUES (?, ?, ?)',
            [req.params.id, req.ip, req.headers['user-agent']]
        );

        const post = {
            id: row.id,
            category: row.category_id,
            title: row.title,
            excerpt: row.excerpt,
            content: row.content,
            company: row.company_name,
            author: row.author,
            date: new Date(row.published_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            pinned: Boolean(row.pinned),
            views: row.views + 1,
            priority: row.priority,
            // Image fields
            image: row.featured_image, // single featured image
            images: row.gallery_images ? JSON.parse(row.gallery_images) : [], // multiple gallery images
            categoryMeta: {
                label: row.category_label,
                color: row.category_color,
                icon: row.category_icon,
                light: row.category_light_bg
            }
        };

        res.json({ status: 1, post });

    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// CREATE new post
router.post('/posts', async (req, res) => {
    try {
        const {
            title,
            excerpt,
            content,
            category,
            company,
            author,
            priority = 'medium',
            pinned = false,
            image,        // single featured image path
            images        // array of gallery images
        } = req.body;

        // Validation
        if (!title || !excerpt || !content || !category || !company || !author) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate announcement has image
        if (category === 'announcement' && !image) {
            return res.status(400).json({ 
                error: 'Announcements require a featured image',
                message: 'Please upload a featured image for this announcement'
            });
        }

        // Get company ID
        const [companyRows] = await db.promise().query(
            'SELECT id FROM companies WHERE company_name = ?',
            [company]
        );

        if (companyRows.length === 0) {
            return res.status(400).json({ error: 'Invalid company' });
        }

        const companyId = companyRows[0].id;

        // Convert images array to JSON string if it exists
        const galleryImagesJson = images && images.length > 0 ? JSON.stringify(images) : null;

        // Insert post with image fields
        const [result] = await db.promise().query(`
            INSERT INTO posts 
            (title, excerpt, content, category_id, company_id, author, priority, pinned, 
             featured_image, gallery_images, published_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
        `, [title, excerpt, content, category, companyId, author, priority, pinned, 
            image || null, galleryImagesJson]);

        res.status(201).json({
            status: 1,
            id: result.insertId,
            message: 'Post created successfully'
        });

    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// UPDATE post
router.post('/posts/:id', async (req, res) => {
    try {
        const {
            title,
            excerpt,
            content,
            category,
            company,
            author,
            priority,
            pinned,
            image,        // single featured image path
            images        // array of gallery images
        } = req.body;

        // Get company ID
        const [companyRows] = await db.promise().query(
            'SELECT id FROM companies WHERE company_name = ?',
            [company]
        );

        if (companyRows.length === 0) {
            return res.status(400).json({ error: 'Invalid company' });
        }

        const companyId = companyRows[0].id;

        // Validate announcement has image
        if (category === 'announcement' && !image) {
            return res.status(400).json({ 
                error: 'Announcements require a featured image',
                message: 'Please upload a featured image for this announcement'
            });
        }

        // Convert images array to JSON string if it exists
        const galleryImagesJson = images && images.length > 0 ? JSON.stringify(images) : null;

        const [result] = await db.promise().query(`
            UPDATE posts 
            SET title = ?, excerpt = ?, content = ?, category_id = ?, 
                company_id = ?, author = ?, priority = ?, pinned = ?,
                featured_image = ?, gallery_images = ?
            WHERE id = ?
        `, [title, excerpt, content, category, companyId, author, priority, pinned, 
            image || null, galleryImagesJson, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ status: 1, message: 'Post updated successfully' });

    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// DELETE post
router.post('/posts/delete/:id', async (req, res) => {
    try {
        const [result] = await db.promise().query(
            'DELETE FROM posts WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ status: 1, message: 'Post deleted successfully' });

    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// GET all companies
router.get('/companies', async (req, res) => {
    try {
        const { userData } = req.query;
        let decodedUserData = null;
        
        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData) {
                return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
            }
        }
        
        if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
            return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
        }

        let query = 'SELECT company_name as name FROM companies';
        const params = [];

        if (decodedUserData?.company_id != 6) {
            query += ' WHERE id = ?';
            params.push(decodedUserData?.company_id);
        }

        const [rows] = await db.promise().query(query, params);
        res.json(rows.map(r => r.name));
        
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// GET dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [totalPosts] = await db.promise().query('SELECT COUNT(*) as count FROM posts');
        const [pinnedPosts] = await db.promise().query('SELECT COUNT(*) as count FROM posts WHERE pinned = 1');
        const [highPriority] = await db.promise().query('SELECT COUNT(*) as count FROM posts WHERE priority = "high"');
        const [totalCompanies] = await db.promise().query('SELECT COUNT(*) as count FROM companies WHERE company_name != "All Companies"');
        
        // Posts with images stats
        const [postsWithImages] = await db.promise().query(
            'SELECT COUNT(*) as count FROM posts WHERE featured_image IS NOT NULL'
        );
        
        const [totalGalleryImages] = await db.promise().query(`
            SELECT SUM(JSON_LENGTH(gallery_images)) as total 
            FROM posts 
            WHERE gallery_images IS NOT NULL
        `);

        const [viewsToday] = await db.promise().query(`
            SELECT COUNT(*) as count FROM post_views 
            WHERE DATE(viewed_at) = CURDATE()
        `);

        const [popularPosts] = await db.promise().query(`
            SELECT p.id, p.title, COUNT(pv.id) as view_count
            FROM posts p
            LEFT JOIN post_views pv ON p.id = pv.post_id
            GROUP BY p.id
            ORDER BY view_count DESC
            LIMIT 5
        `);

        res.json({
            status: 1,
            totalPosts: totalPosts[0].count,
            pinnedPosts: pinnedPosts[0].count,
            highPriority: highPriority[0].count,
            totalCompanies: totalCompanies[0].count,
            viewsToday: viewsToday[0].count,
            postsWithImages: postsWithImages[0].count,
            totalImages: (totalGalleryImages[0]?.total || 0) + postsWithImages[0].count,
            popularPosts
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});



// Export the router
module.exports = router;