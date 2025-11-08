const express = require('express');
const db = require('../../DB/ConnectionSql');

const router = express.Router();

// Helper: Euclidean distance between embeddings
function euclideanDistance(v1, v2) {
    if (!Array.isArray(v1) || !Array.isArray(v2)) return 9999;
    if (v1.length !== v2.length) return 9999;

    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        const diff = v1[i] - v2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

router.post('/verify', async (req, res) => {
    try {
        const { embedding, userData } = req.body;

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

        if (!embedding) {
            return res.status(400).json({ status: false, message: 'Missing embedding data' });
        }

        const embeddingNew = Array.isArray(embedding) ? embedding : JSON.parse(embedding);

        // Fetch all stored embeddings
        const [rows] = await db.promise().query(
            'SELECT employee_id, embeddings FROM face_auth WHERE face_authentication = 1 and company_id = ?',
            [decodedUserData.company_id]
        );

        if (!rows || rows.length === 0) {
            return res.json({ status: false, message: 'No registered faces in database' });
        }

        let bestMatch = null;
        let bestDistance = 9999;

        for (const row of rows) {
            try {
                const dbEmbedding = JSON.parse(row.embeddings);
                const distance = euclideanDistance(embeddingNew, dbEmbedding);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = row;
                }
            } catch (err) {
                console.error('Invalid embedding for employee:', row.employee_id);
            }
        }

        const threshold = 0.45; // adjust as needed

        if (bestDistance < threshold) {
            return res.json({
                status: true,
                message: 'Face verified successfully',
                match: {
                    employee_id: bestMatch.employee_id,
                    // distance: bestDistance.toFixed(4),
                },
            });
        } else {
            return res.json({
                status: false,
                message: 'Face not recognized',
                distance: bestDistance.toFixed(4),
            });
        }
    } catch (err) {
        console.error('Face verify error:', err);
        return res.status(500).json({ status: false, message: 'Server error', error: err.message });
    }
});


// router.post('/verify', async (req, res) => {
//     try {
//         const { embedding, userData } = req.body;

//         let decodedUserData = null;
//         if (userData) {
//             try {
//                 const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//                 decodedUserData = JSON.parse(decodedString);
//             } catch (error) {
//                 return res.status(400).json({ status: false, error: 'Invalid userData format' });
//             }
//         }
//         if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//             return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//         }

//         // if (!embedding) {
//         //     return res.status(400).json({ status: false, message: 'Missing embedding data' });
//         // }

//         // let embeddingNew = Array.isArray(embedding) ? embedding : JSON.parse(embedding);


//         // Fetch all stored embeddings
//         const [rows] = await db.promise().query(
//             'SELECT employee_id, embeddings FROM face_auth WHERE face_authentication = 1 and company_id = ? and employee_id=7',
//             [decodedUserData.company_id]
//         );
//         const [rowsyas] = await db.promise().query(
//             'SELECT employee_id, embeddings FROM face_auth WHERE face_authentication = 1 and company_id = ? and employee_id=8',
//             [decodedUserData.company_id]
//         );
//         let embeddingNew = JSON.parse(rowsyas[0].embeddings);

//         if (!rows || rows.length === 0) {
//             return res.json({ status: false, message: 'No registered faces in database' });
//         }

//         let bestMatch = null;
//         let bestDistance = 9999;

//         for (const row of rows) {
//             try {
//                 const dbEmbedding = JSON.parse(row.embeddings);
//                 const distance = euclideanDistance(embeddingNew, dbEmbedding);
//                 if (distance < bestDistance) {
//                     bestDistance = distance;
//                     bestMatch = row;
//                 }
//             } catch (err) {
//                 console.error('Invalid embedding for employee:', row.employee_id);
//             }
//         }

//         const threshold = 0.45; // adjust as needed

//         if (bestDistance < threshold) {
//             return res.json({
//                 status: true,
//                 message: 'Face verified successfully',
//                 match: {
//                     employee_id: bestMatch.employee_id,
//                     // distance: bestDistance.toFixed(4),
//                 },
//             });
//         } else {
//             return res.json({
//                 status: false,
//                 message: 'Face not recognized',
//                 distance: bestDistance.toFixed(4),
//             });
//         }
//     } catch (err) {
//         console.error('Face verify error:', err);
//         return res.status(500).json({ status: false, message: 'Server error', error: err.message });
//     }
// });

module.exports = router;
