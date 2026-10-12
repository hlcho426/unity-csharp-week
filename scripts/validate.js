#!/usr/bin/env node
/* 레슨 데이터 검증: node scripts/validate.js
 *
 * 오류(하나라도 있으면 실패, 종료 코드 1)
 *   - courses.json / 코스 파일을 읽을 수 없거나 JSON 문법이 틀림
 *   - 필수 필드 누락, 자료형이 틀림
 *   - 레슨 id 또는 코스 id가 겹침 (진도가 레슨 id로 저장되니까 전체에서 유일해야 해요)
 *   - 객관식(q): 정답 번호 a가 정수가 아니거나 opts 범위 밖
 *   - 블록 조립(build): answer나 alts를 주어진 블록(answer + extra)으로 실제로 조립할 수 없음
 *
 * 경고(검증은 통과)
 *   - 모르는 필드 이름 (오타 의심. 예: hnit)
 *   - "위 ~"로 시작하는데 보여 줄 코드가 없는 문제
 *   - 객관식 보기가 겹침, alts가 answer와 똑같음
 *   - 한 줄 조립에서 앞뒤 공백만 다른 블록 (블록 창에서는 똑같아 보여요)
 *   - Day 번호가 1부터 차례대로가 아님
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const KNOWN = {
  course: ["id", "name", "desc", "file"],
  day: ["n", "title", "post", "lessons"],
  lesson: ["id", "title", "desc", "recap", "steps"],
  read: ["t", "h", "code", "body", "terms"],
  q: ["t", "q", "code", "opts", "a", "mono", "hint", "ex"],
  build: ["t", "q", "code", "answer", "alts", "extra", "lines", "join", "hint", "ex"]
};

const isStr = v => typeof v === "string";
const isStrArr = v => Array.isArray(v) && v.every(isStr);

function readJSON(rel) {
  const file = path.join(ROOT, rel);
  let text;
  try { text = fs.readFileSync(file, "utf8"); }
  catch (e) { err(rel, "파일을 읽을 수 없어요 (" + e.code + ")"); return null; }
  try { return JSON.parse(text); }
  catch (e) {
    const m = /position (\d+)/.exec(e.message);
    const where = m ? " (" + text.slice(0, +m[1]).split("\n").length + "번째 줄 근처)" : "";
    err(rel, "JSON 문법 오류" + where + " — " + e.message);
    return null;
  }
}

function checkKeys(where, obj, known) {
  for (const k of Object.keys(obj)) if (!known.includes(k)) warn(where, `모르는 필드 "${k}" (오타인가요?)`);
}
function need(where, obj, key, test, desc) {
  if (!(key in obj)) { err(where, `필수 필드 "${key}"가 없어요`); return false; }
  if (!test(obj[key])) { err(where, `"${key}"는 ${desc}여야 해요`); return false; }
  return true;
}
function optional(where, obj, key, test, desc) {
  if (key in obj && !test(obj[key])) err(where, `"${key}"는 ${desc}여야 해요`);
}

// 엔진(js/app.js)과 같은 방식: 고른 블록들을 sep으로 이어 붙인 글자가 정답 글자와 같으면 정답
function canAssemble(tokens, sep, target) {
  const used = new Array(tokens.length).fill(false);
  function go(cur, first) {
    if (!first && cur === target) return true;
    for (let i = 0; i < tokens.length; i++) {
      if (used[i]) continue;
      const next = first ? tokens[i] : cur + sep + tokens[i];
      if (!target.startsWith(next)) continue;
      used[i] = true;
      if (go(next, false)) return true;
      used[i] = false;
    }
    return false;
  }
  return go("", true);
}

function checkStep(where, s, prevReads) {
  if (!s || typeof s !== "object") { err(where, "단계가 객체가 아니에요"); return; }
  if (!["read", "q", "build"].includes(s.t)) { err(where, `t는 "read", "q", "build" 중 하나여야 해요 (지금: ${JSON.stringify(s.t)})`); return; }
  where += `(${s.t})`;
  checkKeys(where, s, KNOWN[s.t]);
  optional(where, s, "code", isStr, "글자");
  optional(where, s, "hint", isStr, "글자");

  if (s.t === "read") {
    need(where, s, "h", isStr, "글자");
    optional(where, s, "body", isStr, "글자");
    optional(where, s, "terms", isStrArr, "글자 배열");
    if (!s.code && !s.body && !s.terms) warn(where, "code, body, terms가 모두 비어 있어요");
    return;
  }

  need(where, s, "q", isStr, "글자");
  need(where, s, "ex", isStr, "글자");

  // "위 ~"로 시작하는 문제는 앞 설명(read)의 마지막 코드를 자동으로 보여 줘요 (객관식만)
  if (!s.code && isStr(s.q)) {
    const hasUpCode = prevReads.some(r => r.code);
    if (/^위 /.test(s.q)) {
      if (s.t === "build") warn(where, `"위 ~" 문제지만 블록 조립에는 코드 자동 표시가 없어요: ${s.q}`);
      else if (!hasUpCode) warn(where, `"위 ~" 문제인데 앞 설명에 보여 줄 코드가 없어요: ${s.q}`);
    } else if (/\(위와 같은|위 코드|위의 코드/.test(s.q)) {
      warn(where, `'위'를 가리키지만 "위 "로 시작하지 않아 코드가 자동으로 안 보여요: ${s.q}`);
    }
  }

  if (s.t === "q") {
    optional(where, s, "mono", v => typeof v === "boolean", "true/false");
    if (need(where, s, "opts", v => isStrArr(v) && v.length >= 2, "글자 2개 이상의 배열")) {
      if (need(where, s, "a", Number.isInteger, "정수")) {
        if (s.a < 0 || s.a >= s.opts.length) err(where, `정답 번호 a=${s.a}가 보기 범위(0~${s.opts.length - 1}) 밖이에요`);
      }
      const dup = s.opts.filter((o, i) => s.opts.indexOf(o) !== i);
      if (dup.length) warn(where, `보기가 겹쳐요: ${dup.join(", ")}`);
    }
    return;
  }

  // build
  optional(where, s, "lines", v => typeof v === "boolean", "true/false");
  optional(where, s, "join", isStr, "글자");
  optional(where, s, "extra", isStrArr, "글자 배열");
  optional(where, s, "alts", v => Array.isArray(v) && v.every(isStrArr), "글자 배열들의 배열");
  if (!need(where, s, "answer", v => isStrArr(v) && v.length > 0, "비어 있지 않은 글자 배열")) return;
  const tokens = s.answer.concat(isStrArr(s.extra) ? s.extra : []);
  const sep = s.lines ? "\n" : (s.join !== undefined ? s.join : " ");
  const targets = [["answer", s.answer]].concat((Array.isArray(s.alts) ? s.alts : []).map((a, i) => [`alts[${i}]`, a]));
  for (const [name, arr] of targets) {
    if (!isStrArr(arr)) continue;
    if (!canAssemble(tokens, sep, arr.join(sep))) err(where, `${name}를 주어진 블록으로 조립할 수 없어요: ${JSON.stringify(arr.join(sep))}`);
    if (name !== "answer" && arr.join(sep) === s.answer.join(sep)) warn(where, `${name}가 answer와 똑같아요`);
  }
  // 한 줄 조립은 블록 창에서 앞뒤 공백을 빼고 보여 줘요 (줄 조립은 들여쓰기까지 보여 줌)
  if (!s.lines) {
    const seenTrim = new Map();
    for (const t of tokens) {
      const k = t.trim();
      if (seenTrim.has(k) && seenTrim.get(k) !== t) warn(where, `앞뒤 공백만 다른 블록이 있어요 ("${k}") — 블록 창에서는 똑같아 보여서 잘못 고르면 오답이 돼요`);
      seenTrim.set(k, t);
    }
  }
}

function main() {
  const courses = readJSON("data/courses.json");
  if (!Array.isArray(courses)) {
    if (courses) err("data/courses.json", "맨 바깥은 코스 목록 배열 [ ... ] 이어야 해요");
    return report([]);
  }
  const courseIds = new Set();
  const lessonIds = new Map();
  const summary = [];

  courses.forEach((c, ci) => {
    const cw = `courses.json[${ci}]`;
    if (!c || typeof c !== "object") { err(cw, "코스 항목이 객체가 아니에요"); return; }
    checkKeys(cw, c, KNOWN.course);
    ["id", "name", "desc", "file"].forEach(k => need(cw, c, k, isStr, "글자"));
    if (isStr(c.id)) {
      if (courseIds.has(c.id)) err(cw, `코스 id "${c.id}"가 겹쳐요`);
      courseIds.add(c.id);
    }
    if (!isStr(c.file)) return;
    const days = readJSON(c.file);
    if (!days) return;
    if (!Array.isArray(days)) { err(c.file, "맨 바깥은 Day 배열 [ ... ] 이어야 해요"); return; }

    let lessonCount = 0, qCount = 0, buildCount = 0;
    days.forEach((d, di) => {
      const dw = `${c.id} › Day[${di}]`;
      if (!d || typeof d !== "object") { err(dw, "Day가 객체가 아니에요"); return; }
      checkKeys(dw, d, KNOWN.day);
      if (need(dw, d, "n", Number.isInteger, "정수") && d.n !== di + 1) warn(dw, `Day 번호가 ${di + 1}이어야 자연스러워요 (지금: ${d.n})`);
      need(dw, d, "title", isStr, "글자");
      optional(dw, d, "post", v => isStr(v) && /^https:\/\//.test(v), "https://로 시작하는 블로그 글 주소");
      if (!need(dw, d, "lessons", Array.isArray, "배열")) return;

      d.lessons.forEach((l, li) => {
        const lw = `${c.id} › Day ${d.n} › ${l && l.id ? l.id : "레슨[" + li + "]"}`;
        if (!l || typeof l !== "object") { err(lw, "레슨이 객체가 아니에요"); return; }
        checkKeys(lw, l, KNOWN.lesson);
        if (need(lw, l, "id", isStr, "글자")) {
          if (lessonIds.has(l.id)) err(lw, `레슨 id "${l.id}"가 ${lessonIds.get(l.id)}에도 있어요 (진도가 id로 저장돼서 꼭 유일해야 해요)`);
          else lessonIds.set(l.id, `${c.id} Day ${d.n}`);
        }
        need(lw, l, "title", isStr, "글자");
        need(lw, l, "desc", isStr, "글자");
        need(lw, l, "recap", v => isStrArr(v) && v.length > 0, "비어 있지 않은 글자 배열");
        if (!need(lw, l, "steps", v => Array.isArray(v) && v.length > 0, "비어 있지 않은 배열")) return;
        lessonCount++;
        const reads = [];
        l.steps.forEach((s, si) => {
          checkStep(`${lw} › ${si + 1}번째 단계`, s, reads);
          if (s && s.t === "read") reads.push(s);
          if (s && s.t === "q") qCount++;
          if (s && s.t === "build") buildCount++;
        });
        if (!l.steps.some(s => s && (s.t === "q" || s.t === "build"))) warn(lw, "문제가 하나도 없어요");
      });
    });
    summary.push(`  ${c.name} (${c.id}): Day ${days.length}개 · 레슨 ${lessonCount}개 · 객관식 ${qCount} · 블록 조립 ${buildCount}`);
  });
  report(summary, lessonIds.size);
}

function report(summary, total) {
  console.log("레슨 데이터 검증\n");
  if (summary.length) console.log(summary.join("\n") + `\n  전체 레슨 ${total}개 (id 모두 유일${errors.some(e => e.includes("레슨 id")) ? "하지 않음" : ""})\n`);
  if (warnings.length) console.log(`경고 ${warnings.length}개\n` + warnings.map(w => "  ⚠ " + w).join("\n") + "\n");
  if (errors.length) {
    console.log(`오류 ${errors.length}개\n` + errors.map(e => "  ✖ " + e).join("\n"));
    console.log("\n❌ 검증 실패");
    process.exit(1);
  }
  console.log("✅ 오류 없음");
}

main();
