---
layout: page
title: Research Areas
permalink: /research/
description: We develop algorithms and systems for robots that physically interact with complex real-world environments.
nav: false
nav_order: 1
---

<div class="research-page" data-reveal-group="research">

  {% for area in site.data.research_areas.areas %}
  <div class="research-detail-card scroll-reveal">
    <div class="research-detail-header">
      <span class="research-detail-icon"><i class="{{ area.icon | escape }}"></i></span>
      <h3>{{ area.title | escape }}</h3>
    </div>
    <p class="research-detail-desc">{{ area.description | escape }}</p>
    {% if area.focus and area.focus.size > 0 %}
    <div class="research-detail-meta">
      <strong>Focus:</strong>
      {% for tag in area.focus %}
      <span class="focus-tag">{{ tag | escape }}</span>
      {% endfor %}
    </div>
    {% endif %}
  </div>
  {% endfor %}

</div>

<!-- Research Projects Section -->
<hr style="border:none;border-top:2px solid #e8eaf0;margin:3.5rem 0 2.5rem;">
<h2 style="font-size:1.5rem;font-weight:800;color:#1a1a2e;margin-bottom:0.5rem;">Research Projects</h2>
<div class="project-section-heading">
  <p>Selected robot-learning and control demonstrations from PIER Lab.</p>
  <a href="https://www.youtube.com/@pier-lab/videos" target="_blank" rel="noopener noreferrer">
    <i class="fa-brands fa-youtube" aria-hidden="true"></i>
    View all videos
  </a>
</div>

<div class="project-group-heading">
  <h3>Featured Demonstrations</h3>
  <p>Recent demonstrations with available videos.</p>
</div>

<div class="project-grid">

  {% for project in site.data.research_projects.projects %}
  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/{{ project.video | escape }}"
        title="{{ project.title | escape }}"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">{{ project.area | escape }}</span>
      <h3>{{ project.heading | escape }}</h3>
      <p>{{ project.description | escape }}</p>
      {% if project.tags and project.tags.size > 0 %}
      <div class="project-tags">
        {% for tag in project.tags %}
        <span class="focus-tag">{{ tag | escape }}</span>
        {% endfor %}
      </div>
      {% endif %}
    </div>
  </div>
  {% endfor %}

</div>
