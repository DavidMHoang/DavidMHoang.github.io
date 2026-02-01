---
layout: page
title: Projects
subtitle: "Hands-on work, notes, and writeups."
description: "Security projects and writeups."
---

Below are projects and writeups I’m building out. Some are finished, others are in-progress — but everything here is something I actually did and learned from.

<div class="hr"></div>

{% if site.projects and site.projects.size > 0 %}
{% assign items = site.projects | sort: "date" | reverse %}
{% for p in items %}

  <div class="card" style="margin-bottom: 14px;">
    <h3><a href="{{ p.url | relative_url }}">{{ p.title }}</a></h3>
    <p class="muted">{{ p.description }}</p>
    <small class="muted">{{ p.date | date: "%B %d, %Y" }}</small>
  </div>
  {% endfor %}
{% else %}
  <div class="card">
    <h3>Projects coming soon</h3>
    <p class="muted">
      I’m setting up the structure now. The first writeups will cover web app testing notes, vulnerability scanning/triage, and cloud security fundamentals.
    </p>
  </div>
{% endif %}

<p class="muted">Want me to add a specific writeup? <a href="{{ '/contact/' | relative_url }}">Reach out</a>.</p>
