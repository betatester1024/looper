"use strict";
let minSclFac = 0.5, maxSclFac = 3;
let totalScaleFac = 0.8;
let viewportW = 0, viewportH = 0;
let viewportMax = 0, viewportMin = 0;
function withinViewport(newPt) {
    if (newPt.x < -viewportW / 2)
        return false;
    if (newPt.x > viewportW / 2)
        return false;
    if (newPt.y < -viewportH / 2)
        return false;
    if (newPt.y > viewportH / 2)
        return false;
    return true;
}
function updateMinScl(newVal = minSclFac) {
    minSclFac = newVal;
    viewportW = pCanv.width / minSclFac * 0.4;
    viewportH = pCanv.height / minSclFac * 0.4;
    viewportMax = Math.max(viewportW, viewportH);
    viewportMin = Math.min(viewportW, viewportH);
}
function translate(data, x, y) {
    data.transfm[2] += x;
    data.transfm[5] += y;
    applyTransfm(data);
}
function fromCanvPos(data, canvX, canvY) {
    return { x: (canvX - data.transfm[2]) / data.transfm[0], y: (canvY - data.transfm[5]) / data.transfm[4] };
}
function scale(data, scl) {
    for (let i = 0; i < 6; i++)
        data.transfm[i] *= scl;
    applyTransfm(data);
}
function applyTransfm(data) {
    data.ctx.setTransform(data.transfm[0], data.transfm[3], data.transfm[1], data.transfm[4], data.transfm[2], data.transfm[5]);
}
//# sourceMappingURL=transfm.js.map