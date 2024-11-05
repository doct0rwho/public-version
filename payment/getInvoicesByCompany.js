const db = require("../db");

async function getInvoicesByCompany(req, res) {
  try {
    const companyId = req.params.companyId;

    const checkCompany = await db("company").where("id", companyId).first("*");

    if (!checkCompany) {
      return res.status(400).json({
        status: "error",
        data: "Company not found",
      });
    }

    const invoices = await db("metaenga_invoices")
      .where("company_id", companyId)
      .select("*");

    if (!invoices) {
      return res.status(400).json({
        status: "error",
        data: "Invoices not found",
      });
    } else {
      return res.status(200).json({
        status: "success",
        data: invoices,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal server error",
    });
  }
}

module.exports.getInvoicesByCompany = getInvoicesByCompany;
