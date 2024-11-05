const db = require("../db");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const con = require("../db");
dotenv.config();
async function confirmationEmail(req, res) {
  const { token } = req.body;
  try {
    const email = await db("metaenga_email_confirmation")
      .first("*")
      .where("token", token);
    // return res.status(200).json({
    //   status: "success",
    //   email: "confirmed",
    // });
    console.log(email);
    if (!email) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid token" });
    }
    await db("metaenga_company_logs")
      .where("company_id", email.company_id)
      .update({ confirmed_email: true });

    await db("metaenga_email_confirmation").where("token", token).del();
    await db("company")
      .where("id", email.company_id)
      .update({ confirmed_email: true });

    const apiKey = "361400aa1b89d4a52e914cdc641ecec7";

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${email.email}`;

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
            companyId: email.company_id,
            email: email.email,
          };
          console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
          console.log(updateData);

          const response = await axios.put(apiUrl, updateData, { headers });
        }
      }
    }
    return res
      .status(200)
      .json({ status: "success", message: "Email confirmed" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
}
module.exports.confirmationEmail = confirmationEmail;
