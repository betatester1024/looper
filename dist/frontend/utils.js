"use strict";
let SESSIONTIMEOUT, SESSIONTIMEOUT2 = null;
function byId(name) {
    let ele = document.getElementById(name);
    return ele;
}
function byClass(name, ct = 0) {
    return document.getElementsByClassName(name).item(ct);
}
const docURL = new URL(document.URL);
let HASNETWORK = false;
let branch = "STABLE";
let userData = null;
let onloadCallback = null;
function fadeIn() {
    let elementsArray = document.getElementsByClassName("content-fadein");
    console.log("checking.");
    for (var i = 0; i < elementsArray.length; i++) {
        var elem = elementsArray[i];
        var distInView = elem.getBoundingClientRect().top - window.innerHeight + 50;
        if (distInView < 0) {
            elem.classList.add("inView");
        }
        else {
            elem.classList.remove("inView");
        }
    }
}
async function globalOnload(cbk, networkLess = false, link = "/server") {
    onloadCallback = cbk;
    bSelInitialise();
    if (!networkLess) {
        var script = document.createElement('script');
        script.src = "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js";
        document.head.appendChild(script);
        script.onload = () => {
            WebFont.load({
                google: {
                    families: ['Noto Sans Mono', "Raleway:100,200,400,500,600,700,900",
                        'Noto Sans Display', 'Noto Color Emoji']
                }
            });
            console.log("Font loaded!");
        };
        script = document.createElement('script');
        script.src = "/nodemodules/dialog-polyfill/dist/dialog-polyfill.js";
        document.head.appendChild(script);
    }
    HASNETWORK = !networkLess;
    document.addEventListener("keydown", keydown);
    document.onpointerup = pointerUp;
    document.onpointermove = pointerMove;
    byClass("main_content").setAttribute("tabindex", "0");
    fadeIn();
    document.body.addEventListener("mouseover", mouseOver);
    if (!byId("overlay")) {
        let ovr = document.createElement("div");
        ovr.id = "overlay";
        document.body.appendChild(ovr);
    }
    let spacer = document.createElement("div");
    spacer.id = "spacer";
    if (!networkLess) {
        send(JSON.stringify({ action: "startupData" }), (res) => {
            if (res.data.branch)
                branch = res.data.branch;
            let startupData = res.data;
            send(JSON.stringify({ action: "userRequest" }), (res) => {
                userData = res.data;
                if (branch == "unstable" && link == "/server") {
                    let mainContent = byClass("main_content");
                    mainContent.style.width = "calc(100% - 30px)";
                    mainContent.style.margin = "0px";
                    let box = document.createElement("p");
                    box.className = "sidebar-unstable";
                    box.innerHTML = `<span class="material-symbols-outlined">warning</span>\
            Unstable version. Features may be unfinished or broken. 
            <a class="grn" href="${startupData.domain}">Switch to stable branch</a>`;
                    document.body.appendChild(box);
                }
                let maincontent = document.getElementsByClassName("main_content").item(0);
                let ftr = byId("ftrOverride") ?? document.createElement("footer");
                if (!byId("ftrOverride"))
                    maincontent.appendChild(ftr);
                let ele = document.createElement("p");
                ele.id = "footer";
                let urlEle = new URL(location.href);
                let redirector = urlEle.pathname + "?" + urlEle.searchParams.toString();
                if (link != "/server" && res.status != "SUCCESS")
                    ele.innerHTML = `<a href="${startupData.domain}">BetaOS Services site</a> | 
                          <form class="inpContainer szThird nobreak" action="javascript:location.href='/'+byId('ftrNav').value" style="margin: 2px;">
                            <input type="text" id="ftrNav" class="fssml sz100 ftrInput" placeholder="Navigate... (/)">
                            <div class="anim"></div>
                          </form>`;
                else if (res.status != "SUCCESS") {
                    ele.innerHTML = `<a href="/login?redirect=${encodeURIComponent(redirector)}" onclick="login_v2(event)">Administrator login</a> | 
                          <form class="inpContainer szThird nobreak" action="javascript:location.href='/'+byId('ftrNav').value" style="margin: 2px;">
                            <input type="text" id="ftrNav" class="fssml sz100 ftrInput" placeholder="Navigate... (/)">
                            <div class="anim"></div>
                          </form>
                          `;
                }
                else if (res.status == "SUCCESS" && link == "/server") {
                    resetExpiry(res);
                    ele.innerHTML = `Welcome, <kbd>${res.data.user}</kbd> |
                          <a href='/logout' onclick='logout_v2(event)'>Logout</a> | 
                          <a href='/config'>Control panel</a> | 
                          <form class="inpContainer szThird nobreak" action="javascript:location.href='/'+byId('ftrNav').value" style="margin: 2px;">
                            <input type="text" id="ftrNav" class="fssml sz100 ftrInput" placeholder="Navigate... (/)">
                            <div class="anim"></div>
                          </form>`;
                }
                else {
                    ele.innerHTML = `Welcome, <kbd>${res.data.user}</kbd> |
                          <a href='${startupData.domain}/logout'>Logout</a> | 
                          <a href="${startupData.domain}">BetaOS Services site</a> | 
                          <form class="inpContainer szThird nobreak" action="javascript:location.href='/'+byId('ftrNav').value" style="margin: 2px;">
                            <input type="text" id="ftrNav" class="fssml sz100 ftrInput" placeholder="Navigate... (/)">
                            <div class="anim"></div>
                          </form>`;
                }
                ftr.prepend(ele);
                let ephDiv = byId("ephemerals") ?? document.createElement("div");
                if (!ephDiv.id) {
                    ephDiv.id = "ephemerals";
                    document.body.appendChild(ephDiv);
                }
            }, true, link);
        }, true, link);
    }
    let ele2 = document.getElementById("overlay");
    if (ele2)
        ele2.innerHTML = `<div class="internal" style="opacity: 0; text-align: center !important"> </div>`;
    document.body.innerHTML += `
  <div id="compliance" style="display:none">
    <h2 class="blu nohover fssml"><span class="material-symbols-outlined">cookie </span> BetaOS Services uses cookies to operate.</h2>
    <p style="font-size: 10px">We use only <kbd>strictly necessary cookies</kbd> to verify and persist 
    your login session, and to confirm your acceptance of these cookies. <br>
    By continuing to use this site, you consent to our use of these cookies.</p>
    <button class='blu btn fssml' onclick="acceptCookies('${link}')">
    <span class="material-symbols-outlined" style="font-size: 20pt !important">check</span>
    I understand
    <div class="anim"></div>
    </button>
  </div>`;
    if (networkLess) {
        let cpl = document.getElementById("compliance");
        cpl.style.opacity = "1";
        cpl.style.height = "auto";
    }
    byClass("main_content").onscroll = fadeIn;
}
let DRAGGING = null;
let origLeft = -1;
let origTop = -1;
let origX = -1;
let lastPtrUp = -1;
let origY = -1;
function pointerUp(ev) {
    DRAGGING = null;
    origLeft = -1;
    origTop = -1;
    if (ev.target instanceof HTMLDocument)
        return;
    if (ev.target.classList.contains("ALERT_DRAGGER")) {
        if (Date.now() - lastPtrUp < 300) {
            toggleNBDFullScr(ev.target.closest(".ALERT_NONBLOCK").querySelector(".content"));
        }
        else
            console.log(Date.now() - lastPtrUp);
        lastPtrUp = Date.now();
    }
}
function toggleNBDFullScr(contentEle) {
    if (contentEle.dataset.fullscreen == "no")
        contentEle.parentElement.classList.add("fscr");
    else
        contentEle.parentElement.classList.remove("fscr");
    contentEle.dataset.fullscreen = contentEle.dataset.fullscreen == "no" ? "yes" : "no";
    contentEle.style.height = contentEle.style.height ? "" : (contentEle.classList.contains("hasBtn") ? "calc(100vh - 200px)" : "calc(100vh - 100px)");
    contentEle.style.width = contentEle.style.width ? "" : "calc(100vw - 50px)";
    let ele = contentEle.parentElement.querySelector(".fullscr > span");
    if (contentEle.dataset.fullscreen == "yes")
        ele.innerText = "close_fullscreen";
    else
        ele.innerText = "fullscreen";
}
function pointerMove(ev) {
    if (DRAGGING) {
        DRAGGING.parentElement.style.left = origLeft + ev.screenX - origX + "px";
        DRAGGING.parentElement.style.top = origTop + ev.screenY - origY + "px";
        ev.preventDefault();
        ev.stopPropagation();
    }
}
function pointerDown(ev) {
    if (ev.currentTarget.parentElement.querySelector(".content").dataset.fullscreen == "yes")
        return false;
    DRAGGING = ev.currentTarget;
    ev.preventDefault();
    ev.stopPropagation();
    origX = ev.screenX;
    origY = ev.screenY;
    origLeft = toIntPx(window.getComputedStyle(DRAGGING.parentElement).left);
    origTop = toIntPx(window.getComputedStyle(DRAGGING.parentElement).top);
}
function toIntPx(val) {
    return Number(val.replace("px", ""));
}
function toggleMobileNav() {
    let navbar = byId("navTop");
    if (navbar.classList.contains("open")) {
        navbar.classList.remove("open");
        byId("mNav").querySelector(".material-symbols-outlined").innerText = "menu";
    }
    else {
        navbar.classList.add("open");
        byId("mNav").querySelector(".material-symbols-outlined").innerText = "close";
    }
}
function decodeStatus(status) {
    switch (status) {
        case 0: return "Network failure";
        case 200: return "Success";
        case 502: return "Internal Server Error";
        case 404: return "Not found";
        case 429: return "Too many requests";
        case 403: return "Forbidden";
        case 401: return "Unauthorised";
        case 400: return "Invalid request";
        case 413: return "Request too large";
        case 500:
        case 503:
            return "Internal Server Error";
    }
    return "Unknown error";
}
function send(params, callback, silentLoading = false, link = "/server") {
    let overlay = document.getElementById("overlayL");
    if (overlay && !silentLoading) {
        console.log("overlay active");
        overlay.style.opacity = "1";
        overlay.style.backgroundColor = "var(--system-overlay)";
        overlay.style.pointerEvents = "auto";
        byId("overlayLContainer").style.opacity = 1;
        byId("overlayLContainer").style.pointerEvents = "auto";
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", link, true);
    xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let resp = JSON.parse(xhr.responseText);
            if (resp.status != "SUCCESS" && resp.data.refreshRequired) {
                alertDialog("Request failed requiring reload: " + resp.data.error, () => { location.reload(); });
            }
            else
                callback(JSON.parse(xhr.responseText));
        }
        else if (xhr.readyState == 4 && xhr.status != 200) {
            alertDialog("Received status code " + xhr.status + " (" + decodeStatus(xhr.status) + ") -- resend request?", () => { send(params, callback, silentLoading); }, true);
        }
        if (overlay) {
            overlay.style.opacity = "0";
            overlay.style.pointerEvents = "none";
            overlay.style.backgroundColor = "var(--system-grey2)";
            byId("overlayLContainer").style.opacity = 0;
            byId("overlayLContainer").style.pointerEvents = "none";
        }
        else
            closeAlert(-1);
    };
    console.log("about to send with params:", params);
    xhr.withCredentials = true;
    xhr.send(params);
}
function acceptCookies(link = "/server") {
    let cpm = document.getElementById("compliance");
    cpm.style.transition = "all 0.5s ease";
    cpm.style.opacity = "0";
    cpm.style.pointerEvents = "none";
    send(JSON.stringify({ action: "acceptCookies" }), (res) => { }, false, link);
}
function nonBlockingDialog(data, callback) {
    if (data.colour == null)
        data.colour = "grn";
    if (data.continueText == null)
        data.continueText = "Continue";
    if (data.hasButton == null)
        data.hasButton = true;
    if (data.ico == null)
        data.ico = "arrow_forward";
    if (data.title == null)
        data.title = "Information";
    let div = document.createElement("div");
    div.className = "ALERT_NONBLOCK OPEN";
    div.isOpen = true;
    div.innerHTML = `

  <div class="content ${data.hasButton ? "hasBtn" : ""}" data-fullscreen=no>${data.text}</div>`;
    let draggable = document.createElement("div");
    draggable.className = "ALERT_DRAGGER";
    draggable.innerHTML = `<span>${data.title}</span>`;
    draggable.innerHTML += `<div class="close" onclick="closeNBD(this.parentElement.parentElement, false)">
  <span class="red nooutline material-symbols-outlined">close</span>
  </div> 
  <div class="close fullscr" onclick="toggleNBDFullScr(this.parentElement.parentElement.querySelector('.content'), false)">
  <span class="blu nooutline material-symbols-outlined">fullscreen</span>
  </div>`;
    div.prepend(draggable);
    div.callback = callback;
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = "1";
        div.style.pointerEvents = "auto";
        draggable.onpointerdown = pointerDown;
    }, 20);
    let button = document.createElement("button");
    if (data.hasButton) {
        div.appendChild(button);
        button.outerHTML = `
    <button class="${data.colour} btn fsmed closeBtn" onclick="closeNBD(this.parentElement, true)">
    <span class='material-symbols-outlined'>${data.ico}</span>
    ${data.continueText}<div class="anim"></div>
    </button>`;
    }
    return div;
}
function closeNBD(ele, confirmQ) {
    ele.style.opacity = "0";
    ele.isOpen = false;
    ele.style.pointerEvents = "none";
    ele.classList.remove("OPEN");
    if (confirmQ)
        ele.callback(ele.querySelector(".content"));
}
let ALERTOPEN = false;
function alertDialog(str, callback = () => { }, requiresConfirmation = false) {
    let newDialog = document.createElement("dialog");
    try {
        dialogPolyfill.registerDialog(newDialog);
    }
    catch (e) { }
    document.body.appendChild(newDialog);
    newDialog.className = "internal ALERT";
    newDialog.id = "internal_alerts";
    newDialog.style.textAlign = "center";
    newDialog.innerHTML = `
    <p class="fsmed" id="alerttext_v2">Error: AlertDialog configured incorrectly. Please contact BetaOS.</p>
    <div style="text-align: center;"><button id="confirmbtn" class="btn szHalf override" onclick="console.log('ConfirmClick'); closeAlert(1)" style="display: inline-block">
      <span class="alertlbl">Continue</span>
      <span class="material-symbols-outlined">arrow_forward_ios</span>
      <div class="anim"></div>
    </button>
    <button class="btn szHalf red override" id="cancelBtn" style="display: none" onclick="console.log('RejectClick'); closeAlert(-1)">
      <span class="alertlbl">Cancel</span>
      <span class="material-symbols-outlined">cancel</span>
      <div class="anim"></div>
    </button></div>`;
    setTimeout(() => {
        newDialog.style.opacity = "1";
        newDialog.style.top = "18px";
    }, 0);
    newDialog.setAttribute("type", requiresConfirmation + "");
    newDialog.callback = callback;
    let overlay = document.getElementById("overlayL");
    if (overlay) {
        overlay.style.opacity = "0";
    }
    let ele = document.getElementById("overlay");
    if (ele)
        ele.innerHTML = "";
    let p = newDialog.querySelector("#alerttext_v2");
    if (!ele || !p) {
        console.log("ERROR: Alert dialogs not enabled in this page.");
        callback();
        return;
    }
    ele.style.opacity = "1";
    newDialog.style.pointerEvents = "auto";
    ALERTOPEN = true;
    p.innerText = str;
    p.innerHTML += "<br><br><p style='margin: 10px auto' class='gry nohover'>(Press ENTER or ESC)</p>";
    newDialog.querySelector("#cancelBtn").style.display = "none";
    if (requiresConfirmation) {
        newDialog.querySelector("#cancelBtn").style.display = "inline-block";
        console.log("Alert-type CANCELLABLE");
    }
    else
        console.log("Alert-type: STANDARD");
    newDialog.showModal();
}
function closeAlert(sel) {
    let ele = document.getElementById("overlay");
    let coll = document.getElementsByClassName("ALERT");
    let dialog = coll.item(coll.length - 1);
    if (!dialog)
        return;
    let overridecallback = false;
    if ((dialog.getAttribute("type") == "true" || dialog.getAttribute("type") == "2") && sel < 0)
        overridecallback = true;
    if (!ele) {
        console.log("Alert dialogs not enabled in this page");
        return;
    }
    dialog.style.top = "50vh";
    dialog.style.opacity = "0";
    dialog.style.pointerEvents = "none";
    if (!overridecallback) {
        try {
            dialog.callback();
        }
        catch (e) {
            alertDialog("Error while calling back: " + e, () => { });
        }
    }
    setTimeout(() => { dialog.close(); }, 500);
    dialog.className = "internal CLOSEDALERT";
    dialog.id = "CLOSEDALERT";
    if (!dialogsActive()) {
        ALERTOPEN = false;
        ele.style.opacity = "0";
        ele.style.pointerEvents = "none";
    }
}
function keydown(e) {
    if (e.defaultPrevented) {
        console.log("prevent-defaulted");
        return;
    }
    if (byId("ftrNav") && e.key == "/" && e.target.nodeName != "TEXTAREA" && (e.target.nodeName != "INPUT" ||
        (e.target.type != "text" && e.target.type != "password"))) {
        location.href = "#ftrNav";
        byId("ftrNav").focus();
        e.preventDefault();
        return;
    }
    if (ALERTOPEN && !DIALOGOPEN && (e.key == "Escape" || e.key == "Enter")) {
        e.preventDefault();
        if (e.key == "Escape") {
            console.log("RejectKey");
            closeAlert(-1);
        }
        else {
            console.log("ConfirmKey");
            closeAlert(1);
        }
    }
    if (!ALERTOPEN && !DIALOGOPEN &&
        (e.target.nodeName == "INPUT" || e.target.nodeName == "TEXTAREA") &&
        e.key == "Escape") {
        e.target.blur();
    }
}
function suffix(i) {
    if (i % 10 == 1 && i % 100 != 11)
        return "st";
    if (i % 10 == 2 && i % 100 != 12)
        return "nd";
    if (i % 10 == 3 && i % 100 != 13)
        return "rd";
    return "th";
}
function toTime(ms, inclMs = false) {
    let day = Math.floor(ms / 1000 / 60 / 60 / 24);
    ms = ms % (1000 * 60 * 60 * 24);
    let hr = Math.floor(ms / 1000 / 60 / 60);
    ms = ms % (1000 * 60 * 60);
    let min = Math.floor(ms / 1000 / 60);
    ms = ms % (1000 * 60);
    let sec = Math.floor(ms / 1000);
    if (ms < 0)
        return "00:00:00";
    return (day > 0 ? day + "d " : "") + padWithZero(hr) + ":" + padWithZero(min) + ":" + padWithZero(sec) + (inclMs ? "." + padWithThreeZeroes(ms % 1000) : "");
}
function minimalTime(ms, inFuture = false) {
    if (isNaN(ms))
        return "unknown time";
    if (ms < 60000)
        return inFuture ? "shortly" : "just now";
    let day = Math.floor(ms / 1000 / 60 / 60 / 24);
    ms = ms % (1000 * 60 * 60 * 24);
    let hr = Math.floor(ms / 1000 / 60 / 60);
    ms = ms % (1000 * 60 * 60);
    let min = Math.floor(ms / 1000 / 60);
    ms = ms % (1000 * 60);
    return (day > 0 ? day + "d " : "") + (hr > 0 ? (hr + "h") : "") + min + "m";
}
function padWithThreeZeroes(n) {
    if (n < 10)
        return "00" + n;
    if (n < 100)
        return "0" + n;
    return n;
}
function padWithZero(n) {
    return n < 10 ? "0" + n : n;
}
let overlay;
const tips = ["Press <kbd>/</kbd> to jump to a page", "🧀",
    "Have you tried turning it off and on again?",
    "Try <a href='/clickit'>ClickIt</a> today!",
    "Your insanity will pay off. Eventually.",
    "Don't worry! It's fine... We can fix it!",
    "Help! I've fallen and can't get back up again!",
    "Tofu is solidified bean water. On that note, try Humanity(r) Bean Water today!",
    "The void orb watches over you."];
addEventListener("DOMContentLoaded", function () {
    overlay = document.createElement("div");
    overlay.className = "overlayLoader";
    overlay.id = "overlayL";
    overlay.style.backgroundColor = "var(--system-overlay)";
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    overlay.innerHTML = `<div id="overlayLContainer" style='pointer-events:none;'>
  <p class="fslg grn nohover">Loading.</p>
  <span class="material-symbols-outlined loader">sync</span>
  <hr class="rounded">
  </div>`;
    document.body.appendChild(overlay);
    let metatags = document.createElement("meta");
    metatags.content = "width=device-width, initial-scale=1.0, min-scale=1.0";
    metatags.name = "viewport";
    document.head.appendChild(metatags);
});
let DIALOGOPEN = false;
function closeDialog(thing, name = "dialog") {
    let div = document.getElementById(name);
    div.style.top = "50%";
    div.style.opacity = "0";
    div.style.pointerEvents = "none";
    DIALOGOPEN = false;
    let ele = byId("overlay");
    if (!dialogsActive()) {
        ALERTOPEN = false;
        ele.style.opacity = "0";
        ele.style.pointerEvents = "none";
    }
    thing();
}
function dialogsActive() {
    return document.getElementsByClassName("ALERT").length > 0 || DIALOGOPEN;
}
function openDialog(name = "dialog") {
    let div = document.getElementById(name);
    div.style.top = "0px";
    div.style.opacity = "1";
    div.style.pointerEvents = "auto";
    DIALOGOPEN = true;
    document.getElementById("overlay").style.opacity = "1";
}
function mouseOver(e) {
}
function resetExpiry(res) {
    if (res.data.expiry < Date.now() || res.data.expiry - Date.now() > 9e60) {
        return;
    }
    SESSIONTIMEOUT = setTimeout(() => {
        alertDialog("Your session has expired", () => {
            location.reload();
        });
    }, res.data.expiry - Date.now());
    SESSIONTIMEOUT2 = setTimeout(() => {
        alertDialog("Your session is expiring in one minute, extend session? ", () => {
            send(JSON.stringify({ action: "extendSession" }), (res) => {
                alertDialog("Session extended, expires in " + toTime(res.data.expiry - Date.now()), () => { });
                clearTimeout(SESSIONTIMEOUT);
                clearTimeout(SESSIONTIMEOUT2);
                resetExpiry(res);
            });
        }, true);
    }, Math.max(res.data.expiry - Date.now() - 60000, 1000));
}
function whichTransitionEvent() {
    var t;
    var el = document.createElement('fakeelement');
    var transitions = {
        'transition': 'transitionend',
        'OTransition': 'oTransitionEnd',
        'MozTransition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd'
    };
    for (let t in transitions) {
        if (el.style[t] !== undefined) {
            return transitions[t];
        }
    }
}
function ephemeralDialog(text) {
    let dialog = document.createElement("div");
    dialog.classList.add("ephemeral");
    dialog.innerHTML = text;
    dialog.style.animation = "appear 1s forwards";
    byId("ephemerals").prepend(dialog);
    setTimeout(() => {
        closeEphemeral(dialog);
    }, 10000);
    dialog.onclick = () => { closeEphemeral(dialog); };
}
function closeEphemeral(dialog) {
    dialog.style.animation = "disappear 0.6s forwards";
    setTimeout(() => { dialog.remove(); }, 600);
}
let loginDialog = null;
function login_v2(ev, signup = false) {
    if (ev)
        ev.preventDefault();
    if (loginDialog && loginDialog.isOpen)
        return;
    loginDialog = nonBlockingDialog({
        text: `<iframe class="loginiframe" src="/minimal${signup ? "Signup" : "Login"}"></iframe>`,
        hasButton: false,
        title: signup ? "Register" : "Login"
    }, null);
    toggleNBDFullScr(loginDialog.querySelector(".content"));
}
function closeLogin() {
    closeNBD(loginDialog);
}
function globalReload() {
    location.reload();
}
function logout_v2(event) {
    event.preventDefault();
    send(JSON.stringify({ action: "logout" }), (res) => {
        ephemeralDialog("Successfully logged out!");
        location.reload();
    });
}
function hashIt(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
;
let bSelVersion = "v4";
function clickSelect(whichOne, openQ = 0) {
    let ctn = byId(whichOne);
    if (openQ != 0)
        ctn.selectOpen = (openQ == 1);
    else
        ctn.selectOpen = !ctn.selectOpen;
    if (!ctn) {
        console.error("No container found!");
        return;
    }
    let inp = ctn.querySelector(".betterSelect");
    inp.readOnly = !ctn.selectOpen;
    inp.style.cursor = ctn.selectOpen ? "text" : "pointer";
    ctn.querySelector(".optionMenu").className = "optionMenu " + (ctn.selectOpen ? "open" : "");
    {
        inp.value = "";
        let children = inp.nextElementSibling.children;
        let valid = ctn.selectOpen;
        for (let i = 0; i < children.length; i++) {
            if (inp.selectedVal == children[i].innerText) {
                valid = true;
                inp.bSelValid = true;
            }
            if (ctn.selectOpen)
                children[i].tabIndex = 0;
            else
                children[i].tabIndex = -1;
        }
        if (valid) {
            inp.placeholder = inp.selectedVal ? inp.selectedVal : "Make a selection...";
            inp.classList.remove("invalid");
        }
        else if (inp.selectedVal != undefined) {
            inp.selectedVal = "";
            inp.bSelValid = false;
            inp.classList.add("invalid");
            inp.placeholder = "Invalid selection";
        }
    }
}
function enterEvent(inp, e) {
    if (!e.target.classList.contains("betterSelect"))
        inp.value = e.target.innerText;
    inp.selectedVal = inp.value;
    clickSelect(inp.parentElement.id);
    inp.focus();
    if (inp.bSelValid)
        inp.parentElement.value = inp.valueMap.get(inp.selectedVal);
    if (inp.bSelOnChangeEvent && inp.bSelValid) {
        inp.bSelOnChangeEvent(inp.selectedVal, inp.valueMap.get(inp.selectedVal));
    }
    e.preventDefault();
}
let registered = [];
function bSelRegister(id, onChange, defaultVal) {
    let ctn = byId(id);
    registered.push(id);
    let inp = ctn.querySelector(".betterSelect");
    inp.bSelOnChangeEvent = onChange;
    inp.valueMap = new Map();
    let children = inp.nextElementSibling.children;
    for (let i = 0; i < children.length; i++) {
        inp.valueMap.set(children[i].innerText, children[i].getAttribute("val") || children[i].getAttribute("value"));
    }
    if (defaultVal) {
        ctn.value = inp.valueMap.get(defaultVal);
        inp.selectedVal = defaultVal;
        inp.value = defaultVal;
        inp.placeholder = defaultVal;
    }
    else
        inp.placeholder = "Make a selection...";
    inp.addEventListener("pointerdown", (e) => {
        for (let i = 0; i < registered.length; i++)
            clickSelect(registered[i], -1);
        clickSelect(e.target.parentElement.id, 1);
        e.preventDefault();
    });
    ctn.addEventListener("pointerup", (e) => {
        if (e.target.classList.contains("option")) {
            let inp = e.target.parentElement.parentElement.querySelector("input");
            enterEvent(inp, e);
        }
    });
    inp.bSelValid = false;
}
function bSelInitialise() {
    console.log("Initialising BetterSelects");
    document.addEventListener("pointerup", (e) => {
        if (!e.target || e.target instanceof HTMLDocument)
            return;
        if (e.target.closest(".bSel"))
            return;
        for (let i = 0; i < registered.length; i++)
            clickSelect(registered[i], -1);
    });
    document.addEventListener("keydown", (e) => {
        if (!e.target.classList.contains("betterSelect")
            && !e.target.classList.contains("option"))
            return;
        let inp;
        if (!e.target.classList.contains("betterSelect"))
            inp = e.target.parentElement.parentElement.querySelector("input");
        else
            inp = e.target;
        switch (e.key) {
            case " ":
                if (e.target.classList.contains("betterSelect"))
                    break;
            case "Enter":
                enterEvent(inp, e);
                return;
            case 'Escape':
                clickSelect(inp.parentElement.id, -1);
                inp.value = "";
                break;
            case 'ArrowDown':
                e.preventDefault();
                clickSelect(inp.parentElement.id, 1);
                if (e.target.classList.contains("option"))
                    if (e.target.nextElementSibling)
                        e.target.nextElementSibling.focus();
                    else
                        e.target.parentElement.children[0].focus();
                else
                    e.target.nextElementSibling.children[0].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                clickSelect(inp.parentElement.id, 1);
                if (e.target.classList.contains("option"))
                    if (e.target.previousElementSibling)
                        e.target.previousElementSibling.focus();
                    else
                        e.target.parentElement.lastElementChild.focus();
                else
                    e.target.nextElementSibling.lastElementChild.focus();
                break;
            default:
                if (e.key.length == 1 && !e.target.classList.contains("betterSelect")) {
                    let inp = e.target.parentElement.parentElement.querySelector("input");
                    inp.focus();
                }
        }
    });
}
;
function getCSSProp(name) {
    return getComputedStyle(document.body).getPropertyValue(name);
}
//# sourceMappingURL=utils.js.map