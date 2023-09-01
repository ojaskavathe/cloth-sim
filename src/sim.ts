let params = {
  physics_accuracy: 10,
  mouse_influence: 10,
  cut_size: 5,
  gravity: 1200,
  cloth_height: 50,
  cloth_width: 200,
  start_y: 20,
  spacing: 5,
  tear_distance: 60
}

let 
  cloth: Cloth,
  boundsx: number,
  boundsy: number,
  mouse = {
    down: false,
    button: 1,
    x: 0,
    y: 0,
    px: 0,
    py: 0
  };

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

class Point {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  pin_x: number | null;
  pin_y: number | null;
  constraints: Constraint[];
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.vx = 0;
    this.vy = 0;
    this.pin_x = null;
    this.pin_y = null;

    this.constraints = [];
  }

  update(delta: number) {
    if (mouse.down) {
      let diff_x = this.x - mouse.x;
      let diff_y = this.y - mouse.y;
      let dist = (diff_x * diff_x + diff_y * diff_y);

      if (mouse.button == 0) // left mouse button
      {
        if (dist < params.mouse_influence**2) {
          this.px = this.x - (mouse.x - mouse.px) * 1.8;
          this.py = this.y - (mouse.y - mouse.py) * 1.8;
        }

      } else if (dist < params.cut_size**2) this.constraints = [];
    }

    this.add_force(0, params.gravity);

    delta *= delta;
    let nx = this.x + ((this.x - this.px) * .99) + ((this.vx / 2) * delta);
    let ny = this.y + ((this.y - this.py) * .99) + ((this.vy / 2) * delta);

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.vy = this.vx = 0
  };

  draw() {
    if (!this.constraints.length) return;

    var i = this.constraints.length;
    while (i--) this.constraints[i].draw();
  };

  resolve_constraints() {
    if (this.pin_x != null && this.pin_y != null) {
      this.x = this.pin_x;
      this.y = this.pin_y;
      return;
    }

    var i = this.constraints.length;
    while (i--) this.constraints[i].resolve();

    this.x > boundsx ? this.x = 2 * boundsx - this.x : 1 > this.x && (this.x = 2 - this.x);
    this.y < 1 ? this.y = 2 - this.y : this.y > boundsy && (this.y = 2 * boundsy - this.y);
  };

  attach(point: Point) {
    this.constraints.push(
      new Constraint(this, point)
    );
  };

  remove_constraint(constraint) {
    this.constraints.splice(this.constraints.indexOf(constraint), 1);
  };

  add_force(x: number, y: number) {
    this.vx += x;
    this.vy += y;

    var round = 400;
    this.vx = ~~(this.vx * round) / round;
    this.vy = ~~(this.vy * round) / round;
  };

  pin(pinx: number, piny: number) {
    this.pin_x = pinx;
    this.pin_y = piny;
  };
};

class Constraint {
  p1: Point;
  p2: Point;
  length: number;

  constructor(p1: Point, p2: Point) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = params.spacing;
  }

  resolve() {
    let diff_x = this.p1.x - this.p2.x;
    let diff_y = this.p1.y - this.p2.y;
    let dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
    let diff = (this.length - dist) / dist;

    if (dist > params.tear_distance) {
      this.p1.remove_constraint(this);
    }

    let px = diff_x * diff * 0.5;
    let py = diff_y * diff * 0.5;

    this.p1.x += px;
    this.p1.y += py;
    this.p2.x -= px;
    this.p2.y -= py;
  };

  draw() {
    context.moveTo(this.p1.x, this.p1.y);
    context.lineTo(this.p2.x, this.p2.y);
  };
};


class Cloth {
  points: Point[];

  constructor() {
    this.points = [];

    let start_x = canvas.width / 2 - params.cloth_width * params.spacing / 2;

    for (let y = 0; y <= params.cloth_height; y++) {
      for (let x = 0; x <= params.cloth_width; x++) {
        let p = new Point(start_x + x * params.spacing, params.start_y + y * params.spacing);

        // Points are created in rows, thus when setting constraints
        // Points are attached to the point to the left (when not the leftmost point)
        x != 0 && p.attach(this.points[this.points.length - 1]);
        // Topmost points are pinned at the top 
        y == 0 && p.pin(p.x, p.y);
        // Points are attached to the pin above
        y != 0 && p.attach(this.points[x + (y - 1) * (params.cloth_width + 1)])

        this.points.push(p);
      }
    }
  }

  update() {
    let i = params.physics_accuracy;

    while (i--) {
      let p = this.points.length;
      while (p--) this.points[p].resolve_constraints();
    }

    i = this.points.length;
    while (i--) this.points[i].update(.016);
  };

  draw() {
    context.beginPath();

    let i = cloth.points.length;
    while (i--) cloth.points[i].draw();

    context.stroke();
  };
};


const update = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  cloth.update();
  cloth.draw();

  requestAnimationFrame(update);
}

const start = () => {
  canvas.ontouchstart = (e: TouchEvent) => {
    e.preventDefault();

    mouse.button = 0;
    
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.targetTouches[0].clientX - rect.left;
    mouse.y = e.targetTouches[0].clientY - rect.top;

    // no way to know touch position without actual touch
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    mouse.down = true;
  }

  canvas.ontouchend = (e: TouchEvent) => {
    e.preventDefault();
    mouse.down = false;
  }
  
  canvas.ontouchmove = (e: TouchEvent) => {
    e.preventDefault();

    mouse.px = mouse.x;
    mouse.py = mouse.y;

    const rect = canvas.getBoundingClientRect();
    mouse.x = e.targetTouches[0].clientX - rect.left;
    mouse.y = e.targetTouches[0].clientY - rect.top;
  }

  canvas.onmousedown = function (e: MouseEvent) {
    mouse.button = e.button;
    mouse.px = mouse.x;
    mouse.py = mouse.y;

    let rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    mouse.down = true;
    e.preventDefault();
  };

  canvas.onmouseup = function (e: MouseEvent) {
    mouse.down = false;
    e.preventDefault();
  };

  canvas.onmousemove = function (e: MouseEvent) {
    mouse.px = mouse.x;
    mouse.py = mouse.y;

    let rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left,
      mouse.y = e.clientY - rect.top,

    e.preventDefault();
  };

  canvas.oncontextmenu = function (e: Event) {
    e.preventDefault();
  };

  boundsx = canvas.width - 1;
  boundsy = canvas.height - 1;

  context.strokeStyle = '#555';

  cloth = new Cloth();

  update();
}

const setup_options = () => {

  const setup_option = (label: string, reload: boolean = false) => {
    let param_range = <HTMLInputElement>document.getElementById(label);
    let param_out = <HTMLSpanElement>document.getElementById(label + '-out');
    param_range.value = params[label].toString();
    param_out.innerHTML = params[label].toString();
    param_range.addEventListener("input", (event: Event) => {
      params[label] = (<HTMLInputElement>event.target).valueAsNumber;
      param_out.innerHTML = (<HTMLInputElement>event.target).value;
      if (reload) {
        cloth = new Cloth();
      }
    });  
  }

  setup_option('physics_accuracy', true);
  setup_option('gravity');
  setup_option('cut_size');
  setup_option('spacing', true);
  setup_option('cloth_width', true);
  setup_option('cloth_height', true);
}

window.onload = () => {
  canvas = <HTMLCanvasElement>document.getElementById('c');
  context = <CanvasRenderingContext2D>canvas.getContext('2d');
  
  setup_options();

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight/2;

  let factor = 7;
  params.cloth_width = ~~(canvas.width/factor);
  params.spacing = factor - 1;

  start();
};