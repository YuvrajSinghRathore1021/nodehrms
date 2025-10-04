const express = require("express");
const router = express.Router();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Serve static files (e.g., fonts)
router.use('/static', express.static(path.join(__dirname, '../../../public')));

router.post('/api/MakePdf', async (req, res) => {
    try {
        const { userData, type } = req.body;

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
            src: url('http://localhost:2100/uploads/fonts/poppins/Poppins-Regular.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
        }

        @font-face {
            font-family: 'PoppinsMedium';
            src: url('http://localhost:2100/uploads/fonts/poppins/Poppins-Medium.ttf') format('truetype');
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
            background-image: url("http://localhost:2100/uploads/logo/bg.png");
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
        const fileUrl = `http://localhost:2100/uploads/salaryslip/pdf/${fileName}`;
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

router.get('/api/HtmlView', async (req, res) => {
    const htmlContent = ` <!DOCTYPE html>
    <html lang="en">
    <head>

    <title>Payslip</title>

  
        <style>
      @font-face {
            font-family: 'Poppins';
            src: url('http://localhost:2100/uploads/fonts/poppins/Poppins-Regular.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
        }

        @font-face {
            font-family: 'PoppinsMedium';
            src: url('http://localhost:2100/uploads/fonts/poppins/Poppins-Medium.ttf') format('truetype');
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

module.exports = router;