import Character from "../Character";

export default class Swordsman extends Character {
    constructor(level){
        super(level, 'swordsman');
        this.attack = 140;
        this.defence = 10;
        this.distanceMovi = 4;
        this.distanceAttack = 1;        
    }
}


