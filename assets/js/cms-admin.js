(function () {
  "use strict";

  const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content.trim() || "";
  const config = {
    supabaseUrl: meta("pier-cms-url").replace(/\/$/, ""),
    publishableKey: meta("pier-cms-key"),
    localDemoEnabled: meta("pier-cms-local-demo") === "true"
      && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname),
  };

  const LOCAL_DEMO_EMAIL = "admin@pier-lab.local";
  const LOCAL_DEMO_PASSWORD = "PIER-local-2026!";
  // Set while a recovery link is being used, cleared only after the password is actually changed,
  // so reloading the page cannot skip the mandatory password change.
  const RECOVERY_PENDING_KEY = "pier-cms:recovery-pending";
  const LOCAL_DEMO_RESOURCES = [
    { id: "page:home", label: "Home", group: "Pages", path: "_pages/about.md" },
    { id: "page:research", label: "Research Areas & Projects", group: "Pages", path: "_pages/projects.md" },
    { id: "page:contact", label: "Contact", group: "Pages", path: "_pages/contact.md" },
    { id: "data:members", label: "Members", group: "Structured data", path: "_data/members.yml" },
    { id: "data:equipment", label: "Lab equipment", group: "Structured data", path: "_data/equipment.yml" },
    { id: "data:facilities", label: "Facilities", group: "Structured data", path: "_data/facilities.yml" },
    { id: "data:gallery", label: "Gallery", group: "Structured data", path: "_data/gallery.yml" },
    { id: "data:positions", label: "Open positions", group: "Structured data", path: "_data/positions.yml" },
    { id: "bibliography:papers", label: "Publications (BibTeX)", group: "Publications", path: "_bibliography/papers.bib" },
    { id: "settings:site", label: "Site settings (advanced)", group: "Advanced", path: "_config.yml" },
  ];

  const elements = {
    login: document.getElementById("cms-login"),
    loginForm: document.getElementById("login-form"),
    loginStatus: document.getElementById("login-status"),
    forgotPassword: document.getElementById("forgot-password"),
    recoveryForm: document.getElementById("recovery-form"),
    recoveryStatus: document.getElementById("recovery-status"),
    setupNotice: document.getElementById("cms-setup-notice"),
    demoNotice: document.getElementById("cms-demo-notice"),
    demoBanner: document.getElementById("cms-demo-banner"),
    app: document.getElementById("cms-app"),
    navigation: document.getElementById("cms-navigation"),
    workspaceTitle: document.getElementById("workspace-title"),
    accountName: document.getElementById("account-name"),
    accountRole: document.getElementById("account-role"),
    signOut: document.getElementById("sign-out"),
    globalStatus: document.getElementById("global-status"),
    adminEditor: document.getElementById("admin-editor"),
    memberEditor: document.getElementById("member-editor"),
    newsCreator: document.getElementById("news-creator"),
    resourceSelect: document.getElementById("resource-select"),
    resourcePath: document.getElementById("resource-path"),
    resourceSha: document.getElementById("resource-sha"),
    sourceEditor: document.getElementById("source-editor"),
    saveResource: document.getElementById("save-resource"),
    reloadResource: document.getElementById("reload-resource"),
    newsForm: document.getElementById("news-form"),
    memberForm: document.getElementById("member-form"),
    membersEditor: document.getElementById("members-editor"),
    membersSections: document.getElementById("members-sections"),
    membersSha: document.getElementById("members-sha"),
    membersSave: document.getElementById("members-save"),
    membersReload: document.getElementById("members-reload"),
    newsManager: document.getElementById("news-manager"),
    newsListView: document.getElementById("news-list-view"),
    newsEditView: document.getElementById("news-edit-view"),
    newsItems: document.getElementById("news-items"),
    newsCount: document.getElementById("news-count"),
    newsReload: document.getElementById("news-reload"),
    newsNew: document.getElementById("news-new"),
    newsCreateBack: document.getElementById("news-create-back"),
    newsEditBack: document.getElementById("news-edit-back"),
    newsEditTitle: document.getElementById("news-edit-title"),
    newsEditPath: document.getElementById("news-edit-path"),
    newsEditSha: document.getElementById("news-edit-sha"),
    newsEditDate: document.getElementById("news-edit-date"),
    newsEditDisplay: document.getElementById("news-edit-display"),
    newsEditBody: document.getElementById("news-edit-body"),
    newsEditSave: document.getElementById("news-edit-save"),
    galleryEditor: document.getElementById("gallery-editor"),
    galleryItems: document.getElementById("gallery-items"),
    galleryCount: document.getElementById("gallery-count"),
    gallerySha: document.getElementById("gallery-sha"),
    gallerySave: document.getElementById("gallery-save"),
    galleryReload: document.getElementById("gallery-reload"),
    galleryAdd: document.getElementById("gallery-add"),
    galleryFile: document.getElementById("gallery-file"),
    pubsManager: document.getElementById("pubs-manager"),
    pubsListView: document.getElementById("pubs-list-view"),
    pubsEditView: document.getElementById("pubs-edit-view"),
    pubsItems: document.getElementById("pubs-items"),
    pubsCount: document.getElementById("pubs-count"),
    pubsSha: document.getElementById("pubs-sha"),
    pubsReload: document.getElementById("pubs-reload"),
    pubsNew: document.getElementById("pubs-new"),
    pubsEditBack: document.getElementById("pubs-edit-back"),
    pubsEditTitle: document.getElementById("pubs-edit-title"),
    pubsFields: document.getElementById("pubs-fields"),
    pubsBibtex: document.getElementById("pubs-bibtex"),
    pubsFill: document.getElementById("pubs-fill"),
    pubsEditSave: document.getElementById("pubs-edit-save"),
    dataEditor: document.getElementById("data-editor"),
    dataTitle: document.getElementById("data-title"),
    dataCount: document.getElementById("data-count"),
    dataPath: document.getElementById("data-path"),
    dataSha: document.getElementById("data-sha"),
    dataItems: document.getElementById("data-items"),
    dataReload: document.getElementById("data-reload"),
    dataAdd: document.getElementById("data-add"),
    dataSave: document.getElementById("data-save"),
    piEditor: document.getElementById("pi-editor"),
    piBody: document.getElementById("pi-body"),
    piSha: document.getElementById("pi-sha"),
    piSave: document.getElementById("pi-save"),
    piReload: document.getElementById("pi-reload"),
    tabs: document.getElementById("cms-tabs"),
  };

  // The sidebar lists groups; a group with more than one screen shows them as tabs, so the
  // eleven editors stay reachable without eleven sidebar entries.
  const NAV_GROUPS = [
    { label: "Members", tabs: [
      { key: "members", label: "Students" },
      { key: "pi", label: "Advisor (PI)" },
      { key: "alumni_intern", label: "Alumni (interns)", collection: "alumni_intern" },
      { key: "alumni_undergrad", label: "Alumni (undergrad)", collection: "alumni_undergrad" },
    ] },
    { label: "News", tabs: [{ key: "news", label: "News" }] },
    { label: "Gallery", tabs: [{ key: "gallery", label: "Gallery" }] },
    { label: "Publications", tabs: [{ key: "pubs", label: "Publications" }] },
    { label: "Lab info", tabs: [
      { key: "equipment", label: "Lab equipment", collection: "equipment" },
      { key: "facilities", label: "Facilities", collection: "facilities" },
      { key: "positions", label: "Open positions", collection: "positions" },
    ] },
    { label: "Website content", tabs: [{ key: "content", label: "Website content" }] },
  ];

  // The four link buttons the advisor page renders, in the order they appear there.
  const PI_LINKS = [
    { name: "email", label: "Email", placeholder: "name@kist.re.kr" },
    { name: "scholar", label: "Google Scholar", placeholder: "https://scholar.google.com/citations?user=..." },
    { name: "github", label: "GitHub", placeholder: "https://github.com/..." },
    { name: "website", label: "Website", placeholder: "https://..." },
  ];
  const PI_RECORD_LISTS = [
    { name: "education", label: "Education", keys: [
      { key: "year", label: "기간" }, { key: "degree", label: "학위" }, { key: "institution", label: "소속" }] },
    { name: "career", label: "Career", keys: [
      { key: "period", label: "기간" }, { key: "title", label: "직위" }, { key: "institution", label: "소속" }] },
  ];


  const PUB_TYPES = ["article", "inproceedings", "incollection", "phdthesis", "misc"];
  const PUB_FIELDS = [
    { name: "key", label: "Citation key", required: true, hint: "예: joung2026agiledp" },
    { name: "type", label: "Entry type", select: PUB_TYPES },
    { name: "title", label: "Title", wide: true, required: true },
    { name: "author", label: "Authors", wide: true, required: true, hint: "Last, First and Last, First" },
    { name: "journal", label: "Journal" },
    { name: "booktitle", label: "Booktitle (학회)" },
    { name: "year", label: "Year", required: true },
    { name: "abbr", label: "Abbr (배지에 표시)" },
    { name: "volume", label: "Volume" },
    { name: "number", label: "Number" },
    { name: "pages", label: "Pages" },
    { name: "publisher", label: "Publisher" },
    { name: "school", label: "School" },
    { name: "doi", label: "DOI" },
    { name: "url", label: "URL" },
    { name: "arxiv", label: "arXiv id" },
    { name: "preview", label: "Preview 이미지 파일명" },
    { name: "abstract", label: "Abstract", wide: true, area: true },
    { name: "selected", label: "Selected (대표 논문)", bool: true },
    { name: "bibtex_show", label: "BibTeX 버튼 표시", bool: true },
    { name: "show_all_authors", label: "저자 전체 표시", bool: true },
  ];

  // The four sections that share one field set. PI and alumni keep the raw-source editor.
  const MEMBER_SECTIONS = [
    { key: "phd", label: "Ph.D. Students", prefix: "phd" },
    { key: "ms", label: "M.S. Students", prefix: "ms" },
    { key: "research_interns", label: "Research Interns", prefix: "intern" },
    { key: "undergrad", label: "Undergraduate Researchers", prefix: "undergrad" },
  ];
  const MEMBER_TEXT_FIELDS = [
    { name: "name_en", label: "English name", required: true },
    { name: "name_ko", label: "한글 이름" },
    { name: "role", label: "Role", required: true },
    { name: "email", label: "Email" },
    { name: "github", label: "GitHub URL", placeholder: "https://github.com/..." },
  ];
  const PHOTO_SIZE = 600;

  let client;
  let profile;
  let resources = [];
  let currentResource;
  let memberSha;
  let demoMode = false;

  function demoKey(resourceId) {
    return `pier-cms-demo:resource:${resourceId}`;
  }

  function demoRevision() {
    return `demo${Date.now().toString(36)}`;
  }

  function demoNewsResources() {
    try {
      const value = JSON.parse(window.localStorage.getItem("pier-cms-demo:news") || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function demoPlaceholder(resource) {
    return [
      "# Local CMS demo",
      "",
      `# Source: ${resource.path}`,
      "# 이 편집기는 관리자 작업 흐름을 확인하기 위한 localhost 전용 미리보기입니다.",
      "# 여기에서 저장한 내용은 현재 브라우저에만 남고 GitHub에는 커밋되지 않습니다.",
      "",
    ].join("\n");
  }

  async function invokeDemo(body) {
    if (body.action === "me") {
      return {
        profile: { email: LOCAL_DEMO_EMAIL, display_name: "PIER Lab Local Admin", role: "admin", member_id: null },
        resources: [...LOCAL_DEMO_RESOURCES, ...demoNewsResources()],
      };
    }

    if (body.action === "admin.pi.read") {
      return { sha: demoRevision(), member_id: "pi-demo", pi: { research_interests: [], awards: [], education: [], career: [] } };
    }

    if (body.action === "admin.data.read") {
      return { sha: demoRevision(), collection: body.collection, label: "Demo", path: "-", uploads: false, fields: [], items: [] };
    }

    if (body.action === "admin.pubs.read") {
      return { sha: demoRevision(), editable: [], entries: [] };
    }

    if (body.action === "admin.gallery.read") {
      return { sha: demoRevision(), categories: ["lab-life", "conferences"], photos: [] };
    }

    if (body.action === "admin.news.list") {
      return { items: demoNewsResources().map((item) => ({ id: item.id, name: item.label, path: item.path, date: item.label.slice(0, 10), slug: item.label.slice(11, -3) })) };
    }

    if (body.action === "admin.members.read") {
      return { sha: demoRevision(), sections: { phd: [], ms: [], research_interns: [], undergrad: [] } };
    }

    if (body.action === "admin.read") {
      const resource = [...LOCAL_DEMO_RESOURCES, ...demoNewsResources()].find((item) => item.id === body.resource_id);
      if (!resource) throw new Error("데모 콘텐츠를 찾을 수 없습니다.");
      return {
        content: window.localStorage.getItem(demoKey(resource.id)) || demoPlaceholder(resource),
        path: resource.path,
        sha: demoRevision(),
      };
    }

    if (body.action === "admin.save") {
      window.localStorage.setItem(demoKey(body.resource_id), String(body.content || ""));
      return { sha: demoRevision() };
    }

    if (body.action === "admin.news.create") {
      const filename = `${body.date}-${body.slug}.md`;
      const resource = { id: `news:${filename}`, label: filename, group: "News", path: `_news/${filename}` };
      const content = [
        "---",
        `date: ${body.date}`,
        body.display_date ? `display_date: ${body.display_date}` : "",
        "---",
        String(body.body || ""),
        "",
      ].filter(Boolean).join("\n");
      const news = demoNewsResources().filter((item) => item.id !== resource.id);
      news.push(resource);
      window.localStorage.setItem("pier-cms-demo:news", JSON.stringify(news));
      window.localStorage.setItem(demoKey(resource.id), content);
      return { resource };
    }

    throw new Error("로컬 데모에서 지원하지 않는 작업입니다.");
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = busyLabel;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  }

  function showStatus(message, type = "") {
    elements.globalStatus.textContent = message;
    elements.globalStatus.className = `notice${type ? ` notice-${type}` : ""}`;
    elements.globalStatus.hidden = !message;
  }

  function panelFor(key) {
    const panels = {
      members: elements.membersEditor,
      pi: elements.piEditor,
      gallery: elements.galleryEditor,
      pubs: elements.pubsManager,
      news: elements.newsManager,
      newsNew: elements.newsCreator,
      content: elements.adminEditor,
      profile: elements.memberEditor,
    };
    // Anything else is a _data collection, which all share one panel.
    return panels[key] || elements.dataEditor;
  }

  function allTabs() {
    return NAV_GROUPS.flatMap((group) => group.tabs);
  }

  function groupFor(key) {
    // "New item" has no tab of its own; it belongs to News.
    const owner = key === "newsNew" ? "news" : key;
    return NAV_GROUPS.find((group) => group.tabs.some((tab) => tab.key === owner));
  }

  function renderTabs(key) {
    const group = groupFor(key);
    if (!group || group.tabs.length < 2) {
      elements.tabs.replaceChildren();
      elements.tabs.hidden = true;
      return;
    }
    elements.tabs.hidden = false;
    elements.tabs.replaceChildren(...group.tabs.map((tab) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cms-tab${tab.key === key ? " active" : ""}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", tab.key === key ? "true" : "false");
      button.textContent = tab.label;
      button.addEventListener("click", () => activate(tab.key));
      return button;
    }));
  }

  function showView(view) {
    const target = panelFor(view);
    [
      elements.membersEditor, elements.piEditor, elements.galleryEditor,
      elements.pubsManager, elements.newsManager, elements.newsCreator,
      elements.adminEditor, elements.memberEditor, elements.dataEditor,
    ].forEach((node) => { node.hidden = node !== target; });

    const group = groupFor(view);
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.classList.toggle("active", Boolean(group) && button.dataset.group === group.label);
    });
    renderTabs(view);

    const tab = allTabs().find((entry) => entry.key === view);
    const titles = { newsNew: "New News", profile: "My Profile" };
    elements.workspaceTitle.textContent =
      titles[view] || (tab ? tab.label : "Content");
    showStatus("");
  }

  // Each screen fetches its data on first visit rather than at sign-in.
  function activate(key) {
    showView(key);
    const tab = allTabs().find((entry) => entry.key === key);
    if (key === "members") {
      if (!membersSha) loadMembers();
    } else if (key === "pi") {
      if (!piSha) loadPi();
    } else if (key === "news") {
      showNewsList();
      loadNews();
    } else if (key === "gallery") {
      if (!gallerySha) loadGallery();
    } else if (key === "pubs") {
      showPubsList();
      if (!pubsSha) loadPubs();
    } else if (tab && tab.collection) {
      if (dataState.collection !== tab.collection) loadData(tab.collection);
    } else if (key === "content" && !currentResource && resources.length) {
      loadResource(elements.resourceSelect.value || resources[0].id);
    }
  }

  async function invoke(body) {
    if (demoMode) return invokeDemo(body);
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");

    const response = await fetch(`${config.supabaseUrl}/functions/v1/cms-content`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `요청이 실패했습니다 (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function renderNavigation() {
    const groups = profile.role === "admin" ? NAV_GROUPS : [];
    const buttons = groups.map((group, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nav-button${index === 0 ? " active" : ""}`;
      button.dataset.group = group.label;
      button.textContent = group.label;
      button.addEventListener("click", () => activate(group.tabs[0].key));
      return button;
    });
    if (profile.member_id) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-button";
      button.dataset.group = "My profile";
      button.textContent = "My profile";
      button.addEventListener("click", () => showView("profile"));
      buttons.push(button);
    }
    elements.navigation.replaceChildren(...buttons);
  }

  function renderResourceOptions() {
    const groups = new Map();
    resources.forEach((resource) => {
      if (!groups.has(resource.group)) groups.set(resource.group, []);
      groups.get(resource.group).push(resource);
    });

    elements.resourceSelect.replaceChildren(...Array.from(groups, ([label, items]) => {
      const group = document.createElement("optgroup");
      group.label = label;
      items.forEach((resource) => {
        const option = document.createElement("option");
        option.value = resource.id;
        option.textContent = resource.label;
        group.append(option);
      });
      return group;
    }));
  }

  async function loadResource(resourceId) {
    const resource = resources.find((item) => item.id === resourceId);
    if (!resource) return;
    currentResource = null;
    elements.sourceEditor.value = "Loading…";
    elements.sourceEditor.disabled = true;
    elements.saveResource.disabled = true;
    showStatus("");
    try {
      const data = await invoke({ action: "admin.read", resource_id: resource.id });
      currentResource = { ...resource, sha: data.sha };
      elements.sourceEditor.value = data.content;
      elements.resourcePath.textContent = data.path;
      elements.resourceSha.textContent = `revision ${data.sha.slice(0, 8)}`;
    } catch (error) {
      elements.sourceEditor.value = "";
      showStatus(error.message, "error");
    } finally {
      elements.sourceEditor.disabled = false;
      elements.saveResource.disabled = !currentResource;
    }
  }

  function lines(value) {
    return Array.isArray(value) ? value.join("\n") : "";
  }

  function setFormValue(name, value) {
    const field = elements.memberForm.elements.namedItem(name);
    if (field) field.value = value || "";
  }

  async function loadMemberProfile() {
    try {
      const data = await invoke({ action: "member.read" });
      memberSha = data.sha;
      const member = data.member;
      setFormValue("name_en", member.name_en);
      setFormValue("name_ko", member.name_ko);
      setFormValue("email", member.email);
      setFormValue("github", member.github);
      setFormValue("cv", member.cv);
      setFormValue("website", member.website);
      setFormValue("affiliation", member.affiliation);
      setFormValue("education", lines(member.education));
      setFormValue("research_areas", lines(member.research_areas));
      setFormValue("bio", member.bio);
    } catch (error) {
      showStatus(error.message, "error");
      elements.memberForm.querySelectorAll("input, textarea, button").forEach((node) => { node.disabled = true; });
    }
  }

  let membersSha = "";
  let fieldSeq = 0;

  function slugify(value) {
    return String(value || "").toLowerCase().normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function labelled(text, control, wide) {
    const wrap = document.createElement("div");
    if (wide) wrap.className = "form-wide";
    const label = document.createElement("label");
    control.id = `mf-${fieldSeq += 1}`;
    label.setAttribute("for", control.id);
    label.textContent = text;
    wrap.append(label, control);
    return wrap;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(file);
    });
  }

  // Shared by the photo and CV pickers: hold the button busy, run the upload, report the result.
  async function withUpload(button, busyMessage, run) {
    button.classList.add("is-busy");
    showStatus(busyMessage);
    try {
      showStatus(await run(), "success");
    } catch (error) {
      showStatus(error.message, "error");
    } finally {
      button.classList.remove("is-busy");
    }
  }

  // Redraw the photo to the 600x600 JPEG every other member photo already uses, so a 5 MB
  // phone picture becomes ~50 KB and the filename/format convention cannot drift.
  function resizeToJpeg(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("이미지 형식을 인식하지 못했습니다."));
        image.onload = () => {
          const side = Math.min(image.width, image.height);
          const canvas = document.createElement("canvas");
          canvas.width = PHOTO_SIZE;
          canvas.height = PHOTO_SIZE;
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
          // Square crop from the top centre, matching object-position: center top on the site.
          context.drawImage(image, (image.width - side) / 2, 0, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Gallery photos keep their aspect ratio; only the long edge is capped.
  function resizeToJpegMax(file, maxEdge, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("이미지 형식을 인식하지 못했습니다."));
        image.onload = () => {
          const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function buildMemberCard(section, member, isNew) {
    const card = document.createElement("article");
    card.className = "member-edit-card";
    card.dataset.section = section.key;

    const photo = document.createElement("div");
    photo.className = "member-edit-photo";
    const preview = document.createElement("img");
    preview.alt = "";
    preview.className = "member-edit-preview";
    if (member.image) preview.src = member.image;
    else preview.hidden = true;
    const empty = document.createElement("div");
    empty.className = "member-edit-nophoto";
    empty.textContent = "사진 없음";
    empty.hidden = Boolean(member.image);

    const pickLabel = document.createElement("label");
    pickLabel.className = "button button-secondary member-edit-pick";
    pickLabel.textContent = "사진 올리기";
    const pick = document.createElement("input");
    pick.type = "file";
    pick.accept = "image/*";
    pick.hidden = true;
    pickLabel.append(pick);
    photo.append(preview, empty, pickLabel);

    const hiddenImage = document.createElement("input");
    hiddenImage.type = "hidden";
    hiddenImage.dataset.field = "image";
    hiddenImage.value = member.image || "";
    card.append(hiddenImage);

    const fields = document.createElement("div");
    fields.className = "member-edit-fields";

    const id = document.createElement("input");
    id.type = "text";
    id.dataset.field = "id";
    id.value = member.id || "";
    id.readOnly = !isNew;
    if (isNew) id.placeholder = `${section.prefix}-hong-gildong`;
    fields.append(labelled("Member id", id));

    MEMBER_TEXT_FIELDS.forEach((spec) => {
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.field = spec.name;
      input.value = member[spec.name] || "";
      if (spec.placeholder) input.placeholder = spec.placeholder;
      if (spec.required) input.required = true;
      fields.append(labelled(spec.required ? `${spec.label} *` : spec.label, input));
    });

    const affiliation = document.createElement("input");
    affiliation.type = "text";
    affiliation.dataset.field = "affiliation";
    affiliation.value = member.affiliation || "";
    fields.append(labelled("Affiliation", affiliation, true));

    // CV: upload a PDF straight into assets/pdf, or paste an external address.
    const cv = document.createElement("input");
    cv.type = "text";
    cv.dataset.field = "cv";
    cv.value = member.cv || "";
    cv.placeholder = "/assets/pdf/name_cv.pdf";
    const cvRow = document.createElement("div");
    cvRow.className = "form-wide member-edit-cv";
    const cvPickLabel = document.createElement("label");
    cvPickLabel.className = "button button-secondary member-edit-pick";
    cvPickLabel.textContent = "PDF 올리기";
    const cvPick = document.createElement("input");
    cvPick.type = "file";
    cvPick.accept = "application/pdf,.pdf";
    cvPick.hidden = true;
    cvPickLabel.append(cvPick);
    cvRow.append(labelled("CV (PDF 업로드 또는 주소 입력)", cv), cvPickLabel);
    fields.append(cvRow);

    [["education", "Education"], ["research_areas", "Research areas"]].forEach(([name, label]) => {
      const area = document.createElement("textarea");
      area.rows = 3;
      area.dataset.field = name;
      area.value = (member[name] || []).join("\n");
      fields.append(labelled(`${label} (한 줄에 하나)`, area, true));
    });

    // Auto-fill the id for a new member from the English name, but leave it editable.
    if (isNew) {
      const nameInput = fields.querySelector('[data-field="name_en"]');
      nameInput.addEventListener("input", () => {
        if (id.dataset.touched === "true") return;
        const slug = slugify(nameInput.value);
        id.value = slug ? `${section.prefix}-${slug}` : "";
      });
      id.addEventListener("input", () => { id.dataset.touched = "true"; });
    }

    // A file is written under a name derived from the member id, so the id has to exist first.
    const chosenFile = (input) => {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file) return null;
      if (!id.value.trim()) {
        showStatus("파일을 올리기 전에 Member id를 먼저 정해 주세요.", "error");
        return null;
      }
      return file;
    };

    pick.addEventListener("change", () => {
      const file = chosenFile(pick);
      if (!file) return;
      withUpload(pickLabel, "사진을 올리는 중입니다…", async () => {
        const dataUrl = await resizeToJpeg(file);
        const data = await invoke({
          action: "admin.members.image",
          member_id: id.value.trim(),
          content_base64: dataUrl.split(",")[1],
        });
        hiddenImage.value = data.image;
        preview.src = dataUrl;
        preview.hidden = false;
        empty.hidden = true;
        return "사진을 올렸습니다. 아래 Save를 눌러야 프로필에 연결됩니다.";
      });
    });

    cvPick.addEventListener("change", () => {
      const file = chosenFile(cvPick);
      if (!file) return;
      withUpload(cvPickLabel, "CV를 올리는 중입니다…", async () => {
        const data = await invoke({
          action: "admin.members.cv",
          member_id: id.value.trim(),
          content_base64: await fileToBase64(file),
        });
        cv.value = data.cv;
        return "CV를 올렸습니다. 아래 Save를 눌러야 프로필에 연결됩니다.";
      });
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button member-edit-remove";
    remove.textContent = "이 멤버 삭제";
    remove.addEventListener("click", () => {
      const who = fields.querySelector('[data-field="name_en"]').value || member.id;
      if (window.confirm(`${who} 항목을 삭제할까요? 저장하면 홈페이지에서 사라집니다.`)) card.remove();
    });

    const side = document.createElement("div");
    side.className = "member-edit-side";
    side.append(photo, remove);
    card.append(side, fields);
    return card;
  }

  function renderMembers(sections) {
    elements.membersSections.replaceChildren(...MEMBER_SECTIONS.map((section) => {
      const block = document.createElement("section");
      block.className = "member-section";
      block.dataset.section = section.key;

      const head = document.createElement("div");
      head.className = "member-section-head";
      const title = document.createElement("h3");
      title.textContent = section.label;
      const add = document.createElement("button");
      add.type = "button";
      add.className = "button button-secondary";
      add.textContent = "+ 멤버 추가";
      head.append(title, add);

      const list = document.createElement("div");
      list.className = "member-cards";
      (sections[section.key] || []).forEach((member) => {
        list.append(buildMemberCard(section, member, false));
      });

      add.addEventListener("click", () => {
        list.append(buildMemberCard(section, { education: [], research_areas: [] }, true));
        list.lastElementChild.scrollIntoView({ block: "center" });
      });

      block.append(head, list);
      return block;
    }));
  }

  function collectMembers() {
    const sections = {};
    MEMBER_SECTIONS.forEach((section) => {
      const block = elements.membersSections.querySelector(`[data-section="${section.key}"]`);
      sections[section.key] = Array.from(block.querySelectorAll(".member-edit-card")).map((card) => {
        const value = (name) => {
          const node = card.querySelector(`[data-field="${name}"]`);
          return node ? node.value.trim() : "";
        };
        const lines = (name) =>
          value(name).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        return {
          id: value("id"),
          name_en: value("name_en"),
          name_ko: value("name_ko"),
          role: value("role"),
          email: value("email"),
          github: value("github"),
          cv: value("cv"),
          image: value("image"),
          affiliation: value("affiliation"),
          education: lines("education"),
          research_areas: lines("research_areas"),
        };
      });
    });
    return sections;
  }

  async function loadMembers() {
    elements.membersSections.textContent = "Loading…";
    showStatus("");
    try {
      const data = await invoke({ action: "admin.members.read" });
      membersSha = data.sha;
      elements.membersSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      renderMembers(data.sections || {});
    } catch (error) {
      elements.membersSections.textContent = "";
      showStatus(error.message, "error");
    }
  }

  async function saveMembers() {
    const sections = collectMembers();
    const missing = Object.values(sections).flat().find((m) => !m.id || !m.name_en || !m.role);
    if (missing) {
      showStatus("Member id, English name, Role은 모두 채워야 합니다.", "error");
      return;
    }
    setBusy(elements.membersSave, true, "Saving…");
    showStatus("");
    try {
      const data = await invoke({ action: "admin.members.save", sha: membersSha, sections });
      membersSha = data.sha;
      elements.membersSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      const parts = [];
      if (data.added) parts.push(`추가 ${data.added}명`);
      if (data.removed) parts.push(`삭제 ${data.removed}명`);
      showStatus(
        `저장했습니다${parts.length ? ` (${parts.join(", ")})` : ""}. 배포가 끝나면 Members 페이지에 반영됩니다.`,
        "success",
      );
      await loadMembers();
    } catch (error) {
      showStatus(
        error.status === 409
          ? "members.yml이 다른 곳에서 먼저 수정되었습니다. Reload 후 다시 시도해 주세요."
          : error.message,
        "error",
      );
    } finally {
      setBusy(elements.membersSave, false);
    }
  }

  elements.membersSave.addEventListener("click", saveMembers);
  elements.membersReload.addEventListener("click", loadMembers);

  // ── Advisor (PI) ───────────────────────────────────────────────────────────
  let piSha = "";
  let piMemberId = "";

  function piSection(title) {
    const block = document.createElement("section");
    block.className = "pi-section";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const grid = document.createElement("div");
    grid.className = "form-grid";
    block.append(heading, grid);
    return { block, grid };
  }

  function recordRow(spec, row) {
    const line = document.createElement("div");
    line.className = "pi-record-row";
    spec.keys.forEach((field) => {
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.key = field.key;
      input.value = row[field.key] || "";
      input.placeholder = field.label;
      input.setAttribute("aria-label", `${spec.label} ${field.label}`);
      line.append(input);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button member-edit-remove";
    remove.textContent = "삭제";
    remove.addEventListener("click", () => line.remove());
    line.append(remove);
    return line;
  }

  function renderPi(pi) {
    const parts = [];

    // Photo + basics
    const basics = piSection("기본 정보");
    const photoWrap = document.createElement("div");
    photoWrap.className = "member-edit-side pi-photo";
    const preview = document.createElement("img");
    preview.className = "member-edit-preview";
    preview.alt = "";
    if (pi.image) preview.src = pi.image;
    else preview.hidden = true;
    const empty = document.createElement("div");
    empty.className = "member-edit-nophoto";
    empty.textContent = "사진 없음";
    empty.hidden = Boolean(pi.image);
    const pickLabel = document.createElement("label");
    pickLabel.className = "button button-secondary member-edit-pick";
    pickLabel.textContent = "사진 올리기";
    const pick = document.createElement("input");
    pick.type = "file";
    pick.accept = "image/*";
    pick.hidden = true;
    pickLabel.append(pick);
    const imageField = document.createElement("input");
    imageField.type = "hidden";
    imageField.dataset.field = "image";
    imageField.value = pi.image || "";
    pick.addEventListener("change", () => {
      const file = pick.files && pick.files[0];
      pick.value = "";
      if (!file) return;
      withUpload(pickLabel, "사진을 올리는 중입니다…", async () => {
        const dataUrl = await resizeToJpeg(file);
        const saved = await invoke({
          action: "admin.members.image",
          member_id: piMemberId,
          content_base64: dataUrl.split(",")[1],
        });
        imageField.value = saved.image;
        preview.src = dataUrl;
        preview.hidden = false;
        empty.hidden = true;
        return "사진을 올렸습니다. 아래 Save를 눌러야 반영됩니다.";
      });
    });
    photoWrap.append(preview, empty, pickLabel, imageField);

    [["name_en", "English name", true], ["name_ko", "한글 이름", false],
     ["role", "Role", true], ["initials", "Initials (사진 없을 때 표시)", false]]
      .forEach(([name, label, required]) => {
        const input = document.createElement("input");
        input.type = "text";
        input.dataset.field = name;
        input.value = pi[name] || "";
        if (required) input.required = true;
        basics.grid.append(labelled(required ? `${label} *` : label, input));
      });
    const basicsRow = document.createElement("div");
    basicsRow.className = "pi-basics";
    basicsRow.append(photoWrap, basics.grid);
    basics.block.replaceChildren(basics.block.firstChild, basicsRow);
    parts.push(basics.block);

    // The link buttons the advisor page renders
    const links = piSection("링크 (페이지의 버튼)");
    PI_LINKS.forEach((spec) => {
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.field = spec.name;
      input.value = pi[spec.name] || "";
      input.placeholder = spec.placeholder;
      links.grid.append(labelled(spec.label, input));
    });

    // CV: upload a PDF straight into assets/pdf, or paste an address.
    const cv = document.createElement("input");
    cv.type = "text";
    cv.dataset.field = "cv";
    cv.value = pi.cv || "";
    cv.placeholder = "/assets/pdf/name_cv.pdf";
    const cvRow = document.createElement("div");
    cvRow.className = "form-wide member-edit-cv";
    const cvPickLabel = document.createElement("label");
    cvPickLabel.className = "button button-secondary member-edit-pick";
    cvPickLabel.textContent = "PDF 올리기";
    const cvPick = document.createElement("input");
    cvPick.type = "file";
    cvPick.accept = "application/pdf,.pdf";
    cvPick.hidden = true;
    cvPickLabel.append(cvPick);
    cvPick.addEventListener("change", () => {
      const file = cvPick.files && cvPick.files[0];
      cvPick.value = "";
      if (!file) return;
      withUpload(cvPickLabel, "CV를 올리는 중입니다…", async () => {
        const saved = await invoke({
          action: "admin.members.cv",
          member_id: piMemberId,
          content_base64: await fileToBase64(file),
        });
        cv.value = saved.cv;
        return "CV를 올렸습니다. 아래 Save를 눌러야 반영됩니다.";
      });
    });
    cvRow.append(labelled("CV (PDF 업로드 또는 주소 입력)", cv), cvPickLabel);
    links.grid.append(cvRow);
    parts.push(links.block);

    // Bio and interests
    const about = piSection("소개");
    [["bio", "Bio", 8], ["research_interests", "Research interests (한 줄에 하나)", 5],
     ["awards", "Awards & Honors (한 줄에 하나, 없으면 비워둠)", 4]]
      .forEach(([name, label, rows]) => {
        const area = document.createElement("textarea");
        area.rows = rows;
        area.dataset.field = name;
        area.value = Array.isArray(pi[name]) ? pi[name].join("\n") : (pi[name] || "");
        about.grid.append(labelled(label, area, true));
      });
    parts.push(about.block);

    // Education and career
    PI_RECORD_LISTS.forEach((spec) => {
      const section = piSection(spec.label);
      const list = document.createElement("div");
      list.className = "pi-record-list";
      list.dataset.list = spec.name;
      (pi[spec.name] || []).forEach((row) => list.append(recordRow(spec, row)));
      const add = document.createElement("button");
      add.type = "button";
      add.className = "button button-secondary";
      add.textContent = `+ ${spec.label} 추가`;
      add.addEventListener("click", () => list.append(recordRow(spec, {})));
      section.block.replaceChildren(section.block.firstChild, list, add);
      parts.push(section.block);
    });

    elements.piBody.replaceChildren(...parts);
  }

  async function loadPi() {
    elements.piBody.textContent = "불러오는 중…";
    showStatus("");
    try {
      const data = await invoke({ action: "admin.pi.read" });
      piSha = data.sha;
      piMemberId = data.member_id;
      elements.piSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      renderPi(data.pi || {});
    } catch (error) {
      elements.piBody.textContent = "";
      showStatus(error.message, "error");
    }
  }

  function collectPi() {
    const value = (name) => {
      const node = elements.piBody.querySelector(`[data-field="${name}"]`);
      return node ? node.value.trim() : "";
    };
    const lines = (name) =>
      value(name).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const pi = {
      image: value("image"),
      cv: value("cv"),
      bio: value("bio"),
      research_interests: lines("research_interests"),
      awards: lines("awards"),
    };
    ["name_en", "name_ko", "role", "initials"].forEach((name) => { pi[name] = value(name); });
    PI_LINKS.forEach((spec) => { pi[spec.name] = value(spec.name); });
    PI_RECORD_LISTS.forEach((spec) => {
      const list = elements.piBody.querySelector(`[data-list="${spec.name}"]`);
      pi[spec.name] = Array.from(list ? list.querySelectorAll(".pi-record-row") : []).map((line) =>
        Object.fromEntries(spec.keys.map((field) => [
          field.key,
          line.querySelector(`[data-key="${field.key}"]`).value.trim(),
        ]))
      );
    });
    return pi;
  }

  async function savePi() {
    const pi = collectPi();
    if (!pi.name_en || !pi.role) {
      showStatus("English name과 Role은 필수입니다.", "error");
      return;
    }
    setBusy(elements.piSave, true, "Saving…");
    showStatus("");
    try {
      const saved = await invoke({ action: "admin.pi.save", sha: piSha, pi });
      piSha = saved.sha;
      elements.piSha.textContent = `revision ${saved.sha.slice(0, 8)}`;
      showStatus("저장했습니다. 배포가 끝나면 Advisor 페이지에 반영됩니다.", "success");
    } catch (error) {
      showStatus(
        error.status === 409
          ? "members.yml이 다른 곳에서 먼저 수정되었습니다. Reload 후 다시 시도해 주세요."
          : error.message,
        "error",
      );
    } finally {
      setBusy(elements.piSave, false);
    }
  }

  elements.piReload.addEventListener("click", loadPi);
  elements.piSave.addEventListener("click", savePi);

  // ── Generic _data collections (equipment, facilities, positions) ───────────
  // Everything here is driven by the field schema the server sends, so a new collection
  // needs no browser code — only an entry in the server's table.
  let dataState = { collection: "", sha: "", fields: [], uploads: false };

  function dataCard(item) {
    const card = document.createElement("article");
    card.className = "member-edit-card data-edit-card";
    const fields = document.createElement("div");
    fields.className = "member-edit-fields";

    let nameInput = null;
    let imageInput = null;
    let preview = null;

    dataState.fields.forEach((spec) => {
      if (spec.kind === "image") {
        imageInput = document.createElement("input");
        imageInput.type = "hidden";
        imageInput.dataset.field = spec.name;
        imageInput.value = item[spec.name] || "";
        card.append(imageInput);
        return;
      }
      let control;
      if (spec.kind === "bool") {
        control = document.createElement("input");
        control.type = "checkbox";
        control.checked = item[spec.name] === true;
      } else if (spec.kind === "list") {
        control = document.createElement("textarea");
        control.rows = 4;
        control.value = (item[spec.name] || []).join("\n");
      } else {
        control = document.createElement("input");
        control.type = "text";
        control.value = item[spec.name] || "";
        if (spec.required) control.required = true;
      }
      control.dataset.field = spec.name;
      const label = spec.kind === "list" ? `${spec.label} (한 줄에 하나)` : spec.label;
      const wrap = labelled(spec.required ? `${label} *` : label, control, spec.wide);
      if (spec.kind === "bool") wrap.classList.add("pubs-check");
      fields.append(wrap);
      if (!nameInput && spec.required) nameInput = control;
    });

    const side = document.createElement("div");
    side.className = "member-edit-side";
    if (dataState.uploads) {
      preview = document.createElement("img");
      preview.className = "member-edit-preview";
      preview.alt = "";
      if (imageInput && imageInput.value) preview.src = imageInput.value;
      else preview.hidden = true;
      const empty = document.createElement("div");
      empty.className = "member-edit-nophoto";
      empty.textContent = "사진 없음";
      empty.hidden = Boolean(imageInput && imageInput.value);
      const pickLabel = document.createElement("label");
      pickLabel.className = "button button-secondary member-edit-pick";
      pickLabel.textContent = "사진 올리기";
      const pick = document.createElement("input");
      pick.type = "file";
      pick.accept = "image/*";
      pick.hidden = true;
      pickLabel.append(pick);
      pick.addEventListener("change", () => {
        const file = pick.files && pick.files[0];
        pick.value = "";
        if (!file) return;
        const name = nameInput ? nameInput.value.trim() : "";
        if (!name) {
          showStatus("사진을 올리기 전에 이름을 먼저 입력해 주세요.", "error");
          return;
        }
        withUpload(pickLabel, "사진을 올리는 중입니다…", async () => {
          const dataUrl = await resizeToJpegMax(file, 1200, 0.88);
          const saved = await invoke({
            action: "admin.data.image",
            collection: dataState.collection,
            name,
            content_base64: dataUrl.split(",")[1],
          });
          imageInput.value = saved.image;
          preview.src = dataUrl;
          preview.hidden = false;
          empty.hidden = true;
          return "사진을 올렸습니다. 아래 Save를 눌러야 연결됩니다.";
        });
      });
      side.append(preview, empty, pickLabel);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button member-edit-remove";
    remove.textContent = "이 항목 삭제";
    remove.addEventListener("click", () => {
      const who = nameInput ? nameInput.value : "이 항목";
      if (window.confirm(`${who} 을(를) 삭제할까요?`)) {
        card.remove();
        elements.dataCount.textContent =
          `${elements.dataItems.querySelectorAll(".data-edit-card").length}개`;
      }
    });
    side.append(remove);

    card.append(side, fields);
    return card;
  }

  function renderData(items) {
    elements.dataItems.replaceChildren(...items.map(dataCard));
    elements.dataCount.textContent = `${items.length}개`;
  }

  async function loadData(collection) {
    elements.dataItems.replaceChildren();
    elements.dataCount.textContent = "불러오는 중…";
    showStatus("");
    try {
      const data = await invoke({ action: "admin.data.read", collection });
      dataState = {
        collection,
        sha: data.sha,
        fields: data.fields || [],
        uploads: Boolean(data.uploads),
      };
      elements.dataTitle.textContent = data.label;
      elements.dataPath.textContent = data.path;
      elements.dataSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      renderData(data.items || []);
    } catch (error) {
      elements.dataCount.textContent = "";
      showStatus(error.message, "error");
    }
  }

  function collectData() {
    return Array.from(elements.dataItems.querySelectorAll(".data-edit-card")).map((card) => {
      const item = {};
      dataState.fields.forEach((spec) => {
        const node = card.querySelector(`[data-field="${spec.name}"]`);
        if (!node) return;
        if (spec.kind === "bool") item[spec.name] = node.checked;
        else if (spec.kind === "list") {
          item[spec.name] = node.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        } else item[spec.name] = node.value.trim();
      });
      return item;
    });
  }

  async function saveData() {
    const items = collectData();
    const required = dataState.fields.filter((spec) => spec.required).map((spec) => spec.name);
    if (items.some((item) => required.some((name) => !item[name]))) {
      showStatus("필수 항목을 모두 채워 주세요.", "error");
      return;
    }
    setBusy(elements.dataSave, true, "Saving…");
    showStatus("");
    try {
      const saved = await invoke({
        action: "admin.data.save",
        collection: dataState.collection,
        sha: dataState.sha,
        items,
      });
      dataState.sha = saved.sha;
      elements.dataSha.textContent = `revision ${saved.sha.slice(0, 8)}`;
      renderData(saved.items || items);
      showStatus("저장했습니다. 배포가 끝나면 홈페이지에 반영됩니다.", "success");
    } catch (error) {
      showStatus(
        error.status === 409
          ? "다른 곳에서 먼저 수정되었습니다. Reload 후 다시 시도해 주세요."
          : error.message,
        "error",
      );
    } finally {
      setBusy(elements.dataSave, false);
    }
  }

  elements.dataReload.addEventListener("click", () => loadData(dataState.collection));
  elements.dataSave.addEventListener("click", saveData);
  elements.dataAdd.addEventListener("click", () => {
    const blank = {};
    dataState.fields.forEach((spec) => {
      blank[spec.name] = spec.kind === "list" ? [] : spec.kind === "bool" ? true : "";
    });
    elements.dataItems.append(dataCard(blank));
    elements.dataItems.lastElementChild.scrollIntoView({ block: "center" });
    elements.dataCount.textContent =
      `${elements.dataItems.querySelectorAll(".data-edit-card").length}개`;
  });

  // ── Publications ───────────────────────────────────────────────────────────
  let pubsSha = "";
  let pubsEntries = [];
  let pubsEditingKey = null;

  function pubsRow(entry) {
    const row = document.createElement("div");
    row.className = "cms-list-row";
    const main = document.createElement("div");
    main.className = "cms-list-main";
    const title = document.createElement("div");
    title.className = "cms-list-title cms-list-title-plain";
    title.textContent = entry.fields.title || entry.key;
    const meta = document.createElement("div");
    meta.className = "cms-list-meta";
    [entry.fields.abbr, entry.fields.year, entry.type].filter(Boolean).forEach((text) => {
      const badge = document.createElement("span");
      badge.className = "cms-badge";
      badge.textContent = text;
      meta.append(badge);
    });
    if (entry.fields.selected === "true") {
      const star = document.createElement("span");
      star.className = "cms-badge cms-badge-star";
      star.textContent = "★ selected";
      meta.append(star);
    }
    const authors = document.createElement("code");
    authors.textContent = entry.key;
    meta.append(authors);
    main.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "cms-list-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-secondary";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openPub(entry.key));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button-danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removePub(entry));
    actions.append(edit, remove);
    row.append(main, actions);
    return row;
  }

  function renderPubs() {
    elements.pubsCount.textContent = `${pubsEntries.length}편`;
    elements.pubsItems.replaceChildren(...pubsEntries.map(pubsRow));
  }

  async function loadPubs() {
    elements.pubsCount.textContent = "불러오는 중…";
    elements.pubsItems.replaceChildren();
    showStatus("");
    try {
      const data = await invoke({ action: "admin.pubs.read" });
      pubsSha = data.sha;
      pubsEntries = data.entries || [];
      elements.pubsSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      renderPubs();
    } catch (error) {
      elements.pubsCount.textContent = "";
      showStatus(error.message, "error");
    }
  }

  function renderPubForm(entry) {
    elements.pubsFields.replaceChildren(...PUB_FIELDS.map((spec) => {
      let control;
      if (spec.bool) {
        control = document.createElement("input");
        control.type = "checkbox";
        control.checked = (entry.fields[spec.name] || "") === "true";
      } else if (spec.select) {
        control = document.createElement("select");
        spec.select.forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          control.append(option);
        });
        control.value = entry.type || spec.select[0];
      } else if (spec.area) {
        control = document.createElement("textarea");
        control.rows = 5;
        control.value = entry.fields[spec.name] || "";
      } else {
        control = document.createElement("input");
        control.type = "text";
        control.value = spec.name === "key" ? (entry.key || "") : (entry.fields[spec.name] || "");
        if (spec.required) control.required = true;
      }
      control.dataset.field = spec.name;
      const wrap = labelled(spec.required ? `${spec.label} *` : spec.label, control, spec.wide);
      if (spec.bool) wrap.classList.add("pubs-check");
      if (spec.hint) {
        const hint = document.createElement("small");
        hint.className = "pubs-hint";
        hint.textContent = spec.hint;
        wrap.append(hint);
      }
      return wrap;
    }));
  }

  function collectPub() {
    const fields = {};
    let key = "";
    let type = "article";
    PUB_FIELDS.forEach((spec) => {
      const node = elements.pubsFields.querySelector(`[data-field="${spec.name}"]`);
      if (!node) return;
      if (spec.name === "key") { key = node.value.trim(); return; }
      if (spec.name === "type") { type = node.value; return; }
      if (spec.bool) { if (node.checked) fields[spec.name] = "true"; return; }
      const value = node.value.trim();
      if (value) fields[spec.name] = value;
    });
    return { key, type, fields };
  }

  function showPubsList() {
    elements.pubsListView.hidden = false;
    elements.pubsEditView.hidden = true;
    pubsEditingKey = null;
    showStatus("");
  }

  function openPub(key) {
    const entry = pubsEntries.find((item) => item.key === key) ||
      { key: "", type: "article", fields: {} };
    pubsEditingKey = key;
    elements.pubsEditTitle.textContent = entry.fields.title || "New publication";
    elements.pubsBibtex.value = "";
    renderPubForm(entry);
    elements.pubsListView.hidden = true;
    elements.pubsEditView.hidden = false;
    showStatus("");
  }

  async function savePub() {
    const edited = collectPub();
    if (!edited.key || !edited.fields.title || !edited.fields.author || !edited.fields.year) {
      showStatus("Citation key, Title, Authors, Year는 필수입니다.", "error");
      return;
    }
    const next = pubsEntries.filter((item) => item.key !== pubsEditingKey);
    if (pubsEditingKey === null) next.unshift(edited);
    else {
      const position = pubsEntries.findIndex((item) => item.key === pubsEditingKey);
      next.splice(position === -1 ? 0 : position, 0, edited);
    }
    setBusy(elements.pubsEditSave, true, "Saving…");
    showStatus("");
    try {
      const data = await invoke({ action: "admin.pubs.save", sha: pubsSha, entries: next });
      pubsSha = data.sha;
      showStatus("저장했습니다. 배포가 끝나면 Publications 페이지에 반영됩니다.", "success");
      await loadPubs();
      showPubsList();
    } catch (error) {
      showStatus(
        error.status === 409
          ? "papers.bib이 다른 곳에서 먼저 수정되었습니다. Reload 후 다시 시도해 주세요."
          : error.message,
        "error",
      );
    } finally {
      setBusy(elements.pubsEditSave, false);
    }
  }

  async function removePub(entry) {
    if (!window.confirm(`"${entry.fields.title || entry.key}" 을(를) 삭제할까요?`)) return;
    showStatus("삭제 중…");
    try {
      const next = pubsEntries.filter((item) => item.key !== entry.key);
      const data = await invoke({ action: "admin.pubs.save", sha: pubsSha, entries: next });
      pubsSha = data.sha;
      showStatus("삭제했습니다.", "success");
      await loadPubs();
    } catch (error) {
      showStatus(error.message, "error");
    }
  }

  elements.pubsReload.addEventListener("click", () => { showPubsList(); loadPubs(); });
  elements.pubsEditBack.addEventListener("click", showPubsList);
  elements.pubsEditSave.addEventListener("click", savePub);
  elements.pubsNew.addEventListener("click", () => openPub(null));
  elements.pubsFill.addEventListener("click", async () => {
    const text = elements.pubsBibtex.value.trim();
    if (!text) { showStatus("BibTeX를 붙여넣어 주세요.", "error"); return; }
    setBusy(elements.pubsFill, true, "읽는 중…");
    try {
      const parsed = await invoke({ action: "admin.pubs.parse", bibtex: text });
      // Keep whatever is already typed if the pasted record does not carry that field.
      const current = collectPub();
      renderPubForm({
        key: parsed.key || current.key,
        type: parsed.type || current.type,
        fields: { ...current.fields, ...parsed.fields },
      });
      showStatus("BibTeX에서 채웠습니다. 확인 후 저장해 주세요.", "success");
    } catch (error) {
      showStatus(error.message, "error");
    } finally {
      setBusy(elements.pubsFill, false);
    }
  });

  // ── Gallery ────────────────────────────────────────────────────────────────
  let gallerySha = "";
  let galleryCategories = ["lab-life", "conferences"];

  function today() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function galleryCard(photo, pendingDataUrl) {
    const card = document.createElement("article");
    card.className = "gallery-edit-card";
    // A newly picked file is held here and uploaded on Save, once its caption and date are
    // known — that is what gives the committed file its proper name.
    card.pendingDataUrl = pendingDataUrl || "";

    const preview = document.createElement("img");
    preview.className = "gallery-edit-preview";
    preview.alt = "";
    preview.src = pendingDataUrl || photo.image;

    const fields = document.createElement("div");
    fields.className = "gallery-edit-fields";

    const caption = document.createElement("input");
    caption.type = "text";
    caption.dataset.field = "caption";
    caption.value = photo.caption || "";
    caption.required = true;
    fields.append(labelled("Caption", caption, true));

    const category = document.createElement("select");
    category.dataset.field = "category";
    galleryCategories.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value === "lab-life" ? "Lab Life" : "Conferences";
      category.append(option);
    });
    category.value = photo.category || galleryCategories[0];
    fields.append(labelled("Category", category));

    const date = document.createElement("input");
    date.type = "date";
    date.dataset.field = "date";
    date.value = photo.date || today();
    fields.append(labelled("Date", date));

    const image = document.createElement("input");
    image.type = "hidden";
    image.dataset.field = "image";
    image.value = photo.image || "";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button member-edit-remove";
    remove.textContent = "삭제";
    remove.addEventListener("click", () => {
      if (window.confirm(`${caption.value || "이 사진"} 을(를) 목록에서 뺄까요?`)) {
        card.remove();
        elements.galleryCount.textContent =
          `${elements.galleryItems.querySelectorAll(".gallery-edit-card").length}장`;
      }
    });

    if (pendingDataUrl) {
      const badge = document.createElement("span");
      badge.className = "cms-badge gallery-edit-new";
      badge.textContent = "미업로드";
      fields.append(badge);
    }

    card.append(preview, fields, image, remove);
    return card;
  }

  function renderGallery(photos) {
    elements.galleryItems.replaceChildren(...photos.map((photo) => galleryCard(photo, "")));
    elements.galleryCount.textContent = `${photos.length}장`;
  }

  async function loadGallery() {
    elements.galleryItems.replaceChildren();
    elements.galleryCount.textContent = "불러오는 중…";
    showStatus("");
    try {
      const data = await invoke({ action: "admin.gallery.read" });
      gallerySha = data.sha;
      if (Array.isArray(data.categories) && data.categories.length) {
        galleryCategories = data.categories;
      }
      elements.gallerySha.textContent = `revision ${data.sha.slice(0, 8)}`;
      renderGallery(data.photos || []);
    } catch (error) {
      elements.galleryCount.textContent = "";
      showStatus(error.message, "error");
    }
  }

  function collectGallery() {
    return Array.from(elements.galleryItems.querySelectorAll(".gallery-edit-card")).map((card) => ({
      card,
      image: card.querySelector('[data-field="image"]').value.trim(),
      caption: card.querySelector('[data-field="caption"]').value.trim(),
      category: card.querySelector('[data-field="category"]').value,
      date: card.querySelector('[data-field="date"]').value,
    }));
  }

  async function saveGallery() {
    const rows = collectGallery();
    const incomplete = rows.find((row) => !row.caption || !row.date);
    if (incomplete) {
      showStatus("Caption과 Date는 모두 채워야 합니다.", "error");
      incomplete.card.scrollIntoView({ block: "center" });
      return;
    }
    setBusy(elements.gallerySave, true, "Saving…");
    showStatus("");
    try {
      // Upload the newly picked files first, so each one is committed under a name built from
      // the caption and date the editor just entered.
      const pending = rows.filter((row) => row.card.pendingDataUrl);
      for (let index = 0; index < pending.length; index += 1) {
        const row = pending[index];
        showStatus(`사진 업로드 중… (${index + 1}/${pending.length})`);
        const uploaded = await invoke({
          action: "admin.gallery.image",
          date: row.date,
          caption: row.caption,
          content_base64: row.card.pendingDataUrl.split(",")[1],
        });
        row.image = uploaded.image;
        row.card.querySelector('[data-field="image"]').value = uploaded.image;
        row.card.pendingDataUrl = "";
        const badge = row.card.querySelector(".gallery-edit-new");
        if (badge) badge.remove();
      }

      const data = await invoke({
        action: "admin.gallery.save",
        sha: gallerySha,
        photos: rows.map(({ image, caption, category, date }) => ({ image, caption, category, date })),
      });
      gallerySha = data.sha;
      elements.gallerySha.textContent = `revision ${data.sha.slice(0, 8)}`;
      renderGallery(data.photos || []);
      showStatus("저장했습니다. 배포가 끝나면 Gallery 페이지에 반영됩니다.", "success");
    } catch (error) {
      showStatus(
        error.status === 409
          ? "gallery.yml이 다른 곳에서 먼저 수정되었습니다. Reload 후 다시 시도해 주세요."
          : error.message,
        "error",
      );
    } finally {
      setBusy(elements.gallerySave, false);
    }
  }

  elements.galleryReload.addEventListener("click", loadGallery);
  elements.gallerySave.addEventListener("click", saveGallery);
  elements.galleryFile.addEventListener("change", async () => {
    const files = Array.from(elements.galleryFile.files || []);
    elements.galleryFile.value = "";
    if (!files.length) return;
    elements.galleryAdd.classList.add("is-busy");
    showStatus(`사진 ${files.length}장 준비 중…`);
    try {
      for (const file of files) {
        const dataUrl = await resizeToJpegMax(file, 1600, 0.85);
        const stem = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        const card = galleryCard({ caption: stem, category: galleryCategories[0], date: today() }, dataUrl);
        elements.galleryItems.prepend(card);
      }
      elements.galleryCount.textContent =
        `${elements.galleryItems.querySelectorAll(".gallery-edit-card").length}장`;
      showStatus("Caption과 날짜를 확인한 뒤 Save를 누르면 업로드됩니다.", "success");
    } catch (error) {
      showStatus(error.message, "error");
    } finally {
      elements.galleryAdd.classList.remove("is-busy");
    }
  });

  // ── News: list -> edit form ────────────────────────────────────────────────
  let newsEditing = null;

  function showNewsList() {
    elements.newsListView.hidden = false;
    elements.newsEditView.hidden = true;
    newsEditing = null;
    showStatus("");
  }

  function newsRow(item) {
    const row = document.createElement("div");
    row.className = "cms-list-row";

    const main = document.createElement("div");
    main.className = "cms-list-main";
    const title = document.createElement("div");
    title.className = "cms-list-title";
    title.textContent = item.slug.replace(/-/g, " ");
    const meta = document.createElement("div");
    meta.className = "cms-list-meta";
    const date = document.createElement("span");
    date.className = "cms-badge";
    date.textContent = item.date || "-";
    const file = document.createElement("code");
    file.textContent = item.name;
    meta.append(date, file);
    main.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "cms-list-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-secondary";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openNews(item));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button-danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removeNews(item, remove));
    actions.append(edit, remove);

    row.append(main, actions);
    return row;
  }

  async function loadNews() {
    elements.newsCount.textContent = "불러오는 중…";
    elements.newsItems.replaceChildren();
    showStatus("");
    try {
      const data = await invoke({ action: "admin.news.list" });
      const items = data.items || [];
      elements.newsCount.textContent = `${items.length}개 항목`;
      elements.newsItems.replaceChildren(...items.map(newsRow));
      if (!items.length) elements.newsItems.textContent = "News가 없습니다.";
    } catch (error) {
      elements.newsCount.textContent = "";
      showStatus(error.message, "error");
    }
  }

  async function openNews(item) {
    showStatus("불러오는 중…");
    try {
      const data = await invoke({ action: "admin.news.item", resource_id: item.id });
      newsEditing = { id: item.id, sha: data.sha };
      elements.newsEditTitle.textContent = item.slug.replace(/-/g, " ");
      elements.newsEditPath.textContent = data.path;
      elements.newsEditSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      elements.newsEditDate.value = data.date;
      elements.newsEditDisplay.value = data.display_date;
      elements.newsEditBody.value = data.body;
      elements.newsListView.hidden = true;
      elements.newsEditView.hidden = false;
      showStatus("");
    } catch (error) {
      showStatus(error.message, "error");
    }
  }

  async function saveNews() {
    if (!newsEditing) return;
    setBusy(elements.newsEditSave, true, "Saving…");
    showStatus("");
    try {
      const data = await invoke({
        action: "admin.news.update",
        resource_id: newsEditing.id,
        sha: newsEditing.sha,
        display_date: elements.newsEditDisplay.value,
        body: elements.newsEditBody.value,
      });
      newsEditing.sha = data.sha;
      elements.newsEditSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      showStatus("저장했습니다. 배포가 끝나면 홈페이지에 반영됩니다.", "success");
    } catch (error) {
      showStatus(
        error.status === 409
          ? "이 News가 다른 곳에서 먼저 수정되었습니다. 목록으로 돌아가 다시 열어 주세요."
          : error.message,
        "error",
      );
    } finally {
      setBusy(elements.newsEditSave, false);
    }
  }

  async function removeNews(item, button) {
    if (!window.confirm(`${item.name} 을(를) 삭제할까요? 홈페이지에서 사라집니다.`)) return;
    setBusy(button, true, "Deleting…");
    try {
      await invoke({ action: "admin.news.remove", resource_id: item.id });
      showStatus("삭제했습니다. 배포가 끝나면 홈페이지에서 사라집니다.", "success");
      resources = resources.filter((resource) => resource.id !== item.id);
      renderResourceOptions();
      await loadNews();
    } catch (error) {
      showStatus(error.message, "error");
      setBusy(button, false);
    }
  }

  elements.newsReload.addEventListener("click", loadNews);
  elements.newsEditSave.addEventListener("click", saveNews);
  elements.newsEditBack.addEventListener("click", showNewsList);
  elements.newsNew.addEventListener("click", () => showView("newsNew"));
  elements.newsCreateBack.addEventListener("click", () => activate("news"));

  async function enterApp() {
    try {
      const data = await invoke({ action: "me" });
      profile = data.profile;
      resources = data.resources || [];
      elements.accountName.textContent = profile.display_name || profile.email;
      elements.accountRole.textContent = demoMode ? `${profile.role} · local demo` : profile.role;
      renderNavigation();
      elements.login.hidden = true;
      elements.app.hidden = false;

      if (profile.role === "admin") {
        renderResourceOptions();
        showView("members");
        await loadMembers();
        renderTabs("members");
      } else if (profile.member_id) {
        showView("profile");
      } else {
        throw new Error("이 계정에 연결된 멤버 프로필이 없습니다. 관리자에게 문의해 주세요.");
      }
      if (profile.member_id) await loadMemberProfile();
    } catch (error) {
      // Return to the login card BEFORE signing out: the SIGNED_OUT listener reloads the page while
      // the app is still visible, which would discard the message written below.
      // #login-status also lives inside #login-form, which the recovery path hides, so restore that
      // too or the message goes into a hidden node and the card renders empty.
      elements.app.hidden = true;
      elements.login.hidden = false;
      elements.loginForm.hidden = false;
      elements.recoveryForm.hidden = true;
      // Only a real authorization failure should end the session. signOut() defaults to a global
      // scope, so a 5xx or a dropped connection used to revoke every device's refresh token.
      if (client && (error.status === 401 || error.status === 403)) {
        await client.auth.signOut({ scope: "local" });
      }
      window.sessionStorage.removeItem("pier-cms-demo:authenticated");
      elements.loginStatus.textContent = error.message;
    }
  }

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    elements.loginStatus.textContent = "";
    setBusy(button, true, "Signing in…");
    const formData = new FormData(elements.loginForm);
    if (demoMode) {
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "");
      if (email !== LOCAL_DEMO_EMAIL || password !== LOCAL_DEMO_PASSWORD) {
        elements.loginStatus.textContent = "로컬 데모 아이디 또는 비밀번호를 확인해 주세요.";
        setBusy(button, false);
        return;
      }
      window.sessionStorage.setItem("pier-cms-demo:authenticated", "true");
      await enterApp();
      setBusy(button, false);
      return;
    }
    try {
      const { error } = await client.auth.signInWithPassword({
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || ""),
      });
      if (error) {
        // 400 invalid_credentials stays deliberately generic so the form is not an account oracle,
        // but a lockout or an outage must not be reported as a wrong password.
        elements.loginStatus.textContent = error.status === 429
          ? "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요."
          : (error.status >= 500 || error.name === "AuthRetryableFetchError")
            ? "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
            : "이메일 또는 비밀번호를 확인해 주세요.";
        return;
      }
      await enterApp();
    } catch (_) {
      elements.loginStatus.textContent = "로그인 처리 중 오류가 발생했습니다.";
    } finally {
      setBusy(button, false);
    }
  });

  elements.forgotPassword.addEventListener("click", async () => {
    if (demoMode) {
      elements.loginStatus.textContent = "로컬 데모 계정은 비밀번호 재설정을 지원하지 않습니다.";
      return;
    }
    const emailField = elements.loginForm.elements.namedItem("email");
    const email = String(emailField?.value || "").trim();
    if (!email) {
      elements.loginStatus.textContent = "먼저 계정 이메일을 입력해 주세요.";
      return;
    }
    setBusy(elements.forgotPassword, true, "Sending…");
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    elements.loginStatus.textContent = error
      ? "재설정 메일을 보내지 못했습니다. 관리자에게 문의해 주세요."
      : "등록된 계정이라면 비밀번호 재설정 메일이 발송됩니다.";
    setBusy(elements.forgotPassword, false);
  });

  elements.recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const formData = new FormData(elements.recoveryForm);
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");
    if (password.length < 12 || password !== confirm) {
      elements.recoveryStatus.textContent = "12자 이상의 동일한 비밀번호를 두 번 입력해 주세요.";
      return;
    }
    setBusy(button, true, "Updating…");
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      elements.recoveryStatus.textContent = "비밀번호를 변경하지 못했습니다. 재설정 링크를 다시 요청해 주세요.";
      setBusy(button, false);
      return;
    }
    window.sessionStorage.removeItem(RECOVERY_PENDING_KEY);
    window.history.replaceState({}, document.title, window.location.pathname);
    elements.recoveryForm.hidden = true;
    await enterApp();
    setBusy(button, false);
  });

  elements.signOut.addEventListener("click", async () => {
    if (demoMode) {
      window.sessionStorage.removeItem("pier-cms-demo:authenticated");
    } else {
      await client.auth.signOut();
    }
    window.location.reload();
  });

  elements.resourceSelect.addEventListener("change", () => loadResource(elements.resourceSelect.value));
  elements.reloadResource.addEventListener("click", () => loadResource(elements.resourceSelect.value));

  elements.saveResource.addEventListener("click", async () => {
    if (!currentResource) return;
    setBusy(elements.saveResource, true, "Saving…");
    showStatus("");
    try {
      const data = await invoke({
        action: "admin.save",
        resource_id: currentResource.id,
        content: elements.sourceEditor.value,
        sha: currentResource.sha,
      });
      currentResource.sha = data.sha;
      elements.resourceSha.textContent = `revision ${data.sha.slice(0, 8)}`;
      showStatus(demoMode
        ? "데모 저장을 완료했습니다. 이 브라우저에만 임시 보관됩니다."
        : "저장했습니다. GitHub Pages 배포가 끝나면 공개 페이지에 반영됩니다.", "success");
    } catch (error) {
      const message = error.status === 409
        ? "다른 변경 사항이 먼저 저장되었습니다. Reload 후 다시 수정해 주세요."
        : error.message;
      showStatus(message, "error");
    } finally {
      setBusy(elements.saveResource, false);
    }
  });

  elements.newsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setBusy(button, true, "Creating…");
    showStatus("");
    const formData = new FormData(elements.newsForm);
    try {
      const data = await invoke({
        action: "admin.news.create",
        date: formData.get("date"),
        slug: formData.get("slug"),
        display_date: formData.get("display_date"),
        body: formData.get("body"),
      });
      elements.newsForm.reset();
      resources.push(data.resource);
      renderResourceOptions();
      showView("news");
      showNewsList();
      await loadNews();
      showStatus(demoMode
        ? "데모 News를 만들었습니다. 이 브라우저에서만 확인할 수 있습니다."
        : "새 News를 만들었습니다. 배포 후 홈페이지에 표시됩니다.", "success");
    } catch (error) {
      showStatus(error.message, "error");
    } finally {
      setBusy(button, false);
    }
  });

  elements.memberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const formData = new FormData(elements.memberForm);
    const lineValues = (name) => String(formData.get(name) || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const fields = Object.fromEntries(["name_en", "name_ko", "email", "github", "cv", "website", "affiliation", "bio"].map((name) => [name, String(formData.get(name) || "").trim()]));
    fields.education = lineValues("education");
    fields.research_areas = lineValues("research_areas");
    setBusy(button, true, "Saving…");
    showStatus("");
    try {
      const data = await invoke({ action: "member.save", fields, sha: memberSha });
      memberSha = data.sha;
      showStatus("프로필을 저장했습니다. 배포 후 Members 페이지에 반영됩니다.", "success");
    } catch (error) {
      const message = error.status === 409
        ? "다른 변경 사항이 먼저 저장되었습니다. 페이지를 새로고침한 뒤 다시 수정해 주세요."
        : error.message;
      showStatus(message, "error");
    } finally {
      setBusy(button, false);
    }
  });

  function disableLogin() {
    elements.loginForm.querySelectorAll("input, button").forEach((node) => { node.disabled = true; });
  }

  // GoTrue returns an expired or already-used link as error_code=... in the fragment with no
  // type=recovery, so without this the page would show a plain login form and no explanation.
  function hashError() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("error_code");
    if (!code) return "";
    window.history.replaceState({}, document.title, window.location.pathname);
    return code === "otp_expired"
      ? "재설정 링크가 만료되었습니다. 다시 요청해 주세요."
      : params.get("error_description") || "링크를 사용할 수 없습니다. 다시 요청해 주세요.";
  }

  async function start() {
    if (config.localDemoEnabled && (!config.supabaseUrl || !config.publishableKey)) {
      demoMode = true;
      elements.demoNotice.hidden = false;
      elements.demoBanner.hidden = false;
      elements.forgotPassword.hidden = true;
      elements.loginForm.elements.namedItem("email").value = LOCAL_DEMO_EMAIL;
      elements.loginForm.elements.namedItem("password").value = LOCAL_DEMO_PASSWORD;
      if (window.sessionStorage.getItem("pier-cms-demo:authenticated") === "true") await enterApp();
      return;
    }
    if (!config.supabaseUrl || !config.publishableKey || !window.supabase) {
      elements.setupNotice.hidden = false;
      disableLogin();
      return;
    }
    // createClient() throws synchronously on a URL with no scheme — which is exactly the form the
    // Supabase dashboard displays — leaving an enabled form with no client behind it.
    if (!/^https:\/\/[^\s/]+/.test(config.supabaseUrl)) {
      elements.setupNotice.hidden = false;
      elements.loginStatus.textContent = "Supabase URL은 https:// 로 시작해야 합니다. _config.yml의 cms.supabase_url을 확인해 주세요.";
      disableLogin();
      return;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.sessionStorage,
      },
    });
    client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !elements.app.hidden) window.location.reload();
    });

    const linkError = hashError();
    if (linkError) elements.loginStatus.textContent = linkError;

    const recoveryRequested = window.location.hash.includes("type=recovery")
      || new URLSearchParams(window.location.search).get("type") === "recovery"
      || window.sessionStorage.getItem(RECOVERY_PENDING_KEY) === "true";
    const { data } = await client.auth.getSession();
    if (data.session && recoveryRequested) {
      // The fragment is cleared as soon as the session is exchanged, so without this flag a reload
      // would drop the user straight into the app with the old password still valid.
      window.sessionStorage.setItem(RECOVERY_PENDING_KEY, "true");
      elements.loginForm.hidden = true;
      elements.recoveryForm.hidden = false;
    } else if (data.session) {
      await enterApp();
    }
  }

  start().catch((error) => {
    elements.setupNotice.hidden = false;
    elements.loginStatus.textContent = (error && error.message) || "CMS를 초기화하지 못했습니다.";
    disableLogin();
  });
})();
