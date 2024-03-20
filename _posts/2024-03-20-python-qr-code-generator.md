---
layout: post
title: "如何用Python生成QR二维码"
date: 2024-03-19 16:59:53 +0800
categories: 条码扫描
tags: 
description: 本文介绍了如何使用Python生成不同模式的QR二维码。
---

QR码（quick-response code，快速响应码）是一种二维矩阵条码。它采用四种标准化的编码模式来编码数据：数字、字母与数字、字节（二进制）以及日语汉字。其最高存储容量可达2,953字节。

以下是不同模式的说明的表格：

| 模式 | 模式标志码 | 最大字符数 | 允许的字符，默认编码 |
|--------------|----------------|-----------------|------------------------------------------------------------|
| 仅数字 | 1 | 7,089 | 0、1、2、3、4、5、6、7、8、9 |
| 字母与数字 | 2 | 4,296 | 0-9、A-Z（仅限大写）、空格、$、%、*、+、-、..、 /, : |
| 二进制/字节 | 4 | 2,953 | ISO/IEC 8859-1 |
| 日语汉字/假名 | 8 | 1,817 | Shift JIS X 0208 |
| 结构化追加 | 3 | 无限 | 没有限定 |

PS：结构化追加（Structured Append）是一种将数据分到多个条码的模式。

在本文中，我们将讨论如何用Python生成不同模式的QR二维码。

## 以不同模式生成QR码

我们将使用[segno](https://github.com/heuer/segno/)库生成QR码。这是找到的唯一一个支持结构化追加的库。

1. 数字QR码

   ```py
   qrcode = segno.make_qr("9780593230060",mode="numeric")
   ```

   ![数字](/album/2024/03/qr-code-generator/samples/numeric.png)

2. 字母与数字QR码

   ```py
   qrcode = segno.make_qr("DYNAMSOFT",mode="alphanumeric")
   ```

   ![字母与数字](/album/2024/03/qr-code-generator/samples/alphanumeric.png)

3. 日语汉字QR码

   ```py
   qrcode = segno.make_qr("ディナムソフト",mode="kanji")
   ```

   ![日语汉字](/album/2024/03/qr-code-generator/samples/kanji.png)

   Shift-JIS将用于编码日语汉字。

4. 字节QR码

   我们可以使用字节来存储UTF-8编码的字符串。

   ```py
   qrcode = segno.make_qr("Dynamsoft",mode="byte")
   ```

   ![字节-文本](/album/2024/03/qr-code-generator/samples/byte-text.png)

   我们还可以直接存储图像文件的原始字节。

   ```py
   f = open("1-bit.png",mode="rb")
   qrcode = segno.make_qr(f.read(),mode="byte")
   ```

   ![字节-图像](/album/2024/03/qr-code-generator/samples/byte-image.png)

5. 结构化追加QR码

   如果我们需要存储的内容大于一个二维码的容量，或者如果只用一个二维码的话，二维码的版本会过高，导致难以打印和读取，那么我们可以将内容存储在多个二维码中。这可以通过结构化追加模式来实现。

   ```py
   f = open("8-bit.png",mode="rb")
   qrcode_seq = segno.make_sequence(f.read(), symbol_count=2)
   ```

   ![structured_append_image](/album/2024/03/qr-code-generator/samples/structured_append_image.png)


## 读取QR码

可以使用基于[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)的[网页版QR码扫描应用](https://tony-xlh.github.io/barcode-data-reader/)来读取我们在本文中生成的QR码。

## 源代码

获取源代码来自己试用一下吧：

<https://github.com/tony-xlh/qr-code-generator>

