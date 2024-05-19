"use strict";
function registerEvents() {
    canv.addEventListener("pointermove", onMove);
    canv.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", keyUpdate);
    window.addEventListener("keyup", keyUpdate);
    window.addEventListener("pointerup", onPointerUp);
    canv.addEventListener("wheel", onWheel);
    setInterval(uiEvents, 100);
}
let prevX = 0, prevY = 0;
let clientPos = { x: 0, y: 0 };
let tooltipTimer = -1;
let modifLoop = null;
let modifLoopUpdated = false;
function distBtw(p1, p2) {
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
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
        tt.innerHTML = `
    <p><b class="fsvsml">${activeTooltip.title}</b><br>
      <p class="desc">${activeTooltip.desc}</p>
    </p>
    `;
    }
    let upgradeMenu = byId("upgradeMenu_Inner");
    if (modifLoopUpdated) {
        modifLoopUpdated = false;
        if (modifLoop && modifLoop.building) {
            let title = byId("upgradeTitle");
            title.innerHTML = `<p class="fsvsml">Upgrades: <b>${getStaticVars(modifLoop.building).name}</b></p>`;
            upgradeMenu.innerHTML = "";
            let upgrades = modifLoop.building ? modifLoop.building.getUpgrades() : [];
            if (!upgrades)
                upgradeMenu.parentElement.classList.add("hidden");
            else
                upgradeMenu.parentElement.classList.remove("hidden");
            for (let i = 0; i < upgrades.length; i++) {
                let u = upgrades[i];
                upgradeMenu.innerHTML += `
        
        <button 
        onclick="${u.active ? "UIPurchase(" + i + ")" : ""}" 
        class="btn fsvsml upgrade ${u.active ? "" : "disabled"}">
        <b>${u.name}</b>
        <p>${u.active ? u.desc : u.descDisabled}</p>
        Cost: <b>${u.cost}</b>
        </button>`;
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
    }
}
function UIPurchase(n) {
    if (!modifLoop || !modifLoop.building)
        ephemeralDialog("Could not find the applicable building.");
    else
        modifLoop.building.upgrade(n);
    modifLoopUpdated = true;
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
let activeItem = null;
let activeType = -1;
function generateTooltip(item, type) {
    switch (type) {
        case K.TYPE_Loop:
            if (item.building)
                return { active: true, title: getStaticVars(item.building).name, desc: item.building.generateDesc() };
            else
                return { active: true, title: "Empty loop", desc: `Active loopers: ${loopersAt(item.loc).length}` };
        default:
            return { active: false, title: "", desc: "" };
    }
}
let activeBuilding = -1;
function setActiveBuilding(id) {
    if (modifLoop && !modifLoop.building) {
        modifLoop.building = new buildingTypes[id](modifLoop.loc);
        return;
    }
    for (let e of document.getElementsByClassName("building")) {
        e.classList.remove("active");
    }
    if (id >= 0)
        byId("building" + id).classList.add("active");
    activeBuilding = id;
}
let currPos_canv = { x: 0, y: 0 };
function activateTooltip() {
    let nearestL = nearestLoop(currPos_canv, K.SIZE_Loop);
    if (nearestL) {
        activeItem = nearestL;
        activeType = K.TYPE_Loop;
    }
    else
        activeType = -1;
}
function onMove(ev) {
    clientPos = { x: ev.clientX, y: ev.clientY };
    currPos_canv = fromCanvPos(ev.clientX, ev.clientY);
    if (holdState == K.HOLD_None) {
        activeType = -1;
        let nearestL = nearestLoop(currPos_canv, K.SIZE_Loop);
        if (nearestL)
            canv.style.cursor = "pointer";
        else
            canv.style.cursor = "";
        if (tooltipTimer < 0 && nearestL) {
            tooltipTimer = setTimeout(activateTooltip, K.TIME_Tooltip);
        }
        else {
            clearTimeout(tooltipTimer);
            if (nearestL)
                tooltipTimer = setTimeout(activateTooltip, K.TIME_Tooltip);
        }
    }
    if (holdState == K.HOLD_Translate) {
        translate(ev.clientX - prevX, ev.clientY - prevY);
        prevX = ev.clientX;
        prevY = ev.clientY;
        redraw();
    }
}
function onPointerDown(ev) {
    let nL = nearestLoop(currPos_canv, K.SIZE_Loop);
    if (!nL) {
        modifLoop = null;
        modifLoopUpdated = true;
    }
    if (activeBuilding >= 0) {
        if (nL) {
            if (nL.building)
                ephemeralDialog("A building already exists here!");
            else
                nL.building = new buildingTypes[activeBuilding](nL.loc);
        }
        setActiveBuilding(-1);
    }
    else if (nL) {
        modifLoop = nL;
        modifLoopUpdated = true;
    }
    else {
        prevX = ev.clientX;
        prevY = ev.clientY;
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