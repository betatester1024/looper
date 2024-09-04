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

interface transfmData 
{
  transfm:number[],
  ctx:CanvasRenderingContext2D
}

/// the matrix stuff :V
// let transfm = [1, 0, 0,
//                0, 1, 0];
function translate(data:transfmData, x:number, y:number) {
  data.transfm[2] += x;
  data.transfm[5] += y;
  applyTransfm(data);
}
function fromCanvPos(data:transfmData, canvX:number, canvY:number) {
  return { x: (canvX - data.transfm[2]) / data.transfm[0], y: (canvY - data.transfm[5]) / data.transfm[4] };
}
function scale(data:transfmData, scl:number) {
  // matrix mult with [
  // sclX 0
  // 0  sclY
  // 0  0
  for (let i = 0; i < 6; i++) data.transfm[i] *= scl;
  applyTransfm(data);
}
function applyTransfm(data:transfmData) {
  data.ctx.setTransform(data.transfm[0], data.transfm[3], data.transfm[1], data.transfm[4], data.transfm[2], data.transfm[5]);
}

