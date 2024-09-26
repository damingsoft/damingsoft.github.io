---
layout: post
title: "前端实现PDF标注"
date: 2024-09-03 11:10:53 +0800
categories: 文档扫描
tags: 
description: 本文分享了如何使用JavaScript给扫描的文档添加PDF标注。它使用Dynamsoft Document Viewer来查看和标注文档。
---

[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)是为文档图像提供查看、管理功能的SDK。v2.0新增了标注功能，可以结合以下SDK构建文档扫描方案：

* [Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)：在浏览器中访问文档扫描仪。
* [Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/overview/)：检测文档边界。

在本文中，我们将讨论它提供了哪些标注、有什么使用案例，以及代码展示。

[具有文档扫描和标注功能的在线demo](https://tony-xlh.github.io/document-viewer-samples/scan-and-annotate/index.html)

## 支持的标注

目前，支持形状、画笔、文本、图像等标注。

形状：

* 矩形
* 椭圆
* 多边形
* 折线
* 直线

文本：

* 文本框
* TextTypewriter

其他：

* 墨水（自由画笔）
* 印章（自定义图像）

## 一些用例

使用标注功能，我们可以实现文档管理中的一些常见任务。

1. 添加评论和高亮。

   ![矩形和文本](/album/2024/09/pdf-annotation/rectangles-and-text.jpg)

2. 添加条形码或二维码用于文档标识。

   ![条形码](/album/2024/09/pdf-annotation/barcode.jpg)

3. 遮盖敏感信息，如联系人的姓名或照片。

   ![遮盖](/album/2024/09/pdf-annotation/redact.jpg)

4. 通过绘制标记来校对手稿。

   ![校对](/album/2024/09/pdf-annotation/proofreading.jpg)

5. 添加用于指定文档状态的印章。


   ![印章和图像](/album/2024/09/pdf-annotation/stamp-and-images.jpg)


## 实现代码

下面是用于添加标记的相关代码。

### 添加Dynamsoft Document Viewer

要在网页中使用Dynamsoft Document Viewer，需要包含以下文件：

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@latest/dist/ddv.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@latest/dist/ddv.css">
```

然后用以下代码进行初始化：

```js
Dynamsoft.DDV.Core.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; // Public trial license which is valid for 24 hours
Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@latest/dist/engine";// Lead to a folder containing the distributed WASM files
await Dynamsoft.DDV.Core.loadWasm();
await Dynamsoft.DDV.Core.init();
```

可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。


### 创建用于标注的Edit Viewer

我们需要创建一个Edit Viewer实例来查看和添加标注。

```js
const editViewerUiConfig = {
    type: Dynamsoft.DDV.Elements.Layout,
    flexDirection: "column",
    className: "ddv-edit-viewer-mobile",
    children: [
        {
            type: Dynamsoft.DDV.Elements.Layout,
            className: "ddv-edit-viewer-header-mobile",
            children: [
                Dynamsoft.DDV.Elements.Pagination,
                {
                    type: Dynamsoft.DDV.Elements.Button,
                    className: "ddv-button-done",
                    events:{
                        click: "close"
                    }
                }
            ],
        },
        Dynamsoft.DDV.Elements.MainView,
        {
            type: Dynamsoft.DDV.Elements.Layout,
            className: "ddv-edit-viewer-footer-mobile",
            children: [
                Dynamsoft.DDV.Elements.DisplayMode,
                Dynamsoft.DDV.Elements.RotateLeft,
                Dynamsoft.DDV.Elements.Crop,
                Dynamsoft.DDV.Elements.Filter,
                Dynamsoft.DDV.Elements.Undo,
                Dynamsoft.DDV.Elements.Delete,
                Dynamsoft.DDV.Elements.AnnotationSet
            ],
        },
    ],
};

// Create an edit viewer
editViewer = new Dynamsoft.DDV.EditViewer({
    container: "fullscreenContainer",
    groupUid: captureViewer.groupUid,
    uiConfig: editViewerUiConfig
});

// Configure image filter feature which is in edit viewer
Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());
```

打开Edit Viewer，点击标注图标，我们可以通过界面添加标注。

![Edit Viewer](/album/2024/09/pdf-annotation/edit-viewer.jpg)

### 通过代码添加标注

除了使用Edit Viewer，我们还可以通过代码添加标注。

例如，我们需要遮盖姓名这样的文本内容。可以使用OCR来获取单词的边界框，然后在对应位置添加矩形标注。注意，这里坐标的单位是点，我们需要先将像素转换为点。

```js
const pageUid = editViewer.indexToUid(pageIndex);
const pageData = await doc.getPageData(pageUid);
const scaleX = pageData.mediaBox.width / pageData.raw.width; //for converting pixels to points
const scaleY = pageData.mediaBox.height / pageData.raw.height;
const options = {
  x: bbox.x0*scaleX,
  y: bbox.y0*scaleY,
  width: (bbox.x1 - bbox.x0)*scaleX,
  height: (bbox.y1 - bbox.y0)*scaleY,
  borderColor: "black",
  background: "black"
  //flags:{readOnly:true} //enable read only if you do not need to interact with the annotation
}
const rect = Dynamsoft.DDV.annotationManager.createAnnotation(pageUid, "rectangle",options);
```

可以添加其他类型的标注。查看[文档](https://www.dynamsoft.com/document-viewer/docs/features/datamanagement/annotmanagement.html#annotation-creation)了解更多。

### 保存为PDF

我们可以将图像保存为带有标注的PDF文件。

```js
const pdfSettings = {
  saveAnnotation: "annotation"
};
const blob = await doc.saveToPdf(pdfSettings);
```

使用`saveAnnotation`设置，可以指定如何保存标注。它有以下选项：

* `none`：不保存标注。
* `image`：将标注融合到图像中。
* `annotation`：将标注以PDF标注格式保存。
* `flatten`：将标注合并到一层保存，不再可编辑。


如果我们选择`annotation`选项，导出后，我们可以用Dynamsoft Document Viewer或Adobe Acrobat等其他PDF编辑器继续编辑标注。

### 加载带有标注的PDF文件

如果我们有一个带有标注的PDF文件，可以用以下代码加载它：

```js
let pdfSource = {
  fileData:blob,
  renderOptions:{
    renderAnnotations:Dynamsoft.DDV.EnumAnnotationRenderMode.LOAD_ANNOTATIONS
  }
}
await doc.loadSource(pdfSource);
```

加载标注有几种模式：

```js
enum EnumAnnotationRenderMode {
    NO_ANNOTATIONS = "noAnnotations", // default, means that the annotations in the PDF file will not be loaded
    RENDER_ANNOTATIONS = "renderAnnotations", // means that the annotations in the PDF file will be rendered
    LOAD_ANNOTATIONS = "loadAnnotations", // means that the annotations in the PDF file will be loaded normally, a valid PDF Annotation license is requested
}
```

如果我们选择`LOAD_ANNOTATIONS`模式，加载文件后，我们可以继续编辑PDF文件中的现有标注。

## 源代码

查看demo的源代码并尝试使用：

<https://github.com/tony-xlh/document-viewer-samples/tree/main/scan-and-annotate>

