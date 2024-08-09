---
layout: post
title: "如何基于Exif信息处理图像旋转"
date: 2024-08-09 16:00:53 +0800
categories: 文档扫描
tags: 
description: 本文讨论了什么是Exif以及如何基于它处理图像方向。给出了安卓和iOS的相关代码。
---

可交换图像文件格式（正式名称Exif ）是一种标准，用于指定数码相机（包括智能手机）的图像和声音使用的格式和辅助标签。它包含相机参数、图像尺寸和图像方向等元数据。

大多数相机传感器的形状是宽度大于高度的长方形。即使竖着拍摄照片，原始图像数据仍按照传感器的形状进行存储。在查看照片时，我们需要知道如何正确显示它们。此时需要Exif中的方向数据。相机的方向传感器可用于提供这一信息。


以下是关于方向和用于显示所需的旋转角度的示意图（[图源](https://web.archive.org/web/20220307162505/https://www.impulseadventure.com/photo/exif-orientation.html)）。

![方向标记](/album/2024/08/exif/orient_flag.gif)

如果图像是镜像翻转的，则方向标记如下图中的右图所示：

![方向标记-镜像](/album/2024/08/exif/orient_flag_mirrored.png)

大多数图像查看器和网页浏览器会自动根据方向标记显示图像。一些图像编辑器，如GIMP，会提示用户是否旋转图像。

![gimp方向提示](/album/2024/08/exif/gimp-orientation-prompt.jpg)

## 用于校正图像方向的代码

在开发移动文档扫描应用程序时，我们可能需要根据方向旋转拍摄的图像。

以下是执行此操作的代码。

Android（Java）：

```java
private Bitmap rotatedImageBasedOnExif(Bitmap bitmap, String path) {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
        ExifInterface exif = null;
        try {
            exif = new ExifInterface(path);
        } catch (IOException e) {
            return bitmap;
        }
        int rotate = 0;
        int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL);

        switch (orientation) {
            case ExifInterface.ORIENTATION_ROTATE_270:
                rotate = 270;
                break;
            case ExifInterface.ORIENTATION_ROTATE_180:
                rotate = 180;
                break;
            case ExifInterface.ORIENTATION_ROTATE_90:
                rotate = 90;
                break;
        }
        Matrix matrix = new Matrix();
        matrix.postRotate(rotate);
        Bitmap rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(),
                bitmap.getHeight(), matrix, true);
        try (FileOutputStream out = new FileOutputStream(path)) {
            rotated.compress(Bitmap.CompressFormat.JPEG, 100, out);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return rotated;
    }
    return bitmap;
}
```

注意Bitmap不包含Exif。需要直接传递文件路径给`ExifInterface`。

iOS（Swift）：

```swift
static func normalizedImage(_ image:UIImage) -> UIImage {
    if image.imageOrientation == UIImage.Orientation.up {
        return image
    }
    UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale)
    image.draw(in: CGRect(x:0,y:0,width:image.size.width,height:image.size.height))
    let normalized = UIGraphicsGetImageFromCurrentImageContext()!
    UIGraphicsEndImageContext();
    return normalized
}
```

## 源代码

安卓和iOS文档扫描demo的源代码：

* [安卓文档扫描](https://github.com/tony-xlh/Android-Document-Scanner/)
* [iOS文档扫描](https://github.com/tony-xlh/iOS-Document-Scanner/)


使用了[Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/overview/) SDK来执行文档检测和裁剪操作。

