// HomeApi.js 

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// Create a new record (Create)

router.post('/homeApi/Create', (req, res) => {
    const { name, description, price, location } = req.body;

    if (!name || !description) {
        return res.status(400).json({ status: false, message: 'Name and description are required.' });
    }

    db.query('INSERT INTO homes (name, description, price, location) VALUES (?, ?, ?, ?)',

        [name, description, price, location], (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Error creating home.', error: err.message });
            }
            res.status(201).json({ status: true, message: 'Home created successfully.', id: results.insertId, name, description });
        });

});

// Get all records (Read)

router.get('/home', (req, res) => {
    db.query('SELECT * FROM homes', (err, results) => {

        if (err) {
            return res.status(500).json({   status: false,message: 'Error retrieving homes.', error: err.message });
        }

        res.status(200).json({   status: true,message: 'Homes retrieved successfully.', data: results });
    });
});


// Route for getting a single home by ID using POST

router.post('/home/singleData', (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({  status: false, message: 'ID is required.' });
    }
    db.query('SELECT * FROM homes WHERE id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({   status: false,message: 'Error retrieving home.', error: err.message });
        }
        if (results.length == 0) {
            return res.status(404).json({  status: false, message: 'Data not found.' });
        }
        res.status(200).json({  status: true, message: 'Data retrieved successfully.', data: results[0] });
    });
});


// Update a specific record by ID (Update)
router.put('/home/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, price, location } = req.body;
    db.query('UPDATE homes SET name = ?, description = ?, price = ?, location = ? WHERE id = ?',
        [name, description, price, location, id], (err, results) => {
            if (err) {
                return res.status(500).json({  status: false, message: 'Error updating home.', error: err.message });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({  status: false, message: 'Home not found or no changes made.' });
            }
            res.status(200).json({  status: true, message: 'Home updated successfully.' });
        });
});


// Delete a specific record by ID (Delete)
router.delete('/home/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM homes WHERE id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({  status: false, message: 'Error deleting home.', error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({   status: false,message: 'Home not found.' });
        }
        res.status(200).json({  status: true, message: 'Home deleted successfully.' });
    });
});


// Export the router
module.exports = router;
