---
layout: page
title: Research Areas
permalink: /research/
description: We develop algorithms and systems for robots that physically interact with complex real-world environments.
nav: false
nav_order: 1
---

<div class="research-page" data-reveal-group="research">

  <div class="research-detail-card scroll-reveal">
    <div class="research-detail-header">
      <span class="research-detail-icon"><i class="fa-solid fa-hand-fist"></i></span>
      <h3>Physical Embodiment</h3>
    </div>
    <p class="research-detail-desc">
      We integrate force-aware control and tactile sensing to enhance the physical capabilities of
      robotic systems. By processing high-fidelity contact feedback and haptic data, our robots
      achieve safe and stable interaction in unstructured environments, moving beyond purely
      vision-based approaches.
    </p>
    <div class="research-detail-meta">
      <strong>Focus:</strong>
      <span class="focus-tag">force control</span>
      <span class="focus-tag">tactile feedback</span>
      <span class="focus-tag">hardware-software co-design</span>
      <span class="focus-tag">contact-rich interaction</span>
    </div>
  </div>

  <div class="research-detail-card scroll-reveal">
    <div class="research-detail-header">
      <span class="research-detail-icon"><i class="fa-solid fa-eye"></i></span>
      <h3>Visuomotor Policy</h3>
    </div>
    <p class="research-detail-desc">
      We build end-to-end learning systems that map sensory inputs directly to motor commands.
      Utilizing imitation learning and Vision-Language-Action (VLA) models, our research enables
      robots to generalize across diverse tasks and follow complex natural language instructions
      in real-world settings.
    </p>
    <div class="research-detail-meta">
      <strong>Focus:</strong>
      <span class="focus-tag">imitation learning</span>
      <span class="focus-tag">VLA</span>
      <span class="focus-tag">foundation models for robotics</span>
      <span class="focus-tag">few-shot policy learning</span>
    </div>
  </div>

  <div class="research-detail-card scroll-reveal">
    <div class="research-detail-header">
      <span class="research-detail-icon"><i class="fa-solid fa-robot"></i></span>
      <h3>Whole-Body Control</h3>
    </div>
    <p class="research-detail-desc">
      We develop optimization-based control frameworks for high-degree-of-freedom robotic systems.
      By leveraging Hierarchical Quadratic Programming (HQP) for multi-objective constraint
      satisfaction and Model Predictive Path Integral (MPPI) for nonlinear dynamics, we enable
      agile, balanced, and coordinated full-body movements.
    </p>
    <div class="research-detail-meta">
      <strong>Focus:</strong>
      <span class="focus-tag">HQP optimization</span>
      <span class="focus-tag">MPPI</span>
      <span class="focus-tag">dynamic locomotion</span>
      <span class="focus-tag">multi-contact planning</span>
    </div>
  </div>

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

<div class="project-grid">

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
        title="Latent-action flow-matching VLA mug-tree manipulation Short"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="project-body">
      <span class="focus-tag" style="margin-bottom:0.75rem;display:inline-block;">Visuomotor Policy · Shorts</span>
      <h3>Latent-Action VLA for Mug-Tree Manipulation</h3>
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

</div>
