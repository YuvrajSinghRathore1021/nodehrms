const express = require("express");
const router = express.Router();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const db = require('../../../DB/ConnectionSql');

const serverAddress = "http://localhost:2100";
// Serve static files (e.g., fonts)
router.use('/static', express.static(path.join(__dirname, '../../../public')));

router.post('/api/MakePdf', async (req, res) => {
    try {
        const { userData, type, month, year } = req.body;

        let decodedUserData = null;
        if (userData) {
            try {
                const decodedString = Buffer.from(userData, "base64").toString("utf-8");
                decodedUserData = JSON.parse(decodedString);
            } catch (error) {
                return res.status(400).json({ status: false, error: "Invalid userData", message: "Invalid userData" });
            }
        }

        if (!decodedUserData || !decodedUserData.company_id) {
            return res.status(400).json({ status: false, error: "ID is required", message: "ID is required" });
        }
        const company_id = decodedUserData.company_id;
        if (!type || !month || !year) {
            return res.status(400).json({ status: false, error: "Type, month, and year are required", message: "Type, month, and year are required" });
        }

        const [salaryslip] = await db.promise().query("SELECT id, company_id, leave_type, description, leaves_allowed_year, weekends_leave, holidays_leave, creditable, accrual_frequency, accrual_period, under_probation, notice_period, encash_enabled, carry_forward, remaining_leaves, max_leaves_month, continuous_leaves, negative_leaves, future_dated_leaves, future_dated_leaves_after, backdated_leaves, backdated_leaves_up_to, apply_leaves_next_year FROM leave_rules WHERE id = ?", [leave_type]);


        // Start Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Create HTML Content with dynamic user data
        const htmlContent = ` 
            <!DOCTYPE html>
            <html lang="en">

            <head>
                <style>
                    @font-face {
                        font-family: 'Poppins';
                        src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Regular.ttf') format('truetype');
                        font-weight: 400;
                        font-style: normal;
                    }

                    @font-face {
                        font-family: 'PoppinsMedium';
                        src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Medium.ttf') format('truetype');
                        font-weight: 600;
                        font-style: normal;
                    }

                    html {
                        -webkit-print-color-adjust: exact;
                    }

                    body {
                        background-color: #f3f4f6;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }

                    .poppins-regular {
                        font-family: "Poppins", sans-serif;
                        font-weight: 400;
                        font-style: normal;
                    }

                    .poppins-medium {
                        font-family: "PoppinsMedium", sans-serif;
                        font-weight: 600;
                    }

                    .poppins-bold {
                        font-family: "Poppins", sans-serif;
                        font-weight: 700;
                        font-style: normal;
                    }

                    .poppins-black {
                        font-family: "Poppins", sans-serif;
                        font-weight: 900;
                        font-style: normal;
                    }


                    .payslip-container {
                        background-color: white;
                        border-radius: 0.5rem;
                        width: 100%;
                        background-image: url("${serverAddress}/uploads/logo/bg.png");
                    }

                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .title {
                        font-size: 1.875rem;
                        font-weight: bold;
                        color: #1f2937;
                    }

                    .logo {
                        height: 3rem;
                    }

                    .employee-info {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 2rem;
                        padding-left: 40px;
                        padding-right: 40px;
                        margin-top: 30px;
                    }

                    .employee-details p {
                        margin: 0.25rem 0;
                    }

                    .employee-name {
                        color: #293646;
                    }

                    .payroll-info p {
                        margin: 0.25rem 0;
                    }

                    .info-label {
                        color: #293646;
                    }

                    ul {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        border-radius: 0.5rem;
                        overflow: hidden;
                        border-left: 1px solid #CA282C;
                        border-right: 1px solid #CA282C;
                        ;
                        margin-bottom: 2rem;
                    }

                    ul li {
                        display: flex;
                        padding: 15px;
                        padding-left: 15px;
                        padding-right: 15px;
                    }

                    ul li.header {
                        background-color: #CA282C;
                        color: white;
                    }

                    ul li:not(.header):not(:last-child) {
                        border-bottom: 1px solid #e5e7eb;
                    }

                    ul li span {
                        flex: 1;
                    }

                    ul li span:first-child {
                        flex: 2;
                    }

                    .signature {
                        color: #1f2937;
                        margin-top: 2rem;
                        padding-left: 40px;
                        margin-top: 200px;
                    }

                    .bold {
                        font-weight: bold;
                    }

                    h2 {
                        margin: 0;
                    }
                </style>
            </head>

            <body>
                <div class="payslip-container">
                    <div style="display: flex; justify-content: space-between; align-items: center;height: 50px;gap: 60px;">
                        <div
                            style="background-color: #CA282C; clip-path: polygon(0 0, 82% 0, 100% 100%, 0 100%); width: 100%; height: 50px;">
                        </div>
                        <div style="width: 100%; display: flex; align-items: center; justify-content: center;">
                            <h2 style="padding-right: 40px;">company</h2>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;height: 80px;margin-top: 20px;">
                        <div style="width: 100%; display: flex; align-items: center; ">
                            <h1 class="poppins-medium" style="padding-left: 40px; margin:0px;color: #293646; letter-spacing: 5px;">
                                PAYSLIP</h1>
                        </div>
                        <div style="background-color: #CA282C;clip-path: polygon(0 0, 100% 0, 100% 100%, 25% 100%);
                        width: 100%; height: 80px;">
                        </div>
                    </div>

                    <div class="employee-info">
                        <div class="employee-details">
                            <p class="employee-name  poppins-medium">Yashveer Soni</p>
                            <p class="poppins-regular" style="font-size: 14px; color: #45484D;">182/20 Sector 20 <br>Pratap Nagar,
                                Jaipur</br></p>
                            <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Phone: +91 1234567890</p>
                            <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Email: admin@gmail.com</p>
                        </div>
                        <div class="payroll-info poppins-regular">
                            <p style="display: flex; gap: 50px;align-items: center; color: #45484D;"><span
                                    class="info-label poppins-medium">Payroll#</span> 123456789</p>
                            <p style="display: flex; gap: 50px;align-items: center;color: #45484D;"><span
                                    class="info-label poppins-medium">Pay Date</span> 25/10/2025</p>
                            <p style="display: flex; gap: 50px;align-items: center; color: #45484D;"><span
                                    class="info-label poppins-medium">Pay Type</span> Weekly</p>
                        </div>
                    </div>

                    <!-- EARNINGS Section -->
                    <div style="padding-right: 40px; padding-left: 40px; margin-top: 80px;">
                        <ul class="poppins-medium">
                            <li class="header ">
                                <span>EARNINGS</span>
                                <span>HOURS</span>
                                <span>RATE</span>
                                <span>CURRENT</span>
                                <span>YTD</span>
                            </li>
                            <li>
                                <span style="color: #293646;">Standard Pay</span>
                                <span class="poppins-regular" style="color: #293646;">10</span>
                                <span class="poppins-regular" style="color: #293646;">1205</span>
                                <span class="poppins-regular" style="color: #293646;">500.00</span>
                                <span class="poppins-regular" style="color: #293646;">500.00</span>
                            </li>
                            <li>
                                <span style="color: #293646;">Overtime Pay</span>
                                <span class="poppins-regular" style="color: #293646;">5</span>
                                <span class="poppins-regular" style="color: #293646;">102</span>
                                <span class="poppins-regular" style="color: #293646;">250.00</span>
                                <span class="poppins-regular" style="color: #293646;">120.00</span>
                            </li>
                            <li>
                                <span style="color: #293646;">Holiday Pay</span>
                                <span class="poppins-regular" style="color: #293646;">8</span>
                                <span class="poppins-regular" style="color: #293646;">500</span>
                                <span class="poppins-regular" style="color: #293646;">400.00</span>
                                <span class="poppins-regular" style="color: #293646;">20.00</span>
                            </li>
                            <li style="background-color: #CA282C; color: white;">
                                <span>GROSS PAY</span>
                                <span></span>
                                <span></span>
                                <span class="poppins-regular">$5000.00</span>
                                <span class="poppins-regular">$200.00</span>
                            </li>
                        </ul>
                    </div>

                    <!-- DEDUCTIONS Section -->
                    <div style="padding-right: 40px; padding-left: 40px;">
                        <ul class="poppins-medium">
                            <li class="header poppins-medium">
                                <span>DEDUCTIONS</span>
                                <span>CURRENT</span>
                                <span>YTD</span>
                            </li>
                            <li>
                                <span class="poppins-medium" style="color: #293646;">PAYE Tax</span>
                                <span class="poppins-regular" style="color: #293646;">500.00</span>
                                <span class="poppins-regular" style="color: #293646;">500.00</span>
                            </li>
                            <li>
                                <span class="poppins-medium" style="color: #293646;">National Insurance</span>
                                <span class="poppins-regular" style="color: #293646;">250.00</span>
                                <span class="poppins-regular" style="color: #293646;">120.00</span>
                            </li>
                            <li>
                                <span class="poppins-medium" style="color: #293646;">Student Loan Repayment</span>
                                <span class="poppins-regular" style="color: #293646;">400.00</span>
                                <span class="poppins-regular" style="color: #293646;">20.00</span>
                            </li>
                            <li style="background-color: #CA282C; color: white;">
                                <span>TOTAL DEDUCTIONS</span>
                                <span>$5000.00</span>
                                <span>$200.00</span>
                            </li>
                        </ul>
                    </div>

                    <div style="display: flex; justify-content: flex-end;padding-right: 40px;">
                        <div class="poppins-medium"
                            style="background-color: #CA282C;color: white;padding:15px 20px 15px 20px; border-top-left-radius: 20px;border-bottom-right-radius: 20px;gap: 40px; display: flex;">
                            <span>NET PAY</span>
                            <span></span>
                            <span>$5000.00</span>
                            <span>$5000.00</span>
                        </div>
                    </div>

                    <div class="signature">
                        <div style="width: 100px;">
                            <div style="width: 100%; height: 1px; background-color: #E2E2E2;"></div>
                            <p class="poppins-medium" style="text-align: center; margin-top:10px;color: #293646;">Signature</p>
                        </div>
                    </div>
                    <div style="padding-right: 40px; padding-left: 40px;">
                        Account details in this payslip are fictitious and for demonstration purposes only.

                    </div>

                    <div style="height:20px;width: 100%; background-color: #CA282C;">

                    </div>
              </body>
            </html>`;

        // Set HTML content to Puppeteer
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

        // Generate PDF
        const pdfBuffer = await page.pdf({ format: "A4" });

        await browser.close();

        // Define the public directory and ensure it exists
        const publicDir = path.join(__dirname, "../../../uploads/salaryslip/pdf");
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // Save PDF locally
        const fileName = `User_Report_${Date.now()}.pdf`;
        const filePath = path.join(publicDir, fileName);

        fs.writeFileSync(filePath, pdfBuffer);

        // Return the file URL
        const fileUrl = `${serverAddress}/uploads/salaryslip/pdf/${fileName}`;
        res.status(200).json({
            status: true,
            message: "PDF generated and saved locally",
            url: fileUrl
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ status: false, message: "Error generating PDF" });
    }
});


router.get('/api/HtmlViewNew', async (req, res) => {
    const htmlContent = ` <!DOCTYPE html>
    <html lang="en">
    <head>

    <title>Payslip</title>

  
        <style>
      @font-face {
            font-family: 'Poppins';
            src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Regular.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
        }

        @font-face {
            font-family: 'PoppinsMedium';
            src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Medium.ttf') format('truetype');
            font-weight: 600;
            font-style: normal;
        }
        html {
      -webkit-print-color-adjust: exact;
    }
            body {
                background-color: #f3f4f6;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
            }
    
            .poppins-regular {
                font-family: "Poppins", sans-serif;
                font-weight: 400;
                font-style: normal;
            }
    
            .poppins-medium {
                font-family: "PoppinsMedium", sans-serif;
                font-weight: 600;
                font-style: normal;
            }
    
            .poppins-bold {
                font-family: "Poppins", sans-serif;
                font-weight: 700;
                font-style: normal;
            }
    
            .poppins-black {
                font-family: "Poppins", sans-serif;
                font-weight: 900;
                font-style: normal;
            }
    
    
            .payslip-container {
                background-color: white;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border-radius: 0.5rem;
                width: 100%;
                max-width: 56rem;
                background-image: url("/uploads/logo/bg.png");
            }
    
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
    
            .title {
                font-size: 1.875rem;
                font-weight: bold;
                color: #1f2937;
            }
    
            .logo {
                height: 3rem;
            }
    
            .employee-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-left: 40px;
                padding-right: 40px;
                margin-top: 30px;
            }
    
            .employee-details p {
                margin: 0.25rem 0;
            }
    
            .employee-name {
                color: #293646;
            }
    
            .payroll-info p {
                margin: 0.25rem 0;
            }
    
            .info-label {
                color: #293646;
            }
    
            ul {
                list-style: none;
                padding: 0;
                margin: 0;
                border-radius: 0.5rem;
                overflow: hidden;
                border-left: 1px solid #CA282C;
                border-right: 1px solid #CA282C;
                ;
                margin-bottom: 2rem;
            }
    
            ul li {
                display: flex;
                padding: 15px;
                padding-left: 15px;
                padding-right: 15px;
            }
    
            ul li.header {
                background-color: #CA282C;
                color: white;
            }
    
            ul li:not(.header):not(:last-child) {
                border-bottom: 1px solid #e5e7eb;
            }
    
            ul li span {
                flex: 1;
            }
    
            ul li span:first-child {
                flex: 2;
            }
    
            .signature {
                color: #1f2937;
                margin-top: 2rem;
                padding-left: 40px;
                margin-top: 200px;
            }
    
            .bold {
                font-weight: bold;
            }
    
            h2 {
                margin: 0;
            }
        </style>
    </head>
    
    <body>
        <div class="payslip-container">
            <div style="display: flex; justify-content: space-between; align-items: center;height: 50px;gap: 60px;">
                <div
                    style="background-color: #CA282C; clip-path: polygon(0 0, 82% 0, 100% 100%, 0 100%); width: 100%; height: 50px;">
                </div>
                <div style="width: 100%; display: flex; align-items: center; justify-content: center;">
                    <h2 style="padding-right: 40px;">company</h2>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;height: 80px;margin-top: 20px;">
                <div style="width: 100%; display: flex; align-items: center; ">
                    <h1 class="poppins-medium" style="padding-left: 40px; margin:0px;color: #293646; letter-spacing: 5px;">
                        PAYSLIP</h1>
                </div>
                <div style="background-color: #CA282C;clip-path: polygon(0 0, 100% 0, 100% 100%, 25% 100%);
                 width: 100%; height: 80px;">
                </div>
            </div>
    
            <div class="employee-info">
                <div class="employee-details">
                    <p class="employee-name  poppins-medium">Yashveer Soni</p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">182/20 Sector 20 <br>Pratap Nagar,
                        Jaipur</br></p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Phone: +91 1234567890</p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Email: admin@gmail.com</p>
                </div>
                <div class="payroll-info poppins-regular">
                    <p style="display: flex; gap: 50px;align-items: center; color: #45484D;"><span
                            class="info-label poppins-medium">Payroll#</span> 123456789</p>
                    <p style="display: flex; gap: 50px;align-items: center;color: #45484D;"><span
                            class="info-label poppins-medium">Pay Date</span> 25/10/2025</p>
                    <p style="display: flex; gap: 50px;align-items: center; color: #45484D;"><span
                            class="info-label poppins-medium">Pay Type</span> Weekly</p>
                </div>
            </div>
    
            <!-- EARNINGS Section -->
            <div style="padding-right: 40px; padding-left: 40px; margin-top: 80px;">
                <ul class="poppins-medium">
                    <li class="header ">
                        <span>EARNINGS</span>
                        <span>HOURS</span>
                        <span>RATE</span>
                        <span>CURRENT</span>
                        <span>YTD</span>
                    </li>
                    <li>
                        <span style="color: #293646;">Standard Pay</span>
                        <span class="poppins-regular" style="color: #293646;">10</span>
                        <span class="poppins-regular" style="color: #293646;">1205</span>
                        <span class="poppins-regular" style="color: #293646;">500.00</span>
                        <span class="poppins-regular" style="color: #293646;">500.00</span>
                    </li>
                    <li>
                        <span style="color: #293646;">Overtime Pay</span>
                        <span class="poppins-regular" style="color: #293646;">5</span>
                        <span class="poppins-regular" style="color: #293646;">102</span>
                        <span class="poppins-regular" style="color: #293646;">250.00</span>
                        <span class="poppins-regular" style="color: #293646;">120.00</span>
                    </li>
                    <li>
                        <span style="color: #293646;">Holiday Pay</span>
                        <span class="poppins-regular" style="color: #293646;">8</span>
                        <span class="poppins-regular" style="color: #293646;">500</span>
                        <span class="poppins-regular" style="color: #293646;">400.00</span>
                        <span class="poppins-regular" style="color: #293646;">20.00</span>
                    </li>
                    <li style="background-color: #CA282C; color: white;">
                        <span>GROSS PAY</span>
                        <span></span>
                        <span></span>
                        <span class="poppins-regular">$5000.00</span>
                        <span class="poppins-regular">$200.00</span>
                    </li>
                </ul>
            </div>
    
            
            <div style="display: flex; justify-content: flex-end;padding-right: 40px;">
                <div class="poppins-medium"
                    style="background-color: #CA282C;color: white;padding:15px 20px 15px 20px; border-top-left-radius: 20px;border-bottom-right-radius: 20px;gap: 40px; display: flex;">
                    <span>NET PAY</span>
                    <span></span>
                    <span>$5000.00</span>
                    <span>$5000.00</span>
                </div>
            </div>
    
            <div class="signature">
                <div style="width: 100px;">
                    <div style="width: 100%; height: 1px; background-color: #E2E2E2;"></div>
                    <p class="poppins-medium" style="text-align: center; margin-top:10px;color: #293646;">Signature</p>
                </div>
            </div>
            <div style="padding-right: 40px; padding-left: 40px;">
                Account details in this payslip are fictitious and for demonstration purposes only.
    
            </div>
    
            <div style="height:20px;width: 100%; background-color: #CA282C;">
    
            </div>
    </body>
    
    </html>`;
    return res.status(200).send(htmlContent);
});

router.get('/api/HtmlView', async (req, res) => {
    const htmlContent = ` <!DOCTYPE html>
    <html lang="en">
    <head>

    <title>Payslip</title>

  
        <style>
      @font-face {
            font-family: 'Poppins';
            src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Regular.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
        }

        @font-face {
            font-family: 'PoppinsMedium';
            src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Medium.ttf') format('truetype');
            font-weight: 600;
            font-style: normal;
        }
        html {
      -webkit-print-color-adjust: exact;
    }
            body {
                background-color: #f3f4f6;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
            }
    
            .poppins-regular {
                font-family: "Poppins", sans-serif;
                font-weight: 400;
                font-style: normal;
            }
    
            .poppins-medium {
                font-family: "PoppinsMedium", sans-serif;
                font-weight: 600;
                font-style: normal;
            }
    
            .poppins-bold {
                font-family: "Poppins", sans-serif;
                font-weight: 700;
                font-style: normal;
            }
    
            .poppins-black {
                font-family: "Poppins", sans-serif;
                font-weight: 900;
                font-style: normal;
            }
    
    
            .payslip-container {
                background-color: white;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border-radius: 0.5rem;
                width: 100%;
                max-width: 56rem;
                background-image: url("/uploads/logo/bg.png");
            }
    
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
    
            .title {
                font-size: 1.875rem;
                font-weight: bold;
                color: #1f2937;
            }
    
            .logo {
                height: 3rem;
            }
    
            .employee-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-left: 40px;
                padding-right: 40px;
                margin-top: 30px;
            }
    
            .employee-details p {
                margin: 0.25rem 0;
            }
    
            .employee-name {
                color: #293646;
            }
    
            .payroll-info p {
                margin: 0.25rem 0;
            }
    
            .info-label {
                color: #293646;
            }
    
            ul {
                list-style: none;
                padding: 0;
                margin: 0;
                border-radius: 0.5rem;
                overflow: hidden;
                border-left: 1px solid #CA282C;
                border-right: 1px solid #CA282C;
                ;
                margin-bottom: 2rem;
            }
    
            ul li {
                display: flex;
                padding: 15px;
                padding-left: 15px;
                padding-right: 15px;
            }
    
            ul li.header {
                background-color: #CA282C;
                color: white;
            }
    
            ul li:not(.header):not(:last-child) {
                border-bottom: 1px solid #e5e7eb;
            }
    
            ul li span {
                flex: 1;
            }
    
            ul li span:first-child {
                flex: 2;
            }
    
            .signature {
                color: #1f2937;
                margin-top: 2rem;
                padding-left: 40px;
                margin-top: 200px;
            }
    
            .bold {
                font-weight: bold;
            }
    
            h2 {
                margin: 0;
            }
        </style>
    </head>
    
    <body>
        <div class="payslip-container">
            <div style="display: flex; justify-content: space-between; align-items: center;height: 50px;gap: 60px;">
                <div
                    style="background-color: #CA282C; clip-path: polygon(0 0, 82% 0, 100% 100%, 0 100%); width: 100%; height: 50px;">
                </div>
                <div style="width: 100%; display: flex; align-items: center; justify-content: center;">
                    <h2 style="padding-right: 40px;">company</h2>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;height: 80px;margin-top: 20px;">
                <div style="width: 100%; display: flex; align-items: center; ">
                    <h1 class="poppins-medium" style="padding-left: 40px; margin:0px;color: #293646; letter-spacing: 5px;">
                        PAYSLIP</h1>
                </div>
                <div style="background-color: #CA282C;clip-path: polygon(0 0, 100% 0, 100% 100%, 25% 100%);
                 width: 100%; height: 80px;">
                </div>
            </div>
    
            <div class="employee-info">
                <div class="employee-details">
                    <p class="employee-name  poppins-medium">Yashveer Soni</p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">182/20 Sector 20 <br>Pratap Nagar,
                        Jaipur</br></p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Phone: +91 1234567890</p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Email: admin@gmail.com</p>
                </div>
                <div class="payroll-info poppins-regular">
                    <p style="display: flex; gap: 50px;align-items: center; color: #45484D;"><span
                            class="info-label poppins-medium">Payroll#</span> 123456789</p>
                    <p style="display: flex; gap: 50px;align-items: center;color: #45484D;"><span
                            class="info-label poppins-medium">Pay Date</span> 25/10/2025</p>
                    <p style="display: flex; gap: 50px;align-items: center; color: #45484D;"><span
                            class="info-label poppins-medium">Pay Type</span> Weekly</p>
                </div>
            </div>
    
            <!-- EARNINGS Section -->
            <div style="padding-right: 40px; padding-left: 40px; margin-top: 80px;">
                <ul class="poppins-medium">
                    <li class="header ">
                        <span>EARNINGS</span>
                        <span>HOURS</span>
                        <span>RATE</span>
                        <span>CURRENT</span>
                        <span>YTD</span>
                    </li>
                    <li>
                        <span style="color: #293646;">Standard Pay</span>
                        <span class="poppins-regular" style="color: #293646;">10</span>
                        <span class="poppins-regular" style="color: #293646;">1205</span>
                        <span class="poppins-regular" style="color: #293646;">500.00</span>
                        <span class="poppins-regular" style="color: #293646;">500.00</span>
                    </li>
                    <li>
                        <span style="color: #293646;">Overtime Pay</span>
                        <span class="poppins-regular" style="color: #293646;">5</span>
                        <span class="poppins-regular" style="color: #293646;">102</span>
                        <span class="poppins-regular" style="color: #293646;">250.00</span>
                        <span class="poppins-regular" style="color: #293646;">120.00</span>
                    </li>
                    <li>
                        <span style="color: #293646;">Holiday Pay</span>
                        <span class="poppins-regular" style="color: #293646;">8</span>
                        <span class="poppins-regular" style="color: #293646;">500</span>
                        <span class="poppins-regular" style="color: #293646;">400.00</span>
                        <span class="poppins-regular" style="color: #293646;">20.00</span>
                    </li>
                    <li style="background-color: #CA282C; color: white;">
                        <span>GROSS PAY</span>
                        <span></span>
                        <span></span>
                        <span class="poppins-regular">$5000.00</span>
                        <span class="poppins-regular">$200.00</span>
                    </li>
                </ul>
            </div>
    
            <!-- DEDUCTIONS Section -->
            <div style="padding-right: 40px; padding-left: 40px;">
                <ul class="poppins-medium">
                    <li class="header poppins-medium">
                        <span>DEDUCTIONS</span>
                        <span>CURRENT</span>
                        <span>YTD</span>
                    </li>
                    <li>
                        <span class="poppins-medium" style="color: #293646;">PAYE Tax</span>
                        <span class="poppins-regular" style="color: #293646;">500.00</span>
                        <span class="poppins-regular" style="color: #293646;">500.00</span>
                    </li>
                    <li>
                        <span class="poppins-medium" style="color: #293646;">National Insurance</span>
                        <span class="poppins-regular" style="color: #293646;">250.00</span>
                        <span class="poppins-regular" style="color: #293646;">120.00</span>
                    </li>
                    <li>
                        <span class="poppins-medium" style="color: #293646;">Student Loan Repayment</span>
                        <span class="poppins-regular" style="color: #293646;">400.00</span>
                        <span class="poppins-regular" style="color: #293646;">20.00</span>
                    </li>
                    <li style="background-color: #CA282C; color: white;">
                        <span>TOTAL DEDUCTIONS</span>
                        <span>$5000.00</span>
                        <span>$200.00</span>
                    </li>
                </ul>
            </div>
    
            <div style="display: flex; justify-content: flex-end;padding-right: 40px;">
                <div class="poppins-medium"
                    style="background-color: #CA282C;color: white;padding:15px 20px 15px 20px; border-top-left-radius: 20px;border-bottom-right-radius: 20px;gap: 40px; display: flex;">
                    <span>NET PAY</span>
                    <span></span>
                    <span>$5000.00</span>
                    <span>$5000.00</span>
                </div>
            </div>
    
            <div class="signature">
                <div style="width: 100px;">
                    <div style="width: 100%; height: 1px; background-color: #E2E2E2;"></div>
                    <p class="poppins-medium" style="text-align: center; margin-top:10px;color: #293646;">Signature</p>
                </div>
            </div>
            <div style="padding-right: 40px; padding-left: 40px;">
                Account details in this payslip are fictitious and for demonstration purposes only.
    
            </div>
    
            <div style="height:20px;width: 100%; background-color: #CA282C;">
    
            </div>
    </body>
    
    </html>`;
    return res.status(200).send(htmlContent);
});



// new work 

router.post('/api/data', async (req, res) => {
    try {
        const { userData, month, year } = req.body;

        /* =======================
           1️⃣ Decode User
        ======================= */
        if (!userData) {
            return res.status(400).json({
                status: false,
                message: 'userData is required'
            });
        }

        let decodedUserData = null;

        if (userData) {
            try {
                const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
                decodedUserData = JSON.parse(decodedString);
            } catch (error) {
                return res.status(400).json({ status: false, error: 'Invalid userData format' });
            }
        }

        if (!decodedUserData?.id || !decodedUserData?.company_id) {
            return res.status(400).json({
                status: false,
                message: 'Invalid userData'
            });
        }

        const employeeId = decodedUserData.id;
        const companyId = decodedUserData.company_id;

        if (!month || !year) {
            return res.status(400).json({
                status: false,
                message: 'Month and year are required'
            });
        }

        /* =======================
           2️⃣ Fetch Salary Slip Data
        ======================= */
        const [rows] = await db.promise().query(
            `
      SELECT 
        esd.id AS salary_id,
        esd.month,
        esd.year,
        esd.present_days,
        esd.working_days,
        esd.basic_pay_amount,
        esd.total_monthly_salary,

        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.official_email_id,
        e.structure_id,

        c.company_name,
        c.logo,
        c.address,

        sc.component_name,
        sc.amount,
        scomp.component_type

      FROM employeesalarydetails esd
      JOIN employees e 
        ON e.id = esd.employee_id

      JOIN companies c 
        ON c.id = esd.company_id

      JOIN salarycomponents sc 
        ON sc.salary_detail_id = esd.id

      JOIN salary_component scomp 
        ON scomp.component_name = sc.component_name
        AND scomp.structure_id = e.structure_id

      WHERE esd.employee_id = ?
        AND esd.company_id = ?
        AND esd.month = ?
        AND esd.year = ?
      `,
            [employeeId, companyId, month, year]
        );

        if (!rows.length) {
            return res.status(404).json({
                status: false,
                message: 'Salary slip not found'
            });
        }

        /* =======================
           3️⃣ Format Response
        ======================= */
        const earnings = [];
        const deductions = [];

        rows.forEach(row => {
            if (row.component_type == 'expand') {
                earnings.push({
                    name: row.component_name,
                    amount: Number(row.amount)
                });
            } else {
                deductions.push({
                    name: row.component_name,
                    amount: Number(row.amount)
                });
            }
        });

        const firstRow = rows[0];

        const response = {
            company: {
                name: firstRow.company_name,
                logo: firstRow.logo,
                address: firstRow.address
            },
            employee: {
                name: firstRow.employee_name,
                employee_id: firstRow.employee_id,
                email: firstRow.official_email_id
            },
            salary: {
                month: firstRow.month,
                year: firstRow.year,
                working_days: firstRow.working_days,
                present_days: firstRow.present_days,
                basic_pay: firstRow.basic_pay_amount,
                net_salary: firstRow.total_monthly_salary
            },
            earnings,
            deductions
        };

        /* =======================
           4️⃣ Response
        ======================= */
        return res.status(200).json({
            status: true,
            message: 'Salary slip data fetched successfully',
            data: response
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            message: 'Database error occurred while fetching salary slip',
            error: err.message
        });
    }
});


router.get('/api/HtmlViewApi', async (req, res) => {
    try {
        // Extract parameters from query
        const { userData, month, year } = req.query;

        if (!userData || !month || !year) {
            return res.status(400).send('Missing required parameters: userData, month, year');
        }

        // Fetch dynamic data from your API
        const apiResponse = await fetch(`http://localhost:2100/PDFdow/api/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userData, month, year })
        });
        console.log('API Response Status:', apiResponse);
        if (!apiResponse.ok) {
            throw new Error('Failed to fetch salary data');
        }

        const result = await apiResponse.json();

        if (!result.status) {
            throw new Error(result.message || 'Failed to fetch salary data');
        }

        const salaryData = result.data;

        // Calculate totals
        const earningsTotal = salaryData.earnings.reduce((sum, item) => sum + (item.amount || 0), 0);
        const deductionsTotal = salaryData.deductions.reduce((sum, item) => sum + (item.amount || 0), 0);
        const netPay = earningsTotal - deductionsTotal;

        // Calculate YTD (Year-to-Date) - you might want to fetch actual YTD from database
        // For now, using the same as current for demonstration
        const earningsTotalYTD = earningsTotal;
        const deductionsTotalYTD = deductionsTotal;
        const netPayYTD = netPay;

        const htmlContent = ` <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Payslip - ${salaryData.employee.name}</title>
        <style>
            @font-face {
                font-family: 'Poppins';
                src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Regular.ttf') format('truetype');
                font-weight: 400;
                font-style: normal;
            }

            @font-face {
                font-family: 'PoppinsMedium';
                src: url('${serverAddress}/uploads/fonts/poppins/Poppins-Medium.ttf') format('truetype');
                font-weight: 600;
                font-style: normal;
            }
            
            html {
                -webkit-print-color-adjust: exact;
            }
            
            body {
                background-color: #f3f4f6;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
            }

            .poppins-regular {
                font-family: "Poppins", sans-serif;
                font-weight: 400;
                font-style: normal;
            }

            .poppins-medium {
                font-family: "PoppinsMedium", sans-serif;
                font-weight: 600;
                font-style: normal;
            }

            .poppins-bold {
                font-family: "Poppins", sans-serif;
                font-weight: 700;
                font-style: normal;
            }

            .poppins-black {
                font-family: "Poppins", sans-serif;
                font-weight: 900;
                font-style: normal;
            }

            .payslip-container {
                background-color: white;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border-radius: 0.5rem;
                width: 100%;
                max-width: 56rem;
                background-image: url("${serverAddress}/uploads/logo/bg.png");
                background-size: cover;
                background-position: center;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .title {
                font-size: 1.875rem;
                font-weight: bold;
                color: #1f2937;
            }

            .logo {
                height: 3rem;
            }

            .employee-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-left: 40px;
                padding-right: 40px;
                margin-top: 30px;
            }

            .employee-details p {
                margin: 0.25rem 0;
            }

            .employee-name {
                color: #293646;
            }

            .payroll-info p {
                margin: 0.25rem 0;
            }

            .info-label {
                color: #293646;
            }

            ul {
                list-style: none;
                padding: 0;
                margin: 0;
                border-radius: 0.5rem;
                overflow: hidden;
                border-left: 1px solid #CA282C;
                border-right: 1px solid #CA282C;
                margin-bottom: 2rem;
            }

            ul li {
                display: flex;
                padding: 15px;
                padding-left: 15px;
                padding-right: 15px;
            }

            ul li.header {
                background-color: #CA282C;
                color: white;
            }

            ul li:not(.header):not(:last-child) {
                border-bottom: 1px solid #e5e7eb;
            }

            ul li span {
                flex: 1;
            }

            ul li span:first-child {
                flex: 2;
            }

            .signature {
                color: #1f2937;
                margin-top: 2rem;
                padding-left: 40px;
                margin-top: 200px;
            }

            .bold {
                font-weight: bold;
            }

            h2 {
                margin: 0;
            }
            
            .amount {
                text-align: right;
            }
            
            .text-right {
                text-align: right;
            }
        </style>
    </head>
    
    <body>
        <div class="payslip-container">
            <div style="display: flex; justify-content: space-between; align-items: center;height: 50px;gap: 60px;">
                <div
                    style="background-color: #CA282C; clip-path: polygon(0 0, 82% 0, 100% 100%, 0 100%); width: 100%; height: 50px;">
                </div>
                <div style="width: 100%; display: flex; align-items: center; justify-content: center;">
                    <h2 style="padding-right: 40px;">${salaryData.company.name || 'Company'}</h2>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;height: 80px;margin-top: 20px;">
                <div style="width: 100%; display: flex; align-items: center; ">
                    <h1 class="poppins-medium" style="padding-left: 40px; margin:0px;color: #293646; letter-spacing: 5px;">
                        PAYSLIP</h1>
                </div>
                <div style="background-color: #CA282C;clip-path: polygon(0 0, 100% 0, 100% 100%, 25% 100%);
                 width: 100%; height: 80px;">
                </div>
            </div>
    
            <div class="employee-info">
                <div class="employee-details">
                    <p class="employee-name poppins-medium">${salaryData.employee.name}</p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">${salaryData.company.address || 'Address not available'}</p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Employee ID: ${salaryData.employee.employee_id}</p>
                    <p class="poppins-regular" style="font-size: 14px; color: #45484D;">Email: ${salaryData.employee.email}</p>
                </div>
                <div class="payroll-info poppins-regular">
                    <p style="display: flex; gap: 50px;align-items: center; color: #45484D;">
                        <span class="info-label poppins-medium">Payroll#</span> ${salaryData.employee.employee_id}
                    </p>
                    <p style="display: flex; gap: 50px;align-items: center;color: #45484D;">
                        <span class="info-label poppins-medium">Pay Date</span> ${new Date().toLocaleDateString('en-GB')}
                    </p>
                    <p style="display: flex; gap: 50px;align-items: center; color: #45484D;">
                        <span class="info-label poppins-medium">Pay Period</span> ${salaryData.salary.month}/${salaryData.salary.year}
                    </p>
                    <p style="display: flex; gap: 50px;align-items: center; color: #45484D;">
                        <span class="info-label poppins-medium">Work Days</span> ${salaryData.salary.present_days}/${salaryData.salary.working_days}
                    </p>
                </div>
            </div>
    
            <!-- EARNINGS Section -->
            <div style="padding-right: 40px; padding-left: 40px; margin-top: 80px;">
                <ul class="poppins-medium">
                    <li class="header">
                        <span>EARNINGS</span>
                        <span>CURRENT</span>
                        <span>YTD</span>
                    </li>
                    ${salaryData.earnings.map(earning => `
                    <li>
                        <span style="color: #293646;">${earning.name}</span>
                        <span class="poppins-regular amount" style="color: #293646;">$${earning.amount.toFixed(2)}</span>
                        <span class="poppins-regular amount" style="color: #293646;">$${earning.amount.toFixed(2)}</span>
                    </li>
                    `).join('')}
                    ${salaryData.earnings.length === 0 ? `
                    <li>
                        <span style="color: #293646;">Basic Pay</span>
                        <span class="poppins-regular amount" style="color: #293646;">$${salaryData.salary.basic_pay || '0.00'}</span>
                        <span class="poppins-regular amount" style="color: #293646;">$${salaryData.salary.basic_pay || '0.00'}</span>
                    </li>
                    ` : ''}
                    <li style="background-color: #CA282C; color: white;">
                        <span>GROSS PAY</span>
                        <span class="poppins-regular amount">$${earningsTotal.toFixed(2)}</span>
                        <span class="poppins-regular amount">$${earningsTotalYTD.toFixed(2)}</span>
                    </li>
                </ul>
            </div>
    
            <!-- DEDUCTIONS Section -->
            <div style="padding-right: 40px; padding-left: 40px;">
                <ul class="poppins-medium">
                    <li class="header poppins-medium">
                        <span>DEDUCTIONS</span>
                        <span>CURRENT</span>
                        <span>YTD</span>
                    </li>
                    ${salaryData.deductions.map(deduction => `
                    <li>
                        <span class="poppins-medium" style="color: #293646;">${deduction.name}</span>
                        <span class="poppins-regular amount" style="color: #293646;">$${deduction.amount.toFixed(2)}</span>
                        <span class="poppins-regular amount" style="color: #293646;">$${deduction.amount.toFixed(2)}</span>
                    </li>
                    `).join('')}
                    ${salaryData.deductions.length === 0 ? `
                    <li>
                        <span class="poppins-medium" style="color: #293646;">No Deductions</span>
                        <span class="poppins-regular amount" style="color: #293646;">$0.00</span>
                        <span class="poppins-regular amount" style="color: #293646;">$0.00</span>
                    </li>
                    ` : ''}
                    <li style="background-color: #CA282C; color: white;">
                        <span>TOTAL DEDUCTIONS</span>
                        <span class="amount">$${deductionsTotal.toFixed(2)}</span>
                        <span class="amount">$${deductionsTotalYTD.toFixed(2)}</span>
                    </li>
                </ul>
            </div>
    
            <div style="display: flex; justify-content: flex-end;padding-right: 40px; margin-top: 20px;">
                <div class="poppins-medium"
                    style="background-color: #CA282C;color: white;padding:15px 20px 15px 20px; border-top-left-radius: 20px;border-bottom-right-radius: 20px;gap: 40px; display: flex;">
                    <span>NET PAY</span>
                    <span>$${netPay.toFixed(2)}</span>
                    <span>$${netPayYTD.toFixed(2)}</span>
                </div>
            </div>
    
            <div class="signature">
                <div style="width: 200px;">
                    <div style="width: 100%; height: 1px; background-color: #E2E2E2; margin-top: 100px;"></div>
                    <p class="poppins-medium" style="text-align: center; margin-top:10px;color: #293646;">Authorized Signature</p>
                </div>
            </div>
            
            <div style="padding: 20px 40px; color: #666; font-size: 12px; text-align: center;">
                <p>This payslip is computer generated and does not require a physical signature.</p>
                <p>For any discrepancies, please contact the HR department within 7 days of receiving this payslip.</p>
            </div>
    
            <div style="height:20px;width: 100%; background-color: #CA282C;"></div>
        </div>
    </body>
    </html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(htmlContent);

    } catch (error) {
        console.error('Error generating HTML view:', error);
        return res.status(500).send(`
            <html>
                <body>
                    <h1>Error generating payslip</h1>
                    <p>${error.message}</p>
                </body>
            </html>
        `);
    }
});

module.exports = router;