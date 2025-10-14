const cron = require("node-cron");
// const axios = require("axios");

// Run every day at midnight (00:00)
// cron.schedule("0 0 * * *", async () => {

cron.schedule("54 16 * * *", async () => {
    try {
        console.log("Running auto leave deduction job...");

        // Call your API (internal or external)
        // const res = await axios.post("http://localhost:2200/Leave/api/auto-deduction");

        // console.log("Deduction response:", res.data);
    } catch (err) {
        console.error("Error in auto deduction:", err.message);
    }
});

// cron.schedule("10 10 * * *", async () => {
//   await axios.post("http://localhost:5000/api/check-miss-punch-in");
// });
