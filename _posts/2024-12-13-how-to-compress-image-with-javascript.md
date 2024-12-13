---
layout: post
title: "如何使用JavaScript压缩图像"
date: 2024-12-13 09:40:53 +0800
categories: 文档扫描
tags: 
description: 本文将分享如何通过更改分辨率、位深、图像格式、图像质量等，使用JavaScript压缩图像。
---

在浏览器端压缩图像是一个有用的操作。它可以提高上传性能、节省存储空间。在本文中，我们将讨论如何使用[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html) SDK用JavaScript压缩图像。

我们可以通过更改以下方面来压缩图像：

* 分辨率
* 颜色深度
* 图像格式
* 图像质量

[在线demo](https://tony-xlh.github.io/image-compression-javascript/)

## 新建HTML页面

创建包含以下内容的新页面：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Image Compression</title>
  <style>
  </style>
</head>
<body>
</body>
<script>
</script>
</html>
```

## 添加Dynamsoft Document Viewer

Dynamsoft Document Viewer为文档扫描提供了多个组件。它支持多种图像处理方法和图像格式，我们可以用它来压缩图像。让我们把它添加到页面中。

1. 包括Dynamsoft Document Viewer的CSS和JavaScript文件

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.css">
   ```

2. 设置许可证。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。

   ```js
   //one-day trial license
   let license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
   Dynamsoft.DDV.Core.license = license;
   ```

3. 初始化库。

   ```js
   Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/engine";// Lead to a folder containing the distributed WASM files
   await Dynamsoft.DDV.Core.init();
   ```

4. 创建doc实例，用于加载和保存图像文件。

   ```js
   let doc;
   const docManager = Dynamsoft.DDV.documentManager;
   doc = docManager.createDocument();
   ```

5. 从blob加载图像，用于之后的处理。

   ```js
   await doc.loadSource(imgBlob);
   ```


## 降低分辨率

降低分辨率可以显著缩小尺寸。

代码：

```js
function resize(newWidth, newHeight){
  const pageUid = doc.pages[0];
  const pageData = await doc.getPageData(pageUid)
  const imageProcess = Dynamsoft.DDV.Experiments.get("ImageProcess");
  const result = await imageProcess.process({type:3, data:pageData.display.data}, {type:13/*resize*/, params:{newWidth:newWidth, newHeight:newHeight, mode:2}});
  const newImage = new Blob([result.output],{type:result.outputContentType});
  await doc.updatePage(pageUid, newImage, {});
}
```

例子：

![分辨率](/album/2024/12/image-compressing/resolution.jpg)

512x512分辨率的`lena.png`，分辨率改到256x256后，大小从482KB降到了110KB。

## 降低色彩深度

我们可以将图像转换为8位灰度图像或1位黑白图像以减小大小。

代码：

```js
async function performColorConversion(type){
  const pageUid = doc.pages[0];
  const pageData = await doc.getPageData(pageUid)
  const imageProcess = Dynamsoft.DDV.Experiments.get("ImageProcess");
  const result = await imageProcess.process({type:3, data:pageData.display.data}, {type: type/*1: blackAndWhite 2: gray*/, params:{saveInk:false, level:1}});
  const newImage = new Blob([result.output],{type:result.outputContentType});
  await doc.updatePage(pageUid, newImage, {});
}
```

例子：

![灰度](/album/2024/12/image-compressing/grayscale.jpg)

![黑白](/album/2024/12/image-compressing/black-and-white.jpg)

`lena.png`文件可从482KB的文件缩小为200KB的灰度文件或11KB的黑白文件。

## 降低图像质量

某些图像格式（如JPEG ）支持设置图像质量。它会降低图像质量以减小尺寸。如果质量没有设置得太小，图像将不会有明显的变化，但可以缩小尺寸。

代码：

```js
let blob = await doc.saveToJpeg(0,{quality: 50});
```

例子：

![图像质量](/album/2024/12/image-compressing/image-quality.jpg)

使用0.1质量，`lena.jpg`文件可从125KB的文件减少到10KB的文件。

## 使用压缩率较高的图像格式

我们可以使用多种图像格式或压缩算法来压缩图像。后四个主要用于压缩PDF文件。

* JPEG - 一种有损图像算法
* PNG - 一种支持无损数据压缩的光栅图形文件格式
* WebP - 一种现代图像格式，可为网络图像提供卓越的无损和有损压缩功能
* JP2000 - 更现代的JPEG替代方案
* CCITT-4 (FAX4) - 用于单色图像
* JBIG2 - CCITT压缩单色图像的替代方案
* LZW - 用于压缩文本和图像


代码：

```js
let blob;
let quality = 1.0;
let imageFormat = "image/webp";
const isPDF = imageFormat.indexOf("pdf") != -1;
if (imageFormat === "image/png") {
  blob = await doc.saveToPng(0,{});
}else if (imageFormat === "image/jpeg") {
  blob = await doc.saveToJpeg(0,{quality: quality*100});
  console.log({quality: quality*100});
}else if (imageFormat === "image/webp") {
  let pngBlob = await doc.saveToPng(0,{});
  blob = await convertBlobToWebP(pngBlob,quality);
}else if (isPDF) {
  blob = await doc.saveToPdf([0],{quality: quality*100,compression:imageFormat});
}

function convertBlobToWebP(blob,quality){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    let tmpImg = document.createElement("img");
    tmpImg.onload = function(){
      let width = tmpImg.naturalWidth;
      let height = tmpImg.naturalHeight;
      let context = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      context.drawImage(tmpImg, 0, 0, tmpImg.naturalWidth, tmpImg.naturalHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob)=>{
        resolve(blob);
      },"image/webp",quality)
    }
    tmpImg.src = url;
  })
}
```

## 压缩测试

下面是使用以下图像，用不同参数压缩图像的测试结果：[链接](https://github.com/user-attachments/assets/09b67826-078f-450b-a1f7-b06264ab4812)。

<table>
  <thead>
    <tr>
      <th>颜色转换</th>
      <th>图像格式</th>
      <th>质量</th>
      <th>大小</th>
      <th>运行耗时</th>
      <th>压缩率</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>不做转换 </td><td>image/png</td><td>1</td><td>9506.63KB</td><td>1763ms</td><td>440.60%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.1</td><td>272.04KB</td><td>580ms</td><td>12.61%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.2</td><td>326.59KB</td><td>613ms</td><td>15.14%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.3</td><td>375.83KB</td><td>581ms</td><td>17.42%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.4</td><td>428.28KB</td><td>598ms</td><td>19.85%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.5</td><td>498.50KB</td><td>618ms</td><td>23.10%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.6</td><td>576.01KB</td><td>608ms</td><td>26.70%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.7</td><td>750.01KB</td><td>590ms</td><td>34.76%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.8</td><td>1069.88KB</td><td>590ms</td><td>49.59%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>0.9</td><td>1827.61KB</td><td>604ms</td><td>84.70%</td></tr><tr><td>不做转换 </td><td>image/jpeg</td><td>1</td><td>4049.13KB</td><td>635ms</td><td>187.66%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.1</td><td>103.14KB</td><td>2869ms</td><td>4.78%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.2</td><td>119.90KB</td><td>2804ms</td><td>5.56%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.3</td><td>137.97KB</td><td>2912ms</td><td>6.39%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.4</td><td>162.52KB</td><td>2816ms</td><td>7.53%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.5</td><td>189.29KB</td><td>2951ms</td><td>8.77%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.6</td><td>218.95KB</td><td>2886ms</td><td>10.15%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.7</td><td>245.80KB</td><td>2852ms</td><td>11.39%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.8</td><td>355.04KB</td><td>2946ms</td><td>16.45%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>0.9</td><td>817.46KB</td><td>3029ms</td><td>37.89%</td></tr><tr><td>不做转换 </td><td>image/webp</td><td>1</td><td>5964.65KB</td><td>4900ms</td><td>276.44%</td></tr><tr><td>不做转换 </td><td>pdf/jbig2</td><td>1</td><td>1070.78KB</td><td>684ms</td><td>49.63%</td></tr><tr><td>不做转换 </td><td>pdf/fax4</td><td>1</td><td>1070.78KB</td><td>613ms</td><td>49.63%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.1</td><td>1.11KB</td><td>2398ms</td><td>0.05%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.2</td><td>1.51KB</td><td>2612ms</td><td>0.07%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.3</td><td>35.31KB</td><td>2599ms</td><td>1.64%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.4</td><td>239.69KB</td><td>2550ms</td><td>11.11%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.5</td><td>1976.63KB</td><td>2592ms</td><td>91.61%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.6</td><td>3915.27KB</td><td>2570ms</td><td>181.46%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.7</td><td>4577.19KB</td><td>2568ms</td><td>212.14%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.8</td><td>4782.33KB</td><td>2551ms</td><td>221.65%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>0.9</td><td>4836.04KB</td><td>2547ms</td><td>224.13%</td></tr><tr><td>不做转换 </td><td>pdf/jp2000</td><td>1</td><td>4843.24KB</td><td>2550ms</td><td>224.47%</td></tr><tr><td>不做转换 </td><td>pdf/lzw</td><td>1</td><td>9142.31KB</td><td>1243ms</td><td>423.72%</td></tr><tr><td>灰度</td><td>image/png</td><td>1</td><td>6001.92KB</td><td>573ms</td><td>278.17%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.1</td><td>224.03KB</td><td>268ms</td><td>10.38%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.2</td><td>277.29KB</td><td>262ms</td><td>12.85%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.3</td><td>327.86KB</td><td>258ms</td><td>15.20%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.4</td><td>388.02KB</td><td>266ms</td><td>17.98%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.5</td><td>407.98KB</td><td>260ms</td><td>18.91%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.6</td><td>777.40KB</td><td>272ms</td><td>36.03%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.7</td><td>951.35KB</td><td>284ms</td><td>44.09%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.8</td><td>1012.78KB</td><td>278ms</td><td>46.94%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>0.9</td><td>1406.44KB</td><td>283ms</td><td>65.18%</td></tr><tr><td>灰度</td><td>image/jpeg</td><td>1</td><td>3213.54KB</td><td>313ms</td><td>148.94%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.1</td><td>98.02KB</td><td>1419ms</td><td>4.54%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.2</td><td>117.39KB</td><td>1473ms</td><td>5.44%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.3</td><td>136.96KB</td><td>1439ms</td><td>6.35%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.4</td><td>162.58KB</td><td>1466ms</td><td>7.53%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.5</td><td>191.67KB</td><td>1483ms</td><td>8.88%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.6</td><td>225.83KB</td><td>1539ms</td><td>10.47%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.7</td><td>257.49KB</td><td>1504ms</td><td>11.93%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.8</td><td>391.60KB</td><td>1611ms</td><td>18.15%</td></tr><tr><td>灰度</td><td>image/webp</td><td>0.9</td><td>856.50KB</td><td>1717ms</td><td>39.70%</td></tr><tr><td>灰度</td><td>image/webp</td><td>1</td><td>5990.37KB</td><td>3264ms</td><td>277.63%</td></tr><tr><td>灰度</td><td>pdf/jbig2</td><td>1</td><td>1013.68KB</td><td>418ms</td><td>46.98%</td></tr><tr><td>灰度</td><td>pdf/fax4</td><td>1</td><td>1013.68KB</td><td>335ms</td><td>46.98%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.1</td><td>1.09KB</td><td>1429ms</td><td>0.05%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.2</td><td>1.49KB</td><td>1428ms</td><td>0.07%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.3</td><td>35.25KB</td><td>1425ms</td><td>1.63%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.4</td><td>247.83KB</td><td>1447ms</td><td>11.49%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.5</td><td>1759.55KB</td><td>1459ms</td><td>81.55%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.6</td><td>3337.76KB</td><td>1499ms</td><td>154.69%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.7</td><td>3816.45KB</td><td>1461ms</td><td>176.88%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.8</td><td>3878.43KB</td><td>1488ms</td><td>179.75%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>0.9</td><td>3884.98KB</td><td>1466ms</td><td>180.06%</td></tr><tr><td>灰度</td><td>pdf/jp2000</td><td>1</td><td>3885.36KB</td><td>1460ms</td><td>180.07%</td></tr><tr><td>灰度</td><td>pdf/lzw</td><td>1</td><td>5301.60KB</td><td>476ms</td><td>245.71%</td></tr><tr><td>黑白</td><td>image/png</td><td>1</td><td>130.18KB</td><td>115ms</td><td>6.03%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.1</td><td>363.82KB</td><td>374ms</td><td>16.86%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.2</td><td>472.41KB</td><td>190ms</td><td>21.89%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.3</td><td>570.84KB</td><td>192ms</td><td>26.46%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.4</td><td>642.30KB</td><td>191ms</td><td>29.77%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.5</td><td>706.09KB</td><td>192ms</td><td>32.72%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.6</td><td>771.68KB</td><td>195ms</td><td>35.76%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.7</td><td>855.62KB</td><td>198ms</td><td>39.66%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.8</td><td>974.84KB</td><td>194ms</td><td>45.18%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>0.9</td><td>1222.58KB</td><td>195ms</td><td>56.66%</td></tr><tr><td>黑白</td><td>image/jpeg</td><td>1</td><td>2258.45KB</td><td>215ms</td><td>104.67%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.1</td><td>290.87KB</td><td>1037ms</td><td>13.48%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.2</td><td>327.36KB</td><td>1057ms</td><td>15.17%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.3</td><td>352.60KB</td><td>832ms</td><td>16.34%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.4</td><td>378.89KB</td><td>856ms</td><td>17.56%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.5</td><td>396.79KB</td><td>875ms</td><td>18.39%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.6</td><td>416.35KB</td><td>869ms</td><td>19.30%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.7</td><td>432.61KB</td><td>858ms</td><td>20.05%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.8</td><td>469.18KB</td><td>868ms</td><td>21.74%</td></tr><tr><td>黑白</td><td>image/webp</td><td>0.9</td><td>543.33KB</td><td>889ms</td><td>25.18%</td></tr><tr><td>黑白</td><td>image/webp</td><td>1</td><td>107.07KB</td><td>259ms</td><td>4.96%</td></tr><tr><td>黑白</td><td>pdf/jbig2</td><td>1</td><td>58.00KB</td><td>198ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/fax4</td><td>1</td><td>127.27KB</td><td>124ms</td><td>5.90%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.1</td><td>58.00KB</td><td>185ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.2</td><td>58.00KB</td><td>189ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.3</td><td>58.00KB</td><td>175ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.4</td><td>58.00KB</td><td>185ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.5</td><td>58.00KB</td><td>176ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.6</td><td>58.00KB</td><td>175ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.7</td><td>58.00KB</td><td>177ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.8</td><td>58.00KB</td><td>189ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>0.9</td><td>58.00KB</td><td>177ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/jp2000</td><td>1</td><td>58.00KB</td><td>184ms</td><td>2.69%</td></tr><tr><td>黑白</td><td>pdf/lzw</td><td>1</td><td>127.27KB</td><td>110ms</td><td>5.90%</td></tr>
  </tbody>
</table>

## 源代码

可以在以下仓库中找到所有代码和在线演示：

<https://github.com/tony-xlh/image-compression-javascript>






