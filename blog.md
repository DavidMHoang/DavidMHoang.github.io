---
layout: page
title: Blog
subtitle: "Short, practical notes as I grow in security engineering."
description: "Blog posts about AppSec, CloudSec, and security engineering."
---

I’m using this as a public notebook — practical notes, small wins, and lessons learned. If something is wrong or incomplete, I’ll update it.

<div class="hr"></div>

{% for post in site.posts %}

<div class="card" style="margin-bottom: 14px;">
  <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
  <p class="muted">{{ post.excerpt | strip_html | truncate: 160 }}</p>
  <small class="muted">{{ post.date | date: "%B %d, %Y" }}</small>
</div>
{% endfor %}
