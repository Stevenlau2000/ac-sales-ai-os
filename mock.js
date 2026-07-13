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
  // difficulty 系数：难客户正面情绪获取被打折扣（魔鬼仅拿 60% 信任增益），更真实
  function analyze(text, customer, prevEmo, difficulty) {
    const t = (text || "").toLowerCase();
    const has = (...kw) => kw.some(k => text.includes(k));
    const emo = Object.assign({}, prevEmo);
    const dMul = ({ "普通": 1, "困难": 0.9, "地狱": 0.75, "魔鬼": 0.6 }[difficulty] || 1);
    const bump = (k, d) => { emo[k] = Math.max(0, Math.min(100, (emo[k] || 0) + Math.round(d * dMul))); };

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

  // ============ 客户对话引擎（第 1 代：意图感知 + 应答） ============
  // 诊断：旧版 genReply 仅按当前句关键词从固定 bank 随机抽句，完全不看销售在说什么，
  //       导致"答非所问"。第 1 代改为：识别销售话术意图 → 客户就"所提话题"做应答。
  function detectIntent(text) {
    const t = text || "";
    const isQuestion = /[?？]/.test(t) ||
      /(吗|呢|什么|啥|多少|几|怎么|如何|哪|哪里|谁|为什么|啥时候|多久|行不行|好不好|可以吗|对不对|是不是)/.test(t);
    const intents = [];
    const add = (n, s) => intents.push({ n, s });
    if (/价格|贵|便宜|多少钱|预算|划算|值|报价|优惠|折扣|补贴|让一点/.test(t)) add("price", 3);
    if (/省电|电费|apf|能效|节能|省/.test(t)) add("energy", 3);
    if (/安装|售后|保修|服务|维修|包修|抽真空|检修/.test(t)) add("install", 3);
    if (/噪音|静音|声音|吵|嗡/.test(t)) add("noise", 3);
    if (/品牌|格力|美的|大金|海尔|日立|三菱|约克|对比|区别|竞品|哪家|牌子/.test(t)) add("brand", 3);
    if (/面积|平米|㎡|户型|几室|房子|装修|新房|旧房|建面/.test(t)) add("house", 2);
    if (/孩子|老人|家人|老婆|老公|父母|家庭|卧室|客厅|同住/.test(t)) add("family", 2);
    if (/下单|交定金|先交定金|签(合同|单)|锁定权益|定下来|今天定|就定|现在定|成交/.test(t)) add("close", 4);
    if (/理解|咱们|感同身受|您放心|您看|您觉得|您说|您这么|您真是|为您|替您/.test(t)) add("empathy", 2);
    intents.sort((a, b) => b.s - a.s);
    let top = intents[0] ? intents[0].n : "generic";
    // 共情优先修正：陈述中含共情/rapport 标记、且并非在问家庭结构时，归到 empathy
    // （避免"家人"一词把共情陈述误判为 family 问答，导致重复报家庭结构；对齐后端 coach.py）
    if (!isQuestion && /理解|咱们|感同身受|您放心|您这么|您真是/.test(t) && !/孩子|老人|老婆|老公|父母|同住|几口/.test(t)) top = "empathy";
    return { isQuestion, top, intents };
  }

  const INTENT_ACK = {
    price: ["价格我确实上心，", "你说得对，得算总账，", "钱这块我得掰扯清楚，"],
    energy: ["省电我认，", "电费我有点数，", "节能我肯定要，"],
    install: ["安装我正担心，", "保修你得交个底，", "售后这块我最虚，"],
    noise: ["静音太要命了，", "噪音我怕得很，", "安静我必须得要，"],
    brand: ["品牌我也在挑，", "你说的牌子我比过，", "牌子我纠结，"],
    house: ["我家就这情况，", "房子是这么个房子，", "户型你说的对，"],
    family: ["家里人你得顾上，", "老人孩子我挂心，", "一家子意见你得听，"],
    empathy: ["你这么讲我就舒坦了，", "你能体谅挺好，", "你懂我意思就好，"],
    close: ["你这步我有点动心，", "行，你说到这儿了，", "定金这茬我听着，"],
    generic: ["嗯，我听着呢，", "你接着说，", "这个我之前也想，"],
  };
  const INTENT_BODY = {
    price: ["但隔壁同配便宜好几千，你这价水分多大？", "不过网上看着便宜一截，优惠能给到多少？", "算完还是超预算，能不能再让一点？"],
    energy: ["那五年到底省多少电费？你帮我算笔账。", "APF 到底怎么个看法，别光说高。", "制冷快加静音我最在意，这两样能保吗？"],
    install: ["安装折腾几天？我家刚水电阶段来得及不？", "万一漏氟找谁，保修几年说清楚。", "内机藏吊顶里，以后检修方便不？"],
    noise: ["我睡眠浅，卧室那台千万别嗡嗡响。", "之前那台外机吵得睡不着，这回必须静。", "主机位离卧室近，共振咋处理？"],
    brand: ["格力美的我也看了，凭啥你贵一截？", "大金日立都在比，你给个准信。", "牌子我不迷信，但得讲出道理。"],
    house: ["面积大确实费劲，你建议中央还是风管？", "三室这户型，你给个方案？", "南北通透但层高一般，有影响吗？"],
    family: ["老人怕直吹孩子房要新风，你咋排？", "老婆盯颜值我盯售后，你得都顾上。", "一家子意见杂，你帮我捋捋。"],
    empathy: ["我最怕买贵了还糟心，你给我兜个底。", "我就怕后期没人管，你实话实说。", "你能负责到底我就放心了。"],
    close: ["不过得跟家人通个气再定。", "你这名额今天真有效？别忽悠我。", "定金能先交，但权益得写清。"],
    generic: ["你再给我展开讲讲？", "那具体怎么落地？", "听起来还行，我消化下。"],
  };
  // ---- 提问分流：销售在提问时，客户直接作答（而非抛异议） ----
  const Q_ANSWER = {
    house: ["我家建面一百三多点，三室两厅南北通透。", "套内大概一百一，四室，正在搞装修。", "房子一百六，大平层，层高还行。"],
    family: ["有个上小学的娃，还有老人同住，都怕吵怕直吹。", "两口子加一小孩，老人偶尔来住。", "一家四口，孩子还小，老人也住一块。"],
    budget: ["我心里大概两万出头，超太多真得再想想。", "预算三万封顶吧，再高得跟老婆商量。", "没个准数，你给方案我看着办。"],
    reno: ["刚水电做完，准备上木工了，正卡安装节点。", "软装都差不多了，就差空调没定。", "还在水电阶段，早着呢。"],
    brand: ["格力美的都逛过，大金也问了价，还在比。", "日立和三菱我都有看，你这牌子中不中？", "没特别中意，谁划算买谁。"],
    concern: ["我最怕买了不好用、售后没人管，还有静音。", "我担心价格虚高，还有保修靠不靠谱。", "怕安装糙了漏氟，后期糟心。"],
    generic: ["这个嘛…我得想想再说。", "你问到点子上了，我一时还真说不准。", "嗯，让我捋捋——你接着说。"],
  };
  // 提问分流：销售在提问时，客户基于真实数字孪生档案直接作答（事实接地，对齐后端 coach.py）
  function answerQuestion(text, s) {
    const t = text || "";
    const c = (s && s.customer) || {};
    const h = c.house || {}, f = c.family || {}, b = c.budget || {};
    const comp = (c.competitor || {}).visited || [];
    const compStr = comp.length ? comp.join("、") : "别家";
    const emo = c.emotion || {};
    let ans = null;
    if (/面积|多大|户型|几室|房子|平米|㎡|建面|多大平/.test(t)) {
      ans = `我家建面大概${h.area}平，${h.type}，${h.orientation}。`;
    } else if (/孩子|老人|家人|家庭|老婆|老公|父母|同住|几口/.test(t)) {
      const parts = [];
      if (f.has_child) parts.push("有个上学的娃");
      if (f.has_elder) parts.push("老人同住");
      if (!parts.length) parts.push("就两口子");
      ans = `${f.members}——` + parts.join("，") + "，都怕吵怕直吹。";
    } else if (/预算|多少钱准备|心里价|打算花|准备多少/.test(t)) {
      ans = `我心里大概${b.expected}块，超太多真得再想想。`;
    } else if (/装修|阶段|进度|水电|木工|啥时候装/.test(t)) {
      ans = `刚${h.decoration_stage}，正卡安装节点。`;
    } else if (/看过|比较|中意|牌子|哪个品牌|选哪/.test(t)) {
      ans = `${compStr}我都逛过，还在比。`;
    } else if (/担心|顾虑|怕|在意|最在乎/.test(t)) {
      ans = (emo.Anxiety > 55 || emo.Resistance > 55)
        ? "我最怕买了不好用、售后没人管，还有静音。"
        : "我主要担心价格虚高，还有保修靠不靠谱。";
    }
    return ans; // 未命中具体话题 → 返回 null，交由意图分支处理
  }

  // 衔接语：多轮对话中偶发，制造"在听、在接话"的连续感
  const BRIDGE = ["嗯，行，", "你看啊，", "我刚才想了下，", "话说回来，", "哦对，", "这样吧，", "不过说真的，", "我跟你说，"];

  // DISC 人格声线：同一客户全程风格一致（干脆 / 感性 / 稳妥 / 理性）
  const DISC_VOICE = {
    D: { open: ["说重点，", "直说吧，", ""], fill: ["你得给个准话。", "别绕弯子，直接报数。", "我就看结果。"], style: "干脆" },
    I: { open: ["哎我跟你说，", "诶，", ""], fill: ["我家那口子也老念叨这个。", "我邻居上次就踩过坑。", "我朋友圈一姐们刚装的。"], style: "感性" },
    S: { open: ["这个嘛…", "嗯，", ""], fill: ["我得回去跟家里人商量下。", "不着急，我再想想。", "你别催，我慢慢比。"], style: "稳妥" },
    C: { open: ["等一下，", "数据上我得确认下，", ""], fill: ["你说的有依据吗？", "有没有检测报告？", "你这数怎么来的？"], style: "理性" },
  };

  function discWrap(reply, s, isQ) {
    const disc = (s.customer && s.customer.psychology.DISC) || "S";
    const dv = DISC_VOICE[disc] || DISC_VOICE.S;
    const turns = s.turns || 1;
    let out = reply;
    // 衔接/开场：多轮后给连续感（DISC 开场白 或 通用衔接语）
    if (turns > 1 && Math.random() < 0.5) out = (Math.random() < 0.5 ? pick(dv.open) : pick(BRIDGE)) + out;
    // 收尾口头禅（DISC 风格一致；提问作答时不强加，避免违和）
    if (!isQ && Math.random() < (disc === "C" ? 0.4 : disc === "D" ? 0.22 : 0.3)) out = out + pick(dv.fill);
    return out;
  }

  // 成交推进：高信任 + 多轮 + 销售逼单 → 客户真同意收口
  const CLOSE_YES = ["行，那你把定金单给我，今天就定。", "成，权益写清楚我就交钱。", "看你这么实在，那我先交个定金锁权益。", "那行，就按你说的，今天定下来。"];
  const WARM = ["你这话在理，", "嗯，你说的我信。", "你这么讲我心里踏实点。", ""];

  function genReply(text, s) {
    const ci = detectIntent(text);
    let reply = null, isQ = false;
    const emo = s.emotion || {};
    // 难度真实化：魔鬼/地狱抬高客户基础抗拒（不再用括号注脚）
    const resist = Math.min(100, (emo.Resistance || 40) + (s.difficulty === "魔鬼" ? 25 : s.difficulty === "地狱" ? 15 : 0));
    const trust = emo.Trust || 40;
    // 销售在提问且问的是具体信息 → 客户直接作答
    if (ci.isQuestion) {
      const a = answerQuestion(text, s);
      if (a) { reply = a; isQ = true; }
    }
    if (!reply) {
      // 成交意图 + 高信任 + 压住抗拒 + 多轮 → 客户同意收口
      // 收口阈值随难度抬高：普通 Trust>60/Resist<70，地狱 Trust>64/Resist<62，魔鬼 Trust>70/Resist<55
      // （难客户既要赢得信任、又得压住抗拒才收口，符合真实销售逻辑）
      const closeNeed = s.difficulty === "魔鬼" ? 70 : s.difficulty === "地狱" ? 64 : 60;
      const closeResistCap = s.difficulty === "魔鬼" ? 55 : s.difficulty === "地狱" ? 62 : 70;
      if (ci.top === "close" && trust > closeNeed && resist < closeResistCap && (s.turns || 1) > 2) {
        return pick(CLOSE_YES);
      }
      const bodyBank = INTENT_BODY[ci.top];
      let bi;
      if (resist > 60 && bodyBank.length > 1) bi = bodyBank.length - 1; // 高抗拒→偏尖锐
      else {
        bi = rnd(0, bodyBank.length - 1);
        if (s._lastBody && s._lastBody.t === ci.top && bodyBank.length > 1) {
          let guard = 0;
          while (bi === s._lastBody.i && guard++ < 6) bi = rnd(0, bodyBank.length - 1);
        }
      }
      s._lastBody = { t: ci.top, i: bi };
      let ack = pick(INTENT_ACK[ci.top]);
      if (trust > 65 && Math.random() < 0.4) ack = pick(WARM); // 高信任→偶尔柔和开场
      reply = ack + bodyBank[bi];
    }
    return discWrap(reply, s, isQ);
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
      const sid = body && body.session_id; let s = state.sessions[sid];
      if (!s) { // 续训自愈：会话缺失时基于预览生成客户重建，避免演示中断
        const cust = genCustomer({});
        s = state.sessions[sid] = { customer: cust, messages: [], emotion: cust.emotion, training_goal: "需求洞察", difficulty: "普通", report: null };
      }
      if (!s.transcript) s.transcript = [];
      if (!s.turns) s.turns = 0;
      const text = (body && body.message) || "";
      s.turns++;
      s.transcript.push({ role: "sales", text });
      const a = analyze(text, s.customer, s.emotion, s.difficulty);
      s.emotion = a.emotion;
      const reply = genReply(text, s);
      s.transcript.push({ role: "customer", text: reply });
      s.messages.push(text);
      return ok({ customer_reply: reply, emotion: a.emotion, signals: a.signals, ai_tips: a.tips, knowledge_refs: a.refs, reply_source: "mock_twin" });
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

    if (m === "GET" && path === "/api/knowledge/list") return ok(state.knowledge.map(k => ({ ...k, attachments: k.attachments || [] })));
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
      const k = { category: (body && body.category) || "product", title: (body && body.title) || "未命名", content: (body && body.content) || "", tags: ((body && body.tags) || "").split(",").map(s => s.trim()).filter(Boolean), brand: "通用", attachments: (body && body.attachments) || [] };
      state.knowledge.unshift(k);
      return ok({ ok: true, id: state.knowledge.length });
    }

    return Promise.reject(new Error("Mock 未覆盖端点：" + method + " " + path));
  }

  window.mockApi = mockApi;
  window.__MOCK_READY__ = true;
})();
