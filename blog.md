---
layout: page
title: Blog
subtitle: "Short notes on AppSec, cloud fundamentals, and how I’m learning to think like a security engineer."
permalink: /blog/
description: "Security notes and writeups by David M. Hoang."
---

<div class="section">
  <p class="muted">
    I use this space to document what I’m learning as I build toward application and cloud security engineering roles.
    Posts are short, practical, and focused on reasoning — not polished tutorials.
  </p>
</div>

{% assign posts_count = site.posts | size %}

{% if posts_count == 0 %}

  <div class="section">
    <div class="card">
      <h3>First posts coming soon</h3>
      <p class="muted">
        I’m currently drafting a few writeups on web app testing workflows, vulnerability scan triage, and cloud security fundamentals.
        I’ll publish as I validate what I’ve learned.
      </p>
      <div style="margin-top: 12px; display:flex; gap: 10px; flex-wrap: wrap;">
        <a class="pill" href="{{ '/projects/' | relative_url }}">View Projects</a>
        <a class="pill" href="{{ '/contact/' | relative_url }}">Contact</a>
      </div>
    </div>
  </div>
{% else %}
  <div class="section">
    <h2>Posts</h2>
    <div class="grid grid-2">
      {% for post in site.posts %}
        <a class="card post-card" href="{{ post.url | relative_url }}">
          <div class="post-top">
            <h3>{{ post.title }}</h3>
            <span class="post-date">{{ post.date | date: "%b %-d, %Y" }}</span>
          </div>
          {% if post.description %}
            <p>{{ post.description }}</p>
          {% else %}
            <p>{{ post.excerpt | strip_html | truncate: 140 }}</p>
          {% endif %}
        </a>
      {% endfor %}
    </div>
  </div>
{% endif %}
