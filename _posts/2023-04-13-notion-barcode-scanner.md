---
layout: post
title: 如何扫描条码以导入图书信息到Notion
date: 2023-04-13 14:31:53 +0800
categories: 条码扫描
tags: Notion ISBN
---

Notion是一个一体化工作空间，能让我们充分使用计算机的能力。它是一个记笔记的应用程序，但它丰富的定制能力使它远不止一个笔记应用这么简单。

在本文中，我们将构建一个Web网页应用来扫描ISBN条码，通过API获取书籍的信息，并将其保存到Notion数据库中。扫码使用了[Dynamsoft的条码识别SDK](https://www.dynamsoft.com/barcode-reader/overview/)。

演示视频：

<video src="https://user-images.githubusercontent.com/5462205/231373688-a68a87f8-3b17-41c1-8465-59135e740496.mp4" data-canonical-src="https://user-images.githubusercontent.com/5462205/231373688-a68a87f8-3b17-41c1-8465-59135e740496.mp4" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width: 100%;max-height:640px; min-height: 200px"></video>

[在线demo](https://notion-barcode-scanner.azurewebsites.net/)

## 扫描条码以保存图书到Notion

下面是分步实现过程。

### 构建ISBN条码扫描Web应用

我们需要构建一个ISBN条码扫描Web应用来获取书籍的ISBN，并通过API，比如谷歌的Book API，获取书籍的详细信息。我们已经在[上一篇文章](https://www.dynamsoft.com/codepool/isbn-barcode-scanner.html)中讨论了如何构建一个这样的应用。我们可以在此基础上为Notion构建条码扫描应用。在本文中，我们将更多地关注如何与Notion集成起来。

### 将书籍保存到Notion

我们需要创建一个集成（Integration）来通过API访问Notion。

#### 创建新的集成

访问[我的集成](https://www.notion.so/my-integrations)，创建一个新的集成。

![集成](/album/2023/04/notion/my-integration.jpg)

然后，我们可以得到一个密钥，用于访问Notion工作区。

![获取密钥](/album/2023/04/notion/get_secret.jpg)

#### 创建新的数据库

创建一个新的数据库，用于保存图书信息，包含作者、页数和ISBN这样的属性。

![数据库](/album/2023/04/notion/database.jpg)

我们可以从数据库的链接知道它的ID。

![数据库ID](/album/2023/04/notion/database-id.jpg)

#### 将集成连接到数据库

将集成连接到数据库，这样它才能够修改数据库。

![连接](/album/2023/04/notion/connection.jpg)

#### 通过API创建新的图书条目

接下来，我们需要通过[pages API](https://developers.notion.com/reference/post-page)添加图书条目到数据库中。

由于CORS的原因，无法从浏览器直接调用这一API，需要用后端服务来发送请求。

这里，我们使用Python Flask完成请求：

```py
@app.route('/notion', methods=['POST'])
def send_to_notion():
    if request.method == 'POST':
        data = request.get_json()
        endpoint = "https://api.notion.com/v1/pages"
        secret = data["secret"]
        pay_load = json.loads(data["pay_load"])
        headers = {
                    'Authorization': 'Bearer '+secret,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                  }
        r = requests.post(endpoint, json=pay_load, headers=headers)
        return r.text
    else:
        return "Method not allowed", 400
```

然后，在Web应用里，使用`XMLHttpRequest`发送请求。JSON请求内容是在Web应用中构建的。密钥和数据库ID由用户输入。

```js
function sendToNotion(rowValues){
  let endpoint = './notion';
  const secret = document.getElementById("secretInput").value;
  const databaseID = document.getElementById("databaseInput").value;
  localStorage.setItem('notion_secret', secret);
  localStorage.setItem('notion_database_id', databaseID);
  const thumbnailLink = rowValues[0];
  const title = rowValues[1];
  const authors = rowValues[2];
  const pageCount = rowValues[3];
  const ISBN = rowValues[4];
  const payload_for_notion = `{
    "parent": { "database_id": "`+databaseID+`" },
    "cover": {
      "type": "external",
      "external": {
        "url": "`+thumbnailLink+`"
      }
    },
    "properties": {
      "Name": {
        "title": [
          {
            "text": {
              "content": "`+title+`"
            }
          }
        ]
      },
      "Authors": {
        "rich_text": [
          {
            "text": {
              "content": "`+authors+`"
            }
          }
        ]
      },
      "ISBN": {
        "rich_text": [
          {
            "text": {
              "content": "`+ISBN+`"
            }
          }
        ]
      },
      "Page Count": {
        "rich_text": [
          {
            "text": {
              "content": "`+pageCount+`"
            }
          }
        ]
      }
    }
  }`
  const payload = {"secret":secret,"pay_load":payload_for_notion}
  let xhr = new XMLHttpRequest();
  xhr.open('POST', endpoint);
  xhr.setRequestHeader('content-type', 'application/json');
  xhr.onreadystatechange = function(){
    if(xhr.readyState === 4){
      console.log(xhr.responseText);
      updateStatus("");
      alert("Sent");
    }
  }
  xhr.onerror = function(){
    console.log("error");
    updateStatus("");
    alert("failed");
  }
  xhr.send(JSON.stringify(payload));
  updateStatus("Sending...");
}
```

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/Scan-Barcode-to-Notion>

