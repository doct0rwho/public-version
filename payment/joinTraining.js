const db = require("../db");
const axios = require("axios");
var nodemailer = require("nodemailer");
const con = require("../db");

async function joinTraining(req, res) {
  let { headsetId, trainingId } = req.body;
  //get limits
  let getHeadsetInfo = await db("VR").first("*").where("id", headsetId);
  if (!getHeadsetInfo) {
    console.log("No such headset");
    return res.status(400).json({ error: "No such headset" });
  }
  let companyId = getHeadsetInfo.company;
  console.log(companyId);
  console.log(trainingId);
  let checkPlan = await db("company").first("*").where("id", companyId);
  if (checkPlan.plan != "Flex") {
    console.log("Not flex plan");
    return res.status(200).json({ status: "not flex plan" }); //if company has no flex plan
  }
  let getAssignInfo = await db("metaenga_training_company")
    .first("*")
    .where({ company: companyId, training: trainingId, plan: "flex" });
  if (!getAssignInfo) {
    console.log("No such training plan for this company");
    return res
      .status(400)
      .json({ error: "No such training plan for this company" });
  }
  let AssigQuantity = getAssignInfo.quantity; //our limit
  //check if training assigned to exact headset
  let checkAssigned = await db("metaenga_flex_assign")
    .first("*")
    .where({ headset: headsetId, training: trainingId });
  if (checkAssigned) {
    console.log("Already assigned");
    return res.status(200).json({ status: "already assigned" });
  }
  //count assined headsets
  let countAssigned = await db("metaenga_flex_assign")
    .count("*")
    .where({ training: trainingId, company: companyId });
  let count = countAssigned[0]["count(*)"];
  if (count >= AssigQuantity) {
    console.log("Limit exceeded");
    return res.status(400).json({ error: "Limit exceeded" });
  } else {
    let insertAssign = await db("metaenga_flex_assign").insert({
      headset: headsetId,
      training: trainingId,
      company: companyId,
    });
    if (insertAssign) {
        console.log("Assigned");
      return res.status(200).json({ status: "assigned" });
    } else {
        console.log("Error while assigning");
      return res.status(400).json({ error: "Error while assigning" });
    }
  }
}
module.exports.joinTraining = joinTraining;
