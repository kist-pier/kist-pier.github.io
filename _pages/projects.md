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

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/Ne1Hq8tVIxE"
        title="AgileDP: quantizing diffusion policy (CoRL 2026)"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Visuomotor Policy &middot; CoRL 2026</span>
      <h3>AgileDP &mdash; Quantizing Diffusion Policy</h3>
      <p>The demonstration for our CoRL 2026 paper, which quantizes diffusion policies through dynamic scaling and reweighted distillation.</p>
      <div class="project-tags">
        <span class="focus-tag">diffusion policy</span>
        <span class="focus-tag">quantization</span>
        <span class="focus-tag">CoRL 2026</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/lQ_y--EV3I8"
        title="IGRIS-C bimanual manipulation with ACT"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Visuomotor Policy</span>
      <h3>IGRIS-C Bimanual Manipulation</h3>
      <p>ACT-based imitation learning driving bimanual manipulation on our IGRIS-C platform.</p>
      <div class="project-tags">
        <span class="focus-tag">ACT</span>
        <span class="focus-tag">imitation learning</span>
        <span class="focus-tag">bimanual manipulation</span>
        <span class="focus-tag">IGRIS-C</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/7SihLREjGUU"
        title="FR3 door opening and object placement with ACT"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Visuomotor Policy</span>
      <h3>FR3 Door Opening and Object Placement</h3>
      <p>An ACT-based Franka FR3 manipulation demonstration combining door opening with object placement.</p>
      <div class="project-tags">
        <span class="focus-tag">ACT</span>
        <span class="focus-tag">manipulation</span>
        <span class="focus-tag">contact-rich task</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/1UGTUN5sOFA"
        title="Latent-action flow-matching VLA mug-tree manipulation"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Visuomotor Policy &middot; Shorts</span>
      <h3>Latent-Action VLA</h3>
      <p>A short demonstration of hanging a cup on a mug tree using a latent-action-space flow-matching VLA.</p>
      <div class="project-tags">
        <span class="focus-tag">VLA</span>
        <span class="focus-tag">flow matching</span>
        <span class="focus-tag">latent action</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/cqwowtTqkh0"
        title="Hand-over manipulation running on Jetson Orin"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Visuomotor Policy</span>
      <h3>On-Device Policy Inference</h3>
      <p>Running a learned manipulation policy within the compute and memory budget of embedded hardware &mdash; a hand-over task inferring on an NVIDIA Jetson Orin.</p>
      <div class="project-tags">
        <span class="focus-tag">on-board inference</span>
        <span class="focus-tag">Jetson Orin</span>
        <span class="focus-tag">hand-over</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/Ul8FCtOhl58"
        title="G1 stair walking with reinforcement learning"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Whole-Body Control</span>
      <h3>G1 Stair Walking with Reinforcement Learning</h3>
      <p>An RL-based locomotion demonstration of the Unitree G1 humanoid walking on stairs.</p>
      <div class="project-tags">
        <span class="focus-tag">reinforcement learning</span>
        <span class="focus-tag">humanoid</span>
        <span class="focus-tag">locomotion</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/mH7Cl8D0gdQ"
        title="G1 whole-body teleoperation with RL and PICO"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Whole-Body Control</span>
      <h3>G1 Whole-Body Teleoperation</h3>
      <p>A whole-body teleoperation demonstration for the Unitree G1 using reinforcement learning and PICO.</p>
      <div class="project-tags">
        <span class="focus-tag">teleoperation</span>
        <span class="focus-tag">reinforcement learning</span>
        <span class="focus-tag">PICO</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/kM8krLXtw8c"
        title="Self-collision avoidance in whole-body control with MPPI"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Whole-Body Control</span>
      <h3>Self-Collision Avoidance in Whole-Body Control</h3>
      <p>Keeping a high-degree-of-freedom robot clear of self-collision while it tracks its task objectives, here with an MPPI formulation.</p>
      <div class="project-tags">
        <span class="focus-tag">MPPI</span>
        <span class="focus-tag">self-collision avoidance</span>
        <span class="focus-tag">whole-body control</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/W1N5YrBhMac"
        title="Indoor navigation on the Unitree G1 with MPPI"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Whole-Body Control</span>
      <h3>Indoor Navigation with MPPI</h3>
      <p>Model Predictive Path Integral control for indoor navigation, demonstrated on the Unitree G1 humanoid.</p>
      <div class="project-tags">
        <span class="focus-tag">MPPI</span>
        <span class="focus-tag">indoor navigation</span>
        <span class="focus-tag">humanoid</span>
      </div>
    </div>
  </div>

  <div class="project-card scroll-reveal">
    <div class="project-video-wrap">
      <iframe
        src="https://www.youtube-nocookie.com/embed/yFcK23lYpCs"
        title="Navigation with dynamic obstacle avoidance on the Unitree G1"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Whole-Body Control</span>
      <h3>Dynamic Obstacle Avoidance</h3>
      <p>Reliable avoidance of moving obstacles during navigation, building on our CSC-MPPI framework (IROS 2025).</p>
      <div class="project-tags">
        <span class="focus-tag">CSC-MPPI</span>
        <span class="focus-tag">dynamic obstacles</span>
        <span class="focus-tag">navigation</span>
      </div>
    </div>
  </div>

</div>
