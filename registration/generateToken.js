const db = require("../db");
const jwt = require("jsonwebtoken");

async function generateToken(req, res) {
  try {
    const { email, code } = req.body;

    const check = await db("metaenga_login_with_code")
      .where({ email: email, code: code })
      .first();
    if (!check) {
      return res
        .status(400)
        .json({ status: "error", message: "Credentials incorrect" });
    }
    const userData = await db("metaenga_users")
      .first("*")
      .where("email", email);

    let token = await jwt.sign(
      {
        FullName: userData.name,
        Email: email,
        Company: userData.company,
      },
      process.env.USER_TOKEN,
      { expiresIn: "72h" }
    );

    return res.status(200).json({
      status: "success",
      token: token,
      user_id: userData.id,
      id: userData.id,
      name: userData.name,
      role: userData.role,
      company: userData.company_id,
      email: email,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: "error" });
  }
}
module.exports.generateToken = generateToken;
