const fs = require("fs");
var queryString = require("querystring");
var crypto = require("crypto");

class stream {
  async streamSourceIOS(req, res) {
    try {
      const options = {};
      const serverName = req.params.serverName;
      const company = req.params.company;
      const filePath = `./static/videos/${company}/${serverName}`;
      let start;
      let end;

      const range = req.headers.range;
      if (range) {
        const bytesPrefix = "bytes=";
        if (range.startsWith(bytesPrefix)) {
          const bytesRange = range.substring(bytesPrefix.length);
          const parts = bytesRange.split("-");
          if (parts.length === 2) {
            const rangeStart = parts[0] && parts[0].trim();
            if (rangeStart && rangeStart.length > 0) {
              options.start = start = parseInt(rangeStart);
            }
            const rangeEnd = parts[1] && parts[1].trim();
            if (rangeEnd && rangeEnd.length > 0) {
              options.end = end = parseInt(rangeEnd);
            }
          }
        }
      }

      res.setHeader("content-type", "video/mp4");

      fs.stat(filePath, (err, stat) => {
        if (err) {
          console.error(`File stat error for ${filePath}.`);
          console.error(err);
          res.sendStatus(500);
          return;
        }

        let contentLength = stat.size;

        // Listing 4.
        if (req.method === "HEAD") {
          res.statusCode = 200;
          res.setHeader("accept-ranges", "bytes");
          res.setHeader("content-length", contentLength);
          res.end();
        } else {
          // Listing 5.
          let retrievedLength;
          if (start !== undefined && end !== undefined) {
            retrievedLength = end + 1 - start;
          } else if (start !== undefined) {
            retrievedLength = contentLength - start;
          } else if (end !== undefined) {
            retrievedLength = end + 1;
          } else {
            retrievedLength = contentLength;
          }

          // Listing 6.
          res.statusCode = start !== undefined || end !== undefined ? 206 : 200;

          res.setHeader("content-length", retrievedLength);

          if (range !== undefined) {
            res.setHeader(
              "content-range",
              `bytes ${start || 0}-${end || contentLength - 1}/${contentLength}`
            );
            res.setHeader("accept-ranges", "bytes");
          }

          // Listing 7.
          const fileStream = fs.createReadStream(filePath, options);
          fileStream.on("error", (error) => {
            console.log(`Error reading file ${filePath}.`);
            console.log(error);
            res.sendStatus(500);
          });

          fileStream.pipe(res);
        }
      });
    } catch (error) {
      throw new Error(err.message);
    }
  }
  async downloadSource(req, res) {
    try {
      const serverName = req.params.serverName;
      const company = req.params.company;
      const resolution = req.params.resolution;
      console.log(
        `https://metaenga.b-cdn.net/${company}/${serverName}/${serverName}_${resolution}.mp4`
      );
      var securityKey = process.env.SECURITY_KEY;
      var signedUrl = signUrl(
        `https://metaenga.b-cdn.net/${company}/${serverName}/${serverName}_${resolution}.mp4`,
        securityKey,
        7200,
        "",
        false,
        "/",
        "",
        ""
      );
      return res.status(200).json({
        status: "success",
        data: signedUrl,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        data: error,
      });
    }
  }
  async downloadSourceMetaenga(req, res) {
    try {
      const serverName = req.params.serverName;
      const resolution = req.params.resolution;

      console.log(
        `https://metaenga.b-cdn.net/metaenga/${serverName}/${serverName}_${resolution}.mp4`
      );
      var securityKey = process.env.SECURITY_KEY;
      var signedUrl = signUrl(
        `https://metaenga.b-cdn.net/metaenga/${serverName}/${serverName}_${resolution}.mp4`,
        securityKey,
        7200,
        "",
        false,
        "/",
        "",
        ""
      );
      return res.status(200).json({
        status: "success",
        data: signedUrl,
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
function addCountries(url, a, b) {
  var tempUrl = url;
  if (a != null) {
    var tempUrlOne = new URL(tempUrl);
    tempUrl += (tempUrlOne.search == "" ? "?" : "&") + "token_countries=" + a;
  }
  if (b != null) {
    var tempUrlTwo = new URL(tempUrl);
    tempUrl +=
      (tempUrlTwo.search == "" ? "?" : "&") + "token_countries_blocked=" + b;
  }
  return tempUrl;
}
function signUrl(
  url,
  securityKey,
  expirationTime = 3600,
  userIp,
  isDirectory = false,
  pathAllowed,
  countriesAllowed,
  countriesBlocked
) {
  var parameterData = "",
    parameterDataUrl = "",
    signaturePath = "",
    hashableBase = "",
    token = "";
  var expires = Math.floor(new Date() / 1000) + expirationTime;
  var url = addCountries(url, countriesAllowed, countriesBlocked);
  var parsedUrl = new URL(url);
  var parameters = new URL(url).searchParams;
  if (pathAllowed != "") {
    signaturePath = pathAllowed;
    parameters.set("token_path", signaturePath);
  } else {
    signaturePath = decodeURIComponent(parsedUrl.pathname);
  }
  parameters.sort();
  if (Array.from(parameters).length > 0) {
    parameters.forEach(function (value, key) {
      if (value == "") {
        return;
      }
      if (parameterData.length > 0) {
        parameterData += "&";
      }
      parameterData += key + "=" + value;
      parameterDataUrl += "&" + key + "=" + queryString.escape(value);
    });
  }
  hashableBase =
    securityKey +
    signaturePath +
    expires +
    (userIp != null ? userIp : "") +
    parameterData;
  token = Buffer.from(
    crypto.createHash("sha256").update(hashableBase).digest()
  ).toString("base64");
  token = token
    .replace(/\n/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  if (isDirectory) {
    return (
      parsedUrl.protocol +
      "//" +
      parsedUrl.host +
      "/bcdn_token=" +
      token +
      parameterDataUrl +
      "&expires=" +
      expires +
      parsedUrl.pathname
    );
  } else {
    return (
      parsedUrl.protocol +
      "//" +
      parsedUrl.host +
      parsedUrl.pathname +
      "?token=" +
      token +
      parameterDataUrl +
      "&expires=" +
      expires
    );
  }
}

module.exports = new stream();
