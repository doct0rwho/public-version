const db = require("../db");

async function getInfoSessions(req, res) {
  try {
    //загальна кількість сесій
    const getAppSessionsTotal = await db("metaenga_vr_app_session")
      .count("appSessionId as totalSessions")
      .first();

    const getWebSessionsTotal = await db("metaenga_vr_web_session")
      .count("webSessionId as totalSessions")
      .first();

    const appSessionsTotal =
      parseInt(getAppSessionsTotal.totalSessions, 10) || 0;
    const webSessionsTotal =
      parseInt(getWebSessionsTotal.totalSessions, 10) || 0;
    const sessionTotal = appSessionsTotal + webSessionsTotal;

    //прирост сесій
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
      .count("appSessionId as totalSessions")
      .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
      .first();

    const getAppSessionsTotalSixtyDaysAgo = await db("metaenga_vr_app_session")
      .count("appSessionId as totalSessions")
      .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
      .first();

    const getWebSessionsTotalThirtyDaysAgo = await db("metaenga_vr_web_session")
      .count("webSessionId as totalSessions")
      .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
      .first();

    const getWebSessionsTotalSixtyDaysAgo = await db("metaenga_vr_web_session")
      .count("webSessionId as totalSessions")
      .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
      .first();

    const appSessionsTotalThirtyDaysAgo =
      parseInt(getAppSessionsTotalThirtyDaysAgo.totalSessions, 10) || 0;
    const appSessionsTotalSixtyDaysAgo =
      parseInt(getAppSessionsTotalSixtyDaysAgo.totalSessions, 10) || 0;
    const webSessionsTotalThirtyDaysAgo =
      parseInt(getWebSessionsTotalThirtyDaysAgo.totalSessions, 10) || 0;
    const webSessionsTotalSixtyDaysAgo =
      parseInt(getWebSessionsTotalSixtyDaysAgo.totalSessions, 10) || 0;
    const sessionTotalThirtyDaysAgo =
      appSessionsTotalThirtyDaysAgo + webSessionsTotalThirtyDaysAgo;
    const sessionTotalSixtyDaysAgo =
      appSessionsTotalSixtyDaysAgo + webSessionsTotalSixtyDaysAgo;
    console.log("зараз", sessionTotal);
    console.log("було за останні 30 днів", sessionTotalThirtyDaysAgo);
    console.log("було за останні 60 днів", sessionTotalSixtyDaysAgo);
    let percentChangeSessionTotal = 0;
    if (sessionTotalSixtyDaysAgo == 0) {
      percentChangeSessionTotal = null;
    } else {
      percentChangeSessionTotal = parseInt(
        (
          ((sessionTotalThirtyDaysAgo - sessionTotalSixtyDaysAgo) /
            sessionTotalSixtyDaysAgo) *
          100
        ).toFixed(0)
      );
    }

    if (percentChangeSessionTotal > 999) {
      percentChangeSessionTotal = 999;
    } else if (percentChangeSessionTotal < -999) {
      percentChangeSessionTotal = -999;
    }

    let percentChangeSessionVRTotal = 0;
    if (appSessionsTotalSixtyDaysAgo == 0) {
      percentChangeSessionVRTotal = null;
    } else {
      percentChangeSessionVRTotal = parseInt(
        (
          ((appSessionsTotalThirtyDaysAgo - appSessionsTotalSixtyDaysAgo) /
            appSessionsTotalSixtyDaysAgo) *
          100
        ).toFixed(0)
      );
    }
    if (percentChangeSessionVRTotal > 999) {
      percentChangeSessionVRTotal = 999;
    } else if (percentChangeSessionVRTotal < -999) {
      percentChangeSessionVRTotal = -999;
    }

    console.log("appSessionsTotalThirtyDaysAgo", appSessionsTotalThirtyDaysAgo);
    console.log("appSessionsTotalSixtyDaysAgo", appSessionsTotalSixtyDaysAgo);

    //сесії тренінги
    const getSessionsTrainingTotal = await db("metaenga_vr_training_session")
      .count("trainingSessionId as totalSessions")
      .first();
    const sessionTrainingTotal =
      parseInt(getSessionsTrainingTotal.totalSessions, 10) || 0;

    //зміна сесій тренінгів
    const getSessionsTrainingTotalThirtyDaysAgo = await db(
      "metaenga_vr_training_session"
    )
      .count("trainingSessionId as totalSessions")
      .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
      .first();

    const getSessionsTrainingTotalSixtyDaysAgo = await db(
      "metaenga_vr_training_session"
    )
      .count("trainingSessionId as totalSessions")
      .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
      .first();

    const sessionTrainingTotalThirtyDaysAgo =
      parseInt(getSessionsTrainingTotalThirtyDaysAgo.totalSessions, 10) || 0;
    const sessionTrainingTotalSixtyDaysAgo =
      parseInt(getSessionsTrainingTotalSixtyDaysAgo.totalSessions, 10) || 0;
    let percentChangeSessionTrainingTotal = 0;
    if (sessionTrainingTotalSixtyDaysAgo == 0) {
      percentChangeSessionTrainingTotal = null;
    } else {
      percentChangeSessionTrainingTotal = parseInt(
        (
          ((sessionTrainingTotalThirtyDaysAgo -
            sessionTrainingTotalSixtyDaysAgo) /
            sessionTrainingTotalSixtyDaysAgo) *
          100
        ).toFixed(0)
      );
    }
    if (percentChangeSessionTrainingTotal > 999) {
      percentChangeSessionTrainingTotal = 999;
    } else if (percentChangeSessionTrainingTotal < -999) {
      percentChangeSessionTrainingTotal = -999;
    }

    //незакінчені вр сесії
    const getUnfinishedVrSessionsTotal = await db("metaenga_vr_app_session")
      .count("appSessionId as totalSessions")
      .where("duration", " ")
      .orWhere("duration", "NULL")
      .first();

    const unfinishedVrSessionsTotal =
      parseInt(getUnfinishedVrSessionsTotal.totalSessions, 10) || 0;

    //сесії відео
    const getSessionVideoTotal = await db("metaenga_video_session")
      .count("videoSessionId as totalSessions")
      .first();

    const sessionVideoTotal =
      parseInt(getSessionVideoTotal.totalSessions, 10) || 0;

    const getSessionVideoVRTotal = await db("metaenga_video_session")
      .count("videoSessionId as totalSessions")
      .where("webOrVr", "0")
      .first();

    const sessionVideoVRTotal =
      parseInt(getSessionVideoVRTotal.totalSessions, 10) || 0;

    const getSessionVideoWebTotal = await db("metaenga_video_session")
      .count("videoSessionId as totalSessions")
      .where("webOrVr", "1")
      .first();

    const sessionVideoWebTotal =
      parseInt(getSessionVideoWebTotal.totalSessions, 10) || 0;

    //зміна сесій відео
    const getSessionVideoTotalThirtyDaysAgo = await db("metaenga_video_session")
      .count("videoSessionId as totalSessions")
      .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
      .first();

    const getSessionVideoTotalSixtyDaysAgo = await db("metaenga_video_session")
      .count("videoSessionId as totalSessions")
      .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
      .first();

    const sessionVideoTotalThirtyDaysAgo =
      parseInt(getSessionVideoTotalThirtyDaysAgo.totalSessions, 10) || 0;
    const sessionVideoTotalSixtyDaysAgo =
      parseInt(getSessionVideoTotalSixtyDaysAgo.totalSessions, 10) || 0;
    let percentChangeVideoSessionTotal = 0;
    if (sessionVideoTotalSixtyDaysAgo == 0) {
      percentChangeVideoSessionTotal = null;
    } else {
      percentChangeVideoSessionTotal = parseInt(
        (
          ((sessionVideoTotalThirtyDaysAgo - sessionVideoTotalSixtyDaysAgo) /
            sessionVideoTotalSixtyDaysAgo) *
          100
        ).toFixed(0)
      );
    }
    if (percentChangeVideoSessionTotal > 999) {
      percentChangeVideoSessionTotal = 999;
    } else if (percentChangeVideoSessionTotal < -999) {
      percentChangeVideoSessionTotal = -999;
    }

    const data = {
      sessionTotal: sessionTotal,
      percentChangeSessionTotal: percentChangeSessionTotal,
      sessionVRTotal: appSessionsTotal,
      percentChangeSessionVRTotal: percentChangeSessionVRTotal,
      sessionWebTotal: webSessionsTotal,
      sessionTrainingTotal: sessionTrainingTotal,
      percentChangeSessionTrainingTotal: percentChangeSessionTrainingTotal,
      getUnfinishedVrSessionsTotal: unfinishedVrSessionsTotal,
      sessionVideoTotal: sessionVideoTotal,
      sessionVideoVR: sessionVideoVRTotal,
      sessionVideoWeb: sessionVideoWebTotal,
      percentChangeVideoSessionTotal: percentChangeVideoSessionTotal,
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

module.exports.getInfoSessions = getInfoSessions;
