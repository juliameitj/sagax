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
  always_defect: (w) => w ? "You matched or beat Always Defect, likely by defecting yourself. When your counterpart will never cooperate, mutual defection is the Nash equilibrium. In markets, this is the price war that destroys everyone's margins." : "Against a permanent defector, the best you can do is also defect: 1 point per round, mutual destruction. Cooperation cannot beat unconditional defection.",
  always_coop: () => "Against unconditional cooperation, defection dominates: you get 5 instead of 3 every round. A counterparty who never walks away leaves surplus on the table.",
  tit_for_tat: (w) => w ? "You beat Tit-for-Tat, probably by exploiting early rounds. Mutual cooperation yields 6 total per round vs. 2 for mutual defection. In Axelrod's 1984 tournaments, Tit-for-Tat was the strongest simple strategy in repeated games: nice, retaliatory, forgiving." : "Tit-for-Tat cooperates first, retaliates immediately, and forgives instantly. In business, this is the reputation for fair dealing that compounds over decades.",
  grudger: (w, defected) => defected ? "Grudger cooperates until betrayed, then defects forever. One defection costs you the cooperative surplus for all remaining rounds. Maintained trust is often worth more than any one-time gain from exploitation." : "You cooperated throughout and achieved maximum mutual payoff. Against a Grudger, sustained cooperation is optimal. A single defection cascades irreversibly.",
  random: () => "Against randomness, your strategy barely matters. Outcomes are driven by noise. In markets, this is trading against a counterparty you can't model. Defect, since you can't condition on their cooperation.",
  pavlov: () => "Pavlov (win-stay, lose-shift) adapts based on outcomes instead of mirroring your moves. It recovers from accidental defections better than Tit-for-Tat. In finance, Pavlov resembles momentum strategies: repeat what worked, reverse what didn't.",
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
        <Label>Payoff Matrix (you, opponent)</Label>
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
        An asset has an unknown true value. You receive a noisy private estimate and submit a sealed bid against {numAI} competitors. Highest bid wins and pays their bid. The winner is usually the one who overestimated the most.
      </p>

      <div style={{ marginBottom: "18px" }}>
        <Label>Competitors</Label>
        <div style={{ display: "flex", gap: "6px" }}>
          {[3, 5, 8, 12].map(n => <Pill key={n} active={numAI === n} onClick={() => { setNumAI(n); resetAll(); }}>{n}</Pill>)}
        </div>
        <p style={{ fontSize: "11.5px", color: C.textMut, margin: "5px 0 0", fontStyle: "italic" }}>More bidders amplifies the curse. The maximum overestimate grows with the field.</p>
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
              {results.won && results.profit < 0 && `Winner's curse. You paid ${Math.round(results.playerBid)} for an asset worth ${results.tv}, losing ${Math.abs(Math.round(results.profit))}. Winning a common-value auction is Bayesian bad news: your signal was the highest overestimate. With ${numAI + 1} bidders, bid ~${Math.round(68 - numAI)}% of your signal to compensate.`}
              {results.won && results.profit >= 0 && `Solid bid. You paid ${Math.round(results.playerBid)} for an asset worth ${results.tv}. Bid as if your signal is the highest in the room, because if you win, it was.`}
              {!results.won && `You lost. The winner bid ${Math.round(results.all[0].bid)} for an asset worth ${results.tv}${results.all[0].bid > results.tv ? ` and overpaid by ${Math.round(results.all[0].bid) - results.tv}. The curse strikes.` : `.`} Losing a common-value auction is often the right outcome.`}
            </div>
          </div>
          <Btn onClick={newRound}>Next Round →</Btn>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <Label>Session ({history.length} rounds)</Label>
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
// SHARED — simulator header
// ═══════════════════════════════════════════════════════════════════════════════
const SimHeader = ({ onBack, title, tag, tagColor, children }) => (
  <>
    <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "12px", fontFamily: F.body, padding: 0, marginBottom: "14px" }}>← Back</button>
    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
      <h2 style={{ margin: 0, fontSize: "20px", fontFamily: F.display, color: C.text, fontWeight: 400 }}>{title}</h2>
      <Tag color={tagColor}>{tag}</Tag>
    </div>
    <p style={{ color: C.textSec, fontSize: "13.5px", lineHeight: 1.65, margin: "8px 0 20px", maxWidth: "600px" }}>{children}</p>
  </>
);

const Insight = ({ tone = "neutral", title, children }) => {
  const map = { good: [C.greenMuted, C.green], bad: [C.redMuted, C.red], neutral: [C.amberMuted, C.amber] };
  const [bg, bd] = map[tone];
  return (
    <div style={{ background: bg, border: `1px solid ${bd}30`, borderRadius: "3px", padding: "14px 18px", marginBottom: "18px" }}>
      {title && <div style={{ fontSize: "14px", color: C.text, fontWeight: 500, marginBottom: "6px" }}>{title}</div>}
      <div style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
};

const Slider = ({ label, value, onChange, min, max, step = 1, suffix = "", hint }) => (
  <div style={{ marginBottom: "14px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
      <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "14px", fontFamily: F.mono, color: C.amber, fontWeight: 600 }}>{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: "100%", maxWidth: "300px", accentColor: C.amber, cursor: "pointer" }} />
    {hint && <div style={{ fontSize: "11px", color: C.textMut, fontStyle: "italic", marginTop: "3px" }}>{hint}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// NASH BARGAINING
// ═══════════════════════════════════════════════════════════════════════════════
function NashBargaining({ onBack }) {
  const [yourBatna, setYourBatna] = useState(20);
  const [theirBatna, setTheirBatna] = useState(20);
  const [patience, setPatience] = useState(0.8);
  const [offer, setOffer] = useState("");
  const [log, setLog] = useState([]);
  const [status, setStatus] = useState("playing"); // playing | deal | breakdown
  const [final, setFinal] = useState(null);
  const [countering, setCountering] = useState(false);
  const MAX_ROUNDS = 6;

  const round = log.filter(e => e.by === "you").length + 1;
  const pie = Math.round(100 * Math.pow(patience, log.length));
  const surplus = Math.max(0, 100 - yourBatna - theirBatna);
  const nbs = Math.round(yourBatna + surplus / 2);
  const rubinstein = Math.round(yourBatna + surplus / (1 + patience));

  // What the AI needs to accept: its BATNA plus what it expects from countering
  const aiThreshold = () => {
    const remainingPie = 100 * Math.pow(patience, log.length);
    const s = Math.max(0, remainingPie - yourBatna - theirBatna);
    return theirBatna + (patience * s) / (1 + patience);
  };

  const reset = () => { setLog([]); setStatus("playing"); setFinal(null); setOffer(""); setCountering(false); };

  const propose = () => {
    const keep = parseFloat(offer);
    if (isNaN(keep) || keep < 0 || keep > pie) return;
    setCountering(false);
    const give = pie - keep;
    const thresh = aiThreshold();

    if (give >= thresh) {
      setLog(l => [...l, { r: round, by: "you", keep, give, result: "accepted" }]);
      setFinal({ you: keep, them: give, rounds: round });
      setStatus("deal");
      return;
    }

    // AI rejects and counters
    const nextPie = 100 * Math.pow(patience, log.length + 1);
    const s = Math.max(0, nextPie - yourBatna - theirBatna);
    const aiKeeps = Math.round(theirBatna + s / (1 + patience));
    const aiGives = Math.round(nextPie - aiKeeps);

    const newLog = [
      ...log,
      { r: round, by: "you", keep, give, result: "rejected" },
      { r: round, by: "them", keep: aiGives, give: aiKeeps, result: "counter" },
    ];

    if (newLog.filter(e => e.by === "you").length >= MAX_ROUNDS) {
      setLog(newLog);
      setFinal({ you: yourBatna, them: theirBatna, rounds: MAX_ROUNDS, broke: true });
      setStatus("breakdown");
    } else {
      setLog(newLog);
      setOffer("");
    }
  };

  const acceptCounter = () => {
    const last = log[log.length - 1];
    setFinal({ you: last.keep, them: last.give, rounds: round, tookCounter: true });
    setStatus("deal");
  };

  const awaitingResponse = log.length > 0 && log[log.length - 1].by === "them" && status === "playing" && !countering;

  return (
    <div>
      <SimHeader onBack={onBack} title="Nash Bargaining" tag="Negotiation" tagColor={C.green}>
        You and a counterparty split 100 points. Each round you fail to agree, the total shrinks by the discount factor. If nobody agrees within {MAX_ROUNDS} rounds, you each fall back to your outside option (BATNA).
      </SimHeader>

      <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div style={{ minWidth: "220px" }}>
          <Slider label="Your BATNA" value={yourBatna} onChange={v => { setYourBatna(v); reset(); }} min={0} max={45} hint="What you get if talks collapse." />
          <Slider label="Their BATNA" value={theirBatna} onChange={v => { setTheirBatna(v); reset(); }} min={0} max={45} hint="Their fallback if talks collapse." />
          <Slider label="Patience" value={patience} onChange={v => { setPatience(v); reset(); }} min={0.5} max={0.95} step={0.05} hint="How slowly the pie shrinks each round." />
        </div>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <Label>Benchmarks</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "10px 14px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut }}>Nash Solution</div>
              <div style={{ fontSize: "18px", fontFamily: F.mono, color: C.textSec, fontWeight: 600 }}>{nbs}</div>
              <div style={{ fontSize: "11px", color: C.textMut, fontStyle: "italic" }}>Split the surplus evenly above both BATNAs.</div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "10px 14px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut }}>Rubinstein (first mover)</div>
              <div style={{ fontSize: "18px", fontFamily: F.mono, color: C.amber, fontWeight: 600 }}>{rubinstein}</div>
              <div style={{ fontSize: "11px", color: C.textMut, fontStyle: "italic" }}>Moving first is worth more when patience is low.</div>
            </div>
          </div>
        </div>
      </div>

      {status === "playing" && !awaitingResponse && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "3px" }}>Pie This Round</div>
              <div style={{ fontSize: "34px", fontFamily: F.mono, color: C.amber, fontWeight: 600 }}>{pie}</div>
              <div style={{ fontSize: "11px", color: C.textMut, marginTop: "2px" }}>Round {round} of {MAX_ROUNDS}</div>
            </div>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "6px" }}>You Keep</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input type="number" value={offer} onChange={e => setOffer(e.target.value)} onKeyDown={e => e.key === "Enter" && propose()} placeholder="0"
                  style={{ width: "110px", padding: "10px 14px", background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: "3px", color: C.text, fontFamily: F.mono, fontSize: "16px", outline: "none" }} />
                <span style={{ fontSize: "12px", color: C.textMut, fontFamily: F.mono }}>
                  they get {offer && !isNaN(parseFloat(offer)) ? Math.max(0, pie - parseFloat(offer)) : "—"}
                </span>
                <Btn onClick={propose} disabled={!offer || isNaN(parseFloat(offer))}>Offer</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {awaitingResponse && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <Label>They Rejected and Countered</Label>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <Stat label="You Would Get" value={log[log.length - 1].keep} color={C.amber} />
            <Stat label="They Keep" value={log[log.length - 1].give} color={C.textSec} />
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={acceptCounter} color={C.green}>Accept</Btn>
              <Btn onClick={() => { setOffer(""); setCountering(true); }} outline>Counter</Btn>
            </div>
          </div>
          <div style={{ fontSize: "11.5px", color: C.textMut, marginTop: "10px", fontStyle: "italic" }}>
            Rejecting shrinks the pie again. Delay is costly for both sides.
          </div>
        </div>
      )}

      {status !== "playing" && final && (
        <Insight tone={status === "deal" ? (final.you >= nbs ? "good" : "neutral") : "bad"}
          title={status === "deal" ? `Deal at round ${final.rounds}. You take ${final.you}.` : "Talks collapsed."}>
          {status === "breakdown" &&
            `Neither side conceded within ${MAX_ROUNDS} rounds, so you both fell back to your BATNAs: ${yourBatna} for you, ${theirBatna} for them. The ${surplus} points of surplus went unclaimed. In real negotiations, this is the deal that dies over a gap smaller than the value of doing the deal at all.`}
          {status === "deal" && final.you >= rubinstein &&
            `You captured ${final.you}, at or above the Rubinstein prediction of ${rubinstein}. Moving first is worth real money when the other side is impatient. Each round of delay costs them ${Math.round((1 - patience) * 100)}% of the remaining pie, which weakens their ability to hold out.`}
          {status === "deal" && final.you < rubinstein && final.you >= yourBatna &&
            `You settled for ${final.you}, below the Rubinstein prediction of ${rubinstein}. Your BATNA of ${yourBatna} sets the floor on what you should ever accept. Everything above that floor is negotiable, and how it splits depends on who can afford to wait longer.`}
          {status === "deal" && final.you < yourBatna &&
            `You accepted ${final.you}, which is below your BATNA of ${yourBatna}. Walking away would have paid more. The first rule of negotiation is knowing the number beneath which no deal beats a deal.`}
        </Insight>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
        <Btn onClick={reset} outline>Reset</Btn>
      </div>

      {log.length > 0 && (
        <div>
          <Label>Offer History</Label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
              <thead><tr style={{ background: C.surface }}>
                {["Rnd", "By", "You", "Them", "Result"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut, fontFamily: F.body, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {log.map((e, i) => (
                  <tr key={i}>
                    <td style={{ padding: "5px 10px", color: C.textMut }}>{e.r}</td>
                    <td style={{ padding: "5px 10px", color: e.by === "you" ? C.steel : C.textSec }}>{e.by === "you" ? "You" : "Them"}</td>
                    <td style={{ padding: "5px 10px", color: C.text }}>{e.keep}</td>
                    <td style={{ padding: "5px 10px", color: C.textSec }}>{e.give}</td>
                    <td style={{ padding: "5px 10px", color: e.result === "accepted" ? C.green : e.result === "rejected" ? C.red : C.textMut }}>{e.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANK RUN
// ═══════════════════════════════════════════════════════════════════════════════
function BankRun({ onBack }) {
  const [n, setN] = useState(10);
  const [insurance, setInsurance] = useState("none"); // none | partial | full
  const [climate, setClimate] = useState("nervous"); // calm | nervous | panicked
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const INS = { none: 0, partial: 50, full: 100 };
  const CLIMATE_P = { calm: 0.15, nervous: 0.4, panicked: 0.7 };
  const failThreshold = Math.ceil(n * 0.4);

  const run = (myMove) => {
    const p = CLIMATE_P[climate];
    // Insurance calms other depositors too
    const adj = insurance === "full" ? p * 0.35 : insurance === "partial" ? p * 0.7 : p;
    const others = Array.from({ length: n - 1 }, () => Math.random() < adj);
    const otherWithdrawals = others.filter(Boolean).length;
    const total = otherWithdrawals + (myMove === "withdraw" ? 1 : 0);
    const failed = total > failThreshold;

    let payoff;
    if (myMove === "wait") payoff = failed ? INS[insurance] : 120;
    else payoff = failed ? (total <= failThreshold + 2 ? 100 : Math.max(INS[insurance], 60)) : 100;

    const r = { myMove, others, otherWithdrawals, total, failed, payoff, n, failThreshold };
    setResult(r);
    setHistory(h => [...h, { r: h.length + 1, myMove, total, failed, payoff }]);
  };

  const reset = () => { setResult(null); setHistory([]); };
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.payoff, 0) / history.length) : 0;
  const failRate = history.length ? history.filter(h => h.failed).length : 0;

  return (
    <div>
      <SimHeader onBack={onBack} title="Bank Run" tag="Coordination Crisis" tagColor={C.red}>
        You are one of {n} depositors. The bank has lent out most of its deposits, so it can only pay {failThreshold} people on demand. Wait and the bank pays interest. Withdraw and you get your money back with no interest. If more than {failThreshold} people withdraw, the bank fails and late withdrawers lose most of their deposit.
      </SimHeader>

      <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div>
          <Label>Depositors</Label>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {[6, 10, 20].map(v => <Pill key={v} active={n === v} onClick={() => { setN(v); reset(); }}>{v}</Pill>)}
          </div>
          <Label>Deposit Insurance</Label>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {[["none", "None"], ["partial", "50%"], ["full", "100%"]].map(([k, l]) =>
              <Pill key={k} active={insurance === k} color={C.green} onClick={() => { setInsurance(k); reset(); }}>{l}</Pill>)}
          </div>
          <Label>Market Climate</Label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[["calm", "Calm"], ["nervous", "Nervous"], ["panicked", "Panicked"]].map(([k, l]) =>
              <Pill key={k} active={climate === k} color={C.red} onClick={() => { setClimate(k); reset(); }}>{l}</Pill>)}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <Label>Payoff Structure</Label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden", display: "inline-block" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
              <thead><tr>
                <th style={{ padding: "7px 14px", background: C.surface, color: C.textMut, fontFamily: F.body, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>Your move</th>
                <th style={{ padding: "7px 14px", background: C.surface, color: C.green, fontSize: "11px", fontWeight: 500, borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>Bank holds</th>
                <th style={{ padding: "7px 14px", background: C.surface, color: C.red, fontSize: "11px", fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>Bank fails</th>
              </tr></thead>
              <tbody>
                <tr>
                  <td style={{ padding: "7px 14px", color: C.green, fontSize: "11px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>Wait</td>
                  <td style={{ padding: "8px 14px", textAlign: "center", background: C.greenMuted, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>120</td>
                  <td style={{ padding: "8px 14px", textAlign: "center", background: C.redMuted, borderBottom: `1px solid ${C.border}` }}>{INS[insurance]}</td>
                </tr>
                <tr>
                  <td style={{ padding: "7px 14px", color: C.red, fontSize: "11px", borderRight: `1px solid ${C.border}` }}>Withdraw</td>
                  <td style={{ padding: "8px 14px", textAlign: "center", borderRight: `1px solid ${C.border}` }}>100</td>
                  <td style={{ padding: "8px 14px", textAlign: "center" }}>~{Math.max(INS[insurance], 60)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!result && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
          <Btn onClick={() => run("wait")} color={C.green}>Wait</Btn>
          <Btn onClick={() => run("withdraw")} color={C.red} textColor="#fff">Withdraw</Btn>
        </div>
      )}

      {result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Withdrawals" value={`${result.total}/${result.n}`} color={result.failed ? C.red : C.green} />
            <Stat label="Bank" value={result.failed ? "Failed" : "Held"} color={result.failed ? C.red : C.green} />
            <Stat label="Your Payoff" value={result.payoff} color={result.payoff >= 100 ? C.green : C.red} />
          </div>

          <Label>Depositors</Label>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div style={{
              width: "34px", height: "34px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center",
              background: result.myMove === "withdraw" ? C.redMuted : C.greenMuted,
              border: `1.5px solid ${result.myMove === "withdraw" ? C.red : C.green}`,
              fontSize: "9px", fontFamily: F.body, color: result.myMove === "withdraw" ? C.red : C.green, fontWeight: 600,
            }}>YOU</div>
            {result.others.map((w, i) => (
              <div key={i} style={{
                width: "34px", height: "34px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center",
                background: w ? C.redMuted : C.greenMuted,
                border: `1px solid ${w ? C.red : C.green}40`,
                fontSize: "13px", color: w ? C.red : C.green, fontFamily: F.mono,
              }}>{w ? "↓" : "•"}</div>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: C.textMut, marginBottom: "16px", fontFamily: F.body }}>
            ↓ withdrew · • waited · Bank fails above {result.failThreshold} withdrawals
          </div>

          <Insight tone={result.failed ? "bad" : "good"}>
            {result.failed && result.myMove === "wait" &&
              `The bank failed and you waited. You received ${result.payoff}. Nothing about the bank's loan book changed today. It failed because ${result.total} people believed it would fail. That belief was self-fulfilling, and being right about the fundamentals did not protect you.`}
            {result.failed && result.myMove === "withdraw" &&
              `The bank failed and you got out with ${result.payoff}. Withdrawing was individually rational. It was also part of what caused the failure. Every depositor faced the same logic, which is exactly why Diamond and Dybvig showed that bank runs are an equilibrium, not an accident.`}
            {!result.failed && result.myMove === "wait" &&
              `The bank held and you earned ${result.payoff}, the best available outcome. Only ${result.total} depositors withdrew, below the ${result.failThreshold} threshold. Coordination held this time. ${insurance === "none" ? "With no deposit insurance, that outcome depends entirely on collective nerve." : "Deposit insurance made everyone calmer, which made the run less likely, which is the point of it."}`}
            {!result.failed && result.myMove === "withdraw" &&
              `The bank held and you took ${result.payoff}. You gave up the 120 you would have earned by waiting. Withdrawing is cheap insurance when you are wrong about others and expensive when everyone is wrong together.`}
          </Insight>

          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={() => setResult(null)}>Run Again →</Btn>
            <Btn onClick={reset} outline>Reset</Btn>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <Label>Session · {history.length} runs</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Avg Payoff" value={avg} color={avg >= 100 ? C.green : C.red} />
            <Stat label="Bank Failures" value={`${failRate}/${history.length}`} color={failRate > 0 ? C.red : C.green} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEAUTY CONTEST
// ═══════════════════════════════════════════════════════════════════════════════
function BeautyContest({ onBack }) {
  const [n, setN] = useState(10);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const LEVEL_BASE = [50, 33.3, 22.2, 14.8, 9.9];

  const submit = () => {
    const g = parseFloat(guess);
    if (isNaN(g) || g < 0 || g > 100) return;

    // AI reasoning depth deepens as rounds accumulate
    const shift = Math.min(2, Math.floor(history.length / 2));
    const ai = Array.from({ length: n - 1 }, (_, i) => {
      const roll = Math.random();
      let lvl = roll < 0.15 ? 0 : roll < 0.45 ? 1 : roll < 0.75 ? 2 : roll < 0.92 ? 3 : 4;
      lvl = Math.min(4, lvl + shift);
      const base = lvl === 0 ? Math.random() * 100 : LEVEL_BASE[lvl];
      const noise = (Math.random() - 0.5) * 8;
      return { name: `P${i + 1}`, guess: Math.max(0, Math.min(100, Math.round((base + noise) * 10) / 10)), lvl };
    });

    const all = [{ name: "You", guess: g, lvl: null, you: true }, ...ai];
    const mean = all.reduce((s, p) => s + p.guess, 0) / all.length;
    const target = Math.round((mean * 2 / 3) * 10) / 10;
    const sorted = [...all].sort((a, b) => Math.abs(a.guess - target) - Math.abs(b.guess - target));
    const winner = sorted[0];

    setResult({ all, mean: Math.round(mean * 10) / 10, target, winner, yourGuess: g, yourDist: Math.round(Math.abs(g - target) * 10) / 10 });
    setHistory(h => [...h, { r: h.length + 1, guess: g, target, won: winner.you === true }]);
  };

  const next = () => { setGuess(""); setResult(null); };
  const reset = () => { setGuess(""); setResult(null); setHistory([]); };
  const wins = history.filter(h => h.won).length;

  return (
    <div>
      <SimHeader onBack={onBack} title="Beauty Contest" tag="Second-Order Thinking" tagColor="#B080D0">
        Pick a number between 0 and 100. The winner is whoever comes closest to two-thirds of the average guess across all {n} players. Keynes used this to describe markets: you are not picking the best asset, you are picking what everyone else will pick.
      </SimHeader>

      <div style={{ marginBottom: "18px" }}>
        <Label>Players</Label>
        <div style={{ display: "flex", gap: "6px" }}>
          {[5, 10, 20].map(v => <Pill key={v} active={n === v} onClick={() => { setN(v); reset(); }}>{v}</Pill>)}
        </div>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <Label>Reasoning Ladder</Label>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {[
            ["Level 0", "Guesses randomly. Average 50."],
            ["Level 1", "Assumes others are random. Guesses 33."],
            ["Level 2", "Assumes others are level 1. Guesses 22."],
            ["Level 3", "Guesses 15."],
            ["Nash", "Everyone reasons infinitely. Guesses 0."],
          ].map(([l, d], i) => (
            <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "8px 12px", flex: "1 1 130px" }}>
              <div style={{ fontSize: "11px", color: i === 4 ? C.amber : C.textSec, fontWeight: 500, marginBottom: "2px" }}>{l}</div>
              <div style={{ fontSize: "10.5px", color: C.textMut, lineHeight: 1.4 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {!result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <Label>Your Guess (0–100)</Label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="number" value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="0–100"
              style={{ width: "130px", padding: "10px 14px", background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: "3px", color: C.text, fontFamily: F.mono, fontSize: "16px", outline: "none" }} />
            <Btn onClick={submit} disabled={!guess || isNaN(parseFloat(guess))}>Submit</Btn>
          </div>
          {history.length > 0 && (
            <div style={{ fontSize: "11.5px", color: C.textMut, marginTop: "10px", fontStyle: "italic" }}>
              Last round the target was {history[history.length - 1].target}. The other players saw it too.
            </div>
          )}
        </div>
      )}

      {result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Average" value={result.mean} />
            <Stat label="Target (⅔)" value={result.target} color={C.amber} />
            <Stat label="Your Guess" value={result.yourGuess} color={result.winner.you ? C.green : C.textSec} />
            <Stat label="Off By" value={result.yourDist} color={result.winner.you ? C.green : C.red} />
          </div>

          <Label>Guess Distribution</Label>
          <div style={{ position: "relative", height: "70px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "3px", marginBottom: "6px" }}>
            {result.all.map((p, i) => (
              <div key={i} style={{
                position: "absolute", left: `${p.guess}%`, top: p.you ? "8px" : "34px", transform: "translateX(-50%)",
                fontSize: p.you ? "11px" : "10px", fontFamily: F.mono, color: p.you ? C.steel : C.textMut,
                fontWeight: p.you ? 600 : 400, whiteSpace: "nowrap",
              }}>{p.you ? "▼ YOU" : "•"}</div>
            ))}
            <div style={{ position: "absolute", left: `${result.target}%`, top: 0, bottom: 0, width: "2px", background: C.amber }} />
            <div style={{ position: "absolute", left: `${result.target}%`, bottom: "-1px", transform: "translateX(-50%)", fontSize: "9px", color: C.amber, fontFamily: F.mono, background: C.surface, padding: "0 3px" }}>
              {result.target}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: C.textFaint, fontFamily: F.mono, marginBottom: "16px" }}>
            <span>0</span><span>50</span><span>100</span>
          </div>

          <Insight tone={result.winner.you ? "good" : "neutral"} title={result.winner.you ? "You won." : `${result.winner.name} won with ${result.winner.guess}.`}>
            {result.yourGuess > 40 &&
              `You guessed ${result.yourGuess}, well above the target of ${result.target}. Guessing near 50 assumes everyone else picks randomly. The moment you assume others are also thinking, your guess should drop to about 33, then 22, and so on. Each layer of reasoning about other people's reasoning pulls the answer down.`}
            {result.yourGuess <= 40 && result.yourGuess > 15 &&
              `You guessed ${result.yourGuess} against a target of ${result.target}. You reasoned one or two levels deep, which is where most real players land. The Nash equilibrium here is 0, but nobody guesses 0 in round one because winning requires predicting actual behavior rather than ideal behavior.`}
            {result.yourGuess <= 15 &&
              `You guessed ${result.yourGuess}, close to the Nash equilibrium of 0. Playing the equilibrium is correct only if everyone else does too. Against real players who stop at level 1 or 2, guessing 0 loses. Markets punish being early in exactly the same way.`}
          </Insight>

          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={next}>Next Round →</Btn>
            <Btn onClick={reset} outline>Reset</Btn>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div>
          <Label>Target Convergence · {history.length} rounds</Label>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px", padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", marginBottom: "10px" }}>
            {history.map(h => (
              <div key={h.r} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "100%", maxWidth: "26px", height: `${Math.max(3, (h.target / 50) * 55)}px`, background: C.amber + "70", borderRadius: "2px" }} />
                <span style={{ fontSize: "9px", color: C.textMut, fontFamily: F.mono }}>{h.target}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Wins" value={`${wins}/${history.length}`} color={wins > 0 ? C.green : C.textSec} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB MARKET SIGNALING
// ═══════════════════════════════════════════════════════════════════════════════
function JobMarketSignaling({ onBack }) {
  const [costRatio, setCostRatio] = useState(2.5);
  const [threshold, setThreshold] = useState(6);
  const [education, setEducation] = useState(0);
  const [myType, setMyType] = useState(() => (Math.random() < 0.5 ? "high" : "low"));
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const WAGE_HI = 100, WAGE_LO = 50, COST_HI = 4;
  const costLo = COST_HI * costRatio;
  const myCost = myType === "high" ? COST_HI : costLo;

  // Separation requires: low type will not pay to reach the threshold
  const lowBreakeven = (WAGE_HI - WAGE_LO) / costLo;
  const highBreakeven = (WAGE_HI - WAGE_LO) / COST_HI;
  const separates = threshold > lowBreakeven && threshold <= highBreakeven;

  const submit = () => {
    const wage = education >= threshold ? WAGE_HI : WAGE_LO;
    const cost = education * myCost;
    const net = wage - cost;
    const trueValue = myType === "high" ? WAGE_HI : WAGE_LO;
    setResult({ type: myType, education, wage, cost, net, trueValue, correct: wage === trueValue });
    setHistory(h => [...h, { r: h.length + 1, type: myType, education, wage, net }]);
  };

  const next = () => {
    setMyType(Math.random() < 0.5 ? "high" : "low");
    setEducation(0);
    setResult(null);
  };
  const reset = () => { setHistory([]); next(); };
  const totalNet = history.reduce((s, h) => s + h.net, 0);

  return (
    <div>
      <SimHeader onBack={onBack} title="Job Market Signaling" tag="Information" tagColor="#E09050">
        You are a worker with private knowledge of your own ability. Education costs you money and adds nothing to your productivity. Employers cannot see your ability, only your education, and they pay {WAGE_HI} above the threshold and {WAGE_LO} below it. The question is whether education can separate the two types when it teaches nobody anything.
      </SimHeader>

      <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div style={{ minWidth: "230px" }}>
          <Slider label="Low-type cost multiple" value={costRatio} onChange={v => { setCostRatio(v); setResult(null); }} min={1} max={5} step={0.25} suffix="×"
            hint={`Low ability pays ${(COST_HI * costRatio).toFixed(1)} per year vs ${COST_HI} for high ability.`} />
          <Slider label="Employer threshold" value={threshold} onChange={v => { setThreshold(v); setResult(null); }} min={0} max={12} step={0.5}
            hint="Years of education required for the high wage." />
        </div>
        <div style={{ flex: 1, minWidth: "230px" }}>
          <Label>Equilibrium Check</Label>
          <div style={{ background: separates ? C.greenMuted : C.redMuted, border: `1px solid ${separates ? C.green : C.red}30`, borderRadius: "3px", padding: "12px 16px" }}>
            <div style={{ fontSize: "13px", color: separates ? C.green : C.red, fontWeight: 500, marginBottom: "5px" }}>
              {separates ? "Separating equilibrium" : threshold <= lowBreakeven ? "Pooling equilibrium" : "Nobody signals"}
            </div>
            <div style={{ fontSize: "11.5px", color: C.textSec, lineHeight: 1.55, fontFamily: F.mono }}>
              Low type mimics below {lowBreakeven.toFixed(1)} yrs<br />
              High type signals below {highBreakeven.toFixed(1)} yrs<br />
              Threshold set at {threshold} yrs
            </div>
          </div>
        </div>
      </div>

      {!result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontWeight: 600 }}>Your Type</span>
            <Tag color={myType === "high" ? C.green : C.red}>{myType === "high" ? "High Ability" : "Low Ability"}</Tag>
            <span style={{ fontSize: "11.5px", color: C.textMut, fontFamily: F.mono }}>education costs you {myCost.toFixed(1)}/yr</span>
          </div>
          <Slider label="Years of education" value={education} onChange={setEducation} min={0} max={12} step={0.5}
            hint={`Total cost: ${(education * myCost).toFixed(1)} · Wage you would be offered: ${education >= threshold ? WAGE_HI : WAGE_LO}`} />
          <Btn onClick={submit}>Enter the Job Market</Btn>
        </div>
      )}

      {result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Education" value={result.education} sub=" yrs" />
            <Stat label="Wage Offered" value={result.wage} color={result.wage === WAGE_HI ? C.green : C.textSec} />
            <Stat label="Education Cost" value={`−${result.cost.toFixed(0)}`} color={C.red} />
            <Stat label="Net Payoff" value={result.net.toFixed(0)} color={result.net > 50 ? C.green : result.net < 50 ? C.red : C.textSec} />
          </div>

          <Insight tone={result.net >= 50 ? "good" : "bad"}>
            {result.type === "high" && result.wage === WAGE_HI &&
              `You signalled successfully. ${result.education} years cost you ${result.cost.toFixed(0)} and bought you a wage of ${WAGE_HI}, netting ${result.net.toFixed(0)}. The education taught you nothing. Its entire value came from being too expensive for a low-ability worker to imitate. That is Spence's result: a costly signal works when the cost differs by type.`}
            {result.type === "high" && result.wage === WAGE_LO &&
              `You have high ability and the employer paid you ${WAGE_LO}. Ability the market cannot observe is ability the market will not pay for. Reaching the ${threshold}-year threshold would have cost ${(threshold * myCost).toFixed(0)} and returned ${WAGE_HI}, a net of ${(WAGE_HI - threshold * myCost).toFixed(0)}.`}
            {result.type === "low" && result.wage === WAGE_HI &&
              `You have low ability and got the high wage anyway. You paid ${result.cost.toFixed(0)} to clear a threshold of ${threshold} years, netting ${result.net.toFixed(0)}. The signal failed to separate because the threshold sits below your break-even point of ${lowBreakeven.toFixed(1)} years. When mimicry is affordable, the signal carries no information and the market pools.`}
            {result.type === "low" && result.wage === WAGE_LO &&
              `You have low ability and took the low wage, netting ${result.net.toFixed(0)}. Not signalling was correct: reaching ${threshold} years would have cost you ${(threshold * myCost).toFixed(0)} to gain only ${WAGE_HI - WAGE_LO}. The threshold is doing its job. It is high enough to be unaffordable to you and affordable to a high type.`}
          </Insight>

          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={next}>New Worker →</Btn>
            <Btn onClick={reset} outline>Reset</Btn>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <Label>History · {history.length} workers</Label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden", marginBottom: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
              <thead><tr style={{ background: C.surface }}>
                {["#", "Type", "Educ", "Wage", "Net"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut, fontFamily: F.body, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.r}>
                    <td style={{ padding: "5px 10px", color: C.textMut }}>{h.r}</td>
                    <td style={{ padding: "5px 10px", color: h.type === "high" ? C.green : C.red }}>{h.type}</td>
                    <td style={{ padding: "5px 10px", color: C.textSec }}>{h.education}</td>
                    <td style={{ padding: "5px 10px", color: h.wage === WAGE_HI ? C.green : C.textSec }}>{h.wage}</td>
                    <td style={{ padding: "5px 10px", color: h.net >= 50 ? C.green : C.red }}>{h.net.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Stat label="Total Net" value={totalNet.toFixed(0)} color={totalNet > 0 ? C.green : C.red} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY DETERRENCE
// ═══════════════════════════════════════════════════════════════════════════════
function EntryDeterrence({ onBack }) {
  const [entrantStrength, setEntrantStrength] = useState("weak"); // weak | strong
  const [invested, setInvested] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const MONOPOLY = 100, DUOPOLY = 40, WARRED = 20, INVEST_COST = 30;
  const ENTRANT_WAR = 10;
  const entryCost = entrantStrength === "weak" ? 35 : 5;

  const entrantEnters = (capacity) => {
    const profit = capacity === "high" ? ENTRANT_WAR - entryCost : DUOPOLY - entryCost;
    return profit > 0;
  };

  const choose = (capacity) => {
    const enters = entrantEnters(capacity);
    const investCost = capacity === "high" ? INVEST_COST : 0;
    let gross;
    if (!enters) gross = MONOPOLY;
    else gross = capacity === "high" ? WARRED : DUOPOLY;
    const payoff = gross - investCost;

    const altCapacity = capacity === "high" ? "low" : "high";
    const altEnters = entrantEnters(altCapacity);
    const altGross = !altEnters ? MONOPOLY : altCapacity === "high" ? WARRED : DUOPOLY;
    const altPayoff = altGross - (altCapacity === "high" ? INVEST_COST : 0);

    setInvested(capacity);
    setResult({ capacity, enters, payoff, gross, investCost, altCapacity, altPayoff, deterred: capacity === "high" && !enters });
    setHistory(h => [...h, { r: h.length + 1, capacity, enters, payoff, strength: entrantStrength }]);
  };

  const next = () => { setInvested(null); setResult(null); };
  const reset = () => { setHistory([]); next(); };
  const total = history.reduce((s, h) => s + h.payoff, 0);

  const Branch = ({ cap, label }) => {
    const enters = entrantEnters(cap);
    const ic = cap === "high" ? INVEST_COST : 0;
    const g = !enters ? MONOPOLY : cap === "high" ? WARRED : DUOPOLY;
    return (
      <div style={{ flex: 1, minWidth: "180px", background: C.surface, border: `1px solid ${invested === cap ? C.amber : C.border}`, borderRadius: "3px", padding: "14px" }}>
        <div style={{ fontSize: "12px", color: C.text, fontWeight: 500, marginBottom: "8px" }}>{label}</div>
        <div style={{ fontSize: "11px", color: C.textMut, fontFamily: F.mono, lineHeight: 1.7 }}>
          Investment cost: −{ic}<br />
          Entrant would: <span style={{ color: enters ? C.red : C.green }}>{enters ? "enter" : "stay out"}</span><br />
          Your gross: {g}<br />
          <span style={{ color: C.text }}>Net: {g - ic}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <SimHeader onBack={onBack} title="Entry Deterrence" tag="Competitive Moats" tagColor="#70B0C0">
        You are the incumbent in a monopoly worth {MONOPOLY}. A potential entrant is watching. You can invest {INVEST_COST} in excess capacity, which is only worth building if it convinces them to stay out. They observe your choice before deciding. A threat only works when carrying it out is in your interest.
      </SimHeader>

      <div style={{ marginBottom: "18px" }}>
        <Label>Entrant Type</Label>
        <div style={{ display: "flex", gap: "6px" }}>
          {[["weak", "Weak (entry costs 35)"], ["strong", "Strong (entry costs 5)"]].map(([k, l]) =>
            <Pill key={k} active={entrantStrength === k} color={k === "strong" ? C.red : C.green} onClick={() => { setEntrantStrength(k); reset(); }}>{l}</Pill>)}
        </div>
        <p style={{ fontSize: "11.5px", color: C.textMut, margin: "6px 0 0", fontStyle: "italic" }}>
          A strong entrant has low costs and can survive a price war. A weak one cannot.
        </p>
      </div>

      <Label>Payoff Tree</Label>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <Branch cap="low" label="Stay lean (no investment)" />
        <Branch cap="high" label={`Build excess capacity (−${INVEST_COST})`} />
      </div>

      {!result && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
          <Btn onClick={() => choose("low")} outline>Stay Lean</Btn>
          <Btn onClick={() => choose("high")}>Build Capacity</Btn>
        </div>
      )}

      {result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Your Choice" value={result.capacity === "high" ? "Capacity" : "Lean"} color={C.amber} />
            <Stat label="Entrant" value={result.enters ? "Entered" : "Stayed Out"} color={result.enters ? C.red : C.green} />
            <Stat label="Your Payoff" value={result.payoff} color={result.payoff >= result.altPayoff ? C.green : C.red} />
            <Stat label="Other Branch" value={result.altPayoff} color={C.textSec} />
          </div>

          <Insight tone={result.payoff >= result.altPayoff ? "good" : "bad"}
            title={result.deterred ? "Entry deterred." : result.enters ? "They entered anyway." : "Nobody wanted in."}>
            {result.deterred &&
              `The capacity investment worked. Building cost you ${INVEST_COST}, and it changed what a price war would look like badly enough that a weak entrant walked away. You kept the monopoly and netted ${result.payoff}, against ${result.altPayoff} if you had stayed lean. This is the textbook case for a credible commitment: the spending is only rational because it is irreversible and visible.`}
            {result.enters && result.capacity === "high" &&
              `You spent ${INVEST_COST} and they entered regardless, netting you ${result.payoff}. A strong entrant earns ${ENTRANT_WAR - entryCost} even in a price war, so the threat was never frightening. Staying lean would have paid ${result.altPayoff}. Commitment only deters when the other side actually loses money by ignoring it.`}
            {result.enters && result.capacity === "low" &&
              `You stayed lean and they entered, splitting the market for ${result.payoff} each. ${entrantStrength === "weak" ? `Against a weak entrant, capacity would have paid ${result.altPayoff}. You left the moat unbuilt.` : `Against this entrant, capacity would have paid ${result.altPayoff}, so staying lean was correct. Some moats cannot be bought.`}`}
            {!result.enters && result.capacity === "low" &&
              `They stayed out without you spending anything, so you kept the full ${MONOPOLY}. When entry is unprofitable on its own terms, paying to deter it destroys value. The investment is a cost you only take on when the counterfactual is worse.`}
          </Insight>

          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={next}>Play Again →</Btn>
            <Btn onClick={reset} outline>Reset</Btn>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <Label>Session · {history.length} plays</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Total Payoff" value={total} color={total > 0 ? C.green : C.red} />
            <Stat label="Avg" value={Math.round(total / history.length)} />
            <Stat label="Deterred" value={history.filter(h => !h.enters).length} color={C.green} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ULTIMATUM GAME
// ═══════════════════════════════════════════════════════════════════════════════
function UltimatumGame({ onBack }) {
  const [responder, setResponder] = useState("typical"); // rational | typical | proud
  const [offer, setOffer] = useState(50);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const PROFILES = {
    rational: { label: "Homo economicus", mean: 1, sd: 0, desc: "Accepts anything above zero. The game-theoretic prediction." },
    typical: { label: "Typical", mean: 30, sd: 9, desc: "Matches experimental data. Most people reject offers below about 30." },
    proud: { label: "Proud", mean: 45, sd: 6, desc: "Rejects anything that reads as an insult, even at real cost." },
  };

  const draw = () => {
    const p = PROFILES[responder];
    if (p.sd === 0) return p.mean;
    const u1 = Math.random(), u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.min(60, p.mean + z * p.sd));
  };

  const submit = () => {
    const threshold = draw();
    const accepted = offer >= threshold;
    const you = accepted ? 100 - offer : 0;
    const them = accepted ? offer : 0;
    setResult({ offer, threshold: Math.round(threshold * 10) / 10, accepted, you, them });
    setHistory(h => [...h, { r: h.length + 1, offer, accepted, you }]);
  };

  const next = () => setResult(null);
  const reset = () => { setHistory([]); setResult(null); };
  const total = history.reduce((s, h) => s + h.you, 0);
  const rejects = history.filter(h => !h.accepted).length;
  const avgTake = history.length ? Math.round(total / history.length) : 0;

  return (
    <div>
      <SimHeader onBack={onBack} title="Ultimatum Game" tag="Behavioral Anomalies" tagColor="#D07070">
        You have 100 points to divide. Offer the responder any amount. If they accept, you both keep your shares. If they reject, you both get nothing. Standard theory says offer 1 and they should take it. Twenty years of experiments say otherwise.
      </SimHeader>

      <div style={{ marginBottom: "18px" }}>
        <Label>Responder Profile</Label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(PROFILES).map(([k, p]) =>
            <Pill key={k} active={responder === k} color={k === "rational" ? C.steel : k === "proud" ? C.red : C.amber}
              onClick={() => { setResponder(k); reset(); }}>{p.label}</Pill>)}
        </div>
        <p style={{ fontSize: "11.5px", color: C.textMut, margin: "6px 0 0", fontStyle: "italic" }}>{PROFILES[responder].desc}</p>
      </div>

      {!result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <Slider label="You offer them" value={offer} onChange={setOffer} min={0} max={100}
            hint={`You would keep ${100 - offer}.`} />
          <div style={{ display: "flex", height: "30px", borderRadius: "3px", overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: "16px", maxWidth: "300px" }}>
            <div style={{ width: `${100 - offer}%`, background: C.amberMuted, borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: F.mono, color: C.amber }}>
              {100 - offer > 12 ? `you ${100 - offer}` : ""}
            </div>
            <div style={{ width: `${offer}%`, background: C.steelMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: F.mono, color: C.steel }}>
              {offer > 12 ? `them ${offer}` : ""}
            </div>
          </div>
          <Btn onClick={submit}>Make the Offer</Btn>
        </div>
      )}

      {result && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="You Offered" value={result.offer} color={C.steel} />
            <Stat label="Their Threshold" value={result.threshold} color={C.textSec} />
            <Stat label="Outcome" value={result.accepted ? "Accepted" : "Rejected"} color={result.accepted ? C.green : C.red} />
            <Stat label="You Keep" value={result.you} color={result.you > 0 ? C.green : C.red} />
          </div>

          <Insight tone={result.accepted ? "good" : "bad"}>
            {!result.accepted &&
              `Rejected. They walked away from ${result.offer} points to leave you with nothing, because their threshold was ${result.threshold}. Standard theory calls this irrational: ${result.offer} beats 0. Experiments across dozens of countries find the same pattern, which tells you that fairness enters the payoff function directly. In deal terms, an offer that reads as contemptuous can kill a transaction that was profitable for both sides.`}
            {result.accepted && result.offer < 25 &&
              `Accepted at ${result.offer}, and you kept ${result.you}. You got away with an aggressive split this time. Run it enough times and the rejection rate on offers this low will eat the gains. The expected value of a lowball offer is lower than it looks because the downside is total.`}
            {result.accepted && result.offer >= 25 && result.offer <= 45 &&
              `Accepted at ${result.offer}, and you kept ${result.you}. This is the zone where most real proposers land, and for good reason: it is high enough to clear typical fairness thresholds and low enough to keep most of the surplus. Note that theory says you left ${result.offer - 1} points on the table. Theory is wrong about how often that offer gets taken.`}
            {result.accepted && result.offer > 45 &&
              `Accepted at ${result.offer}, and you kept ${result.you}. An even split almost never gets rejected, but you paid for that certainty. The interesting question is what you were buying: with a one-shot anonymous counterparty, the insurance was probably overpriced.`}
          </Insight>

          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={next}>Next Offer →</Btn>
            <Btn onClick={reset} outline>Reset</Btn>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <Label>Session · {history.length} offers</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <Stat label="Total Kept" value={total} color={total > 0 ? C.green : C.red} />
            <Stat label="Avg per Offer" value={avgTake} />
            <Stat label="Rejections" value={`${rejects}/${history.length}`} color={rejects > 0 ? C.red : C.green} />
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
              <thead><tr style={{ background: C.surface }}>
                {["#", "Offered", "Result", "You Kept"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut, fontFamily: F.body, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.r}>
                    <td style={{ padding: "5px 10px", color: C.textMut }}>{h.r}</td>
                    <td style={{ padding: "5px 10px", color: C.steel }}>{h.offer}</td>
                    <td style={{ padding: "5px 10px", color: h.accepted ? C.green : C.red }}>{h.accepted ? "accepted" : "rejected"}</td>
                    <td style={{ padding: "5px 10px", color: h.you > 0 ? C.green : C.red }}>{h.you}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  { id: "pd", name: "Prisoner's Dilemma", cat: "Repeated Games", catColor: C.steel, status: "live", desc: "Two firms, twenty rounds, six opponent strategies. See how cooperation and retaliation play out over repeated moves.", finance: "Competitive pricing · Supplier relationships · Cartel stability" },
  { id: "auction", name: "Sealed-Bid Auction", cat: "Winner's Curse", catColor: C.amber, status: "live", desc: "Bid on an asset with uncertain value against AI opponents. Learn why the highest bidder overpays and how to adjust.", finance: "IPO allocation · M&A bidding · Oil lease auctions" },
  { id: "nash", name: "Nash Bargaining", cat: "Negotiation", catColor: C.green, status: "live", desc: "Split the surplus with adjustable BATNAs, patience, and outside options. See how each parameter shifts the negotiated outcome.", finance: "Salary negotiation · Deal structuring · Vendor contracts" },
  { id: "bank", name: "Bank Run", cat: "Coordination Crisis", catColor: C.red, status: "live", desc: "N depositors choose simultaneously: wait or withdraw. Rational individual action cascades into systemic failure.", finance: "SVB · Northern Rock · Money market fund redemptions" },
  { id: "beauty", name: "Beauty Contest", cat: "Second-Order Thinking", catColor: "#B080D0", status: "live", desc: "Guess ⅔ of the average guess. See how strategic reasoning layers converge toward zero and why markets overshoot.", finance: "Speculative bubbles · Momentum · Market timing" },
  { id: "signal", name: "Job Market Signaling", cat: "Information", catColor: "#E09050", status: "live", desc: "Education as a signal of ability, separate from productivity. Adjust costs and see separating vs. pooling equilibria.", finance: "CFA/MBA credential value · IPO underpricing · Guidance credibility" },
  { id: "entry", name: "Entry Deterrence", cat: "Competitive Moats", catColor: "#70B0C0", status: "live", desc: "An incumbent signals capacity to deter entry. See when bluffs work and when commitment is required.", finance: "Moat analysis · Predatory pricing · Capacity investment" },
  { id: "ultimatum", name: "Ultimatum Game", cat: "Behavioral Anomalies", catColor: "#D07070", status: "live", desc: "Propose a split. See how rejections that look irrational affect deal-making.", finance: "Final-offer arbitration · Fee negotiation · Fairness norms" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function Home({ onNav }) {
  
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubscribed(true);
      } else {
        console.error("Subscribe failed:", res.status, data);
        setError("Something went wrong. Try again.");
      }
    } catch (e) {
      console.error("Subscribe error:", e);
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

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
            Interactive simulators for strategic interactions in financial markets: auctions, negotiations, competitive dynamics, coordination failures. Each one uses a real finance scenario and teaches through play.
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
            ["Play first", "Every simulator starts with a decision. You play first, then read the theory."],
            ["Finance-framed", "Each game maps to real scenarios: M&A bidding, salary negotiation, pricing strategy, liquidity crises."],
            ["Adjustable", "Change players, payoffs, noise, and discount rates. Watch the equilibrium shift."],
            ["Brief debrief", "After each game, one paragraph explains the result. Theory follows experience."],
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
              One email when a new simulator drops. Game theory applied to finance.
            </p>
            <div style={{ display: "flex", gap: "8px", maxWidth: "380px" }}>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleSubscribe()} placeholder="you@example.com"
                style={{ flex: 1, padding: "9px 14px", background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: "3px", color: C.text, fontFamily: F.body, fontSize: "13px", outline: "none" }} />
              <Btn onClick={handleSubscribe} disabled={loading || !email.includes("@")}>Subscribe</Btn>
            </div>
            {error && <p style={{ fontSize: "12px", color: C.red, margin: "8px 0 0", lineHeight: 1.5 }}>{error}</p>}
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
        {page === "nash" && <NashBargaining onBack={() => setPage("home")} />}
        {page === "bank" && <BankRun onBack={() => setPage("home")} />}
        {page === "beauty" && <BeautyContest onBack={() => setPage("home")} />}
        {page === "signal" && <JobMarketSignaling onBack={() => setPage("home")} />}
        {page === "entry" && <EntryDeterrence onBack={() => setPage("home")} />}
        {page === "ultimatum" && <UltimatumGame onBack={() => setPage("home")} />}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, maxWidth: "880px", margin: "0 auto", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: C.textFaint }}>Sagax · Applied game theory for finance and negotiation · For education only</span>
          <span style={{ fontSize: "11px", color: C.textFaint }}>Latin: keen, shrewd, perceptive</span>
        </div>
      </footer>
    </div>
  );
}
