const ffmpeg = require("fluent-ffmpeg");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const semaphore = require("semaphore")(1);
let uuid = require("uuid");
const fs = require("fs");
const db = require("../db");
const { promisify } = require("util");
const { exec } = require("child_process");
const { get } = require("https");
const execAsync = promisify(exec);
const renameAsync = promisify(fs.rename);
const deleteAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

dotenv.config();

class Upload {
  async uploadVideoBunny(req, res) {
    try {
      let name = req.files[0].originalname;
      let file = req.files[0].buffer;
      let fileSizeInBytes = file.length;
      let fileSizeInKB = fileSizeInBytes / 1024;
      let fileSizeInKBInt = Math.floor(fileSizeInKB);

      let companyId = req.params.company;
      const { videoName, videoTheme, videoDescription, id } = req.body;
      let path = "./static/" + "tmp/" + name;
      const company = await db("company").first("*").where({
        id: req.params.company,
      });
      if (!company)
        return res.status(404).json({
          status: "company not found",
        });
      const getPlans = await db("metaenga_plans").first("*").where({
        plan: company.plan,
      });
      const getUserScore = await db("metaenga_plan_insight").first("*").where({
        companyId: companyId,
      });
      if (getUserScore.uploadLimit >= getPlans.uploadLimit) {
        return res.status(403).json({
          status: "limit exceeded",
        });
      } else if (getUserScore.uploadLimit < getPlans.uploadLimit) {
        let newScore = getUserScore.uploadLimit + fileSizeInKBInt;
        if (newScore > getPlans.uploadLimit) {
          console.log(newScore);
          console.log(getPlans.uploadLimit);
          return res.status(403).json({
            status: "limit exceeded",
          });
        } else {
          console.log("ok");
        }
      }
      await db("metaenga_plan_insight")
        .update({
          uploadLimit: getUserScore.uploadLimit + fileSizeInKB,
        })
        .where({
          companyId: companyId,
        });

      await writeFileInParts(path, file, 1024);

      const buf = fs.createReadStream(path); //save video to tmp folder
      let reso = await getResolution(path);
      const duration = await getDuration(path);
      console.log("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
      console.log(reso);
      const rand = await randomPassword();

      const extention = name.split(".").pop();
      const abbrev = company.companyName
        .match(/\b([A-Za-z0-9])/g)
        .join("")
        .toUpperCase();
      const newName = `${abbrev}-${rand}`;
      const newName2 = `${abbrev}-${rand}.jpg`;

      let thumblink = `thumbnail/${companyId}/thumb-${newName2}`;
      const dirPath = `./static/thumbnail/${companyId}`;

      // Check if the directory exists
      if (!fs.existsSync(dirPath)) {
        // Create the directory
        fs.mkdirSync(dirPath, { recursive: true });
        console.log("Directory created successfully!");
      } else {
        console.log("Directory already exists.");
      }
      await getThumbnail(
        path,
        `./static/thumbnail/${companyId}/thumb-${newName2}`
      );

      const videoTable = `video-${req.params.company}`;
      const check = await db("metaenga_videos").first("*").where({
        videoName: videoName,
        companyId: req.params.company,
      });
      const checkIfNotBelongsToCompany = await db("metaenga_users")
        .first("*")
        .where({
          id: id,
        });
      if (!checkIfNotBelongsToCompany)
        return res.status(404).json({
          status: "it's not your company",
        });

      if (check)
        return res.status(400).json({
          status: "video already exist",
        });
      const checkUserID = await db("userlink").first("*").where({
        user: id,
      });
      if (!checkUserID)
        return res.status(400).json({
          status: "user not found",
        });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ") // replace T with a space
        .replace(/\..+/, ""); // delete the dot and everything after

      let hash = uuid.v4();

      await db("metaenga_videos").insert({
        videoName: videoName,
        videoTheme: videoTheme,
        videoDescription: videoDescription,
        id: hash,
        companyId: req.params.company,
        Data: time,
        serverName: newName,
      });
      let obj = {
        groups: [],
        users: [],
      };

      let newDir = `./static/thumbnail/${companyId}`;
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }
      let json = JSON.stringify(obj);
      let dir = `./static/contentAccess`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFile(dir + "/" + hash + ".json", json, "utf8", function (err) {
        if (err) throw err;
        console.log("complete");
      });
      let resolutionArray = [];
      resolutionArray.push(reso);
      let resJson = JSON.stringify(resolutionArray);
      await db("metaenga_videos")
        .update({
          duration: duration,
          resolution: resJson,
          preview: thumblink,
        })
        .where({
          videoName: videoName,
        });

      // await db('metaenga_analytics')
      // .where({
      //   id:'metaenga'
      // })
      // .increment('videosCount', 1)

      const options = {
        method: "PUT",
        headers: {
          "content-type": "application/octet-stream",
          AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
        },
        body: buf,
      };

      await fetch(
        `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_${reso}.${extention}`,
        options
      )
        .then((response) => response.json())
        .then((response) => console.log("Success:", JSON.stringify(response)))
        .catch((err) => console.error(err));

      const [width, height] = reso.split("x");

      if (parseInt(width) > 5760 && parseInt(height) > 2880) {
        console.log("starting convesation to 5760x2880");
        addJobToQueue(path, companyId, newName, extention, "5760x2880");
        addJobToQueue(path, companyId, newName, extention, "4096x2048");
        addJobToQueue(path, companyId, newName, extention, "3840x2160");
        addJobToQueue(path, companyId, newName, extention, "2048x1024");
        addJobToQueue(path, companyId, newName, extention, "1280x720");
        addJobToQueue(path, companyId, newName, extention, "setReady");
        addJobToQueue(path, companyId, newName, extention, "deleteVideo");
      } else if (parseInt(width) == 5760 && parseInt(height) == 2880) {
        addJobToQueue(path, companyId, newName, extention, "4096x2048");
        addJobToQueue(path, companyId, newName, extention, "3840x2160");
        addJobToQueue(path, companyId, newName, extention, "2048x1024");
        addJobToQueue(path, companyId, newName, extention, "1280x720");
        addJobToQueue(path, companyId, newName, extention, "setReady");
        addJobToQueue(path, companyId, newName, extention, "deleteVideo");
      } else if (parseInt(width) > 4096 && parseInt(height) > 2048) {
        console.log("starting convesation to 4096x2048");
        addJobToQueue(path, companyId, newName, extention, "4096x2048");
        addJobToQueue(path, companyId, newName, extention, "3840x2160");
        addJobToQueue(path, companyId, newName, extention, "2048x1024");
        addJobToQueue(path, companyId, newName, extention, "1280x720");
        addJobToQueue(path, companyId, newName, extention, "setReady");
        addJobToQueue(path, companyId, newName, extention, "deleteVideo");
      } else if (parseInt(width) == 4096 && parseInt(height) == 2048) {
        addJobToQueue(path, companyId, newName, extention, "3840x2160");
        addJobToQueue(path, companyId, newName, extention, "2048x1024");
        addJobToQueue(path, companyId, newName, extention, "1280x720");
        addJobToQueue(path, companyId, newName, extention, "setReady");
        addJobToQueue(path, companyId, newName, extention, "deleteVideo");
      } else if (parseInt(width) > 3840 && parseInt(height) > 2160) {
        addJobToQueue(path, companyId, newName, extention, "3840x2160");
        addJobToQueue(path, companyId, newName, extention, "2048x1024");
        addJobToQueue(path, companyId, newName, extention, "1280x720");
        addJobToQueue(path, companyId, newName, extention, "setReady");
        addJobToQueue(path, companyId, newName, extention, "deleteVideo");
      } else if (parseInt(width) == 3840 && parseInt(height) == 2160) {
        addJobToQueue(path, companyId, newName, extention, "2048x1024");
        addJobToQueue(path, companyId, newName, extention, "1280x720");
        addJobToQueue(path, companyId, newName, extention, "setReady");
        addJobToQueue(path, companyId, newName, extention, "deleteVideo");
      } else if (parseInt(width) > 1280 && parseInt(height) > 720) {
        console.log("starting convesation to 1280x720");
        console.log(path);
        console.log(companyId);
        console.log(newName);
        console.log(extention);

        addJobToQueue(path, companyId, newName, extention, "1280x720");
        addJobToQueue(path, companyId, newName, extention, "setReady");
        addJobToQueue(path, companyId, newName, extention, "deleteVideo");
      }

      const now = new Date();
      const optionsLondon = {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const londonDate = now.toLocaleDateString("en-US", optionsLondon);
      console.log("londonDate", londonDate);
      const row = await db("metaenga_analytics")
        .select("*")
        .where({ date: londonDate })
        .first();
      console.log("row", row);
      if (row) {
        if (row.videoUploads === null) {
          await db("metaenga_analytics")
            .update({
              videoUploads: 1,
            })
            .where({
              date: londonDate,
            });
        } else {
          await db("metaenga_analytics")
            .where({
              date: londonDate,
            })
            .increment("videoUploads", 1);
        }
      } else {
        await db("metaenga_analytics").insert({
          date: londonDate,
          videoUploads: 1,
        });
      }

      return res.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "error", error: error });
    }
  }
  async uploadLogo(req, res) {
    try {
      let name = req.file.filename;
      let id = req.params.id;
      let logo = req.file.buffer;
      let path = "./static/" + "logos/" + id + ".jpg";
      const check = await db("company").first("*").where({
        id: id,
      });
      if (!check) return res.status(404).json({ status: "company not found" });
      await db("company")
        .update({
          logo: id + ".jpg",
        })
        .where({
          id: id,
        });
      await fs.writeFileSync(path, logo);
      return res.status(200).json({
        status: "success",
        logo: name,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        error: error,
      });
    }
  }
  async uploadVrTraining(req, res) {
    try {
      let name = req.files[0].originalname;
      let training = req.files[0].buffer;
      const { customname, description, duration } = req.body;
      let company = req.params.company;
      // let vers = req.params.vers
      let q = name.replace(/\D/g, "");
      let number = q.substring(0, 4);
      let fileSizeInBytes = req.files[0].size;

      let check = await db("company").first("*").where({ id: company });
      console.log(check);
      if (!check) {
        return res
          .status(400)
          .json({ status: "error", error: "company not found" });
      }

      let vers = check.VRlink;
      let check2 = await db("trainings")
        .first("*")
        .where({ company: company, id: number });
      if (check2) {
        return res
          .status(500)
          .json({
            status: "error",
            error: "training with this number already exist",
          });
      }

      let folder = `${company}_${vers}`;
      const addr = `static/VR/` + folder + `/training/`;
      fs.stat(`./static/VR/${folder}`, function (err, stat) {
        if (err == null) {
          console.log("File exists");
        } else if (err.code === "ENOENT") {
          // file does not exist
          return console.log(err);
        } else {
          console.log("Some other error: ", err.code);
        }
      });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      await db("trainings").insert({
        name: customname,
        id: number,
        company: company,
        size: fileSizeInBytes,
        fullname: name,
        description: description,
        duration: duration,
        time: time,
      });

      await fs.writeFileSync(
        `./static/VR/${folder}/training/${name}`,
        training
      );

      return res.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ status: "error", error: error });
    }
  }
  async uploadVrTrainingDefault(req, res) {
    try {
      let name = req.files[0].originalname;
      let training = req.files[0].buffer;
      let {
        customname,
        description,
        duration,
        numberOfScenarios,
        platform,
        version,
      } = req.body;
      if (!version) {
        version = "01";
      }
      if (
        platform !== "pico" &&
        platform !== "quest" &&
        platform !== "windows"
      ) {
        return res
          .status(400)
          .json({ status: "error", error: "platform not found" });
      }
      let company = "metaenga";
      let q = name.replace(/\D/g, "");
      let number = q.substring(0, 4);
      let fileSizeInBytes = req.files[0].size;
      const time = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      let picoVers = await db("metaenga_platforms")
        .first("*")
        .where({ platform: "pico" });
      let questVers = await db("metaenga_platforms")
        .first("*")
        .where({ platform: "quest" });
      let windowsVers = await db("metaenga_platforms")
        .first("*")
        .where({ platform: "windows" });

      const platformcheck = await db("trainings").first("*").where({
        id: number,
      });

      if (platformcheck) {
        const platformArray = platformcheck.platform;
        if (platformArray.some((item) => item.platform === platform)) {
          return res
            .status(400)
            .json({ status: "error", error: "platform already exist" });
        } else {
          platformArray.push({ platform, fileSizeInBytes });
          let platformArrayJson = JSON.stringify(platformArray);
          await db("trainings")
            .update({
              platform: platformArrayJson,
            })
            .where({
              id: number,
            });
        }
      } else {
        let platformArray = [{ platform, fileSizeInBytes }];
        let platformArrayJson = JSON.stringify(platformArray);
        await db("trainings").insert({
          name: customname,
          id: number,
          company: company,
          fullname: name,
          description: description,
          //duration: duration,
          time: time,
          platform: platformArrayJson,
          version: version,
          //numberOfScenarios: numberOfScenarios
        });
      }

      if (platform == "pico") {
        fs.open(
          `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`,
          "r",
          function (err, fd) {
            //открываю файл
            if (err) {
              console.log("File not found!");
            } else {
              // если файл существует

              let newVersion;
              let text =
                `${name}` +
                "\t" +
                `${fileSizeInBytes}` +
                "\t" +
                `ver${version}` +
                "\t" +
                `${number}` +
                "\t" +
                `/default/${name}\n`; //генерирую строку чанка
              console.log(text);
              console.log(text);
              fs.appendFile(
                `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`,
                text,
                function (err) {
                  //добавляю строку в файл
                  if (err) throw err;
                  // print output
                  console.log("Saved!");
                }
              );
              const timeout1 = setTimeout(() => {
                //таймер на 1 секунду
                fs.readFile(
                  `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`,
                  "utf8",
                  function (err, data) {
                    //читаю файл
                    if (err) {
                      return console.log(err);
                    }

                    let fileContents = data.replace(/\r\n/g, "\n"); //заменяю переносы строк

                    fileContents = fileContents.replace(
                      /(\$BUILD_ID = )(.+)/,
                      (_, prefix, buildId) => {
                        //генерирую новый билд айди, увеличивая его на 1, функция .replace() возвращает новый билд айди
                        const parts = buildId.split("_"); //(_,prefix,buildId) где  _ это разделитель, prefix это первая часть строки, buildId это вторая часть строки
                        newVersion = parseInt(parts[1]) + 1; //увеличиваю билд айди на 1
                        const newBuildId = `${parts[0]}_${String(
                          newVersion
                        ).padStart(4, "0")}`; //генерирую новый билд айди
                        return `${prefix}${newBuildId}`; //заменяю старый билд айди на новый
                      }
                    );

                    const lines = fileContents.split(/\r?\n/); //разбиваю файл на строки

                    let newFile = lines.join("\n"); //соединяю строки в файл

                    const q = newFile.split(/\r?\n/); //разбиваю файл на строки
                    let num;
                    let firstLine;

                    for (let i = 0; i < q.length; i++) {
                      //прохожу по строкам
                      if (q[i].includes("$NUM_ENTRIES")) {
                        //если строка содержит $NUM_ENTRIES то
                        firstLine = lines[i]; //получаю строку
                        num = firstLine.replace(/\D/g, ""); //получаю число из строки
                      }
                    }

                    let x = Number(num); //преобразую строку в число
                    let oldFile = newFile.replace(
                      firstLine,
                      `$NUM_ENTRIES = ${x + 1}`
                    ); //заменяю строку на новую, увеличивая число на 1

                    fs.writeFile(
                      `./static/VR/manifest/pico_${picoVers.version}/BuildManifest-training.txt`,
                      oldFile,
                      "utf8",
                      function (err) {
                        //записываю файл
                        if (err) return console.log(err);
                      }
                    );
                    let newBuildId = `${String(newVersion).padStart(4, "0")}`; //генерирую новый билд айди
                    db("metaenga_platforms")
                      .where({ platform: "pico" })
                      .update({ version: newBuildId })
                      .then((result) => {
                        //обновляю билд айди в базе данных
                        console.log("Database updated successfully");
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                    let folder = `pico_${picoVers.version}`; //получаю название папки
                    let oldName = `./static/VR/manifest/${folder}`; //получаю старый путь папки
                    let partsS = folder.split("_"); //разбиваю название папки на части
                    newVersion = parseInt(partsS[1]) + 1; //увеличиваю билд айди на 1
                    const newName = `${partsS[0]}_${String(newVersion).padStart(
                      4,
                      "0"
                    )}`; //генерирую новое название папки
                    let newPath = `./static/VR/manifest/${newName}`; //генерирую новый путь папки
                    fs.rename(oldName, newPath, (err) => {
                      //переименовываю папку
                      if (err) {
                        console.error(err);
                      } else {
                        console.log("Folder renamed successfully!");
                      }
                    });
                  }
                );
              }, 3000);
            }
          }
        );
        fs.stat(`./static/VR/defaultpico`, function (err, stat) {
          if (err == null) {
            console.log("File exists");
          } else if (err.code === "ENOENT") {
            // file does not exist
            return console.log(err);
          } else {
            console.log("Some other error: ", err.code);
          }
        });
        await fs.writeFileSync(`./static/VR/defaultpico/${name}`, training);
      } else if (platform == "quest") {
        fs.open(
          `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`,
          "r",
          function (err, fd) {
            //открываю файл
            if (err) {
              console.log("File not found!");
            } else {
              // если файл существует

              let newVersion;
              let text =
                `${name}` +
                "\t" +
                `${fileSizeInBytes}` +
                "\t" +
                `ver${version}` +
                "\t" +
                `${number}` +
                "\t" +
                `/default/${name}\n`; //генерирую строку чанка
              console.log(text);
              console.log(text);
              fs.appendFile(
                `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`,
                text,
                function (err) {
                  //добавляю строку в файл
                  if (err) throw err;
                  // print output
                  console.log("Saved!");
                }
              );
              const timeout1 = setTimeout(() => {
                //таймер на 1 секунду
                fs.readFile(
                  `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`,
                  "utf8",
                  function (err, data) {
                    //читаю файл
                    if (err) {
                      return console.log(err);
                    }

                    let fileContents = data.replace(/\r\n/g, "\n"); //заменяю переносы строк

                    fileContents = fileContents.replace(
                      /(\$BUILD_ID = )(.+)/,
                      (_, prefix, buildId) => {
                        //генерирую новый билд айди, увеличивая его на 1, функция .replace() возвращает новый билд айди
                        const parts = buildId.split("_"); //(_,prefix,buildId) где  _ это разделитель, prefix это первая часть строки, buildId это вторая часть строки
                        newVersion = parseInt(parts[1]) + 1; //увеличиваю билд айди на 1
                        const newBuildId = `${parts[0]}_${String(
                          newVersion
                        ).padStart(4, "0")}`; //генерирую новый билд айди
                        return `${prefix}${newBuildId}`; //заменяю старый билд айди на новый
                      }
                    );

                    const lines = fileContents.split(/\r?\n/); //разбиваю файл на строки

                    let newFile = lines.join("\n"); //соединяю строки в файл

                    const q = newFile.split(/\r?\n/); //разбиваю файл на строки
                    let num;
                    let firstLine;

                    for (let i = 0; i < q.length; i++) {
                      //прохожу по строкам
                      if (q[i].includes("$NUM_ENTRIES")) {
                        //если строка содержит $NUM_ENTRIES то
                        firstLine = lines[i]; //получаю строку
                        num = firstLine.replace(/\D/g, ""); //получаю число из строки
                      }
                    }

                    let x = Number(num); //преобразую строку в число
                    let oldFile = newFile.replace(
                      firstLine,
                      `$NUM_ENTRIES = ${x + 1}`
                    ); //заменяю строку на новую, увеличивая число на 1

                    fs.writeFile(
                      `./static/VR/manifest/quest_${questVers.version}/BuildManifest-training.txt`,
                      oldFile,
                      "utf8",
                      function (err) {
                        //записываю файл
                        if (err) return console.log(err);
                      }
                    );
                    let newBuildId = `${String(newVersion).padStart(4, "0")}`; //генерирую новый билд айди
                    db("metaenga_platforms")
                      .where({ platform: "quest" })
                      .update({ version: newBuildId })
                      .then((result) => {
                        //обновляю билд айди в базе данных
                        console.log("Database updated successfully");
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                    let folder = `quest_${questVers.version}`; //получаю название папки
                    let oldName = `./static/VR/manifest/${folder}`; //получаю старый путь папки
                    let partsS = folder.split("_"); //разбиваю название папки на части
                    newVersion = parseInt(partsS[1]) + 1; //увеличиваю билд айди на 1
                    const newName = `${partsS[0]}_${String(newVersion).padStart(
                      4,
                      "0"
                    )}`; //генерирую новое название папки
                    let newPath = `./static/VR/manifest/${newName}`; //генерирую новый путь папки
                    fs.rename(oldName, newPath, (err) => {
                      //переименовываю папку
                      if (err) {
                        console.error(err);
                      } else {
                        console.log("Folder renamed successfully!");
                      }
                    });
                  }
                );
              }, 3000);
            }
          }
        );
        fs.stat(`./static/VR/defaultquest`, function (err, stat) {
          if (err == null) {
            console.log("File exists");
          } else if (err.code === "ENOENT") {
            // file does not exist
            return console.log(err);
          } else {
            console.log("Some other error: ", err.code);
          }
        });
        await fs.writeFileSync(`./static/VR/defaultquest/${name}`, training);
      } else if (platform == "windows") {
        fs.open(
          `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`,
          "r",
          function (err, fd) {
            //открываю файл
            if (err) {
              console.log("File not found!");
            } else {
              // если файл существует

              let newVersion;
              let text =
                `${name}` +
                "\t" +
                `${fileSizeInBytes}` +
                "\t" +
                `ver${version}` +
                "\t" +
                `${number}` +
                "\t" +
                `/default/${name}\n`; //генерирую строку чанка
              console.log(text);
              console.log(text);
              fs.appendFile(
                `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`,
                text,
                function (err) {
                  //добавляю строку в файл
                  if (err) throw err;
                  // print output
                  console.log("Saved!");
                }
              );
              const timeout1 = setTimeout(() => {
                //таймер на 1 секунду
                fs.readFile(
                  `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`,
                  "utf8",
                  function (err, data) {
                    //читаю файл
                    if (err) {
                      return console.log(err);
                    }

                    let fileContents = data.replace(/\r\n/g, "\n"); //заменяю переносы строк

                    fileContents = fileContents.replace(
                      /(\$BUILD_ID = )(.+)/,
                      (_, prefix, buildId) => {
                        //генерирую новый билд айди, увеличивая его на 1, функция .replace() возвращает новый билд айди
                        const parts = buildId.split("_"); //(_,prefix,buildId) где  _ это разделитель, prefix это первая часть строки, buildId это вторая часть строки
                        newVersion = parseInt(parts[1]) + 1; //увеличиваю билд айди на 1
                        const newBuildId = `${parts[0]}_${String(
                          newVersion
                        ).padStart(4, "0")}`; //генерирую новый билд айди
                        return `${prefix}${newBuildId}`; //заменяю старый билд айди на новый
                      }
                    );

                    const lines = fileContents.split(/\r?\n/); //разбиваю файл на строки

                    let newFile = lines.join("\n"); //соединяю строки в файл

                    const q = newFile.split(/\r?\n/); //разбиваю файл на строки
                    let num;
                    let firstLine;

                    for (let i = 0; i < q.length; i++) {
                      //прохожу по строкам
                      if (q[i].includes("$NUM_ENTRIES")) {
                        //если строка содержит $NUM_ENTRIES то
                        firstLine = lines[i]; //получаю строку
                        num = firstLine.replace(/\D/g, ""); //получаю число из строки
                      }
                    }

                    let x = Number(num); //преобразую строку в число
                    let oldFile = newFile.replace(
                      firstLine,
                      `$NUM_ENTRIES = ${x + 1}`
                    ); //заменяю строку на новую, увеличивая число на 1

                    fs.writeFile(
                      `./static/VR/manifest/windows_${windowsVers.version}/BuildManifest-training.txt`,
                      oldFile,
                      "utf8",
                      function (err) {
                        //записываю файл
                        if (err) return console.log(err);
                      }
                    );
                    let newBuildId = `${String(newVersion).padStart(4, "0")}`; //генерирую новый билд айди
                    db("metaenga_platforms")
                      .where({ platform: "windows" })
                      .update({ version: newBuildId })
                      .then((result) => {
                        //обновляю билд айди в базе данных
                        console.log("Database updated successfully");
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                    let folder = `windows_${windowsVers.version}`; //получаю название папки
                    let oldName = `./static/VR/manifest/${folder}`; //получаю старый путь папки
                    let partsS = folder.split("_"); //разбиваю название папки на части
                    newVersion = parseInt(partsS[1]) + 1; //увеличиваю билд айди на 1
                    const newName = `${partsS[0]}_${String(newVersion).padStart(
                      4,
                      "0"
                    )}`; //генерирую новое название папки
                    let newPath = `./static/VR/manifest/${newName}`; //генерирую новый путь папки
                    fs.rename(oldName, newPath, (err) => {
                      //переименовываю папку
                      if (err) {
                        console.error(err);
                      } else {
                        console.log("Folder renamed successfully!");
                      }
                    });
                  }
                );
              }, 3000);
            }
          }
        );
        fs.stat(`./static/VR/defaultwindows`, function (err, stat) {
          if (err == null) {
            console.log("File exists");
          } else if (err.code === "ENOENT") {
            // file does not exist
            return console.log(err);
          } else {
            console.log("Some other error: ", err.code);
          }
        });
        await fs.writeFileSync(`./static/VR/defaultwindows/${name}`, training);
      }

      return res.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ status: "error", error: error });
    }
  }
  async uploadPoster(req, res) {
    try {
      let name = req.file.originalname;
      let id = req.params.training;
      //const extention = req.file.originalname.split('.').pop()
      let poster = req.file.buffer;
      let path = "./static/" + "poster/" + id + ".jpg";

      const training = await db("trainings").first("*").where({
        id: id,
      });
      if (!training)
        return res.status(404).json({
          status: "user not found",
        });

      let q = id + ".jpg";
      await db("trainings")
        .update({
          poster: q,
        })
        .where({
          id: id,
        });
      fs.writeFileSync(path, poster);
      return res.status(200).json({
        status: "success",
        poster: name,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        error: error,
      });
    }
  }
  async uploadPoster360Video(req, res) {
    try {
      console.log(req.file);
      let name = req.file.originalname;
      let id = req.params.id;
      //const extention = req.file.originalname.split('.').pop()
      let poster = req.file.buffer;
      let check = await db("metaenga_videos_default").first("*").where({
        id: id,
      });
      if (check){
        let path = "./static/" + "thumbnail/metaenga/" + name;
        await db("metaenga_videos_default")
          .update({
            preview: `thumbnail/metaenga/${name}`,
          })
          .where({
            id: id,
          });
        fs.writeFileSync(path, poster);
        return res.status(200).json({
          status: "success",
          poster: name,
        });
        }else{
          let path = "./static/" + "thumbnail/metaenga/" + name;
          await db("metaenga_video_table")
            .update({
              preview: `thumbnail/metaenga/${name}`,
            })
            .where({
              id: id,
            });
          fs.writeFileSync(path, poster);
          return res.status(200).json({
            status: "success",
            poster: name,
          });
        }     
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        error: error,
      });
    }
  }
  async uploadBanner(req, res) {
    try {
      let name = req.file.originalname;
      let id = req.params.company;
      //const extention = req.file.originalname.split('.').pop()
      let poster = req.file.buffer;
      let randId = Math.floor(100000 + Math.random() * 900000);
      let path = "./static/" + "banner/" + randId + ".jpg";
            

      const check = await db("company").first("*").where({
        id: id,
      });
      if (!check)
        return res.status(404).json({
          status: "company not found",
        });

      let q = randId + ".jpg";
      const updateOrInsert = await db("metaenga_banner").first("*").where({
        company_id: id,
      });
      if(updateOrInsert){
        await db("metaenga_banner")
        .update({
          banner_url: q,
        })
        .where({
          company_id: id,
        });
      }else{
        await db("metaenga_banner").insert({
          company_id: id,
          banner_url: q,
        });
      }
      fs.writeFileSync(path, poster);
      return res.status(200).json({
        status: "success",
        poster: name,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        error: error,
      });
    }
  }

  async checkAvailableBanner(req, res) {
    try {
      let id = req.params.company;
      const check = await db("company").first("*").where({
        id: id,
      });
      if (!check)
        return res.status(404).json({
          status: "company not found",
        });
        const checkBanner = await db("metaenga_banner").first("*").where({
          company_id: id,
        });
        if(checkBanner){
          return res.status(200).json({
            status: "success",
            banner: `${process.env.URL}/banner${checkBanner.banner_url}`,
          });
        }else{
          return res.status(200).json({
            status: "success",
            banner: null,
          });
        }
    } catch (error) {
      return res.status(400).json({
        status: "error",
        error: error,
      });
    }
  }

  async uploadAvatar(req, res) {
    try {
      let name = req.file.originalname;
      let id = req.params.id;
      //const extention = req.file.originalname.split('.').pop()
      let avatar = req.file.buffer;
      let company = req.params.company;
      let path = "./static/" + "avatar/" + id + ".jpg";

      const user = await db("userlink").first("*").where({
        user: id,
      });
      if (!user)
        return res.status(404).json({
          status: "user not found",
        });
      const check = await db("metaenga_users").first("*").where({
        id: id,
      });
      if (!check)
        return res.status(404).json({
          status: "company not found",
        });
      let q = id + ".jpg";
      await db("metaenga_users")
        .update({
          avatar: q,
        })
        .where({
          id: id,
        });
      await fs.writeFileSync(path, avatar);
      return res.status(200).json({
        status: "success",
        avatar: name,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        error: error,
      });
    }
  }
  async uploadVideoMetaengaBunny(req, res) {
    try {
      let name = req.files[0].originalname;
      let file = req.files[0].buffer;
      let fileSizeInBytes = file.length;
      let fileSizeInKB = fileSizeInBytes / 1024;
      let fileSizeInKBInt = Math.floor(fileSizeInKB);

      const { videoName, videoTheme, videoDescription, id } = req.body;
      let path = "./static/" + "tmp/" + name;

      await writeFileAsync(path, file, async function (err) {
        if (err) console.log(err);
      });

      const buf = fs.createReadStream(path); //save video to tmp folder
      let reso = await getResolution(path);
      const duration = await getDuration(path);
      console.log("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
      console.log(reso);
      const rand = await randomPassword();

      const extention = name.split(".").pop();
      const abbrev = "META";
      const newName = `${abbrev}-${rand}`;
      const newName2 = `${abbrev}-${rand}.jpg`;

      let thumblink = `thumbnail/metaenga/thumb-${newName2}`
      await getThumbnail(path, `./static/thumbnail/metaenga/thumb-${newName2}`);

      const videoTable = "metaenga_video_table";
      const check = await db("metaenga_video_table").first("*").where({
        videoName: videoName,
      });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ") // replace T with a space
        .replace(/\..+/, ""); // delete the dot and everything after

      let hash = uuid.v4();

      await db("metaenga_video_table").insert({
        videoName: videoName,
        videoTheme: videoTheme,
        videoDescription: videoDescription,
        id: hash,
        companyId: "metaenga",
        Data: time,
        serverName: newName,
      });
      //    let obj = {
      //     groups: [],
      //     users: []
      //  };

      //        let newDir = `./static/thumbnail/${companyId}`;
      //         if (!fs.existsSync(newDir)){
      //         fs.mkdirSync(newDir, { recursive: true });
      // }
      //        let json = JSON.stringify(obj);
      //   let dir = `./static/contentAccess`;
      //   if (!fs.existsSync(dir)){
      //           fs.mkdirSync(dir, { recursive: true });
      //   }
      //   fs.writeFile(dir+'/'+hash+'.json', json, 'utf8', function(err){
      //     if (err) throw err;
      //     console.log('complete');
      //   });
      let resolutionArray = [];
      resolutionArray.push(reso);
      let resJson = JSON.stringify(resolutionArray);
      await db("metaenga_video_table")
        .update({
          duration: duration,
          resolution: resJson,
          preview: thumblink,
        })
        .where({
          videoName: videoName,
        });

      const options = {
        method: "PUT",
        headers: {
          "content-type": "application/octet-stream",
          AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
        },
        body: buf,
      };

      await fetch(
        `https://uk.storage.bunnycdn.com/metaenga/metaenga/${newName}/${newName}_${reso}.${extention}`,
        options
      )
        .then((response) => response.json())
        .then((response) => console.log("Success:", JSON.stringify(response)))
        .catch((err) => console.error(err));

      const [width, height] = reso.split("x");

      if (parseInt(width) > 5760 && parseInt(height) > 2880) {
        console.log("starting convesation to 5760x2880");
        addJobToQueue(path, "metaenga", newName, extention, "5760x2880");
        addJobToQueue(path, "metaenga", newName, extention, "4096x2048");
        addJobToQueue(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueue(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueue(path, "metaenga", newName, extention, "1280x720");
        addJobToQueue(path, "metaenga", newName, extention, "setReady");
        addJobToQueue(path, "metaenga", newName, extention, "deleteVideo");
      } else if (parseInt(width) == 5760 && parseInt(height) == 2880) {
        addJobToQueue(path, "metaenga", newName, extention, "4096x2048");
        addJobToQueue(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueue(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueue(path, "metaenga", newName, extention, "1280x720");
        addJobToQueue(path, "metaenga", newName, extention, "setReady");
        addJobToQueue(path, "metaenga", newName, extention, "deleteVideo");
      } else if (parseInt(width) > 4096 && parseInt(height) > 2048) {
        console.log("starting convesation to 4096x2048");
        addJobToQueue(path, "metaenga", newName, extention, "4096x2048");
        addJobToQueue(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueue(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueue(path, "metaenga", newName, extention, "1280x720");
        addJobToQueue(path, "metaenga", newName, extention, "setReady");
        addJobToQueue(path, "metaenga", newName, extention, "deleteVideo");
      } else if (parseInt(width) == 4096 && parseInt(height) == 2048) {
        addJobToQueue(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueue(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueue(path, "metaenga", newName, extention, "1280x720");
        addJobToQueue(path, "metaenga", newName, extention, "setReady");
        addJobToQueue(path, "metaenga", newName, extention, "deleteVideo");
      } else if (parseInt(width) > 1280 && parseInt(height) > 720) {
        console.log("starting convesation to 1280x720");
        // console.log(path);
        // console.log(companyId);
        // console.log(newName);
        // console.log(extention);

        addJobToQueue(path, "metaenga", newName, extention, "1280x720");
        addJobToQueue(path, "metaenga", newName, extention, "setReady");
        addJobToQueue(path, "metaenga", newName, extention, "deleteVideo");
      }

      return res.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "error", error: error });
    }
  }
  async uploadVideoMetaengaBunnyDefault(req, res) {
    try {
      let name = req.files[0].originalname;
      let file = req.files[0].buffer;
      let fileSizeInBytes = file.length;
      let fileSizeInKB = fileSizeInBytes / 1024;
      let fileSizeInKBInt = Math.floor(fileSizeInKB);

      const { videoName, videoTheme, videoDescription, id } = req.body;
      let path = "./static/" + "tmp/" + name;

      await writeFileAsync(path, file, async function (err) {
        if (err) console.log(err);
      });

      const buf = fs.createReadStream(path); //save video to tmp folder
      let reso = await getResolution(path);
      const duration = await getDuration(path);
      console.log("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
      console.log(reso);
      const rand = await randomPassword();

      const extention = name.split(".").pop();
      const abbrev = "META";
      const newName = `${abbrev}-${rand}`;
      const newName2 = `${abbrev}-${rand}.jpg`;

      let thumblink = `thumbnail/metaenga/thumb-${newName2}`;
      await getThumbnail(path, `./static/thumbnail/metaenga/thumb-${newName2}`);

      const videoTable = "metaenga_video_table";
      const check = await db("metaenga_videos_default").first("*").where({
        videoName: videoName,
      });

      const time = new Date()
        .toISOString()
        .replace(/T/, " ") // replace T with a space
        .replace(/\..+/, ""); // delete the dot and everything after

      let hash = uuid.v4();

      await db("metaenga_videos_default").insert({
        videoName: videoName,
        videoTheme: videoTheme,
        videoDescription: videoDescription,
        id: hash,
        companyId: "metaenga",
        Data: time,
        serverName: newName,
      });
      //    let obj = {
      //     groups: [],
      //     users: []
      //  };

      //        let newDir = `./static/thumbnail/${companyId}`;
      //         if (!fs.existsSync(newDir)){
      //         fs.mkdirSync(newDir, { recursive: true });
      // }
      //        let json = JSON.stringify(obj);
      //   let dir = `./static/contentAccess`;
      //   if (!fs.existsSync(dir)){
      //           fs.mkdirSync(dir, { recursive: true });
      //   }
      //   fs.writeFile(dir+'/'+hash+'.json', json, 'utf8', function(err){
      //     if (err) throw err;
      //     console.log('complete');
      //   });
      let resolutionArray = [];
      resolutionArray.push(reso);
      let resJson = JSON.stringify(resolutionArray);
      await db("metaenga_videos_default")
        .update({
          duration: duration,
          resolution: resJson,
          preview: thumblink,
        })
        .where({
          videoName: videoName,
        });

      const options = {
        method: "PUT",
        headers: {
          "content-type": "application/octet-stream",
          AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
        },
        body: buf,
      };

      await fetch(
        `https://uk.storage.bunnycdn.com/metaenga/metaenga/${newName}/${newName}_${reso}.${extention}`,
        options
      )
        .then((response) => response.json())
        .then((response) => console.log("Success:", JSON.stringify(response)))
        .catch((err) => console.error(err));

      const [width, height] = reso.split("x");

      if (parseInt(width) > 5760 && parseInt(height) > 2880) {
        console.log("starting convesation to 5760x2880");
        addJobToQueueDefault(path, "metaenga", newName, extention, "5760x2880");
        addJobToQueueDefault(path, "metaenga", newName, extention, "4096x2048");
        addJobToQueueDefault(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueueDefault(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueueDefault(path, "metaenga", newName, extention, "1280x720");
        addJobToQueueDefault(path, "metaenga", newName, extention, "setReady");
        addJobToQueueDefault(
          path,
          "metaenga",
          newName,
          extention,
          "deleteVideo"
        );
      } else if (parseInt(width) == 5760 && parseInt(height) == 2880) {
        addJobToQueueDefault(path, "metaenga", newName, extention, "4096x2048");
        addJobToQueueDefault(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueueDefault(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueueDefault(path, "metaenga", newName, extention, "1280x720");
        addJobToQueueDefault(path, "metaenga", newName, extention, "setReady");
        addJobToQueueDefault(
          path,
          "metaenga",
          newName,
          extention,
          "deleteVideo"
        );
      } else if (parseInt(width) > 4096 && parseInt(height) > 2048) {
        console.log("starting convesation to 4096x2048");
        addJobToQueueDefault(path, "metaenga", newName, extention, "4096x2048");
        addJobToQueueDefault(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueueDefault(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueueDefault(path, "metaenga", newName, extention, "1280x720");
        addJobToQueueDefault(path, "metaenga", newName, extention, "setReady");
        addJobToQueueDefault(
          path,
          "metaenga",
          newName,
          extention,
          "deleteVideo"
        );
      } else if (parseInt(width) == 4096 && parseInt(height) == 2048) {
        addJobToQueueDefault(path, "metaenga", newName, extention, "3840x2160");
        addJobToQueueDefault(path, "metaenga", newName, extention, "2048x1024");
        addJobToQueueDefault(path, "metaenga", newName, extention, "1280x720");
        addJobToQueueDefault(path, "metaenga", newName, extention, "setReady");
        addJobToQueueDefault(
          path,
          "metaenga",
          newName,
          extention,
          "deleteVideo"
        );
      } else if (parseInt(width) > 1280 && parseInt(height) > 720) {
        console.log("starting convesation to 1280x720");
        // console.log(path);
        // console.log(companyId);
        // console.log(newName);
        // console.log(extention);

        addJobToQueueDefault(path, "metaenga", newName, extention, "1280x720");
        addJobToQueueDefault(path, "metaenga", newName, extention, "setReady");
        addJobToQueueDefault(
          path,
          "metaenga",
          newName,
          extention,
          "deleteVideo"
        );
      }

      return res.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "error", error: error });
    }
  }
  async deleteVideoMetaengaBunnyDefault(req, res) {
    try {
      const { id } = req.body;
      let video
      //check where video is
      const check = await db("metaenga_videos_default")
        .first("*")
        .where({ id: id });
        if(check){
          video = await db("metaenga_videos_default").first("*").where({ id: id });     
        }else{
          const check2 = await db("metaenga_video_table")
          .first("*")
          .where({ id: id });
          if(check2){
            video = await db("metaenga_video_table").first("*").where({ id: id });
          }else{
            return res.status(404).json({ status: "error", message: "Video not found" })
          }
        }   
      
  
      const { serverName, resolution, preview } = video;
  
      // Удаление миниатюры с локального сервера
      const thumbnailPath = `./static/${preview}`;
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
  
      // Удаление видео с BunnyCDN
      console.log(resolution)
      let resolutions;
    if (typeof resolution === "string") {
      resolutions = JSON.parse(resolution); // Если строка, парсим в массив
    } else {
      resolutions = resolution; // Если уже массив, оставляем как есть
    }

      const extention = serverName.split(".").pop(); // Получение расширения файла
      for (const res of resolutions) {
        console.log(res)
        const url = `https://uk.storage.bunnycdn.com/metaenga/metaenga/${serverName}/${serverName}_${res}.mp4`;
        console.log(url)
        await fetch(url, {
          method: "DELETE",
          headers: {
            AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
          },
        })
        .then((response) => console.log(`Deleted resolution ${res}:`, response.status))
        .catch((err) => console.error(err));
      }
  
      // Удаление записи о видео из базы данных
      const check3 = await db("metaenga_videos_default")
      .first("*")
      .where({ id: id });
      if(check3){
        await db("metaenga_videos_default").where({ id }).del();     
      }else{
        const check4 = await db("metaenga_video_table")
        .first("*")
        .where({ id: id });
        if(check4){
          await db("metaenga_video_table").where({ id }).del(); 
        }else{
          return res.status(404).json({ status: "error", message: "Video not found" })
        }
      }   
  
      return res.status(200).json({ status: "success", message: "Video deleted successfully" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "error", error });
    }
  }
  
}
async function addJobToQueueDefault(
  path,
  companyId,
  newName,
  extention,
  resolution
) {
  await semaphore.take(async () => {
    switch (resolution) {
      case "5760x2880":
        try {
          console.log("started convesation to 5760x2880");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_5760x2880.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 18",
              "-x264-params mvrange=511",
              "-maxrate 120M",
              "-bufsize 150M",
              "-vf scale=5760x2880",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-movflags faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };
              console.log(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_5760x2880.${extention}`
              );
              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_5760x2880.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos_default")
                    .first("*")
                    .where({
                      serverName: newName,
                    });
                  let resoArr = arr.resolution;
                  resoArr.push("5760x2880");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos_default")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "4096x2048":
        try {
          console.log("started convesation to 4096x2048");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_4096x2048.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 17",
              "-maxrate 80M",
              "-bufsize 100M",
              "-vf scale=4096x2048",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-movflags faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };

              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_4096x2048.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos_default")
                    .first("*")
                    .where({
                      serverName: newName,
                    });
                  let resoArr = arr.resolution;
                  resoArr.push("4096x2048");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos_default")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "3840x2160":
        try {
          console.log("started convesation to 3840x2160");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_3840x2160.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 20",
              '-x264-params "keyint=60:min-keyint=60"',
              "-maxrate 25M",
              "-bufsize 35M",
              "-vf scale=3840x2160",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-g 60",
              "-movflags +faststart",
            ])

            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };
              console.log(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_3840x2160.${extention}`
              );
              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_3840x2160.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos_default")
                    .first("*")
                    .where({
                      serverName: newName,
                    });
                  let resoArr = arr.resolution;
                  resoArr.push("3840x2160");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos_default")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "2048x1024":
        try {
          console.log("started convesation to 3840x2160");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_2048x1024.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")

            .outputOptions([
              "-crf 20",
              '-x264-params "keyint=60:min-keyint=60"',
              "-maxrate 25M",
              "-bufsize 35M",
              "-vf scale=2048x1024",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-g 60",
              "-movflags +faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };
              console.log(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_2048x1024.${extention}`
              );
              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_2048x1024.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos_default")
                    .first("*")
                    .where({
                      serverName: newName,
                    });
                  let resoArr = arr.resolution;
                  resoArr.push("2048x1024");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos_default")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "1280x720":
        try {
          console.log("started convesation to 1280x720");
          console.log("convertAndSend1920");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }

          console.log(videoDB);

          const newPath = `./static/tmp/${newName}_1280x720.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 21",
              "-maxrate 10M",
              "-bufsize 15M",
              "-vf scale=1280x720",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-g 60",
              "-keyint_min 60",
              "-movflags faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };

              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_1280x720.${extention}`,
                options
              )
                .then((response) =>
                  console.log("Success:", JSON.stringify(response))
                )
                .then(async () => {
                  const arr = await db("metaenga_videos_default")
                    .first("*")
                    .where({
                      serverName: newName,
                    });
                  let resoArr = arr.resolution;
                  resoArr.push("1280x720");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos_default")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {
          console.log(error);
        }

        break;
      case "setReady":
        try {
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos_default")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          await db("metaenga_videos_default")
            .update({
              status: "ready",
            })
            .where({
              serverName: newName,
            });
          semaphore.leave();
        } catch (error) {
          return console.log(error);
        }
        break;
      case "deleteVideo":
        try {
          fs.unlinkSync(path);
          semaphore.leave();
        } catch (error) {}
      default:
        console.log("Invalid resolution");
    }
  });
}
async function addJobToQueue(path, companyId, newName, extention, resolution) {
  await semaphore.take(async () => {
    switch (resolution) {
      case "5760x2880":
        try {
          console.log("started convesation to 5760x2880");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_5760x2880.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 18",
              "-x264-params mvrange=511",
              "-maxrate 120M",
              "-bufsize 150M",
              "-vf scale=5760x2880",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-movflags faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };
              console.log(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_5760x2880.${extention}`
              );
              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_5760x2880.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos").first("*").where({
                    serverName: newName,
                  });
                  let resoArr = arr.resolution;
                  resoArr.push("5760x2880");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "4096x2048":
        try {
          console.log("started convesation to 4096x2048");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_4096x2048.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 17",
              "-maxrate 80M",
              "-bufsize 100M",
              "-vf scale=4096x2048",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-movflags faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };

              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_4096x2048.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos").first("*").where({
                    serverName: newName,
                  });
                  let resoArr = arr.resolution;
                  resoArr.push("4096x2048");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "3840x2160":
        try {
          console.log("started convesation to 3840x2160");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_3840x2160.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 20",
              '-x264-params "keyint=60:min-keyint=60"',
              "-maxrate 25M",
              "-bufsize 35M",
              "-vf scale=3840x2160",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-g 60",
              "-movflags +faststart",
            ])

            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };
              console.log(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_3840x2160.${extention}`
              );
              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_3840x2160.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos").first("*").where({
                    serverName: newName,
                  });
                  let resoArr = arr.resolution;
                  resoArr.push("3840x2160");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "2048x1024":
        try {
          console.log("started convesation to 3840x2160");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          const newPath = `./static/tmp/${newName}_2048x1024.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")

            .outputOptions([
              "-crf 20",
              '-x264-params "keyint=60:min-keyint=60"',
              "-maxrate 25M",
              "-bufsize 35M",
              "-vf scale=2048x1024",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-g 60",
              "-movflags +faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };
              console.log(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_2048x1024.${extention}`
              );
              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_2048x1024.${extention}`,
                options
              )
                .then((response) => response.json())
                .then(async () => {
                  const arr = await db("metaenga_videos").first("*").where({
                    serverName: newName,
                  });
                  let resoArr = arr.resolution;
                  resoArr.push("2048x1024");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {}

        break;
      case "1280x720":
        try {
          console.log("started convesation to 1280x720");
          console.log("convertAndSend1920");
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }

          console.log(videoDB);

          const newPath = `./static/tmp/${newName}_1280x720.${extention}`;

          ffmpeg(path)
            .videoCodec("libx264")
            .outputOptions([
              "-crf 21",
              "-maxrate 10M",
              "-bufsize 15M",
              "-vf scale=1280x720",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-b:a 192k",
              "-g 60",
              "-keyint_min 60",
              "-movflags faststart",
            ])
            .on("error", function (err) {
              console.log("An error occurred: " + err.message);
            })
            .save(newPath)
            .on("end", async function () {
              console.log("Conversion complete!");

              const buf = fs.readFileSync(newPath);
              const options = {
                method: "PUT",
                headers: {
                  "content-type": "application/octet-stream",
                  AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                },
                body: buf,
              };

              await fetch(
                `https://uk.storage.bunnycdn.com/metaenga/${companyId}/${newName}/${newName}_1280x720.${extention}`,
                options
              )
                .then((response) =>
                  console.log("Success:", JSON.stringify(response))
                )
                .then(async () => {
                  const arr = await db("metaenga_videos").first("*").where({
                    serverName: newName,
                  });
                  let resoArr = arr.resolution;
                  resoArr.push("1280x720");
                  let resoArrJson = JSON.stringify(resoArr);
                  await db("metaenga_videos")
                    .update({
                      resolution: resoArrJson,
                      status: "ready",
                    })
                    .where({
                      serverName: newName,
                    });

                  fs.unlinkSync(newPath);
                  semaphore.leave();
                })
                .catch((err) => console.log(err));
            });
        } catch (error) {
          console.log(error);
        }

        break;
      case "setReady":
        try {
          let videoDB;
          if (companyId != "metaenga") {
            videoDB = `video-${companyId}`;
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
            console.log(path);
            console.log(companyId);
            console.log(newName);
            console.log(extention);
          } else {
            videoDB = "metaenga_video_table";
            await db("metaenga_videos")
              .update({
                status: "converting",
              })
              .where({
                serverName: newName,
              });
          }
          await db("metaenga_videos")
            .update({
              status: "ready",
            })
            .where({
              serverName: newName,
            });
          semaphore.leave();
        } catch (error) {
          return console.log(error);
        }
        break;
      case "deleteVideo":
        try {
          fs.unlinkSync(path);
          semaphore.leave();
        } catch (error) {}
      default:
        console.log("Invalid resolution");
    }
  });
}

async function getResolution(buffer) {
  return new Promise((resolve, reject) => {
    ffmpeg(buffer).ffprobe((err, data) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = data.streams.find(
          (stream) => stream.codec_type === "video"
        );
        if (videoStream) {
          const resolution = videoStream.width + "x" + videoStream.height;
          resolve(resolution);
        } else {
          reject(new Error("Video stream not found"));
        }
      }
    });
  });
}
async function getDuration(buffer) {
  return new Promise((resolve, reject) => {
    ffmpeg(buffer).ffprobe((err, data) => {
      if (err) return reject(err);
      const duration = data.format.duration;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      resolve(formattedDuration);
    });
  });
}
async function randomPassword() {
  let minm = 100000;
  let maxm = 999999;
  let id = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
  return id;
}
async function writeFileInParts(path, data, chunkSize) {
  try {
    const totalChunks = Math.ceil(data.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = (i + 1) * chunkSize;
      const chunk = data.slice(start, end);

      await writeFileAsync(path, chunk, { flag: "a" }); // Use the promisified writeFileAsync
    }

    console.log("File has been written successfully in parts.");
  } catch (err) {
    console.error("Error writing file:", err);
    throw err;
  }
}
async function getThumbnail(buffer, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg(buffer)
      .on("end", function () {
        resolve();
      })
      .on("error", function (err) {
        reject(err);
      })
      .screenshots({
        timestamps: ["50%"],
        filename: outputFile,
        folder: ".",
        size: "502x282",
      });
  });
}
module.exports = new Upload();
