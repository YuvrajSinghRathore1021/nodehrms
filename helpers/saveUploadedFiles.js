// helpers/saveUploadedFiles.js
const fs = require("fs");
const path = require("path");

async function saveUploadedFiles(req) {
    try {
        const folder = req.body.folder || "default";
        console.log("Saving files to folder:", folder);

        const uploadPath = path.join(__dirname, "..", "uploads/new/", folder);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        let uploadedFiles = [];

        for (let f of req.files) {
            const ext = path.extname(f.originalname);
            const fileName = Date.now() + "-" + Math.floor(Math.random() * 9999) + ext;

            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, f.buffer);

            uploadedFiles.push({
                original_name: f.originalname,
                saved_name: fileName,
                file_path: "/uploads/new/" + folder + "/" + fileName
            });
        }

        return { folder, uploadedFiles };

    } catch (err) {
        throw err;
    }
}

module.exports = saveUploadedFiles;
