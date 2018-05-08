const config = require('config');
const pubsub = require('pubsub');
cc.Class({
    extends: cc.Component,
    properties: {
        imagePrefab: {
            default: null,
            type: cc.Prefab
        },
        skeletonPrefab: { //消除骷髅
            default: null,
            type: cc.Prefab
        },
        tip: {
            default: null,
            type: cc.Prefab
        },
        backPrefab: { //返回，退出弹窗
            default: null,
            type: cc.Prefab
        },
        spriteframeList: {
            default: [],
            type: [cc.SpriteFrame]
        },
        spriteActList: {//选中头像集合
            default: [],
            type: [cc.SpriteFrame]
        },
        imageList: [], //头像集合对象
        _graphics: {
            default: null,
            type: cc.Graphics
        },

        ErrorAudio: {
            default: null,
            url: cc.AudioClip
        },
        SuccessAudio: {
            default: null,
            url: cc.AudioClip
        },
        clickAudio: {
            default: null,
            url: cc.AudioClip
        },
        infoBox: {
            default: null,
            type: cc.Node
        },
        infoBtn: {
            default: null,
            type: cc.Node
        },
        rows: 4,    //行
        cols: 4,     //列
        spriteWidth: 80,
        spriteHeight: 80,
        paddingLeft: 200,
        paddingTop: 120,

        _TYPE_DELED: -2,
        _TYPE_INIT: -1,//图片状态初始化
        _canvasGrids: null,
        _lastClickX: -1,
        _lastClickY: -1,
        _map: [],
        _newbit: false,//是否是新手
        _isjam: false,
    },

    onLoad() {
        let that = this;
        Global.result = false;
        this.initWs();
        this.imgFocus = cc.find('Game/imgFocus');
        this._graphics = cc.find("Game/body/line/graphics").getComponent(cc.Graphics);
        this._graphics.lineWidth = 5;

        this._canvasGrids = new Array();
        for (let i = 0; i < this.rows + 2; i++) {
            this._canvasGrids[i] = new Array(i);
            for (let j = 0; j < this.cols + 2; j++) {
                this._canvasGrids[i][j] = -1;
            }
        }
        this.imageList = new Array();
        for (let i = 0; i < this.rows; i++) {
            this.imageList[i] = new Array(i);
            for (let j = 0; j < this.cols; j++) {
                this.imageList[i][j] = null;
            }
        }
        this.initData();    //初始化数据
        this.initMap();     //注册点击事假
        this.addEvent();    //注册事件
        this._tip = cc.instantiate(this.tip);
        this.node.parent.addChild(this._tip);//出入提示场景
        this.node.parent.addChild(cc.instantiate(this.backPrefab));//插入退出房间提示框
    },
    //初始化webSocket
    initWs() {
        let that = this;
        let timer = null;
        pubsub.unsubscribe(undefined, 'body');
        Global.ws.send(JSON.stringify(
            {
                action: 'start',
                roomID: Global.roomID,
                user: Global.userArr
            }
        ));
        // this.initEventHandle();
        let _left = cc.find('Game/head/left/shade');
        let _leftCom = _left.getComponent(cc.ProgressBar);
        let _leftIcon = cc.find('Game/head/licon');
        let _right = cc.find('Game/head/right/shade');
        let _rightCom = _right.getComponent(cc.ProgressBar);
        let _rightIcon = cc.find('Game/head/ricon');
        let _lheadImg = cc.find('Game/head/licon/mask/headImg');
        let _rheadImg = cc.find('Game/head/ricon/mask/headImg');
        let _lSexImg = cc.find('Game/head/left/man');
        let _rSexImg = cc.find('Game/head/right/man');


        pubsub.subscribe('ws.start', 'body', (data) => {
            for (let n in data) {
                let item = data[n];
                if (item.uid == Global.userArr.uid) {//自己
                    _lheadImg.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(item.avatar);
                    Global.getInUrl(config.USER.SEX[item.gender], _lSexImg);

                    cc.find('Game/head/left/name').getComponent(cc.Label).string = Global.nameLen(item.name);
                    if (item.loginCount <= 3) {//前3次提示框
                        that._newbit = true;
                    }
                    if (item.step != 1) {
                        _leftCom.progress = item.step;
                        let action = cc.moveTo(0.1, -item.step * _rightCom.node.width, _leftIcon.y);
                        _leftIcon.runAction(action);
                    }
                } else {
                    _rheadImg.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(item.avatar);
                    Global.getInUrl(config.USER.SEX[item.gender], _rSexImg);
                    cc.find('Game/head/right/name').getComponent(cc.Label).string = Global.nameLen(item.name);
                    if (item.step != 1) {
                        _rightCom.progress = item.step;
                        let action = cc.moveTo(0.1, item.step * _rightCom.node.width, _rightIcon.y);
                        _rightIcon.runAction(timer);
                    }
                }
            }
        });
        pubsub.subscribe('ws.link', 'body', (data) => {

            for (let i in data) {
                let item = data[i];
                if (item.shuffle) { return false }//卡死重置
                if (item.uid == Global.userArr.uid) { //自己的数据
                    if (item.state) {
                        _leftCom.progress = item.step;
                        let action = cc.moveTo(0.1, -item.step * _rightCom.node.width, _leftIcon.y);
                        _leftIcon.runAction(action);

                    } else if (item.state == false) {
                        console.log("后端链接判断没有通过");
                    }
                } else {
                    _rightCom.progress = item.step;
                    timer && _rightIcon.stopAction(timer);
                    timer = cc.moveTo(0.1, item.step * _rightCom.node.width, _rightIcon.y);
                    _rightIcon.runAction(timer);
                }
                if (data[i].step == 0) {
                    that.Gameover(data);
                }
            }
        });
        pubsub.subscribe('ws.quit', 'body', (data) => {
            that._tip.active = true;
            that._tip.getChildByName('text').getComponent(cc.Label).string = config.DESC.SIDE_LEAVE;
            setTimeout(() => {
                that._tip.active = false;
                that.Gameover(data);
            }, 2000)
        });
        pubsub.subscribe('ws.close', 'body', (data) => {
            console.log('断线了')
            Global.breakLine = true;//断线了
            if (!Global._msgPop) {
                Global.showToast(this._tip, config.DESC.NO_INTERNET);
                Global._msgPop = true;
            }
            Global.CloseTimer = setTimeout(() => {
                Global.createWebSocket();
            }, 1000)
        })
    },
    //初始化数据
    initData() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                let newNode = cc.instantiate(this.imagePrefab);//复制预制资源
                let type = Global.map[j][i];
                newNode.getComponent(cc.Sprite).spriteFrame = this.spriteframeList[type];
                newNode.getComponent('pic').isempty = false;
                newNode.getComponent('pic').type = type;

                this.imageList[i][j] = newNode;
                //type>=0,为实际的图片类型值
                this._canvasGrids[i + 1][j + 1] = type;
            }
        }
    },

    //每次消除的过程中，没有可以连接的头像   卡死了，随机头像
    everyLink() {
        if (!this.isJam()) {
            this._isjam = true;
            this.imageList.sort(function (a, b) {
                return Math.random() > .5 ? -1 : 1;
            });
            for (let k in this.imageList) {
                this.imageList[k].sort(function (a, b) {
                    return Math.random() > .5 ? -1 : 1;
                });
            }
            for (let i = 0; i < this.imageList.length; i++) {
                for (let j = 0; j < this.imageList[i].length; j++) {
                    var newNode = this.imageList[i][j];
                    var index = j * this.rows + i;
                    var type = index % this.spriteframeList.length;

                    if (newNode.active) {
                        this._canvasGrids[i + 1][j + 1] = newNode.getComponent('pic').type;
                    } else {
                        this._canvasGrids[i + 1][j + 1] = this._TYPE_DELED;
                    }
                    newNode.setPosition(cc.p(this.spriteWidth * i - this.paddingLeft, this.spriteHeight * j - this.paddingTop))
                    newNode.getComponent('pic').pointX = i;
                    newNode.getComponent('pic').pointY = j;

                }
            }
            this.everyLink();//递归检测
        } else {
            if (this._isjam) {
                this.postMap(this._canvasGrids);
                this._isjam = false;
            }
            return true;
        }
    },
    postMap(arr1) {
        var arr3 = [];
        for (var j = 0; j < 10; j++) {
            var arr2 = [];
            for (var i = 0; i < arr1.length - 2; i++) {
                if (arr1[i + 1][j + 1] == -2) {
                    arr2.push(-1)
                } else {
                    arr2.push(arr1[i + 1][j + 1]);
                }
            }
            arr3.push(arr2)
        }
        Global.ws.send(JSON.stringify({
            action: 'reset',
            roomID: Global.roomID,
            map: arr3,
            user: Global.userArr
        }))
    },
    initMap() {
        let that = this;
        let timer = null;
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                let newNode = this.imageList[i][j];
                that.node.addChild(newNode);
                newNode.setPosition(cc.p(this.spriteWidth * i - this.paddingLeft, this.spriteHeight * j - this.paddingTop))
                newNode.getComponent('pic').pointX = i;
                newNode.getComponent('pic').pointY = j;
                newNode.on(cc.Node.EventType.TOUCH_END, function (e) {
                    if (timer) return;
                    if (Global.breakLine) { Global.showToast(that._tip, config.DESC.NO_INTERNET); return false }//断线不准连接图像
                    let getpic = this.getComponent('pic');
                    if (that._lastClickX == getpic.pointX && that._lastClickY == getpic.pointY) {//点击本身
                        return false
                    }
                    if (that._lastClickX == -1 || that._lastClickX == -1) { //储存第一次点击对象
                        that.clickActive(that, this);
                        Global.playMusic(cc.audioEngine.playEffect, that.clickAudio, false);
                    } else if (that.imageList[that._lastClickX][that._lastClickY].getComponent('pic').type == getpic.type) {
                        //相同的图片
                        if (that.isLinked(+that._lastClickX, +that._lastClickY, +getpic.pointX, +getpic.pointY)) {//并且可以连通
                            that.skeleton(+that._lastClickX, +that._lastClickY, +getpic.pointX, +getpic.pointY);

                            timer = setTimeout(() => {
                                timer = null;
                                (function (x1, y1, x2, y2) {//匿名函数保存x,y值，防止快速点击x,y值被覆盖
                                    that.clearLinked(x1, y1, x2, y2);
                                    that._lastClickX = -1;
                                    that._lastClickY = -1;

                                })(+that._lastClickX, +that._lastClickY, +getpic.pointX, +getpic.pointY)
                            }, 100)


                            that.imgFocus.getComponent(cc.Sprite).spriteFrame = null;
                        } else {//错误提示
                            that.clickActive(that, this);
                            Global.playMusic(cc.audioEngine.playEffect, that.ErrorAudio, false);
                        }
                    } else {//错误提示，不是同一张图片
                        that.clickActive(that, this);
                        Global.playMusic(cc.audioEngine.playEffect, that.ErrorAudio, false);
                    }
                })
            }
        }
    },
    // 点击动作,动画处理
    clickActive(that, $this) {
        let getpic = $this.getComponent('pic');
        that._lastClickX = getpic.pointX;
        that._lastClickY = getpic.pointY;
        that.imgFocus.getComponent(cc.Sprite).spriteFrame = that.spriteActList[$this.getComponent('pic').type];
        that.imgFocus.setContentSize(80, 82);
        that.imgFocus.setPosition(cc.p($this.x, $this.y));
        that.imgFocus.runAction(
            cc.repeat(
                cc.sequence(
                    cc.scaleTo(0.1, 0.9, 0.9),
                    cc.scaleTo(0.1, 1.1, 1.1),
                    cc.scaleTo(0.1, 1, 1)
                ), 1)
        );
    },
    //骷髅动画
    skeleton(x1, y1, x2, y2) {
        let that = this;
        let instantEffect = cc.instantiate(that.skeletonPrefab);
        that.imageList[x1][y1].getComponent(cc.Sprite).spriteFrame = instantEffect.getComponent(cc.Sprite).spriteFrame;
        instantEffect.x = that.imageList[x1][y1].x;
        that.imageList[x1][y1].setContentSize(80, 82)
        instantEffect.y = that.imageList[x1][y1].y;

        that.imageList[x2][y2].getComponent(cc.Sprite).spriteFrame = instantEffect.getComponent(cc.Sprite).spriteFrame;
        instantEffect.x = that.imageList[x2][y2].x;
        that.imageList[x2][y2].setContentSize(80, 82)
        instantEffect.y = that.imageList[x2][y2].y;

    },
    //消除处理
    clearLinked(x1, y1, x2, y2) {
        let that = this;
        // 消除动画
        this._canvasGrids[x1 + 1][y1 + 1] = this._TYPE_DELED;
        this._canvasGrids[x2 + 1][y2 + 1] = this._TYPE_DELED;
        this.imageList[x1][y1].active = false;
        this.imageList[x2][y2].active = false;

        Global.playMusic(cc.audioEngine.playEffect, that.SuccessAudio, false);
        this._graphics.clear();
        Global.ws.send(JSON.stringify(
            {
                action: 'link',
                p1: { x: x1, y: y1 },
                p2: { x: x2, y: y2 },
                roomID: Global.roomID,
                user: Global.userArr
            }
        ));
        Global.pairs -= 1;
        if (Global.pairs > 0) {
            this.everyLink();//检测是否卡死
        }
    },

    /* 是否连通 
     type=true，说明是程序判断是否有可以连接的对象，
     type为空，说明是用户正常连接头像
    */
    isLinked(x1, y1, x2, y2, type) {
        let tmpXY = [];
        let tmpAbsXY = [];
        if (this.matchBlockLine(x1, y1, x2, y2)) {//直线
            if (type) { return true }
            tmpAbsXY = this.getAbsXY(x1, y1);
            this._graphics.moveTo(tmpAbsXY[0], tmpAbsXY[1]);
            tmpAbsXY = this.getAbsXY(x2, y2);
            this._graphics.lineTo(tmpAbsXY[0], tmpAbsXY[1]);
            this._graphics.stroke();
            return true;
        } else {
            tmpXY = this.matchBlockCorner(x1, y1, x2, y2, null);
            if (tmpXY) {
                if (type) { return true }
                //一个转角
                tmpAbsXY = this.getAbsXY(x1, y1);
                this._graphics.moveTo(tmpAbsXY[0], tmpAbsXY[1]);
                tmpAbsXY = this.getAbsXY(tmpXY[0], tmpXY[1]);
                this._graphics.lineTo(tmpAbsXY[0], tmpAbsXY[1]);
                tmpAbsXY = this.getAbsXY(x2, y2);
                this._graphics.lineTo(tmpAbsXY[0], tmpAbsXY[1]);
                this._graphics.stroke();
                return true;
            } else {
                tmpXY = this.matchBlockUnfold(x1, y1, x2, y2);
                if (tmpXY) {//两个转角
                    if (type) { return true }
                    tmpAbsXY = this.getAbsXY(x1, y1);
                    this._graphics.moveTo(tmpAbsXY[0], tmpAbsXY[1]);
                    tmpAbsXY = this.getAbsXY(tmpXY[0], tmpXY[1]);
                    this._graphics.lineTo(tmpAbsXY[0], tmpAbsXY[1]);
                    tmpAbsXY = this.getAbsXY(tmpXY[2], tmpXY[3]);
                    this._graphics.lineTo(tmpAbsXY[0], tmpAbsXY[1]);
                    tmpAbsXY = this.getAbsXY(x2, y2);
                    this._graphics.lineTo(tmpAbsXY[0], tmpAbsXY[1]);
                    this._graphics.stroke();
                    return true;
                }
            }
        }
    },
    //直线
    matchBlockLine(x1, y1, x2, y2) {
        if (x1 != x2 && y1 != y2) {
            return false;
        }
        if (x1 == x2) {//同一列
            if (x1 < 0 || x1 >= this.rows) {
                return true;
            }
            let Ymin = Math.min(y1, y2) + 1;
            let Ymax = Math.max(y1, y2);
            for (Ymin; Ymin < Ymax; Ymin++) {
                if (this._canvasGrids[x1 + 1][Ymin + 1] > this._TYPE_INIT) {
                    return false;
                }
            }
        } else if (y1 == y2) {//同一行
            if (y1 < 0 || y1 >= this.cols) {
                return true;
            }
            let Xmin = Math.min(x1, x2) + 1;
            let Xmax = Math.max(x1, x2);
            for (Xmin; Xmin < Xmax; Xmin++) {
                if (this._canvasGrids[Xmin + 1][y1 + 1] > this._TYPE_INIT) {
                    return false;
                }
            }
        }
        return true;
    },
    //根据矩阵XY获取绝对坐标
    getAbsXY(x, y) {
        let absX = 0;
        let absY = 0;
        if (x < 0) {
            absX = this.node.parent.x + this.imageList[0][0].x - this.imageList[0][0].width + 15;
        } else if (x >= this.rows) {
            absX = this.node.parent.x + this.imageList[this.rows - 1][0].x + this.imageList[0][0].width - 15;
        } else {
            absX = this.node.parent.x + this.imageList[x][0].x;
        }
        if (y < 0) {
            absY = this.node.parent.y + this.imageList[0][0].y - this.imageList[0][0].height + 15;
        } else if (y >= this.cols) {
            absY = this.node.parent.y + this.imageList[0][this.cols - 1].y + this.imageList[0][0].height - 15;
        } else {
            absY = this.node.parent.y + this.imageList[0][y].y;

        }
        return [absX, absY];
    },
    /*
        有中心往外展开搜索路径，某个方向当碰得到图片时，合格党项就不再继续搜索
        搜索到路径时，返回两个专角点坐标 x3,y3,x4,y4
    */
    matchBlockUnfold(x1, y1, x2, y2) {
        let result;
        let x3 = 0;
        let y3 = 0;
        let canUp = true;
        let canDown = true;
        let canLeft = true;
        let canRight = true;
        for (let i = 1; i < this.rows; i++) {
            // 上
            x3 = x1;
            y3 = y1 + i;
            if (canUp && y3 <= this.cols) {
                canUp = this._canvasGrids[x3 + 1][y3 + 1] <= this._TYPE_INIT;
                result = this.matchBlockUnfold_axis(x1, y1, x2, y2, x3, y3, false);
                if (result) { return result }
            }
            //下
            x3 = x1;
            y3 = y1 - i;
            if (canDown && y3 >= -1) {
                canDown = this._canvasGrids[x3 + 1][y3 + 1] <= this._TYPE_INIT;
                result = this.matchBlockUnfold_axis(x1, y1, x2, y2, x3, y3, false);
                if (result) { return result }
            }
            //左
            x3 = x1 - i;
            y3 = y1;
            if (canLeft && x3 >= -1) {
                canLeft = this._canvasGrids[x3 + 1][y3 + 1] <= this._TYPE_INIT;
                result = this.matchBlockUnfold_axis(x1, y1, x2, y2, x3, y3, true);
                if (result) { return result }
            }
            //右
            x3 = x1 + i;
            y3 = y1;
            if (canRight && x3 <= this.rows) {
                canRight = this._canvasGrids[x3 + 1][y3 + 1] <= this._TYPE_INIT;
                result = this.matchBlockUnfold_axis(x1, y1, x2, y2, x3, y3, true);
                if (result) { return result }
            }
        }
        return null;
    },
    matchBlockUnfold_axis(x1, y1, x2, y2, x3, y3, isAxis_X) {
        let tmpXY = [];
        if (this._canvasGrids[x3 + 1][y3 + 1] <= this._TYPE_INIT) {
            tmpXY = this.matchBlockCorner(x3, y3, x2, y2, isAxis_X);
            if (tmpXY) {
                return [x3, y3].concat(tmpXY);
            }
        }
        return null;
    },
    /*
    第一个转角
    搜索到路径时，返回转角坐标x3,y3
    */
    matchBlockCorner(x1, y1, x2, y2, isAxis_X) {
        let result;
        //直线返回
        if (x1 == x2 || y1 == y2) {
            return null;
        }
        // 转角点1(x1, y2)，Y方向
        if (this._canvasGrids[x1 + 1][y2 + 1] <= this._TYPE_INIT && isAxis_X != false) {
            result = this.matchBlockCorner_point(x1, y1, x2, y2, x1, y2);
            if (result) { return result }
        }
        //转角点2（x2，y1) X方向
        if (this._canvasGrids[x2 + 1][y1 + 1] <= this._TYPE_INIT && isAxis_X != true) {
            result = this.matchBlockCorner_point(x1, y1, x2, y2, x2, y1);
            if (result) { return result }
        }
        return null;
    },
    // 转角逻辑
    matchBlockCorner_point(x1, y1, x2, y2, x3, y3) {
        let stMatch = this.matchBlockLine(x1, y1, x3, y3);
        if (stMatch) {
            let tdMatch = this.matchBlockLine(x3, y3, x2, y2);
            if (tdMatch) {
                return [x3, y3];
            }
        }
        return null;
    },
    newbit() {//新手提示
        if (this._newbit) {
            this.infoBox.active = true;
        }
    },
    /*
        判断是否有卡死（可以连接）的头像
        没有随机剩余头像位置
    */
    isJam() {
        let List = this.imageList;
        for (let i in List) {
            for (let j in List[i]) {
                var item = List[i][j];
                if (item.active && this.DIYrandom(i, j)) {
                    return true
                }
            }
        }
        return false;//不能连接
    },
    DIYrandom(oldi, oldj) {//可以连接返回true
        let List = this.imageList;
        for (let i in List) {
            for (let j in List[i]) {
                let item = List[i][j];
                if (item.active) {
                    let getpic = item.getComponent('pic');
                    var condition = List[oldi][oldj].getComponent('pic').type == getpic.type && //相同图片
                        (!(oldi == i && oldj == j)) &&              //不是自己本省
                        this.isLinked(+i, +j, +oldi, +oldj, true)    //是都可以连接
                    if (condition) {
                        return true
                    }
                }
            }
        }
    },
    Gameover(data) {
        cc.find('Game/result').cacheData = data;
        cc.find('Game/result').actType = "quit";
        cc.find('Game/result').active = true;
    },
    addEvent() {
        this.infoBtn.once('click', (e) => {
            this.infoBox.active = false;
        })
    },
    start() {
    },
});
