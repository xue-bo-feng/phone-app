var config = {
    socketurl: '',
    "debug": true, //调试模式下会显示一个调试信息
};

function log(msg) {
    var appVersion = db2.getVal("appVersion");
    if (config["debug"] == true && appVersion.indexOf("00.00.") >= 0) {
        console.log("[" + api.winName + (api.frameName ? "&" + api.frameName : "") + ":" + api.systemType + "]" + msg);
    }
}

function sunmiprint(printhtml,order_num) {

    var dataJsonPrint = [];

    dataJsonPrint.push({
        rowtype: 'setFontSize',
        fontsize: 26
    });

    printhtml.split("\n").forEach(function(thistext) {
        if (thistext.indexOf("-----------------") >= 0) {//替换模板中的横线
            dataJsonPrint.push({
                rowtype: 'printTypeHorizontalLine', //画特殊水平线
                type: 0, //水平线类型（0至11）
            });
        } else {
            dataJsonPrint.push({
                rowtype: 'printOriginalText',
                text: thistext + "\n"
            });
        }
    });

    dataJsonPrint.push({//打印条形码
        rowtype: 'printBarCode',
        data: order_num,
        symbology:7,//0-8
        width:160, //条码宽度： 取值2至6, 默认2
        height:70, //条码高度：取值1到255, 默认162
        textposition :0 //文字位置 0--不打印文字, 1--文字在条码上方, 2--文字在条码下方, 3--条码上下方均打印
    });

    dataJsonPrint.push({
        rowtype: 'lineWrap',
        n: 6
    });

    var doprint = function(printJsonData) {
        window.sunmiPrinterObj.printData({
            data: printJsonData
        }, function(ret, err) {
            log(JSON.stringify(ret));
        });
    };

    window.sunmiPrinterObj = api.require('sunmiPrinter');
    try {
        sunmiPrinterObj.startService(function(ret, err) { //开启打印服务
            sunmiPrinterObj.printerInit(function(ret, err) { //初始化打印机
                doprint(dataJsonPrint);
            });
        });
    } catch (e) {
        log(JSON.stringify(e));
    }
}

//单地址转绝对地址（转成含有域名的地址）
function toAbsUrl(locationstring, isnocache) {
    if (!locationstring) {
        return locationstring;
    }
    if (locationstring.indexOf("http") < 0) {
        locationstring = locationstring.replace("./", "");
        locationstring = locationstring.replace("/taobaokehxp", "");
        locationstring = locationstring.replace("/public", "");
        var remateurl = db2.getVal("remoteurl") + locationstring;

        if (isset(isnocache) == true) {
            api.imageCache({
                url: remateurl
            }, function(ret, err) {
                log(JSON.stringify(ret));
            });
        }
        return remateurl;
    } else {
        return locationstring;
    }
}

//图片单地址转绝对地址（转成含有域名的地址）
function ImgtoAbsUrl(locationstring, width, height, type) {

    if (!locationstring) {
        return locationstring;
    }
    if (locationstring.indexOf("http") < 0) {
        locationstring = locationstring.replace("./", "");
        var remateurl = db2.getVal("remoteurl") + locationstring;

        remateurl = db2.getVal("remoteurl") + "index.php?g=Api&m=Base&a=imgautosize&imgsrc=" + escape(remateurl) + "&w=" + (Math.ceil(width) || 100) + "&h=" + (Math.ceil(height) || 100) + "&type=" + (type || 1);

        return remateurl;
    } else {
        return locationstring;
    }
}
//首页启动里初始化,api已经初始化时调用
function appinit() {
    //检测更新
    setTimeout(function() {
        checkAndUploadApp();
    }, 8 * 1000); //8秒后检测更新
    //将加密数据载入本地库里
    PubApp.inittoken();
    db2.setVal("runApptimestamp", (new Date()).valueOf()); //每次运行APP都不同

    db2.setVal("appVersion", api.appVersion);
    //设置iOS头部为
    api.setStatusBarStyle({
        style: 'light'
    });
    db.init();
}
//openWin("https://item.taobao.com/item.htm?spm=a21hy.85651.390164.1.9gNH2U&id=534001653335")
function openWin(name, pageParam) {
    var oldname = name;
    var reload = true;

    if (name == "goodsdetail") {
        db2.setVal("historywinName", api.winName);
        db2.setVal("historyframeName", api.frameName);
    }

    var res = {};
    if (pageParam && pageParam != "" && typeof pageParam != undefined) {
        var string = pageParam.split('&');
        for (var i = 0; i < string.length; i++) {
            var str = string[i].split('=');
            res[str[0]] = str[1];
        }
    }
    var url = name;
    if (url.indexOf("http") < 0) {
        if (url.indexOf(".html") < 0) {
            url += ".html";
        }
    } else {
        url = "browser.html";
        res["urls"] = name;
    }
    var windowname = oldname;
    log("Open Windows->name:'" + windowname + "';'pageParam'=>" + pageParam);
    api.openWin({
        name: windowname,
        url: url,
        scrollToTop: true,
        vScrollBarEnabled: false,
        hScrollBarEnabled: false,
        bgColor: 'rgba(0,0,0,0)',
        reload: reload,
        allowEdit: true,
        animation: {
            type: "push", //动画类型（详见动画类型常量）
            subType: "from_right", //动画子类型（详见动画子类型常量）
            duration: 300 //动画过渡时间，默认300毫秒
        },
        rect: {
            x: 0,
            y: 0
        },
        pageParam: res
    });
}


function share(jsonobj) {
    api.showProgress({
        title: "创建分享",
        model: 0
    });
    var sharedModule = api.require('shareAction');
    sharedModule.share(jsonobj);
    api.hideProgress();
}
var mask;
//app 公用函数
var PubApp = {
        inittoken: function() {
            db2.setVal("remoteurl", api.loadSecureValue({
                sync: true,
                key: 'remoteurl'
            }));
        },
        "toast": function(msg) {
            api.toast({
                msg: msg,
                location: 'middle'
            });
        },
        readCookie: function(name) {
            var cookieValue = "";

            var search = name + "=";

            if (document.cookie.length > 0) {
                offset = document.cookie.indexOf(search);
                if (offset != -1) {
                    offset += search.length;
                    end = document.cookie.indexOf(";", offset);
                    if (end == -1) end = document.cookie.length;
                    cookieValue = unescape(document.cookie.substring(offset, end))
                }
            }
            return cookieValue;
        },

        writeCookie: function(name, value, hours) {

            var expire = "";
            if (hours != null) {
                expire = new Date((new Date()).getTime() + hours * 3600000);
                expire = "; expires=" + expire.toGMTString();
            }
            document.cookie = name + "=" + escape(value) + expire;

        },

        clearCookie: function(name) {
            PubApp.writeCookie(name, "", -1);
        },

        setCloseBtn: function(AfterClickFun, fixed) {
            if (!window.UIButton) window.UIButton = api.require('UIButton');
            UIButton.open({
                rect: {
                    x: 0,
                    y: 20, //沉浸式
                    w: 60,
                    h: 44
                },
                bg: {
                    normal: 'rgba(0,0,0,0)',
                    highlight: 'rgba(0,0,0,0)',
                    active: 'rgba(0,0,0,0)',
                },
                fixedOn: api.frameName,
                fixed: fixed || true,
                move: false
            }, function(ret, err) {
                if (ret) {
                    if (ret.eventType == "click") {
                        if (typeof AfterClickFun == "function") {
                            AfterClickFun();
                        }
                        api.closeWin();
                    }
                } else {

                }
            });

            if (typeof AfterClickFun == "function") {
                api.addEventListener({
                    name: 'keyback'
                }, function(ret, err) {
                    AfterClickFun();
                    api.closeWin();
                });
            }
        },

        closeWin: function(settimeout) {
            setTimeout(function() {
                api.closeWin();
            }, settimeout || 0);
        },

        setLeftBtn: function(AfterClickFun, x, y, w, h) {

            if (!window.UIButton) window.UIButton = api.require('UIButton');
            UIButton.open({
                rect: {
                    x: x || 0,
                    y: y || 20,
                    w: w || 60,
                    h: h || 44
                },
                bg: {
                    normal: 'rgba(0,0,0,0)',
                    highlight: 'rgba(0,0,0,0)',
                    active: 'rgba(0,0,0,0)',
                },
                fixedOn: api.frameName,
                fixed: false,
                move: false
            }, function(ret, err) {
                if (ret) {
                    if (ret.eventType == "click") {
                        if (typeof AfterClickFun == "function") {
                            AfterClickFun();
                        }
                    }
                } else {

                }
            });
        },
        setRightBtn: function(AfterClickFun, x, y, w, h) {
            var thisX = x || api.winWidth - 60;
            PubApp.setLeftBtn(AfterClickFun, thisX, y, w, h);
        },
        doScanQrcode: function(fun) {
            var FNScanner = api.require('FNScanner');
            PubApp.toast("正在打开摄像头");
            FNScanner.openScanner({
                autorotation: false,
                sound: "widget://css/scan.wav",
                fixedOn: api.winName
            }, function(ret, err) {
                if (ret) {
                    //扫描成功
                    if (ret.eventType == "success") {
                        var getContent = ret.content;
                      console.log(getContent);
                        fun(getContent);
                    }
                } else {
                    alert(JSON.stringify(err));
                }
            });
        },
        doLogoutFun: function() {
            log("退出了###################");

            db2.setVal("user_token", "null");
            db2.setVal("user_id", "null");
            db2.setVal("user_mobile", "null");
            db2.setVal("user_headimg", "null");
            db2.setVal("user_nicename", "null");
            api.sendEvent({
                name: 'userloginorout'
            });
        },
        //退出操作
        doLogout: function() {
            api.confirm({
                title: '提醒',
                msg: '确认要退出吗？',
                buttons: ['确定', '取消']
            }, function(ret, err) {
                if (ret) {
                    if (ret.buttonIndex == 1) {
                        PubApp.doLogoutFun();
                        api.toast({
                            msg: '已经退出',
                            duration: 2000,
                            location: 'midden'
                        });
                        api.closeToWin({
                            name: 'root',
                            animation: {
                                type: "push", //动画类型（详见动画类型常量）
                                subType: "from_right", //动画子类型（详见动画子类型常量）
                                duration: 300 //动画过渡时间，默认300毫秒
                            }
                        });
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    alert(JSON.stringify(err));
                }
            });
        },
        tel: function(mobile) {
            if (mobile) {
                api.call({
                    type: 'tel_prompt',
                    number: mobile
                });
            } else {
                api.toast({
                    msg: '没有号码'
                });
            }
        },
        otherFunction: function() {

        }
}

function uploadimg(filepath, fun, showProgress) {

    if (typeof showProgress == "undefined") {
        api.showProgress({
            title: "正在上传",
        });
    }

    var jm = getJiaMi("index", "upload");
    var urls = jm.baseurl + "?app_token=" + jm.app_token + "&times=" + jm.times + "&rnds=" + jm.rnds;

    api.ajax({
        url: urls,
        method: 'post',
        timeout: 30,
        dataType: 'json',
        returnAll: false,
        data: {
            files: {
                file: filepath
            }
        }
    }, function(ret, err) {
        api.hideProgress();
        if (ret) {
            log("上传结果：" + JSON.stringify(ret));
            if (ret["code"] == 0) {
                api.toast({
                    msg: ret["msg"],
                    location: 'middle'
                });
                return false;
            }
            fun(ret["data"]);
        } else {
            api.hideProgress();
            api.alert({
                msg: ('错误码：' + err.code + '；错误信息：' + err.msg + '网络状态码：' + err.statusCode)
            });
        }
    });
}
//获取图片并手动裁剪后的图片地址
//返回图片的file地址
//参数是是回调函数
/**
 * [getImgAndCrop description]
 * @param  {[type]} funs         [回调函数]
 * @param  {[type]} targetWidth  [目标宽度ios有效]
 * @param  {[type]} targetHeight [目标高度ios有效]
 * @return {[type]}              []
 */
function getImgAndCrop(funs, targetWidth, targetHeight) {
    api.actionSheet({
        title: '选择图片',
        cancelTitle: '取消',
        //destructiveTitle: '红色警告按钮',
        buttons: ['拍照', '相册']
    }, function(ret, err) {
        if (ret) {
            var sourceType = "camera";
            if (ret.buttonIndex == 3) {
                return false;
            }
            if (ret.buttonIndex == 1) {
                sourceType = "camera";
            }
            if (ret.buttonIndex == 2) {
                sourceType = "library";
            }

            api.getPicture({
                sourceType: sourceType,
                encodingType: 'jpg',
                mediaValue: 'pic',
                destinationType: 'url',
                allowEdit: false,
                quality: 100,
                targetWidth: targetWidth,
                targetHeight: targetHeight,
                saveToPhotoAlbum: false
            }, function(ret, err) {
                if (ret) {
                    if ($api.trim(ret.data) != "") {
                        funs(ret.data);
                    }
                } else {
                    api.alert({
                        msg: err.msg
                    });
                }
            });
        } else {
            alert(JSON.stringify(err));
        }
    });
}

function isLogin() {
    var user_token = db2.getVal("user_token");
    if (user_token != "" && user_token != null) {
        return true;
    } else {
        return false;
    }
}

//因官方DB模块不支持内容中含有单引号，so直接使用H5的sqlite
var db = (function() {
    var fns = {
        "init": function() {
            var db = openDatabase("cjhdb", "1.0", "appDb", 1024 * 50); //数据库名 版本 数据库描述 大小
            db.transaction(function(tx) {
                tx.executeSql('CREATE TABLE if not exists setconfig(itemname varchar(255), info TEXT)', [], function(tx, err) {
                    log("打开库，并执行了创建默认表");
                });
            })
        },
        "getConfig": function(keys, func) {
            var db = openDatabase("cjhdb", "1.0", "appDb", 1024 * 50); //数据库名 版本 数据库描述 大小
            db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM setconfig where itemname='" + keys + "'", [], function(tx, result) {
                    if (result.rows.length == 0) {
                        log("获取缓存【" + keys + "】,但不存在记录哦");
                        func("");
                    } else {
                        var data = result.rows.item(0).info;
                        log("获得缓存【" + keys + "】值");
                        func(data);
                    }
                })
            })
        },
        "setConfig": function(keys, vals) {
            try {
                var db = openDatabase("cjhdb", "1.0", "appDb", 1024 * 50); //数据库名 版本 数据库描述 大小
                db.transaction(function(tx) {
                    tx.executeSql("delete from setconfig where itemname='" + keys + "'", [], function(tx, result) {});
                })
                if (vals != null) {
                    db.transaction(function(tx) {
                        tx.executeSql("insert into setconfig(itemname,info) values(?,?)", [keys, vals], function(tx, result) {});
                    })
                }
            } catch (e) {

            }
        }
    }
    return fns;
})();

function gethtml(msgtext) {
    if (msgtext != "") {
        msgtext = msgtext.replace(new RegExp('&lt;', 'gm'), '<');
        msgtext = msgtext.replace(new RegExp('&gt;', 'gm'), '>');
        msgtext = msgtext.replace(new RegExp('&quot;', 'gm'), '"');
        msgtext = msgtext.replace(new RegExp('&2339;', 'gm'), '\'');
    }
    return msgtext;
}
var db2 = (function() {
    var fns = {
        "getVal": function(keys) {
            if (!window.localStorage.getItem(keys)) window.localStorage.setItem(keys, "");
            return window.localStorage.getItem(keys);
        },
        "setVal": function(keys, vals) {

            window.localStorage.removeItem(keys);
            //在iPhone/iPad上有时设置setItem()时会出现诡异的QUOTA_EXCEEDED_ERR错误，这时一般在setItem之前，先removeItem()就ok了。
            if (vals != null && vals != "null") {
                window.localStorage.setItem(keys, vals);
            }
        },
        "reset": function() {
            window.localStorage.clear();
        }
    };
    return fns;
})();


var neterrorlimit = true;
var isCanContactNet = true;

function returnSkipCheckUpdate() {
    var isTipsendMark = db2.getVal("runApptimestamp") + "isSelectSkipUpdate";

    if (isset(db2.getVal(isTipsendMark))) {
        return "&skipversion=1";
    } else {
        return "";
    }
}


function getsign(arrayParam, user_token) {

    var res_for_simg = {};
    for (var key in arrayParam) {
        res_for_simg[key] = arrayParam[key]; //复制数组
    }
    log(JSON.stringify(res_for_simg));
    var jiamistring = [];
    /*排序，加密*/
    var newarray = [];
    res_for_simg["signsecret"] = user_token; //加入token码
    for (var key in res_for_simg) {
        newarray.push(key);
    }
    newarray.sort();
    for (var key in newarray) {
        jiamistring.push(newarray[key] + "=" + res_for_simg[newarray[key]]);
    }
    return md5(jiamistring.join("&").toLowerCase());
}

function doAjax(m, a, param, getOrPost, fun) {

    var urls = db2.getVal("remoteurl") + "" + m + "/" + a;

    param.appversion = api.appVersion;
    param.systemtype = api.systemType;
    param.deviceid   = api.deviceId;
    param.version    = 1;
    param.time       = Date.parse(new Date()) / 1000;

    var sign = getsign(param, (window.localStorage.user_token || ""));
    param.sign       = sign;

    api.ajax({
        url: urls,
        method: getOrPost,
        timeout: 10,
        dataType: 'json',
        returnAll: false,
        data: {
            values: param
        },
    }, function(retsystem, err) {
        console.log("snedJson====>"+JSON.stringify(param));
        console.log("getJson====>"+JSON.stringify(retsystem));
        if (!err) {
            if (isset(retsystem.Error)) {
                var requeststatus = Number(retsystem.Error);
                if (requeststatus <= -1000) {
                    api.hideProgress();
                    api.refreshHeaderLoadDone();
                    if (requeststatus >= -2000) {
                        api.toast({
                            msg: retsystem.info,
                            location: 'midden'
                        });
                        if (requeststatus == -1002) {
                            PubApp.doLogoutFun();
                        }
                    } else if (requeststatus >= -3000) {
                        if ( checkUpdateTipsOpenStatus() == 'hide' ) {
                            if ( requeststatus == -2001 ) {
                                doUpdateApp( retsystem, false );
                            } else if ( requeststatus == -2002 ) {
                                doUpdateApp( retsystem, true );
                            }
                        }
                    }
                } else {
                    fun(retsystem);
                }
            } else {
                fun(retsystem);
            }
        } else {
           var errormsg="";
           switch (err.code) {
             case 0:
               errormsg="连接错误";
               break;
             case 1:
               errormsg="超时";
               break;
             case 2:
               errormsg="授权错误";
               break;
             case 3:
               errormsg="数据类型错误";
               break;
             default:
               errormsg=err.msg;
           }
            api.toast({
                msg: "系统错误:" + errormsg
            });
            api.hideProgress();
            api.refreshHeaderLoadDone();
            log("Sys Error:" + err.msg);
            return;
        }
    });
}

//升级APP
function checkAndUploadApp() {
    if (api.appVersion.indexOf("00.00") >= 0) {
        return true;
    }

    doAjax("index", "checkAndUploadApp", "", "get", function(result) {
        if (result.Error == 0) {
            return false;
        }
        var buttons = ['确定', '取消'];
        var str = '版本:' + result.data.version + '\r\n更新:' + result.data.updateTip + '\r\n时间:' + result.data.time;
        var absupdate = result.data.absupdate || 0;
        if (Math.ceil(absupdate) == 1) {
            alert('发现新版本' + '\r\n' + str);
            if (api.systemType == "android") {
                api.download({
                    url: result.data.source,
                    report: true
                }, function(ret, err) {
                    if (ret && 0 == ret.state) {
                        api.toast({
                            msg: "正在下载应用" + ret.percent + "%",
                            duration: 2000
                        });
                    }
                    if (ret && 1 == ret.state) {
                        var savePath = ret.savePath;
                        api.installApp({
                            appUri: savePath
                        });
                    }
                });
            }
            if (api.systemType == "ios") {
                api.openApp({
                    iosUrl: result.data.source,
                    appParam: {
                        appParam: 'app参数'
                    }
                });
            }

        } else {
            api.confirm({
                title: '发现新版本',
                msg: str,
                buttons: buttons
            }, function(ret, err) {

                if (ret.buttonIndex == 1) {
                    if (api.systemType == "android") {
                        api.download({
                            url: result.data.source,
                            report: true
                        }, function(ret, err) {
                            if (ret && 0 == ret.state) {
                                api.toast({
                                    msg: "正在下载应用" + ret.percent + "%",
                                    duration: 2000
                                });
                            }
                            if (ret && 1 == ret.state) {
                                var savePath = ret.savePath;
                                api.installApp({
                                    appUri: savePath
                                });
                            }
                        });
                    }
                    if (api.systemType == "ios") {
                        api.openApp({
                            iosUrl: result.data.source,
                            appParam: {
                                appParam: 'app参数'
                            }
                        });
                    }
                }
            });
        }
    })
    setTimeout(function() {
        checkAndUploadApp();
    }, 1000 * 60 * 30);
}

/**
 * [isset 模拟php isset]
 * @param  {[type]} obj [description]
 * @return {[type]}   true or false
 */
function isset(obj) {
    if (typeof obj == "undefined") {
        return false;
    }
    if (obj == "") {
        return false;
    }
    if (obj == "null" || obj == null) {
        return false;
    }
    if (!obj) {
        return false;
    }
    return true;
}

function _parserUrl(tourl){}

function getLocalTime(nS, formatstyle) {
    var unixTimestamp = new Date(parseInt((("" + nS).length > 10 ? nS : nS * 1000)));
    var m = (unixTimestamp.getMonth() + 1);
    if (m <= 9) m = "0" + m;
    var d = (unixTimestamp.getDate());
    if (d <= 9) d = "0" + d;
    var h = (unixTimestamp.getHours());
    if (h <= 9) h = "0" + h;
    var i = (unixTimestamp.getMinutes());
    if (i <= 9) i = "0" + i;
    var s = (unixTimestamp.getSeconds());
    if (s <= 9) s = "0" + s;
    if (typeof formatstyle != "undefined") {
        switch (formatstyle) {
            case "Y-m-d":
                datas = unixTimestamp.getFullYear() + "-" + m + "-" + d;
                break;
            case "H:i:s":
                datas = h + ":" + i + ":" + s;
                break;
            case "i:s":
                datas = i + ":" + s;
                break;
            case "H:i":
                datas = h + ":" + i;
                break;
            case "H":
                datas = unixTimestamp.getHours();
            case "d":
                datas = unixTimestamp.getDate();
        }
    } else {
        datas = unixTimestamp.getFullYear() + "-" + m + "-" + d + " " + h + ":" + i + ":" + s;
    }
    return datas;
}

var apicloudsignature;

function md5(string) {
    if (!apicloudsignature) {
        apicloudsignature = api.require('signature');
    }
    var value = apicloudsignature.md5Sync({
        data: string
    });
    if (isset(value)) {
        return value.toLowerCase();
    } else {
        return "";
    }
}

function GetsystemType() {
    var is_android = (function() {
        return navigator.userAgent.toLowerCase().indexOf('android') !== -1
    })();
    return is_android ? "android" : "ios";
}

var shopcar = {
    clearOtherShopGoods: function(shopIp) {
        var lastshopIp = db2.getVal("lastshopIp");
        if ((lastshopIp && shopIp != lastshopIp) || lastshopIp == "") {
            db2.setVal("shopcarone", null);
            db2.setVal("shopcar", null);
            db2.setVal("lastshopIp", shopIp);
            log("跨店了");
        } else {
            log("没有跨店;this_shopId:" + shopIp + "；old_shop_id:" + lastshopIp);
        }
    },
    inOne: function(id, name, type, num, img, price, kucun, shopIp) {
        shopcar.clearOtherShopGoods(shopIp);
        var issuccess = true;
        if (kucun <= 0) {
            issuccess = false;
            PubApp.toast("库存不足");
            return false;
        } else {
            var t = [{
                "id": id,
                "t": type,
                "c": num,
                'img': img,
                'name': name,
                'price': price,
                'kc': kucun
            }];
            shopcarrs = JSON.stringify(t);

            db2.setVal("shopcarone", shopcarrs);
        }
        return issuccess;
    },
    in: function(id, name, type, num, img, price, kucun, shopIp) {
        this.clearOtherShopGoods(shopIp);
        var issuccess = true;
        if (kucun <= 0) {
            issuccess = false;
            PubApp.toast("库存不足");
            return false;
        } else {
            var shopcar = db2.getVal("shopcar");
            var shopcarobj = [{}];
            if (shopcar) {
                shopcarobj = JSON.parse(shopcar);
                var isfound = false;

                for (var i = 0; i < shopcarobj.length; i++) {
                    x = shopcarobj[i]
                    if (num > 0) {
                        if (x["id"] == id && x["t"] == type) {
                            isfound = true;
                            x["c"] = Math.round(x["c"]) + Math.round(num);
                            if (x["c"] > kucun) {
                                x["c"] = kucun;
                                issuccess = false;
                                PubApp.toast("没有更多了");
                            }
                            if (kucun == 0 && x["c"] != kucun) {
                                delete shopcarobj[i];
                                issuccess = false;
                                PubApp.toast("已销完");
                            }
                        }
                    } else if (num == 0) {
                        delete shopcarobj[i];
                    }
                };
                if (isfound == false && num > 0) {
                    var t = {
                        "id": id,
                        "t": type,
                        "c": num,
                        'img': img,
                        'name': name,
                        'price': price,
                        'kc': kucun
                    };
                    shopcarobj.push(t);
                }
            } else {
                var t = [{
                    "id": id,
                    "t": type,
                    "c": num,
                    'img': img,
                    'name': name,
                    'price': price,
                    'kc': kucun
                }];
                shopcarobj = t;
            }
            shopcarrs = JSON.stringify(shopcarobj);
            shopcarrs = shopcarrs.replace(/null/gi, "");
            shopcarrs = shopcarrs.replace(/,,/gi, ",");
            shopcarrs = shopcarrs.replace(/,]/gi, "]");
            shopcarrs = shopcarrs.replace(/\[,/gi, "[");
            db2.setVal("shopcar", shopcarrs);
            switch (type) {
                case "weidanqiang":
                    msginfo = "已放入购物车，抢购结果以最终支付成功为准";
                    break;
                default:
                    msginfo = "已放入购物车";
                    break;
            }
            //__订制提醒消息
            if (issuccess == true) {
                PubApp.toast(msginfo);
            }
        }
        return issuccess;
    },
    del: function(id) {
        var shopcar = db2.getVal("shopcar");
        var shopcarobj = [{}];
        if (shopcar) {
            shopcarobj = JSON.parse(shopcar);
            var isfound = false;
            for (var i = 0; i < shopcarobj.length; i++) {
                x = shopcarobj[i]
                if (x["id"] == id) {
                    delete shopcarobj[i];
                }
            };
        }
        shopcarrs = JSON.stringify(shopcarobj);
        shopcarrs = shopcarrs.replace(/null/gi, "");
        shopcarrs = shopcarrs.replace(/,,/gi, ",");
        shopcarrs = shopcarrs.replace(/,]/gi, "]");
        shopcarrs = shopcarrs.replace(/\[,/gi, "[");
        db2.setVal("shopcar", shopcarrs);
    },
    change: function(id, num) {
        var shopcar = db2.getVal("shopcar");
        var shopcarobj = [{}];
        var maxkucun = 0;
        var issuccess = true;
        if (shopcar) {
            shopcarobj = JSON.parse(shopcar);
            var isfound = false;
            for (var i = 0; i < shopcarobj.length; i++) {
                x = shopcarobj[i];
                if (num > 0) {
                    if (x["id"] == id) {
                        isfound = true;
                        x["c"] = Math.round(num);
                    }
                    if (x["c"] > x["kc"]) {
                        issuccess = false;
                        x["c"] = Math.round(x["kc"]);
                        maxkucun = Math.round(x["kc"]);
                        PubApp.toast("库存不足，共" + x["kc"] + "份");
                    }
                } else if (num == 0) {
                    delete shopcarobj[i];
                }
            };
        }
        shopcarrs = JSON.stringify(shopcarobj);
        db2.setVal("shopcar", shopcarrs);
        return {
            "issuccess": issuccess,
            "maxkucun": Math.round(maxkucun)
        };
    },
    //返回统计的价格
    rebuldByselect: function(classFullName) {
        var classNamegroup = [];
        var objlist = document.querySelectorAll(classFullName);
        for (var i = 0; i < objlist.length; i++) {
            var isCheck = objlist[i].checked ? true : false;
            if (isCheck) {
                classNamegroup.push($api.attr(objlist[i], 'goods_id'));
            }
        }

        if (classNamegroup.length <= 0) {
            return 0;
        }

        var selectDataString = classNamegroup.join(",");

        shopcarobj = JSON.parse(db2.getVal("shopcar"));
        shopcarlastobj = []; //最终用于交易的
        shopcarnextobj = []; //没有参与交易的

        var totalPrice = 0;
        for (var i = 0; i < shopcarobj.length; i++) {
            var x = shopcarobj[i];
            if (("," + selectDataString + ",").indexOf("," + x["id"] + ",") >= 0) {
                totalPrice += Math.floor(x.price) * Math.ceil(x.c);
                shopcarlastobj.push(x);
            } else {
                shopcarnextobj.push(x);
            }
        };
        db2.setVal("shopcarlastobj", JSON.stringify(shopcarlastobj)); //最终用于交易的
        db2.setVal("shopcarnextobj", JSON.stringify(shopcarnextobj)); //没有参与交易的
        return totalPrice;
    },
    payafter: function() { //订单支付完成了
        db2.setVal("shopcar", null);
        db2.setVal("shopcarlastobj", null);
        if (db2.getVal("shopcarnextobj")) {
            db2.setVal("shopcar", db2.getVal("shopcarnextobj"));
        }
    },
    updatejiaobiao: function() {
        var goodscount = 0;
        //统计商品数量
        var shopcar = db2.getVal("shopcar");
        var shopcarobj = [{}];
        if (shopcar) {
            shopcarobj = JSON.parse(shopcar);
        }
    }
};

var Pay = {
    selectPayWay: function(afterSelectFunction) {
        api.actionSheet({
            title: '选择支付方式',
            cancelTitle: '取消',
            buttons: ['支付宝', '微信']
        }, function(ret, err) {
            if (ret) {
                if (ret.buttonIndex == 1 || ret.buttonIndex == 2) {
                    afterSelectFunction(ret.buttonIndex);
                } else {
                    console.log(JSON.stringify(ret));
                }
            } else {
                alert(JSON.stringify(err));
            }
        });
    },
    //启动第三方支付APP
    openPayApp: function(channel, orderData, successFunction, failFunction) {

      alert(orderData);
        switch (channel) {
            case 1:
                channel = "app_zfb";
                break;
            case "1":
                channel = "app_zfb";
                break;
            case 2:
                channel = "app_wx";
                break;
            case "2":
                channel = "app_wx";
                break;
            default:

                break;
        }

        switch (channel) {
            case "app_zfb":
                var aliPayPlus = api.require('aliPayPlus');
                aliPayPlus.payOrder({
                    orderInfo: orderData
                }, function(ret, err) {
                    if (ret.code == 9000) {
                        if (typeof successFunction == "function") {
                            successFunction(ret);
                        } else {
                            api.alert({
                                title: '支付结果',
                                msg: ret.code,
                                buttons: ['确定']
                            });
                        }
                    } else {
                        //code: 1 //字符串类型；支付结果状态码，取值范围如下：
                        //9000：支付成功
                        //8000：正在处理中，支付结果未知（有可能已经支付成功），请查询商户订单列表中订单的支付状态
                        //4000：订单支付失败
                        //5000：重复请求
                        //6001：用户中途取消支付操作
                        //6002：网络连接出错
                        //6004：支付结果未知（有可能已经支付成功），请查询商户订单列表中订单的支付状态
                        //0001：缺少商户配置信息（商户id，支付公钥，支付密钥）
                        //0002：缺少参数（subject、body、amount、tradeNO）
                        //0003：签名错误（公钥私钥错误）
                        if (typeof failFunction == "function") {
                            failFunction(ret);
                        } else {
                            api.alert({
                                title: '支付结果',
                                msg: ret.code,
                                buttons: ['确定']
                            });
                        }
                    }
                });
                break;
            case "app_wx":
                if (!window.wxPay) window.wxPay = api.require('wxPay');

                var payorderparam = {
                    apiKey: orderData.appid,
                    orderId: orderData.prepay_id,
                    mchId: orderData.mch_id,
                    nonceStr: orderData.nonce_str,
                    timeStamp: orderData.timeStamp,
                    package: 'Sign=WXPay',
                    sign: orderData.sign
                };

                window.wxPay.payOrder(payorderparam, function(ret, err) {
                    if (ret.status) {
                        if (typeof successFunction == "function") {
                            successFunction(ret);
                        } else {
                            api.alert({
                                title: '支付结果',
                                msg: ret.code,
                                buttons: ['确定']
                            });
                        }
                    } else {
                        if (typeof failFunction == "function") {
                            failFunction(ret);
                        } else {
                            api.alert({
                                title: '支付结果',
                                msg: ret.code,
                                buttons: ['确定']
                            });
                        }
                    }
                });
                break;
            default:
                api.alert({
                    title: 'title',
                    msg: "前端未处理" + channel,
                }, function(ret, err) {
                    console.log('title:'+err);
                });
          }
      }
};


/*
 * APICloud JavaScript Library
 * Copyright (c) 2014 apicloud.com
 */
(function(window) {
    var u = {};
    var isAndroid = (/android/gi).test(navigator.appVersion);
    var uzStorage = function() {
        var ls = window.localStorage;
        if (isAndroid) {
            ls = os.localStorage();
        }
        return ls;
    };

    function parseArguments(url, data, fnSuc, dataType) {
        if (typeof(data) == 'function') {
            dataType = fnSuc;
            fnSuc = data;
            data = undefined;
        }
        if (typeof(fnSuc) != 'function') {
            dataType = fnSuc;
            fnSuc = undefined;
        }
        return {
            url: url,
            data: data,
            fnSuc: fnSuc,
            dataType: dataType
        };
    }
    u.trim = function(str) {
        if (String.prototype.trim) {
            return str == null ? "" : String.prototype.trim.call(str);
        } else {
            return str.replace(/(^\s*)|(\s*$)/g, "");
        }
    };
    u.trimAll = function(str) {
        return str.replace(/\s*/g, '');
    };
    u.isElement = function(obj) {
        return !!(obj && obj.nodeType == 1);
    };
    u.isArray = function(obj) {
        if (Array.isArray) {
            return Array.isArray(obj);
        } else {
            return obj instanceof Array;
        }
    };
    u.isEmptyObject = function(obj) {
        if (JSON.stringify(obj) === '{}') {
            return true;
        }
        return false;
    };
    u.addEvt = function(el, name, fn, useCapture) {
        if (!u.isElement(el)) {
            console.warn('$api.addEvt Function need el param, el param must be DOM Element');
            return;
        }
        useCapture = useCapture || false;
        if (el.addEventListener) {
            el.addEventListener(name, fn, useCapture);
        }
    };
    u.rmEvt = function(el, name, fn, useCapture) {
        if (!u.isElement(el)) {
            console.warn('$api.rmEvt Function need el param, el param must be DOM Element');
            return;
        }
        useCapture = useCapture || false;
        if (el.removeEventListener) {
            el.removeEventListener(name, fn, useCapture);
        }
    };
    u.one = function(el, name, fn, useCapture) {
        if (!u.isElement(el)) {
            console.warn('$api.one Function need el param, el param must be DOM Element');
            return;
        }
        useCapture = useCapture || false;
        var that = this;
        var cb = function() {
            fn && fn();
            that.rmEvt(el, name, cb, useCapture);
        };
        that.addEvt(el, name, cb, useCapture);
    };
    u.dom = function(el, selector) {
        if (arguments.length === 1 && typeof arguments[0] == 'string') {
            if (document.querySelector) {
                return document.querySelector(arguments[0]);
            }
        } else if (arguments.length === 2) {
            if (el.querySelector) {
                return el.querySelector(selector);
            }
        }
    };
    u.domAll = function(el, selector) {
        if (arguments.length === 1 && typeof arguments[0] == 'string') {
            if (document.querySelectorAll) {
                return document.querySelectorAll(arguments[0]);
            }
        } else if (arguments.length === 2) {
            if (el.querySelectorAll) {
                return el.querySelectorAll(selector);
            }
        }
    };
    u.byId = function(id) {
        return document.getElementById(id);
    };
    u.first = function(el, selector) {
        if (arguments.length === 1) {
            if (!u.isElement(el)) {
                console.warn('$api.first Function need el param, el param must be DOM Element');
                return;
            }
            return el.children[0];
        }
        if (arguments.length === 2) {
            return this.dom(el, selector + ':first-child');
        }
    };
    u.last = function(el, selector) {
        if (arguments.length === 1) {
            if (!u.isElement(el)) {
                console.warn('$api.last Function need el param, el param must be DOM Element');
                return;
            }
            var children = el.children;
            return children[children.length - 1];
        }
        if (arguments.length === 2) {
            return this.dom(el, selector + ':last-child');
        }
    };
    u.eq = function(el, index) {
        return this.dom(el, ':nth-child(' + index + ')');
    };
    u.not = function(el, selector) {
        return this.domAll(el, ':not(' + selector + ')');
    };
    u.prev = function(el) {
        if (!u.isElement(el)) {
            console.warn('$api.prev Function need el param, el param must be DOM Element');
            return;
        }
        var node = el.previousSibling;
        if (node.nodeType && node.nodeType === 3) {
            node = node.previousSibling;
            return node;
        }
    };
    u.next = function(el) {
        if (!u.isElement(el)) {
            console.warn('$api.next Function need el param, el param must be DOM Element');
            return;
        }
        var node = el.nextSibling;
        if (node.nodeType && node.nodeType === 3) {
            node = node.nextSibling;
            return node;
        }
    };
    u.closest = function(el, selector) {
        if (!u.isElement(el)) {
            console.warn('$api.closest Function need el param, el param must be DOM Element');
            return;
        }
        var doms, targetDom;
        var isSame = function(doms, el) {
            var i = 0,
                len = doms.length;
            for (i; i < len; i++) {
                if (doms[i].isEqualNode(el)) {
                    return doms[i];
                }
            }
            return false;
        };
        var traversal = function(el, selector) {
            doms = u.domAll(el.parentNode, selector);
            targetDom = isSame(doms, el);
            while (!targetDom) {
                el = el.parentNode;
                if (el != null && el.nodeType == el.DOCUMENT_NODE) {
                    return false;
                }
                traversal(el, selector);
            }

            return targetDom;
        };

        return traversal(el, selector);
    };
    u.contains = function(parent, el) {
        var mark = false;
        if (el === parent) {
            mark = true;
            return mark;
        } else {
            do {
                el = el.parentNode;
                if (el === parent) {
                    mark = true;
                    return mark;
                }
            } while (el === document.body || el === document.documentElement);

            return mark;
        }

    };
    u.remove = function(el) {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    };
    u.attr = function(el, name, value) {
        if (!u.isElement(el)) {
            console.warn('$api.attr Function need el param, el param must be DOM Element');
            return;
        }
        if (arguments.length == 2) {
            return el.getAttribute(name);
        } else if (arguments.length == 3) {
            el.setAttribute(name, value);
            return el;
        }
    };
    u.removeAttr = function(el, name) {
        if (!u.isElement(el)) {
            console.warn('$api.removeAttr Function need el param, el param must be DOM Element');
            return;
        }
        if (arguments.length === 2) {
            el.removeAttribute(name);
        }
    };
    u.hasCls = function(el, cls) {
        if (!u.isElement(el)) {
            console.warn('$api.hasCls Function need el param, el param must be DOM Element');
            return;
        }
        if (el.className.indexOf(cls) > -1) {
            return true;
        } else {
            return false;
        }
    };
    u.addCls = function(el, cls) {
        if (!u.isElement(el)) {
            console.warn('$api.addCls Function need el param, el param must be DOM Element');
            return;
        }
        if ('classList' in el) {
            el.classList.add(cls);
        } else {
            var preCls = el.className;
            var newCls = preCls + ' ' + cls;
            el.className = newCls;
        }
        return el;
    };
    u.removeCls = function(el, cls) {
        if (!u.isElement(el)) {
            console.warn('$api.removeCls Function need el param, el param must be DOM Element');
            return;
        }
        if ('classList' in el) {
            el.classList.remove(cls);
        } else {
            var preCls = el.className;
            var newCls = preCls.replace(cls, '');
            el.className = newCls;
        }
        return el;
    };
    u.toggleCls = function(el, cls) {
        if (!u.isElement(el)) {
            console.warn('$api.toggleCls Function need el param, el param must be DOM Element');
            return;
        }
        if ('classList' in el) {
            el.classList.toggle(cls);
        } else {
            if (u.hasCls(el, cls)) {
                u.removeCls(el, cls);
            } else {
                u.addCls(el, cls);
            }
        }
        return el;
    };
    u.val = function(el, val) {
        if (!u.isElement(el)) {
            console.warn('$api.val Function need el param, el param must be DOM Element');
            return;
        }
        if (arguments.length === 1) {
            switch (el.tagName) {
                case 'SELECT':
                    var value = el.options[el.selectedIndex].value;
                    return value;
                    break;
                case 'INPUT':
                    return el.value;
                    break;
                case 'TEXTAREA':
                    return el.value;
                    break;
            }
        }
        if (arguments.length === 2) {
            switch (el.tagName) {
                case 'SELECT':
                    el.options[el.selectedIndex].value = val;
                    return el;
                    break;
                case 'INPUT':
                    el.value = val;
                    return el;
                    break;
                case 'TEXTAREA':
                    el.value = val;
                    return el;
                    break;
            }
        }

    };
    u.prepend = function(el, html) {
        if (!u.isElement(el)) {
            console.warn('$api.prepend Function need el param, el param must be DOM Element');
            return;
        }
        el.insertAdjacentHTML('afterbegin', html);
        return el;
    };
    u.append = function(el, html) {
        if (!u.isElement(el)) {
            console.warn('$api.append Function need el param, el param must be DOM Element');
            return;
        }
        el.insertAdjacentHTML('beforeend', html);
        return el;
    };
    u.before = function(el, html) {
        if (!u.isElement(el)) {
            console.warn('$api.before Function need el param, el param must be DOM Element');
            return;
        }
        el.insertAdjacentHTML('beforebegin', html);
        return el;
    };
    u.after = function(el, html) {
        if (!u.isElement(el)) {
            console.warn('$api.after Function need el param, el param must be DOM Element');
            return;
        }
        el.insertAdjacentHTML('afterend', html);
        return el;
    };
    u.html = function(el, html) {
        if (!u.isElement(el)) {
            console.warn('$api.html Function need el param, el param must be DOM Element');
            return;
        }
        if (arguments.length === 1) {
            return el.innerHTML;
        } else if (arguments.length === 2) {
            el.innerHTML = html;
            return el;
        }
    };
    u.text = function(el, txt) {
        if (!u.isElement(el)) {
            console.warn('$api.text Function need el param, el param must be DOM Element');
            return;
        }
        if (arguments.length === 1) {
            return el.textContent;
        } else if (arguments.length === 2) {
            el.textContent = txt;
            return el;
        }
    };
    u.offset = function(el) {
        if (!u.isElement(el)) {
            console.warn('$api.offset Function need el param, el param must be DOM Element');
            return;
        }
        var sl = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
        var st = Math.max(document.documentElement.scrollTop, document.body.scrollTop);

        var rect = el.getBoundingClientRect();
        return {
            l: rect.left + sl,
            t: rect.top + st,
            w: el.offsetWidth,
            h: el.offsetHeight
        };
    };
    u.css = function(el, css) {
        if (!u.isElement(el)) {
            console.warn('$api.css Function need el param, el param must be DOM Element');
            return;
        }
        if (typeof css == 'string' && css.indexOf(':') > 0) {
            el.style && (el.style.cssText += ';' + css);
        }
    };
    u.cssVal = function(el, prop) {
        if (!u.isElement(el)) {
            console.warn('$api.cssVal Function need el param, el param must be DOM Element');
            return;
        }
        if (arguments.length === 2) {
            var computedStyle = window.getComputedStyle(el, null);
            return computedStyle.getPropertyValue(prop);
        }
    };
    u.jsonToStr = function(json) {
        if (typeof json === 'object') {
            return JSON && JSON.stringify(json);
        }
    };
    u.strToJson = function(str) {
        if (typeof str === 'string') {
            return JSON && JSON.parse(str);
        }
    };
    u.setStorage = function(key, value) {
        if (arguments.length === 2) {
            var v = value;
            if (typeof v == 'object') {
                v = JSON.stringify(v);
                v = 'obj-' + v;
            } else {
                v = 'str-' + v;
            }
            var ls = uzStorage();
            if (ls) {
                ls.setItem(key, v);
            }
        }
    };
    u.getStorage = function(key) {
        var ls = uzStorage();
        if (ls) {
            var v = ls.getItem(key);
            if (!v) {
                return;
            }
            if (v.indexOf('obj-') === 0) {
                v = v.slice(4);
                return JSON.parse(v);
            } else if (v.indexOf('str-') === 0) {
                return v.slice(4);
            }
        }
    };
    u.rmStorage = function(key) {
        var ls = uzStorage();
        if (ls && key) {
            ls.removeItem(key);
        }
    };
    u.clearStorage = function() {
        var ls = uzStorage();
        if (ls) {
            ls.clear();
        }
    };


    /*by king*/
    u.fixIos7Bar = function(el) {
        if (!u.isElement(el)) {
            console.warn('$api.fixIos7Bar Function need el param, el param must be DOM Element');
            return;
        }
        var strDM = api.systemType;
        if (strDM == 'ios') {
            var strSV = api.systemVersion;
            var numSV = parseInt(strSV, 10);
            var fullScreen = api.fullScreen;
            var iOS7StatusBarAppearance = api.iOS7StatusBarAppearance;
            if (numSV >= 7 && !fullScreen && iOS7StatusBarAppearance) {
                el.style.paddingTop = '20px';
            }
        }
    };
    u.fixStatusBar = function(el) {
        if (!u.isElement(el)) {
            console.warn('$api.fixStatusBar Function need el param, el param must be DOM Element');
            return;
        }
        var sysType = api.systemType;
        if (sysType == 'ios') {
            u.fixIos7Bar(el);
        } else if (sysType == 'android') {
            var ver = api.systemVersion;
            ver = parseFloat(ver);
            if (ver >= 4.4) {
                el.style.paddingTop = '25px';
            }
        }
    };
    u.toast = function(title, text, time) {
        var opts = {};
        var show = function(opts, time) {
            api.showProgress(opts);
            setTimeout(function() {
                api.hideProgress();
            }, time);
        };
        if (arguments.length === 1) {
            var time = time || 500;
            if (typeof title === 'number') {
                time = title;
            } else {
                opts.title = title + '';
            }
            show(opts, time);
        } else if (arguments.length === 2) {
            var time = time || 500;
            var text = text;
            if (typeof text === "number") {
                var tmp = text;
                time = tmp;
                text = null;
            }
            if (title) {
                opts.title = title;
            }
            if (text) {
                opts.text = text;
            }
            show(opts, time);
        }
        if (title) {
            opts.title = title;
        }
        if (text) {
            opts.text = text;
        }
        time = time || 500;
        show(opts, time);
    };
    u.post = function( /*url,data,fnSuc,dataType*/ ) {
        var argsToJson = parseArguments.apply(null, arguments);
        var json = {};
        var fnSuc = argsToJson.fnSuc;
        argsToJson.url && (json.url = argsToJson.url);
        argsToJson.data && (json.data = argsToJson.data);
        if (argsToJson.dataType) {
            var type = argsToJson.dataType.toLowerCase();
            if (type == 'text' || type == 'json') {
                json.dataType = type;
            }
        } else {
            json.dataType = 'json';
        }
        json.method = 'post';
        api.ajax(json,
            function(ret, err) {
                if (ret) {
                    fnSuc && fnSuc(ret);
                }
            }
        );
    };
    u.get = function( /*url,fnSuc,dataType*/ ) {
        var argsToJson = parseArguments.apply(null, arguments);
        var json = {};
        var fnSuc = argsToJson.fnSuc;
        argsToJson.url && (json.url = argsToJson.url);
        //argsToJson.data && (json.data = argsToJson.data);
        if (argsToJson.dataType) {
            var type = argsToJson.dataType.toLowerCase();
            if (type == 'text' || type == 'json') {
                json.dataType = type;
            }
        } else {
            json.dataType = 'text';
        }
        json.method = 'get';
        api.ajax(json,
            function(ret, err) {
                if (ret) {
                    fnSuc && fnSuc(ret);
                }
            }
        );
    };

    /*end*/


    window.$api = u;

})(window);


/**
 * 删除左右两端的空格
 */
String.prototype.trim = function() {
        return this.replace(/(^\s*)|(\s*$)/g, '');
    }
    /**
     * 删除左边的空格
     */
String.prototype.ltrim = function() {
        return this.replace(/(^\s*)/g, '');
    }
    /**
     * 删除右边的空格
     */
String.prototype.rtrim = function() {
    return this.replace(/(\s*$)/g, '');
}



//除法函数
function accDiv(arg1, arg2) {
    var t1 = 0,
        t2 = 0,
        r1, r2, n;
    try {
        t1 = arg1.toString().split(".")[1].length;
    } catch (e) {
        t1 = 0;
    }
    try {
        t2 = arg2.toString().split(".")[1].length;
    } catch (e) {
        t2 = 0;
    }
    with(Math) {
        r1 = Number(arg1.toString().replace(".", ""));
        r2 = Number(arg2.toString().replace(".", ""));
        n = Math.max(t1, t2);
        return (r1 / r2) * pow(10, t2 - t1);
    }
}

//乘法函数
function accMul(arg1, arg2) {
    var t1 = 0,
        t2 = 0,
        r1, r2;
    try {
        t1 = arg1.toString().split(".")[1].length;
    } catch (e) {
        t1 = 0;
    }
    try {
        t2 = arg2.toString().split(".")[1].length;
    } catch (e) {
        t2 = 0;
    }
    with(Math) {
        r1 = Number(arg1.toString().replace(".", ""));
        r2 = Number(arg2.toString().replace(".", ""));
        return (r1 * r2) / pow(10, t2 + t1);
    }
}

//加法函数
function accAdd(arg1, arg2) {
    var t1 = 0,
        t2 = 0,
        m;
    try {
        t1 = arg1.toString().split(".")[1].length;
    } catch (e) {
        t1 = 0;
    }
    try {
        t2 = arg2.toString().split(".")[1].length;
    } catch (e) {
        t2 = 0;
    }
    with(Math) {
        m = Math.pow(10, Math.max(t1, t2));
        return (arg1 * m + arg2 * m) / m;
    }
}

//减法函数
function accSubtr(arg1, arg2) {
    var t1 = 0,
        t2 = 0,
        m, n;
    try {
        t1 = arg1.toString().split(".")[1].length;
    } catch (e) {
        t1 = 0;
    }
    try {
        t2 = arg2.toString().split(".")[1].length;
    } catch (e) {
        t2 = 0;
    }
    with(Math) {
        //动态控制精度长度
        n = Math.max(t1, t2);
        m = Math.pow(10, n);
        //return (arg1  * m - arg2 * m) / m;
        return ((arg1 * m - arg2 * m) / m).toFixed(n);
    }
}


//给String类型增加一个div方法，调用起来更加方便。除法
String.prototype.bcdiv = function(arg) {
    return accDiv(this, arg);
}

//给String类型增加一个mul方法，调用起来更加方便。乘法
String.prototype.bcmul = function(arg) {
    return accMul(arg, this);
}

//给String类型增加一个add方法，调用起来更加方便。加法
String.prototype.bcadd = function(arg) {
    return accAdd(arg, this);
}

//给String类型增加一个subtr方法，调用起来更加方便。减法
String.prototype.bcsub = function(arg) {
    return accSubtr(this, arg);
}
