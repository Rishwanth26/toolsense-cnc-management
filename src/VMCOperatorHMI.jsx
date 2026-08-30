import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Power,
  ShieldAlert,
  DoorClosed,
  AlertTriangle,
  Droplets,
  Locate,
  Wrench,
  Box,
  CheckCircle2,
  Circle,
  PlayCircle,
  StopCircle,
  Lock,
  User,
  ClipboardCheck,
  Loader2,
  RotateCcw,
} from "lucide-react";



const SCENARIO = {
  operation: "Op 20 — Face Mill & Drill",
  part: "Bracket, Mounting — Rev C",
  quantity: 25,
  material: "Aluminum 6061-T6",
  drawingRev: "Rev C",
  program: "O1042",
  programFile: "BRACKET_OP20.NC",
  programRev: "Rev 4",
  fixture: "Vise Fixture VF-14, Station 2",
  workOffset: "G54",
  orientation: "Datum face up, pocket side facing operator",
  clamping: "Jaw torque 40 Nm, part seated flush against fixed jaw",
};

const MACHINE_CHECKS = [
  { id: "power", label: "Power / control available", detail: "Control cabinet on, HMI responsive", Icon: Power },
  { id: "estop", label: "E-stop released", detail: "All E-stop stations checked and released", Icon: ShieldAlert },
  { id: "guard", label: "Guard / door closed", detail: "Enclosure door latched, interlock satisfied", Icon: DoorClosed },
  { id: "alarm", label: "No active alarm", detail: "Alarm log clear, no faults pending", Icon: AlertTriangle },
  { id: "coolant", label: "Lubrication / coolant ready", detail: "Coolant level OK, way-lube reservoir full", Icon: Droplets },
  { id: "reference", label: "Reference return complete", detail: "All axes homed to machine zero", Icon: Locate },
];

const REQUIRED_TOOLS = [
  { id: "t01", station: "T01", type: "Face Mill, 50mm, 5FL", programRev: SCENARIO.programRev },
  { id: "t02", station: "T02", type: "Drill, 8.5mm HSCo", programRev: SCENARIO.programRev },
  { id: "t03", station: "T03", type: "Tap, M10 x 1.5", programRev: SCENARIO.programRev },
  { id: "t04", station: "T04", type: "End Mill, 12mm, 4FL", programRev: SCENARIO.programRev },
];

const WORKPIECE_ITEMS = [
  { id: "fixture", label: "Fixture", value: SCENARIO.fixture, Icon: Box },
  { id: "orientation", label: "Orientation", value: SCENARIO.orientation, Icon: RotateCcw },
  { id: "clamping", label: "Clamping instruction", value: SCENARIO.clamping, Icon: Lock },
  { id: "material", label: "Material / drawing rev", value: `${SCENARIO.material} · ${SCENARIO.drawingRev}`, Icon: ClipboardCheck },
  { id: "offset", label: "Work offset", value: SCENARIO.workOffset, Icon: Locate },
];

const STAGES = [
  { key: "checks", code: "MC", label: "Machine checks" },
  { key: "tools", code: "TL", label: "Required tools" },
  { key: "workpiece", code: "WP", label: "Workpiece setup" },
  { key: "ready", code: "RDY", label: "Ready review" },
  { key: "operation", code: "RUN", label: "Operation" },
];

const DEMO_OPERATOR_ID = "OP-104";
const DEMO_PIN = "1234";
const STORAGE_KEY = "vmc-hmi-session-v1";

/* ------------------------------------------------------------------ */
/* Mock API layer — simulates network latency + a persistence backend */
/* using the artifact's window.storage as the "database".             */
/* ------------------------------------------------------------------ */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiSaveSession(session) {
  await delay(260);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    // Persistence is best-effort; the session still works in-memory.
  }
  return { ok: true };
}

async function apiLoadSession() {
  await delay(320);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // No saved session, or storage unavailable — start fresh.
  }
  return null;
}

async function apiClearSession() {
  await delay(150);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  return { ok: true };
}



function Led({ state, size = 10 }) {
  // state: "pending" | "active" | "done"
  const colors = {
    pending: "var(--vmc-border)",
    active: "var(--vmc-amber)",
    done: "var(--vmc-green)",
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors[state],
        boxShadow: state === "active" ? "0 0 8px var(--vmc-amber)" : state === "done" ? "0 0 6px var(--vmc-green)" : "none",
        flexShrink: 0,
        transition: "background 200ms ease, box-shadow 200ms ease",
      }}
    />
  );
}

function StageStepper({ stages, currentIndex, statuses }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {stages.map((s, i) => {
        const st = statuses[i];
        return (
          <React.Fragment key={s.key}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 4,
                border: `1px solid ${i === currentIndex ? "var(--vmc-amber)" : "var(--vmc-border)"}`,
                background: i === currentIndex ? "rgba(255,176,32,0.08)" : "transparent",
              }}
            >
              <Led state={st} size={8} />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: st === "pending" ? "var(--vmc-text-tertiary)" : "var(--vmc-text-primary)",
                }}
              >
                {s.code}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div style={{ width: 14, height: 1, background: "var(--vmc-border)" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function BigButton({ children, onClick, disabled, variant = "primary", icon: Icon, style }) {
  const variants = {
    primary: { bg: "var(--vmc-amber)", fg: "#1A1300", border: "var(--vmc-amber)" },
    go: { bg: "var(--vmc-green)", fg: "#062012", border: "var(--vmc-green)" },
    stop: { bg: "var(--vmc-red)", fg: "#2B0505", border: "var(--vmc-red)" },
    ghost: { bg: "transparent", fg: "var(--vmc-text-primary)", border: "var(--vmc-border)" },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "16px 28px",
        fontFamily: "'Oswald', sans-serif",
        fontSize: 17,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontWeight: 500,
        borderRadius: 4,
        border: `1px solid ${disabled ? "var(--vmc-border)" : v.border}`,
        background: disabled ? "var(--vmc-panel-raised)" : v.bg,
        color: disabled ? "var(--vmc-text-tertiary)" : v.fg,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "transform 100ms ease, opacity 150ms ease",
        minWidth: 160,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
}

function ChecklistRow({ label, detail, Icon, confirmed, onConfirm, disabled }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 4,
        border: "1px solid var(--vmc-border)",
        background: confirmed ? "rgba(46,213,115,0.06)" : "var(--vmc-panel-raised)",
        marginBottom: 10,
      }}
    >
      <Led state={confirmed ? "done" : "active"} size={10} />
      {Icon && (
        <Icon size={20} style={{ color: confirmed ? "var(--vmc-green)" : "var(--vmc-text-secondary)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: "var(--vmc-text-primary)", fontWeight: 500 }}>
          {label}
        </div>
        {detail && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--vmc-text-secondary)", marginTop: 2 }}>
            {detail}
          </div>
        )}
      </div>
      {confirmed ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--vmc-green)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.05em" }}>
          <CheckCircle2 size={16} />
          CONFIRMED
        </div>
      ) : (
        <button
          onClick={onConfirm}
          disabled={disabled}
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 13,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "9px 18px",
            borderRadius: 4,
            border: "1px solid var(--vmc-amber)",
            background: "transparent",
            color: "var(--vmc-amber)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          Confirm
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main application                                                    */
/* ------------------------------------------------------------------ */

export default function VMCOperatorHMI() {
  const [booting, setBooting] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [operatorId, setOperatorId] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");

  const [stageIndex, setStageIndex] = useState(0);
  const [checksConfirmed, setChecksConfirmed] = useState({});
  const [toolsConfirmed, setToolsConfirmed] = useState({});
  const [workpieceConfirmed, setWorkpieceConfirmed] = useState({});
  const [operationStatus, setOperationStatus] = useState("READY"); // READY | RUNNING | STOPPED
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [clockTime, setClockTime] = useState(new Date());

  const initialLoad = useRef(true);

  // Boot: attempt to restore a persisted session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await apiLoadSession();
      if (cancelled) return;
      if (saved) {
        setOperatorId(saved.operatorId || "");
        setLoggedIn(!!saved.loggedIn);
        setStageIndex(saved.stageIndex ?? 0);
        setChecksConfirmed(saved.checksConfirmed || {});
        setToolsConfirmed(saved.toolsConfirmed || {});
        setWorkpieceConfirmed(saved.workpieceConfirmed || {});
        setOperationStatus(saved.operationStatus || "READY");
      }
      setBooting(false);
      initialLoad.current = false;
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist on every meaningful state change (skip the very first load).
  useEffect(() => {
    if (initialLoad.current) return;
    setSyncing(true);
    const session = {
      operatorId,
      loggedIn,
      stageIndex,
      checksConfirmed,
      toolsConfirmed,
      workpieceConfirmed,
      operationStatus,
    };
    apiSaveSession(session).then(() => {
      setSyncing(false);
      setLastSynced(new Date());
    });
  }, [operatorId, loggedIn, stageIndex, checksConfirmed, toolsConfirmed, workpieceConfirmed, operationStatus]);

  // Clock tick for the header readout.
  useEffect(() => {
    const t = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = useCallback((e) => {
    e.preventDefault();
    if (operatorId.trim().toUpperCase() === DEMO_OPERATOR_ID && pin.trim() === DEMO_PIN) {
      setLoginError("");
      setLoggedIn(true);
    } else {
      setLoginError("Operator ID or PIN not recognized. Check the demo credentials below.");
    }
  }, [operatorId, pin]);

  const handleLogout = useCallback(async () => {
    setLoggedIn(false);
    setOperatorId("");
    setPin("");
    setStageIndex(0);
    setChecksConfirmed({});
    setToolsConfirmed({});
    setWorkpieceConfirmed({});
    setOperationStatus("READY");
    await apiClearSession();
  }, []);

  const checksAllConfirmed = MACHINE_CHECKS.every((c) => checksConfirmed[c.id]);
  const toolsAllConfirmed = REQUIRED_TOOLS.every((t) => toolsConfirmed[t.id]);
  const workpieceAllConfirmed = WORKPIECE_ITEMS.every((w) => workpieceConfirmed[w.id]);

  const stageComplete = [checksAllConfirmed, toolsAllConfirmed, workpieceAllConfirmed, true, false];

  const stageStatuses = STAGES.map((_, i) => {
    if (i < stageIndex) return "done";
    if (i === stageIndex) return "active";
    return "pending";
  });

  const goNext = () => {
    if (stageIndex < STAGES.length - 1) setStageIndex(stageIndex + 1);
  };

  const canAdvance = () => {
    if (stageIndex === 0) return checksAllConfirmed;
    if (stageIndex === 1) return toolsAllConfirmed;
    if (stageIndex === 2) return workpieceAllConfirmed;
    if (stageIndex === 3) return true;
    return false;
  };

  /* ---------------- Boot screen ---------------- */
  if (booting) {
    return (
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 380, gap: 16 }}>
          <Loader2 size={28} className="vmc-spin" style={{ color: "var(--vmc-amber)" }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", color: "var(--vmc-text-secondary)" }}>
            INITIALIZING CONTROL SESSION…
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------------- Login screen ---------------- */
  if (!loggedIn) {
    return (
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--vmc-amber)", boxShadow: "0 0 8px var(--vmc-amber)" }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.12em", color: "var(--vmc-text-secondary)" }}>
              VMC-04 · CONTROL STANDBY
            </span>
          </div>

          <form
            onSubmit={handleLogin}
            style={{
              width: "100%",
              maxWidth: 360,
              background: "var(--vmc-panel-raised)",
              border: "1px solid var(--vmc-border)",
              borderRadius: 6,
              padding: "28px 26px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
              <Lock size={18} style={{ color: "var(--vmc-text-secondary)" }} />
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em", margin: 0, color: "var(--vmc-text-primary)" }}>
                Operator sign-in
              </h1>
            </div>

            <label style={fieldLabelStyle}>Operator ID</label>
            <input
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="OP-104"
              style={fieldInputStyle}
              autoFocus
            />

            <label style={{ ...fieldLabelStyle, marginTop: 16 }}>PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              style={fieldInputStyle}
            />

            {loginError && (
              <div style={{ marginTop: 12, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "var(--vmc-red)" }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                marginTop: 22,
                padding: "14px 0",
                fontFamily: "'Oswald', sans-serif",
                fontSize: 16,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontWeight: 500,
                borderRadius: 4,
                border: "1px solid var(--vmc-amber)",
                background: "var(--vmc-amber)",
                color: "#1A1300",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <User size={18} />
              Sign in
            </button>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--vmc-border)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--vmc-text-tertiary)", lineHeight: 1.6 }}>
              DEMO ACCESS — ID: {DEMO_OPERATOR_ID} · PIN: {DEMO_PIN}
            </div>
          </form>
        </div>
      </Shell>
    );
  }

  /* ---------------- Main HMI ---------------- */
  const stage = STAGES[stageIndex];

  return (
    <Shell>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 18px",
          borderBottom: "1px solid var(--vmc-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--vmc-green)", boxShadow: "0 0 6px var(--vmc-green)" }} />
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--vmc-text-secondary)" }}>
              VMC-04 · {operatorId}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--vmc-text-tertiary)" }}>
              {clockTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <StageStepper stages={STAGES} currentIndex={stageIndex} statuses={stageStatuses} />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--vmc-text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
            {syncing ? <Loader2 size={12} className="vmc-spin" /> : <CheckCircle2 size={12} style={{ color: "var(--vmc-green)" }} />}
            {syncing ? "SAVING…" : "SAVED"}
          </span>
          <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--vmc-text-tertiary)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: "pointer", letterSpacing: "0.05em" }}>
            SIGN OUT
          </button>
        </div>
      </div>

      {/* Stage body */}
      <div style={{ padding: "26px 20px 20px" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.1em", color: "var(--vmc-amber)", marginBottom: 4 }}>
          STAGE {stageIndex + 1} OF {STAGES.length}
        </div>
        <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 22px", color: "var(--vmc-text-primary)" }}>
          {stage.label}
        </h2>

        {stageIndex === 0 && (
          <div>
            {MACHINE_CHECKS.map((c) => (
              <ChecklistRow
                key={c.id}
                label={c.label}
                detail={c.detail}
                Icon={c.Icon}
                confirmed={!!checksConfirmed[c.id]}
                onConfirm={() => setChecksConfirmed((s) => ({ ...s, [c.id]: true }))}
              />
            ))}
          </div>
        )}

        {stageIndex === 1 && (
          <div>
            <InfoStrip label="Program" value={`${SCENARIO.program} — ${SCENARIO.programFile} (${SCENARIO.programRev})`} />
            {REQUIRED_TOOLS.map((t) => (
              <ChecklistRow
                key={t.id}
                label={`${t.station} — ${t.type}`}
                detail={`Program revision ${t.programRev}`}
                Icon={Wrench}
                confirmed={!!toolsConfirmed[t.id]}
                onConfirm={() => setToolsConfirmed((s) => ({ ...s, [t.id]: true }))}
              />
            ))}
          </div>
        )}

        {stageIndex === 2 && (
          <div>
            <InfoStrip label="Part" value={`${SCENARIO.part} · Qty ${SCENARIO.quantity}`} />
            {WORKPIECE_ITEMS.map((w) => (
              <ChecklistRow
                key={w.id}
                label={w.label}
                detail={w.value}
                Icon={w.Icon}
                confirmed={!!workpieceConfirmed[w.id]}
                onConfirm={() => setWorkpieceConfirmed((s) => ({ ...s, [w.id]: true }))}
              />
            ))}
          </div>
        )}

        {stageIndex === 3 && (
          <ReadyReview
            checksAllConfirmed={checksAllConfirmed}
            toolsAllConfirmed={toolsAllConfirmed}
            workpieceAllConfirmed={workpieceAllConfirmed}
          />
        )}

        {stageIndex === 4 && (
          <OperationStage
            status={operationStatus}
            onStart={() => setOperationStatus("RUNNING")}
            onStop={() => setOperationStatus("STOPPED")}
          />
        )}
      </div>

      {/* Bottom action bar */}
      {stageIndex < 4 && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "16px 20px 22px",
            borderTop: "1px solid var(--vmc-border)",
          }}
        >
          <BigButton onClick={goNext} disabled={!canAdvance()}>
            {stageIndex === 3 ? "Proceed to operation" : "Next stage"}
          </BigButton>
        </div>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-views                                                           */
/* ------------------------------------------------------------------ */

function InfoStrip({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 14px",
        marginBottom: 16,
        background: "var(--vmc-panel-raised)",
        border: "1px solid var(--vmc-border)",
        borderRadius: 4,
      }}
    >
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em", color: "var(--vmc-text-tertiary)", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "var(--vmc-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function ReadyReview({ checksAllConfirmed, toolsAllConfirmed, workpieceAllConfirmed }) {
  const rows = [
    { label: "Machine checks", ok: checksAllConfirmed },
    { label: "Required tools loaded", ok: toolsAllConfirmed },
    { label: "Workpiece setup", ok: workpieceAllConfirmed },
  ];
  const allOk = rows.every((r) => r.ok);

  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 16px",
            borderRadius: 4,
            border: "1px solid var(--vmc-border)",
            background: "var(--vmc-panel-raised)",
            marginBottom: 10,
          }}
        >
          {r.ok ? <CheckCircle2 size={18} style={{ color: "var(--vmc-green)" }} /> : <Circle size={18} style={{ color: "var(--vmc-text-tertiary)" }} />}
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: "var(--vmc-text-primary)" }}>{r.label}</span>
        </div>
      ))}

      <div
        style={{
          marginTop: 20,
          padding: "22px",
          textAlign: "center",
          borderRadius: 6,
          border: `1px solid ${allOk ? "var(--vmc-green)" : "var(--vmc-border)"}`,
          background: allOk ? "rgba(46,213,115,0.08)" : "var(--vmc-panel-raised)",
        }}
      >
        <div
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: allOk ? "var(--vmc-green)" : "var(--vmc-text-tertiary)",
          }}
        >
          {allOk ? "READY" : "NOT READY"}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--vmc-text-secondary)", marginTop: 6 }}>
          {allOk ? "All checklist items confirmed" : "Return to earlier stages to complete outstanding items"}
        </div>
      </div>
    </div>
  );
}

function OperationStage({ status, onStart, onStop }) {
  const colorMap = {
    READY: "var(--vmc-text-tertiary)",
    RUNNING: "var(--vmc-green)",
    STOPPED: "var(--vmc-red)",
  };
  return (
    <div>
      <InfoStrip label="Operation" value={SCENARIO.operation} />
      <InfoStrip label="Program" value={`${SCENARIO.program} (${SCENARIO.programRev})`} />

      <div
        style={{
          marginTop: 18,
          padding: "34px 20px",
          textAlign: "center",
          borderRadius: 6,
          border: `1px solid ${colorMap[status]}`,
          background: "var(--vmc-panel-raised)",
        }}
      >
        <div
          className={status === "RUNNING" ? "vmc-pulse" : ""}
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: colorMap[status],
            margin: "0 auto 16px",
            boxShadow: status !== "READY" ? `0 0 12px ${colorMap[status]}` : "none",
          }}
        />
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 34, fontWeight: 500, letterSpacing: "0.06em", color: colorMap[status] }}>
          {status}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 26 }}>
        <BigButton icon={PlayCircle} variant="go" onClick={onStart} disabled={status === "RUNNING"}>
          Start
        </BigButton>
        <BigButton icon={StopCircle} variant="stop" onClick={onStop} disabled={status !== "RUNNING"}>
          Stop
        </BigButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell — theme, fonts, responsive frame                              */
/* ------------------------------------------------------------------ */

const fieldLabelStyle = {
  display: "block",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--vmc-text-tertiary)",
  marginBottom: 6,
};

const fieldInputStyle = {
  width: "100%",
  padding: "11px 12px",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  color: "var(--vmc-text-primary)",
  background: "var(--vmc-panel)",
  border: "1px solid var(--vmc-border)",
  borderRadius: 4,
  outline: "none",
  boxSizing: "border-box",
};

function Shell({ children }) {
  return (
    <div
      style={{
        "--vmc-bg": "#14171A",
        "--vmc-panel": "#1B1F22",
        "--vmc-panel-raised": "#22262A",
        "--vmc-border": "#33393E",
        "--vmc-text-primary": "#EDEFF0",
        "--vmc-text-secondary": "#8B939A",
        "--vmc-text-tertiary": "#5C6368",
        "--vmc-amber": "#FFB020",
        "--vmc-green": "#2ED573",
        "--vmc-red": "#FF4757",
        background: "var(--vmc-bg)",
        borderRadius: 8,
        border: "1px solid var(--vmc-border)",
        maxWidth: 640,
        margin: "0 auto",
        overflow: "hidden",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .vmc-spin { animation: vmc-spin 1s linear infinite; }
        @keyframes vmc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .vmc-pulse { animation: vmc-pulse 1.1s ease-in-out infinite; }
        @keyframes vmc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input::placeholder { color: var(--vmc-text-tertiary); }
        input:focus { border-color: var(--vmc-amber) !important; }
      `}</style>
      {children}
    </div>
  );
}
