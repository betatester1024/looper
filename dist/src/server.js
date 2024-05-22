"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initServer = void 0;
const express = require('express');
const enableWs = require('express-ws');
const app = express();
const crypto = require("crypto");
const parse = require("co-body");
const cors = require("cors");
const fs = require('fs');
const Handlebars = require("handlebars");
const index_1 = require("./index");
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const consts_1 = require("./consts");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
var RateLimit = require('express-rate-limit');
async function getMainClass(token) {
    let res = await userRequest(token);
    if (res.status != "SUCCESS")
        return "";
    else
        return res.data.darkQ ? "dark" : "";
}
function log(...args) {
    args;
}
function userRequest(token) {
    return { status: "ERROR", data: { error: "This site does not support authentication." }, token: token };
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
    if (suspensionFile &&
        suspensionFile.suspended && user.data.perms < 2) {
        res.sendFile(consts_1.frontendDir + "/403.html");
        return;
    }
    if (!filePath.match(/\.html$/)) {
        res.sendFile(filePath);
        return;
    }
    else {
        fs.readFile(filePath, 'utf8', async (err, fileContents) => {
            if (err) {
                console.error(err);
                return;
            }
            const template = Handlebars.compile(fileContents);
            res.set('Content-Type', 'text/html');
            res.send(Buffer.from(template({
                mainClass: await getMainClass(token),
                globalTags: `
          <link rel="icon" type="image/x-icon" href="/icon.png">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta property="og:description" content="thing">
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
        windowMs: 10 * 1000,
        max: 50,
        message: tooManyRequests(),
        statusCode: 429,
    });
    app.use(limiter);
    app.set('trust proxy', 1);
    app.get('/ip', (request, response) => response.send(request.ip));
    let corsOptions = {
        credentials: true,
        origin: true,
    };
    app.use(cors(corsOptions));
    app.use(new cookieParser());
    app.get('/', (req, res) => {
        sendFile(res, getToken(req), consts_1.frontendDir + '/index.html');
    });
    app.get("*/nodemodules/*", (req, res) => {
        if (req.url.length > 500)
            sendFile(res, getToken(req), consts_1.frontendDir + "/404.html");
        else
            res.sendFile(consts_1.rootDir + "node_modules" + req.url.replace(/.*nodemodules/, ""));
    });
    app.get('*/favicon.ico', (req, res) => {
        sendFile(res, getToken(req), consts_1.rootDir + 'favicon.ico');
    });
    app.get('*/icon.png', (req, res) => {
        sendFile(res, getToken(req), consts_1.rootDir + 'temp.png');
    });
    app.get('*.svg', (req, res) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        res.setHeader("expires", date.toUTCString());
        res.setHeader("cache-control", "public, max-age=31536000, immutable");
        res.sendFile(consts_1.frontendDir + req.url);
    });
    app.get('/dist/*.js*', (req, res) => {
        res.sendFile(consts_1.jsDir + req.url.replace(/\/dist\//, ""));
    });
    app.get('/*.js*', (req, res) => {
        res.sendFile(consts_1.jsDir + req.url);
    });
    app.get('/*.ts', (req, res) => {
        res.sendFile(consts_1.rootDir + req.url);
    });
    app.get('*/globalformat.css', (_req, res) => {
        res.sendFile(consts_1.frontendDir + "globalformat.css");
    });
    app.get('/*.css', (req, res) => {
        res.sendFile(consts_1.frontendDir + req.url);
    });
    app.get('/*', (req, res) => {
        let requrl = req.url.match("([^?]*)\\??.*")[1];
        let idx = validPages.findIndex((obj) => obj.toLowerCase() == requrl.toLowerCase());
        if (idx >= 0)
            sendFile(res, getToken(req), consts_1.frontendDir + validPages[idx] + ".html");
        else {
            res.status(404);
            sendFile(res, getToken(req), consts_1.frontendDir + "404.html");
        }
    });
    const banList = [];
    app.post('/server', urlencodedParser, async (req, res) => {
        try {
            if (req.headers['content-length'] > 60000) {
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
            if (!body)
                res.end(JSON.stringify({ status: "ERROR", data: { error: "No command string" } }));
            if (body.action == "cookieRequest") {
                res.end(JSON.stringify({ data: req.cookies.acceptedQ ?? false }));
                return;
            }
            if (body.action == "acceptCookies") {
                res.cookie('acceptedQ', true, { httpOnly: true, secure: true, sameSite: "None" });
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
                res.cookie('accountID', body.data.id, { httpOnly: true, secure: true, sameSite: "None" });
                res.end(JSON.stringify({ status: "SUCCESS", data: null }));
                return;
            }
            if (!req.cookies.sessionID)
                res.cookie('sessionID', crypto.randomUUID(), { httpOnly: true, secure: true, sameSite: "None" });
            makeRequest(body.action, req.cookies.accountID, body.data, req.cookies.sessionID)
                .then((ret) => {
                if (ignoreLog.indexOf(body.action) >= 0) { }
                else if (ret.status == "SUCCESS") {
                    log("[" + addr + "]: " + body.action + ", RESP:" + JSON.stringify(ret.data));
                }
                else
                    log("F[" + addr + "]: " + body.action + ", ERR:" + ret.data.error);
                res.cookie('accountID', ret.token ?? "", { httpOnly: true, secure: true, sameSite: "None", maxAge: 9e12 });
                res.end(JSON.stringify({ status: ret.status, data: ret.data }));
            });
        }
        catch (e) { }
    });
    if (process.env.localhost)
        app.listen(consts_1.port, 'localhost', function () {
            console.log("Listening");
        });
    else
        app.listen(consts_1.port);
}
exports.initServer = initServer;
async function makeRequest(action, token, _data, _sessID) {
    if (!index_1.connectionSuccess) {
        return { status: "ERROR", data: { error: "Database connection failure" }, token: token };
    }
    try {
        let obj = null;
        switch (action) {
            case 'test':
                obj = { status: "SUCCESS", data: { abc: "def", def: 5 }, token: token };
                break;
            case 'startupData':
                obj = { status: "SUCCESS", data: {
                        branch: process.env.branch,
                        domain: process.env.domain,
                        unstableDomain: process.env.unstableDomain,
                    }, token: token };
                break;
            default:
                obj = { status: "ERROR", data: { error: "Unknown command string!" }, token: token };
        }
        return obj;
    }
    catch (e) {
        console.log("Error:", e);
        return { status: "ERROR", data: { error: "Error, see console" }, token: token };
    }
}
function tooManyRequests() {
    return `<!DOCTYPE html>
<html class="{{mainClass}}">
  <head>
    <title>Error 429</title>
    <script>
    ${fs.readFileSync(consts_1.jsDir + "utils.js")}
    </script>
    <meta name="viewport" content="width=device-width">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@100;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <style>
      ${fs.readFileSync(consts_1.frontendDir + "/globalformat.css")}
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
const validPages = ["/commands", '/contact', '/EEdit', '/todo', '/status', '/logout', '/signup',
    '/config', '/admin', '/docs', '/login', '/syslog', '/aboutme', '/mailertest',
    "/timer", "/newpaste", "/pastesearch", '/clickit', '/capsdle', '/sweepthatmine',
    "/stopwatch", "/testbed", '/credits', '/atomicmoose', '/issuetracker', '/graphIt',
    '/betterselect', '/redirect', '/betterselect.js', "/minimalLogin", "/minimalSignup",
    "/8192", "/imgedit", "/leaderboard", "/eval", "/smallsubway"];
const ignoreLog = ["getEE", "userRequest", 'getLogs', 'loadLogs', 'visits',
    'roomRequest', 'sendMsg', 'clickIt', 'leaderboard',
    'findPaste', 'startupData'];
//# sourceMappingURL=server.js.map