/* ==========================================================================
   成都景点地陪小程序 · 视觉改版定稿（气泡漫游）
   结构：数据 → 组件 → 七个界面 → 视图层（单机流程 / 七机全览）→ 导航 → 轻交互
   界面切换走 shadcn 动效：push 右进 / pop 左进 / tab 原地淡入，退场 100ms 只淡出。
   没有框架、没有依赖、没有构建。
   ========================================================================== */
(function () {
  'use strict';

  var AVA = '../static/guide/';                 // 地陪与游客头像：本地实拍图
  var COVER = 'https://picsum.photos/seed/';    // 景点封面：随机图占位，后端接通后换 coverUrl

  function ico(n, cls) {
    return '<svg class="' + (cls || 'ico') + '" aria-hidden="true" focusable="false"><use href="#i-' + n + '"></use></svg>';
  }
  function cover(s) { return COVER + 'dm-' + s.slug + '/320/320'; }

  /* ---------------- 内容 ---------------- */
  var SPOTS = [
    { slug: 'kuanzhai',   name: '宽窄巷子',   area: '青羊区',   tag: '经典打卡', score: '4.8', guides: 3, art: 'temple'  },
    { slug: 'panda',      name: '大熊猫基地', area: '成华区',   tag: '亲子热门', score: '4.9', guides: 5, art: 'panda'   },
    { slug: 'dujiangyan', name: '都江堰',     area: '都江堰市', tag: '一日游',   score: '4.7', guides: 2, art: 'water'   },
    { slug: 'dufu',       name: '杜甫草堂',   area: '青羊区',   tag: '文化讲解', score: '4.6', guides: 2, art: 'leaf'    },
    { slug: 'wuhou',      name: '武侯祠',     area: '武侯区',   tag: '三国文化', score: '4.7', guides: 4, art: 'pagoda'  },
    { slug: 'jinli',      name: '锦里古街',   area: '武侯区',   tag: '夜游美食', score: '4.5', guides: 3, art: 'lantern' }
  ];

  var GUIDES = [
    { name: '青羊 · 小林', photo: 'qinxiaolin.jpg', focus: '50% 24%', orders: 128,
      tags: ['市区经典线', '熊猫·文创线'], service: '半天陪游 · 全天陪游', price: 300, unit: '起 / 半日' },
    { name: '青羊 · 苏姐', photo: 'sunanshan.jpg',  focus: '50% 20%', orders: 96,
      tags: ['市区经典线', '文化讲解'],     service: '半天陪游 · 专项讲解', price: 260, unit: '起 / 半日' },
    { name: '锦江 · 陈默', photo: 'caoyiming.jpg',  focus: '50% 18%', orders: 214,
      tags: ['熊猫·文创线', '周边一日游'],  service: '全天陪游 · 熊猫基地专项', price: 600, unit: '起 / 全天' }
  ];

  var GUESTS = {
    zhou: { name: '小舟', photo: 'caozhuoyan.png', focus: '50% 24%' },
    man:  { name: '阿满', photo: 'hetingyu.jpg',   focus: '50% 26%' }
  };

  var PACKAGES = [
    { t: '市区半日陪游', d: '4-5 小时 · 适合单区域',        p: 300, u: '/ 半日', on: true  },
    { t: '市区全天陪游', d: '8-10 小时 · 市区 + 周边',      p: 600, u: '/ 全天', on: false },
    { t: '熊猫基地 / 都江堰专项', d: '按小时 · 含讲解、带吃', p: 220, u: '/ 小时', on: false }
  ];

  var DATES = [
    { d: '今天', n: '09-26', s: '余 2 位', on: true  },
    { d: '周日', n: '09-27', s: '可约',    on: false },
    { d: '周一', n: '09-28', s: '可约',    on: false },
    { d: '周二', n: '09-29', s: '可约',    on: false },
    { d: '周三', n: '09-30', s: '可约',    on: false }
  ];

  var ORDERS = [
    { guest: GUESTS.zhou, title: '宽窄巷子 · 市区半日陪游', no: '#26092701',
      state: 'pending', stateText: '待确认', price: 300,
      kv: [['时间', '09-27 上午 · 2 人'], ['地陪', '青羊 · 小林'], ['备注', '想拍汉服照，避开人流']],
      act: { kind: 'danger', text: '取消预约' } },
    { guest: GUESTS.man, title: '大熊猫基地 · 市区全天陪游', no: '#26092804',
      state: 'confirmed', stateText: '已确认', price: 600,
      kv: [['时间', '10-02 全天 · 3 人'], ['地陪', '锦江 · 陈默'], ['集合', '春熙路地铁 A 口']],
      act: { kind: 'out', text: '取消预约' } }
  ];

  var INBOX = [
    { guest: { name: '游客 小舟', photo: 'caozhuoyan.png', focus: '50% 24%' },
      title: '宽窄巷子 · 半日（上午）', no: '#26092701', state: 'pending', stateText: '待接单', price: 300,
      kv: [['时间', '09-27 上午 · 2 人'], ['备注', '想拍汉服照，避开人流']],
      acts: [{ kind: 'out', text: '拒单' }, { kind: 'fill', text: '接单' }] },
    { guest: { name: '游客 阿满', photo: 'hetingyu.jpg', focus: '50% 26%' },
      title: '大熊猫基地 · 全天', no: '#26092804', state: 'confirmed', stateText: '已确认', price: 600,
      kv: [['时间', '10-02 全天 · 3 人'], ['集合', '待与游客确认']],
      acts: [{ kind: 'soft', text: '完成服务' }] }
  ];

  var ADMIN = [
    { guest: { name: '小舟', photo: 'caozhuoyan.png', focus: '50% 24%' },
      title: '宽窄巷子 · 半日', no: '#26092701 · 游客 小舟', state: 'pending', stateText: '待确认', price: 300,
      kv: [['地陪', '青羊 · 小林'], ['时间', '09-27 上午 · 2 人']],
      acts: [{ kind: 'fill', text: '确认档期' }] },
    { guest: { name: '阿满', photo: 'hetingyu.jpg', focus: '50% 26%' },
      title: '大熊猫基地 · 全天', no: '#26092804 · 游客 阿满', state: 'confirmed', stateText: '已确认', price: 600,
      kv: [['地陪', '锦江 · 陈默'], ['时间', '10-02 全天 · 3 人']],
      acts: [{ kind: 'danger', text: '处理取消' }] }
  ];

  /* ---------------- 组件 ---------------- */
  function navbar(left, title, right) {
    return '<header class="navbar">' + left + '<h2 class="navbar__title">' + title + '</h2>' + right + '</header>';
  }
  var navBack = '<button class="icon-btn" type="button" data-back="1" aria-label="返回">' + ico('back') + '</button>';
  var navGhost = '<span class="icon-btn icon-btn--ghost"></span>';
  var navFilter = '<button class="icon-btn" type="button" aria-label="筛选">' + ico('sliders') + '</button>';
  var navShare = '<button class="icon-btn" type="button" aria-label="分享">' + ico('share') + '</button>';

  /* 底部标签栏：每项带 data-go，点击即在屏间切换（tab 语义，原地淡入） */
  var TABS_USER  = [{ icon: 'home', text: '首页', go: 0 }, { icon: 'user', text: '我的', go: 4 }];
  var TABS_GUIDE = [{ icon: 'list', text: '接单', go: 5 }, { icon: 'user', text: '我的', go: 4 }];
  var TABS_ADMIN = [{ icon: 'list', text: '订单', go: 6 }, { icon: 'user', text: '我的', go: 4 }];

  function tabbar(items, active) {
    return '<nav class="tabbar">' + items.map(function (it, i) {
      return '<a class="tab' + (i === active ? ' is-on' : '') + '" href="javascript:void(0)" data-go="' + it.go +
             '" data-dir="tab"><span class="tab__b">' + ico(it.icon) + '</span><span>' + it.text + '</span></a>';
    }).join('') + '</nav>';
  }

  function tag(text, mod, icon) {
    return '<span class="tag' + (mod ? ' ' + mod : '') + '">' + (icon ? ico(icon) : '') + text + '</span>';
  }
  function avatar(g, mod) {
    return '<span class="avatar' + (mod ? ' ' + mod : '') + '"><img src="' + AVA + g.photo + '" alt="' + g.name +
      '的头像" style="--focus:' + (g.focus || '50% 26%') + '" loading="lazy" onerror="this.remove()"></span>';
  }
  function btn(kind, text, icon, size, go) {
    var cls = 'btn' + (kind && kind !== 'fill' ? ' btn--' + kind : '') + (size ? ' btn--' + size : '');
    return '<button class="' + cls + '" type="button"' + (go !== undefined ? ' data-go="' + go + '"' : '') + '>' +
           (icon ? ico(icon) : '') + text + '</button>';
  }
  function price(v, cls) {
    return '<span class="price' + (cls ? ' ' + cls : '') + '"><i>¥</i>' + v + '</span>';
  }
  function kvIcon(k) {
    return { '时间': 'clock', '地陪': 'users', '备注': 'note', '集合': 'pin' }[k] || 'info';
  }
  /* 标题换行控制：套餐部分锁成不可拆，避免出现「市 / 区」这种难看断行 */
  function titleHtml(t) {
    var i = t.indexOf(' · ');
    if (i < 0) return t;
    return t.slice(0, i + 3) + '<span style="white-space:nowrap">' + t.slice(i + 3) + '</span>';
  }

  function spotCard(s, miniAvatars, go) {
    return '<article class="card acard" data-go="' + go + '" data-dir="push" role="button" tabindex="0">' +
      '<div class="acard__media">' +
        '<span class="acard__ph">' + ico(s.art) + '</span>' +
        '<img src="' + cover(s) + '" alt="' + s.name + '封面" loading="lazy" onerror="this.remove()">' +
        '<span class="acard__cc">' + ico('pin') + s.tag + '</span>' +
      '</div>' +
      '<div class="acard__body">' +
        '<div class="acard__top"><h3 class="acard__name">' + s.name + '</h3>' +
          '<span class="acard__score">' + ico('star') + s.score + '</span></div>' +
        '<p class="acard__meta">' + ico('pin') + s.area + ' · 距你 3.2km</p>' +
        '<div class="acard__foot">' +
          '<span class="acard__guides">' + ico('users') + s.guides + ' 位地陪可约</span>' +
          '<span class="acard__avatars">' + miniAvatars.map(function (g) {
            return '<img src="' + AVA + g.photo + '" alt="" style="--focus:' + g.focus + '" loading="lazy" onerror="this.remove()">';
          }).join('') + '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function guideCard(g, go) {
    return '<article class="card gcard" data-go="' + go + '" data-dir="push" role="button" tabindex="0">' + avatar(g) +
      '<div>' +
        '<div class="gcard__top"><h3 class="gcard__name">' + g.name + '</h3>' +
          '<span class="gcard__stat">接单 ' + g.orders + ' 单</span></div>' +
        '<div class="tag-row">' + g.tags.map(function (t) { return tag(t); }).join('') + '</div>' +
        '<p class="gcard__svc">' + g.service + '</p>' +
        '<div class="gcard__foot">' +
          '<span class="gcard__price">' + price(g.price, 'price--sm') +
            '<span class="gcard__stat">' + g.unit + '</span></span>' +
          btn('soft', '看详情', null, 'sm', go) +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function orderCard(o) {
    return '<article class="card ocard">' +
      '<div class="ocard__hd">' + avatar(o.guest, 'avatar--sm') +
        '<div style="flex:1;min-width:0"><h3 class="ocard__t">' + titleHtml(o.title) + '</h3>' +
        '<span class="ocard__no">' + o.no + '</span></div>' +
        '<span class="tag tag--state tag--' + o.state + '">' + o.stateText + '</span>' +
      '</div>' +
      '<dl class="ocard__kv">' + o.kv.map(function (kv) {
        return '<div class="kv"><dt>' + ico(kvIcon(kv[0])) + kv[0] + '</dt><dd>' + kv[1] + '</dd></div>';
      }).join('') + '</dl>' +
      '<div class="ocard__ft">' + price(o.price, 'price--sm') +
        '<div class="ocard__acts">' + (o.acts || [o.act]).map(function (a) {
          return btn(a.kind, a.text, null, 'sm');
        }).join('') + '</div>' +
      '</div>' +
    '</article>';
  }

  function tabs(list, activeIndex) {
    return '<nav class="tabline">' + list.map(function (t, i) {
      return '<button class="tabline__item' + (i === activeIndex ? ' is-on' : '') + '" type="button">' + t + '</button>';
    }).join('') + '</nav>';
  }

  /* ---------------- 七个界面 ---------------- */
  function sHome() {
    var quick = [
      { icon: 'panda',   t: '熊猫基地' },
      { icon: 'map',     t: '一日游' },
      { icon: 'lantern', t: '夜游锦里' },
      { icon: 'tea',     t: '盖碗茶' }
    ];
    return '<header class="head">' +
        '<p class="head__kick">' + ico('spark') + '成都 · 地陪预约</p>' +
        '<h2 class="head__title">今天去哪儿</h2>' +
        '<p class="head__sub">10 个景点 · 本地地陪带路，先选地方再挑人</p>' +
      '</header>' +
      '<div class="searchbar">' + ico('search', 'ico searchbar__ico') +
        '<span class="searchbar__text">搜景点、地陪、路线</span>' +
        '<span class="searchbar__btn">' + ico('sliders') + '</span></div>' +
      '<div class="quick">' + quick.map(function (q) {
        return '<button class="quick__item" type="button"><span class="quick__ico">' + ico(q.icon) +
          '</span><span>' + q.t + '</span></button>';
      }).join('') + '</div>' +
      tabs(['全部', '市区经典线', '熊猫·文创线', '周边一日游'], 0) +
      '<div class="section-hd"><h3 class="section-hd__t">' + ico('fire') + '附近热门</h3>' +
        '<span class="section-hd__n">6 个景点</span></div>' +
      '<div class="list">' + SPOTS.map(function (s, i) {
        return spotCard(s, [GUIDES[i % 3], GUIDES[(i + 1) % 3]], 1);
      }).join('') + '</div>' +
      tabbar(TABS_USER, 0);
  }

  function sGuides() {
    return navbar(navBack, '宽窄巷子的地陪', navFilter) +
      '<p class="hint">' + ico('pin') + '青羊区 · 3 位可约 · 半天约 4-5 小时</p>' +
      '<div class="chip-row" style="padding-top:14px">' +
        ['半日', '全天', '专项'].map(function (t, i) {
          return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" type="button">' + t + '</button>';
        }).join('') +
        '<button class="chip chip--lead" type="button">' + ico('sliders') + '价格从低到高</button>' +
      '</div>' +
      '<div class="list">' + GUIDES.map(function (g) { return guideCard(g, 2); }).join('') + '</div>' +
      tabbar(TABS_USER, 0);
  }

  function sGuideDetail() {
    var g = GUIDES[0];
    return navbar(navBack, '地陪详情', navShare) +
      '<section class="panel">' +
        '<div class="hero">' + avatar(g, 'avatar--lg') +
          '<div><h3 class="hero__name">' + g.name + '</h3>' +
          '<div class="hero__badges">' + tag('市区经典线', 'tag--solid') + tag('熊猫·文创线') + '</div></div>' +
        '</div>' +
        '<p class="hero__bio">在宽窄巷子长大，做地陪四年，喜欢带人从巷子后段绕开人流，顺路喝一盏盖碗茶。</p>' +
        '<div class="metrics">' +
          '<span class="metric"><span class="metric__v">128</span><span class="metric__l">接单</span></span>' +
          '<span class="metric"><span class="metric__v">4 天</span><span class="metric__l">本周可约</span></span>' +
          '<span class="metric"><span class="metric__v">3 个</span><span class="metric__l">服务套餐</span></span>' +
        '</div>' +
      '</section>' +
      '<section class="panel">' +
        '<h3 class="panel__title">' + ico('pin') + '擅长景点</h3>' +
        '<div class="tag-row">' +
          ['宽窄巷子', '人民公园', '杜甫草堂', '青羊宫'].map(function (t) { return tag(t, 'tag--ghost'); }).join('') +
        '</div>' +
      '</section>' +
      '<section class="panel panel--flush">' +
        '<h3 class="panel__title">' + ico('ticket') + '服务套餐</h3>' +
        PACKAGES.map(function (p) {
          return '<button class="option' + (p.on ? ' is-on' : '') + '" type="button">' +
            '<span class="radio">' + ico('check') + '</span>' +
            '<span><span class="option__t">' + p.t + '</span><span class="option__d">' + p.d + '</span></span>' +
            '<span class="option__p">¥' + p.p + '<small>' + p.u + '</small></span></button>';
        }).join('') +
      '</section>' +
      '<section class="panel">' +
        '<h3 class="panel__title">' + ico('calendar') + '可约日期</h3>' +
        '<div class="dates">' + DATES.map(function (d) {
          return '<button class="date' + (d.on ? ' is-on' : '') + '" type="button">' +
            '<span class="date__d">' + d.d + '</span><span class="date__n">' + d.n + '</span>' +
            '<span class="date__s">' + d.s + '</span></button>';
        }).join('') + '</div>' +
      '</section>' +
      '<div class="bottom-bar">' +
        '<div class="price-block"><span class="price-block__l">合计 · 市区半日陪游</span>' + price(300) + '</div>' +
        btn('fill', '立即预约', 'calendar', null, 3) +
      '</div>';
  }

  function sBooking() {
    return navbar(navBack, '确认预约', navGhost) +
      '<section class="panel panel--flush">' +
        '<div class="frow"><span class="frow__l">' + ico('pin') + '景点</span>' +
          '<span class="frow__v">宽窄巷子<small>青羊区 · 可更换</small></span></div>' +
        '<div class="frow"><span class="frow__l">' + ico('users') + '地陪</span>' +
          '<span class="frow__v">青羊 · 小林<small>接单 128 单</small></span></div>' +
        '<div class="frow"><span class="frow__l">' + ico('ticket') + '套餐</span>' +
          '<span class="frow__v">市区半日陪游<small>4-5 小时</small></span></div>' +
      '</section>' +
      '<section class="panel panel--flush">' +
        '<div class="fstack"><label class="flabel">预约日期</label>' +
          '<div class="frow" style="min-height:0;padding:0;border:none">' +
            '<span class="frow__v" style="text-align:left">2026-09-27 周日</span>' +
            '<span class="acard__go">' + ico('calendar') + '</span></div></div>' +
        '<div class="fstack"><label class="flabel">时段</label>' +
          '<div class="seg"><button class="seg__item is-on" type="button">上午</button>' +
          '<button class="seg__item" type="button">下午</button></div></div>' +
        '<div class="frow"><span class="frow__l">' + ico('users') + '人数</span>' +
          '<span class="stepper"><button class="stepper__btn" type="button">' + ico('minus') + '</button>' +
          '<span class="stepper__n">2</span>' +
          '<button class="stepper__btn" type="button">' + ico('plus') + '</button></span></div>' +
        '<div class="fstack"><label class="flabel">备注</label>' +
          '<textarea class="ta" rows="3">想在巷子里拍些照片，麻烦帮我们避开人流</textarea></div>' +
      '</section>' +
      '<p class="hint">' + ico('info') + '门票、餐饮、交通不含；超时按 1 小时加购，线下协商或由平台备注</p>' +
      '<div class="bottom-bar">' +
        '<div class="price-block"><span class="price-block__l">合计</span>' + price(300) + '</div>' +
        btn('fill', '提交预约', 'shield', null, 4) +
      '</div>';
  }

  function sOrders() {
    return navbar(navBack, '我的订单', navGhost) +
      tabs(['待确认', '已确认', '已完成', '已取消'], 0) +
      '<div class="list">' + ORDERS.map(orderCard).join('') + '</div>' +
      tabbar(TABS_USER, 1);
  }

  function sInbox() {
    return navbar(navGhost, '接单',
        '<span style="flex:none;width:46px;display:grid;place-items:center"><i class="switch" title="在线接单"></i></span>') +
      '<div class="stat-strip">' +
        '<div class="stat"><span class="stat__v stat__v--alert">3</span><span class="stat__l">待接单</span></div>' +
        '<div class="stat"><span class="stat__v">1</span><span class="stat__l">进行中</span></div>' +
        '<div class="stat"><span class="stat__v">2</span><span class="stat__l">今日完成</span></div>' +
      '</div>' +
      '<div class="list">' + INBOX.map(orderCard).join('') + '</div>' +
      tabbar(TABS_GUIDE, 0);
  }

  function sAdmin() {
    return navbar(navBack, '订单管理', navFilter) +
      '<div class="stat-strip">' +
        '<div class="stat"><span class="stat__v stat__v--alert">3</span><span class="stat__l">待确认</span></div>' +
        '<div class="stat"><span class="stat__v">1</span><span class="stat__l">已确认</span></div>' +
        '<div class="stat"><span class="stat__v">5</span><span class="stat__l">今日订单</span></div>' +
      '</div>' +
      '<div class="chip-row">' +
        '<button class="chip chip--lead" type="button">' + ico('calendar') + '09-27 周日</button>' +
        ['全部状态', '待确认', '已取消'].map(function (t, i) {
          return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" type="button">' + t + '</button>';
        }).join('') + '</div>' +
      '<div class="list">' + ADMIN.map(orderCard).join('') + '</div>' +
      tabbar(TABS_ADMIN, 0);
  }

  var SCREENS = [
    { no: '01', bg: 'tr', name: '景点列表', build: sHome,
      note: '薄荷只留左上角，粉色两块加重，紫退到右上角很淡；封面用 picsum 占位。点景点卡进入地陪列表' },
    { no: '02', bg: 'tl', name: '地陪列表', build: sGuides,
      note: '薄荷只留右上角，粉色三块铺开（左上主光），紫只剩中上一缕。点地陪卡进入详情' },
    { no: '03', bg: 'top', name: '地陪详情', build: sGuideDetail,
      note: '顶光从上往下，把光聚在头像和身份区；主按钮改纯黑胶囊。点立即预约进入下单页' },
    { no: '04', bg: 'calm', name: '下单页', build: sBooking,
      note: '表单要克制，右上只剩一点紫，别跟内容抢。提交后进入订单页' },
    { no: '05', bg: 'tl-soft', name: '订单页', build: sOrders,
      note: '左上 → 右下、中弱、粉为主；切换栏选中态用黑胶囊。底部「我的」即本屏' },
    { no: '06', bg: 'top-cool', name: '接单页（地陪端）', build: sInbox,
      note: '薄荷偏冷的顶光，是工作台不是逛街；拒单描边、接单实心' },
    { no: '07', bg: 'calm-ink', name: '后台订单管理', build: sAdmin,
      note: '最安静：右上保留那点紫，左上加一小块薄荷提神' }
  ];

  /* ---------------- 视图层 ---------------- */
  var stage = document.getElementById('stage');
  var scrTabs = document.getElementById('scr-tabs');
  var modeSeg = document.getElementById('mode');
  var MODE = 'flow';      // flow = 单机流程演示；grid = 七机全览
  var stack = [0];        // 导航栈，存 SCREENS 下标
  var animLock = false;

  /* URL 状态：?m=grid 全览；?v=3 直达第 3 屏 —— 方便把某个界面直接发给同学 */
  (function () {
    var qs = new URLSearchParams(location.search);
    if (qs.get('m') === 'grid') {
      MODE = 'grid';
      Array.prototype.forEach.call(modeSeg.querySelectorAll('button'), function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-mode') === 'grid');
      });
    }
    var v = parseInt(qs.get('v'), 10);
    if (v >= 1 && v <= SCREENS.length) stack = [v - 1];
  }());

  function syncUrl() {
    var url = new URL(location);
    url.searchParams.set('v', current() + 1);
    if (MODE === 'grid') url.searchParams.set('m', 'grid'); else url.searchParams.delete('m');
    history.replaceState(null, '', url);
  }

  function current() { return stack[stack.length - 1]; }

  function viewHTML(i) {
    var s = SCREENS[i];
    return '<div class="view__bg screen__bg screen__bg--' + s.bg + '"></div>' +
           '<div class="view__scroll">' + s.build() + '</div>';
  }

  function makeView(i, anim) {
    var v = document.createElement('div');
    v.className = 'view' + (anim ? ' ' + anim : '');
    v.setAttribute('data-screen', i);
    v.innerHTML = viewHTML(i);
    return v;
  }

  function phoneHTML(i) {
    return '<div class="phone"><div class="screen">' +
      '<div class="notch"></div>' +
      '<div class="status-bar"><span>9:41</span><span class="status-bar__icons">' +
        '<span class="sig"><i></i><i></i><i></i><i></i></span>' + ico('wifi') +
        '<i class="bat"></i></span></div>' +
      '<div class="views">' + makeView(i, MODE === 'grid' ? '' : 'view--tab-in').outerHTML + '</div>' +
    '</div></div>';
  }

  function capHTML(i) {
    var s = SCREENS[i];
    return '<strong>' + s.no + ' · ' + s.name + '</strong><p>' + s.note + '</p>';
  }

  function renderGrid() {
    stage.innerHTML = SCREENS.map(function (s, i) {
      return '<section class="frame">' + phoneHTML(i) +
        '<div class="frame-cap"><div>' + capHTML(i) + '</div></div></section>';
    }).join('');
  }

  function renderFlow() {
    stage.innerHTML = '<section class="frame">' + phoneHTML(current()) +
      '<div class="frame-cap"><div>' + capHTML(current()) + '</div></div></section>';
  }

  function render() { MODE === 'grid' ? renderGrid() : renderFlow(); syncTabs(); }

  function syncTabs() {
    Array.prototype.forEach.call(scrTabs.querySelectorAll('button'), function (b, i) {
      b.classList.toggle('is-on', i === current());
    });
  }

  /* ---------- 界面切换：叠一层新 view，旧的 100ms 淡出后移除 ---------- */
  function navigate(i, dir) {
    if (animLock) return;
    var views = stage.querySelector('.views');
    if (!views) { render(); return; }
    var old = null;
    Array.prototype.forEach.call(views.querySelectorAll('.view'), function (v) {
      if (!v.classList.contains('view--out')) old = v;
    });
    if (old && Number(old.getAttribute('data-screen')) === i) return;

    animLock = true;
    var anim = dir === 'push' ? 'view--push-in' : dir === 'pop' ? 'view--pop-in' : 'view--tab-in';
    var next = makeView(i, anim);
    views.appendChild(next);
    if (old) {
      old.classList.add('view--out');
      setTimeout(function () {
        if (old.parentNode) old.parentNode.removeChild(old);
        animLock = false;
      }, 120);   /* 略大于 --dur-exit(100ms) */
    } else {
      animLock = false;
    }
    if (MODE === 'flow') {
      var cap = stage.querySelector('.frame-cap div');
      if (cap) cap.innerHTML = capHTML(i);
    }
    syncTabs();
    syncUrl();
  }

  function jump(i) {
    if (i === current()) return;
    var dir = i > current() ? 'push' : 'pop';
    stack = [i];
    navigate(i, dir);
  }

  /* ---------- 屏间直达 pills ---------- */
  scrTabs.innerHTML = SCREENS.map(function (s, i) {
    return '<button type="button" data-i="' + i + '">' + s.no + ' ' + s.name + '</button>';
  }).join('');

  /* ---------- 全局交互 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;

    var modeBtn = t.closest && t.closest('#mode button');
    if (modeBtn) {
      MODE = modeBtn.getAttribute('data-mode');
      Array.prototype.forEach.call(modeSeg.querySelectorAll('button'), function (b) {
        b.classList.toggle('is-on', b === modeBtn);
      });
      render();
      return;
    }

    var tabBtn = t.closest && t.closest('#scr-tabs button');
    if (tabBtn) { jump(Number(tabBtn.getAttribute('data-i'))); return; }

    if (t.closest && t.closest('[data-back]')) {
      if (stack.length > 1) { stack.pop(); navigate(current(), 'pop'); }
      else if (current() > 0) { jump(current() - 1); }
      return;
    }

    var go = t.closest && t.closest('[data-go]');
    if (go && MODE === 'flow') {
      var idx = Number(go.getAttribute('data-go'));
      if (idx === current()) return;
      if (go.getAttribute('data-dir') === 'tab') { stack = [idx]; navigate(idx, 'tab'); }
      else { stack.push(idx); navigate(idx, 'push'); }
      return;
    }

    var stepBtn = t.closest && t.closest('.stepper__btn');
    if (stepBtn) {
      var stepper = stepBtn.closest('.stepper');
      var num = stepper.querySelector('.stepper__n');
      var v = parseInt(num.textContent, 10) || 1;
      var isMinus = stepBtn === stepper.querySelector('.stepper__btn');
      num.textContent = String(Math.min(9, Math.max(1, v + (isMinus ? -1 : 1))));
      return;
    }

    var sw = t.closest && t.closest('.switch');
    if (sw) { sw.classList.toggle('is-off'); return; }

    var groups = ['tabline__item', 'chip', 'option', 'date', 'seg__item'];
    for (var i = 0; i < groups.length; i++) {
      var el = t.closest && t.closest('.' + groups[i]);
      if (el) {
        var sibs = el.parentNode.querySelectorAll('.' + groups[i]);
        Array.prototype.forEach.call(sibs, function (s) { s.classList.remove('is-on'); });
        el.classList.add('is-on');
        return;
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= SCREENS.length) { jump(n - 1); return; }
    if (e.key === 'ArrowRight') { jump(Math.min(SCREENS.length - 1, current() + 1)); return; }
    if (e.key === 'ArrowLeft')  { jump(Math.max(0, current() - 1)); return; }
    if (e.key === 'Escape' && MODE === 'flow' && stack.length > 1) {
      stack.pop(); navigate(current(), 'pop');
    }
  });

  render();
}());
