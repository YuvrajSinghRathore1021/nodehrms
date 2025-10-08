const express = require("express");
const router = express.Router();
const admin = require("./firebase");
// POST /send-notification

// const CHANNEL_GROUPS = [
//     { id: 'default', name: 'Default Group' },
//     { id: 'missed_punch', name: 'Missed Punch Alerts' },
//     { id: 'chat_message', name: 'Chat Messages' },
//     { id: 'recent_posts', name: 'Recent Posts' },
//     { id: 'warnings', name: 'Warning Notices' },
//     { id: 'updates', name: 'System Updates' },
//     { id: 'recent_notifications', name: 'General Notifications' },
// ];


router.post("/send-notification", async (req, res) => {
    try {
        const { fcmToken, title, body, image, type } = req.body;

        const message = {
            notification: {
                title: title || "Default Title",
                body: body || "Default message",
                image: image || undefined,
            },
            token: fcmToken,
            data: {
                type: type || "default", // your custom type
            },
            android: {
                notification: {
                    sound: "default" // plays default sound on Android
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default" // plays default sound on iOS
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log("Notification sent successfully:", response);

        res.json({ success: true, messageId: response });
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});















// router.post("/send-notification", async (req, res) => {
//     try {
//         const { fcmToken, title, body, image, data, androidOptions, apnsOptions, webpushOptions } = req.body;

//         const message = {
//             notification: {
//                 title: title || "Default Title",
//                 body: body || "Default message",
//                 image: image || undefined,
//             },
//             token: fcmToken,
//             // Optional additional options
//             data: data || {}, // key-value pairs for custom data
//             android: androidOptions || {}, // e.g., { ttl: 3600 * 1000, priority: "high" }
//             apns: apnsOptions || {},       // e.g., { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default" } } }
//             webpush: webpushOptions || {}, // e.g., { headers: { TTL: "3600" }, notification: { icon: "/icon.png" } }
//         };

//         const response = await admin.messaging().send(message);
//         console.log("Notification sent successfully:", response);

//         res.json({ success: true, messageId: response });
//     } catch (error) {
//         console.error("Error sending notification:", error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });

// {
//   "fcmToken": "<device-token>",
//   "title": "Hello",
//   "body": "This is a test notification",
//   "image": "https://example.com/image.png",
//   "data": {
//     "key1": "value1",
//     "key2": "value2"
//   },
//   "androidOptions": {
//     "priority": "high",
//     "ttl": 3600000
//   },
//   "apnsOptions": {
//     "headers": { "apns-priority": "10" },
//     "payload": { "aps": { "sound": "default" } }
//   }
// }

module.exports = router;


