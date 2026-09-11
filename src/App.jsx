import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Cpu,
  Droplets,
  Gauge,
  History as HistoryIcon,
  Package,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Snowflake,
  Square,
  Thermometer,
  Timer,
  Wrench,
  Wind,
  X,
  Zap,
} from "lucide-react";

const INITIAL_TOOLS = [
  { id:"T01", name:"8mm Carbide End Mill", type:"End Mill", machine:"VMC-01", maxLife:120, usedLife:48.5, parts:184, location:"Rack A1", replacements:3, breakDuration:15 },
  { id:"T02", name:"10mm Carbide Drill", type:"Drill", machine:"VMC-02", maxLife:80, usedLife:61.5, parts:342, location:"Rack A2", replacements:5, breakDuration:15 },
  { id:"T03", name:"12mm Face Mill", type:"Face Mill", machine:"VMC-03", maxLife:150, usedLife:73, parts:421, location:"Rack B1", replacements:2, breakDuration:15 },
  { id:"T04", name:"6mm Ball Nose", type:"Ball Nose", machine:"VMC-01", maxLife:100, usedLife:29, parts:115, location:"Rack B2", replacements:2, breakDuration:15 },
  { id:"T05", name:"16mm Roughing End Mill", type:"Roughing End Mill", machine:"VMC-04", maxLife:180, usedLife:153, parts:612, location:"Rack C1", replacements:7, breakDuration:15 },
];

const INITIAL_MACHINES = [
  { id:"VMC-01", name:"Vertical Machining Center 01", spindleLoad:62, spindleTemp:58, vibration:2.8, xLoad:38, yLoad:42, zLoad:46, xError:.004, yError:.003, zError:.005, coolantLevel:78, coolantFlow:92, coolantTemp:24, lubeLevel:74, lubePressure:5.1, airPressure:6.2, voltage:400, current:12, driveTemp:49, cabinetTemp:36, motorTemp:52, safety:true, controller:"READY", alarm:"" },
  { id:"VMC-02", name:"Vertical Machining Center 02", spindleLoad:88, spindleTemp:71, vibration:6.8, xLoad:51, yLoad:57, zLoad:49, xError:.006, yError:.005, zError:.008, coolantLevel:64, coolantFlow:68, coolantTemp:29, lubeLevel:61, lubePressure:4.8, airPressure:6.0, voltage:401, current:17, driveTemp:57, cabinetTemp:38, motorTemp:63, safety:true, controller:"READY", alarm:"" },
  { id:"VMC-03", name:"Vertical Machining Center 03", spindleLoad:94, spindleTemp:79, vibration:8.2, xLoad:59, yLoad:62, zLoad:66, xError:.011, yError:.009, zError:.014, coolantLevel:41, coolantFlow:57, coolantTemp:32, lubeLevel:38, lubePressure:4.0, airPressure:5.8, voltage:398, current:21, driveTemp:68, cabinetTemp:43, motorTemp:72, safety:true, controller:"READY", alarm:"" },
  { id:"VMC-04", name:"Vertical Machining Center 04", spindleLoad:54, spindleTemp:55, vibration:2.1, xLoad:35, yLoad:39, zLoad:43, xError:.003, yError:.004, zError:.004, coolantLevel:18, coolantFlow:42, coolantTemp:28, lubeLevel:23, lubePressure:3.2, airPressure:5.1, voltage:402, current:11, driveTemp:48, cabinetTemp:35, motorTemp:50, safety:true, controller:"READY", alarm:"" },
];

const INITIAL_HISTORY = [
  {id:1,type:"runtime",toolId:"T02",toolName:"10mm Carbide Drill",machine:"VMC-02",date:"Today",duration:32.4,workType:"Heavy Work",description:"Production session completed"},
  {id:2,type:"runtime",toolId:"T03",toolName:"12mm Face Mill",machine:"VMC-03",date:"Today",duration:44.2,workType:"Heavy Work",description:"Production session completed"},
  {id:3,type:"cooling",toolId:"T02",toolName:"10mm Carbide Drill",machine:"VMC-02",date:"Today",duration:15,workType:"Heavy Work",description:"Cooling break completed"},
  {id:4,type:"replacement",toolId:"T06",toolName:"5mm Carbide Drill",machine:"VMC-04",date:"Yesterday",duration:0,workType:"-",description:"Tool replaced after reaching life limit"},
];

const fmt = s => {
  s = Math.max(0, Math.floor(s || 0));
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
};
const pct = (a,b) => b ? Math.min(100,(a/b)*100) : 0;
const toolStatus = (a,b) => pct(a,b)>=95 ? "Critical" : pct(a,b)>=80 ? "Warning" : "Healthy";
const cls = s => s.toLowerCase();

function machineFindings(m, tools) {
  const f = [];
  const add = (severity, subsystem, title, cause, action, evidence) =>
    f.push({severity,subsystem,title,cause,action,evidence});
  if (m.spindleLoad >= 90) add("Critical","Spindle","Spindle overload detected","Cutting load is above the configured operating threshold.","Stop or reduce cutting load; inspect tool condition, feeds/speeds and workholding.",`Spindle load ${m.spindleLoad}%`);
  else if (m.spindleLoad >= 80) add("Warning","Spindle","High spindle load","Spindle is operating under elevated load.","Review cutting parameters and tool wear before continuing.",`Spindle load ${m.spindleLoad}%`);
  if (m.vibration >= 7) add("Critical","Spindle","High spindle vibration","Possible tool wear, holder runout, imbalance or cutting instability.","Stop operation and inspect tool, holder, setup and cutting parameters.",`Vibration ${m.vibration} mm/s`);
  else if (m.vibration >= 5) add("Warning","Spindle","Elevated vibration","Vibration is above the configured attention threshold.","Inspect tool wear and tool-holder condition.",`Vibration ${m.vibration} mm/s`);
  if (m.spindleTemp >= 75) add("Critical","Spindle","Spindle temperature high","Thermal load is above the configured threshold.","Stop if temperature continues rising; inspect cooling and spindle load.",`Spindle ${m.spindleTemp}°C`);
  else if (m.spindleTemp >= 68) add("Warning","Spindle","Spindle temperature elevated","Spindle temperature is approaching the configured limit.","Check load and cooling before extended operation.",`Spindle ${m.spindleTemp}°C`);
  if (m.coolantLevel < 25) add("Critical","Coolant","Coolant level low","Coolant reservoir is near the configured minimum.","Refill coolant and verify pump/flow before production.",`Level ${m.coolantLevel}%`);
  if (m.coolantFlow < 60) add("Warning","Coolant","Coolant flow low","Measured coolant flow is below the configured threshold.","Check coolant level, filter, pump and nozzle blockage.",`Flow ${m.coolantFlow}%`);
  if (m.lubeLevel < 25 || m.lubePressure < 3.5) add("Warning","Lubrication","Lubrication system needs attention","Oil level or pressure is below the configured threshold.","Check lubrication reservoir, pump and pressure line.",`Level ${m.lubeLevel}% · Pressure ${m.lubePressure} bar`);
  if (m.airPressure < 5.5) add("Warning","Pneumatic","Air pressure low","Machine air supply is below the configured operating threshold.","Check compressor, regulator, hose and leakage.",`Air ${m.airPressure} bar`);
  if (Math.max(m.xError,m.yError,m.zError) > .02) add("Critical","Axes","Axis positioning error","Position error exceeds the configured threshold.","Stop and inspect servo/encoder feedback, guides and mechanical load.",`Max error ${Math.max(m.xError,m.yError,m.zError).toFixed(3)} mm`);
  if (m.driveTemp >= 70) add("Critical","Electrical / Drive","Drive temperature high","Drive thermal reading is above the configured threshold.","Check cabinet cooling, drive load and ventilation.",`Drive ${m.driveTemp}°C`);
  if (m.cabinetTemp >= 45) add("Warning","Thermal","Electrical cabinet temperature high","Cabinet temperature is above the configured attention threshold.","Inspect cabinet ventilation and cooling fan.",`Cabinet ${m.cabinetTemp}°C`);
  if (m.motorTemp >= 75) add("Critical","Thermal","Motor temperature high","Motor thermal reading is above the configured threshold.","Reduce load and inspect motor cooling.",`Motor ${m.motorTemp}°C`);
  if (!m.safety) add("Critical","Safety","Safety circuit not healthy","Door/interlock or emergency-stop circuit is not reporting ready.","Do not run machine; inspect safety circuit and reset only after safe verification.","Safety circuit not ready");
  if (m.alarm) add("Critical","CNC Controller",`Controller alarm: ${m.alarm}`,"The CNC controller reports an active alarm.","Resolve the controller alarm according to the machine maintenance procedure.",m.alarm);
  const tool = tools.find(t=>t.machine===m.id);
  if (tool && pct(tool.usedLife,tool.maxLife)>=90) add(pct(tool.usedLife,tool.maxLife)>=95?"Critical":"Warning","Tool & Holder","Tool life nearing limit","The installed/assigned tool has high accumulated cutting runtime.","Inspect wear and replace the tool before quality or process stability is affected.",`${tool.id} · ${pct(tool.usedLife,tool.maxLife).toFixed(0)}% life used`);
  return f;
}

function App() {
  const [page,setPage] = useState("overview");
  const [tools,setTools] = useState(INITIAL_TOOLS);
  const [machines,setMachines] = useState(INITIAL_MACHINES);
  const [history,setHistory] = useState(INITIAL_HISTORY);
  const [sessions,setSessions] = useState({});
  const [cooling,setCooling] = useState({});
  const [configs,setConfigs] = useState(Object.fromEntries(INITIAL_TOOLS.map(t=>[t.id,{mode:"Normal Work",limit:t.id==="T02"?60:90}])));
  const [selectedMachine,setSelectedMachine] = useState("VMC-03");
  const [search,setSearch] = useState("");
  const [now,setNow] = useState(Date.now());
  const [notification,setNotification] = useState("");
  const [showAdd,setShowAdd] = useState(false);
  const [diagnosis,setDiagnosis] = useState(null);
  const [scenario,setScenario] = useState("Normal");
  const [newTool,setNewTool] = useState({name:"",type:"End Mill",machine:"VMC-01",maxLife:100,location:"Rack A1",breakDuration:15});

  useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),250); return()=>clearInterval(id); },[]);
  useEffect(()=>{
    Object.values(sessions).forEach(s=>{
      if(s.mode==="Heavy Work" && now >= s.startedAt+s.limit*60000) finishSession(s.toolId,true);
    });
    Object.entries(cooling).forEach(([toolId,c])=>{
      if(now>=c.endAt){
        setCooling(x=>{const n={...x}; delete n[toolId]; return n;});
        setHistory(h=>[{id:Date.now()+Math.random(),type:"cooling",toolId,toolName:c.toolName,machine:c.machine,date:"Today",duration:c.duration,workType:"Heavy Work",description:"Configured cooling break completed"},...h]);
        setNotification(`${c.toolName}: cooling complete. Start is enabled again.`);
      }
    });
  },[now]);

  useEffect(()=>{if(notification){const t=setTimeout(()=>setNotification(""),4500);return()=>clearTimeout(t)}},[notification]);

  const activeCount=Object.keys(sessions).length;
  const coolingCount=Object.keys(cooling).length;
  const selectedM=machines.find(m=>m.id===selectedMachine);
  const findings=selectedM ? machineFindings(selectedM,tools) : [];
  const criticalTools=tools.filter(t=>toolStatus(t.usedLife,t.maxLife)==="Critical").length;
  const warningTools=tools.filter(t=>toolStatus(t.usedLife,t.maxLife)==="Warning").length;
  const machineHealth = m => {
    const fs=machineFindings(m,tools);
    return fs.some(x=>x.severity==="Critical")?"Abnormal":fs.length?"Attention":"Normal";
  };

  function startSession(tool) {
    const c=configs[tool.id]||{mode:"Normal Work",limit:60};
    if(sessions[tool.id]) return;
    if(cooling[tool.id]) { setNotification(`${tool.id} is cooling. Start is locked until the break ends.`); return; }
    if(tool.usedLife>=tool.maxLife){setNotification(`${tool.id} has reached its tool-life limit. Replace it first.`);return;}
    if(Object.values(sessions).some(s=>s.machine===tool.machine)){setNotification(`${tool.machine} already has an active cutting session. Multiple machines can run simultaneously.`);return;}
    setSessions(x=>({...x,[tool.id]:{toolId:tool.id,toolName:tool.name,machine:tool.machine,mode:c.mode,limit:Number(c.limit)||60,startedAt:Date.now()}}));
    setNotification(`${tool.id} started on ${tool.machine}.`);
  }

  function finishSession(toolId,forced=false) {
    const s=sessions[toolId];
    if(!s) return;
    const tool=tools.find(t=>t.id===toolId);
    if(!tool) return;
    const minutes=Math.max(0,(Date.now()-s.startedAt)/60000);
    setTools(ts=>ts.map(t=>t.id===toolId?{...t,usedLife:Math.min(t.maxLife,t.usedLife+minutes)}:t));
    setHistory(h=>[{id:Date.now()+Math.random(),type:"runtime",toolId,toolName:s.toolName,machine:s.machine,date:"Today",duration:minutes,workType:s.mode,description:forced?"Continuous-run limit reached":"Production session completed"},...h]);
    setSessions(x=>{const n={...x};delete n[toolId];return n;});
    if(forced && s.mode==="Heavy Work"){
      const duration=tool.breakDuration||15;
      setCooling(x=>({...x,[toolId]:{toolName:tool.name,machine:tool.machine,duration,endAt:Date.now()+duration*60000}}));
      setNotification(`${toolId} reached ${s.limit} min. ${duration}-minute configured cooling break started.`);
    } else setNotification(`${toolId} stopped. ${minutes.toFixed(1)} minutes added to tool life.`);
  }

  function addPart(toolId){
    if(!sessions[toolId]) return;
    setTools(ts=>ts.map(t=>t.id===toolId?{...t,parts:t.parts+1}:t));
    setNotification(`Part count updated for ${toolId}.`);
  }

  function replaceTool(toolId){
    const t=tools.find(x=>x.id===toolId); if(!t || sessions[toolId]) return;
    setTools(ts=>ts.map(x=>x.id===toolId?{...x,usedLife:0,parts:0,replacements:(x.replacements||0)+1}:x));
    setHistory(h=>[{id:Date.now()+Math.random(),type:"replacement",toolId:t.id,toolName:t.name,machine:t.machine,date:"Today",duration:0,workType:"-",description:"Tool replaced and lifetime reset"},...h]);
    setNotification(`${t.id} replaced. Tool life reset.`);
  }

  function addTool(){
    if(!newTool.name.trim()) return setNotification("Enter a tool name.");
    const n=tools.reduce((a,t)=>Math.max(a,Number(t.id.slice(1))||0),0)+1;
    const id=`T${String(n).padStart(2,"0")}`;
    const t={id,name:newTool.name.trim(),type:newTool.type,machine:newTool.machine,maxLife:Number(newTool.maxLife)||100,usedLife:0,parts:0,location:newTool.location,replacements:0,breakDuration:Number(newTool.breakDuration)||15};
    setTools(x=>[...x,t]); setConfigs(x=>({...x,[id]:{mode:"Normal Work",limit:60}}));
    setNewTool({name:"",type:"End Mill",machine:"VMC-01",maxLife:100,location:"Rack A1",breakDuration:15});
    setShowAdd(false); setNotification(`${id} added to inventory.`);
  }

  function applyScenario(){
    const base=INITIAL_MACHINES.find(m=>m.id===selectedMachine);
    let next={...base};
    if(scenario==="Spindle Vibration") next={...next,vibration:8.4,spindleLoad:93};
    if(scenario==="Coolant Problem") next={...next,coolantLevel:14,coolantFlow:38};
    if(scenario==="Axis Error") next={...next,xError:.027,yError:.024,zError:.031};
    if(scenario==="Multiple Faults") next={...next,vibration:8.4,spindleLoad:94,coolantLevel:14,coolantFlow:38,lubeLevel:18,airPressure:5.0,driveTemp:74};
    if(scenario==="Normal") next=base;
    setMachines(ms=>ms.map(m=>m.id===selectedMachine?next:m));
    setDiagnosis(null); setNotification(`${scenario} machine scenario applied to ${selectedMachine}.`);
  }

  const filtered=useMemo(()=>tools.filter(t=>{
    const q=search.toLowerCase(); return !q || `${t.id} ${t.name} ${t.type} ${t.machine}`.toLowerCase().includes(q);
  }),[tools,search]);

  const nav=[
    ["overview","Overview",Activity],["health","Machine Health",Gauge],["usage","Tool Usage",Timer],
    ["inventory","Inventory",Package],["alerts","Alerts",Bell],["history","History",HistoryIcon]
  ];

  return <div className="app">
    <style>{`
      *{box-sizing:border-box} body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#070b14;color:#f4f7fb}
      button,input,select{font:inherit}button{cursor:pointer}.app{min-height:100vh;background:radial-gradient(circle at 80% 0%,rgba(94,231,247,.07),transparent 28%),radial-gradient(circle at 20% 100%,rgba(139,124,255,.06),transparent 30%),#070b14}
      .side{position:fixed;inset:0 auto 0 0;width:250px;padding:24px 16px;background:rgba(8,12,21,.96);border-right:1px solid rgba(255,255,255,.07);z-index:10}
      .brand{display:flex;gap:12px;align-items:center;padding:5px 10px 30px}.brandIcon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#5ee7f7,#8b7cff);color:#061017}.brand b{font-size:17px}.brand small{display:block;color:#718096;font-size:10px;margin-top:2px}
      .navLabel{font-size:10px;color:#5e6b80;letter-spacing:1.4px;font-weight:800;padding:0 12px 10px;text-transform:uppercase}.nav{display:grid;gap:5px}.nav button{border:1px solid transparent;background:transparent;color:#8793a8;padding:12px 13px;border-radius:11px;display:flex;align-items:center;gap:12px;text-align:left}.nav button:hover,.nav button.active{background:rgba(94,231,247,.07);color:#f4fbff;border-color:rgba(94,231,247,.12)}.nav button.active svg{color:#5ee7f7}
      .system{position:absolute;left:16px;right:16px;bottom:20px;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025);font-size:11px}.dot{width:7px;height:7px;border-radius:50%;background:#35d39a;box-shadow:0 0 12px #35d39a;display:inline-block;margin-right:8px}
      .main{margin-left:250px}.top{height:76px;position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:0 32px;background:rgba(7,11,20,.75);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.06)}.topTitle{font-weight:750;font-size:14px}.topSub{font-size:10px;color:#68758a;margin-top:3px}.search{width:230px;height:38px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025);display:flex;align-items:center;padding:0 11px;gap:8px}.search input{width:100%;border:0;outline:0;background:transparent;color:#eaf0f8;font-size:11px}
      .content{padding:30px 32px 55px;max-width:1600px}.head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px}.h1{font-size:26px;letter-spacing:-.9px;margin:0;font-weight:850}.desc{font-size:11px;color:#718096;margin-top:6px}.btn{height:40px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);color:#dbe3ee;font-size:11px;font-weight:750;display:inline-flex;align-items:center;gap:7px}.btn.primary{border:0;color:#061017;background:linear-gradient(135deg,#5ee7f7,#76dff1)}.btn.danger{color:#ff7189;background:rgba(255,92,119,.1);border-color:rgba(255,92,119,.18)}.btn:disabled{opacity:.35;cursor:not-allowed}
      .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}.card{border:1px solid rgba(255,255,255,.07);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.043),rgba(255,255,255,.017));box-shadow:0 18px 60px rgba(0,0,0,.12)}.kpi{padding:17px;min-height:115px}.muted{color:#718096}.kpi .label{font-size:10px}.kpi .value{font-size:27px;font-weight:850;margin-top:13px}.kpi .meta{font-size:9px;color:#5f6d82;margin-top:4px}.kicon{float:right;width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:#5ee7f7;background:rgba(94,231,247,.08)}
      .cols{display:grid;grid-template-columns:1.45fr 1fr;gap:16px}.panelHead{padding:17px 19px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center}.panelTitle{font-size:13px;font-weight:800}.panelSub{font-size:9px;color:#66738a;margin-top:4px}.body{padding:18px}.miniGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.mini{padding:13px;border:1px solid rgba(255,255,255,.055);border-radius:11px;background:rgba(255,255,255,.02)}.mini b{font-size:20px}.mini span{display:block;font-size:9px;color:#69768a;margin-top:4px}
      .pill{display:inline-flex;padding:5px 8px;border-radius:99px;font-size:9px;font-weight:800}.healthy{color:#4de0aa;background:rgba(53,211,154,.08)}.warning{color:#f8cc68;background:rgba(246,196,83,.09)}.critical{color:#ff7189;background:rgba(255,92,119,.09)}.attention{color:#f8cc68;background:rgba(246,196,83,.09)}.abnormal{color:#ff7189;background:rgba(255,92,119,.09)}
      .list{display:grid;gap:8px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid rgba(255,255,255,.055);border-radius:11px;background:rgba(255,255,255,.018)}.row b{font-size:11px}.row small{display:block;color:#68758a;font-size:9px;margin-top:3px}
      .usageGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.toolCard{padding:17px}.toolTop{display:flex;justify-content:space-between;gap:12px}.toolId{color:#5ee7f7;font-size:10px;font-weight:800}.toolName{font-size:14px;font-weight:800;margin-top:4px}.toolMeta{font-size:9px;color:#68758a;margin-top:4px}.bar{height:7px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;margin:13px 0}.bar>i{display:block;height:100%;border-radius:inherit}.toolStats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.stat{padding:9px;border-radius:9px;background:rgba(255,255,255,.025)}.stat strong{display:block;font-size:11px}.stat span{font-size:8px;color:#68758a}.toolActions{display:flex;gap:7px;margin-top:12px}.toolActions .btn{flex:1;height:37px;justify-content:center}.session{margin-top:11px;padding:11px;border-radius:10px;background:rgba(53,211,154,.05);border:1px solid rgba(53,211,154,.12)}.sessionTime{font-size:22px;font-weight:850}.cool{background:rgba(94,231,247,.04);border-color:rgba(94,231,247,.15)}.cool .sessionTime{color:#8cecf8}
      .controls{display:flex;gap:8px;align-items:center;margin-bottom:14px}.controls select,.controls input,.field input,.field select{height:39px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#111927;color:#e9eef7;padding:0 10px;outline:0;font-size:10px}.controls input{flex:1}
      table{width:100%;border-collapse:collapse}th{text-align:left;color:#5f6d82;font-size:9px;text-transform:uppercase;letter-spacing:.7px;padding:12px;border-bottom:1px solid rgba(255,255,255,.06)}td{padding:13px 12px;border-bottom:1px solid rgba(255,255,255,.045);font-size:10px;color:#cbd4e0}
      .healthGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.machineSelect{display:flex;gap:8px;align-items:center}.machineSelect select{height:40px;background:#111927;color:#e9eef7;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:0 12px}.healthHero{display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin-bottom:14px}.bigHealth{padding:20px}.bigStatus{font-size:31px;font-weight:900;margin-top:8px}.metricLine{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.045);font-size:10px}.metricLine span{color:#718096}.subcard{padding:15px}.subHead{display:flex;justify-content:space-between;align-items:center}.subTitle{font-weight:800;font-size:11px}.metrics{margin-top:12px}.diagnosis{margin-top:14px}.finding{padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.02);margin-bottom:8px}.findingTitle{font-size:11px;font-weight:800}.finding p{font-size:9px;color:#7d899d;line-height:1.55;margin:5px 0}.finding strong{color:#dfe7f2}
      .modalBg{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(8px);display:grid;place-items:center;z-index:50;padding:20px}.modal{width:min(520px,100%);background:#0c121e;border:1px solid rgba(255,255,255,.09);border-radius:17px}.modalHead{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between}.modalBody{padding:20px}.form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{display:grid;gap:5px}.field.full{grid-column:1/-1}.field label{font-size:9px;color:#7b879a;font-weight:750}.field input,.field select{width:100%}.modalFoot{display:flex;justify-content:flex-end;gap:8px;padding:15px 20px;border-top:1px solid rgba(255,255,255,.06)}
      .toast{position:fixed;right:24px;bottom:24px;z-index:100;padding:13px 15px;border-radius:12px;border:1px solid rgba(94,231,247,.18);background:#101a29;box-shadow:0 20px 60px rgba(0,0,0,.4);font-size:10px;display:flex;gap:9px;align-items:center}
      @media(max-width:1100px){.grid4{grid-template-columns:repeat(2,1fr)}.cols,.healthHero{grid-template-columns:1fr}.healthGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:800px){.side{width:72px;padding:18px 8px}.brand b,.brand small,.navLabel,.nav button span,.system{display:none}.brand{justify-content:center;padding-bottom:22px}.nav button{justify-content:center}.main{margin-left:72px}.top{padding:0 16px}.content{padding:22px 16px}.usageGrid,.healthGrid{grid-template-columns:1fr}.search{width:160px}}
    `}</style>

    <aside className="side">
      <div className="brand"><div className="brandIcon"><Settings2 size={20}/></div><div><b>ToolSense</b><small>Predictive CNC Intelligence</small></div></div>
      <div className="navLabel">Workspace</div>
      <nav className="nav">{nav.map(([id,label,Icon])=><button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><Icon size={17}/><span>{label}</span></button>)}</nav>
      <div className="system"><span className="dot"/>System online<br/><span style={{color:"#68758a",fontSize:9}}>Sensor-ready diagnostic workspace</span></div>
    </aside>

    <main className="main">
      <header className="top">
        <div><div className="topTitle">ToolSense · CNC Operations</div><div className="topSub">Tool life, machine health & operator guidance</div></div>
        <div className="search"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tools..." /></div>
      </header>

      <section className="content">
        {page==="overview" && <>
          <div className="head"><div><h1 className="h1">Operations Overview</h1><div className="desc">Live view of production tools and CNC machine condition.</div></div><button className="btn primary" onClick={()=>setPage("health")}><Gauge size={15}/> Machine Health</button></div>
          <div className="grid4">
            <div className="card kpi"><div className="kicon"><Cpu size={16}/></div><div className="label muted">Machines monitored</div><div className="value">{machines.length}</div><div className="meta">{machines.filter(m=>machineHealth(m)==="Normal").length} normal</div></div>
            <div className="card kpi"><div className="kicon"><Timer size={16}/></div><div className="label muted">Active tool sessions</div><div className="value">{activeCount}</div><div className="meta">{coolingCount} cooling</div></div>
            <div className="card kpi"><div className="kicon"><Wrench size={16}/></div><div className="label muted">Tool alerts</div><div className="value">{criticalTools+warningTools}</div><div className="meta">{criticalTools} critical · {warningTools} warning</div></div>
            <div className="card kpi"><div className="kicon"><ShieldCheck size={16}/></div><div className="label muted">Healthy machines</div><div className="value">{machines.filter(m=>machineHealth(m)==="Normal").length}/{machines.length}</div><div className="meta">Based on configured signals</div></div>
          </div>
          <div className="cols">
            <div className="card"><div className="panelHead"><div><div className="panelTitle">Machine Status</div><div className="panelSub">Major monitorable CNC subsystems</div></div></div><div className="body list">{machines.map(m=><div className="row" key={m.id}><div><b>{m.id} · {m.name}</b><small>Spindle {m.spindleLoad}% load · {m.vibration} mm/s vibration · Coolant {m.coolantFlow}% flow</small></div><span className={`pill ${cls(machineHealth(m))}`}>{machineHealth(m)}</span></div>)}</div></div>
            <div className="card"><div className="panelHead"><div><div className="panelTitle">Active Sessions</div><div className="panelSub">Multiple machines can run independently</div></div></div><div className="body list">{Object.values(sessions).map(s=>{const e=(now-s.startedAt)/1000;return <div className="row" key={s.toolId}><div><b>{s.toolId} · {s.toolName}</b><small>{s.machine} · {s.mode}</small></div><strong>{fmt(e)}</strong></div>})}{!activeCount&&<div style={{color:"#68758a",fontSize:10}}>No tools running right now.</div>}</div></div>
          </div>
        </>}

        {page==="usage" && <>
          <div className="head"><div><h1 className="h1">Tool Usage</h1><div className="desc">Select an existing tool and run independent sessions. No tool-name entry is required.</div></div><button className="btn" onClick={()=>setSearch("")}><RefreshCw size={14}/> Reset Search</button></div>
          <div className="usageGrid">{filtered.map(t=>{
            const p=pct(t.usedLife,t.maxLife), status=toolStatus(t.usedLife,t.maxLife), s=sessions[t.id], c=cooling[t.id], cfg=configs[t.id]||{mode:"Normal Work",limit:60};
            return <div className="card toolCard" key={t.id}>
              <div className="toolTop"><div><div className="toolId">{t.id} · {t.machine}</div><div className="toolName">{t.name}</div><div className="toolMeta">{t.type} · {t.location}</div></div><span className={`pill ${cls(status)}`}>{status}</span></div>
              <div className="bar"><i style={{width:`${p}%`,background:status==="Critical"?"#ff5c77":status==="Warning"?"#f6c453":"#35d39a"}}/></div>
              <div className="toolStats"><div className="stat"><strong>{t.usedLife.toFixed(1)}m</strong><span>used / {t.maxLife}m</span></div><div className="stat"><strong>{t.parts}</strong><span>parts</span></div><div className="stat"><strong>{(t.maxLife-t.usedLife).toFixed(1)}m</strong><span>remaining</span></div></div>
              {!s&&!c&&<><div style={{display:"flex",gap:7,marginTop:12}}><select style={{flex:1,height:37,background:"#111927",color:"#e9eef7",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,fontSize:9,padding:"0 8px"}} value={cfg.mode} onChange={e=>setConfigs(x=>({...x,[t.id]:{...cfg,mode:e.target.value}}))}><option>Normal Work</option><option>Heavy Work</option></select><select style={{width:95,height:37,background:"#111927",color:"#e9eef7",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,fontSize:9}} value={cfg.limit} onChange={e=>setConfigs(x=>({...x,[t.id]:{...cfg,limit:Number(e.target.value)}}))}>{[30,45,60,75,90].map(x=><option key={x} value={x}>{x} min</option>)}</select></div><div className="toolActions"><button className="btn primary" disabled={status==="Critical"} onClick={()=>startSession(t)}><Play size={13} fill="currentColor"/> Start Session</button><button className="btn danger" disabled={status==="Healthy"&&t.usedLife<1} onClick={()=>replaceTool(t.id)}><RefreshCw size={13}/> Replace</button></div></>}
              {s&&<div className="session"><div style={{display:"flex",justifyContent:"space-between"}}><span className="pill healthy">● RUNNING · {s.mode}</span><span style={{fontSize:9,color:"#68758a"}}>Limit {s.limit}m</span></div><div className="sessionTime">{fmt((now-s.startedAt)/1000)}</div><div style={{fontSize:9,color:"#68758a"}}>{s.mode==="Heavy Work"?"Session timer resets after each cooling cycle.":"Actual cutting runtime only."}</div><div className="toolActions"><button className="btn" onClick={()=>addPart(t.id)}><Plus size={13}/> Add Part</button><button className="btn danger" onClick={()=>finishSession(t.id,false)}><Square size={13}/> Stop</button></div></div>}
              {c&&<div className="session cool"><span className="pill healthy"><Snowflake size={11}/> COOLING</span><div className="sessionTime">{fmt((c.endAt-now)/1000)}</div><div style={{fontSize:9,color:"#68758a"}}>Configured {c.duration}-minute cooling break. Start remains locked.</div><button className="btn" style={{width:"100%",marginTop:9,justifyContent:"center"}} disabled><Clock3 size={13}/> Cooling in progress</button></div>}
            </div>
          })}</div>
        </>}

        {page==="inventory" && <>
          <div className="head"><div><h1 className="h1">Inventory</h1><div className="desc">Available cutting tools, locations and replacement records.</div></div><button className="btn primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add Tool</button></div>
          <div className="card"><div className="body" style={{paddingTop:8}}><table><thead><tr><th>Tool</th><th>Type</th><th>Machine</th><th>Location</th><th>Status</th><th>Replacements</th><th></th></tr></thead><tbody>{filtered.map(t=><tr key={t.id}><td><b>{t.id} · {t.name}</b></td><td>{t.type}</td><td>{t.machine}</td><td>{t.location}</td><td><span className={`pill ${cls(toolStatus(t.usedLife,t.maxLife))}`}>{toolStatus(t.usedLife,t.maxLife)}</span></td><td>{t.replacements||0}</td><td><button className="btn" style={{height:30}} onClick={()=>setPage("usage")}>Usage</button></td></tr>)}</tbody></table></div></div>
        </>}

        {page==="health" && <>
          <div className="head"><div><h1 className="h1">Machine Health</h1><div className="desc">Monitor major physical systems and convert abnormal signals into corrective actions.</div></div><div className="machineSelect"><select value={selectedMachine} onChange={e=>{setSelectedMachine(e.target.value);setDiagnosis(null);setScenario("Normal")}}>{machines.map(m=><option key={m.id}>{m.id}</option>)}</select><button className="btn primary" onClick={()=>setDiagnosis(machineFindings(selectedM,tools))}><Zap size={14}/> AI Diagnostic Analysis</button></div></div>
          <div className="healthHero"><div className="card bigHealth"><div className="muted" style={{fontSize:10}}>OVERALL MACHINE CONDITION · {selectedM.id}</div><div className={`bigStatus ${cls(machineHealth(selectedM))}`}>{machineHealth(selectedM)}</div><div className="desc">Status is based on available controller/sensor signals. Physical inspection is required for components that cannot be measured electronically.</div><div className="miniGrid" style={{marginTop:18}}><div className="mini"><b>{selectedM.spindleLoad}%</b><span>Spindle load</span></div><div className="mini"><b>{selectedM.vibration}</b><span>Vibration mm/s</span></div><div className="mini"><b>{selectedM.spindleTemp}°C</b><span>Spindle temp</span></div></div></div>
            <div className="card"><div className="panelHead"><div><div className="panelTitle">Demo Signal Control</div><div className="panelSub">Use scenarios to demonstrate diagnosis without a live CNC connection.</div></div></div><div className="body"><div className="field"><label>SCENARIO</label><select value={scenario} onChange={e=>setScenario(e.target.value)}>{["Normal","Spindle Vibration","Coolant Problem","Axis Error","Multiple Faults"].map(x=><option key={x}>{x}</option>)}</select></div><button className="btn" style={{marginTop:10,width:"100%",justifyContent:"center"}} onClick={applyScenario}><RefreshCw size={13}/> Apply Scenario</button><div className="desc" style={{marginTop:12}}>Prototype architecture: controller/sensors → diagnostic layer → operator recommendation. Later, this layer can connect to a real AI/LLM backend.</div></div></div>
          </div>
          <div className="healthGrid">
            {[
              ["Spindle",<Gauge/>,[["Load",`${selectedM.spindleLoad}%`],["Temperature",`${selectedM.spindleTemp}°C`],["Vibration",`${selectedM.vibration} mm/s`]]],
              ["X Axis",<Activity/>,[["Servo load",`${selectedM.xLoad}%`],["Position error",`${selectedM.xError} mm`]]],
              ["Y Axis",<Activity/>,[["Servo load",`${selectedM.yLoad}%`],["Position error",`${selectedM.yError} mm`]]],
              ["Z Axis",<Activity/>,[["Servo load",`${selectedM.zLoad}%`],["Position error",`${selectedM.zError} mm`]]],
              ["Tool & Tool Holder",<Wrench/>,(()=>{const t=tools.find(x=>x.machine===selectedM.id);return t?[["Tool",`${t.id} · ${pct(t.usedLife,t.maxLife).toFixed(0)}% life`],["Parts",String(t.parts)],["Location",t.location]]:[["Tool","No assigned tool"]];})()],
              ["Coolant System",<Droplets/>,[["Level",`${selectedM.coolantLevel}%`],["Flow",`${selectedM.coolantFlow}%`],["Temperature",`${selectedM.coolantTemp}°C`]]],
              ["Lubrication System",<Droplets/>,[["Oil level",`${selectedM.lubeLevel}%`],["Pressure",`${selectedM.lubePressure} bar`]]],
              ["Pneumatic System",<Wind/>,[["Air pressure",`${selectedM.airPressure} bar`],["Stability","Monitored"]]],
              ["Electrical / Drive",<Zap/>,[["Voltage",`${selectedM.voltage} V`],["Current",`${selectedM.current} A`],["Drive temp",`${selectedM.driveTemp}°C`]]],
              ["Thermal",<Thermometer/>,[["Cabinet",`${selectedM.cabinetTemp}°C`],["Motor",`${selectedM.motorTemp}°C`]]],
              ["Safety System",<ShieldCheck/>,[["Interlock",selectedM.safety?"Ready":"Fault"],["E-stop circuit",selectedM.safety?"Ready":"Fault"]]],
              ["CNC Controller",<Cpu/>,[["State",selectedM.controller],["Alarm",selectedM.alarm||"None"],["Communication","Connected"]]],
            ].map(([title,Icon,metrics])=>{const related=machineFindings(selectedM,tools).filter(x=>x.subsystem===title);const st=related.some(x=>x.severity==="Critical")?"Abnormal":related.length?"Attention":"Normal";return <div className="card subcard" key={title}><div className="subHead"><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:"#5ee7f7"}}>{React.cloneElement(Icon,{size:15})}</span><span className="subTitle">{title}</span></div><span className={`pill ${cls(st)}`}>{st}</span></div><div className="metrics">{metrics.map(([a,b])=><div className="metricLine" key={a}><span>{a}</span><strong>{b}</strong></div>)}</div></div>})}
          </div>
          {diagnosis && <div className="card diagnosis"><div className="panelHead"><div><div className="panelTitle">AI-Assisted Diagnostic Output</div><div className="panelSub">Problem → probable cause → recommended corrective action</div></div><button className="btn" onClick={()=>setDiagnosis(null)}><X size={13}/></button></div><div className="body">{diagnosis.length?diagnosis.map((f,i)=><div className="finding" key={i}><div className="findingTitle"><span className={`pill ${cls(f.severity)}`} style={{marginRight:7}}>{f.severity}</span>{f.subsystem} · {f.title}</div><p><strong>Probable cause:</strong> {f.cause}</p><p><strong>Recommended action:</strong> {f.action}</p><p><strong>Evidence:</strong> {f.evidence}</p></div>):<div className="finding"><div className="findingTitle"><span className="pill healthy">NORMAL</span> No abnormal conditions detected</div><p>All configured machine signals are currently within their demo thresholds.</p></div>}</div></div>}
        </>}

        {page==="alerts" && <>
          <div className="head"><div><h1 className="h1">Alerts</h1><div className="desc">Tool-life and machine-health conditions that need attention.</div></div></div>
          <div className="card"><div className="body list">
            {tools.filter(t=>toolStatus(t.usedLife,t.maxLife)!=="Healthy").map(t=><div className="row" key={t.id}><div><b>{t.id} · {t.name}</b><small>Tool life at {pct(t.usedLife,t.maxLife).toFixed(0)}%. Replacement planning required.</small></div><span className={`pill ${cls(toolStatus(t.usedLife,t.maxLife))}`}>{toolStatus(t.usedLife,t.maxLife)}</span><button className="btn" onClick={()=>setPage("usage")}>Open</button></div>)}
            {machines.flatMap(m=>machineFindings(m,tools).slice(0,2).map((f,i)=><div className="row" key={`${m.id}-${i}`}><div><b>{m.id} · {f.title}</b><small>{f.cause}</small></div><span className={`pill ${cls(f.severity)}`}>{f.severity}</span><button className="btn" onClick={()=>{setSelectedMachine(m.id);setPage("health")}}>Diagnose</button></div>))}
          </div></div>
        </>}

        {page==="history" && <>
          <div className="head"><div><h1 className="h1">History</h1><div className="desc">Runtime, cooling and replacement events are stored separately.</div></div></div>
          <div className="card"><div className="body"><table><thead><tr><th>Activity</th><th>Tool</th><th>Machine</th><th>Duration</th><th>Work Type</th><th>Description</th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td><span className={`pill ${h.type==="replacement"?"healthy":h.type==="cooling"?"warning":"healthy"}`}>{h.type}</span></td><td><b>{h.toolId} · {h.toolName}</b></td><td>{h.machine||"-"}</td><td>{h.duration?h.duration.toFixed(1)+" min":"-"}</td><td>{h.workType}</td><td>{h.description}</td></tr>)}</tbody></table></div></div>
        </>}
      </section>
    </main>

    {showAdd && <div className="modalBg"><div className="modal"><div className="modalHead"><b>Add Tool to Inventory</b><button className="btn" onClick={()=>setShowAdd(false)}><X size={14}/></button></div><div className="modalBody"><div className="form">
      <div className="field full"><label>TOOL NAME</label><input value={newTool.name} onChange={e=>setNewTool({...newTool,name:e.target.value})} placeholder="e.g. 12mm Carbide End Mill"/></div>
      <div className="field"><label>TYPE</label><select value={newTool.type} onChange={e=>setNewTool({...newTool,type:e.target.value})}>{["End Mill","Drill","Face Mill","Ball Nose","Roughing End Mill","Insert"].map(x=><option key={x}>{x}</option>)}</select></div>
      <div className="field"><label>MACHINE</label><select value={newTool.machine} onChange={e=>setNewTool({...newTool,machine:e.target.value})}>{machines.map(x=><option key={x.id}>{x.id}</option>)}</select></div>
      <div className="field"><label>MAX LIFE (MIN)</label><input type="number" value={newTool.maxLife} onChange={e=>setNewTool({...newTool,maxLife:e.target.value})}/></div>
      <div className="field"><label>LOCATION</label><input value={newTool.location} onChange={e=>setNewTool({...newTool,location:e.target.value})}/></div>
      <div className="field"><label>COOLING BREAK (MIN)</label><input type="number" value={newTool.breakDuration} onChange={e=>setNewTool({...newTool,breakDuration:e.target.value})}/></div>
    </div></div><div className="modalFoot"><button className="btn" onClick={()=>setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addTool}><Plus size={14}/> Add Tool</button></div></div></div>}

    {notification && <div className="toast"><CheckCircle2 size={15} color="#5ee7f7"/><span>{notification}</span><button style={{border:0,background:"transparent",color:"#68758a"}} onClick={()=>setNotification("")}><X size={13}/></button></div>}
  </div>;
}

export default App;
