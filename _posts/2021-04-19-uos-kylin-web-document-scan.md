---
layout: post
title: 国产操作系统上实现基于Web的文档扫描应用
date:   2021-04-19 09:57:36 +0530
categories: 文档扫描
---

国产操作系统的普及离不开软件的支持。在自动化办公方面，[Dynamic Web TWAIN SDK](https://www.dynamsoft.com/web-twain/overview/?urlsource=csdn)已经可以支持目前主流的国产系统：**银河麒麟**，**中标麒麟**，**统信UOS**。支持的CPU架构包括**amd64**, **arm64**和**mips64**。因此，要为国产系统打造基于Web的电子文档扫描管理软件非常方便。

## 基于Web的文档扫描应用
国产OS都是基于Linux。Linux通过SANE协议访问文档扫描仪。Dynamic Web TWAIN支持Windows, Linux和Mac上的所有扫描协议。

### MIPS64 统信UOS 
统信UOS必须激活开发者模式。

#### 在线体验
使用统信自带浏览器访问在线程序示例：[https://demo3.dynamsoft.com/web-twain/](https://demo3.dynamsoft.com/web-twain/)。

首次打开会提示下载服务安装包：

![统信UOS安装Dynamic Web TWAIN](/album/2021/china-os-web-twain/install.png)
下载`deb`文件。并通过命令行安装：

```bash
sudo dpkg -i DynamsoftServiceSetup.deb
```

安装之后打开页面`https://127.0.0.1:18623/`确认状态。如果看到以下页面，说明安装成功：

![Dynamsoft service](/album/2021/china-os-web-twain/dynamsoft-service.png)

接下来刷新在线示例页面，可以获得连接的扫描仪列表：

![web 扫描仪列表](/album/2021/china-os-web-twain/scanner-list.png)
现在需要一个有效的序列号。可以在线申请一个[30天免费试用](https://www.dynamsoft.com/customer/license/trialLicense/?product=dwt)的。

获取之后打开开发者控制栏，输入代码：

```js
DWObject.ProductKey="序列号"
```

现在可以点击按钮体验在线文档扫描了。

![统信UOS文档扫描](/album/2021/china-os-web-twain/uos-document-scan.png)

#### 手动编写
开发者可以集成SDK实现自己的Web程序。

下载Dynamic Web TWAIN的[完整安装包](https://www.dynamsoft.com/web-twain/downloads)。

解压之后把`Resources`目录整个拷贝出来，放到自己建的工程目录下。新建一个`index.html`文件：

```html
<!DOCTYPE html>
<html>

<head>
    <title>Use Dynamic Web TWAIN to Scan</title>
    <script type="text/javascript" src="Resources/dynamsoft.webtwain.initiate.js"></script>
    <script type="text/javascript" src="Resources/dynamsoft.webtwain.config.js"></script>
</head>

<body>
    <select size="1" id="source" style="position: relative; width: 220px;"></select>
    <input type="button" value="Scan" onclick="acquireImage();" />
    <div id="doc-image"></div>

    <script type="text/javascript">
        // Get a free trial license key from https://www.dynamsoft.com/customer/license/trialLicense/?product=dwt
        Dynamsoft.WebTwainEnv.ProductKey = "序列号";
        Dynamsoft.WebTwainEnv.RegisterEvent('OnWebTwainReady', onReady);
        var DWObject;

        function onReady() {
            Dynamsoft.WebTwainEnv.CreateDWTObject(document.getElementById('doc-image'), function (obj) {
                DWObject = obj;
                var count = DWObject.SourceCount;
                for (var i = 0; i < count; i++)
                    document.getElementById('source').options.add(new Option(DWObject.GetSourceNameItems(i), i));
            }, function (errorString) {
                console.log(errorString)
            });
        }

        function acquireImage() {
            if (DWObject) {
                var onSuccess, onFailure;
                onSuccess = onFailure = function () {
                    DWObject.CloseSource();
                };

                DWObject.SelectSourceByIndex(document.getElementById('source').selectedIndex); //Use method SelectSourceByIndex to avoid the 'Select Source' dialog
                DWObject.OpenSource();
                DWObject.IfDisableSourceAfterAcquire = true;	// Scanner source will be disabled/closed automatically after the scan.
                DWObject.AcquireImage(onSuccess, onFailure);
            }
        }
    </script>
</body>

</html>

```

注意修改序列号：

```js
Dynamsoft.WebTwainEnv.ProductKey = "序列号";
```

保存之后在浏览器中打开就可以运行了：

![统信UOS文档扫描编程](/album/2021/china-os-web-twain/uos-document-scan-programming.png)


### MIPS64 银河麒麟
测试用的银河麒麟也是MIPS64的系统：

![银河麒麟安装web twain](/album/2021/china-os-web-twain/kylin-web-twain-install.png)
银河麒麟用的是360浏览器，和统信UOS使用相同的操作没有任何问题。

![银河麒麟文档扫描](/album/2021/china-os-web-twain/kylin-os-document-scan.png)

## 视频 
[https://www.bilibili.com/video/BV1yX4y137mg/](https://www.bilibili.com/video/BV1yX4y137mg/)

<iframe id="test" src="//player.bilibili.com/player.html?aid=714674193&bvid=BV1yX4y137mg&cid=310664636&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; height: 400px"> </iframe>

## 源码
[https://github.com/Dynamsoft/Dynamic-Web-TWAIN](https://github.com/Dynamsoft/Dynamic-Web-TWAIN)
