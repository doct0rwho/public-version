const db = require("../db");
async function changeLicenses(req, res) {
  try {
    const { number, companyId } = req.body;
    if (!companyId || !number) {
      return res.status(400).json({
        status: "error",
        data: "Bad request",
      });
    }
    await db("company")
      .update({ payedLicense: number })
      .where({ id: companyId });

    return res.status(200).json({
      status: "success",
      data: "Licenses updated",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal server error",
    });
  }
}
module.exports.changeLicenses = changeLicenses;
