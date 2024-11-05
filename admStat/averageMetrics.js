const db = require("../db");

async function getAvgMetrics(req, res) {
  try {
    //кількість користуваців
    const getUsersTotal = await db("metaenga_users")
      .count("id as totalUsers")
      .first();

    const usersTotal = parseInt(getUsersTotal.totalUsers, 10) || 0;

    //кількість витраченого часу за весь час
    const getAppSessionsTotal = await db("metaenga_vr_app_session")
      .whereNotNull("duration")
      .andWhere("duration", "!=", " ")
      .sum("duration as totalSessions")
      .first();

    const getWebSessionsTotal = await db("metaenga_vr_web_session")
      .whereNotNull("duration")
      .andWhere("duration", "!=", " ")
      .sum("duration as totalSessions")
      .first();

    const appSessionsTotal =
      parseInt(getAppSessionsTotal.totalSessions, 10) || 0;
    const webSessionsTotal =
      parseInt(getWebSessionsTotal.totalSessions, 10) || 0;
    const sessionTotal = appSessionsTotal + webSessionsTotal;

    //середній час сесії
    const avgTimeSpent = sessionTotal / usersTotal;

    const result = convertMillisecondsToDaysAndHours(avgTimeSpent);

    console.log("usersTotal", usersTotal);
    console.log("getAppSessionsTotal", getAppSessionsTotal);
    console.log("getWebSessionsTotal", getWebSessionsTotal);
    console.log("appSessionsTotal", appSessionsTotal);
    console.log("webSessionsTotal", webSessionsTotal);
    console.log("sessionTotal", sessionTotal);
    console.log("avgTimeSpent", avgTimeSpent);

    //кількість витраченого часу за останні 30 днів
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
    currentDateNotFormatted.setDate(currentDateNotFormatted.getDate() - 30);
    const sixtyDaysAgo = currentDateNotFormatted
      .toISOString()
      .replace(/T/, " ")
      .replace(/\..+/, "");

    console.log("сейчас", currentDate);
    console.log("30 дней назад", thirtyDaysAgo);
    console.log("60 дней назад", sixtyDaysAgo);

    const getAppSessionsTotalThirtyDaysAgo = await db("metaenga_vr_app_session")
      .whereNotNull("duration")
      .andWhere("duration", "!=", " ")
      .sum("duration as totalSessions")
      .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
      .first();

    const getWebSessionsTotalThirtyDaysAgo = await db("metaenga_vr_web_session")
      .whereNotNull("duration")
      .andWhere("duration", "!=", " ")
      .sum("duration as totalSessions")
      .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
      .first();

    const appSessionsTotalThirtyDaysAgo =
      parseInt(getAppSessionsTotalThirtyDaysAgo.totalSessions, 10) || 0;
    const webSessionsTotalThirtyDaysAgo =
      parseInt(getWebSessionsTotalThirtyDaysAgo.totalSessions, 10) || 0;
    const sessionTotalThirtyDaysAgo =
      appSessionsTotalThirtyDaysAgo + webSessionsTotalThirtyDaysAgo;

    //середній час сесії за 30 днів 30 днів назад
    const getAppSessionsTotalSixtyDaysAgo = await db("metaenga_vr_app_session")
      .whereNotNull("duration")
      .andWhere("duration", "!=", " ")
      .sum("duration as totalSessions")
      .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
      .first();

    const getWebSessionsTotalSixtyDaysAgo = await db("metaenga_vr_web_session")
      .whereNotNull("duration")
      .andWhere("duration", "!=", " ")
      .sum("duration as totalSessions")
      .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
      .first();

    const appSessionsTotalSixtyDaysAgo =
      parseInt(getAppSessionsTotalSixtyDaysAgo.totalSessions, 10) || 0;
    const webSessionsTotalSixtyDaysAgo =
      parseInt(getWebSessionsTotalSixtyDaysAgo.totalSessions, 10) || 0;
    const sessionTotalSixtyDaysAgo =
      appSessionsTotalSixtyDaysAgo + webSessionsTotalSixtyDaysAgo;

    //відсоток зміни часу сесії
    let percentChangeTimeSpent = 0;
    if (sessionTotalSixtyDaysAgo == 0) {
      percentChangeTimeSpent = null;
    } else {
      percentChangeTimeSpent = parseFloat(
        (
          ((sessionTotalThirtyDaysAgo - sessionTotalSixtyDaysAgo) /
            sessionTotalSixtyDaysAgo) *
          100
        ).toFixed(1)
      );
    }
    if (percentChangeTimeSpent > 999) {
      percentChangeTimeSpent = 999;
    } else if (percentChangeTimeSpent < -999) {
      percentChangeTimeSpent = -999;
    }

    console.log("sessionTotalThirtyDaysAgo", sessionTotalThirtyDaysAgo);
    console.log("sessionTotalSixtyDaysAgo", sessionTotalSixtyDaysAgo);

    //середня кількість користувачів на компанію
    const getTotalCompany = await db("company")
      .count("id as totalCompany")
      .first();

    const totalCompany = parseInt(getTotalCompany.totalCompany, 10) || 0;
    const avgUsers = usersTotal / totalCompany;

    //відсоток зміни кількості користувачів
    const getAddedCompanyThirtyDaysAgo = await db("metaenga_company_logs")
      .count("company_id as totalCompany")
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .andWhere("status", "=", 1)
      .first();

    const getDeletedCompanyThirtyDaysAgo = await db("metaenga_company_logs")
      .count("company_id as totalCompany")
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .andWhere("status", "=", 0)
      .first();

    const addedCompanyThirtyDaysAgo =
      parseInt(getAddedCompanyThirtyDaysAgo.totalCompany, 10) || 0;
    const deletedCompanyThirtyDaysAgo =
      parseInt(getDeletedCompanyThirtyDaysAgo.totalCompany, 10) || 0;
    const totalCompanyThirtyDaysAgo =
      totalCompany - addedCompanyThirtyDaysAgo + deletedCompanyThirtyDaysAgo;

    const getAddedUsersThirtyDaysAgo = await db("metaenga_user_logs")
      .count("companyId as totalUsers")
      .whereBetween("time", [thirtyDaysAgo, currentDate])
      .andWhere("status", "=", 1)
      .first();

    const getDeletedUsersThirtyDaysAgo = await db("metaenga_user_logs")
      .count("companyId as totalUsers")
      .whereBetween("time", [thirtyDaysAgo, currentDate])
      .andWhere("status", "=", 0)
      .first();

    const addedUsersThirtyDaysAgo =
      parseInt(getAddedUsersThirtyDaysAgo.totalUsers, 10) || 0;
    const deletedUsersThirtyDaysAgo =
      parseInt(getDeletedUsersThirtyDaysAgo.totalUsers, 10) || 0;
    const totalUsersThirtyDaysAgo =
      usersTotal - addedUsersThirtyDaysAgo + deletedUsersThirtyDaysAgo;
    const avgUsersThirtyDaysAgo =
      totalUsersThirtyDaysAgo / totalCompanyThirtyDaysAgo;

    let percentChangeUsers = 0;
    if (avgUsersThirtyDaysAgo == 0) {
      percentChangeUsers = null;
    } else {
      percentChangeUsers = parseFloat(
        (
          ((avgUsers - avgUsersThirtyDaysAgo) / avgUsersThirtyDaysAgo) *
          100
        ).toFixed(1)
      );
    }
    if (percentChangeUsers > 999) {
      percentChangeUsers = 999;
    } else if (percentChangeUsers < -999) {
      percentChangeUsers = -999;
    }

    console.log("totalUsers", usersTotal);
    console.log("addedUsersThirtyDaysAgo", addedUsersThirtyDaysAgo);
    console.log("deletedUsersThirtyDaysAgo", deletedUsersThirtyDaysAgo);
    console.log("totalUsersThirtyDaysAgo", totalUsersThirtyDaysAgo);
    console.log("totalCompany", totalCompany);
    console.log("addedCompanyThirtyDaysAgo", addedCompanyThirtyDaysAgo);
    console.log("deletedCompanyThirtyDaysAgo", deletedCompanyThirtyDaysAgo);
    console.log("totalCompanyThirtyDaysAgo", totalCompanyThirtyDaysAgo);
    console.log("avgUsers", avgUsers);
    console.log("avgUsersThirtyDaysAgo", avgUsersThirtyDaysAgo);

    //середня кількість окулярів на компанію
    const getTotalDevice = await db("VR").count("id as totalDevice").first();

    const totalDevice = parseInt(getTotalDevice.totalDevice, 10) || 0;
    const avgDevice = totalDevice / totalCompany;

    //відсоток зміни кількості окулярів
    const getAddedDeviceThirtyDaysAgo = await db("metaenga_device_logs")
      .count("device_id as totalDevice")
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .andWhere("status", "=", 1)
      .first();

    const getDeletedDeviceThirtyDaysAgo = await db("metaenga_device_logs")
      .count("device_id as totalDevice")
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .andWhere("status", "=", 0)
      .first();

    const addedDeviceThirtyDaysAgo =
      parseInt(getAddedDeviceThirtyDaysAgo.totalDevice, 10) || 0;
    const deletedDeviceThirtyDaysAgo =
      parseInt(getDeletedDeviceThirtyDaysAgo.totalDevice, 10) || 0;
    const totalDeviceThirtyDaysAgo =
      totalDevice - addedDeviceThirtyDaysAgo + deletedDeviceThirtyDaysAgo;
    const avgDeviceThirtyDaysAgo =
      totalDeviceThirtyDaysAgo / totalCompanyThirtyDaysAgo;

    let percentChangeDevice = 0;
    if (avgDeviceThirtyDaysAgo == 0) {
      percentChangeDevice = null;
    } else {
      percentChangeDevice = parseFloat(
        (
          ((avgDevice - avgDeviceThirtyDaysAgo) / avgDeviceThirtyDaysAgo) *
          100
        ).toFixed(1)
      );
    }
    if (percentChangeDevice > 999) {
      percentChangeDevice = 999;
    } else if (percentChangeDevice < -999) {
      percentChangeDevice = -999;
    }

    console.log("totalDevice", totalDevice);
    console.log("addedDeviceThirtyDaysAgo", addedDeviceThirtyDaysAgo);
    console.log("deletedDeviceThirtyDaysAgo", deletedDeviceThirtyDaysAgo);
    console.log("totalDeviceThirtyDaysAgo", totalDeviceThirtyDaysAgo);

    //середня кількість сесій web на користувача
    const getCountWebSessionsTotal = await db("metaenga_vr_web_session")
      .count("webSessionId as totalSessions")
      .first();

    const countWebSessionsTotal =
      parseInt(getCountWebSessionsTotal.totalSessions, 10) || 0;
    const avgTimeSpentWeb = parseFloat(
      (countWebSessionsTotal / usersTotal).toFixed(1)
    );

    //середня кількість сесій vr на користувача
    const getCountAppSessionsTotal = await db("metaenga_vr_app_session")
      .count("appSessionId as totalSessions")
      .first();

    const countAppSessionsTotal =
      parseInt(getCountAppSessionsTotal.totalSessions, 10) || 0;
    const avgTimeSpentVr = parseFloat(
      (countAppSessionsTotal / usersTotal).toFixed(1)
    );

    console.log("countAppSessionsTotal", countAppSessionsTotal);
    console.log("countWebSessionsTotal", countWebSessionsTotal);

    const data = {
      ...result,
      percentChangeTimeSpent: percentChangeTimeSpent,
      avgUsers: parseFloat(avgUsers.toFixed(1)),
      percentChangeUsers: percentChangeUsers,
      avgDevice: parseFloat(avgDevice.toFixed(1)),
      percentChangeDevice: percentChangeDevice,
      avgTimeSpentWeb: avgTimeSpentWeb,
      avgTimeSpentVr: avgTimeSpentVr,
    };

    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ status: "error", data: error });
  }
}

function convertMillisecondsToDaysAndHours(milliseconds) {
  // 1 день = 24 години
  const hoursInDay = 24;

  // Кількість мілісекунд у годині
  const millisecondsPerHour = 1000 * 60 * 60;

  // Розрахунок кількості годин
  const avgTimeSpentHours = Math.floor(milliseconds / millisecondsPerHour);

  // Розрахунок кількості днів
  const avgTimeSpentDays = Math.floor(avgTimeSpentHours / hoursInDay);

  return {
    avgTimeSpentDays,
    avgTimeSpentHours: avgTimeSpentHours % hoursInDay,
  };
}
module.exports.getAvgMetrics = getAvgMetrics;
