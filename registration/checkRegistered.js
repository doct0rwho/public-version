const db = require("../db");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const con = require("../db");
dotenv.config();
async function checkRegistered(req, res) {
  const email = req.params.email;
  console.log(email);
  let check = await db("metaenga_users").first("*").where({ email: email });
  if (check) {
    let Type;
    if (check.google == true) {
      Type = "Google";
    } else {
      Type = "Manual";
    }
    let json = {
      email: email,
      registrationType: Type,
    };
    res.status(200).send(json);
  } else {
    res.status(200).send({ status: "not registered" });
  }
}
module.exports.checkRegistered = checkRegistered;
