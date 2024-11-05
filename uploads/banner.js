// uploads/banner.js
const db = require("../db");
dotenv.config()
async function getBanner(req, res) {
  try {
    const company_id = req.params.company;
    const bannerResult = await db("metaenga_banner")
      .where("company_id", company_id)
      .first();

    if (!bannerResult || !bannerResult.banner_url) {
      return res.status(200).json({
        status: "success",
        url: `${process.env.URL}/banner/default.png`,
      });
    } else {
      return res.status(200).json({
        status: "success",
        url: `${process.env.URL}/banner/${bannerResult.banner_url}`,
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
}
module.exports.getBanner = getBanner;
