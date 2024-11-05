const db = require("../db");
async function getCountOfDevicesByPlatform(req, res) {
  try {
    const getPico = await db("VR")
      .count("id as totalPico")
      .where("platform", "pico")
      .first();
    const getWin = await db("VR")
      .count("id as totalWin")
      .where("platform", "windows")
      .first();
    const getMeta = await db("VR")
      .count("id as totalMeta")
      .where("platform", "meta")
      .first();
    const getTotal = await db("VR")
      .whereNotNull("platform")
      .andWhere("platform", "!=", " ")
      .count("id as total")
      .first();

    const totalDevice = getTotal.total || 0;

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

    const addedDevicesLastMonthResult = await db("metaenga_device_logs")
      .count("device_id as count")
      .where("status", "=", 1)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const deletedDevicesLastMonthResult = await db("metaenga_device_logs")
      .count("device_id as count")
      .where("status", "=", 0)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const addedCount = parseInt(addedDevicesLastMonthResult.count, 10) || 0;
    const deletedCount = parseInt(deletedDevicesLastMonthResult.count, 10) || 0;

    console.log("добавлено за последние 30 дней", addedCount);
    console.log("удалено за последние 30 дней", deletedCount);

    const totalDevicesLastMonth = totalDevice + deletedCount - addedCount;

    console.log("было 30 дней назад", totalDevicesLastMonth);
    let percentChange = 0;
    if (totalDevicesLastMonth == 0) {
      percentChange = null;
    } else {
      percentChange = parseInt(
        (
          ((totalDevice - totalDevicesLastMonth) / totalDevicesLastMonth) *
          100
        ).toFixed(0)
      );
    }
    if (percentChange > 999) {
      percentChange = 999;
    } else if (percentChange < -999) {
      percentChange = -999;
    }

    const data = {
      pico: getPico.totalPico || 0,
      windows: getWin.totalWin || 0,
      meta: getMeta.totalMeta || 0,
      total: getTotal.total || 0,
      percentChange: percentChange,
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
module.exports.getCountOfDevicesByPlatform = getCountOfDevicesByPlatform;
