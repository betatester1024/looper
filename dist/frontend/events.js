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
function distBtw(p1, p2) {
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}
function uiEvents() {
    let activeTooltip = generateTooltip(activeItem, activeType);
    let tt = byId("tooltip");
    if (!activeTooltip.active) {
        tt.classList.add("invis");
        return;
    }
    tt.classList.remove("invis");
    tt.style.left = `min(calc(100vw - 220px), ${clientPos.x + 10 + "px"})`;
    tt.style.top = clientPos.y + 10 + "px";
    tt.innerHTML = `
  <p><b class="fsvsml">${activeTooltip.title}</b><br>
    <p class="desc">${activeTooltip.desc}</p>
  </p>
  `;
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
    if (activeBuilding >= 0) {
        let nL = nearestLoop(currPos_canv, K.SIZE_Loop);
        if (nL) {
            if (nL.building)
                ephemeralDialog("A building already exists here!");
            else
                nL.building = new buildingTypes[activeBuilding](nL.loc);
        }
        setActiveBuilding(-1);
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