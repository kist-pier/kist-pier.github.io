---
layout: page
permalink: /publications/
title: Publications
description: Publications by PIER Lab, in reversed chronological order.
nav: true
nav_order: 2
show_citations: true
---

<!-- _pages/publications.md -->

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<div class="publications">

{% bibliography %}

</div>

{% if site.data.citations.metadata.last_updated %}
<p class="text-muted small mt-4 citation-source">
  Citation counts from Google Scholar · Last updated: {{ site.data.citations.metadata.last_updated }}
</p>
{% endif %}
