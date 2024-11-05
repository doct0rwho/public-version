const con = require("../db");
const db = require("../db");

const msToMinutes = (milliseconds) => {
  const minutes = Math.ceil(milliseconds / (60 * 1000));
  return minutes;
};

async function avgTimeSpent90Days(req, res) {
  try {
    const currentDate = new Date();
    const dailyData = [];
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 89); // Start date for 90 days ago

    // Fetch total duration and user count for web sessions for each day within the last 90 days
    const webSessions = await db("metaenga_vr_web_session")
      .select(
        db.raw("DATE(timeStart) AS date"),
        db.raw("SUM(duration) AS totalDuration"),
        db.raw("COUNT(DISTINCT userId) AS userCount")
      )
      .whereRaw("timeStart >= ?", startDate.toISOString().split("T")[0])
      .andWhereRaw("timeStart <= ?", currentDate.toISOString().split("T")[0])
      .andWhereRaw("duration IS NOT NULL") // Check for not null
      .andWhere("duration", "!=", " ")
      .groupByRaw("DATE(timeStart)");

    // Fetch total duration and user count for app sessions for each day within the last 90 days
    const appSessions = await db("metaenga_vr_app_session")
      .select(
        db.raw("DATE(timeStart) AS date"),
        db.raw("SUM(duration) AS totalDuration"),
        db.raw("COUNT(DISTINCT userId) AS userCount")
      )
      .whereRaw("timeStart >= ?", startDate.toISOString().split("T")[0])
      .andWhereRaw("timeStart <= ?", currentDate.toISOString().split("T")[0])
      .andWhereRaw("duration IS NOT NULL") // Check for not null
      .andWhere("duration", "!=", " ")
      .groupByRaw("DATE(timeStart)");

    // Merge web and app session data for each day
    for (let i = 0; i < 90; i++) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      const formattedDate = date.toISOString().split("T")[0];

      const webData = webSessions.find((session) => {
        const sessionDate = new Date(session.date);
        const sessionFormattedDate = sessionDate.toISOString().split("T")[0];
        return sessionFormattedDate === formattedDate;
      });

      const appData = appSessions.find((session) => {
        const sessionDate = new Date(session.date);
        const sessionFormattedDate = sessionDate.toISOString().split("T")[0];
        return sessionFormattedDate === formattedDate;
      });

      const avgWebTimeSpent =
        webData && webData.userCount
          ? msToMinutes(webData.totalDuration / webData.userCount)
          : 0;
      const avgAppTimeSpent =
        appData && appData.userCount
          ? msToMinutes(appData.totalDuration / appData.userCount)
          : 0;

      dailyData.push({
        date: formattedDate,
        count: avgWebTimeSpent,
        count2: avgAppTimeSpent,
      });
    }

    return res.status(200).json({
      status: "success",
      data: dailyData.reverse(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

module.exports.avgTimeSpent90Days = avgTimeSpent90Days;
