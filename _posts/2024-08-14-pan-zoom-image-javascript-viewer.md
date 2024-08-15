---
layout: post
title: "如何使用JavaScript平移和缩放图像"
date: 2024-08-14 09:38:53 +0800
categories: 文档扫描
tags: 
description: 本文分享了如何使用JavaScript平移和缩放图像。使用了Dynamsoft Document Viewer的Edit Viewer，并讨论了实现细节。
---

平移和缩放是查看图像时常用的功能。我们可以放大图像以查看更多细节，进行图像编辑。

[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)是一个用于此目的的SDK，它为文档图像提供了一组查看器。在本文中，我们将演示如何使用它来平移和缩放图像。此外，我们还将探讨如何使用JavaScript从头实现这一功能。

## 使用Dynamsoft Document Viewer平移和缩放图像

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
     <title>Edit Viewer</title>
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

5. 创建一个Edit Viewer实例，将其绑定到一个容器，然后用它来查看我们刚刚创建的文档。

   HTML：

   ```html
   <div id="viewer"></div>
   ```

   JavaScript：

   ```js
   const uiConfig = {
     type: Dynamsoft.DDV.Elements.Layout,
     flexDirection: "column",
     className: "ddv-edit-viewer-mobile",
     children: [
       Dynamsoft.DDV.Elements.MainView // the view which is used to display the pages
     ],
   };
   editViewer = new Dynamsoft.DDV.EditViewer({
     uiConfig: uiConfig,
     container: document.getElementById("viewer")
   });

   editViewer.openDocument(doc.uid);
   ```

   CSS：

   ```css
   #viewer {
     width: 320px;
     height: 480px;
   }
   ```

6. 使用`input`选择图像文件并将其加载到文档实例中，然后可以用Edit Viewer进行查看。

   HTML：

   ```html
   <label>
     Select an image:
     <br/>
     <input type="file" id="files" name="files" onchange="filesSelected()"/>
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
       await doc.loadSource(blob); // load image
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



然后，我们可以按住控制键，使用鼠标滚轮放大、缩小和平移图像。在移动设备上，我们可以通过双指实现缩放。下面的视频中，可以看到图片还会跟随鼠标或者触摸点。

<video src="https://github.com/user-attachments/assets/d1416d22-06cf-4c37-8593-2a6002dd45d0" controls="controls" muted="muted" style="max-width:100%;max-height:640px;"></video>


## 从头开始实现平移和缩放

有几种方法可以实现平移和缩放。

1. 使用绝对像素值。它易于理解，可以有滚动条。
2. 使用CSS transform。它可以使用GPU来获得更好的性能，但不能保留滚动条。
3. 使用Canvas。它具有较高的性能和定制性。Dynamsoft Document Viewer使用此方法。

下面，我们将使用第一种方式进行演示。

1. 创建一个容器作为查看器。包含一张图像。

   ```html
   <div id="viewer">
     <img id="image"/>
   </div>
   ```

   样式：

   使用`flex`布局来对齐组件。

   查看器的CSS：

   ```css
   #viewer {
     width: 320px;
     height: 480px;
     padding: 10px;
     border: 1px solid black;
     overflow: auto;
     display: flex;
     align-items: center;
   }
   ```

   图片的CSS：

   ```css
   #image {
     margin: auto;
   }
   ```

2. 加载所选图像文件。使图像的宽度适合查看器。

   ```js
   let currentPercent;
   async function filesSelected(){
     let filesInput = document.getElementById("files");
     let files = filesInput.files;
     if (files.length>0) {
       const file = files[0];
       const blob = await readFileAsBlob(file);
       const url = URL.createObjectURL(blob);
       loadImage(url);
     }
   }

   function loadImage(url){
     let img = document.getElementById("image");
     img.src = url;
     img.onload = function(){
       let viewer = document.getElementById("viewer");
       let percent = 1.0;
       resizeImage(percent);
     }
   }

   function resizeImage(percent){
     currentPercent = percent;
     let img = document.getElementById("image");
     let viewer = document.getElementById("viewer");
     let borderWidth = 1;
     let padding = 10;
     let ratio = img.naturalWidth/img.naturalHeight;
     let newWidth = (viewer.offsetWidth - borderWidth*2 - padding*2) * percent
     img.style.width = newWidth + "px";
     img.style.height = newWidth/ratio + "px";
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


3. 添加一个wheel事件，以便在按下控制键的情况下使用鼠标进行缩放。

   ```js
   img.addEventListener("wheel",function(e){
     if (e.ctrlKey || e.metaKey) {
       if (e.deltaY < 0) {
         zoom(true);
       }else{
         zoom(false);
       }
       e.preventDefault();
     }
   });

   function zoom(zoomin,percentOffset){
     let offset = percentOffset ?? 0.1;
     if (zoomin) {
       currentPercent = currentPercent + offset;
     }else{
       currentPercent = currentPercent - offset;
     }
     currentPercent = Math.max(0.1,currentPercent);
     resizeImage(currentPercent);
   }
   ```

4. 添加pointer事件以使用鼠标或触摸屏实现平移。

   ```js
   let downPoint;
   let downScrollPosition;
   img.addEventListener("pointerdown",function(e){
     previousDistance = undefined;
     downPoint = {x:e.clientX,y:e.clientY};
     downScrollPosition = {x:viewer.scrollLeft,y:viewer.scrollTop}
   });
   img.addEventListener("pointerup",function(e){
     downPoint = undefined;
   });
   img.addEventListener("pointermove",function(e){
     if (downPoint) {
       let offsetX = e.clientX - downPoint.x;
       let offsetY = e.clientY - downPoint.y;
       let newScrollLeft = downScrollPosition.x - offsetX;
       let newScrollTop = downScrollPosition.y - offsetY;
       viewer.scrollLeft = newScrollLeft;
       viewer.scrollTop = newScrollTop;
     }
   });
   ```

5. 添加touchmove事件以支持缩放。计算两个触摸点的距离，以知道需要放大还是缩小。

   ```js
   img.addEventListener("touchmove",function(e){
     if (e.touches.length === 2) {
       const distance = getDistanceBetweenTwoTouches(e.touches[0],e.touches[1]);
       if (previousDistance) {
         if ((distance - previousDistance)>0) { //zoom
           zoom(true,0.02);
         }else{
           zoom(false,0.02);
         }
         previousDistance = distance;
       }else{
         previousDistance = distance;
       }
     }
     e.preventDefault();
   });

   function getDistanceBetweenTwoTouches(touch1,touch2){
     const offsetX = touch1.clientX - touch2.clientX;
     const offsetY = touch1.clientY - touch2.clientY;
     const distance = offsetX * offsetX + offsetY + offsetY;
     return distance;
   }
   ```

好了，我们已经用JavaScript实现了平移和缩放功能。

## 源代码

<https://github.com/tony-xlh/document-viewer-samples/>

