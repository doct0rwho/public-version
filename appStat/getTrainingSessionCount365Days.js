const db = require("../db");

async function getTrainingSessionCount365Days(req, res) {
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
    SELECT timeStart AS date, COUNT(trainingSessionId) AS count
    FROM (
        SELECT timeStart, trainingSessionId
        FROM metaenga_vr_training_session
        WHERE timeStart >= :queryStartDate AND companyId = :company
        ) AS all_sessions
        GROUP BY DATE(timeStart)
    `,
      { queryStartDate, company }
    );

    // Extract the results and format them as an array of objects
    const totalCountByDate = results[0].map((row) => ({
      date: new Date(row.date),
      count: row.count,
    }));
    // Prepare daily data for the last 365 days
    const dailyData = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);

      const result = totalCountByDate.find(
        (result) =>
          result.date.toISOString().split("T")[0] ===
          date.toISOString().split("T")[0]
      );

      // If result exists, get the count, otherwise set count to 0
      const count = result ? result.count : 0;

      dailyData.push({
        date: date.toISOString().split("T")[0],
        count: count,
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

module.exports.getTrainingSessionCount365Days = getTrainingSessionCount365Days;
