const con = require("../db");
const db = require("../db");
async function companyProfilePage(req, res) {
  try {
    const company = req.params.company;

    const checkCompany = await db("company").where("id", company).first();

    if (!checkCompany) {
      return res.status(404).json({
        status: "error",
        data: "Company not found",
      });
    }

    //кількість активних користувачів за місяць та їх зміна у відсотках
    const currentDate = new Date();
    const monthlyData = [];
    const arrCount = [];

    for (let i = 0; i < 2; i++) {
      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i - 1,
        1
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        0
      );

      const startDay = startDate.getDate();
      const startMonth = startDate.getMonth() + 1;
      const startYear = startDate.getFullYear();

      const endDay = endDate.getDate();
      const endMonth = endDate.getMonth() + 1;
      const endYear = endDate.getFullYear();

      const start = `${startYear}-${
        startMonth < 10 ? "0" + startMonth : startMonth
      }-${startDay < 10 ? "0" + startDay : startDay}`;
      const end = `${endYear}-${endMonth < 10 ? "0" + endMonth : endMonth}-${
        endDay < 10 ? "0" + endDay : endDay
      }`;

      const period = `${start} - ${end}`;

      const monthObject = {
        period: period,
        count: 0,
      };

      monthlyData.push(monthObject);
    }

    for (const month of monthlyData) {
      const [start, end] = month.period.split(" - ");
      const startDateParts = start.split("-");
      const endDateParts = end.split("-");

      const formattedStart = `${startDateParts[2]}.${
        startDateParts[1]
      }.${startDateParts[0].substring(2)}`;
      const formattedEnd = `${endDateParts[2]}.${
        endDateParts[1]
      }.${endDateParts[0].substring(2)}`;

      const period = `${formattedStart} - ${formattedEnd}`;

      month.period = period;
      const userSet = new Set();

      const appSessionUsers = await db("metaenga_vr_app_session")
        .select("userId")
        .where("companyId", company)
        .andWhere(db.raw("DATE(timeStart) >= ?", start))
        .andWhere(db.raw("DATE(timeStart) <= ?", end));

      console.log("start-end", start, end);
      console.log("appSessionUsers", appSessionUsers);

      appSessionUsers.forEach((row) => {
        userSet.add(row.userId);
      });

      const webSessionUsers = await db("metaenga_vr_web_session")
        .select("userId")
        .where("companyId", company)
        .andWhere(db.raw("DATE(timeStart) >= ?", start))
        .andWhere(db.raw("DATE(timeStart) <= ?", end));

      console.log("start-end", start, end);
      console.log("webSessionUsers", webSessionUsers);

      webSessionUsers.forEach((row) => {
        userSet.add(row.userId);
      });

      const count = userSet.size;

      month.count = count || 0;
      arrCount.push(month.count);
    }
    let percentChange;
    if (arrCount[1] === 0) {
      percentChange = null;
    } else {
      percentChange = ((arrCount[0] - arrCount[1]) / arrCount[1]) * 100;
    }
    monthlyData.reverse();

    const percentChangeMonthlyActiveUsers =
      percentChange === null ? null : parseInt(percentChange.toFixed(0), 10);

    console.log("arrCount[1]", arrCount[1]);
    console.log("arrCount[0]", arrCount[0]);
    if (percentChangeMonthlyActiveUsers > 999) {
      percentChangeMonthlyActiveUsers = 999;
    } else if (percentChangeMonthlyActiveUsers < -999) {
      percentChangeMonthlyActiveUsers = -999;
    }

    //кількість девайсів на платформі у компанії
    const devices = await db("VR")
      .count("id as total")
      .where("company", company)
      .first();

    //кількість користувачів на платформі у компанії
    const users = await db("metaenga_users")
      .count("id as total")
      .where("company_id", company)
      .first();

    //кількість ексклюзивних контентів у компанії
    const exclusive = await db("metaenga_exclusive")
      .count("id as total")
      .where("company", company)
      .first();

    //остання активність будь-якого користувача у компанії
    const lastActivityApp = await db("metaenga_vr_app_session")
      .select("timeStart")
      .where("companyId", company)
      .orderBy("timeStart", "desc")
      .first();

    const lastActivityWeb = await db("metaenga_vr_web_session")
      .select("timeStart")
      .where("companyId", company)
      .orderBy("timeStart", "desc")
      .first();

    let lastActivity;
    if (!lastActivityApp && !lastActivityWeb) {
      lastActivity = null;
    } else if (!lastActivityApp) {
      lastActivity = lastActivityWeb.timeStart;
    } else if (!lastActivityWeb) {
      lastActivity = lastActivityApp.timeStart;
    } else {
      lastActivity =
        lastActivityApp.timeStart > lastActivityWeb.timeStart
          ? lastActivityApp.timeStart
          : lastActivityWeb.timeStart;
    }

    //кількість завантажених відео у компанії
    const videos = await db("metaenga_videos")
      .count("videoName as total")
      .where("companyId", company)
      .first();

    console.log("monthlyData", monthlyData);

    const data = {
      monthlyActiveUsers: arrCount[0],
      percentChangeMonthlyActiveUsers: percentChangeMonthlyActiveUsers,
      devices: devices.total || 0,
      users: users.total || 0,
      exclusive: exclusive.total || 0,
      lastActivity: lastActivity,
      videos: videos.total || 0,
    };
    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.log(error);

    return res.status(400).json({
      status: "error",
      data: error.message,
    });
  }
}
module.exports.companyProfilePage = companyProfilePage;
