const db = require("../db");
async function organizationsTotal(req, res) {
  try {
    const getTotalCompany = await db("company").count("id as total").first();
    const getTotalActive = await db("company")
      .count("id as total")
      .where(function () {
        this.where("confirmed_email", 1).orWhere("google", 1);
      })
      .first();
    const getTotaNotVerified = await db("company")
      .count("id as notVerified")
      .where("confirmed_email", 0)
      .andWhere("google", 0)
      .first();

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

    const addedCompanysLastMonthResult = await db("metaenga_company_logs")
      .count("company_id as count")
      .where("status", "=", 1)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const deletedCompanysLastMonthResult = await db("metaenga_company_logs")
      .count("company_id as count")
      .where("status", "=", 0)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const addedActiveCompanysLastMonthResult = await db("metaenga_company_logs")
      .count("company_id as count")
      .where("status", "=", 1)
      .andWhere(function () {
        this.where("confirmed_email", "=", 1).orWhere("google", "=", 1);
      })
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const deletedActiveCompanysLastMonthResult = await db(
      "metaenga_company_logs"
    )
      .count("company_id as count")
      .where("status", "=", 1)
      .andWhere(function () {
        this.where("confirmed_email", "=", 1).orWhere("google", "=", 1);
      })
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const addedNotVerifiedCompanysLastMonthResult = await db(
      "metaenga_company_logs"
    )
      .count("company_id as count")
      .where("status", "=", 1)
      .andWhere(function () {
        this.where("confirmed_email", "=", 0).andWhere("google", "=", 0);
      })
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const deletedNotVerifiedCompanysLastMonthResult = await db(
      "metaenga_company_logs"
    )
      .count("company_id as count")
      .where("status", "=", 0)
      .andWhere(function () {
        this.where("confirmed_email", "=", 0).andWhere("google", "=", 0);
      })
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const addedCount = parseInt(addedCompanysLastMonthResult.count, 10) || 0;
    const deletedCount =
      parseInt(deletedCompanysLastMonthResult.count, 10) || 0;
    const addedActiveCount =
      parseInt(addedActiveCompanysLastMonthResult.count, 10) || 0;
    const deletedActiveCount =
      parseInt(deletedActiveCompanysLastMonthResult.count, 10) || 0;
    const addedNotVerifiedCount =
      parseInt(addedNotVerifiedCompanysLastMonthResult.count, 10) || 0;
    const deletedNotVerifiedCount =
      parseInt(deletedNotVerifiedCompanysLastMonthResult.count, 10) || 0;

    console.log("добавлено за последние 30 дней", addedCount);
    console.log("удалено за последние 30 дней", deletedCount);
    console.log("добавлено активных за последние 30 дней", addedActiveCount);
    console.log("удалено активных за последние 30 дней", deletedActiveCount);
    console.log(
      "добавлено неактивных за последние 30 дней",
      addedNotVerifiedCount
    );
    console.log(
      "удалено неактивных за последние 30 дней",
      deletedNotVerifiedCount
    );
    const totalCompany = getTotalCompany.total || 0;
    const totalActiveCompany = getTotalActive.total || 0;
    const totalNotVerifiedCompany = getTotaNotVerified.notVerified || 0;

    const totalCompanyLastMonth = totalCompany + deletedCount - addedCount;
    const totalActiveCompanyLastMonth =
      totalActiveCompany + deletedActiveCount - addedActiveCount;
    const totalNotVerifiedCompanyLastMonth =
      totalNotVerifiedCompany + deletedNotVerifiedCount - addedNotVerifiedCount;

    console.log("было 30 дней назад", totalCompanyLastMonth);
    console.log("было активных 30 дней назад", totalActiveCompanyLastMonth);
    console.log(
      "было неактивных 30 дней назад",
      totalNotVerifiedCompanyLastMonth
    );

    let percentChange = 0;
    let activePercentChange = 0;
    let notVerifiedPercentChange = 0;

    if (totalCompanyLastMonth == 0) {
      percentChange = null;
    } else {
      percentChange = parseInt(
        (
          ((totalCompany - totalCompanyLastMonth) / totalCompanyLastMonth) *
          100
        ).toFixed(0)
      );
    }
    if (percentChange > 999) {
      percentChange = 999;
    } else if (percentChange < -999) {
      percentChange = -999;
    }

    if (totalActiveCompanyLastMonth == 0) {
      activePercentChange = null;
    } else {
      activePercentChange = parseInt(
        (
          ((totalActiveCompany - totalActiveCompanyLastMonth) /
            totalActiveCompanyLastMonth) *
          100
        ).toFixed(0)
      );
    }
    if (activePercentChange > 999) {
      activePercentChange = 999;
    } else if (activePercentChange < -999) {
      activePercentChange = -999;
    }

    if (totalNotVerifiedCompanyLastMonth == 0) {
      notVerifiedPercentChange = null;
    } else {
      notVerifiedPercentChange = parseInt(
        (
          ((totalNotVerifiedCompany - totalNotVerifiedCompanyLastMonth) /
            totalNotVerifiedCompanyLastMonth) *
          100
        ).toFixed(0)
      );
    }
    if (notVerifiedPercentChange > 999) {
      notVerifiedPercentChange = 999;
    } else if (notVerifiedPercentChange < -999) {
      notVerifiedPercentChange = -999;
    }

    const getFreeCompany = await db("company")
      .count("id as total")
      .where("plan", "Free")
      .first();

    const getPaidCompany = await db("company")
      .count("id as total")
      .where(function () {
        this.where("plan", "Standart").orWhere("plan", "Premium");
      })
      .first();

    const getInvoceCompany = await db("company")
      .count("id as total")
      .where("invoice", 1)
      .first();

    const getVrRegistrations = await db("company")
      .count("id as total")
      .where("typeRegistration", "Vr")
      .first();

    const getWebRegistrations = await db("company")
      .count("id as total")
      .where("typeRegistration", "Web")
      .first();

    const vrRegistrations = parseInt(getVrRegistrations.total, 10) || 0;
    const webRegistrations = parseInt(getWebRegistrations.total, 10) || 0;

    const data = {
      total: totalCompany,
      percentChangeCompany: percentChange,
      free: getFreeCompany.total || 0,
      paid: getPaidCompany.total || 0,
      invoice: getInvoceCompany.total || 0,
      active: totalActiveCompany,
      activePercentChange: activePercentChange,
      notVerified: totalNotVerifiedCompany,
      notVerifiedPercentChange: notVerifiedPercentChange,
      monthly: 0,
      annual: 0,
      vr: vrRegistrations,
      web: webRegistrations,
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
module.exports.organizationsTotal = organizationsTotal;
