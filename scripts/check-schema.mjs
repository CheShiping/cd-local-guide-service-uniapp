#!/usr/bin/env node
/**
 * 数据库表结构校验（零依赖）
 *
 * 规则来源：.codebuddy/skills/database-design/SKILL.md + docs/mvp-scope.json 的边界
 * 校验内容：
 *   1. 表名：小写、下划线、复数（以 s 结尾）
 *   2. 必备列：所有表要有 id + created_at；业务表还要有 updated_at + is_deleted
 *   3. 金额列必须是 DECIMAL；全库禁止 FLOAT / DOUBLE / REAL
 *   4. 索引命名：pk_ / uk_ / idx_ / fk_ 前缀，且每张表至少一个非主键索引
 *   5. 每个字段都要有 COMMENT
 *   6. MVP 边界：不得出现评价/收藏/钱包/优惠券/IM/分销相关表与字段
 *   7. MVP 必需表齐全
 *
 * 用法：
 *   node scripts/check-schema.mjs              # 校验 docx/database/schema.sql
 *   node scripts/check-schema.mjs --self-test  # 自检：用故意写坏的表结构验证校验器会报错
 *
 * 退出码：0 = 通过；1 = 存在违规，或自检未通过
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * 必备列按表的真实语义分三类（不要一刀切）：
 *   - 业务表：id + created_at + updated_at + is_deleted（历史订单要能追溯主体，故必须软删除）
 *   - 从属配置表：id + created_at + updated_at；失效用 enabled / is_available 表达，不需要 is_deleted
 *   - 关系表 / 日志表：只有 id + created_at（一行只增或只删，永远不更新，updated_at 无意义）
 */
const BUSINESS_TABLES = ['users', 'attractions', 'guides', 'package_skus', 'orders'];
const CONFIG_TABLES = ['guide_packages', 'guide_available_dates'];

/** MVP 必需表（见 docx/database/数据库设计.md，共 10 张） */
const REQUIRED_TABLES = [
  'users',
  'region_types',
  'attractions',
  'guides',
  'guide_region_types',
  'guide_attractions',
  'package_skus',
  'guide_packages',
  'guide_available_dates',
  'orders'
];

/** MVP 明确不做的表（docs/mvp-scope.json 的 outOfScope） */
const FORBIDDEN_TABLES = [
  'reviews',
  'guide_ratings',
  'ratings',
  'favorites',
  'wallets',
  'wallet_transactions',
  'coupons',
  'messages',
  'chats',
  'guide_applications',
  'distributors'
];

/** 金额相关列名 */
const MONEY_COLUMN = /(^amount$|_amount$|^price$|_price$|^price_[a-z]+$)/;

/** 评价相关列名（dev-002 不做评价） */
const FORBIDDEN_COLUMN = /(rating|review|score)/;

function analyzeSchema(sql) {
  const failures = [];
  const notes = [];

  const clean = sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('--'))
    .join('\n');

  for (const banned of FORBIDDEN_TABLES) {
    if (new RegExp(`CREATE TABLE\\s+${banned}\\b`, 'i').test(clean)) {
      failures.push(`出现了 MVP 明确不做的表：${banned}`);
    }
  }

  // 现阶段不使用外键约束：完整性由应用层保证，避免分库分表与高并发受限
  if (/FOREIGN\s+KEY/i.test(clean)) {
    failures.push('出现了 FOREIGN KEY：现阶段不使用外键约束，请改为 id 关联 + 索引，由应用层保证完整性');
  }

  const tables = [];
  const tablePattern = /CREATE TABLE\s+([a-z][a-z0-9_]*)\s*\(([\s\S]*?)\)\s*ENGINE=/g;
  for (const match of clean.matchAll(tablePattern)) {
    tables.push({ name: match[1], body: match[2] });
  }

  if (!tables.length) {
    failures.push('没有解析到任何 CREATE TABLE 语句');
    return { failures, notes };
  }

  let columnCount = 0;
  let indexCount = 0;

  for (const table of tables) {
    const columns = [];
    const indexes = [];

    for (const rawLine of table.body.split('\n')) {
      const line = rawLine.replace(/,\s*$/, '').trim();
      if (!line) continue;
      if (/^(CONSTRAINT|PRIMARY|UNIQUE|INDEX|KEY|FOREIGN|CHECK)\b/.test(line)) {
        indexes.push(line);
        continue;
      }
      const column = line.match(/^([a-z][a-z0-9_]*)\s+([A-Za-z]+(?:\([^)]*\))?)/);
      if (column) columns.push({ name: column[1], type: column[2], line });
    }

    columnCount += columns.length;
    indexCount += indexes.length;

    if (!/^[a-z][a-z0-9_]*s$/.test(table.name)) {
      failures.push(`表名不规范：${table.name}（要求小写 + 下划线 + 复数，以 s 结尾）`);
    }

    const columnNames = new Set(columns.map((item) => item.name));
    const required = ['id', 'created_at'];
    if (BUSINESS_TABLES.includes(table.name) || CONFIG_TABLES.includes(table.name)) {
      required.push('updated_at');
    }
    if (BUSINESS_TABLES.includes(table.name)) {
      required.push('is_deleted');
    }
    for (const name of required) {
      if (!columnNames.has(name)) {
        failures.push(`表 ${table.name} 缺少必备列 ${name}`);
      }
    }

    for (const column of columns) {
      if (!/COMMENT\s+'/.test(column.line)) {
        failures.push(`表 ${table.name} 的字段 ${column.name} 缺少 COMMENT`);
      }
      if (/\b(FLOAT|DOUBLE|REAL)\b/i.test(column.type)) {
        failures.push(`表 ${table.name} 的字段 ${column.name} 使用了 ${column.type}，金额必须用 DECIMAL`);
      }
      if (MONEY_COLUMN.test(column.name) && !/^DECIMAL/i.test(column.type)) {
        failures.push(`表 ${table.name} 的金额字段 ${column.name} 类型是 ${column.type}，应为 DECIMAL(10,2)`);
      }
      if (FORBIDDEN_COLUMN.test(column.name)) {
        failures.push(`表 ${table.name} 出现评价相关字段 ${column.name}（dev-002 不做评价）`);
      }
    }

    const primary = indexes.find((item) => /^CONSTRAINT\s+pk_/.test(item));
    if (!primary) {
      failures.push(`表 ${table.name} 缺少命名主键（应为 CONSTRAINT pk_${table.name} PRIMARY KEY）`);
    } else if (!primary.includes(`pk_${table.name} `)) {
      failures.push(`表 ${table.name} 的主键命名不符合 pk_表名：${primary}`);
    }

    const secondary = indexes.filter((item) => /^(UNIQUE\s+)?INDEX\s/.test(item));
    if (!secondary.length) {
      failures.push(`表 ${table.name} 没有任何非主键索引`);
    }

    for (const index of secondary) {
      const named = index.match(/^(UNIQUE\s+)?INDEX\s+([a-z0-9_]+)/);
      if (!named) continue;
      const [, unique, name] = named;
      const expect = unique ? `uk_${table.name}_` : `idx_${table.name}_`;
      if (!name.startsWith(expect)) {
        failures.push(`表 ${table.name} 的索引 ${name} 命名应以 ${expect} 开头`);
      }
    }

  }

  const tableNames = tables.map((item) => item.name);
  for (const required of REQUIRED_TABLES) {
    if (!tableNames.includes(required)) {
      failures.push(`缺少 MVP 必需表：${required}`);
    }
  }

  notes.push(`解析到 ${tables.length} 张表、${columnCount} 个字段、${indexCount} 条索引/约束定义`);
  notes.push(`表清单：${tableNames.join(', ')}`);
  notes.push('外键约束：未使用（应用层保证完整性）');

  return { failures, notes };
}

/* ---------- 自检 ---------- */
const SELF_TEST_SQL = `
CREATE TABLE review (id BIGINT, name VARCHAR(10)) ENGINE=InnoDB;
CREATE TABLE users (
  id BIGINT NOT NULL COMMENT 'ID',
  review_id BIGINT NOT NULL COMMENT '关联',
  rating DECIMAL(10,2) COMMENT '评分',
  price DOUBLE COMMENT '金额用错类型',
  created_at DATETIME COMMENT '创建时间',
  updated_at DATETIME COMMENT '更新时间',
  is_deleted TINYINT COMMENT '删除',
  PRIMARY KEY (id),
  INDEX users_name (name),
  CONSTRAINT fk_users_review FOREIGN KEY (review_id) REFERENCES review (id)
) ENGINE=InnoDB;
`;

async function selfTest() {
  const { failures } = analyzeSchema(SELF_TEST_SQL);
  const problems = [];
  const expect = (fragment, label) => {
    if (!failures.some((item) => item.includes(fragment))) problems.push(`未检出：${label}`);
  };

  expect('表名不规范：review', '非复数表名');
  expect('rating', '评价字段');
  expect('DOUBLE', 'FLOAT/DOUBLE 金额');
  expect('COMMENT', '缺注释的字段（应报出）');
  expect('pk_', '未命名主键');
  expect('缺少必备列', '缺少必备列');
  expect('不使用外键约束', '外键约束应被拦截');

  console.log('=== 表结构校验自检 ===');
  if (problems.length) {
    for (const problem of problems) console.log(`  x ${problem}`);
    console.log('\n自检未通过：校验器可能形同虚设。');
    return 1;
  }
  console.log(`  通过：${failures.length} 类违规都能被检出`);
  return 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(await selfTest());
}

const root = path.resolve(process.env.HARNESS_ROOT || process.cwd());
const schemaPath = path.join(root, 'docx', 'database', 'schema.sql');

let sql;
try {
  sql = await readFile(schemaPath, 'utf8');
} catch {
  console.log(`\n失败（1）：未找到表结构文件 docx/database/schema.sql`);
  process.exit(1);
}

const { failures, notes } = analyzeSchema(sql);

console.log('=== 数据库表结构校验 ===');
console.log(`  规范来源：.codebuddy/skills/database-design/SKILL.md`);
for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.log(`\n失败（${failures.length}）：`);
  for (const failure of failures) console.log(`  x ${failure}`);
  console.log('\n表结构校验未通过。修改表结构后请同步更新 docx/database/数据库设计.md。');
  process.exit(1);
}

console.log('\n数据库表结构校验通过。');
