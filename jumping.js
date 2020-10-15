var WIDTH = device.width,
    HEIGHT = device.height,
    TYPE = device.brand + ' ' + device.model;
log('设备信息：', TYPE, '\n分辨率：', WIDTH, '*', HEIGHT);


// 全局变量
var 游戏次数 = 0
var 脚本开启时间 = null
// 游戏达成该次数后自动停止
var 最大游戏次数 = 99999
// 截图变量
var img
var initImg
// 当前对局的队伍颜色
let teamColor = "";
// 是否绘制位置结果
let isDraw = true
// 设置自动匹配的游戏等级，初级为1，中级为2
let matchLevel = 2


// 获取截图权限
if (!requestScreenCapture()) {
    toast('请求截图失败，程序结束');
    exit();
}

// 设置悬浮窗样式
var window = floaty.window(
    <frame gravity="center" id="action" alpha="0.7">
        <card cardCornerRadius="10dp" cardElevation="5dp" >
            <vertical w="auto" bg="#eeeeee">
                <text id="text" textSize="20sp" textColor="#f44336" margin="8 2" />
                <button margin="5 2" id="开关" text="开始" style="Widget.AppCompat.Button.Colored" />
                <button margin="5 2" id="关闭" text="关闭" style="Widget.AppCompat.Button.Colored" />
            </vertical >
        </card>
    </frame >
);
window.exitOnClose();
window.setPosition(device.width / 4, 80)

// 落点悬浮窗
var landingPointFloaty = floaty.window(
    <frame h="70">
        {/* //bg="#00000000" */}
        <button id="action1" text="落点" bg="#00000000" />
        <img src="file://img/qizi.png" />
    </frame>
);
// 设置悬浮窗坐标，使其隐藏
landingPointFloaty.setPosition(-1000, -1000);


var startingPointFloaty = floaty.window(
    <frame h="70">
        <button id="action2" text="起点" bg="#00000000" />
        <img src="file://img/qizi.png" />
    </frame>
);
// 设置悬浮窗坐标，使其隐藏
startingPointFloaty.setPosition(-1000, -1000);

// 防止悬浮窗自动关闭，创建周期函数，每秒执行一次
setInterval(() => { }, 1000)

// var execution = null;
//对控件的操作需要在UI线程中执行
ui.run(function () {
    window.text.setText("跳一跳\n自动匹配");
    window.开关.click(() => {
        log("进入点击事件")
        if (window.开关.getText() == '开始') {
            开始按钮点击()
        } else {
            停止按钮点击()
        }

    });
    window.关闭.click(() => {
        log(window.关闭.getText())
        exit();
    });

});


//记录按键被按下时的触摸坐标
var x = 0, y = 0;
//记录按键被按下时的悬浮窗位置
var windowX, windowY;
//记录按键被按下的时间以便判断长按等动作
var downTime;

window.action.setOnTouchListener(function (view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            x = event.getRawX();
            y = event.getRawY();
            windowX = window.getX();
            windowY = window.getY();
            downTime = new Date().getTime();
            return true;
        case event.ACTION_MOVE:
            //移动手指时调整悬浮窗位置
            window.setPosition(windowX + (event.getRawX() - x),
                windowY + (event.getRawY() - y));
            //如果按下的时间超过1.5秒判断为长按，退出脚本
            // if (new Date().getTime() - downTime > 2000) {
            //     exit();
            // }
            return true;
        case event.ACTION_UP:
            //手指弹起时如果偏移很小则判断为点击
            if (Math.abs(event.getRawY() - y) < 5 && Math.abs(event.getRawX() - x) < 5) {
                window.setAdjustEnabled(!window.isAdjustEnabled());
                if (windowX < 0) {
                    window.setPosition(0, windowY);
                }
                if (windowY < 0) {
                    window.setPosition(windowX, 0);
                }
            }
            return true;
    }
    return true;
});

function 开始按钮点击() {
    ui.run(function () {
        // 点击开始后按钮置为停止
        window.开关.setText('停止');
        toast("启动脚本");
        // 启动前先停止其他脚本
        threads.shutDownAll()
        log("开始游戏")
        // 自动匹配，可以循环开始游戏
        autoMatch()
        // 游戏主线程
        log("启动")
        startGame()
    })
}

function 停止按钮点击() {
    ui.run(function () {
        window.开关.setText('开始');
        toast("脚本停止");
        threads.shutDownAll()
        // 脚本停止时颜色置为初始状态
        teamColor = ""
        // 脚本开启时长 = new Date().getTime() - 脚本开启时间.getTime()
        // var minutes = Math.floor(脚本开启时长 / (60 * 1000))
        // var seconds = Math.round(脚本开启时长 % (60 * 1000) / 1000)
        // dialogs.alert("本次开始时长：" + minutes + " 分钟" + seconds + " 秒，\n游戏次数：" + 游戏次数 + "次");
    })
}

function getTeamColor(img2) {
    // 判断本局棋子颜色
    // 头像框蓝#44B9FF
    // 头像框红#DF0b46
    teamColor = ""
    var pointBlue = findColor(img2, "#44B9FF", {
        region: [0, 0, WIDTH, parseInt(HEIGHT * 0.2)],
        threshold: 4
    });
    var pointRed = findColor(img2, "#F20148", {
        region: [0, 0, WIDTH, parseInt(HEIGHT * 0.2)],
        threshold: 4
    });

    log("蓝色头像框坐标", pointBlue)
    log("红色头像框坐标", pointRed)
    // 两个头像框都存在时,才说明游戏状态正常
    // 左面的头像框为我方颜色
    if (pointBlue && pointRed) {
        if (pointBlue.x < pointRed.x) {
            // 本局为蓝色方
            teamColor = "#44B9FF";
            log("本局为蓝色方")
        } else {
            // 本局为红色方
            teamColor = "#FC5948";
            log("本局为红色方")
        }
    } else {
        // 初始化失败
        log("未找到本局队伍颜色")
    }
}


function autoMatch() {
    log("自动匹配")
    intoRoom()
    intoGame()
    // 进入游戏
    function intoGame() {
        threads.start(function () {
            while (true) {
                sleep(2000)
                // 房间内
                if (id("ice_ball_main_title").exists()) {
                    if (id("ice_ball_main_title").findOne().text() == "跳跳跳") {
                        // 获得图片控件的位置，如果位置在中间，则是初级场，不在中间为中级场
                        let range = id("ice_ball_main_type_item_iv").findOne().bounds()
                        // 判断当前房间等级是否与设置相同
                        if (range.left < device.width / 2 && range.right > device.width / 2 && matchLevel == 2) {
                            // 左滑进入中级场
                            swipe(device.width * 0.8, device.height * 0.5, device.width * 0.2, device.height * 0.5, 300)
                            // 滑动后需要等待一会，跟设备配置有关
                            sleep(500)
                        } else if (range.right < device.width / 2 && matchLevel == 1) {
                            // 右滑进入初级场
                            swipe(device.width * 0.2, device.height * 0.5, device.width * 0.8, device.height * 0.5, 300)
                            // 滑动后需要等待一会，跟设备配置有关
                            sleep(500)
                        }

                        if (id("ice_ball_quick_start").exists()) {
                            id("ice_ball_quick_start").findOne().click()
                        }
                    }
                }
            }
        })
    }
    // 进入游戏房间
    function intoRoom() {
        threads.start(function () {
            while (true) {
                sleep(2000)
                // 首页
                if (text("首页").exists()) {
                    log("首页存在")
                    id("home_game_recycler_view").findOne().children().forEach(child => {
                        var target = child.findOne(id("more_game_view"));
                        if (target) {
                            target.click();
                        }
                    });
                }

                // 游戏列表
                if (text("一起玩").exists()) {
                    log("一起玩存在")
                    swipe(device.width / 2, device.height * 0.9, device.width / 2, device.height * 0.2, 300)
                    sleep(200)
                    swipe(device.width / 2, device.height * 0.9, device.width / 2, device.height * 0.2, 300)
                    sleep(200)
                    id("home_game_recycler_view").findOne().children().forEach(function (value, index, array) {
                        var target = value.findOne(text("拼操作"));
                        if (target) {
                            log(target)
                            // id("img_iv").drawingOrder(3)
                            log(target.parent())
                            var num = parseInt(target.parent().drawingOrder()) + 1
                            id("img_iv").drawingOrder(num).click()
                        }
                    });
                }
            }
        })
    }
}

function startGame() {
    threads.start(function () {
        while (true) {
            sleep(2000)
            initImg = captureScreen();
            console.time("查找队伍颜色耗时")  //开始
            getTeamColor(initImg)
            console.timeEnd("查找队伍颜色耗时") //结束
            log("当前应用包", currentPackage())
            // if (currentPackage() == "com.wepie.weplay") {
            if (teamColor != "") {
                log("开始查找棋子")
                // 限定查找棋子的范围，可以提高效率
                var searchX = parseInt(WIDTH * 0.1)
                var searchY = parseInt(HEIGHT * 0.5)
                // #FC5948 红 #44B9FF 蓝 1650-1530
                // 判断本局颜色
                // var colorCode = teamColor == "red" ? "#FC5948" : "#44B9FF"

                // 在整个下半区寻找棋子的颜色
                // 优化为多点找色,结果更准确
                var point = images.findMultiColors(initImg, "#333238", [[0, -150, teamColor]], {
                    region: [searchX, searchY],
                    threshold: 4
                });
                // 正在游戏，且轮到自己的回合时，准备跳
                if (point) {
                    // 因为随机截图时可能存在动画等干扰，延迟1秒后重新截图计算
                    sleep(1000);
                    console.time("总耗时")  //开始
                    img = captureScreen();
                    point = images.findMultiColors(img, "#333238", [[0, -150, teamColor]], {
                        region: [searchX, searchY],
                        threshold: 4
                    });
                    // 找到棋子的中心点坐标

                    console.time("查找棋子耗时")
                    var chessmanPoint = searchChessmanPoint(point)

                    console.timeEnd("查找棋子耗时")
                    // 找到棋子后，开始找落点位置
                    if (chessmanPoint) {
                        console.time("查找落点耗时")
                        var platformPoint = searchLandingPoint()
                        console.timeEnd("查找落点耗时")
                        console.timeEnd("总耗时")
                        if (platformPoint) {
                            // 判断是否需要绘制找到的位置结果，调试时使用
                            if (isDraw) {
                                drawRange(chessmanPoint, platformPoint)
                            }
                            // 跳，从chessmanPoint跳到platformPoint
                            jumping(chessmanPoint, platformPoint)
                            // 跳跃完成后等待2秒
                            sleep(2000);
                        } else {
                            log("没找到平台")
                        }
                    } else {
                        log("没找到棋子")
                    }
                    // 图片回收
                    img.recycle();

                }
            } else {
                // 队伍颜色不存在时，判断是否需要点击返回
                // 黑色
                var color1 = "#374149"
                // 蓝色
                var color2 = "#82D5FF"
                // 通过多点找色，找到返回按钮
                var point = images.findMultiColors(initImg, color1, [
                    [-20, 0, color2],
                    [10, 0, color1],
                    [20, 0, color1],
                    [30, 0, color1],
                    [50, 0, color2],

                    [-20, 16, color2],
                    [-10, 16, color2],
                    [0, 16, color2],
                    [10, 16, color2],
                    [20, 16, color2],
                    [30, 16, color2],
                    [40, 16, color1],
                    [50, 16, color2],
                    [60, 16, color2],

                    [-20, 33, color2],
                    [-10, 33, color2],
                    [0, 33, color1],
                    [10, 33, color1],
                    [20, 33, color1],
                    [30, 33, color1],
                    [50, 33, color2],
                    [60, 33, color2]
                ], {
                    region: [device.width * 0.5, device.height * 0.5, device.width * 0.5, device.height * 0.4],
                    threshold: 12
                });
                log("找色结果", point)
                if (point) {
                    log("点击返回，开始下一局")
                    click(point.x, point.y)
                }
            }
            // else {
            //     console.time("查找队伍颜色耗时")  //开始
            //     getTeamColor(initImg)
            //     console.timeEnd("查找队伍颜色耗时") //结束
            // }
            // } else {
            //     log("不在游戏房间内,当前位置：", currentActivity())
            //     // 停止按钮点击()
            // }
            // 图片回收
            initImg.recycle()
        }
    })
}

function jumping(chessmanPoint, platformPoint) {

    // 计算按压时间
    // 原方案，已经弃用
    // 原有方案为先计算落点与棋子的X轴坐标差，来计算按压时间
    // 此方案在内部测试时没问题，但是在实际匹配的对战中跳跃成功率会降低
    // 是因为如果队手跳跃的落点距离平台中心点较远时，会导致棋子与下一个平台中心点之间的夹角产生变化
    // 导致单靠X轴计算的时间不准确，这时需要根据Y轴的距离来进行调整
    // var pressTime = Math.abs(chessmanPoint.x - platformPoint.x) / WIDTH * 1650

    // 根据勾股定理计算跳跃距离
    let distance = Math.sqrt(Math.pow(Math.abs(chessmanPoint.x - platformPoint.x), 2) + Math.pow(Math.abs(chessmanPoint.y - platformPoint.y), 2))
    // 距离乘以系数，计算按压时间
    let pressTime = distance * 1.37

    log("记录落点")
    landingPointFloaty.setPosition(platformPoint.x - 405, platformPoint.y - 232)
    // 使用滑动作为按压命令可以防止检测 ps：虽然现在可能还没有检测
    swipe(chessmanPoint.x + random(-10, 10), chessmanPoint.y + random(-10, 10), chessmanPoint.x + random(-10, 10), chessmanPoint.y + random(-10, 10), pressTime);
    landingPointFloaty.setPosition(-1000, -1000)
}


var 绘制次数 = 0
// 用来绘制起点和落点的范围，调试时使用
function drawRange(chessmanPoint, platformPoint) {

    绘制次数 += 1
    // 画布
    var canvas = new Canvas(img);
    // 画笔
    var paint = new Paint();
    // 落点绘制
    canvas.drawRect(platformPoint.x - 5,
        platformPoint.y - 5,
        platformPoint.x + 5,
        platformPoint.y + 5,
        paint);

    paint.setColor(colors.RED);
    // 起点绘制
    canvas.drawRect(chessmanPoint.x - 5,
        chessmanPoint.y - 5,
        chessmanPoint.x + 5,
        chessmanPoint.y + 5,
        paint);
    var drawImage = canvas.toImage();
    images.save(drawImage, "/sdcard/jumping_draw_range" + 绘制次数 + ".png");
    log("绘制次数：", 绘制次数)
    // 回收图片
    drawImage.recycle();
}

// regionInfo为多点找色得出的棋子大概范围
// 所以只需要在该点附近范围找中心点既可
function searchChessmanPoint(regionInfo) {
    var CHESS_X = 0
    var CHESS_Y = 0
    var linemax = 0
    var pointX = regionInfo.x, pointY = regionInfo.y;
    for (let r = pointY - 50; r < pointY + 50; r += 5) {
        var line = [];
        for (let c = pointX - 100; c < pointX + 100; c += 2) {
            var point = images.pixel(img, c, r);
            // 找到棋子的颜色
            if (colors.isSimilar("#333238", colors.toString(point), 4, "diff")) {
                line.push(c);
            }
        }
        if (line.length > linemax) {
            linemax = line.length;
            CHESS_X = line[Math.floor(line.length / 2)] + 2;
            CHESS_Y = r;
        }
    }
    log("棋子的中心点：", CHESS_X, CHESS_Y)
    if (CHESS_X != 0) {
        return { x: CHESS_X, y: CHESS_Y }
    } else {
        return null
    }
}

// 搜索棋子跳跃的落点坐标
function searchLandingPoint() {
    let pointX = null
    let pointY = null
    // 为了提高效率，先进行广域范围搜索确定平台顶点的范围
    forr:
    for (var r = parseInt(HEIGHT * 0.4); r <= parseInt(HEIGHT * 0.9); r += 20) {
        for (let c = parseInt(WIDTH * 0.1); c < parseInt(WIDTH * 0.9); c += 20) {
            var c0 = images.pixel(img, c, r);
            var c1 = images.pixel(img, c, r - 20);
            if (Math.abs(colors.red(c0) - colors.red(c1)) + Math.abs(colors.green(c0) - colors.green(c1)) + Math.abs(colors.blue(c0) - colors.blue(c1)) >= 20) {
                pointX = c;
                pointY = r;
                break forr;
            }
        }
    }

    // 通过范围坐标找到相对精准的平台顶点坐标
    if (pointX && pointY) {
        let topPoint = searchTopPoint(pointX, pointY)
        if (topPoint) {
            // 顶部坐标向下偏移60得到落点坐标(60是经过对战测试得出的数据)
            // 这里没有取平台的中心点作为落点是因为：
            // 1、不同于微信的跳一跳，在对战时不会因为落在中心点得到额外的加分，只要不跳离平台都一样
            // 2、让落点靠近平台的前部边缘，可以防止对手“原地跳”，理论上来说偏移中心越远，对手跳跃难度越高
            // 3、只计算平台顶点，比计算平台中心点速度要快，可以提高运行效率
            // 4、懒得写
            topPoint.y += 60
        }
        return topPoint
    } else {
        return null
    }
}

// 搜索平台的顶点坐标
// pointX, pointY 为广域范围搜索得到的“顶点附近”的坐标
function searchTopPoint(pointX, pointY) {
    log("开始查找平台顶点")
    for (let r = (pointY - 40); r <= pointY; r += 1) {
        for (let c = (pointX - 40); c < ((pointX + 200) > WIDTH ? WIDTH : (pointX + 200)); c += 1) {
            var c0 = images.pixel(img, c, r);
            var c1 = images.pixel(img, c, r - 1);
            if (Math.abs(colors.red(c0) - colors.red(c1)) + Math.abs(colors.green(c0) - colors.green(c1)) + Math.abs(colors.blue(c0) - colors.blue(c1)) >= 20) {
                // 如果是较大的圆柱形，此点会向左侧偏移
                // 找方块顶部中心点
                // 优化，从右侧向左继续寻找，找到另一个颜色为止
                // 计算两个坐标的中心点，作为顶点坐标
                for (let a = c + 100; a > c; a -= 1) {
                    var c2 = images.pixel(img, a, r);
                    var c3 = images.pixel(img, a, r - 1);
                    if (Math.abs(colors.red(c3) - colors.red(c2)) + Math.abs(colors.green(c3) - colors.green(c2)) + Math.abs(colors.blue(c3) - colors.blue(c2)) >= 30) {
                        // 偏移a/2个像素
                        log("偏移像素:", a - c)
                        // TARGET_X = parseInt((c + a) / 2);
                        // TARGET_Y = r;
                        log("顶点坐标", { x: parseInt((c + a) / 2), y: r })
                        return { x: parseInt((c + a) / 2), y: r }
                        // break for1;
                    }
                }
            }
        }
    }
    return null
}