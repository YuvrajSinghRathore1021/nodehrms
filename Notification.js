const db = require('./DB/ConnectionSql');

module.exports = {
    sendNotification: function ({
        company_id, sender_id, receiver_id, page_url, img_url, title, message, notification_type
    }) {
        return new Promise((resolve, reject) => {
            // Validate required fields
            if (!receiver_id || !title || !message) {
                return reject(new Error('Missing required notification fields'));
            }

            db.query(`INSERT INTO notifications(company_id, sender_id, receiver_id, page_url, img_url, 
                title, message, is_read, notification_type) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
                [company_id || null, sender_id || null, receiver_id, page_url || null, img_url || null, title, message, notification_type || 'general'],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result.insertId);
                }
            );
        });
    },

    // Get notifications for user
    getUserNotifications: function (userId) {
        return new Promise((resolve, reject) => {
            db.query(
                `SELECT * FROM notifications 
         WHERE receiver_id = ? 
         ORDER BY created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    // Mark notification as read
    markAsRead: function (notificationId) {
        return new Promise((resolve, reject) => {
            db.query(
                `UPDATE notifications SET is_read = 1 WHERE id = ?`,
                [notificationId],
                (err) => {
                    if (err) return reject(err);
                    resolve(true);
                }
            );
        });
    },

    // Get unread count
    getUnreadCount: function (userId) {
        return new Promise((resolve, reject) => {
            db.query(
                `SELECT COUNT(*) AS count FROM notifications 
         WHERE receiver_id = ? AND is_read = 0`,
                [userId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows[0].count);
                }
            );
        });
    }
};

