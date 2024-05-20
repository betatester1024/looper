function registerEvents() {
  canv.addEventListener("pointermove", onMove);
  canv.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("keydown", keyUpdate);
  window.addEventListener("keyup", keyUpdate);
  window.addEventListener("pointerup", onPointerUp);
  canv.addEventListener("wheel", onWheel)
  setInterval(uiEvents, 100);
}

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
    tt.innerHTML = `
    <p><b class="fsvsml">${activeTooltip.title}</b><br>
      <p class="desc">${activeTooltip.desc}</p>
    </p>
    `;
  }
  let upgradeMenu = byId("upgradeMenu_Inner") as HTMLDivElement;
  let en = byId("energy") as HTMLDivElement;
  en.innerHTML = energy.toLocaleString()+" energy";

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

function UIPurchase(n:number) {
  if (!modifLoop || !modifLoop.building)
    ephemeralDialog("Could not find the applicable building.")
  else {
    let cost = modifLoop.building.getUpgrades()[n].cost;
    energy -= cost;
    modifLoop.building.upgrade(n);
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

function onMove(ev:MouseEvent) {
  clientPos = {x:ev.clientX, y:ev.clientY};
  currPos_canv = fromCanvPos(ev.clientX, ev.clientY);
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
    translate(ev.clientX - prevX, ev.clientY - prevY);
    prevX = ev.clientX;
    prevY = ev.clientY;
    redraw();
  }
}

function onPointerDown(ev:PointerEvent) {
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
    prevX = ev.clientX;
    prevY = ev.clientY;

    canv.style.cursor = "all-scroll"
    holdState = K.HOLD_Translate;
  }
  console.log("pointerdown")
}

function onPointerUp(ev:PointerEvent) {
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
