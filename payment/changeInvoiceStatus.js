const db = require("../db");

async function changeInvoiceStatus(req, res) {
  try {
    let { companyId, status, invoiceId } = req.body;
    console.log(companyId, status);

    await db("company").where("id", companyId).update({ invoice: status });

    const changeInvoice = await db("metaenga_invoices")
      .where({
        invoice_id: invoiceId,
        company_id: companyId,
      })
      .first("*");

    console.log("invoiceId", invoiceId);
    console.log("companyId", companyId);
    console.log(changeInvoice);

    if (status == true) {
      const changeInvoice = await db("metaenga_invoices")
        .where({
          invoice_id: invoiceId,
          company_id: companyId,
        })
        .first("*");

      if (changeInvoice) {
        await db("metaenga_invoices")
          .where({
            invoice_id: invoiceId,
            company_id: companyId,
          })
          .update({ status: status });
      } else {
        return res.status(400).json({
          status: "error",
          data: "Invoice not found",
        });
      }
    } else if (status == false) {
      await db("metaenga_invoices")
        .where({
          company_id: companyId,
        })
        .update({ status: status });
    }
    return res.status(200).json({
      status: "success",
      data: "Invoice status updated",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal server error",
    });
  }
}

module.exports.changeInvoiceStatus = changeInvoiceStatus;
