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
        this.__defineGetter__('wireX', function() {return this._x + (this.isSource ? 10 : 14);})
        this.__defineGetter__('wireY', function() {return this._y + (this.isSource ? 8 : 12);})
        this.bind('MouseDown', this._onDown);
        this.bind('MouseUp', this._onUp);
        Crafty.addEvent(this, Crafty.stage.elem, "mouseup", this._onUpOutside);
    },
    _onDown: function(e) {
        if (e.mouseButton !== Crafty.mouseButtons.LEFT) return;
        if (this.wire) this.wire.destroy();
        Crafty.mousePort.isSource = !this.isSource;
        this.wire = Crafty.e('Wire').wire(this, Crafty.mousePort);
        this.dragging = true;
    },
    _onUp: function(e) {
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
        if (!this.dragging) return;
        this.dragging = false;
        if (Crafty.mousePort.wire) Crafty.mousePort.wire.destroy();
    }
});

Crafty.c('Sink', {
    init: function() {
        this.requires('2D, Color, Canvas, Wireable');
        this.isSource = false;
    },
    set: function(val) {
        this._active = val;
        this.color(val ? 'red' : 'white');
        return this;
    }
});

Crafty.c('Source', {
    init: function() {
        this.requires('2D, Color, Canvas, Wireable');
        this.isSource = true;
    },
    set: function(val) {
        this._active = val;
        this.color(val ? 'red' : 'white');
        return this;
    }
});

Crafty.c('Gate', {
    init: function() {
        this.requires('2D, Color, Canvas, Draggable');
    },
    onClock: function(f) {
        this._onClock = f;
        return this;
    },
    clock: function() {
        this._onClock();
    }
});

var NotGate = function(x, y) {
    var input = Crafty.e('Sink').attr({x: x - 20, y: y + 12, w: 20, h: 16}).set(false);
    var output = Crafty.e('Source').attr({x: x + 60, y: y + 12, w: 20, h: 16}).set(true);
    
    var gate = Crafty.e('Gate').color('red').attr({x: x, y: y, w: 60, h: 40}).onClock(
        function () {
            this.color(input._active ? 'white' : 'red');
            output.set(!input._active);
            if (!input.wire) input.set(false);
        }
    );
    gate.attach(input, output);
    gate.input = input;
    gate.output = output;
    return gate;
};

Crafty.scene('Game', function() {
    Crafty.mousePort = {wireX: 0, wireY: 0, set: function() {}};
    Crafty.addEvent(Crafty.mousePort, 'mousemove', function(e) {this.wireX = e.realX; this.wireY = e.realY;});
    var clock = Crafty.e('Delay').delay(function() {
        this.cycle = this.cycle == 'Wire' ? 'Gate' : 'Wire';
        Crafty(this.cycle).each(function () {this.clock();});
    }, 250, -1);

    var ng = NotGate(100, 100);
    var ng2 = NotGate(400, 200);
    var ng3 = NotGate(100, 300);
    var wire = Crafty.e('Wire');
    var wire2 = Crafty.e('Wire');
    wire.wire(ng.output, ng2.input);
    wire2.wire(ng2.output, ng3.input);
    
    ng.bind('StopDrag', function(e) {
        var x = this._x;
        var y = this._y;
        this.attr({x: 100, y: 100});
        NotGate(x, y);
    });
}, function() {
    // destroy wires?
});
Game = {
  start: function() {
      Crafty.init(800, 600);
      Crafty.background('rgb(0,0,100)');
      Crafty.scene('Game');
  }
}
window.addEventListener('load', Game.start);
