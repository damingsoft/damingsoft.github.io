---
layout: post
title: 构建一个文档扫描HTML5移动应用
date:   2021-04-19 09:57:36 +0530
categories: 文档扫描
author: Tony
---

Dynamic Web TWAIN 16添加了一系列针对移动平台的新功能。

* 通过移动设备的摄像头捕获文档，16.0
* PDF Rasterizer移动版，16.0
* LoadImageEx支持移动平台，16.1
* 从远程扫描仪获取图像，16.1

有了以上功能，我们可以很容易地构建一个移动端的HTML5文档扫描应用，不仅可以利用现代移动设备上配备的高分辨率摄像头，还可以远程调用扫描仪。这样通过手机就可以完成整个文档扫描过程。


## 需要安装的软件
- [Dynamic Web TWAIN SDK](https://www.dynamsoft.com/web-twain/downloads)
- [适用于Windows的虚拟扫描仪](https://download.dynamsoft.com/tool/twainds.win32.installer.2.1.3.msi)​​。如果手头没有扫描仪，可以在Windows上安装虚拟扫描仪应用进行测试。

## 实现

下面是分步实现过程。

### 预览

我们的目标是构建一个移动设备可以使用的文档扫描Web应用。布局要针对移动设备进行优化。以下是最终的效果预览：

![扫描应用预览](/album/2021/mobile-document-scanner/dwt-mobile.jpg)

顶部是一个已扫描文档的查看器。查看器下方是一个操作Tab选项卡。由于移动设备的屏幕空间不多，操作很多的话，使用Tab选项卡是一个可行的选择。

### 实现一个基础版本

我们首先做一个基础版本，支持用相机捕获图像并将结果保存到图像或PDF文件中。整个HTML文件如下。

```html
<!DOCTYPE html><html><head>
    <title>Dynamic Web TWAIN Mobile Sample</title>
    <script type="text/javascript" src="Resources/dynamsoft.webtwain.initiate.js"></script>
    <script type="text/javascript" src="Resources/dynamsoft.webtwain.config.js"></script>
    <script type="text/javascript" src="Resources/addon/dynamsoft.webtwain.addon.camera.js"></script>
    <script type="text/javascript" src="Resources/addon/dynamsoft.webtwain.addon.pdf.js"></script>
    <script type="text/javascript" src="common.js"></script>
    <script type="text/javascript" src="tabs.js"></script>
    <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
    <link rel="stylesheet" href="css/normalize.css">
    <link rel="stylesheet" href="css/skeleton.css">
    <link rel="stylesheet" href="css/tabs.css"></head><body>
    <div class="container">
        <div class="row">
            <div class="six columns">
                <div id="dwtcontrolContainer" style="float:left;width:100%"></div>
            </div>
            <div class="six columns">
                <div class="tab" style="display:flex;overflow-x:auto">
                    <button class="tablinks" onclick="switchTab(event, 'camera')">Camera</button>
                    <button class="tablinks" onclick="switchTab(event, 'save')">Save</button>
                </div>        
                <div>
                    <div id="camera" class="tabcontent">
                        <select id="camerasource"></select>
                        <input id="captureButton" type="button" value="Capture Images" onclick="CaptureImages();" />
                        <input id="switchButton" type="button" value="Hide Video" onclick="SwitchViews();" />
                    </div>
                    <div id="save"  class="tabcontent">
                        Default Filename: <input type="text" id="filename" value="DynamicWebTWAIN"/>
                        <input onclick="SaveWithFileDialog();" type="button" value="Save">
                        <div>
                            <label>
                                <input type="radio" value="jpg" name="ImageType" id="imgTypejpeg" />JPEG</label>
                            <label>
                                <input type="radio" value="tif" name="ImageType" id="imgTypetiff" />TIFF</label>
                            <label>
                                <input type="radio" value="pdf" name="ImageType" id="imgTypepdf" checked="checked" />PDF</label>
                        </div>
                    </div>                
               </div>
            </div>
        </div>
    </div>        
    <script type="text/javascript">
        var console = window['console'] ? window['console'] : { 'log': function () { } };
        Dynamsoft.WebTwainEnv.RegisterEvent('OnWebTwainReady', Dynamsoft_OnReady); // Register OnWebTwainReady event. This event fires as soon as Dynamic Web TWAIN is initialized and ready to be used
        var DWObject;
        switchTab(null, 'camera')

        function Dynamsoft_OnReady() {
            DWObject = Dynamsoft.WebTwainEnv.GetWebTwain('dwtcontrolContainer'); // Get the Dynamic Web TWAIN object that is embeded in the div with id 'dwtcontrolContainer'
            if (DWObject) {
                DWObject.Viewer.width="100%";
                DWObject.SetViewMode(2, 2);

                SetIfWebcamPlayVideo(false);    
                DWObject.Addon.Camera.getSourceList().then(function (sourceName) {
                    var iCount = sourceName.length;
                    for (var i = 0; i < iCount; i++) {
                        document.getElementById("camerasource").options.add(new Option(sourceName[i].label, sourceName[i].deviceId));
                    }
                });
                document.getElementById('camerasource').onchange = function () {
                    var deviceId = document.getElementById("camerasource").options[document.getElementById("camerasource").selectedIndex].value;
                    DWObject.Addon.Camera.selectSource(deviceId).then(function () {
                        SetIfWebcamPlayVideo(true);
                        document.getElementById("switchButton").style.display = '';
                        document.getElementById("captureButton").disabled = "";
                    }, function (ex) { console.log(ex.message); });
                }
            }
        }

        function CaptureImages() {
            if (DWObject) {
                DWObject.Addon.Camera.capture().then(function () {
                    DWObject.Viewer.render();
                    SetIfWebcamPlayVideo(false);
                }, function (ex) {
                    console.log(ex.message);
                    SetIfWebcamPlayVideo(false);
                });
            }
        }

        function SetIfWebcamPlayVideo(bShow) {
            if (bShow) {
                DWObject.Addon.Camera.play(null, { width: 2560, height: 1440 },true).then(function (r) {
                    isVideoOn = true;
                    document.getElementById("captureButton").style.backgroundColor = "";
                    document.getElementById("captureButton").disabled = "";
                    document.getElementById("switchButton").value = "Hide Video";
                }, function (ex) {
                    console.log(ex.message);
                    DWObject.Addon.Camera.stop();
                });
            }
            else {
                DWObject.Addon.Camera.stop();
                isVideoOn = false;
                document.getElementById("captureButton").style.backgroundColor = "#aaa";
                document.getElementById("captureButton").disabled = "disabled";
                document.getElementById("switchButton").value = "Show Video";

            }
        }

        function SwitchViews() {
            if (isVideoOn == false) {
                // continue the video
                SetIfWebcamPlayVideo(true);
            } else {
                // stop the video
                SetIfWebcamPlayVideo(false);
            }
        }

        //Callback functions for async APIs
        function OnSuccess() {
            console.log('successful');
        }

        function OnFailure(errorCode, errorString) {
            alert(errorString);
        }

        function SaveWithFileDialog() {
            if (DWObject) {
                if (DWObject.HowManyImagesInBuffer > 0) {
                    DWObject.IfShowFileDialog = true;
                    var filename=document.getElementById("filename").value;
                    if (document.getElementById("imgTypejpeg").checked == true) {
                        //If the current image is B&W
                        //1 is B&W, 8 is Gray, 24 is RGB
                        if (DWObject.GetImageBitDepth(DWObject.CurrentImageIndexInBuffer) == 1)
                            //If so, convert the image to Gray
                            DWObject.ConvertToGrayScale(DWObject.CurrentImageIndexInBuffer);
                        //Save image in JPEG
                        DWObject.SaveAsJPEG(filename+".jpg", DWObject.CurrentImageIndexInBuffer);
                    }
                    else if (document.getElementById("imgTypetiff").checked == true)
                        DWObject.SaveAllAsMultiPageTIFF(filename+".tiff", OnSuccess, OnFailure);
                    else if (document.getElementById("imgTypepdf").checked == true)
                        DWObject.SaveAllAsPDF(filename+".pdf", OnSuccess, OnFailure);
                }
            }
        }
    </script></body></html>
```

我们使用[Skeleton CSS框架](http://getskeleton.com/)​​，并添加`viewport`元数据，以使页面支持响应式设计。

根据[How To Create Tabs](https://www.w3schools.com/howto/howto_js_tabs.asp)这篇文章创建Tab。Tab的样式有做修改，可以水平滚动。

摄像头组件通过[MediaDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)访问移动摄像头。MediaDevices需要HTTPS。如果没有HTTPS服务器，可以根据这个[帖子](https://stackoverflow.com/questions/19705785/python-3-simple-https-server)使用Python 3运行本地服务器。

另外还需要将Resources文件夹从`Dynamsoft\Dynamic Web TWAIN SDK <version>\Resources`复制到项目的根目录。

### 添加功能

我们可以给基础版本添加更多功能。

#### 添加更多输入方式

Web TWAIN主要有三种输入来源：扫描仪、摄像头、本地文件。

加载本地文件十分简单，调用`LoadImageEx`即可。它可以加载图片以及PDF文件。

JavaScript:

```js
//Callback functions for async APIs
function OnSuccess() {
    console.log('successful');
}

function OnFailure(errorCode, errorString) {
    alert(errorString);
}

function LoadLocal(){
    DWObject.IfShowFileDialog = true;
    // PDF Rasterizer Addon is used here to ensure PDF support
    DWObject.Addon.PDF.SetResolution(200);
    DWObject.Addon.PDF.SetConvertMode(Dynamsoft.EnumDWT_ConvertMode.CM_RENDERALL);
    DWObject.LoadImageEx("", Dynamsoft.EnumDWT_ImageType.IT_ALL, OnSuccess, OnFailure);
}
```

HTML:

```html
<button class="tablinks" onclick="switchTab(event, 'local')">Local</button>
......<div id="local" class="tabcontent">            
    <input onclick="LoadLocal();" type="button" value="Load Images">                
</div>
```

由于移动设备无法物理连接到扫描仪，因此我们只能使用远程扫描功能。[如何用HTML5构建一个通用文档扫描应用程序](https://www.dynamsoft.com/codepool/mobile-scanner-camera-document-capture.html)一文有具体的说明。

#### 添加更多操作

视图模式应该是可调整的。此外，我们还需要删除，重新排序和编辑图像。我们可以用Dynamic Web TWAIN提供的丰富的API来做到这些。

它还内置了一个移动设备友好的图像编辑器，支持旋转、倾斜、翻转、镜像、裁剪和剪切等功能。

![图像编辑器](/album/2021/mobile-document-scanner/dwt-mobile-image-editor.jpg)

JavaScript:

```js
function ShowImageEditor(){
    var editorSettings = {
        /*element: document.getElementById("imageEditor"),
        width: 600,
        height: 400,*/
        border: '1px solid rgb(204, 204, 204);',
        topMenuBorder: '',
        innerBorder: '',
        background: "rgb(255, 255, 255)",
        promptToSaveChange: true
    };
    var imageEditor = DWObject.Viewer.createImageEditor(editorSettings);
    imageEditor.show();
}
```

HTML:

```html
<button class="tablinks" onclick="switchTab(event, 'edit')">Edit</button>
......<div id="edit" class="tabcontent">
    <input onclick="ShowImageEditor()" type="button" value="Show Editor" /></div>
```

## 源代码

欢迎下载源代码并尝试使用。最终版本可以在桌面和移动设备上运行。

[https://github.com/xulihang/dynamsoft-samples/tree/main/dwt](https://github.com/xulihang/dynamsoft-samples/tree/main/dwt)