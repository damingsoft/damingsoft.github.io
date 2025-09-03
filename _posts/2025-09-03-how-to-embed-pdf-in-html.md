---
layout: post
title: "如何在网页中嵌入PDF"
date: 2025-09-03 13:25:53 +0800
categories: 文档扫描
tags: 
description: 本文分享了如何在网页中嵌入PDF。讨论了所有可能的方法。
---

在网页中直接嵌入PDF文件是个有用的操作，用户可以直接在浏览器中查看和编辑PDF文件。在本文中，我们将讨论不同的嵌入方法。


## 使用HTML元素嵌入PDF文件

我们可以使用HTML的内置元素通过指定PDF的URL来嵌入PDF文件。


1. 使用`iframe`。（[在线演示](https://tony-xlh.github.io/Embed-PDF-in-HTML/iframe.html)）

   ```html
   <iframe src="ddv-sample.pdf" width="100%" height="600px"></iframe>
   ```


2. 使用`embed`。（[在线演示](https://tony-xlh.github.io/Embed-PDF-in-HTML/embed.html)）

   ```html
   <embed src="ddv-sample.pdf" type="application/pdf" width="100%" height="600px" />
   ```

3. 使用`object`。（[在线演示](https://tony-xlh.github.io/Embed-PDF-in-HTML/object.html)）

   ```html
   <object data="ddv-sample.pdf" type="application/pdf" width="100%" height="600px">
       <p>Your browser does not support PDFs.
           <a href="ddv-sample.pdf">Download the PDF</a>.
       </p>
   </object>
   ```


推荐使用`iframe`。它的兼容性最好。

| 标签 | 推荐 | 支持后备 | 问题 |
| ---------- | ------ | ------------- | ---------- |
| `<iframe>` | 推荐 | 不支持 | 默认情况会有边框 |
| `<object>` | 更语义化 | 支持 | 可能不适用于旧版和移动浏览器 |
| `<embed>` | 不太推荐 | 不支持 | 可能不适用于旧版浏览器 |


在桌面上，以上三个标签都会使用浏览器的内置PDF查看器打开PDF。在移动浏览器上，行为各不相同。在Android上，浏览器会提供下载链接。在iOS上，浏览器将呈现PDF的第一页。

## 将PDF转换为图像或HTML以嵌入PDF文件

我们可以使用Apache PDFBox等库预先将PDF文件转换为图像，或者使用pdf2htmlex转换PDF为HTML，以将其嵌入网页中。

转换成图像质量可能会下降，也可能增大体积，带来更高的网络开销。此外，文本也无法进行搜索或复制。

转换为HTML效果更好。它可以使查看PDF就像查看普通网页一样。但无法进行PDF编辑和注释等操作。（[转换后的示例](https://tony-xlh.github.io/Embed-PDF-in-HTML/ddv-sample.html)）


## 使用PDF JavaScript库嵌入PDF文件

我们可以使用第三方PDF库来嵌入PDF文件。它有以下好处：

1. 我们可以为不同的浏览器和平台提供统一的体验。
2. 我们可以定制用户界面。
3. 我们可以使用更多功能，如PDF注释和PDF编辑。
4. 出于安全考虑，我们可以阻止下载PDF文件。


当然，由于渲染发生在客户端，因此对客户端有更高的要求。

有几个库可供使用：

1. PDF.js。（[在线演示](https://tony-xlh.github.io/Embed-PDF-in-HTML/pdfjs.html)）
2. PDFium.js。（[在线演示](https://tony-xlh.github.io/Embed-PDF-in-HTML/pdfium.html)）

[PDF.js](https://github.com/mozilla/pdf.js/)和[PDFium.js](https://github.com/Jaewoook/pdfium.js/)提供了PDF渲染功能，但它们没有一个像样的查看器。

[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/overview/)使用PDFium作为引擎，并提供功能齐全的UI来查看和编辑PDF。更推荐使用它来嵌入PDF。

[Dynamsoft Document Viewer的在线演示](https://demo.dynamsoft.com/document-viewer/)

## 总结

以下是对这三种方法的总结。

| 方法 | 技术 | 优点 | 缺点 | 适用于 |
|---|---|---|---|---|
| 原生HTML元素 | iframe、object、embed | •易于实现<br>•利用浏览器的内置查看器 | •用户体验不一致（尤其是在移动设备上）<br>•对UI和功能的控制有限<br>•无法阻止下载 | 快速集成基本的PDF查看功能的情况 |
| 转换为图像或HTML | PDFBox、pdf2htmlEX | •统一的查看体验<br>•转换为HTML时感觉就像原生网页 | •功能缺失（编辑）<br>•可能生成较大的文件（图像）或复杂的HTML | 不需要怎么编辑的档案文件。 |
| JavaScript库 | PDF.js、PDFium.js、<br>Dynamsoft Document Viewer | •跨平台最统一的体验<br>•完整的功能集（注释、编辑等）<br>•可定制的UI<br>•安全控制（例如禁用下载） | •更高的客户端要求（JavaScript、处理能力）<br>•更复杂的实现<br>•较大的初始页面加载量 | 专业应用程序，需要一个可靠、功能丰富、可定制的PDF查看器，并为所有用户提供一致的界面。 |

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/Embed-PDF-in-HTML>

