const express = require("express");
const app = express();
const server = require("http").createServer(app);
const router = require("./router/router");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const db = require("./db");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const parseRawBodyForWebhook = (req, res, next) => {
  if (
    req.originalUrl.startsWith("/order/webhook") ||
    req.originalUrl.startsWith("/subscription/webhook")
  ) {
    bodyParser.raw({ type: "*/*" })(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  } else {
    next();
  }
};

// Apply the custom middleware to parse raw body only for the webhook endpoint
app.use(parseRawBodyForWebhook);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.urlencoded({ extended : true }));
// app.use(express.json())

const cors = require("cors");
app.options("*", cors());

const corsOptions = {
  credentials: true,
  origin: "*",
};

app.use(cors(corsOptions));

app.use("/", cors(corsOptions), router);

// Static routes
app.use("/static", cors(corsOptions), express.static(__dirname + "/static"));
app.use(
  "/thumbnail",
  cors(corsOptions),
  express.static(__dirname + "/static/thumbnail")
);
app.use(
  "/poster",
  cors(corsOptions),
  express.static(__dirname + "/static/poster")
);
app.use(
  "/logo",
  cors(corsOptions),
  express.static(__dirname + "/static/logos")
);
app.use(
  "/avatar",
  cors(corsOptions),
  express.static(__dirname + "/static/avatar")
);
app.use(
  "/vrdev",
  cors(corsOptions),
  express.static(__dirname + "/static/vrdev")
);
app.use("/pdf", cors(corsOptions), express.static(__dirname + "/static/pdf"));
app.use(
  "/pdfReceipt",
  cors(corsOptions),
  express.static(__dirname + "/static/pdfReceipt")
);
app.use(
  "/gestures",
  cors(corsOptions),
  express.static(__dirname + "/static/gestures")
);
app.use(
  "/pico",
  cors(corsOptions),
  express.static(__dirname + "/static/VR/pico")
);
app.use(
  "/quest",
  cors(corsOptions),
  express.static(__dirname + "/static/VR/quest")
);
app.use(
  "/windows",
  cors(corsOptions),
  express.static(__dirname + "/static/VR/windows")
);
app.use("/vr", cors(corsOptions), express.static(__dirname + "/static/VR/"));
app.use(
  "/manifestfolder",
  cors(corsOptions),
  express.static(__dirname + "/static/VR/manifest/")
);
app.use(
  "/trainingpico",
  cors(corsOptions),
  express.static(__dirname + "/static/VR/defaultpico")
);
app.use(
  "/trainingquest",
  cors(corsOptions),
  express.static(__dirname + "/static/VR/defaultquest")
);
app.use(
  "/trainingwindows",
  cors(corsOptions),
  express.static(__dirname + "/static/VR/defaultwindows")
);
app.use(
  "/banner",
  cors(corsOptions),
  express.static(__dirname + "/static/banner")
);
app.use(
  "/details",
  cors(corsOptions),
  express.static(__dirname + "/static/details/")
);

let clients = [];
io.use(function (socket, next) {
  if (socket.handshake.query && socket.handshake.query.token) {
    jwt.verify(
      socket.handshake.query.token,
      process.env.USER_TOKEN,
      function (err, decoded) {
        if (err) return next(new Error("Authentication error"));
        socket.decoded = decoded;
        next();
      }
    );
  } else {
    next(new Error("Authentication error"));
  }
}).on("connection", async function (socket) {
  // Connection now authenticated to receive further events

  console.log(`user ${socket.id} connected`);

  socket.on("joinRoom", async function (data) {
    const { classId, userId, email, role, isReady, deviceName } = data;
    const checkClass = await db("metaenga_classroom").first("*").where({
      id: classId,
    });
    if (!checkClass) {
      socket.emit("message", "Class not found");
      return;
    }
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    if (!checkUser) {
      socket
        .in(classId)
        .emit("message", {
          status: "error",
          message: "User not found",
          event: "joinRoom",
          info: "",
        });
      socket.emit("message", "User not found");
      return;
    }
    if (isReady == false) {
      socket.emit("message", "Videos not ready");
    }

    await db("metaenga_classroom")
      .update({
        status: "active",
      })
      .where({
        id: classId,
      });

    let clientInfo = new Object();
    clientInfo.email = email;
    clientInfo.role = role;
    clientInfo.roomId = classId;
    clientInfo.id = socket.id;
    clientInfo.deviceName = deviceName;
    clientInfo.isReady = isReady;
    clients.push(clientInfo);
    //console.log(clients)

    if (checkUser) {
      await socket.join(classId);
      socket.in(classId).emit("message", {
        userConnected: {
          event: "joinRoom",
          userId: socket.id,
          email: email,
          role: checkUser.role,
        },
      });
      socket.emit("message", {
        userConnected: {
          event: "joinRoom",
          userId: socket.id,
          email: email,
          role: checkUser.role,
        },
      });
      console.log(`user ${socket.id} joined room ${classId}`);
    }
  });
  socket.on("addVideo", async function (data) {
    const { classId, userId, videoArr } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    const videoDB = `video-${checkUser.company}`;

    const playlist = await db("metaenga_classroom").first("*").where({
      id: classId,
      companyId: checkUser.company,
    });
    videoArr.forEach(async (video) => {
      const checkVideo = await db("metaenga_videos").first("*").where({
        id: video.id,
      });
      if (!checkVideo) {
        socket.emit("message", "Video not found");
        return;
      }
    });

    let arrJSON = JSON.stringify(videoArr);
    await db("metaenga_classroom")
      .update({
        videos: arrJSON,
      })
      .where({
        id: classId,
        companyId: checkUser.company,
      });

    socket.in(classId).emit("message", {
      event: "addVideo",
      videoArr: videoArr,
    });
    socket.emit("message", {
      event: "addVideo",
      videoArr: videoArr,
    });
  });
  socket.on("removeVideo", async function (data) {
    const { classId, userId, videoId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });

    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }

    const checkClass = await db("metaenga_classroom").first("*").where({
      id: classId,
      companyId: checkUser.company,
    });

    let arr = checkClass.videos;
    const index = arr.findIndex((obj) => obj.id === videoId);

    if (index > -1) {
      const removedVid = { id: arr[index].id, companyId: arr[index].companyId };
      arr.splice(index, 1);
      let arrJSON = JSON.stringify(arr);

      await db("metaenga_classroom")
        .update({
          videos: arrJSON,
        })
        .where({
          id: classId,
          companyId: checkUser.company,
        });

      socket.in(classId).emit("message", {
        event: "removeVideo",
        removedVid,
      });
      socket.emit("message", {
        event: "removeVideo",
        removedVid,
      });
    } else {
      socket.emit("message", "Video not found in playlist");
    }
  });

  socket.on("moveVideo", async function (data) {
    //move video from current position to new position
    const { classId, userId, videoId, whereToMove } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });

    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }

    const checkClass = await db("metaenga_classroom").first("*").where({
      id: classId,
      companyId: checkUser.company,
    });

    if (!checkClass) {
      socket.emit("message", "Class not found");
      return;
    }

    let arr = checkClass.videos;
    let index = arr.findIndex((obj) => obj.id === videoId);

    if (index > -1) {
      const removedVideo = arr.splice(index, 1)[0];
      arr.splice(whereToMove, 0, removedVideo);
      let arrJSON = JSON.stringify(arr);

      await db("metaenga_classroom")
        .update({
          videos: arrJSON,
        })
        .where({
          id: classId,
          companyId: checkUser.company,
        });

      socket.in(classId).emit("message", {
        event: "moveVideo",
        reorderedArr: arr,
      });
      socket.emit("message", {
        event: "moveVideo",
        reorderedArr: arr,
      });
    } else {
      socket.emit("message", "Video not found in playlist");
    }
  });

  socket.on("startVideo", async function (data) {
    const { classId, userId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    await db("metaenga_classroom")
      .update({
        status: "live",
      })
      .where({
        id: classId,
      });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    socket.in(classId).emit("start", { status: "start" });
    socket.emit("start", { status: "start" });
  });
  socket.on("pauseVideo", async function (data) {
    const { classId, userId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    socket.in(classId).emit("pause", {
      status: "pause",
    });
    socket.emit("pause", { status: "pause" });
  });
  socket.on("stopVideo", async function (data) {
    const { classId, userId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    socket.in(classId).emit("stop", { status: "stop" });
    socket.emit("stop", { status: "stop" });
  });
  socket.on("endSession", async function (data) {
    const { classId, userId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    await db("metaenga_classroom")
      .update({
        status: "active",
      })
      .where({
        id: classId,
      });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    socket.in(classId).emit("end", { status: "endSession" });
    socket.emit("end", { status: "endSession" });
  });
  socket.on("nextVideo", async function (data) {
    const { classId, userId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    socket.in(classId).emit("next", { status: "nextVideo" });
    socket.emit("next", { status: "nextVideo" });
  });
  socket.on("previousVideo", async function (data) {
    const { classId, userId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    socket.in(classId).emit("prev", { status: "previousVideo" });
    socket.emit("prev", { status: "previousVideo" });
  });

  socket.on("getCurrentUsers", function (data) {
    let current = [];
    clients.forEach(function (client) {
      if (client.roomId == data.classId) {
        current.push(client);
      }
    });
    socket.emit("message", {
      event: "getCurrentUsers",
      currentUsers: current,
    });
  });
  socket.on("getPlaylist", async function (data) {
    const { classId, userId } = data;
    const checkUser = await db("userlink").first("*").where({
      user: userId,
    });
    if (!checkUser) {
      socket.emit("message", "User not found");
      return;
    }
    const checkClass = await db("metaenga_classroom").first("*").where({
      id: classId,
      companyId: checkUser.company,
    });
    if (!checkClass) {
      socket.emit("message", "Class not found");
      return;
    }

    let arr = checkClass.videos;
    socket.emit("message", {
      event: "getPlaylist",
      videoArr: arr,
    });
  });

  socket.on("disconnect", async function (data) {
    try {
      let roomId;
      console.log(`user ${socket.id} disconnected`);

      let currentUserIsFirstConnectedUser = false; // Flag to check if the current user is the first connected user

      for (let i = 0, len = clients.length; i < len; ++i) {
        let c = clients[i];

        if (c.id === socket.id) {
          if (c.role === "ADMIN" || c.role === "OWNER") {
            await console.log(c.role);

            // Check if the disconnected user is the first connected user
            const roomMembers = clients.filter(
              (member) => member.roomId === c.roomId
            );
            if (roomMembers.length > 0 && roomMembers[0].id === socket.id) {
              currentUserIsFirstConnectedUser = true;
              await db("metaenga_classroom")
                .update({
                  status: "offline",
                })
                .where({
                  id: c.roomId,
                });
            }

            clients.splice(i, 1);
            break;
          } else if (c.role === "ENHANCED") {
            console.log("enhanced user disconnected");
          }

          roomId = c.roomId;
          clients.splice(i, 1);
          break;
        }
      }

      if (!roomId) {
        return;
      } else {
        if (currentUserIsFirstConnectedUser) {
          socket
            .in(roomId)
            .emit("leave", {
              status: "leave",
              disconnect: socket.id,
              roomId: roomId,
            });
        }
        socket.in(roomId).emit("message", {
          userDC: socket.id,
        });
      }
    } catch (error) {
      console.log(error);
      socket.in(classId).emit("message", error);
    }
  });

  socket.on("kickUser", function (data) {
    const { clientId } = data;
    let clientToDisconnect = clients.find((client) => client.id === clientId);
    if (clientToDisconnect) {
      clients.splice(clients.indexOf(clientToDisconnect), 1);
      socket.in(clientToDisconnect.roomId).emit("message", {
        event: "kickUser",
        userKick: clientId,
      });
    }
  });
});

server.listen(process.env.PORT || 4000, () =>
  console.log(`started on ${process.env.PORT} or 4000`)
);
