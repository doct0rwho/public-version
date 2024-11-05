const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const db = require("../db");
const bcrypt = require("bcrypt");
const fs = require("fs");
let rimraf = require("rimraf");
let uuid = require("uuid");
const semaphore = require("semaphore")(1);
let nodemailer = require("nodemailer");
const { exec } = require("child_process");
const emailValidator = require("deep-email-validator");
dotenv.config();
const util = require("util");
const con = require("../db");
const { platform } = require("os");
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const readline = require("readline");
const appendFileAsync = util.promisify(fs.appendFile);

const axios = require("axios");
const CloudIpsp = require("cloudipsp-node-js-sdk");
const crypto = require("crypto");

class Controller {
  async reg(req, res, next) {
    try {
      const { email, password } = req.body;
      const check = await db("admin").first("*").where({
        email: email,
      });
      if (check) {
        return res.status(401).json({
          status: "already exist",
        });
      } else {
        const hashPassword = await bcrypt.hash(password, 7);
        let hash = uuid.v4();
        //crypto.createHash('md5').update(email).digest('hex');
        await db("admin").insert({
          email: email,
          password: hashPassword,
          id: hash,
        });
        const token = generateAccessToken({ email: email });
        return res.status(201).json({
          status: "registred",
          email: email,
          token: token,
          id: hash,
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async log(req, res, next) {
    let userId;
    try {
      const { email, password } = req.body;
      const check = await db("admin").first("*").where({
        email: email,
      });

      if (!check) {
        return res.status(404).json({
          status: "wrong email",
        });
      } else {
        const checkpass = await bcrypt.compare(password, check.password);
        if (checkpass) {
          const token = generateAccessToken({ email: email });
          userId = check.id;
          return res.status(201).json({
            status: "authorized",
            email: email,
            token: token,
            id: check.id,
          });
        } else {
          return res.status(401).json({
            status: "wrong pass",
          });
        }
      }
    } catch (error) {
      console.log(error);
      next(error, userId);
    }
  }
  async addCompany(req, res, next) {
    try {
      const {
        admin,
        companyName,
        contact,
        phoneNumber,
        userEmail,
        Note,
        website,
        programManager,
        ITcontact,
        DecisionMaker,
        BillingContact,
      } = req.body;
      let hash = uuid.v4();
      let arr = [];
      let arrJSON = JSON.stringify(arr);
      //crypto.createHash('md5').update(companyName).digest('hex');
      const check = await db("admin").first("*").where({
        id: admin,
      });
      const checkEmail = await db("userlink").first("*").where({
        login: userEmail,
      });
      if (checkEmail)
        return res.status(401).json({
          status: "this email already registered",
        });

      //   const {valid, reason, validators} = await isEmailValid(userEmail);
      //   if(!valid){
      //     return res.status(402).send({
      //     message: "Please provide a valid email address.",
      //     reason: validators[reason].reason
      //   })
      // }

      const checkName = await db("company").first("*").where({
        companyName: companyName,
      });
      if (check && !checkName) {
        await db("company").insert({
          companyName: companyName,
          admin: admin,
          userEmail: userEmail,
          id: hash,
          plan: "Free",
          Note: Note,
          website: website,
          programManager: programManager,
          ITcontact: ITcontact,
          DecisionMaker: DecisionMaker,
          BillingContact: BillingContact,
        });

        await db("metaenga_plan_insight").insert({
          companyId: hash,
          plan: "Free",
        });
        const trainings = await db("trainings")
          .select("company", "fullname", "id")
          .whereIn("id", function () {
            this.select("id").from("metaenga_free");
          });

        const rows = trainings.map((training) => ({
          training: training.id,
          company: hash,
          fullname: training.fullname,
          default: 1,
        }));

        if (rows.length != 0) {
          await db("metaenga_training_company").insert(rows);
        }

        const videoTable = `video-${hash}`;
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

        //   await db.schema.createTable(hash, (table) => {
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
        //     table.integer('activityVR')
        //     table.integer('activityWEB')
        //     table.integer('watchedVR')
        //     table.integer('watchedWEB')
        // }).then(() => console.log("table created"))

        let dir = `./static/videos/${hash}`;

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        let token = await jwt.sign(
          { userEmail: userEmail },
          process.env.LINK_TOKEN,
          { expiresIn: "72h" }
        );
        const timeInMs = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        await db("reglink").insert({
          regtoken: token,
          email: userEmail,
          company: hash,
          userrole: "OWNER",
          date: timeInMs,
        });
        let htmlActivation = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
                             <a href="${process.env.WEB_LINK}/registration?token=${token}" target="_blank" style="display:inline-block;border:1px solid #0052CC;font-family:&#39;Helvetica neue&#39;, Helvetica, Arial, Verdana, sans-serif;font-size:16px;color:#ffffff;text-decoration:none;border-radius: 3px; padding:15px 40px;">
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

        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "info@metaenga.com",
            pass: "tdehdxzouhfuralc",
          },
        });

        let mailOptions = {
          from: "info@metaenga.com",
          to: userEmail,
          subject: "Metaenga.com",
          html: htmlActivation,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        }); //end of mail sending
        const time = new Date()
          .toISOString() //получаю текущее время
          .replace(/T/, " ")
          .replace(/\..+/, "");

        let freeTrainigs = await db("metaenga_free").pluck("id");
        freeTrainigs.forEach(async (element) => {
          let check = await db("trainings").first("*").where({
            id: element,
          });
          if (check) {
            let arr = check.platform;
            if (arr.includes("pico")) {
              await db("metaenga_training_company").insert({
                training: element,
                company: hash,
                fullname: check.fullname,
                default: 1,
                time: time,
                platform: "pico",
                plan: "free",
              });
            }
            if (arr.includes("quest")) {
              await db("metaenga_training_company").insert({
                training: element,
                company: hash,
                fullname: check.fullname,
                default: 1,
                time: time,
                platform: "quest",
                plan: "free",
              });
            }
            if (arr.includes("windows")) {
              await db("metaenga_training_company").insert({
                training: element,
                company: hash,
                fullname: check.fullname,
                default: 1,
                time: time,
                platform: "windows",
                plan: "free",
              });
            }
          }
        });

        return res.status(201).json({
          status: "success",
          company: companyName,
          adminEmail: check.email,
          id: hash,
        });
      } else if (checkName) {
        return res.status(403).json({
          status: "company name exist",
        });
      } else {
        return res.status(404).json({
          status: "error",
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
  async editCompany(req, res, next) {
    try {
      const {
        admin,
        contact,
        phoneNumber,
        userEmail,
        Note,
        id,
        companyName,
        website,
        programManager,
        ITcontact,
        DecisionMaker,
        BillingContact,
      } = req.body;
      const check = await db("admin").first("*").where({
        id: admin,
      });
      //
      const checkName = await db("company").first("*").where({
        companyName: companyName,
      });
      if (checkName)
        return res
          .status(401)
          .json({ error: "this company name already registered" });
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      console.log(companyName);
      if (check && id) {
        if (companyName) {
          const getUsers = await db("userlink").pluck("email").where({
            company: id,
          });
          console.log(getUsers);
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
                    firstName: companyName,
                  };
                  const headers = {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  };
                  const response = await axios.put(apiUrl, updateData, {
                    headers,
                  });
                }
              }
            }
          });
        }
        await db("company")
          .update({
            companyName: companyName,
            contact: contact,
            phoneNumber: phoneNumber,
            userEmail: userEmail,
            Note: Note,
            website: website,
            programManager: programManager,
            ITcontact: ITcontact,
            DecisionMaker: DecisionMaker,
            BillingContact: BillingContact,
          })
          .where({
            id: id,
          });
        return res.status(201).json({
          status: "success",
          adminEmail: check.email,
        });
      } else {
        return res.status(404).json({
          status: "error",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteCompany(req, res, next) {
    try {
      const { admin, companyID } = req.body;
      const check = await db("admin").first("*").where({
        id: admin,
      });
      const checkCompany = await db("company")
        .first("*")
        .where({ id: companyID });
      if (check && checkCompany) {
        await db("company")
          .where({
            id: companyID,
          })
          .del();
        console.log(checkCompany.logo);
        fs.unlink(`./static/logos/${checkCompany.logo}`, function (err) {
          if (err && err.code == "ENOENT") {
            // file doens't exist
            console.info("File doesn't exist, won't remove it.");
          } else if (err) {
            // other errors, e.g. maybe we don't have enough permission
            console.error("Error occurred while trying to remove file");
          } else {
            console.info(`removed`);
          }
        });
        fs.unlink(
          `./static/VR/pico/${checkCompany.id}_${checkCompany.VRlink}`,
          function (err) {
            if (err && err.code == "ENOENT") {
              // file doens't exist
              console.info("File doesn't exist, won't remove it.");
            } else if (err) {
              // other errors, e.g. maybe we don't have enough permission
              console.error("Error occurred while trying to remove file");
            } else {
              console.info(`removed`);
            }
          }
        );
        fs.unlink(
          `./static/VR/quest/${checkCompany.id}_${checkCompany.VRlink}`,
          function (err) {
            if (err && err.code == "ENOENT") {
              // file doens't exist
              console.info("File doesn't exist, won't remove it.");
            } else if (err) {
              // other errors, e.g. maybe we don't have enough permission
              console.error("Error occurred while trying to remove file");
            } else {
              console.info(`removed`);
            }
          }
        );
        fs.unlink(
          `./static/VR/windows/${checkCompany.id}_${checkCompany.VRlink}`,
          function (err) {
            if (err && err.code == "ENOENT") {
              // file doens't exist
              console.info("File doesn't exist, won't remove it.");
            } else if (err) {
              // other errors, e.g. maybe we don't have enough permission
              console.error("Error occurred while trying to remove file");
            } else {
              console.info(`removed`);
            }
          }
        );
        let videoDB = `video-${companyID}`;
        // await db.schema.dropTable(companyID).then(() => console.log("table deleted"))
        await db("metaenga_users").where({ company_id: companyID }).del();
        // await db.schema.dropTable(videoDB).then(() => console.log("table deleted"))
        rimraf(`./static/group/${companyID}`, function () {
          console.log("video folder deleted");
        });

        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        const getUsers = await db("userlink").pluck("login").where({
          company: companyID,
        });
        console.log(getUsers);
        console.log("companyID", companyID);

        getUsers.forEach(async (user) => {
          console.log("USER", user);
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
                const apiUrl = "https://app.loops.so/api/v1/contacts/delete";
                const deleteData = {
                  email: user,
                };

                const response = await axios.post(apiUrl, deleteData, {
                  headers,
                });
              }
            }
          }
        });
        const date = new Date().toISOString().slice(0, 19).replace("T", " ");

        const companyLogs = await db("metaenga_company_logs").first("*").where({
          company_id: companyID,
          status: 1,
        });
        console.log("companyID", companyID);
        console.log("companyLogs", companyLogs);

        await db("metaenga_company_logs").insert({
          company_id: companyID,
          status: 0,
          date: date,
          confirmed_email: companyLogs.confirmed_email
            ? companyLogs.confirmed_email
            : 1,
          google: companyLogs.google ? companyLogs.google : 0,
        });

        await db("userlink")
          .where({
            company: companyID,
          })
          .del();
        await db("metaenga_groups")
          .where({
            companyId: companyID,
          })
          .del();
        await db("metaenga_group_access")
          .where({
            companyId: companyID,
          })
          .del();
        await db("metaenga_plan_insight")
          .where({
            companyId: companyID,
          })
          .del();
        await db("metaenga_user_logs").insert({
          companyId: companyID,
          status: 0,
          time: date,
        });

        return res.status(200).json({
          status: "deleted",
          company: companyID,
          adminEmail: admin,
        });
      } else if (!checkCompany) {
        return res.status(404).json({
          status: "company not exist",
          company: companyID,
          adminEmail: admin,
        });
      } else {
        return res.status(403).json({
          status: "error",
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
  async freezeCompany(req, res, next) {
    try {
      const { admin, companyID } = req.body;
      const check = await db("admin").first("*").where({
        id: admin,
      });
      const checkStatus = await db("company").first("*").where({
        id: companyID,
        status: 0,
      });
      const checkCompany = await db("company").first("*").where({
        id: companyID,
      });
      if (check && !checkStatus && checkCompany) {
        await db("company")
          .update({
            status: 0,
          })
          .where({
            id: companyID,
          });
        return res.status(201).json({
          status: "freezed",
          company: companyID,
          adminEmail: admin,
        });
      } else if (checkStatus) {
        return res.status(401).json({
          status: "already freezed",
          company: companyID,
          adminEmail: admin,
        });
      } else if (!checkCompany) {
        return res.status(404).json({
          status: "company not exist",
          company: companyID,
          adminEmail: admin,
        });
      } else {
        return res.status(403).json({
          status: "error",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async unFreezeCompany(req, res, next) {
    try {
      const { admin, companyID } = req.body;
      const check = await db("admin").first("*").where({
        id: admin,
      });
      const checkStatus = await db("company").first("*").where({
        id: companyID,
        status: 1,
      });
      const checkCompany = await db("company").first("*").where({
        id: companyID,
      });

      if (check && !checkStatus && checkCompany) {
        await db("company")
          .update({
            status: 1,
          })
          .where({
            id: companyID,
          });
        return res.status(201).json({
          status: "unfreezed",
          company: companyID,
          adminEmail: admin,
        });
      } else if (checkStatus) {
        return res.status(401).json({
          status: "not freezed",
          company: companyID,
          adminEmail: admin,
        });
      } else if (!checkCompany) {
        return res.status(404).json({
          status: "company not exist",
          company: companyID,
          adminEmail: admin,
        });
      } else {
        return res.status(403).json({
          status: "error",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getCompanyList(req, res, next) {
    try {
      let admin = req.params.admin;

      const check = await db("admin").first("*").where({
        id: admin,
      });
      console.log(check);
      if (check) {
        const get = await db("company").select("*");
        if (!get) {
          return res.status(404).json({
            status: "error",
          });
        }
        return res.status(200).json({
          status: "success",
          companyList: get,
        });
      } else if (!check) {
        return res.status(403).json({
          status: "admin access denied",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getOneCompanyList(req, res, next) {
    try {
      let admin = req.params.admin;
      let company = req.params.company;
      const check = await db("admin").first("*").where({
        id: admin,
      });
      const checkComp = await db("company").first("*").where({
        id: company,
      });
      if (!checkComp) {
        return res.status(404).json({
          status: "company not exist",
        });
      }
      if (check && checkComp) {
        const record = await db("company").first("*").where({
          id: company,
        });
        return res.status(201).json({
          status: "success",
          company: record,
        });
      } else {
        return res.status(403).json({
          status: "error",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getLogo(req, res, next) {
    try {
      let id = req.params.id;

      fs.readFile(`./static/logos/${id}.jpg`, function (err, data) {
        if (err) res.status(404).json({ status: "image not found" }); // Fail if the file can't be read.
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(data); // Send the file data to the browser.
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getAvatar(req, res, next) {
    try {
      let id = req.params.id;

      fs.readFile(`./static/avatar/${id}.jpg`, function (err, data) {
        if (err) {
          return res.status(404).json({ status: "image not found" }); // Fail if the file can't be read.
        }
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(data); // Send the file data to the browser.
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async deleteAvatar(req, res, next) {
    try {
      const id = req.params.id;
      const check = await db("userlink").first("*").where({
        user: id,
      });
      if (check) {
        const checkAva = await db("metaenga_users").first("*").where({
          id: id,
        });
        if (checkAva.avatar == null) {
          return res.status(404).json({
            status: "avatar not found",
          });
        }
        const del = await db("metaenga_users")
          .update({
            avatar: null,
          })
          .where({
            id: id,
          });
        const path = `./static/avatar/${id}.jpg`;
        await fs.unlinkSync(path);
        return res.status(200).json({
          status: "success",
        });
      } else {
        return res.status(403).json({
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
  async deleteLogo(req, res, next) {
    try {
      const id = req.params.id;
      const check = await db("company").first("*").where({
        id: id,
      });
      if (check) {
        if (check.logo == null) {
          return res.status(404).json({
            status: "avatar not found",
          });
        }
        const del = await db("company")
          .update({
            logo: null,
          })
          .where({
            id: id,
          });
        const path = `./static/logos/${id}.jpg`;
        await fs.unlinkSync(path);
        return res.status(200).json({
          status: "success",
        });
      } else {
        return res.status(403).json({
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
  async createFolder(req, res, next) {
    //create folder for company vr trainings
    try {
      const id = req.params.company;
      const ver = req.params.version;
      const folder = `./static/VR/${id}_${ver}/training`;
      const folder2 = `./static/VR/${id}_${ver}`;
      const check = await db("company").first("*").where({
        id: id,
      });
      console.log(check);
      if (!check) {
        return res.status(404).json({
          status: "company not found",
        });
      }
      if (check.VRlink == folder2) {
        return res.status(200).json({
          status: "folder already exist",
        });
      }
      if (check) {
        //check if folder exist
        if (fs.existsSync(folder)) {
          console.log("Directory exists!");
          return res.status(402).json({
            status: "folder already exist",
          });
        } else {
          await db("company")
            .update({
              VRlink: ver,
            })
            .where({
              id: id,
            });
          fs.mkdirSync(folder, { recursive: true });

          //
          fs.open(
            `./static/VR/${id}_${ver}/BuildManifest-training.txt`,
            "r",
            function (err, fd) {
              if (err) {
                let text = `$NUM_ENTRIES = 0\n$BUILD_ID = ${id}_${ver}\n`;
                fs.appendFile(
                  `./static/VR/${id}_${ver}/BuildManifest-training.txt`,
                  text,
                  function (err) {
                    if (err) throw err;
                    // print output
                    console.log("Saved!");
                  }
                );
              } else {
                console.log("File exists!");
              }
            }
          );
          //

          exec(
            `ln -s /root/metaenga/metaengaplatform/node-app/static/VR/default ./static/VR/${id}_${ver}`,
            (err, stdout, stderr) => {
              if (err) {
                //some err occurred
                console.error(err);
              } else {
                // the *entire* stdout and stderr (buffered)
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
              }
            }
          );

          return res.status(200).json({
            status: "success",
          });
        }
      } else {
        return res.status(403).json({
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
  async AddVrTraining(req, res, next) {
    try {
      const { id, company, publicly } = req.body;
      const comp = await db("company").first("*").where({
        id: company,
      });
      const training = await db("trainings").first("*").where({
        id: id,
        company: company,
      });
      const check = await db("metaenga_training_company").first("*").where({
        training: id,
        company: company,
      });
      if (check) {
        return res.status(402).json({
          status: "training already added",
        });
      } else {
        const time = new Date()
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");

        await db("metaenga_training_company").insert({
          training: id,
          company: company,
          fullname: training.fullname,
          default: publicly,
          time: time,
        });
      }
      console.log(
        `./static/VR/${company}_${comp.VRlink}/BuildManifest-training.txt`
      );
      if (!training)
        return res.status(404).json({ status: "training not found" });
      fs.open(
        `./static/VR/${company}_${comp.VRlink}/BuildManifest-training.txt`,
        "r",
        function (err, fd) {
          if (err) {
            console.log("File not found!");
          } else {
            // if file exists

            let text =
              `${training.fullname}` +
              "\t" +
              `${training.size}` +
              "\t" +
              "ver01" +
              "\t" +
              `${training.id}` +
              "\t" +
              `/training/${training.fullname}\n`;
            console.log(text);
            fs.appendFile(
              `./static/VR/${company}_${comp.VRlink}/BuildManifest-training.txt`,
              text,
              function (err) {
                if (err) throw err;
                // print output
                console.log("Saved!");
              }
            );
            fs.readFile(
              `./static/VR/${company}_${comp.VRlink}/BuildManifest-training.txt`,
              "utf8",
              function (err, data) {
                if (err) {
                  return console.log(err);
                }

                const lines = data.split(/\r?\n/);
                let num;
                let firstLine;

                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].includes("$NUM_ENTRIES")) {
                    firstLine = lines[i];

                    num = firstLine.replace(/\D/g, "");
                  }
                }

                let x = Number(num);
                let newFile = data.replace(
                  firstLine,
                  `$NUM_ENTRIES = ${x + 1}`
                );
                fs.writeFile(
                  `./static/VR/${company}_${comp.VRlink}/BuildManifest-training.txt`,
                  newFile,
                  "utf8",
                  function (err) {
                    if (err) return console.log(err);
                  }
                );
              }
            );
            return res.status(200).json({
              status: "success",
            });
          }
        }
      );
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async AddVrDefaultTraining(req, res, next) {
    try {
      semaphore.take(async function () {
        console.log("LAST STEP");
        const { id, company, publicly, platform, plan, quantity } = req.body;
        let planner = plan ? plan : "exclusive";
        let headsets = quantity ? quantity : 1;

        const comp = await db("company").first("*").where({
          id: company,
        });
        const training = await db("trainings").first("*").where({
          //получаю список тренингов
          id: id,
          company: "metaenga",
        });
        let fileSize;
        if (!training) {
          semaphore.leave();
          return res.status(404).json({ status: "training not found" });
        }
        const record = training.platform.find((item) => {
          //проверяю есть ли введенная платформа в списке
          console.log("Comparing:", item.platform, "and", platform);
          return platform.includes(item.platform);
        });
        fileSize = record.fileSizeInBytes; //если есть то получаю размер файла

        if (record) {
          //если есть то получаю размер файла
          fileSize = record.fileSizeInBytes;
        } else {
          //если нет то вывожу ошибку
          semaphore.leave();
          return res.status(404).json({
            status: "training not foundasdasdadasd",
          });
        }

        const check = await db("metaenga_training_company").first("*").where({
          //проверяю есть ли тренинг в списке
          training: id,
          company: company,
          platform: platform,
          plan: planner,
        });

        if (check) {
          await db("metaenga_training_company").update({
            //добавляю тренинг в список
            training: id,
            company: company,
            fullname: training.fullname,
            default: publicly,
            platform: platform,
            plan: planner,
            quantity: headsets,
          });
        } else {
          //если нет то добавляю

          const time = new Date()
            .toISOString() //получаю текущее время
            .replace(/T/, " ")
            .replace(/\..+/, "");

          await db("metaenga_training_company").insert({
            //добавляю тренинг в список
            training: id,
            company: company,
            fullname: training.fullname,
            default: publicly,
            time: time,
            platform: platform,
            plan: planner,
            quantity: headsets,
          });
        }

        semaphore.leave();
        return res.status(200).json({
          status: "success",
        });
      });
    } catch (error) {
      console.log(error);
      semaphore.leave();
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async DeleteVrDefaultTraining(req, res, next) {
    try {
      semaphore.take(async function () {
        const { id, company, platform, plan } = req.body;
        let planner = plan ? plan : "exclusive";

        const comp = await db("company").first("*").where({
          id: company,
        });
        const training = await db("trainings").first("*").where({
          id: id,
          company: "metaenga",
        });
        if (!training) {
          semaphore.leave();
          return res.status(404).json({ status: "training not found" });
        }
        const check = await db("metaenga_training_company").first("*").where({
          training: id,
          company: company,
          platform: platform,
          plan: planner,
        });
        if (!check) {
          semaphore.leave();

          return res.status(402).json({
            status: "training not added",
          });
        } else {
          await db("metaenga_training_company")
            .where({
              training: id,
              company: company,
              platform: platform,
              plan: planner,
            })
            .del();

          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
        }

        //       if(platform == 'pico'){
        //       fs.open(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //         if (err) {
        //                   console.log('File not found!');

        //         } else {      // if file exists

        //           let newVersion
        //           let text = `${training.fullname}`+'\t'+`${training.size}`+'\t'+'ver\\d+'+'\t'+`${training.id}`+'\t'+`/defaultpico/${training.fullname}\n`
        //           console.log(text)
        //           fs.readFile(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {
        //             if (err) console.log(err);
        //             let fileContents = data.replace(/\r\n/g, '\n');

        //             fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //               const parts = buildId.split('_');
        //               newVersion = parseInt(parts[1]) + 1;
        //               const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //               return `${prefix}${newBuildId}`;
        //             });

        //             const lines = fileContents.split('\n');
        //             const searchWord = `${training.fullname}`;

        //             for (let i = 0; i < lines.length; i++) {
        //               if (lines[i].includes(searchWord)) {
        //                 lines.splice(i, 1);
        //                 break;
        //               }
        //             }

        //             let newFile = lines.join('\n');

        //             const q = newFile.split(/\r?\n/);
        //             let num;
        //             let firstLine;

        //             for (let i = 0; i < q.length; i++) {
        //               if (q[i].includes('$NUM_ENTRIES')) {
        //                 firstLine = lines[i];
        //                 num = firstLine.replace(/\D/g, '');
        //               }
        //             }

        //             let x = Number(num);
        //             let oldFile = newFile.replace(firstLine, `$NUM_ENTRIES = ${x - 1}`);

        //             fs.writeFile(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`, oldFile, 'utf8', function (err) {
        //               if (err) return console.log(err);
        //             })
        //             let newBuildId = `${String(newVersion).padStart(4, '0')}`
        //             db('company').where({id:company}).update({VRlink:newBuildId}).then((result) => {
        //               console.log('Database updated successfully');
        //             }).catch((error) => {
        //               console.error(error);
        //             });
        //             let folder = `${company}_${comp.VRlink}`
        //               let oldName = `./static/VR/pico/${folder}`
        //       let partsS = folder.split('_');
        //       newVersion = parseInt(partsS[1]) + 1;
        //       const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //       let newPath = `./static/VR/pico/${newName}`
        //       fs.rename(oldName, newPath, (err) => {
        //         if (err) {
        //           console.error(err);
        //         } else {
        //           console.log('Folder renamed successfully!');

        //         }
        //       });
        //       semaphore.leave();
        //           });

        //       }
        //     });
        //       //
        //       fs.open(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //         if (err) {
        //                   console.log('File not found!');

        //         } else {      // if file exists

        //           let newVersion
        //           fs.readFile(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {

        //             let fileContents = data.replace(/\r\n/g, '\n');

        //             fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //               const parts = buildId.split('_');
        //               newVersion = parseInt(parts[1]) + 1;
        //               const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //               return `${prefix}${newBuildId}`;
        //             });
        //             const lines = fileContents.split(/\r?\n/)            //разбиваю файл на строки

        //       let newFile = lines.join('\n'); //соединяю строки в файл

        //       fs.writeFile(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`, newFile, 'utf8' , function(err){ //записываю файл
        //         if (err) return console.log(err);
        //       })

        //             let folder = `${company}_${comp.VRlink}`
        //               let oldName = `./static/VR/quest/${folder}`
        //       let partsS = folder.split('_');
        //       newVersion = parseInt(partsS[1]) + 1;
        //       const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //       let newPath = `./static/VR/quest/${newName}`
        //       fs.rename(oldName, newPath, (err) => {
        //         if (err) {
        //           console.error(err);
        //         } else {
        //           console.log('Folder renamed successfully!');

        //         }
        //       });
        //     });

        //       }
        //     });
        //     //
        //     fs.open(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //       if (err) {
        //                 console.log('File not found!');

        //       } else {      // if file exists

        //         let newVersion
        //         fs.readFile(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {

        //           let fileContents = data.replace(/\r\n/g, '\n');

        //           fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //             const parts = buildId.split('_');
        //             newVersion = parseInt(parts[1]) + 1;
        //             const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //             return `${prefix}${newBuildId}`;
        //           });
        //           const lines = fileContents.split(/\r?\n/)            //разбиваю файл на строки

        //     let newFile = lines.join('\n'); //соединяю строки в файл

        //     fs.writeFile(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`, newFile, 'utf8' , function(err){ //записываю файл
        //       if (err) return console.log(err);
        //     })
        //           let folder = `${company}_${comp.VRlink}`
        //             let oldName = `./static/VR/windows/${folder}`
        //     let partsS = folder.split('_');
        //     newVersion = parseInt(partsS[1]) + 1;
        //     const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //     let newPath = `./static/VR/windows/${newName}`
        //     fs.rename(oldName, newPath, (err) => {
        //       if (err) {
        //         console.error(err);
        //       } else {
        //         console.log('Folder renamed successfully!');

        //       }
        //     });
        //   });

        //     }
        //   });

        //   }
        //   if(platform == 'quest'){
        //     fs.open(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //       if (err) {
        //                 console.log('File not found!');

        //       } else {      // if file exists

        //         let newVersion
        //         let text = `${training.fullname}`+'\t'+`${training.size}`+'\t'+'ver\\d+'+'\t'+`${training.id}`+'\t'+`/defaultquest/${training.fullname}\n`
        //         console.log(text)
        //         fs.readFile(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {
        //           if (err) console.log(err);
        //           let fileContents = data.replace(/\r\n/g, '\n');

        //           fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //             const parts = buildId.split('_');
        //             newVersion = parseInt(parts[1]) + 1;
        //             const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //             return `${prefix}${newBuildId}`;
        //           });

        //           const lines = fileContents.split('\n');
        //           const searchWord = `${training.fullname}`;

        //           for (let i = 0; i < lines.length; i++) {
        //             if (lines[i].includes(searchWord)) {
        //               lines.splice(i, 1);
        //               break;
        //             }
        //           }

        //           let newFile = lines.join('\n');

        //           const q = newFile.split(/\r?\n/);
        //           let num;
        //           let firstLine;

        //           for (let i = 0; i < q.length; i++) {
        //             if (q[i].includes('$NUM_ENTRIES')) {
        //               firstLine = lines[i];
        //               num = firstLine.replace(/\D/g, '');
        //             }
        //           }

        //           let x = Number(num);
        //           let oldFile = newFile.replace(firstLine, `$NUM_ENTRIES = ${x - 1}`);

        //           fs.writeFile(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`, oldFile, 'utf8', function (err) {
        //             if (err) return console.log(err);
        //           })
        //           let newBuildId = `${String(newVersion).padStart(4, '0')}`
        //           db('company').where({id:company}).update({VRlink:newBuildId}).then((result) => {
        //             console.log('Database updated successfully');
        //           }).catch((error) => {
        //             console.error(error);
        //           });
        //           let folder = `${company}_${comp.VRlink}`
        //             let oldName = `./static/VR/quest/${folder}`
        //     let partsS = folder.split('_');
        //     newVersion = parseInt(partsS[1]) + 1;
        //     const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //     let newPath = `./static/VR/quest/${newName}`
        //     fs.rename(oldName, newPath, (err) => {
        //       if (err) {
        //         console.error(err);
        //       } else {
        //         console.log('Folder renamed successfully!');

        //       }
        //     });
        //     semaphore.leave();
        //         });

        //     }
        //   });
        //     //
        //     fs.open(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //       if (err) {
        //                 console.log('File not found!');

        //       } else {      // if file exists
        //         let newVersion
        //         fs.readFile(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {

        //           let fileContents = data.replace(/\r\n/g, '\n');

        //           fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //             const parts = buildId.split('_');
        //             newVersion = parseInt(parts[1]) + 1;
        //             const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //             return `${prefix}${newBuildId}`;
        //           });
        //           const lines = fileContents.split(/\r?\n/)            //разбиваю файл на строки

        //     let newFile = lines.join('\n'); //соединяю строки в файл

        //     fs.writeFile(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`, newFile, 'utf8' , function(err){ //записываю файл
        //       if (err) return console.log(err);
        //     })
        //           let folder = `${company}_${comp.VRlink}`
        //             let oldName = `./static/VR/pico/${folder}`
        //     let partsS = folder.split('_');
        //     newVersion = parseInt(partsS[1]) + 1;
        //     const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //     let newPath = `./static/VR/pico/${newName}`
        //     fs.rename(oldName, newPath, (err) => {
        //       if (err) {
        //         console.error(err);
        //       } else {
        //         console.log('Folder renamed successfully!');

        //       }
        //     });
        //         });

        //     }
        //   });
        //   //
        //   fs.open(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //     if (err) {
        //               console.log('File not found!');

        //     } else {      // if file exists
        //       let newVersion
        //       fs.readFile(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {
        //         let fileContents = data.replace(/\r\n/g, '\n');

        //         fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //           const parts = buildId.split('_');
        //           newVersion = parseInt(parts[1]) + 1;
        //           const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //           return `${prefix}${newBuildId}`;
        //         });
        //         const lines = fileContents.split(/\r?\n/)            //разбиваю файл на строки

        //   let newFile = lines.join('\n'); //соединяю строки в файл

        //   fs.writeFile(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`, newFile, 'utf8' , function(err){ //записываю файл
        //     if (err) return console.log(err);
        //   })
        //         let folder = `${company}_${comp.VRlink}`
        //           let oldName = `./static/VR/windows/${folder}`
        //   let partsS = folder.split('_');
        //   newVersion = parseInt(partsS[1]) + 1;
        //   const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //   let newPath = `./static/VR/windows/${newName}`
        //   fs.rename(oldName, newPath, (err) => {
        //     if (err) {
        //       console.error(err);
        //     } else {
        //       console.log('Folder renamed successfully!');

        //     }
        //   });
        //       });

        //   }
        // });

        // }
        // if(platform == 'windows'){
        //   fs.open(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //     if (err) {
        //               console.log('File not found!');

        //     } else {      // if file exists

        //       let newVersion
        //       let text = `${training.fullname}`+'\t'+`${training.size}`+'\t'+'ver\\d+'+'\t'+`${training.id}`+'\t'+`/defaultwindows/${training.fullname}\n`
        //       console.log(text)
        //       fs.readFile(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {
        //         if (err) console.log(err);
        //         let fileContents = data.replace(/\r\n/g, '\n');

        //         fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //           const parts = buildId.split('_');
        //           newVersion = parseInt(parts[1]) + 1;
        //           const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //           return `${prefix}${newBuildId}`;
        //         });

        //         const lines = fileContents.split('\n');
        //         const searchWord = `${training.fullname}`;

        //         for (let i = 0; i < lines.length; i++) {
        //           if (lines[i].includes(searchWord)) {
        //             lines.splice(i, 1);
        //             break;
        //           }
        //         }

        //         let newFile = lines.join('\n');

        //         const q = newFile.split(/\r?\n/);
        //         let num;
        //         let firstLine;

        //         for (let i = 0; i < q.length; i++) {
        //           if (q[i].includes('$NUM_ENTRIES')) {
        //             firstLine = lines[i];
        //             num = firstLine.replace(/\D/g, '');
        //           }
        //         }

        //         let x = Number(num);
        //         let oldFile = newFile.replace(firstLine, `$NUM_ENTRIES = ${x - 1}`);

        //         fs.writeFile(`./static/VR/windows/${company}_${comp.VRlink}/BuildManifest-training.txt`, oldFile, 'utf8', function (err) {
        //           if (err) return console.log(err);
        //         })
        //         let newBuildId = `${String(newVersion).padStart(4, '0')}`
        //         db('company').where({id:company}).update({VRlink:newBuildId}).then((result) => {
        //           console.log('Database updated successfully');
        //         }).catch((error) => {
        //           console.error(error);
        //         });
        //         let folder = `${company}_${comp.VRlink}`
        //           let oldName = `./static/VR/windows/${folder}`
        //   let partsS = folder.split('_');
        //   newVersion = parseInt(partsS[1]) + 1;
        //   const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //   let newPath = `./static/VR/windows/${newName}`
        //   fs.rename(oldName, newPath, (err) => {
        //     if (err) {
        //       console.error(err);
        //     } else {
        //       console.log('Folder renamed successfully!');

        //     }
        //   });
        //   semaphore.leave();
        //       });

        //   }
        // });
        //   //
        //   fs.open(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //     if (err) {
        //               console.log('File not found!');

        //     } else {      // if file exists
        //       let newVersion
        //       fs.readFile(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {
        //         let fileContents = data.replace(/\r\n/g, '\n');

        //         fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //           const parts = buildId.split('_');
        //           newVersion = parseInt(parts[1]) + 1;
        //           const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //           return `${prefix}${newBuildId}`;
        //         });
        //         const lines = fileContents.split(/\r?\n/)            //разбиваю файл на строки

        //   let newFile = lines.join('\n'); //соединяю строки в файл

        //   fs.writeFile(`./static/VR/quest/${company}_${comp.VRlink}/BuildManifest-training.txt`, newFile, 'utf8' , function(err){ //записываю файл
        //     if (err) return console.log(err);
        //   })
        //         let folder = `${company}_${comp.VRlink}`
        //           let oldName = `./static/VR/quest/${folder}`
        //   let partsS = folder.split('_');
        //   newVersion = parseInt(partsS[1]) + 1;
        //   const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        //   let newPath = `./static/VR/quest/${newName}`
        //   fs.rename(oldName, newPath, (err) => {
        //     if (err) {
        //       console.error(err);
        //     } else {
        //       console.log('Folder renamed successfully!');

        //     }
        //   });
        //       });

        //   }
        // });
        // //
        // fs.open(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`,'r',function(err, fd){
        //   if (err) {
        //             console.log('File not found!');

        //   } else {      // if file exists
        //     let newVersion
        //     fs.readFile(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`, 'utf8', function (err, data) {
        //       let fileContents = data.replace(/\r\n/g, '\n');

        //       fileContents = fileContents.replace(/(\$BUILD_ID = )(.+)/, (_, prefix, buildId) => {
        //         const parts = buildId.split('_');
        //         newVersion = parseInt(parts[1]) + 1;
        //         const newBuildId = `${parts[0]}_${String(newVersion).padStart(4, '0')}`;
        //         return `${prefix}${newBuildId}`;
        //       });
        //       const lines = fileContents.split(/\r?\n/)            //разбиваю файл на строки

        // let newFile = lines.join('\n'); //соединяю строки в файл

        // fs.writeFile(`./static/VR/pico/${company}_${comp.VRlink}/BuildManifest-training.txt`, newFile, 'utf8' , function(err){ //записываю файл
        //   if (err) return console.log(err);
        // })
        //       let folder = `${company}_${comp.VRlink}`
        //         let oldName = `./static/VR/pico/${folder}`
        // let partsS = folder.split('_');
        // newVersion = parseInt(partsS[1]) + 1;
        // const newName = `${partsS[0]}_${String(newVersion).padStart(4, '0')}`;
        // let newPath = `./static/VR/pico/${newName}`
        // fs.rename(oldName, newPath, (err) => {
        //   if (err) {
        //     console.error(err);
        //   } else {
        //     console.log('Folder renamed successfully!');

        //   }
        // });
        //     });

        // }
        // });

        // }
        semaphore.leave();
        return res.status(200).json({
          status: "success",
        });
      });
    } catch (error) {
      console.log(error);
      semaphore.leave();
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getCompaniesByTraining(req, res, next) {
    try {
      const id = req.params.training;

      const get = await db("metaenga_training_company").pluck("company").where({
        training: id,
        plan: "exclusive",
      });
      const comp = await db("company").pluck("id");
      const matchingIds = comp.filter((id) => get.includes(id));
      const getnames = await db("company")
        .select("companyName", "userEmail")
        .whereIn("id", matchingIds);

      return res.status(200).json({
        status: "success",
        companies: getnames,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getCompaniesByVideo(req, res, next) {
    try {
      const id = req.params.id;

      const get = await db("metaenga_video_company").pluck("company").where({
        video: id,   
        assign: 1     
      });
      const comp = await db("company").pluck("id");
      const matchingIds = comp.filter((id) => get.includes(id));
      const getnames = await db("company")
        .select("companyName", "userEmail")
        .whereIn("id", matchingIds);

      return res.status(200).json({
        status: "success",
        companies: getnames,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getPlatformsByTraining(req, res, next) {
    try {
      const id = req.params.training;
      const get = await db("metaenga_training_company")
        .pluck("platform")
        .where({
          training: id,
        });

      return res.status(200).json({
        status: "success",
        platforms: get,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async DeleteVrTrainingFromManifest(req, res, next) {
    try {
      semaphore.take(async function () {
        const { id } = req.body;

        const training = await db("trainings").first("*").where({
          id: id,
          company: "metaenga",
        });
        if (!training)
          return res.status(404).json({ status: "training not found" });
        console.log(id);
        let platformList = [];
        training.platform.forEach((item) => {
          platformList.push(item.platform);
        });
        console.log(platformList);
        const ids = await db("metaenga_training_company")
          .where({
            training: id,
          })
          .del();
        await db("metaenga_free")
          .where({
            id: id,
          })
          .del();
        await db("metaenga_standart")
          .where({
            id: id,
          })
          .del();
        await db("metaenga_premium")
          .where({
            id: id,
          })
          .del();

        await db("metaenga_training_logs").insert({
          companyId: "metaenga",
          status: 0,
          time: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
        });
        let picoVers = await db("metaenga_platforms")
          .first("*")
          .where({ platform: "pico" });
        let questVers = await db("metaenga_platforms")
          .first("*")
          .where({ platform: "quest" });
        let windowsVers = await db("metaenga_platforms")
          .first("*")
          .where({ platform: "windows" });
        await db("trainings")
          .where({
            id: id,
            company: "metaenga",
          })
          .del();
        if (platformList.includes("pico")) {
          fs.open(
            `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`,
            "r",
            function (err, fd) {
              if (err) {
                console.log("File not found!");
              } else {
                // if file exists

                let newVersion;
                let text =
                  `${training.fullname}` +
                  "\t" +
                  `${training.size}` +
                  "\t" +
                  "ver\\d+" +
                  "\t" +
                  `${training.id}` +
                  "\t" +
                  `/default/${training.fullname}\n`;
                console.log(text);
                fs.readFile(
                  `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`,
                  "utf8",
                  function (err, data) {
                    if (err) console.log(err);
                    let fileContents = data.replace(/\r\n/g, "\n");

                    fileContents = fileContents.replace(
                      /(\$BUILD_ID = )(.+)/,
                      (_, prefix, buildId) => {
                        const parts = buildId.split("_");
                        newVersion = parseInt(parts[1]) + 1;
                        const newBuildId = `${parts[0]}_${String(
                          newVersion
                        ).padStart(4, "0")}`;
                        return `${prefix}${newBuildId}`;
                      }
                    );

                    const lines = fileContents.split("\n");
                    const searchWord = `${training.fullname}`;

                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes(searchWord)) {
                        lines.splice(i, 1);
                        break;
                      }
                    }

                    let newFile = lines.join("\n");

                    const q = newFile.split(/\r?\n/);
                    let num;
                    let firstLine;

                    for (let i = 0; i < q.length; i++) {
                      if (q[i].includes("$NUM_ENTRIES")) {
                        firstLine = lines[i];
                        num = firstLine.replace(/\D/g, "");
                      }
                    }

                    let x = Number(num);
                    let oldFile = newFile.replace(
                      firstLine,
                      `$NUM_ENTRIES = ${x - 1}`
                    );

                    fs.writeFile(
                      `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`,
                      oldFile,
                      "utf8",
                      function (err) {
                        if (err) return console.log(err);
                      }
                    );
                    let newBuildId = `${String(newVersion).padStart(4, "0")}`;
                    db("metaenga_platforms")
                      .where({ platform: "pico" })
                      .update({ version: newBuildId })
                      .then((result) => {
                        console.log("Database updated successfully");
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                    let folder = `pico_${picoVers.version}`;
                    let oldName = `./static/VR/manifest/${folder}`;
                    let partsS = folder.split("_");
                    newVersion = parseInt(partsS[1]) + 1;
                    const newName = `${partsS[0]}_${String(newVersion).padStart(
                      4,
                      "0"
                    )}`;
                    let newPath = `./static/VR/manifest/${newName}`;
                    fs.rename(oldName, newPath, (err) => {
                      if (err) {
                        console.error(err);
                      } else {
                        console.log("Folder renamed successfully!");
                      }
                    });
                  }
                );
              }
            }
          );
        }
        if (platformList.includes("quest")) {
          fs.open(
            `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`,
            "r",
            function (err, fd) {
              if (err) {
                console.log("File not found!");
              } else {
                // if file exists

                let newVersion;
                let text =
                  `${training.fullname}` +
                  "\t" +
                  `${training.size}` +
                  "\t" +
                  "ver\\d+" +
                  "\t" +
                  `${training.id}` +
                  "\t" +
                  `/default/${training.fullname}\n`;
                console.log(text);
                fs.readFile(
                  `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`,
                  "utf8",
                  function (err, data) {
                    if (err) console.log(err);
                    let fileContents = data.replace(/\r\n/g, "\n");

                    fileContents = fileContents.replace(
                      /(\$BUILD_ID = )(.+)/,
                      (_, prefix, buildId) => {
                        const parts = buildId.split("_");
                        newVersion = parseInt(parts[1]) + 1;
                        const newBuildId = `${parts[0]}_${String(
                          newVersion
                        ).padStart(4, "0")}`;
                        return `${prefix}${newBuildId}`;
                      }
                    );

                    const lines = fileContents.split("\n");
                    const searchWord = `${training.fullname}`;

                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes(searchWord)) {
                        lines.splice(i, 1);
                        break;
                      }
                    }

                    let newFile = lines.join("\n");

                    const q = newFile.split(/\r?\n/);
                    let num;
                    let firstLine;

                    for (let i = 0; i < q.length; i++) {
                      if (q[i].includes("$NUM_ENTRIES")) {
                        firstLine = lines[i];
                        num = firstLine.replace(/\D/g, "");
                      }
                    }

                    let x = Number(num);
                    let oldFile = newFile.replace(
                      firstLine,
                      `$NUM_ENTRIES = ${x - 1}`
                    );

                    fs.writeFile(
                      `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`,
                      oldFile,
                      "utf8",
                      function (err) {
                        if (err) return console.log(err);
                      }
                    );
                    let newBuildId = `${String(newVersion).padStart(4, "0")}`;
                    db("metaenga_platforms")
                      .where({ platform: "quest" })
                      .update({ version: newBuildId })
                      .then((result) => {
                        console.log("Database updated successfully");
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                    let folder = `quest_${questVers.version}`;
                    let oldName = `./static/VR/manifest/${folder}`;
                    let partsS = folder.split("_");
                    newVersion = parseInt(partsS[1]) + 1;
                    const newName = `${partsS[0]}_${String(newVersion).padStart(
                      4,
                      "0"
                    )}`;
                    let newPath = `./static/VR/manifest/${newName}`;
                    fs.rename(oldName, newPath, (err) => {
                      if (err) {
                        console.error(err);
                      } else {
                        console.log("Folder renamed successfully!");
                      }
                    });
                  }
                );
              }
            }
          );
        }
        if (platformList.includes("windows")) {
          fs.open(
            `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`,
            "r",
            function (err, fd) {
              if (err) {
                console.log("File not found!");
              } else {
                // if file exists

                let newVersion;
                let text =
                  `${training.fullname}` +
                  "\t" +
                  `${training.size}` +
                  "\t" +
                  "ver\\d+" +
                  "\t" +
                  `${training.id}` +
                  "\t" +
                  `/default/${training.fullname}\n`;
                console.log(text);
                fs.readFile(
                  `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`,
                  "utf8",
                  function (err, data) {
                    if (err) console.log(err);
                    let fileContents = data.replace(/\r\n/g, "\n");

                    fileContents = fileContents.replace(
                      /(\$BUILD_ID = )(.+)/,
                      (_, prefix, buildId) => {
                        const parts = buildId.split("_");
                        newVersion = parseInt(parts[1]) + 1;
                        const newBuildId = `${parts[0]}_${String(
                          newVersion
                        ).padStart(4, "0")}`;
                        return `${prefix}${newBuildId}`;
                      }
                    );

                    const lines = fileContents.split("\n");
                    const searchWord = `${training.fullname}`;

                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes(searchWord)) {
                        lines.splice(i, 1);
                        break;
                      }
                    }

                    let newFile = lines.join("\n");

                    const q = newFile.split(/\r?\n/);
                    let num;
                    let firstLine;

                    for (let i = 0; i < q.length; i++) {
                      if (q[i].includes("$NUM_ENTRIES")) {
                        firstLine = lines[i];
                        num = firstLine.replace(/\D/g, "");
                      }
                    }

                    let x = Number(num);
                    let oldFile = newFile.replace(
                      firstLine,
                      `$NUM_ENTRIES = ${x - 1}`
                    );

                    fs.writeFile(
                      `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`,
                      oldFile,
                      "utf8",
                      function (err) {
                        if (err) return console.log(err);
                      }
                    );
                    let newBuildId = `${String(newVersion).padStart(4, "0")}`;
                    db("metaenga_platforms")
                      .where({ platform: "windows" })
                      .update({ version: newBuildId })
                      .then((result) => {
                        console.log("Database updated successfully");
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                    let folder = `windows_${windowsVers.version}`;
                    let oldName = `./static/VR/manifest/${folder}`;
                    let partsS = folder.split("_");
                    newVersion = parseInt(partsS[1]) + 1;
                    const newName = `${partsS[0]}_${String(newVersion).padStart(
                      4,
                      "0"
                    )}`;
                    let newPath = `./static/VR/manifest/${newName}`;
                    fs.rename(oldName, newPath, (err) => {
                      if (err) {
                        console.error(err);
                      } else {
                        console.log("Folder renamed successfully!");
                        semaphore.leave();
                      }
                    });
                  }
                );
              }
            }
          );
        }
        semaphore.leave();

        return res.status(200).json({
          status: "success",
        });
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getTrainingData(req, res, next) {
    try {
      const id = req.params.id;
      const company = req.params.company;
      const training = await db("trainings").first("*").where({
        id: id,
        company: company,
      });
      if (!training)
        return res.status(404).json({ status: "training not found" });
      return res.status(200).json({
        status: "success",
        data: training,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getVideoListByCompany(req, res, next) {
    try {
      const company = req.params.company;
      const check = await db("company").first("*").where({
        id: company,
      });
      if (!check) return res.status(404).json({ status: "company not found" });
      const videoDB = `video-${company}`;
      const video = await db("metaenga_videos").select("*");

      return res.status(200).json({
        status: "success",
        data: video,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getVideoListByUserAccessList(req, res, next) {
    try {
      const company = req.params.company;
      const user = req.params.user;
      const videos0 = await db("metaenga_user_access")
        .pluck("contentId")
        .where({
          userId: user,
          companyId: company,
        });
      const videos1 = await db("metaenga_video_user").pluck("video").where({
        user: user,
        company: company,
      });
      console.log(`VIDEOS:=======:${videos0}`);
      const videoDB = `video-${company}`;
      const client = await db("metaenga_videos")
        .select(
          "videoName",
          "videoDescription",
          "videoTheme",
          "companyId",
          "id",
          "preview",
          "Data",
          "duration",
          "serverName",
          "resolution"
        )
        .whereIn("id", videos0);
      const metaenga = await db("metaenga_video_table")
        .select(
          "videoName",
          "videoDescription",
          "videoTheme",
          "companyId",
          "id",
          "preview",
          "Data",
          "duration",
          "serverName",
          "resolution"
        )
        .whereIn("id", videos1);
      const combined = [...new Set([...client, ...metaenga])];
      return res.status(200).json({
        status: "success",
        data: combined,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getVideoListgGroupAccessList(req, res, next) {
    try {
      const company = req.params.company;
      const groupName = req.params.groupName;
      const videos0 = await db("metaenga_group_access")
        .pluck("contentId")
        .where({
          groupName: groupName,
          companyId: company,
          assign: 0,
        });
      const videos1 = await db("metaenga_group_access")
        .pluck("contentId")
        .where({
          groupName: groupName,
          companyId: company,
          assign: 1,
        });
      const videoDB = `video-${company}`;
      const client = await db("metaenga_videos")
        .select(
          "videoName",
          "videoDescription",
          "videoTheme",
          "companyId",
          "id",
          "preview",
          "Data",
          "duration",
          "serverName",
          "resolution"
        )
        .whereIn("id", videos0);

      const metaenga = await db("metaenga_video_table")
        .select(
          "videoName",
          "videoDescription",
          "videoTheme",
          "companyId",
          "id",
          "preview",
          "Data",
          "duration",
          "serverName",
          "resolution"
        )
        .whereIn("id", videos1);
      const combined = [...new Set([...client, ...metaenga])];
      return res.status(200).json({
        status: "success",
        data: combined,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async createRoom(req, res, next) {
    try {
      const { roomName, companyId, userId } = req.body;
      let id = await randomPassword();
      let arr = [];
      let arrJson = JSON.stringify(arr);
      const cmp = await db("company").first("*").where({
        id: companyId,
      });
      const checkRoom = await db("metaenga_classroom").first("*").where({
        roomName: roomName,
        companyId: companyId,
      });
      const checkUser = await db("metaenga_users").first("*").where({
        id: userId,
      });

      if (checkRoom)
        return res.status(404).json({ status: "room already exist" });
      if (!checkUser) return res.status(404).json({ status: "user not found" });
      if (!cmp) return res.status(404).json({ status: "company not found" });
      const time = new Date()
        .toISOString()
        .replace(/T/, " ") // replace T with a space
        .replace(/\..+/, ""); // delete the dot and everything after

      const getСlassroomsLimit = await db("metaenga_plans").first("*").where({
        plan: cmp.plan,
      });
      const getCompanyClass = await db("metaenga_plan_insight")
        .first("*")
        .where({
          companyId: companyId,
        });
      if (
        getCompanyClass.classroomsLimit >= getСlassroomsLimit.classroomsLimit
      ) {
        return res.status(403).json({
          status: "limit exceeded",
        });
      }

      await db("metaenga_classroom").insert({
        id: id,
        videos: arrJson,
        roomName: roomName,
        companyId: companyId,
        date: time,
        creator: checkUser.email,
      });

      await db("metaenga_classroom_logs").insert({
        company_id: companyId,
        classroom_id: id,
        status: 1,
        date: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
      });

      await db("metaenga_plan_insight")
        .where({
          companyId: companyId,
        })
        .increment("classroomsLimit", 1);

      return res.status(200).json({
        status: "success",
        data: id,
      });
    } catch (e) {
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }
  async getRooms(req, res, next) {
    try {
      const companyId = req.params.company;
      const cmp = await db("metaenga_classroom").select("*").where({
        companyId: companyId,
      });
      if (!cmp) return res.status(404).json({ status: "company not found" });
      return res.status(200).json({
        status: "success",
        data: cmp,
      });
    } catch (e) {
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }
  async addVideoToRoom(req, res, next) {
    try {
      const { classId, userId, videoId, companyId } = req.body;
      const checkUser = await db("userlink").first("*").where({
        user: userId,
      });

      if (!checkUser) {
        return res.status(404).json({ status: "user not found" });
      }

      const playlist = await db("metaenga_classroom").first("*").where({
        id: classId,
        companyId: checkUser.company,
      });

      let arr = [];
      arr = playlist.videos;

      // Check if the videoId already exists in the array
      if (
        arr.some(
          (video) => video.id === videoId && video.companyId === companyId
        )
      ) {
        return res.status(200).json({
          status: "success",
          data: "video already exists",
        });
      }

      arr.push({ id: videoId, companyId: companyId }); // Push the videoId and companyId as an object

      let arrJSON = JSON.stringify(arr);

      await db("metaenga_classroom")
        .update({
          videos: arrJSON,
        })
        .where({
          id: classId,
          companyId: checkUser.company,
        });

      return res.status(200).json({
        status: "success",
        data: "video added",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  //function for delete Room
  async deleteRoom(req, res, next) {
    try {
      const { classId, userId } = req.body;
      const checkUser = await db("userlink").first("*").where({
        user: userId,
      });
      if (!checkUser) {
        return res.status(404).json({ status: "user not found" });
      }
      await db("metaenga_classroom").delete().where({
        id: classId,
        companyId: checkUser.company,
      });
      const classroomsLimit = await db("metaenga_plan_insight")
        .first("*")
        .where({
          companyId: checkUser.company,
        });

      if (classroomsLimit.classroomsLimit <= 0) {
        return res.status(404).json({ status: "classrooms not found" });
      }

      await db("metaenga_plan_insight")
        .where({
          companyId: checkUser.company,
        })
        .decrement("classroomsLimit", 1);

      await db("metaenga_classroom_logs").insert({
        company_id: checkUser.company,
        classroom_id: classId,
        status: 0,
        date: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
      });
      return res.status(200).json({
        status: "success",
        data: "room deleted",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVideoListgCombinedAccessList(req, res, next) {
    try {
      let company = req.params.company;
      let user = req.params.user;

      const groupArr = await db("metaenga_member_of_group")
        .pluck("groupName")
        .where({
          companyId: company,
          userId: user,
        });
      if (!groupArr)
        return res.status(404).json({
          status: "group not found",
        });
      const groupAccessArr = await db("metaenga_group_access")
        .whereIn("groupName", groupArr)
        .pluck("contentId");

      const accessArr = await db("metaenga_user_access")
        .pluck("contentId")
        .where({
          companyId: company,
          userId: user,
        });
      const companyArray = await db("metaenga_video_company")
        .pluck("video")
        .where({
          company: company,
          assign: 0,
        });

      const combined = Array.from(
        new Set([...groupAccessArr, ...accessArr, ...companyArray])
      );
      // Retrieve the company ID for the user
      const company2 = await db("userlink")
        .first("company")
        .where({ user: user });
      const companyId2 = company2.company;

      // Retrieve the list of records from metaenga_video_company by company
      const companyVideos = await db("metaenga_video_company")
        .select("video")
        .where({ company: companyId2 });

      // Retrieve the list of records from metaenga_video_user by user
      const userVideos = await db("metaenga_video_user")
        .select("video")
        .where({ user: user });

      // Combine the two lists and get distinct videos
      const combinedVideos2 = [...companyVideos, ...userVideos].map(
        (video) => video.video
      );

      const groupAccessArr2 = await db("metaenga_group_access")
        .whereIn("groupName", groupArr)
        .where("assign", 1)
        .where("companyId", company)
        .pluck("contentId");

      const distinctVideos = [
        ...new Set([...combinedVideos2, ...groupAccessArr2]),
      ];

      // Get full info from metaenga_video_table for each video in the combined list
      const videoInfo = await db("metaenga_video_table").whereIn(
        "id",
        distinctVideos
      );

      const videolist = await db("metaenga_videos")
        .select("*")
        .whereIn("id", combined);
      const defaultVideos = await db("metaenga_videos_default").select("*");
      const combo = [...videolist, ...defaultVideos];

      return res.status(200).json({
        status: "success",
        metaenga: defaultVideos,
        client: videolist,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async SaveLog(req, res, next) {
    try {
      const { admin, action, companyName, actionDescription, DateTime } =
        req.body;
      const logObj = {
        admin: admin,
        action: action,
        companyName: companyName,
        actionDescription: actionDescription,
        DateTime: DateTime,
      };
      let objectCont = JSON.stringify(logObj);
      let data = fs.readFileSync("./log.json", { flag: "a+" });
      if (data.length == 0) {
        let arr = [];
        arr.push(logObj);
        let ArrJSON = JSON.stringify(arr);
        console.log(arr);
        fs.writeFile("./log.json", ArrJSON, function (err) {
          if (err) throw err;
        });
      } else {
        let myObject = [];
        myObject = JSON.parse(data);
        myObject.push(logObj);
        let jsonContent = JSON.stringify(myObject);

        fs.writeFile("./log.json", jsonContent, function (err) {
          if (err) throw err;
        });
      }

      return res.status(201).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getCurrentVersion(req, res, next) {
    try {
      const platform = req.params.platform;
      const version = await db("metaenga_platforms").first("version").where({
        platform: platform,
      });
      if (!version)
        return res.status(404).json({ status: "platoform not found" });
      return res.status(200).json({
        status: "success",
        data: version,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async AddVrTrainingToUser(req, res, next) {
    try {
      const { company, user, vrTrainingArr } = req.body;

      for (let i = 0; i < vrTrainingArr.length; i++) {
        const check = await db("metaenga_training_company").first("*").where({
          company: company,
          training: vrTrainingArr[i],
        });
        if (!check)
          return res
            .status(404)
            .json({ status: "company have no access to this training" });

        for (let i = 0; i < vrTrainingArr.length; i++) {
          const content = await db("metaenga_training_user").first("*").where({
            training: vrTrainingArr[i],
            company: company,
            user: user,
          });
          if (!content) {
            await db("metaenga_training_user").insert({
              training: vrTrainingArr[i],
              company: company,
              user: user,
            });
          }
        }

        return res.status(200).json({
          status: "success",
          data: "training added",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async DeleteVrTrainingFromUser(req, res, next) {
    try {
      const { company, user, vrTrainingArr } = req.body;

      for (let i = 0; i < vrTrainingArr.length; i++) {
        const content = await db("metaenga_training_user").first("*").where({
          company: company,
          user: user,
          training: vrTrainingArr[i],
        });
        if (content) {
          await db("metaenga_training_user").delete().where({
            company: company,
            user: user,
            training: vrTrainingArr[i],
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
  async getTrainingDataByUser(req, res, next) {
    try {
      const company = req.params.company;
      const user = req.params.user;
      const platform = req.params.platform;

      let getAssingTrainingList = await db("metaenga_training_company")
        .select("metaenga_training_company.*", "trainings.*")
        .where({
          "metaenga_training_company.company": company,
          "metaenga_training_company.platform": platform,
        })
        .join(
          "trainings",
          "trainings.id",
          "=",
          "metaenga_training_company.training"
        );
      let uniqueTrainings = getAssingTrainingList.filter(
        (training, index, self) =>
          index === self.findIndex((t) => t.training === training.training)
      );

      return res.status(200).json({
        status: "success",
        data: uniqueTrainings,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getTrainingGroupAccessList(req, res, next) {
    try {
      const company = req.params.company;
      const groupName = req.params.groupName;
      const training = await db("metaenga_group_vr_access")
        .pluck("contentId")
        .where({
          vrGroupName: groupName,
          companyId: company,
        });
      const trainingData = await db("trainings")
        .select("*")
        .whereIn("id", training);
      return res.status(200).json({
        status: "success",
        data: trainingData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getUserTrainingData(req, res, next) {
    try {
      const company = req.params.company;
      const user = req.params.user;

      const userTrainings = await db("metaenga_training_user")
        .pluck("training")
        .where({
          company: company,
          user: user,
        });

      const trainingsUser = await db("trainings")
        .select("*")
        .whereIn("id", userTrainings);

      return res.status(200).json({
        status: "success",
        data: trainingsUser,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getTrainingGroupAccessList(req, res, next) {
    try {
      const company = req.params.company;
      const groupName = req.params.groupName;
      const training = await db("metaenga_group_vr_access")
        .pluck("contentId")
        .where({
          vrGroupName: groupName,
          companyId: company,
        });
      const trainingData = await db("trainings")
        .select("*")
        .whereIn("id", training);
      return res.status(200).json({
        status: "success",
        data: trainingData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getCompanyDevices(req, res, next) {
    try {
      const company = req.params.company;

      const check = await db("company").first("*").where({
        id: company,
      });

      if (check) {
        const deviceData = await db("VR")
          .select("*")
          .whereIn("company", [check.id]);

        // Get the names and emails of the users by searching the ${check.id} table by userId
        const userIds = deviceData.map((data) => data.userId);
        const users = await db("metaenga_users")
          .select("id", "name", "email")
          .whereIn("id", userIds);

        // Update the deviceData with the user names and emails
        const updatedDeviceData = await Promise.all(
          deviceData.map(async (data) => {
            const user = users.find((user) => user.id === data.userId);
            if (user) {
              data.userName = user.name || user.email.split("@")[0];
              delete data.userEmail; // Remove the userEmail property

              // Query the metaenga_vr_app_session table to get the latest timeEnd for the device
              const latestTimeEnd = await db("metaenga_vr_app_session")
                .where("deviceId", data.id)
                .orderBy("timeEnd", "desc")
                .select("timeEnd")
                .first();

              data.latestTimeEnd = latestTimeEnd ? latestTimeEnd.timeEnd : null;
            }
            return data;
          })
        );

        // Filter out devices where the associated user was deleted
        const filteredDeviceData = updatedDeviceData.filter(
          (data) => data.userName || data.latestTimeEnd
        );

        return res.status(200).json({
          status: "success",
          data: filteredDeviceData,
        });
      } else {
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
  // async getDevice(req,res,next){
  //   try {
  //     const device = req.params.device
  //       const deviceData = await db('VR').select("id", "model", "name").where('id', device)
  //       return res.status(200).json({
  //         status:'success',
  //         data: deviceData
  //       })

  //   } catch (error) {
  //     console.log(error)
  //       return res.status(400).json({
  //           "status":"error",
  //           "data":error
  //       })
  //   }
  // }

  async updateVrTraining(req, res, next) {
    try {
      let name = req.files[0].originalname;
      let training = req.files[0].buffer;
      let company = "metaenga";
      let platform = req.params.platform;
      let q = name.replace(/\D/g, "");
      let number = q.substring(0, 4);
      let fileSizeInBytes = req.files[0].size;

      let picoVers = await db("metaenga_platforms")
        .first("*")
        .where({ platform: "pico" });
      let questVers = await db("metaenga_platforms")
        .first("*")
        .where({ platform: "quest" });
      let windowsVers = await db("metaenga_platforms")
        .first("*")
        .where({ platform: "windows" });

      let check2 = await db("trainings")
        .first("*")
        .where({ company: company, id: number });
      if (!check2) {
        return res
          .status(500)
          .json({ status: "error", error: "training not found" });
      }
      //await fs.writeFileSync(`./static/VR/default/${name}`, training)
      var objectArr = check2.platform;
      const updatedObjectArr = objectArr.map((obj) => {
        if (obj.platform === platform) {
          return { ...obj, fileSizeInBytes: fileSizeInBytes }; // Replacing file size where platform matches
        }
        return obj;
      });
      var updatedObjectArrJSON = JSON.stringify(updatedObjectArr);

      await db("trainings")
        .where({ company: company, id: number })
        .update({ platform: updatedObjectArrJSON });

      //let manifestPath = `./static/VR/${folder}/BuildManifest-training.txt`
      let manifestPathPico = `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`;
      let manifestPathQuest = `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`;
      let manifestPathwindows = `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`;
      let newVersion;
      if (platform === "pico") {
        try {
          fs.readFile(manifestPathPico, "utf8", (err, fileContents) => {
            if (err) {
              console.error(err);
              return;
            }

            fileContents = fileContents.replace(
              /(\$BUILD_ID = )(.+)/,
              (_, prefix, buildId) => {
                const parts = buildId.split("_");
                newVersion = parseInt(parts[1]) + 1;
                const newBuildId = `${parts[0]}_${String(newVersion).padStart(
                  4,
                  "0"
                )}`;
                return `${prefix}${newBuildId}`;
              }
            );

            const regex = new RegExp(
              `(${name}\\s+)(\\d+)(\\s+ver)(\\d{2})(\\s+${number}\\s+\\/default\\/${name})`
            );
            fileContents = fileContents.replace(
              regex,
              (_, prefix, fileSize, versionPrefix, version, suffix) => {
                const newFileSize = fileSizeInBytes.toString().padEnd(9); // Update file size here
                const newVersion = parseInt(version) + 1;
                const paddedVersion = String(newVersion).padStart(2, "0");
                return `${prefix}${newFileSize}${versionPrefix}${paddedVersion}${suffix}`;
              }
            );

            fs.writeFile(manifestPathPico, fileContents, "utf8", (err) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log("Manifest file updated successfully");
            });
            let newBuildId = `${String(newVersion).padStart(4, "0")}`;
            db("metaenga_platforms")
              .where({ platform: "pico" })
              .update({ version: newBuildId })
              .then((result) => {
                //обновляю билд айди в базе данных
                console.log("Database updated successfully");
              })
              .catch((error) => {
                console.error(error);
              });
            // db('trainings').where({id:number}).update({size:fileSizeInBytes}).then((result) => {
            //   console.log('Database updated successfully');
            // }).catch((error) => {
            //   console.error(error);
            // });
            let folder = `pico_${picoVers.version}`; //получаю название папки
            let oldName = `./static/VR/manifest/${folder}`; //получаю старый путь папки
            let partsS = folder.split("_"); //разбиваю название папки на части
            newVersion = parseInt(partsS[1]) + 1; //увеличиваю билд айди на 1
            const newName = `${partsS[0]}_${String(newVersion).padStart(
              4,
              "0"
            )}`; //генерирую новое название папки
            let newPath = `./static/VR/manifest/${newName}`; //генерирую новый путь папки
            fs.rename(oldName, newPath, (err) => {
              if (err) {
                console.error(err);
              } else {
                console.log("Folder renamed successfully!");
              }
            });
          });

          await fs.writeFileSync(`./static/VR/defaultpico/${name}`, training);
        } catch (error) {
          console.log(error);
          return res.status(400).json({
            status: "error",
            data: error,
          });
        }
      }
      if (platform === "quest") {
        try {
          fs.readFile(manifestPathQuest, "utf8", (err, fileContents) => {
            if (err) {
              console.error(err);
              return;
            }

            fileContents = fileContents.replace(
              /(\$BUILD_ID = )(.+)/,
              (_, prefix, buildId) => {
                const parts = buildId.split("_");
                newVersion = parseInt(parts[1]) + 1;
                const newBuildId = `${parts[0]}_${String(newVersion).padStart(
                  4,
                  "0"
                )}`;
                return `${prefix}${newBuildId}`;
              }
            );

            const regex = new RegExp(
              `(${name}\\s+)(\\d+)(\\s+ver)(\\d{2})(\\s+${number}\\s+\\/default\\/${name})`
            );
            console.log(regex);
            fileContents = fileContents.replace(
              regex,
              (_, prefix, fileSize, versionPrefix, version, suffix) => {
                const newFileSize = fileSizeInBytes.toString().padEnd(9); // Update file size here
                const newVersion = parseInt(version) + 1;
                const paddedVersion = String(newVersion).padStart(2, "0");
                return `${prefix}${newFileSize}${versionPrefix}${paddedVersion}${suffix}`;
              }
            );

            fs.writeFile(manifestPathQuest, fileContents, "utf8", (err) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log("Manifest file updated successfully");
            });
            let newBuildId = `${String(newVersion).padStart(4, "0")}`; //генерирую новый билд айди
            console.log(newBuildId);
            db("metaenga_platforms")
              .where({ platform: "quest" })
              .update({ version: newBuildId })
              .then((result) => {
                //обновляю билд айди в базе данных
                console.log("Database updated successfully");
              })
              .catch((error) => {
                console.error(error);
              });
            let folder = `quest_${questVers.version}`; //получаю название папки
            let oldName = `./static/VR/manifest/${folder}`; //получаю старый путь папки
            let partsS = folder.split("_"); //разбиваю название папки на части
            newVersion = parseInt(partsS[1]) + 1; //увеличиваю билд айди на 1
            const newName = `${partsS[0]}_${String(newVersion).padStart(
              4,
              "0"
            )}`; //генерирую новое название папки
            let newPath = `./static/VR/manifest/${newName}`; //генерирую новый путь папки
            fs.rename(oldName, newPath, (err) => {
              if (err) {
                console.error(err);
              } else {
                console.log("Folder renamed successfully!");
              }
            });
          });

          await fs.writeFileSync(`./static/VR/defaultquest/${name}`, training);
        } catch (error) {
          console.log(error);
          return res.status(400).json({
            status: "error",
            data: error,
          });
        }
      }
      if (platform === "windows") {
        try {
          fs.readFile(manifestPathwindows, "utf8", (err, fileContents) => {
            if (err) {
              console.error(err);
              return;
            }

            fileContents = fileContents.replace(
              /(\$BUILD_ID = )(.+)/,
              (_, prefix, buildId) => {
                const parts = buildId.split("_");
                newVersion = parseInt(parts[1]) + 1;
                const newBuildId = `${parts[0]}_${String(newVersion).padStart(
                  4,
                  "0"
                )}`;
                return `${prefix}${newBuildId}`;
              }
            );

            const regex = new RegExp(
              `(${name}\\s+)(\\d+)(\\s+ver)(\\d{2})(\\s+${number}\\s+\\/default\\/${name})`
            );
            fileContents = fileContents.replace(
              regex,
              (_, prefix, fileSize, versionPrefix, version, suffix) => {
                const newFileSize = fileSizeInBytes.toString().padEnd(9); // Update file size here
                const newVersion = parseInt(version) + 1;
                const paddedVersion = String(newVersion).padStart(2, "0");
                return `${prefix}${newFileSize}${versionPrefix}${paddedVersion}${suffix}`;
              }
            );

            fs.writeFile(manifestPathwindows, fileContents, "utf8", (err) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log("Manifest file updated successfully");
            });
            let newBuildId = `${String(newVersion).padStart(4, "0")}`; //генерирую новый билд айди
            db("metaenga_platforms")
              .where({ platform: "windows" })
              .update({ version: newBuildId })
              .then((result) => {
                //обновляю билд айди в базе данных
                console.log("Database updated successfully");
              })
              .catch((error) => {
                console.error(error);
              });
            let folder = `windows_${windowsVers.version}`; //получаю название папки
            let oldName = `./static/VR/manifest/${folder}`; //получаю старый путь папки
            let partsS = folder.split("_"); //разбиваю название папки на части
            newVersion = parseInt(partsS[1]) + 1; //увеличиваю билд айди на 1
            const newName = `${partsS[0]}_${String(newVersion).padStart(
              4,
              "0"
            )}`; //генерирую новое название папки
            let newPath = `./static/VR/manifest/${newName}`; //генерирую новый путь папки
            fs.rename(oldName, newPath, (err) => {
              if (err) {
                console.error(err);
              } else {
                console.log("Folder renamed successfully!");
              }
            });
          });

          await fs.writeFileSync(
            `./static/VR/defaultwindows/${name}`,
            training
          );
        } catch (error) {
          console.log(error);
          return res.status(400).json({
            status: "error",
            data: error,
          });
        }
      }

      return res.status(200).json({
        status: "success",
        data: "training updated",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getDevice(req, res, next) {
    try {
      const company = req.params.company;
      const device = req.params.device;

      const check = await db("company").first("*").where({
        id: company,
      });
      if (check) {
        const deviceData = await db("VR").select("*").where("id", device);
        console.log("deviceData", deviceData);

        // Get the names and emails of the users by searching the ${check.id} table by userId
        const userIds = deviceData.map((data) => data.userId);
        console.log("userIds", userIds);
        const users = await db("metaenga_users")
          .select("id", "name", "email")
          .whereIn("id", userIds);
        if (users.length === 0) {
          return res.status(404).json({
            status: "user not found",
          });
        }
        // Update the deviceData with the user names and emails
        const updatedDeviceData = await Promise.all(
          deviceData.map(async (data) => {
            const user = users.find((user) => user.id === data.userId);
            if (user) {
              data.userName = user.name || user.email.split("@")[0];
              delete data.userEmail; // Remove the userEmail property

              // Query the metaenga_vr_app_session table to get the latest timeEnd for the device
              const latestTimeEnd = await db("metaenga_vr_app_session")
                .where("deviceId", data.id)
                .orderBy("timeEnd", "desc")
                .select("timeEnd")
                .first();

              data.latestTimeEnd = latestTimeEnd ? latestTimeEnd.timeEnd : null;
            }
            return data;
          })
        );

        // Filter out devices where the associated user was deleted
        const filteredDeviceData = updatedDeviceData.filter(
          (data) => data.userName || data.latestTimeEnd
        );

        return res.status(200).json({
          status: "success",
          data: filteredDeviceData,
        });
      } else {
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

  async updateCompanyDevices(req, res, next) {
    try {
      const { deviceId, battery, totalSpace, freeSpace, userId } = req.body;
      await db("VR")
        .where({ id: deviceId })
        .update({
          battery: battery,
          totalMemory: totalSpace,
          freeMemory: freeSpace,
          userId: userId,
        })
        .then((result) => {
          return res.status(200).json({
            status: "success",
            data: "device updated",
          });
        })
        .catch((error) => {
          return res.status(400).json({
            status: "error",
            data: error,
          });
        });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async upgradePlan(req, res, next) {
    try {
      const { company, newPlan } = req.body;
      if (
        !["Free", "Premium", "Standart", "University", "Flex", "Enterprise"].includes(newPlan)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid plan type",
        });
      }

      const companyData = await db("company").first("*").where({ id: company });
      await db("metaenga_plan_insight")
        .where({ companyId: company })
        .update({ plan: newPlan });
      const normalizedPlan = newPlan.toLowerCase();
      const selectedtable = `metaenga_${normalizedPlan}`;
      const { plan } = await db("company").first("plan").where({ id: company });
      console.log(plan);

      //if(plan == newPlan){return res.status(200).json({status:'ok', data:'same plan'})}

      await db("company").where({ id: company }).update({ plan: newPlan });
      const time = new Date()
        .toISOString() //получаю текущее время
        .replace(/T/, " ")
        .replace(/\..+/, "");

      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

      const getNameOwner = await db("metaenga_users")
        .first("*")
        .where({ company_id: company, role: "Owner" });

      const getUsers = await db("userlink").pluck("login").where({
        company: company,
      });
      console.log(getUsers);

      const getEmail = await db("company").first("userEmail").where({
        id: company,
      });

      // if(companyData.plan == 'Free' && newPlan == 'Standart' || newPlan ==   ){

      // }
      // if(companyData.plan != 'Free'){
      // }

      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      console.log(getEmail.userEmail);

      if (companyData.plan != newPlan) {
        const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Date: new Date().toUTCString(),
        };

        const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${getEmail.userEmail}`;
        console.log(apiUrlFound);
        const responseFound = await axios.get(apiUrlFound, { headers });
        if (responseFound.status === 200) {
          const data = responseFound.data;
          if (Array.isArray(data)) {
            if (data.length > 0) {
              const apiUrl = "https://app.loops.so/api/v1/contacts/update";
              const updateData = {
                email: getEmail.userEmail,
                plan: newPlan,
              };

              const response = await axios
                .put(apiUrl, updateData, { headers })
                .then(async (result) => {
                  const apiUrlStandardPlan =
                    "https://app.loops.so/api/v1/transactional";

                  // Об'єкт даних для створення контакту
                  const contactDataStandardPlan = {
                    transactionalId: "clsem2z0d006xfvicsj4nnvnl",
                    email: getEmail.userEmail,
                    dataVariables: {
                      firstName: getNameOwner.name,
                    },
                  };

                  console.log(
                    "До відправки POST-запиту з використанням ключа API"
                  );
                  // Відправка POST-запиту з використанням ключа API
                  const responseStandardPlan = await axios.post(
                    apiUrlStandardPlan,
                    contactDataStandardPlan,
                    { headers }
                  );
                });
            } else {
              console.log("no user found in loops");
            }
          }
        }
      }

      await db("metaenga_training_company")
        .where({ company: company })
        .whereNot({ plan: "exclusive" })
        .del();

      let trainingsByPlan = await db(selectedtable).pluck("id");
      let fullTrainingsList = await db("trainings")
        .select("*")
        .whereIn("id", trainingsByPlan);

      if (newPlan != "Flex") {
        fullTrainingsList.forEach(async (item) => {
          let platform = item.platform;
          console.log(platform);
          if (
            platform.some((platformObj) =>
              platformObj.platform.includes("pico")
            )
          ) {
            console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAA");
            await db("metaenga_training_company").insert({
              training: item.id,
              company: company,
              fullname: item.fullname,
              default: 1,
              time: time,
              platform: "pico",
              plan: normalizedPlan,
            });
          }
          if (
            platform.some((platformObj) =>
              platformObj.platform.includes("quest")
            )
          ) {
            await db("metaenga_training_company").insert({
              training: item.id,
              company: company,
              fullname: item.fullname,
              default: 1,
              time: time,
              platform: "quest",
              plan: normalizedPlan,
            });
          }
          if (
            platform.some((platformObj) =>
              platformObj.platform.includes("windows")
            )
          ) {
            await db("metaenga_training_company").insert({
              training: item.id,
              company: company,
              fullname: item.fullname,
              default: 1,
              time: time,
              platform: "windows",
              plan: normalizedPlan,
            });
          }
        });
      }

      //await db('metaenga_plan_insight').where({company:company}).update({plan:newPlan})

      return res.status(200).json({
        status: "success",
        data: "plan updated",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getTrainings(req, res, next) {
    await db("trainings")
      .select("*")
      .then((result) => {
        return res.status(200).json({
          status: "success",
          data: result,
        });
      })
      .catch((error) => {
        return res.status(400).json({
          status: "error",
          data: error,
        });
      });
  }
  async getPlans(req, res, next) {
    const plan = req.params.plan;
    let table = `metaenga_${plan.toLowerCase()}`;
    const plans = await db(table).select("*");
    const trainings = await db("trainings")
      .select("*")
      .whereIn(
        "id",
        plans.map((item) => item.id)
      );
    return res.status(200).json({
      status: "success",
      data: trainings,
    });
  }

  async changeTrainingPublicity(req, res, next) {
    try {
      const id = req.params.id;
      const company = req.params.company;
      const publicity = req.params.publicity;
      const check = await db("metaenga_training_company").first("*").where({
        training: id,
        company: company,
      });
      if (!check) {
        return res.status(404).json({
          status: "no such training",
        });
      }
      await db("metaenga_training_company")
        .update({
          default: publicity,
        })
        .where({
          training: id,
          company: company,
        });
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

  async addTrainingToExclusive(req, res, next) {
    try {
      const id = req.params.id;
      const company = req.params.company;

      const check = await db("trainings").first("*").where({
        id: id,
      });
      const check1 = await db("company").first("*").where({
        id: company,
      });

      if (!check) {
        return res.status(404).json({
          status: "no such training",
        });
      }
      if (!check1) {
        return res.status(404).json({
          status: "no such company",
        });
      }
      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      await db("metaenga_exclusive").insert({
        id: id,
        time: time,
        company: company,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async addVideoToCompany(req, res, next) {
    try {
      const { company, video, publicity, assign } = req.body; // assign - 0 - client, 1 - metaenga
      if (publicity != 0 && publicity != 1) {
        return res.status(400).json({
          status: "error",
          data: "publicity must be 0 or 1",
        });
      }
      const check = await db("metaenga_video_table").first("*").where({
        id: video,
      });
      let g = `video-${company}`;
      const check2 = await db("metaenga_videos").first("*").where({
        id: video,
      });
      const checkVideo = await db("metaenga_video_company").first("*").where({
        video: video,
        company: company,
      });
      let name;
      if (checkVideo) {
        return res.status(400).json({
          status: "error",
          data: "video already added",
        });
      }
      if (assign == 1) {
        if (!check) {
          return res.status(404).json({
            status: "no such video",
          });
        }
        name = check.serverName;
      } else {
        if (!check2) {
          return res.status(404).json({
            status: "no such video",
          });
        }
        name = check2.serverName;
      }

      await db("metaenga_video_company").insert({
        video: video,
        company: company,
        fullname: name,
        default: publicity,
        assign: assign,
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
  async addVideoToUser(req, res, next) {
    try {
      const { company, video, user } = req.body;

      const check = await db("metaenga_video_table").first("*").where({
        id: video,
      });
      if (!check) {
        return res.status(404).json({
          status: "no such video",
        });
      }
      const checkAssingedVideo = await db("metaenga_video_company")
        .first("*")
        .where({
          video: video,
          company: company,
        });
      if (!checkAssingedVideo) {
        return res.status(404).json({
          status: "video not assigned to company",
        });
      }
      const checkUser = await db("metaenga_video_user").first("*").where({
        video: video,
        company: company,
        user: user,
      });
      if (checkUser) {
        return res.status(400).json({
          status: "error",
          data: "video already added",
        });
      }
      await db("metaenga_video_user").insert({
        video: video,
        company: company,
        user: user,
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
  async removeVideoFromCompany(req, res, next) {
    try {
      const { company, video } = req.body;
      const check = await db("metaenga_video_company").first("*").where({
        video: video,
        company: company,
      });
      if (!check) {
        return res.status(404).json({
          status: "no such video",
        });
      }
      await db("metaenga_video_company")
        .where({
          video: video,
          company: company,
        })
        .del();
      await db("metaenga_video_user")
        .where({
          video: video,
          company: company,
        })
        .del();
      return res.status(200).json({
        status: "success",
      });
    } catch (e) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async removeVideoFromUser(req, res, next) {
    try {
      const { company, video, user } = req.body;
      const check = await db("metaenga_video_user").first("*").where({
        video: video,
        company: company,
        user: user,
      });
      if (!check) {
        return res.status(404).json({
          status: "no such video",
        });
      }
      await db("metaenga_video_user")
        .where({
          video: video,
          company: company,
          user: user,
        })
        .del();
      return res.status(200).json({
        status: "success",
      });
    } catch (e) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getVideoListForOwner(req, res, next) {
    try {
      const company = req.params.company;
      const idList = await db("metaenga_video_company").pluck("video").where({
        company: company,
      });
      if (!idList) {
        return res.status(404).json({
          status: "no such video",
        });
      }
      const metaengaVideoList = await db("metaenga_video_table")
        .select("*")
        .whereIn("id", idList);

      let dbName = `video-${company}`;
      const clientVideoList = await db("metaenga_videos").select("*").where({
        companyId: company,
      });
      const defaultVideos = await db("metaenga_videos_default").select("*");
      const combo = [...defaultVideos, ...metaengaVideoList];
      return res.status(200).json({
        status: "success",
        metaenga: combo,
        client: clientVideoList,
      });
    } catch (e) {
      console.log(e);
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }
  async getVideoListForAdmin(req, res, next) {
    try {
      // Check if idList is empty

      // Fetch videos from the metaenga_video_table
      const metaengaVideoList = await db("metaenga_video_table").select("*");

      // Prepare the videos array
      const videos = metaengaVideoList.map((video) => ({
        id: video.id, // Ensure this is available or assign a unique ID as needed
        title: video.videoName,
        category: video.videoTheme,
        duration: video.duration,
        image: `${process.env.URL}/${video.preview}`,
        fullData: video, // Include the full data for each video
      }));

      const defaultVideos = await db("metaenga_videos_default").select("*");
      const Dvideos = defaultVideos.map((video) => ({
        id: video.id, // Ensure this is available or assign a unique ID as needed
        title: video.videoName,
        category: video.videoTheme,
        duration: video.duration,
        image: `${process.env.URL}/${video.preview}`,
        fullData: video, // Include the full data for each
      }));
      const combo = [...Dvideos, ...videos]; // Use the newly constructed videos array

      return res.status(200).json({
        status: "success",
        data: combo,
      });
    } catch (e) {
      console.log(e);
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }

  async getExactVideoForAdmin(req, res, next) {
    try {
      // Check if idList is empty
      const id = req.params.id;
      // Fetch videos from the metaenga_video_table
      const metaengaVideoList = await db("metaenga_video_table").select("*").where({ id: id });

      // Prepare the videos array
      const videos = metaengaVideoList.map((video) => ({
        id: video.id, // Ensure this is available or assign a unique ID as needed
        title: video.videoName,
        category: video.videoTheme,
        duration: video.duration,
        image: `${process.env.URL}/${video.preview}`,
        fullData: video, // Include the full data for each video
      }));

      const defaultVideos = await db("metaenga_videos_default").select("*").where({ id: id });
      const Dvideos = defaultVideos.map((video) => ({
        id: video.id, // Ensure this is available or assign a unique ID as needed
        title: video.videoName,
        category: video.videoTheme,
        duration: video.duration,
        image: `${process.env.URL}/${video.preview}`,
        fullData: video, // Include the full data for each
      }));
      const combo = [...Dvideos, ...videos]; // Use the newly constructed videos array

      return res.status(200).json({
        status: "success",
        data: combo,
      });
    } catch (e) {
      console.log(e);
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }
  async editExacVideoForAdmin(req, res, next) {
    try {
      // Check if idList is empty
      const id = req.params.id;
      const { videoName, videoTheme, videoDescription } = req.body;
      //find in which table the video is
      const check = await db("metaenga_video_table").first("*").where({ id: id });
      if (check) {
        await db("metaenga_video_table")
          .where({ id: id })
          .update({
            videoName: videoName,
            videoTheme: videoTheme,
            videoDescription: videoDescription,
          });
      } else {
        await db("metaenga_videos_default")
          .where({ id: id })
          .update({
            videoName: videoName,
            videoTheme: videoTheme,
            videoDescription: videoDescription,
          });
      }
      return res.status(200).json({
        status: "success",
      });
      
    } catch (e) {
      console.log(e);
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }
  async getVideoListByUser(req, res, next) {
    try {
      const user = req.params.user;

      // Retrieve the company ID for the user
      const company2 = await db("userlink")
        .first("company")
        .where({ user: user });
      const companyId2 = company2.company;

      // Retrieve the list of records from metaenga_video_company by company
      const companyVideos = await db("metaenga_video_company")
        .select("video")
        .where({ company: companyId2 });

      // Retrieve the list of records from metaenga_video_user by user
      const userVideos = await db("metaenga_video_user")
        .select("video")
        .where({ user: user });

      // Combine the two lists and get distinct videos
      const combinedVideos2 = [...companyVideos, ...userVideos].map(
        (video) => video.video
      );
      const distinctVideos = [...new Set(combinedVideos2)];

      // Get full info from metaenga_video_table for each video in the combined list
      const videoInfo = await db("metaenga_video_table").whereIn(
        "id",
        distinctVideos
      );

      // Get full info from video-${companyId} table
      const companyTable = `video-${companyId2}`;
      const companyTableInfo = await db("metaenga_videos")
        .select("*")
        .where({ company_id: companyId2 });

      return res.status(200).json({
        status: "success",
        data: {
          Metaenga: videoInfo,
          "Your Company": companyTableInfo,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async processPayment(req, res) {
    try {
      const sum = req.params.sum;
      const userId = req.params.userId;
      const count = req.params.count;
      const secretKey = "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0";
      const requestData = {
        order_id: uuid.v4(),
        merchant_id: "1514244",
        order_desc: "Тестовий платіж",
        amount: 1,
        currency: "EUR",
      };

      const orderedKeys = Object.keys(requestData).sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });

      const signatureRaw = orderedKeys.map((v) => requestData[v]).join("|");
      const signature = crypto.createHash("sha1");
      signature.update(`${secretKey}|${signatureRaw}`);

      const { data } = await axios.post(
        "https://pay.fondy.eu/api/checkout/url/",
        {
          request: {
            ...requestData,
            signature: signature.digest("hex"),
          },
        }
      );

      return res.status(200).json({
        status: "success",
        data: data,
      });
    } catch (error) {
      console.error("Payment error:", error);
      res.status(500).json({ error: "Payment failed" });
    } finally {
      console.log("");
    }
  }

  async getDefaultTrainingVR(req, res, next) {
    try {
      const json = [
        {
          poster: "1001.jpg",
          id: "1001",
          name: "High Voltage Electrical Substation Tour",
          company: "metaenga",
          size: "389930723",
          fullname: "pakchunk1001-Android_ASTC.pak",
          description:
            "Through exploring a virtual substation environment, this training will help participants become more familiar with the layout of industry-specific equipment, power transformers, oil circuit breakers, re-closers, and switchgear.",
          duration: "",
          numberOfScenarios: "",
          time: "2023-07-07 14:22:27",
          exlusive: 0,
          platform: [
            {
              platform: "pico",
              fileSizeInBytes: 389930723,
            },
            {
              platform: "quest",
              fileSizeInBytes: 389930723,
            },
            {
              platform: "windows",
              fileSizeInBytes: 389930723,
            },
          ],
        },
      ];
      return res.status(200).json({
        status: "success",
        data: json,
      });
    } catch (e) {
      console.log(e);
      return res.status(400).json({
        status: "error",
        data: e,
      });
    }
  }

  async loops(req, res) {
    try {
      const email = req.params.email;
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

      // Відправка PUT-запиту з використанням ключа API
      const response = await axios.put(apiUrl, updateData, { headers });

      console.log("Контакт було успішно оновлено в Loops", response);
    } catch (error) {
      console.error("Помилка оновлення контакту в Loops:", error);
    }

    return res.status(200).json({});
  }
  catch(error) {
    console.error(error);
    res.status(500).json({ error: "failed" });
  }

  async sendActivateAccountLetter(req, res) {
    try {
      const { email, firstName, token } = req.body;
      const apiUrlForSendActivateAccountLetter =
        "https://app.loops.so/api/v1/transactional";

      // Об'єкт даних для створення контакту
      const contactData = {
        transactionalId: "clm8ssoyv00ivl70o5tg5xgro",
        email: email,
        dataVariables: {
          firstName: firstName,
          Token: token,
        },
      };

      // Додайте ключ API до заголовків
      const apiKey = "361400aa1b89d4a52e914cdc641ecec7"; // Замініть на ваш ключ API

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      // Відправка POST-запиту з використанням ключа API
      const response = axios.post(
        apiUrlForSendActivateAccountLetter,
        contactData,
        { headers }
      );
    } catch (error) {
      console.error("Помилка надсилання листа активації", error);
    }

    return res.status(200).json({
      status: "success",
    });
  }
  catch(error) {
    console.error(error);
    res.status(500).json({ error: "failed" });
  }
}

async function isEmailValid(email) {
  return emailValidator.validate(email);
}
async function randomPassword() {
  let minm = 100000;
  let maxm = 999999;
  let id = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
  return id;
}
function generateAccessToken(phone) {
  return jwt.sign(phone, process.env.TOKEN_SECRET, { expiresIn: "72h" });
}

module.exports = new Controller();
