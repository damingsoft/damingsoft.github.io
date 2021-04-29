---
layout: post
title: 使用C++实现Flutter Windows插件
date:   2021-04-28 09:57:36 +0530
categories: 条形码
---

上周实现的Flutter条形码插件已经发布到[https://pub.dev/packages/flutter_barcode_sdk](https://pub.dev/packages/flutter_barcode_sdk)，平台相关部分只包含了Android的Java代码。这周新增用于Windows的C++代码。后续计划还包含iOS和Web。

![C++开发Flutter Windows插件](/album/2021/flutter-desktop-windows-barcode.gif)


## 关于Dynamsoft C++ Barcode SDK
- 安装包下载：[https://www.dynamsoft.com/barcode-reader/downloads](https://www.dynamsoft.com/barcode-reader/downloads)
- 30天试用序列号：[https://www.dynamsoft.com/customer/license/trialLicense/?product=dbr](https://www.dynamsoft.com/customer/license/trialLicense/?product=dbr)

## 学习资源
Flutter桌面插件开发的资源比较少。可以从以下三个入手：
- [https://flutter.dev/desktop](https://flutter.dev/desktop)
- [https://github.com/google/flutter-desktop-embedding](https://github.com/google/flutter-desktop-embedding)
- [https://github.com/flutter/samples/tree/master/experimental/desktop_photo_search](https://github.com/flutter/samples/tree/master/experimental/desktop_photo_search)
## 如何把C++条形码SDK集成到Flutter Windows插件中
Flutter创建的Windows插件工程目录结构如下：
```
bin
  /DynamsoftBarcodeReaderx64.dll

include

  /flutter_barcode_sdk

    /flutter_barcode_sdk_plugin.h

  /barcode_manager.h

  /DynamsoftBarcodeReader.h

  /DynamsoftCommon.h

lib
  /DBRx64.lib

CMakeLists.txt

flutter_barcode_sdk_plugin.cpp
```

- `CMakeLists.txt`是CMake的配置文件。
- `flutter_barcode_sdk_plugin.cpp`用于实现插件的C++代码逻辑。
- `DynamsoftBarcodeReaderx64.dll`，`DBRx64.lib`，`DynamsoftBarcodeReader.h`，以及`DynamsoftCommon.h`可以从C++ SDK中获取。
- 为了方便，条形码接口调用的实现都放在`barcode_manager.h`中。

从Dart传到C++的接口和参数，会在`HandleMethodCall()`中解析：

```cpp
void FlutterBarcodeSdkPlugin::HandleMethodCall(
      const flutter::MethodCall<flutter::EncodableValue> &method_call,
      std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result)
  {
    const auto *arguments = std::get_if<EncodableMap>(method_call.arguments());

    if (method_call.method_name().compare("getPlatformVersion") == 0)
    {
      
    }
    else if (method_call.method_name().compare("setLicense") == 0)
    {
      
    }
    else if (method_call.method_name().compare("decodeFile") == 0)
    {
      
    }
    else if (method_call.method_name().compare("decodeFileBytes") == 0)
    {
      
    }
    else if (method_call.method_name().compare("decodeImageBuffer") == 0)
    {
      
    }
    else
    {
      result->NotImplemented();
    }
  }

} 
```

获取参数，并转换成C++类型：`string`，`int`，`vector<unsigned char>`：

```cpp
std::string filename;
auto filename_it = arguments->find(EncodableValue("filename"));
if (filename_it != arguments->end())
{
  filename = std::get<std::string>(filename_it->second);
}


std::vector<unsigned char> bytes;
auto bytes_it = arguments->find(EncodableValue("bytes"));
if (bytes_it != arguments->end())
{
  bytes = std::get<vector<unsigned char>>(bytes_it->second);
}

int width = 0;
auto width_it = arguments->find(EncodableValue("width"));
if (width_it != arguments->end())
{
  width = std::get<int>(width_it->second);
}
```

返回的结果需要封装成Flutter定义的类型：

```cpp
EncodableList results;
result->Success(results);
```

接下来在`barcode_manager.h`中实现解码和结果封装。

这里定义三个解码接口：

```cpp
EncodableList DecodeFile(const char * filename) 
{
    EncodableList out;   
    int ret = reader->DecodeFile(filename, "");

    if (ret == DBRERR_FILE_NOT_FOUND)
    {
        printf("Error code %d. %s\n", ret, CBarcodeReader::GetErrorString(ret));
        return out;
    }

    return WrapResults();
}

EncodableList DecodeFileBytes(const unsigned char * bytes, int size) 
{
    reader->DecodeFileInMemory(bytes, size, "");
    return WrapResults();
}

EncodableList DecodeImageBuffer(const unsigned char * buffer, int width, int height, int stride, int format) 
{
    ImagePixelFormat pixelFormat = IPF_BGR_888;
    switch(format) {
        case 0:
            pixelFormat = IPF_GRAYSCALED;
            break;
        case 1:
            pixelFormat = IPF_ARGB_8888;
            break;
    }

    reader->DecodeBuffer(buffer, width, height, stride, pixelFormat, "");

    return WrapResults();
}
```

获取解码结果，并封装到Flutter的`map`和`list`中：

```cpp
EncodableList WrapResults() 
{
    EncodableList out;
    TextResultArray *results = NULL;
    reader->GetAllTextResults(&results);
        
    if (results->resultsCount == 0)
    {
        printf("No barcode found.\n");
        CBarcodeReader::FreeTextResults(&results);
    }
    
    for (int index = 0; index < results->resultsCount; index++)
    {
        EncodableMap map;
        map[EncodableValue("format")] = results->results[index]->barcodeFormatString;
        map[EncodableValue("text")] = results->results[index]->barcodeText;
        map[EncodableValue("x1")] = results->results[index]->localizationResult->x1;
        map[EncodableValue("y1")] = results->results[index]->localizationResult->y1;
        map[EncodableValue("x2")] = results->results[index]->localizationResult->x2;
        map[EncodableValue("y2")] = results->results[index]->localizationResult->y2;
        map[EncodableValue("x3")] = results->results[index]->localizationResult->x3;
        map[EncodableValue("y3")] = results->results[index]->localizationResult->y3;
        map[EncodableValue("x4")] = results->results[index]->localizationResult->x4;
        map[EncodableValue("y4")] = results->results[index]->localizationResult->y4;
        out.push_back(map);
    }

    CBarcodeReader::FreeTextResults(&results);
    return out;
}
```

到此，用于Windows插件的C++代码已经完成。最后一步就是配置`CMakeLists.txt`文件。

链接C++库:

```cmake
link_directories("${PROJECT_SOURCE_DIR}/lib/") 
target_link_libraries(${PLUGIN_NAME} PRIVATE flutter flutter_wrapper_plugin "DBRx64")
```

打包动态链接库：

```cmake
set(flutter_barcode_sdk_bundled_libraries
  "${PROJECT_SOURCE_DIR}/bin/"
  PARENT_SCOPE
)
```

这步很重要。如果没有打包进去，应用程序会因为缺少DLL无法运行。


## 用Flutter实现Windows桌面条码识别程序
有了插件就可以快速实现桌面扫码应用。

创建一个新工程，并在`pubspec.yaml`中添加依赖：

```yaml
dependencies:
  flutter:
    sdk: flutter

  flutter_barcode_sdk:
```

创建SDK对象：

```java
class _DesktopState extends State<Desktop> {
  String _platformVersion = 'Unknown';
  final _controller = TextEditingController();
  String _barcodeResults = '';
  FlutterBarcodeSdk _barcodeReader;
  bool _isValid = false;
  String _file = '';

  @override
  void initState() {
    super.initState();
    initPlatformState();
    initBarcodeSDK();
  }

  Future<void> initBarcodeSDK() async {
    _barcodeReader = FlutterBarcodeSdk();
    // Get 30-day FREEE trial license from https://www.dynamsoft.com/customer/license/trialLicense?product=dbr
    await _barcodeReader.setLicense('LICENSE-KEY');
  }
}
```

使用`TextField`，`Image`，`MaterialButton`和`Text`构建UI：

```java
@override
Widget build(BuildContext context) {
  return MaterialApp(
    home: Scaffold(
        appBar: AppBar(
          title: const Text('Dynamsoft Barcode Reader'),
        ),
        body: Column(children: [
          Container(
            height: 100,
            child: Row(children: <Widget>[
              Text(
                _platformVersion,
                style: TextStyle(fontSize: 14, color: Colors.black),
              )
            ]),
          ),
          TextField(
            controller: _controller,
            decoration: InputDecoration(
              labelText: 'Input an image path',
              errorText: _isValid ? null : 'File not exists',
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  getDefaultImage(),
                  Text(
                    _barcodeResults,
                    style: TextStyle(fontSize: 14, color: Colors.black),
                  ),
                ],
              ),
            ),
          ),
          Container(
            height: 100,
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: <Widget>[
                  MaterialButton(
                      child: Text('Decode Barcode'),
                      textColor: Colors.white,
                      color: Colors.blue,
                      onPressed: () async {
                        if (_controller.text.isEmpty) {
                          setState(() {
                            _isValid = false;
                            _barcodeResults = '';
                            _file = '';
                          });
                          return;
                        }
                        File file = File(_controller.text);
                        if (!file.existsSync()) {
                          setState(() {
                            _isValid = false;
                            _barcodeResults = '';
                            _file = '';
                          });
                          return;
                        } else {
                          setState(() {
                            _isValid = true;
                            _file = _controller.text;
                          });
                        }
                        Uint8List bytes = await file.readAsBytes();
                        List<BarcodeResult> results =
                            await _barcodeReader.decodeFileBytes(bytes);
                        setState(() {
                          _barcodeResults = getBarcodeResults(results);
                        });
                      }),
                ]),
          ),
        ])),
  );
}
```

图片默认显示资源包中的图。如果输入的图片有效，显示输入的图片：

```java
Widget getDefaultImage() {
  if (_controller.text.isEmpty || !_isValid) {
    return Image.asset('images/default.png');
  } else {
    return Image.file(File(_file));
  }
}
```

要使用资源图片，需要在`pubspec.yaml`中添加：

```yaml
flutter:
  assets:
    - images/default.png
```

最后运行程序：

```
flutter run -d windows
```

![Flutter windows 二维码识别](/album/2021/flutter-desktop-barcode-reader.png)


## 源码
[https://github.com/yushulx/flutter_barcode_sdk](https://github.com/yushulx/flutter_barcode_sdk)
