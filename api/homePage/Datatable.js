
const express = require('express');
const router = express.Router();
const customers = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    name: `Customer ${index + 1}`,
    country: { name: index % 2 === 0 ? 'USA' : 'Canada' },
    company: `Company ${index + 1}`,
    representative: { name: `Rep ${index + 1}` },
}));

// Endpoint for fetching customers with pagination
router.get('/customers', (req, res) => {
    const page = parseInt(req.query.page) || 0; // Get current page
    const limit = parseInt(req.query.limit) || 5; // Get limit per page
    const startIndex = page * limit; // Calculate start index
    const endIndex = startIndex + limit; // Calculate end index

    const paginatedCustomers = customers.slice(startIndex, endIndex); // Slice the array for pagination
    const total = customers.length; // Total number of records

    res.json({
        status: true,
        items: paginatedCustomers,
        total: total,
    });
});
module.exports = router;