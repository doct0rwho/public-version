const db = require("../db");

async function getAppAndWebSessionCompanyDuration365Days(req, res) {
  try {
    const company = req.params.company;
    const currentDate = new Date();

    // Calculate the start date for the last 365 days
    const queryStartDate = new Date(currentDate);

    queryStartDate.setHours(0, 0, 0, 0); // Set time to 00:00:00
    queryStartDate.setDate(queryStartDate.getDate() - 364);

    // Fetch counts for all days within the last 365 days

    const results = await db.raw(
      `
      SELECT timeStart AS date, SUM(duration) AS totalDuration
      FROM (
        SELECT timeStart, duration
        FROM metaenga_vr_web_session
        WHERE timeStart >= :queryStartDate AND companyId = :company
        AND duration IS NOT NULL
        
        UNION ALL
        
        SELECT timeStart, userId
        FROM metaenga_vr_app_session
        WHERE timeStart >= :queryStartDate AND companyId = :company
        AND duration IS NOT NULL
      ) AS all_duration
      GROUP BY DATE(timeStart)
    `,
      { queryStartDate, company }
    );

    // Extract the results and format them as an array of objects
    const durationByDate = results[0].map((row) => ({
      date: new Date(row.date),
      totalDuration: row.totalDuration,
    }));

    // Prepare daily data for the last 365 days
    const dailyData = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);

      const result = durationByDate.find(
        (result) =>
          result.date.toISOString().split("T")[0] ===
          date.toISOString().split("T")[0]
      );

      // console.log(result)

      // If result exists, get the count, otherwise set count to 0
      const totalDuration = result ? result.totalDuration : 0;

      dailyData.push({
        date: date.toISOString().split("T")[0],
        totalDuration: totalDuration,
      });
    }
    //Reverse dailyData array to have dates in ascending order
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

module.exports.getAppAndWebSessionCompanyDuration365Days =
  getAppAndWebSessionCompanyDuration365Days;
