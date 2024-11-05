const db = require("../db");
async function usersStat(req, res) {
  try {
    const getTotalUsers = await db("metaenga_users")
      .count("id as totalUsers")
      .first();

    const totalUsers = parseInt(getTotalUsers.totalUsers, 10) || 0;

    const getlicenseAllocated = await db("company")
      .sum("payedLicense as sum")
      .first();

    console.log("getlicenseAllocated", getlicenseAllocated);

    const licenseAllocated = parseInt(getlicenseAllocated.sum, 10) || 0;

    const getDeactivetedUsers = await db("metaenga_users")
      .count("id as totalUsers")
      .where("status", "DEACTIVATED")
      .first();
    const deactivetedUsers = parseInt(getDeactivetedUsers.totalUsers, 10) || 0;

    const currentDateNotFormatted = new Date();
    const currentDate = currentDateNotFormatted
      .toISOString()
      .replace(/T/, " ")
      .replace(/\..+/, "");
    currentDateNotFormatted.setDate(currentDateNotFormatted.getDate() - 30);
    const thirtyDaysAgo = currentDateNotFormatted
      .toISOString()
      .replace(/T/, " ")
      .replace(/\..+/, "");

    console.log("сейчас", currentDate);
    console.log("30 дней назад", thirtyDaysAgo);

    const addedUsersLastMonthResult = await db("metaenga_user_logs")
      .count("companyId as count")
      .andWhere("status", "=", 1)
      .whereBetween("time", [thirtyDaysAgo, currentDate])
      .first();

    const deletedUsersLastMonthResult = await db("metaenga_user_logs")
      .count("companyId as count")
      .andWhere("status", "=", 0)
      .whereBetween("time", [thirtyDaysAgo, currentDate])
      .first();

    const addedCount = parseInt(addedUsersLastMonthResult.count, 10) || 0;
    const deletedCount = parseInt(deletedUsersLastMonthResult.count, 10) || 0;

    const totalUsersLastMonth = totalUsers + deletedCount - addedCount;
    let percentChange = 0;
    if (totalUsersLastMonth == 0) {
      percentChange = null;
    } else {
      percentChange =
        ((totalUsers - totalUsersLastMonth) / totalUsersLastMonth) * 100;
    }
    if (percentChange > 999) {
      percentChange = 999;
    } else if (percentChange < -999) {
      percentChange = -999;
    }

    console.log("всего", totalUsers);
    console.log("добавлено за последние 30 дней", addedCount);
    console.log("удалено за последние 30 дней", deletedCount);
    console.log("было 30 дней назад", totalUsersLastMonth);

    //скільки користувачів в фрішних компаніях та тих, що платять
    const getFreeCompany = await db("company")
      .select("id")
      .where("plan", "Free");
    const getFreeCompanyIds = getFreeCompany.map((item) => item.id);

    const getPaidCompany = await db("company")
      .select("id")
      .where("plan", "Standart")
      .orWhere("plan", "Premium");
    const getPaidCompanyIds = getPaidCompany.map((item) => item.id);

    const getFreeCompanyUserCount = await db("metaenga_users")
      .count("id as userCount")
      .whereIn("company_id", getFreeCompanyIds)
      .first();

    const freeCompanyUserCount =
      parseInt(getFreeCompanyUserCount.userCount, 10) || 0;

    const getPaidCompanyUserCount = await db("metaenga_users")
      .count("id as userCount")
      .whereIn("company_id", getPaidCompanyIds)
      .first();

    const paidCompanyUserCount =
      parseInt(getPaidCompanyUserCount.userCount, 10) || 0;

    //веб чи вр
    const getUsers = await db("metaenga_users").select("id");
    const getUsersIds = getUsers.map((item) => item.id);

    const checkApp = await db("metaenga_vr_app_session")
      .distinct("userId")
      .whereIn("userid", getUsersIds);

    console.log("checkApp", checkApp);

    const checkWeb = await db("metaenga_vr_web_session")
      .distinct("userId")
      .whereIn("userid", getUsersIds);

    console.log("checkWeb", checkWeb);

    let userApp = 0;
    let userWeb = 0;

    for (const userId of getUsersIds) {
      const isInWeb = checkApp.find((item) => item.userId === userId);
      const isInApp = checkWeb.find((item) => item.userId === userId);

      if (isInWeb && !isInApp) {
        userWeb++;
      } else if (!isInWeb && isInApp) {
        userApp++;
      }
    }

    const data = {
      totalUsers: totalUsers,
      percentChange: parseInt(percentChange.toFixed(0), 10) || 0,
      licenseAllocated: licenseAllocated,
      percentChangeLicense: 0,
      deactivetedUsers: deactivetedUsers,
      freeCompanyUserCount: freeCompanyUserCount,
      paidCompanyUserCount: paidCompanyUserCount,
      userApp: userApp,
      userWeb: userWeb,
    };

    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: "error" });
  }
}
module.exports.usersStat = usersStat;
