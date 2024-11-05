const db = require("../db");
const axios = require("axios");

async function StandardPlanProposalNonRegistered(req, res) {
  const sendEmail = async () => {
    try {
      const email = req.params.email;
      if (!email) {
        return res.status(400).json({
          status: "error",
          data: "Invalid input data",
        });
      }

      let pdflink = `${process.env.URL}/get/standard/plan/pdf`;
      let month = new Date();
      let formattedDate =
        month.getFullYear() + "-" + ("0" + (month.getMonth() + 1)).slice(-2);
      console.log(formattedDate); // Outputs: 2024-05

      const apiKey = "361400aa1b89d4a52e914cdc641ecec7";
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Date: new Date().toUTCString(),
      };

      const payload = {
        transactionalId: "clwoprhnq037u5jkatzqhnihu",
        email: email,
        dataVariables: {
          pdflink: pdflink,
          month: formattedDate,
        },
      };

      const loopsUrl = "https://app.loops.so/api/v1/transactional";
      await axios.post(loopsUrl, payload, { headers });
      console.log("Email sent successfully");
      return res.status(200).json({
        status: "success",
        data: "Email sent successfully",
      });
    } catch (error) {
      if (error.response) {
        console.log(`Error status: ${error.response.status}`);
        console.log(`Error data: ${JSON.stringify(error.response.data)}`);
        console.log(`Error headers: ${JSON.stringify(error.response.headers)}`);
      } else if (error.request) {
        console.log(`No response received: ${error.request}`);
      } else {
        console.log(`Error setting up request: ${error.message}`);
      }
      throw error; // Rethrow the error to handle retries
    }
  };

  try {
    await sendEmail();
  } catch (error) {
    console.log("Retrying email sending...");
    try {
      await sendEmail();
    } catch (secondError) {
      console.log("Failed to send email after retrying.");
      return res.status(500).json({
        status: "error",
        data: "Internal server error",
      });
    }
  }
}

module.exports.StandardPlanProposalNonRegistered =
  StandardPlanProposalNonRegistered;
