import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENS — warm-dark palette, amber accent, monospace data
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
  bg: "#0E0D0B", surface: "#1A1816", surfaceHover: "#222019",
  border: "#2A2620", borderStrong: "#3A362E",
  amber: "#C8963E", amberMuted: "#C8963E1A", amberStrong: "#DAAB52",
  steel: "#7A9CC6", steelMuted: "#7A9CC620",
  green: "#6AAD7C", greenMuted: "#6AAD7C1A",
  red: "#CC5F5F", redMuted: "#CC5F5F1A",
  text: "#DDD8CE", textSec: "#908A7E", textMut: "#5E584E", textFaint: "#3E3A34",
};
const F = { display: "Georgia, 'Times New Roman', serif", body: "system-ui, -apple-system, sans-serif", mono: "'SF Mono', 'Cascadia Code', Consolas, monospace" };

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
const Pill = ({ children, active, color, onClick }) => (
  <button onClick={onClick} style={{
    padding: "5px 14px", borderRadius: "100px", fontSize: "12px", fontFamily: F.body, cursor: "pointer",
    border: active ? `1.5px solid ${color || C.amber}` : `1.5px solid ${C.border}`,
    background: active ? (color || C.amber) + "18" : "transparent",
    color: active ? (color || C.amber) : C.textMut, fontWeight: active ? 500 : 400, transition: "all 0.12s",
  }}>{children}</button>
);

const Tag = ({ children, color = C.amber }) => (
  <span style={{
    display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px",
    fontFamily: F.body, letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600,
    color, background: color + "18", border: `1px solid ${color}30`,
  }}>{children}</span>
);

const Label = ({ children }) => (
  <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontFamily: F.body, fontWeight: 600, marginBottom: "10px" }}>{children}</div>
);

const Stat = ({ label, value, color = C.text, sub = null }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "12px 18px" }}>
    <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut, fontFamily: F.body, marginBottom: "3px" }}>{label}</div>
    <div style={{ fontSize: "22px", fontFamily: F.mono, color, fontWeight: 600 }}>{value}{sub && <span style={{ fontSize: "13px", color: C.textMut }}>{sub}</span>}</div>
  </div>
);

const Btn = ({ children, onClick, color = C.amber, textColor, disabled, outline, style = {} }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    padding: "8px 18px", borderRadius: "3px", fontSize: "13px", fontFamily: F.body, fontWeight: 500,
    cursor: disabled ? "default" : "pointer", transition: "all 0.12s", opacity: disabled ? 0.35 : 1,
    background: outline ? "transparent" : color, color: outline ? C.textSec : (textColor || "#111"),
    border: outline ? `1.5px solid ${C.border}` : "none", letterSpacing: "0.01em", ...style,
  }}>{children}</button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PRISONER'S DILEMMA — full simulator
// ═══════════════════════════════════════════════════════════════════════════════
const PAY = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };
const FL = { C: "Hold Price", D: "Undercut" };

const STRATS = {
  tit_for_tat: { n: "Tit-for-Tat", d: "Cooperates first, then mirrors your last move.", c: C.steel },
  always_defect: { n: "Always Defect", d: "Defects every round regardless.", c: C.red },
  always_coop: { n: "Always Cooperate", d: "Cooperates every round regardless.", c: C.green },
  grudger: { n: "Grudger", d: "Cooperates until you defect once, then defects forever.", c: C.amber },
  random: { n: "Random", d: "50/50 chance each round.", c: C.textSec },
  pavlov: { n: "Pavlov", d: "Repeats last move if it paid well, switches if it didn't.", c: "#B080D0" },
};

function aiMove(id, hist) {
  const n = hist.length;
  if (id === "always_defect") return "D";
  if (id === "always_coop") return "C";
  if (id === "random") return Math.random() < 0.5 ? "C" : "D";
  if (id === "tit_for_tat") return n === 0 ? "C" : hist[n - 1].p;
  if (id === "grudger") return hist.some(r => r.p === "D") ? "D" : "C";
  if (id === "pavlov") { if (n === 0) return "C"; const l = hist[n-1]; return PAY[l.o + l.p][1] >= 3 ? l.o : l.o === "C" ? "D" : "C"; }
  return "C";
}

const INSIGHTS = {
  always_defect: (w) => w ? "You matched or beat Always Defect — likely by defecting yourself. When your counterpart will never cooperate, mutual defection is the Nash equilibrium. In markets, this is the price war that destroys everyone's margins." : "Against a permanent defector, the best you can do is also defect — 1 point per round, mutual destruction. No strategy beats unconditional defection with cooperation.",
  always_coop: () => "Against unconditional cooperation, defection dominates: you get 5 instead of 3 every round. The lesson for finance: a counterparty who never walks away from a deal leaves surplus on the table for the other side.",
  tit_for_tat: (w) => w ? "You beat Tit-for-Tat — probably by exploiting early. But mutual cooperation yields 6 total per round vs. 2 for mutual defection. Axelrod's 1984 tournaments proved Tit-for-Tat the strongest simple strategy in repeated interactions: nice, retaliatory, forgiving." : "Tit-for-Tat wins by being predictable: cooperate first (signal goodwill), retaliate immediately (punish exploitation), forgive instantly (restore cooperation). In business, this is the reputation for fair dealing that compounds over decades.",
  grudger: (w, defected) => defected ? "Grudger cooperates until betrayed, then defects forever. One defection costs you the entire cooperative surplus for all remaining rounds. Some professional relationships work the same way — the option value of maintained trust exceeds any one-time gain from exploitation." : "You cooperated throughout and achieved maximum mutual payoff. Against a Grudger, sustained cooperation is optimal — a single defection cascades irreversibly.",
  random: () => "Against randomness, your strategy barely matters — outcomes are driven by noise. In markets, this is trading against a counterparty whose behavior you can't model. The rational response: defect, since you can't condition on their cooperation.",
  pavlov: () => "Pavlov (win-stay, lose-shift) adapts based on outcomes rather than mirroring your moves. It recovers from accidental defections better than Tit-for-Tat. In finance, Pavlov resembles momentum strategies — repeat what worked, reverse what didn't.",
};

function PrisonersDilemma({ onBack }) {
  const [opp, setOpp] = useState("tit_for_tat");
  const [hist, setHist] = useState([]);
  const endRef = useRef(null);
  const ROUNDS = 20;
  const over = hist.length >= ROUNDS;
  const s = STRATS[opp];

  const scores = useMemo(() => {
    let p = 0, o = 0;
    hist.forEach(r => { const [a, b] = PAY[r.p + r.o]; p += a; o += b; });
    return { p, o };
  }, [hist]);

  const play = (m) => { if (over) return; const om = aiMove(opp, hist); setHist(prev => [...prev, { p: m, o: om, r: prev.length + 1 }]); };
  const reset = () => setHist([]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [hist]);

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "12px", fontFamily: F.body, padding: 0, marginBottom: "14px" }}>← Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontFamily: F.display, color: C.text, fontWeight: 400 }}>Prisoner's Dilemma</h2>
        <Tag color={C.steel}>Repeated Games</Tag>
      </div>
      <p style={{ color: C.textSec, fontSize: "13.5px", lineHeight: 1.65, margin: "8px 0 20px", maxWidth: "600px", fontFamily: F.body }}>
        Two firms independently choose pricing. Both hold → both profit. One undercuts → they capture the market. Both undercut → margins collapse. Play {ROUNDS} rounds against six strategies.
      </p>

      {/* Payoff matrix */}
      <div style={{ marginBottom: "20px" }}>
        <Label>Payoff Matrix — you, opponent</Label>
        <div style={{ display: "inline-block", border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12.5px" }}>
            <thead><tr>
              <th style={{ padding: "7px 14px", background: C.surface, color: C.textMut, fontWeight: 400, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, fontFamily: F.body, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase" }}>You \ Them</th>
              <th style={{ padding: "7px 16px", background: C.surface, color: C.green, fontWeight: 500, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, fontSize: "11px" }}>Hold Price</th>
              <th style={{ padding: "7px 16px", background: C.surface, color: C.red, fontWeight: 500, borderBottom: `1px solid ${C.border}`, fontSize: "11px" }}>Undercut</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style={{ padding: "7px 14px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, color: C.green, fontWeight: 500, fontSize: "11px" }}>Hold Price</td>
                <td style={{ padding: "9px 16px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, textAlign: "center", background: C.greenMuted }}>3, 3</td>
                <td style={{ padding: "9px 16px", borderBottom: `1px solid ${C.border}`, textAlign: "center", background: C.redMuted }}>0, 5</td>
              </tr>
              <tr>
                <td style={{ padding: "7px 14px", borderRight: `1px solid ${C.border}`, color: C.red, fontWeight: 500, fontSize: "11px" }}>Undercut</td>
                <td style={{ padding: "9px 16px", borderRight: `1px solid ${C.border}`, textAlign: "center" }}>5, 0</td>
                <td style={{ padding: "9px 16px", textAlign: "center", background: "#CC5F5F0C" }}>1, 1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Opponent */}
      <div style={{ marginBottom: "20px" }}>
        <Label>Opponent</Label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(STRATS).map(([id, st]) => (
            <Pill key={id} active={opp === id} color={st.c} onClick={() => { setOpp(id); setHist([]); }}>{st.n}</Pill>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: C.textMut, margin: "6px 0 0", fontStyle: "italic" }}>{s.d}</p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <Btn onClick={() => play("C")} color={C.green} disabled={over}>Hold Price</Btn>
        <Btn onClick={() => play("D")} color={C.red} textColor="#fff" disabled={over}>Undercut</Btn>
        <div style={{ flex: 1 }} />
        <Btn onClick={reset} outline>Reset</Btn>
      </div>

      {/* Scores */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
        <Stat label="You" value={scores.p} />
        <Stat label={s.n} value={scores.o} color={s.c} />
        <Stat label="Round" value={hist.length} sub={`/${ROUNDS}`} />
      </div>

      {/* Insight */}
      {over && (
        <div style={{ background: scores.p > scores.o ? C.greenMuted : scores.p < scores.o ? C.redMuted : C.amberMuted, border: `1px solid ${scores.p > scores.o ? C.green : scores.p < scores.o ? C.red : C.amber}30`, borderRadius: "3px", padding: "14px 18px", marginBottom: "18px" }}>
          <div style={{ fontSize: "14px", color: C.text, fontFamily: F.body, fontWeight: 500, marginBottom: "6px" }}>
            {scores.p > scores.o ? "You won." : scores.p < scores.o ? `${s.n} won.` : "Draw."}
          </div>
          <div style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.65 }}>
            {INSIGHTS[opp](scores.p >= scores.o, hist.some(r => r.p === "D"))}
          </div>
        </div>
      )}

      {/* History */}
      {hist.length > 0 && (
        <div>
          <Label>History</Label>
          <div style={{ maxHeight: "200px", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: "3px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
              <thead><tr style={{ position: "sticky", top: 0, background: C.surface }}>
                {["#", "You", "Them", "+You", "+Them"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut, fontFamily: F.body, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {hist.map(r => { const [pp, op] = PAY[r.p + r.o]; return (
                  <tr key={r.r}>
                    <td style={{ padding: "5px 10px", color: C.textMut }}>{r.r}</td>
                    <td style={{ padding: "5px 10px", color: r.p === "C" ? C.green : C.red }}>{FL[r.p]}</td>
                    <td style={{ padding: "5px 10px", color: r.o === "C" ? C.green : C.red }}>{FL[r.o]}</td>
                    <td style={{ padding: "5px 10px", color: pp >= 3 ? C.green : pp === 0 ? C.red : C.textSec }}>+{pp}</td>
                    <td style={{ padding: "5px 10px", color: op >= 3 ? C.green : op === 0 ? C.red : C.textSec }}>+{op}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
            <div ref={endRef} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEALED-BID AUCTION — full simulator
// ═══════════════════════════════════════════════════════════════════════════════
function SealedBidAuction({ onBack }) {
  const [numAI, setNumAI] = useState(5);
  const [bid, setBid] = useState("");
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [pnl, setPnl] = useState(0);

  const [round, setRound] = useState(() => {
    const tv = Math.floor(Math.random() * 120) + 40;
    return { tv, sig: tv + Math.floor(Math.random() * 61) - 30 };
  });

  const newRound = () => {
    const tv = Math.floor(Math.random() * 120) + 40;
    setRound({ tv, sig: tv + Math.floor(Math.random() * 61) - 30 });
    setBid(""); setResults(null);
  };

  const submit = () => {
    const b = parseFloat(bid); if (isNaN(b) || b < 0) return;
    const ai = Array.from({ length: numAI }, (_, i) => {
      const s = round.tv + Math.floor(Math.random() * 61) - 30;
      return { name: `Bidder ${String.fromCharCode(65 + i)}`, sig: s, bid: Math.round(s * (0.82 + Math.random() * 0.16)) };
    });
    const all = [{ name: "You", sig: round.sig, bid: b }, ...ai].sort((a, b) => b.bid - a.bid);
    const won = all[0].name === "You";
    const profit = won ? round.tv - b : 0;
    setPnl(p => p + profit);
    setResults({ tv: round.tv, all, won, profit, playerBid: b });
    setHistory(h => [...h, { r: h.length + 1, tv: round.tv, bid: b, won, profit }]);
  };

  const resetAll = () => { setPnl(0); setHistory([]); newRound(); };
  const wins = history.filter(r => r.won).length;
  const cursed = history.filter(r => r.won && r.profit < 0).length;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "12px", fontFamily: F.body, padding: 0, marginBottom: "14px" }}>← Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontFamily: F.display, color: C.text, fontWeight: 400 }}>Sealed-Bid Auction</h2>
        <Tag color={C.amber}>Winner's Curse</Tag>
      </div>
      <p style={{ color: C.textSec, fontSize: "13.5px", lineHeight: 1.65, margin: "8px 0 20px", maxWidth: "600px" }}>
        An asset has an unknown true value. You receive a noisy private estimate and submit a sealed bid against {numAI} competitors. Highest bid wins and pays their bid. The problem: the winner is systematically the one who overestimated the most.
      </p>

      <div style={{ marginBottom: "18px" }}>
        <Label>Competitors</Label>
        <div style={{ display: "flex", gap: "6px" }}>
          {[3, 5, 8, 12].map(n => <Pill key={n} active={numAI === n} onClick={() => { setNumAI(n); resetAll(); }}>{n}</Pill>)}
        </div>
        <p style={{ fontSize: "11.5px", color: C.textMut, margin: "5px 0 0", fontStyle: "italic" }}>More bidders amplifies the curse — the maximum overestimate grows with the field.</p>
      </div>

      {!results && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "3px" }}>Your Signal</div>
              <div style={{ fontSize: "36px", fontFamily: F.mono, color: C.amber, fontWeight: 600 }}>{round.sig}</div>
              <div style={{ fontSize: "11px", color: C.textMut, marginTop: "2px" }}>True value = signal ± 30</div>
            </div>
            <div style={{ flex: 1, minWidth: "170px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "6px" }}>Your Bid</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="number" value={bid} onChange={e => setBid(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Enter bid..."
                  style={{ flex: 1, padding: "10px 14px", background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: "3px", color: C.text, fontFamily: F.mono, fontSize: "16px", outline: "none", maxWidth: "150px" }} />
                <Btn onClick={submit} disabled={!bid || isNaN(parseFloat(bid))}>Submit</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "18px", marginBottom: "16px", flexWrap: "wrap" }}>
            <Stat label="True Value" value={results.tv} />
            <Stat label="Your Bid" value={results.playerBid} color={results.won ? C.amber : C.textSec} />
            <Stat label="Result" value={results.won ? (results.profit >= 0 ? `+${Math.round(results.profit)}` : Math.round(results.profit)) : "Lost"} color={results.won ? (results.profit >= 0 ? C.green : C.red) : C.textMut} />
          </div>
          <Label>All Bids</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "14px" }}>
            {results.all.map((b, i) => {
              const isYou = b.name === "You";
              const over = b.bid > results.tv;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 10px", borderRadius: "2px", background: isYou ? (i === 0 ? (results.profit >= 0 ? C.greenMuted : C.redMuted) : C.steelMuted) : "transparent", fontFamily: F.mono, fontSize: "12px" }}>
                  <span style={{ width: "16px", color: i === 0 ? C.amber : C.textMut, fontSize: "10px", textAlign: "center" }}>{i === 0 ? "★" : ""}</span>
                  <span style={{ width: "70px", color: isYou ? C.steel : C.textSec, fontWeight: isYou ? 600 : 400 }}>{b.name}</span>
                  <span style={{ width: "50px", color: C.textMut, fontSize: "11px" }}>sig {b.sig}</span>
                  <span style={{ width: "55px", color: over ? C.red : C.green }}>bid {Math.round(b.bid)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: "5px", width: `${Math.min(100, (b.bid / (results.tv * 1.5)) * 100)}%`, background: over ? C.red + "50" : C.green + "50", borderRadius: "3px", minWidth: "3px" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "13px 16px", marginBottom: "14px" }}>
            <div style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.65 }}>
              {results.won && results.profit < 0 && `Winner's curse. You paid ${Math.round(results.playerBid)} for an asset worth ${results.tv}, losing ${Math.abs(Math.round(results.profit))}. Winning a common-value auction is Bayesian bad news — it means your signal was the highest overestimate. With ${numAI + 1} bidders, bid ~${Math.round(68 - numAI)}% of your signal to compensate.`}
              {results.won && results.profit >= 0 && `Good shade — you paid ${Math.round(results.playerBid)} for an asset worth ${results.tv}. The key: bid as if your signal is the highest in the room, because if you win, it was.`}
              {!results.won && `You lost. The winner bid ${Math.round(results.all[0].bid)} for an asset worth ${results.tv}${results.all[0].bid > results.tv ? ` and overpaid by ${Math.round(results.all[0].bid) - results.tv}. The curse strikes.` : `.`} Not winning a common-value auction is often the correct outcome.`}
            </div>
          </div>
          <Btn onClick={newRound}>Next Round →</Btn>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <Label>Session — {history.length} rounds</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Cumulative P&L" value={pnl >= 0 ? `+${pnl}` : pnl} color={pnl >= 0 ? C.green : C.red} />
            <Stat label="Win Rate" value={`${wins}/${history.length}`} />
            <Stat label="Cursed Wins" value={cursed} color={cursed > 0 ? C.red : C.green} />
            <div style={{ alignSelf: "center" }}><Btn onClick={resetAll} outline>Reset</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERO — live mini-game
// ═══════════════════════════════════════════════════════════════════════════════
function HeroGame({ onGoDeeper }) {
  const [move, setMove] = useState(null);
  const [opp, setOpp] = useState(null);

  const play = (m) => {
    const o = Math.random() < 0.55 ? "C" : "D";
    setMove(m); setOpp(o);
  };
  const reset = () => { setMove(null); setOpp(null); };

  const result = move && opp ? PAY[move + opp] : null;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "24px", maxWidth: "400px" }}>
      {!move ? (
        <>
          <div style={{ fontSize: "13px", color: C.textSec, marginBottom: "14px", lineHeight: 1.5 }}>
            You're pricing against a competitor. They're deciding at the same time.
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => play("C")} style={{ flex: 1, padding: "14px", background: C.greenMuted, border: `1.5px solid ${C.green}40`, borderRadius: "3px", color: C.green, fontSize: "14px", fontFamily: F.body, fontWeight: 500, cursor: "pointer", transition: "all 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.green} onMouseLeave={e => e.currentTarget.style.borderColor = C.green + "40"}>
              Hold Price
            </button>
            <button onClick={() => play("D")} style={{ flex: 1, padding: "14px", background: C.redMuted, border: `1.5px solid ${C.red}40`, borderRadius: "3px", color: C.red, fontSize: "14px", fontFamily: F.body, fontWeight: 500, cursor: "pointer", transition: "all 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.red} onMouseLeave={e => e.currentTarget.style.borderColor = C.red + "40"}>
              Undercut
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "2px" }}>You</div>
              <div style={{ fontSize: "16px", fontFamily: F.mono, color: move === "C" ? C.green : C.red, fontWeight: 600 }}>{FL[move]}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "2px" }}>Opponent</div>
              <div style={{ fontSize: "16px", fontFamily: F.mono, color: opp === "C" ? C.green : C.red, fontWeight: 600 }}>{FL[opp]}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", padding: "10px 0 14px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, marginBottom: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: C.textMut, letterSpacing: "0.08em", textTransform: "uppercase" }}>Your payoff</div>
              <div style={{ fontSize: "26px", fontFamily: F.mono, color: result[0] >= 3 ? C.green : result[0] === 0 ? C.red : C.amber, fontWeight: 600 }}>{result[0]}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: C.textMut, letterSpacing: "0.08em", textTransform: "uppercase" }}>Their payoff</div>
              <div style={{ fontSize: "26px", fontFamily: F.mono, color: result[1] >= 3 ? C.green : result[1] === 0 ? C.red : C.amber, fontWeight: 600 }}>{result[1]}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={reset} style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "3px", color: C.textSec, fontSize: "12px", fontFamily: F.body, cursor: "pointer" }}>Again</button>
            <button onClick={onGoDeeper} style={{ flex: 1, padding: "8px", background: C.amber, border: "none", borderRadius: "3px", color: "#111", fontSize: "12px", fontFamily: F.body, fontWeight: 500, cursor: "pointer" }}>Play 20 rounds →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIBRARY DATA
// ═══════════════════════════════════════════════════════════════════════════════
const SIMS = [
  { id: "pd", name: "Prisoner's Dilemma", cat: "Repeated Games", catColor: C.steel, status: "live", desc: "Two firms, twenty rounds, six opponent strategies. See how cooperation and retaliation play out when the game doesn't end after one move.", finance: "Competitive pricing · Supplier relationships · Cartel stability" },
  { id: "auction", name: "Sealed-Bid Auction", cat: "Winner's Curse", catColor: C.amber, status: "live", desc: "Bid on an asset with uncertain value against AI opponents. Discover why the highest bidder systematically overpays — and how to correct for it.", finance: "IPO allocation · M&A bidding · Oil lease auctions" },
  { id: "nash", name: "Nash Bargaining", cat: "Negotiation", catColor: C.green, status: "soon", desc: "Split the surplus with adjustable BATNAs, patience, and outside options. See how each parameter shifts the negotiated outcome.", finance: "Salary negotiation · Deal structuring · Vendor contracts" },
  { id: "bank", name: "Bank Run", cat: "Coordination Crisis", catColor: C.red, status: "soon", desc: "N depositors choose simultaneously: wait or withdraw. Rational individual action cascades into systemic failure.", finance: "SVB · Northern Rock · Money market fund redemptions" },
  { id: "beauty", name: "Beauty Contest", cat: "Second-Order Thinking", catColor: "#B080D0", status: "soon", desc: "Guess ⅔ of the average guess. See how layers of strategic reasoning converge toward zero — and why markets overshoot.", finance: "Speculative bubbles · Momentum · Market timing" },
  { id: "signal", name: "Job Market Signaling", cat: "Information", catColor: "#E09050", status: "soon", desc: "Education as a signal of ability, even when it doesn't increase productivity. Adjust costs and see separating vs. pooling equilibria.", finance: "CFA/MBA credential value · IPO underpricing · Guidance credibility" },
  { id: "entry", name: "Entry Deterrence", cat: "Competitive Moats", catColor: "#70B0C0", status: "soon", desc: "An incumbent signals capacity to deter entry. See when bluffs work and when commitment is required.", finance: "Moat analysis · Predatory pricing · Capacity investment" },
  { id: "ultimatum", name: "Ultimatum Game", cat: "Behavioral Anomalies", catColor: "#D07070", status: "soon", desc: "Propose a split. See how 'irrational' rejections defy homo economicus — and what that means for deal-making.", finance: "Final-offer arbitration · Fee negotiation · Fairness norms" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function Home({ onNav }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ display: "flex", gap: "40px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "56px" }}>
        <div style={{ flex: 1, minWidth: "260px" }}>
          <h1 style={{ fontSize: "34px", fontFamily: F.display, fontWeight: 400, color: C.text, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Sagax
          </h1>
          <p style={{ fontSize: "13px", color: C.amber, fontFamily: F.body, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 20px", fontWeight: 500 }}>
            Applied Game Theory for Finance and Negotiation
          </p>
          <p style={{ fontSize: "15px", color: C.textSec, lineHeight: 1.7, margin: "0 0 8px", maxWidth: "440px" }}>
            Interactive simulators for the strategic interactions that shape financial markets. Auctions, negotiations, competitive dynamics, coordination failures. Each one framed with a real finance scenario and built to reveal the insight through experience.
          </p>
          <p style={{ fontSize: "13px", color: C.textMut, lineHeight: 1.6, margin: 0, maxWidth: "440px" }}>
            Make a move. ↓
          </p>
        </div>
        <HeroGame onGoDeeper={() => onNav("pd")} />
      </div>

      {/* ── Simulator Library ── */}
      <div style={{ marginBottom: "56px" }}>
        <Label>Simulators</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "10px" }}>
          {SIMS.map(sim => {
            const live = sim.status === "live";
            return (
              <div key={sim.id} onClick={live ? () => onNav(sim.id) : undefined}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "18px", cursor: live ? "pointer" : "default", transition: "all 0.12s", opacity: live ? 1 : 0.5, position: "relative" }}
                onMouseEnter={e => { if (live) { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.borderColor = C.borderStrong; } }}
                onMouseLeave={e => { if (live) { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; } }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Tag color={sim.catColor}>{sim.cat}</Tag>
                  {!live && <span style={{ fontSize: "10px", color: C.textMut, letterSpacing: "0.06em", textTransform: "uppercase" }}>Soon</span>}
                </div>
                <h3 style={{ fontSize: "15px", fontFamily: F.body, fontWeight: 500, color: C.text, margin: "0 0 7px" }}>
                  {sim.name}{live ? " →" : ""}
                </h3>
                <p style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.55, margin: "0 0 8px" }}>{sim.desc}</p>
                <div style={{ fontSize: "11px", color: C.textMut, fontStyle: "italic" }}>{sim.finance}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Philosophy ── */}
      <div style={{ marginBottom: "56px", padding: "24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px" }}>
        <Label>How Sagax Teaches</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "20px" }}>
          {[
            ["Play first", "Every simulator opens with a decision, not a definition. You form intuitions through action before encountering theory."],
            ["Finance-framed", "Each game maps to real scenarios — M&A bidding, salary negotiation, pricing strategy, liquidity crises."],
            ["Adjustable", "Change players, payoffs, noise, and discount rates. Watch the equilibrium shift under your hands."],
            ["Insight, not lecture", "A brief debrief after each game explains the result in one paragraph. Theory follows experience."],
          ].map(([t, d]) => (
            <div key={t}>
              <div style={{ fontSize: "13px", color: C.text, fontWeight: 500, marginBottom: "5px" }}>{t}</div>
              <div style={{ fontSize: "12px", color: C.textMut, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Newsletter ── */}
      <div style={{ marginBottom: "40px", padding: "24px", background: C.amberMuted, border: `1px solid ${C.amber}25`, borderRadius: "3px" }}>
        {!subscribed ? (
          <>
            <div style={{ fontSize: "15px", color: C.text, fontWeight: 500, marginBottom: "4px" }}>New simulator every month</div>
            <p style={{ fontSize: "13px", color: C.textSec, margin: "0 0 12px", lineHeight: 1.5 }}>
              One email when a new simulator drops. No spam, no fluff, just game theory applied to finance.
            </p>
            <div style={{ display: "flex", gap: "8px", maxWidth: "380px" }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                style={{ flex: 1, padding: "9px 14px", background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: "3px", color: C.text, fontFamily: F.body, fontSize: "13px", outline: "none" }} />
              <Btn onClick={() => { if (email.includes("@")) setSubscribed(true); }}>Subscribe</Btn>
            </div>
          </>
        ) : (
          <div style={{ fontSize: "14px", color: C.amber }}>✓ You're in. First email when Nash Bargaining ships.</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Sagax() {
  const [page, setPage] = useState("home");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      {/* ── Nav ── */}
      <nav style={{ maxWidth: "880px", margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <button onClick={() => setPage("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontSize: "18px", fontFamily: F.display, color: C.text, fontWeight: 400 }}>Sagax</span>
          <span style={{ fontSize: "10px", color: C.textMut, marginLeft: "8px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: F.body }}>
            /ˈsa.gaks/
          </span>
        </button>
        <div style={{ display: "flex", gap: "16px" }}>
          {page !== "home" && (
            <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "12px", fontFamily: F.body, letterSpacing: "0.04em" }}>Library</button>
          )}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{ maxWidth: "880px", margin: "0 auto", padding: "8px 24px 60px" }}>
        {page === "home" && <Home onNav={setPage} />}
        {page === "pd" && <PrisonersDilemma onBack={() => setPage("home")} />}
        {page === "auction" && <SealedBidAuction onBack={() => setPage("home")} />}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, maxWidth: "880px", margin: "0 auto", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: C.textFaint }}>Sagax · Applied game theory for finance and negotiation · Educational, not investment advice</span>
          <span style={{ fontSize: "11px", color: C.textFaint }}>Latin: keen, shrewd, perceptive</span>
        </div>
      </footer>
    </div>
  );
}
