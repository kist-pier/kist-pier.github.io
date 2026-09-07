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
  };

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

  function showView(view) {
    const views = {
      content: elements.adminEditor,
      news: elements.newsCreator,
      profile: elements.memberEditor,
    };
    Object.entries(views).forEach(([name, node]) => {
      node.hidden = name !== view;
    });
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    elements.workspaceTitle.textContent = view === "news" ? "New News" : view === "profile" ? "My Profile" : "Content";
    showStatus("");
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
    const items = profile.role === "admin"
      ? [{ view: "content", label: "Website content" }, { view: "news", label: "New News item" }]
      : [];
    if (profile.member_id) items.push({ view: "profile", label: "My profile" });

    elements.navigation.replaceChildren(...items.map((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nav-button${index === 0 ? " active" : ""}`;
      button.dataset.view = item.view;
      button.textContent = item.label;
      button.addEventListener("click", () => showView(item.view));
      return button;
    }));
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
        showView("content");
        if (resources.length) await loadResource(resources[0].id);
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
      elements.resourceSelect.value = data.resource.id;
      showView("content");
      await loadResource(data.resource.id);
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
