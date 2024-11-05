let uuid = require("uuid");
const dotenv = require("dotenv");
const db = require("../db");
const moment = require("moment");
const con = require("../db");
dotenv.config();

class Stats {
  async webStatsAddLib(req, res) {
    try {
      let { videoId, userId, time } = req.body;
      const userData = await db("userlink").first("*").where({
        user: userId,
      });
      const now = new Date();
      const options = {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const londonDate = now.toLocaleDateString("en-GB", options);
      let company = userData.company;
      let videoDB = `video-${company}`;
      await db("metaenga_analytics")
        .insert({
          date: londonDate,
          timeCount: time,
          timeCountWeb: time,
          watchedCount: 1,
          watchedCountWeb: 1,
        })
        .onConflict("date")
        .merge({
          timeCount: db.raw(`timeCount + ${time}`),
          timeCountWeb: db.raw(`timeCountWeb + ${time}`),
          watchedCount: db.raw("watchedCount + 1"),
          watchedCountWeb: db.raw("watchedCountWeb + 1"),
        });

      await db("metaenga_videos")
        .where({
          id: videoId,
        })
        .increment("watchedWeb", 1);

      await db("metaenga_watched").insert({
        videoId: videoId,
        userId: userId,
        Web: true,
        Vr: false,
        time: time,
      });
      await db("metaenga_users")
        .where({
          id: userId,
        })
        .increment("watchedWEB", 1)
        .increment("activityWEB", time);
    } catch (err) {
      console.log(err);
      res.status(500).json({ status: 500, message: "Internal server error" });
    }
  }
  async vrStatsAddLib(req, res) {
    try {
      let { videoId, userId, time } = req.body;
      const userData = await db("userlink").first("*").where({
        user: userId,
      });
      const now = new Date();
      const options = {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const londonDate = now.toLocaleDateString("en-US", options);
      let company = userData.company;
      let videoDB = `video-${company}`;
      const row = await db("metaenga_analytics")
        .select("*")
        .where({ date: londonDate })
        .first();

      if (!row) {
        await db("metaenga_analytics").insert({
          date: londonDate,
          timeCount: time,
          timeCountVr: time,
          watchedCount: 1,
          watchedCountVr: 1,
        });
      } else {
        await db("metaenga_analytics")
          .where({ date: londonDate })
          .increment("timeCount", time)
          .increment("timeCountVr", time)
          .increment("watchedCount", 1)
          .increment("watchedCountVr", 1)
          .update({
            timeCount: db.raw("COALESCE(timeCount, 0) + ?", [time]),
            timeCountVr: db.raw("COALESCE(timeCountVr, 0) + ?", [time]),
            watchedCount: db.raw("COALESCE(watchedCount, 0) + 1"),
            watchedCountVr: db.raw("COALESCE(watchedCountVr, 0) + 1"),
          });
      }

      await db("metaenga_videos")
        .where({
          id: videoId,
        })
        .increment("watchedVr", 1)
        .update({
          watchedVr: db.raw("COALESCE(watchedVr, 0) + 1"),
        });

      await db("metaenga_watched").insert({
        videoId: videoId,
        userId: userId,
        Web: false,
        Vr: true,
        time: time,
      });
      // await db('metaenga_users').where({
      //     id: userId
      // })
      //     .increment('watchedVR', 1)
      //     .increment('activityVR', time)

      return res.status(200).json({ status: 200, message: "Success" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ status: 500, message: "Internal server error" });
    }
  }
  async webDownloadStat(req, res) {
    try {
      let { videoId } = req.body;
      const now = new Date();
      const options = {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const londonDate = now.toLocaleDateString("en-US", options);
      console.log("londonDate", londonDate);
      const row = await db("metaenga_analytics")
        .select("*")
        .where({ date: londonDate })
        .first();
      console.log("row", row);
      if (row) {
        if (row.downloadCountWeb === null && row.downloadCount === null) {
          await db("metaenga_analytics")
            .update({
              downloadCount: 1,
              downloadCountWeb: 1,
            })
            .where({
              date: londonDate,
            });
        } else {
          await db("metaenga_analytics")
            .where({
              date: londonDate,
            })
            .increment("downloadCount", 1)
            .increment("downloadCountWeb", 1);
        }
      } else {
        await db("metaenga_analytics").insert({
          date: londonDate,
          downloadCount: 1,
          downloadCountWeb: 1,
        });
      }

      return res.status(200).json({ status: 200, message: "Success" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: 500, message: "Internal server error" });
    }
  }
  async vrDownloadStat(req, res) {
    try {
      let { videoId } = req.body;
      const now = new Date();
      const options = {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const londonDate = now.toLocaleDateString("en-US", options);
      console.log("londonDate", londonDate);
      const row = await db("metaenga_analytics")
        .select("*")
        .where({ date: londonDate })
        .first();
      console.log("row", row);
      if (row) {
        if (row.downloadCountVr === null && row.downloadCount === null) {
          await db("metaenga_analytics")
            .update({
              downloadCount: 1,
              downloadCountVr: 1,
            })
            .where({
              date: londonDate,
            });
        } else {
          await db("metaenga_analytics")
            .where({
              date: londonDate,
            })
            .increment("downloadCount", 1)
            .increment("downloadCountVr", 1);
        }
      } else {
        await db("metaenga_analytics").insert({
          date: londonDate,
          downloadCount: 1,
          downloadCountVr: 1,
        });
      }

      return res.status(200).json({ status: 200, message: "Success" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: 500, message: "Internal server error" });
    }
  }

  async vrTrainingsDownloadStat(req, res) {
    try {
      let { trainingId } = req.body;
      const now = new Date();
      const options = {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const londonDate = now.toLocaleDateString("en-US", options);
      console.log("londonDate", londonDate);
      const row = await db("metaenga_analytics")
        .select("*")
        .where({ date: londonDate })
        .first();
      console.log("row", row);
      if (row) {
        if (row.downloadTrainingCount === null) {
          await db("metaenga_analytics")
            .update({
              downloadTrainingCount: 1,
            })
            .where({
              date: londonDate,
            });
        } else {
          await db("metaenga_analytics")
            .where({
              date: londonDate,
            })
            .increment("downloadTrainingCount", 1);
        }
      } else {
        await db("metaenga_analytics").insert({
          date: londonDate,
          downloadTrainingCount: 1,
        });
      }

      return res.status(200).json({ status: 200, message: "Success" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: 500, message: "Internal server error" });
    }
  }

  async vrAppSessionStart(req, res) {
    try {
      const { deviceId, userId } = req.body;

      const check = await db("metaenga_vr_app_session").first("*").where({
        deviceId: deviceId,
        status: 1,
      });
      console.log(check);
      if (check) {
        const time = new Date()
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");

        const timeStart = await db("metaenga_vr_app_session")
          .pluck("timeStart")
          .where({
            deviceId: deviceId,
            status: 1,
          });
        console.log(time);
        console.log(timeStart);
        const duration = Math.floor(
          new Date(time).getTime() - new Date(timeStart).getTime()
        );
        console.log(duration);
        await db("metaenga_vr_app_session")
          .update({
            status: 0,
            timeEnd: time,
            duration: duration,
          })
          .where({
            deviceId: deviceId,
            status: 1,
          });
      }
      const user = await db("userlink").first("*").where({
        user: userId,
      });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      let hash = uuid.v4();

      const appSession = {
        companyId: user.company,
        deviceId: deviceId,
        userId: userId,
        timeStart: time,
        appSessionId: hash,
        status: 1,
      };
      await db("metaenga_vr_app_session").insert(appSession);

      return res.status(200).json({
        data: appSession.appSessionId,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async endVrAppSessionDelayed(req, res) {
    try {
      const { deviceId, userId, timeDuration } = req.body;

      const check = await db("metaenga_vr_app_session").first("*").where({
        deviceId: deviceId,
        status: 1,
      });

      if (!check) {
        return res.status(404).json({
          status: "no session",
        });
      }

      const timeStamp = await db("metaenga_vr_app_session")
        .select("timeStart")
        .where("deviceId", deviceId)
        .orderBy("timeStart", "desc")
        .limit(1)
        .first();

      console.log("timeStamp ", timeStamp.timeStart);
      let dateString = timeStamp.timeStart;
      const dateObject = new Date(
        Date.UTC(
          dateString.slice(0, 4), // Year
          dateString.slice(5, 7) - 1, // Month (0-based)
          dateString.slice(8, 10), // Day
          dateString.slice(11, 13), // Hour
          dateString.slice(14, 16), // Minute
          dateString.slice(17, 19) // Second
        )
      );
      console.log(dateObject);
      const timeInDa = new Date(dateObject.getTime() + timeDuration * 1000);

      const time = timeInDa.toISOString().replace(/T/, " ").replace(/\..+/, "");
      console.log(time);

      const duration = Math.floor(
        new Date(time).getTime() - new Date(timeStamp.timeStart).getTime()
      );

      await db("metaenga_vr_app_session")
        .update({
          duration: duration,
          timeEnd: time,
          status: 0,
        })
        .where({
          deviceId: deviceId,
          userId: userId,
          status: 1,
        });
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async vrAppSessionEnd(req, res) {
    try {
      const { deviceId, userId } = req.body;

      const check = await db("metaenga_vr_app_session").first("*").where({
        deviceId: deviceId,
        status: 1,
      });

      if (!check) {
        return res.status(404).json({
          status: "no session",
        });
      }

      const timeStart = await db("metaenga_vr_app_session")
        .pluck("timeStart")
        .where({
          deviceId: deviceId,
          status: 1,
        });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      const duration = Math.floor(
        new Date(time).getTime() - new Date(timeStart).getTime()
      );

      await db("metaenga_vr_app_session")
        .update({
          duration: duration,
          timeEnd: time,
          status: 0,
        })
        .where({
          deviceId: deviceId,
          userId: userId,
          status: 1,
        });
      await db("company").where({ id: check.companyId }).update({
        latestDate: time,
      });
      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async vrTrainingSessionStart(req, res) {
    try {
      const { trainingId, userId, appSessionId } = req.body;

      if (!trainingId) {
        throw new Error("Training ID is empty");
      }
      const check = await db("metaenga_vr_training_session").first("*").where({
        appSessionId: appSessionId,
        trainingId: trainingId,
        status: 1,
      });

      if (check) {
        const lastRecord = await db("metaenga_vr_training_action")
          .orderBy("time", "desc")
          .select("time")
          .first()
          .where({
            trainingSessionId: check.trainingSessionId,
          });

        if (lastRecord) {
          const timeA = lastRecord.time; // Extract the time portion
          console.log("Time from the last record:", timeA);

          const timeStart = await db("metaenga_vr_training_session")
            .pluck("timeStart")
            .where({
              appSessionId: appSessionId,
              trainingId: trainingId,
              status: 1,
            });
          console.log("Time from the last record:", timeStart);
          const duration = Math.floor(
            new Date(timeA).getTime() - new Date(timeStart).getTime()
          );

          await db("metaenga_vr_training_session")
            .update({
              status: 0,
              timeEnd: lastRecord.time,
              duration: duration,
            })
            .where({
              appSessionId: appSessionId,
              trainingId: trainingId,
              status: 1,
            });
        }
      }

      const user = await db("userlink").first("*").where({
        user: userId,
      });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      let hash = uuid.v4();

      const trainingSession = {
        companyId: user.company,
        trainingId: trainingId,
        userId: userId,
        appSessionId: appSessionId,
        timeStart: time,
        trainingSessionId: hash,
        status: 1,
      };

      await db("metaenga_vr_training_session").insert(trainingSession);

      return res.status(200).json({
        data: trainingSession.trainingSessionId,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async videoSessionStart(req, res) {
    try {
      const { videoId, userId, webOrVr } = req.body;

      if (!videoId) {
        throw new Error("Video ID is empty");
      }

      const user = await db("userlink").first("*").where({
        user: userId,
      });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      let hash = uuid.v4();

      const videoSession = {
        companyId: user.company,
        videoId: videoId,
        userId: userId,
        timeStart: time,
        videoSessionId: hash,
        webOrVr: webOrVr,
        status: 1,
      };

      await db("metaenga_video_session").insert(videoSession);

      return res.status(200).json({
        data: videoSession.videoSessionId,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async videoSessionEnd(req, res) {
    try {
      const { videoSessionId, userId, watchedVideo } = req.body;

      const check = await db("metaenga_video_session").first("*").where({
        videoSessionId: videoSessionId,
        status: 1,
      });

      if (!check) {
        return res.status(404).json({
          status: "no session",
        });
      }

      const timeStart = await db("metaenga_video_session")
        .pluck("timeStart")
        .where({
          videoSessionId: videoSessionId,
          status: 1,
        });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      const duration = Math.floor(
        new Date(time).getTime() - new Date(timeStart).getTime()
      );

      await db("metaenga_video_session")
        .update({
          duration: duration,
          timeEnd: time,
          status: 0,
          watchedVideo: watchedVideo,
        })
        .where({
          videoSessionId: videoSessionId,
          userId: userId,
          status: 1,
        });

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async vrTrainingSessionEnd(req, res) {
    try {
      const { trainingSessionId, userId } = req.body;

      const check = await db("metaenga_vr_training_session").first("*").where({
        trainingSessionId: trainingSessionId,
        status: 1,
      });

      if (check) {
        const lastRecord = await db("metaenga_vr_training_action")
          .orderBy("time", "desc")
          .select("time")
          .first()
          .where({
            trainingSessionId: check.trainingSessionId,
          });
        if (lastRecord) {
          const timeStart = await db("metaenga_vr_training_session")
            .pluck("timeStart")
            .where({
              trainingSessionId: trainingSessionId,
              status: 1,
            });

          const duration = Math.floor(
            new Date(lastRecord.time).getTime() -
              new Date(check.timeStart).getTime()
          );

          await db("metaenga_vr_training_session")
            .update({
              duration: duration,
              timeEnd: lastRecord.time,
              status: 0,
            })
            .where({
              trainingSessionId: trainingSessionId,
              userId: userId,
              status: 1,
            });

          return res.status(200).json({
            status: "success",
          });
        } else {
          await db("metaenga_vr_training_session")
            .update({
              duration: 0,
              timeEnd: check.timeStart,
              status: 0,
            })
            .where({
              trainingSessionId: trainingSessionId,
              userId: userId,
              status: 1,
            });

          return res.status(200).json({
            status: "success",
          });
        }
      } else {
        return res.status(404).json({
          status: "no session",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async vrTrainingActionPerformed(req, res) {
    try {
      const {
        userId,
        trainingSessionId,
        actionType,
        actionDescription,
        scenarionTime,
      } = req.body;

      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const timeStamp = await db("metaenga_vr_training_session")
        .first("*")
        .where({
          trainingSessionId: trainingSessionId,
        });
      console.log(timeStamp.timeStart);
      let dateString = timeStamp.timeStart;
      const dateObject = new Date(
        Date.UTC(
          dateString.slice(0, 4), // Year
          dateString.slice(5, 7) - 1, // Month (0-based)
          dateString.slice(8, 10), // Day
          dateString.slice(11, 13), // Hour
          dateString.slice(14, 16), // Minute
          dateString.slice(17, 19) // Second
        )
      );
      console.log(dateObject);
      const timeInDa = new Date(dateObject.getTime() + scenarionTime * 1000);

      const time = timeInDa.toISOString().replace(/T/, " ").replace(/\..+/, "");
      console.log(time);

      await db("metaenga_vr_training_action").insert({
        companyId: user.company,
        time: time,
        trainingSessionId: trainingSessionId,
        userId: userId,
        actionType: actionType,
        actionDescription: actionDescription,
      });

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);

      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async vrTrainingRuntimeErrorHandle(req, res) {
    try {
      const {
        userId,
        trainingSessionId,
        errorCode,
        errorDescription,
        scenarionTime,
      } = req.body;

      const user = await db("userlink").first("*").where({
        user: userId,
      });
      const timeStamp = await db("metaenga_vr_training_session")
        .first("*")
        .where({
          trainingSessionId: trainingSessionId,
        });

      const timeInSeconds = Math.floor(
        new Date(timeStamp.timeStart).getTime() / 1000
      );
      const timer = timeInSeconds + scenarionTime;
      const time = new Date(timer * 1000)
        .toISOString()
        .replace("T", " ")
        .substr(0, 19);
      console.log(time);

      await db("metaenga_vr_training_error").insert({
        companyId: user.company,
        time: time,
        trainingSessionId: trainingSessionId,
        userId: userId,
        errorCode: errorCode,
        errorDescription: errorDescription,
      });

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppSessionForMonth(req, res) {
    try {
      const { company, month, year } = req.params;

      const check = await db("company").first("*").where({
        id: company,
      });

      if (!check) {
        return res.status(400).json({
          status: "company not found",
        });
      }
      const rows = await db("metaenga_vr_app_session").select().count();
      const count = rows[0]["count(*)"];
      const timeStart = await db("metaenga_vr_app_session").pluck("timeStart");

      const appSessionData = [];

      for (let i = 0; i < count; i++) {
        const arrDate = timeStart[i].split(/[- ]+/);

        if ((arrDate[1] == month) & (arrDate[0] == year)) {
          const sessions = await db("metaenga_vr_app_session")
            .select("*")
            .where("timeEnd", "!=", "")
            .andWhere({
              timeStart: [timeStart[i].replace(/['"]+/g, "")],
              status: 0,
              companyId: company,
            });
          if (sessions.length > 0) {
            appSessionData.push(...sessions);
          }
        }
      }
      if (appSessionData.length > 0) {
        return res.status(200).json({
          status: "success",
          data: appSessionData,
        });
      } else {
        return res.status(400).json({
          data: appSessionData,
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async webSessionStart(req, res) {
    try {
      const { userId } = req.body;

      const check = await db("metaenga_vr_web_session").first("*").where({
        userId: userId,
        status: 1,
      });

      if (check) {
        await db("metaenga_vr_web_session")
          .update({
            status: 1,
          })
          .where({
            userId: userId,
            status: 1,
          });
      }
      const user = await db("userlink").first("*").where({
        user: userId,
      });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      let hash = uuid.v4();

      console.log("user.company value:", user.company);
      await db("metaenga_vr_web_session").insert({
        companyId: user.company,
        userId: userId,
        timeStart: time,
        webSessionId: hash,
        status: 1,
      });

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async webSession(req, res) {
    try {
      const company = req.params.company;
      const duration = req.params.duration;
      const timeEnd = req.params.timeEnd;
      const userId = req.params.userId;

      console.log("company", company);
      console.log("userId", userId);
      const check = await db("metaenga_users").first("*").where({
        id: userId,
      });

      if (!check) {
        return res.status(404).json({
          status: "no session",
        });
      }

      const timeStart = Math.floor(new Date(timeEnd).getTime() - duration);
      const startDate = moment(timeStart).utcOffset(0); // Встановлюємо часовий пояс на UTC (або інший, який вам потрібен)

      const formattedDateStart = startDate.format("YYYY-MM-DD HH:mm:ss");

      console.log("timeStart", timeStart);

      console.log("startDate", startDate);
      console.log("formattedDateStart", formattedDateStart);
      console.log("formattedDateStart", formattedDateStart);

      const parsedDate = new Date(timeEnd);
      const formattedDateEnd = parsedDate
        .toISOString()
        .replace("T", " ")
        .slice(0, 19); // Змінюємо формат та відсікаємо мілісекунди

      let hash = uuid.v4();

      await db("metaenga_vr_web_session").insert({
        companyId: company,
        userId: userId,
        timeStart: formattedDateStart,
        duration: duration,
        timeEnd: formattedDateEnd,
        webSessionId: hash,
        status: 0,
      });
      await db("company").where({ id: company }).update({
        latestDate: formattedDateEnd,
      });

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getWebSessionForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          count: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_web_session")
          .count("webSessionId as count")
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        week.count = result.count || 0;
        console.log("count", result.count);
      }

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getVrAppSessionDurationForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          duration: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        week.duration = result.totalDuration || 0;
        console.log("Total Duration:", result.totalDuration);
      }
      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppSessionDurationForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const start = day.date;
        const end = day.date;
        console.log("date:", start);
        const result = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        day.duration = result.totalDuration || 0;
        console.log("Total Duration:", result.totalDuration);
      }
      dailyData.reverse();

      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrTrainingSessionCountForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          count: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_training_session")
          .count("trainingSessionId as count")
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeStart) <= ?", end))
          .first();

        week.count = result.count || 0;
        console.log("count", result.count);
      }

      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrTrainingSessionCountForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          count: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const date = day.date;
        console.log("date:", date);
        const result = await db("metaenga_vr_training_session")
          .count("trainingSessionId as count")
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) = ?", date))
          .first();

        day.count = result.count || 0;
        console.log("count:", result.count);
      }
      dailyData.reverse();

      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppSessionDurationForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          duration: 0,
        };

        monthlyData.unshift(monthObject);
      }

      for (let i = 0; i < monthlyData.length; i++) {
        const month = monthlyData[i];
        const [start, end] = month.period.split(" - ");

        console.log("start end:", start, end);

        const result = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(db.raw("DATE(timeEnd) <= STR_TO_DATE(?, '%d.%m.%Y')", end))
          .first();

        month.duration = result.totalDuration || 0;
        console.log("Total Duration:", result.totalDuration);
      }

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getVrAppSessionCountForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          count: 0,
        };

        monthlyData.unshift(monthObject);
      }

      for (const month of monthlyData) {
        const [start, end] = month.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_app_session")
          .count("appSessionId as count")
          .where("companyId", "=", company)
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(
            db.raw("DATE(timeStart) <= STR_TO_DATE(?, '%d.%m.%Y')", end)
          )
          .first();

        month.count = result.count || 0;
        console.log("count", result.count);
      }

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrTrainingSessionCountForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          count: 0,
        };

        monthlyData.unshift(monthObject);
      }

      for (const month of monthlyData) {
        const [start, end] = month.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_training_session")
          .count("trainingSessionId as count")
          .where("companyId", "=", company)
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(
            db.raw("DATE(timeStart) <= STR_TO_DATE(?, '%d.%m.%Y')", end)
          )
          .first();

        month.count = result.count || 0;
        console.log("count", result.count);
      }

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppSessionCountForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          count: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_app_session")
          .count("appSessionId as count")
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeStart) <= ?", end))
          .first();

        week.count = result.count || 0;
        console.log("count", result.count);
      }
      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppSessionCountForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          count: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const date = day.date;
        console.log("date:", date);
        const result = await db("metaenga_vr_app_session")
          .count("appSessionId as count")
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) = ?", date))
          .first();

        day.count = result.count || 0;
        console.log("count:", result.count);
      }
      dailyData.reverse();

      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrTrainingSessionDurationForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          duration: 0,
        };

        monthlyData.unshift(monthObject);
      }
      for (let i = 0; i < monthlyData.length; i++) {
        const month = monthlyData[i];
        const [start, end] = month.period.split(" - ");

        console.log("start end:", start, end);

        const result = await db("metaenga_vr_training_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(db.raw("DATE(timeEnd) <= STR_TO_DATE(?, '%d.%m.%Y')", end))
          .first();

        month.duration = result.totalDuration || 0;
        console.log("Total Duration:", result.totalDuration);
      }

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrTrainingSessionDurationForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          duration: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_training_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        week.duration = result.totalDuration || 0;
        console.log("Total Duration:", result.totalDuration);
      }
      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrTrainingSessionDurationForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          duration: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const start = day.date;
        const end = day.date;
        console.log("date:", start);
        const result = await db("metaenga_vr_training_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        day.duration = result.totalDuration || 0;
        console.log("Total Duration:", result.totalDuration);
      }

      dailyData.reverse();
      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getTotalTrainingSessionInCompanyForAllTime(req, res) {
    try {
      const company = req.params.company;
      console.log(company);

      //общее количество сессий за все время
      const totalTrainingSessions = await db("metaenga_vr_training_session")
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
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
      currentDateNotFormatted.setDate(currentDateNotFormatted.getDate() - 30);
      const sixtyDaysAgo = currentDateNotFormatted
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      console.log("сейчас", currentDate);
      console.log("30 дней назад", thirtyDaysAgo);
      console.log("60 дней назад", sixtyDaysAgo);

      //общее количество сессий за последние 30 дней
      const TrainingSessionsLastThirtyDays = await db(
        "metaenga_vr_training_session"
      )
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      //общее количество сессий за последние 30 дней
      const TrainingSessionSixtyDaysAgo = await db(
        "metaenga_vr_training_session"
      )
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const totalTrainingSessionsInt =
        parseInt(totalTrainingSessions.count, 10) || 0;
      const totalTrainingSessionsLastThirtyDaysInt =
        parseInt(TrainingSessionsLastThirtyDays.count, 10) || 0;
      const totalTrainingSessionsSixtyDaysAgoInt =
        parseInt(TrainingSessionSixtyDaysAgo.count, 10) || 0;

      const companyCreationDate = await db("company")
        .first("date")
        .where("id", company);

      const currentDateMs = new Date().getTime();
      const companyCreationDateObj = new Date(
        companyCreationDate.date
      ).getTime();
      const diffInMs = Math.abs(currentDateMs - companyCreationDateObj);

      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      let percentChange = 0;
      if (totalTrainingSessionsSixtyDaysAgoInt == 0 || diffInDays <= 30) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          totalTrainingSessions: totalTrainingSessionsInt,
          percentChangeLastThirtyDays: percentChange,
        });
      } else {
        percentChange =
          ((totalTrainingSessionsLastThirtyDaysInt -
            totalTrainingSessionsSixtyDaysAgoInt) /
            totalTrainingSessionsSixtyDaysAgoInt) *
          100;
      }
      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }
      console.log("всего", totalTrainingSessionsInt);
      console.log(
        "за последние 30 дней",
        totalTrainingSessionsLastThirtyDaysInt
      );
      console.log("за последние 30 дней", totalTrainingSessionsSixtyDaysAgoInt);

      return res.status(200).json({
        status: "success",
        totalTrainingSessions: totalTrainingSessionsInt,
        percentChangeLastThirtyDays: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getAverageDurationOfTrainingSession(req, res) {
    try {
      const company = req.params.company;
      //общее среднее значение
      const totalTrainingSessionsWithDurationResult = await db(
        "metaenga_vr_training_session"
      )
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .first();

      const result = await db("metaenga_vr_training_session")
        .select(db.raw("SUM(duration) as totalDuration"))
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .first();

      const totalCountTrainingSessionsWithDuration =
        parseInt(totalTrainingSessionsWithDurationResult.count, 10) || 0;
      const totalDurationAllTime = parseInt(result.totalDuration, 10) || 0;
      const averageDurationAllTime =
        totalDurationAllTime / totalCountTrainingSessionsWithDuration;

      console.log("totalDurationAllTime", totalDurationAllTime);
      console.log(
        "totalCountTrainingSessionsWithDuration",
        totalCountTrainingSessionsWithDuration
      );
      console.log("averageDurationAllTime", averageDurationAllTime);
      //среднее значение за прошедшие 30 дней
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

      const totalTrainingSessionsWithDurationResultLastThirtyDays = await db(
        "metaenga_vr_training_session"
      )
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      const resultLastThirtyDays = await db("metaenga_vr_training_session")
        .select(db.raw("SUM(duration) as totalDuration"))
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      const totalCountTrainingSessionsWithDurationLastThirtyDays =
        parseInt(
          totalTrainingSessionsWithDurationResultLastThirtyDays.count,
          10
        ) || 0;
      const totalDurationLastThirtyDays =
        parseInt(resultLastThirtyDays.totalDuration, 10) || 0;
      let averageDurationLastThirtyDays = 0;
      if (totalCountTrainingSessionsWithDurationLastThirtyDays !== 0) {
        averageDurationLastThirtyDays =
          totalDurationLastThirtyDays /
          totalCountTrainingSessionsWithDurationLastThirtyDays;
      }

      const totalTrainingSessionsWithDurationResultSixtyDaysAgo = await db(
        "metaenga_vr_training_session"
      )
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const resultLastSixtyDaysAgo = await db("metaenga_vr_training_session")
        .select(db.raw("SUM(duration) as totalDuration"))
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const totalCountTrainingSessionsWithDurationSixtyDaysAgo =
        parseInt(
          totalTrainingSessionsWithDurationResultSixtyDaysAgo.count,
          10
        ) || 0;
      const totalDurationSixtyDaysAgo =
        parseInt(resultLastSixtyDaysAgo.totalDuration, 10) || 0;
      let averageDurationSixtyDaysAgo = 0;
      if (totalCountTrainingSessionsWithDurationSixtyDaysAgo !== 0) {
        averageDurationSixtyDaysAgo =
          totalDurationSixtyDaysAgo /
          totalCountTrainingSessionsWithDurationSixtyDaysAgo;
      }

      const companyCreationDate = await db("company")
        .first("date")
        .where("id", company);

      const currentDateMs = new Date().getTime();
      const companyCreationDateObj = new Date(
        companyCreationDate.date
      ).getTime();
      const diffInMs = Math.abs(currentDateMs - companyCreationDateObj);

      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      let percentChange = 0;

      if (averageDurationSixtyDaysAgo == 0 || diffInDays <= 30) {
        percentChange = "n/a";

        return res.status(200).json({
          status: "success",
          averageDurationAllTime: averageDurationAllTime,
          percentChange: percentChange,
        });
      } else {
        percentChange =
          ((averageDurationLastThirtyDays - averageDurationSixtyDaysAgo) /
            averageDurationSixtyDaysAgo) *
          100;
        console.log("результат", percentChange);
      }

      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }

      console.log("totalDurationLastThirtyDays", totalDurationLastThirtyDays);
      console.log(
        "totalCountTrainingSessionsWithDurationLastThirtyDays",
        totalCountTrainingSessionsWithDurationLastThirtyDays
      );
      console.log(
        "averageDurationLastThirtyDays",
        averageDurationLastThirtyDays
      );

      console.log("totalDurationSixtyDaysAgo", totalDurationSixtyDaysAgo);
      console.log(
        "totalCountTrainingSessionsWithDuration",
        totalCountTrainingSessionsWithDurationSixtyDaysAgo
      );
      console.log("averageDurationSixtyDaysAgo", averageDurationSixtyDaysAgo);

      return res.status(200).json({
        status: "success",
        averageDurationAllTime: averageDurationAllTime,
        percentChange: percentChange,
      });
    } catch (error) {
      console.log(error);

      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getAvgVRTrainingSessionPerUser(req, res, next) {
    try {
      //дата зараз, 30 днів тому та 60 днів тому
      const company = req.params.company;
      console.log(company);
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

      //тотал юзерс зараз
      const totalUsersResult = await db("metaenga_users")
        .count("id as count")
        .first();
      const totalUsers = parseInt(totalUsersResult.count, 10) || 0;

      //окрема змінна з тотал юзерс для циклу аби її значення можна було змінювати в цьому ж циклі
      let totalUsersForCycle = totalUsers;
      //об'єкти для зберігання кількості користувачів по дням
      const dailyUserCounts = {};
      const dailyUserCountsThirtyDaysAgo = {};

      // Цикл для підрахунку юзерів за останні 30 днів
      for (let i = 1; i <= 30; i++) {
        const currentDay = new Date();
        currentDay.setDate(currentDay.getDate() - i);
        const formattedCurrentDay = currentDay
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");

        // Рахуємо кількість користувачів яких було додано в поточний день
        const addedUsersResult = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 1)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay.split(" ")[0]}'`)
          .first();

        // Рахуємо кількість користувачів яких було видалено в поточний день
        const deletedUsersResult = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 0)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay.split(" ")[0]}'`)
          .first();

        const addedCount = parseInt(addedUsersResult.count, 10) || 0;
        const deletedCount = parseInt(deletedUsersResult.count, 10) || 0;

        // Оновлення загальної кількості користувачів на поточний день
        const totalUsersOnCurrentDay =
          totalUsersForCycle + deletedCount - addedCount;

        console.log(" formattedCurrentDay ", formattedCurrentDay);
        console.log(" totalUsersForCycle ", totalUsersForCycle);
        console.log(" addedCount ", addedCount);
        console.log(" deletedCount ", deletedCount);
        console.log(" totalUsersOnCurrentDay ", totalUsersOnCurrentDay);

        // dailyUserCounts зберігає кількість користувачів кожного дня за останні 30 днів
        dailyUserCounts[formattedCurrentDay] = totalUsersOnCurrentDay;

        // Оновлення загальної кількості користувачів для наступного дня
        totalUsersForCycle = totalUsersOnCurrentDay;
      }

      const sumLastMonth = Object.values(dailyUserCounts).reduce(
        (acc, count) => acc + count,
        0
      );
      console.log("Сумма:", sumLastMonth);
      console.log(" dailyUserCounts[formattedCurrentDay] ", dailyUserCounts);
      console.log(" totalUsers ", totalUsers);

      // Загальна кількість користувачів, від якої будемо відштовхуватись при розрахунку їх ще 30 днів назад
      //(вона дорівнює кількості користувачів за останній день попереднього циклу)
      let totalUsersForCycleThirtyDaysAgo = totalUsersForCycle;
      console.log(
        " totalUsersForCycleThirtyDaysAgo ",
        totalUsersForCycleThirtyDaysAgo
      );

      // Цикл для підрахунку юзерів за 30 днів 30 днів назад
      for (let i = 1; i <= 30; i++) {
        const currentDay = new Date(thirtyDaysAgo);
        currentDay.setDate(currentDay.getDate() - i);
        const formattedCurrentDay = currentDay.toISOString().split("T")[0];

        const addedUsersResultThirtyDaysAgo = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 1)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay}'`)
          .first();

        const deletedUsersResultThirtyDaysAgo = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 0)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay}'`)
          .first();

        const addedCountThirtyDaysAgo =
          parseInt(addedUsersResultThirtyDaysAgo.count, 10) || 0;
        const deletedCountThirtyDaysAgo =
          parseInt(deletedUsersResultThirtyDaysAgo.count, 10) || 0;

        const totalUsersOnCurrentDayThirtyDaysAgo =
          totalUsersForCycleThirtyDaysAgo +
          deletedCountThirtyDaysAgo -
          addedCountThirtyDaysAgo;

        console.log("formattedCurrentDay", formattedCurrentDay);
        console.log("addedCountThirtyDaysAgo", addedCountThirtyDaysAgo);
        console.log(
          "deletedCountThirtyDaysAgo",
          deletedUsersResultThirtyDaysAgo.count
        );
        console.log(
          "totalUsersOnCurrentDay",
          totalUsersOnCurrentDayThirtyDaysAgo
        );

        dailyUserCountsThirtyDaysAgo[formattedCurrentDay] =
          totalUsersOnCurrentDayThirtyDaysAgo;

        totalUsersForCycleThirtyDaysAgo = totalUsersOnCurrentDayThirtyDaysAgo;
      }

      const sumThirtyDaysAgo = Object.values(
        dailyUserCountsThirtyDaysAgo
      ).reduce((acc, count) => acc + count, 0);
      console.log("Сумма:", sumThirtyDaysAgo);
      console.log(
        " dailyUserCountsThirtyDaysAgo[formattedCurrentDay] ",
        dailyUserCountsThirtyDaysAgo
      );
      console.log(
        " totalUsersForCycleThirtyDaysAgo ",
        totalUsersForCycleThirtyDaysAgo
      );

      //тотал тренінг сесій зараз
      const totalTrainingResult = await db("metaenga_vr_training_session")
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .first();

      //тотатл тренінг сесій за 30 днів
      const trainingLastMonthResult = await db("metaenga_vr_training_session")
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      //тотатл тренінг сесій  30 днів тому
      const trainingThirtyDaysAgoResult = await db(
        "metaenga_vr_training_session"
      )
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const totalTraining = parseInt(totalTrainingResult.count, 10) || 0;
      const trainingLastMonth =
        parseInt(trainingLastMonthResult.count, 10) || 0;
      const trainingThirtyDaysAgo =
        parseInt(trainingThirtyDaysAgoResult.count, 10) || 0;

      //середня кількість тренінгів на юзера зараз
      let avgTrainingSessionsPerUserNow;
      if (totalUsers == 0) {
        avgTrainingSessionsPerUserNow = 0;
      } else {
        avgTrainingSessionsPerUserNow = totalTraining / totalUsers;
      }

      //середня кількість тренінгів на юзера за останні 30 днів
      let avgTrainingSessionsPerUserLastMonth;
      if (sumLastMonth == 0) {
        avgTrainingSessionsPerUserLastMonth = 0;
      } else {
        avgTrainingSessionsPerUserLastMonth = trainingLastMonth / sumLastMonth;
      }

      //середня кількість тренінгів на юзера 30 днів тому
      let avgTrainingSessionsPerUserThirtyDaysAgo;
      if (sumThirtyDaysAgo == 0) {
        avgTrainingSessionsPerUserThirtyDaysAgo = 0;
      } else {
        avgTrainingSessionsPerUserThirtyDaysAgo =
          trainingThirtyDaysAgo / sumThirtyDaysAgo;
      }

      console.log(" totalTraining ", totalTraining);
      console.log(" trainingLastMonth ", trainingLastMonth);
      console.log(" trainingThirtyDaysAgo ", trainingThirtyDaysAgo);
      console.log(
        " avgTrainingSessionsPerUserLastMonth ",
        avgTrainingSessionsPerUserLastMonth
      );
      console.log(
        " avgTrainingSessionsPerUserThirtyDaysAgo ",
        avgTrainingSessionsPerUserThirtyDaysAgo
      );

      let percentChange = 0;
      if (avgTrainingSessionsPerUserThirtyDaysAgo == 0) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          avgTrainingSessionsPer: avgTrainingSessionsPerUserNow,
          percentChangeLastThirtyDays: percentChange,
        });
      } else {
        percentChange =
          ((avgTrainingSessionsPerUserLastMonth -
            avgTrainingSessionsPerUserThirtyDaysAgo) /
            avgTrainingSessionsPerUserThirtyDaysAgo) *
          100;
      }
      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }

      return res.status(200).json({
        status: "success",
        avgTrainingSessionsPerUser: avgTrainingSessionsPerUserNow,
        percentChangeLastThirtyDays: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppAndWebSessionDurationForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          duration: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const resultApp = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        const resultWeb = await db("metaenga_vr_web_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        week.duration =
          (resultApp.totalDuration || 0) + (resultWeb.totalDuration || 0);
        console.log("Total Duration:", week.duration);
      }
      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppAndWebSessionDurationForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          duration: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const start = day.date;
        const end = day.date;
        console.log("date:", start);
        const resultApp = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();
        const resultWeb = await db("metaenga_vr_web_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        day.duration =
          (resultApp.totalDuration || 0) + (resultWeb.totalDuration || 0);
        console.log("Total Duration:", day.duration);
      }
      dailyData.reverse();
      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppAndWebSessionDurationForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          duration: 0,
        };

        monthlyData.unshift(monthObject);
      }
      for (let i = 0; i < monthlyData.length; i++) {
        const month = monthlyData[i];
        const [start, end] = month.period.split(" - ");

        console.log("start end:", start, end);

        const resultApp = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(db.raw("DATE(timeEnd) <= STR_TO_DATE(?, '%d.%m.%Y')", end))
          .first();

        const resultWeb = await db("metaenga_vr_web_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("duration", "!=", "")
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(db.raw("DATE(timeEnd) <= STR_TO_DATE(?, '%d.%m.%Y')", end))
          .first();

        month.duration =
          (resultApp.totalDuration || 0) + (resultWeb.totalDuration || 0);
        console.log("Total Duration:", month.duration);
      }

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getUsersData(req, res) {
    try {
      const company = req.params.company;

      const companyUsers = await db("userlink")
        .select()
        .where("company", "=", company);

      const usersId = companyUsers.map((user) => user.user);

      const usersName = await db("metaenga_users")
        .select("id", "name", "email")
        .whereIn("id", usersId);

      console.log("usersId ", usersId);

      let completed = {};

      for (const user of usersId) {
        const trainingUser = await db("metaenga_training_user")
          .distinct("training")
          .where("company", "=", company)
          .where("user", "=", user);

        completed[user] = 0;

        for (const training of trainingUser) {
          const completedTrainingUser = await db("metaenga_vr_training_session")
            .select("userId")
            .where("companyId", "=", company)
            .andWhere("trainingId", "=", training.training.toString())
            .andWhere("status", "=", 0)
            .andWhere("userId", "=", user)
            .first();

          console.log("SELECT");

          if (completedTrainingUser) {
            completed[user]++;
          }
        }

        // Проверка наличия назначенных, но не завершенных тренингов
        if (trainingUser.length > 0 && completed[user] === 0) {
          completed[user] = `0 from ${trainingUser.length}`;
        } else if (completed[user] !== 0) {
          completed[user] = `${completed[user]} from ${trainingUser.length}`;
        } else {
          completed[user] = `0 from 0`;
        }
        console.log("trainingUser ", trainingUser);
      }

      console.log("completed ", completed);

      console.log("Я ПЕРЕД  sessionCounts ");
      const sessionCounts = await db("metaenga_vr_training_session")
        .select("userId")
        .count("trainingSessionId as sessionCount")
        .where("companyId", "=", company)
        .whereIn("userId", usersId)
        .groupBy("userId");

      console.log("Я ПІСЛЯ  sessionCounts ");
      console.log("Я Я ПЕРЕД  sessionCompletedCounts ");

      const sessionCompletedCounts = await db("metaenga_vr_training_session")
        .select("userId")
        .count("trainingSessionId as sessionCount")
        .where("companyId", "=", company)
        .where("status", "=", 0)
        .whereIn("userId", usersId)
        .groupBy("userId");

      console.log("Я Я ПЕРЕД  totalDurationResult ");
      const totalDurationResult = await db("metaenga_vr_training_session")
        .select("userId")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereIn("userId", usersId)
        .groupBy("userId");

      console.log("Я Я ПЕРЕД  lastActivityTraining ");
      const lastActivityTraining = await db("metaenga_vr_training_session")
        .select("userId", "timeStart")
        .where("companyId", "=", company)
        .whereIn("userId", usersId)
        .orderBy("timeStart", "desc");
      console.log("Я Я ПЕРЕД  lastActivityWeb ");
      const lastActivityWeb = await db("metaenga_vr_web_session")
        .select("userId", "timeStart")
        .where("companyId", "=", company)
        .whereIn("userId", usersId)
        .orderBy("timeStart", "desc");
      console.log("Я ТУТ ");
      const combinedActivityMap = {};

      lastActivityTraining.forEach((row) => {
        if (
          !combinedActivityMap[row.userId] ||
          row.timeStart > combinedActivityMap[row.userId]
        ) {
          combinedActivityMap[row.userId] = row.timeStart;
        }
      });

      lastActivityWeb.forEach((row) => {
        if (
          !combinedActivityMap[row.userId] ||
          row.timeStart > combinedActivityMap[row.userId]
        ) {
          combinedActivityMap[row.userId] = row.timeStart;
        }
      });

      const usersData = usersName.map((user) => {
        const { id, name, email } = user;
        const session = sessionCounts.find((session) => session.userId === id);
        const sessionCount = session ? session.sessionCount : 0;

        const sessionCompleted = sessionCompletedCounts.find(
          (sessionCompleted) => sessionCompleted.userId === id
        );
        const sessionCompletedCount = sessionCompleted
          ? (sessionCompleted.sessionCount / sessionCount) * 100 + "%"
          : 0 + "%";

        const lastActivity = combinedActivityMap[id] || null;

        const totalDuration = totalDurationResult.find(
          (duration) => duration.userId === id
        );
        const averageDuration = totalDuration
          ? totalDuration.totalDuration / sessionCount
          : 0;
        const completedVRTraining = completed[id];

        return {
          id: id,
          name: name,
          email: email,
          sessionCount: sessionCount,
          averageDuration: averageDuration,
          lastActivity: lastActivity,
          sessionCompletedCount: sessionCompletedCount,
          completedVRTraining: completedVRTraining,
        };
      });

      return res.status(200).json({
        status: "success",
        data: usersData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async getTotalUsers(req, res, next) {
    try {
      const company = req.params.company;
      console.log(company);
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

      const totalUsersResult = await db("metaenga_users")
        .count("id as count")
        .where("company_id", "=", company)
        .first();

      const addedUsersLastMonthResult = await db("metaenga_user_logs")
        .count("companyId as count")
        .where("companyId", "=", company)
        .andWhere("status", "=", 1)
        .whereBetween("time", [thirtyDaysAgo, currentDate])
        .first();

      const deletedUsersLastMonthResult = await db("metaenga_user_logs")
        .count("companyId as count")
        .where("companyId", "=", company)
        .andWhere("status", "=", 0)
        .whereBetween("time", [thirtyDaysAgo, currentDate])
        .first();

      const totalUsers = parseInt(totalUsersResult.count, 10) || 0;
      const addedCount = parseInt(addedUsersLastMonthResult.count, 10) || 0;
      const deletedCount = parseInt(deletedUsersLastMonthResult.count, 10) || 0;

      const totalUsersLastMonth = totalUsers + deletedCount - addedCount;

      const companyCreationDate = await db("company")
        .first("date")
        .where("id", company);

      const currentDateMs = new Date().getTime();
      const companyCreationDateObj = new Date(
        companyCreationDate.date
      ).getTime();

      const diffInMs = Math.abs(currentDateMs - companyCreationDateObj);
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      let percentChange = 0;
      if (diffInDays <= 30) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          totalUsers: totalUsers,
          percentChangeLastThirtyDays: percentChange,
        });
      } else {
        percentChange =
          ((totalUsers - totalUsersLastMonth) / totalUsersLastMonth) * 100;
      }
      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }

      console.log("всего", totalUsersResult.count);
      console.log(
        "добавлено за последние 30 дней",
        addedUsersLastMonthResult.count
      );
      console.log(
        "удалено за последние 30 дней",
        deletedUsersLastMonthResult.count
      );
      console.log("было 30 дней назад", totalUsersLastMonth);

      return res.status(200).json({
        status: "success",
        totalUsers: totalUsers,
        percentChangeLastThirtyDays: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getTotalTrainings(req, res, next) {
    try {
      const company = req.params.company;
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

      const totalTrainingsResult = await db("metaenga_training_company")
        .countDistinct("training as count")
        .where("company", "=", company)
        .first();

      const addedTrainingsLastMonthResult = await db("metaenga_training_logs")
        .count("companyId as count")
        .where("companyId", "=", company)
        .andWhere("status", "=", 1)
        .whereBetween("time", [thirtyDaysAgo, currentDate])
        .first();

      const deletedTrainingsLastMonthResult = await db("metaenga_training_logs")
        .count("companyId as count")
        .where("companyId", "=", company)
        .andWhere("status", "=", 0)
        .whereBetween("time", [thirtyDaysAgo, currentDate])
        .first();

      const totalTrainings = parseInt(totalTrainingsResult.count, 10) || 0;
      const addedCount = parseInt(addedTrainingsLastMonthResult.count, 10) || 0;
      const deletedCount =
        parseInt(deletedTrainingsLastMonthResult.count, 10) || 0;

      const totalTrainingsLastMonth =
        totalTrainings + deletedCount - addedCount;

      const companyCreationDate = await db("company")
        .first("date")
        .where("id", company);

      const currentDateMs = new Date().getTime();
      const companyCreationDateObj = new Date(
        companyCreationDate.date
      ).getTime();

      const diffInMs = Math.abs(currentDateMs - companyCreationDateObj);

      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      console.log("currentDate", currentDate);
      console.log("companyCreationDateObj", companyCreationDateObj);
      console.log("diffInDays", diffInDays);

      let percentChange = 0;
      if (diffInDays <= 30) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          totalTrainings: totalTrainings + 1,
          percentChangeLastThirtyDays: percentChange,
        });
      } else {
        percentChange =
          ((totalTrainings - totalTrainingsLastMonth) /
            totalTrainingsLastMonth) *
          100;
      }
      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }
      console.log("всего", totalTrainingsResult.count);
      console.log(
        "добавлено за последние 30 дней",
        addedTrainingsLastMonthResult.count
      );
      console.log(
        "удалено за последние 30 дней",
        deletedTrainingsLastMonthResult.count
      );
      console.log("было 30 дней назад", totalTrainingsLastMonth);

      return res.status(200).json({
        status: "success",
        totalTrainings: totalTrainings + 1,
        percentChangeLastThirtyDays: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getAvgViewingTimeVideo(req, res, next) {
    try {
      const company = req.params.company;
      //общее среднее значение
      const totalVideoSessionsWithDurationResult = await db(
        "metaenga_video_session"
      )
        .count("videoSessionId as count")
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .first();

      const result = await db("metaenga_video_session")
        .select(db.raw("SUM(duration) as totalDuration"))
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .first();
      const totalCountVideoSessionsWithDuration =
        parseInt(totalVideoSessionsWithDurationResult.count, 10) || 0;
      const totalDurationAllTime = parseInt(result.totalDuration, 10) || 0;
      const averageDurationAllTime =
        totalDurationAllTime / totalCountVideoSessionsWithDuration;

      //среднее значение за прошедшие 30 дней
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

      const totalVideoSessionsWithDurationResultLastThirtyDays = await db(
        "metaenga_video_session"
      )
        .count("videoSessionId as count")
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      const resultLastThirtyDays = await db("metaenga_video_session")
        .select(db.raw("SUM(duration) as totalDuration"))
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      const totalCountVideoSessionsWithDurationLastThirtyDays =
        parseInt(
          totalVideoSessionsWithDurationResultLastThirtyDays.count,
          10
        ) || 0;
      const totalDurationLastThirtyDays =
        parseInt(resultLastThirtyDays.totalDuration, 10) || 0;
      let averageDurationLastThirtyDays = 0;
      if (totalCountVideoSessionsWithDurationLastThirtyDays !== 0) {
        averageDurationLastThirtyDays =
          totalDurationLastThirtyDays /
          totalCountVideoSessionsWithDurationLastThirtyDays;
      }

      //среднее значение от рождения христа и до 30 дней назад
      const totalVideoSessionsWithDurationResultThirtyDaysAgo = await db(
        "metaenga_video_session"
      )
        .count("videoSessionId as count")
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const resultThirtyDaysAgo = await db("metaenga_video_session")
        .select(db.raw("SUM(duration) as totalDurationThirtyDaysAgo"))
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const totalCountVideoSessionsWithDurationThirtyDaysAgo =
        parseInt(totalVideoSessionsWithDurationResultThirtyDaysAgo.count, 10) ||
        0;
      const totalDurationThirtyDaysAgo =
        parseInt(resultThirtyDaysAgo.totalDurationThirtyDaysAgo, 10) || 0;
      let averageDurationThirtyDaysAgo = 0;
      if (totalCountVideoSessionsWithDurationThirtyDaysAgo !== 0) {
        averageDurationThirtyDaysAgo =
          totalDurationThirtyDaysAgo /
          totalCountVideoSessionsWithDurationThirtyDaysAgo;
      }

      let percentChange = 0;

      if (averageDurationThirtyDaysAgo == 0) {
        percentChange = "n/a";

        return res.status(200).json({
          status: "success",
          averageDurationAllTime: averageDurationAllTime,
          percentChange: percentChange,
        });
      } else {
        //узнаем прирост средней продолжительности

        percentChange =
          ((averageDurationLastThirtyDays - averageDurationThirtyDaysAgo) /
            averageDurationThirtyDaysAgo) *
          100;
        console.log("результат", percentChange);

        if (percentChange > 999) {
          percentChange = "999%+";
        } else {
          percentChange = percentChange.toFixed(2) + "%";
        }
      }

      console.log("компания ", company);
      console.log("всего записей", totalCountVideoSessionsWithDuration);
      console.log("общее время продолжительности", totalDurationAllTime);

      console.log("средняя продолжительность", averageDurationAllTime);

      console.log(
        "всего записей за последние 30 дней",
        totalCountVideoSessionsWithDurationLastThirtyDays
      );
      console.log("общее время продолжительности", totalDurationLastThirtyDays);

      console.log(
        "всего записей за 30 дней назад",
        totalCountVideoSessionsWithDurationThirtyDaysAgo
      );
      console.log(
        "общее время продолжительности за 30 дней назад",
        totalDurationThirtyDaysAgo
      );

      console.log(
        "средняя продолжительность за последние 30 дней",
        averageDurationLastThirtyDays
      );
      console.log(
        "средняя продолжительность 30 дней назад",
        averageDurationThirtyDaysAgo
      );

      return res.status(200).json({
        status: "success",
        averageDurationAllTime: averageDurationAllTime,
        percentChange: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getTotalCountSessionVideo(req, res, next) {
    try {
      const company = req.params.company;
      //total count sessions
      const totalVideoSessionsWithDurationResult = await db(
        "metaenga_video_session"
      )
        .count("videoSessionId as count")
        .where("companyId", "=", company)
        .first();

      const totalCountVideoSessionsWithDuration =
        parseInt(totalVideoSessionsWithDurationResult.count, 10) || 0;

      //count sessions за прошедшие 30 дней
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

      const totalVideoSessionsWithDurationResultLastThirtyDays = await db(
        "metaenga_video_session"
      )
        .count("videoSessionId as count")
        .where("companyId", "=", company)
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      const totalCountVideoSessionsWithDurationLastThirtyDays =
        parseInt(
          totalVideoSessionsWithDurationResultLastThirtyDays.count,
          10
        ) || 0;

      //count sessions от рождения христа и до 30 дней назад
      const totalVideoSessionsWithDurationResultThirtyDaysAgo = await db(
        "metaenga_video_session"
      )
        .count("videoSessionId as count")
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const totalVideoSessionsWithDurationThirtyDaysAgo =
        parseInt(totalVideoSessionsWithDurationResultThirtyDaysAgo.count, 10) ||
        0;

      let percentChange = 0;
      if (!totalVideoSessionsWithDurationThirtyDaysAgo) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          totalCountSessinsVideoAllTime: totalCountVideoSessionsWithDuration,
          percentChange: percentChange,
        });
      }

      //узнаем прирост

      percentChange =
        ((totalCountVideoSessionsWithDurationLastThirtyDays -
          totalVideoSessionsWithDurationThirtyDaysAgo) /
          totalVideoSessionsWithDurationThirtyDaysAgo) *
        100;
      console.log("результат", percentChange);

      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }

      return res.status(200).json({
        status: "success",
        totalCountSessinsVideoAllTime: totalCountVideoSessionsWithDuration,
        percentChange: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVideoSessionCountForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          count: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_video_session")
          .count("videoSessionId as count")
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeStart) <= ?", end))
          .first();

        week.count = result.count || 0;
        console.log("count", result.count);
      }
      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVideoSessionCountForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          count: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const date = day.date;
        console.log("date:", date);
        const result = await db("metaenga_video_session")
          .count("videoSessionId as count")
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) = ?", date))
          .first();

        day.count = result.count || 0;
        console.log("count:", result.count);
      }
      dailyData.reverse();

      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVideoSessionCountForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          count: 0,
        };

        monthlyData.unshift(monthObject);
      }

      for (const month of monthlyData) {
        const [start, end] = month.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_video_session")
          .count("videoSessionId as count")
          .where("companyId", "=", company)
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(
            db.raw("DATE(timeStart) <= STR_TO_DATE(?, '%d.%m.%Y')", end)
          )
          .first();

        month.count = result.count || 0;
        console.log("count", result.count);
      }

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVideoData(req, res) {
    try {
      const company = req.params.company;

      const clientVideos = await db("metaenga_videos").select(
        "id",
        "videoName"
      );

      const ourVideoId = await db(`metaenga_video_company`)
        .select("video")
        .where("company", "=", company);

      const ourVideosId = ourVideoId.map((video) => video.video);

      console.log("clientVideos ", clientVideos);
      console.log("ourVideoId ", ourVideoId);

      const ourVideoIdName = await db(`metaenga_video_table`)
        .select("id", "videoName")
        .whereIn("id", ourVideosId);

      console.log("ourVideoIdName ", ourVideoIdName);
      console.log("clientVideos ", clientVideos);

      // в новый массив добавим все из ourVideoIdName и clientVideos
      const videoData = [];

      ourVideoIdName.forEach((item) => {
        videoData.push({
          id: item.id,
          videoName: item.videoName,
        });
      });

      clientVideos.forEach((item) => {
        const isExisting = videoData.some((video) => video.id === item.id);
        if (!isExisting) {
          videoData.push({
            id: item.id,
            videoName: item.videoName,
          });
        }
      });

      const resultDuration = await db("metaenga_video_session")
        .select("videoId")
        .sum("duration as totalDuration")
        .whereIn(
          "videoId",
          videoData.map((video) => video.id)
        )
        .andWhere("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .groupBy("videoId");

      const resultCount = await db("metaenga_video_session")
        .select("videoId")
        .count("videoSessionId as count")
        .whereIn(
          "videoId",
          videoData.map((video) => video.id)
        )
        .andWhere("companyId", "=", company)
        .groupBy("videoId");

      //  объект для хранения продолжительностей видео по айди
      const durationsByVideoId = {};
      resultDuration.forEach((row) => {
        durationsByVideoId[row.videoId] = row.totalDuration;
      });
      //  объект для хранения количества видео по айди
      const countByVideoId = {};
      resultCount.forEach((row) => {
        countByVideoId[row.videoId] = row.count;
      });
      const users = await db("metaenga_users").pluck("id");

      const usersVideo = await db("metaenga_video_user")
        .select("video")
        .count("video as videoCount")
        .where("company", "=", company)
        .whereIn("user", users)
        .groupBy("video");

      console.log("usersVideo ", usersVideo);

      const usersVideoMap = usersVideo.reduce((map, item) => {
        map[item.video] = item.videoCount;
        return map;
      }, {});

      const sessionsCompletedCounts = await db("metaenga_video_session")
        .select("videoId")
        .count("videoSessionId as sessionCount")
        .where("companyId", "=", company)
        .andWhere("watchedVideo", "=", 0)
        .whereIn(
          "videoId",
          videoData.map((video) => video.id)
        )
        .groupBy("videoId");

      // добавляем в videoData все остальное
      videoData.forEach((video) => {
        const { id, videoName } = video;
        video.count = countByVideoId[video.id] || 0;

        const duration = durationsByVideoId[video.id] || 0;
        const count = countByVideoId[video.id] || 0;
        video.averageView = count !== 0 ? duration / count : 0;
        video.videoAvailableToUsers = usersVideoMap[id] || 0;

        const sessionsCompletedCount = sessionsCompletedCounts.find(
          (sessionsCompletedCount) => sessionsCompletedCount.videoId === id
        );
        const sessionCompleted = sessionsCompletedCount
          ? sessionsCompletedCount.sessionCount
          : 0;
        video.completionRate =
          count > 0 ? (sessionCompleted / count) * 100 + "%" : 0 + "%";
      });

      return res.status(200).json({
        status: "success",
        data: videoData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getPlatformTimeUser(req, res) {
    try {
      const company = req.params.company;
      const user = req.params.user;

      const userCheck = await db("metaenga_users")
        .first("*")
        .andWhere("id", "=", user);
      console.log("userCheck ", userCheck);
      if (!userCheck) {
        return res.status(404).json({
          status: "error",
          data: "user not found",
        });
      }

      const userData = await db("metaenga_users")
        .select("name", "email")
        .andWhere("id", "=", user);

      const resultApp = await db("metaenga_vr_app_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .first();

      const resultWeb = await db("metaenga_vr_web_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .first();

      console.log("resultApp ", resultApp);
      console.log("resultWeb ", resultWeb);
      const resultAppInt = parseInt(resultApp.totalDuration, 10) || 0;
      const resultWebInt = parseInt(resultWeb.totalDuration, 10) || 0;

      const totalDurationAllTime = resultAppInt + resultWebInt;
      console.log("resultApp ", resultApp);
      console.log("resultWeb ", resultWeb);
      console.log("totalDurationAllTime ", totalDurationAllTime);
      //среднее значение за прошедшие 30 дней
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

      const resultAppLastThirtyDays = await db("metaenga_vr_app_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      const resultWebLastThirtyDays = await db("metaenga_vr_web_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      const resultAppIntLastThirtyDays =
        parseInt(resultAppLastThirtyDays.totalDuration, 10) || 0;
      const resultWebIntLastThirtyDays =
        parseInt(resultWebLastThirtyDays.totalDuration, 10) || 0;

      const totalDurationLastThirtyDays =
        resultAppIntLastThirtyDays + resultWebIntLastThirtyDays;
      //среднее значение от рождения христа и до 30 дней назад
      const resultAppThirtyDaysAgo = await db("metaenga_vr_app_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const resultWebThirtyDaysAgo = await db("metaenga_vr_web_session")
        .select("userId")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const resultAppIntThirtyDaysAgo =
        parseInt(resultAppThirtyDaysAgo.totalDuration, 10) || 0;
      const resultWebIntThirtyDaysAgo =
        parseInt(resultWebThirtyDaysAgo.totalDuration, 10) || 0;

      const totalDurationThirtyDaysAgo =
        resultAppIntThirtyDaysAgo + resultWebIntThirtyDaysAgo;

      let percentChange = 0;
      let percentChangeVrTime = 0;
      if (totalDurationThirtyDaysAgo == 0) {
        percentChange = "n/a";
      } else {
        percentChange =
          ((totalDurationLastThirtyDays - totalDurationThirtyDaysAgo) /
            totalDurationThirtyDaysAgo) *
          100;
        if (percentChange > 999) {
          percentChange = "999%+";
        } else if (percentChange < -999) {
          percentChange = "-999%";
        } else if (percentChange !== "n/a") {
          percentChange = percentChange.toFixed(2) + "%";
        }
      }

      if (resultAppIntThirtyDaysAgo == 0) {
        percentChangeVrTime = "n/a";
      } else {
        percentChangeVrTime =
          ((resultAppIntLastThirtyDays - resultAppIntThirtyDaysAgo) /
            resultAppIntThirtyDaysAgo) *
          100;
        if (percentChangeVrTime > 999) {
          percentChangeVrTime = "999%+";
        } else if (percentChangeVrTime < -999) {
          percentChangeVrTime = "-999%";
        } else if (percentChangeVrTime !== "n/a") {
          console.log("percentChangeVrTime ", percentChangeVrTime);
          percentChangeVrTime = percentChangeVrTime.toFixed(2) + "%";
        }
      }

      return res.status(200).json({
        status: "success",
        name: userData[0].name,
        email: userData[0].email,
        totalPlatformTime: totalDurationAllTime,
        percentChangePlatformTime: percentChange,
        totalVrTime: resultAppInt,
        percentChangeVrTime: percentChangeVrTime,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVideoTimeUser(req, res) {
    try {
      const company = req.params.company;
      const user = req.params.user;

      const userCheck = await db("metaenga_users")
        .first("*")
        .andWhere("id", "=", user);
      console.log("userCheck ", userCheck);
      if (!userCheck) {
        return res.status(404).json({
          status: "error",
          data: "user not found",
        });
      }

      const userData = await db("metaenga_users")
        .select("name", "email")
        .andWhere("id", "=", user);

      const resultVideo = await db("metaenga_video_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .first();

      //среднее значение за прошедшие 30 дней
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

      const resultVideoLastThirtyDays = await db("metaenga_video_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      //среднее значение от рождения христа и до 30 дней назад
      const resultVideoThirtyDaysAgo = await db("metaenga_video_session")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("userId", "=", user)
        .andWhere("duration", "!=", "")
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const resultVideoInt = parseInt(resultVideo.totalDuration, 10) || 0;
      const resultVideoLastThirtyDaysInt =
        parseInt(resultVideoLastThirtyDays.totalDuration, 10) || 0;
      const resultVideoThirtyDaysAgoInt =
        parseInt(resultVideoThirtyDaysAgo.totalDuration, 10) || 0;

      let percentChange = 0;
      if (resultVideoThirtyDaysAgoInt == 0) {
        percentChange = "n/a";
      } else {
        percentChange =
          ((resultVideoLastThirtyDaysInt - resultVideoThirtyDaysAgoInt) /
            resultVideoThirtyDaysAgoInt) *
          100;
        if (percentChange > 999) {
          percentChange = "999%+";
        } else if (percentChange < -999) {
          percentChange = "-999%";
        } else {
          percentChange = percentChange.toFixed(2) + "%";
        }
      }
      return res.status(200).json({
        status: "success",
        name: userData[0].name,
        email: userData[0].email,
        totalVideoTime: resultVideoInt,
        percentChangeVideoTime: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppAndWebSessionDurationUserForWeeks(req, res) {
    try {
      const company = req.params.company;
      const user = req.params.user;

      const userData = await db("metaenga_users")
        .select("name", "email")
        .andWhere("id", "=", user);

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          duration: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const resultApp = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("userId", "=", user)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        const resultWeb = await db("metaenga_vr_web_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("userId", "=", user)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        week.duration =
          (resultApp.totalDuration || 0) + (resultWeb.totalDuration || 0);
        console.log("Total Duration:", week.duration);
      }
      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        name: userData[0].name,
        email: userData[0].email,
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppAndWebSessionDurationUserForOneWeek(req, res) {
    try {
      const company = req.params.company;
      const user = req.params.user;

      const userData = await db("metaenga_users")
        .select("name", "email")
        .andWhere("id", "=", user);

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          duration: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const start = day.date;
        const end = day.date;
        console.log("date:", start);
        const resultApp = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("userId", "=", user)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();
        const resultWeb = await db("metaenga_vr_web_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("userId", "=", user)
          .andWhere("duration", "!=", "")
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        day.duration =
          (resultApp.totalDuration || 0) + (resultWeb.totalDuration || 0);
        console.log("Total Duration:", day.duration);
      }
      dailyData.reverse();
      return res.status(200).json({
        status: "success",
        name: userData[0].name,
        email: userData[0].email,
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVrAppAndWebSessionDurationUserForYEAR(req, res) {
    try {
      const company = req.params.company;
      const user = req.params.user;

      const userData = await db("metaenga_users")
        .select("name", "email")
        .andWhere("id", "=", user);

      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          duration: 0,
        };

        monthlyData.unshift(monthObject);
      }
      for (let i = 0; i < monthlyData.length; i++) {
        const month = monthlyData[i];
        const [start, end] = month.period.split(" - ");

        console.log("start end:", start, end);

        const resultApp = await db("metaenga_vr_app_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("userId", "=", user)
          .andWhere("duration", "!=", "")
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(db.raw("DATE(timeEnd) <= STR_TO_DATE(?, '%d.%m.%Y')", end))
          .first();

        const resultWeb = await db("metaenga_vr_web_session")
          .select(db.raw("SUM(duration) as totalDuration"))
          .where("companyId", "=", company)
          .andWhere("userId", "=", user)
          .andWhere("duration", "!=", "")
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(db.raw("DATE(timeEnd) <= STR_TO_DATE(?, '%d.%m.%Y')", end))
          .first();

        month.duration =
          (resultApp.totalDuration || 0) + (resultWeb.totalDuration || 0);
        console.log("Total Duration:", month.duration);
      }

      return res.status(200).json({
        status: "success",
        name: userData[0].name,
        email: userData[0].email,
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getCompletedVrTrainingSessionCountForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          count: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_training_session")
          .count("trainingSessionId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 0)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeEnd) <= ?", end))
          .first();

        week.count = result.count || 0;
        console.log("count", result.count);
      }

      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getCompletedVrTrainingSessionCountForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          count: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const date = day.date;
        console.log("date:", date);
        const result = await db("metaenga_vr_training_session")
          .count("trainingSessionId as count")
          .andWhere("status", "=", 0)
          .where("companyId", "=", company)
          .andWhere(db.raw("DATE(timeStart) = ?", date))
          .first();

        day.count = result.count || 0;
        console.log("count:", result.count);
      }
      dailyData.reverse();

      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getCompletedVrTrainingSessionCountForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;

        const start = `${startDay < 10 ? "0" + startDay : startDay}.${
          startMonth < 10 ? "0" + startMonth : startMonth
        }.${startDate.getFullYear()}`;
        const end = `${endDay < 10 ? "0" + endDay : endDay}.${
          endMonth < 10 ? "0" + endMonth : endMonth
        }.${endDate.getFullYear()}`;

        const period = `${start} - ${end}`;

        const monthObject = {
          period: period,
          count: 0,
        };

        monthlyData.unshift(monthObject);
      }

      for (const month of monthlyData) {
        const [start, end] = month.period.split(" - ");
        console.log("start end:", start, end);
        const result = await db("metaenga_vr_training_session")
          .count("trainingSessionId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 0)
          .andWhere(
            db.raw("DATE(timeStart) >= STR_TO_DATE(?, '%d.%m.%Y')", start)
          )
          .andWhere(
            db.raw("DATE(timeStart) <= STR_TO_DATE(?, '%d.%m.%Y')", end)
          )
          .first();

        month.count = result.count || 0;
        console.log("count", result.count);
      }

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getActiveUsersForWeeks(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const weeklyData = [];

      for (let i = 0; i < 12; i++) {
        const startDate = new Date();
        startDate.setDate(currentDate.getDate() - (i + 1) * 7 + 1);
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() - i * 7);

        const weekObject = {
          period: `${startDate.toISOString().split("T")[0]} - ${
            endDate.toISOString().split("T")[0]
          }`,
          count: 0,
        };

        weeklyData.push(weekObject);
      }

      for (const week of weeklyData) {
        const [start, end] = week.period.split(" - ");
        const userSet = new Set();

        // Запрос для получения уникальных userId из таблицы metaenga_vr_app_session
        const appSessionUsers = await db("metaenga_vr_app_session")
          .select("userId")
          .where("companyId", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeStart) <= ?", end));

        // Добавление userId в множество userSet
        appSessionUsers.forEach((row) => {
          userSet.add(row.userId);
        });

        // Запрос для получения уникальных userId из таблицы metaenga_vr_web_session
        const webSessionUsers = await db("metaenga_vr_web_session")
          .select("userId")
          .where("companyId", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeStart) <= ?", end));

        // Добавление userId в множество userSet
        webSessionUsers.forEach((row) => {
          userSet.add(row.userId);
        });

        // Подсчет количества уникальных userId в текущем промежутке
        const count = userSet.size;

        week.count = count || 0;
        console.log("start-end", start, end);
        console.log("userSet", userSet);
        console.log("count", count);
      }

      weeklyData.reverse();

      return res.status(200).json({
        status: "success",
        data: weeklyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getActiveUsersForOneWeek(req, res) {
    try {
      const company = req.params.company;

      const currentDate = new Date();
      const dailyData = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        const dayObject = {
          date: formattedDate,
          count: 0,
        };

        dailyData.push(dayObject);
      }

      for (const day of dailyData) {
        const date = day.date;
        const userSet = new Set();

        // Запрос для получения уникальных userId из таблицы metaenga_vr_app_session
        const appSessionUsers = await db("metaenga_vr_app_session")
          .select("userId")
          .where("companyId", company)
          .andWhere(db.raw("DATE(timeStart) = ?", date));

        // Добавление userId в множество userSet
        appSessionUsers.forEach((row) => {
          userSet.add(row.userId);
        });

        // Запрос для получения уникальных userId из таблицы metaenga_vr_web_session
        const webSessionUsers = await db("metaenga_vr_web_session")
          .select("userId")
          .where("companyId", company)
          .andWhere(db.raw("DATE(timeStart) = ?", date));

        // Добавление userId в множество userSet
        webSessionUsers.forEach((row) => {
          userSet.add(row.userId);
        });

        // Подсчет количества уникальных userId в текущем промежутке
        const count = userSet.size;

        day.count = count || 0;
        console.log("count", count);
      }
      dailyData.reverse();

      return res.status(200).json({
        status: "success",
        data: dailyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getActiveUsersForYEAR(req, res) {
    try {
      const company = req.params.company;
      const currentDate = new Date();
      const monthlyData = [];

      for (let i = 0; i < 12; i++) {
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

      const userSet = new Set();
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

        // Запрос для получения уникальных userId из таблицы metaenga_vr_app_session
        const appSessionUsers = await db("metaenga_vr_app_session")
          .select("userId")
          .where("companyId", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeStart) <= ?", end));

        console.log("start-end", start, end);
        console.log("appSessionUsers", appSessionUsers);

        // Добавление userId в множество userSet
        appSessionUsers.forEach((row) => {
          userSet.add(row.userId);
        });

        // Запрос для получения уникальных userId из таблицы metaenga_vr_web_session
        const webSessionUsers = await db("metaenga_vr_web_session")
          .select("userId")
          .where("companyId", company)
          .andWhere(db.raw("DATE(timeStart) >= ?", start))
          .andWhere(db.raw("DATE(timeStart) <= ?", end));

        console.log("start-end", start, end);
        console.log("webSessionUsers", webSessionUsers);

        // Добавление userId в множество userSet
        webSessionUsers.forEach((row) => {
          userSet.add(row.userId);
        });

        // Подсчет количества уникальных userId в текущем промежутке
        const count = userSet.size;

        month.count = count || 0;

        console.log("start-end", start, end);
        console.log("userSet", userSet);
        console.log("count", count);
      }

      monthlyData.reverse();

      return res.status(200).json({
        status: "success",
        data: monthlyData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getPercentCompletedToUncompletedTrainings(req, res, next) {
    try {
      //дата зараз та 30 днів тому
      const company = req.params.company;
      console.log(company);
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
      //тотал юзерс зараз
      const totalTrainingsResult = await db("metaenga_training_company")
        .pluck("training")
        .where("company", "=", company);

      console.log("totalTrainingsResult", totalTrainingsResult);

      let completed = 0;
      let completedLastMonth = 0;
      let completedThirtyDaysAgo = 0;

      for (const id of totalTrainingsResult) {
        // Проверка наличия первого id в таблице metaenga_vr_training_session
        const trainingSession = await db("metaenga_vr_training_session")
          .select("trainingId")
          .where("trainingId", id)
          .andWhere("companyId", company)
          .andWhere("status", 0)
          .first();

        if (trainingSession) {
          completed++;
        }
      }

      console.log("Completed:", completed);
      //тотал соотношение пройденого ко всему
      let completedToUncompleted;
      if (completed == 0 || totalTrainingsResult.length == 0) {
        completedToUncompleted = 0;
      } else {
        completedToUncompleted =
          (completed / totalTrainingsResult.length) * 100;
      }
      console.log("completedToUncompleted:", completedToUncompleted);

      //считаем такое же соотношение исключительно для последних 30 дней
      for (const id of totalTrainingsResult) {
        // Проверка наличия первого id в таблице metaenga_vr_training_session
        const trainingSession = await db("metaenga_vr_training_session")
          .select("trainingId")
          .where("trainingId", id)
          .andWhere("companyId", company)
          .andWhere("status", 0)
          .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
          .first();

        if (trainingSession) {
          completedLastMonth++;
        }
      }
      let completedToUncompletedLastMonth;
      if (completedLastMonth == 0 || totalTrainingsResult.length == 0) {
        completedToUncompletedLastMonth = 0;
      } else {
        completedToUncompletedLastMonth =
          (completedLastMonth / totalTrainingsResult.length) * 100;
      }

      //считаем такое же соотношение со дня рождения христа до последних 30 дней
      for (const id of totalTrainingsResult) {
        // Проверка наличия первого id в таблице metaenga_vr_training_session
        const trainingSession = await db("metaenga_vr_training_session")
          .select("trainingId")
          .where("trainingId", id)
          .andWhere("companyId", company)
          .andWhere("status", 0)
          .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
          .first();

        if (trainingSession) {
          completedThirtyDaysAgo++;
        }
      }
      let completedToUncompletedThirtyDaysAgo;
      if (completedThirtyDaysAgo == 0 || totalTrainingsResult.length == 0) {
        completedToUncompletedThirtyDaysAgo = 0;
      } else {
        completedToUncompletedThirtyDaysAgo =
          (completedThirtyDaysAgo / totalTrainingsResult.length) * 100;
      }

      console.log("completedLastMonth:", completedLastMonth);
      console.log(
        "completedToUncompletedLastMonth:",
        completedToUncompletedLastMonth
      );
      console.log("completedThirtyDaysAgo:", completedThirtyDaysAgo);
      console.log(
        "completedToUncompletedThirtyDaysAgo:",
        completedToUncompletedThirtyDaysAgo
      );

      let percentChange = 0;

      const companyCreationDate = await db("company")
        .first("date")
        .where("id", company);

      const currentDateMs = new Date().getTime();
      const companyCreationDateObj = new Date(
        companyCreationDate.date
      ).getTime();
      const diffInMs = Math.abs(currentDateMs - companyCreationDateObj);

      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      if (completedToUncompletedThirtyDaysAgo == 0 || diffInDays <= 30) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          totatlPercent: completedToUncompleted,
          percentChangeLastThirtyDays: percentChange,
        });
      } else {
        percentChange =
          ((completedToUncompletedLastMonth -
            completedToUncompletedThirtyDaysAgo) /
            completedToUncompletedThirtyDaysAgo) *
          100;
      }
      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }

      return res.status(200).json({
        status: "success",
        totatlPercent: completedToUncompleted,
        percentChangeLastThirtyDays: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getAvgVRCompletedTrainingSessionPerUser(req, res, next) {
    try {
      //дата зараз, 30 днів тому та 60 днів тому
      const company = req.params.company;
      console.log(company);
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

      //тотал юзерс зараз
      const totalUsersResult = await db("metaenga_users")
        .count("id as count")
        .first();
      const totalUsers = parseInt(totalUsersResult.count, 10) || 0;

      //окрема змінна з тотал юзерс для циклу аби її значення можна було змінювати в цьому ж циклі
      let totalUsersForCycle = totalUsers;
      //об'єкти для зберігання кількості користувачів по дням
      const dailyUserCounts = {};
      const dailyUserCountsThirtyDaysAgo = {};

      // Цикл для підрахунку юзерів за останні 30 днів
      for (let i = 1; i <= 30; i++) {
        const currentDay = new Date();
        currentDay.setDate(currentDay.getDate() - i);
        const formattedCurrentDay = currentDay
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");

        // Рахуємо кількість користувачів яких було додано в поточний день
        const addedUsersResult = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 1)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay.split(" ")[0]}'`)
          .first();

        // Рахуємо кількість користувачів яких було видалено в поточний день
        const deletedUsersResult = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 0)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay.split(" ")[0]}'`)
          .first();

        const addedCount = parseInt(addedUsersResult.count, 10) || 0;
        const deletedCount = parseInt(deletedUsersResult.count, 10) || 0;

        // Оновлення загальної кількості користувачів на поточний день
        const totalUsersOnCurrentDay =
          totalUsersForCycle + deletedCount - addedCount;

        console.log(" formattedCurrentDay ", formattedCurrentDay);
        console.log(" totalUsersForCycle ", totalUsersForCycle);
        console.log(" addedCount ", addedCount);
        console.log(" deletedCount ", deletedCount);
        console.log(" totalUsersOnCurrentDay ", totalUsersOnCurrentDay);

        // dailyUserCounts зберігає кількість користувачів кожного дня за останні 30 днів
        dailyUserCounts[formattedCurrentDay] = totalUsersOnCurrentDay;

        // Оновлення загальної кількості користувачів для наступного дня
        totalUsersForCycle = totalUsersOnCurrentDay;
      }

      const sumLastMonth = Object.values(dailyUserCounts).reduce(
        (acc, count) => acc + count,
        0
      );
      console.log("Сумма:", sumLastMonth);
      console.log(" dailyUserCounts[formattedCurrentDay] ", dailyUserCounts);
      console.log(" totalUsers ", totalUsers);

      // Загальна кількість користувачів, від якої будемо відштовхуватись при розрахунку їх ще 30 днів назад
      //(вона дорівнює кількості користувачів за останній день попереднього циклу)
      let totalUsersForCycleThirtyDaysAgo = totalUsersForCycle;
      console.log(
        " totalUsersForCycleThirtyDaysAgo ",
        totalUsersForCycleThirtyDaysAgo
      );

      // Цикл для підрахунку юзерів за 30 днів 30 днів назад
      for (let i = 1; i <= 30; i++) {
        const currentDay = new Date(thirtyDaysAgo);
        currentDay.setDate(currentDay.getDate() - i);
        const formattedCurrentDay = currentDay.toISOString().split("T")[0];

        const addedUsersResultThirtyDaysAgo = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 1)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay}'`)
          .first();

        const deletedUsersResultThirtyDaysAgo = await db("metaenga_user_logs")
          .count("companyId as count")
          .where("companyId", "=", company)
          .andWhere("status", "=", 0)
          .andWhereRaw(`DATE(time) = '${formattedCurrentDay}'`)
          .first();

        const addedCountThirtyDaysAgo =
          parseInt(addedUsersResultThirtyDaysAgo.count, 10) || 0;
        const deletedCountThirtyDaysAgo =
          parseInt(deletedUsersResultThirtyDaysAgo.count, 10) || 0;

        const totalUsersOnCurrentDayThirtyDaysAgo =
          totalUsersForCycleThirtyDaysAgo +
          deletedCountThirtyDaysAgo -
          addedCountThirtyDaysAgo;

        console.log("formattedCurrentDay", formattedCurrentDay);
        console.log("addedCountThirtyDaysAgo", addedCountThirtyDaysAgo);
        console.log(
          "deletedCountThirtyDaysAgo",
          deletedUsersResultThirtyDaysAgo.count
        );
        console.log(
          "totalUsersOnCurrentDay",
          totalUsersOnCurrentDayThirtyDaysAgo
        );

        dailyUserCountsThirtyDaysAgo[formattedCurrentDay] =
          totalUsersOnCurrentDayThirtyDaysAgo;

        totalUsersForCycleThirtyDaysAgo = totalUsersOnCurrentDayThirtyDaysAgo;
      }

      const sumThirtyDaysAgo = Object.values(
        dailyUserCountsThirtyDaysAgo
      ).reduce((acc, count) => acc + count, 0);
      console.log("Сумма:", sumThirtyDaysAgo);
      console.log(
        " dailyUserCountsThirtyDaysAgo[formattedCurrentDay] ",
        dailyUserCountsThirtyDaysAgo
      );
      console.log(
        " totalUsersForCycleThirtyDaysAgo ",
        totalUsersForCycleThirtyDaysAgo
      );

      //тотал завершених сесій зараз
      const totalTrainingResult = await db("metaenga_vr_training_session")
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .andWhere("status", "=", 0)
        .first();

      //тотатл завершених сесій за 30 днів
      const trainingLastMonthResult = await db("metaenga_vr_training_session")
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .andWhere("status", "=", 0)
        .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
        .first();

      //тотатл тренінг сесій  30 днів тому
      const trainingThirtyDaysAgoResult = await db(
        "metaenga_vr_training_session"
      )
        .count("trainingSessionId as count")
        .where("companyId", "=", company)
        .andWhere("status", "=", 0)
        .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
        .first();

      const totalTraining = parseInt(totalTrainingResult.count, 10) || 0;
      const trainingLastMonth =
        parseInt(trainingLastMonthResult.count, 10) || 0;
      const trainingThirtyDaysAgo =
        parseInt(trainingThirtyDaysAgoResult.count, 10) || 0;

      //середня кількість тренінгів на юзера зараз
      let avgTrainingSessionsPerUserNow;
      if (totalUsers == 0) {
        avgTrainingSessionsPerUserNow = 0;
      } else {
        avgTrainingSessionsPerUserNow = totalTraining / totalUsers;
      }

      //середня кількість тренінгів на юзера за останні 30 днів
      let avgTrainingSessionsPerUserLastMonth;
      if (sumLastMonth == 0) {
        avgTrainingSessionsPerUserLastMonth = 0;
      } else {
        avgTrainingSessionsPerUserLastMonth = trainingLastMonth / sumLastMonth;
      }

      //середня кількість тренінгів на юзера 30 днів тому
      let avgTrainingSessionsPerUserThirtyDaysAgo;
      if (sumThirtyDaysAgo == 0) {
        avgTrainingSessionsPerUserThirtyDaysAgo = 0;
      } else {
        avgTrainingSessionsPerUserThirtyDaysAgo =
          trainingThirtyDaysAgo / sumThirtyDaysAgo;
      }

      console.log(" totalTraining ", totalTraining);
      console.log(" trainingLastMonth ", trainingLastMonth);
      console.log(" trainingThirtyDaysAgo ", trainingThirtyDaysAgo);
      console.log(
        " avgTrainingSessionsPerUserLastMonth ",
        avgTrainingSessionsPerUserLastMonth
      );
      console.log(
        " avgTrainingSessionsPerUserThirtyDaysAgo ",
        avgTrainingSessionsPerUserThirtyDaysAgo
      );

      let percentChange = 0;
      if (avgTrainingSessionsPerUserThirtyDaysAgo == 0) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          avgTrainingSessionsPer: avgTrainingSessionsPerUserNow,
          percentChangeLastThirtyDays: percentChange,
        });
      } else {
        percentChange =
          ((avgTrainingSessionsPerUserLastMonth -
            avgTrainingSessionsPerUserThirtyDaysAgo) /
            avgTrainingSessionsPerUserThirtyDaysAgo) *
          100;
      }
      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }

      return res.status(200).json({
        status: "success",
        avgTrainingSessionsPerUser: avgTrainingSessionsPerUserNow,
        percentChangeLastThirtyDays: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getPercentCompletedToUncompletedVideo(req, res, next) {
    try {
      //дата зараз та 30 днів тому
      const company = req.params.company;
      console.log(company);
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

      const clientVideos = await db("metaenga_videos").select("id");

      const ourVideoId = await db(`metaenga_video_company`)
        .select("video")
        .where("company", "=", company);

      const ourVideosId = ourVideoId.map((video) => video.video);

      const ourVideoIdData = await db(`metaenga_video_table`)
        .select("id")
        .whereIn("id", ourVideosId);

      // в новый массив добавим все из ourVideoIdName и clientVideos
      const videoData = [];

      ourVideoIdData.forEach((item) => {
        videoData.push({
          id: item.id,
        });
      });

      clientVideos.forEach((item) => {
        const isExisting = videoData.some((video) => video.id === item.id);
        if (!isExisting) {
          videoData.push({
            id: item.id,
          });
        }
      });

      let completed = 0;
      let completedLastMonth = 0;
      let completedThirtyDaysAgo = 0;

      for (const item of videoData) {
        // Проверка наличия первого id в таблице metaenga_vr_training_session
        const videoSession = await db("metaenga_video_session")
          .select("videoId")
          .where("videoId", item.id)
          .andWhere("companyId", company)
          .andWhere("watchedVideo", 0)
          .first();

        if (videoSession) {
          completed++;
        }
      }

      console.log("Completed:", completed);
      //тотал соотношение пройденого ко всему
      let completedToUncompleted;
      if (completed == 0 || videoData.length == 0) {
        completedToUncompleted = 0;
      } else {
        completedToUncompleted = (completed / videoData.length) * 100;
      }
      console.log("completedToUncompleted:", completedToUncompleted);

      //считаем такое же соотношение исключительно для последних 30 дней
      for (const item of videoData) {
        // Проверка наличия первого id в таблице metaenga_vr_training_session
        const videoSession = await db("metaenga_video_session")
          .select("videoId")
          .where("videoId", item.id)
          .andWhere("companyId", company)
          .andWhere("watchedVideo", 0)
          .whereBetween("timeStart", [thirtyDaysAgo, currentDate])
          .first();

        if (videoSession) {
          completedLastMonth++;
        }
      }
      let completedToUncompletedLastMonth;
      if (completedLastMonth == 0 || videoData.length == 0) {
        completedToUncompletedLastMonth = 0;
      } else {
        completedToUncompletedLastMonth =
          (completedLastMonth / videoData.length) * 100;
      }

      //считаем такое же соотношение со дня рождения христа до последних 30 дней
      for (const item of videoData) {
        // Проверка наличия первого id в таблице metaenga_vr_training_session
        const videoSession = await db("metaenga_video_session")
          .select("videoId")
          .where("videoId", item.id)
          .andWhere("companyId", company)
          .andWhere("watchedVideo", 0)
          .whereBetween("timeStart", [sixtyDaysAgo, thirtyDaysAgo])
          .first();

        if (videoSession) {
          completedThirtyDaysAgo++;
        }
      }
      let completedToUncompletedThirtyDaysAgo;
      if (completedThirtyDaysAgo == 0 || videoData.length == 0) {
        completedToUncompletedThirtyDaysAgo = 0;
      } else {
        completedToUncompletedThirtyDaysAgo =
          (completedThirtyDaysAgo / videoData.length) * 100;
      }

      console.log("completedLastMonth:", completedLastMonth);
      console.log(
        "completedToUncompletedLastMonth:",
        completedToUncompletedLastMonth
      );
      console.log("completedThirtyDaysAgo:", completedThirtyDaysAgo);
      console.log(
        "completedToUncompletedThirtyDaysAgo:",
        completedToUncompletedThirtyDaysAgo
      );
      console.log("ourVideoId:", ourVideoId);
      console.log("clientVideos:", clientVideos);
      let percentChange = 0;
      if (completedToUncompletedThirtyDaysAgo == 0) {
        percentChange = "n/a";
        return res.status(200).json({
          status: "success",
          totatlPercent: completedToUncompleted,
          percentChangeLastThirtyDays: percentChange,
        });
      } else {
        percentChange =
          ((completedToUncompletedLastMonth -
            completedToUncompletedThirtyDaysAgo) /
            completedToUncompletedThirtyDaysAgo) *
          100;
      }
      if (percentChange > 999) {
        percentChange = "999%+";
      } else {
        percentChange = percentChange.toFixed(2) + "%";
      }

      return res.status(200).json({
        status: "success",
        totatlPercent: completedToUncompleted,
        percentChangeLastThirtyDays: percentChange,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getAvgVRTrainingPerUser(req, res, next) {
    try {
      //дата зараз та 30 днів тому
      const company = req.params.company;
      console.log(company);

      const totalUsersResult = await db("metaenga_users")
        .count("id as count")
        .first();
      const totalUsers = parseInt(totalUsersResult.count, 10) || 0;

      const trainingUser = await db("metaenga_training_user")
        .count("user as count")
        .where("company", "=", company)
        .first();

      const sum = parseInt(trainingUser.count, 10) || 0;

      console.log(totalUsers);
      console.log(sum);

      let avgTrainingPerUser = 0;
      if (totalUsers == 0) {
        avgTrainingPerUser = sum / totalUsers;
      } else {
        avgTrainingPerUser = sum / totalUsers;
      }
      return res.status(200).json({
        status: "success",
        avgTrainingPerUser: avgTrainingPerUser,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getTrainingSessionData(req, res) {
    try {
      const company = req.params.company;
      const trainingId = req.params.trainingId;
      const checkCompany = await db("company").first("*").where({
        id: company,
      });

      if (!checkCompany) {
        return res.status(404).json({
          status: "company not found",
        });
      }

      const checkTraining = await db("metaenga_training_company")
        .first("*")
        .where({
          company: company,
          training: trainingId,
        });

      if (!checkTraining) {
        return res.status(404).json({
          status: "training not found",
        });
      }
      const data = await db("metaenga_vr_training_session")
        .select(
          "userId",
          "trainingSessionId",
          "timeStart",
          "timeEnd",
          "duration"
        )
        .where("companyId", "=", company)
        .andWhere("trainingId", "=", trainingId);

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

  async getTrainingSessionDataByUser(req, res) {
    try {
      const company = req.params.company;
      const user = req.params.user;
      const trainingId = req.params.trainingId;

      const checkCompany = await db("company").first("*").where({
        id: company,
      });

      if (!checkCompany) {
        return res.status(404).json({
          status: "company not found",
        });
      }

      const checkUser = await db("metaenga_users").first("*").where({
        id: user,
      });

      if (!checkUser) {
        return res.status(404).json({
          status: "user not found",
        });
      }

      const checkTraining = await db("metaenga_training_company")
        .first("*")
        .where({
          company: company,
          training: trainingId,
        });

      if (!checkTraining) {
        return res.status(404).json({
          status: "training not found",
        });
      }
      const data = await db("metaenga_vr_training_session")
        .select(
          "userId",
          "trainingSessionId",
          "timeStart",
          "timeEnd",
          "duration"
        )
        .where("companyId", "=", company)
        .andWhere("trainingId", "=", trainingId)
        .andWhere("userId", "=", user);

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

  async deleteDevice(req, res) {
    try {
      const company = req.params.company;
      const deviceId = req.params.deviceId;
      const checkCompany = await db("company").first("*").where({
        id: company,
      });

      if (!checkCompany) {
        return res.status(404).json({
          status: "company not found",
        });
      }

      const checkDevice = await db("VR").first("*").where({
        company: company,
        id: deviceId,
      });

      if (!checkDevice) {
        return res.status(404).json({
          status: "device not found",
        });
      }

      await db("VR")
        .where({
          company: company,
          id: deviceId,
        })
        .del();
      await db("metaenga_device_logs").insert({
        company_id: company,
        device_id: deviceId,
        status: 0,
        date: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
      });

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async updateNameDevice(req, res) {
    try {
      const company = req.params.company;
      const deviceId = req.params.deviceId;
      const newName = req.params.newName;

      const checkCompany = await db("company").first("*").where({
        id: company,
      });

      if (!checkCompany) {
        return res.status(404).json({
          status: "company not found",
        });
      }

      const checkDevice = await db("VR").first("*").where({
        company: company,
        id: deviceId,
      });

      if (!checkDevice) {
        return res.status(404).json({
          status: "device not found",
        });
      }

      await db("VR")
        .where({
          company: company,
          id: deviceId,
        })
        .update({
          name: newName,
        });

      return res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async addTrainingToPlan(req, res, next) {
    try {
      const plan = req.params.plan;
      const id = req.params.id;

      const check = await db("trainings").first("*").where({
        id: id,
      });

      if (!check) {
        return res.status(404).json({
          status: "no such training",
        });
      }

      let tableName;

      switch (plan) {
        case "free":
          tableName = "metaenga_free";
          break;
        case "standart":
          tableName = "metaenga_standart";
          break;
        case "premium":
          tableName = "metaenga_premium";
          break;
        default:
          return res
            .status(400)
            .json({ status: "error", error: "Invalid plan" });
      }
      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      await db("tableName").insert({
        id: id,
        time: time,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }

  async getVRTrainingData(req, res) {
    try {
      const company = req.params.company;

      const companyTraining = await db("metaenga_training_company")
        .select()
        .where("company", "=", company);

      const trainingIds = companyTraining.map((training) => training.training);

      const demoId = "101";
      trainingIds.push(demoId);

      console.log(trainingIds);

      const trainingNames = await db("trainings")
        .select("id", "name")
        .whereIn("id", trainingIds);

      const demoObject = {
        id: "101",
        name: "Feeder Protection Relay Training for Operators",
      };
      trainingNames.push(demoObject);

      const sessionCounts = await db("metaenga_vr_training_session")
        .select("trainingId")
        .count("trainingSessionId as sessionCount")
        .where("companyId", "=", company)
        .whereIn("trainingId", trainingIds)
        .groupBy("trainingId");

      const totalDurationResult = await db("metaenga_vr_training_session")
        .select("trainingId")
        .sum("duration as totalDuration")
        .where("companyId", "=", company)
        .andWhere("duration", "!=", "")
        .whereIn("trainingId", trainingIds)
        .groupBy("trainingId");

      const sessionsCompletedCounts = await db("metaenga_vr_training_session")
        .select("trainingId")
        .count("trainingSessionId as sessionCount")
        .where("companyId", "=", company)
        .andWhere("status", "=", 0)
        .whereIn("trainingId", trainingIds)
        .groupBy("trainingId");

      const totalDurationsMap = totalDurationResult.reduce((map, item) => {
        map[item.trainingId] = item.totalDuration;
        return map;
      }, {});

      const usersCountResult = await db("metaenga_users")
        .where("company_id", "=", company)
        .count("id as count")
        .first();

      const usersCount = usersCountResult.count;

      const usersTraining = await db("metaenga_training_user as tu")
        .select("tu.training")
        .count("tu.training as trainingCount")
        .innerJoin("metaenga_users as u", "tu.user", "u.id")
        .where("tu.company", "=", company)
        .groupBy("tu.training");

      console.log("usersTraining ", usersTraining);

      const usersTrainingMap = usersTraining.reduce((map, item) => {
        map[item.training] = item.trainingCount;
        return map;
      }, {});

      const trainingData = trainingNames.map((training) => {
        const { id, name } = training;
        const session = sessionCounts.find(
          (session) => session.trainingId === id
        );
        const sessionsCompletedCount = sessionsCompletedCounts.find(
          (sessionsCompletedCount) => sessionsCompletedCount.trainingId === id
        );
        const sessionCount = session ? session.sessionCount : 0;
        const sessionCompleted = sessionsCompletedCount
          ? sessionsCompletedCount.sessionCount
          : 0;
        const totalDuration = totalDurationsMap[id] || 0;
        const averageDuration =
          sessionCount > 0 ? totalDuration / sessionCount : 0;
        const completionRate =
          sessionCount > 0 ? (sessionCompleted / sessionCount) * 100 : 0;
        const trainingAvailableToUsers =
          usersTrainingMap[id] + usersCount || usersCount;

        return {
          id: id,
          name: name,
          sessionCount: sessionCount,
          averageDuration: averageDuration,
          completionRate: completionRate + "%",
          trainingAvailableToUsers: trainingAvailableToUsers,
        };
      });

      return res.status(200).json({
        status: "success",
        data: trainingData,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
}
function formatDate(date) {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(
    date.getDate()
  )}`;
}

function padZero(num) {
  return num.toString().padStart(2, "0");
}

module.exports = new Stats();
