---
title: 分类
layout: page
description: 按分类浏览大名维森软件开发者博客的全部文章：条码识别、文档扫描、图像处理、MRZ 与证件解析、Web TWAIN、PDF 处理等。
image: /assets/og/og-default.png
---

分类：

<ul class="listing">
{% for cat in site.categories %}
  <li class="listing-seperator" id="{{ cat[0] }}">{{ cat[0] }}</li>
{% for post in cat[1] %}
  <li class="listing-item">
  <time datetime="{{ post.date | date:"%Y-%m-%d" }}">{{ post.date | date:"%Y-%m-%d" }}</time>
  <a href="{{ post.url }}" title="{{ post.title }}">{{ post.title }}</a>
  </li>
{% endfor %}
{% endfor %}
</ul>