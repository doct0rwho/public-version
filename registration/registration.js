const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const db = require("../db");
const bcrypt = require("bcrypt");
const fs = require("fs");
var uuid = require("uuid");
var nodemailer = require("nodemailer");
const { exec } = require("child_process");
const con = require("../db");
dotenv.config();
const express = require("express");
const app = express();
const axios = require("axios");
const semaphore = require("semaphore")(1);
class Registrator {
  async registerFree(req, res) {
    try {
      const { email, firstName, lastName, companyName, message } = req.body;

      if (!email || !firstName || !companyName)
        return res.status(400).json({ message: "Not all fields are filled" });

      const checkCompany = await db("company").first("*").where({
        companyName: companyName,
      });
      const checkEmail = await db("userlink").first("*").where({
        login: email,
      });
      if (checkEmail)
        return res.status(400).json({ message: "Email already exists" });
      if (checkCompany)
        return res.status(400).json({ message: "Company name already exists" });
      const checkExistingRecord = await db("reglink").first("*").where({
        email: email,
      });
      var token = await jwt.sign(
        {
          firstName: firstName,
          lastName: lastName,
          email: email,
          companyName: companyName,
        },
        process.env.LINK_TOKEN,
        { expiresIn: "72h" }
      );

      console.log("token", token);
      const timeInMs = new Date();
      if (checkExistingRecord) {
        await db("reglink")
          .update({
            regtoken: token,
            company: companyName,
            userrole: "OWNER",
            date: timeInMs,
            firstName: firstName,
            lastName: lastName,
          })
          .where({
            email: email,
          });
      } else {
        await db("reglink").insert({
          regtoken: token,
          email: email,
          company: companyName,
          userrole: "OWNER",
          date: timeInMs,
          firstName: firstName,
          lastName: lastName,
        });
      }

      const htmlEmail = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!--[if !mso]><!-->
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <!--<![endif]-->
        <title>Metaenga</title>
        <style type="text/css">
        /* RESET STYLES */
        table {border-collapse:collapse;}
        img, a img {border:0; height:auto; outline:none; text-decoration:none;}
        body {height:100% !important; margin:0 auto !important; padding:0; width:100% !important;}
        /* CLIENT-SPECIFIC STYLES */
        img {-ms-interpolation-mode: bicubic;} /* Force IE to smoothly render resized images. */
        #outlook a {padding:0;} /* Force Outlook 2007 and up to provide a "view in browser" message. */
        table {mso-table-lspace:0pt; mso-table-rspace:0pt;} /* Remove spacing between tables in Outlook 2007 and up. */
        .ReadMsgBody {width:100%;} .ExternalClass {width:100%;} /* Force Outlook.com to display emails at full width. */
        p, a, td {mso-line-height-rule:exactly;} /* Force Outlook to render line heights as they're originally set. */
        p, a, td, body, table {-ms-text-size-adjust:100%; -webkit-text-size-adjust:100%;} /* Prevent Windows- and Webkit-based mobile platforms from changing declared text sizes. */
        .ExternalClass, .ExternalClass p, .ExternalClass td, .ExternalClass div, .ExternalClass span, .ExternalClass font {line-height:100%;} /* Force Outlook.com to display line heights normally. */
        a [x-apple-data-detectors] {color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;} /* attempt to control apple deata detection */
        /* TEMPLATE STYLES */
        @media screen and (max-width:480px){
        .mw100{max-width:100% !important;}
        .mw95{max-width:95% !important;}
        .mw50{max-width:50% !important;}
        .w100{width:100% !important;}
        .w96{width:96% !important;}
        .mblpdrm-r{padding-right:0 !important;}
        .mblpdrm-l{padding-left:0 !important;}
        .Hellode {display:none !important;}
        }
        </style>
         <!--[if gte mso 9]><xml>  <o:OfficeDocumentSettings>   <o:AllowPNG/>   <o:PixelsPerInch>96</o:PixelsPerInch>  </o:OfficeDocumentSettings> </xml><![endif]-->
        </head>
        <body style="margin:0;padding:0;background-color:#ffffff;" data-new-gr-c-s-check-loaded="14.1100.0" data-gr-ext-installed="">
         <style type="text/css">
        div.preheader 
        { display: none !important; } 
        </style>
        <div class="preheader" style="font-size: 1px; display: none !important; font-weight:bold;">Revolutionary XR training platform!</div>
         <table align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;Margin:0 auto;background-color:#ffffff;">
          <tbody><tr>
           <td style="font-size:0;">&nbsp;</td>
           <td align="center" valign="top" style="width:580px;">
            <!--ALL CONTENT STARTS HERE-->
            <!--table removes gmail bg line between stacked tables-->
            <table align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;" class="w96">
            <!-- logo -->
             <tbody><tr>
              <td align="center">
               <table align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tbody><tr>
                 <td align="center" style="padding:40px 0;border-bottom:1px solid #cccccc;">
                  <a href="https://metaenga.com" style="font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;text-decoration:none;">
                   <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo-deam.png" align="center" alt="Digital Engineering and Magic" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:100px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
        <img src="https://pixel.app.returnpath.net/pixel.gif?r=caa2f107df157b407994b468c6c76cb819ca6a10&amp;c=105936806&amp;s=%%_subscriberid%%&amp;j=105936806&amp;emailname=Confluence%20Standard%20N2N%20Day%206_EML-14350" width="1" height="1"><img src="./Atlassian_files/o.gif" width="1" height="1" alt="" aria-hidden="true"></center></td></tr></tbody></table>
                  </a>
                 </td>
                </tr>
                <tr>
                 <td height="20" style="height:20px;line-height:20px;font-size:0;">
                  &nbsp;
                 </td>
                </tr>
               </tbody></table>
              </td>
             </tr>
             <!-- end logo -->
             <tr>
              <td align="center">
               <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <!--primary 1-->
                <!-- start headline -->
                <tbody><tr>
                 <td align="center">
                  <table cellpadding="0" cellspacing="0" border="0" style="width:75%;" class="w100">
                   <tbody><tr>
                    <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-weight:bold;font-size:24px;line-height:35px;color:#253858;text-align:center;">
                     <a href="https://app.metaenga.com" style="text-decoration:none;color:#253858;font-weight:bold;">
                      Welcome to the Metaenga! </a>
                    </td>
                   </tr>
                  </tbody></table>
                 </td>
                </tr>
                <!-- end headline -->
                <!-- paragraph -->
                <tr>
                 <td style="padding-top:40px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
                  Hi, ${firstName}
                 </td>
                </tr>
                <!-- end paragraph -->
                <!--paragraph-->
                <tr>
                 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
                  Thank you for registering with Metaenga by Digital Engineering and Magic. We are excited to have you on the XR Training Platform for industrial enterprises.
                </tr>
                <!-- end paragraph -->
                <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          To activate your account, please click on the link below:
         </td>
        </tr>
        <!-- end paragraph -->
                <!-- content b -->
        <!--cta-->
                <tr>
                 <td align="center" style="padding-top:20px;">
                  <!--cta button-->
                  <table cellpadding="0" cellspacing="0" border="0">
                   <tbody><tr>
                    <td align="center" style="border-radius:3px;background-color:#0066FF;">
                     <a href="${process.env.WEB_LINK}/self-registration?token=${token}" target="_blank" style="display:inline-block;border:1px solid #0052CC;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#ffffff;text-decoration:none;border-radius: 3px; padding:15px 40px;">
                      <!--[if mso]>&nbsp;&nbsp;&nbsp;&nbsp;<![endif]-->Activate account<!--[if mso]>&nbsp;&nbsp;&nbsp;&nbsp;<![endif]--></a>
                    </td>
                   </tr>
                  </tbody></table>
                 </td>
                </tr>
                <!-- end cta -->
        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          Once you have clicked on the link, you will be directed to the login page where you can access all the features of our platform.
         </td>
        </tr>
        <!-- end paragraph -->
        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          If you have any issues or concerns, please do not hesitate to contact our customer support team at support@metaenga.com.
         </td>
        </tr>
        <!-- end paragraph -->
        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          Thank you for choosing Metaenga!
         </td>
        </tr>
        <!-- end paragraph -->
        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          👋 The Digital Engineering and Magic team
         </td>
        </tr>
        <!-- end paragraph -->
                <!--/primary 1-->
               </tbody></table>
              </td>
             </tr>
             <!-- footer -->
             <tr>
              <td align="center">
               <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><!--footer a-->
              <table style="width:100%;" cellspacing="0" cellpadding="0" border="0">
               <tbody><tr>
                <td style="padding-top:40px;padding-bottom:40px;" align="center">
                 <!--headline table controls length-->
                 <table style="width:100%;" cellspacing="0" cellpadding="0" border="0">
                  <tbody><tr>
                   <td style="border-top:1px solid #cccccc;padding-top:40px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:13px;line-height:19px;color:#707070;text-align:center;">
                    <a href="https://metaenga.com/privacy-policy" style="font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:13px;color:#707070;text-decoration:none;">Privacy&nbsp;policy</a> •
                    <a href="https://metaenga.com/contact-us" style="font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:13px;color:#707070;text-decoration:none;">Contact&nbsp;us</a> 
                   </td>
                  </tr>
                  <tr>
                   <td style="padding-top:10px; display:block;" align="center">
                    <a href="https://www.youtube.com/@metaenga" alt="Youtube" style="font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;text-decoration:none;">
                    <img src="https://app.metaenga.com/static/media/email/Youtube-email.png" alt="Youtube" title="Youtube" style="line-height: 0px; outline:0;padding:0;border:0;width:25px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;" width="25" border="0" align="middle"></a>  &nbsp; 
                    <a href="https://www.linkedin.com/showcase/metaenga" alt="LinkedIn" style="font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;text-decoration:none;">
                    <img src="https://app.metaenga.com/static/media/email/LinkedIn-email.png" alt="LinkedIn" title="LinkedIn" style="outline:0;padding:0;border:0;width:25px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;" width="25" border="0" align="middle"></a> &nbsp; 
                    <a href="https://twitter.com/metaenga" alt="Twitter" style="font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;text-decoration:none;">
                    <img src="https://app.metaenga.com/static/media/email/Twitter-email.png" alt="Twitter" title="Twitter" style="outline:0;padding:0;border:0;width:25px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;" width="25" border="0" align="middle"></a>
                   </td>
                  </tr>
                  <tr>
                   <td style="padding-top:10px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:13px;line-height:19px;color:#707070;text-align:center;" align="center">
                    Metaenga powered by Digital Engineering and Magic. All rights reserved. <br>We are located at 6G Trostianetska Street, Kyiv, 02091, Ukraine
                   </td>
                  </tr>
                  <tr>
                   <td style="padding-top:20px;" align="center">
                    <a href="https://metaenga.com" style="font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;text-decoration:none;"><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" alt="Metaenga" title="Metaenga" style="display:block;outline:0;padding:0;border:0;width:116px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;" width="116" border="0"></a>
                   </td>
                  </tr>
                 </tbody></table><!--/headline table controls length-->
                </td>
               </tr></tbody></table></td></tr></tbody></table>
              </td>
             </tr>
             <!-- end footer-->
            </tbody></table>
            <!--/table removes gmail bg line between stacked tables-->
            <!--/ALL CONTENT ENDS HERE-->
           </td>
           <td style="font-size:0;">&nbsp;</td>
          </tr>
         </tbody></table>
        </body></html>`;

      const clientOrigin = req.headers["origin"];

      if (
        clientOrigin == "https://dev.metaenga.com" ||
        clientOrigin == "https://app.metaenga.com"
      ) {
        // Додайте ключ API до заголовків
        const apiKey = "361400aa1b89d4a52e914cdc641ecec7"; // Замініть на ваш ключ API

        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

        const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${email}`;

        // Виконуємо GET-запит до API Loops за допомогою Axios
        const responseFound = await axios.get(apiUrlFound, { headers });

        if (responseFound.status === 200) {
          const data = responseFound.data;

          // Перевіряємо, чи отримали масив контактів
          if (Array.isArray(data)) {
            if (data.length > 0) {
              // Контакт із вказаною електронною адресою знайдено

              const apiUrl = "https://app.loops.so/api/v1/contacts/update";

              const updateData = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                companyName: companyName,
                companyId: "non-activated account",
                userGroup: "OWNER",
                source: "Metaenga",
                plan: "Free",
                token: token,
              };

              const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

              const headers = {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              };
              const response = await axios.put(apiUrl, updateData, { headers });

              const apiUrlForSendActivateAccountLetter =
                "https://app.loops.so/api/v1/transactional";

              // Об'єкт даних для створення контакту
              const contactDataForSendActivateAccountLetter = {
                transactionalId: "clm4rek9n00qjla0pzkr5lrx5",
                email: email,
                dataVariables: {
                  firstName: email,
                  companyName: companyName,
                  Token: token,
                },
              };
              // Відправка POST-запиту з використанням ключа API
              const responseForSendActivateAccountLetter = await axios.post(
                apiUrlForSendActivateAccountLetter,
                contactDataForSendActivateAccountLetter,
                { headers }
              );
            } else {
              // Контакт із вказаною електронною адресою не знайдено
              const apiUrl = "https://app.loops.so/api/v1/contacts/create";

              // Об'єкт даних для створення контакту
              const contactData = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                companyName: companyName,
                companyId: "non-activated account",
                userGroup: "OWNER",
                source: "Metaenga",
                plan: "Free",
                token: token,
              };

              const headers = {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              };

              // Відправка POST-запиту з використанням ключа API
              axios.post(apiUrl, contactData, { headers }).then((response) => {
                console.log("Контакт було успішно додано до Loops");
              });

              const apiUrlForSendActivateAccountLetter =
                "https://app.loops.so/api/v1/transactional";

              // Об'єкт даних для створення контакту
              const contactDataForSendActivateAccountLetter = {
                transactionalId: "clm4rek9n00qjla0pzkr5lrx5",
                email: email,
                dataVariables: {
                  firstName: email,
                  companyName: companyName,
                  Token: token,
                },
              };
              // Відправка POST-запиту з використанням ключа API
              const responseForSendActivateAccountLetter = await axios.post(
                apiUrlForSendActivateAccountLetter,
                contactDataForSendActivateAccountLetter,
                { headers }
              );
            }
          }
        }

        //sendEmail(htmlActivation, email)
      } else {
        // Додайте ключ API до заголовків
        const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

        const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${email}`;

        // Виконуємо GET-запит до API Loops за допомогою Axios
        const responseFound = await axios.get(apiUrlFound, { headers });

        if (responseFound.status === 200) {
          const data = responseFound.data;

          // Перевіряємо, чи отримали масив контактів
          if (Array.isArray(data)) {
            if (data.length > 0) {
              // Контакт із вказаною електронною адресою знайдено

              const apiUrl = "https://app.loops.so/api/v1/contacts/update";

              const updateData = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                companyName: companyName,
                companyId: "non-activated account",
                userGroup: "OWNER",
                plan: "Free",
                source: "DEM",
                token: token,
              };

              const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

              const headers = {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              };
              const response = await axios.put(apiUrl, updateData, { headers });
              sendEmailOptionTwo(htmlEmail, email);
            } else {
              // Контакт із вказаною електронною адресою не знайдено
              const apiUrl = "https://app.loops.so/api/v1/contacts/create";

              // Об'єкт даних для створення контакту
              const contactData = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                companyName: companyName,
                companyId: "non-activated account",
                userGroup: "OWNER",
                source: "DEM",
                plan: "Free",
                token: token,
              };

              const headers = {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              };

              // Відправка POST-запиту з використанням ключа API
              axios.post(apiUrl, contactData, { headers }).then((response) => {
                console.log("Контакт було успішно додано до Loops");
              });
              sendEmailOptionTwo(htmlEmail, email);
            }
          }
        }
      }

      const time = new Date()
        .toISOString()
        .replace(/T/, " ") // replace T with a space
        .replace(/\..+/, ""); // delete the dot and everything after
      const userAgent = req.headers["user-agent"];
      const remoteIP = req.connection.remoteAddress;
      let fullName = firstName + " " + lastName;
      const html = `<html><body>
          <p>Full Name: ${fullName}</p>
          <p>Company Name: ${companyName}</p>
          <p>Email: ${email}</p>
          <p>Time: ${time}</p>
          <p>User Agent: ${userAgent}</p>
          <p>Remote IP: ${remoteIP}</p>
          <p>Message: ${message}</p>
          </body></html>`;
      sendEmailDkim(html, "info@metaenga.com", email);

      return res.status(201).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        data: "Error occured",
        clientOrigin: clientOrigin,
      });
    }
  }

  async getDomain(req, res) {
    try {
      const clientOrigin = req.headers["origin"];
      return res.status(200).json({
        clientOrigin: clientOrigin,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: "Failed to get domain",
      });
    }
  }

  async confirmation(req, res, next) {
    try {
      const { token, password } = req.body;
      let universalEmail;
      const data = await db("reglink").first("*").where({
        regtoken: token,
      });
      if (!data) return res.status(404).json({ status: "data not found" });
      const check = await db("userlink").first("*").where({
        login: data.email,
      });
      if (check)
        return res
          .status(401)
          .json({ status: "this email already registered" });
      var companyHash = uuid.v4();
      var arr = [];
      var arrJSON = JSON.stringify(arr);
      if (data) {
        universalEmail = data.email;
        await db("company").insert({
          companyName: data.company,
          userEmail: data.email,
          id: companyHash,
          plan: "Free",
        });

        const videoTable = `video-${companyHash}`;
        await db.schema
          .createTable(videoTable, (table) => {
            table.string("videoName");
            table.string("videoTheme");
            table.string("videoDescription");
            table.string("companyId");
            table.string("id");
            table.string("preview");
            table.string("Data");
            table.string("duration");
            table.string("serverName");
            table.json("resolution");
            table.string("status");
            table.integer("watchedVr");
            table.integer("watchedWeb");
          })
          .then(() => console.log("table created"));

        await db("metaenga_plan_insight").insert({
          companyId: companyHash,
          plan: "Free",
        });

        //   await db.schema.createTable(companyHash, (table) => {
        //     table.string('name')
        //     table.string('password')
        //     table.string('email')
        //     table.string('phone')
        //     table.string('id')
        //     table.string('role')
        //     table.string('status')
        //     table.string('token')
        //     table.string('avatar')
        //     table.string('workerid')
        //     table.string('job')
        //     table.string('location')
        //     table.string('lastActivity')
        //     table.json('group')
        // }).then(() => console.log("table created"))

        var videoDir = `./static/videos/${companyHash}`;

        if (!fs.existsSync(videoDir)) {
          fs.mkdirSync(videoDir, { recursive: true });
        }

        const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        console.log(data.email);

        const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${data.email}`;
        console.log(apiUrlFound);

        // Виконуємо GET-запит до API Loops за допомогою Axios
        const responseFound = await axios.get(apiUrlFound, { headers });

        if (responseFound.status === 200) {
          const data = responseFound.data;

          // Перевіряємо, чи отримали масив контактів
          if (Array.isArray(data)) {
            if (data.length > 0) {
              // Контакт із вказаною електронною адресою знайдено

              const apiUrl = "https://app.loops.so/api/v1/contacts/update";

              const updateData = {
                companyId: companyHash,
                email: universalEmail,
              };
              console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
              console.log(updateData);

              const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

              const headers = {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              };
              const response = await axios.put(apiUrl, updateData, { headers });
            }
          }
        }

        const comp = await db("company").first("*").where({
          companyName: data.company,
        });
        const hashPassword = await bcrypt.hash(password, 7);

        var hash = uuid.v4();

        const time = new Date()
          .toISOString()
          .replace(/T/, " ") // replace T with a space
          .replace(/\..+/, ""); // delete the dot and everything after
        //await crypto.createHash('md5').update(data.email).digest('hex')
        //const checkpass = await bcrypt.compare(password, check.password) -- ПРОВЕРКА ПАРОЛЬЯ ДЛЯ АВТОРИЗАЦИИ
        var fullname = data.firstName + " " + data.lastName;
        await db("metaenga_users").insert({
          name: fullname,
          password: hashPassword,
          email: data.email,
          id: hash,
          role: data.userrole,
          status: "ACTIVE",
          lastActivity: time,
          company_id: comp.id,
        });
        await db("userlink").insert({
          user: hash,
          login: data.email,
          company: comp.id,
          role: data.userrole,
        });
        var obj = {
          table: [],
        };

        var json = JSON.stringify(obj);
        var userDir = `./static/users`;
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        fs.writeFile(
          userDir + "/" + hash + ".json",
          json,
          "utf8",
          function (err) {
            if (err) throw err;
            console.log("complete");
          }
        );

        var authToken = jwt.sign(
          {
            name: fullname,
            email: data.email,
            id: hash,
            companyName: comp.id,
          },
          process.env.LINK_TOKEN,
          { expiresIn: "72h" }
        );

        await db("reglink")
          .where({
            regtoken: token,
          })
          .del();
        await db("reglink")
          .where({
            email: data.email,
          })
          .del();

        const trainings = await db("trainings")
          .select("company", "fullname", "id", "platform")
          .whereIn("id", function () {
            this.select("id").from("metaenga_free");
          });
        const timeInMs = new Date().toISOString();
        let rows;
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        console.log(trainings);
        trainings.forEach(async (training) => {
          console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
          console.log(training);
          if (training.platform.some((item) => item.platform === "pico")) {
            await db("metaenga_training_company").insert({
              training: training.id,
              company: comp.id,
              time: time,
              fullname: training.fullname,
              default: 1,
              platform: "pico",
              plan: "free",
            });
          }
          if (training.platform.some((item) => item.platform === "quest")) {
            await db("metaenga_training_company").insert({
              training: training.id,
              company: comp.id,
              time: time,
              fullname: training.fullname,
              default: 1,
              platform: "quest",
              plan: "free",
            });
          }
          if (training.platform.some((item) => item.platform === "windows")) {
            await db("metaenga_training_company").insert({
              training: training.id,
              company: comp.id,
              time: time,
              fullname: training.fullname,
              default: 1,
              platform: "windows",
              plan: "free",
            });
          }
        });

        return res.status(200).json({
          status: "success",
          token: authToken,
          id: hash,
          name: fullname,
          email: data.email,
          companyName: comp.id,
          role: data.userrole,
        });
      } else {
        return res.status(403).json({
          status: "validation hasn't complete",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getDataByToken(req, res) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) return res.sendStatus(405);
    var payload;
    jwt.verify(token, process.env.LINK_TOKEN, (err, decoded) => {
      console.log(err);

      if (err) return res.sendStatus(406);
      if (decoded) {
        payload = decoded;
      }
    });
    return res.status(200).json({
      status: "success",
      token: payload,
    });
  }
}

async function sendEmailDkim(text, userEmail, replyTo) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "info@metaenga.com",
      pass: "tdehdxzouhfuralc",
    },
  });

  let mailOptions = {
    from: {
      name: "Metaenga",
      address: "info@metaenga.com",
    },
    to: userEmail,
    subject: "Metaenga.com",
    html: text,
    replyTo: replyTo,
    dkim: {
      domainName: "google-metaenga._domainkey",
      keySelector: "google-metaenga",
      privateKey: process.env.GOOGLE_DKIM,
    },
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}
async function sendEmail(text, userEmail) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "info@metaenga.com",
      pass: "tdehdxzouhfuralc",
    },
  });

  var mailOptions = {
    from: "Metaenga <info@metaenga.com>",
    to: userEmail,
    subject: "Account Activation",
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

async function sendEmailOptionTwo(text, userEmail) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "viacheslav@digitalengineeringmagic.com",
      pass: "ktmvjxlfemvnkslo",
    },
  });

  var mailOptions = {
    from: "Digital Engineering & Magic <viacheslav@digitalengineeringmagic.com>",
    to: userEmail,
    subject: "Account Activation",
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

module.exports = new Registrator();
