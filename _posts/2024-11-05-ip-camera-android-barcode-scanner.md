---
layout: post
title: "安卓使用网络摄像头扫码"
date: 2024-11-05 16:24:53 +0800
categories: 条码扫描
tags: 
description: 本文介绍了如何创建一个使用网络摄像头进行扫码的Android应用。
---

网络摄像头，是一种可以通过网络发送视频数据的视频设备，与基于模拟信号的CCTV摄像头不同，我们可以在我们的应用中接受它的数字信号。

网络摄像头广泛用于监控。它们还可以用于库存管理，也可以用作Android平板电脑和自动售货机等设备的额外摄像头。

在本文中，我们将使用创建一个使用网络摄像头进行扫码的Android应用。使用ExoPlayer通过RTSP播放网络摄像头的视频流，[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)用于识别条码。


## 新建项目

使用Android Studio创建一个空的activity的应用项目。


## 添加依赖项


1. 在应用的`build.gradle`中添加ExoPlayer。

   ```groovy
   implementation "androidx.media3:media3-exoplayer:1.4.1"
   implementation "androidx.media3:media3-exoplayer-dash:1.4.1"
   implementation "androidx.media3:media3-ui:1.4.1"
   implementation "androidx.media3:media3-exoplayer-rtsp:1.4.1"
   ```

2. 添加Dynamsoft Barcode Reader。

   1. 打开`settings.gradle`添加Dynamsoft的maven仓库。

      ```groovy
      dependencyResolutionManagement {
          repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
          repositories {
              google()
              mavenCentral()
              maven {
                  url "https://download2.dynamsoft.com/maven/aar"
              }
          }
      }
      ```

   2. 在应用的`build.gradle`中声明依赖。

      ```groovy
      implementation 'com.dynamsoft:dynamsoftbarcodereaderbundle:10.4.2000'
      ```


## 添加权限

打开`AndroidManifest.xml`以添加Internet权限。

```xml
<uses-permission android:name="android.permission.INTERNET"></uses-permission>
```

## 使用ExoPlayer播放网络摄像头的RTSP流

1. 打开`activity_main.xml`，添加PlayerView。

   ```xml
   <androidx.media3.ui.PlayerView
       android:id="@+id/playerView"
       android:layout_width="match_parent"
       android:layout_height="match_parent"
       app:layout_constraintBottom_toBottomOf="parent"
       app:layout_constraintEnd_toEndOf="parent"
       app:layout_constraintStart_toStartOf="parent"
       app:layout_constraintTop_toTopOf="parent"
       app:surface_type="surface_view" >
   </androidx.media3.ui.PlayerView>
   ```

   在`MainActivity.java`中，获取该视图。

   ```java
   private PlayerView playerView;
   playerView = findViewById(R.id.playerView);
   ```

2. 创建ExoPlayer的实例并将其设置为PlayerView的播放器。

   ```java
   ExoPlayer player = new ExoPlayer.Builder(getApplicationContext()).build();
   playerView.setPlayer(player);
   ```

3. 将RTSP流设置为播放器的媒体源。可以使用[mediamtx](https://github.com/bluenviron/mediamtx/)启动一个本地RTSP服务器进行测试。

   ```java
   protected Uri uri = Uri.parse("rtsp://192.168.8.65:8554/mystream");
   MediaSource mediaSource =
                new RtspMediaSource.Factory()
                   .createMediaSource(MediaItem.fromUri(uri));
   player.setMediaSource(mediaSource);
   ```

4. 准备播放器，并在准备就绪后进行播放。

   ```java
   player.setPlayWhenReady(true);
   player.prepare();
   ```

## 从网络摄像头读取条码

1. 初始化Dynamsoft Barcode Reader的许可证。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。

   ```java
   LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==", this, (isSuccess, error) -> {
       if (!isSuccess) {
           error.printStackTrace();
       }
   });
   ```

2. 创建capture vision router实例以调用Dynamsoft Barcode Reader来解码。

   ```java
   private CaptureVisionRouter mRouter;
   mRouter = new CaptureVisionRouter(this);
   ```

3. 启动一个计时器以捕获网络摄像头的视频帧并从中读取条形码。在TextView中显示结果。


   ```java
   private boolean decoding = false;
   private boolean isVideoPlaying = false;
   private Timer timer = null;
   private void startDecoding(){
       TimerTask task = new TimerTask() {
           @Override
           public void run() {
               takePhotoAndDecode();
           }
       };
       timer = new Timer();
       timer.schedule(task, 1000,100);
   }

    @OptIn(markerClass = UnstableApi.class)
    @SuppressLint("NewApi")
    private void takePhotoAndDecode() {
       if (decoding == false && isVideoPlaying) {
           decoding = true;
           SurfaceView surfaceView = (SurfaceView) playerView.getVideoSurfaceView();
           // Create a bitmap the size of the scene view.
           final Bitmap bitmap = Bitmap.createBitmap(surfaceView.getWidth(), surfaceView.getHeight(),
                   Bitmap.Config.ARGB_8888);
           // Create a handler thread to offload the processing of the image.
           final HandlerThread handlerThread = new HandlerThread("PixelCopier");
           handlerThread.start();
           // Make the request to copy.
           PixelCopy.request(surfaceView, bitmap, (copyResult) -> {
               if (copyResult == PixelCopy.SUCCESS) {
                   CapturedResult result =  mRouter.capture(bitmap, EnumPresetTemplate.PT_READ_BARCODES);
                   DecodedBarcodesResult decodedBarcodesResult = result.getDecodedBarcodesResult();
                   if (decodedBarcodesResult != null) {
                       BarcodeResultItem[] items = decodedBarcodesResult.getItems();
                       StringBuilder sb = new StringBuilder();
                       for (BarcodeResultItem item:items) {
                           sb.append(item.getFormatString());
                           sb.append(": ");
                           sb.append(item.getText());
                           sb.append("\n");
                       }
                       runOnUiThread(new Runnable() {
                           public void run() {
                               textView.setText(sb.toString());
                           }
                       });
                   }
               }
               decoding = false;
               handlerThread.quitSafely();
           }, new Handler(handlerThread.getLooper()));
       }
   }
   ```

4. 为播放器添加监听器来检查视频是否正在播放。

   ```java
   player.addListener(
       new Player.Listener() {
           @Override
           public void onIsPlayingChanged(boolean isPlaying) {
               isVideoPlaying = isPlaying;
           }
       });
   ```

好了，我们已经完成了这个demo。

## 源代码

查看demo的源代码并尝试使用：

<https://github.com/tony-xlh/IPCam-Barcode-Scanner-Android>



