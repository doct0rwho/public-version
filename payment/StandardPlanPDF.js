const db = require("../db");
const path = require("path");
const axios = require("axios");
var nodemailer = require("nodemailer");

async function StandardPlanPDF(req, res) {
  const filePath = path.join(__dirname, "/pdf/Standard plan details.pdf");
  res.sendFile(filePath);
}
module.exports.StandardPlanPDF = StandardPlanPDF;
