import { createClient } from "npm:@supabase/supabase-js@2.114.0";
import { createAppAuth } from "npm:@octokit/auth-app@7.2.2";
import { parseDocument } from "npm:yaml@2.9.0";

type CmsRole = "admin" | "member";

type CmsProfile = {
  user_id: string;
  email: string;
  display_name: string;
  role: CmsRole;
  member_id: string | null;
};

type Resource = {
  id: string;
  label: string;
  group: string;
  path: string;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const STATIC_RESOURCES: Resource[] = [
  { id: "page:home", label: "Home", group: "Pages", path: "_pages/about.md" },
  {
    id: "page:research",
    label: "Research Areas & Projects",
    group: "Pages",
    path: "_pages/projects.md",
  },
  {
    id: "page:contact",
    label: "Contact",
    group: "Pages",
    path: "_pages/contact.md",
  },
  {
    id: "data:members",
    label: "Members",
    group: "Structured data",
    path: "_data/members.yml",
  },
  {
    id: "data:equipment",
    label: "Lab equipment",
    group: "Structured data",
    path: "_data/equipment.yml",
  },
  {
    id: "data:facilities",
    label: "Facilities",
    group: "Structured data",
    path: "_data/facilities.yml",
  },
  {
    id: "data:gallery",
    label: "Gallery",
    group: "Structured data",
    path: "_data/gallery.yml",
  },
  {
    id: "data:positions",
    label: "Open positions",
    group: "Structured data",
    path: "_data/positions.yml",
  },
  {
    id: "bibliography:papers",
    label: "Publications (BibTeX)",
    group: "Publications",
    path: "_bibliography/papers.bib",
  },
  {
    id: "settings:site",
    label: "Site settings (advanced)",
    group: "Advanced",
    path: "_config.yml",
  },
];

const MEMBER_FIELDS = [
  "name_en",
  "name_ko",
  "email",
  "github",
  "cv",
  "website",
  "affiliation",
  "education",
  "research_areas",
  "bio",
] as const;

const ARRAY_MEMBER_FIELDS = new Set(["education", "research_areas"]);
const URL_MEMBER_FIELDS = new Set(["github", "website"]);
const SELF_EDITABLE_MEMBER_SECTIONS = new Set([
  "phd",
  "ms",
  "research_interns",
  "undergrad",
]);
const MAX_SOURCE_BYTES = 1_500_000;
const REPOSITORY = Deno.env.get("GITHUB_REPOSITORY") ??
  "kist-pier/kist-pier.github.io";
const BRANCH = Deno.env.get("GITHUB_BRANCH") ?? "main";
const ALLOWED_ORIGINS =
  (Deno.env.get("CMS_ALLOWED_ORIGINS") ?? "https://pier-lab.kr")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

function requestOrigin(request: Request): string {
  return request.headers.get("origin")?.replace(/\/$/, "") ?? "";
}

function originIsAllowed(request: Request): boolean {
  const origin = requestOrigin(request);
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return !origin || ALLOWED_ORIGINS.includes(origin) || isLocal;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = requestOrigin(request);
  const responseOrigin = originIsAllowed(request) && origin
    ? origin
    : ALLOWED_ORIGINS[0] || "https://pier-lab.kr";
  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function requireEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Projects created before November 2025 receive SUPABASE_SERVICE_ROLE_KEY automatically; newer ones
// do not, and the SUPABASE_ prefix is reserved so it cannot be added with `secrets set`. Accept a
// self-named secret first so the function works on either vintage, and survives the legacy key's
// end-of-2026 deprecation.
function secretKey(): string {
  const own = Deno.env.get("CMS_SUPABASE_SECRET_KEY")?.trim();
  if (own) return own;
  return requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
}

function repositoryParts(): [string, string] {
  const parts = REPOSITORY.split("/");
  if (
    parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))
  ) {
    throw new Error("GITHUB_REPOSITORY must use owner/repository format");
  }
  return [parts[0], parts[1]];
}

async function githubToken(): Promise<string> {
  const directToken = Deno.env.get("GITHUB_TOKEN")?.trim();
  if (directToken) return directToken;

  const appId = requireEnvironment("GITHUB_APP_ID");
  const installationId = Number(
    requireEnvironment("GITHUB_APP_INSTALLATION_ID"),
  );
  const privateKey = requireEnvironment("GITHUB_APP_PRIVATE_KEY").replace(
    /\\n/g,
    "\n",
  );
  if (!Number.isSafeInteger(installationId)) {
    throw new Error("Invalid GitHub App installation id");
  }

  const auth = createAppAuth({ appId, privateKey, installationId });
  const installation = await auth({ type: "installation", installationId });
  return installation.token;
}

async function githubRequest(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const token = await githubToken();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "User-Agent": "pier-lab-cms",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (body as { message?: unknown }).message === "string"
      ? (body as { message: string }).message
      : "GitHub request failed";
    if (response.status === 404) {
      throw new HttpError(404, "콘텐츠 파일을 찾을 수 없습니다.");
    }
    if (response.status === 409 || response.status === 422) {
      throw new HttpError(
        409,
        "다른 변경 사항과 충돌했습니다. 최신 내용을 다시 불러와 주세요.",
      );
    }
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }
  return body;
}

function encodedPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function decodeBase64Utf8(value: string): string {
  const compact = value.replace(/\s/g, "");
  const bytes = Uint8Array.from(
    atob(compact),
    (character) => character.charCodeAt(0),
  );
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function readGitHubFile(
  path: string,
): Promise<{ content: string; sha: string; path: string }> {
  const [owner, repository] = repositoryParts();
  const data = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${
      encodeURIComponent(repository)
    }/contents/${encodedPath(path)}?ref=${encodeURIComponent(BRANCH)}`,
  ) as { type?: string; content?: string; sha?: string; path?: string };
  if (data.type !== "file" || !data.content || !data.sha) {
    throw new HttpError(404, "콘텐츠 파일을 읽을 수 없습니다.");
  }
  return {
    content: decodeBase64Utf8(data.content),
    sha: data.sha,
    path: data.path || path,
  };
}

async function saveGitHubFile(
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<{ sha: string; commit_sha: string; path: string }> {
  if (new TextEncoder().encode(content).byteLength > MAX_SOURCE_BYTES) {
    throw new HttpError(
      413,
      "한 번에 저장할 수 있는 콘텐츠 크기를 초과했습니다.",
    );
  }
  const [owner, repository] = repositoryParts();
  const payload: Record<string, string> = {
    message,
    content: encodeBase64Utf8(content),
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;
  const data = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${
      encodeURIComponent(repository)
    }/contents/${encodedPath(path)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  ) as { content?: { path?: string; sha?: string }; commit?: { sha?: string } };
  const commitSha = data.commit?.sha;
  if (!commitSha) throw new Error("GitHub did not return a commit id");
  return {
    sha: data.content?.sha || commitSha,
    commit_sha: commitSha,
    path: data.content?.path || path,
  };
}

async function listNewsResources(): Promise<Resource[]> {
  const [owner, repository] = repositoryParts();
  const data = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${
      encodeURIComponent(repository)
    }/contents/_news?ref=${encodeURIComponent(BRANCH)}`,
  ) as Array<{ type?: string; name?: string; path?: string }>;
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) =>
      item.type === "file" &&
      /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(item.name || "")
    )
    .sort((a, b) => (b.name || "").localeCompare(a.name || ""))
    .map((item) => ({
      id: `news:${item.name}`,
      label: item.name || "News",
      group: "News",
      path: item.path || `_news/${item.name}`,
    }));
}

function resolveResource(resourceId: unknown): Resource {
  if (typeof resourceId !== "string") {
    throw new HttpError(400, "편집할 콘텐츠가 지정되지 않았습니다.");
  }
  const fixed = STATIC_RESOURCES.find((resource) => resource.id === resourceId);
  if (fixed) return fixed;

  const filename = resourceId.startsWith("news:") ? resourceId.slice(5) : "";
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(filename)) {
    throw new HttpError(400, "허용되지 않은 콘텐츠 경로입니다.");
  }
  return {
    id: resourceId,
    label: filename,
    group: "News",
    path: `_news/${filename}`,
  };
}

function findMemberPath(
  value: unknown,
  memberId: string,
  path: Array<string | number> = [],
): Array<string | number> | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findMemberPath(value[index], memberId, [...path, index]);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.id === memberId) return path;
    for (const [key, nested] of Object.entries(record)) {
      const found = findMemberPath(nested, memberId, [...path, key]);
      if (found) return found;
    }
  }
  return null;
}

function safePlainText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} 값이 올바르지 않습니다.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${field} 값이 너무 깁니다.`);
  }
  if (
    /[<>\u0000]/.test(normalized) || normalized.includes("{{") ||
    normalized.includes("{%")
  ) {
    throw new HttpError(
      400,
      `${field}에는 HTML 또는 Liquid 코드를 넣을 수 없습니다.`,
    );
  }
  return normalized;
}

function safeUrl(value: unknown, field: string): string {
  const normalized = safePlainText(value, field, 500);
  if (!normalized) return "";
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new HttpError(400, `${field}에는 https:// 주소를 입력해 주세요.`);
  }
  if (parsed.protocol !== "https:") {
    throw new HttpError(
      400,
      `${field}에는 https:// 주소만 사용할 수 있습니다.`,
    );
  }
  return parsed.toString();
}

function safeCv(value: unknown): string {
  const normalized = safePlainText(value, "CV", 500);
  if (!normalized) return "";
  if (/^\/assets\/pdf\/[A-Za-z0-9_.-]+\.pdf$/.test(normalized)) {
    return normalized;
  }
  const remote = safeUrl(normalized, "CV");
  if (!/\.pdf(?:$|[?#])/i.test(remote)) {
    throw new HttpError(400, "CV 주소는 PDF 파일이어야 합니다.");
  }
  return remote;
}

function normalizeMemberFields(
  value: unknown,
): Record<string, string | string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "프로필 데이터가 올바르지 않습니다.");
  }
  const input = value as Record<string, unknown>;
  const unexpected = Object.keys(input).filter((key) =>
    !MEMBER_FIELDS.includes(key as typeof MEMBER_FIELDS[number])
  );
  if (unexpected.length) {
    throw new HttpError(400, "수정할 수 없는 프로필 필드가 포함되어 있습니다.");
  }

  const result: Record<string, string | string[]> = {};
  for (const field of MEMBER_FIELDS) {
    const raw = input[field] ?? (ARRAY_MEMBER_FIELDS.has(field) ? [] : "");
    if (ARRAY_MEMBER_FIELDS.has(field)) {
      if (!Array.isArray(raw) || raw.length > 20) {
        throw new HttpError(400, `${field} 목록이 올바르지 않습니다.`);
      }
      result[field] = raw.map((item) => safePlainText(item, field, 300)).filter(
        Boolean,
      );
    } else if (URL_MEMBER_FIELDS.has(field)) {
      result[field] = safeUrl(raw, field);
    } else if (field === "cv") {
      result[field] = safeCv(raw);
    } else {
      result[field] = safePlainText(raw, field, field === "bio" ? 3000 : 500);
    }
  }
  if (!result.name_en) {
    throw new HttpError(400, "English name은 비워둘 수 없습니다.");
  }
  return result;
}

async function authenticate(
  request: Request,
): Promise<{ profile: CmsProfile }> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "로그인이 필요합니다.");

  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  const serviceKey = secretKey();
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    throw new HttpError(401, "로그인 세션이 유효하지 않습니다.");
  }

  const { data: profile, error: profileError } = await admin
    .from("cms_profiles")
    .select("user_id,email,display_name,role,member_id")
    .eq("user_id", userData.user.id)
    .single();
  if (profileError || !profile) {
    throw new HttpError(403, "CMS 사용 권한이 등록되지 않은 계정입니다.");
  }
  return { profile: profile as CmsProfile };
}

function requireAdmin(profile: CmsProfile): void {
  if (profile.role !== "admin") {
    throw new HttpError(403, "관리자 권한이 필요합니다.");
  }
}

async function audit(
  profile: CmsProfile,
  action: string,
  targetPath: string,
  commitSha: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const admin = createClient(
    requireEnvironment("SUPABASE_URL"),
    secretKey(),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { error } = await admin.from("cms_audit_logs").insert({
    actor_user_id: profile.user_id,
    actor_email: profile.email,
    actor_role: profile.role,
    action,
    target_path: targetPath,
    commit_sha: commitSha,
    metadata,
  });
  if (error) console.error("CMS audit insert failed", error.message);
}

async function memberFile(profile: CmsProfile): Promise<{
  file: { content: string; sha: string; path: string };
  document: ReturnType<typeof parseDocument>;
  memberPath: Array<string | number>;
  member: Record<string, unknown>;
}> {
  if (!profile.member_id) {
    throw new HttpError(403, "이 계정에 연결된 멤버 프로필이 없습니다.");
  }
  const file = await readGitHubFile("_data/members.yml");
  const document = parseDocument(file.content, { keepSourceTokens: true });
  if (document.errors.length) {
    throw new Error("members.yml could not be parsed");
  }
  const data = document.toJS();
  const memberPath = findMemberPath(data, profile.member_id);
  if (!memberPath) {
    throw new HttpError(
      404,
      "연결된 멤버 프로필을 members.yml에서 찾을 수 없습니다.",
    );
  }
  if (
    typeof memberPath[0] !== "string" ||
    !SELF_EDITABLE_MEMBER_SECTIONS.has(memberPath[0])
  ) {
    throw new HttpError(
      403,
      "이 프로필 유형은 관리자 콘텐츠 편집기에서만 수정할 수 있습니다.",
    );
  }
  const member = memberPath.reduce(
    (current: unknown, key) =>
      (current as Record<string | number, unknown>)[key],
    data,
  ) as Record<string, unknown>;
  if (
    member.education !== undefined &&
    (!Array.isArray(member.education) ||
      !member.education.every((item) => typeof item === "string"))
  ) {
    throw new HttpError(
      409,
      "이 프로필의 Education 형식은 일반 멤버 편집기와 호환되지 않습니다.",
    );
  }
  return { file, document, memberPath, member };
}

async function handleAction(
  body: Record<string, unknown>,
  profile: CmsProfile,
): Promise<unknown> {
  const action = body.action;

  if (action === "me") {
    const news = profile.role === "admin" ? await listNewsResources() : [];
    return {
      profile,
      resources: profile.role === "admin" ? [...STATIC_RESOURCES, ...news] : [],
    };
  }

  if (action === "admin.read") {
    requireAdmin(profile);
    const resource = resolveResource(body.resource_id);
    return await readGitHubFile(resource.path);
  }

  if (action === "admin.save") {
    requireAdmin(profile);
    const resource = resolveResource(body.resource_id);
    if (typeof body.content !== "string" || typeof body.sha !== "string") {
      throw new HttpError(400, "저장할 내용 또는 revision이 없습니다.");
    }
    const saved = await saveGitHubFile(
      resource.path,
      body.content,
      `cms: update ${resource.label}`,
      body.sha,
    );
    await audit(profile, "admin.save", resource.path, saved.commit_sha, {
      resource_id: resource.id,
    });
    return saved;
  }

  if (action === "admin.news.create") {
    requireAdmin(profile);
    const date = typeof body.date === "string" ? body.date : "";
    const slug = typeof body.slug === "string"
      ? body.slug.trim().toLowerCase()
      : "";
    const displayDate = typeof body.display_date === "string"
      ? safePlainText(body.display_date, "Display date", 80)
      : "";
    const newsBody = typeof body.body === "string" ? body.body.trim() : "";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(date) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
    ) {
      throw new HttpError(400, "날짜 형식이 올바르지 않습니다.");
    }
    if (slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new HttpError(
        400,
        "Slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.",
      );
    }
    if (!newsBody || newsBody.length > 50_000) {
      throw new HttpError(400, "News 본문의 길이를 확인해 주세요.");
    }
    const path = `_news/${date}-${slug}.md`;
    const displayLine = displayDate
      ? `display_date: ${JSON.stringify(displayDate)}\n`
      : "";
    const content =
      `---\nlayout: post\ndate: ${date} 09:00:00+0900\n${displayLine}inline: true\nrelated_posts: false\n---\n\n${newsBody}\n`;
    const saved = await saveGitHubFile(
      path,
      content,
      `cms: add news ${date}-${slug}`,
    );
    await audit(profile, "admin.news.create", path, saved.commit_sha);
    return {
      ...saved,
      resource: {
        id: `news:${date}-${slug}.md`,
        label: `${date}-${slug}.md`,
        group: "News",
        path,
      },
    };
  }

  if (action === "member.read") {
    const { file, member } = await memberFile(profile);
    const editable = Object.fromEntries(
      MEMBER_FIELDS.map((
        field,
      ) => [
        field,
        member[field] ?? (ARRAY_MEMBER_FIELDS.has(field) ? [] : ""),
      ]),
    );
    return { member: editable, member_id: profile.member_id, sha: file.sha };
  }

  if (action === "member.save") {
    if (typeof body.sha !== "string") {
      throw new HttpError(400, "프로필 revision이 없습니다.");
    }
    const fields = normalizeMemberFields(body.fields);
    const { file, document, memberPath } = await memberFile(profile);
    if (file.sha !== body.sha) {
      throw new HttpError(409, "프로필이 다른 곳에서 먼저 수정되었습니다.");
    }
    for (const [field, value] of Object.entries(fields)) {
      document.setIn([...memberPath, field], value);
    }
    const content = document.toString({ lineWidth: 0 });
    const saved = await saveGitHubFile(
      "_data/members.yml",
      content,
      `cms: update member ${profile.member_id}`,
      file.sha,
    );
    await audit(profile, "member.save", "_data/members.yml", saved.commit_sha, {
      member_id: profile.member_id,
      fields: Object.keys(fields),
    });
    return saved;
  }

  throw new HttpError(400, "지원하지 않는 CMS 작업입니다.");
}

Deno.serve(async (request: Request) => {
  try {
    if (!originIsAllowed(request)) {
      throw new HttpError(403, "허용되지 않은 사이트에서 보낸 요청입니다.");
    }
    const headers = corsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      throw new HttpError(405, "POST 요청만 지원합니다.");
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_SOURCE_BYTES * 1.5) {
      throw new HttpError(413, "요청 크기가 너무 큽니다.");
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "요청 본문이 올바르지 않습니다.");
    }

    const { profile } = await authenticate(request);
    const result = await handleAction(body as Record<string, unknown>, profile);
    return json(request, result);
  } catch (error) {
    if (error instanceof HttpError) {
      return json(request, { error: error.message }, error.status);
    }
    console.error("CMS function error", error);
    return json(
      request,
      { error: "CMS 서버 처리 중 오류가 발생했습니다." },
      500,
    );
  }
});
