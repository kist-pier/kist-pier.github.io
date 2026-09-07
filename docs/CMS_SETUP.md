# PIER Lab Web CMS setup

The CMS keeps the public site on Jekyll/GitHub Pages. Supabase provides invite-only authentication, the account/role database, audit logs, and a server-side Edge Function. The Edge Function checks each user's role before it commits an allowlisted content file to GitHub.

No database secret, GitHub token, or GitHub App private key is stored in this repository or sent to the browser.

## Permission model

| Role | Allowed operations |
| --- | --- |
| `admin` | Read and update allowlisted page/data/publication files; create and update News; optionally edit their own linked member profile |
| `member` | Read and update only the member entry whose stable `id` matches `cms_profiles.member_id` |

The regular-member API accepts only these fields: `name_en`, `name_ko`, `email`, `github`, `cv`, `website`, `affiliation`, `education`, `research_areas`, and `bio`. It cannot change `id`, `role`, the member category, other people, or account permissions. This restriction is enforced in the Edge Function, not merely hidden in the UI.

The administrator source editor is intentionally restricted to the manifest in `supabase/functions/cms-content/index.ts`; a submitted browser path is never trusted. GitHub file revisions are checked on every save so simultaneous edits fail safely instead of overwriting each other.

## 1. Create and link a Supabase project

### Local UI demo (Supabase 연결 전)

`JEKYLL_ENV=development`로 빌드한 사이트를 `localhost` 또는 `127.0.0.1`에서 열면 `/admin/`에 로컬 전용 데모 계정이 표시됩니다. 데모 계정으로 관리자 메뉴, 콘텐츠 편집기, News 작성 흐름을 확인할 수 있지만 저장 내용은 해당 브라우저의 localStorage에만 남으며 GitHub 또는 공개 홈페이지에는 게시되지 않습니다. 운영 빌드와 일반 도메인에서는 이 데모 로그인이 활성화되지 않습니다.

- ID: `admin@pier-lab.local`
- Password: `PIER-local-2026!`

Create a Supabase project owned by the lab, then install or run the Supabase CLI from the repository root:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates:

- `public.cms_profiles`: the role and optional member-profile link for each Auth user.
- `public.cms_audit_logs`: who changed which repository path and the resulting commit.
- Row Level Security that lets a signed-in user directly read only their own CMS profile. Browser clients receive no direct write grant.

In the Supabase Auth settings:

1. Disable public user sign-ups. Accounts must be invited or created by an administrator.
2. Set the Site URL to `https://pier-lab.kr`.
3. Add `https://pier-lab.kr/admin/` as an allowed redirect URL.
4. Require passwords of at least 12 characters and keep leaked-password protection enabled when available.
5. For administrator accounts, enable MFA before production use if the lab's plan supports it.

## 2. Give the server permission to commit

The preferred production setup is a GitHub App owned by `kist-pier`:

1. Create a GitHub App with no webhook and no OAuth callback.
2. Grant repository **Contents: Read and write** and **Metadata: Read-only**.
3. Install it only on `kist-pier/kist-pier.github.io`.
4. Generate a private key and note the App ID and installation ID.
5. Put the values in the gitignored `.env.cms` file. Represent PEM line breaks as `\n` so the value stays on one line:

```dotenv
GITHUB_APP_ID=YOUR_APP_ID
GITHUB_APP_INSTALLATION_ID=YOUR_INSTALLATION_ID
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nYOUR_KEY_DATA\n-----END RSA PRIVATE KEY-----
```

For an initial test, the function also accepts a fine-grained token. It must be owned or approved by the organization, limited to this one repository, and have only **Contents: Read and write**:

```dotenv
GITHUB_TOKEN=YOUR_FINE_GRAINED_TOKEN
```

Use one method only. `GITHUB_TOKEN` takes precedence when both are present. Add the non-secret configuration to the same file, upload it, and then remove the local file:

```dotenv
CMS_ALLOWED_ORIGINS=https://pier-lab.kr
GITHUB_REPOSITORY=kist-pier/kist-pier.github.io
GITHUB_BRANCH=main
```

```bash
npx supabase secrets set --env-file .env.cms
npx supabase functions deploy cms-content --no-verify-jwt
```

Never add `.env.cms` or either credential to `_config.yml`, JavaScript, a committed file, shell history, or chat. The `.env.cms` filename is gitignored only as a final guard; it should not be kept after the secrets are uploaded.

`verify_jwt` is disabled at the gateway because the function supports current publishable keys and browser preflight. Every non-preflight request is still authenticated inside the function with `auth.getUser()`, followed by a `cms_profiles` role lookup.

## 3. Connect the browser

Copy the Project URL and **publishable** key from the Supabase dashboard into `_config.yml`:

```yaml
cms:
  enabled: true
  supabase_url: "https://YOUR_PROJECT_REF.supabase.co"
  supabase_publishable_key: "sb_publishable_YOUR_KEY"
```

The publishable key is designed to be visible in browser code. The service-role/secret key must never be put here. Once both public values are present, the footer displays **Login** and `/admin/` becomes functional.

## 4. Create invite-only accounts

Create or invite a user under **Authentication → Users** in the Supabase dashboard. Then link that Auth user to a role. Run this in the SQL Editor after replacing the example values.

Administrator account (the administrator edits the PI and all other entries through the full Members content editor):

```sql
insert into public.cms_profiles (user_id, email, display_name, role, member_id)
select id, email, 'Admin name', 'admin', null
from auth.users
where lower(email) = lower('ADMIN_EMAIL')
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    member_id = excluded.member_id;
```

Regular member:

```sql
insert into public.cms_profiles (user_id, email, display_name, role, member_id)
select id, email, 'Wonseok Choi', 'member', 'undergrad-wonseok-choi'
from auth.users
where lower(email) = lower('MEMBER_EMAIL')
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    member_id = excluded.member_id;
```

Available active-member IDs currently are:

| Person | `member_id` |
| --- | --- |
| Seungseop Lee | `ms-seungseop-lee` |
| Namyoon Kim | `ms-namyoon-kim` |
| Seungwon Jang | `intern-seungwon-jang` |
| Taehun Choi | `intern-taehun-choi` |
| Wonseok Choi | `undergrad-wonseok-choi` |

The self-service form is limited to the `phd`, `ms`, `research_interns`, and `undergrad` sections, whose education entries use simple text lists. The PI's richer biography/education structure remains admin-only.

The `email` column records the approved account identity; the public email shown on the Members page remains a separate editable member field.

## 5. Verify before inviting everyone

1. Sign in as an administrator at `/admin/`, edit a harmless News item, and verify that a new `cms:` commit appears on `main`.
2. Check the GitHub Pages workflow and the deployed page.
3. Sign in as a regular test member and verify that only **My profile** appears.
4. Update one profile field and confirm that only the matching `id` block changed in `_data/members.yml`.
5. Verify that the same member receives `403` if an `admin.read` or `admin.save` request is attempted manually.
6. Check `public.cms_audit_logs` for both commits.

The `Check CMS` GitHub Actions workflow runs JavaScript syntax, Edge Function type, dependency-lock, and formatting checks whenever CMS code changes.

## Content mapping

| CMS label | Repository source |
| --- | --- |
| Home | `_pages/about.md` |
| Research Areas & Projects | `_pages/projects.md` |
| Contact | `_pages/contact.md` |
| Members | `_data/members.yml` |
| Lab equipment / Facilities | `_data/equipment.yml`, `_data/facilities.yml` |
| Gallery | `_data/gallery.yml` |
| Open positions | `_data/positions.yml` |
| Publications | `_bibliography/papers.bib` |
| News | `_news/*.md` |
| Site settings | `_config.yml` |

The first version uses a structured form for each member and a safe News-creation form. Administrators edit Markdown, YAML, and BibTeX sources directly for the remaining content. More visual forms and media upload can be added without changing the authentication or permission model.

## Recovery and removal

- Every successful save is a Git commit, so a bad content edit can be reverted through GitHub.
- Removing a CMS account in Supabase Auth also deletes its `cms_profiles` row.
- To revoke editing without deleting login history, delete only the row from `public.cms_profiles`.
- To take the UI offline, set `cms.enabled: false`; the server credentials remain protected in Supabase.
