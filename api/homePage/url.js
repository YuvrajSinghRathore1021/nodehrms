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
                'location', 'location_view', 'attendanceLocationView', 'short_leave', 'permissions'
            ];

            menuItems = [
                {
                    title: 'Company',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18 15h-2v2h2m0-6h-2v2h2m2 6h-8v-2h2v-2h-2v-2h2v-2h-2V9h8M10 7H8V5h2m0 6H8V9h2m0 6H8v-2h2m0 6H8v-2h2M6 7H4V5h2m0 6H4V9h2m0 6H4v-2h2m0 6H4v-2h2m6-10V3H2v18h20V7z"/></svg>`,
                    links: [
                        { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' },
                        ...(company_id === 6 ? [{ to: '/CompanyView', icon: 'fas fa-circle', label: 'Client View' }] : [])
                    ]
                },
                {
                    title: 'Employees',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path fill="currentColor" d="M17.9 17.3c2.7 0 4.8-2.2 4.8-4.9s-2.2-4.8-4.9-4.8S13 9.8 13 12.4c0 2.7 2.2 4.9 4.9 4.9m-.1-7.7q.15 0 0 0c1.6 0 2.9 1.3 2.9 2.9s-1.3 2.8-2.9 2.8S15 14 15 12.5c0-1.6 1.3-2.9 2.8-2.9" class="clr-i-outline clr-i-outline-path-1"/><path fill="currentColor" d="M32.7 16.7c-1.9-1.7-4.4-2.6-7-2.5h-.8q-.3 1.2-.9 2.1c.6-.1 1.1-.1 1.7-.1c1.9-.1 3.8.5 5.3 1.6V25h2v-8z" class="clr-i-outline clr-i-outline-path-2"/><path fill="currentColor" d="M23.4 7.8c.5-1.2 1.9-1.8 3.2-1.3c1.2.5 1.8 1.9 1.3 3.2c-.4.9-1.3 1.5-2.2 1.5c-.2 0-.5 0-.7-.1c.1.5.1 1 .1 1.4v.6c.2 0 .4.1.6.1c2.5 0 4.5-2 4.5-4.4c0-2.5-2-4.5-4.4-4.5c-1.6 0-3 .8-3.8 2.2c.5.3 1 .7 1.4 1.3" class="clr-i-outline clr-i-outline-path-3"/><path fill="currentColor" d="M12 16.4q-.6-.9-.9-2.1h-.8c-2.6-.1-5.1.8-7 2.4L3 17v8h2v-7.2c1.6-1.1 3.4-1.7 5.3-1.6c.6 0 1.2.1 1.7.2" class="clr-i-outline clr-i-outline-path-4"/><path fill="currentColor" d="M10.3 13.1c.2 0 .4 0 .6-.1v-.6c0-.5 0-1 .1-1.4c-.2.1-.5.1-.7.1c-1.3 0-2.4-1.1-2.4-2.4S9 6.3 10.3 6.3c1 0 1.9.6 2.3 1.5c.4-.5 1-1 1.5-1.4c-1.3-2.1-4-2.8-6.1-1.5s-2.8 4-1.5 6.1c.8 1.3 2.2 2.1 3.8 2.1" class="clr-i-outline clr-i-outline-path-5"/><path fill="currentColor" d="m26.1 22.7l-.2-.3c-2-2.2-4.8-3.5-7.8-3.4c-3-.1-5.9 1.2-7.9 3.4l-.2.3v7.6c0 .9.7 1.7 1.7 1.7h12.8c.9 0 1.7-.8 1.7-1.7v-7.6zm-2 7.3H12v-6.6c1.6-1.6 3.8-2.4 6.1-2.4c2.2-.1 4.4.8 6 2.4z" class="clr-i-outline clr-i-outline-path-6"/><path fill="none" d="M0 0h36v36H0z"/></svg>`,
                    links: [
                        { to: '/employeesdirectory', icon: 'fas fa-circle', label: 'Employee Onboarding' },
                        { to: '/profile', icon: 'fas fa-circle', label: 'Employee Profile' },
                        { to: '/expenses', icon: 'fas fa-circle', label: 'Expenses' },
                        { to: '/documents_view', icon: 'fas fa-circle', label: 'Employee Documents' }
                    ]
                },
                {
                    title: 'Attendance',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="round" d="M17.25 20.643a3.429 3.429 0 1 0 0-6.858a3.429 3.429 0 0 0 0 6.858m-.571-9.429h1.142m-.571 0v2.572m3.839-1.218l.808.808m-.404-.404l-1.819 1.818m3.576 1.853v1.143m0-.572h-2.571m1.218 3.839l-.808.808m.404-.404l-1.819-1.818m-1.853 3.575h-1.142m.571 0v-2.571m-3.839 1.218l-.808-.808m.404.404l1.819-1.818m-3.576-1.853v-1.143m0 .571h2.571m-1.218-3.838l.808-.808m-.404.404l1.819 1.818m-6.861 3.049H2.3a1.553 1.553 0 0 1-1.55-1.551V3.889A1.55 1.55 0 0 1 2.3 2.337h13.977a1.55 1.55 0 0 1 1.552 1.552v4.364"/><path d="M.757 6.992h17.079"/><path stroke-linecap="round" d="M5.408 3.889V.786m7.763 3.103V.786"/></g></svg>`,
                    links: [
                        { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance List' },
                        { to: '/attendance_calendar', icon: 'fas fa-circle', label: 'Attendance Calendar' },
                        { to: '/hrattendance', icon: 'fas fa-circle', label: 'HR Attendance' },
                        { to: '/rule', icon: 'fas fa-circle', label: 'Attendance Rules' },
                        { to: '/assignrules', icon: 'fas fa-circle', label: 'Assign Attendance Rules' }
                    ]
                },
                {
                    title: 'Leave',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 2048 2048"><path fill="currentColor" d="M2048 1536v128h-646l211 211l-90 90l-365-365l365-365l90 90l-211 211zm-756-433l-88 93q-89-84-201-128t-235-44q-88 0-170 23t-153 64t-129 100t-100 130t-65 153t-23 170H0q0-117 35-229t101-207t157-169t203-113q-56-36-100-83t-76-103t-47-118t-17-130q0-106 40-199t109-163T568 40T768 0t199 40t163 109t110 163t40 200q0 137-63 248t-177 186q70 26 133 66t119 91M384 512q0 80 30 149t82 122t122 83t150 30q79 0 149-30t122-82t83-122t30-150q0-79-30-149t-82-122t-123-83t-149-30q-80 0-149 30t-122 82t-83 123t-30 149"/></svg>`,
                    links: [
                        { to: '/logs', icon: 'fas fa-circle', label: 'Leave Logs' },
                        { to: '/assign_leave', icon: 'fas fa-circle', label: 'Assign Leave' },
                        { to: '/rules', icon: 'fas fa-circle', label: 'Leave Rules' },
                        { to: '/short_leave', icon: 'fas fa-circle', label: 'Short Leave' },
                        { to: '/balance', icon: 'fas fa-circle', label: 'Leave Balance' }
                    ]
                },
                {
                    title: 'Holiday',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path fill="currentColor" d="M15.5 26a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m11-2.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m6 2.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M18 31.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m6 2.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M6 12.25A6.25 6.25 0 0 1 12.25 6h23.5A6.25 6.25 0 0 1 42 12.25v23.5A6.25 6.25 0 0 1 35.75 42h-23.5A6.25 6.25 0 0 1 6 35.75zm6.25-3.75a3.75 3.75 0 0 0-3.75 3.75V14h31v-1.75a3.75 3.75 0 0 0-3.75-3.75zM8.5 35.75a3.75 3.75 0 0 0 3.75 3.75h23.5a3.75 3.75 0 0 0 3.75-3.75V16.5h-31z"/></svg>`,
                    links: [
                        { to: '/Holidayupdate', icon: 'fas fa-circle', label: 'Holiday Update' },
                        { to: '/holidaycalender', icon: 'fas fa-circle', label: 'Holiday Calendar' }
                    ]
                },
                {
                    title: 'Payroll',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--streamline-ultimate" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.171 12.79h2.5a.485.485 0 0 1 .5.523v9.41a.483.483 0 0 1-.5.522h-2.5"></path><path stroke-linecap="round" stroke-linejoin="round" d="M10.322 10.584L8.4 12.977a1.4 1.4 0 0 1-1.045.523H6.171m0 7.03c2.144 1.625 4.1 2.716 5.363 2.716h6.273c.76 0 1.238-.054 1.568-1.045c.504-2.53.853-5.088 1.046-7.66c0-.522-.523-1.045-1.568-1.045h-5.932m-2.367-1.291L9.006 1.373a.546.546 0 0 1 .54-.623H17.1"></path><path stroke-linecap="round" stroke-linejoin="round" d="m13.839 13.5l-.916-9.159a.5.5 0 0 1 .5-.553h6.9a.5.5 0 0 1 .5.577l-1.38 9.2"></path><path d="M16.696 9.37a.375.375 0 0 1 0-.75m0 .75a.375.375 0 1 0 0-.75"></path></g></svg>`,
                    links: [
                        { to: '/payroll', icon: 'fas fa-circle', label: 'Payroll Management' },
                        { to: '/salary', icon: 'fas fa-circle', label: 'Salary Details' }
                    ]
                },
                // {
                //     title: 'Documents',
                //     iName: 'fas fa-file-alt',
                //     links: [
                //         { to: '/documents_view', icon: 'fas fa-circle', label: 'View Documents' }
                //     ]
                // },
                {
                    title: 'Location',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="16" cy="11" r="4"/><path d="M24 15c-3 7-8 15-8 15s-5-8-8-15s2-13 8-13s11 6 8 13"/></g></svg>`,
                    links: [
                        { to: '/location', icon: 'fas fa-circle', label: 'Manage Location' },
                        { to: '/location_view', icon: 'fas fa-circle', label: 'Location Permissions' },
                        { to: '/attendanceLocationView', icon: 'fas fa-circle', label: 'Attendance Location View' }
                    ]
                },
                {
                    title: 'Settings',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m10.135 21l-.362-2.892q-.479-.145-1.035-.454q-.557-.31-.947-.664l-2.668 1.135l-1.865-3.25l2.306-1.739q-.045-.27-.073-.558q-.03-.288-.03-.559q0-.252.03-.53q.028-.278.073-.626L3.258 9.126l1.865-3.212L7.771 7.03q.448-.373.97-.673q.52-.3 1.013-.464L10.134 3h3.732l.361 2.912q.575.202 1.016.463t.909.654l2.725-1.115l1.865 3.211l-2.382 1.796q.082.31.092.569t.01.51q0 .233-.02.491q-.019.259-.088.626l2.344 1.758l-1.865 3.25l-2.681-1.154q-.467.393-.94.673t-.985.445L13.866 21zM11 20h1.956l.369-2.708q.756-.2 1.36-.549q.606-.349 1.232-.956l2.495 1.063l.994-1.7l-2.189-1.644q.125-.427.166-.786q.04-.358.04-.72q0-.38-.04-.72t-.166-.747l2.227-1.683l-.994-1.7l-2.552 1.07q-.454-.499-1.193-.935q-.74-.435-1.4-.577L13 4h-1.994l-.312 2.689q-.756.161-1.39.52q-.633.358-1.26.985L5.55 7.15l-.994 1.7l2.169 1.62q-.125.336-.175.73t-.05.82q0 .38.05.755t.156.73l-2.15 1.645l.994 1.7l2.475-1.05q.589.594 1.222.953q.634.359 1.428.559zm.973-5.5q1.046 0 1.773-.727T14.473 12t-.727-1.773t-1.773-.727q-1.052 0-1.776.727T9.473 12t.724 1.773t1.776.727M12 12"/></svg>`,
                    links: [
                        { to: '/attendance_setting', icon: 'fas fa-circle', label: 'Attendance Settings' },
                        { to: '/permissions', icon: 'fas fa-circle', label: 'Permissions' },
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
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18 15h-2v2h2m0-6h-2v2h2m2 6h-8v-2h2v-2h-2v-2h2v-2h-2V9h8M10 7H8V5h2m0 6H8V9h2m0 6H8v-2h2m0 6H8v-2h2M6 7H4V5h2m0 6H4V9h2m0 6H4v-2h2m0 6H4v-2h2m6-10V3H2v18h20V7z"/></svg>`,
                    links: [
                        { to: '/Company_Profile', icon: 'fas fa-circle', label: 'Company Profile' }
                    ]
                },
                {
                    title: 'Profile',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path fill="currentColor" d="M17.9 17.3c2.7 0 4.8-2.2 4.8-4.9s-2.2-4.8-4.9-4.8S13 9.8 13 12.4c0 2.7 2.2 4.9 4.9 4.9m-.1-7.7q.15 0 0 0c1.6 0 2.9 1.3 2.9 2.9s-1.3 2.8-2.9 2.8S15 14 15 12.5c0-1.6 1.3-2.9 2.8-2.9" class="clr-i-outline clr-i-outline-path-1"/><path fill="currentColor" d="M32.7 16.7c-1.9-1.7-4.4-2.6-7-2.5h-.8q-.3 1.2-.9 2.1c.6-.1 1.1-.1 1.7-.1c1.9-.1 3.8.5 5.3 1.6V25h2v-8z" class="clr-i-outline clr-i-outline-path-2"/><path fill="currentColor" d="M23.4 7.8c.5-1.2 1.9-1.8 3.2-1.3c1.2.5 1.8 1.9 1.3 3.2c-.4.9-1.3 1.5-2.2 1.5c-.2 0-.5 0-.7-.1c.1.5.1 1 .1 1.4v.6c.2 0 .4.1.6.1c2.5 0 4.5-2 4.5-4.4c0-2.5-2-4.5-4.4-4.5c-1.6 0-3 .8-3.8 2.2c.5.3 1 .7 1.4 1.3" class="clr-i-outline clr-i-outline-path-3"/><path fill="currentColor" d="M12 16.4q-.6-.9-.9-2.1h-.8c-2.6-.1-5.1.8-7 2.4L3 17v8h2v-7.2c1.6-1.1 3.4-1.7 5.3-1.6c.6 0 1.2.1 1.7.2" class="clr-i-outline clr-i-outline-path-4"/><path fill="currentColor" d="M10.3 13.1c.2 0 .4 0 .6-.1v-.6c0-.5 0-1 .1-1.4c-.2.1-.5.1-.7.1c-1.3 0-2.4-1.1-2.4-2.4S9 6.3 10.3 6.3c1 0 1.9.6 2.3 1.5c.4-.5 1-1 1.5-1.4c-1.3-2.1-4-2.8-6.1-1.5s-2.8 4-1.5 6.1c.8 1.3 2.2 2.1 3.8 2.1" class="clr-i-outline clr-i-outline-path-5"/><path fill="currentColor" d="m26.1 22.7l-.2-.3c-2-2.2-4.8-3.5-7.8-3.4c-3-.1-5.9 1.2-7.9 3.4l-.2.3v7.6c0 .9.7 1.7 1.7 1.7h12.8c.9 0 1.7-.8 1.7-1.7v-7.6zm-2 7.3H12v-6.6c1.6-1.6 3.8-2.4 6.1-2.4c2.2-.1 4.4.8 6 2.4z" class="clr-i-outline clr-i-outline-path-6"/><path fill="none" d="M0 0h36v36H0z"/></svg>`,
                    links: [
                        { to: '/profile', icon: 'fas fa-circle', label: 'My Profile' },
                        { to: '/expenses', icon: 'fas fa-circle', label: 'My Expenses' }
                    ]
                },
                {
                    title: 'Attendance',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M5 5.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m0 7H.5v-.542A4.51 4.51 0 0 1 5.204 7.5A4.5 4.5 0 0 1 8.354 9m5.146-.5l-4 5l-2-1.5" stroke-width="1"/></svg>`,
                    links: [
                        { to: '/attendancelist', icon: 'fas fa-circle', label: 'Attendance List' }
                    ]
                },
                {
                    title: 'Leave',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 2048 2048"><path fill="currentColor" d="M2048 1536v128h-646l211 211l-90 90l-365-365l365-365l90 90l-211 211zm-756-433l-88 93q-89-84-201-128t-235-44q-88 0-170 23t-153 64t-129 100t-100 130t-65 153t-23 170H0q0-117 35-229t101-207t157-169t203-113q-56-36-100-83t-76-103t-47-118t-17-130q0-106 40-199t109-163T568 40T768 0t199 40t163 109t110 163t40 200q0 137-63 248t-177 186q70 26 133 66t119 91M384 512q0 80 30 149t82 122t122 83t150 30q79 0 149-30t122-82t83-122t30-150q0-79-30-149t-82-122t-123-83t-149-30q-80 0-149 30t-122 82t-83 123t-30 149"/></svg>`,
                    links: [
                        { to: '/logs', icon: 'fas fa-circle', label: 'Leave Logs' }
                    ]
                },
                {
                    title: 'Holiday',
                    iName: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path fill="currentColor" d="M15.5 26a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m11-2.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m6 2.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M18 31.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m6 2.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M6 12.25A6.25 6.25 0 0 1 12.25 6h23.5A6.25 6.25 0 0 1 42 12.25v23.5A6.25 6.25 0 0 1 35.75 42h-23.5A6.25 6.25 0 0 1 6 35.75zm6.25-3.75a3.75 3.75 0 0 0-3.75 3.75V14h31v-1.75a3.75 3.75 0 0 0-3.75-3.75zM8.5 35.75a3.75 3.75 0 0 0 3.75 3.75h23.5a3.75 3.75 0 0 0 3.75-3.75V16.5h-31z"/></svg>`,
                    links: [
                        { to: '/holidaycalender', icon: 'fas fa-circle', label: 'Holiday Calendar' }
                    ]
                },
                {
                    title: 'Salary',
                    iName: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--streamline-ultimate" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.171 12.79h2.5a.485.485 0 0 1 .5.523v9.41a.483.483 0 0 1-.5.522h-2.5"></path><path stroke-linecap="round" stroke-linejoin="round" d="M10.322 10.584L8.4 12.977a1.4 1.4 0 0 1-1.045.523H6.171m0 7.03c2.144 1.625 4.1 2.716 5.363 2.716h6.273c.76 0 1.238-.054 1.568-1.045c.504-2.53.853-5.088 1.046-7.66c0-.522-.523-1.045-1.568-1.045h-5.932m-2.367-1.291L9.006 1.373a.546.546 0 0 1 .54-.623H17.1"></path><path stroke-linecap="round" stroke-linejoin="round" d="m13.839 13.5l-.916-9.159a.5.5 0 0 1 .5-.553h6.9a.5.5 0 0 1 .5.577l-1.38 9.2"></path><path d="M16.696 9.37a.375.375 0 0 1 0-.75m0 .75a.375.375 0 1 0 0-.75"></path></g></svg>',
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