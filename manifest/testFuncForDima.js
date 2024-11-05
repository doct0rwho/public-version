const db = require("../db");

async function TestFunc(req, res) {
  try{
    return res.status(200).json({ message: "Test success!" });
  }catch(e){
    console.log(e);
    return res.status(400)
  }
}
module.exports = TestFunc;
