// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const Jimp = require('jimp');

// const uploadsBaseDir = path.join(__dirname, '../../uploads/');

// // Create base uploads directory if it doesn't exist
// if (!fs.existsSync(uploadsBaseDir)) {
//     fs.mkdirSync(uploadsBaseDir);
// }

// // Configure multer storage
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const folderName = req.body?.folderName || 'default'; // Ensure folderName is correctly accessed
//         const folderPath = path.join(uploadsBaseDir, folderName);

//         if (!fs.existsSync(folderPath)) {
//             fs.mkdirSync(folderPath);
//         }

//         cb(null, folderPath);
//     },
//     filename: (req, file, cb) => {
//         const datetime = Date.now();
//         const originalName = path.basename(file.originalname, path.extname(file.originalname));
//         cb(null, `${datetime}_${originalName}${path.extname(file.originalname)}`);
//     }
// });

// // File type filtering
// const upload = multer({
//     storage: storage,
//     fileFilter: (req, file, cb) => {
//         const filetypes = /jpeg|jpg|png|gif/;
//         const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//         const mimetype = filetypes.test(file.mimetype);
//         if (mimetype && extname) {
//             return cb(null, true);
//         }
//         cb(new Error(`Error: File upload only supports the following file types - ${filetypes}`));
//     }
// });

// // Function to compress images
// const compressImage = async (filePath) => {
//     try {
//         const compressedPath = filePath.replace(/(\.[^.]+$)/, '_compressed$1');
//         const image = await Jimp.read(filePath);
//         await image
//             .resize(800, Jimp.AUTO) // Resize image
//             .quality(80) // Set JPEG quality
//             .writeAsync(compressedPath);

//         fs.unlinkSync(filePath); // Remove the original file
//         return compressedPath;
//     } catch (err) {
//         console.error('Error during image compression:', err);
//         throw new Error('Image compression failed');
//     }
// };

// // Exported upload function
// const uploadFile = async (req, res, next) => {
//     upload.single('logo')(req, res, async (err) => {
//         if (err) {
//             return res.status(400).json({ status: false, message: err.message });
//         }
//         if (!req.file) {
//             return res.status(400).json({ status: false, message: 'No file uploaded' });
//         }
//         try {
//             const compressedPath = await compressImage(req.file.path);
//             req.file.path = compressedPath;
//         } catch (error) {
//             console.error('Compression failed, proceeding with original file:', error);
//         }
//         next();
//     });
// };

// module.exports = uploadFile;








const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsBaseDir = path.join(__dirname, '../../uploads/');

// Create base uploads directory if it doesn't exist
if (!fs.existsSync(uploadsBaseDir)) {
    fs.mkdirSync(uploadsBaseDir);
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folderName = req.body?.folderName || 'default';
        const folderPath = path.join(uploadsBaseDir, folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
        cb(null, folderPath);
    },
    filename: (req, file, cb) => {
        const datetime = Date.now();
        const originalName = path.basename(file.originalname, path.extname(file.originalname));
        cb(null, `${datetime}_${originalName}${path.extname(file.originalname)}`);
    }
});

// File type filtering
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error(`Error: File upload only supports the following file types - ${filetypes}`));
    }
});

// Exported upload function
const uploadFile = (req, res, next) => {
    upload.single('logo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: false, message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ status: false, message: 'No file uploaded' });
        }
        next();
    });
};

module.exports = uploadFile;
