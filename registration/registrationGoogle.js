const { OAuth2Client } = require("google-auth-library");
const db = require("../db");
const jwt = require("jsonwebtoken");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const dotenv = require("dotenv");
const con = require("../db");
const axios = require("axios");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
dotenv.config();
async function googleRegistration(req, res) {
  const { token } = req.body;
  try {
    console.log("Received token:", token);
    const payload = await client.getTokenInfo(token);
    console.log("Received payload:", payload);
    const profileInfo = await fetchUserProfile(token);
    console.log("Received profileInfo:", profileInfo);
    const email = await db("metaenga_users")
      .where("email", profileInfo.email)
      .first();
    if (email) {
      console.log("login", profileInfo.email);
      await login(profileInfo).then((response) => {
        return res
          .status(200)
          .json({ companyId: email.company_id, ...response });
      });
    } else {
      console.log("register", profileInfo.email);
      await registration(profileInfo).then((response) => {
        return res.status(200).json(response);
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
}
async function fetchUserProfile(token) {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch user profile");
  }
}
async function registration(profileInfo) {
  const { name, email, picture } = profileInfo;
  var id = uuid.v4();
  var user_id = uuid.v4();
  const companyName = name.split(" ")[0] + "'s company";
  const time = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
  var authToken = jwt.sign(
    {
      FullName: name,
      Email: email,
      Company: companyName,
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
    transactionalId: "clsmwpccs002pckp870bl5qpz",
    email: email,
    dataVariables: {
      firstName: name,
    },
  };

  const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${email}`;

  // Виконуємо GET-запит до API Loops за допомогою Axios
  const responseFound = await axios.get(apiUrlFound, { headers });

  if (responseFound.status === 200) {
    console.log("Контакт успішно знайдено");
    const data = responseFound.data;

    // Перевіряємо, чи отримали масив контактів
    if (Array.isArray(data)) {
      if (data.length > 0) {
        // Контакт із вказаною електронною адресою знайдено

        const apiUrl = "https://app.loops.so/api/v1/contacts/update";

        const updateData = {
          email: email,
          firstName: name,
          lastName: "",
          companyName: companyName,
          companyId: id,
          userGroup: "OWNER",
          source: "Web",
          plan: "Free",
        };

        const response = await axios
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
        console.log("Контакт не знайдено");
        const apiUrl = "https://app.loops.so/api/v1/contacts/create";

        // Об'єкт даних для створення контакту
        const contactData = {
          email: email,
          firstName: name,
          lastName: "",
          companyName: companyName,
          companyId: id,
          userGroup: "OWNER",
          source: "Web",
          plan: "Free",
        };

        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

        // Відправка POST-запиту з використанням ключа API
        axios.post(apiUrl, contactData, { headers }).then(async (response) => {
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
    companyName: companyName,
    userEmail: email,
    id: id,
    confirmed_email: 1,
    plan: "Free",
    google: 1,
    typeRegistration: "Web",
    date: time,
  });
  await db("metaenga_plan_insight").insert({
    companyId: id,
    plan: "Free",
    companyUsersLimit: 1,
  });

  await db("metaenga_users").insert({
    name: name,
    email: email,
    id: user_id,
    role: "OWNER",
    status: "ACTIVE",
    lastActivity: time,
    company_id: id,
    google: 1,
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
    google: 1,
  });
  // await db("metaenga_email_confirmation").insert({
  //   email: email,
  //   token: confirmationToken,
  //   company_id: id,
  // });
  await db("userlink").insert({
    user: user_id,
    login: email,
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
  const respone = {
    companyId: id,
    status: "success",
    type: "registration",
    token: authToken,
    id: user_id,
    company: companyName,
    name: name,
    email: email,
  };
  return respone;
}
async function login(profileInfo) {
  const { name, email, picture } = profileInfo;
  const user = await db("metaenga_users").where("email", email).first();
  const company = await db("company").where("id", user.company_id).first();
  const time = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
  var authToken = jwt.sign(
    {
      FullName: name,
      Email: email,
      Company: company.companyName,
      id: user.id,
    },
    process.env.USER_TOKEN,
    { expiresIn: "72h" }
  );

  const respone = {
    status: "success",
    type: "login",
    token: authToken,
    id: user.id,
    company: company.companyName,
    name: name,
    email: email,
  };
  return respone;
}
module.exports.googleRegistration = googleRegistration;
