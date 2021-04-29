---
layout: post
status: publish
title: "TWAIN开发实战：10分钟内实现web应用中的扫描仪调用！"
date: 2021-04-29 11:17:48 +0800
categories: 文档扫描
tags: TWAIN
---

## 简介

```
桌面摄像头几乎是每台个人电脑必备的附件之一。实时聊天，远程协助等很多的桌面应用可以直接调用摄像头。然而在目前将桌面搬到云端的技术热潮中，在浏览器中直接集成摄像头也是一个热门需求。类似的实际应用场景可能有
* 在填写一些在线申请表格时，拍摄头像
* 通过质量略好的摄像头在视频流中直接读取二维码
* 在银行医院等机构中，采用质量很好的摄像头（如高拍仪）来实现类似扫描仪级别的图像获取

要文中笔者将和大家探讨一下如何快速的在同一个网页中调用本地扫描仪和摄像头来获取图像

```

## 环境要求

[node](https://nodejs.org/en/)

1. 新建一个目录，在里面打开命令行工具（快捷方式为Ctrl+Shift+右击）通过npm下载本文使用的核心控件

```bash
npm install dwt@14.0.3
```
2. 打开到目录node_modules\dwt\samples，可以看到
![samples](/album/2021/5-minute-integration-of-desktop-camera-or-hightimer-to-Web-application/20180724163537279.png)
3. 在本文中，我们要重点研究的是**ScanOrCapture.html**。直接双击打开。在浏览器中按照提示安装控件
![控件](/album/2021/5-minute-integration-of-desktop-camera-or-hightimer-to-Web-application/20180726100437954.png)
正常情况下，安装的文件可以在 C:\Windows\SysWOW64\Dynamsoft\DynamsoftService 目录中找到。这里的核心文件主要是
**DynamsoftService.exe**, **dwt_trial_14.0.0.0618.dll**,**dcs_trial_6100907.dll**
4. 安装完成后，刷新页面，如果本地有摄像头，则在页面的下拉菜单中会显示出来。选中一个摄像头并点击“Play Video”，然后点击“Grab An Image”。图中右侧为视频流，左侧为截取的一帧画面
 ![截图](/album/2021/5-minute-integration-of-desktop-camera-or-hightimer-to-Web-application/20180726101522446.png)
 
 我们还可以点击“Scan Documents”来调用本地扫描仪扫描一张图。
 
  ![本地图片](/album/2021/5-minute-integration-of-desktop-camera-or-hightimer-to-Web-application/20180726102018666.png)
  
  如果需要了解更多技术细节，可以直接看**ScanOrCapture.html**的JS源码。也可以直接[联系免费快速的中国区技术支持](https://www.damingsoft.com/ContactUs.aspx)
  
  ## 备注
  
  如果你看到以下提示则表示你用的授权过期了。
  
  ![过期](/album/2021/5-minute-integration-of-desktop-camera-or-hightimer-to-Web-application/20180724123243669.png)
  
  解决方案为点击上图中标红的链接，获取一个新的授权并加上下面的代码中的第一句（在window.onload回调函数中）
  
  ```
  ...
Dynamsoft.WebTwainEnv.ProductKey = "<新的授权>";
Dynamsoft.WebTwainEnv.Load();
...
  ```
