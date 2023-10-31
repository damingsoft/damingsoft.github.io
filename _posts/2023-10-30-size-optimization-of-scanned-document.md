---
layout: post
title: 扫描文档的尺寸优化
date: 2023-10-30 17:04:53 +0800
categories: 文档扫描
tags:
---

将文档扫描成数字化的电子文件可以帮助公司节省物理空间、降低成本、促进协作、优化数据检索等等。

有时，我们可能会遇到非常大的或者图像质量较低的扫描文件。在本文中，我们将讨论如何优化扫描文档的尺寸。

用[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)编写了相关的示例，它是一个允许从浏览器扫描文档的JavaScript库。

## 如何计算图像大小

在开始之前，让我们了解一下如何计算图像大小。

```
图像字节数 = 像素高度 * 像素宽度 * 位深度 / 8
```

它受到像素数量和它能代表多少颜色影响。

## DPI

DPI代表每英寸点数，是衡量扫描文档或照片分辨率的指标。DPI越高，扫描和生成的图像的质量和分辨率就越高。

通常，以大约300DPI扫描文档会产生具有合理大小和良好质量的图像。

在Dynamic Web TWAIN中，我们可以在device configuration中指定DPI：

```js
DWObject.AcquireImageAsync({IfShowUI:false,Resolution:300});
```

以下是使用不同DPI扫描文档的测试结果。

| DPI | 分辨率 | 文件大小 |
|:---:|:----------:|:----------:|
| 100 | 850x1100 | 2741.41KB |
| 200 | 1700x2200 | 10957.03KB |
| 300 | 2550x3300 | 24659.77KB |
| 600 | 5100x6600 | 98613.28KB |


## 位深度

位深度，也称为颜色深度，是用于表示单个像素颜色的位数。位深度越大，像素可以表示的颜色就越多。

大多数文档扫描仪都提供了以不同颜色模式扫描文档的选项：黑白、灰色和彩色。

它们的位深度如下：

* 黑白：1位。
* 灰色：8位。
* 彩色：24位。

在Dynamic Web TWAIN中，我们可以在device configuration中指定颜色模式（或称像素类型）：

```js
let pixelType = Dynamsoft.DWT.EnumDWT_PixelType.TWPT_BW;
DWObject.AcquireImageAsync({IfShowUI:false,PixelType:pixelType});
```

我们还可以使用以下代码手动设置位深度：

```js
let imageIndex = 0;
let bitDepth = 4;
let highQuality = false;
DWObject.ChangeBitDepth(imageIndex,bitDepth,highQuality);
```

以下是用不同颜色模式扫描文档的测试结果。

| 像素类型 | 分辨率 | 位深度 | 文件大小 |
|:----------:|:----------:|:--------:|:----------:|
| 黑白 | 2550x3507 | 1 | 1095.94KB |
| 灰色 | 2550x3507 | 8 | 8740.10KB |
| 彩色 | 2550x3507 | 24 | 26206.61KB |

## 图像压缩

我们可以用JPEG和PNG等不同的图像文件格式压缩图像数据。

在Dynamic Web TWAIN中，我们可以使用以下代码获取图像大小：

```js
let imageIndex = 0;
let width = DWObject.GetImageWidth(imageIndex);
let height = DWObject.GetImageHeight(imageIndex);
let originalSize = DWObject.GetImageSize(imageIndex,width,height);
let size = DWObject.GetImageSizeWithSpecifiedType(imageIndex,j); //size after compression with a format
```

以下是扫描不同颜色模式和图像格式的文档的测试结果。

| 像素类型 | 分辨率 | 位深度 | 文件大小 | 文件格式 | 压缩率 |
|:----------:|:----------:|:--------:|:----------:|:------:|:----------------:|
| 黑白 | 2550x3507 | 1 | 1096.00KB | BMP | 0% |
| 黑白 | 2550x3507 | 1 | 705.89KB | JPG | 35.59% |
| 黑白 | 2550x3507 | 1 | 38.09KB | TIF | 96.52% |
| 黑白 | 2550x3507 | 1 | 77.45KB | PNG | 92.93% |
| 灰色 | 2550x3507 | 8 | 8741.15KB | BMP | 0% |
| 灰色 | 2550x3507 | 8 | 590.68KB | JPG | 93.24% |
| 灰色 | 2550x3507 | 8 | 1957.32KB | TIF | 77.61% |
| 灰色 | 2550x3507 | 8 | 1574.74KB | PNG | 81.98% |
| 彩色 | 2550x3507 | 24 | 26206.66KB | BMP | 0% |
| 彩色 | 2550x3507 | 24 | 665.43KB | JPG | 97.46% |
| 彩色 | 2550x3507 | 24 | 5112.49KB | TIF | 80.49% |
| 彩色 | 2550x3507 | 24 | 3753.82KB | PNG | 85.68% |

我们可以从表中总结出下面两点：

1. BMP是一种无损格式，不压缩图像。
2. JPEG不能很好地处理黑白图像，但它对灰色和彩色图像的压缩率最好。

## 多页优化

大多数时候，我们需要扫描多页文档。我们可以使用TIFF或PDF作为容器将图像保存在一个文件中。TIFF和PDF支持多种图像格式和压缩方法。

由于不同的压缩方法对不同的颜色模式的效果不同，Dynamic Web TWAIN使用以下压缩策略来获得最佳结果。

对于TIFF，它使用以下策略：

* 对于1位图像，使用TIFF_T6压缩算法。
* 对于其他图像，使用TIFF_LZW压缩算法。

对于PDF，它使用以下策略：

* 对于1位图像，如果PDF版本超过1.4，使用JBIG2，否则使用FAX4（CCITT Group 4 Fax）。
* 对于8位图像，如果图像为灰度，则使用JPEG，否则使用LZW（Lempel-Ziv-Welch）。
* 对于24位和32位图像，使用JPEG。

以下是扫描TIFF和PDF格式文档的测试结果。该测试用黑白、灰色和彩色模式扫描了同一文档。

| 文件格式 | 原始大小 | 文件大小 | 压缩率 | 链接 |
|:------:|:-------------:|:---------:|:----------------:|:--------------:|
| TIFF | 36042.64KB | 7109.21KB | 80.28% | [下载](https://github.com/tony-xlh/scan-optimization/releases/download/samples/scanned.tiff) |
| PDF | 36042.64KB | 1283.96KB | 96.44% | [下载](https://github.com/tony-xlh/scan-optimization/releases/download/samples/scanned.pdf) |



## 源代码

可以在以下仓库中找到所有代码和在线演示：

<https://github.com/tony-xlh/scan-optimization/>






