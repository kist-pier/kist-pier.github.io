---
layout: page
title: Contact
permalink: /contact/
description: Get in touch with the PIER Lab at KIST.
nav: true
nav_order: 5
---

{% assign application = site.data.positions.application %}

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
  <h3><i class="fa-solid fa-user-group" style="margin-right: 0.5rem;"></i>Join PIER Lab</h3>
  <p>
    PIER Lab recruits researchers who want to build physically intelligent robots and validate their ideas on real hardware. Our work spans <strong>whole-body control for humanoid and mobile manipulator systems</strong>, <strong>visuomotor policy and imitation learning</strong>, <strong>teleoperation and robot data collection</strong>, and <strong>contact-rich manipulation</strong> for real-world deployment.
  </p>
  <p style="margin-top:0.75rem;">
    We currently accept applications only for <strong>postdoctoral researchers</strong>, <strong>M.S. students</strong>, <strong>research interns</strong>, and <strong>university field-placement / co-op students</strong>. Select the position you are applying for in the official online application form.
  </p>
  <p style="margin-top:0.75rem;"><strong>We are not currently recruiting Ph.D. students.</strong></p>
  <p style="margin-top:0.75rem;">
    Please prepare:
  </p>
  <ul style="margin-top:0.5rem; padding-left:1.25rem;">
    <li>CV / résumé</li>
    <li>Brief statement of research interest</li>
    <li>Academic transcripts (student applicants)</li>
    <li>Representative publications, code, or project links (if applicable)</li>
  </ul>
  {% if application.url and application.url != "" %}
    <p style="margin-top:1rem;">
      <a href="{{ application.url | escape }}" target="_blank" rel="noopener noreferrer" class="position-apply-btn">
        Open Application Form <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" style="margin-left:0.35rem;"></i>
      </a>
    </p>
  {% endif %}
  <p style="margin-top:0.85rem; font-size:0.88rem; color:#666;">
    For questions not covered by the form, contact <a href="mailto:jang90@kist.re.kr">jang90@kist.re.kr</a>.
  </p>
</div>
