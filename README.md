# 유니티 C# 일주일

폰으로 하루 20분씩, 유니티 C#을 기초부터 배우는 학습 앱이에요. → <https://hlcho426.github.io/unity-csharp-week/>

설명을 읽고, 객관식 문제를 풀고, 듀오링고처럼 블록을 조립해서 코드를 직접 만들어 봐요.
발리 여행 중에 폰으로 공부하려고 AI인 Claude에게 부탁해서 만든 앱이에요. 레슨 내용과 코드는 Claude가 썼고, 저는 풀어 보면서 피드백을 주고 배우는 학생이에요. 그 이야기는 블로그 [잉여인간의 개발일기](https://hlcho426.github.io/posts/csharp-week-intro/)에 있어요.

- 코스 5개, 레슨 105개: 기초 → 심화 → 실전 → 다지기 → 시스템(Addressables, 외부 데이터 테이블)
- 레슨을 끝낼 때마다 해가 떠올라요 (진도는 브라우저에 저장)
- 힌트, 틀린 문제 다시 풀기, "앞 설명 다시 보기", 다크 모드
- 홈 화면에 설치할 수 있고(PWA), 한 번 열면 오프라인에서도 동작해요

## 로컬에서 실행하기

레슨 데이터를 `fetch`로 불러오기 때문에 `index.html`을 더블클릭해서 열면(`file://`) 동작하지 않아요. 간단한 로컬 서버로 열어 주세요.

**Node.js가 있으면**

```bash
npx serve
```

터미널에 나오는 주소(보통 <http://localhost:3000>)로 접속해요.

**Python이 있으면**

```bash
python -m http.server 8000
```

<http://localhost:8000>으로 접속해요.

> 고친 내용이 바로 안 보이면: 오프라인 캐시(서비스 워커)가 저장본을 먼저 보여 주기 때문이에요. 새로고침을 한 번 더 하거나, 브라우저 개발자 도구 → Application → Service workers에서 "Update on reload"를 켜 두면 편해요.

## 폴더 구조

```
index.html            화면 틀
css/style.css         디자인
js/app.js             앱 엔진 (화면 그리기, 문제 채점, 진도 저장)
data/courses.json     코스 목록 (탭 순서 = 이 목록 순서)
data/basic.json …     코스별 레슨 내용
manifest.json         홈 화면 설치 정보 (PWA)
sw.js                 오프라인 캐시 (서비스 워커)
icons/                앱 아이콘
scripts/validate.js   레슨 데이터 검증
```

내용(data)과 앱 코드(js)가 나뉘어 있어서, **문제를 고치거나 코스를 추가할 때는 `data/` 폴더만** 고치면 돼요.

## 데이터 검증

데이터를 고친 뒤에는 꼭 검증해 주세요. (Node.js 필요)

```bash
node scripts/validate.js
```

레슨 id 중복, 객관식 정답 번호가 보기 범위를 벗어났는지, 블록 조립 정답을 주어진 블록으로 실제로 만들 수 있는지, 필수 필드 누락을 확인해요.
오류가 있으면 어느 코스·Day·레슨·몇 번째 단계인지 알려 주고 실패(종료 코드 1)해요. 경고는 확인만 해 보면 돼요.

## 레슨 데이터 형식

코스 파일(`data/basic.json` 등)은 Day의 배열이에요.

```json
[
  {
    "n": 1,
    "title": "스크립트와 변수",
    "post": "https://hlcho426.github.io/posts/csharp-week-basic-day1/",
    "lessons": [
      {
        "id": "d1l1",
        "title": "유니티 스크립트의 생김새",
        "desc": "Start, Update, Debug.Log",
        "recap": ["레슨이 끝나면 보여 줄 정리 문장", "..."],
        "steps": [ ... ]
      }
    ]
  }
]
```

`post`는 없어도 돼요. 넣으면 목록의 Day 제목 옆과 레슨 완료 화면에 "📘 블로그 강의" 버튼이 생겨서 그 주소로 가요.

`steps`에는 아래 세 가지 단계를 순서대로 넣어요. `?`가 붙은 필드는 없어도 돼요.

| 종류 | 필드 | 설명 |
|---|---|---|
| 설명 `"t": "read"` | `h`, `code?`, `body?`, `terms?` | 제목, 코드, 본문(HTML), 용어 목록(HTML 문자열 배열) |
| 객관식 `"t": "q"` | `q`, `opts`, `a`, `ex`, `code?`, `prevCode?`, `mono?`, `hint?` | 질문, 보기 배열, 정답 번호(0부터), 해설, 코드, 앞 코드 보여 주기, 보기를 코드 글꼴로, 힌트 |
| 블록 조립 `"t": "build"` | `q`, `answer`, `ex`, `extra?`, `alts?`, `lines?`, `join?`, `code?`, `prevCode?`, `hint?` | 아래 참고 |

블록 조립은 `answer`의 블록에 함정 블록 `extra`를 섞어서 보여 주고, 학습자가 고른 블록을 이어 붙인 글자가 `answer`(또는 `alts`의 다른 정답 중 하나)를 이어 붙인 글자와 같으면 정답이에요.

- `"lines": true` — 블록 하나가 코드 한 줄. 줄바꿈으로 이어 붙여요.
- `"join": ""` — 블록 사이를 무엇으로 이을지. 없으면 띄어쓰기 한 칸.
- `alts` — 순서가 달라도 맞는 정답들. 예: `[["A", "B"], ["B", "A"]]`

알아 두면 좋은 동작

- 문제에 `code`가 없을 때, 문제가 `"위 "`로 시작하거나 `"prevCode": true`가 있으면 앞 설명 중 마지막 코드를 문제 위에 자동으로 보여 줘요. (객관식, 블록 조립 모두) 앞 코드를 기억해야 풀 수 있는 문제에는 `prevCode`를 넣어 주세요.
- 틀린 문제는 레슨 끝에 다시 나와요.
- `body`, `terms`에는 HTML을 쓸 수 있어요. 따옴표는 `\"`, 줄바꿈은 `\n`으로 적어요.

## 레슨을 쓸 때 지키는 것

- 문제는 앞 설명(read)에서 보여 준 것만 물어요. 처음 나오는 개념이면 문제 바로 앞에 짧은 설명을 넣어요. 설명 예시와 문제의 숫자·이름은 다르게 해서, 문제에서는 배운 걸 직접 적용해 보게 해요.
- "왜 이렇게 쓰지?" 싶은 실무 팁은 제목이 `💡 꿀팁: `으로 시작하는 설명으로 넣어요.
- 폰 화면에서 코드 한 줄은 영문 기준 38자쯤까지 보여요. 중요한 주석은 코드 옆보다 윗줄에 따로 써요.
- `prevCode` 문제 앞에 코드가 있는 설명을 새로 넣으면, 문제 위에 보이는 코드가 그 설명 코드로 바뀌어요. 그 문제 뒤에 넣어요.

## 코스 추가하기

1. `data/` 안에 새 파일을 만들어요. 예: `data/ui.json` (위 형식)
2. `data/courses.json`에 한 줄을 추가해요. 배열 순서가 곧 탭 순서예요.
   ```json
   { "id": "ui", "name": "UI", "desc": "UI Toolkit으로 화면 만들기", "file": "data/ui.json" }
   ```
   - `name`은 탭에 들어가니 2~3글자로 짧게 지어 주세요.
3. 레슨 `id`는 **전체 코스에서 유일**해야 해요. 진도가 레슨 id로 저장되기 때문이에요. 지금은 코스마다 앞글자를 정해서 `d1l1`(기초), `a1l1`(심화), `p1l1`(실전), `c1l1`(다지기), `s1l1`(시스템)처럼 쓰고 있어요. 새 코스는 겹치지 않는 앞글자를 골라요.
4. `node scripts/validate.js`로 검증해요.
5. 배포하면 끝. 새 코스 파일도 오프라인 캐시에 자동으로 들어가요.

코드 색칠(하이라이트)에 새 유니티 클래스 이름을 넣고 싶으면 `js/app.js`의 `hl()` 함수 안 목록에 추가해요.

## 링크로 바로 열기

주소 끝에 `#레슨id`를 붙이면 그 레슨이 바로 시작돼요. `#코스id`를 붙이면 그 코스 탭이 열려요. 블로그 글에서 "이 부분 연습하기" 링크로 쓰기 좋아요.

- <https://hlcho426.github.io/unity-csharp-week/#d4l1> → 기초 Day 4 첫 레슨
- <https://hlcho426.github.io/unity-csharp-week/#sys> → 시스템 코스

## GitHub Pages로 배포하기

1. GitHub에서 새 저장소를 만들어요. 이름은 `unity-csharp-week`(Public)로 하면 주소가 `https://hlcho426.github.io/unity-csharp-week/`가 돼요.
2. 이 폴더에서 원격을 연결하고 올려요.
   ```bash
   git remote add origin https://github.com/hlcho426/unity-csharp-week.git
   ```
   ```bash
   git push -u origin main
   ```
3. 저장소 **Settings → Pages**에서 Source를 **Deploy from a branch**, Branch를 **main / (root)**로 고르고 Save.
4. 1~2분 뒤 위 주소로 열려요.

이후에는 고치고 push만 하면 다시 배포돼요. 이미 앱을 연 사람에게는 "다음번 실행" 때 새 내용이 보여요.
`js/app.js`나 `css/style.css`처럼 앱 자체를 크게 고쳤다면 `sw.js` 맨 위의 `VERSION`을 올려 주세요(`"v1"` → `"v2"`). 옛 저장본을 지우고 새로 받아요.

## 바꾸면 안 되는 것

- `js/app.js`의 저장 키 `"unity-cs-week-v1"`과 이미 있는 레슨 `id`를 바꾸지 마세요. 사람들의 진도가 이 값으로 저장돼 있어요.
- 진도는 브라우저마다, 주소(도메인)마다 따로 저장돼요. 다른 주소로 옮기면 진도가 따라오지 않아요.
