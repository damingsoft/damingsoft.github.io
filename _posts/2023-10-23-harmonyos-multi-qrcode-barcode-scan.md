---
layout: post
title: "鸿蒙HarmonyOS应用开发：多码识别"
date: 2023-10-23 10:07:53 +0800
categories: 条码扫描
tags: 
    - 鸿蒙
    - harmonyos
    - 二维码
    - 条形码
---

华为HMS Core的扫码接口更适用于简单的个人使用。在商业环境，如货架、医用试管、图书馆书架等，常常遇到复杂的多码扫描需求，这时需要专业的扫码SDK。尽管当前市场上的主流商业SDK尚未支持鸿蒙HarmonyOS，但我们仍可以通过HTTP请求来调用扫码服务，满足在鸿蒙系统上的多码扫描需求。

## 准备工作
1. 申请一个Dynamsoft Barcode Reader[免费试用序列号](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr)。
2. 安装Node.js依赖包。
    
    ```bash
    npm install barcode4nodejs express body-parser
    ```

## 使用Node.js搭建扫码服务
启动一个Express服务，监听3000端口，代码如下：

```javascript
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const http = require('http');
const server = http.createServer(app);
const bodyParser = require('body-parser');

app.use(express.static('public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const port = process.env.PORT || 3000;

server.listen(port, '0.0.0.0', () => {
    host = server.address().address;
    console.log(`Server running at http://0.0.0.0:${port}/`);
});

```

通过HTTP POST请求接收图片文件流：

```javascript
app.post('/readbarcode', async (req, res) => {
    const data = req.body;
    let chunks = [];

    req.on('data', (chunk) => {
        chunks.push(chunk);
    });

    req.on('end', () => {
        let nodeBuffer = Buffer.concat(chunks);
        
    });
});
```

使用[barcode4nodejs](https://www.npmjs.com/package/barcode4nodejs)来实现服务端的扫码功能：

```javascript
const dbr = require("barcode4nodejs")
dbr.initLicense("LICENSE-KEY")
dbr.decodeFileStreamAsync(nodeBuffer, nodeBuffer.length, dbr.formats.QRCode).then((results) => {
            let output = '';
            let index = 0;
            for (result of results) {
                output += index + ': ' + result['value'] + ' ';
                index += 1;
            }
            res.status(200).send(output);
        });
```


## 鸿蒙应用开发步骤
在`entry/src/main/module.json5`文件中配置网络权限`ohos.permission.INTERNET`：

```json
{
  "module": {
    "name": "entry",
    ...
    "abilities": [
      ...
    ],
    "requestPermissions": [{"name": "ohos.permission.INTERNET"}]
  }
}
```

在工程的`rawfile`目录中放入一张示例图片。

![鸿蒙图片资源](https://devblogs.damingsoft.com/album/2023/10/harmonyos-resource-image-file.png)

程序启动的时候，我们把图片加载到内存中，用于显示以及后续的扫码请求。在`entry/src/main/ets/pages/Index.ets`中添加如下代码：

```typescript
import http from '@ohos.net.http';
import image from '@ohos.multimedia.image';

const context = getContext(this);
const resourceMgr = context.resourceManager;

@Entry
@Component
struct Index {
  @State displayImage: any = undefined 
  @State result: string = 'N/A'

  imageData: ArrayBuffer = undefined
  host: string = 'http://192.168.8.72:3000'
  text: string = 'https://devblogs.damingsoft.com/album/2023/10/multicode.jpg'
  onPageShow() {
    (async () => {
      const fileData = await resourceMgr.getRawFileContent('qrcode.jpg');
      this.imageData = fileData.buffer;

      const imageSource = image.createImageSource(this.imageData);
      imageSource.createPixelMap().then(pixelmap => {
        this.displayImage = pixelmap;
      });
      })();
  }

    build() {
    Scroll(this.scroller) {
      Column() {
        ...

        Image(this.displayImage).width('100%').objectFit(ImageFit.Contain).margin({bottom: 5})

        Text(this.result)
          .fontSize(16).textAlign(TextAlign.Start)
          .fontWeight(FontWeight.Bold).backgroundColor(0xd2cab3)

      }
      .justifyContent(FlexAlign.Start).width('100%').height('100%').padding({left: 5, top: 5, right: 5, bottom: 5})
    }

  }
}
```

这里的`host`就是刚才启动的服务器地址。`imageData`是图片的二进制数据，`displayImage`是用于显示的`PixelMap`对象。`result`是扫码结果。

添加一个按钮来触发HTTP POST扫码请求：

```typescript
Button('Read Multi QR Codes')
    .backgroundColor('#007DFF')
    .margin(15)
    .onClick(() => {
        if (!this.imageData) return;

        let url = this.host + '/readbarcode'
        let httpRequest = http.createHttp();
        httpRequest.on('headersReceive', (header) => {
        console.info('header: ' + JSON.stringify(header));
        })
        httpRequest.request(
        url,
        {
            method: http.RequestMethod.POST,
            header: {
            'Content-Type': 'application/octet-stream'
            },
            extraData: this.imageData,
        }, (err, data) => {
        if (!err) {
            try {
            this.result = data.result.toString()
            } catch (error) {
            console.error("Error parsing JSON:", error);
            }

        } else {
            console.info('error:' + JSON.stringify(err));
            httpRequest.off('headersReceive');
            httpRequest.destroy();
        }
        }
        );
    })
```

`Content-Type`设置成`application/octet-stream`，`extraData`设置成图片的二进制数据。

![鸿蒙二维码识别](https://devblogs.damingsoft.com/album/2023/10/harmonyos-qr-detection.png)


为了方便在模拟器里测试不同的图片，我们再创建一个输入框用来输入图片URL，然后通过HTTP GET请求来获取图片数据：

```typescript
TextArea({
    placeholder: 'https://devblogs.damingsoft.com/album/2023/10/multicode.jpg',
})
    .placeholderFont({ size: 16, weight: 400 })
    .width(336)
    .height(56)
    .margin(20)
    .fontSize(16)
    .fontColor('#182431')
    .backgroundColor('#FFFFFF')
    .onChange((value: string) => {
    this.text = value
    })

Button('Get an image')
    .backgroundColor('#007DFF')
    .margin(15)
    .onClick(() => {

        let httpRequest = http.createHttp();
        httpRequest.on('headersReceive', (header) => {
        console.info('header: ' + JSON.stringify(header));
        })
        httpRequest.request(
        this.text,
        {
            method: http.RequestMethod.GET,
        }, (err, data) => {
        if (!err) {
            if (data.result instanceof ArrayBuffer) {
            this.imageData = data.result as ArrayBuffer
            const imageSource = image.createImageSource(this.imageData);
            imageSource.createPixelMap().then(pixelmap => {
                this.displayImage = pixelmap;
            });
            }

        } else {
            console.info('error:' + JSON.stringify(err));
            httpRequest.off('headersReceive');
            httpRequest.destroy();
        }
        }
        );
    })
```

最后我们测试一张包含多个二维码的图片：

![鸿蒙多码识别程序](https://devblogs.damingsoft.com/album/2023/10/harmonyos-multi-barcode-qrcode-scan.png)

## 源代码
[https://gitee.com/yushulx/harmonyos-multi-barcode-qrcode-scan](https://gitee.com/yushulx/harmonyos-multi-barcode-qrcode-scan)

