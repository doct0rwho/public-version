const db = require("../db");

async function getInfoContent(req, res) {
  try {
    //тотал класруми та їх зміна
    const getTotalClassrooms = await db("metaenga_classroom")
      .count("id as totalClassrooms")
      .first();
    console.log("getTotalClassrooms", getTotalClassrooms);
    const totalClassrooms =
      parseInt(getTotalClassrooms.totalClassrooms, 10) || 0;
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

    const addedClassrooms = await db("metaenga_classroom_logs")
      .count("classroom_id as count")
      .where("status", "=", 1)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const deletedClassrooms = await db("metaenga_classroom_logs")
      .count("classroom_id as count")
      .where("status", "=", 0)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const addedCount = parseInt(addedClassrooms.count, 10) || 0;
    const deletedCount = parseInt(deletedClassrooms.count, 10) || 0;
    const totalClassroomsLastMonth =
      totalClassrooms + deletedCount - addedCount;

    console.log("добавлено за последние 30 дней", addedCount);
    console.log("удалено за последние 30 дней", deletedCount);

    console.log("было 30 дней назад", totalClassroomsLastMonth);
    let percentChangeClassrooms = 0;
    if (totalClassroomsLastMonth == 0) {
      percentChangeClassrooms = null;
    } else {
      percentChangeClassrooms = parseInt(
        (
          ((totalClassrooms - totalClassroomsLastMonth) /
            totalClassroomsLastMonth) *
          100
        ).toFixed(0)
      );
    }
    if (percentChangeClassrooms > 999) {
      percentChangeClassrooms = 999;
    } else if (percentChangeClassrooms < -999) {
      percentChangeClassrooms = -999;
    }

    //тотал тренінгів та їх зміна
    const getTotalTrainings = await db("trainings")
      .count("id as totalTrainings")
      .first();

    const totalTrainings = parseInt(getTotalTrainings.totalTrainings, 10) || 0;

    const addedTrainings = await db("metaenga_training_logs")
      .count("companyId as count")
      .where("status", "=", 1)
      .whereBetween("time", [thirtyDaysAgo, currentDate])
      .first();

    const deletedTrainings = await db("metaenga_training_logs")
      .count("companyId as count")
      .where("status", "=", 0)
      .whereBetween("time", [thirtyDaysAgo, currentDate])
      .first();

    const addedTrainingsCount = parseInt(addedTrainings.count, 10) || 0;
    const deletedTrainingsCount = parseInt(deletedTrainings.count, 10) || 0;
    const totalTrainingsLastMonth =
      totalTrainings + deletedTrainingsCount - addedTrainingsCount;

    console.log(
      "добавлено тренингов за последние 30 дней",
      addedTrainingsCount
    );
    console.log(
      "удалено тренингов за последние 30 дней",
      deletedTrainingsCount
    );
    console.log("было тренингов 30 дней назад", totalTrainingsLastMonth);
    let percentChangeTrainings;
    if (totalTrainingsLastMonth == 0) {
      percentChangeTrainings = null;
    } else {
      percentChangeTrainings = parseInt(
        (
          ((totalTrainings - totalTrainingsLastMonth) /
            totalTrainingsLastMonth) *
          100
        ).toFixed(0)
      );
    }
    if (percentChangeTrainings > 999) {
      percentChangeTrainings = 999;
    } else if (percentChangeTrainings < -999) {
      percentChangeTrainings = -999;
    }

    //фрі пейд ексклюзів

    // Отримати безкоштовні тренінги
    const getFreeTrainings = await db("metaenga_free").pluck("id");

    // const getFreeTrainings = await db("metaenga_free")
    //   .count("id as count")
    //   .first();
    const freeTrainings = getFreeTrainings.length || 0;

    console.log("getFreeTrainings", getFreeTrainings);
    console.log("freeTrainings", freeTrainings);

    // const getPayedTrainings = await db("metaenga_standart")
    //   .count("id as count")
    //   .first();

    // Отримати платні тренінги без урахування безкоштовних
    const getPayedTrainings = await db("metaenga_standart")
      .whereNotIn("id", getFreeTrainings)
      .pluck("id");

    const payedTrainings = getPayedTrainings.length || 0;

    // const distinctTrainings = await db("metaenga_training_company")
    //   .distinct("training")
    //   .where("plan", "exclusive");

    // const exclusiveTrainingsCount = distinctTrainings
    //   ? distinctTrainings.length || 0
    //   : 0;

    const exclusiveTrainings = await db("metaenga_training_company")
      .whereNotIn("training", getFreeTrainings)
      .whereNotIn("training", getPayedTrainings)
      .distinct("training")
      .pluck("training");

    const exclusiveTrainingsCount = exclusiveTrainings.length || 0;

    //тотал відео, метаенга, орг
    const getTotalVideosOrg = await db("metaenga_videos")
      .count("id as totalVideos")
      .first();

    const totalVideosOrg = parseInt(getTotalVideosOrg.totalVideos, 10) || 0;

    const getTotalVideosMetaenga = await db("metaenga_videos_default")
      .count("id as totalVideos")
      .first();

    const totalVideosMetaenga =
      parseInt(getTotalVideosMetaenga.totalVideos, 10) || 0;
    const totalVideos = totalVideosOrg + totalVideosMetaenga;

    //відсоток зміни відео
    const addedVideos = await db("metaenga_video_logs")
      .count("company_id as count")
      .where("status", "=", 1)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const deletedVideos = await db("metaenga_video_logs")
      .count("company_id as count")
      .where("status", "=", 0)
      .whereBetween("date", [thirtyDaysAgo, currentDate])
      .first();

    const addedVideosCount = parseInt(addedVideos.count, 10) || 0;
    const deletedVideosCount = parseInt(deletedVideos.count, 10) || 0;
    const totalVideosLastMonth =
      totalVideos + deletedVideosCount - addedVideosCount;
    let percentChangeVideos;
    if (totalVideosLastMonth == 0) {
      percentChangeVideos = null;
    } else {
      percentChangeVideos = parseInt(
        (
          ((totalVideos - totalVideosLastMonth) / totalVideosLastMonth) *
          100
        ).toFixed(0)
      );
    }
    if (percentChangeVideos > 999) {
      percentChangeVideos = 999;
    } else if (percentChangeVideos < -999) {
      percentChangeVideos = -999;
    }

    //кількість завантажених тренінгів

    const totalDownloadsTraining = await db("metaenga_analytics")
      .whereNotNull("downloadTrainingCount")
      .sum("downloadTrainingCount as totalDownloads")
      .first();

    const vrTrainingDownloadsTotal =
      parseInt(totalDownloadsTraining.totalDownloads, 10) || 0;

    //кількість завантажених відео з вр
    const totalDownloadsVideoVr = await db("metaenga_analytics")
      .whereNotNull("downloadCountVr")
      .sum("downloadCountVr as totalDownloads")
      .first();

    const videoVrDownloadsTotal =
      parseInt(totalDownloadsVideoVr.totalDownloads, 10) || 0;

    //кількість завантажених відео з веб
    const totalDownloadsVideoWeb = await db("metaenga_analytics")
      .whereNotNull("downloadCountWeb")
      .sum("downloadCountWeb as totalDownloads")
      .first();

    const videoWebDownloadsTotal =
      parseInt(totalDownloadsVideoWeb.totalDownloads, 10) || 0;

    //загальна кількість скачувань відео

    const getTotalDownloadsVideo = await db("metaenga_analytics")
      .whereNotNull("downloadCount")
      .sum("downloadCount as totalDownloads")
      .first();
    const totalDownloadsVideo =
      parseInt(getTotalDownloadsVideo.totalDownloads, 10) || 0;

    //Video Uploads Total
    const getVideoUploadsTotal = await db("metaenga_analytics")
      .whereNotNull("videoUploads")
      .sum("videoUploads as totalVideoUploads")
      .first();

    const videoUploadsTotal =
      parseInt(getVideoUploadsTotal.totalVideoUploads, 10) || 0;

    const data = {
      vRTrainingTotal: totalTrainings + 1,
      percentChangeTrainings: percentChangeTrainings,
      vRTrainingFree: freeTrainings + 1,
      vRTrainingPaid: payedTrainings,
      vRTrainingExclusive: exclusiveTrainingsCount,
      videoTotal: totalVideos,
      percentChangeVideos: percentChangeVideos,
      videoMetaenga: totalVideosMetaenga,
      videoOrg: totalVideosOrg,
      classrooms: totalClassrooms,
      percentChangeClassrooms: percentChangeClassrooms,
      vrTrainingDownloadsTotal: vrTrainingDownloadsTotal,
      videoVrDownloadsTotal: videoVrDownloadsTotal,
      videoWebDownloadsTotal: videoWebDownloadsTotal,
      totalDownloadsVideo: totalDownloadsVideo,
      videoUploadsTotal: videoUploadsTotal,
    };

    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: "error",
      data: error,
    });
  }
}
module.exports.getInfoContent = getInfoContent;
