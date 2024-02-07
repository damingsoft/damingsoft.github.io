---
layout: post
title: "基于JSON的数据捕获用领域特定语言"
date: 2024-02-07 13:57:53 +0800
categories: 数据捕获
tags: 
description: 本文简要介绍了Dynamsoft Capture Vision中使用的基于JSON的DSL。
---

领域特定语言（DSL）是一种针对特定类型问题的计算机语言。DSL的例子包括CSS、SQL、make等。

Martin Fowler对内部DSL和外部DSL进行了定义和区分。内部DSL是使用宿主语言的特殊方式，可以让宿主语言具有特殊的用法，比如 Jetpack Compose。外部DSL有自己的自定义语法，可以编写一个完整的解析器来处理它们，比如JSON和XML。

[Dynamsoft Capture Vision](https://www.dynamsoft.com/capture-vision/docs/core/introduction/)是一个数据捕获框架，旨在轻松扫描文档、读取条形码和识别文本。其主要特点之一是，我们可以使用基于JSON的DSL来配置数据捕获任务。在本文中，我们将介绍这个DSL。

## 不使用DSL和使用DSL

让我们首先讨论下不使用DSL和使用DSL的用法。

假设我们要扫描下图中的文档并读取条形码：

![驾驶执照](/album/2024/02/DSL/drivers-license.jpg)

我们可以使用[Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/docs/core/introduction/)和[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)来执行此任务。这两个SDK支持各种平台，如iOS、Android、桌面和Web。这里，我们使用Web的JavaScript版本：

```js
let documentNormalizer = await Dynamsoft.DDN.DocumentNormalizer.createInstance(); //requires Dynamsoft Document Normalizer version 1.x
let barcodeReader = await Dynamsoft.DBR.BarcodeReader.createInstance(); //requires Dynamsoft Barcode Reader version 9.x
let img = document.getElementById("image");
let quads = await documentNormalizer.detectQuad(img);
let normalizedImageResult = await documentNormalizer.normalize(img, {
  quad: quads[0].location
});
let normalizedImageAsCanvas = normalizedImageResult.image.toCanvas();
let barcodeResults = await barcodeReader.decode(normalizedImageAsCanvas);
```

Dynamsoft Capture Vision可以作为一个中间程序调用Dynamsoft Document Normalizer和Dynamsoft Barcode Reader以得到相同的结果。

首先，我们需要在JSON DSL中定义任务。

1. 定义条形码读取任务和文档扫描任务。

   ```json
   {
     "BarcodeReaderTaskSettingOptions": [
       {
         "Name": "task-read-barcodes"
       }
     ],
     "DocumentNormalizerTaskSettingOptions": [
       {
         "Name": "task-detect-and-normalize-document"
       }
     ]
   }
   ```

2. 定义两个目标ROI ：用于文档扫描的全图像ROI和基于检测到的文档图像的条形码读取ROI。

   ```json
   {
     "TargetROIDefOptions": [
       {
         "Name": "roi-detect-and-normalize-document",
         "TaskSettingNameArray": ["task-detect-and-normalize-document"]
       },
       {
         "Name": "roi-read-barcodes",
         "TaskSettingNameArray": ["task-read-barcodes"],
         "Location":
         {
           "ReferenceObjectFilter" : {
             "ReferenceTargetROIDefNameArray": ["roi-detect-and-normalize-document"]
           }
         }
       }
     ]
   }
   ```

   注意：如果未设置`Location`，则ROI为整个图像。

3. 定义一个名为`ScanDocumentAndReadBarcode`的模板，该模板使用上一步定义的两个目标ROI进行处理。

   ```json
   {
     "CaptureVisionTemplates": [
       {
         "Name": "ScanDocumentAndReadBarcode",
         "ImageROIProcessingNameArray": [
           "roi-detect-and-normalize-document","roi-read-barcodes"
         ]
       }
     ]
   }
   ```

将JSON保存为`template.json`文件。然后，我们可以使用以下JavaScript代码执行文档扫描和条形码读取任务：

```js
let router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
let response = await fetch("./template.json");
let settings = await response.text();
await router.initSettings(settings);
let results = await router.capture(document.getElementById("image"),"ScanDocumentAndReadBarcode");
```

我们可以使用JSON DSL做更多的事情，例如设置图像处理参数，指定要使用的条形码格式等。可以在[文档](https://www.dynamsoft.com/capture-vision/docs/core/parameters/)中了解相关信息。

PS：Dynamsoft Capture Vision需要Dynamsoft Document Normalizer v2+和Dynamsoft Barcode Reader v10+。

## 优点和缺点

在Dynamsoft Capture Vision中使用基于JSON的DSL有一些优点和缺点：

优点：

* 数据捕获逻辑可以在不同平台之间共享，无需编写特定于平台的代码。
* 图像处理结果可以在内部共享，以提高性能。例如，我们不需要重复将图像读取为字节或将图像转换为灰度的操作。
* 领域专家可以比使用通用编程语言更有效地解决特定任务。

缺点：

* 有一个学习曲线。
* 设计和维护DSL是一项额外成本。
* 使用宿主语言修改设置并不容易。这在交互式场景中通常是必要的，例如在裁剪之前修改扫描文档的边界。

为了克服这些缺点， Dynamsoft Capture Vision做了以下工作：

1. 用于修改设置的编程接口： [SimplifiedCaptureVisionSettings](https://www.dynamsoft.com/capture-vision/docs/web/programming/javascript/api-reference/capture-vision-router/interfaces/simplified-capture-vision-settings.html)。
2. 帮助您学习的详细[文档](https://www.dynamsoft.com/capture-vision/docs/core/architecture/index.html)。


## 源代码

可以在以下仓库中找到Dynamsoft Capture Vision的demo代码：<https://github.com/tony-xlh/dynamsoft-capture-vision-samples/>



