---
layout: post
title: "如何使用JavaScript将PDF页面中的标注扁平化"
date: 2025-01-02 13:53:53 +0800
categories: 文档扫描
tags: 
description: 本文介绍了如何使用Dynamsoft Document Viewer在前端将PDF页面的标注扁平化。
---

扁平化(flatten)操作可以将标注作为矢量图形包含在PDF页面的内容中，使其不可编辑。[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)是一个用于文档扫描和查看的JavaScript SDK，可以添加标注、导出PDF。在本文中，我们将探讨如何使用它。

## 使用Dynamsoft Document Viewer打开一个PDF文件并启用标注添加功能

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
     <title>Burn PDF Annotation</title>
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
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.1.0/dist/ddv.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.1.0/dist/ddv.css">
   ```

3. 使用许可证初始化Dynamsoft Document Viewer。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请一个证书。

   ```js
   Dynamsoft.DDV.Core.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@2.1.0/dist/engine";// Lead to a folder containing the distributed WASM files
   await Dynamsoft.DDV.Core.init();
   ```

4. 创建一个新的文档实例。

   ```js
   const docManager = Dynamsoft.DDV.documentManager;
   const doc = docManager.createDocument();
   ```

5. 创建一个Edit Viewer实例，将其绑定到一个容器，然后用它来查看我们刚刚创建的文档。其上的按钮可以使用`UIConfig`对象进行配置。添加标注按钮以添加创建标注的操作入口。

   HTML：

   ```html
   <div id="viewer"></div>
   ```

   JavaScript：

   ```js
   Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());
   let uiConfig = {
     type: "Layout",
     flexDirection: "column",
     className: "ddv-edit-viewer-desktop",
     children: [
       {
         type: "Layout",
         className: "ddv-edit-viewer-header-desktop",
         children: [
           {
             type: "Layout",
             children: [
               "ThumbnailSwitch",
               "FitMode",
               "DisplayMode",
               "RotateLeft",
               "Crop",
               "Filter",
               "Undo",
               "Redo",
               "DeleteCurrent",
               "DeleteAll",
               "Pan",
               "SeparatorLine",
               "AnnotationSet"
             ],
             enableScroll: true
           },
           {
             type: "Layout",
             children: [
               {
                 "type": "Pagination",
                 "className": "ddv-edit-viewer-pagination-desktop"
               },
               {
                 type: Dynamsoft.DDV.Elements.Button,
                 className: "ddv-button-download",
                 events: {
                   click: "exportPDFWithOptions",
                 },
               },
             ]
           }
         ]
       },
       "MainView"
     ]
   }
   editViewer = new Dynamsoft.DDV.EditViewer({
     uiConfig: uiConfig,
     container: document.getElementById("viewer")
   });
   ```

   CSS：

   ```css
   #viewer {
     width: 320px;
     height: 480px;
   }
   ```

6. 使用`input`选择图像或PDF文件，并将其加载到文档实例中。

   HTML：

   ```html
   <label>
     Select a file to load:
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
       await doc.loadSource(blob); // load the file
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

我们将能够看到如下查看器：

![editviewer](/album/2025/01/editviewer-annotations.jpg)

## 扁平化标注并保存PDF

Dynamsoft Document Viewer支持四种处理PDF标注的方式：

* `none`：丢弃所有标注
* `image`：将所有内容合并到光栅图像中
* `flatten`：扁平化所有标注
* `annotation`：以可编辑的形式保存标注。标记为扁平化的单个标注仍将被扁平化

我们可以使用`flatten`选项保存PDF文件来扁平化所有标注。

```js
let blob = await doc.saveToPdf({
  saveAnnotation: "flatten"
})
```

如果我们想在使某些标注扁平化的同时保留某些标注的可编辑性，我们可以使用标注的扁平化属性，并使用`annotation`选项保存PDF。

```js
let annotations = Dynamsoft.DDV.annotationManager.getAnnotationsByDoc(doc.uid);
let annotation = annotations[0];
annotation.flattened = true;
let blob = await doc.saveToPdf({
  saveAnnotation: "annotation"
})
```


## 内部是如何运作的

PDF文件使用PostScript语言描述。我们将使用一些示例来展示扁平化的内部操作细节。

PDF文件会包含许多字典，下面是一个页面字典的示例：

```
4 0 obj
<<
  /Type/Page                 % Specifies that this dictionary defines a page.
  /Annots[ 8 0 R ]           % A list of references to annotation objects on this page.
  /Contents 7 0 R            % Reference to page content stream.
  /MediaBox[ 0 0 147 143.25] % Page dimensions.
  % Other page properties
>>
endobj
7 0 obj
<</Filter/FlateDecode/Length 44>>stream
x??41W0 BCc=#S039椝 ?J缫w媹0Tp蒞? 卵	
endstream
endobj
```

以上页面引用了以下标注字典：

```
8 0 obj
<<
  /Type/Annot
  /AP<<
  /Contents(annotation)
    /CreationDate(D:20241227135119+08'00')
    /DA(0.9411764705882353 0.07450980392156863 0.0784313725490196 rg /Helvetica 16 Tf)
    /DS(font:  'Helvetica' 16pt; text-align:left; color:#F01314)
    /F 4
    /IT/FreeTextTypeWriter/M(D:20241227135125+08'00')/NM(m56c4eb9uq)/RC(<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/" xfa:APIVersion="Acrobat:18.11.0" xfa:spec="2.0.2" style="font-size:16pt;text-align:left;color:#f01314;font-weight:normal;font-style:normal;font-family:'Helvetica';font-stretch:normal;"><p dir="ltr"><span>annotation</span></p></body>)
    /Rect[ 22.1854 112.467 98.423 129.217]
    /Subj()
    /Subtype
    /FreeText
    /T()
>>
endobj
```

扁平化后，页面字典将变为以下内容。它不再具有标注节点，并将转换成图形的标注的节点附加到其正文中。

```
4 0 obj
<<
  /Type/Page
  /Contents 13 0 R
  /MediaBox[ 0 0 147 143.25]
>>
endobj
7 0 obj
<</Filter/FlateDecode/Length 48>>stream
x???41W0 BCc=#S039椝 ?J缫w媹0Tp蒞溻
 靔	?
endstream
endobj
13 0 obj
[ 7 0 R  14 0 R ]
endobj
14 0 obj
<</Filter/FlateDecode/Length 29>>stream
x?T0T0 B櫆珷镦b犩挴 M+?
endstream
endobj
```

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/Burn-PDF-Annotation/>

