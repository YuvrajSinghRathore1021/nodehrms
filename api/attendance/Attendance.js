const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// app cheak A / web cheak A
router.post('/AttendanceGet', (req, res) => {
    const { userData } = req.body;
    let decodedUserData;

    try {
        if (!userData) throw new Error("Missing userData");
        decodedUserData = JSON.parse(Buffer.from(userData, 'base64').toString('utf-8'));
    } catch (error) {
        return res.status(400).json({ status: false, error: 'Invalid userData' });
    }

    const { company_id, id: employee_id } = decodedUserData || {};
    if (!company_id || !employee_id) {
        return res.status(400).json({ status: false, error: 'company_id, id are required' });
    }

    const sql = `
        SELECT a.attendance_id, a.check_in_time, a.created, a.check_out_time, a.duration, bl.start_time AS Breakstart_time, bl.end_time AS Breakend_time
        FROM attendance a
        LEFT JOIN (SELECT * FROM break_logs WHERE (end_time IS NULL OR end_time = '00:00:00') ORDER BY break_id DESC LIMIT 1
        ) bl ON bl.attendance_id = a.attendance_id WHERE a.employee_id = ? AND a.attendance_date = CURDATE() LIMIT 1
    `;

    db.query(sql, [employee_id], (err, results) => {
        if (err) {
            return res.status(500).json({ status: false, message: 'Database error.', error: err });
        }

        if (results.length == 0) {
            return res.status(200).json({ status: false, message: 'No check-in record found for today.' });
        }

        const record = results[0];
        return res.status(200).json({
            status: true,
            message: 'Check-in time retrieved successfully.',
            attendance_id: record.attendance_id,
            InTime: record.created,
            check_in_time: record.check_in_time,
            check_out_time: record.check_out_time,
            duration: record.duration,
            Breakstart_time: record.Breakstart_time || '',
            Breakend_time: (record.Breakend_time && record.Breakend_time !== '00:00:00') ? record.Breakend_time : ''
        });
    });
});


// Helper function to determine work week status
function getWorkWeekStatus(workWeekResults, date) {
    if (!workWeekResults || workWeekResults.length == 0) {
        return null;
    }
    const dayOfWeek = new Date(date).getDay(); // 0 (Sunday) - 6 (Saturday)
    const workWeek = workWeekResults[0];
    const workWeekStatusMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const statusKey = `${workWeekStatusMap[dayOfWeek]}1`;
    return workWeek && workWeek[statusKey] == 3 ? 'WO' : null;
}



const handleCheck = async (data) => {
    if (!data?.attendance_id) return null;
    const attendance_id = data.attendance_id;
    const [rows] = await db.promise().query(
        `SELECT 
            al.id,
            al.attendance_id,
            al.attendance_date,
            al.leave_rule_id,
            l.leave_type
        FROM attendance_leave_conversions al
        INNER JOIN leave_rules l ON l.id = al.leave_rule_id
        WHERE al.attendance_id = ?
        LIMIT 1`,
        [attendance_id]
    );

    // ✅ If converted to leave
    if (rows.length > 0) {
        return rows[0].leave_type; // CL / SL / LWP etc
    }

    // ❌ No conversion found
    return null;
};




const decodeUserData = (userData) => {
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        return JSON.parse(decodedString);
    } catch (error) {
        return null;
    }
};

// Helper function to check if a date is in the past or today
const isDateBeforeOrEqualToday = (date) => {
    const today = new Date();
    const inputDate = new Date(date);
    return inputDate <= today;
};

// Helper function to check if start date is before or equal to end date
const isStartDateBeforeOrEqualEndDate = (startDate, endDate) => {
    return new Date(startDate) <= new Date(endDate);
};

// Helper function to check if the difference between dates is within 31 days
const isDateRangeValid = (startDate, endDate) => {
    const diffTime = new Date(endDate) - new Date(startDate);
    return diffTime <= 31 * 24 * 60 * 60 * 1000; // 31 days in milliseconds
};

// app cheak A / web cheak A
router.post('/api/data', async (req, res) => {
    try {
        const { userData, data } = req.body;
        let { startDate, endDate, UserId } = req.body;
        const limit = parseInt(req.body.limit, 10) || 10;
        const page = parseInt(req.body.page, 10) || 1;

        // Step 1: Decode user data
        let decodedUserData = userData ? decodeUserData(userData) : null;
        if (!decodedUserData || !decodedUserData.id) {
            return res.status(400).json({ status: false, message: 'Invalid or missing user data' });
        }

        const EmployeeId = UserId || decodedUserData.id;

        // Step 2: Validate date range
        startDate = startDate ? new Date(startDate) : new Date();
        endDate = endDate ? new Date(endDate) : new Date();

        if (!isDateBeforeOrEqualToday(endDate)) {
            return res.status(400).json({ status: false, message: 'End date cannot be greater than today.' });
        }
        if (!isStartDateBeforeOrEqualEndDate(startDate, endDate)) {
            return res.status(400).json({ status: false, message: 'Start date must be before or equal to end date.' });
        }
        if (!isDateRangeValid(startDate, endDate)) {
            return res.status(400).json({ status: false, message: 'Date range cannot exceed 31 days.' });
        }

        // Step 3: Generate list of dates
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Step 4: Fetch Work Week Configuration
        const [workWeekData] = await db.promise().query(
            `SELECT * FROM work_week WHERE id = (
                SELECT work_week_id FROM employees WHERE employee_status=1 AND status=1 AND delete_status=0 
                AND id = ? AND company_id = ?
            )`,
            [EmployeeId, decodedUserData.company_id]
        );
        const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
        const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        // Step 5: Fetch Leaves
        const [leaveResultsRequest] = await db.promise().query(
            `SELECT employee_id, start_date, end_date, start_half, end_half
             FROM leaves WHERE deletestatus=0 AND status=1 AND admin_status=1 
             AND company_id=? AND employee_id=?`,
            [decodedUserData.company_id, EmployeeId]
        );

        // Step 6: Paginate Dates
        const startIndex = (page - 1) * limit;
        const paginatedDates = dates.slice(startIndex, startIndex + limit);

        // Step 7: Fetch Attendance Data
        const allData = [];
        for (let date of paginatedDates) {
            const dayOfWeek = new Date(date).getDay();
            const weekNumber = Math.ceil(new Date(date).getDate() / 7);
            const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
            let isWeeklyOff = workWeek && workWeek[dayKey] == 3;

            // Default status
            let status = "Absent";
            // Check Leave
            const leaveRecord = leaveResultsRequest.find(leave =>
                date >= leave.start_date.split('T')[0] && date <= leave.end_date.split('T')[0]
            );

            if (leaveRecord) {
                if (leaveRecord.start_date.split('T')[0] == date && leaveRecord.start_half == "Second Half") {
                    // status = "Leave (Afternoon)";
                    status = "Leave";
                } else if (leaveRecord.end_date.split('T')[0] == date && leaveRecord.end_half == "First Half") {
                    // status = "Leave (Forenoon)";
                    status = "Leave";
                } else {
                    status = "Leave";
                }
            } else {
                const holiday = await checkHoliday(decodedUserData.company_id, date);
                if (holiday.length > 0) {
                    status = `Holiday(${holiday[0].holiday})`;
                } else if (isWeeklyOff) {
                    status = 'WO';
                }
            }

            // Fetch Attendance
            let record = await getAttendanceData(decodedUserData.company_id, EmployeeId, date);

            if (record.length > 0) {
                const {
                    id,
                    employee_id,
                    first_name,
                    name,
                    in_ip,
                    out_ip,
                    in_latitude,
                    in_longitude,
                    out_latitude,
                    out_longitude,
                    attendance_id,
                    status,
                    check_in_time,
                    check_out_time,
                    duration,
                    created,
                    attendance_date, profile_image,
                    branch_in_name, branch_out_name
                    , late_coming_leaving, short_leave, short_leave_type, short_leave_reason

                } = record[0];

                allData.push({
                    id,
                    employee_id,
                    first_name,
                    name,
                    in_ip,
                    out_ip,
                    in_latitude,
                    in_longitude,
                    out_latitude,
                    out_longitude,
                    attendance_id,
                    status,
                    check_in_time,
                    check_out_time,
                    duration,
                    created,
                    attendance_date: attendance_date || date,
                    date: attendance_date || date,
                    profile_image,
                    branch_in: branch_in_name,
                    branch_out: branch_out_name,
                    late_coming_leaving, short_leave, short_leave_type, short_leave_reason
                });
            }
            else {
                const employeeInfo = await getEmployeeInfo(decodedUserData.company_id, EmployeeId);
                allData.push(createAttendanceResponse(employeeInfo[0], status, date));
            }
        }

        return res.status(200).json({
            status: true,
            message: 'Data Found',
            attendance: allData,
            total: dates.length,
            page,
            limit
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Database error occurred while fetching attendance details',
            error: err.message || err
        });
    }
});


const getAttendanceData = (companyId, employeeId, date) => {

    return new Promise((resolve, reject) => {
        // db.query('SELECT b.id, CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS first_name,CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS name,b.profile_image,a.in_ip,out_ip,a.in_latitude,a.out_ip, a.in_longitude,a.out_latitude,a.out_longitude, a.attendance_id, a.status, a.check_in_time, a.check_out_time, a.duration, a.created, a.attendance_date FROM employees b LEFT JOIN attendance a ON a.employee_id = b.id WHERE  b.employee_status=1 and b.status=1 and b.delete_status=0 and b.company_id = ? AND b.id = ? AND (a.attendance_date = ? OR a.attendance_date IS NULL)',
        db.query(`SELECT b.id, b.id as employee_id, CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS first_name,CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS name,b.profile_image,a.in_ip,out_ip,a.in_latitude,a.out_ip, a.in_longitude,a.out_latitude,a.out_longitude, a.attendance_id, a.status, a.check_in_time, a.check_out_time, a.duration, a.created, a.attendance_date
            ,bi.name AS branch_in_name,bo.name AS branch_out_name , a.late_coming_leaving, a.short_leave, a.short_leave_type, a.short_leave_reason
            
            FROM employees b LEFT JOIN attendance a ON a.employee_id = b.id
            LEFT JOIN branches AS bi 
    ON a.branch_id_in = bi.id
LEFT JOIN branches AS bo 
    ON a.branch_id_out = bo.id
            WHERE  b.company_id = ? AND b.id = ? AND (a.attendance_date = ? OR a.attendance_date IS NULL)`,
            [companyId, employeeId, date], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
    });
};

const checkHoliday = (companyId, date) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT date, holiday FROM holiday WHERE status = 1 AND company_id = ? AND date = ?',
            [companyId, date], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
    });
};

const getEmployeeInfo = (companyId, employeeId) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT b.id,b.id AS employee_id, CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS first_name,b.profile_image FROM employees b WHERE b.company_id = ? AND b.id = ?',
            [companyId, employeeId], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
    });
};

const createAttendanceResponse = (record, status, date) => {
    return {
        id: record.id,
        employee_id: record.employee_id,
        name: record.first_name,
        first_name: record.first_name,
        profile_image: record.profile_image,
        attendance_id: '0',
        status,
        check_in_time: '00:00',
        check_out_time: '00:00',
        duration: '00:00',
        created: date,
        attendance_date: date,
        date: date,
    };
};

const isAbsentLike = (attendance, leaveRecord) => {
    if (attendance) {
        const st = attendance.status.toLowerCase();
        
        if(st == 'present'){
            return false;
        }else if(st == 'half-day'){
            return false;
        } else if(st == 'absent' || st == 'lwp'){
            return true;
        }
        // return st === 'absent' || st === 'lwp';

    }
    if (leaveRecord) return true;
    return true;
};
// const isAbsentLike = (attendance, leaveRecord) => {

//     // Attendance present
//     if (attendance) {
//         const st = attendance.status.toLowerCase();
//         return st === 'absent' || st === 'lwp';
//     }

//     // Leave exists → only LWP should count
//     if (leaveRecord) {
//         return leaveRecord.leave_type === 'LWP';
//     }

//     // No attendance & no leave ≠ Absent
//     return false;
// };



// web cheak A
router.get('/api/attendance', async (req, res) => {
    const { data, userData, employeeId, departmentId = 0, subDepartmentid = 0, employeeStatus = 1 } = req.query;

    let year = null;
    let month = null;
    let searchData = null;
    let decodedUserData = null;

    if (userData) {
        decodedUserData = decodeUserData(userData);
        if (!decodedUserData) {
            return res.status(200).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
    }

    if (data) {
        year = parseInt(data['Year'], 10) || null;
        month = parseInt(data['Month'], 10) || null;
        searchData = data['searchData'] || null;
    }

    // let employeeIds = employeeId || decodedUserData.id.toString();

    let employeeIds;
    if (!employeeId || employeeId.trim() == "" || employeeId.trim().toLowerCase() == "null" || employeeId.trim().toLowerCase() == "undefined" || employeeId.trim() == '""' // 👈 catch "%22%22"
    ) {
        employeeIds = decodedUserData.id.toString();
    } else {
        employeeIds = employeeId;
    }

    const cleanIds = employeeIds.replace(/^,|,$/g, '').trim();
    let employeeIdsArray = cleanIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (!employeeIds || !month || !year || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
        return res.status(200).json({ status: false, message: 'Invalid or missing parameters' });
    }

    if (employeeIdsArray.length == 0) {
        return res.status(200).json({ status: false, message: 'Invalid employee IDs' });
    }

    try {
        let empsql = `SELECT id,CONCAT(first_name, " ", last_name) AS first_name, work_week_id, employee_id FROM employees WHERE company_id=? `;
        let EmpArrayValue = [decodedUserData.company_id];

        //// filter 
        if (employeeStatus && employeeStatus == 1) {
            empsql += ` AND employee_status=1 and status=1 and delete_status=0 AND id IN (?)`;
            EmpArrayValue.push(employeeIdsArray);

        } else {
            empsql += ` AND (employee_status=0 or status=0 or delete_status=1) `;
        }

        if (departmentId && departmentId != 0) {
            empsql += ` AND department = ?`;
            EmpArrayValue.push(departmentId);
        } if (subDepartmentid && subDepartmentid != 0) {
            empsql += ` AND sub_department = ?`;
            EmpArrayValue.push(subDepartmentid);
        }

        if (searchData) {
            empsql += ` AND (first_name LIKE ? OR last_name LIKE ? OR employee_id LIKE ?)`;
            EmpArrayValue.push(`%${searchData}%`, `%${searchData}%`, `%${searchData}%`);
        }
        empsql += ' ORDER BY first_name ASC';
        const [empResults] = await db.promise().query(empsql, EmpArrayValue);
        if (empResults.length == 0) {
            return res.status(200).json({ status: false, message: 'Employees not found' });
        }

        const [holidayResults] = await db.promise().query(`
            SELECT date, holiday FROM holiday WHERE company_id=? And status = 1 AND YEAR(date) = ? AND 
            MONTH(date) = ?`, [decodedUserData.company_id, year, month]
        );

        // const holidays = new Set(holidayResults.map(holiday => new Date(holiday.date).toISOString().split('T')[0]));

        const holidays = {};
        holidayResults.forEach(h => {
            const dateKey = new Date(h.date).toISOString().split('T')[0];
            holidays[dateKey] = h.holiday;
        });
        const employeesAttendanceData = [];

        for (const employee of empResults) {
            const [WorkWeek] = await db.promise().query(
                `SELECT id, mon1, tue1, wed1, thu1, fri1, sat1, sun1, mon2, tue2, wed2, thu2, fri2, sat2, sun2, 
                mon3, tue3, wed3, thu3, fri3, sat3, sun3, mon4, tue4, wed4, thu4, fri4, sat4, sun4, 
                mon5, tue5, wed5, thu5, fri5, sat5, sun5 
                FROM work_week 
                WHERE id = ? AND company_id=?`,
                [employee.work_week_id, decodedUserData.company_id]
            );

            const workWeekData = WorkWeek.length > 0 ? WorkWeek[0] : null;

            const [attendanceResults] = await db.promise().query(`
                SELECT attendance_id,status, check_in_time, check_out_time, attendance_date,approval_status,attendance_status
               ,short_leave,short_leave_type,short_leave_reason,late_coming_leaving,approval_status,attendance_status FROM attendance
                WHERE employee_id = ? AND YEAR(attendance_date) = ? AND MONTH(attendance_date) = ?`,
                [employee.id, year, month]
            );


            const monthStr = String(month).padStart(2, '0'); // ensures "08" instead of "8"
            const monthStart = `${year}-${monthStr}-01`;
            const monthEnd = `${year}-${monthStr}-${new Date(year, month, 0).getDate()}`;

            const [leaveResultsRequest] = await db.promise().query(
                `SELECT employee_id, start_date, end_date, start_half, end_half,leave_type FROM leaves WHERE deletestatus = 0 AND status = 1 AND admin_status = 1 AND company_id = ?  AND employee_id = ?  
     AND ((start_date BETWEEN ? AND ?)  OR  (end_date BETWEEN ? AND ?) OR  (start_date <= ? AND end_date >= ?))`,
                [decodedUserData.company_id, employee.id, monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd]
            );

            const monthlyAttendanceLogs = [];
            const daysInMonth = new Date(year, month, 0).getDate();

            const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

            for (let dayNo = 1; dayNo <= daysInMonth; dayNo++) {
                const dateValue = new Date(year, month - 1, dayNo);
                const date1 = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
                const date = new Date(date1);

                if (date.getMonth() !== month - 1) break;

                const dayOfWeek = date.getDay();
                const weekNumber = Math.ceil(dayNo / 7);
                const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
                // console.log(dayKey);
                const isWeeklyOff = workWeekData && workWeekData[dayKey] == 3;
                // const isHoliday = holidays.has(date.toISOString().split('T')[0]);


                const attendance = attendanceResults.find(a => {
                    const attDate = new Date(a.attendance_date);
                    return attDate.getDate() == dayNo && attDate.getMonth() == month - 1;
                });
                const formattedDate = new Date(date).toISOString().split("T")[0];
                const isHoliday = holidays[formattedDate];
                // converts "2025-08-01T00:00:00.000Z" → "2025-08-01"

                // const leaveRecord = leaveResultsRequest.find(leave =>
                const leave = leaveResultsRequest.find(leave =>
                    formattedDate >= leave.start_date.split("T")[0] &&
                    formattedDate <= leave.end_date.split("T")[0]
                );


                let status = 'A';
                let label = 'Absent';

                // ================= ATTENDANCE =================
                if (attendance) {
                    const st = attendance.status.toLowerCase();

                    if (st === 'present') {
                        if (isHoliday) {
                            status = 'PH';
                            label = `Present on Holiday - ${isHoliday}`;
                        } else if (isWeeklyOff) {
                            status = 'PWO';
                            label = 'Present on Weekly Off';
                            //// cl check
                            if (status == 'PWO' && decodedUserData.company_id == 10) {
                                const leaveType = await handleCheck(attendance);
                                if (leaveType) {
                                    status = leaveType;
                                    label = `Present on Weekly Off, Leave - ${leaveType}`;
                                } else {
                                    status = 'PWO';
                                }
                            }
                        } else {
                            status = 'P';
                            label = 'Present';
                        }
                        if (!attendance.check_out_time) {
                            status = 'NCO';
                            label = 'Not Checked Out';
                        }
                        if (attendance.short_leave == 1) {
                            status = 'SL';
                            label = attendance.short_leave_reason || 'Short Leave';
                        }
                    }
                    else if (st === 'half-day') {
                        status = 'HF';
                        label = 'Half Day Attendance';
                    }
                    else if (st === 'lwp') {
                        status = 'LWP';
                        label = 'Leave Without Pay';
                    }
                }

                // ================= LEAVE =================
                else if (leave) {
                    if (
                        (leave.start_half && date === leave.start_date.split("T")[0]) ||
                        (leave.end_half && date === leave.end_date.split("T")[0])
                    ) {
                        status = 'HL';
                        label = `Half Day Leave - ${leave.leave_type}`;
                    } else {
                        status = 'L';
                        label = leave.leave_type;
                    }
                }

                // ================= HOLIDAY / WO / SANDWICH =================
                else if (isHoliday || isWeeklyOff) {

                    const prev = new Date(dateValue); prev.setDate(prev.getDate() - 1);
                    const next = new Date(dateValue); next.setDate(next.getDate() + 1);

                    const prevStr = prev.toISOString().split("T")[0];
                    const nextStr = next.toISOString().split("T")[0];

                    const prevAtt = attendanceResults.find(a => new Date(a.attendance_date).toISOString().split("T")[0] === prevStr);

                    const nextAtt = attendanceResults.find(a => new Date(a.attendance_date).toISOString().split("T")[0] === nextStr);

                    // console.log('check  =', dayNo, " = ", prevAtt, nextAtt)
                    const prevLeave = leaveResultsRequest.find(l => prevStr >= l.start_date.split("T")[0] && prevStr <= l.end_date.split("T")[0]);
                    const nextLeave = leaveResultsRequest.find(l => nextStr >= l.start_date.split("T")[0] && nextStr <= l.end_date.split("T")[0]);
                    const isFirstDay = dayNo === 1;
                    const isLastDay = dayNo === daysInMonth;



                    // if (isAbsentLike(prevAtt, prevLeave) && isAbsentLike(nextAtt, nextLeave)) {
                    if (!isFirstDay && !isLastDay && isAbsentLike(prevAtt, prevLeave) && isAbsentLike(nextAtt, nextLeave)) {
                        status = 'SP';
                        label = 'Sandwich Penalty';
                    } else if (isHoliday || isWeeklyOff) {
                        // console.log(prevAtt, prevStr);
                        status = isHoliday ? 'H' : 'WO';
                        label = isHoliday ? `Holiday - ${isHoliday}` : 'Weekly Off';
                    } else {
                        status = "err";
                        label = "pls call-7976929440";
                    }
                }
                let newStatus = lwpcheck(date, status, '2026-01-04');

                // let newStatus = status;
                monthlyAttendanceLogs.push({
                    day_no: dayNo,
                    status: newStatus,
                    label: label,
                    date: date,
                    in_time: attendance ? attendance.check_in_time : '',
                    out_time: attendance ? attendance.check_out_time : '',
                    attendance_id: attendance ? attendance.attendance_id : 0,
                    late_coming_leaving: attendance ? attendance?.late_coming_leaving : 0,
                    approval_status: attendance ? attendance?.approval_status : 0,
                    attendance_status: attendance ? attendance?.attendance_status : 0,
                });
            }

            employeesAttendanceData.push({
                emp_details: {
                    name: employee.first_name,
                    first_name: employee.first_name,
                    userId: employee.employee_id,
                    Id: employee.id
                },
                monthly_attendance_logs: monthlyAttendanceLogs
            });
        }

        res.json({
            status: true,
            employees: employeesAttendanceData
        });
    } catch (err) {
        console.error('Error occurred:', err);
        res.status(500).json({ message: 'An error occurred while fetching attendance data', error: err.message });
    }
});


const lwpcheck = (attDate, status, lockDate) => {
    // Only Absent can become LWP
    if (status !== 'A') return status;

    // Normalize attendance date
    const attendanceDate =
        attDate instanceof Date
            ? new Date(attDate.getFullYear(), attDate.getMonth(), attDate.getDate())
            : new Date(attDate + 'T00:00:00');

    if (!lockDate) return status;

    const lock = new Date(lockDate);

    // Previous month of lock
    const prevMonthDate = new Date(
        lock.getFullYear(),
        lock.getMonth() - 1,
        1
    );

    if (
        attendanceDate.getMonth() === prevMonthDate.getMonth() &&
        attendanceDate.getFullYear() === prevMonthDate.getFullYear() &&
        attendanceDate <= lock
    ) {
        return 'LWP';
    }

    return status;
};

// app cheak A / web cheak A
router.post('/api/BreakDetails', async (req, res) => {
    const { userData, attendance_id } = req.body;
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
    const query = 'SELECT break_id, start_time, end_time, duration, in_ip, out_ip, in_latitude, in_longitude, out_latitude, out_longitude, created FROM break_logs WHERE attendance_id=?';
    const queryParams = [attendance_id];
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        // Add serial number (srno) to each result
        const dataWithSrno = results.map((item, index) => ({
            srno: index + 1,
            ...item
        }));
        res.json({
            status: true,
            data: dataWithSrno,

        });
    });

});


// app cheak A
router.post('/api/AttendanceTypeDetails', async (req, res) => {
    const { userData, Date, type = 'persent' } = req.body;
    let SearchDate = null;

    if (Date) {
        SearchDate = Date;
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
    const limit = parseInt(req.body.limit, 10) || 10;
    const page = parseInt(req.body.page, 10) || 1;

    const offset = (page - 1) * limit;

    try {
        // Main query to fetch attendance
        const attendanceResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    b.id AS employee_id,
                    CONCAT(b.first_name, ' ', b.last_name) AS first_name,  
                    a.attendance_id,
                    b.work_week_id, 
                    a.attendance_date, 
                    a.status, 
                    a.daily_status_in, 
                    a.daily_status_out, 
                    a.daily_status_intime, 
                    a.daily_status_outtime, 
                    a.check_in_time, 
                    a.check_out_time, 
                    a.duration,
                    a.in_latitude, a.in_longitude, a.out_latitude, a.out_longitude
                FROM employees AS b
                LEFT JOIN attendance AS a 
                ON a.employee_id = b.id 
                   AND a.attendance_date = ?
                WHERE  b.employee_status=1 and b.status=1 and b.delete_status=0 And b.company_id = ?
                ORDER BY b.first_name ASC
                LIMIT ? OFFSET ?
            `;
            const queryParams = [SearchDate || null, decodedUserData.company_id, limit, offset];
            db.query(query, queryParams, (err, results) => (err ? reject(err) : resolve(results)));
        });
        const totalEmployees = await new Promise((resolve, reject) => {
            const queryCountTotal = `
                SELECT COUNT(id) AS total
                FROM employees
                WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?
            `;
            db.query(queryCountTotal, [decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });
        // Query to fetch leaves
        const leaveResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT leave_id, employee_id, leave_type, start_date, end_date 
                FROM leaves 
                WHERE ? BETWEEN start_date AND end_date
            `;
            db.query(query, [SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
        });

        // Query to fetch holidays
        const holidayResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT id, date, holiday 
                FROM holiday 
                WHERE company_id=? And date = ?
            `;
            db.query(query, [decodedUserData.company_id, SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
        });

        // Process and combine data
        const employeesWithDetails = await Promise.all(
            attendanceResults.map(async (attendance) => {
                const leave = leaveResults.find(l => l.employee_id == attendance.employee_id);
                const holiday = holidayResults.length > 0 ? holidayResults[0] : null;
                let status = 'A';

                if (attendance.check_in_time) {
                    if (attendance.status == 'absent') {
                        status = 'A';
                    }
                    else if (attendance.status == 'half-day') {
                        status = 'HF'; // Present
                    }
                    else if (attendance.status == 'present') {
                        status = 'P'; // Present
                    } else {
                        status = 'P'; // Present
                    }

                } else if (holiday) {
                    status = 'H'; // Holiday
                } else if (leave) {
                    status = 'L'; // Leave
                } else if (status == 'A' && attendance.work_week_id) {
                    try {
                        const workWeekResults = await new Promise((resolve, reject) => {
                            db.query(
                                `SELECT * FROM work_week WHERE company_id = ? AND id = ?`,
                                [decodedUserData.company_id, attendance.work_week_id],
                                (err, results) => (err ? reject(err) : resolve(results))
                            );
                        });
                        const workWeekStatus = getWorkWeekStatus(workWeekResults, SearchDate);
                        if (workWeekStatus) {
                            status = 'WO';
                        }
                    } catch (err) {
                        console.error('Error fetching work week records:', err);
                    }
                }
                let BreckDetails = null;
                if (status == 'P') {
                    BreckDetails = await new Promise((resolve, reject) => {
                        db.query('SELECT break_id,start_time, end_time, duration, in_ip, out_ip, in_latitude, in_longitude, out_latitude, out_longitude, created FROM break_logs WHERE attendance_id=?', [attendance.attendance_id], (err, results) => {
                            if (err) reject(err);
                            resolve(results);
                        });
                    });

                }

                return {
                    srnu: offset + attendanceResults.indexOf(attendance) + 1,
                    attendance_date: attendance.attendance_date || SearchDate,
                    check_in_time: attendance.check_in_time || null,
                    check_out_time: attendance.check_out_time || null,
                    daily_status_in: attendance.daily_status_in || null,
                    daily_status_intime: attendance.daily_status_intime || null,
                    daily_status_out: attendance.daily_status_out || null,
                    daily_status_outtime: attendance.daily_status_outtime || null,
                    duration: attendance.duration || null,
                    employee_id: attendance.employee_id,
                    first_name: attendance.first_name,
                    id: attendance.employee_id,
                    in_latitude: attendance.in_latitude || null,
                    in_longitude: attendance.in_longitude || null,
                    out_latitude: attendance.out_latitude || null,
                    out_longitude: attendance.out_longitude || null,
                    status: status,
                    BreckDetails: BreckDetails || [],
                };
            })
        );

        let filteredEmployees = [];
        if (type == 'present') {
            filteredEmployees = employeesWithDetails.filter(emp => emp.status == 'P' || emp.status == 'HF');
        } else if (type == 'absent') {
            filteredEmployees = employeesWithDetails.filter(emp => emp.status == 'A');
        } else if (type == 'leave') {
            filteredEmployees = employeesWithDetails.filter(emp => emp.status == 'L');
        }
        // do not use else 

        // Respond with results
        res.json({
            status: true,
            Attendanceemployees: filteredEmployees,
            total: totalEmployees,
            page,
            limit,
        });

    } catch (error) {
        console.error('Error processing attendance directory:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});



// // // // attendanceDetails 
// web check  
router.post('/attendanceDetails', async (req, res) => {
    const { userData, employee_id, attendance_date, attendance_id } = req.body;

    /* ================= USER DATA ================= */
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({
            status: false,
            error: 'Company ID required'
        });
    }

    if (!employee_id) {
        return res.status(400).json({
            status: false,
            error: 'employee_id is required'
        });
    }

    try {
        /* ================= EMPLOYEE DETAILS ================= */
        const [employeeDetails] = await db.promise().query(`
            SELECT 
                e.id AS employee_id,
                e.type,
                e.first_name,
                e.last_name,
                e.official_email_id,
                e.email_id,
                e.date_of_Joining,
                e.contact_number,
                e.gender,
                e.profile_image,

                d.id AS department_id,
                d.name AS department_name,

                ar.rule_id AS attendance_rule_id,
                ar.rule_name AS attendance_rule_name,

                lr.id AS leave_rule_id,
                lr.leave_type AS leave_type,

                ww.id AS work_week_id,
                ww.rule_name AS work_week_name

            FROM employees e
            LEFT JOIN departments d ON d.id = e.department
            LEFT JOIN attendance_rules ar ON ar.rule_id = e.attendance_rules_id
            LEFT JOIN leave_rules lr ON lr.id = e.leave_rule_id
            LEFT JOIN work_week ww ON ww.id = e.work_week_id

            WHERE e.company_id = ? AND e.id = ?
            LIMIT 1
        `, [decodedUserData.company_id, employee_id]);

        if (employeeDetails.length === 0) {
            return res.status(200).json({
                status: false,
                message: 'Employee not found'
            });
        }

        /* ================= ATTENDANCE DETAILS ================= */
        let attendanceQuery = `
            SELECT 
                a.attendance_id,
                a.attendance_date,
                a.status,
                a.check_in_time,
                a.check_out_time,
                a.duration,
                a.daily_status_in,
                a.daily_status_intime,
                a.daily_status_out,
                a.daily_status_outtime,
                a.late_coming_leaving,
                a.short_leave,
                a.short_leave_type,
                a.short_leave_reason,
                bi.name AS branch_in,
                bo.name AS branch_out
            FROM attendance a
            LEFT JOIN branches bi ON bi.id = a.branch_id_in
            LEFT JOIN branches bo ON bo.id = a.branch_id_out
            WHERE a.company_id = ? AND a.employee_id = ? AND a.attendance_id = ?
        `;

        const params = [decodedUserData.company_id, employee_id, attendance_id];
        const [attendanceDetails] = await db.promise().query(attendanceQuery, params);

        return res.status(200).json({
            status: true,
            message: 'Data Found',
            employee: employeeDetails[0],
            attendance: attendanceDetails.length ? attendanceDetails[0] : null
        });

    } catch (error) {
        console.error('attendanceDetails error:', error);
        return res.status(500).json({
            status: false,
            error: 'Server error'
        });
    }
});
////web check 
router.post("/convertAttendanceToLeave", async (req, res) => {

    const { userData, employee_id, attendance_id, attendance_date, leave_rule_id, leave_type = "", convert_reason, previous_status } = req.body;

    /* ================= Decode User Data ================= */
    let decodedUserData = null;
    if (userData) {
        try {
            decodedUserData = JSON.parse(
                Buffer.from(userData, "base64").toString("utf-8")
            );
        } catch (err) {
            return res.status(400).json({
                status: false,
                message: "Invalid userData format"
            });
        }
    }

    if (!decodedUserData?.company_id || !employee_id || !attendance_id || !leave_rule_id) {
        return res.status(400).json({
            status: false,
            message: "Required fields missing"
        });
    }

    if (!attendance_date || !previous_status) {
        return res.status(400).json({
            status: false,
            message: "Attendance date or previous status missing"
        });
    }



    try {
        /* ================= INSERT INTO CONVERSION TABLE ================= */
        let query = `INSERT INTO attendance_leave_conversions (
        company_id, employee_id, attendance_id, attendance_date, leave_rule_id, leave_type, converted_by, convert_reason, previous_status, new_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'L', NOW())`;

        let params = [
            decodedUserData.company_id,
            employee_id,
            attendance_id,
            attendance_date,
            leave_rule_id,
            leave_type || null,
            decodedUserData.id || null,
            convert_reason || null,
            previous_status
        ]
        const [leaveConverted] = await db.promise().query(query, params);
        if (leaveConverted.affectedRows === 0) {
            return res.status(500).json({
                status: false,
                message: "Failed to convert attendance to leave"
            });
        }
        return res.json({
            status: true,
            message: "Attendance successfully converted to leave"
        });

    } catch (error) {

    }
});



// Export the router
module.exports = router;