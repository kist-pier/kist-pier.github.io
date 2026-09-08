---
layout: page
title: Faculty
permalink: /people/advisor/
description: Principal Investigator of PIER Lab.
nav: false
---

{% assign pi = site.data.members.pi[0] %}

<div class="advisor-page">

  <div class="advisor-header scroll-reveal">
    <div class="advisor-avatar">
      {% if pi.image %}
        <img src="{{ pi.image | relative_url | bust_file_cache | escape }}" alt="{{ pi.name_en | escape }}" class="advisor-photo">
      {% else %}
        <div class="advisor-initials-avatar">
          {% if pi.initials %}
            {{ pi.initials | escape }}
          {% else %}
            {{ pi.name_en | split: " " | first | slice: 0 }}{{ pi.name_en | split: " " | last | slice: 0 }}
          {% endif %}
        </div>
      {% endif %}
    </div>
    <div class="advisor-info">
      <h1 class="advisor-name">{{ pi.name_en | escape }}</h1>
      <p class="advisor-name-ko">{{ pi.name_ko | escape }}</p>
      <p class="advisor-role">{{ pi.role | escape }}</p>
      <p class="advisor-affil">KIST (Korea Institute of Science and Technology) · Humanoid Research Division</p>
      <div class="advisor-links">
        {% if pi.email %}
          <a href="mailto:{{ pi.email | uri_escape }}" class="advisor-link-btn">
            <i class="fa-solid fa-envelope"></i> Email
          </a>
        {% endif %}
        {% if pi.scholar %}
          <a href="{{ pi.scholar | escape }}" target="_blank" rel="noopener" class="advisor-link-btn">
            <i class="fa-solid fa-graduation-cap"></i> Scholar
          </a>
        {% endif %}
        {% if pi.github %}
          <a href="{{ pi.github | escape }}" target="_blank" rel="noopener" class="advisor-link-btn">
            <i class="fa-brands fa-github"></i> GitHub
          </a>
        {% endif %}
        {% if pi.website and pi.website != "" %}
          <a href="{{ pi.website | escape }}" target="_blank" rel="noopener" class="advisor-link-btn">
            <i class="fa-solid fa-globe"></i> Website
          </a>
        {% endif %}
        {% if pi.cv and pi.cv != "" %}
          <a href="{{ pi.cv | relative_url | escape }}" target="_blank" rel="noopener" class="advisor-link-btn">
            <i class="fa-solid fa-file-lines"></i> CV
          </a>
        {% endif %}
      </div>
    </div>
  </div>

  <div class="advisor-section scroll-reveal">
    <h2>Biography</h2>
    <p>{{ pi.bio | escape }}</p>
  </div>

  <div class="advisor-section scroll-reveal">
    <h2>Education</h2>
    {% for edu in pi.education %}
      <div class="cv-item">
        <div class="cv-period">{{ edu.year | escape }}</div>
        <div class="cv-detail">
          <strong>{{ edu.degree | escape }}</strong><br>
          {{ edu.institution | escape }}
        </div>
      </div>
    {% endfor %}
  </div>

  <div class="advisor-section scroll-reveal">
    <h2>Research Interests</h2>
    <ul class="interest-list">
      {% for interest in pi.research_interests %}
        <li>{{ interest | escape }}</li>
      {% endfor %}
    </ul>
  </div>

  <div class="advisor-section scroll-reveal">
    <h2>Career</h2>
    {% for item in pi.career %}
      <div class="cv-item">
        <div class="cv-period">{{ item.period | escape }}</div>
        <div class="cv-detail">
          <strong>{{ item.title | escape }}</strong><br>
          {{ item.institution | escape }}
        </div>
      </div>
    {% endfor %}
  </div>

{% if pi.awards.size > 0 %}

  <div class="advisor-section scroll-reveal">
    <h2>Awards &amp; Honors</h2>
    <ul class="award-list">
      {% for award in pi.awards %}
        <li>{{ award | escape }}</li>
      {% endfor %}
    </ul>
  </div>
  {% endif %}

  <div class="advisor-section scroll-reveal">
    <h2>Contact</h2>
    <p>
      <i class="fa-solid fa-envelope" style="color: #2d3a8c; margin-right: 0.5rem;"></i>
      <strong>Email:</strong> {{ pi.email | escape }}<br>
      <i class="fa-solid fa-map-marker-alt" style="color: #2d3a8c; margin-right: 0.5rem;"></i>
      <strong>Location:</strong> KIST, Seoul, South Korea
    </p>
  </div>

</div>
