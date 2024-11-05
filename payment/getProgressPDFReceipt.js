const db = require("../db");

async function getProgressPDFReceipt(req, res) {
  try {
    const orderId = req.params.orderId;

    const getpdfReceiptProgress = await db("metaenga_payment_fondy")
      .select("*")
      .where("order_id", orderId)
      .first();

    if (!getpdfReceiptProgress) {
      return res.status(400).json({
        status: "error",
        data: "Order not found",
      });
    } else {
      let linkWithoutStatic;
      if (getpdfReceiptProgress.order_url != null) {
        linkWithoutStatic = getpdfReceiptProgress.order_url.replace(
          /^\.\/static/,
          ""
        );
      } else if (getpdfReceiptProgress.sub_url != null) {
        linkWithoutStatic = getpdfReceiptProgress.sub_url.replace(
          /^\.\/static/,
          ""
        );
      } else if (
        getpdfReceiptProgress.order_url == null &&
        getpdfReceiptProgress.sub_url == null
      ) {
        return res.status(400).json({
          status: "error",
          data: "No receipt found",
        });
      }

      if (getpdfReceiptProgress.progress != "100") {
        return res.status(200).json({
          status: "success",
          data: getpdfReceiptProgress.progress,
        });
      } else {
        return res.status(200).json({
          status: "success",
          data: getpdfReceiptProgress.progress,
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

module.exports.getProgressPDFReceipt = getProgressPDFReceipt;
