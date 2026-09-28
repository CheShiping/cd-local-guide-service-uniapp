#!/usr/bin/env node
/**
 * 动效静态校验（零依赖）
 *
 * 规范在 DESIGN.md §13，令牌在 uni.scss §1.10，时长镜像在 utils/motion.js 的 MOTION。
 * 这里只查「机器能一眼判死」的几条，把最容易写坏的动效坑挡在提交前：
 *
 *   1. 不许动 layout —— transition 的属性只允许 transform / opacity / color / background-color
 *      / border-color / box-shadow（box-shadow 只给单选环这类小元素与卡片层级，见 DESIGN.md §13.2）
 *      （写 `transition: all` 或 `transition: 200ms ease`（隐式 all）都算违规）
 *   2. 不许 `ease-in` —— 过渡统一 $ds-ease-out，进场用 $ds-ease-enter
 *   3. `linear` 只给加载指示器（常量运动）；transition 上出现 linear 一律算错
 *   4. UI 动效时长 ≤ 400ms（当前定稿只用到 150 / 200ms），且 vue 文件里只能写 $ds-dur-* 令牌，不许出现裸的 `200ms`
 *   5. 不许 `scale(0)` —— 缩放从「差一点」开始，不从无到有
 *   6. 不许 `:hover` —— 触摸端没有 hover，按压反馈统一用 hover-class="is-pressed"
 *   7. keyframes 必须放在 App.vue 的全局样式里；页面不许自带 @keyframes
 *   8. 页面里引用的动画名必须在 App.vue 有对应 @keyframes（写错的动画名会静默失效）
 *   9. 动画名不许内联 —— 必须写在 class 里，否则 prefers-reduced-motion 覆盖不掉
 *  10. App.vue 必须有 prefers-reduced-motion 降级
 *  11. utils/motion.js 的 MOTION 与 uni.scss 的 $ds-dur-* 必须逐项一致
 *
 * 用法：
 *   node scripts/check-motion.mjs              # 校验真实文件
 *   node scripts/check-motion.mjs --self-test  # 自检：故意写坏的文件必须被检出
 *
 * 退出码：0 = 通过；1 = 存在违规，或自检未通过
 */

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** transition 允许的动画属性（跳过 layout；box-shadow 见 DESIGN.md §13.2 白名单） */
const TRANSITION_PROPS = new Set([
  'transform',
  'opacity',
  'color',
  'background-color',
  'border-color',
  'box-shadow'
]);

/** 时间字面量：140ms / 0.22s */
const TIME_LITERAL = /^\d*\.?\d+m?s$/;

/* UI 动效的时长上限：定稿「气泡漫游」只用到 150ms（按压 / 颜色）与 200ms（指示器 / 较大表面），
   预算留到 400ms 是给将来的一次性、低频过渡留余量。 */
const MAX_UI_DURATION_MS = 400;

/** 把 `140ms` / `0.22s` 换算成毫秒；不是时间返回 null */
function toMillis(token) {
  const match = String(token).match(/^(\d*\.?\d+)(m?s)$/);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2] === 's' ? value * 1000 : value;
}

/** 去掉注释，避免把注释里的示例代码当违规 */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * 把一段样式拆成「声明 + 该声明所在的 selector」
 *
 * 不用按行切：真实代码里既有「一行一条声明」也有一行写完的
 * （`.a { transition: all 200ms; }`），按行切会漏掉后者。
 * 这里做个最小的花括号状态机，块结构用栈维护，行号按字符位置累加。
 */
function walkDeclarations(css) {
  const source = stripComments(css);
  const rows = [];
  const stack = [];
  let buffer = '';
  let bufferLine = 1;
  let lineNo = 1;

  const flushDeclaration = () => {
    const text = buffer.trim();
    if (text) rows.push({ line: text, lineNo: bufferLine, selector: stack[stack.length - 1] || '' });
    buffer = '';
  };

  for (const char of source) {
    if (char === '\n') lineNo += 1;

    if (char === '{') {
      const head = buffer.trim();
      if (/^@keyframes\b/.test(head)) {
        /* keyframes 的「选择器」正是要检查的目标，单独记一条 */
        rows.push({ line: head, lineNo: bufferLine, selector: '' });
      }
      stack.push(head);
      buffer = '';
      bufferLine = lineNo;
      continue;
    }

    if (char === '}') {
      flushDeclaration();
      stack.pop();
      bufferLine = lineNo;
      continue;
    }

    if (char === ';') {
      flushDeclaration();
      bufferLine = lineNo;
      continue;
    }

    if (!buffer.trim()) bufferLine = lineNo;
    buffer += char;
  }

  flushDeclaration();
  return rows.filter((row) => row.line);
}

/** 校验 uni.scss 的动效令牌，返回「令牌名 → 毫秒」的表 */
function checkTokens(scss, failures) {
  const durations = new Map();

  stripComments(scss)
    .split(/\r?\n/)
    .forEach((line, index) => {
      const definition = line.match(/^\s*(\$ds-[\w-]*)\s*:\s*([^;]+);/);
      if (!definition) return;
      const name = definition[1];
      if (!/^\$ds-(dur-|stagger-)/.test(name)) return;

      const value = definition[2].trim();
      const ms = toMillis(value);
      if (ms === null) {
        failures.push(`uni.scss 第 ${index + 1} 行：${name} 不是时间值（${value}）`);
        return;
      }

      durations.set(name.slice(1), ms);

      /* 加载指示器是常量运动，天生就该慢；其余 UI 动效一律 ≤ 400ms */
      if (name !== '$ds-dur-spin' && ms > MAX_UI_DURATION_MS) {
        failures.push(`uni.scss 第 ${index + 1} 行：${name} = ${value} 超过 ${MAX_UI_DURATION_MS}ms 预算`);
      }
    });

  return durations;
}

/**
 * uni.scss 的 $ds-dur-* / $ds-stagger-* 与 utils/motion.js 的 MOTION 必须一一对应
 *
 * 这两份时长是两个来源（CSS 用 SCSS 令牌，JS 里的 setTimeout 用 MOTION），
 * 最容易出现「改了 SCSS 忘了改 JS」，页面转场的等待时间就会和动画时长错位。
 */
function checkMotionConstants({ scssDurations, motionSource, failures }) {
  const block = motionSource.match(/export const MOTION = \{([\s\S]*?)\n\};/);
  if (!block) {
    failures.push('utils/motion.js：找不到 MOTION 常量块（页面靠它与 CSS 的时长对齐）');
    return 0;
  }

  const camelToKebab = (key) => key.replace(/([A-Z])/g, '-$1').toLowerCase();
  let checked = 0;

  for (const match of block[1].matchAll(/^\s*([A-Za-z]\w*)\s*:\s*(\d+)\s*,?\s*$/gm)) {
    const key = match[1];
    const ms = Number(match[2]);
    const kebab = camelToKebab(key);
    const token = kebab.startsWith('stagger') ? `$ds-${kebab}` : `$ds-dur-${kebab}`;
    const expected = scssDurations.get(token.slice(1));

    if (expected === undefined) {
      failures.push(`utils/motion.js：MOTION.${key} 在 uni.scss 里找不到对应的 ${token}`);
      continue;
    }
    if (expected !== ms) {
      failures.push(
        `utils/motion.js：MOTION.${key} = ${ms}ms 与 uni.scss 的 ${token} = ${expected}ms 不一致（两份时长必须成对改）`
      );
      continue;
    }
    checked += 1;
  }

  return checked;
}

/** 校验一段样式（页面或 App.vue） */
function checkStyles({ label, css, globalKeyframes, failures }) {
  const rows = walkDeclarations(css);

  for (const { line, lineNo, selector } of rows) {
    /* 6. :hover 在触摸端没有意义，按压反馈统一走 hover-class */
    if (/:hover\b/.test(line) || /:hover\b/.test(selector)) {
      failures.push(`${label} 第 ${lineNo} 行：不要用 :hover（触摸端无 hover，按压反馈用 hover-class="is-pressed"）`);
    }

    /* 7. keyframes 只能放在 App.vue 的全局样式里 */
    if (/@keyframes\b/.test(line) && !globalKeyframes) {
      failures.push(`${label} 第 ${lineNo} 行：页面里不许自带 @keyframes（scoped 会重命名，其它页面用不了；放到 App.vue 全局样式）`);
    }

    /* 2 / 4：裸的时间字面量 → 必须用 $ds-dur-* 令牌 */
    if (!globalKeyframes && /\b(?:transition|animation)(?:-duration)?\s*:/.test(line)) {
      const bare = line.match(/(^|[\s,(])(\d*\.?\d+m?s)\b/);
      if (bare) {
        failures.push(`${label} 第 ${lineNo} 行：动效时长写了裸值 ${bare[2]}（用 $ds-dur-* 令牌）`);
      }
    }

    /* 2. 禁 ease-in（ease-in-out 不受影响） */
    if (/(^|[\s,(])ease-in([\s,;)]|$)/.test(line)) {
      failures.push(`${label} 第 ${lineNo} 行：不要用 ease-in（入场用 $ds-ease-out，屏上移动用 $ds-ease-in-out）`);
    }

    /* 3. transition 上禁 linear；linear 只留给加载指示器 */
    if (/\btransition\b/.test(line) && /\blinear\b/.test(line)) {
      failures.push(`${label} 第 ${lineNo} 行：transition 上不要用 linear（常量运动才用 linear）`);
    }
    if (/\banimation\b/.test(line) && /\blinear\b/.test(line) && !/ds-spin/.test(line)) {
      failures.push(`${label} 第 ${lineNo} 行：动画用了 linear 但看起来不是加载指示器（linear 只给 ds-spin）`);
    }

    /* 1. transition 的属性白名单 */
    const transition = line.match(/^transition(-property)?\s*:\s*([^;{}]+)/);
    if (transition) {
      const value = transition[2].trim();
      if (/^none\b/.test(value)) continue;

      for (const part of value.split(',')) {
        const first = part.trim().split(/\s+/)[0];
        if (!first) continue;
        if (TIME_LITERAL.test(first) || /^\d/.test(first)) {
          failures.push(`${label} 第 ${lineNo} 行：transition 省略属性名等于隐式 all（写出要动的属性，且只能是 ${[...TRANSITION_PROPS].join(' / ')}）`);
          continue;
        }
        if (transition[1]) {
          if (!TRANSITION_PROPS.has(first)) {
            failures.push(`${label} 第 ${lineNo} 行：transition-property 不允许 ${first}（会触发 layout / paint）`);
          }
          continue;
        }
        if (!TRANSITION_PROPS.has(first)) {
          failures.push(`${label} 第 ${lineNo} 行：transition 不允许动 ${first}（只允许 ${[...TRANSITION_PROPS].join(' / ')}）`);
        }
      }
    }

    /* 5. 禁 scale(0) —— 从无到有会「凭空出现」 */
    if (/scale3?d?\(\s*0\s*[,)]/.test(line)) {
      failures.push(`${label} 第 ${lineNo} 行：不要用 scale(0)（入场从 0.95~0.97 这类「差一点」的值开始）`);
    }
  }
}

/** 收集样式里引用的动画名 */
function collectAnimationNames(css) {
  const names = new Set();
  const clean = stripComments(css);

  for (const match of clean.matchAll(/animation-name\s*:\s*([^;{}]+)/g)) {
    for (const name of match[1].split(',')) names.add(name.trim());
  }

  for (const match of clean.matchAll(/(?:^|[;{\s])animation\s*:\s*([^;{}]+)/g)) {
    const first = match[1].trim().split(/\s+/)[0];
    if (!first || TIME_LITERAL.test(first)) continue;
    /* 关键字开头说明这里没有名字（写错了，交给其它规则） */
    if (/^(none|infinite|linear|ease|ease-in|ease-out|ease-in-out|step)/.test(first)) continue;
    names.add(first);
  }

  return names;
}

async function collectFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(full)));
    else if (entry.name.endsWith('.vue')) files.push(full);
  }
  return files;
}

/**
 * 从 SFC 里抽出所有 <style> 块的内容
 * 用换行把块前的行补齐，这样报出的行号就是文件里的真实行号
 */
function styleBlocks(source) {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => {
    const offset = source.slice(0, match.index).split(/\r?\n/).length;
    return '\n'.repeat(offset) + match[1];
  });
}

async function analyze(root) {
  const failures = [];
  const notes = [];
  const read = (relative) => readFile(path.join(root, relative), 'utf8');

  /* ---------- uni.scss 的时长令牌 ---------- */
  const scss = await read('uni.scss');
  const scssDurations = checkTokens(scss, failures);
  notes.push(`uni.scss：${scssDurations.size} 个时长令牌已按 ${MAX_UI_DURATION_MS}ms 预算检查`);

  /* ---------- SCSS 令牌 ↔ JS 常量 ---------- */
  let motionSource = null;
  try {
    motionSource = await read('utils/motion.js');
  } catch {
    notes.push('utils/motion.js：不存在，跳过「SCSS 令牌 ↔ JS 常量」一致性检查');
  }
  if (motionSource) {
    const checked = checkMotionConstants({ scssDurations, motionSource, failures });
    notes.push(`utils/motion.js：MOTION 与该 ${checked} 个时长令牌逐项一致`);
  }

  /* ---------- App.vue：keyframes 的唯一出处 + 降级 ---------- */
  const app = await read('App.vue');
  const appStyles = styleBlocks(app).join('\n');
  const keyframes = new Set([...appStyles.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1]));

  if (!keyframes.size) {
    failures.push('App.vue：没有找到任何 @keyframes（动画名必须在这里集中定义）');
  }
  if (!/prefers-reduced-motion/.test(appStyles)) {
    failures.push('App.vue：缺少 prefers-reduced-motion 降级（去掉位移与回弹，保留淡入）');
  }

  checkStyles({ label: 'App.vue', css: appStyles, globalKeyframes: true, failures });

  /* 动画名必须都能对上 keyframes：写错名字的动画会静默失效，正是最难发现的一类问题 */
  const appNames = collectAnimationNames(appStyles);
  for (const name of appNames) {
    if (!keyframes.has(name)) {
      failures.push(`App.vue：引用了不存在的动画 ${name}`);
    }
  }

  notes.push(`App.vue：${keyframes.size} 个 @keyframes，引用 ${appNames.size} 个动画名`);

  /* ---------- 页面与公共组件：样式规则 + 动画名必须存在 + 不许内联动画名 ----------
     组件（components/）与页面同源：同样的属性白名单与时长预算，不能因为「不是页面」就漏检 */
  const pageFiles = [
    ...(await collectFiles(path.join(root, 'pages'))),
    ...(await collectFiles(path.join(root, 'components')))
  ];
  const usedNames = new Map();

  for (const file of pageFiles) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const source = await readFile(file, 'utf8');

    if (/animationName/.test(source)) {
      failures.push(`${relative}：动画名不要内联（:style 的 animationName 会盖掉 prefers-reduced-motion 的降级，改成 class）`);
    }

    for (const css of styleBlocks(source)) {
      checkStyles({ label: relative, css, globalKeyframes: false, failures });
      for (const name of collectAnimationNames(css)) {
        if (!usedNames.has(name)) usedNames.set(name, relative);
      }
    }
  }

  for (const [name, relative] of usedNames) {
    if (!keyframes.has(name)) {
      failures.push(`${relative}：引用了不存在的动画 ${name}（@keyframes 定义在 App.vue 全局样式里）`);
    }
  }

  notes.push(`页面与公共组件：${pageFiles.length} 个文件，引用 ${usedNames.size} 个动画名`);

  return { failures, notes };
}

/* ---------- 自检：证明校验器不是空门禁 ---------- */
const BROKEN = {
  'uni.scss': [
    '$ds-dur-base: 600ms;',
    '$ds-dur-page-leave: 260ms;',
    '$ds-ease-out: cubic-bezier(0.23, 1, 0.32, 1);',
    ''
  ].join('\n'),
  'utils/motion.js': 'export const MOTION = {\n  pageLeave: 999\n};\n',
  'App.vue': [
    '<script>export default {};</script>',
    '<style>',
    '.a { transition: all 200ms ease; }',
    '@keyframes ds-ok { to { opacity: 1; } }',
    '</style>'
  ].join('\n'),
  'pages/x/x.vue': [
    '<style>',
    '.b { transition: width 200ms ease; }',
    '.c { transition: 200ms ease-in; }',
    '.d { animation: ds-missing 500ms linear; }',
    '.f { transition: opacity 200ms linear; }',
    '.e:hover { transform: scale(0); }',
    '@keyframes ds-local { to { opacity: 1; } }',
    '</style>'
  ].join('\n')
};

async function selfTest() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'motion-selftest-'));
  const problems = [];

  try {
    for (const [relative, content] of Object.entries(BROKEN)) {
      const target = path.join(temporaryRoot, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }

    const { failures } = await analyze(temporaryRoot);
    const has = (fragment) => failures.some((item) => item.includes(fragment));

    const expectations = [
      ['超过 400ms 预算', '超长时长'],
      ['不一致', 'SCSS 令牌与 JS 常量不一致'],
      ['transition 不允许动 all', 'transition: all'],
      ['不允许动 width', 'transition 动 layout 属性'],
      ['ease-in', 'ease-in'],
      ['transition 上不要用 linear', 'transition 用 linear'],
      ['不是加载指示器', 'animation 上的 linear'],
      ['scale(0)', 'scale(0)'],
      [':hover', ':hover'],
      ['页面里不许自带 @keyframes', '页面内 @keyframes'],
      ['不存在的动画 ds-missing', '动画名不存在'],
      ['缺少 prefers-reduced-motion', '缺降级']
    ];

    for (const [fragment, label] of expectations) {
      if (!has(fragment)) problems.push(`未检出：${label}`);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log('=== 动效校验自检 ===');
  if (problems.length) {
    for (const problem of problems) console.log(`  x ${problem}`);
    console.log('\n自检未通过：校验器可能形同虚设。');
    return 1;
  }

  console.log('  通过：12 类动效违规都能被检出');
  return 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(await selfTest());
}

const root = path.resolve(process.env.HARNESS_ROOT || process.cwd());
const { failures, notes } = await analyze(root);

console.log('=== 动效校验 ===');
for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.log(`\n失败（${failures.length}）：`);
  for (const failure of failures) console.log(`  x ${failure}`);
  console.log('\n动效校验未通过。规范见 DESIGN.md §13，令牌见 uni.scss §1.10。');
  process.exit(1);
}

console.log('\n动效校验通过。');
