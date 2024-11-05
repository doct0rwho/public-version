const db = require("../db");

async function company30Days(req, res) {
  try {
    const currentDate = new Date();
    const dailyData = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      const formattedDate = date.toISOString().split("T")[0];

      const dayObject = {
        date: formattedDate,
        count: 0,
      };

      dailyData.push(dayObject);
    }

    for (let i = 0; i < dailyData.length; i++) {
      const date = dailyData[i].date;

      const addCompany = await db("metaenga_company_logs")
        .count("company_id as total")
        .where("status", "=", 1)
        .andWhere(db.raw("DATE(date) = ?", date))
        .first();

      const addCount = addCompany.total || 0;

      dailyData[i].count = addCount;
    }

    dailyData.reverse();

    return res.status(200).json({
      status: "success",
      data: dailyData,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: "error",
      data: error,
    });
  }
}

module.exports.company30Days = company30Days;
