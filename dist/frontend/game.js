"use strict";
const K = {
    HOLD_None: 0,
    HOLD_Translate: 1,
    COLOUR_Default: "#444",
    COLOUR_Loop: "#666",
    COLOUR_Looper: "#c00",
    COLOUR_Building: "#00c",
    COLOUR_Active: "#0c0",
    COLOUR_Inactive: "#555",
    SPEED_Base: 0.3,
    SIZE_Loop: 40,
    SIZE_Looper: 10,
    SIZE_Building: 30,
    STRESS_Base: 1,
    PROB_Exit: 0.5,
};
let totalStress = 0;
let looperCt = 2;
let maxStress = 200;
let roundCt = 1;
function loopersAt(loc) {
    let out = [];
    for (let i = 0; i < loopers.length; i++) {
        if (loopers[i].loc.x == loc.x && loopers[i].loc.y == loc.y)
            out.push(i);
    }
    return out;
}
function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
class Building {
    static type = -1;
}
class Slow extends Building {
    static type = 0;
    position;
    constructor(loc) {
        super();
        this.position = loc;
    }
    chargeStart = -1;
    chargeTime = 1000;
    cooldown = 2000;
    power = 10;
    poweringDown = false;
    computeAttack() {
        let time = Date.now();
        if (this.chargeStart < 0)
            return [];
        if (this.poweringDown) {
            if (time - this.chargeStart > this.cooldown) {
                this.poweringDown = false;
                this.chargeStart = -1;
            }
            return [];
        }
        if (time - this.chargeStart > this.chargeTime) {
            let available = loopersAt(this.position);
            this.poweringDown = true;
            this.chargeStart = Date.now();
            if (available.length > 0) {
                let idx = rand(available);
                let target = loopers[idx];
                target.health -= this.power;
                if (target.health <= 0) {
                    loopers.splice(idx, 1);
                }
            }
            else
                return [];
        }
        return [];
    }
    getStress() {
    }
    chargePercentage() {
        let time = Date.now();
        if (this.chargeStart < 0 && loopersAt(this.position).length > 0) {
            this.chargeStart = Date.now();
            return 0;
        }
        else if (this.chargeStart > 0)
            if (this.poweringDown)
                return -(1 - (time - this.chargeStart) / this.cooldown);
            else
                return (time - this.chargeStart) / this.chargeTime;
        else
            return 0;
    }
}
class Continuous extends Building {
    static type = 1;
    position;
    constructor(loc) {
        super();
        this.position = loc;
    }
    power = 20;
    lastAttack = Date.now();
    computeAttack() {
        let time = Date.now();
        let delta = (time - this.lastAttack) / 1000;
        this.lastAttack = time;
        let toRemove = [];
        for (let l of loopersAt(this.position)) {
            loopers[l].health -= delta * this.power;
            if (loopers[l].health < 0) {
                toRemove.push(loopers[l]);
            }
        }
        for (let looper of toRemove)
            loopers.splice(loopers.indexOf(looper), 1);
    }
    chargePercentage() { return loopersAt(this.position).length > 0 ? 1 : 0; }
}
class MultiShot extends Building {
    static type = 2;
    position;
    constructor(loc) {
        super();
        this.position = loc;
    }
    power = 30;
    attackCt = 2;
    lastAttack = Date.now();
    chargeTime = 5000;
    chargeStart = -1;
    computeAttack() {
        if (this.chargeStart < 0) {
            if (loopersAt(this.position).length > 0)
                this.chargeStart = Date.now();
            return;
        }
        let time = Date.now();
        if (time - this.chargeStart > this.chargeTime) {
            this.chargeStart = -1;
            let available = loopersAt(this.position);
            if (available.length > 0) {
                let toRemove = [];
                for (let i = 0; i < this.attackCt; i++) {
                    let idx = rand(available);
                    let target = loopers[idx];
                    target.health -= this.power;
                    if (target.health <= 0) {
                        toRemove.push(loopers[idx]);
                    }
                }
                for (let looper of toRemove) {
                    loopers.splice(loopers.indexOf(looper), 1);
                }
            }
            this.lastAttack = time;
        }
    }
    chargePercentage() {
        let time = Date.now();
        if (this.chargeStart < 0)
            return 0;
        return (time - this.chargeStart) / this.chargeTime;
    }
}
class Destressor extends Building {
    static type = 3;
    position;
    constructor(loc) {
        super();
        this.position = loc;
    }
    lastCalc = Date.now();
    computeAttack() {
        let delta = (Date.now() - this.lastCalc) / 1000;
        this.lastCalc = Date.now();
        for (let i of loopersAt(this.position)) {
            loopers[i].stress -= K.STRESS_Base * delta * 2;
            loopers[i].stress = Math.max(0, loopers[i].stress);
        }
    }
    chargePercentage() {
        return loopersAt(this.position).length > 0 ? 1 : 0;
    }
}
let loops = [];
let loopers = [];
let holdState = K.HOLD_None;
function onLoad() {
    console.log("hello, there.");
}
let mainLoopID = -1;
function preLoad() {
    registerMaximisingCanvas("canv", 1, 0.95, redraw);
    registerEvents();
    translate(canv.width / 2, canv.height / 2);
    setInterval(redraw, 0);
    mainLoopID = setInterval(gameLoop, 0);
    initLooper();
}
function addRandomLooper() {
    let loop = rand(loops);
    loopers.push({ status: 0, loc: { x: loop.loc.x, y: loop.loc.y }, health: 20, totalHealth: 20, stress: 0,
        loopPct: Math.random(), cw: rand([true, false]), speed: K.SPEED_Base });
}
function initLooper() {
    loops.push({ loc: { x: 0, y: 0 }, building: null });
    loops.push({ loc: { x: 1, y: 0 }, building: null });
    loops.push({ loc: { x: 0, y: 1 }, building: new Destressor({ x: 0, y: 1 }) });
    loops.push({ loc: { x: 0, y: -1 }, building: new MultiShot({ x: 0, y: -1 }) });
    loops.push({ loc: { x: 2, y: 0 }, building: new Continuous({ x: 2, y: 0 }) });
    loops.push({ loc: { x: -1, y: 0 }, building: new Slow({ x: -1, y: 0 }) });
    for (let i = 0; i < 5; i++)
        addRandomLooper();
}
function modPos(v, m) {
    return ((v % m) + m) % m;
}
function existsLoop(x, y) {
    for (let l of loops) {
        if (l.loc.x == x && l.loc.y == y)
            return true;
    }
    return false;
}
function calcTotalStress() {
    totalStress = 0;
    for (let l of loopers) {
        totalStress += l.stress;
    }
}
let lastTime = Date.now();
function gameLoop() {
    let delta = Date.now() - lastTime;
    lastTime = Date.now();
    let stressLevel = byId("stressLevel");
    calcTotalStress();
    stressLevel.style.width = Math.max(0.01, totalStress / maxStress) * 100 + "%";
    stressLevel.innerText = "Stress: " + (totalStress / maxStress * 100).toPrecision(3) + "%";
    for (let l of loopers) {
        let dStress = K.STRESS_Base * delta / 1000;
        l.stress += dStress;
        let pctBefore = l.loopPct;
        l.loopPct = modPos(l.loopPct + (l.cw ? 1 : -1) * delta / 1000 * l.speed, 1);
        const dx = [1, 0, -1, 0];
        const dy = [0, 1, 0, -1];
        let exitPct = [0.5, 0.75, 0, 0.25];
        for (let check = 0; check < 1; check += 0.25)
            if ((l.cw && (check == 0 ? pctBefore > 0.75 && l.loopPct < 0.25 : pctBefore < check && l.loopPct > check)
                || !l.cw && (check == 0 ? pctBefore < 0.25 && l.loopPct > 0.75 : pctBefore > check && l.loopPct < check))
                && Math.random() < K.PROB_Exit
                && existsLoop(l.loc.x + dx[check * 4], l.loc.y + dy[check * 4])) {
                l.loc.x += dx[check * 4];
                l.loc.y += dy[check * 4];
                let before2 = l.loopPct;
                l.loopPct = modPos(exitPct[check * 4] - (l.cw ? 0.001 : -0.001), 1);
                l.cw = !l.cw;
                break;
            }
        if (l.loopPct >= 1)
            l.loopPct -= 1;
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
        for (let i = 0; i < looperCt; i++)
            addRandomLooper();
    }
}
let canv;
let ctx;
function registerMaximisingCanvas(id, widthPc, heightPc, redrawFcn) {
    canv = byId(id);
    ctx = canv.getContext("2d");
    window.addEventListener("resize", (ev) => {
        canv.width = window.innerWidth * widthPc;
        canv.height = window.innerHeight * heightPc;
        applyTransfm();
        redrawFcn();
    });
    canv.width = window.innerWidth * widthPc;
    canv.height = window.innerHeight * heightPc;
    redrawFcn();
}
//# sourceMappingURL=game.js.map