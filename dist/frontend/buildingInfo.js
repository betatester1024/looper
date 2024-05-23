"use strict";
class Building {
    type = -1;
    static char = "B";
    static name = "Generic building.";
    static genDesc;
    static cost;
    static defaultCost;
    buildTime;
    position;
    value = 0;
}
function samePt(p1, p2) {
    return p1.x == p2.x && p1.y == p2.y;
}
function tf2(n) { return n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }
;
function roundCosts(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.round(arr[i]);
    }
}
function removeLooper(l) {
    loopers.splice(loopers.indexOf(l), 1);
    energy += l.energy;
    l.health = 0;
    removedLoopers.push(l);
    l.removalTime = timeNow();
    UIRefreshRequest = Math.max(UIRefreshRequest, K.UIREFRESH_Cost);
}
function shootLooper(b, l, damage, persistent = true) {
    l.health -= damage;
    if (!persistent) {
        let foundIdx = animatingBeams.findIndex((i) => { return i.looper == l; });
        if (foundIdx >= 0) {
            animatingBeams[foundIdx].angle = 2 * Math.PI * l.loopPct;
            animatingBeams[foundIdx].aStart = timeNow();
            animatingBeams[foundIdx].loc = b.position;
        }
        else
            animatingBeams.push({
                loc: b.position, looper: l, angle: 2 * Math.PI * l.loopPct,
                aStart: timeNow(), persist: false
            });
    }
    else
        animatingBeams.push({
            loc: b.position, looper: l, angle: 2 * Math.PI * l.loopPct,
            aStart: timeNow(), persist: true
        });
}
class Slow extends Building {
    static char = "SL";
    position;
    constructor(loc) {
        super();
        initBuilding(Slow, this);
        this.position = loc;
    }
    static cost = 100;
    static defaultCost = 100;
    static genDesc = `Slow-firing building. Fires at one random looper every time.
  Base damage: <b>10</b>
  Charge time: <b>1</b> second
  Cooldown: <b>2</b> seconds
  `;
    chargeStart = -1;
    chargeTime = 1000;
    cooldown = 2000;
    power = 10;
    poweringDown = false;
    upgradeCosts = [50, 50, 100];
    static name = "SlowShot I";
    generateDesc() {
        return `Slow-firing building. Fires at one random looper every time.
    Damage per shot: <b>${this.power}</b>
    Charge time: <b>${(this.chargeTime / 1000).toFixed(2)}</b> seconds. 
    Cooldown: <b>${(this.cooldown / 1000).toFixed(2)}</b> seconds.`;
    }
    getUpgrades() {
        return [
            { name: "Cooldown", active: this.cooldown >= 300,
                desc: `${tf2(this.cooldown / 1000)}s > ${tf2(this.cooldown / 1000 * 0.8)}s`,
                descDisabled: `Capped: ${tf2(this.cooldown / 1000)}s`,
                cost: this.upgradeCosts[0] },
            { name: "Charge time", active: this.chargeTime >= 500,
                desc: `${tf2(this.chargeTime / 1000)}s > ${tf2(this.chargeTime / 1000 * 0.75)}s`,
                descDisabled: `Capped: ${tf2(this.chargeTime / 1000)}s`,
                cost: this.upgradeCosts[1] },
            { name: "Damage", active: true,
                desc: `${tf2(this.power)} > ${tf2(this.power * 1.2)}`,
                descDisabled: "",
                cost: this.upgradeCosts[2] }
        ];
    }
    upgrade(type) {
        switch (type) {
            case 0:
                this.cooldown *= 0.8;
                this.upgradeCosts[0] *= 2;
                break;
            case 1:
                this.chargeTime *= 0.75;
                this.upgradeCosts[1] *= 1.3;
                break;
            case 2:
                this.power *= 1.2;
                this.upgradeCosts[2] *= 1.5;
                break;
        }
        roundCosts(this.upgradeCosts);
    }
    computeAttack() {
        let time = timeNow();
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
            this.chargeStart = timeNow();
            if (available.length > 0) {
                let idx = rand(available);
                let target = loopers[idx];
                shootLooper(this, target, this.power);
                if (target.health <= 0) {
                    removeLooper(loopers[idx]);
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
        let time = timeNow();
        if (this.chargeStart < 0 && loopersAt(this.position).length > 0) {
            this.chargeStart = timeNow();
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
    static name = "ContinuousShot II";
    static char = "CS2";
    static genDesc = `Continuous damage.
    Base damage: <b>8</b>
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(Continuous, this);
        this.lastAttack = timeNow();
        this.position = loc;
    }
    static cost = 400;
    static defaultCost = 400;
    power = 8;
    upgradeCost = 200;
    lastAttack = timeNow();
    generateDesc() {
        return `Deals continuous damage to loopers.
    <b>${this.power}</b> damage/second/looper.`;
    }
    getUpgrades() {
        return [
            { name: "Damage", active: true,
                desc: `${tf2(this.power)} > ${tf2(this.power * 1.2)}`,
                descDisabled: "",
                cost: this.upgradeCost }
        ];
    }
    upgrade(_type) {
        this.power *= 1.2;
        this.upgradeCost = Math.round(this.upgradeCost * 1.4);
    }
    computeAttack() {
        let time = timeNow();
        let delta = (time - this.lastAttack) / 1000;
        this.lastAttack = time;
        let toRemove = [];
        for (let l of loopersAt(this.position)) {
            shootLooper(this, loopers[l], delta * this.power, false);
            if (loopers[l].health <= 0) {
                toRemove.push(loopers[l]);
            }
        }
        for (let looper of toRemove) {
            removeLooper(looper);
        }
    }
    chargePercentage() { return loopersAt(this.position).length > 0 ? 1 : 0; }
}
class WorseContinuous extends Building {
    static name = "ContinuousShot I";
    static char = "CS1";
    static genDesc = `Continuous damage, but to only one looper at a time.
    Base damage: <b>6</b>
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(WorseContinuous, this);
        this.lastAttack = timeNow();
        this.position = loc;
    }
    static cost = 300;
    static defaultCost = 300;
    power = 6;
    upgradeCost = 150;
    lastAttack = timeNow();
    activeLooper = null;
    generateDesc() {
        return `Deals continuous damage to one looper at a time.
    <b>${this.power}</b> damage/second.`;
    }
    getUpgrades() {
        return [
            { name: "Damage", active: true,
                desc: `${tf2(this.power)} > ${tf2(this.power * 1.2)}`,
                descDisabled: "",
                cost: this.upgradeCost }
        ];
    }
    upgrade(_type) {
        this.power *= 1.2;
        this.upgradeCost = Math.round(this.upgradeCost * 1.3);
    }
    computeAttack() {
        let time = timeNow();
        let delta = (time - this.lastAttack) / 1000;
        this.lastAttack = time;
        if (loopersAt(this.position).length == 0)
            return;
        if (this.activeLooper == null || !samePt(this.activeLooper.loc, this.position)) {
            this.activeLooper = loopers[rand(loopersAt(this.position))];
        }
        let target = this.activeLooper;
        if (target) {
            shootLooper(this, target, delta * this.power, false);
            if (target.health <= 0) {
                removeLooper(target);
                this.activeLooper = null;
            }
        }
    }
    chargePercentage() { return loopersAt(this.position).length > 0 ? 1 : 0; }
}
class MultiShot extends Building {
    static cost = 150;
    static char = "MS1";
    static defaultCost = 150;
    static name = "MultiShot I";
    static genDesc = `Attacks multiple loopers. Slow charging.
    Base damage: <b>30</b>
    Base target count: <b>2</b> loopers
    Charge time: <b>5</b> seconds
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(MultiShot, this);
        this.position = loc;
    }
    power = 30;
    attackCt = 1;
    lastAttack = timeNow();
    chargeTime = 5000;
    chargeStart = -1;
    generateDesc() {
        return `Attacks multiple loopers. Slow charging.
    Deals <b>${this.power}</b> damage to <b>${this.attackCt}</b> loopers every shot.
    Charge time: <b>${(this.chargeTime / 1000).toFixed(2)}</b> seconds.
    `;
    }
    upgradeCosts = [100, 75, 100];
    getUpgrades() {
        return [
            { name: "Looper count", active: true,
                desc: `${this.attackCt} > ${this.attackCt + 1}`,
                descDisabled: "",
                cost: this.upgradeCosts[0] },
            { name: "Charge time", active: this.chargeTime >= 510,
                desc: `${tf2(this.chargeTime / 1000)}s > ${tf2(this.chargeTime / 1000 * 0.75)}s`,
                descDisabled: `Capped: ${tf2(this.chargeTime / 1000)}s`,
                cost: this.upgradeCosts[1] },
            { name: "Damage", active: true,
                desc: `${tf2(this.power)} > ${tf2(this.power * 1.2)}`,
                descDisabled: "",
                cost: this.upgradeCosts[2] }
        ];
    }
    upgrade(type) {
        switch (type) {
            case 0:
                this.attackCt++;
                this.upgradeCosts[0] *= 1.75;
                break;
            case 1:
                this.chargeTime *= 0.75;
                this.upgradeCosts[1] *= 1.3;
                break;
            case 2:
                this.power *= 1.2;
                this.upgradeCosts[2] *= 1.5;
                break;
        }
        roundCosts(this.upgradeCosts);
    }
    computeAttack() {
        if (this.chargeStart < 0) {
            if (loopersAt(this.position).length > 0)
                this.chargeStart = timeNow();
            return;
        }
        let time = timeNow();
        if (time - this.chargeStart > this.chargeTime) {
            this.chargeStart = -1;
            let available = loopersAt(this.position);
            if (available.length > 0) {
                let toRemove = [];
                for (let i = 0; i < this.attackCt; i++) {
                    let idx = rand(available);
                    let target = loopers[idx];
                    shootLooper(this, loopers[idx], this.power);
                    if (target.health <= 0) {
                        toRemove.push(loopers[idx]);
                    }
                }
                for (let looper of toRemove) {
                    removeLooper(looper);
                }
            }
            this.lastAttack = time;
        }
    }
    chargePercentage() {
        let time = timeNow();
        if (this.chargeStart < 0)
            return 0;
        return (time - this.chargeStart) / this.chargeTime;
    }
}
class Destressor extends Building {
    static char = "DS";
    static cost = 175;
    static defaultCost = 175;
    static name = "Destressor";
    static genDesc = `Reduces stress level of every looper in range.
     Base effect: -<b>${K.STRESS_Base * 2}</b> stress/sec
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(Destressor, this);
        this.lastCalc = timeNow();
        this.position = loc;
    }
    power = K.STRESS_Base * 2;
    lastCalc = timeNow();
    upgradeCost = 75;
    getUpgrades() {
        return [
            { name: "Stress reduction", active: true,
                desc: `${tf2(this.power)}/s > ${tf2(this.power * 1.2)}/s`,
                descDisabled: "",
                cost: this.upgradeCost },
        ];
    }
    upgrade(_type) {
        this.power *= 1.2;
        this.upgradeCost *= 2;
    }
    generateDesc() {
        return `Reduces stress level of every looper entering the loop.
    Reduces <b>${this.power.toFixed(2)}</b> stress/sec/looper.`;
    }
    computeAttack() {
        let delta = (timeNow() - this.lastCalc) / 1000;
        this.lastCalc = timeNow();
        for (let i of loopersAt(this.position)) {
            loopers[i].stress -= this.power * delta;
            shootLooper(this, loopers[i], 0, false);
            loopers[i].stress = Math.max(0, loopers[i].stress);
        }
    }
    chargePercentage() {
        return loopersAt(this.position).length > 0 ? 1 : 0;
    }
}
class Energiser extends Building {
    static cost = 200;
    static char = "E+";
    static defaultCost = 200;
    static name = "Energiser";
    static genDesc = `Energises every looper in range.
     Base effect: <b>5</b> energy/sec
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(Destressor, this);
        this.position = loc;
        this.lastCalc = timeNow();
    }
    power = 5;
    lastCalc = timeNow();
    upgradeCost = 75;
    getUpgrades() {
        return [
            { name: "Energy increase", active: true,
                desc: `${tf2(this.power)}/s > ${tf2(this.power * 1.2)}/s`,
                descDisabled: "",
                cost: this.upgradeCost },
        ];
    }
    upgrade(_type) {
        this.power *= 1.2;
        this.upgradeCost *= 1.7;
    }
    generateDesc() {
        return `Energises every looper entering the loop.
    Reduces <b>${this.power.toFixed(2)}</b> stress/sec/looper.`;
    }
    computeAttack() {
        let delta = (timeNow() - this.lastCalc) / 1000;
        this.lastCalc = timeNow();
        for (let i of loopersAt(this.position)) {
            loopers[i].energy += this.power * delta;
            shootLooper(this, loopers[i], 0, false);
        }
    }
    chargePercentage() {
        return loopersAt(this.position).length > 0 ? 1 : 0;
    }
}
class FastShooter extends Building {
    static cost = 175;
    static defaultCost = 175;
    static char = "FS1";
    static name = "FastShot I";
    static genDesc = `Rapid firing but low damage.
     Base damage: <b>8</b>
     Base cooldown: <b>0.5s</b>
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(FastShooter, this);
        this.position = loc;
    }
    power = 8;
    upgradeCosts = [75, 100];
    chargeStart = -1;
    chargeTime = 500;
    getUpgrades() {
        return [
            { name: "Damage", active: true,
                desc: `${tf2(this.power)} > ${tf2(this.power * 1.2)}`,
                descDisabled: "",
                cost: this.upgradeCosts[0] },
            { name: "Cooldown", active: this.chargeTime >= 120,
                desc: `${tf2(this.chargeTime / 1000)}s > ${tf2(this.chargeTime * 0.8 / 1000)}s`,
                descDisabled: "",
                cost: this.upgradeCosts[1] },
        ];
    }
    upgrade(type) {
        switch (type) {
            case 0:
                this.power *= 1.2;
                this.upgradeCosts[0] *= 1.5;
                break;
            case 1:
                this.chargeTime *= 0.8;
                this.upgradeCosts[1] *= 2;
                break;
        }
        roundCosts(this.upgradeCosts);
    }
    generateDesc() {
        return `Fires at one random looper every <b>${tf2(this.chargeTime / 1000)}</b>s.
    Damage: <b>${this.power}</b>`;
    }
    computeAttack() {
        if (this.chargeStart < 0) {
            if (loopersAt(this.position).length > 0)
                this.chargeStart = timeNow();
            return;
        }
        let time = timeNow();
        if (time - this.chargeStart > this.chargeTime) {
            this.chargeStart = -1;
            let available = loopersAt(this.position);
            if (available.length > 0) {
                let toRemove = [];
                let idx = rand(available);
                let target = loopers[idx];
                shootLooper(this, target, this.power);
                if (target.health <= 0) {
                    removeLooper(loopers[idx]);
                }
            }
        }
    }
    chargePercentage() {
        let time = timeNow();
        if (this.chargeStart < 0)
            return 0;
        return (time - this.chargeStart) / this.chargeTime;
    }
}
class Decelerator extends Building {
    static cost = 175;
    static defaultCost = 175;
    static char = "DC1";
    static name = "Decelerator I";
    static genDesc = `Decelerates loopers.
     Base deceleration: <b>-7.2deg/sec<sup>2</sup></b>
     *Capped at <b>${K.SPEED_Minimum * 360}deg/sec</b>
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(Decelerator, this);
        this.position = loc;
        this.lastCalc = timeNow();
    }
    power = 0.02;
    lastCalc = timeNow();
    upgradeCosts = [75, 100];
    chargeStart = -1;
    chargeTime = 500;
    getUpgrades() {
        return [
            { name: "Deceleration", active: this.power <= 0.05,
                desc: `${tf2(this.power * 360)}deg/sec<sup>2</sup> > ${tf2((this.power + 0.01) * 360)}deg/sec<sup>2</sup>`,
                descDisabled: "Capped: 21.6deg/sec<sup>2</sup>",
                cost: this.upgradeCosts[0] },
        ];
    }
    upgrade(type) {
        switch (type) {
            case 0:
                this.power += 0.01;
                this.upgradeCosts[0] *= 1.5;
                break;
        }
        roundCosts(this.upgradeCosts);
    }
    generateDesc() {
        return `Decelerates all loopers by <b>${tf2(this.power * 360)}deg/sec<sup>2</sup></b>.
    *Capped at <b>${K.SPEED_Minimum * 360}deg/sec</b>`;
    }
    computeAttack() {
        let delta = (timeNow() - this.lastCalc) / 1000;
        this.lastCalc = timeNow();
        let available = loopersAt(this.position);
        for (let i = 0; i < available.length; i++) {
            let target = loopers[i];
            target.speed -= this.power * delta;
            shootLooper(this, target, 0, false);
            target.speed = Math.max(K.SPEED_Minimum, target.speed);
        }
    }
    chargePercentage() {
        return loopersAt(this.position).length == 0 ? 0 : 1;
    }
}
class BetterDecelerator extends Building {
    static cost = 250;
    static defaultCost = 250;
    static char = "DC2";
    static name = "Decelerator II";
    static genDesc = `Decelerates loopers more effectively and reduces their stress increase factor.
     Base deceleration: <b>-10.8deg/sec<sup>2</sup></b>
     *Capped at <b>${K.SPEED_Minimum * 360}deg/sec</b>
     Base stress reduction <b>1%/sec</b>
     *Capped at <b>${K.STRESS_Minimum * 100}%</b>
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(BetterDecelerator, this);
        this.position = loc;
        this.lastCalc = timeNow();
    }
    power = 0.02;
    stressR = 0.01;
    lastCalc = timeNow();
    upgradeCosts = [75, 100];
    chargeStart = -1;
    chargeTime = 500;
    getUpgrades() {
        return [
            { name: "Deceleration rate", active: this.power <= 0.1,
                desc: `${tf2(this.power * 360)}deg/sec<sup>2</sup> > ${tf2((this.power + 0.02) * 360)}deg/sec<sup>2</sup>`,
                descDisabled: "Capped: 21.6deg/sec<sup>2</sup>",
                cost: this.upgradeCosts[0] },
            { name: "Stress reduction rate", active: this.stressR <= 0.05,
                desc: `${tf2(this.stressR * 100)}%/sec > ${tf2(this.stressR * 100 + 1)}%/sec`,
                descDisabled: "",
                cost: this.upgradeCosts[0] },
        ];
    }
    upgrade(type) {
        switch (type) {
            case 0:
                this.power += 0.02;
                this.upgradeCosts[0] *= 1.5;
                break;
            case 1:
                this.stressR += 0.01;
                this.upgradeCosts[1] *= 1.5;
                break;
        }
        roundCosts(this.upgradeCosts);
    }
    generateDesc() {
        return `Decelerates all loopers by <b>${tf2(this.power * 360)}deg/sec<sup>2</sup></b>.
    *Capped at <b>${K.SPEED_Minimum * 360}deg/sec</b>
    Stress accumulation rate reduces by <b>${tf2(this.stressR * 100)}%</b> every second.
    *Capped at <b>${K.STRESS_Minimum * 100}%</b>
    `;
    }
    computeAttack() {
        let delta = (timeNow() - this.lastCalc) / 1000;
        this.lastCalc = timeNow();
        let available = loopersAt(this.position);
        for (let i = 0; i < available.length; i++) {
            let target = loopers[i];
            target.speed -= this.power * delta;
            target.stressFactor = Math.max(K.STRESS_Minimum, target.stressFactor - this.stressR * delta);
            shootLooper(this, target, 0, false);
            target.speed = Math.max(K.SPEED_Minimum, target.speed);
        }
    }
    chargePercentage() {
        return loopersAt(this.position).length == 0 ? 0 : 1;
    }
}
class UltraFastShooter extends Building {
    static cost = 200;
    static defaultCost = 200;
    static char = "FS2";
    static name = "FastShot II";
    static genDesc = `More rapid firing but even lower damage.
     Base damage: <b>4</b>
     Base cooldown: <b>0.2s</b>
    `;
    position;
    constructor(loc) {
        super();
        initBuilding(UltraFastShooter, this);
        this.position = loc;
    }
    power = 4;
    upgradeCosts = [75, 100];
    chargeStart = -1;
    chargeTime = 200;
    getUpgrades() {
        return [
            { name: "Damage", active: true,
                desc: `${tf2(this.power)} > ${tf2(this.power * 1.2)}`,
                descDisabled: "",
                cost: this.upgradeCosts[0] },
        ];
    }
    upgrade(type) {
        switch (type) {
            case 0:
                this.power *= 1.2;
                this.upgradeCosts[0] *= 1.5;
                break;
        }
        roundCosts(this.upgradeCosts);
    }
    generateDesc() {
        return `Fires at one random looper every <b>${tf2(this.chargeTime / 1000)}</b>s.
    Damage: <b>${this.power}</b>`;
    }
    computeAttack() {
        if (this.chargeStart < 0) {
            if (loopersAt(this.position).length > 0)
                this.chargeStart = timeNow();
            return;
        }
        let time = timeNow();
        if (time - this.chargeStart > this.chargeTime) {
            this.chargeStart = -1;
            let available = loopersAt(this.position);
            if (available.length > 0) {
                let toRemove = [];
                let idx = rand(available);
                let target = loopers[idx];
                shootLooper(this, target, this.power);
                if (target.health <= 0) {
                    removeLooper(loopers[idx]);
                }
            }
        }
    }
    chargePercentage() {
        let time = timeNow();
        if (this.chargeStart < 0)
            return 0;
        return (time - this.chargeStart) / this.chargeTime;
    }
}
function initBuilding(ty, that) {
    that.buildTime = timeNow();
    ty.cost = Math.floor(ty.cost * 1.4);
    for (let t of buildingTypes) {
        t.cost = Math.floor(t.cost * 1.1);
    }
}
function resetCosts() {
    for (let ty of buildingTypes) {
        ty.cost = ty.defaultCost;
    }
}
let buildingTypes = [Slow, WorseContinuous, Continuous, MultiShot, Destressor,
    FastShooter, UltraFastShooter, Energiser, Decelerator,
    BetterDecelerator];
//# sourceMappingURL=buildingInfo.js.map