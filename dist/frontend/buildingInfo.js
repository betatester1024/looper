"use strict";
class Building {
    type = -1;
    static name = "Generic building.";
    static genDesc;
}
function tf2(n) { return n.toFixed(2); }
;
function roundCosts(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.round(arr[i]);
    }
}
class Slow extends Building {
    type = 0;
    position;
    constructor(loc) {
        super();
        this.position = loc;
    }
    static genDesc = `Slow-firing building. Fires at one random looper every time.
  Base damage: 10
  Charge time: 1 second
  Cooldown: 2 seconds
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
    type = 1;
    static name = "ContinuousShot I";
    static genDesc = `Continuous damage.
    Base damage/sec/looper: 2
    `;
    position;
    constructor(loc) {
        super();
        this.position = loc;
    }
    power = 2;
    upgradeCost = 200;
    lastAttack = Date.now();
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
    type = 2;
    static name = "MultiShot I";
    static genDesc = `Attacks multiple loopers. Slow charging.
    Base damage: 30
    Base target count: 2 loopers
    Charge time: 5 seconds
    `;
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
    generateDesc() {
        return `Attacks multiple loopers. Slow charging.
    Deals <b>${this.power}</b> damage to <b>${this.attackCt}</b> loopers every shot.
    Charge time: <b>${(this.chargeTime / 1000).toFixed(2)}</b> seconds.
    `;
    }
    upgradeCosts = [50, 75, 100];
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
    type = 3;
    static name = "Destressor";
    static genDesc = `Reduces stress level of every looper in range.
     Base effect: -${K.STRESS_Base * 2} stress/sec
    `;
    position;
    constructor(loc) {
        super();
        this.position = loc;
    }
    power = K.STRESS_Base * 2;
    lastCalc = Date.now();
    upgradeCost = 75;
    getUpgrades() {
        return [
            { name: "Stress reduction", active: true,
                desc: `${this.power}/s > ${tf2(this.power * 1.2)}/s`,
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
        let delta = (Date.now() - this.lastCalc) / 1000;
        this.lastCalc = Date.now();
        for (let i of loopersAt(this.position)) {
            loopers[i].stress -= this.power * delta;
            loopers[i].stress = Math.max(0, loopers[i].stress);
        }
    }
    chargePercentage() {
        return loopersAt(this.position).length > 0 ? 1 : 0;
    }
}
let buildingTypes = [Slow, Continuous, MultiShot, Destressor];
//# sourceMappingURL=buildingInfo.js.map