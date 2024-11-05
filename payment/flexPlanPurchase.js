const db = require("../db");
const axios = require("axios");
var nodemailer = require("nodemailer");

async function flexPlanPurchase(req, res) {
  try {
    const {
      email,
      arrTraining,
      videoGb,
      period,
      headsets,
      fullName,
      price,
      message,
    } = req.body;

    if (!email || !period || !headsets || !fullName || !price) {
      return res.status(400).json({
        status: "error",
        data: "Invalid input data",
      });
    }

    const date = new Date().toISOString().slice(0, 19).replace("T", " ");

    let arrTrainingLoops;
    if (arrTraining == undefined || arrTraining == null) {
      arrTrainingLoops = "No selected moduels";
    } else {
      arrTrainingLoops = arrTraining
        .map((item, index) => `${index + 1}.\u200B${item}`)
        .join("; ");
    }

    let videoGbLoops;
    if (videoGb == undefined || videoGb == null) {
      videoGbLoops = "N/A";
    } else {
      videoGbLoops = videoGb + "GB upload limit";
    }

    let messageLetter;
    if (message == undefined || message == null) {
      messageLetter = "";
    } else {
      messageLetter = message;
    }

    // Додайте ключ API до заголовків
    const apiKey = "361400aa1b89d4a52e914cdc641ecec7"; // Замініть на ваш ключ API

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Date: new Date().toUTCString(),
    };

    const apiUrlForSendFlex = "https://app.loops.so/api/v1/transactional";

    // Об'єкт даних для створення контакту
    const contactDataForSendFlex = {
      transactionalId: "clt6xwgsc023srnyyx48t4p5t",
      email: email,
      dataVariables: {
        firstName: fullName,
        arrTraining: arrTrainingLoops,
        videoGb: videoGbLoops,
        periodFlex: period,
        headsetsFlex: headsets,
        priceFlex: price,
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
        console.log("Контактів знайдено:", data);
        if (data.length > 0) {
          // Контакт із вказаною електронною адресою знайдено
          const apiUrl = "https://app.loops.so/api/v1/contacts/update";

          const updateData = {
            email: email,
            arrTraining: arrTrainingLoops,
            videoGb: videoGbLoops,
            periodFlex: period,
            headsetsFlex: headsets,
            priceFlex: price,
          };

          // Оновлюємо контакт за допомогою PUT-запиту
          await axios
            .put(apiUrl, updateData, { headers })
            .then(async (response) => {
              // Надсилаємо лист
              await axios.post(apiUrlForSendFlex, contactDataForSendFlex, {
                headers,
              });
              console.log("оновлено");
            });
        } else {
          const apiUrl = "https://app.loops.so/api/v1/contacts/create";

          // Об'єкт даних для створення контакту
          const contactData = {
            email: email,
            arrTraining: arrTrainingLoops,
            videoGb: videoGbLoops,
            periodFlex: period,
            headsetsFlex: headsets,
            priceFlex: price,
          };

          // Відправка POST-запиту з використанням ключа API
          axios
            .post(apiUrl, contactData, { headers })
            .then(async (response) => {
              // Надсилаємо лист
              await axios.post(apiUrlForSendFlex, contactDataForSendFlex, {
                headers,
              });
              console.log("створено");
            });
        }
      }
    }

    const htmlForEmail = `<!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Letter</title>
      <style>
        h1 {
          text-align: center;
        }
        body {
          color: #2e3a4b;
          background: #ffffff;
          padding: 0 24px;
        }
      </style>
    </head>
    
    <body>
      <h1>
        Flex plan request
      </h1>
      <p><b>Date: </b>${date}</p>
      <p><b>Full name: </b>${fullName}</p>
      <p><b>Email: </b>${email}</p>
      <p><b>VR Training modules: </b> <br>${arrTrainingLoops} </p>
      <p><b>Number of headsets: </b>${headsets}</p>
      <p><b>Access period: </b>${period} month</p>
      <p><b>360 Video feature set: </b>${videoGbLoops}</p>
      <p><b>Total price: </b>$${price}</p>
      <p><b>Message: </b> <br>
        ${messageLetter}</p>
    </body>
    
    </html>`;

    sendEmail(htmlForEmail);

    return res.status(200).json({
      status: "success",
      data: "Letter sent successfully",
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

  var mailOptions = {
    from: "Metaenga <slav@digitalengineeringmagic.com>",
    to: "info@metaenga.com",
    subject: "Your Flex plan request",
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

module.exports.flexPlanPurchase = flexPlanPurchase;
