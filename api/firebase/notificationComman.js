

const admin = require("./firebase");
const db = require("../../DB/ConnectionSql");

/**
 * Send FCM notification to employees
 */


const sendNotification = async ({
    employeeIds = [],
    title = "Notification",
    date = "",
    notificationType,
    type = "default",
    image = "",
    screen = "",
    chatId = 0, body = "",
}) => {

    // -----------------------------
    // ✅ Normalize employeeIds
    // -----------------------------
    if (typeof employeeIds === "string") {
        employeeIds = employeeIds.split(",").map(id => Number(id));
    }

    if (typeof employeeIds === "number") {
        employeeIds = [employeeIds];
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        throw new Error("employeeIds required");
    }

    // -----------------------------
    // ✅ Notification bodyNew by type
    // -----------------------------
    let bodyNew = body ? body : "You have a new notification";
    if (body == "") {
        switch (notificationType) {
            case "attendance_requests":
                bodyNew = `New attendance request${date ? ` for ${date}` : ""}`;
                break;

            case "leave_requests":
                bodyNew = `New leave request${date ? ` from ${date}` : ""}`;
                break;

            case "attendance_approval":
                bodyNew = `Your attendance has been approved${date ? ` for ${date}` : ""}`;
                break;

            case "leave_approval":
                bodyNew = `Your leave has been approved`;
                break;

            case "task_assigned":
                bodyNew = `A new task has been assigned to you`;
                break;

            case "task_updated":
                bodyNew = `Your task has been updated`;
                break;

            case "general_notification":
                bodyNew = title;
                break;

            default:
                bodyNew = title;
        }
    }

    // -----------------------------
    // ✅ Fetch FCM tokens
    // -----------------------------
    const [employees] = await db.promise().query(
        `SELECT fcm_token 
         FROM employees 
         WHERE id IN (?) 
         AND fcm_token IS NOT NULL 
         AND fcm_token != ''`,
        [employeeIds]
    );

    if (!employees.length) {
        return {
            success: false,
            message: "No FCM tokens found"
        };
    }

    const tokens = employees.map(e => e.fcm_token);

    // -----------------------------
    // ✅ FCM Payload
    // -----------------------------
    const message = {
        tokens,
        notification: {
            title,
            body: bodyNew,
            ...(image && { image })
        },
        data: {
            type: String(type),
            screen: String(screen),
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

    // -----------------------------
    // ✅ Send Notification
    // -----------------------------
    const response = await admin.messaging().sendEachForMulticast(message);

    return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
    };
};

module.exports = { sendNotification };
