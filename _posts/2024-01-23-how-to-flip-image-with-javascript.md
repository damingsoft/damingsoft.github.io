---
layout: post
title: "如何使用JavaScript翻转图像"
date: 2024-01-22 17:19:53 +0800
categories: 文档扫描
tags: 
---

有时，我们可能需要翻转Web应用中的媒体元素。例如，我们可能需要翻转用于显示相机预览的video元素，以匹配我们实际看到的内容，或者更正翻转的扫描文档的图像。

在本文中，我们将讨论使用JavaScript翻转图像的三种方法。

* CSS
* Canvas
* [Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview) ，一个文档扫描SDK

[在线demo](https://tony-xlh.github.io/Flip-Image-JavaScript)

## 编写一个HTML5页面以调整翻转图像

使用以下模板创建一个新的HTML5页面，然后让我们为其添加翻转图像的功能。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flip an Image with JavaScript</title>
  <style>
  </style>
</head>
<body>
  <div class="home">
    <h2>Flip an Image</h2>
    <button id="flipButton">Flip</button>
  </div>
  <script>
  </script>
</body>
</html>
```


### 选择所需方向

我们可以在两个方向上翻转图像：水平和垂直。可以添加一个`select`元素来选择所需的方向。

```html
<label>
  Direction:
  <select id="directionSelect">
    <option>Horizontal</option>
    <option>Vertical</option>
  </select>
</label>
```

### 加载图片

添加用于选择文件的`input`元素，并使用按钮触发它。图片将被加载到一个img元素中。

HTML：

```html
<button id="loadFileButton">Load a File</button>
<input style="display:none;" type="file" id="file" onchange="loadImageFromFile();" accept=".jpg,.jpeg,.png,.bmp" />
<div class="imageContainer">
  <img id="image"/>
</div>
<style>
  .imageContainer {
    overflow: auto;
  }
  #image {
    max-width: 50%;
  }
</style>
```

JavaScript：

```js
function loadImageFromFile(){
  let fileInput = document.getElementById("file");
  let files = fileInput.files;
  if (files.length == 0) {
    return;
  }
  let file = files[0];
  fileReader = new FileReader();
  fileReader.onload = function(e){
    document.getElementById("image").src = e.target.result;
  };
  fileReader.onerror = function () {
    console.warn('oops, something went wrong.');
  };
  fileReader.readAsDataURL(file);
}
```

### 使用CSS翻转图像

我们可以使用CSS属性`transform`来翻转HTML元素，用法如下：

```js
img.style.transform = "scaleY(-1)"; //flip vertically
img.style.transform = "scaleX(-1)"; //flip horizontally
img.style.transform = "scaleX(-1) scaleY(-1)"; //flip both vertically and horizontally
```

下面是在页面中写的用于翻转图像的代码，它会记住之前的翻转状态。

```js
function flipImageWithCSS(){
  let img = document.getElementById("image");
  if (document.getElementById("directionSelect").selectedIndex == 0) {
    if (img.style.transform.indexOf("scaleX") != -1) {
      img.style.transform = img.style.transform.replace("scaleX(-1)","");
    }else{
      img.style.transform = img.style.transform+" scaleX(-1)";
    }
  }else{
    if (img.style.transform.indexOf("scaleY") != -1) {
      img.style.transform = img.style.transform.replace("scaleY(-1)","");
    }else{
      img.style.transform = img.style.transform+" scaleY(-1)";
    }
  }
}
```

### 使用Canvas翻转图像

HTML5提供了一个`canvas`标签，我们可以用它操作图像数据。与只改变视觉效果的CSS不同，我们可以使用它来实际获得翻转的图像。

1. 向页面添加一个隐藏的`canvas`元素。

   ```html
   <canvas id="canvasHidden"></canvas>
   <style>
     #canvasHidden {
       display: none;
     }
   </style>
   ```

2. 添加一个`select`元素以选择要使用的翻转方法。

   ```html
   <label>
     Method:
     <select id="methodSelect">
       <option>CSS</option>
       <option>Canvas</option>
     </select>
   </label>
   ```

3. 当所选方法为"Canvas"时，使用`canvas`翻转图像。

   ```js
   let method = document.getElementById("methodSelect").selectedIndex;
   if (method == 0) {
     flipImageWithCSS();
   }else if (method == 1){
     document.getElementById("image").style.transform = "";
     flipImageWithCanvas();
   }
   ```

使用Canvas翻转图像的具体步骤：

1. 将canvas的大小设置为图像的大小。

   ```js
   const image = document.getElementById("image");
   const canvas = document.getElementById("canvasHidden");
   canvas.width = image.naturalWidth;
   canvas.height = image.naturalHeight;
   ```

2. 获取canvas的context以执行操作。

   ```js
   const ctx = canvas.getContext("2d");
   ```

3. 将原点`(0,0)`设置为`(width,0)`，然后在水平方向上使用缩放系数-1处理图像以水平翻转图像。我们可以使用类似的逻辑来垂直翻转图像。

   ```js
   if (document.getElementById("directionSelect").selectedIndex == 0) {
     context.translate(width, 0);
     context.scale(-1, 1);
   }else{
     context.translate(0, height);
     context.scale(1, -1);
   }
   ```

4. 使用`drawImage`绘制图像内容。

   ```js
   context.drawImage(image, 0, 0);
   ```

5. 显示翻转后的图像。

   ```js
   image.src = canvas.toDataURL();
   ```

### 使用Dynamic Web TWAIN翻转图像

Dynamic Web TWAIN是一个文档扫描SDK，可以在浏览器中扫描文档。它提供了各种图像处理方法。我们可以使用其[Flip](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Edit.html#flip)和[Mirror](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Edit.html#mirror)方法翻转图像。

使用它的优点是，它可以用于批量处理大量图像，因为处理是使用本地进程完成的。

以下是使用它的步骤：

1. 在页面中引入Dynamic Web TWAIN。

   ```html
   <script src="https://unpkg.com/dwt@18.4.2/dist/dynamsoft.webtwain.min.js"></script>
   ```

2. 初始化一个Web TWAIN的实例并使用它来翻转图像。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)申请其许可证。

   ```js
   let DWObject;
   Dynamsoft.DWT.AutoLoad = false;
   Dynamsoft.DWT.ProductKey = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.4.2/dist";

   async function flipImageWithWebTWAIN(){
     if (!DWObject) {
       await initDWT();
     }
     DWObject.RemoveAllImages();
     let response = await fetch(document.getElementById("image").src);
     let buffer = await response.arrayBuffer();
     DWObject.LoadImageFromBinary(buffer,
     function(){
       if (document.getElementById("directionSelect").selectedIndex == 0) {
         DWObject.Mirror(0,
         function(){ //success
           document.getElementById("image").src = DWObject.GetImageURL(0);
         },
         function(errorCode, errorString){ //fail
           console.log(errorString);
         });
       }else{
         DWObject.Flip(0,
         function(){ //success
           document.getElementById("image").src = DWObject.GetImageURL(0);
         },
         function(errorCode, errorString){ //fail
           console.log(errorString);
         });
       }
     },
     function(errorCode, errorString){
       console.log(errorString);
     })
   }

   function initDWT(){
     return new Promise((resolve, reject) => {
       const title = document.querySelector("h2").innerText;
       document.querySelector("h2").innerText = "Loading Dynamic Web TWAIN...";
       Dynamsoft.DWT.CreateDWTObjectEx(
       {
         WebTwainId: 'dwtcontrol'
       },
       function(obj) {
         DWObject = obj;
         document.querySelector("h2").innerText = title;
         resolve();
       },
       function(err) {
         console.log(err);
         document.querySelector("h2").innerText = "Failed to load Dynamic Web TWAIN";
         reject(err);
       }
     );
     })
   }
   ```

## 源代码

可以在以下仓库中找到所有代码和在线演示：

<https://github.com/tony-xlh/Flip-Image-JavaScript>






