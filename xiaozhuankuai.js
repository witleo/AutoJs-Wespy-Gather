auto.waitFor();
if (!images.requestScreenCapture()) {
    toast("请求权限失败");
    exit();
}

// 设置悬浮窗样式
var window = floaty.window(
    <frame gravity="center" id="action" alpha="0.7">
        <card cardCornerRadius="10dp" cardElevation="5dp" >
            <linear weightSum="8" bg='#888888'>
                <button layout_width="0dp" layout_weight="4" id="开关" text="开始" style="Widget.AppCompat.Button.Colored" />
                <button layout_width="0dp" layout_weight="4" id="关闭" text="关闭" style="Widget.AppCompat.Button.Colored" />

            </linear>

        </card>
    </frame >
);
window.exitOnClose();
window.setPosition(device.width / 4, 20)

// 防止悬浮窗自动关闭，创建周期函数，每秒执行一次
setInterval(() => { }, 1000)

// var execution = null;
//对控件的操作需要在UI线程中执行
ui.run(function () {
    window.开关.click(() => {
        log("进入点击事件")
        if (window.开关.getText() == '开始') {
            开始按钮点击()
        } else {
            停止按钮点击()
        }

    });
    // window.停止.click(() => {

    // });
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
        开始游戏()
    })
}

function 停止按钮点击() {
    ui.run(function () {
        window.开关.setText('开始');
        toast("脚本停止");
        threads.shutDownAll()
    })
}



// 1、初始化计算砖块的高度和顶部标题栏高度，确定砖块活动范围

// 2、寻找图中Y轴最大的砖块坐标

// 3、通过砖块的Y轴坐标和4条坐标轴，找到另外三个砖块的点

// 4、同一X轴的另外三个点，向上扩展一定的高度，找到砖块中心点附近范围，通过找色判断该点是否存在砖块以及砖块颜色

// 5、记录下该行的砖块存在情况后，X坐标向上偏移砖块高度，继续判断上面的一行

// 6、循环查找出所有砖块位置和颜色，直到跳出判定区

// 7、现在已经得到了所有砖块的位置及颜色，找到所有需要点击的点，按Y轴值大小依次点击

let colorBlue = "#6A93FE"  // #7BA4FF蓝色方块
let colorYellow = "#FFB91F" // #FFB91F黄色砖块
let colorYellow2 = "#A6440a" // #A6440a黄砖裂缝
let colorShadow = "#362291" // #362291方块的阴影颜色

// 4列砖块的中心点X坐标
let XList = [
    parseInt(device.width / 8),
    parseInt(device.width * 3 / 8),
    parseInt(device.width * 5 / 8),
    parseInt(device.width * 7 / 8)
]
// 屏幕截图
let img;

// 砖块高度
let brickHeigh = 0
// 顶部标题栏高度
let topHeigh = 0
// 砖块在Y轴的存在区域，默认标题栏为360
let gameRegionY = { y1: topHeigh, y2: parseInt(device.height * 0.95) }
// 是否绘制找色结果，当发生错误时开启，以便排查
let isDraw = 1
// 找色的查找范围,绘制找色结果时使用
let regionRangeList = []
// 找色的查询结果,绘制找色结果时使用
let pointList = []
// 本次消除完成后距下次截图的时间间隔（毫秒）
let delay = 300


function 开始游戏() {
    threads.start(function () {
        while (true) {
            sleep(delay);
            if (currentActivity() == "com.wepie.wespy.cocosnew.CocosGameActivityNew") {
                start()
            }
            else {
                停止按钮点击()
            }
        }
    })
}


function start() {
    regionRangeList = []
    pointList = []
    img = captureScreen();
    // 判断砖块高度是否已经初始化
    if (brickHeigh == 0) {
        // 计算砖块高度
        brickHeightReckon()
    }

    // 判断状态栏高度是否已经初始化
    if (topHeigh == 0) {
        // 计算状态栏高度
        topHeightReckon()
    }

    // 从下往上查找砖块
    // 寻找图中Y轴最大的砖块坐标
    let bottomPoint = searchBottomPoint()

    if (bottomPoint) {
        log("Y值最大砖块坐标", bottomPoint.x, bottomPoint.y)
        for (let Y = parseInt(bottomPoint.y); Y > (brickHeigh / 3 + gameRegionY.y1); Y -= brickHeigh) {
            let XpointList = []
            let clickNumber = 0
            for (let i = 0; i < XList.length; i++) {
                // 记录坐标点击次数
                let count = isBrick(XList[i], Y)
                if (count == 0) {
                    XpointList.push(XList[i])
                } else if (count > clickNumber) {
                    clickNumber = count
                }
            }
            if (clickNumber > 0) {
                for (let j = 0; j < XpointList.length; j++) {

                    pointList.push({ "x": XpointList[j], "y": Y, "number": clickNumber })
                    // 点击
                    if (clickNumber == 1) {
                        press(XpointList[j], Y, 1);
                        // sleep(10);
                    } else if (clickNumber == 2) {
                        log("点击两次================")
                        press(XpointList[j], Y, 1);
                        sleep(10);
                        press(XpointList[j], Y, 1);
                        // sleep(10);
                    }
                }
            }
        }
        log("页面中砖块的坐标点：", pointList)
        // 绘制范围，排查错误
        if (isDraw == 1) {
            绘制范围()
        } else {
            // 回收图片
            img.recycle();
        }
    }
}




// 查找底部坐标
function searchBottomPoint() {
    for (let i = gameRegionY.y2; i >= gameRegionY.y1; i -= 3) {
        for (let j = 0; j < XList.length; j++) {
            var point = images.pixel(img, XList[j], i);
            // 找阴影颜色
            // if (colors.isSimilar(colorShadow, colors.toString(point), 4, "diff")) {
            //     // 匹配到了其中一种，返回坐标
            //     return { x: XList[j], y: i }
            // }
            // let colorBlue = "#7BA4FF"  // #7BA4FF蓝色方块
            // let colorYellow = "#FFB91F" // #FFB91F黄色砖块
            // let colorYellow2 = "#A6440a" // #A6440a黄砖裂缝
            // let colorShadow = "#362291" // #362291方块的阴影颜色

            let colorBlue = "#658EFF"  // #658EFF蓝色方块
            let colorYellow = "#FFAF13" // #FFAF13黄色砖块
            let colorYellow2 = "#B25801" // #B25801黄砖裂缝
            // 找方块颜色
            if (colors.isSimilar(colorBlue, colors.toString(point), 4, "diff")
                || colors.isSimilar(colorYellow, colors.toString(point), 10, "diff")
                || colors.isSimilar(colorYellow2, colors.toString(point), 4, "diff")) {
                // 匹配到了其中一种，返回坐标
                return { x: XList[j], y: i }
            }
        }
    }
    log("截图中没有找到指定颜色")
    return null
}

// 通过一个点坐标，判断此处是否有砖块，砖块颜色是什么
function isBrick(x, y) {
    // XY为砖块中心坐标，因为有时会被特效和文字遮挡中心点坐标，
    // 所以对中心坐标周边取一小块范围做颜色检测
    // 保证能涵盖砖块中心点一定范围，不超出砖块范围就行
    // 砖块宽度为 (device.width / 4 - 10)
    // 缝隙宽度为 10
    let regionRange = [parseInt(x - device.width / 8 + 5), parseInt(y - brickHeigh / 3), parseInt(device.width / 4 - 10), parseInt(brickHeigh / 3)]
    // 颜色容差为8
    let thresholdRange = 8
    // 记录查找范围，调试用
    regionRangeList.push(regionRange)
    // 找蓝色
    let pointBlue = findColor(img, colorBlue, {
        region: regionRange,
        threshold: thresholdRange
    });
    // 找到蓝色直接返回
    if (pointBlue) {
        return 1
    }
    let pointYellow = findColor(img, colorYellow, {
        region: regionRange,
        threshold: thresholdRange
    });
    // 找到黄色判断是否有裂缝
    if (pointYellow) {
        // 找裂缝
        let pointYellow2 = findColor(img, colorYellow2, {
            region: regionRange,
            threshold: thresholdRange
        });
        // 有裂缝返回1，没裂缝返回2
        if (pointYellow2) {
            return 1
        } else {
            return 2
        }
    }
    return 0
}


let 绘制次数 = 0
function 绘制范围() {
    绘制次数 += 1
    // 测试使用，记录点击区域
    // 绘制范围
    var canvas = new Canvas(img);
    var paint = new Paint();
    // 找点范围
    for (let i = 0; i < regionRangeList.length; i++) {
        canvas.drawRect(regionRangeList[i][0],
            regionRangeList[i][1],
            regionRangeList[i][0] + regionRangeList[i][2],
            regionRangeList[i][1] + regionRangeList[i][3],
            paint);
    }

    paint.setColor(colors.RED);
    // 找点结果
    for (let i = 0; i < pointList.length; i++) {
        // pointList[i].number += 1
        if (pointList[i].number >= 1) {
            canvas.drawRect(pointList[i].x - 5 * pointList[i].number,
                pointList[i].y - 5 * pointList[i].number,
                pointList[i].x + 5 * pointList[i].number,
                pointList[i].y + 5 * pointList[i].number, paint);
        }
    }

    var image = canvas.toImage();
    // images.save(image, "/sdcard/tmp.png");

    images.save(image, "/sdcard/tmp2" + 绘制次数 + ".png");
    // images.save(img, "/sdcard/tmp1" + 绘制次数 + ".png");
    // app.viewFile("/sdcard/tmp.png");

    // 回收图片
    img.recycle();
    image.recycle();
}

// 计算砖块高度
function brickHeightReckon() {
    // 2、寻找图中Y轴最大的砖块坐标
    let bottomPoint = searchBottomPoint()
    if (bottomPoint) {
        // 因为测试机型的砖块高度为160
        // 所以这里认为砖块的高度为80-300之间，不在这个范围则说明查找失败
        for (let Y = bottomPoint.y - 80; Y > bottomPoint.y - 300; Y -= 1) {
            for (let i = 0; i < XList.length; i++) {
                // 逐点取色
                var point = images.pixel(img, XList[i], Y)

                let colorBlue = "#658EFF"  // #658EFF蓝色方块
                let colorYellow = "#FFAF13" // #FFAF13黄色砖块
                let colorYellow2 = "#B25801" // #B25801黄砖裂缝
                // 找方块颜色
                if (colors.isSimilar(colorBlue, colors.toString(point), 4, "diff")
                    || colors.isSimilar(colorYellow, colors.toString(point), 10, "diff")
                    || colors.isSimilar(colorYellow2, colors.toString(point), 4, "diff")) {
                    // 匹配到了其中一种，返回坐标
                    log("计算Y轴的差", bottomPoint.y, Y)
                    // 因为找色是相似色，所以会有1-3个像素的误差
                    brickHeigh = bottomPoint.y - Y + 1
                    log("砖块高度为", brickHeigh)
                    return
                }
            }
        }
    }
}

// 计算顶部高度
function topHeightReckon() {
    for (let y = 120; y < 1000; y += 2) {
        var c0 = images.pixel(img, 10, y);
        var c1 = images.pixel(img, 10, y + 2);
        if (Math.abs(colors.red(c0) - colors.red(c1)) + Math.abs(colors.green(c0) - colors.green(c1)) + Math.abs(colors.blue(c0) - colors.blue(c1)) >= 30) {
            topHeigh = y
            gameRegionY.y1 = y
            return
        }
    }
}

