const db = require("../db");
const path = require("path");
const axios = require("axios");
var nodemailer = require("nodemailer");

async function VrTrainingPDF(req, res) {
  const filePath = path.join(__dirname, "/pdf/VR Training module details.pdf");
  res.sendFile(filePath);
}
module.exports.VrTrainingPDF = VrTrainingPDF;
