---
layout: post
title: "如何使用JavaScript将图像合并为PDF"
date: 2024-07-01 16:30:53 +0800
categories: 文档扫描
tags: 
description: 本文讨论了如何使用Dynamsoft Document Viewer SDK和JavaScript将图像合并为PDF。
---

在日常工作中，我们可能需要拍摄一些照片并将图像合并到PDF文件中。这可以通过许多应用来完成。[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)让这一操作更加方便，因为它可以在浏览器中执行。可以集成该操作到我们的在线网站、CRM系统中。

在本文中，我们将使用Dynamsoft Document Viewer创建一个Web应用，用JavaScript将图像合并到PDF中。

## 新建HTML文件

创建一个包含以下模板的新HTML文件。

```html
<!DOCTYPE html>
<html>
<head>
  <title>Document Scanner</title>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
  <style>
  </style>
</head>
<body>
  <h2>Merge Images into PDF</h2>
  <script>
  </script>
</body>
</html>
```

## 添加依赖项

在页面中包含Dynamsoft Document Viewer。

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.css">
```

## 选择文件

接下来，选择要合并的文件。

添加用于选择多个文件的`input`元素。

```html
<input type="file" name="file" id="file" multiple="multiple">
```

然后，我们可以使用以下JavaScript获取所选文件：

```js
let fileInput = document.getElementById("file");
let files = fileInput.files;
```

## 将图像合并为PDF

在页面中添加按钮以执行合并图像到PDF的操作。

HTML：

```html
<button onclick="merge()">Merge into PDF</button>
```

JavaScript：

1. 使用许可证初始化Dynamsoft Document Viewer。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=mwc)申请许可证。

   ```js
   Dynamsoft.DDV.Core.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; // Public trial license which is valid for 24 hours
   Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/engine";// Lead to a folder containing the distributed WASM files
   await Dynamsoft.DDV.Core.loadWasm();
   await Dynamsoft.DDV.Core.init();
   Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());
   ```

2. 使用Dynamsoft Document Viewer的`DocumentManager`创建新的文档实例。

   ```js
   const doc = Dynamsoft.DDV.documentManager.createDocument();
   ```

3. 以blob格式读取文件并将其加载到文档中。

   ```js
   let fileInput = document.getElementById("file");
   let files = fileInput.files;
   for (let index = 0; index < files.length; index++) {
     const file = files[index];
     const source = await readFileAsBlob(file);
     try {
       await doc.loadSource(source);  
     } catch (error) {
       console.log(error);
     }
   }

   function readFileAsBlob(file){
     return new Promise((resolve, reject) => {
       let fileReader = new FileReader();
       fileReader.onload = function(e){
         const blob = new Blob([new Uint8Array(e.target.result)], {type: file.type });
         resolve(blob);
       };
       fileReader.onerror = function () {
         reject();
       };
       fileReader.readAsArrayBuffer(file);
     })
   }
   ```

4. 将图像保存为PDF。

   ```js
   const blob = await doc.saveToPdf();
   ```

5. 通过以下函数下载PDF。

   ```js
   function downloadBlob(blob){
     const link = document.createElement('a')
     link.href = URL.createObjectURL(blob);
     link.download = "scanned.pdf";
     document.body.appendChild(link)
     link.click()
     document.body.removeChild(link)
     URL.revokeObjectURL(link.href);
   }
   ```

## 使用编辑界面

Dynamsoft Document Viewer附带一系列组件。在合并到PDF文件之前，我们可以使用其EditViewer查看和编辑图像。

在HTML中添加容器。

```html
<div id="container" style="height:480px;"></div>
```

使用以下代码启动它。

```js
let editViewer = new Dynamsoft.DDV.EditViewer({
  container: "container",
});
editViewer.openDocument(doc.uid);
```

![EditViewer](/album/2024/07/editviewer.jpg)

我们可以旋转、裁剪、重新排序和删除图像，并为图像应用滤镜。

## 源代码

下载源代码并尝试使用：

<https://github.com/tony-xlh/Merge-Images-to-PDF>

