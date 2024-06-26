"use strict";
function registerEvents() {
    canv.addEventListener("mousemove", evRedirector_pMove);
    canv.addEventListener("touchmove", evRedirector_pMove);
    canv.addEventListener("mousedown", evRedirector_pDown);
    canv.addEventListener("touchstart", evRedirector_pDown);
    window.addEventListener("keydown", keyUpdate);
    window.addEventListener("keyup", keyUpdate);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    canv.addEventListener("wheel", onWheel);
    setInterval(uiEvents, 100);
    vis(() => {
        if (!vis() && !paused)
            togglePause();
    });
}
function evRedirector_pMove(event) {
    if (event.type.startsWith('touch')) {
        event.preventDefault();
        console.log("touch move");
        event = event;
        onMove({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
    else {
        event = event;
        onMove({ x: event.clientX, y: event.clientY });
    }
}
function evRedirector_pDown(event) {
    if (event.type.startsWith('touch')) {
        event.preventDefault();
        console.log("touch event");
        event = event;
        let p = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        onPointerDown(p);
    }
    else {
        event = event;
        onPointerDown({ x: event.clientX, y: event.clientY });
    }
}
var vis = (function () {
    var stateKey = "", eventKey = "", keys = {
        hidden: "visibilitychange",
        webkitHidden: "webkitvisibilitychange",
        mozHidden: "mozvisibilitychange",
        msHidden: "msvisibilitychange"
    };
    for (stateKey in keys) {
        if (stateKey in document) {
            eventKey = keys[stateKey];
            break;
        }
    }
    return function (c) {
        if (c)
            document.addEventListener(eventKey, c);
        return !document[stateKey];
    };
})();
let prevX = 0, prevY = 0;
let clientPos = { x: 0, y: 0 };
let tooltipTimer = -1;
let modifLoop = null;
let UIRefreshRequest = K.UIREFRESH_All;
let sellTime = -1;
let buildingReadyUpdate = false;
let activeItem = null;
let activeType = -1;
let prevUpgrades = [];
let activeBuilding = -1;
let currPos_canv = { x: 0, y: 0 };
function distBtw(p1, p2) {
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}
function affordabilityUpdated(upgrades) {
    for (let u of upgrades) {
        if (u.cost > energy)
            u.active = false;
    }
    if (upgrades.length != prevUpgrades.length)
        return true;
    for (let i = 0; i < upgrades.length; i++) {
        if (upgrades[i].active != prevUpgrades[i].active)
            return true;
    }
    return false;
}
function buildingReady(b) {
    return timeNow() - b.buildTime >= K.TIME_Build;
}
function reposition(n) {
    for (let e of document.getElementsByClassName('onhover')) {
        e.classList.remove("open");
    }
    if (n < 0)
        return;
    let ele = byId("hover" + n);
    ele.classList.add("open");
    let b = byId("building" + n);
    let gcp = getComputedStyle(ele);
    let delta = Number(gcp.height.replace("px", "")) + b.getBoundingClientRect().top - window.innerHeight;
    console.log(delta);
    if (delta > 0)
        ele.style.top = b.getBoundingClientRect().top
            - 30
            - delta + "px";
    else
        ele.style.top = b.getBoundingClientRect().top
            + "px";
}
function uiEvents() {
    let activeTooltip = generateTooltip(activeItem, activeType);
    let tt = byId("tooltip");
    if (!activeTooltip.active) {
        tt.classList.add("invis");
    }
    else {
        tt.classList.remove("invis");
        tt.style.left = `min(calc(100vw - 220px), ${clientPos.x + 10 + "px"})`;
        tt.style.top = clientPos.y + 10 + "px";
        let bT;
        activeItem = activeItem;
        if (activeItem && activeItem.building &&
            (bT = timeNow() - activeItem.building.buildTime) < K.TIME_Build)
            tt.innerHTML = ` <p><b class="fsvsml">${activeTooltip.title}</b><br>
      <p class="desc">Under construction ${toTime(K.TIME_Build - bT)} left (${tf2(bT / K.TIME_Build * 100)}%)</p>
    </p>`;
        else
            tt.innerHTML = `
    <p><b class="fsvsml">${activeTooltip.title}</b><br>
      <p class="desc">${activeTooltip.desc}</p>
    </p>
    `;
    }
    let upgradeMenu = byId("upgradeMenu_Inner");
    let en = byId("energy");
    en.innerHTML = Math.floor(energy).toLocaleString() + " energy";
    for (let i = 0; i < buildingTypes.length; i++) {
        byId("cost" + i).innerText = tf2(buildingTypes[i].cost) + " energy";
        let b = byId("building" + i);
        if (buildingTypes[i].cost > energy) {
            b.classList.add("disabled");
            byId("cost" + i).classList.add("red2");
        }
        else {
            b.classList.remove("disabled");
            byId("cost" + i).classList.remove("red2");
        }
    }
    let sellEle = byId("sellBuilding");
    if (sellEle) {
        if (timeNow() > sellTime) {
            if (sellEle.classList.contains("disabled")) {
                sellEle.classList.remove("disabled");
                sellEle.outerHTML = getSellButton();
                UIRefreshRequest = K.UIREFRESH_All;
            }
        }
        else {
            sellEle.outerHTML = getSellButton();
            if (!sellEle.classList.contains("disabled"))
                sellEle.classList.add("disabled");
        }
    }
    if (modifLoop && modifLoop.building &&
        buildingReady(modifLoop.building) && buildingReadyUpdate) {
        UIRefreshRequest = K.UIREFRESH_All;
        buildingReadyUpdate = false;
    }
    if (UIRefreshRequest != K.UIREFRESH_None &&
        (UIRefreshRequest != K.UIREFRESH_Cost ||
            modifLoop && modifLoop.building
                && affordabilityUpdated(modifLoop.building.getUpgrades()))) {
        if (modifLoop && modifLoop.building) {
            let title = byId("upgradeTitle");
            title.innerHTML = `<p class="fsvsml">Upgrades: <b>${getStaticVars(modifLoop.building).name}</b></p>`;
            upgradeMenu.innerHTML = "";
            let upgrades = modifLoop.building.getUpgrades();
            for (let u of upgrades) {
                if (energy < u.cost)
                    u.active = false;
            }
            prevUpgrades = upgrades;
            if (!upgrades)
                upgradeMenu.parentElement.classList.add("hidden");
            else
                upgradeMenu.parentElement.classList.remove("hidden");
            for (let i = 0; i < upgrades.length; i++) {
                let u = upgrades[i];
                let cost = upgrades[i].cost;
                upgradeMenu.innerHTML += `
        
        <button 
        onclick="${u.active ? "UIPurchase(" + i + ")" : ""}" 
        class="btn fsvsml upgrade ${u.active ? "" : "disabled"}">
        <b>${u.name}</b>
        <p>${u.active || u.cost > energy ? u.desc : u.descDisabled}</p>
        Cost: <b class="${u.cost > energy ? "red2 nohover nooutline" : ""}">${tf2(u.cost)}</b> energy
        </button>`;
            }
            upgradeMenu.innerHTML += getSellButton();
            if (!buildingReady(modifLoop.building)) {
                buildingReadyUpdate = true;
                upgradeMenu.innerHTML = ` <p><br><br>
            <p class="desc gry nohover">Node is under construction...</p>
          </p>`;
            }
        }
        else if (modifLoop) {
            let title = byId("upgradeTitle");
            title.innerHTML = `<p class="fsvsml">No building placed</p>`;
            upgradeMenu.innerHTML = "<p>Select a building from the sidebar... </p>";
            upgradeMenu.parentElement.classList.remove("hidden");
        }
        else {
            upgradeMenu.parentElement.classList.add("hidden");
        }
        UIRefreshRequest = K.UIREFRESH_None;
    }
}
function getSellButton() {
    if (!modifLoop)
        return "";
    if (!modifLoop.building)
        return "";
    return `<button id="sellBuilding" class="btn blu fsvsml upgrade ${sellTime > timeNow() ? "disabled" : ""}" onclick="sellBuilding()">
    Sell building <br>
    ${sellTime > timeNow() ? toTime(sellTime - timeNow()) :
        `<b>${tf2(modifLoop.building.value * K.MISC_CostRecovery)}</b> energy`}
  </button>`;
}
function sellBuilding() {
    if (sellTime > timeNow())
        return;
    if (!modifLoop)
        return;
    energy += modifLoop.building.value * K.MISC_CostRecovery;
    modifLoop.building = null;
    for (let i = 0; i < animatingBeams.length; i++) {
        if (animatingBeams[i].loc == modifLoop.loc) {
            animatingBeams.splice(i, 1);
            i--;
        }
    }
    sellTime = timeNow() + K.TIME_SellBuilding;
    UIRefreshRequest = K.UIREFRESH_All;
}
function UIPurchase(n) {
    if (!modifLoop || !modifLoop.building)
        ephemeralDialog("Could not find the applicable building.");
    else {
        let cost = modifLoop.building.getUpgrades()[n].cost;
        energy -= cost;
        modifLoop.building.upgrade(n);
        modifLoop.building.value += cost;
    }
    UIRefreshRequest = K.UIREFRESH_All;
}
function canvPos(l) {
    return { x: x(l.loc), y: y(l.loc) };
}
function nearestLoop(p, acceptRad = 9e99) {
    let nearestDist = 9e99;
    let nearestLoop = null;
    for (let l of loops) {
        if (distBtw(canvPos(l), p) < nearestDist) {
            nearestDist = distBtw(canvPos(l), p);
            nearestLoop = l;
        }
    }
    return nearestDist < acceptRad ? nearestLoop : null;
}
function nearestLooper(p, acceptRad = 9e99) {
    let nearestDist = 9e99;
    let nearestLooper = null;
    for (let l of loopers) {
        let c = K.SIZE_Loop * Math.cos(2 * Math.PI * l.loopPct);
        let s = K.SIZE_Loop * Math.sin(2 * Math.PI * l.loopPct);
        let x2 = x(l.loc) + c;
        let y2 = y(l.loc) + s;
        if (distBtw({ x: x2, y: y2 }, p) < nearestDist) {
            nearestDist = distBtw({ x: x2, y: y2 }, p);
            nearestLooper = l;
        }
    }
    return nearestDist < acceptRad ? nearestLooper : null;
}
function generateTooltip(item, type) {
    switch (type) {
        case K.TYPE_Loop:
            item = item;
            if (item.building)
                return { active: true, title: getStaticVars(item.building).name, desc: item.building.generateDesc() };
            else
                return { active: true, title: "Empty loop", desc: `Active loopers: ${loopersAt(item.loc).length}` };
        case K.TYPE_Looper:
            calcTotalStress();
            item = item;
            return { active: true, title: "Looper", desc: `Health: ${tf2(item.health)} (${tf2(item.health / item.totalHealth * 100)}%)
      Energy: ${tf2(item.energy)}
      Stress: ${tf2(item.stress)} (${tf2(item.stress / totalStress * 100)}% contribution)
      ` };
        default:
            return { active: false, title: "", desc: "" };
    }
}
function build(type, loop) {
    if (type.cost > energy) { }
    else if (loop.building)
        ephemeralDialog("A building already exists here.");
    else {
        energy -= type.cost;
        loop.building = new type(loop.loc);
        UIRefreshRequest = K.UIREFRESH_All;
        loop.building.value = type.cost;
    }
}
function setActiveBuilding(id) {
    if (modifLoop && !modifLoop.building) {
        build(buildingTypes[id], modifLoop);
        return;
    }
    if (id >= 0 && buildingTypes[id].cost > energy)
        return;
    for (let e of document.getElementsByClassName("building")) {
        e.classList.remove("active");
    }
    if (id >= 0)
        byId("building" + id).classList.add("active");
    activeBuilding = id;
}
function activateTooltip() {
    let nearestL = nearestLoop(currPos_canv, K.SIZE_Loop);
    let nearestL2 = nearestLooper(currPos_canv, K.SIZE_Looper);
    if (nearestL2) {
        activeItem = nearestL2;
        activeType = K.TYPE_Looper;
    }
    else if (nearestL) {
        activeItem = nearestL;
        activeType = K.TYPE_Loop;
    }
    else
        activeType = -1;
}
function onMove(ev) {
    clientPos = { x: ev.x, y: ev.y };
    currPos_canv = fromCanvPos(ev.x, ev.y);
    if (holdState == K.HOLD_None) {
        activeType = -1;
        let nearestL2 = nearestLooper(currPos_canv, K.SIZE_Looper);
        let nearestL = nearestLoop(currPos_canv, K.SIZE_Loop);
        if (nearestL || paused && nearestL2)
            canv.style.cursor = "pointer";
        else
            canv.style.cursor = "";
        if (tooltipTimer < 0 && nearestL || paused && nearestL2) {
            tooltipTimer = setTimeout(activateTooltip, K.TIME_Tooltip);
        }
        else {
            clearTimeout(tooltipTimer);
            if (nearestL)
                tooltipTimer = setTimeout(activateTooltip, K.TIME_Tooltip);
        }
    }
    if (holdState == K.HOLD_Translate) {
        translate(ev.x - prevX, ev.y - prevY);
        prevX = ev.x;
        prevY = ev.y;
        redraw();
    }
}
function onPointerDown(ev) {
    currPos_canv = fromCanvPos(ev.x, ev.y);
    let nL = nearestLoop(currPos_canv, K.SIZE_Loop);
    if (!nL) {
        modifLoop = null;
        UIRefreshRequest = K.UIREFRESH_All;
    }
    if (activeBuilding >= 0) {
        if (nL) {
            if (nL.building)
                ephemeralDialog("A building already exists here!");
            else
                build(buildingTypes[activeBuilding], nL);
        }
        setActiveBuilding(-1);
    }
    else if (nL) {
        modifLoop = nL;
        UIRefreshRequest = K.UIREFRESH_All;
    }
    else {
        prevX = ev.x;
        prevY = ev.y;
        canv.style.cursor = "all-scroll";
        holdState = K.HOLD_Translate;
    }
    console.log("pointerdown");
}
function onPointerUp(ev) {
    holdState = K.HOLD_None;
    canv.style.cursor = "default";
    console.log("pointerup");
}
function keyUpdate(ev) { }
function onWheel(ev) {
    let sclFac = (ev.deltaY < 0 ? 1.15 : 1 / 1.15);
    if (sclFac * totalScaleFac > maxSclFac)
        sclFac = maxSclFac / totalScaleFac;
    if (sclFac * totalScaleFac < minSclFac)
        sclFac = minSclFac / totalScaleFac;
    translate(-ev.clientX, -ev.clientY);
    scale(sclFac);
    translate(ev.clientX, ev.clientY);
    totalScaleFac *= sclFac;
    redraw();
}
//# sourceMappingURL=events.js.map