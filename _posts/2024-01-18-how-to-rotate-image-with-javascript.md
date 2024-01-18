---
layout: post
title: "如何使用JavaScript旋转图像"
date: 2024-01-17 14:29:53 +0800
categories: 文档扫描
tags: 
---

有时我们需要旋转网页上的图像，比如显示正在加载中的动画。在文档扫描Web应用中，我们需要旋转倾斜的或扫描方向错误的文档图像。

在本文中，我们将讨论使用JavaScript旋转图像的三种方法：

* CSS的Transform属性
* HTML5的Canvas
* [Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)，一个文档扫描SDK

## 编写一个HTML5页面以旋转图像

让我们编写一个HTML5页面来旋转图像。

### 新建HTML文件

创建一个包含以下模板的新HTML文件。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rotate an Image with JavaScript</title>
  <style>
  .home {
    display: flex;
    align-items: center;
    flex-direction: column;
  }
  </style>
</head>
<body>
  <div class="home">
    <h2>Rotate an Image</h2>
  </div>
  <script></script>
</body>
</html>
```

### 加载图片

添加用于选择文件的`input`元素，并使用按钮触发它。图片将被加载到两个img元素中，一个用于显示旋转的结果，另一个用于存储原始图像。

HTML：

```html
<button id="loadFileButton">Load a File</button>
<input style="display:none;" type="file" id="file" onchange="loadImageFromFile();" accept=".jpg,.jpeg,.png,.bmp" />
<div class="imageContainer">
  <img id="image"/>
  <img id="imageHidden"/>
</div>
<style>
  .imageContainer {
    max-width: 50%;
  }

  #image {
    max-width: 100%;
  }

  #imageHidden {
    display: none;
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
    document.getElementById("imageHidden").src = e.target.result;
  };
  fileReader.onerror = function () {
    console.warn('oops, something went wrong.');
  };
  fileReader.readAsDataURL(file);
}
```

### 使用CSS旋转图像

我们可以使用CSS属性`transform`来旋转HTML元素，用法如下：

```js
element.style.transform = 'rotate(45deg)';
```

我们还可以指定`transform-origin`这个属性来设置旋转变换的原点。默认情况下，变换的原点是图像中心。

下面是页面中的具体实现。

1. 添加用于指定旋转角度的`input`元素。

   HTML：

   ```html
   <label for="degree">Degree (0-360):</label>
   <input type="number" id="degree" name="degree" min="0" max="360" value="0"/>
   ```

2. 监听`input`元素的`change`事件，用CSS旋转图像。

   ```js
   document.getElementById("degree").addEventListener("change",function(e){
     const degree = e.target.value;
     rotateImage(degree);
   })

   function rotateImage(degree){
     const image = document.getElementById("image");
     const imageHidden = document.getElementById("imageHidden");
     if (!image.src) {
       return; //no image selected
     }
     image.src = imageHidden.src;
     image.style.transform = 'rotate(' + degree + 'deg)';
   }
   ```

使用CSS不会实际上改变图像数据，因此处理速度很快。但是它可能存在overflow的问题，会遮盖住其他元素。我们可以将其容器的overflow CSS属性设置为`auto`，以避免遮住其他元素，但图像将被剪切。

### 使用Canvas旋转图像

HTML5提供了一个`canvas`标签，我们可以用它操作图像数据。我们可以使用它来获得实际旋转后的图像。

1. 向页面添加一个隐藏的`canvas`元素。

   ```html
   <canvas id="canvasHidden"></canvas>
   <style>
     #canvasHidden {
       display: none;
     }
   </style>
   ```

2. 添加一个`select`元素以选择要使用的旋转方法。

   ```html
   <label>
     Method:
     <select id="methodSelect">
       <option>CSS</option>
       <option>Canvas</option>
     </select>
   </label>
   ```

3. 当所选方法为"Canvas"时，使用`canvas`旋转图像。

   ```js
   if (method == 0) {
     image.src = imageHidden.src;
     image.style.transform = 'rotate(' + degree + 'deg)';
   }else if (method == 1){
     image.style.transform = '';
     rotateImageWithCanvas(degree);
   }
   ```

下面我们讨论具体如何使用canvas旋转图像。

1. 获取新的旋转图像的大小。

   旋转后，图像将具有新的大小。我们需要设置canvas的大小以匹配新的图像的大小。假设我们需要围绕图像的中心旋转图像，我们可以使用以下函数来计算新的大小。

   首先，得到四个角点，并计算它们在旋转后的位置。然后，基于这些点获得正外接矩形。

   ```js
   function getBoundingRect(width,height,degree) {
     let rad = Degree2Rad(degree);
     let points = [{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
     let minX = undefined;
     let minY = undefined;
     let maxX = 0;
     let maxY = 0;
     for (let index = 0; index < points.length; index++) {
       const point = points[index];
       const rotatedPoint = getRotatedPoint(point.x,point.y,width/2,height/2,rad);
       if (minX == undefined) {
         minX = rotatedPoint.x;
       }else{
         minX = Math.min(rotatedPoint.x,minX);
       }
       if (minY == undefined) {
         minY = rotatedPoint.y;
       }else{
         minY = Math.min(rotatedPoint.y,minY);
       }
       maxX = Math.max(rotatedPoint.x,maxX);
       maxY = Math.max(rotatedPoint.y,maxY);
     }
     let rectWidth = maxX - minX;
     let rectHeight = maxY - minY;
     let rect = {
       x: minX,
       y: minY,
       width: rectWidth,
       height: rectHeight
     }
     return rect;
   }

   function Degree2Rad(degree){
     return degree*Math.PI/180
   }

   //https://gamedev.stackexchange.com/questions/86755/how-to-calculate-corner-positions-marks-of-a-rotated-tilted-rectangle
   function getRotatedPoint(x,y,cx,cy,theta){
     let tempX = x - cx;
     let tempY = y - cy;

     // now apply rotation
     let rotatedX = tempX*Math.cos(theta) - tempY*Math.sin(theta);
     let rotatedY = tempX*Math.sin(theta) + tempY*Math.cos(theta);

     // translate back
     x = rotatedX + cx;
     y = rotatedY + cy;
     let point = {x:x,y:y};
     return point;
   }
   ```

2. 将canvas的大小设置为旋转图像的大小。

   ```js
   const canvas = document.getElementById("canvasHidden");
   const imgWidth = imageHidden.naturalWidth;
   const imgHeight = imageHidden.naturalHeight;
   const rect = getBoundingRect(imgWidth,imgHeight,degree);
   canvas.width = rect.width;
   canvas.height = rect.height;
   ```

3. 获取canvas的context以执行操作。

   ```js
   const ctx = canvas.getContext("2d");
   ```

4. 使用`translate`将新的`(0,0)`原点位置设置为canvas的中心。

   ```js
   ctx.translate(canvas.width/2,canvas.height/2);
   ```

5. 使用`rotate`设置变换矩阵。

   ```js
   ctx.rotate(Degree2Rad(degree));
   ```

6. 使用`drawImage`绘制图像内容。

   ```js
   ctx.drawImage(imageHidden, -imgWidth/2, -imgHeight/2);
   ```

   我们需要指定在目标canvas中放置源图像左上角的x轴和y轴坐标。在这里，由于新原点是canvas的中心，我们需要使用`-imgWidth/2`和`-imgHeight/2`。

7. 显示旋转后的图像。

   ```js
   image.src = canvas.toDataURL();
   ```

### 使用Dynamic Web TWAIN旋转图像

Dynamic Web TWAIN是一个文档扫描SDK，可以在浏览器中扫描文档。它提供了各种图像处理方法。我们可以使用其[RotateEx](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Edit.html#rotateex)方法旋转图像。

使用它的优点是，它可以用于批量处理大量图像，因为处理是使用本地进程完成的。

以下是使用它的步骤：

1. 在页面中引入Dynamic Web TWAIN。

   ```html
   <script src="https://unpkg.com/dwt@18.4.2/dist/dynamsoft.webtwain.min.js"></script>
   ```
   
2. 添加Dynamic Web TWAIN作为新的旋转方法。

   ```html
   <label>
     Method:
     <select id="methodSelect">
       <option>CSS</option>
       <option>Canvas</option>
       <option>Dynamic Web TWAIN</option>
     </select>
   </label>
   ```

3. 当选择它作为旋转方法时，初始化一个Web TWAIN的实例并使用它来旋转图像。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)申请其许可证。

   ```js
   let DWObject;
   Dynamsoft.DWT.AutoLoad = false;
   Dynamsoft.DWT.ProductKey = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.4.2/dist";
   async function rotateImage(degree){
     const method = document.getElementById("methodSelect").selectedIndex;
     const image = document.getElementById("image");
     const imageHidden = document.getElementById("imageHidden");
     if (!image.src) {
       return;
     }
     if (method == 0) {
       image.src = imageHidden.src;
       image.style.transform = 'rotate(' + degree + 'deg)';
     }else if (method == 1){
       image.style.transform = '';
       rotateImageWithCanvas(degree);
     }else if (method == 2){
       image.style.transform = '';
       if (!DWObject) {
         await init();
       }
       rotateImageWithDWT(degree);
     }
   }
   function init(){
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

   function rotateImageWithDWT(degree){
     return new Promise(async (resolve, reject) => {
       if (DWObject) {
         DWObject.RemoveAllImages();
         let file = document.getElementById("file").files[0];
         let buffer = await file.arrayBuffer();
         DWObject.LoadImageFromBinary(buffer,
         function(){
           const method = document.getElementById("interpolationMethodSelect").selectedOptions[0].value;
           DWObject.RotateEx(0,degree,false,method,
           function(){
             document.getElementById("image").src = DWObject.GetImageURL(0);
           },
           function(errorCode, errorString){
             reject(errorString);
           });
         },
         function(errorCode, errorString){
           reject(errorString);
         })

       }else{
         reject();
       }
     })
   }
   ```

4. 在旋转过程中需要添加新的像素，称为插值。Dynamic Web TWAIN为此提供了几种算法。

   可以添加一个`select`元素用于选择使用哪种算法。

   ```html
   <div class="dwtcontrols">
     <label>
       Interpolation Method:
       <select id="interpolationMethodSelect">
         <option value="1">Nearest Neighbour</option>
         <option value="2">Bilinear</option>
         <option value="3">Bicubic</option>
         <option value="5" selected>Best Quality</option>
       </select>
     </label>
   </div>
   ```

5. Web TWAIN还具有检测文档图像倾斜角度的功能。我们可以用它来确定需要的旋转角度。

   ```js
   DWObject.GetSkewAngle(
     0,
     function(angle) {
       document.getElementById("degree").value = 360+angle;
       rotateImage(360+angle);
     },
     function(errorCode, errorString) {
       console.log(errorString);
     }
   );
   ```


## 源代码

可以在以下仓库中找到所有代码：

<https://github.com/tony-xlh/Rotate-Image-JavaScript>






