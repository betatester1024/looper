const express = require('express')
const enableWs = require('express-ws');
const app = express()
// require("dialog-polyfill");
const crypto = require("crypto");
const parse = require("co-body");
const cors = require("cors");
const fs = require('fs');
const Handlebars = require("handlebars");
 // for generating secure random #'s
import {connectionSuccess} from './index';
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
import {jsDir, rootDir, port, frontendDir} from './consts'
const urlencodedParser = bodyParser.urlencoded({ extended: false }) 
var RateLimit = require('express-rate-limit');

async function getMainClass(token:string) 
{
  let res = await userRequest(token) as internalRequest; 
  if (res.status != "SUCCESS") return "";
  else return res.data.darkQ?"dark":"";
}

function log(...args:any[]) {
  args;
}
function userRequest(token:string) {
  return {status:"ERROR", data:{error:"This site does not support authentication."}, token:token};
}

function getToken(req:any) 
{
  return req.cookies.accountID;
}

interface failedRequest {
  status:"ERROR",
  data:{error:string, 
        [x: string]:any},
  token:string
} 
interface successRequest {
  status:"SUCCESS",
  data:any,
  token:string;
}
type internalRequest = failedRequest | successRequest;

async function sendFile(res:any, token:string, filePath:string) 
{
  // console.log(filePath.replace(/(^(.+)\/|\.html)/g, ""));
  let user = await userRequest(token) as internalRequest;
  let suspensionFile = {suspended:false};
  if (user.status != "SUCCESS") {
    user.data.perms = 0;
  }
  if (suspensionFile && 
      suspensionFile.suspended && user.data.perms < 2) 
  {
    res.sendFile(frontendDir+"/403.html");
    return;
  }
  if (!filePath.match(/\.html$/)) {
    // console.log(filePath);
    res.sendFile(filePath); 
    return;
  }
  else {
    fs.readFile(filePath, 'utf8', async (err:any, fileContents:string) => {
      if (err) {
        console.error(err);
        return;
      }
      const template = Handlebars.compile(fileContents);
      // console.log("is html");
      res.set('Content-Type', 'text/html')
      res.send(Buffer.from(template({
        mainClass: await getMainClass(token),
        globalTags:`
          --><link rel="icon" type="image/x-icon" href="/icon.png">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta property="og:description" content="thing">
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
          <link href="https://fonts.googleapis.com/css2?family=Anek+Gurmukhi:wght@100..800&display=swap" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@100;400;500;600;700&display=swap" rel="stylesheet">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link rel="stylesheet" href="/globalformat.css"><!--
        `
      })));
      // console.log(data);
    });
  }
} // sendFile

export async function initServer() {


  // const wss = new WebSocketServer({server:app, path: "/ws"});

  // wss.on('connection', (ws:any)=>{
  //   ws.on('error', console.log);
  //   ws.on('message', (data:any)=>{
  //     console.log('received: %s', data);
  //   });
  //   console.log("connected!");
  //   ws.send('something');
  // });
  enableWs(app);
  var limiter = RateLimit({
    windowMs: 10*1000, // 10 second
    max: 50,
    message: tooManyRequests(),
    statusCode: 429, // 429 status = Too Many Requests (RFC 6585)
  });
  app.use(limiter);
  app.set('trust proxy', 1)
  app.get('/ip', (request:any, response:any) => response.send(request.ip))

  let corsOptions = {
    credentials: true, 
    origin: true,
    // allowedHeaders: true
  };
  app.use(cors(corsOptions));
  app.use(new cookieParser());
  // app.enable('trust proxy');

  app.get('/', (req:any, res:any) => {
    sendFile(res, getToken(req), frontendDir+'/index.html');
    
  })


  // else sendFile(res, getToken(req), frontendDir+'/supportIndex.html');


  app.get("*/nodemodules/*", (req:any, res:any) => {
    // no long requests!
    if (req.url.length > 500) sendFile(res, getToken(req), frontendDir+"/404.html");
    else res.sendFile(rootDir+"node_modules"+req.url.replace(/.*nodemodules/, ""));
    
  })



  app.get('*/favicon.ico', (req:any, res:any)=> {
    sendFile(res, getToken(req), rootDir+'favicon.ico')
    
  })

  app.get('*/icon.png', (req:any, res:any)=> {
    sendFile(res, getToken(req), rootDir+'temp.png')
  })  

  // app.get('/game.js', (req:any, res:any) => {
  //   sendFile(res, getToken(req), frontendDir+"game.js");
  //   
  // })

  // app.get('*/utils.js', (req:any, res:any) => {
  //   res.sendFile(jsDir+"utils.js");
  //   
  // })

  app.get('*.svg', (req:any, res:any) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    res.setHeader("expires", date.toUTCString());
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.sendFile(frontendDir+req.url);
    
  })


  app.get('/dist/*.js*', (req:any, res:any) => {
    res.sendFile(jsDir+req.url.replace(/\/dist\//, ""));
  })


  app.get('/*.js*', (req:any, res:any) => {
    res.sendFile(jsDir+req.url);
    
  })


  app.get('/*.ts', (req:any, res:any) => {
    res.sendFile(rootDir+req.url);
    
  })

  app.get('*/globalformat.css', (_req:any, res:any) => {
    res.sendFile(frontendDir+"globalformat.css");
    
  })


  app.get('/*.css', (req:any, res:any) => {
    res.sendFile(frontendDir+req.url);
    
  })

  app.get('/*', (req:any, res:any) => {
    let requrl = req.url.match("([^?]*)\\??.*")[1]; // do not care about the stuff after the ?
    let idx = validPages.findIndex((obj)=>obj.toLowerCase()==requrl.toLowerCase());
    if (idx>=0) sendFile(res, getToken(req), frontendDir+validPages[idx]+".html");
    else {
      res.status(404);
      sendFile(res, getToken(req), frontendDir+"404.html");
    }
    
  })


  const banList:string[]= [];
  app.post('/server', urlencodedParser, async (req:any, res:any) => {try {
    
    if (req.headers['content-length'] > 60000) {
      res.set("Connection", "close");
      res.status(413).end();
      return;
    }
    let addr = req.ip; 
    // console.log(addr);
    if (banList.indexOf(addr) >= 0) 
    {
      res.end(JSON.stringify({status:"ERROR", data:{error: "IP banned, contact BetaOS if this was done in error."}}));
      return;
    }
    var body = await parse.json(req);
    if (!body) res.end(JSON.stringify({status:"ERROR", data:{error:"No command string"}}));
    // let cookiematch = req.cookies.match("accountID=[0-9a-zA-Z\\-]");
    // COOKIE ACCEPTANCE DIALOG 
    if (body.action == "cookieRequest") {
      res.end(JSON.stringify({data:req.cookies.acceptedQ??false}))
      return;
    }
    if (body.action == "acceptCookies") {
      res.cookie('acceptedQ', true, {httpOnly: true, secure:true, sameSite:"None"})
      res.end(JSON.stringify(""));
      return;
    }
    if (body.action == "accountID") {
      if (req.cookies.accountID) 
        res.end(JSON.stringify({status:"SUCCESS", data:{id:req.cookies.accountID}}));
      else 
        res.end(JSON.stringify({status:"ERROR", data:{error:"Not logged in"}}));
      return;
    }
    if (body.action == "setAccountID") {
      res.cookie('accountID', body.data.id, {httpOnly: true, secure:true, sameSite:"None"})
      res.end(JSON.stringify({status:"SUCCESS", data:null}));
      return;
    }

    if (!req.cookies.sessionID) res.cookie('sessionID', crypto.randomUUID(), {httpOnly:true, secure:true, sameSite:"None"});
    //////////////////////////

    makeRequest(body.action, req.cookies.accountID, body.data, req.cookies.sessionID)
    .then((ret:{status:string, data:any, token:string})=>{
      /*if(body.action=="login"||body.action == "logout" ||
        body.action == "delAcc" || body.action == "signup")*/
      if (ignoreLog.indexOf(body.action)>=0){}
      else if (ret.status=="SUCCESS") {
        log("["+addr+"]: "+body.action+", RESP:"+JSON.stringify(ret.data));
      }
      else log("F["+addr+"]: "+body.action+", ERR:"+ret.data.error);
      res.cookie('accountID', ret.token??"", {httpOnly: true, secure:true, sameSite:"None", maxAge:9e12});
      res.end(JSON.stringify({status:ret.status, data:ret.data}));
    });
  } catch(e) {}});

  if (process.env.localhost) 
    app.listen(port, 'localhost', function() {
      console.log("Listening");
    });
  else app.listen(port);
}

async function makeRequest(action:string|null, token:string, _data:any|null, _sessID:string) {
  if (!connectionSuccess) {
    return {status:"ERROR", data:{error:"Database connection failure"}, token:token};
  }
  // console.log("request made");
  try {
    let obj:any = null;
    switch (action) {
      case 'test':
        obj = {status:"SUCCESS", data:{abc:"def", def:5}, token:token};
        break;
      case 'startupData':
        obj = {status:"SUCCESS", data:{
          branch: process.env.branch,
          domain:process.env.domain,
          unstableDomain:process.env.unstableDomain,
        }, token:token};
        break;
      default:
        obj = {status:"ERROR", data:{error: "Unknown command string!"}, token:token};
    }
    // console.log(obj);
    return obj;
  } catch (e:any) {
    console.log("Error:", e);
    return {status:"ERROR", data:{error:"Error, see console"}, token:token};
  }
}

function tooManyRequests() {
  return `<!DOCTYPE html>
<html class="{{mainClass}}">
  <head>
    <title>Error 429</title>
    <script>
    ${fs.readFileSync(jsDir+"utils.js")}
    </script>
    <meta name="viewport" content="width=device-width">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@100;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <style>
      ${fs.readFileSync(frontendDir+"/globalformat.css")}
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