"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var server_exports = {};
__export(server_exports, {
  initServer: () => initServer
});
module.exports = __toCommonJS(server_exports);
var import_index = require("./index");
var import_consts = require("./consts");
const express = require("express");
const enableWs = require("express-ws");
const app = express();
const crypto = require("crypto");
const parse = require("co-body");
const cors = require("cors");
const fs = require("fs");
const Handlebars = require("handlebars");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
var RateLimit = require("express-rate-limit");
async function getMainClass(token) {
  let res = await userRequest(token);
  if (res.status != "SUCCESS") return "";
  else return res.data.darkQ ? "dark" : "";
}
function log(...args) {
  args;
}
function userRequest(token) {
  return { status: "ERROR", data: { error: "This site does not support authentication." }, token };
}
function getToken(req) {
  return req.cookies.accountID;
}
async function sendFile(res, token, filePath) {
  let user = await userRequest(token);
  let suspensionFile = { suspended: false };
  if (user.status != "SUCCESS") {
    user.data.perms = 0;
  }
  if (suspensionFile && suspensionFile.suspended && user.data.perms < 2) {
    res.sendFile(import_consts.frontendDir + "/403.html");
    return;
  }
  if (!filePath.match(/\.html$/)) {
    res.sendFile(filePath);
    return;
  } else {
    fs.readFile(filePath, "utf8", async (err, fileContents) => {
      if (err) {
        console.error(err);
        return;
      }
      const template = Handlebars.compile(fileContents);
      res.set("Content-Type", "text/html");
      res.send(Buffer.from(template({
        mainClass: await getMainClass(token),
        globalTags: `
          <link rel="icon" type="image/x-icon" href="/psvficon.png">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta property="og:image" content="https:${process.env.domain}/psvficon.png">
          <meta property="og:description" content="Welcome to the Pawservation Foundation.">
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
          <link href="https://fonts.googleapis.com/css2?family=Anek+Gurmukhi:wght@100..800&display=swap" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@100;400;500;600;700&display=swap" rel="stylesheet">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link rel="stylesheet" href="/globalformat.css">
        `
      })));
    });
  }
}
async function initServer() {
  enableWs(app);
  var limiter = RateLimit({
    windowMs: 10 * 1e3,
    // 10 second
    max: 50,
    message: tooManyRequests(),
    statusCode: 429
    // 429 status = Too Many Requests (RFC 6585)
  });
  app.use(limiter);
  app.set("trust proxy", 1);
  app.get("/ip", (request, response) => response.send(request.ip));
  let corsOptions = {
    credentials: true,
    origin: true
    // allowedHeaders: true
  };
  app.use(cors(corsOptions));
  app.use(new cookieParser());
  app.get("/", (req, res) => {
    sendFile(res, getToken(req), import_consts.frontendDir + "/index.html");
  });
  app.get("*/nodemodules/*", (req, res) => {
    if (req.url.length > 500) sendFile(res, getToken(req), import_consts.frontendDir + "/404.html");
    else res.sendFile(import_consts.rootDir + "node_modules" + req.url.replace(/.*nodemodules/, ""));
  });
  app.get("*/favicon.ico", (req, res) => {
    sendFile(res, getToken(req), import_consts.rootDir + "favicon.ico");
  });
  app.get("*/icon.png", (req, res) => {
    sendFile(res, getToken(req), import_consts.rootDir + "temp.png");
  });
  app.get("*.svg", (req, res) => {
    const date = /* @__PURE__ */ new Date();
    date.setFullYear(date.getFullYear() + 1);
    res.setHeader("expires", date.toUTCString());
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.sendFile(import_consts.frontendDir + req.url);
  });
  app.get("/*.js*", (req, res) => {
    res.sendFile(import_consts.jsDir + req.url);
  });
  app.get("/*.ts", (req, res) => {
    res.sendFile(import_consts.jsDir + req.url);
  });
  app.get("*/globalformat.css", (_req, res) => {
    res.sendFile(import_consts.frontendDir + "globalformat.css");
  });
  app.get("/*.css", (req, res) => {
    res.sendFile(import_consts.frontendDir + req.url);
  });
  app.get("/*", (req, res) => {
    let requrl = req.url.match("([^?]*)\\??.*")[1];
    let idx = validPages.findIndex((obj) => obj.toLowerCase() == requrl.toLowerCase());
    if (idx >= 0) sendFile(res, getToken(req), import_consts.frontendDir + validPages[idx] + ".html");
    else {
      res.status(404);
      sendFile(res, getToken(req), import_consts.frontendDir + "404.html");
    }
  });
  const banList = [];
  app.post("/server", urlencodedParser, async (req, res) => {
    try {
      if (req.headers["content-length"] > 6e4) {
        res.set("Connection", "close");
        res.status(413).end();
        return;
      }
      let addr = req.ip;
      if (banList.indexOf(addr) >= 0) {
        res.end(JSON.stringify({ status: "ERROR", data: { error: "IP banned, contact BetaOS if this was done in error." } }));
        return;
      }
      var body = await parse.json(req);
      if (!body) res.end(JSON.stringify({ status: "ERROR", data: { error: "No command string" } }));
      if (body.action == "cookieRequest") {
        res.end(JSON.stringify({ data: req.cookies.acceptedQ ?? false }));
        return;
      }
      if (body.action == "acceptCookies") {
        res.cookie("acceptedQ", true, { httpOnly: true, secure: true, sameSite: "None" });
        res.end(JSON.stringify(""));
        return;
      }
      if (body.action == "accountID") {
        if (req.cookies.accountID)
          res.end(JSON.stringify({ status: "SUCCESS", data: { id: req.cookies.accountID } }));
        else
          res.end(JSON.stringify({ status: "ERROR", data: { error: "Not logged in" } }));
        return;
      }
      if (body.action == "setAccountID") {
        res.cookie("accountID", body.data.id, { httpOnly: true, secure: true, sameSite: "None" });
        res.end(JSON.stringify({ status: "SUCCESS", data: null }));
        return;
      }
      if (!req.cookies.sessionID) res.cookie("sessionID", crypto.randomUUID(), { httpOnly: true, secure: true, sameSite: "None" });
      makeRequest(body.action, req.cookies.accountID, body.data, req.cookies.sessionID).then((ret) => {
        if (ignoreLog.indexOf(body.action) >= 0) {
        } else if (ret.status == "SUCCESS") {
          log("[" + addr + "]: " + body.action + ", RESP:" + JSON.stringify(ret.data));
        } else log("F[" + addr + "]: " + body.action + ", ERR:" + ret.data.error);
        res.cookie("accountID", ret.token ?? "", { httpOnly: true, secure: true, sameSite: "None", maxAge: 9e12 });
        res.end(JSON.stringify({ status: ret.status, data: ret.data }));
      });
    } catch (e) {
    }
  });
  if (process.env.localhost)
    app.listen(import_consts.port, "localhost", function() {
      console.log("Listening");
    });
  else app.listen(import_consts.port);
}
async function makeRequest(action, token, _data, _sessID) {
  if (!import_index.connectionSuccess) {
    return { status: "ERROR", data: { error: "Database connection failure" }, token };
  }
  try {
    let obj = null;
    switch (action) {
      case "test":
        obj = { status: "SUCCESS", data: { abc: "def", def: 5 }, token };
        break;
      case "startupData":
        obj = { status: "SUCCESS", data: {
          branch: process.env.branch,
          domain: process.env.domain,
          unstableDomain: process.env.unstableDomain
        }, token };
        break;
      default:
        obj = { status: "ERROR", data: { error: "Unknown command string!" }, token };
    }
    return obj;
  } catch (e) {
    console.log("Error:", e);
    return { status: "ERROR", data: { error: "Error, see console" }, token };
  }
}
function tooManyRequests() {
  return `<!DOCTYPE html>
<html class="{{mainClass}}">
  <head>
    <title>Error 429</title>
    <script>
    ${fs.readFileSync(import_consts.jsDir + "utils.js")}
    </script>
    <meta name="viewport" content="width=device-width">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@100;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <style>
      ${fs.readFileSync(import_consts.frontendDir + "/globalformat.css")}
    </style>
  </head>
  <body onload="globalOnload(()=>{}, true)">
    <div class="main_content">
    <header>
      <h2>Error: Too many requests</h2>
      <hr class="redrounded">
    </header>
    <p class="fsmed"><span class="material-symbols-outlined red nohover nooutline">error</span>
    Try <button class="btn fssml" onclick="location.reload()">
    <span class="material-symbols-outlined">refresh</span>
    refreshing.<div class="anim"></div></button></p>
    </div>
  </body>
</html>`;
}
const validPages = [
  "/commands",
  "/contact",
  "/EEdit",
  "/todo",
  "/status",
  "/logout",
  "/signup",
  "/config",
  "/admin",
  "/docs",
  "/login",
  "/syslog",
  "/aboutme",
  "/mailertest",
  "/timer",
  "/newpaste",
  "/pastesearch",
  "/clickit",
  "/capsdle",
  "/sweepthatmine",
  "/stopwatch",
  "/testbed",
  "/credits",
  "/atomicmoose",
  "/issuetracker",
  "/graphIt",
  "/betterselect",
  "/redirect",
  "/betterselect.js",
  "/minimalLogin",
  "/minimalSignup",
  "/8192",
  "/imgedit",
  "/leaderboard",
  "/eval",
  "/smallsubway"
];
const ignoreLog = [
  "getEE",
  "userRequest",
  "getLogs",
  "loadLogs",
  "visits",
  "roomRequest",
  "sendMsg",
  "clickIt",
  "leaderboard",
  "findPaste",
  "startupData"
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  initServer
});
//# sourceMappingURL=server.js.map
