function registerEvents() {
  canv.addEventListener("mousemove", evRedirector_pMove);
  canv.addEventListener("touchmove", evRedirector_pMove);
  canv.addEventListener("mousedown", evRedirector_pDown);
  canv.addEventListener("touchstart", evRedirector_pDown);
  window.addEventListener("keydown", keyUpdate);
  window.addEventListener("keyup", keyUpdate);
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);
  canv.addEventListener("wheel", onWheel)
  setInterval(uiEvents, 100);

  vis(()=>{
    if (!vis() && !paused) togglePause();
  })
}

function evRedirector_pMove(event:MouseEvent|TouchEvent) {
  if (event.type.startsWith('touch')) {
    event.preventDefault();
    console.log("touch move");
    event = event as TouchEvent;
    onMove({x:event.touches[0].clientX, y:event.touches[0].clientY});
  } else {
    // For mouse events
    event = event as MouseEvent;
    onMove({x:event.clientX, y:event.clientY});
  }
}

function evRedirector_pDown(event:TouchEvent|MouseEvent) {
  if (event.type.startsWith('touch')) {
    event.preventDefault();
    console.log("touch event");
    event = event as TouchEvent;
    let p = {x:event.touches[0].clientX, y:event.touches[0].clientY};
    onPointerDown(p);
    
  } else {
    // For mouse events
    event = event as MouseEvent;
    onPointerDown({x:event.clientX, y:event.clientY});
  }
} 

var vis = (function(){
    var stateKey="", eventKey="", keys = {
        hidden: "visibilitychange",
        webkitHidden: "webkitvisibilitychange",
        mozHidden: "mozvisibilitychange",
        msHidden: "msvisibilitychange"
    };
    for (stateKey in keys) {
        if (stateKey in document) {
            //@ts-ignore
            eventKey = keys[stateKey];
            break;
        }
    }
    return function(c?:()=>any) {
        if (c) document.addEventListener(eventKey, c);
        //@ts-ignore
        return !document[stateKey];
    }
})();


let prevX=0, prevY=0;
let clientPos = {x:0, y:0};
let tooltipTimer:any = -1;
let modifLoop:Loop|null = null;
let UIRefreshRequest:number = K.UIREFRESH_None;

function distBtw(p1:Point, p2:Point) {
  return Math.sqrt((p1.x-p2.x)*(p1.x-p2.x)+(p1.y-p2.y)*(p1.y-p2.y));
}

let prevUpgrades:Upgrade[] = [];
function affordabilityUpdated(upgrades:Upgrade[]) {
  for (let u of upgrades) {
    if (u.cost > energy) u.active = false;
  }
  if (upgrades.length != prevUpgrades.length) return true;
  for (let i=0; i<upgrades.length; i++) {
    if (upgrades[i].active != prevUpgrades[i].active) return true;
  }
  return false;
}

function buildingReady(b:Building) {
  return timeNow() - b.buildTime >= K.TIME_Build;
}

let sellTime = -1;
let buildingReadyUpdate = false; // must update upgrade menu when building completes?
function uiEvents() {
  let activeTooltip = generateTooltip(activeItem!, activeType);
  let tt = byId("tooltip") as HTMLDivElement;
  if (!activeTooltip.active) {
    tt.classList.add("invis");
  }
  else {
    tt.classList.remove("invis");
    tt.style.left = `min(calc(100vw - 220px), ${clientPos.x + 10+"px"})`;
    tt.style.top = clientPos.y + 10 +"px";
    let bT;
    if (activeItem && activeItem.building && 
        (bT=timeNow() - activeItem.building.buildTime) < K.TIME_Build)
      tt.innerHTML = ` <p><b class="fsvsml">${activeTooltip.title}</b><br>
      <p class="desc">Under construction ${toTime(K.TIME_Build-bT)} left (${tf2(bT/K.TIME_Build*100)}%)</p>
    </p>`
    else 
      tt.innerHTML = `
    <p><b class="fsvsml">${activeTooltip.title}</b><br>
      <p class="desc">${activeTooltip.desc}</p>
    </p>
    `;
  }
  let upgradeMenu = byId("upgradeMenu_Inner") as HTMLDivElement;
  let en = byId("energy") as HTMLDivElement;
  en.innerHTML = Math.floor(energy).toLocaleString()+" energy";

  for (let i=0; i<buildingTypes.length; i++) {
    byId("cost"+i)!.innerText = buildingTypes[i].cost+" energy";
    let b = byId("building"+i) as HTMLDivElement;
    if (buildingTypes[i].cost > energy) {
      b.classList.add("disabled");
      byId("cost"+i)!.classList.add("red2");
    }
    else {
      b.classList.remove("disabled");
      byId("cost"+i)!.classList.remove("red2");
    }
  }

  let sellEle = byId("sellBuilding") as HTMLDivElement;
  if (sellEle) {
    if (timeNow() > sellTime) {
      if (sellEle.classList.contains("disabled")) {
        sellEle.classList.remove("disabled");
        sellEle.outerHTML = getSellButton();
        UIRefreshRequest = K.UIREFRESH_All;
      }
    }
    else {
      sellEle.outerHTML = getSellButton();
      if(!sellEle.classList.contains("disabled"))
        sellEle.classList.add("disabled");
    }
    
  }  
  if (modifLoop && modifLoop.building && 
      buildingReady(modifLoop.building) && buildingReadyUpdate) {
    UIRefreshRequest = K.UIREFRESH_All;  
    buildingReadyUpdate = false;
  }
  if (UIRefreshRequest != K.UIREFRESH_None &&
     (UIRefreshRequest != K.UIREFRESH_Cost || 
      modifLoop && modifLoop.building 
      && affordabilityUpdated(modifLoop.building.getUpgrades()))) {
    if (modifLoop && modifLoop.building) {
      // only update building purchase tooltips here
      let title = byId("upgradeTitle") as HTMLDivElement;
      title.innerHTML = `<p class="fsvsml">Upgrades: <b>${getStaticVars(modifLoop.building).name}</b></p>`;
      upgradeMenu.innerHTML = "";
      let upgrades = modifLoop.building.getUpgrades();
      for (let u of upgrades) {
        if (energy < u.cost) u.active = false;
      }
      
      prevUpgrades = upgrades;
      if (!upgrades) upgradeMenu.parentElement!.classList.add("hidden");
      else upgradeMenu.parentElement!.classList.remove("hidden");
      for (let i=0; i<upgrades.length; i++) {
        let u = upgrades[i];
        let cost = upgrades[i].cost;
        upgradeMenu.innerHTML += `
        
        <button 
        onclick="${u.active?"UIPurchase("+i+")":""}" 
        class="btn fsvsml upgrade ${u.active?"":"disabled"}">
        <b>${u.name}</b>
        <p>${u.active || u.cost > energy?u.desc:u.descDisabled}</p>
        Cost: <b class="${u.cost > energy?"red2 nohover nooutline":""}">${u.cost}</b> energy
        </button>`;
      }
      upgradeMenu.innerHTML += getSellButton();
      if (!buildingReady(modifLoop.building)) {
        buildingReadyUpdate = true;
        upgradeMenu.innerHTML = ` <p><br><br>
            <p class="desc gry nohover">Node is under construction...</p>
          </p>`
      }
    } else if (modifLoop) {
      let title = byId("upgradeTitle")  as HTMLDivElement;
      title.innerHTML = `<p class="fsvsml">No building placed</p>`;
      upgradeMenu.innerHTML = "<p>Select a building from the sidebar... </p>"
      upgradeMenu.parentElement!.classList.remove("hidden");
    } else {
      upgradeMenu.parentElement!.classList.add("hidden");
    }
    UIRefreshRequest = K.UIREFRESH_None;
  }
  
}

function getSellButton() {
  if (!modifLoop) return "";
  if (!modifLoop.building) return "";
  return `<button id="sellBuilding" class="btn blu fsvsml upgrade ${sellTime > timeNow()?"disabled":""}" onclick="sellBuilding()">
    Sell building <br>
    ${sellTime > timeNow()?toTime(sellTime - timeNow()):
      `<b>${tf2(modifLoop.building.value*K.MISC_CostRecovery)}</b> energy`}
  </button>`;
}
function sellBuilding() {
  if (sellTime > timeNow()) return;
  if (!modifLoop) return;
  energy += modifLoop.building!.value*K.MISC_CostRecovery;
  modifLoop.building = null;
  sellTime = timeNow() + K.TIME_SellBuilding;
  UIRefreshRequest = K.UIREFRESH_All;
}

function UIPurchase(n:number) {
  if (!modifLoop || !modifLoop.building)
    ephemeralDialog("Could not find the applicable building.")
  else {
    let cost = modifLoop.building.getUpgrades()[n].cost;
    energy -= cost;
    modifLoop.building.upgrade(n);
    modifLoop.building.value += cost;
  }
  UIRefreshRequest = K.UIREFRESH_All;
}


function canvPos(l:Loop) {
  return {x:x(l.loc), y:y(l.loc)};
}

function nearestLoop(p:Point, acceptRad:number=9e99) {
  let nearestDist = 9e99;
  let nearestLoop = null;
  for (let l of loops) {
    if (distBtw(canvPos(l), p) < nearestDist) {
      nearestDist = distBtw(canvPos(l), p);
      nearestLoop = l;
    }
  }
  return nearestDist<acceptRad?nearestLoop:null;
}

let activeItem:Loop|null = null;
let activeType:number = -1;

function generateTooltip(item:Loop, type:number) {
  switch(type) {
    case K.TYPE_Loop:
      if (item.building)
        return {active:true, title:getStaticVars(item.building).name, desc:item.building.generateDesc()};
      else return {active:true, title:"Empty loop", desc:`Active loopers: ${loopersAt(item.loc).length}`};
    default:
      return {active:false, title:"", desc:""};
  }
}


function build(type:any, loop:Loop) {
  
  if (type.cost > energy) {} 
    // ephemeralDialog("You can't afford this building.");
  else if (loop.building)
    ephemeralDialog("A building already exists here.")
  else {
    energy -= type.cost;
    loop.building = new type(loop.loc);
    UIRefreshRequest = K.UIREFRESH_All;
    loop.building!.value = type.cost;
  }
}
let activeBuilding = -1;
function setActiveBuilding(id:number) {
  if (modifLoop && !modifLoop.building) {
    build(buildingTypes[id], modifLoop)
    return;
  }
  if (id >= 0 && buildingTypes[id].cost > energy) return;
  // this is indeed supported but ts is being weird about it :v
  //@ts-ignore
  for (let e of document.getElementsByClassName("building")) {
    e.classList.remove("active");
  }
  if (id>=0) byId("building"+id)!.classList.add("active");
  activeBuilding = id;
}

let currPos_canv = {x:0, y:0};
function activateTooltip() {
  let nearestL = nearestLoop(currPos_canv, K.SIZE_Loop);
  if (nearestL) {
    activeItem = nearestL;
    activeType = K.TYPE_Loop;
  }
  else activeType = -1;
}

function onMove(ev:Point) {
  clientPos = {x:ev.x, y:ev.y};
  currPos_canv = fromCanvPos(ev.x, ev.y);
  if (holdState == K.HOLD_None) {
    activeType = -1;
    let nearestL = nearestLoop(currPos_canv, K.SIZE_Loop);
    if (nearestL) canv.style.cursor = "pointer";
    else canv.style.cursor = "";
    if (tooltipTimer < 0 && nearestL) {
      tooltipTimer = setTimeout(activateTooltip, K.TIME_Tooltip);
    } else {
      clearTimeout(tooltipTimer);
      if (nearestL) 
        tooltipTimer = setTimeout(activateTooltip, K.TIME_Tooltip);
    }
  }
  if (holdState == K.HOLD_Translate) {
    translate(ev.x - prevX, ev.y - prevY);
    prevX = ev.x;
    prevY = ev.y;
    redraw();
  }
}

function onPointerDown(ev:Point) {
  currPos_canv = fromCanvPos(ev.x, ev.y);
  let nL = nearestLoop(currPos_canv, K.SIZE_Loop)
  if (!nL) {
    modifLoop = null;
    UIRefreshRequest = K.UIREFRESH_All;
  }
  if (activeBuilding >= 0) {
    if (nL) {
      if (nL.building) ephemeralDialog("A building already exists here!");
      else build(buildingTypes[activeBuilding], nL);
    }
    setActiveBuilding(-1);
  }
  else if (nL) {
    modifLoop = nL; 
    UIRefreshRequest = K.UIREFRESH_All;
  }
  else {
    prevX = ev.x;
    prevY = ev.y;

    canv.style.cursor = "all-scroll"
    holdState = K.HOLD_Translate;
  }
  console.log("pointerdown")
}

function onPointerUp(ev:any) {
  holdState = K.HOLD_None;
  canv.style.cursor = "default";
  console.log("pointerup")
}

function keyUpdate(ev:KeyboardEvent) {}

function onWheel(ev:WheelEvent) {
  // larger -ve deltaY: 
  // ctx.
  // let sclFac = (ev.deltaY<0?Math.pow(10, -ev.deltaY/750):Math.pow(10, -ev.deltaY/400))
  let sclFac = (ev.deltaY < 0 ? 1.15 : 1 / 1.15)
  if (sclFac * totalScaleFac > maxSclFac)
    sclFac = maxSclFac / totalScaleFac;
  if (sclFac * totalScaleFac < minSclFac)
    sclFac = minSclFac / totalScaleFac;
  translate(-ev.clientX, -ev.clientY);
  scale(sclFac);
  translate(ev.clientX, ev.clientY);
  totalScaleFac *= sclFac;
  redraw();
} // onwheel
