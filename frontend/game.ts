const K = {
  HOLD_None:0,
  HOLD_Translate:1,

  COLOUR_Default:"#444",
  COLOUR_Loop:"#666",
  COLOUR_Looper:"#c00",
  COLOUR_Building:"#0000cc",
  COLOUR_Active:"#0c0",
  COLOUR_Select:"#0cc",
  COLOUR_Pending:"#c00",
  COLOUR_Inactive:"#555",
  COLOUR_Alert: "#c00",
  COLOUR_Beam:"#000",

  SPEED_Base:0.3,
  SPEED_Minimum:0.05,

  SIZE_Loop:40,
  SIZE_Looper:10,
  SIZE_Building:20,

  TYPE_Loop:0,
  TYPE_Building:1,
  TYPE_Looper:2,

  TIME_Tooltip: 500,
  TIME_GameLoss:20000, // 20000
  TIME_Round:30000, // 30000
  TIME_Refresh:15,
  TIME_Build:2000,
  TIME_AddLoop:200,
  TIME_BeamAnim:500,
  TIME_FailAnim:700,
  TIME_LoopFail:3000,
  TIME_SellBuilding:45000,
  TIME_LooperDestructAnim:500,

  MISC_CostRecovery:0.75,
  MISC_MaxLooperCt:10,
  MISC_AnimDist:50, // distance loop wiggles when exploding

  STRESS_Base:0.7, // +0.7 stress/sec
  STRESS_Minimum:0.01,

  PROB_Exit:0.5,
  PROB_AddLoop:0.8,

  UIREFRESH_None:0,
  UIREFRESH_Cost:1,
  UIREFRESH_All:2,
}



class Looper {
  energy:number = 30;
  status:number=0;
  removalTime:number=-1;
  loc:Point;
  health:number;
  totalHealth:number;
  stress:number = 0;
  loopPct:number;
  stressFactor:number = 1;
  cw:boolean;
  speed:number; // percent/sec
  constructor(loop:Loop, looperHealth:number) 
  {
    this.loc = {x:loop.loc.x, y:loop.loc.y};
    this.health = looperHealth;
    this.totalHealth = looperHealth; 
    this.loopPct = Math.random();
    this.cw = rand([true, false]);
    this.speed = K.SPEED_Base;
  }
}

function loopersAt(loc:Point){
  let out = [];
  for (let i=0; i<loopers.length; i++) {
    if (loopers[i].loc.x == loc.x && loopers[i].loc.y == loc.y) out.push(i);
  }
  return out;
}

function loopAt(loc:Point){
  for (let i=0; i<loops.length; i++) {
    if (loops[i].loc.x == loc.x && loops[i].loc.y == loc.y) return loops[i]
  }
  return null;
}

function rand(arr:any[]) {
  return arr[Math.floor(Math.random()*arr.length)];
}

interface AttackInfo {
  target:number,
  power:number,
}


class Loop {
  loc:Point;
  addTime:number;
  building:Building|null = null;
  failPct:number = 0;
  failTime:number = 0;
  animX:number;
  constructor(loc:Point) 
  {
    this.loc = loc; 
    this.addTime = timeNow();
    this.animX = Math.random() - 0.5;
  }
}
interface animInfo {
  loc:Point,
  angle:number,
  looper:Looper,
  aStart:number,
  persist:boolean
}
function onLoad() {
  console.log("hello, there.");
}

function getStaticVars(obj:Object) {
  return Object.getPrototypeOf(obj).constructor;
}

let loops:Loop[] = [];
let loopers:Looper[] = [];
let animatingBeams:animInfo[] = [];
let removedLoopers:Looper[] = [];
let holdState:number = K.HOLD_None;
let totalStress = 0;
let looperCt = 2;
let maxStress = 200;
let roundCt = 1;
let gameLost = false;
let energy = 300;
let minLooperHealth = 10;
let maxLooperHealth = 30;
let mainLoopID:any = -1;
let globalTicks = 0;
let paused = false;
let lastTime = timeNow();
let failureTime = 0;
let stressNotification = true;
let nextRound = K.TIME_Round;
let pauseStart = -1;
let tickCounter_lastTime = Date.now();
let canv:HTMLCanvasElement;
let ctx:CanvasRenderingContext2D;

function timeNow() {
  return globalTicks;
}
function togglePause() {
  if (paused) {
    document.title = "thing";
    byId("playpause")!.innerHTML = "pause";
    mainLoopID = setInterval(gameLoop,K.TIME_Refresh);
    byId("roundTimer")!.style.backgroundColor = getCSSProp("--system-blue3");
  }
  else {
    byId("playpause")!.innerHTML = "play_arrow";
    document.title = "thing (paused)";
    
    let sL = byId("stressLevel") as HTMLDivElement;
    let rT = byId("roundTimer") as HTMLDivElement;
    sL.innerHTML += " (paused)";
    sL.style.backgroundColor = getCSSProp("--system-grey2");
    rT.innerHTML += " (paused)";
    rT.style.backgroundColor = getCSSProp("--system-grey2");
    clearInterval(mainLoopID);
  }
  paused = !paused;
}
function preLoad() {
  registerMaximisingCanvas("canv", 1, 1, redraw);
  registerEvents();
  translate(canv.width/2, canv.height/2);
  let sidebar = byId("sidebar") as HTMLDivElement;
  for (let i=0; i<buildingTypes.length; i++) {
    let ty = buildingTypes[i];
    sidebar.innerHTML += `<div class="building" id="building${i}" onmouseout="reposition(-1)" onmouseover="reposition(${i})" onclick="setActiveBuilding(${i})">
    ${ty.char}
    </div>`;
    let tooltipBar = byId("tooltipBar") as HTMLDivElement;
    tooltipBar.innerHTML += `<div class="onhover" id="hover${i}">
    <b id="title${i}">${ty.name}</b><br>
    <b id="cost${i}">${ty.cost} energy</b><br>
    <p class="preserveLines">${ty.genDesc}</p></div>`;
    
  }
  setInterval(redraw, K.TIME_Refresh);
  setInterval(()=>{
    if (!paused) {
      globalTicks += Date.now() - tickCounter_lastTime;
    }
    tickCounter_lastTime = Date.now();
  }, K.TIME_Refresh);
  mainLoopID = setInterval(gameLoop, K.TIME_Refresh);
  initLooper();
}
function addRandomLooper() {
  if (loops.length == 0) return;
  let loop = rand(loops);
  let looperHealth = minLooperHealth + Math.random()*(maxLooperHealth-minLooperHealth);
  loopers.push(new Looper(loop, looperHealth));
}
function addRandomLoop() {
  if (loops.length == 0) return;
  // n^2 :l
  let possibleLocs = [];
  for (let l of loops) {
    let dx = [0,0,1,-1];
    let dy = [1,-1,0,0];
    for (let i=0; i<4; i++) {
      let poss = true;
      for (let l2 of loops) {
        if (l2.loc.x == l.loc.x+dx[i] && l2.loc.y == l.loc.y+dy[i]) {
          poss = false;
          break;
        }
      }
      if (poss) possibleLocs.push({x:l.loc.x+dx[i], y:l.loc.y+dy[i]});
    }
  }
  loops.push(new Loop(rand(possibleLocs)));
}
function initLooper() {
  loops.push(new Loop({x:0, y:0}));
  addRandomLooper();
}
function modPos(v:number, m:number) {
  return ((v%m)+m)%m;
}
function existsLoop(x:number, y:number) {
  for (let l of loops) {
    if (l.loc.x == x && l.loc.y == y) return true;
  }
  return false;
}
function calcTotalStress() {
  totalStress =0;
  for (let l of loopers) {
    totalStress += l.stress;
  }
}
function gameLoop() {
  let delta = timeNow() - lastTime;
  nextRound -= delta;
  if (nextRound < 0) {
    newRound();
  }
  let roundTimer = byId("roundTimer") as HTMLDivElement;
  roundTimer.style.width = `${(1 -nextRound/K.TIME_Round)*100}%`;
  roundTimer.innerText = "Round "+roundCt;
  lastTime = timeNow();
  let stressLevel = byId("stressLevel") as HTMLDivElement;
  let overloadTimer = byId("overloadTimer") as HTMLDivElement;
  calcTotalStress();
  stressLevel.style.width = Math.min(Math.max(0.001,totalStress/maxStress), 1)*100+"%";
  if (totalStress > maxStress*0.8) stressLevel.style.backgroundColor = getCSSProp("--system-yellow3");
  if (totalStress > maxStress) {
    if (stressNotification) {
      ephemeralDialog("Stress level critical - control active loopers to preserve your system!");
      stressNotification = false;
    }
    failureTime += delta;
    if (failureTime > K.TIME_GameLoss && !gameLost) {
      for (let l of loops) {
        l.failTime = l.failTime>0 ? l.failTime : timeNow();
        l.failPct = 1;
      }
      gameLost = true;
      setTimeout(()=>{
        ephemeralDialog("You lose.");
        togglePause();
        clearGameArea();  
      }, K.TIME_FailAnim*2);
    }
    overloadTimer.style.width = (failureTime)/K.TIME_GameLoss*100 + "%";
    stressLevel.style.animation = "blinkingRed 2s infinite";
  }
  else {
    stressLevel.style.animation = "";
  }
  if (totalStress < maxStress*0.8) {
    stressLevel.style.backgroundColor = getCSSProp("--system-blue3");
    failureTime = 0;
    overloadTimer.style.width = "0%";
  }
  stressLevel.innerText = (totalStress/maxStress*100).toPrecision(3)+"%";
  for (let i=0; i<animatingBeams.length; i++) {
    if (timeNow() - animatingBeams[i].aStart > K.TIME_BeamAnim) {
      animatingBeams.splice(i, 1);
      i--;
    }
  }
  for (let l of loopers) {
    let dStress = K.STRESS_Base*delta/1000;
    l.stress += dStress*l.stressFactor; 
    let pctBefore = l.loopPct;
    l.loopPct = modPos(l.loopPct+(l.cw?1:-1)*delta/1000*l.speed, 1);
    const dx = [1, 0, -1, 0];
    const dy = [0, 1, 0, -1];
    let exitPct = [0.5, 0.75, 0, 0.25];
    for (let check = 0; check < 1; check += 0.25)
      if ((l.cw && (check==0?pctBefore>0.75 && l.loopPct < 0.25:pctBefore<check && l.loopPct > check) 
        || !l.cw && (check==0?pctBefore < 0.25 && l.loopPct>0.75:pctBefore > check && l.loopPct < check))
        && Math.random() < K.PROB_Exit 
        && existsLoop(l.loc.x+dx[check*4], l.loc.y+dy[check*4])) {
        
        l.loc.x += dx[check*4];
        l.loc.y += dy[check*4];
        let before2 = l.loopPct;
        l.loopPct = modPos(exitPct[check*4] - (l.cw?0.001:-0.001), 1);
        l.cw = !l.cw;
        break;
      }
    if (l.loopPct >= 1) l.loopPct -= 1;
  }

  // handle removed loopers
  let toRemove = [];
  for (let l of removedLoopers) {
    if (timeNow() - l.removalTime > K.TIME_LooperDestructAnim) {
      toRemove.push(l);
      continue;
    }
  }
  for (let l of toRemove) {
    removedLoopers.splice(removedLoopers.indexOf(l), 1);
  }
  for (let loop of loops) {
    if (loop.failTime > 0)  // irreversible failure
    {
      if (timeNow() - loop.failTime > K.TIME_FailAnim && !gameLost) {
        loops.splice(loops.indexOf(loop), 1);
        for (let i=0; i<loopers.length; i++) 
        {
          if (loopers[i].loc.x == loop.loc.x && loopers[i].loc.y == loop.loc.y) {
            loopers.splice(i, 1);
            i--;
          }
        }
        if (loops.length == 0) {
          togglePause();
          clearGameArea();
        }
      }
      continue;
    }
    if (loop.building && timeNow() - loop.building.buildTime > K.TIME_Build) {
      loop.building.computeAttack();
    }  
    if (loopersAt(loop.loc).length > K.MISC_MaxLooperCt) 
    {
      loop.failPct += delta/K.TIME_LoopFail;
      if (loop.failPct > 1) {
        loop.failTime = timeNow();
      }
    }
    else if (!gameLost)
      loop.failPct = Math.max(0, loop.failPct - delta/K.TIME_LoopFail);
  }
  if (loopers.length == 0) newRound();
}
function clearGameArea() {
  let gA = byId("gameArea") as HTMLDivElement;
  gA.classList.add("hide");
}

function newGame() {
  let gA = byId("gameArea") as HTMLDivElement;
  gA.classList.remove("hide");
  globalTicks = 0;
  lastTime = timeNow();
  failureTime = 0;
  stressNotification = true;
  nextRound = K.TIME_Round;
  tickCounter_lastTime = Date.now();
  loops = [];
  loopers= [];
  animatingBeams= [];
  removedLoopers= [];
  holdState= K.HOLD_None;
  totalStress = 0;
  looperCt = 2;
  gameLost = false;
  maxStress = 200;
  roundCt = 1;
  energy = 300;
  minLooperHealth = 10;
  maxLooperHealth = 30;
  prevX=0;
  prevY=0;
  clientPos = {x:0, y:0};
  tooltipTimer = -1;
  modifLoop = null;
  UIRefreshRequest = K.UIREFRESH_All;
  sellTime = -1;
  buildingReadyUpdate = false; // must update upgrade menu when building completes?
  activeItem = null;
  activeType = -1;
  prevUpgrades = [];
  activeBuilding = -1;
  currPos_canv = {x:0, y:0};
  initLooper();
  togglePause();
  resetCosts();
}

function newRound() {
  nextRound = K.TIME_Round;
  roundCt++;
  maxLooperHealth += 4;
  maxStress *= 1.03;
  looperCt = Math.min(50, looperCt+2);
  for (let i=0; i<looperCt; i++) 
    addRandomLooper();
  if (Math.random() < K.PROB_AddLoop) addRandomLoop();
}



function registerMaximisingCanvas(id:string, widthPc:number, heightPc:number, redrawFcn:()=>void) { // (id:string, widthPc:number, heightPc:number, redrawFcn:()=>any) {
  canv = byId(id) as HTMLCanvasElement;
  ctx = canv.getContext("2d") as CanvasRenderingContext2D;
  window.addEventListener("resize", (ev) => {
    canv.width = window.innerWidth * widthPc;
    canv.height = window.innerHeight * heightPc;
    // everything is gone - restore it!
    applyTransfm();
    redrawFcn();
  })
  // canv.style.height = 100 * heightPc + "vh";
  // canv.style.width = 100 * widthPc + "vw";
  canv.width = window.innerWidth * widthPc;
  canv.height = window.innerHeight * heightPc;
  redrawFcn();
}