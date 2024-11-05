const db = require("../db");

async function getProgressPDF(req, res) {
  try {
    const invoiceId = req.params.invoiceId;

    const getInvoiceProgress = await db("metaenga_invoices")
      .select("*")
      .where("invoice_id", invoiceId)
      .first();

    if (!getInvoiceProgress) {
      return res.status(400).json({
        status: "error",
        data: "Invoice not found",
      });
    } else {
      const linkWithoutStatic = getInvoiceProgress.url.replace(
        /^\.\/static/,
        ""
      );

      if (getInvoiceProgress.progress != "100") {
        return res.status(200).json({
          status: "success",
          data: getInvoiceProgress.progress,
        });
      } else {
        return res.status(200).json({
          status: "success",
          data: getInvoiceProgress.progress,
          link: linkWithoutStatic,
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal Server Error",
    });
  }
}

module.exports.getProgressPDF = getProgressPDF;
