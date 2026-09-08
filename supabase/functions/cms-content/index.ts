import { createClient } from "npm:@supabase/supabase-js@2.114.0";
import { createAppAuth } from "npm:@octokit/auth-app@7.2.2";
import { parseDocument, Scalar } from "npm:yaml@2.9.0";

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
// Base64 inflates a binary upload by about a third, so the request cap is separate.
const MAX_REQUEST_BYTES = 8_000_000;
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
  return await putGitHubFile(path, encodeBase64Utf8(content), message, sha);
}

// Commits content that is already base64 — used for images, which must not be re-encoded.
async function putGitHubFile(
  path: string,
  base64: string,
  message: string,
  sha?: string,
): Promise<{ sha: string; commit_sha: string; path: string }> {
  const [owner, repository] = repositoryParts();
  const payload: Record<string, string> = {
    message,
    content: base64,
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

async function deleteGitHubFile(
  path: string,
  message: string,
  sha: string,
): Promise<{ commit_sha: string; path: string }> {
  const [owner, repository] = repositoryParts();
  const data = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${
      encodeURIComponent(repository)
    }/contents/${encodedPath(path)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha, branch: BRANCH }),
    },
  ) as { commit?: { sha?: string } };
  const commitSha = data.commit?.sha;
  if (!commitSha) throw new Error("GitHub did not return a commit id");
  return { commit_sha: commitSha, path };
}

const NEWS_FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseNews(content: string): {
  front: Record<string, string>;
  body: string;
} {
  const match = content.match(NEWS_FRONT_MATTER);
  if (!match) return { front: {}, body: content.trim() };
  const front: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    front[key] = value;
  }
  return { front, body: content.slice(match[0].length).trim() };
}

// Rewrites only the keys given, keeping every other front-matter line and its order, so a save
// never silently drops a key the editor does not know about.
function rewriteNews(
  original: string,
  updates: Record<string, string | null>,
  body: string,
): string {
  const match = original.match(NEWS_FRONT_MATTER);
  const lines = match
    ? match[1].split(/\r?\n/)
    : ["layout: post", "inline: true", "related_posts: false"];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const at = line.indexOf(":");
    const key = at === -1 ? "" : line.slice(0, at).trim();
    if (key && key in updates) {
      seen.add(key);
      const value = updates[key];
      if (value !== null) out.push(`${key}: ${value}`);
    } else {
      out.push(line);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key) && value !== null) out.push(`${key}: ${value}`);
  }
  return `---\n${out.join("\n")}\n---\n\n${body.trim()}\n`;
}

function newsPathFromId(resourceId: unknown): { path: string; name: string } {
  const resource = resolveResource(resourceId);
  if (resource.group !== "News") {
    throw new HttpError(400, "News 항목이 아닙니다.");
  }
  return { path: resource.path, name: resource.label };
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

// ---------------------------------------------------------------------------
// Structured member editing (admin). `pi` and `alumni` have their own shapes and
// stay with the raw-source editor; these four sections share one field set.
// ---------------------------------------------------------------------------

const ADMIN_MEMBER_SECTIONS = [
  "phd",
  "ms",
  "research_interns",
  "undergrad",
] as const;
// Written on every save, even when blank, because every entry carries them.
const MEMBER_ALWAYS_FIELDS = ["name_en", "name_ko", "role", "email"] as const;
const MEMBER_LIST_FIELDS = ["education", "research_areas"] as const;
// Written only when non-empty, and removed when cleared — an `affiliation: ""` left
// behind renders an empty element on the people page, since Liquid treats "" as truthy.
const MEMBER_OPTIONAL_FIELDS = [
  "image",
  "affiliation",
  "github",
  "cv",
] as const;

const GALLERY_IMAGE_DIR = "assets/img/gallery";
const GALLERY_CATEGORIES = new Set(["lab-life", "conferences"]);
const MAX_GALLERY_IMAGE_BYTES = 1_500_000;
const MEMBER_IMAGE_DIR = "assets/img/members";
const MEMBER_CV_DIR = "assets/pdf";
const MAX_MEMBER_IMAGE_BYTES = 600_000;
const MAX_MEMBER_CV_BYTES = 4_000_000;

// members.yml double-quotes every string except the two path fields, and its folded `bio`
// block re-wraps at 99 columns. Writing plain scalars at another width would restyle parts of
// the file the editor never touched, so a save's diff would hide the real change. With these
// two settings a save that changes nothing produces a byte-identical file.
const YAML_OUTPUT = { lineWidth: 99 };
const YAML_PLAIN_FIELDS = new Set(["image", "cv"]);

function yamlQuoted(value: string): Scalar {
  const node = new Scalar(value);
  node.type = Scalar.QUOTE_DOUBLE;
  return node;
}

function yamlFieldValue(
  field: string,
  value: string | string[],
): unknown {
  if (YAML_PLAIN_FIELDS.has(field)) return value;
  return Array.isArray(value) ? value.map(yamlQuoted) : yamlQuoted(value);
}

type AdminMember = Record<string, string | string[]>;

// The PI entry has its own shape: four link buttons, a folded biography block, and two
// lists of records. Written back field by field so the file's comments and the folded
// style of `bio` survive.
const PI_LINK_FIELDS = ["email", "scholar", "github", "website"] as const;
const PI_TEXT_FIELDS = ["name_en", "name_ko", "initials", "role"] as const;
const PI_RECORD_LISTS = {
  education: ["degree", "institution", "year"],
  career: ["title", "institution", "period"],
} as const;

function yamlFolded(value: string): Scalar {
  const node = new Scalar(value);
  node.type = Scalar.BLOCK_FOLDED;
  return node;
}

function normalizeMemberList(value: unknown, label: string): string[] {
  const rows = value ?? [];
  if (!Array.isArray(rows) || rows.length > 40) {
    throw new HttpError(400, `${label} 목록이 올바르지 않습니다.`);
  }
  return rows.map((item) => safePlainText(item, label, 300)).filter(Boolean);
}

function normalizeRecordList(
  value: unknown,
  keys: readonly string[],
  label: string,
): Array<Record<string, string>> {
  const rows = value ?? [];
  if (!Array.isArray(rows) || rows.length > 40) {
    throw new HttpError(400, `${label} 목록이 올바르지 않습니다.`);
  }
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new HttpError(400, `${label} 항목이 올바르지 않습니다.`);
    }
    const input = row as Record<string, unknown>;
    const record: Record<string, string> = {};
    for (const key of keys) {
      record[key] = safePlainText(input[key] ?? "", `${label} ${key}`, 300);
    }
    return record;
  }).filter((record) => keys.some((key) => record[key]));
}

function safeMemberId(value: unknown): string {
  const id = safePlainText(value, "Member id", 80).toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    throw new HttpError(
      400,
      "Member id는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.",
    );
  }
  return id;
}

// intern-jiyeon-joung -> jiyeon_joung.jpg. Dropping the section prefix matches the
// convention every existing photo already follows, so filenames cannot drift.
function memberImageName(memberId: string): string {
  const parts = safeMemberId(memberId).split("-");
  return `${(parts.length > 1 ? parts.slice(1) : parts).join("_")}.jpg`;
}

// undergrad-wonseok-choi -> wonseok_choi_cv.pdf, matching the file already in assets/pdf.
function memberCvName(memberId: string): string {
  const parts = safeMemberId(memberId).split("-");
  return `${(parts.length > 1 ? parts.slice(1) : parts).join("_")}_cv.pdf`;
}

function decodeUpload(
  value: unknown,
  limit: number,
): { base64: string; bytes: Uint8Array } {
  const base64 = typeof value === "string" ? value.replace(/\s/g, "") : "";
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new HttpError(400, "업로드 데이터가 올바르지 않습니다.");
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(
      atob(base64),
      (character) => character.charCodeAt(0),
    );
  } catch {
    throw new HttpError(400, "업로드 데이터를 읽을 수 없습니다.");
  }
  if (bytes.byteLength > limit) {
    throw new HttpError(413, "파일 용량이 너무 큽니다.");
  }
  return { base64, bytes };
}

function hasSignature(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

// ---------------------------------------------------------------------------
// BibTeX. Entries are parsed into fields and written back in the file's own layout;
// anything between entries (the year headings) is carried through untouched, and a
// field the editor does not know about survives a save.
// ---------------------------------------------------------------------------

type BibField = { name: string; value: string };
type BibEntry = {
  kind: "entry";
  type: string;
  key: string;
  fields: BibField[];
};
type BibBlock = { kind: "raw"; text: string } | BibEntry;

const BIB_EDITABLE_FIELDS = new Set([
  "title",
  "author",
  "journal",
  "booktitle",
  "year",
  "pages",
  "volume",
  "number",
  "publisher",
  "school",
  "abbr",
  "doi",
  "url",
  "arxiv",
  "abstract",
  "preview",
  "selected",
  "bibtex_show",
  "show_all_authors",
]);

function parseBibtex(source: string): BibBlock[] {
  const blocks: BibBlock[] = [];
  let index = 0;
  let raw = "";
  const flush = () => {
    if (raw) {
      blocks.push({ kind: "raw", text: raw });
      raw = "";
    }
  };
  while (index < source.length) {
    if (source[index] !== "@") {
      raw += source[index++];
      continue;
    }
    const start = index;
    index += 1;
    let type = "";
    while (index < source.length && /[A-Za-z]/.test(source[index])) {
      type += source[index++];
    }
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== "{") {
      raw += source.slice(start, index);
      continue;
    }
    index += 1;
    let key = "";
    while (
      index < source.length && source[index] !== "," && source[index] !== "}"
    ) {
      key += source[index++];
    }
    const fields: BibField[] = [];
    while (index < source.length && source[index] !== "}") {
      if (source[index] === "," || /\s/.test(source[index])) {
        index += 1;
        continue;
      }
      let name = "";
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        name += source[index++];
      }
      while (index < source.length && /\s/.test(source[index])) index += 1;
      if (source[index] !== "=") break;
      index += 1;
      while (index < source.length && /\s/.test(source[index])) index += 1;
      let value = "";
      if (source[index] === "{") {
        let depth = 0;
        do {
          if (source[index] === "{") depth += 1;
          else if (source[index] === "}") depth -= 1;
          value += source[index++];
        } while (index < source.length && depth > 0);
        value = value.slice(1, -1);
      } else if (source[index] === '"') {
        index += 1;
        while (index < source.length && source[index] !== '"') {
          value += source[index++];
        }
        index += 1;
      } else {
        while (index < source.length && !/[,}\s]/.test(source[index])) {
          value += source[index++];
        }
      }
      fields.push({ name: name.trim(), value });
    }
    index += 1;
    flush();
    blocks.push({ kind: "entry", type, key: key.trim(), fields });
  }
  flush();
  return blocks;
}

// Reproduces the file's own column alignment, so a save that changes nothing is byte-identical.
function formatBibEntry(entry: BibEntry): string {
  const body = entry.fields.map((field, position) =>
    `  ${
      field.name.length >= 13 ? `${field.name} ` : field.name.padEnd(13)
    }= {${field.value}}${position === entry.fields.length - 1 ? "" : ","}`
  ).join("\n");
  return `@${entry.type}{${entry.key},\n${body}\n}`;
}

function serializeBibtex(blocks: BibBlock[]): string {
  return blocks.map((block) =>
    block.kind === "raw" ? block.text : formatBibEntry(block)
  ).join("");
}

function safeBibValue(value: unknown, field: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw.length > 4000) throw new HttpError(400, `${field} 값이 너무 깁니다.`);
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(raw)) {
    throw new HttpError(400, `${field}에 사용할 수 없는 문자가 있습니다.`);
  }
  let depth = 0;
  for (const character of raw) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) {
      throw new HttpError(400, `${field}의 중괄호가 맞지 않습니다.`);
    }
  }
  if (depth !== 0) {
    throw new HttpError(400, `${field}의 중괄호가 맞지 않습니다.`);
  }
  return raw.replace(/\s*\n\s*/g, " ");
}

function safeBibKey(value: unknown): string {
  const key = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z][A-Za-z0-9_:.-]{2,80}$/.test(key)) {
    throw new HttpError(
      400,
      "Citation key는 영문으로 시작하는 3자 이상이어야 합니다.",
    );
  }
  return key;
}

function safeIsoDate(value: unknown, field: string): string {
  const raw = safePlainText(value, field, 10);
  const valid = /^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(raw) &&
    new Date(`${raw}T00:00:00Z`).toISOString().slice(0, 10) === raw;
  if (!valid) {
    throw new HttpError(400, `${field} 형식이 올바르지 않습니다 (YYYY-MM-DD).`);
  }
  return raw;
}

function safeGalleryImage(value: unknown): string {
  const raw = safePlainText(value, "Image", 200);
  if (!/^\/assets\/img\/gallery\/[a-z0-9_-]+\.jpg$/.test(raw)) {
    throw new HttpError(400, "사진 경로가 올바르지 않습니다.");
  }
  return raw;
}

function normalizeGalleryPhoto(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "사진 데이터가 올바르지 않습니다.");
  }
  const input = value as Record<string, unknown>;
  const category = safePlainText(input.category ?? "", "Category", 40);
  if (!GALLERY_CATEGORIES.has(category)) {
    throw new HttpError(400, "허용되지 않은 카테고리입니다.");
  }
  const caption = safePlainText(input.caption ?? "", "Caption", 200);
  if (!caption) throw new HttpError(400, "Caption은 비워둘 수 없습니다.");
  return {
    image: safeGalleryImage(input.image),
    caption,
    category,
    date: safeIsoDate(input.date, "Date"),
  };
}

// The gallery page renders site.data.gallery.photos in file order, so the file itself has to
// stay sorted newest-first.
function sortPhotos(
  photos: Record<string, string>[],
): Record<string, string>[] {
  return photos.slice().sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
}

function safeMemberImage(value: unknown): string {
  const raw = safePlainText(value, "Image", 200);
  if (!raw) return "";
  if (!/^\/assets\/img\/members\/[a-z0-9_]+\.jpg$/.test(raw)) {
    throw new HttpError(400, "프로필 사진 경로가 올바르지 않습니다.");
  }
  return raw;
}

function normalizeAdminMember(value: unknown): AdminMember {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "멤버 데이터가 올바르지 않습니다.");
  }
  const input = value as Record<string, unknown>;
  const member: AdminMember = { id: safeMemberId(input.id) };

  for (const field of MEMBER_ALWAYS_FIELDS) {
    member[field] = safePlainText(input[field] ?? "", field, 300);
  }
  if (!member.name_en) {
    throw new HttpError(400, "English name은 비워둘 수 없습니다.");
  }
  if (!member.role) throw new HttpError(400, "Role은 비워둘 수 없습니다.");

  for (const field of MEMBER_LIST_FIELDS) {
    const raw = input[field] ?? [];
    if (!Array.isArray(raw) || raw.length > 20) {
      throw new HttpError(400, `${field} 목록이 올바르지 않습니다.`);
    }
    member[field] = raw.map((item) => safePlainText(item, field, 300)).filter(
      Boolean,
    );
  }

  member.image = safeMemberImage(input.image);
  member.affiliation = safePlainText(
    input.affiliation ?? "",
    "Affiliation",
    300,
  );
  member.github = safeUrl(input.github ?? "", "GitHub");
  member.cv = safeCv(input.cv ?? "");
  return member;
}

function readAdminSections(
  data: Record<string, unknown>,
): Record<string, AdminMember[]> {
  const sections: Record<string, AdminMember[]> = {};
  for (const section of ADMIN_MEMBER_SECTIONS) {
    const rows = Array.isArray(data[section])
      ? data[section] as Array<Record<string, unknown>>
      : [];
    sections[section] = rows.map((row) => {
      const member: AdminMember = { id: String(row.id ?? "") };
      for (const field of MEMBER_ALWAYS_FIELDS) {
        member[field] = typeof row[field] === "string"
          ? row[field] as string
          : "";
      }
      for (const field of MEMBER_LIST_FIELDS) {
        member[field] = Array.isArray(row[field])
          ? (row[field] as unknown[]).map((item) => String(item))
          : [];
      }
      for (const field of MEMBER_OPTIONAL_FIELDS) {
        member[field] = typeof row[field] === "string"
          ? row[field] as string
          : "";
      }
      return member;
    });
  }
  return sections;
}

// Field order for a newly created entry, matching the existing file by eye.
function memberNode(member: AdminMember): Record<string, unknown> {
  const node: Record<string, unknown> = {};
  const put = (field: string) => {
    node[field] = yamlFieldValue(field, member[field]);
  };
  put("id");
  put("name_en");
  put("name_ko");
  put("role");
  if (member.image) put("image");
  if (member.affiliation) put("affiliation");
  put("education");
  put("research_areas");
  put("email");
  if (member.github) put("github");
  if (member.cv) put("cv");
  return node;
}

async function existingFileSha(path: string): Promise<string | undefined> {
  try {
    return (await readGitHubFile(path)).sha;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return undefined;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Generic editor for the simple _data collections. Each one is a list of records with
// the same shape, so a schema is enough: the reader, the writer and the browser form
// are all driven from this table.
// ---------------------------------------------------------------------------

type DataFieldKind = "text" | "list" | "bool" | "image";
type DataField = {
  name: string;
  kind: DataFieldKind;
  label: string;
  required?: boolean;
  quoted?: boolean;
  wide?: boolean;
};
type DataCollection = {
  path: string;
  // Path to the list inside the file, so a nested one such as alumni.intern_alumni works too.
  root: string[];
  label: string;
  imageDir?: string;
  // members.yml holds a folded block scalar and must keep its wrapping; the standalone
  // _data files hold long one-line strings and must not be wrapped at all.
  output?: { lineWidth: number };
  fields: DataField[];
};

// Unlike members.yml these files have no folded block scalar, and they do hold long one-line
// strings, so they are written without wrapping — which reproduces them exactly.
const DATA_YAML_OUTPUT = { lineWidth: 0 };

const DATA_COLLECTIONS: Record<string, DataCollection> = {
  equipment: {
    path: "_data/equipment.yml",
    root: ["equipment"],
    label: "Lab equipment",
    imageDir: "assets/img/lab-equipment",
    fields: [
      {
        name: "name",
        kind: "text",
        label: "Name",
        required: true,
        quoted: true,
      },
      { name: "image", kind: "image", label: "Photo" },
      {
        name: "description",
        kind: "text",
        label: "Description",
        quoted: true,
        wide: true,
      },
    ],
  },
  facilities: {
    path: "_data/facilities.yml",
    root: ["facilities"],
    label: "Facilities",
    imageDir: "assets/img/lab-equipment",
    fields: [
      {
        name: "name",
        kind: "text",
        label: "Name",
        required: true,
        quoted: true,
      },
      { name: "badge", kind: "text", label: "Badge", quoted: true },
      { name: "image", kind: "image", label: "Photo" },
      {
        name: "description",
        kind: "text",
        label: "Description",
        quoted: true,
        wide: true,
      },
      { name: "specs", kind: "list", label: "Specs", quoted: true, wide: true },
    ],
  },
  positions: {
    path: "_data/positions.yml",
    root: ["positions"],
    label: "Open positions",
    fields: [
      {
        name: "title",
        kind: "text",
        label: "Title",
        required: true,
        quoted: true,
      },
      {
        name: "description",
        kind: "text",
        label: "Description",
        quoted: true,
        wide: true,
      },
      {
        name: "requirements",
        kind: "list",
        label: "Requirements",
        quoted: true,
        wide: true,
      },
      {
        name: "apply_url",
        kind: "text",
        label: "Apply 링크 (Google/Notion 폼 주소, 비우면 이메일로 연결)",
        quoted: true,
        wide: true,
      },
      { name: "open", kind: "bool", label: "Currently open" },
    ],
  },
  research_areas: {
    path: "_data/research_areas.yml",
    root: ["areas"],
    label: "Research areas",
    fields: [
      {
        name: "title",
        kind: "text",
        label: "Title",
        required: true,
        quoted: true,
      },
      {
        name: "icon",
        kind: "text",
        label: "아이콘 (Font Awesome 클래스)",
        quoted: true,
      },
      {
        name: "summary",
        kind: "text",
        label: "한 줄 요약 (홈 화면)",
        quoted: true,
        wide: true,
      },
      {
        name: "description",
        kind: "text",
        label: "설명 (Research Areas 페이지)",
        quoted: true,
        wide: true,
      },
      {
        name: "focus",
        kind: "list",
        label: "Focus 태그",
        quoted: true,
        wide: true,
      },
    ],
  },
  alumni_intern: {
    path: "_data/members.yml",
    root: ["alumni", "intern_alumni"],
    label: "Alumni (interns)",
    output: YAML_OUTPUT,
    fields: [
      {
        name: "name_en",
        kind: "text",
        label: "Name",
        required: true,
        quoted: true,
      },
      { name: "period", kind: "text", label: "Period", quoted: true },
      {
        name: "affiliation",
        kind: "text",
        label: "Affiliation",
        quoted: true,
        wide: true,
      },
      {
        name: "next",
        kind: "text",
        label: "Next position",
        quoted: true,
        wide: true,
      },
      {
        name: "linkedin",
        kind: "text",
        label: "LinkedIn URL",
        quoted: true,
        wide: true,
      },
    ],
  },
  alumni_undergrad: {
    path: "_data/members.yml",
    root: ["alumni", "undergrad_alumni"],
    label: "Alumni (undergraduates)",
    output: YAML_OUTPUT,
    fields: [
      {
        name: "name_en",
        kind: "text",
        label: "Name",
        required: true,
        quoted: true,
      },
      { name: "period", kind: "text", label: "Period", quoted: true },
      {
        name: "affiliation",
        kind: "text",
        label: "Affiliation",
        quoted: true,
        wide: true,
      },
      {
        name: "next",
        kind: "text",
        label: "Next position",
        quoted: true,
        wide: true,
      },
      {
        name: "linkedin",
        kind: "text",
        label: "LinkedIn URL",
        quoted: true,
        wide: true,
      },
    ],
  },
};

function resolveCollection(value: unknown): [string, DataCollection] {
  const id = typeof value === "string" ? value : "";
  const collection = DATA_COLLECTIONS[id];
  if (!collection) throw new HttpError(400, "알 수 없는 콘텐츠 종류입니다.");
  return [id, collection];
}

function readDataRecord(
  row: Record<string, unknown>,
  collection: DataCollection,
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const field of collection.fields) {
    const raw = row[field.name];
    if (field.kind === "list") {
      record[field.name] = Array.isArray(raw)
        ? raw.map((item) => String(item))
        : [];
    } else if (field.kind === "bool") {
      record[field.name] = raw === true;
    } else {
      record[field.name] = typeof raw === "string" ? raw : "";
    }
  }
  return record;
}

function normalizeDataRecord(
  value: unknown,
  collection: DataCollection,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "항목 데이터가 올바르지 않습니다.");
  }
  const input = value as Record<string, unknown>;
  const record: Record<string, unknown> = {};
  for (const field of collection.fields) {
    if (field.kind === "list") {
      const raw = input[field.name] ?? [];
      if (!Array.isArray(raw) || raw.length > 40) {
        throw new HttpError(400, `${field.label} 목록이 올바르지 않습니다.`);
      }
      record[field.name] = raw.map((item) =>
        safePlainText(item, field.label, 400)
      )
        .filter(Boolean);
    } else if (field.kind === "bool") {
      record[field.name] = input[field.name] === true;
    } else if (field.kind === "image") {
      const raw = safePlainText(input[field.name] ?? "", field.label, 200);
      if (raw && !/^\/assets\/img\/[a-z0-9_/-]+\.(jpg|png)$/.test(raw)) {
        throw new HttpError(400, "사진 경로가 올바르지 않습니다.");
      }
      record[field.name] = raw;
    } else {
      record[field.name] = safePlainText(
        input[field.name] ?? "",
        field.label,
        1500,
      );
    }
    if (field.required && !record[field.name]) {
      throw new HttpError(400, `${field.label}은(는) 비워둘 수 없습니다.`);
    }
  }
  return record;
}

// Empty optional values are dropped rather than written as "", which Liquid treats as truthy.
function dataNode(
  record: Record<string, unknown>,
  collection: DataCollection,
): Record<string, unknown> {
  const node: Record<string, unknown> = {};
  for (const field of collection.fields) {
    const value = record[field.name];
    if (field.kind === "list") {
      const items = value as string[];
      if (items.length) {
        node[field.name] = field.quoted ? items.map(yamlQuoted) : items;
      }
    } else if (field.kind === "bool") {
      node[field.name] = value === true;
    } else if (value) {
      node[field.name] = field.quoted
        ? yamlQuoted(value as string)
        : (value as string);
    }
  }
  return node;
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

  if (action === "admin.members.read") {
    requireAdmin(profile);
    const file = await readGitHubFile("_data/members.yml");
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error("members.yml could not be parsed");
    }
    return {
      sha: file.sha,
      sections: readAdminSections(document.toJS() as Record<string, unknown>),
    };
  }

  if (action === "admin.members.save") {
    requireAdmin(profile);
    if (typeof body.sha !== "string") {
      throw new HttpError(400, "members.yml revision이 없습니다.");
    }
    const requested = body.sections;
    if (
      !requested || typeof requested !== "object" || Array.isArray(requested)
    ) {
      throw new HttpError(400, "멤버 데이터가 올바르지 않습니다.");
    }

    // Validate everything before touching the document, and keep ids unique across sections.
    const normalized: Record<string, AdminMember[]> = {};
    const seenIds = new Set<string>();
    for (const section of ADMIN_MEMBER_SECTIONS) {
      const rows = (requested as Record<string, unknown>)[section] ?? [];
      if (!Array.isArray(rows) || rows.length > 60) {
        throw new HttpError(400, `${section} 목록이 올바르지 않습니다.`);
      }
      normalized[section] = rows.map((row) => {
        const member = normalizeAdminMember(row);
        const id = member.id as string;
        if (seenIds.has(id)) {
          throw new HttpError(409, `중복된 member id입니다: ${id}`);
        }
        seenIds.add(id);
        return member;
      });
    }

    const file = await readGitHubFile("_data/members.yml");
    if (file.sha !== body.sha) {
      throw new HttpError(
        409,
        "members.yml이 다른 곳에서 먼저 수정되었습니다.",
      );
    }
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error("members.yml could not be parsed");
    }
    const data = document.toJS() as Record<string, unknown>;

    let added = 0;
    let removed = 0;
    for (const section of ADMIN_MEMBER_SECTIONS) {
      const incoming = normalized[section];
      const before = Array.isArray(data[section])
        ? data[section] as Array<Record<string, unknown>>
        : [];
      const keep = new Set(incoming.map((member) => member.id as string));

      // Delete back to front so the earlier indices stay valid.
      for (let index = before.length - 1; index >= 0; index -= 1) {
        const id = before[index]?.id;
        if (typeof id === "string" && !keep.has(id)) {
          document.deleteIn([section, index]);
          removed += 1;
        }
      }

      const survivors = before
        .map((row) => row?.id)
        .filter((id): id is string => typeof id === "string" && keep.has(id));

      for (const member of incoming) {
        const index = survivors.indexOf(member.id as string);
        if (index === -1) continue;
        for (const field of [...MEMBER_ALWAYS_FIELDS, ...MEMBER_LIST_FIELDS]) {
          document.setIn(
            [section, index, field],
            yamlFieldValue(field, member[field]),
          );
        }
        for (const field of MEMBER_OPTIONAL_FIELDS) {
          if (member[field]) {
            document.setIn(
              [section, index, field],
              yamlFieldValue(field, member[field]),
            );
          } else if (document.hasIn([section, index, field])) {
            document.deleteIn([section, index, field]);
          }
        }
      }

      let appended = 0;
      for (const member of incoming) {
        if (survivors.includes(member.id as string)) continue;
        document.addIn([section], memberNode(member));
        appended += 1;
      }
      if (appended) {
        added += appended;
        // `phd: []` is a flow sequence; adding to it would keep everything on one line.
        const node = document.getIn([section], true) as
          | { flow?: boolean }
          | undefined;
        if (node && typeof node === "object") node.flow = false;
      }
    }

    const saved = await saveGitHubFile(
      "_data/members.yml",
      document.toString(YAML_OUTPUT),
      "cms: update members",
      file.sha,
    );
    await audit(
      profile,
      "admin.members.save",
      "_data/members.yml",
      saved.commit_sha,
      { added, removed, total: seenIds.size },
    );
    return { ...saved, added, removed };
  }

  if (action === "admin.members.image" || action === "admin.members.cv") {
    requireAdmin(profile);
    const memberId = safeMemberId(body.member_id);
    const isCv = action === "admin.members.cv";
    const { base64, bytes } = decodeUpload(
      body.content_base64,
      isCv ? MAX_MEMBER_CV_BYTES : MAX_MEMBER_IMAGE_BYTES,
    );
    // Trust the bytes, not the client: only the real format may reach the repository.
    const ok = isCv
      ? hasSignature(bytes, [0x25, 0x50, 0x44, 0x46])
      : hasSignature(bytes, [0xff, 0xd8, 0xff]);
    if (!ok) {
      throw new HttpError(
        400,
        isCv
          ? "PDF 파일만 올릴 수 있습니다."
          : "JPEG 이미지만 올릴 수 있습니다.",
      );
    }
    const path = isCv
      ? `${MEMBER_CV_DIR}/${memberCvName(memberId)}`
      : `${MEMBER_IMAGE_DIR}/${memberImageName(memberId)}`;
    const saved = await putGitHubFile(
      path,
      base64,
      `cms: update ${isCv ? "CV" : "photo"} for ${memberId}`,
      await existingFileSha(path),
    );
    await audit(profile, action, path, saved.commit_sha, {
      member_id: memberId,
    });
    return isCv
      ? { ...saved, cv: `/${path}` }
      : { ...saved, image: `/${path}` };
  }

  if (action === "admin.pi.read") {
    requireAdmin(profile);
    const file = await readGitHubFile("_data/members.yml");
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error("members.yml could not be parsed");
    }
    const data = document.toJS() as { pi?: Array<Record<string, unknown>> };
    const pi = (data.pi ?? [])[0];
    if (!pi) throw new HttpError(404, "PI 항목을 찾을 수 없습니다.");
    const text = (name: string) =>
      typeof pi[name] === "string" ? pi[name] as string : "";
    const list = (name: string) =>
      Array.isArray(pi[name])
        ? (pi[name] as unknown[]).map((item) => String(item))
        : [];
    const records = (name: keyof typeof PI_RECORD_LISTS) =>
      (Array.isArray(pi[name])
        ? pi[name] as Array<Record<string, unknown>>
        : []).map((row) =>
          Object.fromEntries(
            PI_RECORD_LISTS[name].map((
              key,
            ) => [key, typeof row[key] === "string" ? row[key] : ""]),
          )
        );
    return {
      sha: file.sha,
      member_id: text("id"),
      pi: {
        ...Object.fromEntries(PI_TEXT_FIELDS.map((name) => [name, text(name)])),
        ...Object.fromEntries(PI_LINK_FIELDS.map((name) => [name, text(name)])),
        image: text("image"),
        cv: text("cv"),
        bio: text("bio"),
        research_interests: list("research_interests"),
        awards: list("awards"),
        education: records("education"),
        career: records("career"),
      },
    };
  }

  if (action === "admin.pi.save") {
    requireAdmin(profile);
    if (typeof body.sha !== "string") {
      throw new HttpError(400, "members.yml revision이 없습니다.");
    }
    const input =
      (body.pi && typeof body.pi === "object" && !Array.isArray(body.pi)
        ? body.pi
        : {}) as Record<string, unknown>;

    const values: Record<string, string> = {};
    for (const name of PI_TEXT_FIELDS) {
      values[name] = safePlainText(input[name] ?? "", name, 300);
    }
    if (!values.name_en) {
      throw new HttpError(400, "English name은 비워둘 수 없습니다.");
    }
    if (!values.role) throw new HttpError(400, "Role은 비워둘 수 없습니다.");
    // Email is plain text rather than a URL: the site links it with mailto:.
    values.email = safePlainText(input.email ?? "", "Email", 200);
    for (const name of ["scholar", "github", "website"] as const) {
      values[name] = safeUrl(input[name] ?? "", name);
    }
    values.image = safeMemberImage(input.image);
    values.cv = safeCv(input.cv ?? "");
    const bio = safePlainText(input.bio ?? "", "Bio", 4000);
    const interests = normalizeMemberList(
      input.research_interests,
      "Research interests",
    );
    const awards = normalizeMemberList(input.awards, "Awards");
    const education = normalizeRecordList(
      input.education,
      PI_RECORD_LISTS.education,
      "Education",
    );
    const career = normalizeRecordList(
      input.career,
      PI_RECORD_LISTS.career,
      "Career",
    );

    const file = await readGitHubFile("_data/members.yml");
    if (file.sha !== body.sha) {
      throw new HttpError(
        409,
        "members.yml이 다른 곳에서 먼저 수정되었습니다.",
      );
    }
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error("members.yml could not be parsed");
    }
    if (!document.hasIn(["pi", 0])) {
      throw new HttpError(404, "PI 항목을 찾을 수 없습니다.");
    }

    for (const name of [...PI_TEXT_FIELDS, ...PI_LINK_FIELDS]) {
      document.setIn(["pi", 0, name], yamlQuoted(values[name]));
    }
    // image is written unquoted, matching every other path in this file.
    if (values.image) document.setIn(["pi", 0, "image"], values.image);
    else if (document.hasIn(["pi", 0, "image"])) {
      document.deleteIn(["pi", 0, "image"]);
    }
    // bio keeps its folded block style; a plain scalar would rewrite the whole paragraph.
    document.setIn(["pi", 0, "bio"], yamlFolded(bio));
    document.setIn(["pi", 0, "research_interests"], interests);
    document.setIn(["pi", 0, "awards"], awards);
    for (const [name, keys] of Object.entries(PI_RECORD_LISTS)) {
      const rows = name === "education" ? education : career;
      document.setIn(
        ["pi", 0, name],
        rows.map((row) =>
          Object.fromEntries(keys.map((key) => [key, yamlQuoted(row[key])]))
        ),
      );
    }

    const saved = await saveGitHubFile(
      "_data/members.yml",
      document.toString(YAML_OUTPUT),
      "cms: update PI profile",
      file.sha,
    );
    await audit(
      profile,
      "admin.pi.save",
      "_data/members.yml",
      saved.commit_sha,
    );
    return saved;
  }

  if (action === "admin.data.read") {
    requireAdmin(profile);
    const [id, collection] = resolveCollection(body.collection);
    const file = await readGitHubFile(collection.path);
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error(`${collection.path} could not be parsed`);
    }
    const found = collection.root.reduce<unknown>(
      (current, key) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      document.toJS(),
    );
    const rows = Array.isArray(found)
      ? found as Array<Record<string, unknown>>
      : [];
    return {
      sha: file.sha,
      collection: id,
      label: collection.label,
      path: collection.path,
      uploads: Boolean(collection.imageDir),
      fields: collection.fields,
      items: rows.map((row) => readDataRecord(row, collection)),
    };
  }

  if (action === "admin.data.save") {
    requireAdmin(profile);
    const [, collection] = resolveCollection(body.collection);
    if (typeof body.sha !== "string") {
      throw new HttpError(400, "revision이 없습니다.");
    }
    const rows = body.items;
    if (!Array.isArray(rows) || rows.length > 200) {
      throw new HttpError(400, "항목 목록이 올바르지 않습니다.");
    }
    const items = rows.map((row) => normalizeDataRecord(row, collection));

    const file = await readGitHubFile(collection.path);
    if (file.sha !== body.sha) {
      throw new HttpError(
        409,
        `${collection.label}이(가) 다른 곳에서 먼저 수정되었습니다.`,
      );
    }
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error(`${collection.path} could not be parsed`);
    }
    // The list is rebuilt so entries can be reordered, so the heading comment and the blank
    // line between entries are re-attached by hand.
    const previous = document.getIn(collection.root, true) as
      | { commentBefore?: string }
      | undefined;
    const commentBefore = previous && typeof previous === "object"
      ? previous.commentBefore
      : undefined;
    const sequence = document.createNode(
      items.map((item) => dataNode(item, collection)),
    ) as { commentBefore?: string; items?: Array<{ spaceBefore?: boolean }> };
    if (commentBefore !== undefined) sequence.commentBefore = commentBefore;
    (sequence.items ?? []).forEach((item, index) => {
      if (index > 0) item.spaceBefore = true;
    });
    document.setIn(collection.root, sequence);

    const saved = await saveGitHubFile(
      collection.path,
      document.toString(collection.output ?? DATA_YAML_OUTPUT),
      `cms: update ${collection.label.toLowerCase()}`,
      file.sha,
    );
    await audit(profile, "admin.data.save", collection.path, saved.commit_sha, {
      total: items.length,
    });
    return { ...saved, items };
  }

  if (action === "admin.data.image") {
    requireAdmin(profile);
    const [, collection] = resolveCollection(body.collection);
    if (!collection.imageDir) {
      throw new HttpError(400, "이 항목은 사진을 올릴 수 없습니다.");
    }
    const slug = safePlainText(body.name ?? "", "Name", 200)
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
      .slice(0, 60) || "item";
    const { base64, bytes } = decodeUpload(
      body.content_base64,
      MAX_GALLERY_IMAGE_BYTES,
    );
    if (!hasSignature(bytes, [0xff, 0xd8, 0xff])) {
      throw new HttpError(400, "JPEG 이미지만 올릴 수 있습니다.");
    }
    const path = `${collection.imageDir}/${slug}.jpg`;
    const saved = await putGitHubFile(
      path,
      base64,
      `cms: update ${collection.label.toLowerCase()} photo ${slug}`,
      await existingFileSha(path),
    );
    await audit(profile, "admin.data.image", path, saved.commit_sha);
    return { ...saved, image: `/${path}` };
  }

  if (action === "admin.pubs.read") {
    requireAdmin(profile);
    const file = await readGitHubFile("_bibliography/papers.bib");
    const blocks = parseBibtex(file.content);
    return {
      sha: file.sha,
      editable: [...BIB_EDITABLE_FIELDS],
      entries: blocks.filter((block): block is BibEntry =>
        block.kind === "entry"
      ).map((entry) => ({
        key: entry.key,
        type: entry.type,
        fields: Object.fromEntries(
          entry.fields.map((field) => [field.name, field.value]),
        ),
        order: entry.fields.map((field) => field.name),
      })),
    };
  }

  // Turns a pasted BibTeX record into form values. Nothing is written.
  if (action === "admin.pubs.parse") {
    requireAdmin(profile);
    const text = typeof body.bibtex === "string" ? body.bibtex : "";
    if (text.length > 20_000) throw new HttpError(400, "BibTeX가 너무 깁니다.");
    const entry = parseBibtex(text).find(
      (block): block is BibEntry => block.kind === "entry",
    );
    if (!entry) throw new HttpError(400, "BibTeX 항목을 찾지 못했습니다.");
    return {
      key: entry.key,
      type: entry.type,
      fields: Object.fromEntries(
        entry.fields.map((field) => [field.name, field.value]),
      ),
    };
  }

  if (action === "admin.pubs.save") {
    requireAdmin(profile);
    if (typeof body.sha !== "string") {
      throw new HttpError(400, "papers.bib revision이 없습니다.");
    }
    const rows = body.entries;
    if (!Array.isArray(rows) || rows.length > 500) {
      throw new HttpError(400, "논문 목록이 올바르지 않습니다.");
    }

    // Validate everything before touching the file.
    const incoming = rows.map((row) => {
      const record = (row && typeof row === "object" ? row : {}) as Record<
        string,
        unknown
      >;
      const type = safePlainText(record.type ?? "article", "Type", 30)
        .toLowerCase();
      if (!/^[a-z]+$/.test(type)) {
        throw new HttpError(400, "Entry type이 올바르지 않습니다.");
      }
      const fields = (record.fields && typeof record.fields === "object"
        ? record.fields
        : {}) as Record<string, unknown>;
      const clean: Record<string, string> = {};
      for (const [name, value] of Object.entries(fields)) {
        if (!BIB_EDITABLE_FIELDS.has(name)) {
          continue;
        }
        const text = safeBibValue(value, name);
        if (text) {
          clean[name] = text;
        }
      }
      if (!clean.title) {
        throw new HttpError(400, "Title은 비워둘 수 없습니다.");
      }
      if (!clean.author) {
        throw new HttpError(400, "Author는 비워둘 수 없습니다.");
      }
      if (!clean.year || !/^\d{4}$/.test(clean.year)) {
        throw new HttpError(400, "Year는 네 자리 숫자여야 합니다.");
      }
      return { key: safeBibKey(record.key), type, fields: clean };
    });

    const seenKeys = new Set<string>();
    for (const entry of incoming) {
      if (seenKeys.has(entry.key)) {
        throw new HttpError(409, `중복된 citation key입니다: ${entry.key}`);
      }
      seenKeys.add(entry.key);
    }

    const file = await readGitHubFile("_bibliography/papers.bib");
    if (file.sha !== body.sha) {
      throw new HttpError(409, "papers.bib이 다른 곳에서 먼저 수정되었습니다.");
    }
    const blocks = parseBibtex(file.content);
    const byKey = new Map<string, BibEntry>();
    for (const block of blocks) {
      if (block.kind === "entry") {
        byKey.set(block.key, block);
      }
    }

    let added = 0;
    let removed = 0;
    const fresh: BibEntry[] = [];
    for (const entry of incoming) {
      const existing = byKey.get(entry.key);
      if (existing) {
        existing.type = entry.type;
        // Update in place, keeping field order, then append fields that are new to this entry.
        for (const field of existing.fields) {
          if (entry.fields[field.name] !== undefined) {
            field.value = entry.fields[field.name];
          }
        }
        const present = new Set(existing.fields.map((field) => field.name));
        // A known field cleared in the form is dropped; unknown fields are never touched.
        existing.fields = existing.fields.filter((field) =>
          !BIB_EDITABLE_FIELDS.has(field.name) ||
          entry.fields[field.name] !== undefined
        );
        for (const [name, value] of Object.entries(entry.fields)) {
          if (!present.has(name)) existing.fields.push({ name, value });
        }
      } else {
        fresh.push({
          kind: "entry",
          type: entry.type,
          key: entry.key,
          fields: Object.entries(entry.fields).map(([name, value]) => ({
            name,
            value,
          })),
        });
        added += 1;
      }
    }

    for (let position = blocks.length - 1; position >= 0; position -= 1) {
      const block = blocks[position];
      if (block.kind === "entry" && !seenKeys.has(block.key)) {
        blocks.splice(position, 1);
        removed += 1;
      }
    }

    // New records go above the first existing one, where the newest year already lives.
    const firstEntry = blocks.findIndex((block) => block.kind === "entry");
    const insertAt = firstEntry === -1 ? blocks.length : firstEntry;
    for (const entry of fresh.reverse()) {
      blocks.splice(insertAt, 0, entry, { kind: "raw", text: "\n\n" });
    }

    const saved = await saveGitHubFile(
      "_bibliography/papers.bib",
      serializeBibtex(blocks),
      "cms: update publications",
      file.sha,
    );
    await audit(
      profile,
      "admin.pubs.save",
      "_bibliography/papers.bib",
      saved.commit_sha,
      {
        added,
        removed,
        total: incoming.length,
      },
    );
    return { ...saved, added, removed };
  }

  if (action === "admin.gallery.read") {
    requireAdmin(profile);
    const file = await readGitHubFile("_data/gallery.yml");
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error("gallery.yml could not be parsed");
    }
    const data = document.toJS() as { photos?: Array<Record<string, unknown>> };
    return {
      sha: file.sha,
      categories: [...GALLERY_CATEGORIES],
      photos: (data.photos ?? []).map((photo) => ({
        image: String(photo.image ?? ""),
        caption: String(photo.caption ?? ""),
        category: String(photo.category ?? ""),
        date: String(photo.date ?? ""),
      })),
    };
  }

  if (action === "admin.gallery.save") {
    requireAdmin(profile);
    if (typeof body.sha !== "string") {
      throw new HttpError(400, "gallery.yml revision이 없습니다.");
    }
    const rows = body.photos;
    if (!Array.isArray(rows) || rows.length > 400) {
      throw new HttpError(400, "사진 목록이 올바르지 않습니다.");
    }
    const photos = sortPhotos(rows.map(normalizeGalleryPhoto));
    const seenImages = new Set<string>();
    for (const photo of photos) {
      if (seenImages.has(photo.image)) {
        throw new HttpError(409, `같은 사진이 두 번 있습니다: ${photo.image}`);
      }
      seenImages.add(photo.image);
    }

    const file = await readGitHubFile("_data/gallery.yml");
    if (file.sha !== body.sha) {
      throw new HttpError(
        409,
        "gallery.yml이 다른 곳에서 먼저 수정되었습니다.",
      );
    }
    const document = parseDocument(file.content, { keepSourceTokens: true });
    if (document.errors.length) {
      throw new Error("gallery.yml could not be parsed");
    }

    // Rebuilding the sequence is what lets the list be reordered, so the heading comment and the
    // blank line between entries have to be put back by hand.
    const previous = document.getIn(["photos"], true) as
      | { commentBefore?: string }
      | undefined;
    const commentBefore = previous && typeof previous === "object"
      ? previous.commentBefore
      : undefined;
    const sequence = document.createNode(
      photos.map((photo) => ({
        image: yamlQuoted(photo.image),
        caption: yamlQuoted(photo.caption),
        category: yamlQuoted(photo.category),
        date: yamlQuoted(photo.date),
      })),
    ) as { commentBefore?: string; items?: Array<{ spaceBefore?: boolean }> };
    if (commentBefore !== undefined) sequence.commentBefore = commentBefore;
    (sequence.items ?? []).forEach((item, index) => {
      if (index > 0) item.spaceBefore = true;
    });
    document.set("photos", sequence);

    const saved = await saveGitHubFile(
      "_data/gallery.yml",
      document.toString(YAML_OUTPUT),
      "cms: update gallery",
      file.sha,
    );
    await audit(
      profile,
      "admin.gallery.save",
      "_data/gallery.yml",
      saved.commit_sha,
      {
        total: photos.length,
      },
    );
    return { ...saved, photos };
  }

  if (action === "admin.gallery.image") {
    requireAdmin(profile);
    const date = safeIsoDate(body.date, "Date");
    const slugSource = safePlainText(body.caption ?? "", "Caption", 200)
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
      .slice(0, 60) || "photo";
    const { base64, bytes } = decodeUpload(
      body.content_base64,
      MAX_GALLERY_IMAGE_BYTES,
    );
    if (!hasSignature(bytes, [0xff, 0xd8, 0xff])) {
      throw new HttpError(400, "JPEG 이미지만 올릴 수 있습니다.");
    }
    // Several photos can share a date and caption, so find the first free name.
    let path = `${GALLERY_IMAGE_DIR}/${date}_${slugSource}.jpg`;
    for (
      let suffix = 2;
      suffix <= 20 && await existingFileSha(path);
      suffix += 1
    ) {
      path = `${GALLERY_IMAGE_DIR}/${date}_${slugSource}_${
        String(suffix).padStart(2, "0")
      }.jpg`;
    }
    const saved = await putGitHubFile(
      path,
      base64,
      `cms: add gallery photo ${date}`,
      await existingFileSha(path),
    );
    await audit(profile, "admin.gallery.image", path, saved.commit_sha);
    return { ...saved, image: `/${path}` };
  }

  if (action === "admin.news.list") {
    requireAdmin(profile);
    const items = (await listNewsResources()).map((resource) => {
      const match = resource.label.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      return {
        id: resource.id,
        name: resource.label,
        path: resource.path,
        date: match ? match[1] : "",
        slug: match ? match[2] : resource.label,
      };
    });
    return { items };
  }

  if (action === "admin.news.item") {
    requireAdmin(profile);
    const { path, name } = newsPathFromId(body.resource_id);
    const file = await readGitHubFile(path);
    const { front, body: text } = parseNews(file.content);
    return {
      sha: file.sha,
      path,
      name,
      date: (front.date || "").slice(0, 10),
      display_date: front.display_date || "",
      body: text,
    };
  }

  if (action === "admin.news.update") {
    requireAdmin(profile);
    const { path, name } = newsPathFromId(body.resource_id);
    if (typeof body.sha !== "string") {
      throw new HttpError(400, "News revision이 없습니다.");
    }
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text || text.length > 50_000) {
      throw new HttpError(400, "News 본문의 길이를 확인해 주세요.");
    }
    if (text.includes("{{") || text.includes("{%")) {
      throw new HttpError(400, "본문에 Liquid 코드를 넣을 수 없습니다.");
    }
    const displayDate = typeof body.display_date === "string"
      ? safePlainText(body.display_date, "Display date", 80)
      : "";
    const file = await readGitHubFile(path);
    if (file.sha !== body.sha) {
      throw new HttpError(409, "이 News가 다른 곳에서 먼저 수정되었습니다.");
    }
    const content = rewriteNews(file.content, {
      display_date: displayDate ? JSON.stringify(displayDate) : null,
    }, text);
    const saved = await saveGitHubFile(
      path,
      content,
      `cms: update news ${name}`,
      file.sha,
    );
    await audit(profile, "admin.news.update", path, saved.commit_sha);
    return saved;
  }

  if (action === "admin.news.remove") {
    requireAdmin(profile);
    const { path, name } = newsPathFromId(body.resource_id);
    const file = await readGitHubFile(path);
    const removed = await deleteGitHubFile(
      path,
      `cms: remove news ${name}`,
      file.sha,
    );
    await audit(profile, "admin.news.remove", path, removed.commit_sha);
    return removed;
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
      document.setIn([...memberPath, field], yamlFieldValue(field, value));
    }
    const content = document.toString(YAML_OUTPUT);
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
    if (contentLength > MAX_REQUEST_BYTES) {
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
