const db = require("../db");
async function changeUserStatus(req, res) {
  try {
    const { companyId, newStatus, userId } = req.body;
    if (!companyId || !newStatus || !userId) {
      return res.status(400).json({
        status: "error",
        data: "Bad request",
      });
    }
    await db("metaenga_users")
      .update({ status: newStatus })
      .where({ id: userId, company_id: companyId });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal server error",
    });
  }
}
module.exports.changeUserStatus = changeUserStatus;
