const jwt = require("jsonwebtoken");
const db = require("../db");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const axios = require("axios");
dotenv = require("dotenv");
dotenv.config();
async function formRegistrationCompany(req, res) {
  var {
    FullName,
    Email,
    Company,
    Password,
    ConfirmPassword,
    typeRegistration,
  } = req.body;
  if (!Company) Company = Email.split("@")[0] + "'s company";
  if (!validatePasswordRegistration(Password, ConfirmPassword)) {
    return res.status(400).json({
      status: "error",
      message: "Password and Confirm Password not match",
    });
  }
  const email = await db("metaenga_users").where("email", Email).first();
  if (email)
    return res
      .status(400)
      .json({ status: "error", message: "Email already exists" });
  // const company = await db("company").where("companyName", Company).first();
  // if (company)
  //   return res
  //     .status(400)
  //     .json({ status: "error", message: "Company already exists" });
  try {
    let type;
    if (typeRegistration === true) {
      type = "Vr";
    } else if (typeRegistration === false) {
      type = "Web";
    }
    var id = uuid.v4();
    var user_id = uuid.v4();
    var hashPassword = await bcrypt.hash(Password, 7);
    const time = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
    var confirmationToken = jwt.sign(
      {
        FullName: FullName,
        Email: Email,
        Company: Company,
      },
      process.env.LINK_TOKEN,
      { expiresIn: "72h" }
    );
    var authToken = jwt.sign(
      {
        FullName: FullName,
        Email: Email,
        Company: Company,
        id: user_id,
      },
      process.env.USER_TOKEN,
      { expiresIn: "72h" }
    );

    // Додайте ключ API до заголовків
    const apiKey = "361400aa1b89d4a52e914cdc641ecec7"; // Замініть на ваш ключ API

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    const apiUrlForSendActivateAccountLetter =
      "https://app.loops.so/api/v1/transactional";

    // Об'єкт даних для створення контакту
    const contactDataForSendActivateAccountLetter = {
      transactionalId: "clsluw9jw002rnrl03lyxq65m",
      email: Email,
      dataVariables: {
        firstName: Email,
        Token: confirmationToken,
      },
    };

    const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${Email}`;

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
            email: Email,
            firstName: FullName,
            lastName: "",
            companyName: Company,
            companyId: "non-activated account",
            userGroup: "OWNER",
            source: type,
            plan: "Free",
            token: confirmationToken,
          };

          const responseUpdate = await axios
            .put(apiUrl, updateData, { headers })
            .then(async (response) => {
              // Відправка POST-запиту з використанням ключа API
              const responseForSendActivateAccountLetter = await axios.post(
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
            email: Email,
            firstName: FullName,
            lastName: "",
            companyName: Company,
            companyId: "non-activated account",
            userGroup: "OWNER",
            source: type,
            plan: "Free",
            token: confirmationToken,
          };

          const headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };

          // Відправка POST-запиту з використанням ключа API
          const responsCreate = axios
            .post(apiUrl, contactData, { headers })
            .then(async (response) => {
              // Відправка POST-запиту з використанням ключа API
              const responseForSendActivateAccountLetter = await axios.post(
                apiUrlForSendActivateAccountLetter,
                contactDataForSendActivateAccountLetter,
                { headers }
              );
            });
        }
      }
    }

    const date = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db("company").insert({
      companyName: Company,
      userEmail: Email,
      id: id,
      confirmed_email: 0,
      plan: "Free",
      date: time,
      typeRegistration: type,
    });
    await db("metaenga_plan_insight").insert({
      companyId: id,
      plan: "Free",
      companyUsersLimit: 1,
    });

    await db("metaenga_users").insert({
      name: FullName,
      password: hashPassword,
      email: Email,
      id: user_id,
      role: "OWNER",
      status: "ACTIVE",
      lastActivity: time,

      company_id: id,
    });
    await db("metaenga_user_logs").insert({
      companyId: id,
      status: 1,
      time: date,
    });

    await db("metaenga_company_logs").insert({
      company_id: id,
      status: 1,
      date: date,
      confirmed_email: 0,
      google: 0,
    });

    const checkExist = await db("metaenga_email_confirmation")
      .where("email", Email)
      .first();
    if (checkExist) {
      await db("metaenga_email_confirmation")
        .where("email", Email)
        .update({ token: confirmationToken });
    } else {
      await db("metaenga_email_confirmation").insert({
        email: Email,
        token: confirmationToken,
        company_id: id,
      });
    }
    await db("userlink").insert({
      user: user_id,
      login: Email,
      company: id,
      role: "OWNER",
    });
    const trainings = await db("trainings")
      .select("company", "fullname", "id", "platform")
      .whereIn("id", function () {
        this.select("id").from("metaenga_free");
      });

    trainings.forEach(async (training) => {
      console.log(training);
      if (training.platform.some((item) => item.platform === "pico")) {
        await db("metaenga_training_company").insert({
          training: training.id,
          company: id,
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
          company: id,
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
          company: id,
          time: time,
          fullname: training.fullname,
          default: 1,
          platform: "windows",
          plan: "free",
        });
      }
    });

    const checkEmail = await db("metaenga_send_registration_link")
      .where("email", Email)
      .first();

    if (checkEmail) {
      await db("metaenga_send_registration_link").where("email", Email).del();
    }

    return res.status(200).json({
      status: "success",
      token: authToken,
      id: user_id,
      name: FullName,
      email: Email,
      companyName: Company,
      company_id: id,
      role: "OWNER",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
}
function validatePasswordRegistration(Password, ConfirmPassword) {
  if (Password === ConfirmPassword) {
    return true;
  } else {
    return false;
  }
}

module.exports.formRegistrationCompany = formRegistrationCompany;
