const axios = require("axios");
const db = require("../db");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
async function resendEmail(req, res) {
  try {
    const { Email } = req.body;
    console.log(Email);
    const check = await db("metaenga_email_confirmation")
      .where("email", Email)
      .first();
    if (!check)
      return res
        .status(400)
        .json({ status: "error", message: "Email not found" });
    const company = await db("company").where("id", check.company_id).first();
    const confirmationToken = jwt.sign(
      {
        Email: Email,
      },
      process.env.LINK_TOKEN,
      { expiresIn: "72h" }
    );
    await db("metaenga_email_confirmation")
      .where("email", Email)
      .update({ token: confirmationToken });

    const apiKey = "361400aa1b89d4a52e914cdc641ecec7"; // Replace with your API key

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Date: new Date().toUTCString(), // Add the current date to the headers
    };

    const apiUrlForSendActivateAccountLetter =
      "https://app.loops.so/api/v1/transactional";

    const contactDataForSendActivateAccountLetter = {
      transactionalId: "clsluw9jw002rnrl03lyxq65m",
      email: Email,
      dataVariables: {
        firstName: Email,
        Token: confirmationToken,
      },
    };

    const responseForSendActivateAccountLetter = await axios.post(
      apiUrlForSendActivateAccountLetter,
      contactDataForSendActivateAccountLetter,
      { headers }
    );
    return res.status(200).json({ status: "success", message: "Email sent" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ status: "error", message: "Something went wrong" });
  }
}
module.exports.resendEmail = resendEmail;
