const db = require("../db");

async function company365Days(req, res) {
  try {
    const currentDate = new Date();

    // Calculate the start date for the last 365 days
    const queryStartDate = new Date(currentDate);
    queryStartDate.setDate(queryStartDate.getDate() - 364); // Start date is 365 days ago

    // Fetch counts for all days within the last 365 days
    const results = await db("metaenga_company_logs")
      .select(
        db.raw("DATE_FORMAT(date, '%Y-%m-%d') as date"), // Format the date
        db.raw("COUNT(company_id) as count")
      )
      .where("status", "=", 1)
      .andWhere(db.raw("DATE(date) >= ?", queryStartDate))
      .groupBy(db.raw("DATE(date)"));

    console.log(results);
    // Create a map to store counts for each date

    // Prepare daily data for the last 365 days
    const dailyData = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      const formattedDate = date.toISOString().split("T")[0];

      // Find the result object for the current date
      const result = results.find((result) => result.date === formattedDate);

      // If result exists, get the count, otherwise set count to 0
      const count = result ? result.count : 0;

      dailyData.push({
        date: formattedDate,
        count: count,
      });
    }
    // Reverse dailyData array to have dates in ascending order
    dailyData.reverse();

    return res.status(200).json({
      status: "success",
      data: dailyData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

module.exports.company365Days = company365Days;
