/// BE REALLY CAREFUL IF YOU TOUCH ANY OF THIS STUFF

let minSclFac = 0.5, maxSclFac = 3;
let totalScaleFac = 0.8;
let viewportW = 0, viewportH = 0;
let viewportMax = 0, viewportMin = 0;

interface Point {
  x:number, y:number
}

function withinViewport(newPt:Point) {
  // let viewportScl = minSclFac*0.8;
  // should be <1 and decreasing
  if (newPt.x < -viewportW / 2) return false;
  if (newPt.x > viewportW / 2) return false;
  if (newPt.y < -viewportH / 2) return false;
  if (newPt.y > viewportH / 2) return false;
  return true;
}

function updateMinScl(newVal:number = minSclFac) {
  minSclFac = newVal;
  viewportW = pCanv.width / minSclFac * 0.4;
  viewportH = pCanv.height / minSclFac * 0.4;
  viewportMax = Math.max(viewportW, viewportH);
  viewportMin = Math.min(viewportW, viewportH);
}

/// the matrix stuff :V
let transfm = [1, 0, 0,
               0, 1, 0];
function translate(ctx:CanvasRenderingContext2D, x:number, y:number) {
  transfm[2] += x;
  transfm[5] += y;
  applyTransfm(ctx);
}
function fromCanvPos(canvX:number, canvY:number) {
  return { x: (canvX - transfm[2]) / transfm[0], y: (canvY - transfm[5]) / transfm[4] };
}
function scale(ctx:CanvasRenderingContext2D, scl:number) {
  // matrix mult with [
  // sclX 0
  // 0  sclY
  // 0  0
  for (let i = 0; i < 6; i++) transfm[i] *= scl;
  applyTransfm(ctx);
}
function applyTransfm(c:CanvasRenderingContext2D) {
  c.setTransform(transfm[0], transfm[3], transfm[1], transfm[4], transfm[2], transfm[5]);
}

