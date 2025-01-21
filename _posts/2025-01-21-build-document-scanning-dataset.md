---
layout: post
title: "构建文档扫描数据集"
date: 2025-01-21 10:30:53 +0800
categories: 文档扫描
tags: 
description: 本文讨论了如何构建用于边缘检测的文档扫描图像数据集。
---

手持式摄像头设备在文档扫描过程中发挥着重要作用，因为它们更便携、功能更强大、价格更实惠。然而，与使用文档扫描仪不同，使用相机会面临复杂背景、光线变化和透视变形等挑战，影响扫描质量。因此，有必要使用专门的文档扫描算法来检测文档边界并裁剪文档图像。

为了测试算法性能或训练深度学习模型，有必要建立一个文档扫描数据集。有一些现有的数据集：

* [SmartDoc 2015 – Challenge 1](http://smartdoc.univ-lr.fr/smartdoc-2015-challenge-1/)。这个数据集包含1920x1080分辨率的视频帧图像和相应的掩膜图像。

   ![smartdoc示例](/album/2025/01/document-scanning-dataset/smartdoc-sample.jpg)

* [MIDV-500](https://computeroptics.ru/eng/KO/Annot/KO43-5/430515e.html)。这是一个包含50种身份证件的数据集。

   ![midv500示例](/album/2025/01/document-scanning-dataset/midv500.jpg)

这两个数据集有一些局限性。它们的文档内容和背景多样性不足。有些照片过于扭曲，不适合提取高质量的文件图像。

通过摄像头进行文档扫描的过程可以通过以下步骤来定义：

1. 在相机预览中检测文档边界。
2. 评估拍摄条件，帮助用户改善拍摄效果。
3. 在拍摄条件良好时拍一张照。
4. 使用透视变换等方法从照片中裁剪文档图像。

在本文中，我们将建立一个文档扫描数据集，其中包含在良好条件下（步骤 3）在不同背景上拍摄的各种照片。它可用于检查文档扫描算法在实际场景中的性能。

## 在真实场景中拍照

首先，我们可以在真实场景中拍照。有几个因素需要考虑：

* 文件类型（A4纸张、身份证、收据等）
* 文档内容（是否包含表格和图形）
* 背景（简单或复杂，是否和文档形成对比）

一些拍摄的照片：

![拍摄的照片示例](/album/2025/01/document-scanning-dataset/documents.jpg)

## 保存标注

将文档的四边形保存为以下标注格式：

```
x1,y1 x2,y2 x3,y3 x4,y4
```

我们可以先使用[Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/overview/)检测文档，然后手动校对结果。


## 合成图像以增强数据集

为了丰富数据集，我们可以通过混合不同的文档图像和背景图像来合成图像。

1. 使用在真实场景中拍摄的文档。

   我们有一张背景图像、一张文档图像和文档的掩膜图像。

   ![要混合的图像](/album/2025/01/document-scanning-dataset/images-to-blend.jpg)

   要混合文档图像和背景图像，可以使用OpenCV的`bitwise_and`方法抠图，并使用OpenCV的`addWeighted`方法合并这两个图像。

   代码：

   ```py
   #read the images
   src1 = cv2.imread(src_path)
   src2 = cv2.imread(src2_path)

   #resize to make the dimensions of the two images match
   height, width, channels = src1.shape
   dim = (width, height)
   src2 = cv2.resize(src2, (width,height), interpolation = cv2.INTER_NEAREST)

   #read the mask image
   mask = cv2.imread(src_mask_path,cv2.IMREAD_GRAYSCALE)
   mask_inverted = cv2.bitwise_not(mask)

   #generate masked images
   src1_masked = cv2.bitwise_and(src1, src1, mask=mask)
   src2_masked = cv2.bitwise_and(src2, src2, mask=mask_inverted)

   #produce the blended image
   dst = cv2.addWeighted(src1_masked, 1.0, src2_masked, 1.0, 0.0)
   ```

   抠好的图像和合并后的图像的示例：

   ![示例图像](/album/2025/01/document-scanning-dataset/masked-images-and-result.jpg)



2. 使用数据集中的文档。

   有许多文档数据集，如[DocBank](https://github.com/doc-analysis/DocBank/)。它们可能只包含无任何背景的干净的文件图像。但我们仍然可以使用它们来丰富数据集。

   1. 使用OpenCV的`seamlessClone`方法和一张背景图片，让文档图像看起来像是在真实场景中拍摄的。该方法使用泊松图像编辑。

      示例图像（文档、背景和结果） ：

      ![示例图像](/album/2025/01/document-scanning-dataset/images-to-blend-2.jpg)

      代码：

      ```py
      #read the images
      src1 = cv2.imread(src_path)
      src2 = cv2.imread(src2_path)

      #resize to make the dimensions of the two images match
      height, width, channels = src1.shape
      dim = (width, height)
      src2 = cv2.resize(src2, dim, interpolation = cv2.INTER_NEAREST)

      # Create an all white mask
      mask = 255 * np.ones(src1.shape, src1.dtype)

      # The location of the center of the src in the dst
      center = (width // 2, height // 2)

      # Seamlessly clone src into dst and put the results in output
      normal_clone = cv2.seamlessClone(src1, src2, mask, center, cv2.NORMAL_CLONE)
      ```

   2. 随机旋转图片并添加填充，使其与背景图片相匹配。

      ![旋转的图像](/album/2025/01/document-scanning-dataset/rotated-image.jpg)

   3. 执行前一个文档图像类型的类似步骤，将两个图像混合在一起。

      ![混合的图像](/album/2025/01/document-scanning-dataset/blended-image.jpg)

## 源代码

获取生成器的源码并尝试使用：

<https://github.com/tony-xlh/SynthDocs>



