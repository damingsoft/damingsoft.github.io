---
layout: post
title: "前端实现图片多选"
date: 2024-08-08 15:35:53 +0800
categories: 文档扫描
tags: 
description: 本文介绍了如何使用JavaScript在一个图片查看器中选择多张图片。它可以根据不同的快捷键应用不同的选择模式。
---

在文档扫描过程中，我们可能需要选择多个图像以进行重新排序、编辑和导出等操作。这时我们通常需要一个支持多选的文档查看器。

[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)是一个提供该种功能的SDK。它提供了一组查看器用于文档相关的操作。在本文中，我们将演示如何使用它来浏览和选择多张图片。此外，我们还将探讨如何从头实现这样一个查看器。

## 使用Dynamsoft Document Viewer浏览和选择多个图像

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
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.css">
   ```

3. 使用许可证初始化Dynamsoft Document Viewer。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense/?product=mwc)申请一个证书。

   ```js
   Dynamsoft.DDV.Core.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/engine";// Lead to a folder containing the distributed WASM files
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

6. 使用`input`选择多个图像文件并将其加载到文档实例中，然后可以用Browse Viewer进行查看。

   HTML：

   ```html
   <label>
     Select images to load:
     <br/>
     <input type="file" id="files" name="files" multiple onchange="filesSelected()"/>
   </label>
   ```

   JavaScript：

   ```js
   async function filesSelected(){
     let filesInput = document.getElementById("files");
     let files = filesInput.files;
     if (files.length>0) {
       for (let index = 0; index < files.length; index++) {
         const file = files[index];
         const blob = await readFileAsBlob(file);
         await doc.loadSource(blob); // load image
       }    
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

我们可以使用热键进行多选。按住CTRL键可选择和取消选择一个图像，按住SHIFT键可选择一系列图像。

<video src="https://github.com/user-attachments/assets/d6390af5-b5f7-4537-b3e7-c994ee5f8543" data-canonical-src="https://github.com/user-attachments/assets/d6390af5-b5f7-4537-b3e7-c994ee5f8543" controls="controls" muted="muted" style="max-width:100%;max-height:640px;"></video>

Browse Viewer内部使用Canvas实现，有较好的性能。

## 从头开始实现支持多选的查看器

那么我们可以如何实现多选？下面是分步实现过程。

1. 创建一个容器作为查看器。它会列出文档图像的缩略图。

   ```html
   <div id="viewer">
     <div class="thumbnail selected">
       <img src="blob:http://127.0.0.1:8000/d837ea7d-56aa-4d7c-baba-dde7503b72dd" style="height: 168px;">
     </div>
     <div class="thumbnail">
       <img src="blob:http://127.0.0.1:8000/62819aff-5f5b-4766-9b5c-92586bace2d6" style="height: 168px;">
     </div>
   </div>
   ```

   样式：

   它使用`flex`布局来对齐组件。

   查看器的CSS：

   ```css
   #viewer {
     display: flex;
     flex-wrap: wrap;
     align-content: flex-start;
     width: 320px;
     height: 480px;
     overflow: auto;
     background: lightgray;
     border: 1px solid black;
   }
   ```

   缩略图的CSS：

   ```css
   :root {
     --thumbnail-width: 140px;
   }

   .thumbnail {
     display: inline-flex;
     width: var(--thumbnail-width);
     height: 200px;
     padding: 5px;
     margin: 5px;
     align-items: center;
     justify-content: center;
   }

   .thumbnail:hover {
     background: gray;
   }

   .thumbnail.selected {
     background: gray;
   }

   .thumbnail.selected img {
     border: 1px solid orange;
   }

   .thumbnail img {
     width: 100%;
     max-height: 100%;
     object-fit: contain;
     border: 1px solid transparent;
   }
   ```

2. 从所选文件加载图像。根据图像比率及其容器的宽度对图像元素的高度进行调整。

   ```js
   let thumbnailWidth = 130;
   async function filesSelected(){
     let filesInput = document.getElementById("files");
     let files = filesInput.files;
     if (files.length>0) {
       for (let index = 0; index < files.length; index++) {
         const file = files[index];
         const blob = await readFileAsBlob(file);
         const url = URL.createObjectURL(blob);
         appendImage(url);
       }
     }
   }

   function appendImage(url){
     let viewer = document.getElementById("viewer");
     let thumbnailContainer = document.createElement("div");
     thumbnailContainer.className = "thumbnail";
     let img = document.createElement("img");
     img.src = url;
     img.onload = function(){
       let height = thumbnailWidth/(img.naturalWidth/img.naturalHeight);
       img.style.height = Math.floor(height) + "px";
     }
     thumbnailContainer.appendChild(img);
     viewer.appendChild(thumbnailContainer);
   }
   ```

3. 根据是否存在滚动条调整缩略图的宽度。这里，我们通过更改自定义CSS属性来实现这一点。

   ```js
   function updateWidthBaseOnScrollBar(){
     let viewer = document.getElementById("viewer");
     if (viewer.scrollHeight>viewer.clientHeight) {
       let scrollBarWidth = viewer.offsetWidth - viewer.clientWidth;
       let width = 140 - Math.ceil(scrollBarWidth/2);
       document.documentElement.style.setProperty('--thumbnail-width', width + "px");
     }else{
       document.documentElement.style.setProperty('--thumbnail-width', "140px");
     }
   }
   ```

4. 为缩略图添加单击事件以选择多个图像。

   ```js
   thumbnailContainer.addEventListener("click",function(){
     const isMultiSelect = event.ctrlKey || event.metaKey;
     const isRangeSelect = event.shiftKey;
     const index = getIndex(thumbnailContainer);
     if (isMultiSelect) {
       toggleSelection(thumbnailContainer);
     } else if (isRangeSelect && lastSelectedIndex !== -1) {
       const firstSelectedIndex = getFirstSelectedIndex();
       if (firstSelectedIndex != -1) {
         selectRange(firstSelectedIndex, index);
       }else{
         selectRange(lastSelectedIndex, index);
       }
     } else {
       clearSelection();
       selectOne(thumbnailContainer);
     }
     lastSelectedIndex = index;
   })
   ```

   如果没有按下任何键，选择被点击的单张图。

   ```js
   clearSelection();
   selectOne(thumbnailContainer);

   function selectOne(thumbnail) {
     thumbnail.classList.add('selected');
   }

   function clearSelection() {
     let thumbnails = document.querySelectorAll(".thumbnail");
     thumbnails.forEach(thumbnail => thumbnail.classList.remove('selected'));
   }
   ```

   如果按下CTRL键，则切换被单击图的选择状态。

   ```js
   function toggleSelection(thumbnail) {
     thumbnail.classList.toggle('selected');
   }
   ```

   如果按下SHIFT键，则选中从第一个被选图到当前被点击的图的所有图片。

   ```js
   const firstSelectedIndex = getFirstSelectedIndex();
   if (firstSelectedIndex != -1) {
     selectRange(firstSelectedIndex, index);
   }else{
     selectRange(lastSelectedIndex, index);
   }

   function selectRange(start, end) {
     let thumbnails = document.querySelectorAll(".thumbnail");
     clearSelection();
     const [startIndex, endIndex] = start < end ? [start, end] : [end, start];
     for (let i = startIndex; i <= endIndex; i++) {
       selectOne(thumbnails[i]);
     }
   }
   ```

演示视频：

<video src="https://github.com/user-attachments/assets/229239b8-410d-4632-a4e2-0a4053ec6f6b" data-canonical-src="https://github.com/user-attachments/assets/229239b8-410d-4632-a4e2-0a4053ec6f6b" controls="controls" muted="muted" style="max-width:100%;max-height:640px;"></video>

## 源代码

<https://github.com/tony-xlh/document-viewer-samples/>

