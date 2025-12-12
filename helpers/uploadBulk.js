// // helpers/uploadBulk.js
// const multer = require("multer");
// const storage = multer.memoryStorage();
// module.exports = multer({ storage }).array("files"); 


// helpers/uploadBulk.js
const multer = require("multer");
const storage = multer.memoryStorage();
module.exports = multer({ storage }).array("files", 20); 

