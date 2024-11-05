const db = require("../db");
const axios = require("axios");
async function sendRegistrationLink(req, res) {
  try {
    const { email } = req.body;
    const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    const apiUrlForSendActivateAccountLetter =
      "https://app.loops.so/api/v1/transactional";

    // Об'єкт даних для створення контакту
    const contactDataForSendActivateAccountLetter = {
      transactionalId: "clqz718o9010pa0rpwfolige2",
      email: email,
    };
    const responseForSendActivateAccountLetter = await axios.post(
      apiUrlForSendActivateAccountLetter,
      contactDataForSendActivateAccountLetter,
      { headers }
    );

    await db("metaenga_send_registration_link").insert({
      email: email,
    });

    return res.status(201).json({
      status: "success",
    });
  } catch (error) {
    console.error(error);
    console.error(error.response.data);
    return res.status(400).json({ status: "error" });
  }
}
module.exports.sendRegistrationLink = sendRegistrationLink;
