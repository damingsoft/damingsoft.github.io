---
layout: post
status: publish
title: "TWAIN开发实战：10分钟内实现web应用中的扫描仪调用！"
date: 2021-04-29 11:17:48 +0800
categories: 文档扫描
tags: TWAIN
---

```
接触扫描仪集成开发的研发人员应该都知道，市面上的大多数扫描仪都是遵循TWAIN底层协议，各个扫描仪尽管外观、性能等不同，但是基本上厂商都提供了 TWAIN 驱动。

想要在自己开发的应用中，实现扫描仪调用？ 简单来说，就是跟TWAIN驱动实现对接，这样才能调用扫描仪，获取到扫描仪扫描的文档图片。

本文介绍一款第三方的扫描仪web集成开发包（SDK），叫做Dynamic Web TWAIN SDK。

注意：不是免费的！ 要找免费软件的，可以绕行。
```
下面介绍Dynamic Web TWAIN 这款SDK产品的基础使用步骤：

1. 下载SDK

有30天免费使用版本可以用，简单到网站上注册下载就行。链接在下面
https://www.damingsoft.com/products/dwt-register.aspx
大家大多数应该都是在Windows上开发吧，那就下载那个Windows版本的开发包就行。

2. 安装

略。 谁不会安装的，自己去撞豆腐 ：D

3. 查阅文档

文档都在默认安装目录 C:\Program Files (x86)\Dynamsoft\Dynamic Web TWAIN SDK 14.0 Trial
心急的可以直奔这个安装目录下的 Samples 目录，里面都是各种示例项目 和 完整的JavaScript/HTML 代码
![安装路径](/album/2021/TWAIN-practice-utilize-scanner-in-web-application/20180722210230216.png)

4. 自己开发一个hello world

其实那个Samples目录里面已经有很多现成的示例项目，代码也都有，自己稍微修改下就直接能用。如果不嫌麻烦，可以自己按照下面步骤搞一个最简单的扫描页面：
* 创建一个空的html页面，并放置于C:\Program Files (x86)\Dynamsoft\Dynamic Web TWAIN SDK 14.0 Trial\ 下
主要目的是跟软件安装包目录带的Resources目录同级。
![安装路径2](/album/2021/TWAIN-practice-utilize-scanner-in-web-application/20180722210959682.png)
* 引用核心的两个JS文件，并创建一个叫做Scan的HTML按钮 和 添加按钮对应的 JS 代码。完整代码如下：

```html 
<!DOCTYPE HTML>
<html>
<head>
    <title>Hello World</title>
    <script type="text/javascript" src="Resources/dynamsoft.webtwain.initiate.js"></script>
    <script type="text/javascript" src="Resources/dynamsoft.webtwain.config.js"></script>
</head>
<body>
    <input type="button" value="Scan" onclick="AcquireImage();" />
    <div id="dwtcontrolContainer"></div>
    <script type="text/javascript">
      function AcquireImage(){
          var DWObject = Dynamsoft.WebTwainEnv.GetWebTwain('dwtcontrolContainer');
          DWObject.IfDisableSourceAfterAcquire = true;
          DWObject.SelectSource();
          DWObject.OpenSource();
          DWObject.AcquireImage();
      }
    </script>
</body>
</html>
```
* 直接双击运行HTML页面，基本效果如下

![HTML页面](/album/2021/TWAIN-practice-utilize-scanner-in-web-application/20180722211347462.png)

点击扫描按钮，会自动跳出选择扫描仪的对话框：

![扫描仪对话框](/album/2021/TWAIN-practice-utilize-scanner-in-web-application/20180722211500347.png)

选择好扫描仪，就可以直接扫描得到图片并显示在网页里啦！！

* 当然，光能扫描并显示，肯定不够。 保存图片成JPEG, PDF, TIFF 这类常见格式是主流。具体最好还是参考samples 目录里面的其他 项目示例 和 代码。 目前看 示例项目还是比较丰富的。

![图片格式](/album/2021/TWAIN-practice-utilize-scanner-in-web-application/20180722211816860.png)

再搞不定就联系技术支持好了

https://www.damingsoft.com/ContactUs.aspx

