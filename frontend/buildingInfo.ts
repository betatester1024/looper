
abstract class Building {
  type:number = -1;
  static name:string = "Generic building.";
  static genDesc:string;
  abstract generateDesc():string
  abstract computeAttack():void
  abstract chargePercentage():number
}

class Slow extends Building {
  type = 0;
  position:Point
  constructor(loc:Point) {
    super();
    this.position = loc;
  }
  static genDesc = 
  `Slow-firing building. Fires at one random looper every time.
  Base damage: 10
  Charge time: 1 second
  Cooldown: 2 seconds
  `
  chargeStart = -1;
  chargeTime = 1000;
  cooldown = 2000;
  power = 10;
  poweringDown = false;
  static name = "SlowShot I";
  generateDesc() {
    return `Slow-firing building. Fires at one random looper every time.
    Damage per shot: <b>${this.power}</b>
    Charge time: <b>${(this.chargeTime/1000).toFixed(2)}</b> seconds. 
    Cooldown: <b>${(this.cooldown/1000).toFixed(2)}</b> seconds.`;
  }
  computeAttack() {
    let time = Date.now();
    if (this.chargeStart < 0) return [];
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
      if (available.length > 0) 
      {
        let idx = rand(available)
        let target = loopers[idx] as Looper;
        target.health -= this.power;
        if (target.health <= 0) {
          loopers.splice(idx, 1);
        }
      }
      else return [];
    }  
    return [];
  }
  getStress() {

  }
  chargePercentage() { // continuously called
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
    else return 0;
  }
}
class Continuous extends Building {
  type = 1;
  static name = "ContinuousShot I"
  static genDesc = 
    `Continuous damage.
    Base damage/sec/looper: 2
    `
  position:Point;
  constructor(loc:Point) {
    super();
    this.position = loc;
  }
  power = 2;
  lastAttack = Date.now();
  generateDesc() {
    return `Deals continuous damage to loopers.
    <b>${this.power}</b> damage/second/looper.`
  }
  computeAttack() {
    let time = Date.now();
    let delta = (time - this.lastAttack)/1000;
    this.lastAttack = time;
    let toRemove = [];
    for (let l of loopersAt(this.position)) {
      loopers[l].health -= delta*this.power;
      if (loopers[l].health < 0) {
        toRemove.push(loopers[l]);
      }
    }
    for (let looper of toRemove)
      loopers.splice(loopers.indexOf(looper), 1);
  }
  chargePercentage() {return loopersAt(this.position).length>0?1:0;}
}

class MultiShot extends Building {
  type = 2;
  static name = "MultiShot I";
  static genDesc = 
    `Attacks multiple projectiles. Slow charging.
    Base damage: 30
    Base target count: 2 loopers
    Charge time: 5 seconds
    `
  position:Point;
  constructor(loc:Point) {
    super();
    this.position = loc;
  }
  power = 30;
  attackCt = 2;
  lastAttack = Date.now();
  chargeTime = 5000;
  chargeStart = -1;
  generateDesc() {
    return `Attacks multiple projectiles. Slow charging.
    Deals <b>${this.power}</b> damage to <b>${this.attackCt}</b> projectiles every shot.
    Charge time: <b>${(this.chargeTime/1000).toFixed(2)}</b> seconds.
    `;
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
        for (let i=0; i<this.attackCt; i++) { 
          let idx = rand(available);
          let target = loopers[idx] as Looper;
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
    if (this.chargeStart < 0) return 0;
    return (time - this.chargeStart)/this.chargeTime;
  }
}

class Destressor extends Building {
  type = 3;
  static name = "Destressor";
  static genDesc = 
    `Reduces stress level of every looper in range.
     Base effect: -${K.STRESS_Base*2} stress/sec
    `
  position:Point;
  constructor(loc:Point) {
    super();
    this.position = loc;
  }
  power = K.STRESS_Base*2;
  lastCalc = Date.now();
  generateDesc() {
    return `Reduces stress level of every looper entering the loop.
    Reduces <b>${this.power.toFixed(2)}</b> stress/sec/looper.`;
  }
  computeAttack() {
    let delta = (Date.now() - this.lastCalc)/1000;
    this.lastCalc = Date.now();
    for (let i of loopersAt(this.position)) {
      loopers[i].stress -= this.power*delta;
      loopers[i].stress = Math.max(0, loopers[i].stress);
    }
  }
  chargePercentage() {
    return loopersAt(this.position).length>0?1:0;
  }
}

let buildingTypes = [Slow, Continuous, MultiShot, Destressor];