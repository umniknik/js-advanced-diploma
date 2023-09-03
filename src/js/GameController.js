import GamePlay from './GamePlay';
import themes from './themes';
import GameState from './GameState';
import cursors from './cursors';

import { generateTeam } from './generators';
import { possibleMoveIndexes } from './utils';
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
    this.gameState = new GameState();
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
      if ((i + 2) % 8 === 0 || (i + 1) % 8 === 0) {
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


  //Действия при клике на любую клетку
  onCellClick(index) {
    // TODO: react to click

    const check = this.findCharacterOnCellindex(index);       //ищем персонажа на кликнутой клетке, если есть, то сохраняем в константу 

    if (check) {                                             //Если в кликнутой ячейке есть игрок, то ...
      //После клика проверяем в какой команде игрок
      if (this.definingСommand(check.character.type)) {

        //Если какая-то ячека была выделена, то снимаем выделение
        if (this.gameState.indexSelectedCell) {
          this.gamePlay.deselectCell(this.gameState.indexSelectedCell);
        }

        this.gamePlay.selectCell(index);                     //Выделаем персонажа

        this.gameState.indexSelectedCell = index;           //Записываем в gameState индекс выделенной ячейки
        console.log(this.gameState.indexSelectedCell);

      } else {
        GamePlay.showError('Это персонаж врага, вам нельзя им управлять!');
      }


    } else {
      console.log('в этой клетке нет персонажа');
    }

  }

  //Действие при наведении курсора на клетку
  onCellEnter(index) {
    // TODO: react to mouse enter
    const check = this.findCharacterOnCellindex(index);         // находим персонажа на кликнутой ячейке

    if (check) {                                                //проверяем, есть ли в наведенной клетке персонаж
      if (this.definingСommand(check.character.type)) {          //если есть персонаж, то проверяем в какой команде, если в хорошей, то ....
        const message = this.formTooltip(check);                  // формируем сообщение с харатеристиками для показа ниже в подсказке
        this.gamePlay.showCellTooltip(message, index);            // при наведении на персонажа, показываем подсказку с характеристиками персорнажа
        this.gamePlay.setCursor(cursors.pointer);                 // если есть персонаж, то меняем курсор на палец
      } else {                                                  //если персонаж в плохой команде, то ...
        this.gamePlay.setCursor(cursors.crosshair);               // при наведении курсор меняется на прицел
        this.gamePlay.selectCell(index, "red");                   // при наведении ячека помечается красным кружком
      }

    } else {                                                    // если в ячейке нет персонажа, то ...
      console.log('нет персонажа');
      this.gamePlay.setCursor(cursors.auto);                       // если персонажа нет, то курсор меняем на стрелку

      if (this.gameState.indexSelectedCell) {                      //если на поле есть выбранный персонаж, то ...
        const character = this.findCharacterOnCellindex(this.gameState.indexSelectedCell);    // сохраняем в переменную выбранного персонажа
        const possibleMove = possibleMoveIndexes(this.gameState.indexSelectedCell, character.character.distanceMovi);     // Получаем массив ячеек на которые может ходить персонаж

         //Здесь надо добавить в этот нижний if ещё одну ветку, где сначала проверяется не наведено ли на врага
        if (possibleMove.find(e => e === index)) {                 // если индекс клеткаю, на которую навели, есть в массиве возможных выбранного шагов персонажа, то ...
          this.gamePlay.selectCell(index, "green");                    // подсвечиваем клетку зелёным кружком 
        } else {                                                   // если индекса наведенной клетки нет в массиве возможных ходов выбранного персонажа, то ...
          this.gamePlay.setCursor(cursors.notallowed);                // меняем курсор на знак "запрещено"
        }
      }
    }
  }

  //Дествия при покадании курсора любой клетки
  onCellLeave(index) {
    // TODO: react to mouse leave
    this.gamePlay.hideCellTooltip(index);                        //прячем подсказку с характеристиками, если курсор не наведен на персонажа

    //Убираем подсвечивание клетки зелёным
    if (this.gameState.indexSelectedCell !== index) {            //если клетка не равна клетке в которой есть отмеченный персонаж, то ...
      this.gamePlay.deselectCell(index);                         // убираем подсвечивание клетки 

    }
  }

  //Проверяем нет ли на клетке персонажа
  findCharacterOnCellindex(index) {
    const rezult = this.gamePlay.positionedCharacter.find(e => e.position === index)
    return rezult;
  }
  // формируем текст подсказки
  formTooltip(check) {
    const { level, attack, defence, health } = check.character;
    const message = `\u{1F396}${level} \u{2694}${attack} \u{1F6E1}${defence} \u{2764}${health}`
    return message;
  }

  //Определяем в какой компанде игрок
  definingСommand(user) {
    return !!['bowman', 'swordsman', 'magician'].find(e => e === user);
  }
}

