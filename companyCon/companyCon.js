const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const db = require("../db");
const dbPool = require("../db"); // Assuming this exports the mysql2 connection pool
const mysql = require("mysql2/promise");
let crypto = require("crypto");
const bcrypt = require("bcrypt");
const fs = require("fs");
let nodemailer = require("nodemailer");
const emailValidator = require("deep-email-validator");
let uuid = require("uuid");

dotenv.config();
const axios = require("axios");
const con = require("../db");
class Comp {
  async getDataFromLink(req, res, next) {
    try {
      const { token } = req.body;

      const data = await db("reglink").first("*").where({
        regtoken: token,
      });
      if (!data) return res.status(404).json({ status: "data not found" });
      const name = await db("company").first("*").where({
        id: data.company,
      });
      if (name) {
        return res.status(200).json({
          status: "success",
          data: data,
          companyName: name.companyName,
        });
      } else if (!name) {
        return res.status(200).json({
          status: "success",
          data: data,
          companyName: data.company,
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
  async regLink(req, res, next) {
    try {
      const { token, password, email, company, role, workerid } = req.body;
      const data = await db("reglink").first("*").where({
        regtoken: token,
      });
      if (!data) return res.status(404).json({ status: "data not found" });
      const check = await db("userlink").first("*").where({
        login: email,
      });
      if (check)
        return res
          .status(401)
          .json({ status: "this email already registered" });
      if (
        data.email === email &&
        data.company === company &&
        data.userrole === role
      ) {
        const comp = await db("company").first("*").where({
          id: data.company,
        });
        const hashPassword = await bcrypt.hash(password, 7);

        const getCompanyUsersLimit = await db("metaenga_plan_insight")
          .first("*")
          .where({ companyId: comp.id });

        if (comp.plan == "Free") {
          if (getCompanyUsersLimit.companyUsersLimit >= 3) {
            return res
              .status(402)
              .json({ message: "you have no free license" });
          } else {
            console.log("ЕСЛИ ПЛАН БЕСПЛАТНЫЙ И МЕНЬШЕ 3");
            await db("metaenga_plan_insight")
              .where({
                companyId: comp.id,
              })
              .increment("companyUsersLimit", 1);
          }
        } else {
          // let payedLicense = await db("company").first("payedLicense").where({
          //   id: comp.id,
          // });
          // let payedLicenseCount = parseInt(payedLicense.payedLicense, 10);
          // console.log(payedLicenseCount);
          if (getCompanyUsersLimit.companyUsersLimit >= 150) {
            return res
              .status(402)
              .json({ message: "you have no free license" });
          } else {
            await db("metaenga_plan_insight")
              .where({
                companyId: comp.id,
              })
              .increment("companyUsersLimit", 1);
          }
        }

        let hash = uuid.v4();
        let arr = [];
        let arrJSON = JSON.stringify(arr);
        const time = new Date()
          .toISOString()
          .replace(/T/, " ") // replace T with a space
          .replace(/\..+/, ""); // delete the dot and everything after
        await db("metaenga_users").insert({
          password: hashPassword,
          email: email,
          id: hash,
          role: role,
          workerid: workerid,
          status: "ACTIVE",
          group: arrJSON,
          lastActivity: time,
          company_id: comp.id,
        });
        await db("userlink").insert({
          user: hash,
          login: email,
          company: comp.id,
          workerid: workerid,
          role: role,
        });
        await db("metaenga_user_logs").insert({
          companyId: company,
          status: 1,
          time: time,
        });
        let obj = {
          table: [],
        };

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
                companyId: company,
                email: email,
              };
              console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
              console.log(updateData);

              const response = await axios.put(apiUrl, updateData, {
                headers,
                timeout: 10000,
              });
            }
          }
        }

        let json = JSON.stringify(obj);
        let dir = `./static/users`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFile(dir + "/" + hash + ".json", json, "utf8", function (err) {
          if (err) throw err;
          console.log("complete");
        });

        await db("reglink")
          .where({
            regtoken: token,
          })
          .del();
        await db("reglink")
          .where({
            email: email,
          })
          .del();

        console.log("ПОСЛЕ УДАЛЕНИЯ РЕГЛИНКА");

        return res.status(200).json({
          status: "success",
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
  async adminRegLink(req, res, next) {
    try {
      const { creater, role, userEmail, workerid, companyName } = req.body;
      const check = await db("userlink").first("*").where({
        user: creater,
      });

      const getCompany = await db("company").first("*").where({
        id: check.company,
      });

      const { plan } = await db("metaenga_plan_insight").first("plan").where({
        companyId: check.company,
      });

      let dbCompany = getCompany.id;
      console.log("COMPANY", dbCompany);
      // const activeUser = await db("metaenga_users")
      //   .count("email as count")
      //   .first()
      //   .where({ company_id: getCompany.id, status: "ACTIVE" });
      // console.log("id", getCompany.id);
      // console.log("email as count", activeUser.count);

      let payedLicense;
      // const activeUserCount = parseInt(activeUser.count, 10);

      const getCompanyUsersLimit = await db("metaenga_plan_insight")
        .first("*")
        .where({ companyId: getCompany.id });

      if (getCompany.plan == "Free") {
        if (getCompanyUsersLimit.companyUsersLimit >= 3) {
          return res.status(402).json({ message: "you have no free license" });
        }
      } else {
        // payedLicense = await db("company").first("payedLicense").where({
        //   id: getCompany.id,
        // });
        // let payedLicenseCount = parseInt(payedLicense.payedLicense, 10);
        // console.log(payedLicenseCount);
        if (getCompanyUsersLimit.companyUsersLimit >= 150) {
          return res.status(402).json({ message: "you have no free license" });
        }
      }

      //   let payedLicenseCount = parseInt(payedLicense.payedLicense, 10)

      //  console.log(payedLicenseCount)
      //  const activeUserCount = parseInt(activeUser.count, 10);

      //  if(activeUserCount >= payedLicenseCount){
      //   return res.status(402).json({"message":"you have no free license"})
      //   }

      const getUsersLimit = await db("metaenga_plans").first("*").where({
        plan: getCompany.plan,
      });

      const getUsers = await db("metaenga_plan_insight").first("*").where({
        companyId: check.company,
      });

      // if (getUsers.companyUsersLimit >= getUsersLimit.companyUsersLimit) {
      //   return res.status(403).json({
      //     status: "limit exceeded",
      //   });
      // }

      // await db("metaenga_plan_insight")
      //   .where({
      //     companyId: check.company,
      //   })
      //   .increment("companyUsersLimit", 1);

      //   const {valid, reason, validators} = await isEmailValid(userEmail);
      //   if(!valid){
      //     return res.status(403).send({
      //     message: "Please provide a valid email address.",
      //     reason: validators[reason].reason
      //   })
      // }
      const checkEmail = await db("userlink").first("*").where({
        login: userEmail,
      });
      if (checkEmail)
        return res.status(401).json({
          status: "this email already registered",
        });
      if (!check)
        return res.status(404).json({
          status: "admin not found",
        });

      if (check.role === "OWNER") {
        const company = await db("company").first("*").where({
          id: check.company,
        });
        const mail = await db("metaenga_users").first("*").where({
          email: userEmail,
        });
        if (role === "ADMIN" && !mail) {
          let token = await jwt.sign(
            { userEmail: userEmail },
            process.env.LINK_TOKEN,
            { expiresIn: "72h" }
          );
          const timeInMs = new Date();
          const checkExistingRecord = await db("reglink").first("*").where({
            email: userEmail,
          });
          if (checkExistingRecord) {
            await db("reglink")
              .update({
                regtoken: token,
                company: company.id,
                userrole: "ADMIN",
                date: timeInMs,
                workerid: workerid,
              })
              .where({
                email: userEmail,
              });
          } else {
            await db("reglink").insert({
              regtoken: token,
              email: userEmail,
              company: company.id,
              userrole: "ADMIN",
              date: timeInMs,
              workerid: workerid,
            });
          }
          const mail = `${process.env.WEB_LINK}/registration?token=${token}`;
          const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" align="center" alt="Atlassian" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:220px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
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
          
          Hi, ${userEmail}
         </td>
        </tr>
        <!-- end paragraph -->

        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          Thank you for registering with Metaenga. We are excited to have you on our cutting-edge XR Training Platform.
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
             <a href=${mail} target="_blank" style="display:inline-block;border:1px solid #0052CC;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#ffffff;text-decoration:none;border-radius: 3px; padding:15px 40px;">
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
  👋 The Metaenga team
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

          const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

          const headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };

          const apiUrlForSendActivateAccountLetter =
            "https://app.loops.so/api/v1/transactional";

          // Об'єкт даних для створення контакту
          const contactDataForSendActivateAccountLetter = {
            transactionalId: "clmelp69u00g8kx0qj166wsnx",
            email: userEmail,
            dataVariables: {
              firstName: userEmail,
              companyName: companyName,
              Token: token,
            },
          };

          const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${userEmail}`;

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
                  email: userEmail,
                  firstName: userEmail,
                  companyName: companyName,
                  companyId: "non-activated account",
                  userGroup: "ADMIN",
                  source: "Metaenga",
                  plan: plan,
                  token: token,
                };

                const response = await axios
                  .put(apiUrl, updateData, {
                    headers,
                  })
                  .then(async (response) => {
                    // Відправка POST-запиту з використанням ключа API
                    const responseForSendActivateAccountLetter =
                      await axios.post(
                        apiUrlForSendActivateAccountLetter,
                        contactDataForSendActivateAccountLetter,
                        { headers }
                      );
                  });
              } else {
                // Контакт із вказаною електронною адресою не знайдено
                const apiUrl = "https://app.loops.so/api/v1/contacts/create";

                // Об'єкт даних для створення контакту
                const contactData = {
                  email: userEmail,
                  firstName: userEmail,
                  companyName: companyName,
                  companyId: "non-activated account",
                  userGroup: "ADMIN",
                  source: "Metaenga",
                  plan: plan,
                  token: token,
                };

                // Відправка POST-запиту з використанням ключа API
                axios
                  .post(apiUrl, contactData, { headers })
                  .then(async (response) => {
                    // Відправка POST-запиту з використанням ключа API
                    const responseForSendActivateAccountLetter =
                      await axios.post(
                        apiUrlForSendActivateAccountLetter,
                        contactDataForSendActivateAccountLetter,
                        { headers }
                      );
                  });
              }
            }
          }

          return res.status(201).json({
            status: "success",
            company: company.companyName,
          });
        } else if (role === "ENHANCED" && !mail) {
          let token = await jwt.sign(
            { userEmail: userEmail },
            process.env.LINK_TOKEN,
            { expiresIn: "72h" }
          );
          const timeInMs = new Date();
          const checkExistingRecord = await db("reglink").first("*").where({
            email: userEmail,
          });
          if (checkExistingRecord) {
            await db("reglink")
              .update({
                regtoken: token,
                company: company.id,
                userrole: "ENHANCED",
                date: timeInMs,
                workerid: workerid,
              })
              .where({
                email: userEmail,
              });
          } else {
            await db("reglink").insert({
              regtoken: token,
              email: userEmail,
              company: company.id,
              userrole: "ENHANCED",
              date: timeInMs,
              workerid: workerid,
            });
          }

          const mail = `${process.env.WEB_LINK}/registration?token=${token}`;
          const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" align="center" alt="Atlassian" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:220px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
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
          
          Hi, ${userEmail}
         </td>
        </tr>
        <!-- end paragraph -->

        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          Thank you for registering with Metaenga. We are excited to have you on our cutting-edge XR Training Platform.
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
             <a href=${mail} target="_blank" style="display:inline-block;border:1px solid #0052CC;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#ffffff;text-decoration:none;border-radius: 3px; padding:15px 40px;">
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
  👋 The Metaenga team
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

          const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
          const headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };

          const apiUrlForSendActivateAccountLetter =
            "https://app.loops.so/api/v1/transactional";

          // Об'єкт даних для створення контакту
          const contactDataForSendActivateAccountLetter = {
            transactionalId: "clmelp69u00g8kx0qj166wsnx",
            email: userEmail,
            dataVariables: {
              firstName: userEmail,
              companyName: companyName,
              Token: token,
            },
          };

          const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${userEmail}`;

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
                  email: userEmail,
                  firstName: userEmail,
                  companyName: companyName,
                  companyId: "non-activated account",
                  userGroup: "ENHANCED",
                  source: "Metaenga",
                  plan: plan,
                  token: token,
                };

                const response = await axios
                  .put(apiUrl, updateData, {
                    headers,
                  })
                  .then(async (response) => {
                    // Відправка POST-запиту з використанням ключа API
                    const responseForSendActivateAccountLetter = axios.post(
                      apiUrlForSendActivateAccountLetter,
                      contactDataForSendActivateAccountLetter,
                      { headers }
                    );
                  });
              } else {
                // Контакт із вказаною електронною адресою не знайдено
                const apiUrl = "https://app.loops.so/api/v1/contacts/create";

                // Об'єкт даних для створення контакту
                const contactData = {
                  email: userEmail,
                  firstName: userEmail,
                  companyName: companyName,
                  companyId: "non-activated account",
                  userGroup: "ENHANCED",
                  source: "Metaenga",
                  plan: plan,
                  token: token,
                };

                // Відправка POST-запиту з використанням ключа API
                axios
                  .post(apiUrl, contactData, { headers })
                  .then(async (response) => {
                    // Відправка POST-запиту з використанням ключа API
                    const responseForSendActivateAccountLetter = axios.post(
                      apiUrlForSendActivateAccountLetter,
                      contactDataForSendActivateAccountLetter,
                      { headers }
                    );
                  });
              }
            }
          }
          return res.status(201).json({
            status: "success",
            company: company.companyName,
          });
        } else if (mail) {
          return res.status(401).json({
            status: "this email already registered",
          });
        }
      } else if (check.role === "ADMIN") {
        const company = await db("company").first("*").where({
          id: check.company,
        });
        const mail = await db("metaenga_users").first("*").where({
          email: userEmail,
        });
        if (role === "ENHANCED") {
          let token = await jwt.sign(
            { userEmail: userEmail },
            process.env.LINK_TOKEN,
            { expiresIn: "72h" }
          );
          const timeInMs = new Date();
          const checkExistingRecord = await db("reglink").first("*").where({
            email: userEmail,
          });
          if (checkExistingRecord) {
            await db("reglink")
              .update({
                regtoken: token,
                company: company.id,
                userrole: "ENHANCED",
                date: timeInMs,
                workerid: workerid,
              })
              .where({
                email: userEmail,
              });
          } else {
            await db("reglink").insert({
              regtoken: token,
              email: userEmail,
              company: company.id,
              userrole: "ENHANCED",
              date: timeInMs,
              workerid: workerid,
            });
          }

          const mail = `${process.env.WEB_LINK}/registration?token=${token}`;
          const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" align="center" alt="Atlassian" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:220px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
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
          
          Hi, ${userEmail}
         </td>
        </tr>
        <!-- end paragraph -->

        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          Thank you for registering with Metaenga. We are excited to have you on our cutting-edge XR Training Platform.
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
             <a href=${mail} target="_blank" style="display:inline-block;border:1px solid #0052CC;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#ffffff;text-decoration:none;border-radius: 3px; padding:15px 40px;">
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
  👋 The Metaenga team
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
          const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
          const headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };

          const apiUrlForSendActivateAccountLetter =
            "https://app.loops.so/api/v1/transactional";

          // Об'єкт даних для створення контакту
          const contactDataForSendActivateAccountLetter = {
            transactionalId: "clmelp69u00g8kx0qj166wsnx",
            email: userEmail,
            dataVariables: {
              firstName: userEmail,
              companyName: companyName,
              Token: token,
            },
          };

          const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${userEmail}`;

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
                  email: userEmail,
                  firstName: userEmail,
                  companyName: companyName,
                  companyId: "non-activated account",
                  userGroup: "ENHANCED",
                  source: "Metaenga",
                  plan: plan,
                  token: token,
                };

                const response = await axios
                  .put(apiUrl, updateData, {
                    headers,
                  })
                  .then(async (response) => {
                    // Відправка POST-запиту з використанням ключа API
                    const responseForSendActivateAccountLetter =
                      await axios.post(
                        apiUrlForSendActivateAccountLetter,
                        contactDataForSendActivateAccountLetter,
                        { headers }
                      );
                  });
              } else {
                // Контакт із вказаною електронною адресою не знайдено
                const apiUrl = "https://app.loops.so/api/v1/contacts/create";

                // Об'єкт даних для створення контакту
                const contactData = {
                  email: userEmail,
                  firstName: userEmail,
                  companyName: companyName,
                  companyId: "non-activated account",
                  userGroup: "ENHANCED",
                  source: "Metaenga",
                  plan: plan,
                  token: token,
                };

                // Відправка POST-запиту з використанням ключа API
                axios
                  .post(apiUrl, contactData, { headers })
                  .then(async (response) => {
                    // Відправка POST-запиту з використанням ключа API
                    await axios.post(
                      apiUrlForSendActivateAccountLetter,
                      contactDataForSendActivateAccountLetter,
                      { headers }
                    );
                  });
              }
            }
          }
          return res.status(201).json({
            status: "success",
            company: company.companyName,
          });
        } else if (mail) {
          return res.status(401).json({
            status: "this email already registered",
          });
        }
      } else {
        return res.status(402).json({
          status: "wrong permission",
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
  async ownerReg(req, res, next) {
    try {
      const { admin, userEmail, companyID } = req.body;
      let name;
      const check = await db("admin").first("*").where({
        id: admin,
      });

      const getCompany = await db("company").first("*").where({
        id: companyID,
      });

      console.log("COMPANY", getCompany);
      name = getCompany.companyName;
      const getUsersLimit = await db("metaenga_plans").first("*").where({
        plan: getCompany.plan,
      });

      let dbCompany = getCompany.id;
      console.log("COMPANY", getCompany);
      const activeUser = await db("metaenga_users")
        .count("email as count")
        .first()
        .where({
          company_id: getCompany.id,
          status: "ACTIVE",
        });
      console.log("aaaaaaaaaaaaaaaaaa", activeUser.count || 0);

      let payedLicense;
      const activeUserCount = parseInt(activeUser.count, 10);
      if (getCompany.plan == "Free") {
        if (activeUserCount >= 3) {
          return res.status(402).json({ message: "you have no free license" });
        }
      } else {
        payedLicense = await db("company").first("payedLicense").where({
          id: getCompany.id,
        });
        let payedLicenseCount = parseInt(payedLicense.payedLicense, 10);
        console.log(payedLicenseCount);
        if (activeUserCount >= payedLicenseCount) {
          return res.status(402).json({ message: "you have no free license" });
        }
      }

      const getUsers = await db("metaenga_plan_insight").first("*").where({
        companyId: companyID,
      });

      if (getUsers.companyUsersLimit >= getUsersLimit.companyUsersLimit) {
        return res.status(403).json({
          status: "limit exceeded",
        });
      }
      await db("metaenga_plan_insight")
        .where({
          companyId: companyID,
        })
        .increment("companyUsersLimit", 1);

      const checkEmail = await db("userlink").first("*").where({
        login: userEmail,
      });
      if (checkEmail)
        return res.status(401).json({
          status: "this email already registered",
        });
      //   const {valid, reason, validators} = await isEmailValid(userEmail);
      //   if(!valid){
      //     return res.status(403).send({
      //     message: "Please provide a valid email address.",
      //     reason: validators[reason].reason
      //   })
      // }
      const company = await db("company").first("*").where({
        id: companyID,
      });
      if (check && company) {
        let token = await jwt.sign(
          { userEmail: userEmail },
          process.env.LINK_TOKEN,
          { expiresIn: "72h" }
        );
        const timeInMs = new Date();
        const checkExistingRecord = await db("reglink").first("*").where({
          email: userEmail,
        });
        if (checkExistingRecord) {
          await db("reglink")
            .update({
              regtoken: token,
              company: name,
              userrole: "OWNER",
              date: timeInMs,
            })
            .where({
              email: userEmail,
            });
        } else {
          await db("reglink").insert({
            regtoken: token,
            email: userEmail,
            company: name,
            userrole: "OWNER",
            date: timeInMs,
          });
        }

        const mail = `${process.env.WEB_LINK}/registration?token=${token}`;
        const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" align="center" alt="Atlassian" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:220px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
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
          
          Hi, ${userEmail}
         </td>
        </tr>
        <!-- end paragraph -->

        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          Thank you for registering with Metaenga. We are excited to have you on our cutting-edge XR Training Platform.
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
             <a href=${mail} target="_blank" style="display:inline-block;border:1px solid #0052CC;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#ffffff;text-decoration:none;border-radius: 3px; padding:15px 40px;">
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
  👋 The Metaenga team
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
        const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

        const apiUrlForSendActivateAccountLetter =
          "https://app.loops.so/api/v1/transactional";

        // Об'єкт даних для створення контакту
        const contactDataForSendActivateAccountLetter = {
          transactionalId: "clmelp69u00g8kx0qj166wsnx",
          email: userEmail,
          dataVariables: {
            firstName: userEmail,
            companyName: company.companyName,
            Token: token,
          },
        };

        const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${userEmail}`;

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
                email: userEmail,
                firstName: userEmail,
                companyName: company.companyName,
                companyId: "non-activated account",
                userGroup: "Owner",
                source: "Metaenga",
                plan: "Free",
                token: token,
              };

              const response = await axios
                .put(apiUrl, updateData, { headers })
                .then(async (response) => {
                  // Відправка POST-запиту з використанням ключа API
                  const responseForSendActivateAccountLetter = axios.post(
                    apiUrlForSendActivateAccountLetter,
                    contactDataForSendActivateAccountLetter,
                    { headers }
                  );
                });
            } else {
              // Контакт із вказаною електронною адресою не знайдено
              const apiUrl = "https://app.loops.so/api/v1/contacts/create";

              // Об'єкт даних для створення контакту
              const contactData = {
                email: userEmail,
                firstName: userEmail,
                companyName: company.companyName,
                companyId: "non-activated account",
                userGroup: "Owner",
                source: "Metaenga",
                plan: "Free",
                token: token,
              };

              // Відправка POST-запиту з використанням ключа API
              axios
                .post(apiUrl, contactData, { headers })
                .then(async (response) => {
                  // Відправка POST-запиту з використанням ключа API
                  const responseForSendActivateAccountLetter = axios.post(
                    apiUrlForSendActivateAccountLetter,
                    contactDataForSendActivateAccountLetter,
                    { headers }
                  );
                });
            }
          }
        }
        return res.status(201).json({
          status: "success",
          company: company.companyName,
        });
      } else if (!check) {
        return res.status(402).json({
          status: "wrong permission",
        });
      } else if (!company) {
        return res.status(404).json({
          status: "company not found",
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
  async getRegistrators(req, res, next) {
    try {
      const id = req.params.id;
      const check = await db("admin").first("*").where({
        id: id,
      });
      if (check) {
        const get = await db("reglink").select("*").where({
          userrole: "OWNER",
        });
        if (!get) {
          return res.status(404).json({
            status: "not found",
          });
        }
        return res.status(200).json({
          status: "success",
          data: get,
        });
      } else {
        return res.status(402).json({
          status: "permission error",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getRegistratorsForUser(req, res, next) {
    try {
      const id = req.params.id;
      const owner = await db("userlink").first("*").where({
        user: id,
        role: "OWNER",
      });
      const admin = await db("userlink").first("*").where({
        user: id,
        role: "ADMIN",
      });
      if (owner) {
        const company = await db("company").first("*").where({
          id: owner.company,
        });
        const getADMIN = await db("reglink").select("*").where({
          userrole: "ADMIN",
          company: company.id,
        });
        const getENHANCED = await db("reglink").select("*").where({
          userrole: "ENHANCED",
          company: company.id,
        });
        if (!getADMIN && !getENHANCED) {
          return res.status(404).json({
            status: "not found",
          });
        }
        return res.status(200).json({
          status: "success",
          ADMIN: getADMIN,
          ENHANCED: getENHANCED,
        });
      } else if (admin) {
        const company = await db("company").first("*").where({
          id: admin.company,
        });
        const get = await db("reglink").select("*").where({
          userrole: "ENHANCED",
          company: company.id,
        });
        if (!get) {
          return res.status(404).json({
            status: "not found",
          });
        }
        return res.status(200).json({
          status: "success",
          ENHANCED: get,
        });
      } else {
        return res.status(402).json({
          status: "permission error",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async authUsers(req, res, next) {
    try {
      const { login, password } = req.body;
      const check = await db("userlink").first("*").where({
        login: login,
      });
      if (!check) return res.status(404).json({ status: "wrong login" });
      const check2 = await db("company").first("*").where({
        id: check.company,
        google: 1,
      });
      if (check2)
        return res.status(401).json({ status: "registered using google" });
      if (check) {
        const user = await db("metaenga_users").first("*").where({
          email: login,
        });
        if (user.status == "ACTIVE") {
          const checkPass = await bcrypt.compare(password, user.password);
          if (checkPass) {
            const token = generateAccessToken({ login: login });
            const time = new Date()
              .toISOString()
              .replace(/T/, " ") // replace T with a space
              .replace(/\..+/, ""); // delete the dot and everything after
            await db("metaenga_users")
              .update({
                lastActivity: time,
              })
              .where({
                email: login,
              });
            authStat(req, user.id, "LOGIN");
            return res.status(200).json({
              status: "success",
              token: token,
              company: check.company,
              data: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                id: user.id,
                role: user.role,
                status: user.status,
              },
            });
          } else {
            return res.status(403).json({
              status: "wrong password",
            });
          }
        } else if (user.status == "DEACTIVATED") {
          return res.status(402).json({
            status: "user deactivated",
          });
        }
      } else {
        return res.status(404).json({
          status: "wrong login",
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
  async authUsersVR(req, res, next) {
    try {
      const { login, password } = req.body;
      const check = await db("userlink").first("*").where({
        login: login,
      });
      const company = await db("company").first("*").where({
        id: check.company,
      });

      if (check) {
        const user = await db("metaenga_users").first("*").where({
          email: login,
        });
        if (user.status == "ACTIVE") {
          const checkPass = await bcrypt.compare(password, user.password);
          if (checkPass) {
            const token = generateAccessToken({ login: login });
            const time = new Date()
              .toISOString()
              .replace(/T/, " ") // replace T with a space
              .replace(/\..+/, ""); // delete the dot and everything after
            await db("metaenga_users")
              .update({
                lastActivity: time,
              })
              .where({
                email: login,
              });
            authStat(req, user.id, "LOGIN");
            return res.status(200).json({
              status: "success",
              token: token,
              company: check.company,
              data: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                id: user.id,
                role: user.role,
                status: user.status,
                confirmation_status: company.confirmed_email,
              },
            });
          } else {
            return res.status(403).json({
              status: "wrong password",
            });
          }
        } else if (user.status == "DEACTIVATED") {
          return res.status(402).json({
            status: "user deactivated",
          });
        }
      } else {
        return res.status(404).json({
          status: "wrong login",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteInviteDev(req, res, next) {
    try {
      const { admin, token } = req.body;
      const check = await db("admin").first("*").where({
        id: admin,
      });
      if (check) {
        const deleteInvite = await db("reglink")
          .where({
            regtoken: token,
            userrole: "OWNER",
          })
          .del();
        if (deleteInvite) {
          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(404).json({
            status: "error",
          });
        }
      } else {
        return res.status(402).json({
          status: "permission error",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteInviteOwner(req, res, next) {
    try {
      const { owner, token } = req.body;
      const check = await db("userlink").first("*").where({
        user: owner,
        role: "OWNER",
      });
      const company = await db("company").first("*").where({
        id: check.company,
      });

      if (check && company) {
        const checkToken = await db("reglink").first("*").where({
          regtoken: token,
        });

        if (
          checkToken.userrole === "ADMIN" &&
          checkToken.company === company.id
        ) {
          const deleteInvite = await db("reglink")
            .where({
              regtoken: token,
              userrole: "ADMIN",
              company: company.id,
            })
            .del();
          if (deleteInvite) {
            return res.status(200).json({
              status: "success",
            });
          }
        } else if (
          checkToken.userrole === "ENHANCED" &&
          checkToken.company === company.id
        ) {
          const deleteInvite = await db("reglink")
            .where({
              regtoken: token,
              userrole: "ENHANCED",
              company: company.id,
            })
            .del();
          if (deleteInvite) {
            return res.status(200).json({
              status: "success",
            });
          }
        } else {
          return res.status(404).json({
            status: "error",
          });
        }
      } else if (!company) {
        return res.status(402).json({
          status: "company not found",
        });
      } else {
        return res.status(402).json({
          status: "wrong permission",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteInviteAdmin(req, res, next) {
    try {
      const { admin, token } = req.body;
      const check = await db("userlink").first("*").where({
        user: admin,
        role: "ADMIN",
      });
      const company = await db("company").first("*").where({
        id: check.company,
      });
      if (check && company) {
        const checkToken = await db("reglink").first("*").where({
          regtoken: token,
        });

        if (
          checkToken.userrole === "ENHANCED" &&
          checkToken.company === company.id
        ) {
          const deleteInvite = await db("reglink")
            .where({
              regtoken: token,
              userrole: "ENHANCED",
              company: company.id,
            })
            .del();
          if (deleteInvite) {
            return res.status(200).json({
              status: "success",
            });
          }
        } else {
          return res.status(404).json({
            status: "error",
          });
        }
      } else if (!company) {
        return res.status(402).json({
          status: "company not found",
        });
      } else {
        return res.status(402).json({
          status: "wrong permission",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async createBasic(req, res, next) {
    try {
      const { owner } = req.body;
      const check = await db("userlink").first("*").where({
        user: owner,
        role: "OWNER",
      });
      if (check) {
        const company = await db("company").first("*").where({
          id: check.company,
        });
        const abbrev = await getFirstLetters(company.companyName);
        let id = await randomID();
        let login = `${abbrev}${id}`;
        const checkLogin = await db("basic").first("*").where({
          login: login,
        });
        if (checkLogin) {
          return res.status(400).json({
            status: "login already exists please recreate",
          });
        }
        let password = await randomPassword();
        let hash = await crypto.createHash("md5").update(login).digest("hex");
        console.log({
          data: {
            owner: owner,
            password: password,
            id: hash,
            login: login,
          },
        });
        await db("basic").insert({
          owner: owner,
          password: password,
          id: hash,
          login: login,
        });

        return res.status(200).json({
          status: "success",
          data: {
            login: login,
            password: password,
          },
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async editUsers(req, res, next) {
    try {
      const { name, phone, id, location, job, workerid } = req.body;
      const company = await db("userlink").first("*").where({
        user: id,
      });

      if (!company) {
        return res.status(404).json({
          status: "user not found",
        });
      }
      const check = await db("company").first("*").where({
        id: company.company,
        userEmail: company.login,
      });
      if ((check && phone) || name) {
        await db("company")
          .update({
            ...(phone
              ? { phoneNumber: phone }
              : phone === ""
              ? { phoneNumber: null }
              : {}),
            ...(name
              ? { contact: name }
              : name === ""
              ? { contact: null }
              : {}),
          })
          .where({
            id: company.company,
            userEmail: company.login,
          });
      }

      await db("metaenga_users")
        .update({
          ...(name ? { name: name } : name === "" ? { name: null } : {}),
          ...(phone ? { phone: phone } : phone === "" ? { phone: null } : {}),
          ...(location
            ? { location: location }
            : location === ""
            ? { location: null }
            : {}),
          ...(job ? { job: job } : job === "" ? { job: null } : {}),
          ...(workerid
            ? { workerid: workerid }
            : workerid === ""
            ? { workerid: null }
            : {}),
        })
        .where({
          id: id,
        });

      const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${company.login}`;
      console.log(apiUrlFound);
      const responseFound = await axios.get(apiUrlFound, { headers });
      if (responseFound.status === 200) {
        const data = responseFound.data;
        if (Array.isArray(data)) {
          if (data.length > 0) {
            const apiUrl = "https://app.loops.so/api/v1/contacts/update";

            const updateData = {
              email: company.login,
              firstName: name,
            };
            const response = await axios.put(apiUrl, updateData, { headers });
          }
        }
      }

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async changePass(req, res, next) {
    try {
      const { id, oldPass, newPass } = req.body;
      const check = await db("userlink").first("*").where({
        user: id,
      });
      if (check) {
        const user = await db("metaenga_users").first("*").where({
          id: id,
        });
        const checkpass = await bcrypt.compare(oldPass, user.password);
        if (checkpass) {
          const hashPassword = await bcrypt.hash(newPass, 7);

          await db("metaenga_users")
            .update({
              password: hashPassword,
            })
            .where({
              id: id,
            });

          return res.status(201).json({
            status: "password changed",
          });
        } else {
          return res.status(403).json({
            status: "wrong oldPass",
          });
        }
      } else {
        return res.status(404).json({
          status: "user not found",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async sendEmailToChangePassIfNotRemember(req, res, next) {
    try {
      const { email } = req.body;
      const check = await db("changemail").first("*").where({
        email: email,
      });
      const userlink = await db("userlink").first("*").where({
        login: email,
      });
      const checkEmail = await db("metaenga_users").first("*").where({
        email: email,
      });
      if (!checkEmail) {
        return res.status(404).json({
          status: "user not found",
        });
      }
      if (!userlink) {
        return res.status(404).json({
          status: "user not found",
        });
      }

      const code = await randomPassword();
      if (!check) {
        await db("changemail").insert({
          email: email,
          code: code,
        });
      } else if (check) {
        await db("changemail")
          .update({
            code: code,
          })
          .where({
            email: email,
          });
      }

      const companyInfo = await db("company")
        .where({
          id: checkEmail.company_id,
        })
        .first();

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
        transactionalId: "clsczpzth008x8dyei7o4htb9",
        email: email,
        dataVariables: {
          firstName: email,
          sixCode: code,
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
              sixCode: code,
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
              companyName: companyInfo.companyName,
              companyId: checkEmail.company_id,
              userGroup: checkEmail.role,
              source: "Old company",
              plan: companyInfo.plan,
              sixCode: code,
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
        status: "code updated",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getCodeToChangePassIfNotRemember(req, res, next) {
    try {
      const email = req.params.email;
      const code = req.params.code;
      const check = await db("changemail").first("*").where({
        email: email,
        code: code,
      });
      const userlink = await db("userlink").first("*").where({
        login: email,
      });

      const company = await db("company").first("*").where({
        id: userlink.company,
      });
      if (!userlink) {
        return res.status(404).json({
          status: "user not found",
        });
      }
      if (check) {
        return res.status(200).json({
          status: "success",
          data: check,
          company: company.companyName,
        });
      } else {
        return res.status(403).json({
          status: "wrong code",
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
  async changePassIfNotRemember(req, res, next) {
    try {
      const { email, code, newPass } = req.body;
      const check = await db("changemail").first("*").where({
        email: email,
        code: code,
      });
      if (check) {
        const company = await db("userlink").first("*").where({
          login: email,
        });
        if (!company) {
          return res.status(404).json({
            status: "user not found",
          });
        }
        const hashPassword = await bcrypt.hash(newPass, 7);
        await db("metaenga_users")
          .update({
            password: hashPassword,
          })
          .where({
            email: email,
          });
        await db("changemail")
          .where({
            email: email,
            code: code,
          })
          .del();
        return res.status(200).json({
          status: "success",
        });
      } else {
        return res.status(403).json({
          status: "email or code is wrong",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async editVideo(req, res) {
    try {
      const { userId, videoId, theme, description, name } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      if (!user) {
        return res.status(403).json({
          status: "user not found",
        });
      }
      if (user.role === "OWNER" || user.role === "ADMIN") {
        const checkVideo = await db("metaenga_videos").first("*").where({
          id: videoId,
        });
        if (!checkVideo) {
          return res.status(404).json({
            status: "video not found",
          });
        } else {
          const time = new Date()
            .toISOString()
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, ""); // delete the dot and everything after

          await db("metaenga_videos")
            .update({
              videoTheme: theme,
              videoDescription: description,
              videoName: name,
              Data: time,
            })
            .where({
              id: videoId,
            });
          return res.status(200).json({
            status: "success",
          });
        }
      } else {
        return res.status(402).json({
          status: "you are not owner or admin",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getUserInfo(req, res, next) {
    try {
      const userId = req.params.userId;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      if (!user) {
        return res.status(404).json({
          status: "user not found",
        });
      }
      const group = await db("metaenga_member_of_group")
        .pluck("groupName")
        .where({
          userId: userId,
          companyId: user.company,
        });
      const company = await db("metaenga_users").first("*").where({
        id: userId,
      });
      return res.status(200).json({
        status: "success",
        data: {
          company: user.company,
          name: company.name,
          email: company.email,
          phone: company.phone,
          group: group,
          role: user.role,
          status: company.status,
          avatar: company.avatar,
          workerid: company.workerid,
          job: company.job,
          location: company.location,
          id: company.id,
        },
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async createGroup(req, res, next) {
    try {
      const { userId, groupName } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const check = await db("metaenga_groups").first("*").where({
        groupName: groupName,
        companyId: user.company,
      });
      if (check) {
        return res.status(403).json({
          status: "group already exist",
        });
      } else {
        await db("metaenga_groups").insert({
          groupName: groupName,
          companyId: user.company,
          userId: userId,
        });
        return res.status(200).json({
          status: "success",
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
  async addToGroup(req, res, next) {
    try {
      const { userId, groupName, userArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const check = await db("metaenga_groups").first("*").where({
        groupName: groupName,
        userId: userId,
        companyId: user.company,
      });
      if (!check) {
        return res.status(404).json({
          status: "group not found",
        });
      }
      for (let i = 0; i < userArr.length; i++) {
        const check = await db("metaenga_member_of_group").first("*").where({
          groupName: groupName,
          userId: userArr[i],
          companyId: user.company,
        });
        if (!check) {
          await db("metaenga_member_of_group").insert({
            groupName: groupName,
            userId: userArr[i],
            companyId: user.company,
          });
        } else {
          continue;
        }
      }

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async addContentToGroup(req, res, next) {
    try {
      const { userId, assign, groupName, contentIdArr } = req.body; //assign = 1 - metaenga 0 =client
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      for (let i = 0; i < contentIdArr.length; i++) {
        const content = await db("metaenga_group_access").first("*").where({
          contentId: contentIdArr[i],
          companyId: user.company,
          groupName: groupName,
          userId: userId,
          assign: assign,
        });
        if (!content) {
          await db("metaenga_group_access").insert({
            contentId: contentIdArr[i],
            companyId: user.company,
            groupName: groupName,
            userId: userId,
            assign: assign,
          });
        } else {
          continue;
        }
      }
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteAccessFromGroup(req, res, next) {
    try {
      const { userId, groupName, contentIdArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      for (let i = 0; i < contentIdArr.length; i++) {
        const content = await db("metaenga_group_access").first("*").where({
          contentId: contentIdArr[i],
          companyId: user.company,
          groupName: groupName,
          userId: userId,
        });
        if (content) {
          await db("metaenga_group_access").delete().where({
            contentId: contentIdArr[i],
            companyId: user.company,
            groupName: groupName,
            userId: userId,
          });
        } else {
          continue;
        }
      }
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async changeRole(req, res, next) {
    try {
      const { adminId, changeId, role } = req.body;
      const admin = await db("userlink").first("*").where({
        user: adminId,
      });
      const user = await db("userlink").first("*").where({
        user: changeId,
      });
      if (admin.company !== user.company) {
        return res.status(402).json({
          status: "not same company",
        });
      }
      if (role !== "ADMIN" && role !== "ENHANCED") {
        return res.status(403).json({
          status: "error",
          message: "role not found",
        });
      }
      if (!admin || !user) {
        return res.status(404).json({
          status: "user not found",
        });
      }
      if (admin.role === "OWNER") {
        if (user.role === "OWNER") {
          return res.status(402).json({
            status: "you can't change owner role",
          });
        }
        await db("userlink")
          .update({
            role: role,
          })
          .where({
            user: changeId,
          });
        await db("metaenga_users")
          .update({
            role: role,
          })
          .where({
            id: changeId,
          });

        const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${user.login}`;
        console.log(user.login);
        const responseFound = await axios.get(apiUrlFound, { headers });
        if (responseFound.status === 200) {
          const data = responseFound.data;
          if (Array.isArray(data)) {
            if (data.length > 0) {
              const apiUrl = "https://app.loops.so/api/v1/contacts/update";
              console.log(role);
              const updateData = {
                email: user.login,
                userGroup: role,
              };

              const response = await axios.put(apiUrl, updateData, { headers });
            }
          }
        }

        return res.status(200).json({
          status: "success",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async creatrVrGroup(req, res, next) {
    try {
      const { userId, vrGroupName } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const check = await db("metaenga_group_vr").first("*").where({
        vrGroupName: vrGroupName,
        companyId: user.company,
      });
      if (check) {
        return res.status(403).json({
          status: "vrGroup already exist",
        });
      } else {
        await db("metaenga_group_vr").insert({
          vrGroupName: vrGroupName,
          companyId: user.company,
          userId: userId,
        });
        return res.status(200).json({
          status: "vrGroup added",
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

  async deleteVrGroup(req, res, next) {
    try {
      const { userId, vrGroupName } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const check = await db("metaenga_group_vr").first("*").where({
        vrGroupName: vrGroupName,
        companyId: user.company,
      });
      if (check) {
        await db("metaenga_group_vr").delete().where({
          vrGroupName: vrGroupName,
          companyId: user.company,
          userId: userId,
        });
        await db("metaenga_member_of_group_vr").delete().where({
          vrGroupName: vrGroupName,
          companyId: user.company,
        });
        await db("metaenga_group_vr_access").delete().where({
          vrGroupName: vrGroupName,
          companyId: user.company,
        });
        return res.status(200).json({
          status: "vrGroup deleted",
        });
      } else {
        return res.status(403).json({
          status: "group does not exist",
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

  async addToVrGroup(req, res, next) {
    try {
      const { userId, vrGroupName, userArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const check = await db("metaenga_group_vr").first("*").where({
        vrGroupName: vrGroupName,
        userId: userId,
        companyId: user.company,
      });
      if (!check) {
        return res.status(404).json({
          status: "vrGroup not found",
        });
      }
      for (let i = 0; i < userArr.length; i++) {
        const check = await db("metaenga_member_of_group_vr").first("*").where({
          vrGroupName: vrGroupName,
          userId: userArr[i],
          companyId: user.company,
        });
        if (check) {
          return res.status(404).json({
            status: "this user has already been added",
          });
        } else {
          await db("metaenga_member_of_group_vr").insert({
            vrGroupName: vrGroupName,
            userId: userArr[i],
            companyId: user.company,
          });
          return res.status(200).json({
            status: "success",
          });
        }
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async deleteFromVrGroup(req, res, next) {
    try {
      const { userId, vrGroupName, userArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const check = await db("metaenga_group_vr").first("*").where({
        vrGroupName: vrGroupName,
        userId: userId,
        companyId: user.company,
      });
      if (!check) {
        return res.status(404).json({
          status: "vrGroup not found",
        });
      }
      for (let i = 0; i < userArr.length; i++) {
        const check = await db("metaenga_member_of_group_vr").first("*").where({
          vrGroupName: vrGroupName,
          userId: userArr[i],
          companyId: user.company,
        });
        if (check) {
          await db("metaenga_member_of_group_vr").delete().where({
            vrGroupName: vrGroupName,
            userId: userArr[i],
            companyId: user.company,
          });
          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(404).json({
            status: "no such user",
          });
        }
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async addVrContentToGroup(req, res, next) {
    try {
      const { userId, groupName, contentIdArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const check = await db("metaenga_groups").first("*").where({
        groupName: groupName,
        userId: userId,
      });
      if (!check) {
        return res.status(400).json({
          status: "group not found",
        });
      }
      for (let i = 0; i < contentIdArr.length; i++) {
        const content = await db("metaenga_group_vr_access").first("*").where({
          contentId: contentIdArr[i],
          companyId: user.company,
          vrGroupName: groupName,
          userId: userId,
        });
        if (!content) {
          await db("metaenga_group_vr_access").insert({
            contentId: contentIdArr[i],
            companyId: user.company,
            vrGroupName: groupName,
            userId: userId,
          });
        } else {
          continue;
        }
      }
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async deleteVrContentFromGroup(req, res, next) {
    try {
      const { userId, groupName, contentIdArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      for (let i = 0; i < contentIdArr.length; i++) {
        const content = await db("metaenga_group_vr_access").first("*").where({
          contentId: contentIdArr[i],
          companyId: user.company,
          vrGroupName: groupName,
          userId: userId,
        });
        if (content) {
          await db("metaenga_group_vr_access").delete().where({
            contentId: contentIdArr[i],
            companyId: user.company,
            vrGroupName: groupName,
            userId: userId,
          });
        } else {
          continue;
        }
      }
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async editUserByAdmins(req, res, next) {
    try {
      const { adminId, name, phone, userId, location, job, workerid } =
        req.body;
      const admin = await db("userlink").first("*").where({
        user: adminId,
      });
      const user = await db("userlink").first("*").where({
        user: userId,
      });

      if (!admin || !user) {
        return res.status(404).json({
          status: "user not found",
        });
      }
      if (admin.company !== user.company) {
        return res.status(402).json({
          status: "not same company",
        });
      }
      if (admin.role === "OWNER") {
        if (user.role === "ADMIN" || user.role === "ENHANCED") {
          await db("metaenga_users")
            .update({
              name: name,
              phone: phone,
              location: location,
              job: job,
              workerid: workerid,
            })
            .where({
              id: userId,
            });
          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(402).json({
            status: "you can't change owner",
          });
        }
      } else if (admin.role === "ADMIN") {
        if (user.role === "ENHANCED") {
          await db("metaenga_users")
            .update({
              name: name,
              phone: phone,
              location: location,
              job: job,
              workerid: workerid,
            })
            .where({
              id: userId,
            });
          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(402).json({
            status: "you can't change admin or owner",
          });
        }
      } else {
        return res.status(402).json({
          status: "permission denied",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async addContentToUser(req, res, next) {
    try {
      const { userId, toUser, contentIdArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      for (let i = 0; i < contentIdArr.length; i++) {
        //userId contentId metaenga_user_access
        const content = await db("metaenga_user_access").first("*").where({
          userId: toUser,
          contentId: contentIdArr[i],
          companyId: user.company,
        });
        if (!content) {
          await db("metaenga_user_access").insert({
            userId: toUser,
            contentId: contentIdArr[i],
            companyId: user.company,
            assign: 0,
          });
        } else {
          continue; // skip if already exist
        }
      }

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteAccessFromUsers(req, res, next) {
    try {
      const { userId, toUser, contentIdArr } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });
      for (let i = 0; i < contentIdArr.length; i++) {
        //userId contentId metaenga_user_access
        const content = await db("metaenga_user_access").first("*").where({
          userId: toUser,
          contentId: contentIdArr[i],
          companyId: user.company,
        });
        if (content) {
          await db("metaenga_user_access")
            .where({
              userId: toUser,
              contentId: contentIdArr[i],
              companyId: user.company,
            })
            .del();
        } else {
          continue; // skip if already exist
        }
      }
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteGroup(req, res, next) {
    try {
      const { userId, groupName } = req.body;
      const user = await db("userlink").first("*").where({
        user: userId,
      });

      await db("metaenga_groups")
        .where({
          groupName: groupName,
          companyId: user.company,
        })
        .del();
      await db("metaenga_group_access")
        .where({
          groupName: groupName,
          companyId: user.company,
        })
        .del();
      await db("metaenga_member_of_group")
        .where({
          groupName: groupName,
          companyId: user.company,
        })
        .del();

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getCompanyUsers(req, res, next) {
    try {
      const companyId = req.params.companyId;
      const company = await db("metaenga_users")
        .select(
          "name",
          "email",
          "phone",
          "id",
          "role",
          "status",
          "token",
          "avatar",
          "workerid",
          "job",
          "location",
          "lastActivity"
        )
        .where({
          company_id: companyId,
        });
      if (!company)
        return res.status(404).json({
          status: "company not found",
        });
      for (let i = 0; i < company.length; i++) {
        const user = await db("metaenga_member_of_group")
          .pluck("groupName")
          .where({
            userId: company[i].id,
          });
        company[i].groups = user;
      }
      return res.status(200).json({
        status: "success",
        data: company,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deactivateUser(req, res, next) {
    try {
      const { adminId, userId, email } = req.body;

      if (adminId === userId) {
        return res.status(402).json({
          status: "you can not deactivate yourself",
        });
      }

      const apiUrl = "https://app.loops.so/api/v1/contacts/update";

      const updateData = {
        email: email,
        subscribed: "No",
      };

      const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      const admin = await db("userlink").first("*").where({
        user: adminId,
      });
      const company = await db("company").first("*").where({
        id: admin.company,
      });
      // if(company.plan != 'Free'){
      //   await db('company').where({
      //     id: admin.company
      //   }).decrement('payedLicense', 1)
      // }
      if (admin.role === "OWNER") {
        const user = await db("metaenga_users").first("*").where({
          id: userId,
        });
        if (!user)
          return res.status(404).json({
            status: "user not found",
          });

        await db("metaenga_users")
          .where({
            id: userId,
          })
          .update({
            status: "DEACTIVATED",
          });

        await db("metaenga_plan_insight")
          .where({
            companyId: admin.company,
          })
          .decrement("companyUsersLimit", 1);

        // Відправка PUT-запиту з використанням ключа API
        const response = await axios.put(apiUrl, updateData, { headers });

        return res.status(200).json({
          status: "success",
        });
      } else if (admin.role === "ADMIN") {
        const user = await db("metaenga_users").first("*").where({
          id: userId,
        });
        if (!user)
          return res.status(404).json({
            status: "user not found",
          });
        if (user.role == "ENHANCED") {
          await db("metaenga_users")
            .where({
              id: userId,
            })
            .update({
              status: "DEACTIVATED",
            });
          // Відправка PUT-запиту з використанням ключа API
          const response = await axios.put(apiUrl, updateData, { headers });

          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(402).json({
            status: "you can not deactivate owner, admin",
          });
        }
      } else {
        return res.status(402).json({
          status: "you are not admin or owner",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async activateUser(req, res, next) {
    try {
      const { adminId, userId, email } = req.body;
      const apiUrl = "https://app.loops.so/api/v1/contacts/update";

      const updateData = {
        email: email,
        subscribed: "Yes",
      };

      const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      const admin = await db("userlink").first("*").where({
        user: adminId,
      });
      const company = await db("company").first("*").where({
        id: admin.company,
      });
      let dbCompany = company.id;
      console.log("COMPANY", company);
      // const activeUser = await db("metaenga_users")
      //   .count("email as count")
      //   .where("status", "=", "ACTIVE")
      //   .first();
      // console.log("aaaaaaaaaaaaaaaaaa", activeUser.count || 0);

      const getCompanyUsersLimit = await db("metaenga_plan_insight")
        .first("companyUsersLimit")
        .where({
          companyId: admin.company,
        });

      let payedLicense;
      let payedLicenseCount;
      //const activeUserCount = parseInt(activeUser.count, 10);
      if (company.plan == "Free") {
        if (getCompanyUsersLimit.companyUsersLimit >= 3) {
          return res.status(402).json({ status: "you have no free license" });
        }
      } else {
        payedLicense = await db("company").first("payedLicense").where({
          id: admin.company,
        });
        payedLicenseCount = parseInt(payedLicense.payedLicense, 10);
        console.log("aaaaaaaaaaaaaaa", payedLicense);
        console.log("bbbbbbbbbbbb", payedLicenseCount);
        console.log("cccccccccccc", getCompanyUsersLimit.companyUsersLimit);
        if (getCompanyUsersLimit.companyUsersLimit >= payedLicenseCount) {
          return res.status(402).json({ status: "you have no free license" });
        }
      }
      await db("metaenga_plan_insight")
        .where({
          companyId: admin.company,
        })
        .increment("companyUsersLimit", 1);

      // if(company.plan != 'Free'){
      //   await db('company').where({
      //     id: admin.company
      //   }).decrement('payedLicense', 1)
      // }
      if (admin.role === "OWNER") {
        const user = await db("metaenga_users").first("*").where({
          id: userId,
        });
        if (!user)
          return res.status(404).json({
            status: "user not found",
          });

        await db("metaenga_users")
          .where({
            id: userId,
          })
          .update({
            status: "ACTIVE",
          });

        const response = await axios.put(apiUrl, updateData, { headers });

        return res.status(200).json({
          status: "success",
        });
      } else if (admin.role === "ADMIN") {
        const user = await db("metaenga_users").first("*").where({
          id: userId,
        });
        if (!user)
          return res.status(404).json({
            status: "user not found",
          });
        if (user.role == "ENHANCED") {
          await db("metaenga_users")
            .where({
              id: userId,
            })
            .update({
              status: "ACTIVE",
            });
          const response = await axios.put(apiUrl, updateData, { headers });
          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(402).json({
            status: "you can not deactivate owner, admin",
          });
        }
      } else {
        return res.status(402).json({
          status: "you are not admin or owner",
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
  async getCompanyInfo(req, res, next) {
    try {
      const companyId = req.params.companyId;
      const company = await db("company")
        .first(
          "companyName",
          "id",
          "logo",
          "website",
          "BillingContact",
          "ITcontact",
          "DecisionMaker",
          "confirmed_email"
        )
        .where({
          id: companyId,
        });
      if (!company)
        return res.status(404).json({
          status: "company not found",
        });
      return res.status(200).json({
        status: "success",
        data: company,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async editCompanyInfo(req, res, next) {
    try {
      const companyId = req.params.companyId;
      const { companyName, website, BillingContact, ITcontact, DecisionMaker } =
        req.body;
      const check = await db("company").first("*").where({
        id: companyId,
      });
      if (companyName) {
        const checkName = await db("company").first("*").where({
          companyName: companyName,
        });

        console.log("AAAAAAAAAAAAAAAAAAAAAAA", checkName);
        if (checkName) {
          console.log("THIS COMPANY NAME ALREADY REGISTERED");
          return res
            .status(401)
            .json({ error: "this company name already registered" });
        }
      }

      if (!check) {
        console.log("COMPANY NOT FOUND");
        return res.status(404).json({
          status: "company not found",
        });
      } else {
        console.log("IN ELSE");
        if (companyName) {
          const getUsers = await db("userlink").pluck("login").where({
            company: companyId,
          });
          console.log(getUsers);
          console.log("companyID", companyId);
          console.log("getUsers", getUsers);
          getUsers.forEach(async (user) => {
            console.log(user);

            const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
            const headers = {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            };
            const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${user}`;
            console.log(apiUrlFound);
            const responseFound = await axios.get(apiUrlFound, { headers });
            if (responseFound.status === 200) {
              const data = responseFound.data;
              if (Array.isArray(data)) {
                if (data.length > 0) {
                  const apiUrl = "https://app.loops.so/api/v1/contacts/update";
                  const updateData = {
                    email: user,
                    companyName: companyName,
                  };
                  const headers = {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  };
                  const response = await axios.put(apiUrl, updateData, {
                    headers,
                  });
                  console.log(`UPDATED CONTACT ${user}`);
                }
              }
            }
          });
        }
        await db("company")
          .update({
            companyName: companyName,
            website: website,
            BillingContact: BillingContact,
            ITcontact: ITcontact,
            DecisionMaker: DecisionMaker,
          })
          .where({
            id: companyId,
          });
        console.log("IAAAAAAAAAAAAAAAA");
      }
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(`ПОМИЛКА: ${error}`);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getGroupUsers(req, res, next) {
    try {
      const companyId = req.params.companyId;

      console.log(companyId);
      const check = await db("metaenga_groups").first("*").where({
        companyId: companyId,
      });
      const group = await db("metaenga_groups").select("*").where({
        companyId: companyId,
      });
      if (!check) {
        return res.status(404).json({
          status: "group not found",
        });
      } else {
        let groupArray = [];
        for (let i = 0; i < group.length; i++) {
          const array = await db("metaenga_member_of_group")
            .pluck("userId")
            .where({
              groupName: group[i].groupName,
              companyId: companyId,
            });
          let obj = {
            Name: group[i].groupName,
            Users: array,
          };
          groupArray.push(obj);
        }
        return res.status(200).json({
          status: "success",
          groupUsers: groupArray,
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
  async getOneGroupUsers(req, res, next) {
    try {
      const companyId = req.params.companyId;
      const groupName = req.params.groupName;
      const check = await db("metaenga_groups").first("*").where({
        companyId: companyId,
        groupName: groupName,
      });
      if (!check) return res.status(404).json({ status: "group not found" });
      const group = await db("metaenga_member_of_group").pluck("userId").where({
        groupName: groupName,
        companyId: companyId,
      });
      const access = await db("metaenga_group_access")
        .pluck("contentId")
        .where({
          groupName: groupName,
          companyId: companyId,
        });
      return res.status(200).json({
        status: "success",
        groupUsers: group,
        access: access,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async DeleteUserIfDeactivated(req, res, next) {
    try {
      const { adminId, userId, email } = req.body;

      const apiUrl = "https://app.loops.so/api/v1/contacts/delete";
      const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      const deleteData = {
        email: email,
      };

      const admin = await db("userlink").first("*").where({
        user: adminId,
      });

      const UsersLimit = await db("metaenga_plan_insight").first("*").where({
        companyId: admin.company,
      });

      if (UsersLimit.companyUsersLimit <= 0) {
        return res.status(404).json({ status: "limit" });
      }

      // await db("metaenga_plan_insight")
      //   .where({
      //     companyId: admin.company,
      //   })
      //   .decrement("companyUsersLimit", 1);

      if (admin.role === "OWNER") {
        const user = await db("metaenga_users").first("*").where({
          id: userId,
        });

        if (!user)
          return res.status(404).json({
            status: "user not found",
          });
        if (user.status === "ACTIVE") {
          return res.status(402).json({
            status: "user is active",
          });
        }
        if (user.role != "OWNER") {
          const groupArr = user.group;
          if (groupArr != null) {
            groupArr.map(async (group) => {
              const Group = await db("groups").first("*").where({
                Company: admin.company,
                Name: group,
              });
              const userArr = Group.Users;
              const index = userArr.indexOf(userId);
              userArr.splice(index, 1);
              const json = JSON.stringify(userArr);
              await db("groups")
                .update({
                  Users: json,
                })
                .where({
                  Company: admin.company,
                  Name: group,
                });
            });
          }

          const userDir = `./static/users/${user.id}.json`;
          fs.readFile(userDir, "utf8", function (err, data) {
            if (err) {
              console.log(err);
            } else {
              let access = JSON.parse(data);
              let accessArr = access.table;
              accessArr.map(async (content) => {
                const contentDir = `./static/contentAccess/${content}.json`;
                fs.readFile(contentDir, "utf8", function (err, data) {
                  if (err) {
                    console.log(err);
                  } else {
                    let obj = JSON.parse(data);
                    let users = obj.users;
                    const index = users.indexOf(user.id);
                    users.splice(index, 1);
                    obj.users = users;
                    let json = JSON.stringify(obj);
                    fs.writeFile(contentDir, json, "utf8", function (err) {
                      if (err) console.log(err);
                      console.log("complete");
                    });
                  }
                });
              });
            }
          });
          fs.unlink(userDir, function (err) {
            if (err) console.log(err);
            console.log("File deleted!");
          });
          await db("userlink")
            .where({
              user: userId,
            })
            .del();
          await db("metaenga_users")
            .where({
              id: userId,
            })
            .del();
          await db("metaenga_member_of_group")
            .where({
              userId: userId,
            })
            .del();

          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");

          await db("metaenga_user_logs").insert({
            companyId: admin.company,
            status: 0,
            time: time,
          });

          const response = await axios.post(apiUrl, deleteData, { headers });

          //вставить удаление с лупса
          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(402).json({
            status: "you can not deactivate owner",
          });
        }
      } else if (admin.role === "ADMIN") {
        const user = await db("metaenga_users").first("*").where({
          id: userId,
        });
        if (!user)
          return res.status(404).json({
            status: "user not found",
          });
        if (user.status === "ACTIVE") {
          return res.status(402).json({
            status: "user is active",
          });
        }
        if (user.role == "ENHANCED") {
          const groupArr = user.group;
          groupArr.map(async (group) => {
            const Group = await db("groups").first("*").where({
              Company: admin.company,
              Name: group,
            });
            const userArr = Group.Users;
            const index = userArr.indexOf(userId);
            userArr.splice(index, 1);
            const json = JSON.stringify(userArr);
            await db("groups")
              .update({
                Users: json,
              })
              .where({
                Company: admin.company,
                Name: group,
              });
          });
          const userDir = `./static/users/${user.id}.json`;
          fs.readFile(userDir, "utf8", function (err, data) {
            if (err) {
              console.log(err);
            } else {
              let access = JSON.parse(data);
              let accessArr = access.table;
              accessArr.map(async (content) => {
                const contentDir = `./static/contentAccess/${content}.json`;
                fs.readFile(contentDir, "utf8", function (err, data) {
                  if (err) {
                    console.log(err);
                  } else {
                    let obj = JSON.parse(data);
                    let users = obj.users;
                    const index = users.indexOf(user.id);
                    users.splice(index, 1);
                    obj.users = users;
                    let json = JSON.stringify(obj);
                    fs.writeFile(contentDir, json, "utf8", function (err) {
                      if (err) console.log(err);
                      console.log("complete");
                    });
                  }
                });
              });
            }
          });
          fs.unlink(userDir, function (err) {
            if (err) console.log(err);
            console.log("File deleted!");
          });
          await db("userlink")
            .where({
              user: userId,
            })
            .del();
          await db("metaenga_users")
            .where({
              id: userId,
            })
            .del();

          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");

          await db("metaenga_user_logs").insert({
            companyId: admin.company,
            status: 0,
            time: time,
          });
          // удаление с лупс
          const response = await axios.post(apiUrl, deleteData, { headers });

          return res.status(200).json({
            status: "success",
          });
        } else {
          return res.status(402).json({
            status: "you can not deactivate owner, admin",
          });
        }
      } else {
        return res.status(402).json({
          status: "you are not admin or owner",
        });
      }
    } catch (e) {
      console.log(e);
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }
  async deleteUserFromGroup(req, res, next) {
    try {
      const { adminId, userId, groupName } = req.body;
      const check = await db("metaenga_member_of_group").first("*").where({
        userId: userId,
        groupName: groupName,
      });
      if (!check)
        return res.status(404).json({ status: "The user do not have groups" });
      await db("metaenga_member_of_group")
        .where({
          userId: userId,
          groupName: groupName,
        })
        .del();
      return res.status(200).json({
        status: "success",
      }); //end of res
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async logout(req, res, next) {
    const authHeader = req.headers["authorization"];
    const { userId } = req.body;
    try {
      const token = authHeader && authHeader.split(" ")[1];
      if (token == null) return res.sendStatus(401);
      jwt.verify(token, process.env.USER_TOKEN, (err) => {
        //console.log(err)
        if (err) {
          return res.sendStatus(406);
        } else {
          authStat(req, userId, "LOGOUT");
          return res.status(200).json({
            status: "success",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  }

  async getVideoList(req, res, next) {
    try {
      const companyId = req.params.company;
      const company = await db("company").first("*").where({
        id: companyId,
      });
      if (!company)
        return res.status(404).json({
          status: "company not found",
        });
      //
    } catch (e) {
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }
  async infoMailing(req, res, next) {
    try {
      const { mail, html, fullName } = req.body;
      sendEmailDkim(html, "info@metaenga.com", mail);
      let text = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" align="center" alt="Atlassian" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:220px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
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
             <a href="https://metaenga.com" style="text-decoration:none;color:#253858;font-weight:bold;">
              Get in Touch! </a>
            </td>
           </tr>
          </tbody></table>
         </td>
        </tr>
        <!-- end headline -->

        <!-- paragraph -->
        <tr>
         <td style="padding-top:40px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          
          Dear, ${fullName}
         </td>
        </tr>
        <!-- end paragraph -->

        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          Thanks for reaching out to us about the XR Training Platform! We're excited to hear from you and can't wait to help you in any way we can.
        </tr>
        <!-- end paragraph -->

        <!-- content b -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  Our team is currently reviewing your message and we'll get back to you as soon as possible. In the meantime, feel free to take a look at our website to learn more about the XR Training Platform and how it can benefit you.
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  If you have any additional questions or thoughts you'd like to share, don't hesitate to let us know. We love chatting with our users and are always happy to help.
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  Thank you for your interest in the XR Training Platform. We look forward to speaking with you soon!
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  👋 The Metaenga Team
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
      sendEmail(text, mail, "Get in Touch");

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async infoWaitlist(req, res, next) {
    try {
      const { fullName, companyName, email } = req.body;
      const check = await db("metaenga_waitlist")
        .first("*")
        .where({ email: email });
      if (check)
        return res
          .status(400)
          .json({ status: "error", data: "Email already exists" });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ") // replace T with a space
        .replace(/\..+/, ""); // delete the dot and everything after
      const userAgent = req.headers["user-agent"];
      const remoteIP = req.connection.remoteAddress;
      const html = `<html><body>
          <p>Full Name: ${fullName}</p>
          <p>Company Name: ${companyName}</p>
          <p>Email: ${email}</p>
          <p>Time: ${time}</p>
          <p>User Agent: ${userAgent}</p>
          <p>Remote IP: ${remoteIP}</p>
          </body></html>`;
      sendEmailDkim(html, "info@metaenga.com", email);

      const text = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" align="center" alt="Atlassian" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:220px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
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
             <a href="https://metaenga.com" style="text-decoration:none;color:#253858;font-weight:bold;">
              Thanks for joining the Metaenga ! </a>
            </td>
           </tr>
          </tbody></table>
         </td>
        </tr>
        <!-- end headline -->

        <!-- paragraph -->
        <tr>
         <td style="padding-top:40px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          
          Hi, ${fullName}
         </td>
        </tr>
        <!-- end paragraph -->

        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          We appreciate your interest in our XR Training Platform and are thrilled to have you as a potential customer.
        </tr>
        <!-- end paragraph -->

        <!-- content b -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  You'll be the first to access this cutting-edge technology that will transform the way you train your team and grow your business.
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  If you have any questions, don't hesitate to contact us. We're here to provide you with the support you need, every step of the way.
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  Thank you again for choosing Metaenga, and we can't wait to share our XR Training Platform with you!
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  👋 The Metaenga team
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
      sendEmail(text, email, "Waitlist");
      await db("metaenga_waitlist").insert({
        email: email,
        fullName: fullName,
        companyName: companyName,
        date: time,
      });
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async infoGetQuotet(req, res, next) {
    try {
      const { fullName, request, email } = req.body;
      const html = `<html><body>
    <h1>Get quote</h1> </br>
    <p><b>Full Name</b>: ${fullName}</p> </br>
    <p><b>Email</b>: ${email}</p> </br>
    <p><b>Request</b>: ${request}</p> </br>
          </body></html>`;
      sendEmailDkim(html, "info@metaenga.com", email);
      const text = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width: 100%; " class="stylingblock-content-wrapper"><tbody><tr><td class="stylingblock-content-wrapper camarker-inner"><center><img src="https://app.metaenga.com/static/media/email/metaenga-email-logo.png" align="center" alt="Atlassian" title="Metaenga" border="0" width="220" style="outline:0;padding:0;border:0;width:220px;height:auto;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#0052CC;">
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
             <a href="https://metaenga.com" style="text-decoration:none;color:#253858;font-weight:bold;">
              Thank you for the inquiry! </a>
            </td>
           </tr>
          </tbody></table>
         </td>
        </tr>
        <!-- end headline -->

        <!-- paragraph -->
        <tr>
         <td style="padding-top:40px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          
          Dear, ${fullName}
         </td>
        </tr>
        <!-- end paragraph -->

        <!--paragraph-->
        <tr>
         <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
          We appreciate your inquiry regarding the cost and timing of our XR services.
        </tr>
        <!-- end paragraph -->

        <!-- content b -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  Our team is reviewing your request and will provide a comprehensive response as soon as possible. We aim to respond within 24-48 hours, but please note that response times may vary depending on the complexity of your request.
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  In the meantime, we encourage you to explore our website to learn more about our VR solutions and services. If you have any further questions or concerns, please feel free to contact us directly at slav@metaenga.com or +380 933 796 971.
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  Thank you for considering our services. We look forward to connecting with you soon.
 </td>
</tr>
<!-- end paragraph -->

<!--paragraph-->
<tr>
 <td style="padding-top:20px;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;line-height:22px;color:#42526E;text-align:left;">
  👋 The Metaenga Team
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
      sendEmail(text, email, "Get Quote");

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getAdminTable(req, res, next) {
    try {
      let admin = req.params.admin;

      // Fetch companyData records with user count and devices count
      const companyData = await db("company")
        .select(
          "company.*",
          db.raw("COALESCE(mu.user_count, 0) as users"),
          db.raw("COALESCE(vr.device_count, 0) as devices")
        )
        .leftJoin(
          db("metaenga_users")
            .select("company_id")
            .countDistinct("id as user_count")
            .groupBy("company_id")
            .as("mu"),
          "company.id",
          "mu.company_id"
        )
        .leftJoin(
          db("VR")
            .select("company")
            .countDistinct("id as device_count")
            .groupBy("company")
            .as("vr"),
          "company.id",
          "vr.company"
        );
      // Fetch last activity for each company
      // const lastActivityData = await db("company")
      //     .select("company.id")
      //     .leftJoin("metaenga_vr_web_session", "company.id", "metaenga_vr_web_session.companyId")
      //     .leftJoin("metaenga_vr_app_session", "company.id", "metaenga_vr_app_session.companyId")
      //     .max("metaenga_vr_web_session.timeStart as lastWebActivity")
      //     .max("metaenga_vr_app_session.timeStart as lastAppActivity")
      //     .groupBy("company.id");

      // //Combine last activity data with companyData
      // for (const company of companyData) {
      //     const lastActivity = lastActivityData.find(data => data.id === company.id);
      //     if (lastActivity) {
      //         company.lastActivity = Math.max(lastActivity.lastWebActivity || 0, lastActivity.lastAppActivity || 0);
      //     } else {
      //         company.lastActivity = null;
      //     }

      //     // Format date
      //     company.date = new Date(company.date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
      // }

      //Fetch reglinkData

      console.log("Company ", companyData);

      const reglinkData = await db("reglink").select(
        "email",
        "company",
        "firstName"
      );

      console.log("Reglink ", reglinkData);

      // Combine companyData and reglinkData
      const combinedData = [
        ...companyData,
        ...reglinkData.map((row) => ({
          userEmail: row.email,
          companyName: row.company,
          contact: row.firstName,
          status: 0,
        })),
      ];

      console.log("Combined ", combinedData);

      // Return combined data
      return res.status(200).json({
        status: "success",
        data: combinedData,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
}

async function randomID() {
  let minm = 1000;
  let maxm = 9999;
  let id = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
  return id;
}
async function randomPassword() {
  let minm = 100000;
  let maxm = 999999;
  let id = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
  return id;
}
async function getFirstLetters(str) {
  const firstLetters = str
    .split(" ")
    .map((word) => word[0])
    .join("");

  return firstLetters;
}
async function sendEmail(text, userEmail, subject) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "slav@metaenga.com",
      pass: "kjorrwxtaykdrnwl",
    },
  });

  let mailOptions = {
    from: {
      name: "Metaenga",
      address: "slav@metaenga.com",
    },
    to: userEmail,
    subject: subject,
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
async function sendEmailDkim(text, userEmail, replyTo) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "slav@metaenga.com",
      pass: "kjorrwxtaykdrnwl",
    },
  });

  let mailOptions = {
    from: {
      name: "Metaenga",
      address: "slav@metaenga.com",
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
async function isEmailValid(email) {
  return emailValidator.validate(email);
}

function generateAccessToken(phone) {
  return jwt.sign(phone, process.env.USER_TOKEN, { expiresIn: "365d" });
}
async function authStat(req, userId, action) {
  try {
    let web;
    let vr;
    web = isWebBrowser(req);
    vr = isVRDevice(req);
    const time = new Date()
      .toISOString()
      .replace(/T/, " ") // replace T with a space
      .replace(/\..+/, ""); // delete the dot and everything after

    await db("metaenga_authstats").insert({
      userId: userId,
      action: action,
      Web: web,
      VR: vr,
      time: time,
    });
    return true;
  } catch (error) {
    return false;
  }
}
async function sendEmailOptionTwo(text, userEmail) {
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

function isWebBrowser(req) {
  const userAgent = req.headers["user-agent"];
  const regex = /Mozilla\/.*\s|Mobile.*Safari|Android.*Chrome|iPhone.*Safari/g;
  return regex.test(userAgent);
}
function isVRDevice(req) {
  const userAgent = req.headers["user-agent"];
  const regex =
    /vr headset|oculus|vive|playstation vr|daydream|cardboard|UE5|Android/i;
  return regex.test(userAgent);
}

module.exports = new Comp();
