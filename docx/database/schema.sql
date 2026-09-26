-- =============================================================================
-- 成都景点地陪小程序 · 数据库表结构（MVP，10 张表）
--
-- 规范来源：.codebuddy/skills/database-design/SKILL.md
-- 统一约定：
--   * 引擎 InnoDB，字符集 utf8mb4，时区 UTC
--   * 表名：复数、小写、下划线（users / guide_attractions）
--   * 字段：小写、下划线、见名知意；每个字段带 COMMENT
--   * 索引命名：pk_表名 / uk_表名_字段名 / idx_表名_字段名
--   * 金额：DECIMAL(10,2)，禁止 FLOAT / DOUBLE
--   * 时间：DATETIME；状态：TINYINT 或 ENUM；布尔：TINYINT(0/1)
--   * 真正固定的枚举（角色、预约类型、订单状态、时段）用 ENUM
--   * 需要后台维护的维度（区域类型）用字典表，不用 ENUM
--
-- 【重要】现阶段不使用外键约束：
--   * 表之间只用 id 关联 + 索引，不加 FOREIGN KEY
--   * 完整性由应用层保证（写入前校验主体存在、订单快照冗余关键字段）
--   * 目的：避免分库分表/高并发场景受限，也避免本地开发与线上约束不一致
--   * scripts/check-schema.mjs 会拦截任何 FOREIGN KEY，防止被悄悄加回来
--
-- 字典与基础数据（区域 7 条、套餐 3 条、景点 20 条）见 docx/database/seed.sql
-- MVP 阶段全部走 mock（api/index.js 的 useMock = true），本文件是后端接入的蓝图
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. users 用户（游客 / 地陪 / 管理员共用一张账户表，用 role 区分）
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  openid VARCHAR(64) NOT NULL COMMENT '微信 openid（登录唯一标识）',
  nickname VARCHAR(50) NOT NULL DEFAULT '' COMMENT '昵称',
  avatar_url VARCHAR(500) NOT NULL DEFAULT '' COMMENT '头像URL（后端返回，前端不内置图片）',
  phone VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号（授权获取，可为空串）',
  role ENUM('tourist','guide','admin') NOT NULL DEFAULT 'tourist' COMMENT '角色：游客/地陪/管理员',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1 正常 0 禁用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0 否 1 是',
  CONSTRAINT pk_users PRIMARY KEY (id),
  UNIQUE INDEX uk_users_openid (openid),
  INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户';

-- -----------------------------------------------------------------------------
-- 2. region_types 区域类型字典（后台可维护：改名称/覆盖范围/排序/上下架都不动代码）
--    MVP 初始 7 类，见 seed.sql；前台只展示「启用且下有在售景点」的区域
-- -----------------------------------------------------------------------------
CREATE TABLE region_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '区域类型ID',
  code VARCHAR(32) NOT NULL COMMENT '编码：city-classic / panda-creative / suburb-daytrip / ancient-town / mountain-resort / night-city / family-study',
  name VARCHAR(50) NOT NULL COMMENT '区域名称（市区经典线 / 熊猫·文创线 ...）',
  coverage VARCHAR(200) NOT NULL DEFAULT '' COMMENT '覆盖范围描述（如 青羊、锦江、武侯、成华）',
  scene VARCHAR(50) NOT NULL DEFAULT '' COMMENT '适合场景（如 1-2 天市区游）',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1 启用 0 停用',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序，越小越前（对应首页标签顺序）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0 否 1 是',
  CONSTRAINT pk_region_types PRIMARY KEY (id),
  UNIQUE INDEX uk_region_types_code (code),
  INDEX idx_region_types_status_sort_order (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='区域类型字典（后台可维护）';

-- -----------------------------------------------------------------------------
-- 3. attractions 景点（MVP 固定 10 个）
-- -----------------------------------------------------------------------------
CREATE TABLE attractions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '景点ID',
  code VARCHAR(32) NOT NULL COMMENT '编码：att-kuanzhai / att-panda ...（mock 与接口用）',
  name VARCHAR(100) NOT NULL COMMENT '景点名称',
  district VARCHAR(50) NOT NULL DEFAULT '' COMMENT '所属行政区（青羊区 / 成华区 / 都江堰市 ...）',
  region_type_id BIGINT UNSIGNED NOT NULL COMMENT '所属区域类型ID（应用层保证存在且在售）',
  scene VARCHAR(50) NOT NULL DEFAULT '' COMMENT '场景短描述（经典打卡 / 亲子热门 / 一日游 ...）',
  cover_url VARCHAR(500) NOT NULL DEFAULT '' COMMENT '封面图URL（后端返回）',
  summary VARCHAR(200) NOT NULL DEFAULT '' COMMENT '一句话简介',
  guide_count INT NOT NULL DEFAULT 0 COMMENT '可约地陪数（冗余字段，用于列表卡片展示「N 位地陪可约」）',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1 上架 0 下架',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序，越小越前',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0 否 1 是',
  CONSTRAINT pk_attractions PRIMARY KEY (id),
  UNIQUE INDEX uk_attractions_code (code),
  INDEX idx_attractions_region_type_id_status (region_type_id, status, sort_order),
  INDEX idx_attractions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='景点（20 个）';

-- -----------------------------------------------------------------------------
-- 4. guides 地陪（与 users 一对一；MVP 由 mock 预置 50 个，申请开通属后续升级）
--    注意：不含任何评分/评价字段（dev-002）
-- -----------------------------------------------------------------------------
CREATE TABLE guides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '地陪ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '关联用户ID（应用层保证存在）',
  nickname VARCHAR(50) NOT NULL COMMENT '展示昵称（如 青羊 · 小林）',
  avatar_url VARCHAR(500) NOT NULL DEFAULT '' COMMENT '头像URL（后端返回）',
  introduce VARCHAR(500) NOT NULL DEFAULT '' COMMENT '个人介绍',
  order_count INT NOT NULL DEFAULT 0 COMMENT '累计接单量（列表展示）',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态：0 待审核 1 已通过 2 已拒绝',
  audited_by BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人用户ID',
  audited_at DATETIME DEFAULT NULL COMMENT '审核时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0 否 1 是',
  CONSTRAINT pk_guides PRIMARY KEY (id),
  UNIQUE INDEX uk_guides_user_id (user_id),
  INDEX idx_guides_status_order_count (status, order_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地陪（向导）';

-- -----------------------------------------------------------------------------
-- 5. guide_region_types 地陪擅长区域（每人 1-3 个）
-- -----------------------------------------------------------------------------
CREATE TABLE guide_region_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  guide_id BIGINT UNSIGNED NOT NULL COMMENT '地陪ID（应用层保证存在）',
  region_type_id BIGINT UNSIGNED NOT NULL COMMENT '区域类型ID（应用层保证存在）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT pk_guide_region_types PRIMARY KEY (id),
  UNIQUE INDEX uk_guide_region_types_guide_region (guide_id, region_type_id),
  INDEX idx_guide_region_types_region_type_id (region_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地陪擅长区域';

-- -----------------------------------------------------------------------------
-- 6. guide_attractions 地陪擅长景点（决定「先选景点 → 再选地陪」的匹配关系）
-- -----------------------------------------------------------------------------
CREATE TABLE guide_attractions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  guide_id BIGINT UNSIGNED NOT NULL COMMENT '地陪ID（应用层保证存在）',
  attraction_id BIGINT UNSIGNED NOT NULL COMMENT '景点ID（应用层保证存在）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT pk_guide_attractions PRIMARY KEY (id),
  UNIQUE INDEX uk_guide_attractions_guide_attraction (guide_id, attraction_id),
  INDEX idx_guide_attractions_attraction_id (attraction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地陪擅长景点';

-- -----------------------------------------------------------------------------
-- 7. package_skus 套餐 SKU（MVP 固定 3 个；booking_type 决定下单页的预约类型）
-- -----------------------------------------------------------------------------
CREATE TABLE package_skus (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '套餐ID',
  code VARCHAR(32) NOT NULL COMMENT '编码：pkg-halfday-city / pkg-fullday-city / pkg-special',
  name VARCHAR(50) NOT NULL COMMENT '套餐名称（市区半日陪游 / 市区全天陪游 / 熊猫基地·都江堰专项）',
  booking_type ENUM('half-day','full-day','hourly') NOT NULL COMMENT '预约类型：半天/全天/小时加购',
  duration_desc VARCHAR(50) NOT NULL DEFAULT '' COMMENT '时长描述（如 4-5 小时）',
  price_min DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '建议价下限（元）',
  price_max DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '建议价上限（元）',
  description VARCHAR(200) NOT NULL DEFAULT '' COMMENT '套餐说明',
  includes_note VARCHAR(200) NOT NULL DEFAULT '门票、餐饮、交通不含' COMMENT '费用包含说明',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1 启用 0 停用',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序，越小越前',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0 否 1 是',
  CONSTRAINT pk_package_skus PRIMARY KEY (id),
  UNIQUE INDEX uk_package_skus_code (code),
  INDEX idx_package_skus_status_sort_order (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='套餐 SKU（3 个）';

-- -----------------------------------------------------------------------------
-- 8. guide_packages 地陪报价（地陪 × 套餐，价格由地陪设置）
-- -----------------------------------------------------------------------------
CREATE TABLE guide_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  guide_id BIGINT UNSIGNED NOT NULL COMMENT '地陪ID（应用层保证存在）',
  package_sku_id BIGINT UNSIGNED NOT NULL COMMENT '套餐ID（应用层保证存在）',
  price DECIMAL(10,2) NOT NULL COMMENT '该地陪对外的套餐报价（元）',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否可售：1 是 0 否',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  CONSTRAINT pk_guide_packages PRIMARY KEY (id),
  UNIQUE INDEX uk_guide_packages_guide_sku (guide_id, package_sku_id),
  INDEX idx_guide_packages_package_sku_id (package_sku_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地陪套餐报价';

-- -----------------------------------------------------------------------------
-- 9. guide_available_dates 可约档期（一行 = 某地陪某天可接某一种类型）
-- -----------------------------------------------------------------------------
CREATE TABLE guide_available_dates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  guide_id BIGINT UNSIGNED NOT NULL COMMENT '地陪ID（应用层保证存在）',
  appoint_date DATE NOT NULL COMMENT '可约日期',
  booking_type ENUM('half-day','full-day','hourly') NOT NULL COMMENT '可接的预约类型',
  is_available TINYINT NOT NULL DEFAULT 1 COMMENT '是否可约：1 是 0 否（已占用时置 0）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  CONSTRAINT pk_guide_available_dates PRIMARY KEY (id),
  UNIQUE INDEX uk_guide_available_dates_guide_date_type (guide_id, appoint_date, booking_type),
  INDEX idx_guide_available_dates_appoint_date (appoint_date, booking_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地陪可约档期';

-- -----------------------------------------------------------------------------
-- 10. orders 订单（四态：0 待确认 / 1 已确认 / 2 已完成 / 3 已取消）
--
--    订单号 order_no 规则（详见 docx/database/数据库设计.md）：
--      CD + YYMMDD + 业务类型(A 半天 / B 全天 / C 专项·小时) + 4 位当日序号 = 13 位
--      例：CD260926A0001
--      生成方式：当日同类型取 MAX(序号) + 1，冲突由 uk_orders_order_no 兜底重试
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  order_no CHAR(13) NOT NULL COMMENT '订单号：CD+YYMMDD+类型(A/B/C)+4位序号，如 CD260926A0001',
  tourist_user_id BIGINT UNSIGNED NOT NULL COMMENT '游客用户ID（应用层保证存在）',
  guide_id BIGINT UNSIGNED NOT NULL COMMENT '地陪ID（应用层保证存在）',
  attraction_id BIGINT UNSIGNED NOT NULL COMMENT '景点ID（应用层保证存在）',
  package_sku_id BIGINT UNSIGNED NOT NULL COMMENT '套餐ID（应用层保证存在）',
  booking_type ENUM('half-day','full-day','hourly') NOT NULL COMMENT '预约类型（与套餐的 booking_type 一致）',
  appoint_date DATE NOT NULL COMMENT '预约日期',
  time_slot ENUM('morning','afternoon','none') NOT NULL DEFAULT 'none' COMMENT '时段：上午/下午；全天与小时加购为 none',
  hours TINYINT NOT NULL DEFAULT 0 COMMENT '小时数（仅 hourly 使用，1 小时为单位）',
  people_count TINYINT NOT NULL DEFAULT 1 COMMENT '人数',
  remark VARCHAR(500) NOT NULL DEFAULT '' COMMENT '游客备注',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单金额（元）',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0 待确认 1 已确认 2 已完成 3 已取消',
  attraction_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '冗余：景点名称（下单时快照）',
  package_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '冗余：套餐名称（下单时快照）',
  guide_nickname VARCHAR(50) NOT NULL DEFAULT '' COMMENT '冗余：地陪昵称（下单时快照）',
  guide_avatar_url VARCHAR(500) NOT NULL DEFAULT '' COMMENT '冗余：地陪头像URL（下单时快照）',
  confirmed_by BIGINT UNSIGNED DEFAULT NULL COMMENT '平台确认人用户ID（人工确认档期）',
  confirmed_at DATETIME DEFAULT NULL COMMENT '平台确认时间',
  finished_at DATETIME DEFAULT NULL COMMENT '完成时间',
  cancelled_at DATETIME DEFAULT NULL COMMENT '取消时间',
  cancel_reason VARCHAR(200) NOT NULL DEFAULT '' COMMENT '取消原因',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0 否 1 是',
  CONSTRAINT pk_orders PRIMARY KEY (id),
  UNIQUE INDEX uk_orders_order_no (order_no),
  INDEX idx_orders_tourist_user_id_status (tourist_user_id, status, created_at),
  INDEX idx_orders_guide_id_status (guide_id, status),
  INDEX idx_orders_status_appoint_date (status, appoint_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单（四态）';

-- =============================================================================
-- MVP 阶段不建的表
--
-- A. 业务上明确不做（见 docs/mvp-scope.json 的 outOfScope，不要补）
--      reviews / guide_ratings  评价与评分（dev-002）
--      favorites                收藏
--      wallets                  余额与自动结算
--      coupons                  优惠券
--      messages / chats         IM 聊天
--      guide_applications       地陪申请开通（后续升级）
--      distributors             分销/代理
--
-- B. 本轮精简掉的表（功能可被替代，后续需要再加回）
--      order_status_logs        状态流转日志（MVP 只写不读）→ 用 orders 的
--                               status / confirmed_at / finished_at / cancelled_at / cancel_reason 表达
--
-- 注：region_types 曾按"固定 3 类枚举"被精简掉，现已按用户决策
--     （区域要做成后台可维护的数据）加回为字典表，初始 7 类见 seed.sql。
-- =============================================================================
