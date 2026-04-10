// HomeApi.js 

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
// web cheak A  
router.post('/penaltie/submit', async (req, res) => {
    try {
        const { userData, employee_id, month, penaltyCount, penaltyName, penaltyType, penalty_reason, remark, year, type } = req.body;

        let penaltyValue = req.body.penaltyValue;
        if (penaltyValue == '' || penaltyValue == null || penaltyValue == undefined) {
            penaltyValue = 0;
        }

        

        if ( !req?.user?.id || !req?.user?.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }

        const Query = `INSERT INTO penalties(employee_id, company_id, type, month, year, penalty_type, penaltie_for, penalty_name, penalty_reason, penalty_count, penalty_amount, issued_by,  remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        const QueryArray = [req?.user?.id, req?.user?.company_id, type, month, year, penaltyType, employee_id, penaltyName, penalty_reason, penaltyCount, penaltyValue, req?.user?.id, remark];

        db.query(Query, QueryArray, (err, Result) => {

            if (err) {
                console.error('Error checking for duplicate salary details:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to check duplicate salary details.',
                });
            }

            return res.status(200).json({
                status: true,
                message: 'successfully submitted',
                data: Result,
            });

        })
    } catch (error) {
        console.error('Error processing salary submission:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to process salary submission.',
        });
    }
});
// app cheak A  / web cheak A
router.post('/penaltie/penaltiesData', async (req, res) => {
    try {
        const { userData, employee_id, month, year, type } = req.body;

        // SalaryDetails

     

        if ( !req?.user?.id || !req?.user?.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }
        let employeeId = employee_id || req?.user?.id;
        let Query = `SELECT penalty_id, employee_id, company_id, type, month, year, penalty_type, penaltie_for, penalty_name,penalty_count, penalty_reason, penalty_date, penalty_amount, issued_by, status, remarks, add_stamp FROM penalties WHERE company_id = ?  AND month = ? AND year = ? And penaltie_for = ?`;
        let QueryArray = [req?.user?.company_id, month, year, employeeId];

        if (type == "SalaryDetails") {
            Query += ' AND status = 2';
        }
        db.query(Query, QueryArray, (err, Result) => {

            if (err) {
                console.error('Error checking for duplicate salary details:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to check duplicate salary details.',
                });
            }

            return res.status(200).json({
                status: true,
                message: 'successfully Fetched',
                data: Result,
            });

        })
    } catch (error) {
        console.error('Error processing salary submission:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to process salary submission.',
        });
    }
});
// web cheak A  
router.post('/penaltie/penaltiesDataUpdate', async (req, res) => {
    try {
        const { userData, penalty_id, status } = req.body;
        

        if ( !req?.user?.id || !req?.user?.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }

        const Query = `UPDATE penalties SET status = ? WHERE penalty_id = ?`;
        const QueryArray = [status, penalty_id];

        db.query(Query, QueryArray, (err, Result) => {
            if (err) {
                console.error('Error checking for duplicate salary details:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to check duplicate salary details.',
                });
            }
            return res.status(200).json({
                status: true,
                message: 'successfully submitted',
                data: Result,
            });

        })
    } catch (error) {
        console.error('Error processing salary submission:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to process salary submission.',
        });
    }
});


module.exports = router;


