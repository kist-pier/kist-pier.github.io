---
layout: page
title: Gallery
permalink: /gallery/
description: Photos from lab life, field experiments, and conferences.
nav: true
nav_order: 4
images:
  lightbox2: true
---

<!-- Filter Tabs -->
<div class="gallery-filter-tabs" role="tablist">
  <button class="gallery-tab active" data-cat="all" role="tab" aria-selected="true">All</button>
  <button class="gallery-tab" data-cat="lab-life" role="tab" aria-selected="false">Lab Life</button>
  <button class="gallery-tab" data-cat="conferences" role="tab" aria-selected="false">Conferences</button>
</div>

<!-- Photo Grid -->
<div class="gallery-grid" id="gallery-grid">
  {% for photo in site.data.gallery.photos %}
  <div class="gallery-item scroll-reveal" data-cat="{{ photo.category }}">
    <a href="{{ photo.image | relative_url }}"
       data-lightbox="gallery"
       data-title="{{ photo.caption }} — {{ photo.date }}">
      <div class="gallery-photo-wrap">
        <img src="{{ photo.image | relative_url }}"
             alt="{{ photo.caption }}"
             loading="lazy">
      </div>
      <div class="gallery-caption">
        <p>{{ photo.caption }}</p>
        <span class="gallery-date">{{ photo.date }}</span>
      </div>
    </a>
  </div>
  {% endfor %}
</div>

<!-- Pagination -->
<div class="gallery-pagination" id="gallery-pagination"></div>

<script src="{{ '/assets/js/gallery-filter.js' | relative_url }}" defer></script>
