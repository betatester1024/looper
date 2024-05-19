const DEBUG = true;

let prevTime = performance.now();
function redraw(time:DOMHighResTimeStamp=performance.now()) {
  let delta = time - prevTime;
  prevTime = time;
  let fpsCurr = 1000/delta;
  updateMinScl();
  ctx.lineCap = "round";
  ctx.strokeStyle = K.COLOUR_Default;
  ctx.beginPath();
  ctx.save();
  ctx.resetTransform();
  ctx.fillStyle = getCSSProp("--system-bg");
  ctx.clearRect(0, 0, canv.width, canv.height);
  ctx.fillRect(0, 0, canv.width, canv.height);
  ctx.restore();
  if (DEBUG) {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.moveTo(-viewportW / 2, -viewportH/2);
    ctx.lineTo(viewportW / 2, -viewportH/2);
    ctx.lineTo(viewportW / 2, viewportH/2);
    ctx.lineTo(-viewportW/2, viewportH/2);
    ctx.lineTo(-viewportW/2, -viewportH/2);
    ctx.stroke();
    ctx.save();
    if (fpsCurr < 25) ctx.fillStyle = getCSSProp('--system-red');
    else if (fpsCurr < 40) ctx.fillStyle = getCSSProp('--system-yellowtext');
    else ctx.fillStyle = getCSSProp('--system-green');
    ctx.fillText(fpsCurr.toFixed(2)+"fps", -viewportW/2+30, -viewportH/2+30)
    ctx.fillRect(-viewportW/2+20, -viewportH/2+25, 5, 5);
      ctx.restore();
  }
  ctx.save();
  for (let l of loops) {
    ctx.beginPath();
    ctx.arc(x(l.loc), y(l.loc), K.SIZE_Loop, 0, 2*Math.PI);
    ctx.strokeStyle = (l == modifLoop?K.COLOUR_Active:K.COLOUR_Loop);
    ctx.stroke();
    if (l.building) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x(l.loc), y(l.loc), K.SIZE_Building, 0, 2*Math.PI);
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = K.COLOUR_Building;
      ctx.fill();
      let cPercent = l.building.chargePercentage();
      ctx.strokeStyle = K.COLOUR_Active;
      if (cPercent < 0) {
        cPercent = Math.abs(cPercent);
        ctx.strokeStyle = K.COLOUR_Inactive;
      }
      if (cPercent > 0) {
        ctx.beginPath();
        
        ctx.arc(x(l.loc), y(l.loc), K.SIZE_Building+2, 0, 2*Math.PI*cPercent);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  for (let l of loopers) {
    ctx.beginPath();
    let c = K.SIZE_Loop*Math.cos(Math.PI*2*l.loopPct);
    let s = K.SIZE_Loop*Math.sin(Math.PI*2*l.loopPct);
    ctx.arc(x(l.loc)+c, y(l.loc)+s, K.SIZE_Looper, 0, 2*Math.PI);
    ctx.fillStyle = K.COLOUR_Looper;
    ctx.strokeStyle = K.COLOUR_Default;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x(l.loc)+c, y(l.loc)+s, K.SIZE_Looper, 0, 2*Math.PI*l.health/l.totalHealth);
    ctx.stroke();
  }
  ctx.restore();
}

function x(loc:Point) {
  return loc.x*2*K.SIZE_Loop;
}
function y(loc:Point) {
  return loc.y*2*K.SIZE_Loop;
}