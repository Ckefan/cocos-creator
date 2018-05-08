const config = require('config');
const pubsub = require('pubsub');
cc.Class({
    extends: cc.Component,
    properties: {
        content: {
            default: null,
            type: cc.Node
        },
        leftUser: { //左边头像
            default: null,
            type: cc.Node
        },
        rightUser: {
            default: null,
            type: cc.Node
        },
        addrows: {//对方给我加行数
            default: null,
            type: cc.Node
        },
        addrowImg: {//对方给我加行砖块
            default: null,
            type: cc.Node
        },
        sendBrick: {//发射砖块
            default: null,
            type: cc.Prefab
        },
        brick: { //普通方块
            default: null,
            type: cc.Prefab
        },
        glod_brick: { //金砖块
            default: null,
            type: cc.Prefab
        },

        glod_bricking: { //金砖块碎裂
            default: null,
            type: cc.Prefab
        },
        back: {
            default: null,
            type: cc.Prefab
        },
        tip: {
            default: null,
            type: cc.Prefab
        },
        clearAudio: {//消除砖块声音
            default: null,
            url: cc.AudioClip
        },
        addBrickAudio: {//新增砖块声音
            default: null,
            url: cc.AudioClip
        },
        deadAudio: {
            default: null,
            url: cc.AudioClip
        },

        ishandRemind: false,
        speed: 10,
        sendY: 0,//发射砖块的目标Y轴
        rows: 10,//几行
        base: false,//到底了
        brick_arr: [],
        removeArr: 0,//移出砖块数据（消除几行，坐标），用于传给后端
        _sideAddInfo: null,//对方加行提示延时器
        _selfAddInfo: null,//自己加行提示延时器
        _shoot: null,
    },
    onLoad: function () {
        Global.result = false;
        this.initDate();
        this.initBrick();//执行初始化生成180行砖块
        this.setInputControl();//注册用户点击事件
        this._tip = cc.instantiate(this.tip);
        this.node.parent.addChild(this._tip);//出入提示场景
        this.node.parent.addChild(cc.instantiate(this.back));//插入退出房间提示框
        this.content.y = cc.winSize.height / 2;
        let sidesite = cc.find('game/sidesite');//对方进度
        sidesite.active = true;

        let leftSex = this.leftUser.getChildByName('cont').getChildByName('sex');
        let leftName = this.leftUser.getChildByName('cont').getChildByName('name');
        let leftImg = this.leftUser.getChildByName('icon').getChildByName('headImg');
        let rightSex = this.rightUser.getChildByName('cont').getChildByName('sex');
        let rightName = this.rightUser.getChildByName('cont').getChildByName('name');
        let rightImg = this.rightUser.getChildByName('icon').getChildByName('headImg');
        pubsub.unsubscribe(undefined, 'body');

        Global.send({ action: 'start' });
        // 开始游戏，打入用户信息
        pubsub.subscribe('ws.start', 'body', (data) => {
            for (let item of data) {
                if (item.uid == Global.userArr.uid) {//自己
                    leftImg.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(item.avatar);
                    Global.getInUrl(config.USER.SEX[item.gender], leftSex);
                    leftName.getComponent(cc.Label).string = Global.nameLen(item.name);
                    if (item.loginCount <= 3) {//前3次提示框
                        this.handRemind(item.map[0]);
                    }
                } else {
                    rightImg.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(item.avatar);
                    Global.getInUrl(config.USER.SEX[item.gender], rightSex);
                    rightName.getComponent(cc.Label).string = Global.nameLen(item.name);
                }
            }
        })
        // 消除砖块结果
        pubsub.subscribe('ws.shoot', 'body', (data) => {
            for (let i of data) {
                if (i.uid == Global.userArr.uid) {
                    if (i.rows) {
                        this.selfAddInfo(i.rows, i.rowsdata);//自己被加行，提示
                        this.addRowBrick(i.rows, i.rowsdata);//加砖
                    }
                    let pointer = i.pointer * cc.winSize.height;
                    if (pointer && pointer < 320) {
                        sidesite.y = pointer;
                        let newAction = cc.moveTo(0.2, sidesite.x, pointer);
                        sidesite.runAction(newAction);
                    }
                }
            }
        })
        // 游戏结束
        pubsub.subscribe('ws.gameover', 'body', (data) => {
            for (let i of data) {
                if (i.uid == Global.userArr.uid) {
                    this.base = true;
                    this.gameOver(data);
                }
            }
        })
        pubsub.subscribe('ws.quit', 'body', (data) => {
            this._tip.active = true;
            this._tip.getChildByName('text').getComponent(cc.Label).string = config.DESC.SIDE_LEAVE;
            setTimeout(() => {
                this._tip.active = false;
                this.base = true;
                this.gameOver(data);
            }, 2000)
        });
        pubsub.subscribe('ws.close', 'body', (data) => {
            cc.log('断线了')
            Global.breakLine = true;//断线了
            if (!Global._msgPop) {
                Global.showToast(this._tip, config.DESC.NO_INTERNET);
                Global._msgPop = true;
            }
            Global.CloseTimer = setTimeout(() => {
                Global.createWebSocket();
            }, 1000)
        });
        this.moveBox();
    },
    moveBox() {
        setInterval(() => {
            if (this.base) return;
            if (this.brick_arr && this.brick_arr.length != 0) {
                let contY = this.content.y;
                this.content.y -= cc.winSize.height / this.speed;
                this.sendY = this.brick_arr[i][0].getBoundingBoxToWorld().y;
                let firstBrick = this.brick_arr[0][0].y;
                if (Math.floor(contY) + firstBrick - 45 < - cc.winSize.height / 2) {//到底了
                    this.base = true;
                    Global.playMusic(cc.audioEngine.playEffect, this.deadAudio, false);//触底
                    Global.send({ action: 'gameover' });
                }
            }
        }, 60)
    },
    //监听点击事件
    setInputControl: function () {
        var that = this;
        this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
            var one = that.node.width / 4;
            var target = event.getCurrentTarget();//先获取事件绑定的节点
            var loca = target.convertToNodeSpaceAR(event.getLocation());
            let handRemind = cc.find('game/info');
            if (handRemind.active) {
                handRemind.active = false;
            }
            //判断点击位置
            if (loca.x < -one) {
                that.clickScreen(0);//消砖块方法
            }
            if (loca.x < 0 && loca.x > -one) {
                that.clickScreen(1);
            }
            if (loca.x > 0 && loca.x < one) {
                that.clickScreen(2);
            }
            if (loca.x > one) {
                that.clickScreen(3);
            }
        })
    },
    // 点击事件调用方法
    clickScreen: function (pointer) {
        let isBroken = false;//是否遇到了金砖块
        let removeB = false;//此次点击是否消除了砖块
        let isshow = false;//此次点击展示了砖块（展示了砖块就不能新建砖块）
        let isfill = false;
        for (var i = 0; i < this.brick_arr.length; i++) {//第一排有三个展示且当前列为空的时候能消，第一排能消后排才能消，
            if (isBroken) { break }//遇到了金砖块，打碎当前排，后排停止操作
            if (this.brick_arr[i][0].y < this.node.height / 2 - this.content.y) {//屏幕上能看见的砖块
                let VacantSeat = this.VacantSeat(this.brick_arr[i]);
                if (i == 0) {
                    if (VacantSeat.count == 0) {//此列满砖
                        if (VacantSeat.type == 1) {//普通砖
                            this.removeBrick(i, pointer);
                            removeB = true;
                        } else if (VacantSeat.type == 2) {//金砖
                            this.hideBrick(i, pointer);
                            this.brokenBrick(i);
                        }
                        i--;
                        continue;
                    } else {
                        if (removeB && this.brick_arr[i][pointer].opacity != 0) { break }//此次点击消除了或者显示了砖块，下一排的当前列没有不是空的话，停止操作
                    }
                }
                if (this.brick_arr[i][pointer].opacity == 0) {//点击的列为空
                    if (VacantSeat.count == 1) {//当前排只有一个空位
                        if (i == 0) {//第一排
                            if (VacantSeat.type == 1) {//普通砖块
                                this.removeBrick(i, pointer);
                                removeB = true;
                                i--;
                            } else if (VacantSeat.type == 2) {//特殊砖块
                                isBroken = true;
                                this.brokenBrick(i);
                            }
                        } else { //第二排且没有消除砖块
                            if (!removeB) {
                                Global.getInUrl(config.USER.SEX[6], this.brick_arr[i][pointer].getChildByName('bg'))
                                this.brick_arr[i][pointer].opacity = 255;
                                this.brick_arr[i][pointer].fillAnchor = true;
                            }
                        }
                    } else {//当前排有多个空位时，给当前列的位置添加砖块
                        this.showBrick(i, pointer);
                        isshow = true;
                    }
                } else {//点击的列不为空
                    if (!removeB && !isshow) {//此次点击没有消除砖块
                        this.brick_arr.unshift(this.createRowBrick(i, pointer));
                        i--;
                        break;
                    }
                    if (isshow) {
                        break;
                    }
                }
            }
        }
        this.SendBrick(pointer);
    },
    // 发射砖块消失事件
    SendBrick: function (pointer) {
        let brick = cc.instantiate(this.sendBrick);
        this.node.addChild(brick);
        let positX = this.node.width / 4 * (pointer - 2);
        let posotY = -cc.winSize.height / 2;
        brick.x = positX;
        brick.y = posotY;
        let myAction = cc.sequence(cc.moveTo(0.1, cc.p(positX, this.sendY + posotY + 90)), cc.callFunc(() => {
            brick.destroy();
            // 发射动画完成，想后台发送，消除几行数据，用户给对方加行
            if (this.removeArr) {//消除
                Global.send({
                    action: 'shoot',
                    rows: this.removeArr,
                    pointer: (this.sendY + posotY) / cc.winSize.height
                })
                this.sideAddInfo(this.removeArr);//对方加行提示
                Global.playMusic(cc.audioEngine.playEffect, this.clearAudio, false);//清除砖块
                this.removeArr = 0;
            } else {//加砖
                Global.playMusic(cc.audioEngine.playEffect, this.addBrickAudio, false);//添加砖块声音
            }
        }));
        brick.runAction(myAction)
    },
    VacantSeat(row) {//当前排只有一个空位;是1普通砖还是2金砖
        let count = 0;
        let type = 0;
        for (let i of row) {
            if (i.opacity == 0) {
                count++;
            }
            if (!type) {
                type = i.name == "cbrick" || i.name == "cglod_bricking" || i.broken ? 1 : 2;
            }
        }
        return { count, type };//返回当前排有几个空位和当前排是什么砖块
    },
    showBrick(i, pointer) {//显示隐藏的砖块
        for (let j of this.brick_arr[i].entries()) {
            if (j[0] == pointer) {
                j[1].opacity = 255;
            }
        }
    },
    hideBrick(i, pointer) {
        for (let j of this.brick_arr[i]) {
            if (j.fillAnchor) {
                j.opacity = 0;
            }
        }
    },
    createRowBrick(i, pointer, instantiate) {//生成一排砖块
        let instant = instantiate || 0;
        let arr = [];
        for (let j = 0; j < 4; j++) {
            let newBrick = cc.instantiate(this.brick);
            newBrick.height = cc.winSize.height / this.rows;
            let positX = this.node.width / 4 * j + this.node.width / 8;
            let positY = this.brick_arr[i][0].y - newBrick.height;
            if (instant == 0) {
                newBrick.opacity = pointer == j ? 255 : 0;
            } else {
                newBrick.opacity = pointer == j ? 0 : 255;
            }
            newBrick.setPosition(cc.p(positX, positY));
            this.content.insertChild(newBrick, instant);
            arr.push(newBrick);
        }
        return arr;
    },
    removeBrick(i, pointer) {//删除一排砖块
        this.removeArr = this.removeArr < 4 ? this.removeArr + 1 : 4;
        for (let j of this.brick_arr[i].entries()) {
            j[1].opacity = 255;
            let bg = j[1].getChildByName('bg');
            bg.scale = 1;
            bg.height = 160;
            let vanish = bg.getComponent(cc.Animation);
            if (!j[1].isGlod) {//普通砖
                if (j[0] == pointer) {//击中部分
                    vanish.playAdditive('actVanish');
                } else {
                    vanish.playAdditive('vanish');
                }
            } else {//金砖
                if (j[0] == pointer) {//击中部分
                    vanish.playAdditive('actGlodVanish');
                } else {
                    vanish.playAdditive('glodVanish');
                }
            }
        }
        this.brick_arr.splice(i, 1);
    },
    brokenBrick(i) {//破碎金砖块
        for (let j of this.brick_arr[i]) {
            j.broken = true;
            Global.getInUrl(config.USER.SEX[8], j.getChildByName('bg'));
        }
    },
    initDate() {
        Global._shoot = setInterval(() => {
            let posotY = -cc.winSize.height / 2;
            Global.send({
                action: 'shoot',
                rows: 0,
                pointer: (this.sendY + posotY) / cc.winSize.height
            })
        }, 1000)
    },
    //初始化生成180行砖块方法
    initBrick() {
        for (let i = 0; i < Global.map.length; i++) {
            this.brick_arr[i] = [];
            let type = this.brickType(Global.map[i]);
            for (let j = 0; j < Global.map[i].length; j++) {
                let item = Global.map[i][j];
                let newNode;
                if (type == 1) {//普通砖块
                    if (item == 0) {
                        newNode = cc.instantiate(this.brick);
                        newNode.opacity = 0;
                    } else {
                        newNode = cc.instantiate(this.brick);
                    }
                } else if (type == 2) { //金砖块
                    if (item == 0) {
                        newNode = cc.instantiate(this.glod_brick);
                        newNode.opacity = 0;
                    } else {
                        newNode = cc.instantiate(this.glod_brick);
                    }
                    newNode.isGlod = true;
                }
                newNode.height = cc.winSize.height / this.rows;
                let positX = this.node.width / 4 * j + this.node.width / 8;
                let positY = newNode.height * (i + 1);
                newNode.setPosition(cc.p(positX, positY));
                this.brick_arr[i][j] = newNode;
                this.content.insertChild(newNode, 0);
            }
        }
    },
    brickType(data) {//检测后台出入数据的砖块类型    0为空位；1为普通砖，2为金砖
        for (let i of data) {
            if (i != 0) {
                return i;
            }
        }
    },
    addRowBrick(rows, rowsdata) {//被别人加行
        for (let i = 0; i < this.brick_arr.length; i++) {
            let item = this.brick_arr[i];
            if (item[0].y < this.node.height / 2 - this.content.y) {//看的见得砖块
                for (let j = 0; j < item.length; j++) {
                    item[j].y -= rows * item[j].height;
                }
            } else {//看不见得砖块
                for (let n = 0; n < rows; n++) {
                    let createBrick = this.createRowBrick(i, rowsdata[n], rows);
                    this.brick_arr.splice(i, 0, createBrick);

                }
                return;
            }
        }

    },
    // 手势提醒方法
    handRemind(map) {
        if (this.ishandRemind) { return; }
        let handRemind = cc.find('game/info');
        let x;
        for (let i of map.entries()) {
            if (i[1] == 0) {
                x = this.node.width / 4 * (i[0] - 2)
                break;
            }
        }
        handRemind.x = x;
        handRemind.active = true;
        this.ishandRemind = true;
    },
    //对方加行提示
    sideAddInfo(rows) {
        this._sideAddInfo && clearTimeout(this._sideAddInfo);
        let addInfo = cc.find("game/addInfo");
        addInfo.getComponent(cc.RichText).string = `给对方<color=#FB8321>+${rows}<color>行`;
        addInfo.active = true;
        this._sideAddInfo = setTimeout(() => {
            addInfo.active = false;
            this._sideAddInfo = null;
        }, 500)
    },
    // 自己被加行，头部数字提示
    selfAddInfo(rows, rowsdata) {
        if (this._selfAddInfo) {
            this.addrows.stopAllActions();
            clearTimeout(this._selfAddInfo);
            this.addrows.y -= 20;
            this.addrows.scale = 0;
        }
        this.addrows.getComponent(cc.Label).string = `+${rows}`;
        let newAction = cc.sequence(
            cc.spawn(cc.scaleTo(0.2, 1, 1), cc.moveTo(0.2, this.addrows.x, this.addrows.y + 20)),
            cc.callFunc(() => {
                this._selfAddInfo = setTimeout(() => {
                    this.addrows.y -= 20;
                    this.addrows.scale = 0;
                    this._selfAddInfo = null;
                }, 800)
            })
        );
        this.addrows.runAction(newAction);

        let newImgAction = cc.sequence(cc.spawn(
            cc.scaleTo(0.2, 1, 1),
            cc.moveTo(0.2, rowsdata[0] == 0 ? -240 : -400, -this.addrowImg.height)),
            cc.callFunc(() => {
                setTimeout(() => {
                    this.addrowImg.scale = 0;
                    this.addrowImg.setPosition(0, 0);
                }, 50)
            })
        )
        this.addrowImg.runAction(newImgAction)

    },
    newbit() {//新手提示
        if (this._newbit) {
            this.infoBox.active = true;
        }
    },
    update: function (dt) {
    },
    gameOver(data) {
        Global._shoot && clearInterval(Global._shoot);
        Global._shoot = null;
        cc.find('game/result').cacheData = data;
        cc.find('game/result').active = true;
    }
});
