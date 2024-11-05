const db = require("../db");
let crypto = require("crypto");
const fetch = require("node-fetch");
const con = require("../db");
class ClassRoom {
  async createClassRoom(req, res) {
    try {
      const { name, adminId, companyId } = req.body;
      const checkName = await db("platformclassroom").first("*").where({
        classname: name,
      });
      if (checkName)
        return res.status(400).json({
          status: "error",
          message: "class name already exist",
        });
      const user = await db("userlink").first("*").where({
        user: adminId,
      });
      if (user.company !== companyId) {
        return res.status(400).json({
          status: "error",
          message: "not your company",
        });
      }
      if (!user)
        return res.status(404).json({
          status: "error",
          message: "user not found",
        });
      if (user.role === "ADMIN" || user.role === "OWNER") {
        let hash = await crypto.createHash("md5").update(name).digest("hex");
        let classVideos = [];
        let classVideosJSON = JSON.stringify(classVideos);
        await db("platformclassroom").insert({
          classname: name,
          adminid: adminId,
          companyid: user.company,
          classroomvideo: classVideosJSON,
          id: hash,
        });

        return res.status(200).json({
          status: "success",
          message: "class created",
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: "wrong permission",
        });
      }
    } catch (err) {
      return res.status(500).json({
        status: "error",
        error: err,
      });
    }
  }
  async DeleteVideo(req, res) {
    try {
      const { videoId, adminId, companyId } = req.body;
      const checkAdmin = await db("userlink").first("*").where({
        user: adminId,
      });
      if (checkAdmin.company !== companyId) {
        return res.status(400).json({
          status: "error",
          message: "not your company",
        });
      }
      if (!checkAdmin)
        return res.status(404).json({
          status: "error",
          message: "user not found",
        });
      const videoTable = `video-${companyId}`;
      if (checkAdmin.role === "ADMIN" || checkAdmin.role === "OWNER") {
        const checkVideo = await db("metaenga_videos").first("*").where({
          id: videoId,
        });
        if (!checkVideo)
          return res.status(404).json({
            status: "error",
            message: "video not found",
          });
        const options = {
          method: "DELETE",
          headers: {
            "content-type": "application/octet-stream",
            AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
          },
        };
        await fetch(
          `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${checkVideo.serverName}`,
          options
        )
          .then((response) => response.json())
          .then((response) => console.log(response))
          .catch((err) => console.error(err));
        await db("metaenga_videos")
          .where({
            id: videoId,
          })
          .del();

        await db("metaenga_video_logs").insert({
          company_id: companyId,
          status: 0,
          date: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
        });
        return res.status(200).json({
          status: "success",
          message: "deleted",
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: "wrong permission",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }
  }
  async deleteClassRoom(req, res) {
    try {
      const { classId, adminId, companyId } = req.body;
      const checkAdmin = await db("userlink").first("*").where({
        user: adminId,
      });
      if (checkAdmin.company !== companyId) {
        return res.status(400).json({
          status: "error",
          message: "not your company",
        });
      }
      if (checkAdmin.role == "ADMIN" || checkAdmin.role == "OWNER") {
        const checkClass = await db("platformclassroom").first("*").where({
          id: classId,
        });
        if (!checkClass)
          return res.status(404).json({
            status: "error",
            message: "class not found",
          });
        await db("platformclassroom")
          .where({
            id: classId,
          })
          .del();

        return res.status(200).json({
          status: "success",
          message: "deleted",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }
  }
  async addVideoToClassRoom(req, res) {
    try {
      const { videoName, classId, adminId, companyId } = req.body;
      const checkClass = await db("platformclassroom").first("*").where({
        id: classId,
      });
      const checkAdmin = await db("userlink").first("*").where({
        user: adminId,
      });
      const videoTable = `video-${companyId}`;

      if (!checkAdmin)
        return res.status(404).json({
          status: "error",
          message: "user not found",
        });
      if (checkAdmin.company !== companyId)
        return res.status(400).json({
          status: "error",
          message: "not your company",
        });
      if (!checkClass)
        return res.status(404).json({
          status: "error",
          message: "class not found",
        });
      if (checkAdmin.role === "ADMIN" || checkAdmin.role === "OWNER") {
        for (let i = 0, len = videoName.length; i < len; ++i) {
          const checkVideo = await db("metaenga_videos").first("*").where({
            videoName: videoName[i],
          });
          if (!checkVideo) {
            return res.status(404).json({
              status: "error",
              message: "video not found",
            });
          }
          if (checkClass.classroomvideo == null) {
            let classVideos = [];
            classVideos.push(videoName[i]);
            let classVideosJSON = JSON.stringify(classVideos);
            let ok = await db("platformckassroom")
              .where({ id: classId })
              .andWhere({ adminid: adminId })
              .update({ classroomvideo: classVideosJSON });
          } else {
            let classVideos = checkClass.classroomvideo;
            const a = classVideos.find((el) => el === videoName[i]);
            if (a === videoName[i]) {
              return res.status(400).json({
                status: "error",
                message: "video already in class",
              });
            }
            classVideos.push(videoName[i]);
            let classVideosJSON = JSON.stringify(classVideos);
            let ok = await db("platformclassroom")
              .where({ id: classId })
              .andWhere({ adminid: adminId })
              .update({ classroomvideo: classVideosJSON });
          }
        }
        return res.status(200).json({
          status: "success",
          message: "video added",
        });
      }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }
  }
  async addDemoVR(req, res) {
    try {
      const { model, id, platform } = req.body;
      const time = new Date()
        .toISOString()
        .replace(/T/, " ") // replace T with a space
        .replace(/\..+/, ""); // delete the dot and everything after
      const checkVR = await db("VR").first("*").where({
        id: id,
      });
      if (checkVR)
        return res.status(200).json({
          status: "success",
          message: `${id} in use`,
        });
      const checkDemoVR = await db("demo-VR").first("*").where({
        id: id,
      });
      if (checkDemoVR)
        return res.status(401).json({
          status: "error",
          message: `${id} demo in use`,
        });
      await db("demo-VR").insert({
        model: model,
        id: id,
        date: time,
        platform: platform,
      });
      return res.status(200).json({
        status: "success",
        message: "demo added",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }
  }
  async getVideoInfo(req, res) {
    try {
      const { videoId, companyId } = req.body;

      if (companyId == "metaenga") {
        const video = await db("metaenga_video_table").first("*").where({
          id: videoId,
        });
        if (!video)
          return res.status(404).json({
            status: "error",
            message: "video not found",
          });
        return res.status(200).json({
          status: "success",
          data: video,
        });
      } else {
        const checkCompany = await db("company").first("*").where({
          id: companyId,
        });
        if (!checkCompany)
          return res.status(404).json({
            status: "error",
            message: "company not found",
          });
        const videoTable = `video-${companyId}`;
        const checkVideo = await db("metaenga_videos").first("*").where({
          id: videoId,
        });
        if (!checkVideo)
          return res.status(404).json({
            status: "error",
            message: "video not found",
          });
        return res.status(200).json({
          status: "success",
          data: checkVideo,
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }
  }

  async addExistedVR(req, res) {
    try {
      console.log(
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      );

      const { id, company, model, platform } = req.body;

      console.log(id, company, model, platform);

      const checkVR = await db("VR").first("*").where({
        id: id,
      });

      // const checkDemoVR = await db("demo-VR").first("*").where({
      //   id: id,
      // });

      if (!checkVR) {
        // if (!checkDemoVR) {
        //   console.log("VR not found");
        //   return res.status(400).json({
        //     status: "error",
        //     message: "VR not found",
        //   });
        // }
        let cmp_info = await db("company").first("*").where({
          id: company,
        });
        let limit;
        if (cmp_info.plan == "Free") {
          limit = 1;
        }else if(cmp_info.plan == "Flex"){
          limit = 999999999;
        }else {
          limit = cmp_info.payedLicense;
        }
        let count = await db("VR")
          .where({ company: company })
          .whereNotNull("userId")
          .count("id as count")
          .first();
        if (count.count >= limit) {
          console.log("headset limit exceeded");
          return res.status(402).json({ status: "headset limit exceeded" });
        }

        const rand = await randomPassword();
        const abbrev = cmp_info.companyName
          .match(/\b([A-Za-z0-9])/g)
          .join("")
          .toUpperCase();
        const newName = `${abbrev}-${rand}`;
        const time = new Date()
          .toISOString()
          .replace(/T/, " ") // replace T with a space
          .replace(/\..+/, ""); // delete the dot and everything after
        await db("VR").insert({
          date: time,
          name: newName,
          model: model,
          id: id,
          company: company,
          platform: platform,
        });
        await db("metaenga_device_logs").insert({
          company_id: company,
          device_id: id,
          status: 1,
          date: time,
        });
        // await db("demo-VR")
        //   .where({
        //     id: id,
        //   })
        //   .del();

        return res.status(200).json({
          status: "success",
          message: "added",
        });
      } else {
        let checkAssign = await db("VR").first("*").where({
          id: id,
          company: company,
        });
        let headsetCompanyInfo = await db("company").first("*").where({
          id: checkVR.company,
        });
        if (!checkAssign && headsetCompanyInfo.plan == "Flex") {
          console.log("assigned on flex");
          return res.status(401).json({
            status: "error",
            message: "assigned on flex",
          });
        }
        const time = new Date()
          .toISOString()
          .replace(/T/, " ") // replace T with a space
          .replace(/\..+/, ""); // delete the dot and everything after
        await db("VR")
          .update({
            date: time,
            model: model,
            platform: platform,
            company: company,
          })
          .where({
            id: id,
          });
        return res.status(200).json({
          status: "success",
          message: "updated",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }
  }
}
async function randomPassword() {
  let minm = 100000;
  let maxm = 999999;
  let id = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
  return id;
}

module.exports = new ClassRoom();
