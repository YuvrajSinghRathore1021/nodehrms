const multer = require("multer");

const uploadFields = multer({ storage: multer.memoryStorage() }).fields([
    { name: "file", maxCount: 1 },
    { name: "folder", maxCount: 1 },
]);

module.exports = uploadFields;
