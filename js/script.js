var BrickModel = Backbone.Model.extend({});
var BallModel = Backbone.Model.extend({});
var ShipModel = Backbone.Model.extend({});

var BrickCollection = Backbone.Collection.extend({
    model: BrickModel
});

var BrickView = Backbone.View.extend({
    initialize: function () {
        this.model.view = this;
    },
    render: function () {
        app.context.beginPath();
        app.context.rect(this.model.get('x'), this.model.get('y'), app.brickWidth, app.brickHeight);
        app.context.closePath();
        app.context.fillStyle = "#A32B26";
        app.context.fill();
        app.context.lineWidth = 2;
        app.context.strokeStyle = "#D97925";
        app.context.stroke();
    },
    clear: function (x, y) {
        document.getElementById('audioPop').play();
        app.context.clearRect(x, y, app.canvas.width, app.canvas.height);
    }
});

var BricksView = Backbone.View.extend({
    initialize: function () {
        this.render();
    },
    render: function () {
        _(this.collection.models).each(function (brick) {
            this.appendBrick(brick);
        }, this);
    },
    appendBrick: function (brick) {
        var brickView = new BrickView({
            model: brick
        });
        brickView.render();
    }
});

var BallView = Backbone.View.extend({
    el: $("#canvasGame"),
    initialize: function () {
        this.render();
    },
    render: function () {
        this.draw(this.model.get('x'), this.model.get('y'), this.model.get('radius'));
    },
    draw: function (x, y, radius) {
        var radialGradient = app.context.createRadialGradient(x, y, radius / 10, x, y, radius);
        radialGradient.addColorStop(0, '#fff');
        radialGradient.addColorStop(1, '#a7a7a7');
        app.context.fillStyle = radialGradient;
        app.context.beginPath();
        app.context.arc(x, y, radius, 0, Math.PI * 2, false);
        app.context.lineWidth = 1;
        app.context.strokeStyle = "#000";
        app.context.stroke();
        app.context.closePath();
        app.context.fill();
    },
    move: function () {
        var _x = this.model.get('x');
        var _y = this.model.get('y');
        var _dx = this.model.get('dx');
        var _dy = this.model.get('dy');
        app.context.clearRect(0, 0, app.canvas.width, app.canvas.height);
        this.model.set({
            x: _x += _dx,
            y: _y += _dy,
        });
        this.checkState();
        this.render();
    },
    checkState: function () {
        if (app.bricksView.collection.models.length === 0) {
            this.win();
        } else {
            var ballRadius = this.model.get('radius');
            var ballLeft = this.model.get('x') - ballRadius;
            var ballRight = this.model.get('x') + ballRadius;
            var ballTop = this.model.get('y');
            if (!this.checkShipHit(ballRadius, ballLeft, ballRight, ballTop)) {
                this.loose();
            } else {
                this.checkWallsHit(ballRadius);
                this.checkBricksHit(ballRadius, ballLeft, ballRight, ballTop);
            }
        }
    },
    checkWallsHit: function (ballRadius) {
        if (this.model.get('x') >= ($(this.el).width() - ballRadius) ||
            this.model.get('x') <= ballRadius) {
            this.bounceX();
        }

        if ((this.model.get('y') + ballRadius) <= ballRadius) {
            this.bounceY();
        }
    },
    checkShipHit: function (ballRadius, ballLeft, ballRight, ballTop) {
        var shipWidth = app.shipView.model.get('width');
        var shipHeight = app.shipView.model.get('height');
        var shipTop = app.shipView.model.get('y') - ballRadius;
        var shipBottom = shipTop + shipHeight + ballRadius;
        var shipLeft = app.shipView.model.get('x') - ballRadius;
        var shipRight = shipLeft + shipWidth + (ballRadius * 2);
        var shipCenter = shipLeft + (shipWidth / 2);
        if (!(shipLeft > ballLeft) && !(shipRight < ballRight) &&
            (ballTop >= shipTop)) {
            document.getElementById('audioHit').play();
            this.bounceY();
            if ((ballLeft < shipCenter) && (this.model.get('dx') >= 0.8)) {
                this.bounceX();
            } else if ((ballLeft > shipCenter) && (this.model.get('dx') <= -0.8)) {
                this.bounceX();
            }
        } else if (ballTop >= shipBottom) {
            return false;
        }
        return true;
    },
    checkBricksHit: function (ballRadius, ballLeft, ballRight, ballTop) {
        var self = this;
        var hitBricks = _.filter(app.bricksView.collection.models, function (brick) {
            var brickTop = brick.get('y') - ballRadius;
            var brickBottom = brick.get('y') + app.brickHeight + ballRadius;
            var brickLeft = brick.get('x') - ballRadius;
            var brickRight = brickLeft + app.brickWidth + (ballRadius * 2);
            return (
            (brickTop < ballTop) &&
                (brickBottom > ballTop) &&
                (brickLeft < ballLeft) &&
                (brickRight > ballRight))
        });
        _.each(hitBricks, function (brick) {
            brick.view.clear(brick.get('x'), brick.get('y'));
            brick.view.remove();
            brick.destroy();
        });
        if (hitBricks.length > 0) {
            this.bounceY();
        }
    },
    bounceX: function () {
        var _dx = this.model.get('dx');
        this.model.set({
            dx: _dx *= -1
        });
    },
    bounceY: function () {
        var _dy = this.model.get('dy');
        this.model.set({
            dy: _dy *= -1
        });
    },
    win: function () {
        clearInterval(app.interval);
        var animation = "colors 5s";
        $('#status').css('color', 'green').html("ניצחת! כל הכבוד<br /><p>רענן את הדף כדי להתחיל משחק חדש</p>").fadeIn('fast').css('animation', animation).css('-moz-animation', animation).css('-webkit-animation', animation);
        document.getElementById('audioWin').play();
        app.ballView.model.destroy();
        app.shipView.model.destroy();
        app.bricksView.collection.remove();
        $(document).off('keydown');
    },
    loose: function () {
        $('#status').css('color', 'red').html("נפסלת").fadeIn('fast').delay('500').fadeOut('slow');
        document.getElementById('audioLoose').play();
        app.ballView.model.destroy();
        app.loadBall();
        app.shipView.model.clear();
        app.loadShip();
        app.bricksView.collection.remove();
        app.loadBricks();
        $(document).off('keydown');
        $(document).on('keydown', app.shipView.keydown);
    }
});

var ShipView = Backbone.View.extend({
    el: $("#canvasGame"),
    initialize: function () {
        this.render();
        $(document).on('keydown', this.keydown);
    },
    render: function () {
        this.draw(this.model.get('x'), this.model.get('y'));
    },
    draw: function (x, y) {
        var width = this.model.get('width');
        var height = this.model.get('height');
        app.context.beginPath();
        app.context.fillStyle = "#EFE7BE";
        app.context.rect(x, y, width, height);
        app.context.lineWidth = 10;
        app.context.lineJoin = "round";
        app.context.strokeStyle = "#0C273D";
        app.context.stroke();
        app.context.lineWidth = 4;
        app.context.lineJoin = "round";
        app.context.strokeStyle = "#FFFEF1";
        app.context.stroke();
        app.context.fill();
        app.context.closePath();
        app.context.font = "18px Arial";
        app.context.fillStyle = "#002635";
        app.context.textBaseline = "top";
        app.context.textAlign = 'center';
        app.context.fillText("קוד נקי", x + (width / 2), y + (height / 8));
    },
    keydown: function (e) {
        var _x = app.shipView.model.get('x');
        if (e.keyCode === 37) {
            if (_x <= 0) {
                app.shipView.model.set({
                    x: 0
                });
            } else {
                app.shipView.model.set({
                    x: _x -= 15
                });
            }
        }
        if (e.keyCode === 39) {
            var _width = app.canvas.width - app.shipView.model.get('width');
            if (_x >= _width) {
                app.shipView.model.set({
                    x: _width
                });
            } else {
                app.shipView.model.set({
                    x: _x += 15
                });
            }
        }
        app.shipView.render();
    }
});

var App = Backbone.Router.extend({
    routes: {
        "*action": "load"
    },
    load: function () {
        this.canvas = document.getElementById('canvasGame');
        this.context = this.canvas.getContext('2d');
        this.fps = 5;
        this.loadBall();
        this.loadShip();
        this.loadBricks();
        this.interval = setInterval(function () {
            app.ballView.move();
            app.shipView.render();
            app.bricksView.render();
        }, app.fps);
    },
    loadBall: function () {
        var ballModel = new BallModel();
        ballModel.set({
            x: 370,
            y: 400,
            radius: 5,
            dx: 0.8,
            dy: 3
        });
        this.ballView = new BallView({
            model: ballModel
        });
    },
    loadShip: function () {
        var shipModel = new ShipModel();
        var shipWidth = 150;
        var shipHeight = 30;
        shipModel.set({
            x: app.canvas.width / 2 - shipWidth / 2,
            y: app.canvas.height - shipHeight,
            width: shipWidth,
            height: shipHeight
        });
        this.shipView = new ShipView({
            model: shipModel
        });
    },
    loadBricks: function () {
        var bricks = new BrickCollection();
        this.brickWidth = 35;
        this.brickHeight = 10;
        for (var i = 10; i <= this.canvas.height / 2.5; i += this.brickHeight + 10) {
            for (var j = 10; j <= this.canvas.width - 50; j += this.brickWidth + 10) {
                var brickModel = new BrickModel();
                brickModel.set({
                    x: j,
                    y: i,
                });
                bricks.add(brickModel);
            }
        }
        this.bricksView = new BricksView({
            collection: bricks
        });
    }
});
var app = new App();

Backbone.history.start({
    pushState: true
});