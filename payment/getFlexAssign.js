const db = require("../db");

async function getFlexAssign(req, res) {
  let headsetId = req.params.headset;
  let trainingsAssignData = await db("metaenga_flex_assign")
    .select("metaenga_flex_assign.*", "trainings.name")
    .join("trainings", "metaenga_flex_assign.training", "=", "trainings.id")
    .where("headset", headsetId);

  if (trainingsAssignData.length > 0) {
    return res.status(200).json(trainingsAssignData);
  } else {
    return res.status(400).json({ error: "No such headset" });
  }
}
module.exports = getFlexAssign;
