const fs = require("fs");
const path = require("path");

function saveUploadedFile(req) {
    return new Promise((resolve, reject) => {
        try {
            const folder = req.body.folder || "default";

            const uploadPath = path.join(__dirname, "..", "uploads/new/", folder);

            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            const fileData = req.files.file[0];

            const ext = path.extname(fileData.originalname);
            const fileName = Date.now() + ext;

            const finalPath = path.join(uploadPath, fileName);

            fs.writeFileSync(finalPath, fileData.buffer);

            resolve({
                folder,
                fileName,
                filePath: "/uploads/new/" + folder + "/" + fileName
            });

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = saveUploadedFile;
