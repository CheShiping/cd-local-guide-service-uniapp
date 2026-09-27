-- =============================================================================
-- 成都景点地陪小程序 · 初始化数据（后台可维护的字典与基础数据）
--
-- 用途：后端初始化 / 本地联调 / mock 数据的对齐基准
-- 范围：只放"字典与基础数据" —— 区域类型(7)、套餐 SKU(3)、景点(20)
--       地陪(50)、用户、订单属于业务数据，由 mock 生成或后台录入，不在这里
--
-- 特性：可重复执行（INSERT ... ON DUPLICATE KEY UPDATE），不会产生重复行
-- 注意：不使用外键，关系靠显式 id 对齐；显式写 id 是为了让 mock 与后端一致
--       cover_url 暂用网络占位图（与 design/html/prototype.html 一致），
--       上线前替换为真实素材或后台上传的 URL（见 docs/mvp-scope.json 的 imageStrategy）
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. 区域类型字典（7 类，后台可维护：改名称/覆盖范围/排序/上下架都不需要动代码）
--    前 3 类是 MVP 原文的划分，后 4 类为本次新增
-- -----------------------------------------------------------------------------
INSERT INTO region_types (id, code, name, coverage, scene, status, sort_order) VALUES
  (1, 'city-classic',    '市区经典线',   '青羊、锦江、武侯、成华',                 '1-2 天市区游',      1, 10),
  (2, 'panda-creative',  '熊猫·文创线',  '熊猫基地、东郊记忆、建设路',             '年轻人 / 亲子',     1, 20),
  (3, 'suburb-daytrip',  '周边一日游',   '都江堰、青城山、安仁、黄龙溪',           '全天行程',          1, 30),
  (4, 'ancient-town',    '川西古镇线',   '黄龙溪、街子古镇、洛带、安仁',           '古镇慢游 / 拍照',   1, 40),
  (5, 'mountain-resort', '山野度假线',   '青城山、西岭雪山、龙泉山',               '避暑 / 徒步 / 滑雪', 1, 50),
  (6, 'night-city',      '都市夜游线',   '锦里、太古里、九眼桥、夜游锦江',         '夜拍 / 夜宵',       1, 60),
  (7, 'family-study',    '亲子研学线',   '成都博物馆、金沙遗址、四川科技馆',       '带娃 / 研学',       1, 70)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), coverage = VALUES(coverage), scene = VALUES(scene),
  sort_order = VALUES(sort_order);

-- -----------------------------------------------------------------------------
-- 2. 套餐 SKU（固定 3 个；booking_type 决定下单页控件）
-- -----------------------------------------------------------------------------
INSERT INTO package_skus (id, code, name, booking_type, duration_desc, price_min, price_max, description, includes_note, status, sort_order) VALUES
  (1, 'pkg-halfday-city', '市区半日陪游',               'half-day', '4-5 小时',  200.00, 400.00, '适合单区域，市区打卡',         '门票、餐饮、交通不含', 1, 10),
  (2, 'pkg-fullday-city', '市区全天陪游',               'full-day', '8-10 小时', 500.00, 800.00, '市区 + 周边，一天走透',       '门票、餐饮、交通不含', 1, 20),
  (3, 'pkg-special',      '熊猫基地 / 都江堰专项陪游',  'hourly',   '按小时',    150.00, 300.00, '按小时计，含讲解与带吃',       '门票、餐饮、交通不含', 1, 30)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), booking_type = VALUES(booking_type), duration_desc = VALUES(duration_desc),
  price_min = VALUES(price_min), price_max = VALUES(price_max),
  description = VALUES(description), sort_order = VALUES(sort_order);

-- -----------------------------------------------------------------------------
-- 3. 景点（20 个）
--    每个景点归属唯一的区域类型（region_type_id），与 mock 数据保持一致
--    7 类区域全部有景点（山野度假线由青城山 / 西岭雪山 / 龙泉山激活）
-- -----------------------------------------------------------------------------
INSERT INTO attractions (id, code, name, district, region_type_id, scene, cover_url, summary, guide_count, status, sort_order) VALUES
  (1,  'att-kuanzhai',     '宽窄巷子',           '青羊区',   1, '经典打卡',   'https://picsum.photos/seed/chengdu-kuanzhai/600/400',   '成都市区最经典的巷子，适合慢逛与拍照', 0, 1, 10),
  (2,  'att-dufu',         '杜甫草堂',           '青羊区',   7, '文化研学',   'https://picsum.photos/seed/chengdu-dufu/600/400',       '诗圣故居，适合带孩子做文化研学',       0, 1, 20),
  (3,  'att-wuhou',        '武侯祠',             '武侯区',   1, '三国文化',   'https://picsum.photos/seed/chengdu-wuhou/600/400',      '三国文化地标，讲解型地陪需求高',       0, 1, 30),
  (4,  'att-jinli',        '锦里',               '武侯区',   6, '夜游/拍照',  'https://picsum.photos/seed/chengdu-jinli/600/400',      '夜景与小吃街，夜游拍照首选',           0, 1, 40),
  (5,  'att-panda',        '大熊猫基地',         '成华区',   2, '亲子热门',   'https://picsum.photos/seed/chengdu-panda/600/400',      '高需求热门景点，建议早场入园',         0, 1, 50),
  (6,  'att-taikooli',     '春熙路/太古里',       '锦江区',   6, '城市逛街',   'https://picsum.photos/seed/chengdu-taikooli/600/400',   '城市中心商圈，白天逛街夜晚出片',       0, 1, 60),
  (7,  'att-peoples-park', '人民公园/鹤鸣茶社',   '锦江区',   1, '成都慢生活', 'https://picsum.photos/seed/chengdu-peoples-park/600/400', '体验盖碗茶与本地慢生活',             0, 1, 70),
  (8,  'att-dongjiao',     '东郊记忆',           '成华区',   2, '年轻游客',   'https://picsum.photos/seed/chengdu-dongjiao/600/400',   '工业风文创园区，年轻游客与拍照',       0, 1, 80),
  (9,  'att-dujiangyan',   '都江堰',             '都江堰市', 3, '一日游',     'https://picsum.photos/seed/chengdu-dujiangyan/600/400', '世界文化遗产，适合安排全天行程',       0, 1, 90),
  (10, 'att-anren',        '安仁古镇',           '大邑县',   4, '周边古镇',   'https://picsum.photos/seed/chengdu-anren/600/400',      '民国风情古镇，周边一日游',             0, 1, 100),
  (11, 'att-qingcheng',    '青城山',             '都江堰市', 5, '避暑/登山',  'https://picsum.photos/seed/chengdu-qingcheng/600/400',  '道教名山，避暑与徒步，需全天行程',     0, 1, 110),
  (12, 'att-xiling',       '西岭雪山',           '大邑县',   5, '滑雪/赏雪',  'https://picsum.photos/seed/chengdu-xiling/600/400',     '冬季滑雪与云海，周边两日游优选',       0, 1, 120),
  (13, 'att-longquan-hill', '龙泉山城市森林公园', '龙泉驿区', 5, '观景/落日', 'https://picsum.photos/seed/chengdu-longquan-hill/600/400', '城市观景平台，看落日与夜景', 0, 1, 130),
  (14, 'att-huanglongxi',  '黄龙溪古镇',         '双流区',   4, '古镇玩水',   'https://picsum.photos/seed/chengdu-huanglongxi/600/400','千年古镇，夏季玩水与小吃',             0, 1, 140),
  (15, 'att-jiezi',        '街子古镇',           '崇州市',   4, '古镇清幽',   'https://picsum.photos/seed/chengdu-jiezi/600/400',      '街子古镇，清幽好逛，可与青城山连游',   0, 1, 150),
  (16, 'att-luodai',       '洛带古镇',           '龙泉驿区', 4, '客家文化',   'https://picsum.photos/seed/chengdu-luodai/600/400',     '客家文化古镇，适合半日游',             0, 1, 160),
  (17, 'att-museum',       '成都博物馆',         '青羊区',   7, '历史研学',   'https://picsum.photos/seed/chengdu-museum/600/400',     '天府广场旁，系统了解成都历史',         0, 1, 170),
  (18, 'att-jinsha',       '金沙遗址博物馆',     '青羊区',   7, '考古研学',   'https://picsum.photos/seed/chengdu-jinsha/600/400',     '太阳神鸟出土地，考古主题研学',         0, 1, 180),
  (19, 'att-science',      '四川科技馆',         '青羊区',   7, '亲子互动',   'https://picsum.photos/seed/chengdu-science/600/400',    '亲子互动体验，适合带小孩',             0, 1, 190),
  (20, 'att-night-river', '夜游锦江（东门码头）', '锦江区', 6, '夜游/船游', 'https://picsum.photos/seed/chengdu-night-river/600/400', '乘船夜游锦江，看两岸灯光', 0, 1, 200)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), district = VALUES(district), region_type_id = VALUES(region_type_id),
  scene = VALUES(scene), cover_url = VALUES(cover_url), summary = VALUES(summary),
  status = VALUES(status), sort_order = VALUES(sort_order);

-- 景点卡片要显示「N 位地陪可约」，该冗余字段由地陪审核通过 / 解绑景点时维护，
-- 初始化后可用下面的语句按实际关系重算（guides 数据就绪后再执行）：
--   UPDATE attractions a
--     SET guide_count = (SELECT COUNT(*) FROM guide_attractions ga WHERE ga.attraction_id = a.id);
