---
layout: post
title: 邮件发送使用Dynamic Web TWAIN扫描的文档
date: 2021-07-08 08:52:53 +0800
categories: 文档扫描
tags: Email Dropbox Python Flask
---

电子邮件是一种发送扫描文档的便捷方式。许多网络扫描仪都内置了发送电子邮件的功能。比如HP多功能一体机有一个[扫描到电子邮件](https://www.youtube.com/watch?v=iRtGWMgKRnU)的应用程序。

但是，如果我们想在基于[Dynamic Web TWAIN (DWT)](https://www.dynamsoft.com/web-twain/overview/)的文档扫描Web应用完成扫描，则无法使用这些设备的内置电子邮件发送功能。我们需要实现自己的电子邮件发送机制。

将扫描到电子邮件的功能添加到Web扫描应用程序中有多种方法。

1. 使用[SMTPjs](https://smtpjs.com/)这样的第三方服务。它使用简单，不需要后端服务器。但是我们需要把密码泄露给第三方服务。
2. 使用电子邮件服务的API。[Outlook](https://docs.microsoft.com/en-us/graph/outlook-mail-concept-overview)和[Gmail](https://developers.google.com/gmail/api/guides/uploads)都提供了发送电子邮件的API，并支持上传大文件。但是我们需要适配不同的邮件服务API。
3. 创建一个服务器应用程序，该应用程序接收扫描的文档并使用SMTP协议发送它们。如果文档太大（超过10MB），那么我们可以提供一个下载链接。

在本文中，我们将按照第三种方式添加电子邮件扫描功能。

如果扫描的文档小于10MB，用户将收到这样一封带有附件的电子邮件：

```
Hi there,

Your scanned documents are attached.
```

如果大于10MB，用户将收到以下带有dropbox链接的电子邮件：

```
Hi there,

Your scanned documents are large. We've uploaded to dropbox: https://www.dropbox.com/s/44mbz8w1qgceb3f/20210707151820.jpg?dl=0
```

用到的一些：

* Dynamic Web TWAIN，用于在浏览器中扫描文档
* Python+Flask，用于创建后端
* Dropbox，用于存储大文件


## 环境配置

1. 安装Python 3
2. 安装所需的Python软件包：

   ```
   pip install Flask, dropbox
   ```

## 实现电子邮件发送Flask后端

我们选择Python+Flask组合来创建后端。

创建了三个Python文件：

```
app.py: the Flask application
email_utils.py: functions related to emails
dropbox_helper.py: a class to upload files to dropbox and create a sharing link
```

在`app.py`中，导入所需的包并创建Flask应用。

```py
from flask import Flask, request, render_template
import email_utils
import dropbox_helper
import os
app = Flask(__name__, static_url_path='/', static_folder='static')
```

使用`route`绑定一个URL到接收扫描文档和发送电子邮件的函数：

```py
@app.route('/emails', methods=['POST'])
def emails():
    if request.method == 'POST':
        f = request.files['RemoteFile']
        send_to = request.form['sendto']
        filebytes=f.read()
        result=False
        if len(filebytes)>10*1024*1024: # if the file is larger than 10MB, using dropbox
            dbx = dropbox_helper.dropbox_helper()
            path = '/{}'.format(f.filename)
            if dbx.upload(filebytes,path):
                link = dbx.create_sharing_link(path)
                if link!=None:
                    result = email_utils.send_with_link(send_to,link)
        else:
            result = email_utils.send_with_attatchment(send_to,filebytes,f.filename)
        if result==True:
            result="success"
        else:
            result="failed"
        response={"status": result}
        return response
```

`email_utils.py`的内容：

```py
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

def send_with_attatchment(to,filebytes,filename):
    msg = build_message(to,filebytes=filebytes,filename=filename)
    return send(msg,to)

def send_with_link(to,link):
    msg = build_message(to,link=link)
    return send(msg,to)

def send(msg,to):
    try:
        account = get_account()
        passwd = get_passwd()
        server = smtplib.SMTP(get_smtp_server(),587)
        server.ehlo()
        server.starttls()
        server.login(account,passwd)
        server.sendmail(account, to, msg.as_string())
        server.quit()
        print("Successfully sent email")
        return True
    except smtplib.SMTPException:
        print("Failed")
        return False

def build_message(to,link=None,filebytes=None,filename=None):
    msg = MIMEMultipart()
    msg['to'] = to
    msg['from'] = get_account()
    msg['subject'] = 'Your scanned documents'
    if filebytes != None:
        att1 = MIMEText(filebytes, 'base64', 'utf8')
        att1["Content-Type"] = 'application/octet-stream'
        att1["Content-Disposition"] = 'attachment; filename="{}"'.format(filename);
        msg.attach(att1)
        body="Hi there,\n\nYour scanned documents are attached."
        msg.attach(MIMEText(body,'plain'))
    if link!=None:
        body="Hi there,\n\nYour scanned documents are large. We've uploaded to dropbox: {}".format(link)
        msg.attach(MIMEText(body,'plain'))
    return msg

def get_account():
    with open('account') as f:
        content = f.readlines()
        return content[0].strip()

def get_passwd():
    with open('account') as f:
        content = f.readlines()
        return content[1].strip()

def get_smtp_server():
    with open('account') as f:
        content = f.readlines()
        return content[2].strip()        


if __name__ == '__main__':
   send_with_attatchment("xx@dynamsoft.com",open('test.jpg', 'rb').read(),"test.jpg")
```

帐户信息存储在一个纯文本文件中，第一行存储emali帐户，第二行存储密码，第三行存储SMTP服务器地址。

`dropbox_helper` 的内容（使用了 [Dropbox Python SDK](https://github.com/dropbox/dropbox-sdk-python)）：

```py
import dropbox
from dropbox.files import WriteMode
from dropbox.exceptions import ApiError

class dropbox_helper:

    def __init__(self):
        #Create an app and generate your access token here: https://www.dropbox.com/developers/apps/
        self.dbx = dropbox.Dropbox("<access_token>")

    def upload(self,filebytes,filepath):
        try:
            self.dbx.files_upload(filebytes, filepath, mode=WriteMode('overwrite'))
            return True
        except ApiError as err:
            return False

    def create_sharing_link(self,filepath):
        try:
            shared_link_metadata = self.dbx.sharing_create_shared_link(filepath)
            return shared_link_metadata.url
        except ApiError as err:
            return None


if __name__ == '__main__':
    helper=dropbox_helper()
    if helper.upload(open('email_utils.py', 'rb').read(),'/email_utils.py'):
        print(helper.create_sharing_link('/email_utils.py'))
```

我们也可以设置密码和过期时间，但这些设置免费账户不能使用。

```py
expires = datetime.datetime.now() + datetime.timedelta(days=30)
settings = dropbox.sharing.SharedLinkSettings(require_password=True,link_password="123456",expires=expires)
shared_link_metadata = dbx.sharing_create_shared_link_with_settings(filepath, settings=desired_shared_link_settings)
```


## 实现文档扫描HTML5前端

创建了几个元素：

* 获取扫描文档的按钮。
* 加载本地图像的按钮。
* 通过电子邮件发送扫描文档的按钮。
* 让用户输入电子邮件帐户的输入控件。
* 用于选择输出类型的Radio按钮。

HTML：

```html
<select size="1" id="source" style="position: relative; width: 220px;"></select>
<input type="button" value="Scan" onclick="AcquireImage();" />
<input type="button" value="Load" onclick="LoadImage();" />
<br />
<label>
    <input type="radio" value="jpg" name="ImageType" id="imgTypejpeg" checked="checked" />JPEG</label>
<label>
    <input type="radio" value="tif" name="ImageType" id="imgTypetiff" />TIFF</label>
<label>
    <input type="radio" value="pdf" name="ImageType" id="imgTypepdf" />PDF</label>
<br/>
<label>To: <input type="text" id="sendto" name="sendto"></label>
<input type="button" value="Email" onclick="Email();" />

<!-- dwtcontrolContainer is the default div id for Dynamic Web TWAIN control.-->
<div id="dwtcontrolContainer"></div>
```

JavaScript：

这里，我们使用DWT的[HTTPUpload](https://www.dynamsoft.com/web-twain/docs/indepth/features/output.html?ver=latest#http-with-built-in-apis)方法上载扫描的文档，并使用[SetHTTPFormField](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_IO.html#sethttpformfield)方法添加电子邮件表单字段。

```js
 function Email(){
    // Clear old fields before adding new ones
    sendto = document.getElementById("sendto").value;
    DWObject.ClearAllHTTPFormField();
    DWObject.SetHTTPFormField("sendto", sendto);
    // Convert scanned documents with the specified file format and upload
    ConvertAndSend("emails");
}

function ConvertAndSend(target){
    if (DWObject) {
        // If no image in buffer, return the function
        if (DWObject.HowManyImagesInBuffer == 0)
            return;
        var strHTTPServer = location.hostname; //The name of the HTTP server. For example: "www.dynamsoft.com";
        var CurrentPathName = unescape(location.pathname);
        var CurrentPath = CurrentPathName.substring(0, CurrentPathName.lastIndexOf("/") + 1);
        var endPoint = CurrentPath + target;
        console.log(endPoint);
        DWObject.IfSSL = false; // Set whether SSL is used
        DWObject.HTTPPort = location.port == "" ? 80 : location.port;
        var uploadfilename = getFormattedDate();
        // Upload the image(s) to the server asynchronously
        if (document.getElementById("imgTypejpeg").checked == true) {
            //If the current image is B&W
            //1 is B&W, 8 is Gray, 24 is RGB
            if (DWObject.GetImageBitDepth(DWObject.CurrentImageIndexInBuffer) == 1)
                //If so, convert the image to Gray
                DWObject.ConvertToGrayScale(DWObject.CurrentImageIndexInBuffer);
            //Upload image in JPEG
            DWObject.HTTPUploadThroughPost(strHTTPServer, DWObject.CurrentImageIndexInBuffer, endPoint, uploadfilename + ".jpg", OnEmptyResponse, OnServerReturnedSomething);
        }
        else if (document.getElementById("imgTypetiff").checked == true) {
            DWObject.HTTPUploadAllThroughPostAsMultiPageTIFF(strHTTPServer, endPoint, uploadfilename + ".tif", OnEmptyResponse, OnServerReturnedSomething);
        }
        else if (document.getElementById("imgTypepdf").checked == true) {
            DWObject.HTTPUploadAllThroughPostAsPDF(strHTTPServer, endPoint, uploadfilename + ".pdf", OnEmptyResponse, OnServerReturnedSomething);
        }
    }
}

function getFormattedDate() {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;
    var str = date.getFullYear().toString() + month + day + hour + min + sec;
    return str;
}
```

upload方法有两个回调。

我们可以解析返回的JSON结果来检查后端是否成功发送了电子邮件。

```js
function OnEmptyResponse() {
    console.log('empty response');
}
function OnServerReturnedSomething(errorCode, errorString, sHttpResponse) {
    console.log(sHttpResponse);
    var response;
    try {
        response = JSON.parse(sHttpResponse);
        if (response.status=="success"){
            alert("Success");
        }else{
        alert("Failed");
        }
    }
    catch(err) {
        console.log(err);
    }
}
```

## 部署到Azure Web App服务

我们可以将应用程序部署到Azure。操作指南：[Quickstart: Create a Python app using Azure App Service on Linux (Azure portal)](https://docs.microsoft.com/en-us/azure/app-service/quickstart-python)。

## 源代码

<https://github.com/xulihang/Scan-to-Email>



