// // // npm install xlsx
// const express = require('express');
// const router = express.Router();
// const XLSX = require('xlsx');
// const fs = require('fs');
// const path = require('path');

// router.post('/excelDownload', (req, res) => {
//     // Create dummy data
//     const data = [
//         ["ID", "Name", "Email", "Age"],
//         [1, "John Doe", "john@example.com", 25],
//         [2, "Jane Smith", "jane@example.com", 30],
//         [3, "Mike Johnson", "mike@example.com", 28]
//     ];

//     // Create a new workbook and worksheet
//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.aoa_to_sheet(data);
//     XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

//     // Define the temp directory
//     const tempDir = path.join(__dirname, '../../temp');
//     const filePath = path.join(tempDir, 'dummy_data.xlsx');

//     // ✅ Ensure the directory exists
//     if (!fs.existsSync(tempDir)) {
//         fs.mkdirSync(tempDir, { recursive: true });
//     }

//     XLSX.writeFile(wb, filePath);
//     // console.log(filePath)

//     res.json({
//         filePath: filePath,
//         status: true,
//         message: 'Data found'
//     });
//     // res.download(filePath, "dummy_data.xlsx", (err) => {
//     //     if (err) {
//     //         console.error("Error downloading file:", err);
//     //         res.status(500).send("Error generating file");
//     //     } else {
//     //         // ✅ Delete the file after download
//     //         // fs.unlinkSync(filePath);
//     //     }
//     // });

// });

// module.exports = router;











const db = require('../../DB/ConnectionSql');
const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// function ExcelMake(ExcelHeader, ExcelData) {
//     const data = [ExcelHeader, ExcelData];
//     // Create a new workbook and worksheet
//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.aoa_to_sheet(data);
//     XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

//     // Define the temp directory and file path
//     const tempDir = path.join(__dirname, '../../temp');
//     const filePath = path.join(tempDir, 'dummy_data.xlsx');

//     // Ensure the directory exists
//     if (!fs.existsSync(tempDir)) {
//         fs.mkdirSync(tempDir, { recursive: true });
//     }

//     // Write the file to the specified path
//     XLSX.writeFile(wb, filePath);

//     return filePath;
// }


// function ExcelMake(ExcelHeader, ExcelData) {
//     const data = [ExcelHeader, ...ExcelData];

//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.aoa_to_sheet(data);
//     XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

//     const tempDir = path.join(__dirname, '../../uploads/temp');
//     const filePath = path.join(tempDir, 'dummy_data.xlsx');

//     if (!fs.existsSync(tempDir)) {
//         fs.mkdirSync(tempDir, { recursive: true });
//     }

//     XLSX.writeFile(wb, filePath);
//     return filePath;
// }


function ExcelMake(ExcelHeader, ExcelData) {
    const data = [ExcelHeader, ...ExcelData];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    const tempDir = path.join(__dirname, '../../uploads/excal');

    // Get current date and format as YYYY-MM-DD
    const date = new Date();
//     const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
//     // Use the formatted date in the file name
//    const fileName=`data_${formattedDate}.xlsx`;

const formattedDate = date.toISOString().replace(/:/g, '-'); // Replace colons with hyphens to make it valid in filenames

// Use the formatted date in the file name
const fileName = `data_${formattedDate}.xlsx`;
    const filePath = path.join(tempDir,fileName);

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    XLSX.writeFile(wb, filePath);
    return `/uploads/excal/${fileName}`;
    // return filePath;
}

module.exports = { ExcelMake };




// const XLSX = require('xlsx');
// const fs = require('fs');
// const path = require('path');

// const ExcelMake = (headers, data) => {
//     try {
//         // Convert headers into an array (if not already)
//         const worksheetData = [headers]; 
        
//         // Append database records to the worksheet
//         data.forEach(row => {
//             worksheetData.push([
//                 row.id, row.type, row.first_name, row.last_name, 
//                 row.official_email_id, row.email_id, row.date_of_Joining, 
//                 row.contact_number, row.dob, row.gender, row.add_stamp
//             ]);
//         });

//         // Create a new workbook and worksheet
//         const wb = XLSX.utils.book_new();
//         const ws = XLSX.utils.aoa_to_sheet(worksheetData);

//         // Append worksheet to workbook
//         XLSX.utils.book_append_sheet(wb, ws, "Employees");

//         // Define file path
//         const filePath = path.join(__dirname, '../temp/employees.xlsx');

//         // Ensure the directory exists
//         const tempDir = path.dirname(filePath);
//         if (!fs.existsSync(tempDir)) {
//             fs.mkdirSync(tempDir, { recursive: true });
//         }

//         // Write Excel file
//         XLSX.writeFile(wb, filePath);

//         return filePath;
//     } catch (error) {
//         console.error("Excel creation error:", error);
//         return null;
//     }
// };

// module.exports = { ExcelMake };
