---
layout: post
title: 前端转换PDF为图像
date: 2023-12-20 16:03:53 +0800
categories: 文档扫描
tags: PDF
---

将PDF转换为图像是我们日常工作中的一项常见任务。转换成图像能便于存档或者进一步的编辑，如OCR。使用Dynamic Web TWAIN这一内置各种文件格式支持的文档扫描JavaScript库，我们可以在前端将PDF转换为图像。

在本文中，我们将编写一个demo来进行这一转换。

[在线demo](https://tony-xlh.github.io/PDF2Image/)

## 新建HTML文件

创建一个包含以下模板的新HTML文件。

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Convert PDF to Images</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>
    </style>
  </head>
  <body>
    <div class="app">
    </div>
    <script>
    </script>
  </body>
</html>
```

## 引入Dynamic Web TWAIN

在HTML的head中，从CDN引入Dynamic Web TWAIN的库。

```html
<script src="https://unpkg.com/dwt@18.4.2/dist/dynamsoft.webtwain.min.js"></script>
```

## 初始化Dynamic Web TWAIN

1. 在HTML代码中添加一个容器，以存放Web TWAIN的控件。

   ```html
   <div class="viewer">
     <div id="dwtcontrolContainer"></div>
   </div>
   ```

2. 加载Dynamic Web TWAIN并将其控件绑定到这一容器。需要一个产品密钥。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)申请。

   ```js
   let DWObject; //an instance of Web TWAIN
   Dynamsoft.DWT.AutoLoad = false;
   Dynamsoft.DWT.ProductKey = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.4.2/dist";
   init();

   function init(){
     Dynamsoft.DWT.Containers = [{ ContainerId: 'dwtcontrolContainer',Width: 270, Height: 350 }];
     Dynamsoft.DWT.RegisterEvent('OnWebTwainReady', function () {
       DWObject = Dynamsoft.DWT.GetWebTwain('dwtcontrolContainer');
       DWObject.Viewer.width = "100%";
       DWObject.Viewer.height = "100%";
       DWObject.SetViewMode(1,1);
     });
     Dynamsoft.DWT.Load();
   }
   ```

## 加载PDF文件

接下来，我们可以使用[LoadImageEX](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_IO.html#loadimageex)方法将PDF文件加载到Web TWAIN的缓冲区中。

```js
DWObject.IfShowFileDialog = true; //"Open File" dialog will be opened.
DWObject.LoadImageEx(
  "", //file name can be empty if "Open File" dialog is called.
  Dynamsoft.DWT.EnumDWT_ImageType.IT_PDF,
  function () {
    console.log("success");
  },
  function (errorCode, errorString) {
    console.log(errorString);
  }
);
```

有一些读取PDF文件的选项可以配置。

* 转换模式：
   * 仅图像(image only)。直接提取PDF文件中的图像。
   * 渲染所有(render all)。将页面渲染为图像。输出图像的分辨率和位深度可能与其原始值不同。
   * 自动(auto)。根据PDF页面是否只包含一个图像，自动判断要使用的模式。
* 分辨率：指定页面渲染的DPI。仅在使用“渲染所有”模式时有效。
* 带标记的渲染：渲染PDF中的标记或者注释。
* 密码：用于加密的PDF。

在页面中添加相关元素进行配置，并在调用`LoadImageEX`方法前应用配置。

HTML：

```html
<div class="options">
  PDF Rasterizer Options:
  <br/>
  <label>
    Convert mode:
    <select id="modeSelect">
      <option>Auto</option>
      <option>Image only</option>
      <option>Render all</option>
    </select>
  </label>
  <br/>
  <label>
    Render annotations:
    <input type="checkbox" id="renderAnnotationCheckbox" />
  </label>
  <br/>
  <label>
    Password:
    <input type="password" id="password" />
  </label>
  <br/>
  <label>
    Resolution:
    <select id="resolutionSelect">
      <option>200</option>
      <option>300</option>
      <option>600</option>
    </select>
  </label>
</div>
```

JavaScript：

```js
let convertMode;
let convertModeSelect = document.getElementById("modeSelect");
if (convertModeSelect.selectedIndex === 0) {
  convertMode = Dynamsoft.DWT.EnumDWT_ConvertMode.CM_AUTO;
}else if (convertModeSelect.selectedIndex === 1) {
  convertMode = Dynamsoft.DWT.EnumDWT_ConvertMode.CM_IMAGEONLY;
}else{
  convertMode = Dynamsoft.DWT.EnumDWT_ConvertMode.CM_RENDERALL;
}
let password = document.getElementById("password").value;
let renderAnnotations = document.getElementById("renderAnnotationCheckbox").checked;
let resolution = parseInt(document.getElementById("resolutionSelect").selectedOptions[0].innerText);
let readerOptions = {
    convertMode: convertMode,
    password: password,
    renderOptions: {
      resolution: resolution,
      renderAnnotations: renderAnnotations
    }
};
DWObject.Addon.PDF.SetReaderOptions(readerOptions);
```

## 导出为JPG文件

接下来，我们可以将缓冲区中的图像导出为JPG文件。我们可以将它们转换为blob并下载它们。

```js
async function Download(){
  if (DWObject) {
    DWObject.IfShowFileDialog = false;
    for (let index = 0; index < DWObject.HowManyImagesInBuffer; index++) {
      DWObject.SelectImages([index]);
      let blob = await getBlob();
      downloadBlob((index+1)+".jpg",blob);
    }
  }
}

function downloadBlob(filename,blob){
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function getBlob(){
  return new Promise((resolve, reject) => {
    if (DWObject.GetImageBitDepth(DWObject.CurrentImageIndexInBuffer) == 1) {
      //Convert black & white images to gray
      DWObject.ConvertToGrayScale(DWObject.CurrentImageIndexInBuffer);
    }
    DWObject.ConvertToBlob([DWObject.CurrentImageIndexInBuffer],Dynamsoft.DWT.EnumDWT_ImageType.IT_JPG,
      function(blob){
        resolve(blob);
      },
      function(_errorCode, errorString){
        reject(errorString);
      }
    )
  })
}
```

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/PDF2Image>



