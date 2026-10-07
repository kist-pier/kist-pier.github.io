---
layout: page
title: PIER Lab Shop
permalink: /shop/
description: Lab goods for experiments, field days, and everything in between.
nav: false
sitemap: false
---

{% if site.shop.enabled %}

<section class="shop-intro" aria-labelledby="shop-collection-title">
  <div class="shop-intro-copy">
    <span class="shop-eyebrow">PIER LAB GOODS / DROP 01</span>
    <h2 id="shop-collection-title">Built for long experiments.</h2>
    <p>
      A small collection of lab essentials in PIER navy and teal—comfortable at a desk,
      durable around robots, and clean enough to wear anywhere else.
    </p>
  </div>
  <div class="shop-intro-mark" aria-hidden="true">
    <span>PIER</span>
    <small>Physical Intelligence<br>&amp; Embodied Robotics</small>
  </div>
</section>

<aside class="shop-preview-notice" aria-label="Local preview notice">
  <span class="shop-preview-label">LOCAL PREVIEW</span>
  <p>상품·가격·재고는 현재 시안입니다. 주문과 결제 기능은 아직 연결되지 않았습니다.</p>
</aside>

<div class="shop-product-grid">
  {% for product in site.data.shop.products %}
    <article class="shop-product-card scroll-reveal" id="{{ product.id }}">
      <div class="shop-product-visual">
        {% if product.badge %}<span class="shop-product-badge">{{ product.badge }}</span>{% endif %}
        <img
          src="{{ product.image | relative_url }}"
          alt="{{ product.name }} in {{ product.color }}"
          loading="{% if forloop.first %}eager{% else %}lazy{% endif %}"
          width="900"
          height="900"
        >
      </div>
      <div class="shop-product-body">
        <p class="shop-product-category">{{ product.category }}</p>
        <div class="shop-product-title-row">
          <div>
            <h2>{{ product.name }}</h2>
            <p class="shop-product-name-ko">{{ product.name_ko }}</p>
          </div>
          <strong class="shop-product-price">{{ product.price }}</strong>
        </div>
        <p class="shop-product-description">{{ product.description }}</p>

        <dl class="shop-product-options">
          <div>
            <dt>Color</dt>
            <dd><span class="shop-color-dot shop-color-{{ product.id }}"></span>{{ product.color }}</dd>
          </div>
          <div>
            <dt>Sizes</dt>
            <dd class="shop-size-list">
              {% for size in product.sizes %}<span>{{ size }}</span>{% endfor %}
            </dd>
          </div>
        </dl>

        <ul class="shop-product-details">
          {% for detail in product.details %}<li>{{ detail }}</li>{% endfor %}
        </ul>

        <button class="shop-order-button" type="button" disabled aria-disabled="true">
          Ordering opens soon
        </button>
      </div>
    </article>

{% endfor %}

</div>

<section class="shop-info" aria-labelledby="shop-info-title">
  <div class="shop-info-heading">
    <span class="shop-eyebrow">HOW IT WILL WORK</span>
    <h2 id="shop-info-title">A simple first drop.</h2>
  </div>
  <div class="shop-info-grid">
    {% for note in site.data.shop.notes %}
      <article>
        <span class="shop-info-icon" aria-hidden="true"><i class="fa-solid {{ note.icon }}"></i></span>
        <h3>{{ note.title }}</h3>
        <p>{{ note.body }}</p>
      </article>
    {% endfor %}
  </div>
</section>
{% else %}
<div class="shop-disabled">
  <p>The shop is currently available in the local preview only.</p>
</div>
{% endif %}
