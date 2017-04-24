"use strict";

var canvas, ctx, cheats, controlOn, drawId, tickId;
var lastTime = 0;
var lives = 2;
var colors = ["#aaacaa", "#ff0000", "#ffff00", "#0080ff", "#ff00ff", "#00ff00"];
var keylog = [];
var spritesheet = new Image();
var bricks = [];

var mouse = {
    x: 0,
    y: 0,
	moved: false
};

var paddle = {
    x: 0,
    y: 0,
    width: 64,
    height: 16,
    img: new Image()
};

var ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 10,
    height: 8,
    img: new Image()
};

var sfx = {
	paddle: new Audio("audio/paddle.wav"),
	brick: new Audio("audio/brick.wav"),
	hardBrick: new Audio("audio/hard-brick.wav")
};

spritesheet.src = "images/spritesheet.png";
paddle.img.src = "images/paddle.png";
ball.img.src = "images/ball.png";
// add spritesheet for bricks?

window.addEventListener("load", init);

document.addEventListener("keypress",function(e) {
	keylog.push(String.fromCharCode(e.keyCode));

	if(keylog.length > 8) {
		keylog.shift();
	}

    if(keylog.join("") == "arkanoid") {
		cheats = !cheats;
	}
});

document.addEventListener("mousemove", function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
	mouse.moved = true;
});

document.addEventListener("touchmove", function(e) {
	e.preventDefault();
	var touch = e.targetTouches[0];
	mouse.x = touch.clientX;
	mouse.y = touch.clientY;
	mouse.moved = true;
});

function init() {
    canvas = canvas || document.querySelector("canvas");
    ctx = ctx || canvas.getContext("2d");
	cheats = false;
    controlOn = true;
	bricks = [];
	lastTime = 0;
	lives = 2;
	mouse.moved = false;

    paddle.x = canvas.width / 2 - paddle.width / 2;
    paddle.y = canvas.height - 2 * paddle.img.height;
    ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
    ball.y = paddle.y - ball.height;
    ball.vx = 400 * Math.SQRT2 / 2;
    ball.vy = -400 * Math.SQRT2 / 2;

    for(var i = 0; i < 13; i++) {
        for(var j = 0; j < colors.length; j++) {
			var w = 32;
			var h = 16;
            var x = i * w;
            var y = j * h + 4 * h;
            var hits = j == 0 ? 2 : 1;
            bricks.push(new Brick(x, y, w, h, hits, colors[j]));
        }
    }

    drawId = requestAnimationFrame(draw);
    tickId = setTimeout(tick, 1000 / 60);   // was 30, not matching 60?
}

function draw(timestamp) {
    drawId = requestAnimationFrame(draw);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

	for(var i = 0; i < lives; i++) {
		ctx.drawImage(spritesheet, 88, 50, 32, 16, 32 * i, canvas.height - 16, 32, 16);
	}

    ctx.drawImage(ball.img, 2 * Math.floor(ball.x / 2), 2 * Math.floor(ball.y / 2), ball.img.width, ball.img.height);

    for(var i = 0; i < bricks.length; i++) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(bricks[i].x, bricks[i].y, bricks[i].width, bricks[i].height);

        ctx.fillStyle = bricks[i].color;
        ctx.fillRect(bricks[i].x, bricks[i].y, bricks[i].width - 2, bricks[i].height - 2);
    }

    ctx.drawImage(paddle.img, 2 * Math.floor(paddle.x / 2), 2 * Math.floor(paddle.y / 2), paddle.img.width, paddle.img.height);
}

function tick() {
    tickId = setTimeout(tick, 1000 / 60);

    var dt;
    if(lastTime == 0) {
        lastTime = Date.now();
        dt = 1 / 60;
    } else {
        dt = (Date.now() - lastTime) / 1000;
        lastTime = Date.now();
    }

    var offset = getOffset(canvas);
    if(controlOn) {
		if(mouse.moved) {
			paddle.x = Math.max(0, Math.min(mouse.x - paddle.width / 2 - offset.left, canvas.width - paddle.width));
		}
		if(cheats) {
			if(Math.abs(ball.y - ball.height - paddle.y) < 32) {
				paddle.x = Math.max(0, Math.min(ball.x - paddle.width * Math.random(), canvas.width - paddle.width));
			} else {
				paddle.x = Math.max(0, Math.min(ball.x - paddle.width / 2, canvas.width - paddle.width));
			}
		}
	}
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    var intersects = intersectCheck({
        top: ball.y,
        right: ball.x + ball.width,
        bottom: ball.y + ball.height,
        left: ball.x
    }, {
        top: paddle.y,
        right: paddle.x + paddle.width,
        bottom: paddle.y + paddle.height,
        left: paddle.x
    });

    if(intersects.top) {
        var speed = Math.sqrt(Math.pow(ball.vx, 2) + Math.pow(ball.vy, 2));
        var theta = Math.atan2((ball.y + ball.height / 2) - (paddle.y + paddle.height), (ball.x + ball.width / 2) - (paddle.x + paddle.width / 2));
        ball.y = paddle.y - ball.height;
        ball.vx = speed * Math.cos(theta);
        ball.vy = speed * Math.sin(theta);
		play(sfx.paddle);
    } else {
        if(intersects.left) {
            ball.x = paddle.x - ball.width;
            ball.vx *= -1;
        }
        if(intersects.right) {
            ball.x = paddle.x + paddle.width;
            ball.vx *= -1;
        }
    }
    if(ball.x < 0) {
        ball.x = 0;
        ball.vx *= -1;
    }
    if(ball.x + ball.width > canvas.width) {
        ball.x = canvas.width - ball.width;
        ball.vx *= -1;
    }
    if(ball.y < 0) {
        ball.y = 0;
        ball.vy *= -1;
    }

    for(var i = 0; i < bricks.length; i++) {
        var intersects = intersectCheck({
            top: ball.y,
            right: ball.x + ball.width,
            bottom: ball.y + ball.height,
            left: ball.x
        }, {
            top: bricks[i].y,
            right: bricks[i].x + bricks[i].width - 2,
            bottom: bricks[i].y + bricks[i].height - 2,
            left: bricks[i].x
        });

        if(intersects.top) {
            ball.y = bricks[i].y - ball.height;
            ball.vy *= -1;
        }
        if(intersects.right) {
            ball.x = bricks[i].x + bricks[i].width - 2;
            ball.vx *= -1;
        }
        if(intersects.bottom) {
            ball.y = bricks[i].y + bricks[i].height - 2;
            ball.vy *= -1;
        }
        if(intersects.left) {
            ball.x = bricks[i].x - ball.width;
            ball.vx *= -1;
        }

        if(intersects.some) {
            bricks[i].hits--;

            if(bricks[i].hits == 0) {
				play(sfx.brick);
                bricks.splice(i, 1);
                i--;
            } else {
				play(sfx.hardBrick);
			}

			break;
        }
    }

    if(bricks.length == 0) {
        controlOn = false;
    }

    if(ball.y > canvas.height + Math.abs(ball.vy) * dt) {
		ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
		ball.y = paddle.y - ball.height;
		ball.vx = 400 * Math.SQRT2 / 2;
		ball.vy = -400 * Math.SQRT2 / 2;
        lives--;
    }

	if(lives < 0) {
		gameover();
	}
}

function getOffset(element) {
    var elemRect = element.getBoundingClientRect();
    var bodyRect = document.body.getBoundingClientRect();
    var offset = {
        top: elemRect.top - bodyRect.top,
        left: elemRect.left - bodyRect.left
    };

    return offset;
}

function intersectCheck(self, other) {
    // based on this first at http://stackoverflow.com/a/2752387/2727710
	// try this one at http://gamedev.stackexchange.com/a/29796
    var top = self.bottom > other.top && self.top < other.top && self.right > other.left && self.left < other.right;
    var right = self.left < other.right && self.right > other.right && self.bottom > other.top && self.top < other.bottom;
    var bottom = self.top < other.bottom && self.bottom > other.bottom && self.right > other.left && self.left < other.right;
    var left = self.right > other.left && self.left < other.left && self.bottom > other.top && self.top < other.bottom;
    var some = top || right || bottom || left;
    var every = top && right && bottom && left;

    return {
        top: top,
        right: right,
        bottom: bottom,
        left: left,
        some: some,
        every: every
    };
}

function gameover() {
    cancelAnimationFrame(drawId);
    clearInterval(tickId);
	canvas.addEventListener("click", init);
}

function play(audio) {
	if(audio.paused) {
        audio.play();
    } else {
        audio.currentTime = 0;
    }
}

function Brick(x, y, w, h, hits, c) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.hits = hits;
    this.color = c;
}
