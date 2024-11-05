const db = require("../db");
async function changeUserRole(req, res) {
  try {
    const { companyId, newRole, userId } = req.body;
    if (!companyId || !newRole || !userId) {
      return res.status(400).json({
        status: "error",
        data: "Bad request",
      });
    }
    await db("metaenga_users")
      .update({ role: newRole })
      .where({ id: userId, company_id: companyId });
    await db("userlink")
      .update({ role: newRole })
      .where({ user: userId, company: companyId });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal server error",
    });
  }
}
module.exports.changeUserRole = changeUserRole;
