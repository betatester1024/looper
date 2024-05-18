"use strict";
function registerEvents() {
    canv.addEventListener("pointermove", onMove);
    canv.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", keyUpdate);
    window.addEventListener("keyup", keyUpdate);
    window.addEventListener("pointerup", onPointerUp);
    canv.addEventListener("wheel", onWheel);
}
let prevX = 0, prevY = 0;
function onMove(ev) {
    if (holdState == K.HOLD_Translate) {
        translate(ev.clientX - prevX, ev.clientY - prevY);
        prevX = ev.clientX;
        prevY = ev.clientY;
        redraw();
    }
}
function onPointerDown(ev) {
    prevX = ev.clientX;
    prevY = ev.clientY;
    canv.style.cursor = "all-scroll";
    holdState = K.HOLD_Translate;
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