---
layout: post
title: "TWAIN和WIA之间有什么相似/不同之处"
date:   2021-04-29 11:09:32 +0000
categories: 文档扫描
tags: TWAIN
---

如果您使用 [Dynamsoft](https://www.dynamsoft.com/) 的 [Dynamic Web TWAIN](https://www.dynamsoft.com/Products/WebTWAIN_Overview.aspx) 或 [Dynamic .NET TWAIN](https://www.dynamsoft.com/Products/.Net-TWAIN-Scanner.aspx) （用于桌面应用程序）开发应用程序，您可能会想知道TWAIN和WIA之间的异同点。

## 相似之处：
1. 只要存在驱动程序，两者都能够从诸如扫描仪或相机之类的设备获取图像。
2. 使用对话框获取图像。
3. 以编程方式设置设备的属性，可以在不显示对话框的情况下通过编程获取图像。
4. 并非每个设备都支持所有功能，因此您可以在设备上查询它支持的功能。

## 不同之处：
1. 通常，当设备同时支持TWAIN和WIA时，TWAIN更适合扫描仪，而WIA更适合相机，网络摄像头等。
2. 对于像相机这样的设备，有时驱动程序实际上是WIA，但您可以通过“TWAIN compatibility layer”访问它。
3. WIA为所有设备使用的都是通用的对话框，而TWAIN使用设备制造商创建的对话框。 可见，TWAIN的对话框将提供更多选项，能实现对设备的高级控制。
4. TWAIN允许您使用设备制造商创建的自定义功能，即使TWAIN规范中不存在这些功能。
5. TWAIN有三种传输模式（本地、缓存和文件模式），WIA只有两种（缓存和文件模式）。
6. 大多数TWAIN能保存上一次扫描的设置，而WIA则没有。
7. 在双面模式下扫描时，TWAIN支持对每页进行设置，但WIA对两页使用相同的设置。


## Dynamsoft
1. [Dynamsoft](https://www.dynamsoft.com/)的TWAIN系列SDK适用于所有TWAIN驱动程序。
2. 对于WIA驱动程序，它大多数时候也适用于[Dynamsoft]的TWAIN系列SDK。(https://www.dynamsoft.com/)
3. 如果您的应用程序需要支持从网络摄像头获取图像的功能，请查看[Webcam Capture Add-on](https://www.dynamsoft.com/Products/webcam-sdk-features.aspx)。 该插件基于DirectShow API，适用于所有兼容UVC的网络摄像头。
4. [如何检查您的设备是否支持某项功能]？(https://developer.dynamsoft.com/dwt/kb/2171)


有关WIA的更多详细信息，请访问[这里](https://en.wikipedia.org/wiki/Windows_Image_Acquisition).
有关TWAIN的更多详情，请访问[这里](http://www.twain.org/).
有关TWAIN，WIA，ISIS，SANE的异同，请访问[这里](https://www.dynamsoft.com/blog/insights/document-scanning-twain-wia-isis-sane/).

