const db = require("../../DB/ConnectionSql");


const leaveconversion = async (employeeId, rule_id) => {
    const [rows] = await db.promise().query(
        `SELECT count(id) as total 
        FROM attendance_leave_conversions 
        WHERE employee_id=? and  leave_rule_id=?`,
        [employeeId, rule_id]
    );

    // ✅ If converted to leave
    if (rows.length > 0) {
        return rows[0].total;
    }
    // ❌ No conversion found
    return 0;
};

module.exports = leaveconversion;



