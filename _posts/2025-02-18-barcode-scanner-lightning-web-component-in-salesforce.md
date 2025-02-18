---
layout: post
title: "如何编写一个Lightning Web Component在Salesforce中扫描条码"
date: 2025-02-18 10:29:53 +0800
categories: 条码扫描
tags: 
description: 文章分享了如何编写一个用于扫描条码的Salesforce Lightning Web Component。
---

在本文中，我们将创建一个Lightning Web Component（LWC），用于在著名的CRM系统Salesforce中扫描条码，以便快速输入数据。使用了[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)扫码SDK。

由于Dynamsoft Barcode Reader使用WASM，而WASM默认情况下无法在Salesforce LWC中运行，我们需要使用`iframe`嵌入一个条码扫描网页，使用`postMessage`在网页和组件之间进行通信。

演示视频：

<video src="https://github.com/user-attachments/assets/d1a3e387-83fc-4dd2-93cd-7adfa53f5149" controls="controls" muted="muted" style="max-width: 100%;max-height:640px; min-height: 200px"></video>

## 环境配置

* 安装Salesforce CLI。
* 安装Visual Studio Code和Salesforce DX扩展。

可以在[这里](https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components/set-up-salesforce-dx)找到详细的指南。

## 新建Salesforce DX项目

打开Visual Studio Code，按Ctrl + Shift + P（ Windows ）或Cmd + Shift + P（ macOS ）打开命令面板，然后输入SFDX，选择`Create Project`操作。

![新项目](https://devblogs.damingsoft.com/album/2024/06/salesforce/new_project.jpg)

在这里，我们使用标准选项。

然后，运行`SFDX: Create Lightning Web Component`，创建名为`barcodeScanner`的组件。


## 创建条码扫描网页

创建一个新的HTML文件，命名为`barcode-scanner.html`并包含以下内容。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请许可证。

```html
<!DOCTYPE html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Barcode Scanner</title>
  <style>
  #cameraView {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
  }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader-bundle@10.4.2000/dist/dbr.bundle.js"></script>
</head>
<html>
<body>
  <div id="cameraView"></div>
  <script>
    let cvRouter;
    let cameraEnhancer;
    let scanning = false;
    window.addEventListener(
      "message",
      async (event) => {
        console.log("received message in iframe");
        console.log(event);
        if (event.data === "toggle") {
          toggleScanning();
        }
      },
      false,
    );

    initBarcodeScanner();
    async function initBarcodeScanner(){
      Dynamsoft.License.LicenseManager.initLicense("LICENSE-KEY");
      Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);
      cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
      let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
      cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
      document.querySelector("#cameraView").append(cameraView.getUIElement());
      cvRouter.setInput(cameraEnhancer);

      const resultsContainer = document.querySelector("#results");
      cvRouter.addResultReceiver({ onDecodedBarcodesReceived: (result) => {
        console.log(result);
        window.parent.postMessage(result);
      }});
      window.parent.postMessage({initialized:true});
    }

    async function toggleScanning() {
      if (!cvRouter) {
        alert("Please wait for the initialization...");
        return;
      }
      if (!scanning) {
        await cameraEnhancer.open();
        await cvRouter.startCapturing("ReadBarcodes_Balance");
      }else{
        await cvRouter.stopCapturing();
        await cameraEnhancer.close();
      }
      scanning = !scanning;
    }
  </script>
</body>
</html>
```

它可以打开相机扫描条码，可以接收消息来控制扫描状态，并将条码结果发送回父级页面。

## 添加静态资源

1. 在`staticresources`文件夹下新建一个文件夹。
2. 将`barcode-scanner.html`放入这个文件夹。
2. 在`staticresources`文件夹中创建一个名为`foldername.resource-meta.xml`的元数据文件，并用以下内容描述资源。

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
       <cacheControl>Private</cacheControl>
       <contentType>application/zip</contentType>
   </StaticResource>
   ```

## 实现Lightning Web Component

现在，转到我们创建的Lightning Web Component。

1. 在HTML文件中添加元素。

   ```html
   <template>
     <lightning-card title="Barcode Scanner">
       <lightning-button
                 label="Toggle Scanning"
                 onclick={toggleScanning}
       ></lightning-button>
       <div>
         <label>
           Barcode:&nbsp;
           <span>{barcodeValue}</span>
         </label>
       </div>
       <div class="viewer" id="viewer" style="height:500px;width:400px;"></div>
     </lightning-card>
   </template>
   ```

2. 组件挂载后，添加iframe。

   ```js
   import dwt from '@salesforce/resourceUrl/dwt'; //import path of the resources folder
   export default class BarcodeScanner extends LightningElement {
     initialized = false;
     dbrFrame;

     renderedCallback() {
       if (this.initialized) {
           return;
       }
       this.initialized = true;
       this.dbrFrame = document.createElement('iframe');
       this.dbrFrame.src = dwt + "/barcode-scanner.html";
       // div tag in which iframe will be added should have id attribute with value myDIV
       this.template.querySelector("div.viewer").appendChild(this.dbrFrame);
       // provide height and width to it
       this.dbrFrame.setAttribute("style","height:100%;width:100%;");
     }
   }
   ```

3. 单击切换扫描按钮时，通过postMessage控制iframe中页面的扫描状态。

   ```js
   toggleScanning(){
     this.dbrFrame.contentWindow.postMessage("toggle");
   }
   ```

4. 接收条码结果。

   ```js
   barcodeResult;
   window.addEventListener(
     "message",
     (event) => {
       console.log(event);
       if (event.data.barcodeResultItems) {
         this.barcodeResult = event.data.barcodeResultItems[0];
       }
     },
     false,
   );
   ```

5. 显示条码文本。

   ```js
   get barcodeValue() {
     if (this.barcodeResult) {
       return this.barcodeResult.text;
     }else{
       return "";
     }
   }
   ```

## 源代码

下载源代码并尝试使用：

<https://github.com/tony-xlh/Dynamic-Web-TWAIN-samples/tree/main/Salesforce/webTWAIN>


