const q = (selector) => document.querySelector(selector);
const qid = (id) => document.getElementById(id);
const random = (max) => {
  return Math.floor(Math.random() * max);
}

const node= {
  keyListener:qid('key-listener'),
  xset:qid('x-setting-input'),
  yset:qid('y-setting-input'),
  sset:qid('speed-setting-input'),
  xysets:qid('xy-setting-button'),
  ssets:qid('speed-setting-button'),
  ga:qid('game-area'),
  status:qid('status-button'),
  cover:qid('cover')
}

if(window.parent !== window) {
  console.log('parent')
  const iframes = window.parent.document.querySelectorAll('iframe');
  for(let ifr of iframes) {
    if(ifr.contentWindow === window) {
      node.iframe = ifr;
    }
  }
}

const MINX = 8;
const MINY = 8;
const UINTSIZE = 20;

class Game{
  constructor(){
  }

  new(){
    console.log('new');
    node.status.value = '开始';

    if(this.snake) {
      this.snake.clear();
    }
    if(this.food) {
      this.food.clear();
    }

    this.x = node.xset.value;
    this.y = node.yset.value;
    this.renderGameArea();

    this.speed = node.sset.value;
    this.safes = new Map();
    this.snakeBody = new Set();
    this.runable = true;
    this.runing = false;

    for(let l = 0;l < this.x;++l) {
      for(let m = 0;m < this.y;++m) {
        this.safes.set(getKey(l,m),{x:l,y:m});
      }
    }

    this.snake = new Snake(0,1);
    this.safes.delete(getKey(0,1));
    this.snakeBody.add(getKey(0,1));

    this.food = this.createFood();
    this.render();
  }
  run(){
    console.log('run');
    node.status.value = '暂停';

    if(this.runable) {
      let preTimestamp = Date.now();
      this.runing = true;
  
      let id;
  
      const runlAnimation = () => {
        if(!this.runing) {
            window.cancelAnimationFrame(id);
            return;
        }
        const timestamp = Date.now();
        if((timestamp - preTimestamp) > (5000 / this.speed)){
            preTimestamp += 5000 / this.speed;
            this.doRun();
        }
        id = window.requestAnimationFrame(runlAnimation);
      }
      id = window.requestAnimationFrame(runlAnimation);
    }
  }
  over(){
    console.log('over');
    this.runing = false;
    this.runable = false;
    node.status.value = '重新开始';
  }
  pause(){
    this.runing = false;
    node.status.value = '开始';
  }

  doRun(){
    if(this.snake.derection !== 0){
      this.snake.crawl(this);
      const head = this.snake.body[0];
      if(head.x < 0 || head.y < 0 || head.x >= this.x || head.y >= this.y || this.snakeBody.has(getKey(head.x,head.y))) {
        head.node.classList.add('over');
        this.over();
      } else {
        this.safes.delete(getKey(head.x,head.y));
        this.snakeBody.add(getKey(head.x,head.y));

        if(this.safes.size === 0) {
          console.log('通关');
          this.over()
        } else {
          if(head.x === this.food.x && head.y === this.food.y) {
            this.snake.eat(this);
            this.food.clear();
            this.food = this.createFood();
          }
        }
      }

      this.render();
    }
  }

  renderGameArea() {
    node.ga.style.width = `${this.x*UINTSIZE}px`;
    node.ga.style.height = `${this.y*UINTSIZE}px`;
  }

  createFood(){
    const coord = [...this.safes.values()][random(this.safes.size)];
    return new Food(coord.x,coord.y);
  }

  render(){
    this.snake.render();
    if(this.food) {
      this.food.render();
    }
  }

  resize(x,y) {
    x = parseInt(x);
    y = parseInt(y);
    if(isNaN(x) || isNaN(y)) {
    } else {
      const maxx = Math.floor((document.body.clientWidth -40) / 20);
      const maxy = Math.floor((document.body.clientHeight -180) / 20);

      x = x>maxx ? maxx : x;
      y = y>maxy?maxy:y;

      x = x<MINX?MINX:x;
      y= y<MINY?MINY:y;

      if(x !== this.x || y!== this.y) {
        if(this.runable) {
          if(this.snake.body[0].x >= x || this.snake.body[0].y >= y) {
            this.over();
          } else {
            for(let l = 0; l < this.snake.body.length;++l) {
              if(this.snake.body[l].x >=x || this.snake.body[l].y >=y) {
                for(let m = l; m < this.snakeBody.body.length;++m) {
                  this.snake.body[m].clear();
                }
                this.snake.body = this.snake.body.slice(0,l);
                break;
              }
            }
            if(this.food.x >= x || this.food.y >= y) {
              this.food.clear();
              this.food = undefined;
            }
  
            this.safes.clear();
            this.snakeBody.clear();
  
            for(let l = 0;l < x;++l) {
              for(let m = 0;m < y;++m) {
                this.safes.set(getKey(l,m),{x:l,y:m});
              }
            }
  
            for(let b of this.snake.body) {
              const key = getKey(b.x,b.y);
              this.safes.delete(key);
              this.snakeBody.add(key);
            }
  
            if(this.food === undefined) {
              this.food = this.createFood();
              console.log('food');
              console.log(this.food);
            }
            this.render();
          }
        }
        this.x = x;
        this.y = y;
  
        this.renderGameArea();

        if(node.iframe) {
          const event = new Event('gameresize');
          event.width = this.x*20+40;
          event.height = this.y*20+180
          node.iframe.dispatchEvent(event);
        }
      }
    }
    
    node.xset.value = this.x;
    node.yset.value = this.y;

    console.log(`set x=${this.x} y=${this.y}`);
  }
}

const LEFT = -2;
const RIGHT = 2;
const UP = -1;
const DOWN = 1;

class Snake{
  constructor(x,y) {
    this.body = [SnakeBody.head(x,y)];
    /**
     * 0 初始
     * -1 上
     * 1 下
     * 2 右
     * -2 左
     */
    this.derection = 0; 
    this.prevDerection = 0;
    this.x = 0;
    this.y = 0;
    this.last = undefined;
  }

  turn(value) {
    console.log('turn');
    if(value !== -this.prevDerection || this.body.length === 1) {
      this.derection = value;
      switch(value) {
        case LEFT:
          this.x = -1;
          this.y = 0;
          break;
        case RIGHT:
          this.x = 1;
          this.y = 0;
          break;
        case UP:
          this.x = 0;
          this.y = -1;
          break;
        case DOWN:
          this.x = 0;
          this.y = 1;
          break;
        default:
          throw new Error('turn参数非法 = ' + value);
      }
    }
  }

  crawl(game) {
    if(this.derection != 0)
    this.prevDerection = this.derection;
    this.last = {
      x:this.body[this.body.length - 1].x,
      y:this.body[this.body.length - 1].y,
    }

    game.safes.set(getKey(this.last.x,this.last.y), {x:this.last.x,y:this.last.y});
    game.snakeBody.delete(getKey(this.last.x,this.last.y));
    
    for(let l = this.body.length - 1; l > 0;--l) {
      this.body[l].x = this.body[l-1].x;
      this.body[l].y = this.body[l-1].y;
    }

    this.body[0].x += this.x;
    this.body[0].y += this.y;
  }

  eat(game) {
    this.body.push(new SnakeBody(this.last.x,this.last.y));
    game.safes.delete(getKey(game.food.x,game.food.y));
    game.snakeBody.add(getKey(game.food.x,game.food.y));
  }

  render() {
    for(let b of this.body) {
      b.render();
    }
  }

  clear() {
    for(let b of this.body) {
      b.clear();
    }
  }
}

class SnakeBody{
  constructor(x,y) {
    this.x = x;
    this.y = y;
    this.node = SnakeBodyTemplate.cloneNode();
    this.node.style.width = `${UINTSIZE}px`;
    this.node.style.height = `${UINTSIZE}px`;
    node.ga.appendChild(this.node);
  }

  render() {
    this.node.style.left = `${this.x*UINTSIZE}px`;
    this.node.style.top = `${this.y*UINTSIZE}px`;
  }

  clear() {
    node.ga.removeChild(this.node);
  }

  static head(x,y) {
    const result = new this(x,y);
    result.node.classList.add('head');
    return result;
  }
}

const getKey = (x,y) => {
  return `x${x}y${y}`;
}

class Food{
  constructor(x,y) {
    this.x = x;
    this.y = y;
    this.node = FoodTemplate.cloneNode();
    this.node.style.width = `${UINTSIZE}px`;
    this.node.style.height = `${UINTSIZE}px`;
    node.ga.appendChild(this.node);
  }

  render() {
    this.node.style.left = `${this.x*UINTSIZE}px`;
    this.node.style.top = `${this.y*UINTSIZE}px`;
  }

  clear() {
    node.ga.removeChild(this.node);
  }
}

const SnakeBodyTemplate = document.createElement('div');
SnakeBodyTemplate.classList.add('snake-body');

const FoodTemplate = document.createElement('div');
FoodTemplate.classList.add('food');

const game = new Game();
game.new();

node.keyListener.addEventListener('keydown',(e) => {
  if(e.key === ' ') {
    node.status.click();
  } else if(game.runing) {
    console.log(e.key);
    switch(e.key) {
      case 'ArrowUp':
        game.snake.turn(UP);
        break;
      case 'ArrowDown':
        game.snake.turn(DOWN);
        break;
      case 'ArrowLeft':
        game.snake.turn(LEFT);
        break;
      case 'ArrowRight':
        game.snake.turn(RIGHT);
    }
  }
})

node.status.addEventListener('click',(e) => {
  if(game.runing) {
    game.pause();
  } else if(game.runable) {
    game.run();
  } else {
    game.new();
    game.run();
  }
})

const handleResize = ()=>{
  const x = Math.floor((document.body.clientWidth -40) / 20);
  const y = Math.floor((document.body.clientHeight -180) / 20);
  console.log({x,y});
  if(x < game.x || y < game.y) {
    game.resize(x,y);
  }
}

node.xset.addEventListener('click',e=>{
  e.stopPropagation();
  game.pause();
})

node.yset.addEventListener('click', e=>{
  e.stopPropagation();
  game.pause();
})

node.sset.addEventListener('click', e=>{
  e.stopPropagation();
  game.pause();
})

node.xysets.addEventListener('click',() => {
  const x = parseInt(node.xset.value);
  const y = parseInt(node.yset.value);
  console.log(`xysets click x=${x} y=${y}`);
  if(isNaN(x) || isNaN(y)) {
    console.log('非法数值');
  } else {
    game.resize(x,y);
  }
  node.xset.value = game.x;
  node.yset.value = game.y;
})

node.ssets.addEventListener('click',()=>{
  const speed = parseInt(node.sset.value);
  if(isNaN(speed)) {
    console.log('非法数值');
  } else {
    game.speed = speed;
  }
  node.sset.value = game.speed;
})

window.addEventListener('resize', handleResize);

window.addEventListener('click', ()=>{
  node.keyListener.focus();
})

handleResize();
node.keyListener.focus();