---
layout: post
title: "前端实现PDF加解密"
date: 2024-12-25 14:01:53 +0800
categories: 文档扫描
tags: 
description: 文章分享了如何使用Dynamsoft Document Viewer在前端实现加密和解密PDF文件。
---

我们可以对PDF文件加密以保护其内容。在这种情况下，需要输入密码才能查看或编辑内容。[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)是一个用于文档扫描和查看的JavaScript SDK，可以在前端对PDF文件进行加密和解密。在本文中，我们将探讨如何使用它。

## 使用Dynamsoft Document Viewer打开一个PDF文件

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
     <title>Browse Viewer</title>
     <style>
     </style>
   </head>
   <body>
   </body>
   <script>
   </script>
   </html>
   ```

2. 在页面中包含Dynamsoft Document Viewer的文件。

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.1.0/dist/ddv.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.1.0/dist/ddv.css">
   ```

3. 使用许可证初始化Dynamsoft Document Viewer。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请一个证书。

   ```js
   Dynamsoft.DDV.Core.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.1.0/dist/engine";// Lead to a folder containing the distributed WASM files
   await Dynamsoft.DDV.Core.init();
   ```

4. 创建一个新的文档实例。

   ```js
   const docManager = Dynamsoft.DDV.documentManager;
   const doc = docManager.createDocument();
   ```

5. 创建一个Browse Viewer实例，将其绑定到一个容器，然后用它来查看我们刚刚创建的文档。

   HTML：

   ```html
   <div id="viewer"></div>
   ```

   JavaScript：

   ```js
   const browseViewer = new Dynamsoft.DDV.BrowseViewer({
     container: document.getElementById("viewer"),
   });

   browseViewer.openDocument(doc.uid);
   ```

   CSS：

   ```css
   #viewer {
     width: 320px;
     height: 480px;
   }
   ```

6. 使用`input`选择一个PDF文件并将其加载到文档实例中，然后可以用Browse Viewer进行查看。

   HTML：

   ```html
   <label>
     Select a PDF file to load:
     <br/>
     <input type="file" id="files" name="files" accept=".pdf" onchange="filesSelected()"/>
   </label>
   ```

   JavaScript：

   ```js
   async function filesSelected(){
     let filesInput = document.getElementById("files");
     let files = filesInput.files;
     if (files.length>0) {
       const file = files[0];
       const blob = await readFileAsBlob(file);
       await doc.loadSource(blob); // load the PDF file
     }
   }

   function readFileAsBlob(file){
     return new Promise((resolve, reject) => {
       const fileReader = new FileReader();
       fileReader.onload = async function(e){
         const response = await fetch(e.target.result);
         const blob = await response.blob();
         resolve(blob);
       };
       fileReader.onerror = function () {
         reject('oops, something went wrong.');
       };
       fileReader.readAsDataURL(file);
     })
   }
   ```

## 打开受密码保护的PDF文件

如果PDF受密码保护，使用默认配置打开时会抛出错误，提示我们需要输入密码才能打开它。

```js
Error: Failed to read the PDF file because it's encrypted and the correct password is not provided.
```

我们可以捕获该错误并要求用户输入密码。

HTML：

```html
<div class="modal input-modal">
  <div>
    <label>
      Please input the password:
    </label>
    <br/>
    <input type="password" id="password"/>
    <br/>
    <button id="okayBtn">Okay</button>
  </div>
</div>
```

CSS：

```css
.modal {
  display: flex;
  align-items: flex-start;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 250px;
  border: 1px solid gray;
  border-radius: 5px;
  background: white;
  z-index: 9999;
  padding: 10px;
  visibility: hidden;
}

.input-modal.active {
  visibility: inherit;
}
```

JavaScript：

```js
function filesSelected(){
  //...
  try {
    await doc.loadSource(blob);
  } catch (error) {
    if (error.cause.code === -80202) {
      askForPassword();
    }
  }
}

function askForPassword(){
  document.getElementById("password").value = ""; //clear previous password
  document.getElementsByClassName("input-modal")[0].classList.add("active");
}

document.getElementById("okayBtn").addEventListener("click",async function(){
  document.getElementsByClassName("input-modal")[0].classList.remove("active");
  try {
    await doc.loadSource({fileData:blob,password:document.getElementById("password").value});  
  } catch (error) {
    alert(error);
  }
})
```

需要将密码传入`loadSource`方法：

```js
await doc.loadSource({fileData:blob,password:document.getElementById("password").value});  
```

## 保存为受密码保护的PDF文件

不设密码保存文档为PDF，可以创建一个解密的PDF文件。设了密码的话，则创建一个加密的PDF文件。

```html
<div>
  <label>Set a password:
    <input type="password" id="newPassword"/>
  </label>
</div>
<script>
let newPassword = document.getElementById("newPassword").value;
let blob;
if (newPassword) {
  blob = await doc.saveToPdf({password:newPassword});
}else{
  blob = await doc.saveToPdf();
}
</script>
```

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/PDF-Encryption-JavaScript>

