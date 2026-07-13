/* =====================================================================
   AC Sales AI OS · Mock API 层（离线演示用）
   当后端不可达（GitHub Pages / 本地未启动）时自动接管，
   实现 /api/* 全量端点 + HVAC 数字客户孪生 + 16 维启发式评分。
   ===================================================================== */
(function () {
  "use strict";

  const DIMS = [
    ["破冰能力", 6], ["需求洞察", 8], ["情绪价值", 6], ["产品讲解", 7], ["价值塑造", 7],
    ["FABE", 6], ["SPIN", 6], ["异议处理", 7], ["竞品应对", 6], ["成交推进", 7],
    ["客户信任", 7], ["Closing", 6], ["逻辑表达", 6], ["专业程度", 7], ["共情能力", 6], ["语言感染力", 6],
  ];
  const EMO = ["Trust", "Interest", "Anxiety", "Pressure", "Excitement", "Satisfaction", "Confusion", "Resistance"];
  const PRODUCTS = ["挂机", "柜机", "中央空调", "新风", "热泵两联供"];
  const CITIES = { "上海": "华东", "北京": "华北", "成都": "西南", "广州": "华南" };
  const DISC = ["D", "I", "S", "C"];
  const MBTI = ["ESTJ", "ISFJ", "ENTP", "ISTP", "ENFJ", "INTJ"];
  const OCC = ["互联网运营", "中学教师", "私企业主", "医生", "工程师", "国企职员", "自由职业"];
  const EDU = ["本科", "硕士", "大专"];

  const KNOWLEDGE = [
    { category: "product", title: "APF 能效怎么向客户解释", content: "APF 是全年能源消耗效率，数值越高越省电。以 1.5 匹为例，APF 从 4.0 提到 5.0，全年制冷季约省 80-120 度电，五年可省出一台机器差价。", tags: ["APF", "能效", "省电"], brand: "通用" },
    { category: "solution", title: "三代同堂空调选型方案", content: "客厅建议 3 匹柜机或风管机保证制冷量；老人房注重静音与防直吹；儿童房优先新风+无风感。全屋可做中央空调一拖多，温控更均匀。", tags: ["选型", "家庭", "中央空调"], brand: "通用" },
    { category: "installation", title: "安装节点与隐蔽工程", content: "中央空调需在木工前进场吊装内机、走铜管与冷凝水管；水电阶段预留电源与检修口。安装占系统效果 50%，务必盯紧抽真空与保压。", tags: ["安装", "节点", "隐蔽工程"], brand: "通用" },
    { category: "faq", title: "中央空调 vs 分体机噪音对比", content: "内机吊装在吊顶内，运行噪音通常 22-28 分贝，低于分体挂机；但外机位若狭小会产生共振，需做减震垫与通风。", tags: ["噪音", "静音", "对比"], brand: "通用" },
    { category: "policy", title: "以旧换新补贴政策口径", content: "2026 年家电以旧换新对空调补贴 15%-20%，一级能效上浮。可叠加品牌以旧换新券，建议先核旧机估值再报总价，冲关价格异议。", tags: ["政策", "补贴", "价格"], brand: "通用" },
    { category: "competitor", title: "与竞品对比的话术锚点", content: "对比时讲三年故障率、十年压缩机包修、本地服务响应时效，而非单纯拼单价。把差异落到'五年总持有成本'上。", tags: ["竞品", "对比", "价值"], brand: "通用" },
  ];

  const state = {
    sessions: {},     // sid -> {customer, messages, emotion, training_goal, difficulty, report}
    knowledge: KNOWLEDGE.slice(),
    seq: 1,
  };

  function rnd(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[rnd(0, arr.length - 1)]; }

  function genCustomer(cfg) {
    const city = cfg.customer_type || pick(Object.keys(CITIES));
    const product = cfg.product || pick(PRODUCTS);
    const diff = cfg.difficulty || "普通";
    const diffMul = { "普通": 0, "困难": 1, "地狱": 2, "魔鬼": 3 }[diff] || 0;
    const disc = pick(DISC);
    const gender = pick(["先生", "女士"]);
    const hasChild = Math.random() > 0.4, hasElder = Math.random() > 0.5;
    const baseIntent = 55 - diffMul * 8 + rnd(-6, 8);
    return {
      basic_profile: {
        city, gender, age: rnd(28, 55), occupation: pick(OCC),
        income_wan: pick([25, 35, 50, 80, 120]), education: pick(EDU),
      },
      family: { members: (hasChild ? 3 : 2) + (hasElder ? 1 : 0) + " 人", has_child: hasChild, has_elder: hasElder },
      house: { area: rnd(89, 180), type: pick(["三室两厅", "四室两厅", "复式", "大平层"]), orientation: pick(["南向", "南北通透", "东向"]), decoration_stage: cfg.decoration_stage || pick(["水电阶段", "木工阶段", "软装阶段", "已入住"]) },
      budget: { expected: rnd(8, 35) * 1000, elasticity: pick(["低", "中", "高"]) },
      psychology: { DISC: disc, MBTI: pick(MBTI), risk: pick(["保守", "中性", "激进"]), purchase_intent: Math.max(20, Math.min(95, baseIntent)) },
      competitor: { visited: pick([["格力", "美的"], ["大金"], ["海尔", "日立"], ["无"]]), anchor_price: rnd(9, 30) * 1000 },
      emotion: { Trust: rnd(30, 55), Interest: rnd(45, 70), Anxiety: rnd(20, 50), Pressure: rnd(15, 45), Excitement: rnd(25, 55), Satisfaction: rnd(30, 55), Confusion: rnd(20, 50), Resistance: rnd(35, 65) },
      family_decision_network: { consensus_score: rnd(50, 85), nodes: [
        { role: "决策人(本人)", opinion: pick(["主导", "犹豫", "听配偶"]) },
        { role: "配偶", opinion: pick(["关注价格", "关注颜值", "关注售后"]) },
        { role: hasChild ? "孩子" : "父母", opinion: pick(["要静音", "无所谓", "要智能"]) },
      ] },
    };
  }

  // ---- 话术意图分析：更新情绪 + 抽取信号/提示 ----
  function analyze(text, customer, prevEmo) {
    const t = (text || "").toLowerCase();
    const has = (...kw) => kw.some(k => text.includes(k));
    const emo = Object.assign({}, prevEmo);
    const bump = (k, d) => { emo[k] = Math.max(0, Math.min(100, (emo[k] || 0) + d)); };

    const signals = [], tips = [], refs = [];
    if (has("?", "吗", "么")) { bump("Interest", 6); }
    if (has("省电", "电费", "apf", "能效", "节能")) { bump("Trust", 7); bump("Interest", 5); bump("Satisfaction", 4); refs.push(KNOWLEDGE[0]); }
    if (has("价格", "贵", "便宜", "多少钱", "预算", "划算", "值")) { bump("Resistance", -8); bump("Trust", 4); tips.push("[异议处理·价值重构] 用'五年总持有成本'替代单价，锚定补贴后到手价"); refs.push(KNOWLEDGE[4]); }
    if (has("安装", "售后", "保修", "服务", "维修")) { bump("Trust", 5); bump("Anxiety", -6); refs.push(KNOWLEDGE[2]); }
    if (has("噪音", "静音", "声音")) { bump("Anxiety", -5); bump("Satisfaction", 3); refs.push(KNOWLEDGE[3]); }
    if (has("品牌", "格力", "美的", "大金", "海尔", "日立", "对比", "区别", "竞品")) { bump("Interest", 3); tips.push("[竞品应对] 落到故障率/包修/本地服务时效，而非拼单价"); refs.push(KNOWLEDGE[5]); }
    if (has("下单", "订", "定", "今天", "活动", "名额", "优惠")) { bump("Excitement", 10); bump("Trust", 6); signals.push("成交信号：客户出现购买意向，建议推进 Closing"); tips.push("[Closing] 给稀缺性（名额/活动截止）+ 低门槛动作（先交定金锁权益）"); }
    if (has("理解", "您", "咱们", "担心", "放心", "考虑")) { bump("Trust", 6); bump("Satisfaction", 4); }
    if (has("匹", "型号", "制冷", "制热", "度", "㎡", "平米", "数据")) { bump("Satisfaction", 3); }
    if (!signals.length && text.length > 4) tips.push("[需求洞察] 多用提问挖家庭结构/装修进度/旧机痛点，别急着报价");
    return { emotion: emo, signals, tips, refs: refs.slice(0, 3) };
  }

  // ---- 客户回复生成（情境化 + 难度缩放） ----
  const REPLIES = {
    price: ["还是有点贵啊，隔壁牌子的差不多配置便宜好几千。", "总价超我预算了，你这价格水分大不大？", "能不能再优惠点？网上看着都便宜些。"],
    energy: ["那电费确实得算算，五年能省出多少？", "省电我信，但你说的 APF 到底怎么看出来？", "静音和制冷快，这两点我最在意。"],
    install: ["安装要多久？会不会把我家搞得乱七八糟？", "保修几年？万一漏氟找谁？", "我房子还在水电阶段，现在定来得及吗？"],
    noise: ["我卧室怕吵，晚上睡眠浅。", "之前那台外机嗡嗡响，太折磨了。"],
    question: ["你说得有点道理，那具体怎么选？", "那我家这情况你建议哪款？", "听起来不错，不过我得跟家里人商量下。"],
    generic: ["嗯，我再想想。", "你继续说，我在听。", "这个我之前也了解过一些。", "行，那你给个方案我看看。"],
  };
  function genReply(text, session) {
    const t = text || "";
    let bank = "generic";
    if (/价格|贵|便宜|多少钱|预算|划算|值/.test(t)) bank = "price";
    else if (/省电|电费|apf|能效|节能/.test(t)) bank = "energy";
    else if (/安装|售后|保修|服务|维修/.test(t)) bank = "install";
    else if (/噪音|静音|声音/.test(t)) bank = "noise";
    else if (/[?？]/.test(t) || /吗|么$/.test(t)) bank = "question";
    let r = pick(REPLIES[bank]);
    if (session.difficulty === "魔鬼" && bank !== "generic") r += "（客户明显不买账，一直在挑刺）";
    else if (session.difficulty === "地狱" && Math.random() > 0.5) r += "（客户有点犹豫）";
    return r;
  }

  // ---- 16 维评分（基于全量销售话术关键词启发式） ----
  function scoreDims(messages, goal) {
    const all = messages.join(" ");
    const has = (...kw) => kw.some(k => all.includes(k));
    const base = () => rnd(58, 72);
    const sc = (cond, lo, hi) => (cond ? rnd(lo, hi) : rnd(42, 60));
    const map = {
      "破冰能力": sc(has("您好", "打扰", "天气", "最近") || messages.length > 0, 70, 88),
      "需求洞察": sc(has("?", "吗", "孩子", "老人", "装修", "面积", "预算"), 68, 90),
      "情绪价值": sc(has("理解", "您", "咱们", "放心", "考虑"), 66, 86),
      "产品讲解": sc(has("匹", "制冷", "制热", "静音", "新风", "型号"), 64, 88),
      "价值塑造": sc(has("省电", "电费", "五年", "划算", "价值", "总持有"), 62, 90),
      "FABE": sc(has("特点", "优势", "利益", "证据", "fabe", "因为"), 60, 84),
      "SPIN": sc(has("现状", "难点", "影响", "价值", "如果", "假如"), 58, 86),
      "异议处理": sc(has("价格", "贵", "便宜", "但是", "其实", "对比"), 60, 90),
      "竞品应对": sc(has("格力", "美的", "大金", "海尔", "日立", "区别", "竞品"), 56, 86),
      "成交推进": sc(has("下单", "订", "定", "今天", "活动", "名额", "优惠"), 55, 92),
      "客户信任": sc(has("保修", "售后", "品牌", "十年", "包修", "放心"), 64, 90),
      "Closing": sc(has("定金", "锁定", "名额", "现在", "就", "确认"), 55, 90),
      "逻辑表达": sc(has("度", "㎡", "平米", "数据", "因为", "所以"), 66, 88),
      "专业程度": sc(has("apf", "能效", "匹", "铜管", "抽真空", "包修"), 64, 90),
      "共情能力": sc(has("理解", "担心", "您", "咱们"), 66, 87),
      "语言感染力": sc(has("!", "～", "呢", "呀", "啦") || messages.join("").length > 60, 60, 85),
    };
    return DIMS.map(([name, weight]) => {
      let score = sc(name) ? map[name] : base();
      if (name === goal) score = Math.min(95, score + rnd(4, 10)); // 专项训练加成
      const suggestion = score < 65
        ? `「${name}」偏弱，建议结合场景话术专项补强。`
        : score >= 85 ? `「${name}」表现优秀，可作为标杆话术沉淀。` : `「${name}」达标，仍有提升空间。`;
      return { dimension: name, score, weight, suggestion };
    });
  }

  function levelOf(s) { return s >= 88 ? "销冠" : s >= 75 ? "优秀" : s >= 60 ? "熟练" : "进阶"; }

  function buildReport(session) {
    const dims = scoreDims(session.messages, session.training_goal);
    const total = Math.round(dims.reduce((a, d) => a + d.score * d.weight, 0) / 100);
    const weak = dims.filter(d => d.score < 65).map(d => d.dimension);
    const strong = dims.filter(d => d.score >= 85).map(d => d.dimension);
    const next = weak.length
      ? weak.slice(0, 3).map(d => `针对「${d}」做 3 次情境陪练，每次聚焦一个异议`)
      : ["挑战更高难度客户，验证稳定性", "将本次销冠话术沉淀为 BP 卡分发团队"];
    const psy = session.customer.psychology;
    return {
      level: levelOf(total), total_score: total,
      dimensions: dims,
      next_steps: next,
      golden_script: `先生，我理解您在意价格（共情）。这台机器 APF 5.2，比您看的那款五年电费省出 ¥${(rnd(8, 15) * 100)}，再加上以旧换新补贴 15%，实际到手只比您预算高一点点（价值重构）。现在这月有 3 个名额锁十年压缩机包修，我今天帮您把权益定下来？`,
      psychology: { trust_level: rnd(60, 90), purchase_intent: Math.max(psy.purchase_intent, rnd(55, 88)), resistance: rnd(20, 50), decision_stage: pick(["需求确认", "方案对比", "价格谈判", "临门一脚"]) },
      ability_change: { improved: strong.slice(0, 2), to_improve: weak.slice(0, 3) },
    };
  }

  // ---- 路由：解析 method+url+body ----
  function ok(data) { return Promise.resolve(data); }
  function json(url) { const i = url.indexOf("?"); return i < 0 ? { path: url, q: {} } : { path: url.slice(0, i), q: Object.fromEntries(new URLSearchParams(url.slice(i + 1))) }; }

  function mockApi(method, url, body) {
    const { path, q } = json(url);
    const m = method.toUpperCase();

    if (m === "GET" && path === "/api/health") return ok({ status: "ok", mock: true, ts: Date.now() });
    if (m === "GET" && path === "/api/admin/overview") return ok({ sessions: 128, avg_score: 78.4, knowledge: state.knowledge.length, users: 9 });
    if (m === "GET" && path === "/api/admin/users") return ok([
      { name: "周总监", role: "super_admin" }, { name: "李店长", role: "store_manager" },
      { name: "王培训", role: "training_manager" }, { name: "陈经理", role: "sales_manager" },
      { name: "赵顾问", role: "sales_consultant" }, { name: "孙安装", role: "installation_manager" },
      { name: "吴售后", role: "aftersales_manager" }, { name: "郑品牌", role: "brand_admin" }, { name: "钱卓越", role: "sales_consultant" },
    ]);

    if (m === "GET" && path === "/api/training/history") {
      // 种子若干历史会话，便于首页/成长中心非空
      const seed = [["M-1001", 82, "ended"], ["M-1002", 71, "ended"], ["M-1003", 64, "ended"], ["M-1004", 0, "active"]];
      const list = seed.map(([sid, sc, st]) => ({ session_id: sid, started_at: new Date(Date.now() - rnd(1, 9) * 86400000).toISOString(), status: st, total_score: st === "ended" ? sc : null }));
      return ok(list);
    }
    if (m === "GET" && path.startsWith("/api/training/report/")) {
      const sid = path.split("/").pop();
      const s = state.sessions[sid];
      if (s && s.report) return ok(s.report);
      // 种子历史报告
      const dims = DIMS.map(([name, weight]) => ({ dimension: name, score: rnd(55, 90), weight, suggestion: "历史报告维度。" }));
      const total = Math.round(dims.reduce((a, d) => a + d.score * d.weight, 0) / 100);
      return ok({ level: levelOf(total), total_score: total, dimensions: dims, next_steps: ["保持节奏，每周 3 次专项"], golden_script: "（历史销冠话术）", psychology: { trust_level: 80, purchase_intent: 75, resistance: 30, decision_stage: "价格谈判" }, ability_change: { improved: ["专业程度"], to_improve: ["异议处理"] } });
    }

    if (m === "POST" && path === "/api/training/start") {
      const sid = "M-" + (1000 + state.seq++);
      const customer = genCustomer(body || {});
      state.sessions[sid] = { customer, messages: [], emotion: customer.emotion, training_goal: (body && body.training_goal) || "需求洞察", difficulty: (body && body.difficulty) || "普通", report: null };
      return ok({ session_id: sid, customer, world: { season: "夏季", weather: "高温 38℃", policy: "以旧换新补贴 15%-20%" } });
    }
    if (m === "POST" && path === "/api/training/turn") {
      const sid = body && body.session_id; const s = state.sessions[sid];
      if (!s) return Promise.reject(new Error("会话不存在（演示模式需先「开始训练」）"));
      const text = (body && body.message) || "";
      s.messages.push(text);
      const a = analyze(text, s.customer, s.emotion);
      s.emotion = a.emotion;
      return ok({ customer_reply: genReply(text, s), emotion: a.emotion, signals: a.signals, ai_tips: a.tips, knowledge_refs: a.refs, reply_source: "mock_twin" });
    }
    if (m === "POST" && path === "/api/training/end") {
      const sid = body && body.session_id; const s = state.sessions[sid];
      if (!s) return Promise.reject(new Error("会话不存在"));
      if (!s.messages.length) s.messages.push("（演示：未输入话术，按基线评估）");
      const rep = buildReport(s); s.report = rep;
      return ok(rep);
    }

    if (m === "POST" && path === "/api/customer/preview") {
      return ok({ customer: genCustomer(body || {}) });
    }

    if (m === "GET" && path === "/api/knowledge/list") return ok(state.knowledge);
    if (m === "GET" && path === "/api/knowledge/search") {
      const kw = (q.q || "").toLowerCase();
      const hits = state.knowledge.filter(k => !kw || (k.title + k.content + k.tags.join("")).toLowerCase().includes(kw))
        .map(k => ({ ...k, score: 0.9 - Math.random() * 0.2 }));
      return ok(hits);
    }
    if (m === "POST" && path === "/api/knowledge/ask") {
      const q = (body && body.question) || "";
      const hit = state.knowledge.find(k => (k.title + k.tags.join("")).toLowerCase().includes(q.toLowerCase())) || state.knowledge[0];
      return ok({ answer: hit ? hit.content : "（演示）建议通过知识运营中心补充该条目，避免编造。", confidence: "0.82", evidence: [hit || state.knowledge[0]] });
    }
    if (m === "POST" && path === "/api/knowledge/add") {
      const k = { category: (body && body.category) || "product", title: (body && body.title) || "未命名", content: (body && body.content) || "", tags: ((body && body.tags) || "").split(",").map(s => s.trim()).filter(Boolean), brand: "通用" };
      state.knowledge.unshift(k);
      return ok({ ok: true });
    }

    return Promise.reject(new Error("Mock 未覆盖端点：" + method + " " + path));
  }

  window.mockApi = mockApi;
  window.__MOCK_READY__ = true;
})();
