---
layout: page
title: Members
permalink: /people/
description: Our team of researchers and students.
nav: false
---

{% assign members = site.data.members %}

<!-- ── M.S. Students ───────────────────────────────────────── -->

{% if members.ms.size > 0 %}

## M.S. Students

<div class="members-list">
  {% for person in members.ms %}
  <div class="member-row-card scroll-reveal">
    <div class="member-avatar">
      {% if person.image %}
        <img src="{{ person.image | relative_url }}" alt="{{ person.name_en }}" class="member-photo">
      {% else %}
        <div class="member-initials-avatar">
          {{- person.name_en | split: " " | first | slice: 0 -}}{{- person.name_en | split: " " | last | slice: 0 -}}
        </div>
      {% endif %}
    </div>
    <div class="member-info">
      <div class="member-name">{{ person.name_en }}</div>
      <div class="member-name-ko">{{ person.name_ko }}</div>
      <div class="member-role">{{ person.role }}</div>
      {% if person.affiliation %}
        <div class="member-school">{{ person.affiliation }}</div>
      {% endif %}
      {% if person.education %}
        {% for edu in person.education %}
          <div class="member-undergrad">{{ edu }}</div>
        {% endfor %}
      {% endif %}
      {% if person.research_areas %}
        <div class="member-tags">
          {% for tag in person.research_areas %}
            <span class="research-tag">{{ tag }}</span>
          {% endfor %}
        </div>
      {% endif %}
      {% include member_links.liquid person=person %}
    </div>
  </div>
  {% endfor %}
</div>
{% endif %}

---

<!-- ── Intern Researchers ──────────────────────────────────── -->

{% if members.research_interns.size > 0 %}

## Intern Researchers

<div class="members-list">
  {% for person in members.research_interns %}
  <div class="member-row-card scroll-reveal">
    <div class="member-avatar">
      {% if person.image %}
        <img src="{{ person.image | relative_url }}" alt="{{ person.name_en }}" class="member-photo">
      {% else %}
        <div class="member-initials-avatar">
          {{- person.name_en | split: " " | first | slice: 0 -}}{{- person.name_en | split: " " | last | slice: 0 -}}
        </div>
      {% endif %}
    </div>
    <div class="member-info">
      <div class="member-name">{{ person.name_en }}</div>
      <div class="member-name-ko">{{ person.name_ko }}</div>
      <div class="member-role">{{ person.role }}</div>
      {% if person.education %}
        {% for edu in person.education %}
          <div class="member-school">{{ edu }}</div>
        {% endfor %}
      {% endif %}
      {% if person.research_areas %}
        <div class="member-tags">
          {% for tag in person.research_areas %}
            <span class="research-tag">{{ tag }}</span>
          {% endfor %}
        </div>
      {% endif %}
      {% include member_links.liquid person=person %}
    </div>
  </div>
  {% endfor %}
</div>
{% endif %}

---

<!-- ── Undergraduate Students ─────────────────────────────── -->

{% if members.undergrad.size > 0 %}

## Undergraduate Students

<div class="members-list">
  {% for person in members.undergrad %}
  <div class="member-row-card scroll-reveal">
    <div class="member-avatar">
      {% if person.image %}
        <img src="{{ person.image | relative_url }}" alt="{{ person.name_en }}" class="member-photo">
      {% else %}
        <div class="member-initials-avatar">
          {{- person.name_en | split: " " | first | slice: 0 -}}{{- person.name_en | split: " " | last | slice: 0 -}}
        </div>
      {% endif %}
    </div>
    <div class="member-info">
      <div class="member-name">{{ person.name_en }}</div>
      <div class="member-name-ko">{{ person.name_ko }}</div>
      <div class="member-role">{{ person.role }}</div>
      {% if person.education %}
        {% for edu in person.education %}
          <div class="member-school">{{ edu }}</div>
        {% endfor %}
      {% endif %}
      {% if person.research_areas %}
        <div class="member-tags">
          {% for tag in person.research_areas %}
            <span class="research-tag">{{ tag }}</span>
          {% endfor %}
        </div>
      {% endif %}
      {% include member_links.liquid person=person %}
    </div>
  </div>
  {% endfor %}
</div>
{% endif %}

---

<!-- ── Alumni ──────────────────────────────────────────────── -->

## Alumni

### Intern Researchers

<div class="alumni-table-wrap scroll-reveal">
  <table class="alumni-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Period</th>
        <th>Affiliation</th>
        <th>Next Position</th>
      </tr>
    </thead>
    <tbody>
      {% for person in members.alumni.intern_alumni %}
      <tr>
        <td>{{ person.name_en }}</td>
        <td>{{ person.period }}</td>
        <td>{{ person.affiliation }}</td>
        <td>{% if person.next and person.next != "" %}{{ person.next }}{% else %}—{% endif %}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>

### Undergraduate Students

<div class="alumni-table-wrap scroll-reveal">
  <table class="alumni-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Period</th>
        <th>Affiliation</th>
        <th>Next Position</th>
      </tr>
    </thead>
    <tbody>
      {% for person in members.alumni.undergrad_alumni %}
      <tr>
        <td>{{ person.name_en }}</td>
        <td>{{ person.period }}</td>
        <td>{{ person.affiliation }}</td>
        <td>{% if person.next and person.next != "" %}{{ person.next }}{% else %}—{% endif %}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
