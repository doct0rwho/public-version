const db = require("../db");
const path = require("path");
const axios = require("axios");
var nodemailer = require("nodemailer");

async function FlexPlanPDF(req, res) {
  const filePath = path.join(__dirname, "/pdf/Flex plan details.pdf");
  res.sendFile(filePath);
}
module.exports.FlexPlanPDF = FlexPlanPDF;
