// **Helper Function to Calculate Leave Days Properly**
function calculateLeaveDays(startDate, endDate, startHalf, endHalf) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = (end - start) / (1000 * 60 * 60 * 24) + 1;

    if (startHalf === "Second Half") {
        totalDays -= 0.5; // Deduct 0.5 day for second half leave start
    }
    if (endHalf === "First Half") {
        totalDays -= 0.5; // Deduct 0.5 day for first half leave end
    }

    return totalDays;
}

module.exports = calculateLeaveDays;