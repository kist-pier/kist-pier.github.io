# PIER Lab 홈페이지 유지보수 가이드

이 문서 하나만 읽으면 홈페이지를 넘겨받을 수 있도록 쓴 인수인계 문서입니다.
웹 개발을 몰라도 됩니다. 코드를 고쳐야 할 때는 Claude Code에게 이 문서를 읽히면 됩니다.

- **공개 주소**: https://pier-lab.kr
- **관리자 화면**: https://pier-lab.kr/admin/
- **코드 저장소**: https://github.com/kist-pier/kist-pier.github.io

---

## 1. 먼저 알아야 할 것 — 이 사이트는 "미리 인쇄된 포스터"입니다

보통 웹사이트(네이버 카페 같은)는 누가 접속할 때마다 서버가 그 자리에서 페이지를 만들어 줍니다.
**이 사이트는 그런 서버가 없습니다.** 미리 만들어 둔 HTML 파일을 GitHub이 그냥 나눠줄 뿐입니다.

그래서 홈페이지를 고치려면 반드시 이 순서를 거칩니다.

```
원본 파일 수정  →  다시 인쇄(빌드)  →  게시판에 붙이기(배포)
   GitHub          GitHub Actions        GitHub Pages
```

**수정한 내용이 실제 사이트에 보이기까지 3~5분 걸립니다.** 고장이 아니라 원래 그렇습니다.

### 등장인물 3명

| 누구 | 역할 | 어디서 보나 |
|---|---|---|
| **GitHub** | 원본 파일 보관 + 수정 이력 + 빌드/배포 | github.com/kist-pier/kist-pier.github.io |
| **Supabase** | 로그인 확인 + 계정 명단 + 대신 커밋해주는 서버 | supabase.com/dashboard |
| **GitHub Pages** | 완성된 사이트를 방문자에게 서빙 | pier-lab.kr |

### 왜 CMS(관리자 화면)가 필요한가

GitHub에 파일을 쓰려면 **열쇠(권한)** 가 필요합니다. 그런데 브라우저 코드는 누구나 볼 수 있어서
(F12만 누르면 됩니다) 열쇠를 브라우저에 넣으면 **전 세계가 우리 홈페이지를 고칠 수 있게 됩니다.**

그래서 Supabase에 **심부름꾼(Edge Function)** 을 하나 두었습니다.

- 열쇠는 오직 심부름꾼만 갖고 있고, Supabase 서버 안에서만 돌아가서 아무도 못 들여다봅니다
- 사용자는 "이렇게 바꿔주세요" 라고 **부탁**만 하고, 심부름꾼이 신원을 확인한 뒤 **대신** 커밋합니다

`_config.yml`에 적힌 `supabase_url`과 `sb_publishable_...`은 **열쇠가 아니라 주소**입니다.
공개돼도 괜찮습니다. 진짜 열쇠(`sb_secret_...`, GitHub App private key)는 Supabase 안에만 있습니다.

### 로그인하면 벌어지는 일

```
1. /admin/ 에서 이메일 + 비밀번호 입력
2. Supabase Auth 가 신원 확인 → 1시간짜리 출입증(토큰) 발급
3. 브라우저가 출입증을 들고 심부름꾼에게 "나 누구야?" 질문
4. 심부름꾼이 두 번 확인:
     ① 출입증이 진짜인가        → Supabase Auth 에 확인
     ② 이 사람이 명단에 있는가   → cms_profiles 표 확인
5. 통과하면 편집 화면이 열림
```

**비밀번호가 맞아도 `cms_profiles` 명단에 없으면 아무것도 못 합니다.**
계정 만들기가 2단계(계정 생성 + 명단 등록)인 이유가 이것입니다.

명단은 **요청할 때마다 매번** 다시 확인합니다. 명단에서 빼면 바로 다음 순간부터 차단됩니다.

---

## 2. 계정 추가하기 (가장 자주 하는 일)

### 권한은 두 종류뿐입니다

| | **admin** | **member** |
|---|---|---|
| News 작성/수정/삭제 | O | X |
| Members, Gallery, Publications, 장비/시설/채용 편집 | O | X |
| 페이지 원본 편집 | O | X |
| **본인 프로필만** 수정 | 연결했으면 O | O (이것만) |

`member`는 자기 항목의 10개 필드만 고칠 수 있습니다:
`name_en`, `name_ko`, `email`, `github`, `cv`, `website`, `affiliation`, `education`, `research_areas`, `bio`.
화면에서 숨긴 게 아니라 **서버가 거부**합니다. PI와 졸업생 항목은 member가 건드릴 수 없습니다.

### 2단계로 만듭니다

**1단계 — 계정 만들기** (Supabase 대시보드)

`Authentication` → `Users` → **`Add user`** → **`Create new user`**

- Email: 그 사람 이메일
- Password: 12자 이상, 이 프로젝트 전용으로 새로 만들 것
- **`Auto Confirm User` 반드시 체크**

> **`Invite` 버튼은 쓰지 마세요.** Supabase 기본 메일러는 프로젝트 팀 소속이 아닌 주소로
> 발송을 거부합니다. 메일이 영영 오지 않고, 원인도 안 보입니다.
> (custom SMTP를 붙이면 해결되지만 아직 안 붙였습니다.)

**2단계 — 명단에 올리기** (Supabase `SQL Editor`)

관리자를 만들 때:

```sql
insert into public.cms_profiles (user_id, email, display_name, role, member_id)
select id, email, '홍길동', 'admin', null
from auth.users
where lower(email) = lower('여기에_그_사람_이메일')
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    member_id = excluded.member_id
returning user_id, email, role;
```

일반 멤버를 만들 때 (`'admin'` → `'member'`, `null` → 그 사람의 member_id):

```sql
insert into public.cms_profiles (user_id, email, display_name, role, member_id)
select id, email, '정지연', 'member', 'intern-jiyeon-joung'
from auth.users
where lower(email) = lower('여기에_그_사람_이메일')
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    member_id = excluded.member_id
returning user_id, email, role;
```

**성공 판정: 반드시 1행이 반환되어야 합니다.**
`Success. No rows returned` 이면 이메일 오타입니다. 그냥 넘어가면 나중에 로그인은 되는데
"CMS 사용 권한이 등록되지 않은 계정입니다" 만 뜨고 원인을 못 찾습니다.
`select email from auth.users;` 로 실제 저장된 주소를 확인하세요.

**`member_id`는 `_data/members.yml`의 `id` 값과 글자 하나까지 같아야 합니다.**
CMS의 Members 화면에서 각 사람의 Member id를 볼 수 있습니다.

### 권한 회수 (사람이 나갈 때)

계정을 삭제하려 하지 마세요. **거부됩니다.** (감사 로그가 그 계정을 참조하고 있어서
Postgres가 삭제를 막습니다.) 이 한 줄이 정답입니다:

```sql
delete from public.cms_profiles where lower(email) = lower('나간사람_이메일');
```

명단은 매 요청마다 확인하므로 **다음 순간부터 즉시 차단**됩니다.
로그인 계정 자체는 남지만 아무 권한도 없습니다.

### 공용 계정은 권하지 않습니다

만들 수는 있지만, 그러면 감사 로그와 커밋이 전부 "공용계정"으로 남아 **누가 무엇을 했는지
추적이 불가능**해집니다. 한 명이 나가면 모두의 비밀번호를 바꿔야 하고, 비밀번호는
카톡·메모를 타고 퍼집니다. 계정 만드는 비용은 클릭 몇 번 + SQL 한 줄이니 각자 만드세요.

---

## 3. CMS로 할 수 있는 것

`https://pier-lab.kr/admin/` 로그인 후 왼쪽 메뉴:

| 메뉴 | 탭 | 하는 일 |
|---|---|---|
| **Members** | Students | 학생 카드별 편집, 추가/삭제, **사진 업로드**, **CV(PDF) 업로드** |
| | Advisor (PI) | 지도교수 페이지 — 사진, 링크(Email·Scholar·GitHub·Website·CV), 소개글, 학력, 경력, 수상 |
| | Alumni (interns / undergrad) | 졸업생 명단 — 이름, 기간, 소속, 이직처, LinkedIn |
| **News** | | 목록 → 편집/삭제, 새 글 작성 |
| **Gallery** | | 사진 여러 장 한 번에 업로드, 캡션·분류·날짜 편집 |
| **Publications** | | 목록 → 편집/삭제, **BibTeX 붙여넣기로 자동 채우기** |
| **Lab info** | Research areas / Research projects / Lab equipment / Facilities | 연구 분야·프로젝트 영상·장비·시설 편집, 추가/삭제, 사진 업로드 |
| **Contact** | | 채용 공고 — 내용, 지원 링크(Google 폼), 공개 여부 |
| **Website content** | | 위에서 안 되는 것들의 원본(YAML/Markdown) 직접 편집 |

사이드바는 6개 그룹이고, 여러 화면이 있는 그룹은 위쪽 **탭**으로 나뉩니다.

### 자동으로 되는 것들 (신경 안 써도 됨)

- **사진**: 멤버 사진은 600×600, 갤러리는 긴 변 1600px JPEG로 **자동 리사이즈**됩니다.
  5MB 폰 사진을 올려도 알아서 줄어듭니다.
- **파일명**: 사람이 정하지 않습니다. 멤버 사진은 member id에서, 갤러리는 날짜+캡션에서
  자동 생성돼 기존 규칙과 항상 일치합니다.
- **Gallery 정렬**: 저장하면 날짜 내림차순으로 자동 정렬됩니다.
- **원본 서식 보존**: 저장할 때 한글 주석, 빈 줄, 따옴표 스타일이 그대로 유지됩니다.
  값을 안 바꾸고 저장하면 파일이 **한 글자도 안 바뀝니다.**

### CMS로 안 되는 것

- 페이지 레이아웃·디자인 변경
- 사진 삭제 (참조만 빼면 되고, 파일은 남습니다)

이런 건 GitHub에서 직접 고치거나 Claude Code에게 시키면 됩니다.

### ⚠️ `Website content` → `Site settings (advanced)` 는 건드리지 마세요

이 항목은 `_config.yml`(사이트 전체 설정, 649줄)을 검사 없이 그대로 덮어씁니다. 두 가지가 위험합니다.

1. **YAML 문법이 깨지면** 빌드가 실패해 배포가 멈춥니다. 그 뒤로는 CMS가 "저장했습니다"라고
   하면서도 **아무것도 배포되지 않습니다.**
2. **`cms:` 블록을 지우면** `/admin/` 로그인 화면이 비활성화되어 **되돌릴 수단이 CMS 안에
   남지 않습니다.** (GitHub에서 직접 고쳐야 합니다.)

사이트 설정은 1년에 몇 번 바뀌지 않습니다. GitHub에서 고치고 커밋 이력을 남기는 편이 안전합니다.
아예 메뉴에서 빼고 싶다면 `supabase/functions/cms-content/index.ts`의 `STATIC_RESOURCES`에서
`settings:site` 항목과 `assets/js/cms-admin.js`의 같은 항목을 지우면 됩니다(각 한 덩어리).

---

## 4. 코드를 고쳐야 할 때

### 저장소 구조 (알아두면 좋은 것만)

```
_data/            멤버·장비·시설·갤러리·채용 목록 (YAML)
_news/            뉴스 글 하나당 파일 하나 (Markdown)
_bibliography/    논문 목록 (BibTeX)
_pages/           각 페이지 내용
_includes/        머리글·바닥글 등 공통 조각
_sass/            디자인(CSS)
assets/img/       이미지
admin/            CMS 화면 (HTML)
assets/js/cms-admin.js    CMS 브라우저 코드
supabase/functions/cms-content/index.ts    CMS 서버 코드
docs/             이 문서와 최초 설치 가이드
```

### 배포는 두 곳입니다 — 가장 많이 틀리는 부분

| 고친 곳 | 반영 방법 |
|---|---|
| `supabase/functions/**` (서버 로직) | `npx supabase@latest functions deploy cms-content --no-verify-jwt` |
| **그 외 전부** (페이지, CMS 화면, 데이터) | `git push` |

**CMS를 수정했다면 보통 둘 다 필요합니다.**
서버만 배포하고 push를 안 하면 "서버는 새 기능이 있는데 화면이 옛날 것"이 되어
아무 일도 안 일어나는 것처럼 보입니다.

### push 전에 항상 pull

**CMS가 GitHub에 직접 커밋합니다.** 그래서 로컬에서 작업하는 동안 원격이 먼저 앞서갈 수 있고,
그대로 push하면 거부됩니다.

```bash
cd ~/pier_lab_page/kist-pier.github.io
git pull --rebase origin main
git push origin main
```

> **`git push --force`는 절대 쓰지 마세요.** CMS가 올린 커밋이 사라집니다.

### 자동 검사

`.github/workflows/cms-check.yml`이 CMS 코드가 바뀔 때마다 자동으로 확인합니다:

- 브라우저 JS 문법
- 서버 코드 타입 검사 + 서식
- `_config.yml`의 CMS 설정이 비어 있거나, 공개 파일에 secret key가 들어갔는지

빨간불이면 Actions 탭에서 어느 검사가 실패했는지 볼 수 있습니다.

---

## 5. 고장났을 때

| 증상 | 원인과 대처 |
|---|---|
| **로그인이 "비밀번호를 확인하세요"만 반복** | Supabase 프로젝트가 잠자는 중일 수 있습니다. 무료 플랜은 **7일 동안 사용이 없으면 자동 일시정지**됩니다. 대시보드에서 `Resume` 두 번 클릭이면 깨어납니다. (공개 사이트는 영향 없습니다.) |
| **"CMS 사용 권한이 등록되지 않은 계정입니다"** | 계정은 있는데 `cms_profiles` 명단에 없습니다. 2장 2단계 SQL 실행 |
| **"콘텐츠 파일을 찾을 수 없습니다"** | GitHub App 권한 문제일 가능성이 큽니다. 파일이 실제로 있는지 먼저 확인 |
| **저장은 됐는데 사이트에 안 보임** | ① 3~5분 대기 ② Actions에서 `Deploy site` 초록불 확인. 빨간불이면 빌드 실패 |
| **로컬에서만 옛날 내용이 보임** | CMS는 GitHub에 커밋하므로 로컬은 모릅니다. `git pull --rebase origin main` |
| **잘못 저장해서 망가뜨림** | 모든 저장이 git 커밋입니다. GitHub에서 해당 커밋을 **Revert**하면 복구됩니다 |
| **CMS 자체가 안 열림** | GitHub에서 파일을 직접 편집하면 됩니다. **이 비상구는 항상 열려 있습니다** |

### 이 구조의 좋은 점

- Supabase가 멈춰도 **공개 사이트는 멀쩡합니다.** CMS만 안 될 뿐입니다.
- 빌드가 실패해도 게시판에는 **직전 정상 버전이 계속 붙어 있습니다.**
- 모든 수정이 git 커밋이라 **언제든 되돌릴 수 있습니다.**

---

## 6. 인수인계 체크리스트

넘겨받는 사람이 **반드시 확보해야 할 것들**입니다.

### 접근 권한

- [ ] **Supabase 조직 `kist-pier`** 멤버 초대 (Organization → Team → Invite member)
      → 본인 GitHub 계정으로 로그인합니다. **비밀번호를 공유받지 마세요.**
- [ ] **Owner를 최소 2명** 유지 — 1명이면 그 사람이 떠날 때 프로젝트가 묶입니다
- [ ] **GitHub 조직 `kist-pier`** 저장소 write 권한
- [ ] CMS 관리자 계정 (2장 참고)

### 어딘가에 기록되어 있어야 할 값

| 항목 | 값 / 위치 | 비밀? |
|---|---|---|
| Supabase project ref | `bebtbbhlakjlnhzeeaol` | 아니오 |
| Supabase 대시보드 | supabase.com/dashboard/project/bebtbbhlakjlnhzeeaol | 아니오 |
| GitHub App ID | `4858390` | 아니오 |
| GitHub App Installation ID | `159708220` | 아니오 |
| **Database password** | 공용 비밀번호 관리자 | **예** |
| **`sb_secret_...`** | Supabase Settings → API Keys에서 재발급 가능 | **예** |
| **GitHub App private key (.pem)** | 안전한 곳. 분실 시 재발급 후 재배포 | **예** |
| Owner 명단 | 이 문서에 적어두세요 | 아니오 |

### 주기적으로 확인할 것

- **Supabase 무료 플랜 일시정지** — 7일 무사용이면 잠듭니다.
  자주 안 쓴다면 3일에 한 번 깨우는 자동화를 걸거나 Pro($25/월)를 검토하세요.
- **GitHub App은 만료가 없습니다** (개인 토큰과 달리). 사람이 바뀌어도 끊기지 않습니다.
- **Auth 최소 비밀번호 12자** 설정이 유지되고 있는지 (Authentication → Sign In / Providers → Email)

---

## 7. Claude Code로 작업할 때

다음 사람도 Claude Code를 쓴다면, 이렇게 시작하면 됩니다.

```bash
cd ~/pier_lab_page/kist-pier.github.io
git pull --rebase origin main
claude
```

그리고 이렇게 말하면 됩니다:

> `docs/MAINTENANCE.md`와 `docs/CMS_SETUP.md`를 먼저 읽고, (하려는 일)을 해줘.

**Claude Code에게 반드시 알려줄 것 세 가지:**

1. **CMS 서버 코드(`supabase/functions/**`)를 고쳤으면 `functions deploy`가 따로 필요하다** —
   git push만으로는 서버에 반영되지 않습니다.
2. **push 전에 `git pull --rebase`** — CMS가 직접 커밋하므로 원격이 앞서 있을 수 있습니다.
3. **데이터 파일 저장 로직을 건드렸다면, 값을 그대로 다시 저장했을 때 파일이 한 글자도
   안 바뀌는지 확인** — 서식이 깨지면 매 저장마다 관계없는 diff가 쌓입니다.

로컬 미리보기가 필요하면 Ruby/Jekyll이 필요한데, 없어도 **GitHub에 push해서 확인하는 편이
훨씬 간단합니다.** 3~5분이면 실제 사이트에 반영됩니다.

---

## 부록 — 최초 설치 기록

이 시스템을 처음부터 다시 세워야 한다면 `docs/CMS_SETUP.md`에 전체 절차가 있습니다.
Supabase 프로젝트 생성, 데이터베이스 마이그레이션, GitHub App 발급, 시크릿 업로드,
Edge Function 배포 순서가 모두 적혀 있습니다.
