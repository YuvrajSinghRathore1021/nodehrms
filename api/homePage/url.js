// const express = require('express');
// const router = express.Router();
// const db = require('../../DB/ConnectionSql');



// router.post('/api/UrlGet', async (req, res) => {
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
//     let company_id = decodedUserData.company_id;
//     const query = `SELECT type FROM employees WHERE company_id = ? AND id = ? AND (type = 'admin' OR type = 'ceo' OR type = 'HR' Or type='Company_Admin')`;
//     const queryParams = [decodedUserData.company_id, decodedUserData.id];
//     let adminCheck = '';
//     db.query(query, queryParams, (err, results) => {
//         if (err) {
//             return res.status(500).json({
//                 status: false,
//                 message: 'Database error occurred while fetching employees',
//                 error: err.message || err
//             });
//         }
//         if (results.length == 0) {
//             adminCheck = false;
//         } else {
//             adminCheck = true;
//         }
//         let menuItems = [];
//         let ValidUrl = [];
//         if (adminCheck == true) {
//             ValidUrl = ['CompanyView', 'setting', 'Company_Profile', 'profile', 'attendanceadd', 'attendancelist', 'rule', 'assignrules', 'attendance_admin', 'attendance_calendar', 'attendance_approval', 'attendance_approval_log', 'employeesdirectory', 'logs', 'Holidayupdate', 'holidaycalender', 'attendance_setting', 'rules', 'assign_leave', 'balance', 'documents_view'];
//             menuItems = [
//                 {
//                     title: 'Company Profile',
//                     iName: 'fas fa-building',
//                     //company_id==6 if thain 
//                     links: [
//                         { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' },
//                         ...(company_id === 6 ? [{ to: '/CompanyView', icon: 'fas fa-circle', label: 'Company View' }] : [])
//                     ]
//                 },
//                 {
//                     iName: 'fas fa-user',
//                     title: 'Employee Profile',
//                     links: [{ to: '/profile', icon: 'fas fa-circle', label: 'Profile' }]
//                 },
//                 {
//                     iName: 'fal fa-clipboard-user',
//                     title: 'Attendance',
//                     links: [
//                         { to: '/attendanceadd', icon: 'fas fa-circle', label: 'Attendance Add' },
//                         { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance' },
//                         { to: '/rule', icon: 'fas fa-circle', label: 'Attendance Rule' },
//                         { to: '/assignrules', icon: 'fas fa-circle', label: 'Assign Rules' },
//                         { to: '/attendance_admin', icon: 'fas fa-circle', label: 'Attendance Admin' },
//                         { to: '/attendance_calendar', icon: 'fas fa-circle', label: 'Attendance Calendar For Admin' },
//                         { to: '/attendance_approval', icon: 'fas fa-circle', label: 'Attendance Approval' },
//                         { to: '/attendance_approval_log', icon: 'fas fa-circle', label: 'Attendance Approval Log' }
//                     ]
//                 },
//                 {
//                     iName: 'fas fa-sitemap',
//                     title: 'Directory',
//                     links: [{ to: '/employeesdirectory', icon: 'fas fa-circle', label: 'Employee Directory' }]
//                 },
//                 {
//                     iName: 'fas fa-leaf',
//                     title: 'Leave',
//                     links: [
//                         { to: '/logs', icon: 'fas fa-circle', label: 'Logs' },
//                         { to: '/assign_leave', icon: 'fas fa-circle', label: 'Assign Leave' },
//                         { to: '/rules', icon: 'fas fa-circle', label: 'Rules' }
//                     ]
//                 },
//                 {
//                     iName: 'fal fa-lights-holiday',
//                     title: 'Holiday',
//                     links: [
//                         { to: '/Holidayupdate', icon: 'fas fa-circle', label: 'Holiday' },
//                         { to: '/holidaycalender', icon: 'fas fa-circle', label: 'holidaycalender' }
//                     ]
//                 },
//                 {
//                     iName: 'fa-brands fa-amazon-pay',
//                     title: 'Pay Rol',
//                     links: [
//                         { to: '/payroll', icon: 'fas fa-circle', label: 'Pay ' }
//                     ]
//                 },
//                 {
//                     iName: 'fal fa-lights-holiday',
//                     title: 'Rules',
//                     links: [
//                         { to: '/rules', icon: 'fas fa-circle', label: 'rules' },
//                         { to: '/assign_leave', icon: 'fas fa-circle', label: 'assign_leave' },
//                         { to: '/balance', icon: 'fas fa-circle', label: 'balance' }
//                     ]
//                 },
//                 {
//                     iName: 'fal fa-lights-holiday',
//                     title: 'Documents',
//                     links: [
//                         { to: '/documents_view', icon: 'fas fa-circle', label: 'Documents View' }
//                     ]
//                 },
//                 {
//                     iName: 'fas fa-cogs',
//                     title: 'Setting',
//                     links: [
//                         { to: '/attendance_setting', icon: 'fas fa-circle', label: 'Attendance Setting' },
//                         { to: '/setting', icon: 'fas fa-circle', label: 'Setting' }
//                     ]
//                 }
//                 , {
//                     iName: 'fas fa-cogs',
//                     title: 'Bank Details',
//                     links: [
//                         { to: '/salary', icon: 'fas fa-circle', label: 'salary' }
//                     ]
//                 }
//             ];
//         } else {
//             ValidUrl = ['Company_Profile', 'profile', 'attendanceadd', 'attendancelist', 'rule', 'attendance_approval', 'attendance_approval_log', 'employeesdirectory', 'logs', 'holidaycalender', 'rules', 'assign_leave', 'balance'];
//             menuItems = [
//                 {
//                     title: 'Company Profile',
//                     links: [
//                         { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' }
//                     ]
//                 },
//                 {
//                     title: 'Employee Profile',
//                     links: [{ to: '/profile', icon: 'fas fa-circle', label: 'Profile' }]
//                 },
//                 {
//                     title: 'Attendance',
//                     links: [
//                         { to: '/attendanceadd', icon: 'fas fa-circle', label: 'Attendance Add' },
//                         { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance' },
//                         { to: '/rule', icon: 'fas fa-circle', label: 'Attendance Rule' },
//                         { to: '/attendance_approval', icon: 'fas fa-circle', label: 'Attendance Approval' },
//                         { to: '/attendance_approval_log', icon: 'fas fa-circle', label: 'Attendance Approval Log' }
//                     ]
//                 },
//                 {
//                     title: 'Directory',
//                     links: [{ to: '/employeesdirectory', icon: 'fas fa-circle', label: 'Employee Directory' }]
//                 },
//                 {
//                     title: 'Leave',
//                     links: [
//                         { to: '/logs', icon: 'fas fa-circle', label: 'Logs' },
//                         { to: '/assign_leave', icon: 'fas fa-circle', label: 'Assign Leave' },
//                         { to: '/rules', icon: 'fas fa-circle', label: 'Rules' }

//                     ]
//                 },
//                 {
//                     title: 'Holiday',
//                     links: [
//                         { to: '/holidaycalender', icon: 'fas fa-circle', label: 'Holiday Calender' }
//                     ]
//                 }, {
//                     iName: 'fa-brands fa-amazon-pay',
//                     title: 'Pay Rol',
//                     links: [
//                         { to: '/payroll', icon: 'fas fa-circle', label: 'Pay ' }
//                     ]
//                 }
//                 , {
//                     iName: 'fas fa-cogs',
//                     title: 'Bank Details',
//                     links: [
//                         { to: '/salary', icon: 'fas fa-circle', label: 'salary' }
//                     ]
//                 }
//             ];
//         }
//         res.json({
//             status: true,
//             data: menuItems,
//             ValidUrl: ValidUrl,
//             adminCheck: adminCheck
//         });
//     });
// });
// // Export the router
// module.exports = router;













































const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');



// router.post('/api/UrlGet', async (req, res) => {
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
//     let company_id = decodedUserData.company_id;
//     const query = `SELECT type FROM employees WHERE company_id = ? AND id = ? AND (type = 'admin' OR type = 'ceo' OR type = 'HR' Or type='Company_Admin')`;
//     const queryParams = [decodedUserData.company_id, decodedUserData.id];
//     let adminCheck = '';
//     db.query(query, queryParams, (err, results) => {
//         if (err) {
//             return res.status(500).json({
//                 status: false,
//                 message: 'Database error occurred while fetching employees',
//                 error: err.message || err
//             });
//         }
//         if (results.length == 0) {
//             adminCheck = false;
//         } else {
//             adminCheck = true;
//         }
//         let menuItems = [];
//         let ValidUrl = [];
//         if (adminCheck == true) {
//             ValidUrl = ['CompanyView', 'expenses', 'setting', 'hrattendance', 'Company_Profile', 'profile', 'attendanceadd', 'attendancelist', 'rule', 'assignrules', 'attendance_admin', 'attendance_calendar', 'attendance_approval', 'attendance_approval_log', 'employeesdirectory', 'logs', 'Holidayupdate', 'holidaycalender', 'attendance_setting', 'rules', 'assign_leave', 'balance', 'documents_view'];
//             menuItems = [
//                 {
//                     title: 'Company Profile',
//                     iName: 'fas fa-building',
//                     links: [
//                         { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' },
//                         ...(company_id === 6 ? [{ to: '/CompanyView', icon: 'fas fa-circle', label: 'Company View' }] : [])
//                     ]
//                 },
//                 {
//                     iName: 'fas fa-user',
//                     title: 'Employee Profile',
//                     links: [{ to: '/employeesdirectory', icon: 'fas fa-circle', label: 'Employee Directory' },
//                     { to: '/profile', icon: 'fas fa-circle', label: 'Profile' }, { to: '/expenses', icon: 'fas fa-circle', label: 'Expenses' }]
//                 },
//                 {
//                     iName: 'fal fa-clipboard-user',
//                     title: 'Attendance',
//                     links: [
//                         { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance list' },
//                         { to: '/rule', icon: 'fas fa-circle', label: 'Attendance Rule' },
//                         { to: '/assignrules', icon: 'fas fa-circle', label: 'Assign Rules' },
//                         { to: '/attendance_calendar', icon: 'fas fa-circle', label: 'Attendance Calendar' },
//                         { to: '/hrattendance', icon: 'fas fa-circle', label: 'HR Attendance' }

//                     ]
//                 },
//                 {
//                     iName: 'fas fa-leaf',
//                     title: 'Leave',
//                     links: [
//                         { to: '/logs', icon: 'fas fa-circle', label: 'Logs' },
//                         { to: '/assign_leave', icon: 'fas fa-circle', label: 'Assign Leave' },
//                         { to: '/rules', icon: 'fas fa-circle', label: 'Rules' }
//                     ]
//                 },
//                 {
//                     iName: 'fal fa-lights-holiday',
//                     title: 'Holiday',
//                     links: [
//                         { to: '/Holidayupdate', icon: 'fas fa-circle', label: 'Holiday' },
//                         { to: '/holidaycalender', icon: 'fas fa-circle', label: 'Holiday Calender' }
//                     ]
//                 },
//                 {
//                     iName: 'fa-brands fa-amazon-pay',
//                     title: 'Pay Roll',
//                     links: [
//                         { to: '/payroll', icon: 'fas fa-circle', label: 'Pay ' }
//                     ]
//                 },
//                 {
//                     iName: 'fal fa-lights-holiday',
//                     title: 'Rules',
//                     links: [
//                         { to: '/rules', icon: 'fas fa-circle', label: 'Rules' },
//                         { to: '/assign_leave', icon: 'fas fa-circle', label: 'Assign leave' },
//                         { to: '/balance', icon: 'fas fa-circle', label: 'Balance' }
//                     ]
//                 },
//                 {
//                     iName: 'fal fa-lights-holiday',
//                     title: 'Documents',
//                     links: [
//                         { to: '/documents_view', icon: 'fas fa-circle', label: 'Documents View' }
//                     ]
//                 },
//                 {
//                     iName: 'fas fa-cogs',
//                     title: 'Setting',
//                     links: [
//                         { to: '/attendance_setting', icon: 'fas fa-circle', label: 'Attendance Setting' },
//                         { to: '/setting', icon: 'fas fa-circle', label: 'Setting' }
//                     ]
//                 }
//                 , {
//                     iName: 'fas fa-cogs',
//                     title: 'Bank Details',
//                     links: [
//                         { to: '/salary', icon: 'fas fa-circle', label: 'Salary' }
//                     ]
//                 }
//                 , {
//                     iName: 'fas fa-cogs',
//                     title: 'Location',
//                     links: [
//                         { to: '/location', icon: 'fas fa-circle', label: 'Location' },
//                         { to: '/location_view', icon: 'fas fa-circle', label: 'Location Permission' },
//                         { to: '/attendanceLocationView', icon: 'fas fa-circle', label: 'Attendance Location View' }
//                     ]
//                 }
//             ];
//         } else {
//             ValidUrl = ['Company_Profile', 'expenses', 'profile', 'attendanceadd', 'attendancelist', 'rule', 'attendance_approval', 'attendance_approval_log', 'employeesdirectory', 'logs', 'holidaycalender', 'rules', 'assign_leave', 'balance'];
//             menuItems = [
//                 {
//                     title: 'Company Profile',
//                     links: [
//                         { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' }
//                     ]
//                 },
//                 {
//                     title: 'Employee Profile',
//                     links: [{ to: '/profile', icon: 'fas fa-circle', label: 'Profile' }, { to: '/expenses', icon: 'fas fa-circle', label: 'Expenses' }]
//                 },
//                 {
//                     title: 'Attendance',
//                     links: [
//                         { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance List' }
//                     ]
//                 },
//                 {
//                     title: 'Leave',
//                     links: [
//                         { to: '/logs', icon: 'fas fa-circle', label: 'Logs' }
//                     ]
//                 },
//                 {
//                     title: 'Holiday',
//                     links: [
//                         { to: '/holidaycalender', icon: 'fas fa-circle', label: 'Holiday Calender' }
//                     ]
//                 },
//                 {
//                     iName: 'fas fa-cogs',
//                     title: 'Bank Details',
//                     links: [
//                         { to: '/salary', icon: 'fas fa-circle', label: 'Salary' }
//                     ]
//                 }
//             ];
//         }
//         res.json({
//             status: true,
//             data: menuItems,
//             ValidUrl: ValidUrl,
//             adminCheck: adminCheck
//         });
//     });
// });


router.post('/api/UrlGet', async (req, res) => {
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

    const company_id = decodedUserData.company_id;
    const query = `
        SELECT type FROM employees 
        WHERE company_id = ? AND id = ? 
        AND (type = 'admin' OR type = 'ceo' OR type = 'HR' OR type = 'Company_Admin')
    `;
    const queryParams = [decodedUserData.company_id, decodedUserData.id];

    db.query(query, queryParams, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error occurred while fetching employees',
                error: err.message || err
            });
        }

        const adminCheck = results.length > 0;
        let menuItems = [];
        let ValidUrl = [];

        if (adminCheck) {
            ValidUrl = [
                'CompanyView', 'Company_Profile', 'employeesdirectory', 'profile', 'expenses',
                'attendancelist', 'attendance_calendar', 'hrattendance', 'rule', 'assignrules',
                'logs', 'assign_leave', 'rules', 'balance', 'Holidayupdate', 'holidaycalender',
                'payroll', 'documents_view', 'attendance_setting', 'setting', 'salary',
                'location', 'location_view', 'attendanceLocationView'
            ];

            menuItems = [
                {
                    title: 'Company',
                    iName: 'fas fa-building',
                    links: [
                        { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' },
                        ...(company_id === 6 ? [{ to: '/CompanyView', icon: 'fas fa-circle', label: 'Company View' }] : [])
                    ]
                },
                {
                    title: 'Employees',
                    iName: 'fas fa-users',
                    links: [
                        { to: '/employeesdirectory', icon: 'fas fa-circle', label: 'Employee Directory' },
                        { to: '/profile', icon: 'fas fa-circle', label: 'Employee Profile' },
                        { to: '/expenses', icon: 'fas fa-circle', label: 'Expenses' }
                    ]
                },
                {
                    title: 'Attendance',
                    iName: 'fal fa-clipboard-user',
                    links: [
                        { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance List' },
                        { to: '/attendance_calendar', icon: 'fas fa-circle', label: 'Attendance Calendar' },
                        { to: '/hrattendance', icon: 'fas fa-circle', label: 'HR Attendance' },
                        { to: '/rule', icon: 'fas fa-circle', label: 'Attendance Rules' },
                        { to: '/assignrules', icon: 'fas fa-circle', label: 'Assign Attendance Rules' }
                    ]
                },
                {
                    title: 'Leave Management',
                    iName: 'fas fa-leaf',
                    links: [
                        { to: '/logs', icon: 'fas fa-circle', label: 'Leave Logs' },
                        { to: '/assign_leave', icon: 'fas fa-circle', label: 'Assign Leave' },
                        { to: '/rules', icon: 'fas fa-circle', label: 'Leave Rules' },
                        { to: '/balance', icon: 'fas fa-circle', label: 'Leave Balance' }
                    ]
                },
                {
                    title: 'Holiday',
                    iName: 'fas fa-snowflake',
                    links: [
                        { to: '/Holidayupdate', icon: 'fas fa-circle', label: 'Holiday Update' },
                        { to: '/holidaycalender', icon: 'fas fa-circle', label: 'Holiday Calendar' }
                    ]
                },
                {
                    title: 'Payroll',
                    iName: 'fa-brands fa-amazon-pay',
                    links: [
                        { to: '/payroll', icon: 'fas fa-circle', label: 'Payroll Management' },
                        { to: '/salary', icon: 'fas fa-circle', label: 'Salary Details' }
                    ]
                },
                {
                    title: 'Documents',
                    iName: 'fas fa-file-alt',
                    links: [
                        { to: '/documents_view', icon: 'fas fa-circle', label: 'View Documents' }
                    ]
                },
                {
                    title: 'Location',
                    iName: 'fas fa-map-marker-alt',
                    links: [
                        { to: '/location', icon: 'fas fa-circle', label: 'Manage Location' },
                        { to: '/location_view', icon: 'fas fa-circle', label: 'Location Permissions' },
                        { to: '/attendanceLocationView', icon: 'fas fa-circle', label: 'Attendance Location View' }
                    ]
                },
                {
                    title: 'Settings',
                    iName: 'fas fa-cogs',
                    links: [
                        { to: '/attendance_setting', icon: 'fas fa-circle', label: 'Attendance Settings' },
                        { to: '/setting', icon: 'fas fa-circle', label: 'System Settings' }
                    ]
                }
            ];
        } else {
            ValidUrl = [
                'Company_Profile', 'profile', 'expenses', 'attendancelist', 'logs',
                'holidaycalender', 'salary'
            ];

            menuItems = [
                {
                    title: 'Company',
                    iName: 'fas fa-building',
                    links: [
                        { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' }
                    ]
                },
                {
                    title: 'Profile',
                    iName: 'fas fa-user',
                    links: [
                        { to: '/profile', icon: 'fas fa-circle', label: 'My Profile' },
                        { to: '/expenses', icon: 'fas fa-circle', label: 'My Expenses' }
                    ]
                },
                {
                    title: 'Attendance',
                    iName: 'fal fa-clipboard-user',
                    links: [
                        { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance List' }
                    ]
                },
                {
                    title: 'Leave',
                    iName: 'fas fa-leaf',
                    links: [
                        { to: '/logs', icon: 'fas fa-circle', label: 'Leave Logs' }
                    ]
                },
                {
                    title: 'Holiday',
                    iName: 'fas fa-snowflake',
                    links: [
                        { to: '/holidaycalender', icon: 'fas fa-circle', label: 'Holiday Calendar' }
                    ]
                },
                {
                    title: 'Salary',
                    iName: 'fa-brands fa-amazon-pay',
                    links: [
                        { to: '/salary', icon: 'fas fa-circle', label: 'Salary Details' }
                    ]
                }
            ];
        }

        res.json({
            status: true,
            data: menuItems,
            ValidUrl,
            adminCheck
        });
    });
});


// Export the router
module.exports = router;