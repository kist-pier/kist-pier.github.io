# PIER Lab 홈페이지 유지보수

pier-lab.kr은 Jekyll로 빌드해 GitHub Pages에서 서비스하는 정적 사이트입니다. 콘텐츠는 `/admin/`에서
고치고, Supabase Edge Function이 GitHub에 대신 커밋합니다. 나머지는 저장소를 직접 고칩니다.
모든 수정은 git 커밋이고, 실제 사이트 반영까지 3~5분 걸립니다.

| | |
|---|---|
| 공개 사이트 | https://pier-lab.kr |
| 관리자 화면 | https://pier-lab.kr/admin/ |
| 저장소 | https://github.com/kist-pier/kist-pier.github.io |
| Supabase | https://supabase.com/dashboard/project/bebtbbhlakjlnhzeeaol |

---

## 1. 빠른 참조

| 하려는 일 | 어디 |
|---|---|
| 사이트가 이상하다 | 2장 |
| 새 구성원 계정 만들기 | 3장 |
| 나간 사람 권한 없애기 | 3장 |
| 뉴스·멤버·논문·사진 고치기 | 4장 |
| 페이지 구조나 디자인 고치기 | 5장, 6장 |
| CMS 코드 고치고 배포하기 | 6장 |
| 담당자 교체 | 7장 |

---

## 2. 고장났을 때

| 증상 | 원인 | 대처 |
|---|---|---|
| `이메일 또는 비밀번호를 확인해 주세요` | 비밀번호 오류, 또는 계정 생성 시 Auto Confirm 누락 | Supabase → Authentication → Users에서 계정 확인. 3장 |
| `서버에 연결할 수 없습니다` | Supabase 프로젝트 일시정지. 무료 플랜은 7일 무사용 시 자동 정지 | 대시보드에서 Resume. 공개 사이트는 영향 없음 |
| `시도가 너무 많습니다` | 로그인 실패 누적으로 일시 차단 | 몇 분 뒤 재시도 |
| `CMS 사용 권한이 등록되지 않은 계정입니다` | 계정은 있으나 `cms_profiles`에 없음 | 3장 2단계 SQL 실행 |
| `… 다른 곳에서 먼저 수정되었습니다` | 편집 중 다른 사람이나 다른 탭이 같은 파일을 저장 | Reload 후 다시 편집. 덮어쓰기는 일어나지 않음 |
| `콘텐츠 파일을 찾을 수 없습니다` | 파일이 없거나 GitHub App 권한 문제 | 저장소에 해당 파일이 있는지 먼저 확인 |
| `파일 용량이 너무 큽니다` | 사진 600KB / CV 4MB 초과 | 사진은 자동 축소되므로 대개 CV. PDF를 줄여 재시도 |
| 저장했는데 사이트에 안 보임 | 배포 대기 또는 빌드 실패 | 3~5분 대기 후 [Actions](https://github.com/kist-pier/kist-pier.github.io/actions)에서 Deploy site 확인 |
| 로컬에서만 옛 내용이 보임 | CMS는 GitHub에 직접 커밋하므로 로컬은 모름 | `git pull --rebase origin main` |
| 멤버 화면이 비어 있음 | `member` 계정의 `member_id`가 없거나 `_data/members.yml`의 `id`와 불일치 | 3장 |
| 탭을 닫았더니 로그아웃됨 | 세션이 탭 단위로 저장됨 | 정상 동작. 다시 로그인 |

### 잘못 저장했을 때

모든 변경이 git 커밋이므로 되돌릴 수 있습니다. GitHub에서 해당 커밋의 해시를 확인한 뒤:

```bash
git pull --rebase origin main
git revert <커밋해시>
git push origin main
```

CMS가 열리지 않아도 GitHub에서 파일을 직접 편집할 수 있습니다.

### 누가 무엇을 고쳤는지

Supabase → SQL Editor:

```sql
select created_at, actor_email, action, target_path, commit_sha
from public.cms_audit_logs
order by created_at desc
limit 50;
```

감사 로그 기록이 실패해도 저장은 진행되므로 누락될 수 있습니다. 권위 있는 기록은 git 이력입니다.

---

## 3. 계정 추가와 권한 회수

### 권한 두 종류

| 할 수 있는 일 | admin | member |
|---|---|---|
| 뉴스·멤버·논문·갤러리·장비·채용 편집 | O | X |
| 페이지 원본 편집 | O | X |
| 본인 프로필 수정 | `member_id` 연결 시 O | O |

`member`는 자기 항목의 10개 필드만 수정합니다: `name_en`, `name_ko`, `email`, `github`, `cv`,
`website`, `affiliation`, `education`, `research_areas`, `bio`. 서버에서 강제하므로 다른 항목이나
다른 사람은 건드릴 수 없습니다.

### 1단계 — 계정 생성

Supabase → Authentication → Users → Add user → Create new user

- Email, Password(12자 이상, 이 프로젝트 전용)
- **Auto Confirm User 체크.** 빼먹으면 로그인 시 "비밀번호를 확인해 주세요"만 반복됩니다

Invite 버튼은 쓰지 마십시오. Supabase 기본 메일러는 프로젝트 팀이 아닌 주소로 발송하지 않습니다.
같은 이유로 로그인 화면의 `Forgot password?`도 메일이 도착하지 않습니다. 비밀번호를 잊은 사람은
관리자가 Users 화면에서 직접 재설정합니다. custom SMTP를 붙이면 둘 다 해결됩니다.

### 2단계 — 명단 등록

Supabase → SQL Editor. `admin`이면 `role`을 `'admin'`, `member_id`를 `null`로 둡니다. `member`면
`role`을 `'member'`, `member_id`를 `_data/members.yml`의 `id`와 정확히 같게 씁니다.

```sql
insert into public.cms_profiles (user_id, email, display_name, role, member_id)
select id, email, '정지연', 'member', 'intern-jiyeon-joung'
from auth.users
where lower(email) = lower('0926187@kist.re.kr')
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    member_id = excluded.member_id
returning user_id, email, role;
```

**1행이 반환되어야 합니다.** `No rows returned`이면 이메일이 일치하지 않은 것입니다.
`select email from auth.users;`로 실제 저장된 주소를 확인하십시오. 여기서 넘어가면 로그인은 되지만
"권한이 등록되지 않은 계정"만 뜹니다.

`member_id`는 CMS의 Members → Students 화면에서 각 사람의 Member id로 확인합니다.

### 권한 회수

```sql
delete from public.cms_profiles where lower(email) = lower('나간사람@kist.re.kr');
```

명단은 요청마다 조회하므로 다음 요청부터 차단되며, 이미 발급된 세션도 함께 막힙니다.

Auth 계정 자체는 남습니다. 그 계정이 한 번이라도 편집했다면 감사 로그가 참조하고 있어 Users
화면에서 삭제하면 외래 키 오류가 납니다. 계정까지 지우려면 감사 로그를 먼저 지워야 하는데 그러면
기록이 사라집니다. 권한만 회수하는 위 방법을 권합니다.

각자 계정을 만드십시오. 공용 계정은 감사 로그와 커밋이 전부 같은 이름으로 남아 추적이 불가능하고,
한 명이 나갈 때마다 전원의 비밀번호를 바꿔야 합니다.

---

## 4. CMS 화면 지도

`https://pier-lab.kr/admin/` — 사이드바 7개 그룹. 화면이 여럿인 그룹은 상단 탭으로 나뉩니다.

| 그룹 | 탭 | 편집 대상 |
|---|---|---|
| Members | Students | 재학생 카드. 추가·삭제, 사진 업로드, CV(PDF) 업로드 |
| Members | Advisor (PI) | 지도교수 페이지. 사진, 링크(Email·Scholar·GitHub·Website·CV), 소개, 학력, 경력, 수상 |
| Members | Alumni (interns / undergrad) | 졸업생 명단. 이름, 기간, 소속, 이직처, LinkedIn |
| News | — | 뉴스 목록·편집·삭제, 새 글 작성 |
| Gallery | — | 사진 다중 업로드, 캡션·분류·날짜 |
| Publications | — | 논문 목록·편집·삭제. BibTeX 붙여넣기로 자동 입력 |
| Lab info | Research areas | 연구 분야. 홈 화면과 Research 페이지가 함께 읽음 |
| Lab info | Research projects | 영상 카드. YouTube 주소를 붙여넣으면 ID 자동 추출 |
| Lab info | Lab equipment / Facilities | 장비·시설. 사진 업로드 |
| Contact | — | 채용 공고. 내용, 지원 링크(Google 폼), 공개 여부 |
| Website content | — | 위에 없는 파일의 원본(YAML·Markdown) 직접 편집 |

### 자동 처리

- 사진은 멤버 600×600, 갤러리 긴 변 1600px, 장비 1200px JPEG로 브라우저에서 축소해 업로드합니다
- 업로드 파일명은 member id 또는 날짜·캡션에서 생성합니다. 직접 정하지 않습니다
- Gallery는 저장할 때 날짜 내림차순으로 재정렬합니다
- 저장 시 주석·빈 줄·따옴표 스타일이 보존됩니다. 값을 바꾸지 않고 저장하면 파일이 변하지 않습니다

### 안 되는 것

- **항목 순서 변경.** 새 항목은 해당 구역 끝에 추가됩니다. 순서를 바꾸려면 Website content에서 해당 YAML을 직접 편집합니다
- 업로드한 사진·PDF 삭제. 참조만 지워지고 파일은 저장소에 남습니다
- 페이지 레이아웃과 디자인

### Website content의 Site settings

이 항목은 `_config.yml`(650줄)을 검사 없이 덮어씁니다. YAML이 깨지면 빌드가 실패해 이후 모든 CMS
저장이 성공한 것처럼 보이면서 배포되지 않습니다. `cms:` 블록을 지우면 `/admin/` 로그인이
비활성화되어 CMS 안에서는 복구할 수 없습니다. 사이트 설정은 GitHub에서 직접 고치십시오.

---

## 5. 시스템 구조

반영에 3~5분 걸리는 이유는 사이트가 정적이기 때문입니다. 파일이 바뀌면 GitHub Actions가 Jekyll로
사이트 전체를 다시 빌드해 GitHub Pages에 배포합니다.

```
파일 수정 → git 커밋 → GitHub Actions 빌드 → GitHub Pages 배포
```

CMS가 GitHub에 직접 쓰려면 저장소 쓰기 권한이 필요한데, 그 자격 증명을 브라우저 코드에 넣으면
누구나 읽을 수 있습니다. 그래서 Supabase Edge Function이 중간에서 신원과 권한을 확인한 뒤 대신
커밋합니다. 자격 증명은 Supabase 안에만 있습니다.

로그인 확인은 두 단계입니다. Supabase Auth가 계정을 확인해 토큰을 발급하고, Edge Function이 요청마다
`cms_profiles`를 조회해 권한을 확인합니다. 비밀번호가 맞아도 명단에 없으면 아무것도 할 수 없습니다.

`_config.yml`의 `supabase_url`과 `sb_publishable_...`은 공개용 식별자입니다. 실제 자격 증명은
`sb_secret_...`과 GitHub App private key이며 Supabase 시크릿에만 있습니다.

세션은 탭 단위로 저장되고 토큰은 자동 갱신됩니다. 오래 켜 두어도 로그아웃되지 않지만 탭을 닫으면
다시 로그인해야 합니다.

Supabase가 중단되면 CMS만 멈추고 공개 사이트는 영향받지 않습니다. 빌드가 실패하면 직전 배포본이
계속 서비스됩니다.

---

## 6. 코드 수정과 배포

### 저장소 구조

```
_data/            멤버·연구분야·연구프로젝트·장비·시설·갤러리·채용 (YAML)
_news/            뉴스 글 1건당 파일 1개 (Markdown)
_bibliography/    논문 목록 (BibTeX)
_pages/           각 페이지
_includes/        머리글·바닥글 등 공통 조각
_sass/            디자인
assets/img/       이미지
admin/            CMS 화면
assets/js/cms-admin.js                     CMS 브라우저 코드
supabase/functions/cms-content/index.ts    CMS 서버 코드
docs/             이 문서와 최초 설치 가이드
```

### 배포 대상이 두 곳입니다

| 고친 파일 | 반영 방법 |
|---|---|
| `supabase/functions/**` | Supabase 배포 |
| 그 외 전부 | `git push` |

CMS를 수정하면 대개 둘 다 필요합니다. 서버만 배포하고 push하지 않으면 화면이 옛 코드라 새 기능이
동작하지 않습니다.

### Supabase 배포

Node.js 20 이상이 필요합니다. 없으면 먼저 설치합니다.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
# 새 터미널을 연 뒤
nvm install --lts
```

새로 클론한 저장소에는 Supabase 연결 정보가 없습니다(`supabase/.temp/`는 커밋되지 않습니다).
최초 1회:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref bebtbbhlakjlnhzeeaol
```

이후 매번:

```bash
npx supabase@latest functions deploy cms-content --no-verify-jwt
```

`Docker is not running` 경고는 무시합니다. 배포 확인:

```bash
curl -i -X POST https://bebtbbhlakjlnhzeeaol.supabase.co/functions/v1/cms-content \
  -H 'content-type: application/json' -d '{"action":"me"}'
```

`401 {"error":"로그인이 필요합니다."}`가 정상입니다.

### git push

CMS가 저장소에 직접 커밋하므로 원격이 앞서 있을 수 있습니다. push 전에 항상:

```bash
git pull --rebase origin main
git push origin main
```

`git push --force`는 쓰지 마십시오. CMS가 올린 커밋이 사라집니다.

### 자동 검사

`.github/workflows/cms-check.yml`이 CMS 코드 변경 시 실행됩니다. 브라우저 JS 문법, 서버 코드 타입
검사와 서식, `_config.yml`의 CMS 설정 누락과 secret key 유입 여부를 확인합니다. 실패하면 Actions
탭에서 어느 단계인지 볼 수 있습니다.

---

## 7. 인수인계 체크리스트

### 접근 권한

- [ ] Supabase 조직 `kist-pier` 초대(Organization → Team → Invite member). 본인 계정으로 로그인하며 비밀번호를 공유받지 않습니다
- [ ] Supabase Owner 2명 이상 유지. 1명이면 그 사람이 떠날 때 프로젝트가 잠깁니다
- [ ] GitHub 조직 `kist-pier` 저장소 write 권한
- [ ] CMS 관리자 계정(3장)

### 인계 값

| 항목 | 값 또는 위치 | 비밀 |
|---|---|---|
| Supabase project ref | `bebtbbhlakjlnhzeeaol` | 아니오 |
| GitHub App ID | `4858390` | 아니오 |
| GitHub App Installation ID | `159708220` | 아니오 |
| Database password | 공용 비밀번호 관리자 | 예 |
| `sb_secret_...` | Supabase → Settings → API Keys에서 재발급 | 예 |
| GitHub App private key(.pem) | 분실 시 재발급 후 재배포 필요 | 예 |
| Supabase Owner 명단 | 아래에 기록 | 아니오 |

### 정기 확인

- Supabase 무료 플랜은 7일 무사용 시 정지됩니다. 사용 빈도가 낮으면 keep-alive 작업을 걸거나 Pro($25/월)를 검토하십시오
- GitHub App은 만료가 없습니다. 담당자가 바뀌어도 끊기지 않습니다
- Auth 최소 비밀번호 12자 설정 유지(Authentication → Sign In / Providers → Email)

---

## 부록 A. Claude Code로 작업하기

저장소 루트에서:

```bash
git pull --rebase origin main
claude
```

`docs/MAINTENANCE.md`와 `docs/CMS_SETUP.md`를 먼저 읽게 한 뒤 작업을 지시합니다.

반드시 전달할 세 가지:

1. `supabase/functions/**`를 고쳤으면 Supabase 배포가 따로 필요합니다. git push만으로는 반영되지 않습니다
2. push 전에 `git pull --rebase`. CMS가 직접 커밋하므로 원격이 앞서 있을 수 있습니다
3. 데이터 파일 저장 로직을 고쳤으면, 값을 바꾸지 않고 저장했을 때 파일이 변하지 않는지 확인해야 합니다. 서식이 깨지면 저장할 때마다 무관한 diff가 쌓입니다

로컬 미리보기에는 Ruby와 Jekyll이 필요합니다. 설치돼 있지 않으면 push해서 확인하는 편이 빠릅니다.

## 부록 B. 최초 설치

시스템을 처음부터 다시 세워야 한다면 `docs/CMS_SETUP.md`에 Supabase 프로젝트 생성, 데이터베이스
마이그레이션, GitHub App 발급, 시크릿 업로드, Edge Function 배포 순서가 있습니다.
