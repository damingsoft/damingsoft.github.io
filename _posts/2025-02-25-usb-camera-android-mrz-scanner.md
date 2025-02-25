---
layout: post
title: "安卓使用USB摄像头识别护照MRZ"
date: 2025-02-25 10:29:53 +0800
categories: 文字识别
tags: 
description: 本文介绍了如何编写一个使用USB摄像头扫描护照MRZ的安卓应用。
---

在[上一篇文章](https://www.dynamsoft.com/codepool/usb-camera-android-barcode-scanner.html)中，我们讨论了如何在安卓设备上使用USB摄像头扫描条形码。在本文中，我们将使用[Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)扫描护照或者身份证上的MRZ（机器可读区域）。

演示视频：

<video src="https://github.com/user-attachments/assets/6b470edb-f582-483f-8986-db0ac16aa147" controls="controls" muted="muted" class="d-block rounded-bottom-2 width-fit" style="max-width:100%;max-height:640px;"></video>

## 新建项目

打开Android Studio，创建一个Java语言的新项目。

## 添加依赖项

1. 添加UVCCamera库。

   1. 下载以下aar，并将其放在`app/libs`文件夹中。

      * [libuvccamera.aar](https://github.com/o0olele/UVCcamera-Opencv/raw/master/app/libs/libuvccamera.aar)
      * [usbCameraCommon.aar](https://github.com/o0olele/UVCcamera-Opencv/raw/master/app/libs/usbCameraCommon.aar)

   2. 在`settings.gradle`中，添加以下行：

      ```groovy
      dependencyResolutionManagement {
          repositories {
              google()
              mavenCentral()
              maven { url 'https://raw.github.com/saki4510t/libcommon/master/repository/' }
              flatDir {
                  dirs 'libs'
              }
          }
      }
      ```


   3. 在应用的`build.gradle`中，添加以下几行：

      ```groovy
      dependencies {
          implementation fileTree(dir: 'libs', include: ['*.aar','*.jar'])
          implementation("com.serenegiant:common:1.5.20") {
              exclude module: 'support-v4'
          }
      }
      ```

   4. 此外可能还需要在`gradle.properties`中启用Jetifier。

      ```
      android.enableJetifier=true
      ```

2. 添加Dynamsoft SDK。

   1. 在`settings.gradle`中，添加以下行：

      ```groovy
      dependencyResolutionManagement {
          repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
          repositories {
              maven {
                  url "https://download2.dynamsoft.com/maven/aar"
              }
          }
      }
      ```

   2. 在应用的`build.gradle`中，添加以下几行：

      ```groovy
      dependencies {
          implementation "com.dynamsoft:dynamsoftcapturevisionbundle:2.6.1002"
          implementation 'com.dynamsoft:dynamsoftmrz:3.4.20'
      }
      ```

## 打开USB摄像头

让我们执行以下操作以打开连接的USB摄像头。

### 添加控件

添加用于预览相机的`UVCCameraTextureView`和用于选择和打开相机的`ImageButton`。

XML：

```xml
<com.serenegiant.widget.UVCCameraTextureView
        android:id="@+id/camera_view"
        android:layout_width="407dp"
        android:layout_height="720dp"
        android:layout_centerInParent="true"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

<ImageButton
    android:id="@+id/imageButton"
    android:layout_width="50dp"
    android:layout_height="50dp"
    android:layout_marginBottom="16dp"
    android:background="@android:color/transparent"
    android:scaleType="fitCenter"
    android:src="@android:drawable/ic_menu_camera"
    app:layout_constraintBottom_toBottomOf="parent"
    app:layout_constraintEnd_toEndOf="parent"
    app:layout_constraintStart_toStartOf="parent" />
```

在MainActivity中：

```java
private CameraViewInterface mUVCCameraView;
private ImageButton mCameraButton;
@Override
protected void onCreate(final Bundle savedInstanceState) {
    //......
    mCameraButton = findViewById(R.id.imageButton);
    final View view = findViewById(R.id.camera_view);
    mUVCCameraView = (CameraViewInterface)view;
}
```

### 监控USB事件


1. 初始化USBMonitor实例。

   ```java
   private USBMonitor mUSBMonitor;
   @Override
   protected void onCreate(Bundle savedInstanceState) {
       //......
       mUSBMonitor = new USBMonitor(this, mOnDeviceConnectListener);
   }

   private final USBMonitor.OnDeviceConnectListener mOnDeviceConnectListener = new USBMonitor.OnDeviceConnectListener() {
       @Override
       public void onAttach(final UsbDevice device) {
           Toast.makeText(MainActivity.this, "USB_DEVICE_ATTACHED", Toast.LENGTH_SHORT).show();
       }

       @Override
       public void onConnect(final UsbDevice device, final USBMonitor.UsbControlBlock ctrlBlock, final boolean createNew) {

       }

       @Override
       public void onDisconnect(final UsbDevice device, final USBMonitor.UsbControlBlock ctrlBlock) {

       }
       @Override
       public void onDettach(final UsbDevice device) {
           Toast.makeText(MainActivity.this, "USB_DEVICE_DETACHED", Toast.LENGTH_SHORT).show();
       }

       @Override
       public void onCancel(final UsbDevice device) {
       }
   };
   ```

2. 管理生命周期。

   ```java
   @Override
   protected void onStart() {
       super.onStart();
       mUSBMonitor.register();
   }

   @Override
   protected void onStop() {
       mUSBMonitor.unregister();
       super.onStop();
   }

   @Override
   public void onDestroy() {
       if (mUSBMonitor != null) {
           mUSBMonitor.destroy();
           mUSBMonitor = null;
       }
       super.onDestroy();
   }
   ```

### 启动摄像头

`UVCCameraHandler`类用于处理USB摄像头。

1. 初始化。

   ```java
   /**
    * set true if you want to record movie using MediaSurfaceEncoder
    * (writing frame data into Surface camera from MediaCodec
    *  by almost same way as USBCameratest2)
    * set false if you want to record movie using MediaVideoEncoder
    */
   private static final boolean USE_SURFACE_ENCODER = false;
   /**
    * preview resolution(width)
    * if your camera does not support specific resolution and mode,
    * {@link UVCCamera#setPreviewSize(int, int, int)} throw exception
    */
   private static final int PREVIEW_WIDTH = 640; // 640
   /**
    * preview resolution(height)
    * if your camera does not support specific resolution and mode,
    * {@link UVCCamera#setPreviewSize(int, int, int)} throw exception
    */
   private static final int PREVIEW_HEIGHT = 480; //480
   /**
    * preview mode
    * if your camera does not support specific resolution and mode,
    * {@link UVCCamera#setPreviewSize(int, int, int)} throw exception
    * 0:YUYV, other:MJPEG
    */
   private static final int PREVIEW_MODE = 0; // YUV
   private UVCCameraHandler mCameraHandler;
    @Override
   protected void onCreate(Bundle savedInstanceState) {
       //......
       mCameraHandler = UVCCameraHandler.createHandler(this, mUVCCameraView,
               USE_SURFACE_ENCODER ? 0 : 1, PREVIEW_WIDTH, PREVIEW_HEIGHT, PREVIEW_MODE);
   }
   ```

2. 为图像按钮添加`OnClickListener`事件以启动摄像头选择对话框。选择摄像头后将开始视频流预览。

   ```java
   protected void onCreate(Bundle savedInstanceState) {
       //......
       mCameraButton.setOnClickListener(mOnClickListener);
       //......
   }

   private final View.OnClickListener mOnClickListener = new View.OnClickListener() {
       @Override
       public void onClick(final View view) {
           if ((mCameraHandler != null) && !mCameraHandler.isOpened()) {
               CameraDialog.showDialog(MainActivity.this);
           } else {
               mCameraHandler.close();
           }
       }
   };

   private final USBMonitor.OnDeviceConnectListener mOnDeviceConnectListener = new USBMonitor.OnDeviceConnectListener() {
       @Override
       public void onConnect(final UsbDevice device, final USBMonitor.UsbControlBlock ctrlBlock, final boolean createNew) {
           if (mCameraHandler != null) {
               mCameraHandler.open(ctrlBlock);
               startPreview();
           }
       }
   }

   private void startPreview() {
       if (mCameraHandler != null) {
           final SurfaceTexture st = mUVCCameraView.getSurfaceTexture();
           mCameraHandler.startPreview(new Surface(st));
       }
   }
   ```

   还需要修改Activity以实现UVCCamera库的`CameraDialogParent`接口：

   ```java
   public class MainActivity extends BaseActivity implements CameraDialog.CameraDialogParent
   ```

   预览填充屏幕时画面会变形。可以使用以下代码保持其纵横比：

   ```java
   mUVCCameraView.setAspectRatio(PREVIEW_WIDTH / (double)PREVIEW_HEIGHT);
   ```

## 从USB摄像头预览读取MRZ

现在我们可以显示摄像头预览了，接着使用Dynamsoft Label Recognizer识别MRZ。

### 初始化SDK

使用许可证初始化SDK。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请一个30天试用许可证。

```java
private CaptureVisionRouter mRouter; //used to call Dynamsoft Label Recognizer to recognize MRZ
private CodeParser mParser; //used to parse the recognized MRZ
protected void onCreate(Bundle savedInstanceState) {
    //......
    if (savedInstanceState == null) {
        LicenseManager.initLicense("LICENSE-KEY", this, (isSuccess, error) -> {
            if (!isSuccess) {
                error.printStackTrace();
            }
        });
    }
    mRouter = new CaptureVisionRouter(this);
    mParser = new CodeParser(this);
}
```

### 更新设置以识别MRZ。

我们需要使用以下JSON模板更新默认设置以支持识别MRZ。

```java
private void initMRZSettings(){
    String template = """
      {
          "CaptureVisionTemplates": [
              {
                  "Name": "Default"
              },
              {
                  "Name": "ReadBarcodes_Default",
                  "ImageROIProcessingNameArray": [
                      "roi_read_barcodes"
                  ],
                  "Timeout": 200,
                  "MaxParallelTasks":0
              },
              {
                  "Name": "RecognizeTextLines_Default",
                  "ImageROIProcessingNameArray": [
                      "roi_recognize_number_letter"
                  ],
                  "MaxParallelTasks":0
              },
              {
                  "Name": "DetectDocumentBoundaries_Default",
                  "ImageROIProcessingNameArray": [
                      "roi_detect_document_boundaries"
                  ]
              },
              {
                  "Name": "DetectAndNormalizeDocument_Default",
                  "ImageROIProcessingNameArray": [
                      "roi_detect_and_normalize_document"
                  ]
              },
              {
                  "Name": "NormalizeDocument_Default",
                  "ImageROIProcessingNameArray": [
                      "roi_normalize_document"
                  ]
              },
              {
                  "Name": "ReadBarcodes_SpeedFirst",
                  "ImageROIProcessingNameArray": [
                      "roi_read_barcodes_speed_first"
                  ],
                  "Timeout": 500
              },
              {
                  "Name": "ReadBarcodes_ReadRateFirst",
                  "ImageROIProcessingNameArray": [
                      "roi_read_barcodes_read_rate"
                  ],
                  "Timeout": 5000
              },
              {
                  "Name": "ReadSingleBarcode",
                  "ImageROIProcessingNameArray": [
                      "roi_read_single_barcode"
                  ],
                  "Timeout": 200,
                  "MaxParallelTasks":0
              },
              {
                  "Name": "RecognizeNumbers",
                  "ImageROIProcessingNameArray": [
                      "roi_recognize_number"
                  ],
                  "MaxParallelTasks":0
              },
              {
                  "Name": "RecognizeLetters",
                  "ImageROIProcessingNameArray": [
                      "roi_recognize_letter"
                  ],
                  "MaxParallelTasks":0
              },
              {
                  "Name": "RecognizeUppercaseLetters",
                  "ImageROIProcessingNameArray": [
                      "roi_recognize_uppercase"
                  ],
                  "MaxParallelTasks":0
              },
              {
                  "Name": "RecognizeNumbersAndUppercaseLetters",
                  "ImageROIProcessingNameArray": [
                      "roi_recognize_number_uppercase"
                  ],
                  "MaxParallelTasks":0
              },
              {
                  "Name": "RecognizeNumbersAndLetters",
                  "ImageROIProcessingNameArray": [
                      "roi_recognize_number_letter"
                  ],
                  "MaxParallelTasks":0
              },
              {
                  "Name": "ReadPassportAndId",
                  "OutputOriginalImage": 0,
                  "ImageROIProcessingNameArray": [
                        "roi_passport_and_id"
                  ],
                  "Timeout": 2000
              },
              {
                  "Name": "ReadPassport",
                  "OutputOriginalImage": 0,
                  "ImageROIProcessingNameArray": [
                        "roi_passport"
                  ],
                  "Timeout": 2000
              },
              {
                  "Name": "ReadId",
                  "OutputOriginalImage": 0,
                  "ImageROIProcessingNameArray": [
                        "roi_id"
                  ],
                  "Timeout": 2000
              },
              {
                  "Name" : "ReadDriversLicense",
                  "ImageROIProcessingNameArray" :
                  [
                      "roi_pdf_417"
                  ],
                  "SemanticProcessingNameArray": [ "sp_pdf_417" ],
                  "Timeout" : 10000
              },
              {
                  "Name": "ReadVIN",
                  "ImageROIProcessingNameArray": [
                      "roi_vin_barcode",
                      "roi_vin_text"
                  ],
                  "MaxParallelTasks": 4,
                  "SemanticProcessingNameArray": [
                      "sp_vin_barcode",
                      "sp_vin_text"
                  ],
                  "Timeout": 10000
              },
              {
                  "Name" : "ReadVINBarcode",
                  "ImageROIProcessingNameArray" :
                  [
                      "roi_vin_barcode"
                  ],
                  "MaxParallelTasks" : 4,
                  "SemanticProcessingNameArray": [ "sp_vin_barcode" ],
                  "Timeout" : 10000
              },
              {
                  "Name" : "ReadVINText",
                  "ImageROIProcessingNameArray" :
                  [
                      "roi_vin_text"
                  ],
                  "MaxParallelTasks" : 4,
                  "SemanticProcessingNameArray": [ "sp_vin_text" ],
                  "Timeout" : 10000
              }
          ],
          "TargetROIDefOptions": [
              {
                  "Name": "roi_read_barcodes",
                  "TaskSettingNameArray": [
                      "task_read_barcodes"
                  ]
              },
              {
                  "Name": "roi_detect_document_boundaries",
                  "TaskSettingNameArray": [
                      "task_detect_document_boundaries"
                  ]
              },
              {
                  "Name": "roi_detect_and_normalize_document",
                  "TaskSettingNameArray": [
                      "task_detect_and_normalize_document"
                  ]
              },
              {
                  "Name": "roi_normalize_document",
                  "TaskSettingNameArray": [
                      "task_normalize_document"
                  ]
              },
              {
                  "Name": "roi_read_barcodes_speed_first",
                  "TaskSettingNameArray": [
                      "task_read_barcodes_speed_first"
                  ]
              },
              {
                  "Name": "roi_read_barcodes_read_rate",
                  "TaskSettingNameArray": [
                      "task_read_barcodes_read_rate"
                  ]
              },
              {
                  "Name": "roi_read_single_barcode",
                  "TaskSettingNameArray": [
                      "task_read_single_barcode"
                  ]
              },
              {
                  "Name": "roi_recognize_number",
                  "TaskSettingNameArray": [
                      "task_recognize_number"
                  ]
              },
              {
                  "Name": "roi_recognize_letter",
                  "TaskSettingNameArray": [
                      "task_recognize_letter"
                  ]
              },
              {
                  "Name": "roi_recognize_uppercase",
                  "TaskSettingNameArray": [
                      "task_recognize_uppercase"
                  ]
              },
              {
                  "Name": "roi_recognize_number_uppercase",
                  "TaskSettingNameArray": [
                      "task_recognize_number_uppercase"
                  ]
              },
              {
                  "Name": "roi_recognize_number_letter",
                  "TaskSettingNameArray": [
                      "task_recognize_number_letter"
                  ]
              },
              {
                  "Name": "roi_passport_and_id",
                  "TaskSettingNameArray": [
                        "task_passport_and_id"
                  ]
              },
              {
                  "Name": "roi_passport",
                  "TaskSettingNameArray": [
                        "task_passport"
                  ]
              },
              {
                  "Name": "roi_id",
                  "TaskSettingNameArray": [
                      "task_id"
                  ]
              },
              {
                  "Name" : "roi_pdf_417",
                  "TaskSettingNameArray" :
                  [
                      "task_pdf_417"
                  ]
              },
              {
                  "Name" : "roi_vin_barcode",
                  "TaskSettingNameArray" :
                  [
                      "task_vin_barcode"
                  ]
              },
              {
                  "Name" : "roi_vin_text",
                  "TaskSettingNameArray" :
                  [
                      "task_vin_text"
                  ]
              }
          ],
          "BarcodeFormatSpecificationOptions": [
              {
                  "Name": "bfs1",
                  "BarcodeFormatIds": [
                      "BF_PDF417",
                      "BF_QR_CODE",
                      "BF_DATAMATRIX",
                      "BF_AZTEC",
                      "BF_MICRO_QR",
                      "BF_MICRO_PDF417",
                      "BF_DOTCODE"
                  ],
                  "MirrorMode": "MM_BOTH"
              },
              {
                  "Name": "bfs2",
                  "BarcodeFormatIds": [
                      "BF_ALL"
                  ],
                  "MirrorMode": "MM_NORMAL"
              },
              {
                  "Name": "bfs1_speed_first",
                  "BaseBarcodeFormatSpecification": "bfs1"
              },
              {
                  "Name": "bfs2_speed_first",
                  "BaseBarcodeFormatSpecification": "bfs2"
              },
              {
                  "Name": "bfs1_read_rate_first",
                  "BaseBarcodeFormatSpecification": "bfs1"
              },
              {
                  "Name": "bfs2_read_rate_first",
                  "BaseBarcodeFormatSpecification": "bfs2"
              },
              {
                  "Name": "bfs1_single_barcode",
                  "BaseBarcodeFormatSpecification": "bfs1"
              },
              {
                  "Name": "bfs2_single_barcode",
                  "BaseBarcodeFormatSpecification": "bfs2"
              },
              {
                  "BarcodeFormatIds" :
                  [
                      "BF_CODE_39_EXTENDED"
                  ],
                  "BarcodeTextRegExPattern" : "(I{0,1})([0-9A-HJ-NPR-Z]{9}[1-9A-HJ-NPR-TV-Y][0-9A-HJ-NPR-Z]{2}[0-9]{5})",
                  "MirrorMode" : "MM_NORMAL",
                  "ModuleSizeRangeArray" : null,
                  "Name" : "VIN_CODE_39_EXTENDED"
              },
              {
                  "BarcodeFormatIds" :
                  [
                      "BF_DATAMATRIX"
                  ],
                  "BarcodeTextRegExPattern" : "[0-9A-HJ-NPR-Z]{9}[1-9A-HJ-NPR-TV-Y][0-9A-HJ-NPR-Z]{2}[0-9]{5}",
                  "Name" : "VIN_DATAMATRIX"

              },
              {
                  "BarcodeFormatIds" :
                  [
                      "BF_QR_CODE"
                  ],
                  "Name" : "VIN_QR_CODE"
              }
          ],
          "BarcodeReaderTaskSettingOptions": [
              {
                  "Name": "task_read_barcodes",
                  "ExpectedBarcodesCount" : 1,
                  "BaseBarcodeReaderTaskSettingName": "task_read_single_barcode",
                  "BarcodeFormatSpecificationNameArray": [
                      "bfs1",
                      "bfs2"
                  ],
                  "LocalizationModes": [
                      {
                          "Mode": "LM_CONNECTED_BLOCKS"
                      },
                      {
                          "Mode": "LM_LINES"
                      }
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_read_barcodes"
                      },
                      {
                          "Section": "ST_BARCODE_LOCALIZATION",
                          "ImageParameterName": "ip_read_barcodes"
                      },
                      {
                          "Section": "ST_BARCODE_DECODING",
                          "ImageParameterName": "ip_read_barcodes"
                      }
                  ]
              },
              {
                  "Name": "task_read_barcodes_speed_first",
                  "ExpectedBarcodesCount" : 0,
                  "BarcodeFormatIds" : [ "BF_DEFAULT" ],
                  "LocalizationModes": [
                      {
                          "Mode": "LM_CONNECTED_BLOCKS"
                      }
                  ],
                  "DeblurModes":[
                      {
                          "Mode": "DM_BASED_ON_LOC_BIN"
                      },
                      {
                          "Mode": "DM_THRESHOLD_BINARIZATION"
                      },
                      {
                          "Mode": "DM_DEEP_ANALYSIS"
                      }
                  ],
                  "BarcodeFormatSpecificationNameArray": [
                      "bfs1_speed_first",
                      "bfs2_speed_first"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_read_barcodes_speed_first"
                      },
                      {
                          "Section": "ST_BARCODE_LOCALIZATION",
                          "ImageParameterName": "ip_read_barcodes_speed_first"
                      },
                      {
                          "Section": "ST_BARCODE_DECODING",
                          "ImageParameterName": "ip_read_barcodes_speed_first"
                      }
                  ]
              },
              {
                  "Name": "task_read_barcodes_read_rate",
                  "ExpectedBarcodesCount" : 999,
                  "BarcodeFormatIds" : [ "BF_DEFAULT" ],
                  "LocalizationModes": [
                      {
                          "Mode" : "LM_CONNECTED_BLOCKS"
                       },
                       {
                          "Mode" : "LM_LINES"
                       },
                       {
                          "Mode" : "LM_STATISTICS"
                       }
                  ],
                  "DeblurModes":[
                      {
                          "Mode": "DM_BASED_ON_LOC_BIN"
                      },
                      {
                          "Mode": "DM_THRESHOLD_BINARIZATION"
                      },
                      {
                          "Mode": "DM_DIRECT_BINARIZATION"
                      },
                      {
                          "Mode": "DM_SMOOTHING"
                      },
                      {
                          "Mode": "DM_DEEP_ANALYSIS"
                      }
                  ],
                  "BarcodeFormatSpecificationNameArray": [
                      "bfs1_read_rate_first",
                      "bfs2_read_rate_first"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_read_barcodes_read_rate"
                      },
                      {
                          "Section": "ST_BARCODE_LOCALIZATION",
                          "ImageParameterName": "ip_read_barcodes_read_rate"
                      },
                      {
                          "Section": "ST_BARCODE_DECODING",
                          "ImageParameterName": "ip_read_barcodes_read_rate"
                      }
                  ]
              },
              {
                  "Name": "task_read_single_barcode",
                  "ExpectedBarcodesCount":1,
                  "LocalizationModes": [
                      {
                          "Mode": "LM_SCAN_DIRECTLY",
                          "ScanDirection": 2
                      },
                      {
                          "Mode": "LM_CONNECTED_BLOCKS"
                      }
                  ],
                  "DeblurModes":[
                      {
                          "Mode": "DM_BASED_ON_LOC_BIN"
                      },
                      {
                          "Mode": "DM_THRESHOLD_BINARIZATION"
                      },
                      {
                          "Mode": "DM_DEEP_ANALYSIS"
                      }
                  ],
                  "BarcodeFormatSpecificationNameArray": [
                      "bfs1_single_barcode",
                      "bfs2_single_barcode"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_read_single_barcode"
                      },
                      {
                          "Section": "ST_BARCODE_LOCALIZATION",
                          "ImageParameterName": "ip_read_single_barcode"
                      },
                      {
                          "Section": "ST_BARCODE_DECODING",
                          "ImageParameterName": "ip_read_single_barcode"
                      }
                  ]
              },
              {
                  "Name" : "task_pdf_417",
                  "BarcodeColourModes" :
                  [
                      {
                          "LightReflection" : 1,
                          "Mode" : "BICM_DARK_ON_LIGHT"
                      }
                  ],
                  "BarcodeFormatIds" :
                  [
                      "BF_PDF417"
                  ],
                  "DeblurModes" : null,
                  "ExpectedBarcodesCount" : 1,
                  "LocalizationModes" :
                  [
                      {
                          "Mode" : "LM_CONNECTED_BLOCKS"
                      },
                      {
                          "Mode" : "LM_LINES"
                      },
                      {
                          "Mode" : "LM_STATISTICS"
                      }
                  ],
                  "SectionImageParameterArray" :
                  [
                      {
                          "ContinueWhenPartialResultsGenerated" : 1,
                          "ImageParameterName" : "ip_localize_pdf417",
                          "Section" : "ST_REGION_PREDETECTION"
                      },
                      {
                          "ContinueWhenPartialResultsGenerated" : 1,
                          "ImageParameterName" : "ip_localize_pdf417",
                          "Section" : "ST_BARCODE_LOCALIZATION"
                      },
                      {
                          "ContinueWhenPartialResultsGenerated" : 1,
                          "ImageParameterName" : "ip_decode_pdf417",
                          "Section" : "ST_BARCODE_DECODING"
                      }
                  ]
              },
              {
                  "Name" : "task_vin_barcode",
                  "DeblurModes" : null,
                  "BarcodeColourModes" :
                  [
                      {
                          "LightReflection" : 1,
                          "Mode" : "BICM_DARK_ON_LIGHT"
                      }
                  ],
                  "BarcodeFormatIds" :
                  [
                      "BF_CODE_39_EXTENDED",
                      "BF_QR_CODE",
                      "BF_DATAMATRIX"
                  ],
                  "BarcodeFormatSpecificationNameArray" :
                  [
                      "VIN_CODE_39_EXTENDED",
                      "VIN_QR_CODE",
                      "VIN_DATAMATRIX"
                  ],
                  "DeformationResistingModes" :
                  [
                      {
                          "BinarizationMode" :
                          {
                              "BinarizationThreshold" : -1,
                              "BlockSizeX" : 0,
                              "BlockSizeY" : 0,
                              "EnableFillBinaryVacancy" : 0,
                              "GrayscaleEnhancementModesIndex" : -1,
                              "Mode" : "BM_LOCAL_BLOCK",
                              "MorphOperation" : "Close",
                              "MorphOperationKernelSizeX" : -1,
                              "MorphOperationKernelSizeY" : -1,
                              "MorphShape" : "Rectangle",
                              "ThresholdCompensation" : 10
                          },
                          "GrayscaleEnhancementMode" :
                          {
                              "Mode" : "GEM_GENERAL",
                              "Sensitivity" : -1,
                              "SharpenBlockSizeX" : -1,
                              "SharpenBlockSizeY" : -1,
                              "SmoothBlockSizeX" : -1,
                              "SmoothBlockSizeY" : -1
                          },
                          "Level" : 5,
                          "Mode" : "DRM_SKIP"
                      }
                  ],
                  "ExpectedBarcodesCount" : 1,
                  "LocalizationModes" :
                  [
                      {
                          "Mode" : "LM_CONNECTED_BLOCKS"
                      },
                      {
                          "Mode" : "LM_SCAN_DIRECTLY"
                      }
                  ],
                  "SectionImageParameterArray" :
                  [
                      {
                          "ContinueWhenPartialResultsGenerated" : 1,
                          "ImageParameterName" : "ip_localize_vin",
                          "Section" : "ST_REGION_PREDETECTION"
                      },
                      {
                          "ContinueWhenPartialResultsGenerated" : 1,
                          "ImageParameterName" : "ip_localize_vin",
                          "Section" : "ST_BARCODE_LOCALIZATION"
                      },
                      {
                          "ContinueWhenPartialResultsGenerated" : 1,
                          "ImageParameterName" : "ip_decode_vin",
                          "Section" : "ST_BARCODE_DECODING"
                      }
                  ]
              }
          ],
          "TextLineSpecificationOptions": [
              {
                  "Name": "tls_number_letter",
                  "CharacterModelName" : "NumberLetter",
                  "OutputResults": 1
              },
              {
                  "Name": "tls_number",
                  "CharacterModelName" : "Number",
                  "OutputResults": 1
              },
              {
                  "Name": "tls_letter",
                  "CharacterModelName" : "Letter",
                  "OutputResults": 1
              },
              {
                  "Name": "tls_uppercase",
                  "CharacterModelName" : "Uppercase",
                  "OutputResults": 1
              },
              {
                  "Name": "tls_number_uppercase",
                  "CharacterModelName" : "NumberUppercase",
                  "OutputResults": 1
              },
              {
                  "Name": "tls_mrz_passport",
                  "BaseTextLineSpecificationName": "tls_base",
                  "StringLengthRange": [ 44, 44 ],
                  "OutputResults": 1,
                  "ExpectedGroupsCount": 1,
                  "ConcatResults": 1,
                  "ConcatSeparator": "\\n",
                  "SubGroups": [
                    {
                      "StringRegExPattern": "(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}",
                      "StringLengthRange": [ 44, 44 ],
                      "BaseTextLineSpecificationName": "tls_base"
                    },
                    {
                      "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[0-9<][0-9]){(44)}",
                      "StringLengthRange": [ 44, 44 ],
                      "BaseTextLineSpecificationName": "tls_base"
                    }
                  ]
              },
              {
                  "Name": "tls_mrz_id_td2",
                  "BaseTextLineSpecificationName": "tls_base",
                  "StringLengthRange": [ 36, 36 ],
                  "OutputResults": 1,
                  "ExpectedGroupsCount": 1,
                  "ConcatResults": 1,
                  "ConcatSeparator": "\\n",
                  "SubGroups": [
                      {
                          "StringRegExPattern": "([ACI][A-Z<][A-Z<]{3}[A-Z<]{31}){(36)}",
                          "StringLengthRange": [ 36, 36 ],
                          "BaseTextLineSpecificationName": "tls_base"
                      },
                      {
                          "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}",
                          "StringLengthRange": [ 36, 36 ],
                          "BaseTextLineSpecificationName": "tls_base"
                      }
                  ]
              },
              {
                  "Name": "tls_mrz_id_td1",
                  "BaseTextLineSpecificationName": "tls_base",
                  "StringLengthRange": [ 30, 30 ],
                  "OutputResults": 1,
                  "ExpectedGroupsCount": 1,
                  "ConcatResults": 1,
                  "ConcatSeparator": "\\n",
                  "SubGroups": [
                      {
                          "StringRegExPattern": "([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9<][A-Z0-9<]{15}){(30)}",
                          "StringLengthRange": [ 30, 30 ],
                          "BaseTextLineSpecificationName": "tls_base"
                      },
                      {
                          "StringRegExPattern": "([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}",
                          "StringLengthRange": [ 30, 30 ],
                          "BaseTextLineSpecificationName": "tls_base"
                      },
                      {
                          "StringRegExPattern": "([A-Z<]{30}){(30)}",
                          "StringLengthRange": [ 30, 30 ],
                          "BaseTextLineSpecificationName": "tls_base"
                      }
                  ]
              },
              {
                  "Name": "tls_base",
                  "CharacterModelName": "MRZ",
                  "CharHeightRange": [ 5, 1000, 1 ],
                  "BinarizationModes": [
                      {
                          "BlockSizeX": 30,
                          "BlockSizeY": 30,
                          "Mode": "BM_LOCAL_BLOCK",
                          "EnableFillBinaryVacancy": 0,
                          "ThresholdCompensation": 15
                      }
                  ],
                  "ConfusableCharactersCorrection": {
                      "ConfusableCharacters": [
                          [ "0", "O" ],
                          [ "1", "I" ],
                          [ "5", "S" ]
                      ],
                      "FontNameArray": [ "OCR_B" ]
                  }
              },
              {
                  "Name": "tls_vin_text",
                  "CharacterModelName": "VIN",
                  "StringRegExPattern": "[0-9A-HJ-NPR-Z]{9}[1-9A-HJ-NPR-TV-Y][0-9A-HJ-NPR-Z]{2}[0-9]{5}",
                  "CharHeightRange": [5, 1000, 1],
                  "StringLengthRange": [17, 17]
              }
          ],
          "LabelRecognizerTaskSettingOptions": [
              {
                  "Name": "task_recognize_number_letter",
                  "TextLineSpecificationNameArray": [
                      "tls_number_letter"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_recognize_number_letter"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_recognize_number_letter"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_recognize_number_letter"
                      }
                  ]
              },
              {
                  "Name": "task_recognize_number",
                  "TextLineSpecificationNameArray": [
                      "tls_number"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_recognize_textline_number"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_recognize_textline_number"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_recognize_textline_number"
                      }
                  ]
              },
              {
                  "Name": "task_recognize_letter",
                  "TextLineSpecificationNameArray": [
                      "tls_letter"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_recognize_letter"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_recognize_letter"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_recognize_letter"
                      }
                  ]
              },
              {
                  "Name": "task_recognize_uppercase",
                  "TextLineSpecificationNameArray": [
                      "tls_uppercase"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_recognize_uppercase"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_recognize_uppercase"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_recognize_uppercase"
                      }
                  ]
              },
              {
                  "Name": "task_recognize_number_uppercase",
                  "TextLineSpecificationNameArray": [
                      "tls_number_uppercase"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_recognize_number_uppercase"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_recognize_number_uppercase"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_recognize_number_uppercase"
                      }
                  ]
              },
              {
                  "Name": "task_passport",
                  "ConfusableCharactersPath": "ConfusableChars.data",
                  "TextLineSpecificationNameArray": ["tls_mrz_passport"],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_mrz"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_mrz"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_mrz"
                      }
                  ]
              },
              {
                  "Name": "task_id",
                  "ConfusableCharactersPath": "ConfusableChars.data",
                  "TextLineSpecificationNameArray": ["tls_mrz_id_td1", "tls_mrz_id_td2"],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_mrz"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_mrz"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_mrz"
                      }
                  ]
              },
              {
                  "Name": "task_passport_and_id",
                  "ConfusableCharactersPath": "ConfusableChars.data",
                  "TextLineSpecificationNameArray": ["tls_mrz_passport", "tls_mrz_id_td1", "tls_mrz_id_td2"],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_mrz"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_mrz"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_mrz"
                      }
                  ]
              },
              {
                  "Name": "task_vin_text",
                  "TextLineSpecificationNameArray": [
                      "tls_vin_text"
                  ],
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_recognize_vin"
                      },
                      {
                          "Section": "ST_TEXT_LINE_LOCALIZATION",
                          "ImageParameterName": "ip_recognize_vin"
                      },
                      {
                          "Section": "ST_TEXT_LINE_RECOGNITION",
                          "ImageParameterName": "ip_recognize_vin"
                      }
                  ]
              }
          ],
          "DocumentNormalizerTaskSettingOptions": [
              {
                  "Name": "task_detect_and_normalize_document",
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_detect_and_normalize"
                      },
                      {
                          "Section": "ST_DOCUMENT_DETECTION",
                          "ImageParameterName": "ip_detect_and_normalize"
                      },
                      {
                          "Section": "ST_DOCUMENT_NORMALIZATION",
                          "ImageParameterName": "ip_detect_and_normalize"
                      }
                  ]
              },
              {
                  "Name": "task_detect_document_boundaries",
                  "TerminateSetting": {
                      "Section": "ST_DOCUMENT_DETECTION"
                  },
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_detect"
                      },
                      {
                          "Section": "ST_DOCUMENT_DETECTION",
                          "ImageParameterName": "ip_detect"
                      },
                      {
                          "Section": "ST_DOCUMENT_NORMALIZATION",
                          "ImageParameterName": "ip_detect"
                      }
                  ]
              },
              {
                  "Name": "task_normalize_document",
                  "StartSection": "ST_DOCUMENT_NORMALIZATION",
                  "SectionImageParameterArray": [
                      {
                          "Section": "ST_REGION_PREDETECTION",
                          "ImageParameterName": "ip_normalize"
                      },
                      {
                          "Section": "ST_DOCUMENT_DETECTION",
                          "ImageParameterName": "ip_normalize"
                      },
                      {
                          "Section": "ST_DOCUMENT_NORMALIZATION",
                          "ImageParameterName": "ip_normalize"
                      }
                  ]
              }
          ],
          "ImageParameterOptions": [
              {
                  "Name": "ip_read_barcodes",
                  "BaseImageParameterName": "ip_read_single_barcode"
              },
              {
                  "Name" : "ip_localize_pdf417",
                  "BinarizationModes" :
                  [
                      {
                          "Mode" : "BM_LOCAL_BLOCK"
                      }
                  ],
                  "GrayscaleEnhancementModes" :
                  [
                      {
                          "Mode" : "GEM_GENERAL"
                      }
                  ]
              },
              {
                  "Name" : "ip_decode_pdf417",
                  "ScaleDownThreshold" : 99999
              },
              {
                  "Name": "ip_read_barcodes_speed_first",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "UNKNOWN",
                      "Sensitivity": 3
                  },
                  "IfEraseTextZone": 1,
                  "BinarizationModes": [
                      {
                          "Mode": "BM_LOCAL_BLOCK",
                          "BlockSizeX": 0,
                          "BlockSizeY": 0,
                          "EnableFillBinaryVacancy": 0
                      }
                  ]
              },
              {
                  "Name": "ip_read_barcodes_read_rate",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "UNKNOWN",
                      "Sensitivity": 3
                  },
                  "IfEraseTextZone": 1,
                  "GrayscaleTransformationModes" : [
                      {
                          "Mode": "GTM_ORIGINAL"
                      },
                      {
                          "Mode": "GTM_INVERTED"
                      }
                  ],
                  "ScaleDownThreshold" : 100000
              },
              {
                  "Name": "ip_read_single_barcode",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "UNKNOWN",
                      "Sensitivity": 3
                  },
                  "IfEraseTextZone": 1,
                  "BinarizationModes": [
                      {
                          "Mode": "BM_LOCAL_BLOCK",
                          "BlockSizeX": 39,
                          "BlockSizeY": 39,
                          "EnableFillBinaryVacancy": 0
                      }
                  ]
              },
              {
                  "Name": "ip_recognize_number_letter",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "HORIZONTAL",
                      "CharHeightRange": [
                          20,
                          1000,
                          1
                      ],
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_recognize_textline_number",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "HORIZONTAL",
                      "CharHeightRange": [
                          20,
                          1000,
                          1
                      ],
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_recognize_letter",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "HORIZONTAL",
                      "CharHeightRange": [
                          20,
                          1000,
                          1
                      ],
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_recognize_uppercase",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "HORIZONTAL",
                      "CharHeightRange": [
                          20,
                          1000,
                          1
                      ],
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_recognize_number_uppercase",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "HORIZONTAL",
                      "CharHeightRange": [
                          20,
                          1000,
                          1
                      ],
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_detect_and_normalize",
                  "BinarizationModes": [
                      {
                          "Mode": "BM_LOCAL_BLOCK",
                          "BlockSizeX": 0,
                          "BlockSizeY": 0,
                          "EnableFillBinaryVacancy": 0
                      }
                  ],
                  "TextDetectionMode": {
                      "Mode": "TTDM_WORD",
                      "Direction": "HORIZONTAL",
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_detect",
                  "BinarizationModes": [
                      {
                          "Mode": "BM_LOCAL_BLOCK",
                          "BlockSizeX": 0,
                          "BlockSizeY": 0,
                          "EnableFillBinaryVacancy": 0
                      }
                  ],
                  "TextDetectionMode": {
                      "Mode": "TTDM_WORD",
                      "Direction": "HORIZONTAL",
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_normalize",
                  "BinarizationModes": [
                      {
                          "Mode": "BM_LOCAL_BLOCK",
                          "BlockSizeX": 0,
                          "BlockSizeY": 0,
                          "EnableFillBinaryVacancy": 0
                      }
                  ],
                  "TextDetectionMode": {
                      "Mode": "TTDM_WORD",
                      "Direction": "HORIZONTAL",
                      "Sensitivity": 7
                  }
              },
              {
                  "Name": "ip_mrz",
                  "TextureDetectionModes": [
                      {
                          "Mode": "TDM_GENERAL_WIDTH_CONCENTRATION",
                          "Sensitivity": 8
                      }
                  ],
                  "BinarizationModes": [
                      {
                          "EnableFillBinaryVacancy": 0,
                          "ThresholdCompensation": 21,
                          "Mode": "BM_LOCAL_BLOCK"
                      }
                  ],
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "CharHeightRange": [ 5, 1000, 1 ],
                      "Direction": "HORIZONTAL",
                      "Sensitivity": 7
                  }
              },
              {
                  "Name" : "ip_localize_vin",
                  "BinarizationModes" :
                  [
                      {
                          "Mode" : "BM_LOCAL_BLOCK",
                          "MorphOperation" : "Erode"
                      }
                  ],
                  "GrayscaleEnhancementModes" :
                  [
                      {
                          "Mode" : "GEM_GENERAL",
                          "Sensitivity" : 5,
                          "SharpenBlockSizeX" : 3,
                          "SharpenBlockSizeY" : 3,
                          "SmoothBlockSizeX" : 3,
                          "SmoothBlockSizeY" : 3
                      }
                  ],
                  "GrayscaleTransformationModes" :
                  [
                      {
                          "Mode" : "GTM_ORIGINAL"
                      },
                      {
                          "Mode" : "GTM_INVERTED"
                      }
                  ]
              },
              {
                  "Name" : "ip_decode_vin",
                  "GrayscaleTransformationModes" :
                  [
                      {
                          "Mode" : "GTM_ORIGINAL"
                      }
                  ],
                  "ScaleDownThreshold" : 99999
              },
              {
                  "Name": "ip_recognize_vin",
                  "TextDetectionMode": {
                      "Mode": "TTDM_LINE",
                      "Direction": "HORIZONTAL",
                      "CharHeightRange": [
                          5,
                          1000,
                          1
                      ],
                      "Sensitivity": 7
                  },
                  "GrayscaleTransformationModes": [
                      {
                          "Mode": "GTM_ORIGINAL"
                      },
                      {
                          "Mode": "GTM_INVERTED"
                      }
                  ],
                  "BinarizationModes" :
                  [
                      {
                          "EnableFillBinaryVacancy" : 1,
                          "Mode" : "BM_LOCAL_BLOCK"
                      }
                  ]
              }
             \s
          ],
          "CharacterModelOptions": [
              {
                  "Name" : "Number"
              },
              {
                  "Name" : "Letter"
              },
              {
                  "Name" : "Uppercase"
              },
              {
                  "Name" : "NumberUppercase"
              },
              {
                  "Name" : "NumberLetter"
              },
              {
                  "Name": "MRZ"
              },
              {
                  "Name": "VIN"
              }
          ],
          "SemanticProcessingOptions": [
              {
                  "Name": "sp_passport_and_id",
                  "ReferenceObjectFilter": {
                      "ReferenceTargetROIDefNameArray": [
                      "roi_passport_and_id"
                      ]
                  },
                  "TaskSettingNameArray": [
                      "parse_passport_and_id"
                  ]
              },
              {
                  "Name": "sp_passport",
                  "ReferenceObjectFilter": {
                      "ReferenceTargetROIDefNameArray": [
                      "roi_passport"
                      ]
                  },
                  "TaskSettingNameArray": [
                      "parse_passport"
                  ]
              },
              {
                  "Name": "sp_id",
                  "ReferenceObjectFilter": {
                      "ReferenceTargetROIDefNameArray": [
                      "roi_id"
                      ]
                  },
                  "TaskSettingNameArray": [
                      "parse_id"
                  ]
              },
              {
                  "Name": "sp_pdf_417",
                  "ReferenceObjectFilter": {
                      "ReferenceTargetROIDefNameArray": [
                              "roi_pdf_417"
                      ]
                  },
                  "TaskSettingNameArray": [
                      "parse_pdf_417"
                  ]
              },
              {
                  "Name": "sp_vin_barcode",
                  "ReferenceObjectFilter": {
                      "ReferenceTargetROIDefNameArray": [
                              "roi_vin_barcode"
                      ]
                  },
                  "TaskSettingNameArray": [
                      "parse_vin_barcode"
                  ]
              },
              {
                  "Name": "sp_vin_text",
                  "ReferenceObjectFilter": {
                      "ReferenceTargetROIDefNameArray": [
                          "roi_vin_text"
                      ]
                  },
                  "TaskSettingNameArray": [
                      "parse_vin_text"
                  ]
              }
          ],
          "CodeParserTaskSettingOptions": [
              {
                  "Name": "parse_passport",
                  "CodeSpecifications": [ "MRTD_TD3_PASSPORT" ]
              },
              {
                  "Name": "parse_id",
                  "CodeSpecifications": [ "MRTD_TD1_ID", "MRTD_TD2_ID" ]
              },
              {
                  "Name": "parse_passport_and_id",
                  "CodeSpecifications": [ "MRTD_TD3_PASSPORT", "MRTD_TD1_ID", "MRTD_TD2_ID" ]
              },
              {
                  "Name": "parse_pdf_417",
                  "CodeSpecifications": ["AAMVA_DL_ID","AAMVA_DL_ID_WITH_MAG_STRIPE","SOUTH_AFRICA_DL"]
              },
              {
                  "Name": "parse_vin_barcode",
                  "CodeSpecifications": ["VIN"]
              },
              {
                  "Name": "parse_vin_text",
                  "CodeSpecifications": ["VIN"]
              }
          ]
      }
      """;
    try {
        mRouter.initSettings(template);
    } catch (CaptureVisionRouterException e) {
        throw new RuntimeException(e);
    }
}
```

我们还可以更改`PREVIEW_WIDTH`和`PREVIEW_HEIGHT`来更新要使用的USB 摄像头的分辨率。OCR通常要求较高的分辨率。

### 创建计时器来处理帧

连接摄像头后，使用Timer计时器不断获取视频帧进行处理。

```java
private Timer timer = null;
private void startProcessing(){
    TimerTask task = new TimerTask() {
        @Override
        public void run() {
            Bitmap bmp = mUVCCameraView.captureStillImage();
            recognize(bmp);
        }
    };
    timer = new Timer();
    timer.scheduleAtFixedRate(task, 1000, 100);
}
private void stopProcessing(){
    if (timer != null){
        timer.cancel();
        timer = null;
    }
}

private final USBMonitor.OnDeviceConnectListener mOnDeviceConnectListener = new USBMonitor.OnDeviceConnectListener() {
    //......
    @Override
    public void onConnect(final UsbDevice device, final USBMonitor.UsbControlBlock ctrlBlock, final boolean createNew) {
        if (mCameraHandler != null) {
            mCameraHandler.open(ctrlBlock);
            startPreview();
            startProcessing(); //newly added
        }

    }

    @Override
    public void onDisconnect(final UsbDevice device, final USBMonitor.UsbControlBlock ctrlBlock) {
        stopProcessing();  //newly added
    }
}
```

预览将捕获为bitmap，供Dynamsoft SDK处理。结果将显示在TextView中。

```java
private void recognize(final Bitmap bitmap){
    try {
        CapturedResult result = mRouter.capture(bitmap, "ReadPassportAndId"); //recognize MRZ
        RecognizedTextLinesResult linesResult = result.getRecognizedTextLinesResult();
        runOnUiThread(
            new Runnable() {
                @Override
                public void run() {
                    if (linesResult != null) {
                        TextLineResultItem[] results = linesResult.getItems();
                        StringBuilder linesBuilder = new StringBuilder();
                        for (TextLineResultItem result : results){
                            linesBuilder.append(result.getText());
                            linesBuilder.append("\n");
                        }
                        try {
                            StringBuilder result = new StringBuilder();
                            ParsedResultItem item = mParser.parse(linesBuilder.toString().getBytes(StandardCharsets.UTF_8),""); //parse MRZ
                            for (HashMap.Entry<String, String> entry : item.getParsedFields().entrySet()) {
                                String key = entry.getKey();
                                String value = entry.getValue();
                                result.append(key).append(": ").append(value).append("\n");
                            }
                            resultTextView.setText(result.toString());
                        } catch (CodeParserException e) {
                            resultTextView.setText(e.getMessage());
                        }
                    }
                }
            }
        );
    } catch (Exception e){
        e.printStackTrace();
    }
}
```

## 兼容问题

在Android 9+上，如果`targetSdkVersion`大于27，则库可能无法工作。可以查看此[博客](https://serenegiant.com/blog/?p=3696)以了解更多信息。

## 源代码

<https://github.com/tony-xlh/Android-USB-Camera-MRZ-Scanner/>


