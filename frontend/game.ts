const K = {
  HOLD_None:0,
  HOLD_Translate:1,

  COLOUR_Default:"#444",
  COLOUR_Loop:"#666",
  COLOUR_Looper:"#c00",
  COLOUR_Building:"#00c",
  COLOUR_Active:"#0c0",
  COLOUR_Inactive:"#555",

  SPEED_Base:0.3,
  
  SIZE_Loop:40,
  SIZE_Looper:10,
  SIZE_Building:30,

  TYPE_Loop:0,
  TYPE_Building:1,

  TIME_Tooltip: 500,

  STRESS_Base:1, // 5 stress/sec

  PROB_Exit:0.5,
  PROB_AddLoop:0.8,
}

let totalStress = 0;
let looperCt = 2;
let maxStress = 200;
let roundCt = 1;

interface Looper {
  status:number,
  loc:Point,
  health:number,
  totalHealth:number,
  stress:number,
  loopPct:number,
  cw:boolean,
  speed:number // percent/sec
}

function loopersAt(loc:Point){
  let out = [];
  for (let i=0; i<loopers.length; i++) {
    if (loopers[i].loc.x == loc.x && loopers[i].loc.y == loc.y) out.push(i);
  }
  return out;
}

function rand(arr:any[]) {
  return arr[Math.floor(Math.random()*arr.length)];
}

interface AttackInfo {
  target:number,
  power:number,
}


interface Loop {
  loc:Point
  building:Building|null
}
let loops:Loop[] = [];
let loopers:Looper[] = [];
let holdState:number = K.HOLD_None;

function onLoad() {
  console.log("hello, there.");
}

let mainLoopID:any = -1;

function getStaticVars(obj:Object) {
  return Object.getPrototypeOf(obj).constructor;
}
function preLoad() {
  registerMaximisingCanvas("canv", 1, 1, redraw);
  registerEvents();
  translate(canv.width/2, canv.height/2);
  let sidebar = byId("sidebar") as HTMLDivElement;
  for (let i=0; i<buildingTypes.length; i++) {
    let ty = buildingTypes[i];
    sidebar.innerHTML += `<div class="building" id="building${i}" onclick="setActiveBuilding(${i})">
    B
    <p class="onhover"><b>${ty.name}</b>
    ${ty.genDesc}</p></div>`
  }
  setInterval(redraw, 27);
  mainLoopID = setInterval(gameLoop, 27);
  initLooper();
}


function addRandomLooper() {
  let loop = rand(loops);
  loopers.push({status:0, loc:{x:loop.loc.x, y:loop.loc.y}, health: 20, totalHealth:20, stress:0, 
                loopPct:Math.random(), cw:rand([true, false]), speed:K.SPEED_Base});
}

function addRandomLoop() {
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
  loops.push({loc:rand(possibleLocs), building:null});
}
function initLooper() {
  loops.push({loc:{x:0, y:0}, building:null});
  loops.push({loc:{x:1, y:0}, building:null});
  loops.push({loc:{x:0, y:1}, building:new Destressor({x:0, y:1})});
  loops.push({loc:{x:0, y:-1}, building:new MultiShot({x:0, y:-1})});
  loops.push({loc:{x:2, y:0}, building:new Continuous({x:2, y:0})});
  loops.push({loc:{x:-1, y:0}, building:new Slow({x:-1, y:0})});
  for (let i=0; i<5; i++)
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

let lastTime = Date.now();
function gameLoop() {
  let delta = Date.now() - lastTime;
  lastTime = Date.now();
  let stressLevel = byId("stressLevel") as HTMLDivElement;
  calcTotalStress();
  stressLevel.style.width = Math.min(Math.max(0.001,totalStress/maxStress), 1)*100+"%";
  if (totalStress > maxStress*0.8) stressLevel.style.backgroundColor = getCSSProp("--system-yellowtext");
  if (totalStress > maxStress) {
    stressLevel.style.animation = "blinkingRed 2s infinite";
  }
  else stressLevel.style.animation = "";
  if (totalStress < maxStress*0.8) stressLevel.style.backgroundColor = getCSSProp("--system-blue");
  stressLevel.innerText = (totalStress/maxStress*100).toPrecision(3)+"%";
  for (let l of loopers) {
    let dStress = K.STRESS_Base*delta/1000;
    l.stress += dStress; 
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
  for (let loop of loops) {
    if (loop.building) {
      loop.building.computeAttack();
    }  
  }
  if (loopers.length == 0) {
    roundCt++;
    maxStress *= 1.05;
    looperCt += 3;
    for (let i=0; i<looperCt; i++) 
      addRandomLooper();
    if (Math.random() < K.PROB_AddLoop) addRandomLoop();
  }
}

let canv:HTMLCanvasElement;
let ctx:CanvasRenderingContext2D;

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