---
layout: post
title: "如何检测重复的文档图像"
date: 2024-04-24 10:20:53 +0800
categories: 文档扫描
tags: 
description: 本文讨论了如何使用JavaScript来检测重复的文档图像。
---

在将文档数字化时，我们可能会不小心重复扫描文档图像。手动查找重复图像是一项麻烦的事情。在本文中，我们将使用JavaScript自动检测重复的文档图像。

## 如何计算两张图像之间的相似度

我们需要比较两张图片，计算相似度，以检查它们是否有相同的内容。

计算两张图像之间相似度的方法有很多。主要可分为两类。

1. 计算像素差异（例如[pixelmatch](https://github.com/mapbox/pixelmatch)、[MSE](https://pyimagesearch.com/2014/09/15/python-compare-two-images/) ）。
2. 提取特征并检查特征是否匹配（例如，[SIFT](https://github.com/adumrewal/SIFTImageSimilarity)、[卷积神经网络](https://github.com/ryanfwy/image-similarity)）。

在本文中，我们将使用文档图像最明显的特征：文本。我们将使用OCR提取图像的文本，并使用编辑距离来计算相似度。

## JavaScript Implementation

以下是执行此操作的关键的JavaScript代码段。

1. 使用`tesseract`提取文本。存储文本行结果，过滤掉小的和可信度低的文本行。

   ```ts
   import { createWorker,Worker } from 'tesseract.js';

   async function recognize(imageSource:HTMLImageElement){
     let tess = await createWorker("eng", 1, {
       logger: function(m:any){console.log(m);}
     });
     const result = await tess.recognize(imageSource);
     const textLines:TextLine[] = [];
     const threshold = 50;
     const lines = result.data.lines;
     for (let index = 0; index < lines.length; index++) {
       const line = lines[index];
       const width = line.bbox.x1 - line.bbox.x0;
       const height = line.bbox.y1 - line.bbox.y0;
       if (line.confidence > threshold && width > 10) {
         const textLine:TextLine = {
           x:line.bbox.x0,
           y:line.bbox.y0,
           width:width,
           height:height,
           text:line.text
         }
         textLines.push(textLine);
       }
     }
     return textLines;
   }

   ```

2. 计算两段文本的相似度。

   ```ts
   import leven from "leven";

   function textSimilarity(lines1:TextLine[],lines2:TextLine[]):number {
     const text1 = textOfLines(lines1);
     const text2 = textOfLines(lines2);
     const distance = leven(text1,text2);
     const similarity =  (1 - distance / Math.max(text1.length,text2.length));
     return similarity;
   }

   function textOfLines(lines:TextLine[]){
     let content = "";
     for (let index = 0; index < lines.length; index++) {
       const line = lines[index];
       content = content + line.text + "\n";
     }
     return content;
   }
   ```

3. 遍历所有扫描图像，找出重复的图像。

   ```ts
   async find(images:HTMLImageElement[]):Promise<HTMLImageElement[]> {

     let textLinesOfImages = [];
     for (let index = 0; index < images.length; index++) {
       const image = images[index];
       const lines = await recognize(image);
       textLinesOfImages.push(lines);
     }

     let indexObject:any = {};
     for (let index = 0; index < textLinesOfImages.length; index++) {
       if (index + 1 < textLinesOfImages.length) {
         const textLines1 = textLinesOfImages[index];
         const textLines2 = textLinesOfImages[index+1];
         const similarity = textSimilarity(textLines1,textLines2);
         if (similarity > 0.7) {
           indexObject[index] = "";
           indexObject[index+1] = "";
         }
       }
     }
     let duplicateImages:HTMLImageElement[] = [];
     const keys = Object.keys(indexObject);
     for (let index = 0; index < keys.length; index++) {
       const key:number = parseInt(keys[index]);
       duplicateImages.push(images[key]);
     }
     return duplicateImages;
   }
   ```

## 在线demo

可以访问[在线演示](https://tony-xlh.github.io/duplicate-document-image-finder/)进行试用。该演示可使用[Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/docs/core/introduction/)裁剪文档图像，以提高OCR的效率和准确性。

![演示截图](/album/2024/04/duplication/table.jpg)

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/duplicate-documet-image-finder>

