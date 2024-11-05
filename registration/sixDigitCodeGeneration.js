const db = require("../db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

async function sixDigitCodeGeneration(req, res) {
  try {
    const { email } = req.body;

    const checkEmail = await db("metaenga_users").where("email", email).first();
    if (!checkEmail) {
      return res
        .status(400)
        .json({ status: "error", message: "Email not found" });
    }

    const companyInfo = await db("company")
      .where("id", checkEmail.company_id)
      .first();

    let sixDigitCode = Math.floor(100000 + crypto.randomInt(900000));

    const checkCode = await db("metaenga_login_with_code")
      .first("code")
      .where("email", email);
    console.log(checkCode);

    if (!checkCode) {
      await db("metaenga_login_with_code").insert({
        code: sixDigitCode,
        email: email,
      });
    } else {
      await db("metaenga_login_with_code")
        .where("email", email)
        .update({ code: sixDigitCode });
    }

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
      transactionalId: "clscwwxeh00cnw3dn1nk2nucu",
      email: email,
      dataVariables: {
        firstName: email,
        sixCode: sixDigitCode,
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
            sixCode: sixDigitCode,
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
            lastName: "",
            companyName: companyInfo.companyName,
            companyId: checkEmail.company_id,
            userGroup: checkEmail.role,
            source: "Old company",
            plan: companyInfo.plan,
            token: "",
            sixCode: sixDigitCode,
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
    } else {
      res.status(responseFound.status).json({
        status: "error",
      });
    }

    return res.status(200).json({
      status: "success",
      code: "sent",
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: "error" });
  }
}
// async function sendSixDigitCode(text,userEmail) {
//   var transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: 'info@metaenga.com',
//       pass: 'tdehdxzouhfuralc'
//     }
//   });

//   var mailOptions = {
//     from: 'Metaenga <info@metaenga.com>',
//     to: userEmail,
//     subject: 'Account Activation',
//     html: text
//   };

//   transporter.sendMail(mailOptions, function(error, info){
//     if (error) {
//       console.log(error);
//     } else {
//       console.log('Email sent: ' + info.response);
//     }
//   });
// }
module.exports.sixDigitCodeGeneration = sixDigitCodeGeneration;
