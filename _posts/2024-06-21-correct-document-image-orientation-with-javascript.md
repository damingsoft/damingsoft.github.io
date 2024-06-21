---
layout: post
title: "如何使用JavaScript检测并纠正颠倒的文档图像"
date: 2024-06-21 10:10:53 +0800
categories: 文档扫描
tags: 
description: 本文分享了如何使用JavaScript检测并纠正颠倒的文档图像。它使用两种方法来检测方向。一个是使用文档扫描仪内置的功能，另一个是使用Tesseract-OCR。使用Dynamic Web TWAIN作为文档扫描SDK。
---

通过扫描仪扫描文档时，我们可能会得到方向错误的文档图像。自动送纸功能的使用使这种情况更加常见。我们可以使用图像处理来检测文档方向并进行纠正，检测的方法有很多。例如，对于拉丁字母文本，小写字母高出字母x高度的部分出现的概率，比低于字母x高度的部分的概率要大。[^paper]

![文本行剖析](/album/2024/06/document-orientation/anatomy-of-text-line.jpg)

在本文中，我们将编写一个Web应用，用JavaScript扫描文档并纠正其方向。如果文档扫描仪具有内置的方向校正功能，则使用它。如果没有，则使用Tesseract-OCR检测方向后再对图像进行旋转。此外，使用[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview/) SDK用于扫描文档。

[在线demo](https://github.com/tony-xlh/Document-Orientation-Correction)

演示视频：

<video src="https://github.com/xulihang/Document-Orientation-Correction/assets/5462205/9fc3dd39-c5a0-4dbb-b951-69056c40db8d" data-canonical-src="https://github.com/xulihang/Document-Orientation-Correction/assets/5462205/9fc3dd39-c5a0-4dbb-b951-69056c40db8d" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-height:640px;max-width:100%;">
</video>

在演示视频中，首先，使用松下KV-N1058X，在关闭自动文档方向功能的情况下扫描了一张纸。然后，在启用该功能的情况下再进行扫描，以查看该功能是否正常工作。最后，使用Tesseract-OCR检测哪些文档图像是颠倒的，并旋转它们。

## 创建一个文档扫描Web应用

我们先编写一个Web应用来扫描文档。

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Document Scanning via TWAIN</title>
     <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
   </head>
   <body>
     <h2>Document Scanning via TWAIN</h2>
     <script type="text/javascript">
     </script>
   </body>
   </html>
   ```

2. 在head引入Dynamic Web TWAIN的库。

   ```html
   <script src="https://unpkg.com/dwt@18.5.0/dist/dynamsoft.webtwain.min.js"></script>
   ```

3. 初始化一个Web TWAIN的实例并将其控件绑定到一个容器。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=dwt)申请其许可证。

   HTML：

   ```html
   <div id="dwtcontrolContainer"></div>
   ```

   JavaScript：

   ```js
   let DWObject;
   let scanners;
   initDWT();

   function initDWT(){
     Dynamsoft.DWT.AutoLoad = false;
     Dynamsoft.DWT.Containers = [];
     Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.5.0/dist";
     let oneDayTrialLicense = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
     Dynamsoft.DWT.ProductKey = oneDayTrialLicense;  
     Dynamsoft.DWT.CreateDWTObjectEx(
       {
         WebTwainId: 'dwtcontrol'
       },
       function(obj) {
         DWObject = obj;
         DWObject.Viewer.bind(document.getElementById('dwtcontrolContainer'));
         DWObject.Viewer.height = "480px";
         DWObject.Viewer.width = "360px";
         DWObject.Viewer.show();
         DWObject.Viewer.setViewMode(2,2);
       },
       function(err) {
         console.log(err);
       }
     );
   }
   ```

4. 列出连接的扫描仪。

   ```js
   let scanners;
   async function loadScanners(){
     scanners = await DWObject.GetDevicesAsync();
     let selScanners = document.getElementById("select-scanner");
     selScanners.innerHTML = "";
     for (let index = 0; index < scanners.length; index++) {
       const scanner = scanners[index];
       let option = new Option(scanner.displayName,index);
       selScanners.appendChild(option);
     }
   }
   ```

5. 使用所选扫描仪扫描文档。它将显示扫描仪的配置界面以执行扫描。

   HTML：

   ```
   <input type="button" value="Scan" onclick="AcquireImage();" />
   ```

   JavaScript：

   ```js
   async function AcquireImage() {
     if (DWObject) {
       const selectedIndex = document.getElementById("select-scanner").selectedIndex;
       const options = {
         IfShowUI:true,
       };
       await DWObject.SelectDeviceAsync(scanners[selectedIndex]);
       await DWObject.OpenSourceAsync();
       await DWObject.AcquireImageAsync(options);
       await DWObject.CloseSourceAsync();
     }
   }
   ```

## 使用文档扫描仪的自动旋转功能

许多文档扫描仪能够自动旋转方向错误的文档图像。我们可以启用它，这样扫描时就能直接得到经过校正的文档图像。

### 通过UI启用自动旋转

我们可以直接在扫描仪的UI界面中进行设置。

以下是松下KV-N1058X的用户界面的截图。需要启用`Automatic Image Orientation`选项。

![扫描仪UI](/album/2024/06/document-orientation/ui.jpg)

我们还可以指定目标语言。

![扫描仪UI -语言](/album/2024/06/document-orientation/ui-language.jpg)

### 通过代码启用自动旋转

我们可以使用TWAIN通过代码控制文档扫描仪。Dynamic Web TWAIN提供以下API来使用文档扫描仪的功能。

* [getCapabilities](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Acquire.html#getcapabilities)
* [setCapabilities](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Acquire.html#setcapabilities)

使用以下代码启用`自动旋转(Automatic Rotate)`功能。如果设置失败，则说明该文档扫描仪不具备此功能。

```js
function enableOrientationCorrection(){
  return new Promise((resolve, reject) => {
    let config = {
        "exception": "fail",
        "capabilities": [
            {
                "capability": Dynamsoft.DWT.EnumDWT_Cap.ICAP_AUTOMATICROTATE,
                "curValue": 1 // 0: disabled, 1: enabled
            }
        ]
    };
    DWObject.setCapabilities(config,
    function(e){
      console.log(e);
      resolve();
    },
    function(failData){
      console.log(failData);
      reject("error");
    })
  });
}
```


## 使用Tesseract-OCR进行方向校正

如果文档扫描仪不具备自动旋转功能，我们可以自己检测方向，然后旋转图像来进行修正。这里，我们使用Tesseract-OCR来检测方向。

1. 在页面中包含`Tesseract.js`库。

   ```html
   <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
   ```

2. 使用OSD方向检测训练数据和旧版引擎创建一个worker。

   ```js
   const worker = await Tesseract.createWorker('osd', 1, {
     legacyCore: true,
     legacyLang: true,
     logger: m => console.log(m),
   });
   ```

3. 将扫描的文档图像转换为blob ，并使用Tesseract检测方向。如果检测到的角度为180，说明文档是颠倒的，对其进行旋转。

   ```js
   for (let index = 0; index < DWObject.HowManyImagesInBuffer; index++) {
     DWObject.SelectImages([index]);
     let image = await getBlob(index);
     const { data } = await worker.detect(image);
     if (data.orientation_degrees == 180) {
       console.log("need correction")
       DWObject.Rotate(index,180,true);
     }
   }
   ```

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/Document-Orientation-Correction>

## 参考文献

[^paper]: Joost van Beusekom, Faisal Shafait, and Thomas M. Breuel. 2010. Combined orientation and skew detection using geometric text-line modeling. Int. J. Doc. Anal. Recognit. 13, 2 (June 2010), 79–92. https://doi.org/10.1007/s10032-009-0109-5
