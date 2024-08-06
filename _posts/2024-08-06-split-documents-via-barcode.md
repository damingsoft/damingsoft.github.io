---
layout: post
title: "如何通过条码拆分文档"
date: 2024-08-06 14:00:53 +0800
categories: 文档扫描
tags: 
description: 文章分享了如何批量扫描文档并使用条码进行拆分。使用了Dynamic Web TWAIN和Dynamsoft Barcode Reader。
---

条码通常用于识别零售产品。我们也可以使用它们来标记文档。例如，我们可能需要扫描一批表单。每份表单都有几页内容，第一页上有一个表示表单编号的条码。我们可以使用条码拆分文档，并将表单编号和拆分的文档进行对应。

在本文中，我们将编写一个Web应用，使用[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview/)扫描文档，并通过[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)读取的条码对文档进行拆分。

最终结果的演示视频：

<video src="https://github.com/user-attachments/assets/ddc8a6f6-c6e7-482e-91fc-52383cae7831" data-canonical-src="https://github.com/user-attachments/assets/ddc8a6f6-c6e7-482e-91fc-52383cae7831" controls="controls" muted="muted" style="max-width:100%;max-height:640px;"></video>

## 在网页中扫描文档

让我们先编写一个扫描文档的网页。

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

   ```html
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

   除了使用扫描仪自身的界面进行配置外，我们通过代码直接配置扫描行为。例如自动进纸、分辨率、像素类型、双页扫描等等。

   HTML：

   ```html
   <label>
     Auto Document Feeder:
     <input type="checkbox" id="ADF"/>
   </label>
   <br/>
   <label>
     Duplex:
     <input type="checkbox" id="duplex"/>
   </label>
   <br/>
   <label>
     Resolution:
     <select id="select-resolution">
       <option value="100">100</option>
       <option value="200">200</option>
       <option value="300" selected>300</option>
     </select>
   </label>
   <br/>
   <label>
     Pixel Type:
     <select id="select-pixeltype">
       <option>Black & White</option>
       <option>Gray</option>
       <option selected>Color</option>
     </select>
   </label>
   ```

   JavaScript：

   ```js
   const selectedIndex = document.getElementById("select-scanner").selectedIndex;
   const options = {
     IfShowUI:document.getElementById("showUI").checked,
     PixelType:document.getElementById("select-pixeltype").selectedIndex,
     Resolution:document.getElementById("select-resolution").selectedOptions[0].value,
     IfFeederEnabled:document.getElementById("ADF").checked,
     IfDuplexEnabled:document.getElementById("duplex").checked
   };
   await DWObject.SelectDeviceAsync(scanners[selectedIndex]);
   await DWObject.OpenSourceAsync();
   await DWObject.AcquireImageAsync(options);
   await DWObject.CloseSourceAsync();
   ```

6. 加载已有文件。这可以方便后续的文档拆分测试。

   HTML：

   ```html
   <input type="button" value="Load Files" onclick="LoadFiles();" />
   ```

   JavaScript：

   ```js
   function LoadFiles(){
     DWObject.LoadImageEx(
       "", //file name can be empty if "Open File" dialog is called.
       Dynamsoft.DWT.EnumDWT_ImageType.IT_ALL,
       function () {
         console.log("success");
       },
       function (errorCode, errorString) {
         console.log(errorString);
       }
     );
   }
   ```

## 读取页面上的条码

接下来，让我们使用 Dynamsoft Barcode Reader来读取页面上的条码。


1. 包含Dynamsoft Barcode Reader使用的库。

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-core@3.2.30/dist/core.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.2.10/dist/dbr.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.2.30/dist/cvr.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-license@3.2.21/dist/license.js"></script>
   ```

2. 初始化其许可证。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr)申请许可证。


   ```js
   Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="); //one-day trial
   ```

3. 创建Capture Vision Router的实例以调用Dynamsoft Barcode Reader。

   ```js
   Dynamsoft.Core.CoreModule.loadWasm(["dbr"]); //load the wasm files of barcode reader
   let router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   ```

4. 编写一个将页面图像转换为blob的函数。

   ```js
   async function convertToBlob(index){
     return new Promise((resolve, reject) => {
       DWObject.ConvertToBlob(
         [index],
         Dynamsoft.DWT.EnumDWT_ImageType.IT_PNG,
         function (result, indices, type) {
           resolve(result);
         },
         function (errorCode, errorString) {
           reject(errorString);
         }
       );  
     })
   }
   ```

5. 从blob读取条码。

   ```js
   const i = 0; //the first scanned page
   const blob = await convertToBlob(i);
   let barcodeReadingResult = await router.capture(blob, "ReadBarcodes_Balance");
   ```

## 按条码拆分文档

不同的文档使用条码的方式各不相同。通常，有两种方式：将条码放在第一页，将条码放在最后一页。


1. 创建用于选择使用哪种方式的`select`元素。

   ```html
   <label>
     Barcode Position:
     <select class="barcode-position">
       <option>First Page</option>
       <option>Last Page</option>
     </select>
   </label>
   ```

2. 读取每页上的条码，并根据页面是否包含条码进行拆分。

   ```js
   const FIRST = 0;
   const LAST = 1;
   const total = DWObject.HowManyImagesInBuffer;
   let documents = [];
   let doc;
   for (let i = 0; i < total; i++) {
     DWObject.SelectImages([i]);
     const blob = await convertToBlob(i);
     let barcodeReadingResult = await router.capture(blob, "ReadBarcodes_Balance");  

     if (barcodeReadingResult.items.length>0) {
       if (doc) {
         if (barcodePosition === LAST) {
           doc.imageIndex.push(i);
           doc.barcodes = barcodeReadingResult.items;
         }
         documents.push(doc);
       }
       doc = {barcodes:[],imageIndex:[]} //reinit a document
       if (barcodePosition === FIRST) {
         doc.imageIndex.push(i);
         doc.barcodes = barcodeReadingResult.items;
       }
     }else{
       if (barcodePosition === FIRST) {
         if (doc) {
           doc.imageIndex.push(i);
         }
       }else{
         if (!doc) {
           doc = {barcodes:[],imageIndex:[]} //init a document
         }
         doc.imageIndex.push(i);
       }
     }
   }
   if (doc) {
     documents.push(doc);
   }
   ```

3. 列出按条码分类的文档。

   ```js
   function ListClassifiedDocuments(){
     const documentsContainer = document.getElementsByClassName("documents")[0];
     documentsContainer.innerHTML = "";
     for (let i = 0; i < documents.length; i++) {
       const doc = documents[i];
       let documentContainer = document.createElement("div");
       let title = document.createElement("div");
       title.innerHTML = doc.barcodes[0].text;
       documentContainer.appendChild(title);
       let thumbnailsContainer = document.createElement("div");
       thumbnailsContainer.className = "thumbnails";
       for (let j = 0; j < doc.imageIndex.length; j++) {
         const imageIndex = doc.imageIndex[j];
         const a = document.createElement("a");
         const thumbnailImage = document.createElement("img");
         thumbnailImage.className = "thumbnail";
         thumbnailImage.src = DWObject.GetImageURL(imageIndex);
         a.appendChild(thumbnailImage);
         a.href = thumbnailImage.src;
         a.target = "_blank";
         thumbnailsContainer.appendChild(a);
       }
       documentContainer.appendChild(thumbnailsContainer);
       let saveButton = document.createElement("button");
       saveButton.innerText = "Save as PDF";
       saveButton.className = "save-button";
       saveButton.type = "button";
       documentContainer.appendChild(saveButton);
       saveButton.addEventListener("click",function(){
         DWObject.SelectImages(doc.imageIndex);
         DWObject.SaveSelectedImagesAsMultiPagePDF("form-"+(i+1)+".pdf")
       })
       documentsContainer.appendChild(documentContainer);
     }
   }
   ```

   ![分类的](/album/2024/08/classified-documents.jpg)

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/Dynamic-Web-TWAIN-samples/tree/main/Classification-with-Barcode>
