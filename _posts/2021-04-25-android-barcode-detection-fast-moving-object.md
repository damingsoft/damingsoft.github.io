---
layout: post
title: 针对快速移动物体的条码检测安卓应用
date: 2021-04-25 13:21:51 +0800
categories: 条码扫描
tags: Android
---

如果你想将条形码技术应用于物流传送带以扫描包裹。你可能面临的一个问题是如何从模糊图像中识别条形码。虽然我们可以使用先进的算法来处理这种复杂的情况，但我们最好尽可能提高图像质量。一个简单的方法是调整相机快门速度，或者说曝光时间。更快的快门速度可以避免运动模糊。在这篇文章中，我将分享如何调用Android的Camera2 API来改变快门速度，以及如何构建一个简单的Android条形码读取器来识别快速移动物体上的条形码

## 基于Camera2 API的Android条码读取器

要构建一个基本的Android Camera2应用程序，我们不需要重新发明轮子。只需下载谷歌提供的[android-Camera2Basic](https://github.com/googlesamples/android-Camera2Basic/tree/master/Application/src/main/java/com/example/android/camera2basic)的源代码。

创建一个带有列表视图的**报警对话框(AlertDialog)**，用于选择快门速度：

```java
Activity activity = getActivity();
if (null != activity) {
    // https://stackoverflow.com/questions/15762905/how-can-i-display-a-list-view-in-an-android-alert-dialog
    AlertDialog.Builder builder = new AlertDialog.Builder(activity);
    builder.setTitle("Shutter Speed");

    final ArrayAdapter<String> arrayAdapter = new ArrayAdapter<>(activity, android.R.layout.select\_dialog\_singlechoice);
    arrayAdapter.add("1/1000 s");
    arrayAdapter.add("1/500 s");
    arrayAdapter.add("1/250 s");
    arrayAdapter.add("1/125 s");
    arrayAdapter.add("1/100 s");

    builder.setNegativeButton("cancel", new DialogInterface.OnClickListener() {
        @Override
        public void onClick(DialogInterface dialog, int which) {
            dialog.dismiss();
        }
    });

    builder.setAdapter(arrayAdapter, new DialogInterface.OnClickListener() {
        @Override
        public void onClick(DialogInterface dialog, int which) {
            mShutterSpeed = SHUTTER\_SPEED.get(which);
            startPreview();
        }
    });
    builder.show();
}

```

获取与请求的**YUV\_420\_888**图像格式兼容的图像大小列表并用所选图像大小实例化**ImageReader**：

```java
Size outputPreviewSize = new Size(MAX_PREVIEW_WIDTH, MAX_PREVIEW_HEIGHT);
Size[] sizeList =  map.getOutputSizes(ImageFormat.YUV_420_888);
for (Size size : sizeList) {
    if(size.getWidth() * size.getHeight() > 1000000)
        continue;
    else{
        outputPreviewSize = size;
        break;
    }
}

mImageReader = ImageReader.newInstance(outputPreviewSize.getWidth(), outputPreviewSize.getHeight(),
        ImageFormat.YUV_420_888, 4);

```

在ImageReader的回调函数**onImageAvailable()**中，获取图像缓存并调用decodeBuffer()函数进行条形码检测：

```java
    Image image = reader.acquireLatestImage();
    if (image == null) return;

    ByteBuffer buffer = image.getPlanes()\[0\].getBuffer();
    byte\[\] bytes = new byte\[buffer.remaining()\];
    buffer.get(bytes);
    int nRowStride = image.getPlanes()\[0\].getRowStride();
    int nPixelStride = image.getPlanes()\[0\].getPixelStride();
    image.close();
    try {
        TextResult\[\] results = mBarcodeReader.decodeBuffer(bytes, mImageReader.getWidth(), mImageReader.getHeight(), nRowStride \* nPixelStride, EnumImagePixelFormat.IPF\_NV21, "");
        String output = "";
        if (results != null && results.length > 0) {
            for (TextResult result: results) {
                String format = result.barcodeFormatString;
                String text = result.barcodeText;

                output += "Format: " + format + ", Text: " + text;
            }
        }
        else {
            output = "";
        }

        Message msg = new Message();
        msg.what = MSG\_UPDATE\_TEXTVIEW;
        msg.obj = output;
        mMainHandler.sendMessage(msg);

    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

因为侦听器是在一个线程处理程序上调用的，所以我们不能直接更新UI。 我们可以通过主线程处理程序发送更新请求：

```java
mMainHandler = new Handler(){
    @Override
    public void handleMessage(Message msg) {
        switch (msg.what) {
            case MSG\_UPDATE\_TEXTVIEW:
                String result = (String)msg.obj;
                mTextView.setText((String)msg.obj);

                if (!result.equals("")) {
                    mToneGenerator.startTone(ToneGenerator.TONE\_PROP\_BEEP2);
                }

        }
    }
};

```

将ImageReader的surface添加到**CaptureRequest.Builder**：

```java
mPreviewRequestBuilder.addTarget(mImageReader.getSurface());
```

当相机捕获会话就绪时，开始预览。要控制快门速度，需要先关闭自动曝光模式：

```java
try {
    // Auto focus should be continuous for camera preview.
    mPreviewRequestBuilder.set(CaptureRequest.CONTROL\_AF\_MODE,
            CaptureRequest.CONTROL\_AF\_MODE\_CONTINUOUS\_PICTURE);

    // Adjust the shutter speed
    mPreviewRequestBuilder.set(CaptureRequest.CONTROL\_AE\_MODE, CaptureRequest.CONTROL\_AE\_MODE\_OFF);
    mPreviewRequestBuilder.set(CaptureRequest.SENSOR\_EXPOSURE\_TIME, mShutterSpeed);

    // Finally, we start displaying the camera preview.
    mPreviewRequest = mPreviewRequestBuilder.build();
    mCaptureSession.setRepeatingRequest(mPreviewRequest,null,null);
} catch (CameraAccessException e) {
    e.printStackTrace();
}

```

我们构建并运行这个简单的Android条形码阅读器。如果无法从快速移动的物体上读取条形码，则只需更改快门速度：

![基于Camera2 API的Android条码读取器](https://www.dynamsoft.com/codepool/img/2019/05/android-barcode-camera2.gif)

注意：由于硬件规格不同的原因，当您将快门速度更改为1/500秒或更快时，在一些便宜的手机上可能会获得低质量的预览图像。

## 源代码

[https://github.com/yushulx/android-camera2-barcode](https://github.com/yushulx/android-camera2-barcode)









