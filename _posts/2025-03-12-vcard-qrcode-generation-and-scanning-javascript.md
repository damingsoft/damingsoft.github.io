---
layout: post
title: "vCard名片二维码在前端的生成与扫描"
date: 2025-03-12 09:31:53 +0800
categories: 条码识别
tags: 
description: 本文讨论了如何使用JavaScript构建HTML页面以生成和扫描vCard二维码。
---

<style>
img {
  max-height:400px;
}
</style>

vCard又名VCF（“虚拟联系人文件”），是电子名片的文件格式标准。以下是vCard文件内容的一个示例：

```
BEGIN:VCARD
VERSION:4.0
FN:Simon Perreault
N:Perreault;Simon;;;ing. jr,M.Sc.
BDAY:--0203
GENDER:M
EMAIL;TYPE=work:simon.perreault@viagenie.ca
END:VCARD
```

vCard可通过电子邮件、聊天应用、NFC或网络链接等方式进行分享。不过更方便的方法是扫描二维码。例如用iPhone的相机应用扫描以下二维码，会提示添加联系人。

![vcard二维码](/album/2025/03/vcard-qr-code.jpg)

![vcard二维码iOS摄像头扫描](/album/2025/03/vcard-qr-code-scanning-with-ios-camera.jpg)

在本文中，我们将构建一个用于生成vCard二维码的HTML页面，以及另一个基于[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/) SDK扫描二维码的页面。我们自己编写一个扫描vCard的应用的好处是，可以与Salesforce和Dynamics 365等CRM系统集成，方便管理联系人。

演示视频：


<video src="https://github.com/user-attachments/assets/7cf4e3f4-6c84-4fce-bfd9-e204c2c12fe8" controls="controls" muted="muted" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

## 生成vCard二维码

我们将使用两个第三方库：

* [vCard creator](https://www.npmjs.com/package/vcard-creator)，用于vCard生成
* [qrcode generator](https://github.com/kazuhikoarase/qrcode-generator/tree/master/js)用于生成二维码

1. 创建一个新的HTML文件并引用上述库。

   ```html
   <!DOCTYPE html>
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>vCard QR Code Generator</title>
     <style>
     </style>
     <script type="text/javascript" src="qrcode.js"></script>
     <script type="module">
       import VCard from 'https://cdn.skypack.dev/vcard-creator'
       window.VCard = VCard;
     </script>
   </head>
   <html>
   <body>
     <div id="app">
       <h2>vCard QR Code Generator</h2>
     </div>
     <script>
     </script>
   </body>
   </html>
   ```

2. 创建一个表单来输入联系人信息。

   ```html
   <div class="form">
     <label>
       First name:
       <input type="text" id="firstName"/>
     </label>
     <label>
       Last name:
       <input type="text" id="lastName"/>
     </label>
     <label>
       Phone:
       <input type="text" id="phone"/>
     </label>
     <label>
       Email:
       <input type="text" id="email"/>
     </label>
     <label>
       Company:
       <input type="text" id="company"/>
     </label>
     <label>
       Job title:
       <input type="text" id="jobTitle"/>
     </label>
     <label>
       Website:
       <input type="text" id="website"/>
     </label>
     <button id="generateButton">Generate</button>
   </div>
   ```

3. 使用输入的信息生成二维码。

   ```html
   <div id="placeHolder"></div>
   <script>
   document.getElementById("generateButton").addEventListener("click",generateQRCode);
   function generateQRCode(){
     const card = new VCard()
     const firstName = document.getElementById("firstName").value;
     const lastName = document.getElementById("lastName").value;
     const phone = document.getElementById("phone").value;
     const company = document.getElementById("company").value;
     const jobTitle = document.getElementById("jobTitle").value;
     const website = document.getElementById("website").value;
     const email = document.getElementById("email").value;
     card.addName(lastName, firstName, "", "", "")
       .addCompany(company)
       .addJobtitle(jobTitle)
       .addEmail(email)
       .addPhoneNumber(phone, 'WORK')
       .addURL(website)
     const vcf = card.toString();
     console.log(vcf);
     generateQR(vcf);
   }
   function generateQR(content){
     try {
       var typeNumber = 0;
       var errorCorrectionLevel = 'L';
       var qr = qrcode(typeNumber, errorCorrectionLevel);
       qr.addData(content);
       qr.make();
       var placeHolder = document.getElementById('placeHolder');
       placeHolder.innerHTML = qr.createSvgTag();  
     } catch (error) {
       alert(error);
     }
   }
   </script>
   ```

4. 我们还可以使用现有的vcf文件生成二维码。

   ```html
   <button id="generateWithExistingButton">Generate with an existing vcf file</button>
   <input style="display:none;" type="file" id="file" onchange="loadFromFile();" accept=".vcf"/>
   <script>
   document.getElementById("generateWithExistingButton").addEventListener("click",function(){
     document.getElementById("file").click();
   });

   function loadFromFile(){
     let fileInput = document.getElementById("file");
     let files = fileInput.files;
     if (files.length == 0) {
       return;
     }
     let file = files[0];
     fileReader = new FileReader();
     fileReader.onload = function(e){
       generateQR(e.target.result);
     };
     fileReader.onerror = function () {
       console.warn('oops, something went wrong.');
     };
     fileReader.readAsText(file);
   }
   </script>
   ```

请注意，一个二维码只能包含约2KB的数据。如果需要传输更多数据，可以尝试[动态二维码](https://www.dynamsoft.com/codepool/transfer-data-with-animated-qr-codes.html)的方法。

## 扫描vCard二维码

接下来，创建一个页面来扫描vCard二维码。

### 新建HTML文件

创建一个包含以下内容的新HTML文件：

```html
<!DOCTYPE html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>vCard QR Code Scanner</title>
  <style>
  h2 {
    text-align: center;
  }

  #app {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  #cameraView {
    width: 100%;
    height: 60vh;
  }
  </style>
</head>
<html>
<body>
  <div id="app">
    <h2>vCard Scanner</h2>
    <button id="startScanBtn">Start Scanning</button>
    <button id="readFromImageBtn">Read from an Image</button>
    <input id="fileInput" type="file" style="display:none;"/>
    <div id="status">Loading...</div>
    <div id="cameraView"></div>
    <div id="result"></div>
  </div>
</body>
</html>
```

### 添加Dynamsoft Barcode Reader

添加下面的代码以引入Dynamsoft Barcode Reader：

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader-bundle@10.4.2000/dist/dbr.bundle.js"></script>
```


然后，初始化Dynamsoft Barcode Reader。

1. 初始化许可证。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请许可证。

   ```js
   Dynamsoft.License.LicenseManager.initLicense("LICENSE-KEY");
   ```

2. 加载WASM文件。

   ```js
   Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);
   ```

3. 创建capture vision router实例以调用Dynamsoft Barcode Reader。

   ```js
   let cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   ```

### 打开摄像头扫描

1. 初始化Camera Enhancer并将其组件绑定到一个容器。

   ```js
   let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
   let cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
   document.querySelector("#cameraView").append(cameraView.getUIElement());
   ```

2. 使用Camera Enhancer作为capture vision router的输入，这样它就可以从摄像头获取帧来读取条形码。

   ```js
   cvRouter.setInput(cameraEnhancer);
   ```

3. 添加结果接收器以接收扫描结果。

   ```js
   cvRouter.addResultReceiver({ onDecodedBarcodesReceived: (result) => {
     displayResults(result);
   }});

   function displayResults(result){
     if (result.barcodeResultItems.length > 0) {
       let container = document.getElementById("result");
       let item = result.barcodeResultItems[0];
       console.log(item);
     }
   }
   ```

4. 单击扫描按钮后开始扫描。

   ```js
   let templateName = "ReadSingleBarcode"
   await cameraEnhancer.open();
   await cvRouter.startCapturing(templateName);
   ```

### 解析vCard

接下来，解析vCard的文本并显示联系人信息。

```html
<!-- https://github.com/Heymdall/vcard/ -->
<script type="text/javascript" src="vcf.js"></script>
<script>
function formatedContactInfo(barcodeText) {
  try {
    let parsed = parse(barcodeText);
    let presetKeys = {"fn":"Full name","org":"Organization","title":"Job Title","url":"URL","tel":"Tel","email":"Email"};
    let str = "";
    for (let index = 0; index < Object.keys(presetKeys).length; index++) {
      const key = Object.keys(presetKeys)[index];
      const value = presetKeys[key];
      if (key in parsed) {
        let appendedValue = "";
        let valueArray = parsed[key];
        valueArray.forEach(valueObject => {
          appendedValue = appendedValue + valueObject.value + "\n";
        });
        str = str + value + ": " +appendedValue.trim() + "\n";
      }
    }
    vCardContent = barcodeText;
    document.getElementsByClassName("buttons")[0].removeAttribute("hidden");
    return str;
  } catch (error) {
    return "Invalid vCard."
  }
}
</script>
```

### 下载为VCF文件

我们可以将vCard下载为`.vcf`文件。它可以通过系统的联系人应用程序打开。

```js
function downloadText(){
  let filename = 'scanned.vcf';
  let link = document.createElement('a');
  link.style.display = 'none';
  link.setAttribute('target', '_blank');
  link.setAttribute('href', 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vCardContent));
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

### 读取图像中的二维码

除了实时扫描，我们还可以读取图像中的vCard二维码。

添加用于选择图像文件的事件。选择图像后，使用`capture`方法识别其中的条码。

```js
document.getElementById("readFromImageBtn").addEventListener("click",function(){
  if (initialized) {
    document.getElementById("fileInput").click();
  }else{
    alert("Please wait for the initialization.");
  }
});
document.getElementById("fileInput").addEventListener("change",async function(){
  let files = document.getElementById("fileInput").files;
  if (files.length>0) {
    let file  = files[0];
    let result = await cvRouter.capture(file,templateName);
    displayResults(result);
  }
})
```


好了，demo已经编写好了。


## 源代码

获取源代码来自己试用一下吧：

* 生成器：<https://github.com/tony-xlh/online-vcard-qr-code-generator>
* 扫描器：<https://github.com/tony-xlh/vcard-qr-code-scanner>


