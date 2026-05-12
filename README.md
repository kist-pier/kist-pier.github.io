# PIER Lab Website

The official website of **PIER Lab** — *Physical Intelligence & Embodied Robotics Lab* at the Center for Humanoid Research, Korea Institute of Science and Technology (KIST).

- **Live site**: https://pier-lab.kr
- **Repository**: https://github.com/kist-pier/kist-pier.github.io
- **PI**: Dr. Keunwoo Jang (장근우) — `jang90 [at] kist.re.kr`
- **Theme base**: [al-folio](https://github.com/alshedivat/al-folio) (heavily customized for PIER Lab)

---

## 1. How the site works

This is a **Jekyll** static site that auto-deploys to GitHub Pages.

```
push to `main` ──▶ .github/workflows/deploy.yml ──▶ jekyll build ──▶ purgecss ──▶ GitHub Pages
```

- Every commit to `main` triggers `.github/workflows/deploy.yml`, which builds the site with `bundle exec jekyll build` and publishes the result to GitHub Pages.
- Build typically takes 2–4 minutes. Watch progress at <https://github.com/kist-pier/kist-pier.github.io/actions>.
- **If you don't see your change live within ~5 minutes, check the latest workflow run** — a YAML/Liquid syntax error stops the build, and the site keeps serving the previous deploy.

---

## 2. Local development

You only need **Docker**.

```bash
# Start dev server (first run pulls Ruby/Jekyll image, ~3–5 min)
docker compose up

# Site available at http://localhost:8080
# Most edits hot-reload — refresh the browser.

# Stop the server
docker compose down
```

Edits to `_config.yml` require a **container restart** (`docker compose down && docker compose up`); other files reload automatically.

### Optional: format before committing

```bash
npm install --save-dev prettier @shopify/prettier-plugin-liquid   # first time only
npx prettier . --write
```

### Cleaning local build artifacts

`.jekyll-cache/` and `.tweet-cache/` are owned by the Docker container (`root`). To remove them:

```bash
docker compose down -v
sudo rm -rf .jekyll-cache .tweet-cache
```

---

## 3. Repository layout (what to edit for what)

```
kist-pier.github.io/
├── _config.yml              ← global site config (title, plugins, scholar, etc.)
├── _data/                   ← structured content edited as YAML
│   ├── members.yml          ← all lab members (PI, MS, interns, alumni)
│   ├── gallery.yml          ← photo gallery entries
│   ├── equipment.yml        ← /lab-equipment robots & hardware
│   ├── facilities.yml       ← /lab-equipment facilities/spaces
│   ├── positions.yml        ← /contact "Open Positions" section
│   ├── socials.yml          ← social-link icons
│   ├── citations.yml        ← scholar citation cache (auto-updated)
│   ├── coauthors.yml        ← coauthor metadata for publications
│   ├── venues.yml           ← venue badges/abbreviations
│   └── repositories.yml     ← (kept; not currently rendered)
├── _bibliography/
│   └── papers.bib           ← all publications, in BibTeX
├── _news/                   ← one Markdown file per news item
│   └── YYYY-MM-DD-slug.md
├── _pages/                  ← every visible page on the site
│   ├── about.md             ← Home page (/)
│   ├── projects.md          ← Research Areas (/research/)
│   ├── facilities.md        ← Lab & Equipment (/lab-equipment/)
│   ├── publications.md      ← Publications (/publications/)
│   ├── people.md            ← Members list (/people/)
│   ├── advisor.md           ← Faculty / PI (/people/advisor/)
│   ├── gallery.md           ← Gallery (/gallery/)
│   ├── contact.md           ← Contact (/contact/)
│   ├── news.md              ← News index (/news/)
│   ├── members-nav.md       ← Members dropdown spec (no body)
│   ├── research-nav.md      ← Research dropdown spec (no body)
│   └── 404.md               ← 404 page
├── _includes/               ← Liquid partials (header, footer, news, etc.)
├── _layouts/                ← Liquid page layouts
├── _sass/                   ← SCSS styles
│   └── _custom.scss         ← all PIER lab custom styles
├── assets/
│   ├── img/                 ← images served by the site (deployed)
│   │   ├── members/         ← member photos used by members.yml
│   │   ├── gallery/         ← gallery photos used by gallery.yml
│   │   ├── lab-equipment/   ← equipment/facility photos
│   │   └── logo.png, favicon, …
│   ├── css/, js/, fonts/    ← theme assets (avoid editing)
│   └── bibliography/        ← extra publication assets (PDFs, etc.)
├── _scripts/                ← small site JS (search, scroll-reveal, etc.)
├── _plugins/                ← Jekyll plugin extensions
├── bin/
│   ├── entry_point.sh       ← Docker entry point
│   └── update_scholar_citations.py  ← Scholar citation updater
├── Pictures/                ← raw originals & backups (NOT used by the site;
│                              excluded from build via _config.yml)
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml             ← build & deploy to GitHub Pages
│   │   ├── codeql.yml             ← code security scan
│   │   ├── update-citations.yml   ← refresh _data/citations.yml
│   │   └── update-tocs.yml        ← regenerate TOCs in markdown
├── Dockerfile, docker-compose*.yml ← local dev
├── Gemfile, Gemfile.lock           ← Ruby/Jekyll deps
├── package.json, package-lock.json ← prettier deps
└── README.md                       ← this file
```

> **Rule of thumb**: structured content lives in `_data/*.yml`, page-level content lives in `_pages/*.md`, presentation lives in `_sass/_custom.scss` and `_includes/*.liquid`.

---

## 4. Common maintenance tasks (recipe book)

### A. Add or update a lab member

File: **`_data/members.yml`**

- New M.S. student: append under `ms:` using the same shape as existing entries.
- New intern: append under `research_interns:`.
- New undergrad: append under `undergrad:`.
- A member who left: move their block from the active section to `alumni.intern_alumni` or `alumni.undergrad_alumni`, drop fields not needed for alumni (`email`, `image`, etc.), and add `period:` and `next:`.

Photo workflow:

1. Drop the original photo into `Pictures/members/` (raw archive).
2. Save a web-friendly copy (≤ 800 px wide, ~200–400 KB) into `assets/img/members/` using a snake-case filename, e.g. `seungseop_lee.jpg`.
3. Reference it from `members.yml` with `image: /assets/img/members/seungseop_lee.jpg`.

### B. Add a news item

Create `_news/YYYY-MM-DD-short-slug.md`:

```yaml
---
layout: post
date: 2026-04-29 09:00:00+0900
inline: true
related_posts: false
---

Your news text here. **Markdown** is fine — links, bold, etc.
```

The home page shows the latest 5 (configured by `announcements.limit` in `_pages/about.md`).

### C. Add a publication

File: **`_bibliography/papers.bib`** — one BibTeX entry per paper.

```bibtex
@article{shortkey2026,
  title    = {Your Paper Title},
  author   = {Lastname, Firstname and Jang, Keunwoo},
  journal  = {IEEE Robotics and Automation Letters},
  year     = {2026},
  selected = {true},      % include in home-page "Selected Publications"
  abbr     = {RA-L}
}
```

The Publications page renders everything; only entries with `selected = {true}` appear on the home page.

### D. Add a gallery photo

1. Place the image in `assets/img/gallery/` (recommend ≤ 1600 px wide, ≤ 500 KB).
2. Add an entry to `_data/gallery.yml` (sorted newest-first):

```yaml
  - image: "/assets/img/gallery/lablife_NN.jpg"
    caption: "Description shown on hover"
    category: "lab-life"
    date: "2026-04-29"
```

### E. Update Lab & Equipment

File: **`_data/equipment.yml`** (robots, manipulators, GPU servers, …) and **`_data/facilities.yml`** (rooms / spaces). Image conventions same as members.

### F. Edit the Home page hero / research cards

Inline HTML inside `_pages/about.md`. Custom styling lives in `_sass/_custom.scss` (look for `.hero-section`, `.research-areas`, `.pier-accent`, `.research-preview-card`).

### G. Open positions on the Contact page

Edit `_data/positions.yml`. Set `open: false` to grey out a position without deleting it.

### H. Change site title, footer, scholar account, etc.

`_config.yml`. Common keys:

- `title`, `description` — site identity
- `url`, `baseurl` — `https://pier-lab.kr` and empty
- `scholar.last_name`, `scholar.first_name` — controls the Scholar citation count

Restart Docker after editing `_config.yml`.

---

## 5. Branding / styling cheatsheet

| What | Where |
|------|-------|
| Brand accent color (`#8b9cf7`) | `.pier-accent` in `_sass/_custom.scss` |
| Hero (Home top) | `_pages/about.md` markup + `.hero-section` SCSS |
| Member card | `.member-row-card` in `_sass/_custom.scss` |
| Navbar | `_includes/header.liquid` + `_sass/_navbar.scss` |
| Footer | `_includes/footer.liquid` + `_sass/_footer.scss` |
| Selected publications block | `_includes/selected_papers.liquid` |
| Research detail tags | `.focus-tag` |

Avoid editing files under `_sass/` other than `_custom.scss` — those are theme files and may be overwritten by future al-folio updates.

---

## 6. Pre-flight checklist before pushing

1. `docker compose up` and click through every page locally:
   - Home, Research Areas, Lab & Equipment, Publications, Members, Faculty, Gallery, Contact, News.
   - Check that any new image actually loads (404s are silent in the navbar).
2. (Optional) `npx prettier . --write` to format YAML / Markdown / Liquid.
3. Commit with a short, descriptive message:
   ```bash
   git add -A
   git commit -m "Add: 2026-04 IROS paper, update members"
   git push origin main
   ```
4. Watch the Actions tab — build must finish green before the site updates.

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Site doesn't update after push | Check `Actions` tab — a failed `Deploy site` workflow keeps the previous version live. Most failures are YAML indent or unmatched Liquid `{% endif %}`. |
| New image shows broken on the site but works locally | Filename case mismatch (`Foo.JPG` vs `foo.jpg`). GitHub Pages is case-sensitive; rename to lowercase. |
| Member photo missing | Ensure both: (1) file copied into `assets/img/members/` and (2) `image:` path in `members.yml` matches exactly. |
| Publication not appearing on home page | Add `selected = {true}` to the BibTeX entry. |
| Citation counts wrong / stale | Wait for next nightly run of `update-citations.yml`, or trigger it manually in the Actions tab. |
| `docker compose up` errors with port in use | `docker compose down` to release port 8080, then retry. |
| Build fails on `purgecss` step | Usually a missing CSS file; check `purgecss.config.js` paths and the latest commit. |

---

## 8. Repo conventions

- **One commit per logical change.** Short imperative subject (e.g. `Add: Suhyeon Pyo intern profile`).
- **No AI co-author trailers.** Do not add `Co-Authored-By:` lines for AI assistants — the history was rewritten on 2026-03-08 to remove them and they should not return.
- **Don't commit** `_site/`, `node_modules/`, `.jekyll-cache/`, or `.tweet-cache/` (already gitignored).
- **`Pictures/`** is a raw archive of source images; the site itself reads from `assets/img/`. Treat `Pictures/` as a separate backup.

---

## 9. Quick links for new maintainers

- Live site: <https://pier-lab.kr>
- Actions / build status: <https://github.com/kist-pier/kist-pier.github.io/actions>
- Jekyll docs: <https://jekyllrb.com/docs/>
- Jekyll Scholar (publications): <https://github.com/inukshuk/jekyll-scholar>
- al-folio upstream (for theme reference only): <https://github.com/alshedivat/al-folio>

---

## License

Site theme is based on al-folio (MIT License — see `LICENSE`). Content (text, photos, publication info) is © PIER Lab / KIST and not licensed for reuse without permission.
