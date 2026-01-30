////////////firebasenotification.js
const express = require("express");
const router = express.Router();
const admin = require("./firebase");
const { sendNotification } = require('./notificationComman');


// const CHANNEL_GROUPS = [
//     { id: 'default', name: 'Default Group' },
//     { id: 'missed_punch', name: 'Missed Punch Alerts' },
//     { id: 'chat_message', name: 'Chat Messages' },
//     { id: 'recent_posts', name: 'Recent Posts' },
//     { id: 'warnings', name: 'Warning Notices' },
//     { id: 'updates', name: 'System Updates' },
//     { id: 'recent_notifications', name: 'General Notifications' },
// ];


// router.post("/send-notification", async (req, res) => {

//     try {
//         const { fcmToken, title, body, image, type, screen = "", chatId = 0 } = req.body;
//         const message = {
//             notification: {
//                 title: title || "Default Title",
//                 body: body || "Default message",
//                 image: image || undefined,
//             },
//             token: fcmToken,
//             data: {
//                 type: type || "default",
//                 screen: screen,
//                 chatId: chatId
//             },
//             android: {
//                 notification: {
//                     sound: "default"
//                 }
//             },
//             apns: {
//                 payload: {
//                     aps: {
//                         sound: "default"
//                     }
//                 }
//             }
//         };

//         const response = await admin.messaging().send(message);
//         res.json({ success: true, messageId: response });
//     } catch (error) {
//         console.error("Error sending notification:", error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });



router.post("/send-notification", async (req, res) => {

    try {
        const { employeeId, type, count } = req.body;
        // let newTitle = count + "Attendance Requests Pending Approval on Your End";
        let newTitle = `${count} Attendance Requests Pending Approval on Your End`;

        let response = await sendNotification({
            employeeIds: employeeId ? [employeeId] : [],
            title: newTitle,
            date: "",
            notificationType: "attendance_requests",
            type: "recent_notifications",
        });

        if (response.success) {
            res.json({ status: true, message: "Notification sent", data: response });
        } else {
            res.status(500).json({ status: false, error: response.error });
        }

    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ status: false, error: error.message });
    }
});



module.exports = router;


