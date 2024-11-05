const puppeteer = require("puppeteer");
const db = require("../db");
const pdf = require("html-pdf");
const fs = require("fs");
const axios = require("axios");
const con = require("../db");
const path = require("path");
var nodemailer = require("nodemailer");
async function createPDFInvoice(req, res) {
  try {
    const {
      companyName,
      billingAddress,
      contactName,
      email,
      companyId,
      typeSubscription,
      unitPrice,
      total,
      numberLicenses,
      trueOrFalse,
    } = req.body;

    if (
      !companyName ||
      !billingAddress ||
      !contactName ||
      !email ||
      !companyId ||
      !typeSubscription ||
      typeof unitPrice === "undefined" ||
      typeof total === "undefined" ||
      typeof numberLicenses === "undefined"
    ) {
      return res.status(400).json({
        status: "error",
        data: "Invalid request body format",
      });
    }

    if (typeSubscription !== "/month" && typeSubscription !== "/year") {
      return res.status(400).json({
        status: "error",
        data: "Invalid typeSubscription",
      });
    }

    const companyCheck = await db("company")
      .where({ id: companyId, companyName: companyName })
      .first();

    if (!companyCheck) {
      return res.status(400).json({
        status: "error",
        data: "Company not found",
      });
    }

    const checkEmail = await db("metaenga_users").where("email", email).first();
    if (!checkEmail) {
      return res.status(400).json({
        status: "error",
        data: "Email not found",
      });
    }

    const imagePath = `${process.env.IMAGE_PASS}`; //root/metaenga/metaengaplatform/node-app/static/pdf/image1.png
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    console.log(`data:image/png;base64,${base64Image}`);

    const currentDate = new Date();
    const formattedCurrentDate = `${
      currentDate.getMonth() + 1
    }/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    const dateForNumber = `${
      currentDate.getMonth() + 1
    }${currentDate.getDate()}${currentDate.getFullYear()}`;
    let nextMonth = currentDate.getMonth() + 1;
    let nextYear = currentDate.getFullYear();

    if (nextMonth === 12) {
      nextMonth = 1;
      nextYear++;
    } else {
      nextMonth++;
    }

    const formattedNextMonthDate = `${nextMonth}/${currentDate.getDate()}/${nextYear}`;

    const result = await db("metaenga_invoices")
      .insert({
        company_id: companyId,
        status: 0,
        date: currentDate.toISOString().slice(0, 19).replace("T", " "),
        number_licenses: numberLicenses,
      })
      .returning("invoice_id");

    const invoiceId = result[0];

    const numberInvoice = `${dateForNumber}0${invoiceId}`;

    await db("metaenga_invoices")
      .update({
        progress: "25",
      })
      .where("invoice_id", invoiceId);

    const html = `<!DOCTYPE html>
    <html>
    
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300;0,400;0,500;1,500&display=swap"
        rel="stylesheet">
      <title>INVOICE</title>
      <style>
        body {
          font-family: 'Figtree', sans-serif;
          padding: 36px 24px;
        }
    
        section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        h1 {
          margin-top: 0;
        }
    
        .header,
        .contact-info {
          text-align: left;
        }
    
        .quote-info p {
          display: flex;
          justify-content: space-between;
        }
        .quote-info p b {
          margin-right: 4px;
        }
    
        .signature,
        .valid-until {
          text-align: right;
        }
    
        .client-info {
          text-align: left;
        }
    
        .header p,
        .contact-info p,
        .quote-info p,
        .payment-info p,
        .terms-conditions p,
        .client-info p {
          margin: 0 0 4px 0;
        }
    
        .terms-conditions p {
          display: inline-flex;
        }
    
        .terms-conditions p span {
          margin-right: 8px;
        }
    
        table {
          margin-bottom: 30px;
        }
    
        table thead {
          background-color: #2E3A4B;
          text-align: left;
        }
    
        table thead th {
          padding: 8px;
          color: #fff;
          font-weight: 500;
        }
    
        table tbody td {
          padding: 8px;
        }
    
        .bold {
          font-weight: bold;
        }
      </style>
    </head>
    
    <body>
      <section>
      <div class="logo">
      <img src="data:image/png;base64,${base64Image}" alt="Logo" style="width: 350px; height: auto;">
    </div>
        <h1>INVOICE</h1>
      </section>
    
      <section>
        <div class="header">
          <p>Trostyanetska str, 6G</p>
          <p>Kyiv, 02091</p>
          <p>Ukraine</p>
          <a href="tel:380931234567" style="color: #000; text-decoration: none;">+38 (093) 123 45 67</a> <br>
          <a href="mailto:info@digitalengineeringmagic.com">info@digitalengineeringmagic.com</a>
        </div>
        <div class="quote">
          <div class="quote-info">
            <p><b>DATE:</b> ${formattedCurrentDate}</p>
            <p><b>Invoice #:</b> ${numberInvoice}</p>
          </div>
    
          <div class="valid-until">
            <p>Invoice valid until ${formattedNextMonthDate}</p>
          </div>
        </div>
    
      </section>
      <section>
        <div class="client-info">
          <b>
            <p>Invoice for:</p>
          </b>
          <p>${contactName}</p>
          <p>${companyName}</p>
          <p>${billingAddress}</p>
          <p>${email}</p>
        </div>
      </section>
    
      <section>
        <table border="1" style="width:100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>Description</th>
              <th>QTY</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Standard User License subscription</b> to a Service (Metaenga XR training platform service)</td>
              <td style="white-space: nowrap;">${numberLicenses}</td>
              <td style="white-space: nowrap;">$${unitPrice}${typeSubscription}<br>
              <td style="white-space: nowrap;">$${total}<br>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <div class="payment-info">
          <b>
            <p>Payment method and details:</p>
          </b>
          <p><b>Account Name:</b> DIGITAL ENGINEERING AND MAGIC LLC</p>
          <p><b>Bank:</b> JSC CB "PRIVATBANK"</p>
          <p><b>Account Number (IBAN):</b> UA423052990000026003045027231</p>
          <p><b>Bank's Address:</b> 1D HRUSHEVSKOHO STR., KYIV, 01001 </p>
          <p><b>Bank's SWIFT:</b> PBANUA2X </p>
          <p><b>Address:</b> 6G TROSTYANETSKA STR, KYIV, 02091, UKRAINE </p>
          <p><b>Registration No:</b> 44297155</p>
          <p><b>Intermediate Bank Name:</b> JP Morgan Chase Bank, New York ,USA </p>
          <p><b>Intermediate Bank Routing Number or Swift:</b> CHASUS33</p>
          <p><b>Intermediate Account number:</b> 001-1-00008</p>
        </div>
      </section>
      <section>
        <div class="terms-conditions">
          <b>
            <p>Terms and Conditions</p>
          </b> <br>
          <p><span>1.</span> We reserve the right to suspend work or terminate the project if payment is not received
            within the
            agreed-upon time frame.</p> <br>
          <p><span>2.</span> Any refunds or chargebacks may incur additional fees.</p> <br>
          <p><span>3.</span> All payments are non-refundable unless otherwise stated.</p> <br>
          <p><span>4.</span> The client is responsible for any bank or transaction fees associated with the payment.</p>
        </div>
      </section>
      <section>
        <b>
          <p>Thank you for your business!</p>
        </b>
      </section>
    
    </body>
    
    </html>`;

    const currentDateTime = new Date()
      .toISOString()
      .replace(/[-T:]/g, "_")
      .slice(0, -5);

    const pdfFilePath = `./static/pdf/inv_metasub_${companyName.replace(
      /\s+/g,
      "_"
    )}_${currentDateTime}_${numberInvoice}.pdf`;

    const pdfFilePathlOOPS = `/pdf/inv_metasub_${companyName.replace(
      /\s+/g,
      "_"
    )}_${currentDateTime}_${numberInvoice}.pdf`.replace(/`/g, "%60");

    await db("metaenga_invoices")
      .update({
        progress: "50",
      })
      .where("invoice_id", invoiceId);

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--max-old-space-size=4096", // Increase memory limit
      ],
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0); // Disable timeout

    await page.setContent(html);
    console.log("HTML content set on page");
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    const options = {
      path: pdfFilePath,
      format: "A4",
      printBackground: true,
    };

    await page.pdf(options);
    console.log("PDF generated successfully");
    // Замість await browser.close(); використовуйте наступний код

    // Update the database with progress and URL
    await Promise.all([
      db("metaenga_invoices")
        .update({ progress: "100" })
        .where("invoice_id", invoiceId),
      db("metaenga_invoices")
        .update({ url: pdfFilePath })
        .where("invoice_id", invoiceId),
      browser.close(),
    ]);

    console.log("PDF created successfully");

    if (trueOrFalse === true || trueOrFalse === undefined) {
      console.log("trueOrFalse", trueOrFalse);

      // Додайте ключ API до заголовків
      const apiKey = "361400aa1b89d4a52e914cdc641ecec7"; // Замініть на ваш ключ API

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Date: new Date().toUTCString(),
      };

      const apiUrlForSendInvoice = "https://app.loops.so/api/v1/transactional";

      // Об'єкт даних для створення контакту
      const contactDataForSendInvoice = {
        transactionalId: "clsa2x4mf00jkzawmf9qn1k6b",
        email: email,
        dataVariables: {
          firstName: contactName,
          totalPrice: total,
          numberLicenses: numberLicenses,
          pdfFilePath: pdfFilePathlOOPS,
        },
      };

      const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${email}`;

      // Виконуємо GET-запит до API Loops за допомогою Axios
      const responseFound = await axios.get(apiUrlFound, { headers });

      console.log("Response status:", responseFound.status);

      if (responseFound.status === 200) {
        const data = responseFound.data;
        // Перевіряємо, чи отримали масив контактів
        if (Array.isArray(data)) {
          if (data.length > 0) {
            // Контакт із вказаною електронною адресою знайдено
            const apiUrl = "https://app.loops.so/api/v1/contacts/update";

            const updateData = {
              email: email,
              billingAddress: billingAddress,
              typeSubscription: typeSubscription,
              unitPrice: unitPrice,
              totalPrice: total,
              numberLicenses: numberLicenses,
              pdfFilePath: pdfFilePathlOOPS,
            };

            const response = await axios
              .put(apiUrl, updateData, { headers })
              .then(async (response) => {
                // Відправка POST-запиту з використанням ключа API
                const responseForSendInvoice = await axios.post(
                  apiUrlForSendInvoice,
                  contactDataForSendInvoice,
                  { headers }
                );
              });
          } else {
            const apiUrl = "https://app.loops.so/api/v1/contacts/create";

            // Об'єкт даних для створення контакту
            const contactData = {
              email: email,
              firstName: checkEmail.name,
              companyName: companyCheck.companyName,
              companyId: checkEmail.company_id,
              userGroup: checkEmail.role,
              source: "Old company",
              plan: companyCheck.plan,
              billingAddress: billingAddress,
              typeSubscription: typeSubscription,
              unitPrice: unitPrice,
              totalPrice: total,
              numberLicenses: numberLicenses,
              pdfFilePath: pdfFilePathlOOPS,
            };

            // Відправка POST-запиту з використанням ключа API
            axios
              .post(apiUrl, contactData, { headers })
              .then(async (response) => {
                // Відправка POST-запиту з використанням ключа API
                const responseForSendInvoice = await axios.post(
                  apiUrlForSendInvoice,
                  contactDataForSendInvoice,
                  { headers }
                );
              });
          }
        }
      }
    }

    if (trueOrFalse === undefined) {
      const htmlForEmail = `<!DOCTYPE html>
    <html>
    
    <head>
      <style>
    
        h1 {
          margin-top: 0;
        }
    
        table {
          margin-bottom: 30px;
        }
    
        table thead {
          background-color: #2E3A4B;
          text-align: left;
        }
    
        table thead th {
          padding: 8px;
          color: #fff;
          font-weight: 500;
        }
    
        table tbody td {
          padding: 8px;
        }
    
      </style>
    </head>
    
    <body>
      <h1>INVOICE</h1>
      <p><b>Full name: </b>${contactName}</p>
      <p><b>Company name: </b> ${companyName}</p>
      <p><b>Email: </b>${email}</p>
      <p><b>Billing adress: </b>${billingAddress}</p>
    
      <p><b>Number licenses: </b>${numberLicenses}</p>
      <p><b>Subscription type: </b>${typeSubscription}</p>
      <p><b>Total price: </b> <b>${total}</b></p>
    
      <section>
        <table border="1" style="width:100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>Description</th>
              <th>QTY</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Standard User License subscription</b> to a Service (Metaenga XR training platform service)</td>
              <td style="white-space: nowrap;">${numberLicenses}</td>
              <td style="white-space: nowrap;">$${unitPrice}${typeSubscription}<br>
              <td style="white-space: nowrap;">$${total}<br>
            </tr>
          </tbody>
        </table>
      </section>

      <a href="https://${process.env.URL}${pdfFilePathlOOPS}" target="_blank">active link</a>
    
    </body>
    
    </html>`;

      sendEmail(htmlForEmail);
    }

    res.status(200).json({
      status: "success",
      data: invoiceId,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal Server Error",
    });
  }
}

async function sendEmail(text) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "slav@metaenga.com",
      pass: "kjorrwxtaykdrnwl",
    },
  });

  console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

  var mailOptions = {
    from: "Metaenga <slav@digitalengineeringmagic.com>",
    to: "info@metaenga.com",
    subject: "Invoice created",
    html: text,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

module.exports.createPDFInvoice = createPDFInvoice;
