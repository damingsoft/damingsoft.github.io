---
layout: post
title: "如何生成带矢量条码的PDF并读码"
date: 2023-12-06 17:10:53 +0800
categories: 条码扫描
tags:
---

PDF（Portable Document Format，便携式文档格式）是由Adobe开发的用于呈现文档的文件格式。基于PostScript语言，每个PDF文件都封装了固定布局平面文档的完整描述，包括文本、字体、矢量图形、光栅图像和显示它所需的其他信息。

条码是一种以视觉、机器可读的形式表示数据的方法。它可以存储为光栅图像或矢量图形，并保存在PDF中。

作为图像存在PDF中的条码比较常见，而关于PDF中矢量条码的文章不多。因此，在本文中，我们将讨论如何生成带矢量条码的PDF并从中读取条码。

[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)会被用于读取条码。由于我们可以直接获得矢量条码的黑条或白条的坐标，因此从矢量图形解码的性能和准确性会优于从光栅图像解码。


## 生成条码并将其保存为SVG

有许多条码生成的库，但可以将条码作为矢量图形导出为SVG的库并不多。在这里，我们使用Python的`python-barcode`库来执行此操作。

使用以下代码生成Code128格式的条码：

```py
from barcode import Code128
from barcode.writer import SVGWriter
code1 = Code128("Code 128", writer=SVGWriter())
code1.save("out.svg")
```

## 在PDF页面中嵌入矢量条码

接下来，我们将把矢量条码图形嵌入到PDF中。

我们可以使用Adobe Illustrator和Inkscape等矢量设计工具来实现这一点。

Inkscape的屏幕截图：

![Inkscape](/album/2023/12/inkscape.jpg)

我们也可以用代码生成PDF。这里，我们使用Python及其`fpdf2`库来实现这一点。

```py
from io import BytesIO
from fpdf import FPDF
from barcode import Code128
from barcode.writer import SVGWriter

# Create a new PDF document
pdf = FPDF()
pdf.add_page()

pdf.set_font("helvetica", "B", 16)
pdf.cell(40, 10, "A PDF page with Code128 barcodes.")

# Generate a Code128 barcode as SVG:
svg_img_bytes = BytesIO()
code1 = Code128("Code 128", writer=SVGWriter())
code1.write(svg_img_bytes)
pdf.image(svg_img_bytes, x=10, y=50, w=100, h=70)

# Generate a second Code128 barcode as SVG:
svg_img_bytes = BytesIO()
code2 = Code128("Second Code 128", writer=SVGWriter())
code2.write(svg_img_bytes)
pdf.image(svg_img_bytes, x=10, y=120, w=100, h=70)

# Output a PDF file:
pdf.output('code128_barcode.pdf')
```

## 从PDF文件读取条码

大多数条码读取的库只能处理光栅图像。因此，在读取条码之前，我们必须将PDF页面渲染为图像。

但实际上，我们可以直接解析矢量条码图形进行解码。

例如，我们可以使用`PyMuPDF`的`get_drawings`方法读取图形的信息。

```
>>> import fitz
>>> doc = fitz.open("vector.pdf")
>>> doc[0].get_drawings()
[{'items': [('re', Rect(28.34600067138672, 141.72999572753906, 365.26654052734375, 436.3016357421875), -1)], 'type': 'f', 'even_odd': False, 'fill_opacity': 1.0, 'fill': (1.0, 1.0, 1.0), 'rect': Rect(28.34600067138672, 141.72999572753906, 365.26654052734375, 436.3016357421875), 'seqno': 1, 'layer': '', 'closePath': None, 'color': None, 'width': None, 'lineCap': None, 'lineJoin': None, 'dashes': None, 'stroke_opacity': None}, {'items': [('re', Rect(52.604278564453125, 150.07992553710938, 56.42462158203125, 275.33087158203125), -1)], 'type': 'f', 'even_odd': False, 'fill_opacity': 1.0, 'fill': (0.0, 0.0, 0.0), 'rect': Rect(52.604278564453125, 150.07992553710938, 56.42462158203125, 275.33087158203125), 'seqno': 2, 'layer': '', 'closePath': None, 'color': None, 'width': None, 'lineCap': None, 'lineJoin': None, 'dashes': None, 'stroke_opacity': None}]
```

Dynamsoft Barcode Reader能够读取PDF中的矢量条码。此功能默认启用。

以下是从PDF中读取条码的代码（需要[申请一个许可证](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr)才能使用它）：

```py
from dbr import *
error = BarcodeReader.init_license("license")
if error[0] != EnumErrorCode.DBR_OK:
    # Add your code for license error processing
    print("License error: "+ error[1])
reader = BarcodeReader()
results = reader.decode_file("code128_barcode.pdf")
if results != None:
    i = 0
    for text_result in results:
        print("Barcode " + str(i))
        print("Barcode Format : " + text_result.barcode_format_string)
        print("Barcode Text : " + text_result.barcode_text)
        i = i+1
```

可以通过更新其与PDF相关的运行时设置来变更其行为。

```py
settings = reader.get_runtime_settings()
settings.pdf_reading_mode = EnumPDFReadingMode.PDFRM_VECTOR
reader.update_runtime_settings(settings)
```

读取模式可以设置为以下值：

* EnumPDFReadingMode.PDFRM_RASTER：将PDF渲染为光栅图像以进行解码
* EnumPDFReadingMode.PDFRM_VECTOR：直接读取矢量条码
* EnumPDFReadingMode.PDFRM_AUTO：如果PDF包含矢量条码，则使用矢量模式

矢量模式的识别速度比光栅模式更快：

```
Time elapsed decoding a PDF file:
Vector mode: 15.6253ms.
Raster mode: 84.721ms.
```

但由于矢量模式仅适用于1D条形码，如果要读取二维码（如QR码），则需要使用光栅模式。


## 确定PDF是否为矢量PDF

让我们讨论另一个问题：如何确定PDF是否为矢量PDF。

正如我们所知，PDF包含光栅图像、矢量图形或文本。

因此，如果PDF页面包含文本或矢量图形，它就是矢量PDF。

我们可以使用以下代码进行检测：

```py
import fitz

doc = fitz.open("merged.pdf")

index = 0
for page in doc:
    index = index + 1
    has_text = False
    has_images = False
    has_vector_graphics = False
    if len(page.get_images()) > 0:
        has_images = True
    if page.get_text() != "":
        has_text = True
    if len(page.get_drawings()) > 0:
        has_vector_graphics = True

    if has_images and has_text == False and has_vector_graphics == False:
        print("Page "+str(index)+" is raster")
    elif has_vector_graphics or has_text:
        print("Page "+str(index)+" is vector")
```

## 源代码

<https://github.com/tony-xlh/Vector-Barcode-PDF-Generation-and-Reading>

