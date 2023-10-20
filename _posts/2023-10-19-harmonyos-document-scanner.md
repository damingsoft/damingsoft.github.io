---
layout: post
title: "鸿蒙HarmonyOS应用开发：文档扫描app"
date: 2023-10-19 10:07:53 +0800
categories: 文档扫描
tags: 
    - 鸿蒙
    - harmonyos
    - 文档
---

华为鸿蒙HarmonyOS已经发展到4.0，使用ArkTS作为开发语言。这篇文章结合Dynamsoft Service开发一个简单的鸿蒙应用，用来获取办公室里连接PC的扫描仪，把文档扫描到手机里。

## 准备工作
- Dynamsoft Service
    1. 在连接着扫描仪的电脑上安装Dynamsoft Service。安装包可以满足各种国产操作系统，比如**统信UOS**，**麒麟Kylin OS**等。支持的架构有：**x86**，**x64**，**arm64**，**mips64el**。支持的扫描仪协议包括**TWAIN**，**WIA**，**SANE**，**ICA**和**eSCL(AirPrint)**。下载地址：
        
        - Windows: [Dynamsoft-Service-Setup.msi](https://demo.dynamsoft.com/DWT/DWTResources/dist/DynamsoftServiceSetup.msi)
        - macOS: [Dynamsoft-Service-Setup.pkg](https://demo.dynamsoft.com/DWT/DWTResources/dist/DynamsoftServiceSetup.pkg)
        - Linux: 
            - [Dynamsoft-Service-Setup.deb](https://demo.dynamsoft.com/DWT/DWTResources/dist/DynamsoftServiceSetup.deb)
            - [Dynamsoft-Service-Setup-arm64.deb](https://demo.dynamsoft.com/DWT/DWTResources/dist/DynamsoftServiceSetup-arm64.deb)
            - [Dynamsoft-Service-Setup-mips64el.deb](https://demo.dynamsoft.com/DWT/DWTResources/dist/DynamsoftServiceSetup-mips64el.deb)
            - [Dynamsoft-Service-Setup.rpm](https://demo.dynamsoft.com/DWT/DWTResources/dist/DynamsoftServiceSetup.rpm)
    
        然后访问`http://127.0.0.1:18622/DWTAPI/Scanners`。正常安装可以获取到扫描仪列表。
    
        ![dynamsoft-service-scanners](https://devblogs.damingsoft.com/album/2023/10/dynamsoft-service-scanner-list.png)
    
    2. 在浏览器中打开`http://127.0.0.1:18625/`，把**host**从`127.0.0.1`改成PC的局域网IP地址。比如`192.168.8.72`，修改成功可以通过局域网IP地址访问`192.168.8.72:18622/DWTAPI/Scanners`获取到扫描仪列表。
        
        ![dynamsoft-service-config](https://user-images.githubusercontent.com/2202306/266243200-e2b1292e-dfbd-4821-bf41-70e2847dd51e.png)
    
    3. 申请一个[免费试用序列号](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)，扫描文件的时候需要用。

- DevEco Studio
    
    下载地址：[https://developer.harmonyos.com/cn/develop/deveco-studio/#download](https://developer.harmonyos.com/cn/develop/deveco-studio/#download)。安装前先安装Node.js，路径中不要带空格，否则安装DevEco Studio, 下载HarmonyOS SDK可能会失败。

## 鸿蒙程序开发
在DevEco Studio中新建工程。

![鸿蒙应用工程](./album/2023/10/create-harmonyos-project.png.png)

在`entry/src/main/module.json5`中添加[网络权限](https://developer.harmonyos.com/cn/docs/documentation/doc-guides-V3/net-mgmt-overview-0000001478341009-V3)：

```json
{
  "module": {
    ...
    "abilities": [
      ...
    ],
    "requestPermissions": [{"name": "ohos.permission.INTERNET"}]
  }
}
```

打开`entry/src/main/etc/pages/Index.ets`，导入网络和图像模块：

```typescript
import http from '@ohos.net.http';
import image from '@ohos.multimedia.image';
```

声明UI组件，包含两个[按钮](https://developer.harmonyos.com/cn/docs/documentation/doc-references/ts-basic-components-button-0000001281480682)，一个[下拉按钮](https://developer.harmonyos.com/cn/docs/documentation/doc-references/ts-basic-components-select-0000001333321197)和一个[图片](https://developer.harmonyos.com/cn/docs/documentation/doc-references/ts-basic-components-image-0000001281001226)控件：

```typescript
@Entry
@Component
struct Index {
  @State deviceNames: SelectOption[] = [{value: ''}]
  @State displayImage: PixelMap = undefined
  licenseKey: string = "LICENSE-KEY"; // https://www.dynamsoft.com/customer/license/trialLicense?product=dwt
  host: string = 'http://192.168.8.72:18622'
  devices = []
  index: number = 0
  build() {
    Column() {
      Row() {
        Button('Get Devices')
          .onClick(() => {
            
            }
            );
          }).width('30%')
        Column() {
          Select(this.deviceNames)
            .selected(this.index)
            .value(this.deviceNames[this.index].value.toString())
            .font({size: 14, family: 'serif', style: FontStyle.Normal })
            .onSelect((index:number)=>{
              this.index = index;
            })
        }.width('40%').alignItems(HorizontalAlign.Center)

        Button('Scan')
          .onClick(() => {
            
            }
            );

          }).width('30%')
      }.backgroundColor(0xFFFFFF).padding({ left: 12 }).width('100%').margin({bottom: 5})
      Divider()
      Image(this.displayImage).height('100%').width('100%')
    }.justifyContent(FlexAlign.Start).width('100%').height('100%').padding({left: 5, top: 5, right: 5, bottom: 5})
  }
}
```

这里的`licenseKey`和`host`需要替换成自己的。

当点击`Get Devices`按钮的时候，我们通过HTTP GET来获取扫描仪列表：

```typescript
Button('Get Devices')
    .onClick(() => {
    let url = this.host + '/DWTAPI/Scanners'

    let httpRequest = http.createHttp();
    httpRequest.on('headersReceive', (header) => {
        console.info('header: ' + JSON.stringify(header));
    })

    httpRequest.request(
        url,
        {
        method: http.RequestMethod.GET,
        header: {
            'Content-Type': 'application/json'
        }
        }, (err, data) => {
        if (!err) {
        try {
            const jsonArray = JSON.parse(data.result.toString())
            this.devices = []
            let tmp: SelectOption[] = []
            for (const obj of jsonArray) {
            tmp.push({value: obj.name})
            this.devices.push(obj)
            }

            if (tmp.length > 0) {
            this.index = 0
            this.deviceNames = tmp
            }

        } catch (error) {
            console.error("Error parsing JSON:", error);
        }

        console.info('code:' + JSON.stringify(data.responseCode));

        } else {
        console.info('error:' + JSON.stringify(err));
        httpRequest.off('headersReceive');
        httpRequest.destroy();
        }
    }
    );
    }).width('30%')
```

当点击`Scan`按钮的时候，我们通过HTTP POST来触发扫描仪扫描文档. 字段[extraData](https://developer.harmonyos.com/cn/docs/documentation/doc-references-V3/js-apis-http-0000001478061929-V3)用于传输内容，等同于HTTP请求中的`body`。传输的参数可以自定义，具体可以参考[在线文档](https://www.dynamsoft.com/web-twain/docs/info/api/Interfaces.html#DeviceConfiguration)。

```typescript
Button('Scan')
    .onClick(() => {
    if (this.devices.length == 0) {
        return;
    }
    let parameters = {
        license: this.licenseKey,
        device: this.devices[this.index].device,
        config: {
        IfShowUI: false,
        PixelType: 2,
        //XferCount: 1,
        //PageSize: 1,
        Resolution: 200,
        IfFeederEnabled: false,
        IfDuplexEnabled: false,
        }
    };

    let url = this.host + '/DWTAPI/ScanJobs';
    let httpRequest = http.createHttp();
    httpRequest.on('headersReceive', (header) => {
        console.info('header: ' + JSON.stringify(header));
    })
    httpRequest.request(
        url,
        {
        method: http.RequestMethod.POST,
        header: {
            'Content-Type': 'application/json'
        },
        extraData: JSON.stringify(parameters),
        }, (err, data) => {
        if (!err) {
        if (data.responseCode == 201) {
            let jobId = data.result;
            let url = this.host + '/DWTAPI/ScanJobs/' + jobId + '/NextDocument';
            let httpRequest = http.createHttp();
            httpRequest.request(
            url,
            {
                method: http.RequestMethod.GET,
                expectDataType: http.HttpDataType.ARRAY_BUFFER
            }, (err, data) => {
            if (!err) {
                if (data.responseCode == 200) {
                    // show image
                }
            } else {
                console.info('error:' + JSON.stringify(err));
                httpRequest.destroy();
            }
            }
            );
        }
        } else {
        console.info('error:' + JSON.stringify(err));
        httpRequest.off('headersReceive');
        httpRequest.destroy();
        }
    }
    );

    }).width('30%')
```

获取到的图像是一个`ArrayBuffer`，我们通过[image.createImageSource](https://developer.harmonyos.com/en/docs/documentation/doc-references-V3/js-apis-image-0000001477981401-V3)来创建一个`PixelMap`对象，然后把它赋值给`displayImage`，就可以在UI上显示出来了。

```typescript
let imageData = data.result as ArrayBuffer;
const imageSource = image.createImageSource(imageData);
imageSource.createPixelMap().then(pixelmap => {
    this.displayImage = pixelmap;
});
```

运行文档扫描程序：
    
![鸿蒙文档扫描](https://devblogs.damingsoft.com/album/2023/10/harmonyos-document-scanner.png)
    


## 源代码
[https://gitee.com/yushulx/harmonyos-document-scanner](https://gitee.com/yushulx/harmonyos-document-scanner)

