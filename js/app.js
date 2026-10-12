/* ---------- 데이터 불러오기 ---------- */
// 코스 목록은 data/courses.json, 레슨은 코스마다 data/*.json 에 있어요.
// 문제를 고치거나 코스를 추가할 때는 data/ 폴더만 고치면 돼요.
async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(url + " (" + r.status + ")");
  return r.json();
}
async function loadTracks(){
  const list = await fetchJSON("data/courses.json");
  return Promise.all(list.map(async c => ({ id:c.id, name:c.name, sub:c.desc, days: await fetchJSON(c.file) })));
}

/* ---------- 저장 ---------- */
const KEY = "unity-cs-week-v1";
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {done:{}}; }catch(e){ return {done:{}}; } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} }
let store = load(); if(!store.done) store.done = {};
let TRACKS = [];
const trackLessons = t => t.days.flatMap(d => d.lessons);
const allDone = id => { const t = TRACKS.find(t => t.id === id); return !!t && trackLessons(t).every(l => store.done[l.id]); };
// 코스를 다 끝내면 다음 코스 탭을 한 번 자동으로 열어 줘요. (기존 진도와 맞도록 원래 규칙 그대로)
function pickTrack(){
  if(!store.track){ store.track = allDone("basic") ? "adv" : "basic"; }
  if(store.track === "adv" && allDone("adv") && !store.seenPro){ store.track = "pro"; store.seenPro = true; }
  if(allDone("pro") && !store.seenCore){ store.track = "core"; store.seenCore = true; }
  if(allDone("core") && !store.seenSys){ store.track = "sys"; store.seenSys = true; }
}
const curTrack = () => TRACKS.find(t => t.id === store.track) || TRACKS[0];

/* ---------- 코드 하이라이트 ---------- */
const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function hl(code){
  const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|(\b\d+(?:\.\d+)?f?\b)|(\b(?:using|public|private|class|void|int|float|bool|string|true|false|if|else|for|foreach|in|while|return|new|static|null|enum|switch|case|break|IEnumerator|yield|event|Action|this|using|protected|virtual|override|base|interface|const|out|var|continue)\b)|(\b(?:MonoBehaviour|Debug|Vector3|Transform|GameObject|Input|Time|SerializeField|UnityEngine|Rigidbody|Collider|Collision|KeyCode|ForceMode|List|Animator|Destroy|Quaternion|Random|WaitForSeconds|ScriptableObject|CreateAssetMenu|JsonUtility|Application|File|Sprite|PlayerPrefs|Renderer|Serializable|TextArea|SaveData|State|Func|Enemy|IDamageable|IInteractable|InputAction|InputActionReference|Vector2|TMP_Text|Slider|Button|GameManager|Mathf|Dictionary|KeyValuePair|Monster|Player|Addressables|AsyncOperationHandle|AsyncOperationStatus|AssetReferenceGameObject|TextAsset|CultureInfo|NumberStyles|JsonConvert|AssetDatabase|EditorUtility|MenuItem|IList|Image|CharacterRow|CharacterData|CharacterList|Character|CharacterTable|Resources)\b)/g;
  let out="", last=0, m;
  while((m = re.exec(code))){
    out += esc(code.slice(last, m.index));
    const cls = m[1]?"c":m[2]?"s":m[3]?"n":m[4]?"k":"ty";
    out += '<span class="'+cls+'">'+esc(m[0])+'</span>';
    last = re.lastIndex;
  }
  out += esc(code.slice(last));
  return out.split("\n").map(l => '<span class="ln">'+(l||" ")+'</span>').join("");
}

/* ---------- 홈 ---------- */
const app = document.getElementById("app");
let allLessons = [];

function sky(){
  const ls = trackLessons(curTrack());
  const TOTAL_PLANNED = ls.length;
  const done = ls.filter(l => store.done[l.id]).length;
  const p = Math.min(done / TOTAL_PLANNED, 1);
  const ang = Math.PI * (1 - p);              // 왼쪽(π)에서 오른쪽(0)으로
  const cx = 160 + 120*Math.cos(ang), cy = 150 - 120*Math.sin(ang);
  return {done, total:TOTAL_PLANNED, svg:`
  <svg class="sky" viewBox="0 0 320 170" role="img" aria-label="진도 ${done}/${TOTAL_PLANNED}">
    <path d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 6"/>
    <path d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="var(--sun)" stroke-width="3"
      pathLength="1" stroke-dasharray="${p} 1"/>
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="16" fill="var(--sun)"/>
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="26" fill="var(--sun)" opacity=".18"/>
    <line x1="10" y1="150" x2="310" y2="150" stroke="var(--lagoon)" stroke-width="2"/>
    <path d="M10 160 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" fill="none" stroke="var(--lagoon)" stroke-width="1.5" opacity=".45"/>
  </svg>`};
}

function home(){
  if(location.hash) history.replaceState(null, "", location.pathname + location.search);
  const s = sky();
  const T = curTrack();
  const cap = s.done === 0 ? "레슨을 끝낼 때마다 해가 떠올라요" :
              s.done >= s.total ? `해가 다 졌어요. ${T.name} 코스 완주!` : `레슨 ${s.done}개 완료 · ${T.name} 코스 ${s.total}개`;
  app.innerHTML = `
  <div class="wrap">
    <header class="hero">
      <h1>유니티 C# 일주일</h1>
      <p>${T.sub}</p>
    </header>
    <div class="tabs" role="tablist">${TRACKS.map(t => `<button role="tab" aria-selected="${t.id===T.id}" class="tab ${t.id===T.id?"on":""}" data-t="${t.id}">${t.name}</button>`).join("")}</div>
    ${s.svg}
    <p class="sky-cap">${cap}</p>
    ${T.days.map(d => {
      const locked = d.lessons.length === 0;
      return `<section class="day ${locked?"locked":""}">
        <div class="day-head"><span class="day-n">Day ${d.n}</span><span class="day-t">${d.title}</span>${d.post ? `<a class="day-post" href="${d.post}" target="_blank" rel="noopener">📘 블로그 강의</a>` : ""}</div>
        ${locked ? `<p class="day-soon">아직 준비 중이에요</p>` :
          `<ul class="lessons">${d.lessons.map(l => `
            <li><button class="lesson-btn ${store.done[l.id]?"done":""}" data-id="${l.id}">
              <span class="dot"></span><span><b>${l.title}</b><small>${l.desc}</small></span>
            </button></li>`).join("")}</ul>`}
      </section>`;}).join("")}
    <div class="foot"><button class="link" id="reset">이 코스 진도 초기화</button></div>
  </div>`;
  app.querySelectorAll(".lesson-btn").forEach(b => b.onclick = () => start(b.dataset.id));
  app.querySelectorAll(".tab").forEach(b => b.onclick = () => { store.track = b.dataset.t; save(); home(); });
  document.getElementById("reset").onclick = () => {
    if(confirm(`${T.name} 코스의 완료 표시를 지울까요?`)){ trackLessons(T).forEach(l => delete store.done[l.id]); save(); home(); }
  };
  window.scrollTo(0,0);
}

/* ---------- 레슨 진행 ---------- */
let L, queue, pos, picked, checked, firstTry, seen, built, wrongAt;
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
const isQ = s => s.t === "q" || s.t === "build";
function tokensOf(s){ return s.answer.concat(s.extra || []); }
function makeOrder(s){
  if(s.t === "q") return shuffle(s.opts.map((_,k)=>k));
  if(s.t === "build"){
    const n = tokensOf(s).length; let o;
    do { o = shuffle([...Array(n).keys()]); } while(n > 2 && o.every((v,i)=>v===i));
    return o;
  }
  return null;
}
const sepOf = s => s.lines ? "\n" : (s.join !== undefined ? s.join : " ");

function start(id){
  L = allLessons.find(l => l.id === id);
  queue = L.steps.map((s,i) => ({...s, key:i, order: makeOrder(s)}));
  pos = 0; firstTry = 0; seen = new Set();
  step();
}

function prevReads(s){
  return L.steps.slice(0, s.key).filter(x => x.t === "read");
}
function readHTML(r){
  return `<h3>${r.h}</h3>${r.code ? `<pre class="code">${hl(r.code)}</pre>` : ""}${r.body || ""}${r.terms ? `<ul class="terms">${r.terms.map(t=>`<li>${t}</li>`).join("")}</ul>` : ""}`;
}
function openReview(s){
  const rs = prevReads(s);
  const sh = document.createElement("div");
  sh.className = "sheet"; sh.setAttribute("role","dialog"); sh.setAttribute("aria-label","앞 설명 다시 보기");
  sh.innerHTML = `<div class="sheet-head"><div class="wrap"><b>📖 앞에서 본 설명</b><button class="x" id="closeSheet" aria-label="닫기">×</button></div></div>
    <div class="wrap sheet-body">${rs.map((r,i) => `<section class="rv" id="rv${i}">${readHTML(r)}</section>`).join("")}</div>`;
  document.body.appendChild(sh);
  document.body.style.overflow = "hidden";
  const last = sh.querySelector(`#rv${rs.length-1}`);
  if(last) sh.scrollTop = last.offsetTop - 60;
  sh.querySelector("#closeSheet").onclick = () => { sh.remove(); document.body.style.overflow = ""; };
}

function step(){
  picked = null; checked = false; built = []; wrongAt = new Set();
  const s = queue[pos];
  const pct = Math.round(pos / queue.length * 100);
  let body = "";
  const reads = isQ(s) ? prevReads(s) : [];
  const review = reads.length ? `<button class="review-btn" id="reviewBtn">📖 앞 설명 다시 보기</button>` : "";
  // 문제가 "위 ~"로 시작하거나 prevCode가 켜져 있으면, 이 레슨에서 마지막으로 본 설명 코드를 문제 위에 보여 줘요
  const upCode = !s.code && isQ(s) && (/^위 /.test(s.q) || s.prevCode) ? (reads.slice().reverse().find(r => r.code) || {}).code : null;
  const qCode = s.code || upCode;
  const hint = s.hint ? `<button class="hint-btn" id="hintBtn">💡 힌트 보기</button><p class="hint" id="hint" hidden>${s.hint}</p>` : "";
  if(s.t === "read"){
    body = `<p class="kicker">${L.title}</p><h2>${s.h}</h2>
      ${s.code ? `<pre class="code">${hl(s.code)}</pre>` : ""}
      ${s.body || ""}
      ${s.terms ? `<ul class="terms">${s.terms.map(t=>`<li>${t}</li>`).join("")}</ul>` : ""}`;
  } else if(s.t === "q"){
    body = `<div class="q-head"><p class="kicker">${seen.has(s.key) ? "다시 풀기" : "문제"}</p>${review}</div><h2>${s.q}</h2>
      ${qCode ? `<pre class="code">${hl(qCode)}</pre>` : ""}
      <div class="opts">${s.order.map(k => `<button class="opt ${s.mono?"mono":""}" data-k="${k}">${esc(s.opts[k])}</button>`).join("")}</div>${hint}`;
  } else {
    body = `<div class="q-head"><p class="kicker">${seen.has(s.key) ? "다시 조립" : "블록 조립"}</p>${review}</div><h2>${s.q}</h2>
      ${qCode ? `<pre class="code">${hl(qCode)}</pre>` : ""}
      <div class="slot ${s.lines?"lines":""}" id="slot" aria-label="조립 칸"></div>
      <p class="bank-cap">블록을 눌러 순서대로 넣고, 넣은 블록을 누르면 빠져요</p>
      <div class="bank ${s.lines?"lines":""}" id="bank"></div>${hint}`;
  }
  app.innerHTML = `
    <div class="topbar"><div class="wrap">
      <button class="x" id="quit" aria-label="레슨 나가기">×</button>
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
    </div></div>
    <main class="wrap stage">${body}</main>
    <div class="dock" id="dock"><div class="wrap">
      <div id="fb"></div>
      <button class="main" id="go" ${isQ(s)?"disabled":""}>${isQ(s)?"확인":"다음"}</button>
    </div></div>`;
  const hb = document.getElementById("hintBtn");
  const rb = document.getElementById("reviewBtn");
  if(rb) rb.onclick = () => openReview(s);
  if(hb) hb.onclick = () => { document.getElementById("hint").hidden = false; hb.hidden = true; };
  document.getElementById("quit").onclick = () => { if(confirm("레슨을 나갈까요? 이 레슨 진행은 저장되지 않아요.")) home(); };
  app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
    if(checked) return;
    picked = +b.dataset.k;
    app.querySelectorAll(".opt").forEach(o => o.classList.toggle("sel", o===b));
    document.getElementById("go").disabled = false;
  });
  if(s.t === "build") renderBuild(s);
  document.getElementById("go").onclick = () => isQ(s) && !checked ? check(s) : next();
  window.scrollTo(0,0);
}

function renderBuild(s){
  const toks = tokensOf(s);
  const slot = document.getElementById("slot"), bank = document.getElementById("bank");
  slot.innerHTML = built.length ? built.map((k,i) =>
    `<button class="chip in ${s.lines?"line":""} ${wrongAt.has(i)?"bad":""}" data-i="${i}" ${checked?"disabled":""}>${s.lines ? hl(toks[k]) : esc(toks[k].trim())}</button>`).join("")
    : `<span class="slot-empty">여기에 조립돼요</span>`;
  // 줄 조립은 들여쓰기까지 보여 줘요. "{"와 "    {"처럼 들여쓰기만 다른 블록을 구분할 수 있게
  bank.innerHTML = s.order.map(k =>
    `<button class="chip ${built.includes(k)?"used":""}" data-k="${k}" ${built.includes(k)||checked?"disabled":""}>${esc(s.lines ? toks[k] : toks[k].trim())}</button>`).join("");
  slot.querySelectorAll(".chip").forEach(c => c.onclick = () => { if(checked) return; built.splice(+c.dataset.i,1); renderBuild(s); });
  bank.querySelectorAll(".chip").forEach(c => c.onclick = () => { if(checked) return; built.push(+c.dataset.k); renderBuild(s); });
  document.getElementById("go").disabled = built.length === 0 && !checked;
}

// 틀린 조립을 정답과 한 칸씩 비교해요. 정답이 여러 개(alts)면 같은 자리에 같은 블록이 가장 많은 정답과 비교해요
function diffBuild(s){
  const toks = tokensOf(s), mine = built.map(k => toks[k]);
  let best = s.answer, bestSame = -1;
  [s.answer].concat(s.alts || []).forEach(a => {
    const same = a.filter((t, i) => mine[i] === t).length;
    if(same > bestSame){ best = a; bestSame = same; }
  });
  const wrong = mine.map((t, i) => t !== best[i] ? i : -1).filter(i => i >= 0);
  return { mine, best, wrong, missing: Math.max(best.length - mine.length, 0) };
}

// 피드백에 보여 줄 '어디가 달라요' 목록 (최대 3개)
function diffNote(s, d){
  const unit = s.lines ? "줄" : "번째 블록";
  const show = t => `<code>${esc(t.trim())}</code>`;
  const items = d.wrong.slice(0, 3).map(i => {
    const n = s.lines ? `${i+1}번째 줄` : `${i+1}${unit}`;
    const want = d.best[i];
    if(want === undefined) return `<li>${n} ${show(d.mine[i])}: 필요 없는 ${s.lines?"줄":"블록"}이에요</li>`;
    if(want.trim() === d.mine[i].trim()) return `<li>${n} ${show(d.mine[i])}: 들여쓰기가 달라요</li>`;
    return `<li>${n} ${show(d.mine[i])} → ${show(want)}</li>`;
  });
  if(d.wrong.length > 3) items.push(`<li>그 밖에 ${d.wrong.length - 3}곳 더 달라요</li>`);
  if(d.missing) items.push(`<li>정답보다 ${s.lines?"줄":"블록"}이 ${d.missing}개 모자라요</li>`);
  return items.length ? `<ul class="diff">${items.join("")}</ul>` : "";
}

function check(s){
  checked = true;
  let ok, answerText, diff = null;
  if(s.t === "q"){
    ok = picked === s.a;
    answerText = esc(s.opts[s.a]);
    app.querySelectorAll(".opt").forEach(o => {
      o.disabled = true;
      const k = +o.dataset.k;
      if(k === s.a) o.classList.add("right");
      else if(k === picked) o.classList.add("wrong");
    });
  } else {
    const toks = tokensOf(s), sep = sepOf(s);
    const mine = built.map(k => toks[k]).join(sep);
    ok = [s.answer].concat(s.alts || []).some(a => a.join(sep) === mine);
    if(!ok){ diff = diffBuild(s); wrongAt = new Set(diff.wrong); }
    renderBuild(s);
    document.getElementById("slot").classList.add(ok ? "right" : "wrong");
  }
  if(ok && !seen.has(s.key)) firstTry++;
  if(!ok) queue.push({...s, order: makeOrder(s)});
  seen.add(s.key);
  const dock = document.getElementById("dock");
  dock.classList.add(ok?"ok":"bad","in");
  // 틀린 조립: 빨간 줄이 어떻게 달라야 하는지 알려 주고, 정답 코드에서 고쳐야 할 줄을 초록으로 표시해요
  let correctCode = "";
  if(diff){
    const fix = new Set(diff.wrong.concat(diff.best.map((_, i) => i).filter(i => i >= diff.mine.length)));
    const code = s.lines ? diff.best.map((line, i) => hl(line).replace('class="ln"', fix.has(i) ? 'class="ln fix"' : 'class="ln"')).join("")
                         : hl(diff.best.join(sepOf(s)));
    correctCode = diffNote(s, diff) + `<pre class="code fbcode">${code}</pre>`;
  }
  document.getElementById("fb").innerHTML = `<div class="fb"><strong>${ok ? "정답" : (s.t==="q" ? "정답은 "+answerText : "정답은 이렇게 조립해요")}</strong>${correctCode}${s.ex}
    ${ok?"":`<span class="again">이 문제는 레슨 끝에 한 번 더 나와요.</span>`}</div>`;
  document.getElementById("go").textContent = "계속";
}

function next(){
  pos++;
  if(pos >= queue.length) finish(); else step();
}

function finish(){
  store.done[L.id] = true; save();
  const qCount = L.steps.filter(isQ).length;
  const tl = trackLessons(TRACKS.find(t => trackLessons(t).includes(L)));
  const nxt = tl[tl.indexOf(L)+1];
  const day = TRACKS.flatMap(t => t.days).find(d => d.lessons.includes(L));
  app.innerHTML = `
  <div class="wrap done">
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="18" fill="var(--sun)"/><circle cx="32" cy="32" r="29" fill="var(--sun)" opacity=".2"/></svg>
    <h2>${L.title} 완료</h2>
    <div class="stats">
      <div><b>${firstTry}/${qCount}</b><span>한 번에 맞힌 문제</span></div>
      <div><b>${queue.length - L.steps.length}</b><span>다시 푼 문제</span></div>
    </div>
    <p><b>오늘 가져갈 것</b></p>
    <ul class="recap">${L.recap.map(r=>`<li>${r}</li>`).join("")}</ul>
    ${day && day.post ? `<a class="post-link" href="${day.post}" target="_blank" rel="noopener">📘 Day ${day.n} 블로그 강의에서 자세히 보기</a>` : ""}
    ${nxt ? `<button class="main" id="nx">다음 레슨: ${nxt.title}</button>` : ""}
    <div class="foot"><button class="link" id="hm">목록으로</button></div>
  </div>`;
  if(nxt) document.getElementById("nx").onclick = () => start(nxt.id);
  document.getElementById("hm").onclick = home;
  window.scrollTo(0,0);
}

/* ---------- 링크로 바로 열기 ---------- */
// 주소 끝에 #레슨id(예: #d1l1)를 붙이면 그 레슨이 바로 열리고, #코스id(예: #adv)면 그 코스 탭이 열려요.
function openFromHash(){
  const id = decodeURIComponent(location.hash.slice(1));
  if(!id) return false;
  const T = TRACKS.find(t => t.id === id || trackLessons(t).some(l => l.id === id));
  if(!T) return false;
  store.track = T.id; save();
  if(T.id === id) home(); else start(id);
  return true;
}

/* ---------- 시작 ---------- */
async function boot(){
  try{
    TRACKS = await loadTracks();
  }catch(e){
    const local = location.protocol === "file:";
    app.innerHTML = `
    <div class="wrap boot">
      <header class="hero"><h1>유니티 C# 일주일</h1></header>
      <p>${local ? "파일을 바로 열면 레슨 데이터를 불러올 수 없어요. 폴더에서 <code>npx serve</code>로 로컬 서버를 띄운 뒤 그 주소로 열어 주세요."
                 : "레슨 데이터를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요."}</p>
      <p><small>${esc(String(e.message || e))}</small></p>
    </div>`;
    return;
  }
  allLessons = TRACKS.flatMap(trackLessons);
  pickTrack();
  if(!openFromHash()) home();
  window.addEventListener("hashchange", openFromHash);
}
boot();

/* ---------- 오프라인 (PWA) ---------- */
if("serviceWorker" in navigator && location.protocol !== "file:"){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
