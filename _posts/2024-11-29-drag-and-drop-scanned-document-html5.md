---
layout: post
title: "JS通过拖放调整扫描的文档图像"
date: 2024-11-29 16:20:53 +0800
categories: 文档扫描
tags: 
description: 本文介绍了如何通过JavaScript实现拖放以重新排序扫描的文档图像。使用了Dynamsoft Document Viewer的Browse Viewer，并讨论了实现细节。
---

拖放是管理扫描文档图像的一项有用的功能。它允许用户使用鼠标或触摸将项目从一个位置移动到另一个位置。

[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)是为文档图像提供查看、管理功能的SDK。在本文中，我们将演示如何使用它来拖放图像以调整其顺序。此外，我们还将探讨如何使用JavaScript的Drag and Drop API从头实现这一功能。

## 使用Dynamsoft Document Viewer拖放图像

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
     <title>Drag and Drop</title>
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
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.0.0/dist/ddv.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.0.0/dist/ddv.css">
   ```

3. 使用许可证初始化Dynamsoft Document Viewer。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请一个证书。

   ```js
   Dynamsoft.DDV.Core.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.0.0/dist/engine";// Lead to a folder containing the distributed WASM files
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
   let browseViewer = new Dynamsoft.DDV.BrowseViewer({
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

6. 使用`input`选择多个图像或者PDF文件并将其加载到文档实例中，然后可以用Browse Viewer进行查看。

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



然后，我们可以在查看器中拖放以重新排序图像。

<video src="https://github.com/user-attachments/assets/98ab7fd1-40e6-460e-8eb4-21b1aedb3bde" controls="controls" muted="muted" style="max-width:100%;max-height:640px;"></video>


## 从头开始实现拖放

HTML5自带了拖放API。

[在上一篇文章](https://devblogs.damingsoft.com/select-multiple-images-javascript-viewer/)中，我们编写了一个页面，用于查看和选择多张图片。

我们现在给它添加拖放功能。将所选图像拖动到另一个图像上，从而调整图像顺序。


1. 将所选图像元素的draggable属性设置为true。

   ```diff
    function toggleSelection(thumbnail) {
      thumbnail.classList.toggle('selected');
   +  if (thumbnail.classList.contains('selected')) {
   +    thumbnail.getElementsByTagName("img")[0].setAttribute("draggable",true);
   +  }else{
   +    thumbnail.getElementsByTagName("img")[0].setAttribute("draggable",false);
   +  }
    }

    function selectOne(thumbnail) {
      thumbnail.classList.add('selected');
   +  thumbnail.getElementsByTagName("img")[0].setAttribute("draggable",true);
    }

    function clearSelection() {
      let thumbnails = document.querySelectorAll(".thumbnail");
   -  thumbnails.forEach(thumbnail => thumbnail.classList.remove('selected'));
   +  thumbnails.forEach(thumbnail => {
   +    thumbnail.classList.remove('selected')
   +    thumbnail.getElementsByTagName("img")[0].setAttribute("draggable",false);
   +  });
   + }
   ```

2. 添加`dragenter`和`dragleave`事件，为拖入的图像添加效果。同时，记录拖入的图像为`targetImg`变量。

   ```js
   let targetImg;
   img.addEventListener("dragenter",function(){
     img.classList.add("dragHover");
     targetImg = img;
   })
   img.addEventListener("dragleave",function(){
     img.classList.remove("dragHover");
   })
   ```

   CSS：

   ```css
   .dragHover {
     opacity: 0.5;
   }
   ```

3. 添加`dragover`事件以设置拖放效果。

   ```js
   img.addEventListener("dragover",function(e){
     e.dataTransfer.dropEffect = "move";
   })
   ```

4. 添加`dragend`事件，该事件发生时移除拖放效果并执行重新排序。首先，我们得到所有选定的图像，第一个选定的图像的索引和目标图像的索引。然后，如果目标索引大于所选索引，则使用`insertBefore`在目标图像的下一个图像之前插入图像。不是的话，在目标图像的正前方插入图像。

   ```js
   img.addEventListener("dragend",function(){
     img.classList.remove("dragHover");
     if (img.classList.contains("selected") === false) {
       reorder();
     }
   })

   function reorder(){
     const targetThumbnailContainer = targetImg.parentNode;
     targetImg.classList.remove("dragHover");
     const thumbnails = document.getElementsByClassName("thumbnail");
     const selected = [];
     let targetIndex = -1;
     let selectedIndex = -1;
     for (let index = thumbnails.length - 1; index >=0 ; index--) {
       const item = thumbnails[index];
       if (item.classList.contains("selected")) {
         selected.push(item);
         selectedIndex = index;
         if (item === targetThumbnailContainer) { //abort if the target image is also selected
           return;
         }
       }
       if (item === targetThumbnailContainer) {
         targetIndex = index;
       }
     }
     const viewer = document.getElementById("viewer");
     if (selectedIndex>targetIndex) {
       selected.reverse();
     }
     selected.forEach(function(one) {
       if (selectedIndex<targetIndex) {
         viewer.insertBefore(one,targetThumbnailContainer.nextSibling);
       }else{
         viewer.insertBefore(one,targetThumbnailContainer);
       }
     })
   }
   ```

5. 拖放API不适用于触摸设备。我们可以通过在我们的页面中包含以下行来使用polyfill来启用它。

   ```html
   <script src="https://drag-drop-touch-js.github.io/dragdroptouch/dist/drag-drop-touch.esm.min.js?autoload" type="module"></script>
   ```

好了，我们已经用JavaScript实现了拖放功能。

## 源代码

<https://github.com/tony-xlh/document-viewer-samples/tree/main/drag-and-drop>

