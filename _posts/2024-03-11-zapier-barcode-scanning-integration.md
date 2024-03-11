---
layout: post
title: "如何创建一个Zapier集成以在工作流中集成扫码功能"
date: 2024-03-11 14:19:53 +0800
categories: 条码扫描
tags: 
---

Zapier是一个工作流程自动化平台。它集成了6000多个应用程序，我们可以在同一个工作流程中链接不同的应用程序去使用它们，并且无需编写代码。

在本文中，我们将创建一个Zapier应用集成来集成条码扫描功能。当我们在Web应用里扫了一个码，它就会触发对应的工作流。扫码功能由[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)提供。

## 扫描条码以触发Zapier工作流

由于Zapier集成无法单独工作，下面我们会去实现一个完整的解决方案，做到扫码触发Zapier中的工作流程。下面是具体的步骤：

1. 构建一个条码扫描Web应用。
2. 构建一个Zapier应用集成以使用上一步的条码扫描应用。
3. 构建一个Zap（工作流程）来使用上一步的集成。

### 构建条码扫描Web应用

让我们创建一个Python后端和一个前端页面。

前端生成一个UUID作为唯一标识符，并将扫描的条码发给后端。

<video src="https://github.com/tony-xlh/Zapier-Barcode-Reader/releases/download/1.0.0/scanning-demo.mp4" data-canonical-src="https://github.com/tony-xlh/Zapier-Barcode-Reader/releases/download/1.0.0/scanning-demo.mp4" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width: 100%;max-height:640px; min-height: 200px"></video>

后端有两个接口，可以被Zapier的轮询服务器调用。

1. `/auth`用于授权。
2. `/code`用于添加条码和获取某个设备上扫描的码（设备由UUID区分）。

`/code`接口可以返回一串数组，包含扫描的条码数据，如下所示：

```json
[
    {
        "id": 1710134464039,
        "barcode": "9781477701461"
    },
    {
        "id": 1710134706906,
        "barcode": "9780743258074"
    },
    {
        "id": 1710135037503,
        "barcode": "9780321344755"
    },
    {
        "id": 1710137117234,
        "barcode": "9780062874788"
    }
]
```

时间戳用作ID ，以便我们可以扫描多个条码，并且 Zapier的重复数据删除机制会将它们视为不同的记录。

#### 后端实现

这里，我们使用Flask作为框架来提供两个接口：

1. `/auth`:

   ```py
   @app.route('/auth', methods=['POST','GET'])
   def auth():
       response = {}
       response["success"] = True
       json_string = json.dumps(response)
       resp = Response(json_string)
       resp.headers['Content-Type'] = 'application/json'
       return resp
   ```

   这个接口总是返回true ，因为我们使用UUID作为标识符，实际上不需要授权。

2. `/code`:

   ```py
   data = {}
   @app.route('/code', methods=['POST','GET'])
   def code():
       global data
       new_barcode_items = []
       if request.method == 'POST':
           uuid = request.args.get('uuid')
           barcode = request.args.get('barcode')
           barcodes = [];
           if uuid in data:
               barcodes = data[uuid]
           else:
               data[uuid] = barcodes
           item = {}
           item["id"] = int(time.time()*1000)
           item["barcode"] = barcode
           barcodes.append(item)    
       else:
           uuid = request.args.get('uuid')
           if uuid in data:
               barcodes = data[uuid]
               for item in barcodes:
                   new_barcode_items.append(item)
       json_string = json.dumps(new_barcode_items)
       resp = Response(json_string)
       resp.headers['Content-Type'] = 'application/json'
       return resp
   ```

   如果方法为`POST` ，则在`data`字典中添加新的条码项。如果方法为`GET` ，则返回某个UUID的条码数组。

3. 在根目录下提供静态文件。

   ```py
   app = Flask(__name__, static_url_path='/', static_folder='./')
   ```

#### 前端实现

1. 使用以下模板创建新的`scanner.html`文件：

   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Scan Barcode to Zapier</title>
       <style>
       </style>
   </head>
   <body>
       <div id="app"></div>
       <script></script>
   </body>
   </html>
   ```

2. 在页面中包含Dynamsoft Barcode Reader：

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.0.21/dist/dbr.bundle.js"></script>
   ```

3. 使用证书初始化产品。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr)申请一个证书。

   ```js
   let license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial license
   Dynamsoft.License.LicenseManager.initLicense(license);
   ```

4. 创建一个Camera Enhancer实例来打开摄像头。

   ```js
   let view = await Dynamsoft.DCE.CameraView.createInstance();
   let cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(view);
   document.getElementById("cameraViewContainer").append(view.getUIElement());
   await cameraEnhancer.open();
   ```

   将以下元素添加为摄像头控件的容器。

   ```html
   <style>
   #cameraViewContainer{
       position: fixed;
       width: 100%;
       height: 100%;
       top:0;
       left:0;
   }
   </style>
   <div id="cameraViewContainer"></div>
   ```

5. 创建一个Capture Router实例以从视频帧读取条码。

   ```js
   let router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   router.setInput(cameraEnhancer);
   await router.startCapturing("ReadSingleBarcode");
   ```

6. 条码读取结果可以在`onDecodedBarcodesReceived`回调中得到。这里，我们将结果保存在一个文本输入框中。

   ```js
   router.addResultReceiver({ onDecodedBarcodesReceived: (result) => {
       if (result.barcodeResultItems.length > 0) {
           document.getElementById("barcode").value = result.barcodeResultItems[0].text;
           stopScanning();
       }
   }});
   ```

7. 应用启动时生成或读取UUID。

   ```js
   function loadUUID(){
       let uuid = localStorage.getItem("uuid");
       if (!uuid) {
           uuid = generateUUID();
           localStorage.setItem("uuid",uuid);
       }
       document.getElementById("uuid").value = uuid;
   }

   function generateUUID() {
       var temp_url = URL.createObjectURL(new Blob());
       var uuid = temp_url.toString(); // blob:https://xxx.com/b250d159-e1b6-4a87-9002-885d90033be3
       URL.revokeObjectURL(temp_url);
       return uuid.substr(uuid.lastIndexOf("/") + 1);
   }
   ```

8. 将条码发送到后端。

   ```js
   function send(){
       let uuid = document.getElementById("uuid").value;
       let barcode = document.getElementById("barcode").value;
       let xhr = new XMLHttpRequest();
       xhr.open('POST', "/code?uuid="+uuid+"&barcode="+barcode);
       xhr.onreadystatechange = function(){
           if(xhr.readyState === 4){
               document.getElementById("barcode").value = "";
               alert("Sent");
           }
       }
       xhr.onerror = function(){
           console.log("error");
           alert("failed");
       }
       xhr.send();
   }
   ```

这样Web条码扫描应用就写好了。我们可以将其部署到像Vercel这样的平台上供生产使用。

### 构建Zapier集成

访问`developer.zapier.com`，用Platform UI建立新的集成。

![新集成](/album/2024/03/zapier/new_integration.jpg)

#### 认证

1. 选择`API Key`以设置身份验证。

   ![验证](/album/2024/03/zapier/authentication.jpg)

2. 添加两个身份验证字段：UUID和设备名称。

   ![身份验证字段](/album/2024/03/zapier/authentication_fields.jpg)

3. 设置用于身份验证的URL。这里，我们使用`https://zapier-barcode-reader.vercel.app/auth`。

   ![身份验证端点](/album/2024/03/zapier/authentication_endpoint.jpg)

4. 将`Device Name设备名称`指定为Connection Label连接标签，以便用户可以在Zap的设置页面中看到该名称。

   ![身份验证连接标签](/album/2024/03/zapier/authentication_connection_label.jpg)

#### 触发器

1. 创建一个名为`Barcode Scanned`的触发器。

   ![新触发器](/album/2024/03/zapier/new_trigger.jpg)

2. 配置API请求。

   1. 选择类型为 `Polling轮询`。
   2. 设置URL。这里，我们使用`https://zapier-barcode-reader.vercel.app/code`。

      ![触发器的应用程序接口配置](/album/2024/03/zapier/trigger_api_configuration.jpg)

   3. 提供示例数据：

      ```json
      {
        "id": 1710134464039,
        "barcode": "9780321344755"
      }
      ```

      ![触发器的示例数据](/album/2024/03/zapier/trigger_sample_data.jpg)

### 创建新的Zap

集成已经写好了。让我们在Zap中使用它。

以下是我们将要制定的工作流程。

1. 扫描图书的ISBN条码，触发工作流程。
2. 运行JavaScript代码，通过Google的API查询图书信息。
3. 创建新的Notion数据库记录以存储扫描的图书。

![Zap](/album/2024/03/zapier/zap.jpg)

具体步骤如下：

#### 条码扫描触发器

1. 创建新的Zap并选择我们刚制作的`Dynamsoft Barcode Reader`集成作为触发器。

   ![选择触发器](/album/2024/03/zapier/select_trigger.jpg)

2. 在账号连接步骤，输入UUID和设备名称。

   ![连接](/album/2024/03/zapier/connection.jpg)

3. 在条码扫描Web应用中扫码，并将其发送到Zapier。然后，我们可以在测试步骤中获取记录。

   ![条码扫描测试结果](/album/2024/03/zapier/barcode_reader_test_result.jpg)

#### 查询图书的信息

接下来，创建一个运行JavaScript代码的步骤，以获取书籍的标题、作者和描述等信息。

1. 选择`Code by Zapier`作为动作。

   ![选择代码动作](/album/2024/03/zapier/select_code_action.jpg)

2. 选择`Run JavaScript`。

   ![选择代码操作的类型](/album/2024/03/zapier/code_action_type.jpg)

3. 使用上一步中的`Barcode`作为输入数据。

   ![选择代码操作的输入数据](/album/2024/03/zapier/code_action_inputdata.jpg)

4. 在代码输入框中输入以下JavaScript代码，以查询图书信息。

   ```js
   output = [];
   let response = await fetch("https://www.googleapis.com/books/v1/volumes?q=isbn:"+inputData.barcode);
   let object = await response.json()
   let items = object["items"]
   if (items.length>0) {
     let item = items[0];
     let title = item["volumeInfo"]["title"];
     let desc = item["volumeInfo"]["description"];
     let authors = item["volumeInfo"]["authors"].join(" ");
     output = [{"title":title,"desc":desc,"authors":authors}];
   }
   ```

5. 在测试步骤中，我们应该能够得到以下结果。

   ![代码操作的测试结果](/album/2024/03/zapier/code_action_test.jpg)

#### 在Notion中创建新的图书记录

1. 在Notion中，使用以下字段创建新的数据库：ISBN、标题、作者和描述。
2. 创建一个新步骤。选择Notion并选择`Create Database Item` （创建数据库项目）作为动作。

   ![Notion动作](/album/2024/03/zapier/notion_action.jpg)

3. 通过OAuth连接Notion账户。
4. 打开Notion并将数据库连接到Zapier。

   ![Notion连接](/album/2024/03/zapier/notion_connection.jpg)

5. 在动作部分中，填写图书信息。

   ![Notion动作详细信息](/album/2024/03/zapier/notion_action_details.jpg)

6. 运行测试，我们可以看到一个新项目被插入到Notion数据库中。

   ![Notion数据库](/album/2024/03/zapier/notion_database.jpg)

好了，我们已经完成了将条码扫描集成进Zapier的操作。

## 源代码

欢迎下载这个条码扫描Web应用的源代码并尝试使用：

<https://github.com/tony-xlh/Zapier-Barcode-Reader>

