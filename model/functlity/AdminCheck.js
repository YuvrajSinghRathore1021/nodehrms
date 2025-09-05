const db = require('../../DB/ConnectionSql');
const express = require('express');

function AdminCheck(id, company_id) {
    return new Promise((resolve, reject) => {

        const query = `SELECT type FROM employees WHERE company_id = ? AND id = ? AND (type = 'Admin' OR type = 'ceo' OR type = 'HR' Or type='Company_Admin')`;
        const queryParams = [company_id, id];
        db.query(query, queryParams, (err, results) => {
            if (err) {
                reject(err);
            }
            if (results.length === 0) {
                resolve(false);
            } else {
                resolve(true);
            }
        });

    });
}


function AdminCheck1() {
    return true;
}

function RmIdCheck(id, company_id) {
    return new Promise((resolve, reject) => {

        const query = `SELECT reporting_manager FROM employees WHERE company_id = ? AND id = ? `;
        const queryParams = [company_id, id];
        db.query(query, queryParams, (err, results) => {
            if (err) {
                reject(err);
            }
            // results=[ ]

            if (results?.length === 0) {
                resolve(true);
            } else {
                resolve(true);
            }
        });
    });
}

module.exports = {
    AdminCheck, AdminCheck1, RmIdCheck
};
