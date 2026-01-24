const express = require("express");
const router = express.Router();

const uploadFields = require("../../helpers/uploadFields");
const saveUploadedFile = require("../../helpers/uploadFile");

const uploadBulk = require("../../helpers/uploadBulk");
const saveUploadedFiles = require("../../helpers/saveUploadedFiles");

// web cheak A
router.post("/all", uploadFields, async (req, res) => {
    try {

        const result = await saveUploadedFile(req);

        return res.json({
            status: true,
            message: "File uploaded successfully",
            folder: result.folder,
            file_name: result.fileName,
            file_path: result.filePath,
        });

    } catch (err) {

        return res.json({
            status: false,
            message: "Upload failed",
            error: err.message
        });

    }
});

// router.post("/bulk", uploadBulk, async (req, res) => {
//     try {
//         const result = await saveUploadedFiles(req);

//         return res.json({
//             status: true,
//             message: "Bulk upload successful",
//             folder: result.folder,
//             files: result.uploadedFiles
//         });

//     } catch (err) {
//         return res.json({
//             status: false,
//             message: "Bulk upload failed",
//             error: err.message
//         });
//     }
// });


router.post("/bulk", uploadBulk, async (req, res) => {
    try {
        const result = await saveUploadedFiles(req);

        return res.json({
            status: true,
            message: "Bulk upload successful",
            folder: result.folder,
            files: result.uploadedFiles
        });

    } catch (err) {
        return res.json({
            status: false,
            message: "Bulk upload failed",
            error: err.message
        });
    }
});


module.exports = router;

