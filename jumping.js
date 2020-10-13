
var WIDTH = device.width,
    HEIGHT = device.height,
    TYPE = device.brand + ' ' + device.model;
log('设备信息：', TYPE, '\n分辨率：', WIDTH, '*', HEIGHT);

// 获取截图权限
if (!requestScreenCapture()) {
    toast('请求截图失败，程序结束');
    exit();
}



// 全局变量
var 游戏次数 = 0
var 脚本开启时间 = null
// 游戏达成该次数后自动停止
var 最大游戏次数 = 99999

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

var qizi = floaty.window(
    <frame h="70">
        {/* //bg="#00000000" */}
        <button id="action1" text="落点" bg="#00000000" />
        <img src="file://img/qizi.png" />
    </frame>
);
// qizi.setSize(100, 150)
qizi.setPosition(-1000, -1000); //建立悬浮窗并隐藏


var qizi_qidian = floaty.window(
    <frame h="70">
        <button id="action2" text="起点" bg="#00000000" />
        <img src="file://img/qizi.png" />
    </frame>
);
// qizi_qidian.setSize(100, 150)
qizi_qidian.setPosition(-1000, -1000); //建立悬浮窗并隐藏

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


var CHESS_X, CHESS_Y;
var TARGET_X, TARGET_Y;
var img;
// blue and red
var teamColor = "";



function 开始按钮点击() {
    ui.run(function () {
        // 点击开始后按钮置为停止
        window.开关.setText('停止');
        toast("启动脚本");
        // 启动前先停止其他脚本
        threads.shutDownAll()
        log("开始游戏")
        开始游戏()
    })
}

function 停止按钮点击() {
    ui.run(function () {
        window.开关.setText('开始');
        toast("脚本停止");
        threads.shutDownAll()
        // 脚本开启时长 = new Date().getTime() - 脚本开启时间.getTime()
        // var minutes = Math.floor(脚本开启时长 / (60 * 1000))
        // var seconds = Math.round(脚本开启时长 % (60 * 1000) / 1000)
        // dialogs.alert("本次开始时长：" + minutes + " 分钟" + seconds + " 秒，\n游戏次数：" + 游戏次数 + "次");
    })
}

function 初始化(img2) {
    // var img2 = captureScreen();
    // 判断本局棋子颜色
    // 头像框蓝#44B9FF
    // 头像框红#DF0b46

    var pointBlue = findColor(img2, "#44B9FF", {
        region: [0, 0, WIDTH, parseInt(HEIGHT * 0.2)],
        threshold: 4
    });
    var pointRed = findColor(img2, "#F20148", {
        region: [0, 0, WIDTH, parseInt(HEIGHT * 0.2)],
        threshold: 4
    });

    log("头像框坐标1", pointBlue)
    log("头像框坐标2", pointRed)
    // img2.recycle();
    // 两个头像框都存在时,才说明游戏状态正常
    if (pointBlue && pointRed) {
        if (pointBlue.x < pointRed.x) {
            // 本局为蓝色方
            teamColor = "blue";
            log("本局为蓝色方")
        } else {
            // 本局为红色方
            teamColor = "red";
            log("本局为红色方")
        }
    } else {
        // 初始化失败
        log("未找到本局队伍颜色")
        停止按钮点击()
    }
    img2.recycle();
}

function 开始游戏() {
    threads.start(function () {
        while (true) {
            sleep(2000);
            img = captureScreen();
            // currentActivity() == "com.wepie.wespy.cocosnew.CocosGameActivityNew" && 
            if (currentActivity() == "com.wepie.wespy.cocosnew.CocosGameActivityNew") {
                if (teamColor != "") {
                    log("开始查找棋子")
                    // 限定查找棋子的范围，可以提高效率
                    var searchX = parseInt(WIDTH * 0.1)
                    var searchY = parseInt(HEIGHT * 0.5)
                    var point
                    // 在整个下半区寻找棋子的颜色
                    // 优化为多点找色,结果更准确
                    // #FC5948 红 #44B9FF 蓝 1650-1530
                    // 判断本局颜色
                    var colorCode = teamColor == "red" ? "#FC5948" : "#44B9FF"
                    // if (teamColor == "red") {
                    point = images.findMultiColors(img, "#333238", [[0, -150, colorCode]], {
                        region: [searchX, searchY],
                        threshold: 4
                    });
                    // } else if (teamColor == "blue") {
                    //     point = images.findMultiColors(img, "#333238", [[0, -150, colorCode]], {
                    //         region: [searchX, searchY],
                    //         threshold: 4
                    //     })
                    // }



                    // 正在游戏，且轮到自己的回合时，准备跳
                    if (point) {
                        img.recycle();
                        // 因为截图时可能存在动画，延迟1秒后重新截图
                        sleep(1000);
                        img = captureScreen();
                        point = images.findMultiColors(img, "#333238", [[0, -150, colorCode]], {
                            region: [searchX, searchY],
                            threshold: 4
                        });
                        var chessmanPoint = 找棋子中心点(point)
                        var platformPoint = 找方块范围()

                        if (chessmanPoint && platformPoint) {
                            jumping(chessmanPoint,platformPoint)                        
                        } else {
                            log("未找到棋子或平台")
                        }


                    }
                } else {
                    初始化(img)
                }

            } else {
                log("不在游戏房间内")
                停止按钮点击()
            }
        }
    })
}

function jumping(chessmanPoint,platformPoint) {
    // 本次跳跃距离
    var distance = Math.abs(chessmanPoint.x - platformPoint.x) / WIDTH * 1650
    // 触按位置
    // var bx1 = parseInt(WIDTH / 2 + random(-10, 10)),
    //     bx2 = parseInt(WIDTH / 2 + random(-10, 10)),
    //     by1 = parseInt(HEIGHT * 0.785 + random(-4, 4)),
    //     by2 = parseInt(HEIGHT * 0.785 + random(-4, 4));
    // 跳！
    log("记录落点")
    qizi.setPosition(platformPoint.x - 405, platformPoint.y - 232)
    // 169, rwzb.y - 226
    // swipe(CHESS_X, CHESS_Y, TARGET_X, TARGET_Y, Math.abs(CHESS_X - TARGET_X) / WIDTH * 1630);
    swipe(chessmanPoint.x, chessmanPoint.y, chessmanPoint.x + 5, chessmanPoint.y + 5, distance);
    qizi.setPosition(-1000, -1000)
    img.recycle();
    // 停止按钮点击()
}

// function 找棋子范围() {
//     threads.start(function () {
//         // 限定查找棋子的范围，可以提高效率
//         var searchX = parseInt(WIDTH * 0.1)
//         var searchY = parseInt(HEIGHT * 0.5)
//         var point
//         // 在整个下半区寻找棋子的颜色
//         // 优化为多点找色,结果更准确
//         // #FC5948 红 #44B9FF 蓝 1650-1530
//         // 判断本局颜色
//         if (teamColor == "red") {
//             point = images.findMultiColors(img, "#333238", [[0, -150, "#FC5948"]], {
//                 region: [searchX, searchY],
//                 threshold: 4
//             });
//         } else if (teamColor == "blue") {
//             point = images.findMultiColors(img, "#333238", [[0, -150, "#44B9FF"]], {
//                 region: [searchX, searchY],
//                 threshold: 4
//             })
//         }
//         // var pointRed = images.findMultiColors(img, "#333238", [[0, -150, "#FC5948"]], {
//         //     region: [searchX, searchY],
//         //     threshold: 4
//         // });

//         // if (pointRed) {
//         //     point = pointRed
//         // } else {
//         //     var pointBlue = images.findMultiColors(img, "#333238", [[0, -150, "#44B9FF"]], {
//         //         region: [searchX, searchY],
//         //         threshold: 4
//         //     })
//         //     point = pointBlue
//         // }
//         // var point = findColor(img, "#333238", {
//         //     region: [searchX, searchY],
//         //     threshold: 4
//         // });


//         if (point) {
//             // 找到棋子，开始寻找棋子的中心点
//             // 设定棋子的高度为150，宽度100，得到新的搜索范围为[point.x-100,point.y-150,200,300]
//             // [point.x - 100, point.y - 150, 200, 300],


//             // canvas.drawRect(point.x - 100, point.y - 50, point.x + 100, point.y + 50, paint);

//             // var image = canvas.toImage();
//             // images.save(image, "/sdcard/tmp.png");

//             // app.viewFile("/sdcard/tmp.png");
//             log("棋子的点：", point)
//             找棋子顶点(point)
//         } else {
//             // 未找到棋子，可能是游戏结束或棋子在搜索范围外
//             // TODO 待处理
//             // 保存失败的图片，后续优化
//             images.save(img, "/sdcard/tmp" + random(0, 1000) + ".png");
//             random(0, 1000)
//             log("未找到棋子1")
//             停止按钮点击()
//         }

//     })
// }

function 找棋子中心点(regionInfo) {
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
                // log("找到相似色")
            } else {
                // log("不是")
            }
        }
        if (line.length > linemax) {
            linemax = line.length;
            CHESS_X = line[Math.floor(line.length / 2)] + 2;
            CHESS_Y = r;
        }
        // else if (line.length < linemax) {
        //     break;
        // }
        // ;
    }
    // qizi_qidian.setPosition(CHESS_X - 405, CHESS_Y - 232)
    log("棋子的中心点：", CHESS_X, CHESS_Y)
    if (CHESS_X != 0) {
        return { x: CHESS_X, y: CHESS_Y }
    } else {
        return null
    }
}

function 找方块范围() {
    for (let r = parseInt(HEIGHT * 0.4); r <= parseInt(HEIGHT * 0.9); r += 20) {
        var flag = false;
        for (let c = parseInt(WIDTH * 0.1); c < parseInt(WIDTH * 0.9); c += 20) {
            var c0 = images.pixel(img, c, r);
            var c1 = images.pixel(img, c, r - 5);
            if (Math.abs(colors.red(c0) - colors.red(c1)) + Math.abs(colors.green(c0) - colors.green(c1)) + Math.abs(colors.blue(c0) - colors.blue(c1)) >= 30) {
                pointX = c;
                pointY = r;
                flag = true;
                break;
            }
        }
        if (flag) {
            break;
        }
    }
    if (pointX && pointY) {
        return 找方块顶点(pointX, pointY)
    } else {
        return null
    }
}

function 找方块顶点(pointX, pointY) {
    var TARGET_X = 0, TARGET_Y = 0
    for1:
    for (let r = (pointY - 40); r <= pointY; r += 1) {
        for (let c = (pointX - 20); c < ((pointX + 300) >= WIDTH ? WIDTH : (pointX + 300)); c += 1) {
            var c0 = images.pixel(img, c, r);
            var c1 = images.pixel(img, c, r - 1);
            if (Math.abs(colors.red(c0) - colors.red(c1)) + Math.abs(colors.green(c0) - colors.green(c1)) + Math.abs(colors.blue(c0) - colors.blue(c1)) >= 30) {

                // 如果是较大的圆柱形，此点会向左侧偏移
                // 找方块顶部中心点
                // 优化，向右继续寻找，找到另一个颜色为止
                for (let a = c + 100; a > c; a--) {
                    var c2 = images.pixel(img, a, r);
                    var c3 = images.pixel(img, a, r - 1);
                    if (Math.abs(colors.red(c3) - colors.red(c2)) + Math.abs(colors.green(c3) - colors.green(c2)) + Math.abs(colors.blue(c3) - colors.blue(c2)) >= 30) {
                        // 偏移a/2个像素
                        log("偏移像素:", a - c)
                        TARGET_X = parseInt((c + a) / 2);
                        TARGET_Y = r;
                        break for1;
                    }
                }
            }
        }
    }
    log("方块的顶点：", TARGET_X, TARGET_Y)

    if (TARGET_X != 0) {
        return { x: TARGET_X, y: TARGET_Y }
    } else {
        return null
    }
    // canvas.drawRect(CHESS_X, CHESS_Y, TARGET_X, TARGET_Y, paint);
    // var image = canvas.toImage();
    // images.save(image, "/sdcard/tmp.png");

    // app.viewFile("/sdcard/tmp.png");
}