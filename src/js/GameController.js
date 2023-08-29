import GamePlay from './GamePlay';
import themes from './themes';

import { generateTeam } from './generators';
import PositionedCharacter from './PositionedCharacter';

import Bowman from "./characters/bowman";
import Daemon from "./characters/daemon";
import Magician from "./characters/magician";
import Swordsman from "./characters/swordsman";
import Undead from "./characters/undead";
import Vampire from "./characters/vampire";

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
  }

  init() {
    this.gamePlay.drawUi(themes.prairie);
    // TODO: add event listeners to gamePlay events
    //Запускаем слушателей по наведение, убиранию и клику по ячейкам
    this.gamePlay.addCellEnterListener(this.onCellEnter.bind(this));
    this.gamePlay.addCellLeaveListener(this.onCellLeave.bind(this));
    this.gamePlay.addCellClickListener(this.onCellClick.bind(this));
    // TODO: load saved stated from stateService

    this.start();
  }

  //Старт игры
  start() {
    //Формируем команды
    const goodTeam = this.formteam([Bowman, Swordsman, Magician]);
    const badTeam = this.formteam([Daemon, Undead, Vampire]);

    // Расставляем игроков на поле случайным образом
    // Формируем список возможных позиций для команды хороших
   // const positionedCharacter = [];
    
    const goodAllPositins = [];
    for (let i = 0; i < 64; i++) {
      if (i % 8 === 0 || (i - 1) % 8 === 0) {
        goodAllPositins.push(i);
      }
    }
// Формируем список возможных позиций для команды плохих
    const badAllPositins = [];
    for (let i = 0; i < 64; i++) {
      if ((i + 2)  % 8 === 0 || (i + 1) % 8 === 0) {
        badAllPositins.push(i);
      }
    }

    let positionedCharacter = [];

    //Формируем позиции команды хороших
    positionedCharacter = this.formPositionsTeam(goodTeam, goodAllPositins, positionedCharacter);
    //Формируем позиции команды плохих все в обном массиве с позициями хороших
    positionedCharacter = this.formPositionsTeam(badTeam, badAllPositins, positionedCharacter);

    //отрисовываем всех персонажей
    this.gamePlay.redrawPositions(positionedCharacter);
    //сохраняем позиции всех в "глобальную" переменную
    this.gamePlay.positionedCharacter = positionedCharacter;
  }

  // Формирование компанд
  formteam(playerTypes) {
    return generateTeam(playerTypes, 3, 4);
  }

  //формирование позиций каждой команды
  formPositionsTeam(team, аllPositins, positionedCharacter) {
    //Формируем массив с персоонажами и их позициями, позиции берутся случайным образом из списка аllPositins
    team.characters.forEach(element => {
      const character = element;
      const idPosition = Math.floor(Math.random() * аllPositins.length);
      const position = аllPositins[idPosition];
      аllPositins.splice(idPosition, 1); // защита от повторения позиций
      positionedCharacter.push(new PositionedCharacter(character, position))
    });

    return positionedCharacter;
    // Отрисовываем персоонажей
    
  }

  onCellClick(index) {
    // TODO: react to click
    const check = this.findCharacterOnCellindex(index);
    if (check) {
      console.log (check);
      this.gamePlay.showCellTooltip('privet', index);
    } else {
      console.log ('нет персонажа');
    }
    
    //console.log(this.gamePlay.positionedCharacter);

  }

  onCellEnter(index) {
    // TODO: react to mouse enter
    const check = this.findCharacterOnCellindex(index);
    if (check) {
      //console.log (check);
      const message = this.formTooltip(check);
      this.gamePlay.showCellTooltip(message, index);
    } else {
      console.log ('нет персонажа');
    }
  }

  onCellLeave(index) {
    // TODO: react to mouse leave
    this.gamePlay.hideCellTooltip(index);
  }

  //Проверяем нет ли на клетке персонажа
  findCharacterOnCellindex(index) {
    const rezult = this.gamePlay.positionedCharacter.find(e => e.position === index)
    return rezult;
  }
  // формируем текст подсказки
  formTooltip(check) {
    const {level, attack, defence, health  } = check.character;
    const message = `\u{1F396}${level} \u{2694}${attack} \u{1F6E1}${defence} \u{2764}${health}`
    return message;
  }
}
