import GamePlay from './GamePlay';
import themes from './themes';
import GameState from './GameState';
import cursors from './cursors';

import { generateTeam } from './generators';
import { possibleMoveIndexes } from './utils';
import { possibleAttackIndexes } from './utils';
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
    this.goodTeam = this.formteam([Bowman, Swordsman, Magician]);
    this.badTeam = this.formteam([Daemon, Undead, Vampire]);

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
    positionedCharacter = this.formPositionsTeam(this.goodTeam, goodAllPositins, positionedCharacter);
    //Формируем позиции команды плохих все в обном массиве с позициями хороших
    positionedCharacter = this.formPositionsTeam(this.badTeam, badAllPositins, positionedCharacter);

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
  async onCellClick(index) {
    // TODO: react to click
    console.log('Кликнутая клетка', index);
    const check = this.findCharacterOnCellindex(index);       //ищем персонажа на кликнутой клетке, если есть, то сохраняем в константу 

    if (check) {                                             //Если в кликнутой ячейке есть игрок, то ...
      //После клика проверяем в какой команде игрок
      if (this.definingСommand(check.character.type)) {      // если в клиунтой ячейке находит друг, то

        //Если какая-то ячека была выделена, то снимаем выделение
        if (this.gameState.indexSelectedCell) {
          this.gamePlay.deselectCell(this.gameState.indexSelectedCell);
        }

        this.gamePlay.selectCell(index);                     //Выделаем персонажа
        this.gameState.indexSelectedCell = index;            //Записываем в gameState индекс выделенной ячейки

      } else {                                                //иначе значит что в этой ячейке враг, то ...
        if (this.gameState.indexSelectedCell) {                //... то проверяем то, был ли клику по вругу кликнут (т.е. выбран) какой-нибудь друг. Если да, то ...
          const persona = this.findCharacterOnCellindex(this.gameState.indexSelectedCell);         //находим персонажа на ранее кликнутой ячейке
          const possiblAttack = possibleAttackIndexes(this.gameState.indexSelectedCell, persona.character.distanceAttack); // составляем массив клеток, на которые может атаковать друг 

          if (possiblAttack.find(e => e === index)) {           //проверяем находится ли индекс данной ячейки в массиве возможных ячеек для атаки
            await this.attack(persona, check);                        // если находится в зоне атаки то запускаем функцию атаки, вней передаем атакуещего и атакуемого

            this.checkLife();                                   //Запускаем функцию удаления мертвых игроков с поля

            //== Ответ врага после атаки ===
            const arrPositionGoodPersons = [];                  // Пустой массив, в которы сложим позиции всех хороших, чтобы потом проверить их позиции на досягаемость врагов
            this.gamePlay.positionedCharacter.forEach(e => {    // Перебираем позиции всех персонажей, 
              if (this.definingСommand(e.character.type)) {       //если персонаж в хорошей команде, то ...
                arrPositionGoodPersons.push(e.position);            // добавляем его позицию в массив
              };
            });

            for (let i = 0; i < this.gamePlay.positionedCharacter.length; i++) { //Перебираем весь первоснажей на доске (чтобы найти врагов)
              const e = this.gamePlay.positionedCharacter[i];
              if (!this.definingСommand(e.character.type)) {                    //проверяем в какой команде каждый игрок, если игрок НЕ в команде друзей, то ....
                const possiblAttack = possibleAttackIndexes(e.position, e.character.distanceAttack);  //составляем массив клеток, на которые может ударить перебираемый в данный момент враг

                for (let j = 0; j < possiblAttack.length; j++) {              //Будем перебирать все ячейки возмодной атаки и ...
                  const element = possiblAttack[j];
                  if (arrPositionGoodPersons.find(el => el === element)) {      // ... сравнивать каждую ячейку с позицией друзей, и если среди них, есть позиция друга, то ... (element - индекс ячейки)                                
                    const goodTarget = this.findCharacterOnCellindex(element);   //находим персонажа на той найденной ячейке, чтобы его атаковать    
                    await this.attack(e, goodTarget);                            // производим атаку врагом друга  
                    i = this.gamePlay.positionedCharacter.length;                //истанавливаем перебор врагов, т.к. один из них сделал уже удар (просто переводим счетчик в конец)
                    break;
                  }
                }
              }
            }

            this.checkLife();                                                  //Запускаем функцию удаления мертвых игроков с поля

          }
        }
        else {
          GamePlay.showError('Это персонаж врага, вам нельзя им управлять!');
        }
      }

    } else {
      //console.log('в этой клетке нет персонажа');

      // Если был кликнут какой-то персонаж, то надо выполнить перемещение этого персонажа 
      // =============== добавить условие доступности клетки в которую передвигаем ==================
      if (this.gameState.indexSelectedCell) {                                                  //Если какая-то ячека была выделена, то ...

        const persona = this.findCharacterOnCellindex(this.gameState.indexSelectedCell);         //находим персонажа на кликнутой ячейке
        const possibleMove = possibleMoveIndexes(this.gameState.indexSelectedCell, persona.character.distanceMovi);     // Получаем массив ячеек на которые может ходить персонаж

        if (possibleMove.find(e => e === index)) {                                              // если индекс клетки, на которую навели, есть в массиве возможных выбранного шагов персонажа, то ...
          const personaNumberInArr = this.gamePlay.positionedCharacter.indexOf(persona, 0);       //находим номер персонажа в массиве всех игроков на поле, что бы потом по номеру заменить его позицию
          this.gamePlay.positionedCharacter[personaNumberInArr].position = index;                 //заменяем в массиве игроков старую позицию на новую только что кликнутую позицию
          this.gamePlay.redrawPositions(this.gamePlay.positionedCharacter);                       // перерисовываем поле
          this.gamePlay.deselectCell(this.gameState.indexSelectedCell);                           // снимаем выделение с той клетки, где раньше был персонаж
          this.gameState.indexSelectedCell = null;                                                // обнуляем констунту в которой раньше хранилась позиция кликнутой ячейки 
          // ================= сделать переход ходы   =================
        }

        //const persona = this.findCharacterOnCellindex(this.gameState.indexSelectedCell);        //находим персонажа на кликнутой ячейке

      }
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
      //console.log('нет персонажа');
      this.gamePlay.setCursor(cursors.auto);                       // если персонажа нет, то курсор меняем на стрелку

      if (this.gameState.indexSelectedCell) {                      //если на поле есть выбранный персонаж, то ...
        const character = this.findCharacterOnCellindex(this.gameState.indexSelectedCell);    // сохраняем в переменную выбранного персонажа
        const possibleMove = possibleMoveIndexes(this.gameState.indexSelectedCell, character.character.distanceMovi);     // Получаем массив ячеек на которые может ходить персонаж


        const possiblAttack = possibleAttackIndexes(this.gameState.indexSelectedCell, character.character.distanceAttack);

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

  async attack(attacker, target) {
    console.log('Здоровье врага', target.character.health);

    const damage = Math.max(attacker.character.attack - target.character.defence, attacker.character.attack * 0.1); //Высчитываем урон, который будет нанесен атакующим атакуемому

    await this.gamePlay.showDamage(target.position, damage); // Ожидаем завершения анимации урона

    target.character.health -= damage; // Пересчитываем здоровье атакуемого

    // if (!!this.gamePlay.boardEl.contains(target.position)) { // Проверяем, содержится ли элемент в DOM-дереве
    this.gamePlay.redrawPositions(this.gamePlay.positionedCharacter); // Перерисовываем поле, т.к. изменалась полоска жизни
    //}

    console.log('После удара здоровье врага', target.character.health);
  }

  // Функция удаления убитых игроков
  checkLife() {
    for (let i = 0; i < this.gamePlay.positionedCharacter.length; i++) {   // Перебираем всех игроков на поле
      if (this.gamePlay.positionedCharacter[i].character.health <= 0) {    // Если у какого-то игрока здоровье равно или меньше нуля, то ...
       
        //Если умер друг, то снимем выделение ячейки
        if (this.definingСommand(this.gamePlay.positionedCharacter[i].character.type)) {      // если в клиунтой ячейке находит друг, то
          //Если какая-то ячека была выделена, то снимаем выделение
          if (this.gameState.indexSelectedCell) {
            this.gamePlay.deselectCell(this.gameState.indexSelectedCell);
            this.gameState.indexSelectedCell = null;
          }
        }

        this.gamePlay.positionedCharacter.splice(i, 1);                     //... вырезаем этого игрока из массива всех игроков 
      }
    }
    this.gamePlay.redrawPositions(this.gamePlay.positionedCharacter);      // Перерисовываем поле
  }
}

