const DEBUG = false;

let prevTime = performance.now();
function redraw(time:DOMHighResTimeStamp=performance.now()) {
  let delta = time - prevTime;
  prevTime = time;
  let fpsCurr = 1000/delta;
  updateMinScl();
  pCtx.lineCap = "round";
  pCtx.strokeStyle = K.COLOUR_Default;
  pCtx.beginPath();
  pCtx.save();
  pCtx.resetTransform();
  pCtx.fillStyle = getCSSProp("--system-bg");
  pCtx.clearRect(0, 0, pCanv.width, pCanv.height);
  pCtx.fillRect(0, 0, pCanv.width, pCanv.height);
  pCtx.restore();
  pCtx.lineWidth = 3;
  if (DEBUG) {
    pCtx.beginPath();
    pCtx.moveTo(-viewportW / 2, -viewportH/2);
    pCtx.lineTo(viewportW / 2, -viewportH/2);
    pCtx.lineTo(viewportW / 2, viewportH/2);
    pCtx.lineTo(-viewportW/2, viewportH/2);
    pCtx.lineTo(-viewportW/2, -viewportH/2);
    pCtx.stroke();
  }
  
  pCtx.save();
  for (let a of animatingBeams) {
    pCtx.save();
    pCtx.beginPath();
    let c = K.SIZE_Loop*Math.cos(a.angle);
    let s = K.SIZE_Loop*Math.sin(a.angle);
    pCtx.strokeStyle = K.COLOUR_Beam;//((timeNow()-a.aStart)/K.TIME_BeamAnim*16).toString(16);
    pCtx.globalAlpha = Math.max(1-(timeNow()-a.aStart)/K.TIME_BeamAnim, 0);
    pCtx.moveTo(x(a), y(a));
    pCtx.lineTo(x(a)+c, y(a)+s);
    pCtx.stroke();
    pCtx.restore();
  }
  for (let l of loops) {
    pCtx.beginPath();
    pCtx.arc(x(l), y(l), K.SIZE_Loop*Math.min(1, (timeNow()-l.addTime)/K.TIME_AddLoop), 0, 2*Math.PI);
    pCtx.strokeStyle = (l == modifLoop?K.COLOUR_Select:K.COLOUR_Loop);
    pCtx.stroke();
    if (l.failPct > 0) 
    {
      pCtx.save();
      pCtx.beginPath();
      pCtx.globalAlpha = 0.6;
      pCtx.fillStyle = K.COLOUR_Alert;
      pCtx.moveTo(x(l), y(l));
      pCtx.arc(x(l), y(l), K.SIZE_Loop, 0, 2*Math.PI*l.failPct);
      pCtx.lineTo(x(l), y(l));
      pCtx.fill();
      pCtx.restore();
    }
    if (l.building) {
      let bPct = (timeNow() - l.building.buildTime)/K.TIME_Build;
      let cPercent = bPct>1?l.building.chargePercentage():bPct;
      pCtx.save();
      pCtx.beginPath();
      pCtx.arc(x(l), y(l), K.SIZE_Building, 0, 2*Math.PI);
      pCtx.lineWidth = 5;
      pCtx.stroke();
      pCtx.textAlign = "center";
      pCtx.textBaseline = "middle";
      let clr2 = K.COLOUR_Building+Math.floor(bPct*256).toString(16).padStart(2, '0');
      // console.log(clr2);
      pCtx.fillStyle = bPct>1?K.COLOUR_Building:clr2
      pCtx.fill();
      pCtx.font = "16px Noto Sans Display";
      pCtx.fillStyle = "#fff";
      pCtx.fillText(getStaticVars(l.building).char, x(l), y(l));
      pCtx.beginPath();
      
      pCtx.strokeStyle = K.COLOUR_Active;
      if (bPct < 1) {
        pCtx.strokeStyle = K.COLOUR_Pending;
      }
      if (cPercent < 0) {
        cPercent = Math.abs(cPercent);
        pCtx.strokeStyle = K.COLOUR_Inactive;
      }
      if (cPercent > 0) {
        pCtx.beginPath();
        
        pCtx.arc(x(l), y(l), K.SIZE_Building+2, 0, 2*Math.PI*cPercent);
        pCtx.stroke();
      }
      pCtx.restore();
    }
  }
  for (let l of removedLoopers) {
    drawLooper(l);
  }
  for (let l of loopers) {
    drawLooper(l);
  }
 
  function drawLooper(l:Looper) {
    pCtx.beginPath();
    let c = K.SIZE_Loop*Math.cos(Math.PI*2*l.loopPct);
    let s = K.SIZE_Loop*Math.sin(Math.PI*2*l.loopPct);
    pCtx.moveTo(x(l)+c, y(l)+s);
    pCtx.arc(x(l)+c, y(l)+s, l.removalTime>0?Math.max(1-(timeNow()-l.removalTime)/K.TIME_LooperDestructAnim, 0)*K.SIZE_Looper:K.SIZE_Looper, 0, 2*Math.PI);
    pCtx.fillStyle = l.removalTime < 0?l.colour:K.COLOUR_Inactive;
    pCtx.strokeStyle = K.COLOUR_Default;
    pCtx.fill();
    pCtx.beginPath();
    pCtx.arc(x(l)+c, y(l)+s, K.SIZE_Looper, 0, 2*Math.PI*l.health/l.totalHealth);
    if (l.removalTime < 0) pCtx.stroke();
  }
  pCtx.restore();
  pCtx.save();
    pCtx.resetTransform();
    if (fpsCurr < 25) pCtx.fillStyle = getCSSProp('--system-red');
    else if (fpsCurr < 40) pCtx.fillStyle = getCSSProp('--system-yellowtext');
    else pCtx.fillStyle = getCSSProp('--system-green');
    pCtx.font = "16px Noto Sans Display";
    pCtx.fillText(fpsCurr.toFixed(2)+"fps", 50, 120)
    pCtx.fillRect(40, 113.5, 5, 5);
    if (paused) {
      pCtx.font = "30px Noto Sans Display";
      pCtx.fillStyle = getCSSProp("--system-blue");
      pCtx.fillText("Game paused.", 40, 150);
    }
  pCtx.restore();
}

function x(l:Loop|Looper|animInfo) {
  
  let loc = l.loc;
  if (l instanceof Looper) {
    l = loopAt(l.loc)!;
  }
  if (l instanceof Loop && l.failTime > 0)
  {
    let dx = l.animX!*(timeNow()-l.failTime)/K.TIME_FailAnim*K.MISC_AnimDist;
    return loc.x*2*K.SIZE_Loop + dx;
  }
  else {
    return loc.x*2*K.SIZE_Loop;
  }
}
function y(l:Loop|Looper|animInfo) {
  let loc = l.loc;
  if (l instanceof Looper) {
    l = loopAt(l.loc)!;
  }
  if (l instanceof Loop && l.failTime > 0)
  {
    let pct = (timeNow()-l.failTime)/K.TIME_FailAnim;
    return loc.y*2*K.SIZE_Loop + 160*pct*pct;
  }
  else {
    return loc.y*2*K.SIZE_Loop;
  }
}

function pgredraw() 
{
  sCtx.save();
    sCtx.resetTransform();
    sCtx.clearRect(0, 0, sCanv.width, sCanv.height);
  sCtx.restore();
  sCtx.beginPath();
  sCtx.moveTo(-sCanv.width/2, -sCanv.height/2);
  sCtx.lineTo(sCanv.width/2, sCanv.height/2); 
  sCtx.stroke();
}