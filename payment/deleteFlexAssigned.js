const db = require("../db");
async function deleteFlexAssigned(req, res) {
  let headset = req.params.headset;
  let training = req.params.training;
  let deleteAssigned = await db("metaenga_flex_assign")
    .where({ headset, training })
    .del();
  if (deleteAssigned) {
    return res.status(200).json({ status: "deleted" });
  } else {
    return res.status(400).json({ error: "Error while deleting" });
  }
}
module.exports = deleteFlexAssigned;
