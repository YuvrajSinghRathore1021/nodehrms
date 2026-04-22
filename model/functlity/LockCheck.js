// const db = require('../../DB/ConnectionSql');
// const express = require('express');

// function LockCheck(id, company_id, type = "") {
//     ////type :-attendance_approval,attendance_request,leave_request,leave_approval,is_locked

//     return new Promise((resolve, reject) => {
//         const query = `
// SELECT id, company_id, employee_id, rule_name, employee_ids, lock_type, lock_day, lock_month, fix_date, 
// attendance_approval, attendance_request, leave_request, leave_approval, is_locked, created_at, updated_at
// FROM locks WHERE company_id=? and employee_ids in (?)
// `;
//         const queryParams = [company_id, id];
//         db.query(query, queryParams, (err, results) => {
//             if (err) {
//                 reject(err);
//             }
//             if (results.length === 0) {
//                 resolve(false);
//             } else {
//                 resolve(true);
//             }
//         });
//     });
// }
// module.exports = { LockCheck };




const db = require('../../DB/ConnectionSql');

function LockCheck(employee_id, company_id, type = "") {
    return new Promise((resolve, reject) => {
 
        // // // type :-attendance_approval,attendance_request,leave_request,leave_approval,is_locked,attendance_convert_lwp

        const query = `SELECT * FROM locks WHERE company_id = ? AND FIND_IN_SET(?, employee_ids)`;

        db.query(query, [company_id, employee_id], (err, results) => {
            if (err) return reject(err);

            if (results.length === 0) {
                return resolve(false);
            }

            const now = new Date();
            const currentDay = now.getDate();          // 1–31
            const currentMonth = now.getMonth() + 1;   // 1–12
            const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

            let isLocked = false;

            for (let lock of results) {

                // ✅ Type-based check
                if (type && lock[type] !== undefined && lock[type] != 1) {
                    continue;
                }

                // ✅ Global lock
                if (lock.is_locked == 1) {
                    isLocked = true;
                }

                // ✅ Lock by day
                if (lock.lock_day && lock.lock_day == currentDay) {
                    isLocked = true;
                }

                // ✅ Lock by month
                if (lock.lock_month && lock.lock_month == currentMonth) {
                    isLocked = true;
                }

                // ✅ Fixed date lock
                if (lock.fix_date && lock.fix_date == currentDate) {
                    isLocked = true;
                }

                if (isLocked) break;

            }

            resolve(isLocked);
        });
    });
}

module.exports = { LockCheck };