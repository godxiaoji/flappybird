var mobile = typeof document.documentElement.ontouchstart !== "undefined" ? true : false;
var $bird, $groups;

// 定时器
var timerId = null,
    timers = [];

var Timer = {
    // 定时执行
    tick: function() {
        var i = 0,
            t = +new Date();

        for(; i < timers.length; i++) {
            timers[i].step(t);
        }
        if(timers.length === 0) {
            Timer.stop();
        }
    },
    // 启动定时器
    start: function() {
        if(!timerId) {
            timerId = setInterval(Timer.tick, 13);
        }
    },
    // 关闭定时器
    stop: function() {
        clearInterval(timerId);
        timerId = null;
    }
};

var Bird = {
    // 模型大小
    size: 34,
    flyX: 66,
    initTop: 240,
    top: 240,
    deg: 0,
    pa: null,
    tolerance: 7,
    rotate: function(deg) {
    	Bird.deg = deg;
        Rotate.set(deg);
    },
    up: {
        x: 40,
        y: -40,
        curvature: 0.007,
        duration: 360,
        process: function() {
            Bird.collide();
            Rotate.set();
        },
        callback: function() {
            Bird.drop();
        }
    },
    down: {
        x: 80,
        y: 80,
        curvature: 0.003,
        duration: 250,
        process: function() {
            var rotate = Bird.deg;
            if(rotate <= 90) {
                if(rotate < 10) {
                    rotate += 1 * Main.multiple;
                } else {
                    rotate += 4 * Main.multiple;
                }
                Bird.rotate(rotate);
            }
            Bird.collide();
        },
        callback: function() {
            // 下坠
            Bird.die(true); 
        }
    },
    drop: function() {
        var top = Bird.top;
        Bird.down.y = Main.height - top - Bird.size;
        Bird.down.x = Bird.down.y / 1.5;
        Bird.down.duration = Bird.down.x * 5 / Main.multiple;
        Bird.rotate(-10);
        Bird.pa.stop().start(Bird.down);
        // sound
        // Player.play('swooshing');
    },
    die: function(dialog) {
        this.collided = false;
        Obstacle.stop();
        this.bind(true);
        if(dialog === true) {
            // sound
            Player.play('die');
            Main.end();
        }
    },
    collided: false,
    // 检测碰撞
    collide: function() {
        var y = Bird.top;
        if(this.collided === false && (y < Obstacle.range.min - Bird.tolerance || y >= Obstacle.range.max - Bird.size + Bird.tolerance)) {
            this.die();
            this.collided = true;
            // sound
            Player.play('hit');
        }
    },
    event: function() {
        Bird.rotate(-20);
        Bird.pa.stop().start(Bird.up);
        // sound
        Player.play('wing');
    },
    bind: function(off) {
        var $body = $("body"),
            type = mobile ? "tap" : "click";

        if(off === true) {
            $body.off(type, Bird.event);
            $body.off("keydown");    
        } else {
            $body.on(type, Bird.event);
            // 支持空格 
            $body.on("keydown", function(e) {
                if(e && e.keyCode === 32) {
                    $body.click();
                    e.preventDefault();
                }
            });
        }
    },
    init: function() {
        Bird.pa = tParabola($bird[0], 0, 0, {autostart: false});
        this.bind();
        Bird.rotate(0);
    }
};

// 兼容性能
var Rotate = {
    count: 0,
    getY: function() {
        var d = -Bird.size,
            xArr = [0, 0, 0, d, d, d, d*2, d*2, d*2];
        return xArr[(++Rotate.count % 9)];
    },
    deg: 0,
    getX: function(deg) {
        var yArr = [
                [-20, -34],
                [0, 0],
                [20, -68],
                [40, -102],
                [60, -136],
                [360, -170]
            ],
            i = 0;

        if(deg != null) {
            this.deg = deg;
        } else {
            deg = this.deg;
        }

        for(; i < yArr.length; i++) {
            if(deg <= yArr[i][0]) {
                return yArr[i][1];
            }
        }
        return -136;
    },
    set: mobile ? function(deg) {
        var x = this.getX(deg),
            y = this.getY();
        $bird.css("backgroundPosition", x + "px " + y + "px");
    } :
    function(deg) {
        $bird.css("backgroundPosition", "0 " + this.getY() + "px");
        $bird[0].style.webkitTransform = $bird[0].style.transform = "rotate("+deg+"deg)";
    }
};

// 障碍物
var Obstacle = {
    timer: null,
    spacing: 96,
    shortHeight: 52,
    oWidth: 52,
    width: 152,
    left: 600,
    initLeft: 600,
    range: {},
    // 碰撞容错
    tolerance: 5,
    // 障碍物最短
    randRange: {},
    rand: function() {
        return parseInt(Math.random() * (this.randRange.max - this.randRange.min)) + this.randRange.min;
    },
    add: function() {
        var drag = document.createDocumentFragment(),
            item, rand,
            i = 0, len = 20;

        for(; i < len; i++) {
            item = document.createElement("div");
            rand = this.rand();
            $(item).addClass("piping").attr("data-top", rand).attr("data-bottom", rand + this.spacing).html('<div class="piping_top" style="height: ' + rand + 'px"></div><div class="piping_spacing"></div><div class="piping_buttom"></div>');
            drag.appendChild(item);
        }
        
        $groups.html("")[0].appendChild(drag);
    },
    currItem: null,
    currPixel: 0,
    setCurrRange: function() {
        var moveX = Bird.flyX + Bird.size - parseInt(Obstacle.left),
            min = 0, max = Main.height,
            i = 0, j, $item;
        
        Obstacle.currPixel++;
        if(moveX >= 0) {
            i = moveX / Obstacle.width;
            j = moveX % Obstacle.width;

            // 碰撞范围
            // 进入碰撞
            if(j > this.tolerance && j < Bird.size + Obstacle.oWidth - this.tolerance) {
                $item = $groups.children().eq(i);
                min = $item.attr("data-top");
                max = $item.attr("data-bottom");
                // 通过计数
                if($item[0] !== this.currItem) {
                    Obstacle.currPixel = 0;
                    this.currItem = $item[0];
                }
            }
            if(Obstacle.currPixel === Bird.size) {
                Main.score++;
                Main.setScore();
                // sound
                Player.play('point');
            }
        }
        this.range = {
            min: parseInt(min),
            max: parseInt(max)
        };
    },
    glass: function() {
        $("#J_Glass").css("backgroundPosition", (0 - this.currPixel * 2 * Main.multiple) +"px 0");
    },
    init: function() {
        this.randRange.min = this.shortHeight;
        this.randRange.max = Main.height - this.spacing - this.shortHeight * 2;
        this.currPixel = 0;

        this.add();

        this.start();
    },
    // 运动
    start: function() {
        this.stop();
        timers.push(this);
        Timer.start();
    },
    step: function() {
        var left = Obstacle.left,
            rand, range;

        left -= 2 * Main.multiple;
        if(left <= -Obstacle.width) {
            left += Obstacle.width;
            rand = Obstacle.rand();

            var $first = $groups.children().eq(0);
            $first.attr("data-top", rand).attr("data-bottom", rand + Obstacle.spacing)
            .children().eq(0).css("height", rand + "px");

            $groups.append($first[0]);
        }
        $groups.css("left", left + "px");
        Obstacle.left = left;
        Obstacle.setCurrRange();
        Obstacle.glass();
        return this;
    },
    stop: function() {
        var i = timers.length - 1;

        for(; i >= 0; i--) {
            if(timers[i] === this) {
                timers.splice(i, 1);
                break;
            }
        }
        return this;
    }
};

var Main = {
    height: 400,
    score: 0,
    best: 0,
    setScore: function() {
        $("#J_Score").html(this.getNumHtml(this.score));
    },
    start: function() {
        Main.playing = true;
        Main.score = 0;
        $("#J_DialogTap").hide();
        $("body").off(mobile ? "tap" : "click").off("keydown");
        $("#J_Score").html("<em></em>");
        Bird.init();
        Obstacle.init();
        Bird.event();
    },
    tap: function(e) {
        Bird.rotate(0);
        $bird.css("top", Bird.initTop + "px");
        $groups.css("left", Obstacle.initLeft + "px");
        Bird.top = Bird.initTop;
        Obstacle.left = Obstacle.initLeft;

        $("#J_DialogBegin").hide();
        $("#J_DialogEnd").hide();
        $("#J_DialogTap").show();
        $("body").on(mobile ? "tap" : "click", Main.start).off("keydown").on("keydown", function(e) {
            if(e && e.keyCode === 32) {
                $(this).click();
                e.preventDefault();
            }
        });
        e && e.stopPropagation();

        var rand = parseInt(Math.random() * 100) % 3 + 1;
        $bird[0].className = "bird bird" + rand;
    },
    playing: false,
    end: function() {
        if(Main.playing == false) {
            return;
        }
        Main.playing = false;
        
        $("#J_Score").html("");
        $("#J_ScoreCurr").html(Main.getNumHtml(Main.score));
        if(Main.score > Main.best) {
            Main.best = Main.score;
            cookie("best", Main.best, {expires: 30 * 24 * 3600});
            $("#J_ScoreBest").html(Main.getNumHtml(Main.best));
        }
        $("#J_DialogEnd").show();
        
        $("body").on("keydown", function(e) {
            if(e && e.keyCode === 13) {
                Main.tap();
            }
        });
    },
    getNumHtml: function(nums) {
        var html = "", i = 0,
            arr = (nums + "").split("");

        for(; i < arr.length; i++) {
            html += '<em class="n'+arr[i]+'"></em>';
        }
        return html;
    },
    multiple: 1,
    setMultiple: function() {
        var mult = (window.location.hash || "").substr(1),
            MultArr = ["1", "1.5", "2"];
        if($.inArray(mult, MultArr) !== -1) {
            this.multiple = parseInt(mult);
        }
        Bird.up.duration /= this.multiple;
    },
    init: function() {
        $bird = $("#J_Bird");
        $groups = $("#J_Groups");
        
        this.setMultiple();
        
        $("#J_DialogGroups").find(".J_startbtn").on("click", this.tap);
        $("body").on("keydown", function(e) {
            if(e && e.keyCode === 13) {
                Main.tap();
            }
        });

        var best = cookie("best");
        if(best) {
            Main.best = parseInt(best);
            $("#J_ScoreBest").html(Main.getNumHtml(best));
        }
    }
};

// 抛物线
(function() {
    // 获取当前时间
    function now() {
        return +new Date();
    }
    
    // 空函数
    function returnFalse() {
        return false;
    }

    // 获取当前样式
    var getCurrentCss = window.getComputedStyle ?
    function(elem, name) {
        var computed = window.getComputedStyle(elem, null),
            ret = computed ? computed.getPropertyValue(name) || computed[name] : undefined;
        return ret;
    } :
    (document.documentElement.currentStyle ? 
    function(elem, name) {
        var ret,
            computed = elem.currentStyle,
            style = elem.style;

        ret = computed ? computed[name] : undefined;

        if(ret == null && style && style[name]) {
            ret = style[name];
        }
        return ret == null ? 0 : ret;
    } :
    returnFalse);
    
    // 转化为整数
    function toInteger(text) {
        text = parseInt(text);
        return isFinite(text) ? text : 0;
    }

    // 求解a b c
    function solveAbc(x, y, a) {
        // a是常量，曲率
        // a无限接近于0，就是平行抛物线
        // a = 0.001,
        // y = a*x*x + b*x + c
        // 假设经过坐标点(0, 0)
        var c = 0,
        // 代入终点坐标(x, y)
        // b = (y - a*x*x) / x
        b = (y - a*x*x - c) / x;

        return {
            a: a,
            b: b,
            c: c
        };
    }

    // 获取X轴位移
    function getPosX(driftX, p) {
        return driftX * p;
    }

    // 获取Y轴位移
    function getPosY(x, abc) {
        // 抛物线方程
        return abc.a*x*x + abc.b*x + abc.c;
    }

    function Parabola(elem, x, y, options) {
        // 处理扩展函数
        // 不传入x,y类型处理
        if(typeof x === "object" && x.type && x.type.nodeType === 1) {
            options = x;
            x = 0;
            y = 0;
        } else if(typeof options !== "object") {
            options = {};
        }

        // 处理起始位置top,left
        if(!elem || elem.nodeType !== 1) {
            return;
        }
        this.elem = elem;

        // 默认值
        options.x = x;
        options.y = y;
        this.type = 'drift';
        this.curvature = 0.001;
        this.process = returnFalse;
        this.callback = returnFalse;
        this.duration = 500;
        
        this.options(options);

        // 默认自动抛
        this.autostart = options.autostart === false ? false : true;

        return this;
    }

    Parabola.prototype = {
        start: function(options) {
            // 重置属性
            this.options(options);
            // 设置起止时间
            this.begin = now();
            this.end = this.begin + this.duration;
            if(this.driftX === 0 && this.driftY === 0) {
                // 原地踏步就别浪费性能了
                return;
            }
            timers.push(this);
            Timer.start();
            return this;
        },
        step: function(now) {
            var x, y;
            if(now > this.end) {
                // 运行结束
                x = this.driftX;
                y = this.driftY;
                this.update(x, y);
                this.stop();
                this.process.call(this);
                this.callback.call(this);
            } else {
                x = getPosX(this.driftX, (now - this.begin) / this.duration);
                y = getPosY(x, this.abc);
                this.update(x, y);
                this.process.call(this);
            }
            return this;
        },
        update: function(x, y) {
            // 临界值判断
            if(this.top + y < -1) {
                y = 0 - this.top + 5;
            } else if(this.top + y > 400) {
                y = 400 - this.top - 5;
            }
            this.elem.style.position = "absolute";
            // this.elem.style.left = (this.left + x) + "px";
            this.elem.style.top = parseInt(this.top + y) + "px";
            
            // 设置top
            Bird.top = parseInt(this.top + y);
            return this;
        },
        reset: function() {
            this.update(0, 0);
        },
        options: function(options) {

            this.left = toInteger(getCurrentCss(this.elem, "left"));
            this.top = toInteger(getCurrentCss(this.elem, "top"));

            if(typeof options !== "object") {
                options = {};
            }
            
            var x = options.x == null && typeof this.driftX === "number" ? this.driftX : options.x,
                y = options.y == null && typeof this.driftY === "number" ? this.driftY : options.y;

            if(options.type != null) {
                this.type = options.type;
            }

            // 处理位移
            if(this.type === "position") {
                // x,y指的是终点位置
                x = toInteger(x) - this.left;
                y = toInteger(y) - this.top;
            } else if(this.type.nodeType === 1) {
                // 终点元素，获取终点元素位置，忽略x,y
                x = toInteger(getCurrentCss(this.type, "left")) - this.left;
                y = toInteger(getCurrentCss(this.type, "top")) - this.top;
            } else {
                x = toInteger(x);
                y = toInteger(y);
            }

            // 默认drift x,y指的是位移距离
            this.driftX = x;
            this.driftY = y;

            // 处理公式常量
            this.curvature = options.curvature == null ? this.curvature : parseFloat(options.curvature);
            this.abc = solveAbc(this.driftX, this.driftY, this.curvature);
            
            // 进行中调用
            this.process = typeof options.process === "function" ? options.process : this.process;
            // 回调
            this.callback = typeof options.callback === "function" ? options.callback : this.callback;

            // 持续时间
            this.duration = options.duration == null ? this.duration : parseInt(options.duration);
            
        },
        stop: function() {
            var i = timers.length - 1;

            for(; i >= 0; i--) {
                if(timers[ i ] === this) {
                    timers.splice(i, 1);
                    break;
                }
            }
            return this;
        }
    };

    window.tParabola = function(elem, x, y, options) {
        var par = new Parabola(elem, x, y, options);
        par.autostart && par.start();
        return par;
    };
})();

// 模拟个简单的html5 jPlayer
(function() {

var G = function(id) {
    return document.getElementById(id);
};

var jPlayer = {
    guid: 0,
    exp: Math.random().toString().substr(2, 10),
    play: function() {
        var audio = G(this['audio' + jPlayer.exp]);
        if(audio.loaded === true) {
            audio.play();
        }
    },
    stop: function() {
        var audio = G(this['audio' + jPlayer.exp]);
        if(audio.loaded === true) {
            audio.currentTime = 0;
            audio.pause();
        }
    },
    setMedia: function(res) {
        res = res || {};
        var src = res[this['supplied' + jPlayer.exp]],
            audio = G(this['audio' + jPlayer.exp]);

        audio.addEventListener("canplaythrough", function () {
            this.loaded = true;
        }, false);
        audio.src = src;
    },
    init: function(options) {
        options = options || {};

        var id = "jp_audio_" + (++jPlayer.guid),
            audio = document.createElement("audio");

        audio.id = id;
        audio.preload = 'auto';

        this['audio' + jPlayer.exp] = id;
        this['supplied' + jPlayer.exp] = options.supplied || "mp3";
        this.appendChild(audio);

        if(typeof options.ready === "function") {
            options.ready.call(this);
        }
    }
};

Zepto.fn.jPlayer = function() {
    var func, args, i;

    if(typeof arguments[0] === "object") {
        func = jPlayer.init;
        args = arguments;
    } else {
        func = jPlayer[arguments[0]];
        args = [];
        for(i = 0; i < arguments.length; i++) {
            if(i !== 0) {
                args.push(arguments[i]);
            }
        }
    }

    if(typeof func === "function") {
        for(i = 0; i < this.length; i++) {
            func.apply(this[i], args);
        }
    }
    return this;
};

})();

// 音乐播放
var Player = {
    playing: false,
    // 播放音乐
    play: function(type) {
        var $this = this['$'+type];
        if($this && Player.playing === true) {
            $this.jPlayer("stop").jPlayer("play");
        }
    },
    start: function() {
        this.playing = true;
        $("#J_PlayerBtn").addClass("playbtn_on");
    },
    stop: function() {
        this.playing = false;
        $("#J_PlayerBtn").removeClass("playbtn_on");
    },
    bind: function() {
        $("#J_PlayerBtn").show().attr("title", "开声音").on("click", function() {
            if(Player.playing === true) {
                $(this).attr("title", "开声音");
                Player.stop();
            } else {
                $(this).attr("title", "关声音");
                Player.start();
            }
        });
    },
    $die: null,
    $hit: null,
    $point: null,
    $swooshing: null,
    $wing: null,
    ready: 0,
    init: function() {
        if(mobile) {
            return;
        }

        var options = {
            ready: function () {
                var $this = $(this);
                $this.jPlayer("setMedia", {
                    mp3: "sounds/" + $this.attr("data-file")
                });
                Player.ready++;
                if(Player.ready >= 5) {
                    Player.bind();
                }
            },
            swfPath: "js/jPlayer/",
            supplied: "mp3"
        };

        this.$die = $("#J_PlayerDie");
        this.$hit = $("#J_PlayerHit");
        this.$point = $("#J_PlayerPoint");
        this.$swooshing = $("#J_PlayerSwooshing");
        this.$wing = $("#J_PlayerWing");

        this.$die.jPlayer(options);
        this.$hit.jPlayer(options);
        this.$point.jPlayer(options);
        this.$swooshing.jPlayer(options);
        this.$wing.jPlayer(options);
    }
};