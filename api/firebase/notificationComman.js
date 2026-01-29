// await sendNotification({
//     employeeIds: [1, 2, 3],
//     title: "New Message",
//     body: "You have a new notification",
//     type: "chat_message",
//     screen: "ChatScreen",
//     chatId: 99
// });

const admin = require("./firebase");
const db = require('../../DB/ConnectionSql');

const sendNotification = async ({
    title = "Default Title",
    body = "Default message",
    image,
    type = "default",
    screen = "",
    chatId = 0,
    employeeIds = []///[1,2,3]
}) => {
    if (!employeeIds || employeeIds.length === 0) {
        throw new Error("employeeIds required");
    }

    // 🔹 Get all FCM tokens
    const [employees] = await db.promise().query(
        `SELECT fcm_token  FROM employees  WHERE id IN (?)    AND fcm_token IS NOT NULL    AND fcm_token != ''`, [employeeIds]
    );

    if (!employees.length) {
        return {
            success: false,
            message: "No FCM tokens found"
        };
    }

    const tokens = employees.map(e => e.fcm_token);

    const message = {
        tokens, // 👈 MULTIPLE TOKENS
        notification: {
            title,
            body,
            ...(image && { image })
        },
        data: {
            type,
            screen,
            chatId: String(chatId)
        },
        android: {
            notification: {
                sound: "default"
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: "default"
                }
            }
        }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
    };
};

module.exports = { sendNotification };


