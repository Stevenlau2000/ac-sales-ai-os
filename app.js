/* =====================================================================
   AC Sales AI OS · Web 前端 SPA（04-Web 逐页实现）
   对接 09-MVP 后端 /api/*；复用 03-UX Pattern-A~G；对齐 IA §3 十菜单 / PRD-002
   ===================================================================== */
"use strict";

const NAV = [
  { id: "dashboard",  ic: "🏠", name: "首页" },
  { id: "hall",      ic: "🎯", name: "训练大厅" },
  { id: "start",     ic: "✏️", name: "开始训练" },
  { id: "report",    ic: "📋", name: "训练报告" },
  { id: "growth",    ic: "📈", name: "成长中心" },
  { id: "knowledge", ic: "📚", name: "企业知识" },
  { id: "custsim",   ic: "👥", name: "客户模拟" },
  { id: "coach",     ic: "🧠", name: "AI 教练" },
  { id: "enterprise",ic: "🏢", name: "企业中心" },
  { id: "system",    ic: "⚙",  name: "系统管理" },
];

const WEIGHTED_DIMS = ["破冰能力","需求洞察","情绪价值","产品讲解","价值塑造","FABE","SPIN","异议处理","竞品应对","成交推进","客户信任","Closing","逻辑表达","专业程度","共情能力","语言感染力"];
const EMO_DIMS = ["Trust","Interest","Anxiety","Pressure","Excitement","Satisfaction","Confusion","Resistance"];
const EMO_CN = { Trust:"信任", Interest:"兴趣", Anxiety:"焦虑", Pressure:"压力", Excitement:"兴奋", Satisfaction:"满意", Confusion:"困惑", Resistance:"抗拒" };

const state = { session: null, role: "销售顾问" };

/* ---------- API（后端不可达时自动降级 Mock，保证离线/ GH Pages 可演示） ---------- */
const IS_GH = location.hostname.endsWith("github.io") || location.hostname.endsWith("githubusercontent.com");
const FORCE_DEMO = new URLSearchParams(location.search).has("demo");
let USE_MOCK = IS_GH || FORCE_DEMO;

async function api(method, url, body) {
  if (USE_MOCK && window.mockApi) return window.mockApi(method, url, body);
  try {
    const opt = { method, headers: { "Content-Type": "application/json" } };
    if (body) opt.body = JSON.stringify(body);
    const r = await fetch(url, opt);
    if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0,120)}`); }
    const ct = r.headers.get("content-type") || "";
    return ct.includes("json") ? r.json() : r.text();
  } catch (e) {
    if (!USE_MOCK && window.mockApi) { USE_MOCK = true; return window.mockApi(method, url, body); }
    throw e;
  }
}
const get = (u) => api("GET", u);
const post = (u, b) => api("POST", u, b);

/* ---------- 工具 ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function toast(msg, kind="") {
  const t = document.createElement("div");
  t.className = "toast " + kind; t.innerHTML = esc(msg);
  $("#toast").appendChild(t);
  setTimeout(() => { t.style.opacity="0"; setTimeout(()=>t.remove(),300); }, 2600);
}
function modal(html){ const m=$("#modal"); m.innerHTML=`<div class="modal">${html}</div>`; m.classList.add("show");
  m.onclick=(e)=>{ if(e.target===m) closeModal(); }; }
function closeModal(){ const m=$("#modal"); m.classList.remove("show"); m.innerHTML=""; }
function loadingHTML(n=3){ return Array.from({length:n}).map(()=>`<div class="skeleton" style="width:${60+Math.random()*30}%"></div>`).join(""); }
function fmtDate(s){ if(!s) return "—"; try{ return new Date(s).toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}); }catch(e){ return s; } }

/* 数字计数动画：扫描 .count:not(.done) 并滚动到 data-to */
function runCounts(){
  document.querySelectorAll(".count:not(.done)").forEach(el=>{
    el.classList.add("done");
    const to=parseFloat(el.dataset.to)||0; const dur=900; const t0=performance.now();
    const fmt=(v)=> Number.isInteger(to)? String(Math.round(v)) : v.toFixed(1);
    const step=(t)=>{ const p=Math.min(1,(t-t0)/dur); el.textContent=fmt(to*p); if(p<1) requestAnimationFrame(step); else el.textContent=fmt(to); };
    requestAnimationFrame(step);
  });
}

/* ---------- 路由 ---------- */
function route(){
  const hash = location.hash.replace(/^#\/?/, "") || "dashboard";
  const [page, q] = hash.split("?");
  const params = new URLSearchParams(q || "");
  renderNav(page);
  const view = $("#view");
  const handlers = {
    dashboard: pageDashboard, hall: pageHall, start: pageStart, report: pageReport,
    growth: pageGrowth, knowledge: pageKnowledge, custsim: pageCustSim, coach: pageCoach,
    enterprise: pageEnterprise, system: pageSystem,
  };
  (handlers[page] || pageDashboard)(view, params);
  // Pattern-A 横幅：dashboard/growth 显示
  renderCoachBanner(page);
  window.scrollTo(0,0);
  // 入场动效：错峰揭示卡片 + 数字计数
  requestAnimationFrame(()=>{
    [...view.children].forEach((el,i)=>{ el.classList.remove("rise"); void el.offsetWidth; el.style.animationDelay=(i*0.05)+"s"; el.classList.add("rise"); });
    runCounts();
  });
}
function renderNav(active){
  $("#nav").innerHTML = NAV.map(n=>
    `<div class="nav-item ${n.id===active?"active":""}" data-page="${n.id}"><span class="ic">${n.ic}</span>${esc(n.name)}</div>`
  ).join("");
  const cur = NAV.find(n=>n.id===active) || NAV[0];
  $("#crumb").textContent = cur.name;
}
$("#nav").addEventListener("click", e=>{ const it=e.target.closest(".nav-item"); if(it) location.hash = "#/"+it.dataset.page; });
$("#role-pill").textContent = state.role;
$("#avatar").textContent = "销";

/* ---------- Pattern-A 横幅 ---------- */
async function renderCoachBanner(page){
  const box = $("#coach-banner");
  if(page!=="dashboard" && page!=="growth"){ box.className=""; box.innerHTML=""; return; }
  try{
    const h = await get("/api/training/history");
    if(!h.length){ box.className=""; box.innerHTML=""; return; }
    // 取最近一次已结束报告，找短板
    let weak=null;
    for(const s of h){ if(s.total_score!=null){ /* 仅总分，弱维需报告 */ } }
    // 取最近带报告的会话
    const ended = h.find(s=>s.total_score!=null);
    if(ended){
      try{
        const rep = await get("/api/training/report/"+ended.session_id);
        const w = (rep.dimensions||[]).find(d=>d.score<65);
        if(w){ box.className="show"; box.innerHTML =
          `<div class="ai-ava">AI</div>
           <div class="cb-text"><b>检测到你「${esc(w.dimension)}」维度 ${w.score} 分（&lt;65）</b>
           <small>已生成专项训练，建议本周 3 次补强</small></div>
           <button class="btn primary sm" onclick="location.hash='#/start?goal=${encodeURIComponent(w.dimension)}'">立即训练 →</button>`;
          return; }
      }catch(e){}
    }
    box.className=""; box.innerHTML="";
  }catch(e){ box.className=""; box.innerHTML=""; }
}

/* =====================================================================
   页面：首页 Dashboard（IA §2 · 8 Widget）
   ===================================================================== */
async function pageDashboard(view){
  view.innerHTML = `<div class="section-title">🏠 首页 · 训练驾驶舱</div>
    <div class="grid cols-4" id="kpi"></div>
    <div class="grid cols-3" style="margin-top:16px">
      <div class="card"><h3>📊 能力雷达（最近一次）</h3><div class="radar-box"><canvas id="dash-radar" width="220" height="220"></canvas></div></div>
      <div class="card"><h3>🎯 今日训练</h3><div id="dash-today" class="list">${loadingHTML(2)}</div></div>
      <div class="card"><h3>🧭 世界态（05 World）</h3><div id="dash-world" class="muted" style="font-size:13px;line-height:1.8">
        季节：夏季<br>天气：高温 38℃<br>政策：以旧换新补贴 15%-20%<br><span class="pill warn">高温季·挂机/中央空调需求走高</span></div></div>
    </div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><h3>🏆 团队排行榜（示例）</h3><div id="dash-rank" class="list">${loadingHTML(3)}</div></div>
      <div class="card"><h3>⚡ 快捷入口</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
          <button class="btn primary" onclick="location.hash='#/start'">▶ 开始训练</button>
          <button class="btn" onclick="location.hash='#/knowledge'">📚 查知识</button>
          <button class="btn" onclick="location.hash='#/growth'">📈 看成长</button>
        </div>
        <p class="hint" style="margin-top:12px">AI Native Dashboard：关键动作主动呈现，不等人点击（UX U1）。</p>
      </div>
    </div>`;
  try{
    const [ov, h] = await Promise.all([get("/api/admin/overview"), get("/api/training/history")]);
    $("#kpi").innerHTML = [
      ["🎓 训练次数", ov.sessions],
      ["📈 平均得分", ov.avg_score],
      ["📚 知识条目", ov.knowledge],
      ["👥 团队人数", ov.users],
    ].map(([t,v])=>`<div class="card"><div class="kpi-lab">${t}</div><div class="kpi-val count" data-to="${v}">0</div></div>`).join("");
    // 今日训练
    const today = h.slice(0,5);
    $("#dash-today").innerHTML = today.length ? today.map(s=>
      `<div class="row-item" onclick="location.hash='#/report?sid=${s.session_id}'">
        <div class="ri-main"><div class="ri-title">训练会话 ${s.session_id}</div>
        <div class="ri-sub">${fmtDate(s.started_at)} · ${s.status==="ended"?"已结束":"进行中"}</div></div>
        <span class="pill ${s.total_score>=70?'good':(s.total_score>=60?'primary':'warn')}">${s.total_score??"—"}</span></div>`
    ).join("") : `<div class="empty"><div class="big">🗂️</div>还没有训练，去完成第一次吧</div>`;
    // 排行榜（示例：用历史分数）
    $("#dash-rank").innerHTML = (h.filter(s=>s.total_score!=null).slice(0,4).sort((a,b)=>b.total_score-a.total_score).length
      ? h.filter(s=>s.total_score!=null).sort((a,b)=>b.total_score-a.total_score).slice(0,4)
      : [{session_id:"你",total_score:ov.avg_score}]).map((s,i)=>
      `<div class="row-item"><span class="pill ${i===0?'good':'ai'}">#${i+1}</span>
       <div class="ri-main"><div class="ri-title">${s.session_id===ov.users?'你':esc(s.session_id)}</div></div>
       <b>${s.total_score??"—"}</b></div>`).join("");
    // 雷达
    const ended = h.find(s=>s.total_score!=null);
    if(ended){ try{ const rep=await get("/api/training/report/"+ended.session_id);
      drawRadar($("#dash-radar"), rep.dimensions.map(d=>({label:d.dimension,value:d.score}))); }catch(e){} }
  }catch(e){ toast("首页数据加载失败："+e.message,""); }
}

/* ---------- 雷达图（带绘制动画） ---------- */
function drawRadar(canvas, dims, anim=true){
  if(!canvas||!dims||!dims.length) return;
  const ctx=canvas.getContext("2d"); const W=canvas.width,H=canvas.height;
  const cx=W/2,cy=H/2,R=Math.min(W,H)/2-26; const n=dims.length;
  const css=getComputedStyle(document.body);
  const line=css.getPropertyValue("--line").trim()||"#dde3ea";
  const ink=css.getPropertyValue("--sub").trim()||"#6b7785";
  const primary=css.getPropertyValue("--cool").trim()||"#2ad8c9";
  let prog=anim?0:1;
  function frame(){
    ctx.clearRect(0,0,W,H);
    // 网格
    for(let g=1;g<=4;g++){ ctx.beginPath();
      for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n; const r=R*g/4;
        const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.closePath(); ctx.strokeStyle=line; ctx.lineWidth=1; ctx.stroke(); }
    // 轴线 + 标签
    ctx.fillStyle=ink; ctx.font="9px 'Space Mono',monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
    for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a)); ctx.strokeStyle=line; ctx.stroke();
      const lx=cx+(R+14)*Math.cos(a), ly=cy+(R+14)*Math.sin(a);
      ctx.fillText(dims[i].label.slice(0,2), lx, ly); }
    // 数据（随 prog 放大）
    ctx.beginPath();
    for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n; const r=R*(dims[i].value/100)*prog;
      const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.closePath(); ctx.fillStyle=primary+"33"; ctx.strokeStyle=primary; ctx.lineWidth=2; ctx.fill(); ctx.stroke();
    if(prog<1){ prog+=0.06; requestAnimationFrame(frame); }
  }
  frame();
}

/* =====================================================================
   页面：训练大厅（UF-02 入口）
   ===================================================================== */
async function pageHall(view){
  view.innerHTML = `<div class="section-title">🎯 训练大厅</div>
    <div class="grid cols-4">
      ${[["▶ 开始训练","从配置创建客户","start","primary"],["🎲 随机客户","系统随机生成","start?rand=1","ai"],
         ["🎯 专项训练","针对弱项强化","start","warn"],["👥 指定客户","选择历史客户","custsim",""]]
        .map(([t,d,to,k])=>`<div class="card" style="cursor:pointer" onclick="location.hash='#/${to}'">
          <div class="pill ${k}">${esc(t)}</div><div class="muted" style="font-size:12px;margin-top:8px">${esc(d)}</div></div>`).join("")}
    </div>
    <div class="card" style="margin-top:16px"><h3>📜 最近训练</h3><div id="hall-list" class="list">${loadingHTML(3)}</div></div>`;
  try{
    const h = await get("/api/training/history");
    $("#hall-list").innerHTML = h.length ? h.map(s=>
      `<div class="row-item" onclick="location.hash='#/report?sid=${s.session_id}'">
        <div class="ri-main"><div class="ri-title">会话 ${s.session_id}</div>
        <div class="ri-sub">${fmtDate(s.started_at)}</div></div>
        <span class="pill ${s.total_score>=70?'good':(s.total_score>=60?'primary':'warn')}">${s.total_score??"进行中"}</span>
        <button class="btn sm" onclick="event.stopPropagation();location.hash='#/train?sid=${s.session_id}'">继续</button></div>`
    ).join("") : `<div class="empty"><div class="big">🎯</div>还没有训练记录，点上方开始</div>`;
  }catch(e){ toast("加载失败："+e.message); }
}

/* =====================================================================
   页面：开始训练（配置表单）
   ===================================================================== */
function pageStart(view, params){
  const goal = params.get("goal") || "需求洞察";
  view.innerHTML = `<div class="section-title">✏️ 开始训练 · 配置</div>
    <div class="card" style="max-width:680px">
      <div class="grid cols-2">
        <div><label>客户城市</label><select id="f-city">${["上海","北京","成都","广州"].map(c=>`<option ${c==="上海"?"selected":""}>${c}</option>`).join("")}</select></div>
        <div><label>产品类型</label><select id="f-prod">${["挂机","柜机","中央空调","新风","热泵两联供"].map(p=>`<option ${p==="挂机"?"selected":""}>${p}</option>`).join("")}</select></div>
        <div><label>家庭结构</label><select id="f-fam">${["三口之家","二孩家庭","三代同堂","与老人同住","单身"].map(f=>`<option ${f==="三口之家"?"selected":""}>${f}</option>`).join("")}</select></div>
        <div><label>装修阶段</label><select id="f-dec">${["水电阶段","木工阶段","软装阶段","已入住"].map(d=>`<option ${d==="水电阶段"?"selected":""}>${d}</option>`).join("")}</select></div>
        <div><label>品牌</label><select id="f-brand">${["美的","格力","大金","海尔","日立"].map(b=>`<option ${b==="美的"?"selected":""}>${b}</option>`).join("")}</select></div>
        <div><label>难度</label><select id="f-diff">${["普通","困难","地狱","魔鬼"].map(d=>`<option ${d==="普通"?"selected":""}>${d}</option>`).join("")}</select></div>
      </div>
      <label>训练目标（弱项专项）</label>
      <select id="f-goal">${WEIGHTED_DIMS.map(d=>`<option ${d===goal?"selected":""}>${d}</option>`).join("")}</select>
      <div style="margin-top:18px;display:flex;gap:10px">
        <button class="btn primary" id="btn-start">🚀 生成客户并开始</button>
        <button class="btn" onclick="location.hash='#/custsim'">先预览客户画像</button>
      </div>
    </div>`;
  $("#btn-start").onclick = async ()=>{
    const cfg = { customer_type:$("#f-city").value, product:$("#f-prod").value, family_type:$("#f-fam").value,
      decoration_stage:$("#f-dec").value, brand:$("#f-brand").value, difficulty:$("#f-diff").value, training_goal:$("#f-goal").value };
    try{ const r = await post("/api/training/start", cfg);
      state.session = { sid:r.session_id, customer:r.customer, world:r.world, messages:[] };
      location.hash = "#/train?sid="+r.session_id;
    }catch(e){ toast("生成失败："+e.message); }
  };
}

/* =====================================================================
   页面：训练 UI（Pattern-B 三栏 · UF-02）
   ===================================================================== */
async function pageTrain(view, params){
  const sid = params.get("sid");
  if(!sid){ toast("缺少会话 ID"); location.hash="#/hall"; return; }
  if(!state.session || state.session.sid!==sid){
    try{ const rep = await get("/api/training/report/"+sid).catch(()=>null);
      // 续训：拉取已有会话消息困难（history 不返 messages），此处仅新开提示
      state.session = { sid, customer:null, world:null, messages:[] };
    }catch(e){}
  }
  view.innerHTML = `<div class="section-title">💬 AI 陪练 · 三栏训练</div>
    <div class="train-wrap">
      <div class="train-col left"><h4>👤 客户面板</h4><div id="cust-panel"><div class="skeleton"></div></div></div>
      <div class="train-col"><h4>💬 对话</h4><div class="chat" id="chat"></div>
        <div class="chat-input"><input id="msg" placeholder="输入销售话术，回车发送…" /><button class="btn primary" id="send">发送</button></div></div>
      <div class="train-col right"><h4>🧠 AI 观察（常驻）</h4><div id="obs" style="overflow:auto;flex:1">${loadingHTML(3)}</div>
        <button class="btn ai" id="end-btn" style="margin-top:10px;width:100%">结束训练 · 生成报告</button></div>
    </div>`;
  if(state.session.customer){ renderCustPanel(state.session.customer); }
  else { $("#cust-panel").innerHTML = `<div class="empty"><div class="big">👤</div>客户信息加载中…</div>`; }
  $("#send").onclick = ()=>sendTurn();
  $("#msg").addEventListener("keydown", e=>{ if(e.key==="Enter") sendTurn(); });
  $("#end-btn").onclick = ()=>endTraining();
}
async function sendTurn(){
  const inp=$("#msg"); const text=inp.value.trim(); if(!text) return;
  if(!state.session||!state.session.sid){ toast("会话未初始化"); return; }
  inp.value=""; inp.disabled=true;
  appendMsg("sales", text);
  const typing=document.createElement("div"); typing.className="msg customer shimmer"; $("#chat").appendChild(typing);
  try{
    const r = await post("/api/training/turn", { session_id:state.session.sid, message:text });
    typing.remove();
    appendMsg("customer", r.customer_reply);
    renderObs(r);
    if(state.session.customer) state.session.customer.emotion = r.emotion;
  }catch(e){ typing.remove(); toast("对话失败："+e.message); }
  finally{ inp.disabled=false; inp.focus(); }
}
function appendMsg(role, text){
  const d=document.createElement("div"); d.className="msg "+role; d.textContent=text;
  $("#chat").appendChild(d); $("#chat").scrollTop=$("#chat").scrollHeight;
}
function renderCustPanel(c){
  const b=c.basic_profile, f=c.family, h=c.house, comp=c.competitor;
  $("#cust-panel").innerHTML = `
    <div class="cust-block"><div class="t">基础档案</div><div class="v">${esc(b.city)}${esc(b.gender)} · ${b.age}岁 · ${esc(b.occupation)}<br>家庭年收入 ${b.income_wan}万 · ${esc(b.education)}</div></div>
    <div class="cust-block"><div class="t">家庭</div><div class="v">${esc(f.members)}（有孩=${f.has_child} 老人=${f.has_elder}）</div></div>
    <div class="cust-block"><div class="t">房屋</div><div class="v">${h.area}㎡ · ${esc(h.type)} · ${esc(h.orientation)} · ${esc(h.decoration_stage)}</div></div>
    <div class="cust-block"><div class="t">心理 / DNA</div><div class="v">DISC=${esc(c.psychology.DISC)} · MBTI=${esc(c.psychology.MBTI)} · 风险${esc(c.psychology.risk)}<br>购买意向 ${c.purchase_intent}</div></div>
    <div class="cust-block"><div class="t">竞品锚定</div><div class="v">已看：${esc(comp.visited.join("、")||"无")}<br>锚定价 ≈ ${comp.anchor_price}元</div></div>
    <div class="cust-block"><div class="t">家庭决策网络</div><div class="v">共识度 ${c.family_decision_network.consensus_score}<br>${c.family_decision_network.nodes.map(n=>`${esc(n.role)}:${esc(n.opinion)}`).join("；")}</div></div>`;
}
function renderObs(r){
  const e=r.emotion||{};
  const need = [["面积",true],["家庭",true],["需求",true],["预算",false],["痛点",false]];
  $("#obs").innerHTML = `
    <div class="obs-item"><b>😊 情绪 8 维</b><div class="emotion-grid">${EMO_DIMS.map(k=>
      `<div class="emo"><div class="lab"><span>${EMO_CN[k]}</span><span>${e[k]??"—"}</span></div><div class="bar"><i style="width:${e[k]??0}%"></i></div></div>`).join("")}</div></div>
    ${r.signals&&r.signals.length?`<div class="obs-item warn"><b>🔔 成交信号</b><div style="margin-top:4px">${r.signals.map(s=>"· "+esc(s)).join("<br>")}</div></div>`:""}
    ${r.ai_tips&&r.ai_tips.length?`<div class="obs-item"><b>💡 AI 提醒</b><div style="margin-top:4px">${r.ai_tips.map(t=>"· "+esc(t)).join("<br>")}</div></div>`:""}
    ${r.knowledge_refs&&r.knowledge_refs.length?`<div class="obs-item"><b>📚 知识引用</b><div style="margin-top:4px">${r.knowledge_refs.map(k=>"· "+esc(k.title)).join("<br>")}</div></div>`:""}
    <div class="obs-item"><b>🎯 需求漏斗</b><div style="margin-top:4px"><span class="need-chip ok">面积✓</span><span class="need-chip ok">家庭✓</span><span class="need-chip ok">需求✓</span><span class="need-chip no">预算✗</span><span class="need-chip no">痛点✗</span></div></div>`;
}
async function endTraining(){
  if(!confirm("结束训练并生成 16 维报告？")) return;
  try{
    const r = await post("/api/training/end", { session_id:state.session.sid });
    showReport(r);
    toast("训练完成！+"+Math.round(r.total_score)+" 成长值","good");
  }catch(e){ toast("结束失败："+e.message); }
}

/* =====================================================================
   页面：训练报告（IA §7 · Pattern-D Golden Script）
   ===================================================================== */
async function pageReport(view, params){
  const sid=params.get("sid");
  let rep=null;
  if(sid){ try{ rep = await get("/api/training/report/"+sid); }catch(e){ toast("报告未生成"); } }
  if(!rep){ view.innerHTML=`<div class="empty"><div class="big">📋</div>请从训练大厅或首页选择一次训练查看报告</div>`; return; }
  showReport(rep, view);
}
function showReport(rep, view){
  view = view || $("#view");
  const dims=rep.dimensions||[];
  view.innerHTML = `<div class="section-title">📋 训练报告 · ${rep.level}（${rep.total_score} 分）</div>
    <div class="grid cols-2">
      <div class="card"><h3>📊 16 维能力评分</h3>
        ${dims.map(d=>`<div class="dim-row"><div class="nm">${esc(d.dimension)} <span class="weight-tag">权${d.weight}</span></div>
          <div class="bar"><i style="width:${d.score}%;background:${d.score<65?'var(--bad)':(d.score>=85?'var(--good)':'var(--primary)')}"></i></div>
          <div class="sc ${d.score<65?'weak':(d.score>=85?'strong':'')}">${d.score}</div></div>
          <div class="muted" style="font-size:11.5px;margin:-4px 0 6px 106px">${esc(d.suggestion)}</div>`).join("")}
      </div>
      <div class="card"><h3>🎯 雷达 & 心理</h3><div class="radar-box"><canvas id="rep-radar" width="260" height="260"></canvas></div>
        <div id="psy" class="muted" style="font-size:12.5px;line-height:1.8"></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px"><h3>💡 下一步建议</h3>
      <div style="display:flex;flex-direction:column;gap:6px">${(rep.next_steps||[]).map(s=>`<div class="pill primary">${esc(s)}</div>`).join("")}</div>
      <button class="btn primary" style="margin-top:14px" id="gs-btn">✨ 查看 Golden Script（三档）</button>
    </div>`;
  drawRadar($("#rep-radar"), dims.map(d=>({label:d.dimension,value:d.score})));
  const p=rep.psychology||{};
  $("#psy").innerHTML = `信任度：${p.trust_level??"—"} ｜ 购买意向：${p.purchase_intent??"—"}<br>抗拒度：${p.resistance??"—"} ｜ 决策阶段：${esc(p.decision_stage||"—")}<br>
    <span class="pill good">已掌握：${(rep.ability_change?.improved||[]).join("、")||"无"}</span> <span class="pill warn">待提升：${(rep.ability_change?.to_improve||[]).join("、")||"无"}</span>`;
  $("#gs-btn").onclick = ()=>showGoldenScript(rep);
}
function showGoldenScript(rep){
  const normal = "我们这款其实也不算贵，您可以考虑一下。";
  const good = "把总价拆成'每天不到一杯奶茶钱'的日均成本，再对比五年电费节省，价值就出来了。";
  const champ = rep.golden_script || "（销冠话术缺失）";
  modal(`<h3 style="margin-top:0">✨ Golden Script · 重构「价格异议」</h3>
    <div class="gs-tier"><b>普通</b>${esc(normal)}</div>
    <div class="gs-tier"><b>优秀</b>${esc(good)}</div>
    <div class="gs-tier champ"><b>🏆 销冠</b>${esc(champ)}</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn primary sm" onclick="navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(champ).replace(/"/g,"'")});toast('已复制销冠话术','good')">📋 复制销冠话术</button>
      <button class="btn sm" onclick="closeModal()">关闭</button></div>`);
}

/* =====================================================================
   页面：成长中心（UF-05）
   ===================================================================== */
async function pageGrowth(view){
  view.innerHTML=`<div class="section-title">📈 成长中心 · 能力树</div>
    <div class="grid cols-4" id="grow-kpi"></div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><h3>🌳 16 维能力树（最近报告）</h3><div id="grow-tree">${loadingHTML(4)}</div></div>
      <div class="card"><h3>🎖️ 勋章墙</h3><div id="grow-badge" style="display:flex;gap:10px;flex-wrap:wrap">${loadingHTML(3)}</div>
        <h3 style="margin-top:14px">🔥 连续训练</h3><div id="grow-streak" class="muted">加载中…</div></div>
    </div>`;
  try{
    const h=await get("/api/training/history");
    const ended=h.filter(s=>s.total_score!=null);
    const avg = ended.length? Math.round(ended.reduce((a,s)=>a+s.total_score,0)/ended.length):0;
    const best = ended.length? Math.max(...ended.map(s=>s.total_score)):0;
    const weakDim = await latestWeak(h);
    $("#grow-kpi").innerHTML=[
      ["🎓 训练次数", h.length],
      ["⭐ 平均分", avg],
      ["🏆 最佳", best],
    ].map(([t,v])=>`<div class="card"><div class="kpi-lab">${t}</div><div class="kpi-val count" data-to="${v}">0</div></div>`).join("")
    + `<div class="card"><div class="kpi-lab">📉 待提升维</div><div class="kpi-val" style="font-size:20px">${weakDim||"—"}</div></div>`;
    const rep=await latestReport(h);
    $("#grow-tree").innerHTML = rep ? rep.dimensions.map(d=>{
      const lvl=d.score>=85?"good":(d.score>=65?"primary":"warn");
      return `<div class="dim-row"><div class="nm">${esc(d.dimension)}</div><div class="bar"><i style="width:${d.score}%;background:var(--${lvl})"></i></div><div class="sc ${d.score<65?'weak':''}">${d.score}</div></div>`;
    }).join("") : `<div class="empty"><div class="big">🌱</div>完成训练后解锁能力树</div>`;
    $("#grow-badge").innerHTML=[
      ["🎯","首单模拟",ended.length>=1],["🔥","连续3训",false],["🏆","销冠之路",false],["📚","知识达人",false],["💡","异议克星",false],
    ].map(([ic,nm,on])=>`<div style="text-align:center;opacity:${on?1:.35}"><div style="font-size:26px">${ic}</div><div class="muted" style="font-size:11px">${nm}</div></div>`).join("");
    $("#grow-streak").innerHTML=`已训练 ${h.length} 次 · 保持节奏，短板维度每周专项 3 次即可点亮 🌳`;
  }catch(e){ toast("成长数据加载失败："+e.message); }
}
async function latestReport(h){
  const ended=h.find(s=>s.total_score!=null); if(!ended) return null;
  try{ return await get("/api/training/report/"+ended.session_id); }catch(e){ return null; }
}
async function latestWeak(h){ const r=await latestReport(h); return r?(r.dimensions.find(d=>d.score<65)||{}).dimension:null; }

/* =====================================================================
   页面：企业知识（UF-06 · RAG）
   ===================================================================== */
function pageKnowledge(view){
  view.innerHTML=`<div class="section-title">📚 企业知识 · RAG</div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:10px">
        <input id="kb-q" placeholder="搜知识或问 AI，如：能效 APF 怎么解释 / 中央空调怎么选" />
        <button class="btn primary" id="kb-search">🔍 检索</button>
        <button class="btn ai" id="kb-ask">🤖 问 AI</button>
      </div>
      <div id="kb-result" style="margin-top:12px"></div>
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>📖 知识库</h3><div id="kb-list">${loadingHTML(3)}</div></div>
      <div class="card"><h3>➕ 录入知识</h3>
        <input id="kba-title" placeholder="标题" /><textarea id="kba-content" rows="4" placeholder="内容"></textarea>
        <div class="grid cols-2"><select id="kba-cat">${["product","faq","solution","installation","competitor","policy"].map(c=>`<option>${c}</option>`).join("")}</select>
        <input id="kba-tags" placeholder="标签,逗号分隔" /></div>
        <button class="btn primary sm" style="margin-top:10px" id="kba-add">保存</button>
      </div>
    </div>`;
  const run=async(which)=>{
    const q=$("#kb-q").value.trim(); if(!q){ toast("请输入问题"); return; }
    $("#kb-result").innerHTML=loadingHTML(2);
    try{
      if(which==="search"){ const hits=await get("/api/knowledge/search?q="+encodeURIComponent(q)+"&k=5");
        $("#kb-result").innerHTML = hits.length? hits.map(h=>`<div class="kb-card"><span class="pill">${esc(h.category||"")}</span> <b>${esc(h.title)}</b>
          <div class="content">${esc(h.content)}</div><div class="muted" style="font-size:11px">相关度 ${Math.round((h.score||0)*100)}%</div></div>`).join("")
          : `<div class="empty"><div class="big">🔍</div>知识库暂无相关内容（不编造，建议通过知识运营中心补充）</div>`;
      } else { const r=await post("/api/knowledge/ask",{question:q});
        $("#kb-result").innerHTML=`<div class="kb-card" style="border-color:var(--ai)"><span class="pill ai">AI 解答</span>
          <div class="content" style="color:var(--ink);margin-top:6px">${esc(r.answer)}</div>
          <div class="muted" style="font-size:11px;margin-top:6px">置信度：${esc(r.confidence)} ｜ 来源：${(r.evidence||[]).map(e=>esc(e.title)).join("、")||"无"}</div></div>`;
      }
    }catch(e){ toast("查询失败："+e.message); }
  };
  $("#kb-search").onclick=()=>run("search"); $("#kb-ask").onclick=()=>run("ask");
  $("#kba-add").onclick=async()=>{ try{ await post("/api/knowledge/add",{title:$("#kba-title").value,content:$("#kba-content").value,
    category:$("#kba-cat").value,tags:$("#kba-tags").value}); toast("知识已保存","good"); $("#kba-title").value="";$("#kba-content").value=""; loadKbList(); }catch(e){ toast("保存失败："+e.message);} };
  loadKbList();
  async function loadKbList(){
    try{ const list=await get("/api/knowledge/list");
      $("#kb-list").innerHTML=list.map(k=>`<div class="kb-card"><span class="pill">${esc(k.category)}</span> <b>${esc(k.title)}</b>
        <span class="muted">· ${esc(k.brand||"通用")}</span><div class="content">${esc((k.content||"").slice(0,70))}…</div></div>`).join("");
    }catch(e){ $("#kb-list").innerHTML="加载失败"; }
  }
}

/* =====================================================================
   页面：客户模拟（04 数字孪生预览）
   ===================================================================== */
function pageCustSim(view){
  view.innerHTML=`<div class="section-title">👥 客户模拟 · 数字孪生</div>
    <div class="card" style="max-width:680px;margin-bottom:16px">
      <div class="grid cols-3">
        <div><label>城市</label><select id="cs-city">${["上海","北京","成都","广州"].map(c=>`<option ${c==="上海"?"selected":""}>${c}</option>`).join("")}</select></div>
        <div><label>产品</label><select id="cs-prod">${["挂机","柜机","中央空调","新风","热泵两联供"].map(p=>`<option ${p==="中央空调"?"selected":""}>${p}</option>`).join("")}</select></div>
        <div><label>难度</label><select id="cs-diff">${["普通","困难","地狱","魔鬼"].map(d=>`<option ${d==="困难"?"selected":""}>${d}</option>`).join("")}</select></div>
      </div>
      <button class="btn ai" style="margin-top:14px" id="cs-gen">🎲 生成数字孪生</button>
    </div>
    <div id="cs-out"></div>`;
  $("#cs-gen").onclick=async()=>{ const cfg={customer_type:$("#cs-city").value,product:$("#cs-prod").value,difficulty:$("#cs-diff").value};
    $("#cs-out").innerHTML=loadingHTML(4);
    try{ const r=await post("/api/customer/preview",cfg); renderCustPanelPreview(r.customer); }
    catch(e){ toast("生成失败："+e.message); } };
}
function renderCustPanelPreview(c){
  $("#cs-out").innerHTML=`<div class="card" style="max-width:680px"><h3>🧬 数字客户孪生</h3>
    <pre style="white-space:pre-wrap;font-size:12.5px;line-height:1.7;color:var(--sub)">${esc(customerSummaryText(c))}</pre>
    <button class="btn primary sm" onclick="location.hash='#/start'">用此画像开始训练</button></div>`;
}
// 复用后端摘要文本（前端简单复刻，保证预览离线可用）
function customerSummaryText(c){
  const b=c.basic_profile,f=c.family,h=c.house,bud=c.budget,psy=c.psychology;
  return `客户：${b.city}${b.gender}，${b.age}岁，${b.occupation}，家庭年收入${b.income_wan}万。\n家庭结构：${f.members}（有孩=${f.has_child}，有老人=${f.has_elder}）。\n房屋：${h.area}㎡，${h.type}，${h.orientation}，装修阶段：${h.decoration_stage}。\n预算：预期${bud.expected}元，弹性${bud.elasticity}。\n心理：DISC=${psy.DISC}，MBTI=${psy.MBTI}，风险偏好${psy.risk}。\n已看竞品：${c.competitor.visited.join("、")}，锚定价约${c.competitor.anchor_price}元。\n当前情绪：信任${c.emotion.Trust}/兴趣${c.emotion.Interest}/抗拒${c.emotion.Resistance}。`;
}

/* =====================================================================
   页面：AI 教练（Pattern-A 中心化）
   ===================================================================== */
async function pageCoach(view){
  view.innerHTML=`<div class="section-title">🧠 AI 教练 · 主动陪练中枢</div>
    <div class="grid cols-2">
      <div class="card"><h3>📌 今日推荐场景（05 World）</h3><div id="coach-rec">${loadingHTML(2)}</div></div>
      <div class="card"><h3>🩹 短板预警</h3><div id="coach-weak">${loadingHTML(2)}</div></div>
    </div>`;
  try{
    const h=await get("/api/training/history"); const rep=await latestReport(h);
    const recs=[["高温 38℃","推挂机/中央空调制冷快方案","primary"],["以旧换新补贴","用补贴冲关价格异议","good"],["回南天","推除湿+防直吹话术","warn"]];
    $("#coach-rec").innerHTML=recs.map(([t,d,k])=>`<div class="row-item"><span class="pill ${k}">场景</span><div class="ri-main"><div class="ri-title">${esc(t)}</div><div class="ri-sub">${esc(d)}</div></div></div>`).join("");
    const weak=(rep?rep.dimensions.filter(d=>d.score<65):[]);
    $("#coach-weak").innerHTML = weak.length? weak.map(d=>`<div class="row-item" onclick="location.hash='#/start?goal=${encodeURIComponent(d.dimension)}'">
      <span class="pill warn">${d.score}</span><div class="ri-main"><div class="ri-title">${esc(d.dimension)} 偏弱</div><div class="ri-sub">${esc(d.suggestion)}</div></div><span class="btn sm primary">去训练</span></div>`).join("")
      : `<div class="empty"><div class="big">✅</div>暂无显著短板，挑战更高难度吧</div>`;
  }catch(e){ toast("加载失败："+e.message); }
}

/* =====================================================================
   页面：企业中心（UF-09 / 五大 Ops）
   ===================================================================== */
async function pageEnterprise(view){
  view.innerHTML=`<div class="section-title">🏢 企业中心 · 五大 Ops</div>
    <div class="grid cols-4" id="ent-kpi"></div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><h3>👥 团队成员（9 角色）</h3><div id="ent-users">${loadingHTML(3)}</div></div>
      <div class="card"><h3>⚙ 运营中心</h3>
        <div class="list">
          <div class="row-item"><span class="pill ai">Knowledge Ops</span><div class="ri-main"><div class="ri-title">知识运营</div><div class="ri-sub">draft→review→active→deprecated</div></div></div>
          <div class="row-item"><span class="pill ai">Experience</span><div class="ri-main"><div class="ri-title">经验市场</div><div class="ri-sub">BP 卡沉淀与分发</div></div></div>
          <div class="row-item"><span class="pill ai">AIOps</span><div class="ri-main"><div class="ri-title">AI 运维</div><div class="ri-sub">模型路由/成本/幻觉率</div></div></div>
          <div class="row-item"><span class="pill ai">Sales Excellence</span><div class="ri-main"><div class="ri-title">销售卓越</div><div class="ri-sub">团队能力热力图</div></div></div>
          <div class="row-item"><span class="pill warn">Governance</span><div class="ri-main"><div class="ri-title">治理中心</div><div class="ri-sub">租户隔离/审计/数据驻留</div></div></div>
        </div></div>
    </div>`;
  try{
    const [ov,users]=await Promise.all([get("/api/admin/overview"),get("/api/admin/users")]);
    $("#ent-kpi").innerHTML=[["👥 用户",ov.users],["📚 知识",ov.knowledge],["🎓 会话",ov.sessions],["📈 平均分",ov.avg_score]]
      .map(([t,v])=>`<div class="card"><div class="kpi-lab">${t}</div><div class="kpi-val count" data-to="${v}">0</div></div>`).join("");
    $("#ent-users").innerHTML=users.map(u=>{ const roleMap={super_admin:"超级管理员",enterprise_admin:"企业管理员",training_manager:"培训经理",store_manager:"店长",sales_manager:"销售经理",sales_consultant:"销售顾问",installation_manager:"安装经理",aftersales_manager:"售后经理",brand_admin:"品牌管理员"};
      return `<div class="row-item"><div class="ri-main"><div class="ri-title">${esc(u.name)}</div><div class="ri-sub">${roleMap[u.role]||u.role}</div></div><span class="pill">${esc(u.role)}</span></div>`;}).join("");
  }catch(e){ toast("企业数据加载失败："+e.message); }
}

/* =====================================================================
   页面：系统管理
   ===================================================================== */
async function pageSystem(view){
  let health="…"; try{ const h=await get("/api/health"); health=h.status; }catch(e){ health="down"; }
  view.innerHTML=`<div class="section-title">⚙ 系统管理</div>
    <div class="grid cols-2">
      <div class="card"><h3>🩺 服务健康</h3><div style="font-size:15px"><span class="pill ${health==="ok"?"good":"warn"}">${health==="ok"?"运行正常":"异常"}</span>
        <p class="hint">后端：FastAPI + SQLite + BM25 RAG + DeepSeek（mock 兜底）。</p></div></div>
      <div class="card"><h3>🔐 租户隔离</h3><div class="muted" style="font-size:13px;line-height:1.8">
        tenant_id / brand / store_id / role 参数化隔离<br>所有 AI 回答带 evidence 溯源（03 §6 幻觉治理）<br>越权操作 ABAC 拦截 + 审计（UF-09）</div></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>📜 9 角色 × 10 菜单权限（摘要）</h3>
      <div class="muted" style="font-size:12.5px;line-height:1.9">
        销售顾问：训练/知识/成长（△ 受限企业后台）｜ 销售经理：+ 团队能力只读 ｜ 培训经理：+ 知识运营 ｜ 店长：本店业绩 △ ｜
        企业/超级管理员：全权限 + 治理中心。切换角色后导航与作用域实时重算（UF-10），不重建路由。</div></div>`;
}

/* ---------- 主题 / 移动抽屉 ---------- */
function initChrome(){
  const t=localStorage.getItem("theme"); if(t) document.documentElement.setAttribute("data-theme",t);
  $("#theme-toggle").onclick=()=>{ const cur=document.documentElement.getAttribute("data-theme");
    const next=cur==="dark"?"light":"dark"; document.documentElement.setAttribute("data-theme",next);
    localStorage.setItem("theme",next); };
  $("#drawer-btn").onclick=()=>{ $("#sidebar").classList.toggle("open"); $("#drawer-mask").classList.add("show"); };
  $("#drawer-mask").onclick=()=>{ $("#sidebar").classList.remove("open"); $("#drawer-mask").classList.remove("show"); };
  $("#nav").addEventListener("click",()=>{ $("#sidebar").classList.remove("open"); $("#drawer-mask").classList.remove("show"); });
}
window.addEventListener("hashchange", route);
// 监听视图变化，自动触发数字计数动画（覆盖异步加载的 KPI）
new MutationObserver(()=>runCounts()).observe(document.getElementById("view"), { childList:true, subtree:true });
initChrome();
route();
