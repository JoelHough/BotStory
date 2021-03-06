var GATE_WIDTH = 20;
var GATE_HEIGHT = 30;
var PORT_WIDTH = 15;
var PORT_HEIGHT = 12;
var WIRE_X_OFFSET = PORT_WIDTH / 2;
var WIRE_Y_OFFSET = PORT_HEIGHT / 2;
var BOT_HEIGHT = 40;
var BOT_WIDTH = 40;
var BOT_SPEED = 1;
var BUMPER_WIDTH = 20;
var BUMPER_HEIGHT = 5;
var BUMPER_SPACING = 2;
var THRUST_WIDTH = BUMPER_WIDTH;
var THRUST_HEIGHT = 40;

Crafty.c('Wire', {
    init: function() {
        this.requires('DOM');
        this.css({backgroundColor: 'transparent',
                 border: '2px solid white'});
        this.bind('EnterFrame', this._enterFrame);
        this.bind('Remove', this._onRemove);
    },
    _onRemove: function() {
        if (this.sink) this.sink.set(false);
    },
    _cssProps: function() {
        if (!this.sink || !this.source) {
            return {};
        }
        var top = Math.min(this.source.wireY, this.sink.wireY);
        var left = Math.min(this.source.wireX, this.sink.wireX);
        var bottom = Math.max(this.source.wireY, this.sink.wireY);
        var right = Math.max(this.source.wireX, this.sink.wireX);
        var show = {
            left: this.cw != this.source.wireY < this.sink.wireY,
            top: this.cw != this.source.wireX > this.sink.wireX
        };
        return { top: top + 'px',
                 left: left + 'px',
                 height: bottom - top + 'px',
                 width: right - left + 'px',
                 borderColor: this.source._active ? 'red' : 'white',
                 borderLeftStyle: show.left ? 'solid' : 'none',
                 borderTopStyle: show.top ? 'solid' : 'none',
                 borderRightStyle: !show.left ? 'solid' : 'none',
                 borderBottomStyle: !show.top ? 'solid' : 'none'
               };
    },
    _enterFrame: function() {
        this.css(this._cssProps());
    },
    wire: function(from, to) {
        if (from.isSource == to.isSource) {
            this.destroy();
        }
        this.cw = from.isSource;
        this.from = from;
        this.to = to;
        this.source = from.isSource ? from : to;
        this.sink = from.isSource ? to : from;
        to.wire = this;
        from.wire = this;
        this._visible = true;
        return this;
    },
    clock: function() {
        if (this.sink && this.source) {
            this.sink.set(this.source._active);
        }
    }});

Crafty.c('Wireable', {
    init: function() {
        this.requires('2D, Mouse');
        this.__defineGetter__('wireX', function() {return this._x + WIRE_X_OFFSET;})
        this.__defineGetter__('wireY', function() {return this._y + WIRE_Y_OFFSET;})
        this.bind('MouseDown', this._onDown);
        this.bind('MouseUp', this._onUp);
        Crafty.addEvent(this, Crafty.stage.elem, "mouseup", this._onUpOutside);
    },
    _onDown: function(e) {
        if (e.mouseButton !== Crafty.mouseButtons.LEFT) return;
        if (this.wire) this.wire.destroy();
        Crafty.mousePort.isSource = !this.isSource;
        this.wire = Crafty.e('Wire, Save').wire(this, Crafty.mousePort);
        this.dragging = true;
    },
    _onUp: function(e) {
        if (e.mouseButton !== Crafty.mouseButtons.LEFT) return;
        var wire = Crafty.mousePort.wire;
        if (wire) {
            if (this.wire) this.wire.destroy();
            Crafty.mousePort.wire = null;
            if (Crafty.mousePort.isSource) {
                wire.wire(wire.sink, this);
            } else {
                wire.wire(wire.source, this);
            }
        }
    },
    _onUpOutside: function(e) {
        if (e.mouseButton !== Crafty.mouseButtons.LEFT) return;
        if (!this.dragging) return;
        this.dragging = false;
        if (Crafty.mousePort.wire) Crafty.mousePort.wire.destroy();
    }
});

Crafty.c('Sink', {
    init: function() {
        this.requires('2D, coldSink, Canvas, Wireable');
        this.isSource = false;
        this.attr({w: PORT_WIDTH, h: PORT_HEIGHT, z:1000});
        this.set(false);
    },
    set: function(val) {
        this._active = val;
        if (val) {
            this.removeComponent('coldSink');
            this.addComponent('hotSink');
        } else {
            this.removeComponent('hotSink');
            this.addComponent('coldSink');            
        }
        if (this._onSet) this._onSet(val);
        return this;
    },
    onSet: function(f) {
        this._onSet = f;
        return this;
    }
});

Crafty.c('Source', {
    init: function() {
        this.requires('2D, coldSource, Canvas, Wireable');
        this.isSource = true;
        this.attr({w: PORT_WIDTH, h: PORT_HEIGHT, z:1000});
        this.set(false);
    },
    set: function(val) {
        this._active = val;
        if (val) {
            this.removeComponent('coldSource');
            this.addComponent('hotSource');
        } else {
            this.removeComponent('hotSource');
            this.addComponent('coldSource');            
        }
        return this;
    }
});

Crafty.c('Gate', {
    init: function() {
        this.requires('2D, Canvas, Draggable');
        this.attr({z:1000});
    },
    onClock: function(f) {
        this._onClock = f;
        return this;
    },
    clock: function() {
        this._onClock();
    }
});

Crafty.c('Wall', {
    init: function() {
        this.requires('2D, Color, Canvas');
    }
});

var NotGate = function(opt) {
    var x = opt.x;
    var y = opt.y;
    var y_offset = GATE_HEIGHT / 2 - PORT_HEIGHT / 2;
    var input = Crafty.e('Sink').attr({x: x - PORT_WIDTH, y: y + y_offset, id: opt.in0});
    var output = Crafty.e('Source').attr({x: x + GATE_WIDTH, y: y + y_offset, id: opt.out0}).set(true);
    
    var gate = Crafty.e('Gate, hotNot').attr({x: x, y: y, w: GATE_WIDTH, h: GATE_HEIGHT}).onClock(
        function () {
            if (!input._active) {
                this.removeComponent('not');
                this.addComponent('hotNot');
            } else {
                this.removeComponent('hotNot');
                this.addComponent('not');            
            }
            output.set(!input._active);
            if (!input.wire) input.set(false);
        }
    );
    gate.attach(input, output);
    gate.input = input;
    gate.output = output;
    gate.gate = 'not';
    if (opt.input != null) {
        gate.input._active = opt.input;
        gate.clock();
    }
    gate.opt = function() {
        return {x: this._x, y: this._y, input: this.input._active,
                in0: this.input.id, out0: this.output.id};  
    };
    return gate;
};

var FlipFlop = function(opt) {
    var x = opt.x;
    var y = opt.y;
    var in_a = Crafty.e('Sink').attr({x: x - PORT_WIDTH, y: y, id: opt.in0});
    var in_b = Crafty.e('Sink').attr({x: x - PORT_WIDTH, y: y + GATE_HEIGHT - PORT_HEIGHT, id: opt.in1});
    var out_a = Crafty.e('Source').attr({x: x + GATE_WIDTH, y: y, id: opt.out0});
    var out_b = Crafty.e('Source').attr({x: x + GATE_WIDTH, y: y + GATE_HEIGHT - PORT_HEIGHT, id: opt.out1});
    out_a.set(true);
    var gate = Crafty.e('Gate, ffA').attr({x: x, y: y, w: GATE_WIDTH, h: GATE_HEIGHT}).onClock(
        function() {
            if (in_a._active) {
                this.removeComponent('ffB');
                this.addComponent('ffA');
                out_a.set(true);
                out_b.set(false);
            } else if (in_b._active) {
                this.removeComponent('ffA');
                this.addComponent('ffB');
                out_a.set(false);
                out_b.set(true);
            }
            if (!in_a.wire) in_a.set(false);
            if (!in_b.wire) in_b.set(false);
        });
    gate.attach(in_a, in_b, out_a, out_b);
    gate.in_a = in_a;
    gate.in_b = in_b;
    gate.out_a = out_a;
    gate.out_b = out_b;
    gate.gate = 'ff';
    if (opt.in_a != null) gate.in_a._active = opt.in_a;
    if (opt.in_b != null) gate.in_b._active = opt.in_b;
    if (opt.in_a != null || opt.in1 != null) gate.clock();
    gate.opt = function() {
        return {x: this._x, y: this._y,
                in_a: this.in_a._active, in_b: this.in_b._active,
                in0: this.in_a.id, in1: this.in_b.id, out0: this.out_a.id, out1: this.out_b.id};
    };
    return gate;
};

Crafty.c('Bot', {
    init: function() {
        this.requires('2D, Canvas, Color, Draggable');
        this.bind('EnterFrame', this._thrust);
    },
    _thrust: function() {
        var x = (this.leftThruster ? BOT_SPEED : 0) + (this.rightThruster ? -BOT_SPEED : 0);
        var y = (this.topThruster ? BOT_SPEED : 0) + (this.bottomThruster ? -BOT_SPEED : 0);

        if (x < 0 && this.leftBumper.active) x = 0;
        if (x > 0 && this.rightBumper.active) x = 0;
        if (y < 0 && this.topBumper.active) y = 0;
        if (y > 0 && this.bottomBumper.active) y = 0;
        this.x += x;
        this.y += y;
    }
});

Crafty.c('Bumper', {
    init: function() {
        this.requires('2D, Canvas, Color, Collision');
    },
    _onHit: function() {
        this.active = true;
        this.color('red');
        this.trigger('Bump', true);
    },
    _offHit: function() {
        this.active = false;
        this.color('white');
        this.trigger('Bump', false);
    }
});

Crafty.c('Thruster', {
    init: function() {
        this.requires('2D, Canvas, Particles');
    }
});

var Bumper = function(bot, side) {
    if (side == 'top' || side == 'bottom') {
        var w = BUMPER_WIDTH;
        var h = BUMPER_HEIGHT;
    } else {
        var w = BUMPER_HEIGHT;
        var h = BUMPER_WIDTH;
    }

    if (side == 'top') {
        var x = bot._x + bot._w / 2 - w / 2;
        var y = bot._y - h - BUMPER_SPACING;
    } else if (side == 'bottom') {
        var x = bot._x + bot._w / 2 - w / 2;
        var y = bot._y + bot._h + BUMPER_SPACING;
    } else if (side == 'left') {
        var x = bot._x - w - BUMPER_SPACING;
        var y = bot._y + bot._h / 2 - h / 2;
    } else if (side == 'right') {
        var x = bot._x + bot._w + BUMPER_SPACING;
        var y = bot._y + bot._h / 2 - h / 2;
    } else {
        return;
    }
    
    bumper = Crafty.e('Bumper').
        color('white').
        attr({x: x,
              y: y,
              w: w,
              h: h,
              z: bot._z}).
        collision().
        onHit("Wall", function() {this._onHit();}, function() {this._offHit();});
    bot.attach(bumper);
    return bumper;
};

var Thruster = function(bot, side) {
    var g = 0.7;
    if (side == 'top') {
        var gravity = {x:0,y:g};
        var angle = 0;
        var x = bot._x + bot._w / 2 - 4;
        var y = bot._y - BUMPER_SPACING - BUMPER_HEIGHT - 6;
    } else if (side == 'bottom') {
        var gravity = {x:0,y:-g};
        var angle = 180;
        var x = bot._x + bot._w / 2 - 4;
        var y = bot._y + bot._h + BUMPER_SPACING + BUMPER_HEIGHT;
    } else if (side == 'left') {
        var gravity = {x:g,y:0};
        var angle = 270;
        var x = bot._x - BUMPER_SPACING - BUMPER_HEIGHT - 6;
        var y = bot._y + bot._h / 2 - 4;
    } else if (side == 'right') {
        var gravity = {x:-g,y:0};
        var angle = 90;
        var x = bot._x + bot._w + BUMPER_SPACING + BUMPER_HEIGHT;
        var y = bot._y + bot._h / 2 - 4;
    } else {
        return;
    }
    var options = {
        maxParticles: 50,
        size: 8,
        sizeRandom: 5,
        speed: 10.0,
        speedRandom: 3.0,
        // Lifespan in frames
        lifeSpan: 5,
        lifeSpanRandom: 3,
        // Angle is calculated clockwise: 12pm is 0deg, 3pm is 90deg etc.
        angle: angle,
        angleRandom: 4,
        startColour: [255, 170, 80, 1],
        startColourRandom: [48, 80, 45, 0],
        endColour: [80, 30, 30, 0],
        endColourRandom: [20, 20, 20, 0],
        // Only applies when fastMode is off, specifies how sharp the gradients are drawn
        sharpness: 20,
        sharpnessRandom: 10,
        // Random spread from origin
        spread: 5,
        // How many frames should this last
        duration: -1,
        // Will draw squares instead of circle gradients
        fastMode: true,
        gravity: gravity,
        // sensible values are 0-3
        jitter: 2
    };
    var thruster = Crafty.e('Thruster').attr({x: x, y: y, w: 0, h: 0, z: 1}).particles(options);
    bot.attach(thruster);
    return thruster;
};

var Bot = function(opt) {
    bot = Crafty.e('Bot').color('blue').attr({x: opt.x,
                                              y: opt.y,
                                              w: BOT_WIDTH,
                                              h: BOT_HEIGHT,
                                              z: 100});
    bot.topBumper = Bumper(bot, 'top');
    bot.bottomBumper = Bumper(bot, 'bottom');
    bot.leftBumper = Bumper(bot, 'left');
    bot.rightBumper = Bumper(bot, 'right');

    return bot;
};

var toggleToolbox = function(v) {
    if (!Crafty.showCircuit) {
        return;
    }
    if (v == null) {
        Crafty.showToolbox = !Crafty.showToolbox;
    } else {
        Crafty.showToolbox = v;
    }
    Crafty('Toolbox').each(function() {
        this.visible = Crafty.showToolbox;
        if (this._children) {
            this._children.map(function(c) {
                c.visible = Crafty.showToolbox;
            });
        }
    });
};

var toggleCircuit = function(v) {
    if (v == null) {
        Crafty.showCircuit = !Crafty.showCircuit;
    } else {
        Crafty.showCircuit = v;
    }
    var hide = function() {
        this.visible = Crafty.showCircuit;
        if (this.css) this.css('visibility', Crafty.showCircuit ? 'visible' : 'hidden');
        if (this._children) {
            this._children.map(function(c) {
                c.visible = Crafty.showCircuit;
            });
        }
    };
    Crafty('Wire, Gate, Sink, Source').each(hide);
    if (!Crafty.showCircuit) {
        toggleToolbox(false);
    } else {
        toggleToolbox(Crafty.showToolbox); // sooo many hacks
    }
};

var save = function() {
    var walls = [];
    Crafty('Wall Save').each (function() {walls.push({x:this._x, y:this._y, h:this._h, w:this._w})});
    var gates = [];
    Crafty('*').each (function(i) {
       if (this.id == undefined || typeof this.id === 'number') {
           this.id = i;
       }
    });
    Crafty('Gate Save').each (function() {
        gates.push({gate: this.gate, opt: this.opt()});
    });
    var wires = [];
    Crafty('Wire Save').each (function() {
        wires.push({from: this.from.id, to: this.to.id});
    });
    return {bot: {x:Crafty.bot._x, y:Crafty.bot._y},
            walls: walls,
            gates: gates,
            wires: wires};
};

var gateFuncs = {not: NotGate, ff: FlipFlop};

var load = function(saveData) {
    Crafty('Save').each (function() {this.destroy();});
    Crafty.bot.attr({x:saveData.bot.x, y:saveData.bot.y});
    saveData.walls.map (function(w){
        Crafty.e('Wall, Draggable, Save').color('green').attr({x:w.x, y:w.y, h:w.h, w:w.w, z: 10});
    });
    saveData.gates.map (function(g){
        gateFuncs[g.gate](g.opt).addComponent('Save');
    });
    var ports = {};
    Crafty('Sink, Source').each (function() {
        if (this.id) {
            ports[this.id] = this;
        }
    });
    saveData.wires.map (function(w){
        Crafty.e('Wire, Save').wire(ports[w.from], ports[w.to]).clock();
    });
};

var keyDown = function(e) {
    if (e.key == Crafty.keys['R']) {
        Crafty.botsRunning = !Crafty.botsRunning;
    } else if (e.key == Crafty.keys['T']) {
        toggleToolbox();
    } else if (e.key == Crafty.keys['C']) {
        toggleCircuit();
    } else if (e.key == Crafty.keys['S']) {
        Crafty.saveData = save();
        if (window['content_return_url']) {
            window.location.replace(window['content_return_url'] + '?return_type=iframe&url=' + encodeURIComponent(window.location + '?save=' + JSON.stringify(Crafty.saveData)) + '&width=840&height=640');
        }
        console.log(Crafty.saveData);
    } else if (e.key == Crafty.keys['L']) {
        load(Crafty.saveData);
    }
};

var keyUp = function(e) {
    
};

Crafty.scene('Game', function() {
    Crafty.botsRunning = true;
    Crafty.showToolbox = true;
    Crafty.showCircuit = true;
    
    Crafty.mousePort = {wireX: 0, wireY: 0, set: function() {}};
    Crafty.addEvent(Crafty.mousePort, 'mousemove', function(e) {this.wireX = e.realX; this.wireY = e.realY;});
    var clock = Crafty.e('Delay').delay(function() {
        if (!Crafty.botsRunning) return;
        this.cycle = this.cycle == 'Wire' ? 'Gate' : 'Wire';
        Crafty(this.cycle).each(function () {this.clock();});
    }, 250, -1);

    var botOptions = {x:300, y:300};
    Crafty.bot = Bot(botOptions);
    var bot = Crafty.bot;
    
    Crafty.e('Sink').attr({x:450, y:20, id:'tT'}).onSet(function(v) {
        if (v) {
            if (!bot.topThruster) bot.topThruster = Thruster(bot, 'top');
        } else {
            if (bot.topThruster) {
                bot.topThruster.destroy();
                bot.topThruster = null;}}});
    Crafty.e('Sink').attr({x:450, y:580, id:'bT'}).onSet(function(v) {
        if (v) {
            if (!bot.bottomThruster) bot.bottomThruster = Thruster(bot, 'bottom');
        } else {
            if (bot.bottomThruster) {
                bot.bottomThruster.destroy();
                bot.bottomThruster = null;}}});
    Crafty.e('Sink').attr({x:20, y:350, id:'lT'}).onSet(function(v) {
        if (v) {
            if (!bot.leftThruster) bot.leftThruster = Thruster(bot, 'left');
        } else {
            if (bot.leftThruster) {
                bot.leftThruster.destroy();
                bot.leftThruster = null;}}});
    Crafty.e('Sink').attr({x:780, y:350, id:'rT'}).onSet(function(v) {
        if (v) {
            if (!bot.rightThruster) bot.rightThruster = Thruster(bot, 'right');
        } else {
            if (bot.rightThruster) {
                bot.rightThruster.destroy();
                bot.rightThruster = null;}}});

    topBumper = Crafty.e('Source').attr({x:350, y:20, id:'tB'});
    bottomBumper = Crafty.e('Source').attr({x:350, y:580, id:'bB'});
    leftBumper = Crafty.e('Source').attr({x:20, y:250, id:'lB'});
    rightBumper = Crafty.e('Source').attr({x:780, y:250, id:'rB'});    

    bot.topBumper.bind('Bump', function(v) { topBumper.set(v); });
    bot.bottomBumper.bind('Bump', function(v) { bottomBumper.set(v); });
    bot.leftBumper.bind('Bump', function(v) { leftBumper.set(v); });
    bot.rightBumper.bind('Bump', function(v) { rightBumper.set(v); });

    Crafty.e('KeyboardEvent').bind('KeyDown', keyDown).bind('KeyUp', keyUp);
    
    Crafty.e('Wall').color('green').attr({x:0, y:0, h:600, w:10, z: 10});
    Crafty.e('Wall').color('green').attr({x:0, y:0, h:10, w:800, z: 10});
    Crafty.e('Wall').color('green').attr({x:790, y:0, h:600, w: 10, z: 10});
    Crafty.e('Wall').color('green').attr({x:0, y:590, h:10, w: 800, z: 10});

    var proto_not = NotGate({x:20, y:100});
    proto_not.addComponent('Toolbox');
    proto_not.bind('StopDrag', function(e) {
        var opt = {x:this._x, y:this._y};
        this.attr({x: 20, y: 100});
        NotGate(opt).addComponent('Save');
    });
    var proto_ff = FlipFlop({x:20, y:150});
    proto_ff.addComponent('Toolbox');
    proto_ff.bind('StopDrag', function(e) {
        var opt = {x:this._x, y:this._y};
        this.attr({x: 20, y: 150});
        FlipFlop(opt).addComponent('Save');        
    });
    var proto_v_wall = Crafty.e('2D, Color, Canvas, Draggable, Toolbox').color('green').attr({x:20, y:200, h:100, w:20, z: 10});
    proto_v_wall.bind('StopDrag', function(e) {
        var opt = {x:this._x, y:this._y};
        this.attr({x: 20, y: 200});
        Crafty.e('Wall, Draggable, Save').color('green').attr({x:opt.x, y:opt.y, h:100, w:20, z: 10});
    });
    var proto_h_wall = Crafty.e('2D, Color, Canvas, Draggable, Toolbox').color('green').attr({x:20, y:350, h:20, w:100, z: 10});
    proto_h_wall.bind('StopDrag', function(e) {
        var opt = {x:this._x, y:this._y};
        this.attr({x: 20, y: 350});
        Crafty.e('Wall, Draggable, Save').color('green').attr({x:opt.x, y:opt.y, h:20, w:100, z: 10});
    });
    
    toggleToolbox(false);

    /* load */
    if(match=(new RegExp('[?&]save=([^&]*)')).exec(window.location.search))
      var save = decodeURIComponent(match[1]);
    if (save) load(JSON.parse(save));

}, function() {
    // destroy wires?
});
Game = {
  start: function() {
      Crafty.init(800, 600);
      Crafty.background('rgb(0,0,100)');
      Crafty.sprite(20, 30, 'gates.png', {hotNot:[0,0], not:[0,1], ffA:[1,0], ffB:[1,1]});
      Crafty.sprite(15, 12, 'ports.png', {hotSink:[0,0], coldSink:[0,1], hotSource:[1,0], coldSource:[1,1]});
      Crafty.scene('Game');
  }
}
window.addEventListener('load', Game.start);
