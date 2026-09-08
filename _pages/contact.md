---
layout: page
title: Contact
permalink: /contact/
description: Get in touch with the PIER Lab at KIST.
nav: true
nav_order: 5
---

<div class="contact-grid">

  <div class="contact-card scroll-reveal">
    <h3><i class="fa-solid fa-location-dot" style="margin-right: 0.5rem; color: #2d3a8c;"></i>Location</h3>
    <p>
      PIER Lab (Physical Intelligence &amp; Embodied Robotics Laboratory)<br>
      Center for Humanoid Research, KIST<br>
      5 Hwarang-ro 14-gil, Seongbuk-gu<br>
      Seoul 02792, Republic of Korea
    </p>
    <p style="margin-top:0.75rem;">
      <strong>Lab</strong> — Building L08, 4F, Room 8426<br>
      <strong>PI Office</strong> — Building L08, 3F, Room 8310
    </p>
  </div>

  <div class="contact-card scroll-reveal">
    <h3><i class="fa-solid fa-envelope" style="margin-right: 0.5rem; color: #2d3a8c;"></i>Email</h3>
    <p>
      PI: <a href="mailto:jang90@kist.re.kr">jang90@kist.re.kr</a><br>
      <span style="font-size:0.88rem;color:#666;">(Dr. Keunwoo Jang · 장근우)</span>
    </p>
  </div>

</div>

<div class="prospective-box scroll-reveal" style="margin-top: 2rem;">
  <h3><i class="fa-solid fa-graduation-cap" style="margin-right: 0.5rem;"></i>Prospective Students</h3>
  <p>
    We are actively looking for motivated students and researchers passionate about physical intelligence and embodied robotics. Our lab works on <strong>whole-body control of humanoid and mobile manipulator systems</strong>, <strong>visuomotor policy learning</strong>, <strong>imitation learning and teleoperation</strong>, and <strong>physically intelligent robotic systems</strong> for real-world deployment.
  </p>
  <p style="margin-top:0.75rem;">
    Openings are available for <strong>M.S. / Ph.D. students</strong> (through UST — Korea University of Science and Technology) and <strong>undergraduate / intern researchers</strong>. If you are interested, please send the following to <a href="mailto:jang90@kist.re.kr">jang90@kist.re.kr</a>:
  </p>
  <ul style="margin-top:0.5rem; padding-left:1.25rem;">
    <li>CV / résumé</li>
    <li>Academic transcripts</li>
    <li>Brief statement of research interest</li>
  </ul>
</div>

<!-- Open Positions -->

{% assign open_positions = site.data.positions.positions | where: "open", true %}
{% if open_positions.size > 0 %}

<div class="positions-section scroll-reveal" style="margin-top: 2.5rem;">
  <h2 style="font-size: 1.375rem; font-weight: 800; color: #1a1a2e; margin-bottom: 1.25rem;">Open Positions</h2>
  {% for pos in open_positions %}
  <div class="position-card">
    <h3>{{ pos.title }}</h3>
    <p>{{ pos.description }}</p>
    {% if pos.requirements %}
    <ul class="position-requirements">
      {% for req in pos.requirements %}
      <li>{{ req }}</li>
      {% endfor %}
    </ul>
    {% endif %}
    {% if pos.apply_url and pos.apply_url != "" %}
      <a href="{{ pos.apply_url | escape }}" target="_blank" rel="noopener noreferrer" class="position-apply-btn">Apply</a>
    {% else %}
      <a href="mailto:jang90@kist.re.kr?subject={{ pos.title | uri_escape }}" class="position-apply-btn">Apply by email</a>
    {% endif %}
  </div>
  {% endfor %}
</div>
{% endif %}
