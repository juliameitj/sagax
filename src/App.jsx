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
  tit_for_tat:   { n: "Copycat",          tech: "Tit-for-Tat",      d: "Holds price first, then copies whatever you did last round.", c: C.steel },
  always_defect: { n: "Never Cooperates", tech: "Always Defect",    d: "Undercuts every round, no matter what you do.", c: C.red },
  always_coop:   { n: "Always Holds",     tech: "Always Cooperate", d: "Holds price every round, no matter what you do.", c: C.green },
  grudger:       { n: "One Strike",       tech: "Grudger",          d: "Holds price until you undercut once, then undercuts forever.", c: C.amber },
  random:        { n: "Coin Flip",        tech: "Random",           d: "Fifty-fifty each round. There is no pattern to read.", c: C.textSec },
  pavlov:        { n: "Win-Stay",         tech: "Pavlov",           d: "Repeats its last move if it paid well, switches if it didn't.", c: "#B080D0" },
};

// Plain-language explanation of each matrix cell, shown on hover
const CELL_HELP = {
  CC: "You both hold price. You get 3, they get 3.",
  CD: "You hold, they undercut. You get 0, they get 5.",
  DC: "You undercut, they hold. You get 5, they get 0.",
  DD: "You both undercut. You get 1, they get 1.",
};

// Running commentary, refreshed after every round.
// Priority runs most-specific first so the line always names what actually happened.
function commentary(hist, oppId) {
  if (!hist.length) return null;
  const k = hist.length, last = hist[k - 1], prev = k > 1 ? hist[k - 2] : null;
  let coop = 0, war = 0;
  for (let i = k - 1; i >= 0; i--) { if (hist[i].p === "C" && hist[i].o === "C") coop++; else break; }
  for (let i = k - 1; i >= 0; i--) { if (hist[i].p === "D" && hist[i].o === "D") war++; else break; }
  const firstD = hist.findIndex(r => r.p === "D");

  // Permanently locked out
  if (oppId === "grudger" && firstD >= 0 && k > firstD + 1)
    return { t: `You undercut on round ${firstD + 1}. They have not cooperated since, and they never will.`, c: C.red };
  // They just hit back
  if (last.p === "C" && last.o === "D" && prev && prev.p === "D")
    return { t: "They hit back for your undercut last round. That is what retaliation costs.", c: C.red };
  if (last.p === "C" && last.o === "D")
    return { t: "You held, they undercut. They took the round 5 to 0.", c: C.red };
  if (last.p === "D" && last.o === "C")
    return { t: "You undercut an opponent who was holding. 5 to 0 your way.", c: C.amber };
  if (coop >= 3) return { t: `${coop} straight rounds of mutual cooperation. You are both earning 3 a round.`, c: C.green };
  if (war >= 3)  return { t: `${war} rounds of mutual undercutting. You are both earning 1 instead of 3.`, c: C.red };
  if (oppId === "tit_for_tat" && prev && last.o === prev.p && last.p === "C" && last.o === "C")
    return { t: "They played your previous move straight back at you.", c: C.steel };
  if (last.p === "C" && last.o === "C") return { t: "Both held price. 3 each.", c: C.green };
  return { t: "Both undercut. 1 each, and the margin is gone.", c: C.red };
}

const PD_TRY = {
  tit_for_tat:   ["Hold price all 20 rounds. See what pure cooperation is worth.", "Undercut only on round 20. Check whether Copycat can punish a last-move betrayal.", "Play the same way against Never Cooperates and compare your score."],
  always_defect: ["Hold price all 20 rounds. Watch what unconditional trust costs you.", "Undercut every round instead. That is the Nash equilibrium here.", "Now play Always Holds the same way and compare the two."],
  always_coop:   ["Undercut all 20 rounds. That is the most you can possibly extract.", "Hold price all 20 rounds instead. Note how much you left behind.", "Try that same aggressive line against Copycat and watch it get punished."],
  grudger:       ["Hold price all 20 rounds for the maximum joint payoff.", "Undercut once on round 2, then hold. Watch the cost compound.", "Undercut on round 19 instead and compare the damage."],
  random:        ["Undercut every round. Against noise, defection dominates.", "Hold price every round and compare. Notice the gap.", "Switch to Copycat and see what predictability is worth."],
  pavlov:        ["Hold steadily and watch Win-Stay lock into cooperation with you.", "Undercut once mid-game. See how fast it recovers.", "Compare that against One Strike, which never recovers."],
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
  always_defect: (w) => w ? "You matched or beat Never Cooperates, likely by defecting yourself. When your counterpart will never cooperate, mutual defection is the Nash equilibrium. In markets, this is the price war that destroys everyone's margins." : "Against a permanent defector, the best you can do is also defect: 1 point per round, mutual destruction. Cooperation cannot beat unconditional defection.",
  always_coop: () => "Against unconditional cooperation, defection dominates: you get 5 instead of 3 every round. A counterparty who never walks away leaves surplus on the table.",
  tit_for_tat: (w) => w ? "You beat Copycat, probably by exploiting it early. Mutual cooperation yields 6 total per round vs. 2 for mutual defection. In Axelrod's 1984 tournaments, Tit-for-Tat was the strongest simple strategy in repeated games: nice, retaliatory, forgiving." : "Copycat cooperates first, retaliates immediately, and forgives instantly. In business, this is the reputation for fair dealing that compounds over decades.",
  grudger: (w, defected) => defected ? "One Strike holds price until betrayed, then defects forever. One defection costs you the cooperative surplus for all remaining rounds. Maintained trust is often worth more than any one-time gain from exploitation." : "You cooperated throughout and achieved maximum mutual payoff. Against One Strike, sustained cooperation is optimal. A single defection cascades irreversibly.",
  random: () => "Against randomness, your strategy barely matters. Outcomes are driven by noise. In markets, this is trading against a counterparty you can't model. Defect, since you can't condition on their cooperation.",
  pavlov: () => "Pavlov (win-stay, lose-shift) adapts based on outcomes instead of mirroring your moves. It recovers from accidental defections better than Copycat. In finance, Pavlov resembles momentum strategies: repeat what worked, reverse what didn't.",
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

  // Which matrix cell the last round landed in, and the live commentary line
  const lastCell = hist.length ? hist[hist.length - 1].p + hist[hist.length - 1].o : null;
  const note = commentary(hist, opp);
  const cell = (key, baseBg) => ({
    padding: "9px 16px", textAlign: "center",
    background: lastCell === key ? C.amber + "30" : baseBg,
    boxShadow: lastCell === key ? `inset 0 0 0 2px ${C.amber}` : "none",
    color: lastCell === key ? C.text : C.textSec,
    fontWeight: lastCell === key ? 600 : 400,
    transition: "background 0.25s, box-shadow 0.25s, color 0.25s",
    cursor: "help",
  });

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
        <Label>Payoff Matrix (you, opponent){lastCell ? " — highlighted cell is the last round" : ""}</Label>
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
                <td title={CELL_HELP.CC} style={{ ...cell("CC", C.greenMuted), borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>3, 3</td>
                <td title={CELL_HELP.CD} style={{ ...cell("CD", C.redMuted), borderBottom: `1px solid ${C.border}` }}>0, 5</td>
              </tr>
              <tr>
                <td style={{ padding: "7px 14px", borderRight: `1px solid ${C.border}`, color: C.red, fontWeight: 500, fontSize: "11px" }}>Undercut</td>
                <td title={CELL_HELP.DC} style={{ ...cell("DC", "transparent"), borderRight: `1px solid ${C.border}` }}>5, 0</td>
                <td title={CELL_HELP.DD} style={cell("DD", "#CC5F5F0C")}>1, 1</td>
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
        <p style={{ fontSize: "12px", color: C.textMut, margin: "7px 0 0" }}>
          <span style={{ fontFamily: F.mono, color: C.textFaint }}>{s.tech}</span>
          <span style={{ margin: "0 7px", color: C.textFaint }}>·</span>
          <span style={{ fontStyle: "italic" }}>{s.d}</span>
        </p>
      </div>

      <Goal>Finish all {ROUNDS} rounds with more points than your opponent.</Goal>

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

      {/* Running commentary */}
      {note && !over && (
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "18px", padding: "9px 14px", background: C.surface, borderLeft: `2px solid ${note.c}`, borderRadius: "2px" }}>
          <span style={{ color: note.c, fontFamily: F.mono, fontSize: "12px", flexShrink: 0 }}>&rsaquo;</span>
          <span style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.5 }}>{note.t}</span>
        </div>
      )}

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

      {over && <TryThis items={PD_TRY[opp]} />}

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

      <ModelBrief id="pd" />
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

      <Goal>Buy the asset for less than it turns out to be worth, and keep your cumulative P&amp;L positive across rounds.</Goal>

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
          <TryThis items={[
            "Bid your signal exactly, with no shading. Run five rounds and check your P&L.",
            "Now bid about 70% of your signal and compare. The gap is the size of the curse.",
            "Push the field to 12 competitors and keep the same strategy. Watch the curse get worse.",
          ]} />

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

      <ModelBrief id="auction" />
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
// MODEL LIBRARY — business framing and case studies for all 22 models
// `own` is the diagnostic pitch: where this shows up in the reader's own business.
// `cases` cite only sources that have been verified; `url` is omitted otherwise.
// ═══════════════════════════════════════════════════════════════════════════════

const CATS = {
  strategic: { label: "Strategic Interaction", color: C.steel, blurb: "Who moves, who responds, and what the response costs." },
  auctions:  { label: "Auctions & Pricing",    color: C.amber, blurb: "What to bid, and why winning is often the bad outcome." },
  info:      { label: "Information & Signaling", color: "#E09050", blurb: "Who knows what, who can prove it, and how that distorts behaviour." },
  coord:     { label: "Coordination & Herding", color: C.red, blurb: "Failures that happen without anyone acting against you." },
  behave:    { label: "Behavioural",           color: "#D07070", blurb: "Where real people reliably depart from the theory." },
  commit:    { label: "Commitment & Attrition", color: "#B080D0", blurb: "What you have sunk, and what that buys you." },
  meta:      { label: "Design & Meta-Strategy", color: "#70B0C0", blurb: "Changing the rules instead of playing them better." },
};

const MODELS = {
  pd: {
    n: 1, cat: "strategic", sim: true,
    own: "You are in a repeated game with every supplier, every anchor client, and every competitor in your market. The only question is whether they know it. A procurement team that squeezes a supplier for three points this quarter has traded a permanent relationship for a temporary margin, and the supplier prices that risk into every future quote. The variable that decides whether cooperation holds is not goodwill. It is the discount rate each side applies to the future.",
    key: "Cooperation survives on the shadow of the future. When the horizon shortens — a CEO nearing exit, a firm nearing distress, a contract nearing its final year — it collapses on schedule.",
    diag: "Which of my counterparties believes this relationship has an endpoint, and what is that belief already costing me?",
    cases: [
      { t: "OPEC production quotas", y: "ongoing", b: "Quota discipline is a cooperative equilibrium in a repeated game. It holds while members value future revenue over present volume, and breaks whenever a member's horizon shortens through fiscal stress or sanctions. The cartel does not fail because members stop being rational. It fails because the discount rate moves." },
      { t: "US airline capacity discipline", y: "2010s", b: "After consolidation reduced the industry to four major carriers, capacity growth stayed restrained for years and margins recovered. Fewer players means each one is more visible, retaliation is faster, and the shadow of the future is longer. Same industry, same economics, different equilibrium." },
    ],
  },

  nash: {
    n: 2, cat: "strategic", sim: true,
    own: "Every renewal, every raise, every vendor contract and every term sheet is this game. Most operators spend their preparation time building arguments. Arguments move almost nothing. What moves the split is what happens to each side if the talk fails. If your largest customer is 40% of revenue and you are 3% of their spend, you can be entirely right about the value you deliver and still lose the negotiation, because the model does not price who is right.",
    key: "Your ask is close to irrelevant. Your walk-away option is close to everything. Building an alternative is a higher-return activity than sharpening a pitch.",
    diag: "For my three largest counterparties, what actually happens to me on the day the relationship ends? If I cannot answer in numbers, I am negotiating blind.",
    cases: [
      { t: "Customer concentration in supplier contracts", y: "general", b: "Suppliers with a single dominant buyer routinely accept terms far below the value they create. The gap is not a failure of negotiation skill. It is an accurate reflection of asymmetric outside options, which is why diversification of the customer base raises realised prices without any change in the sales approach." },
      { t: "Competing offers in compensation", y: "general", b: "The reliable mechanism for a material pay increase is a credible external offer, not a performance argument. This is Nash bargaining working exactly as specified: the surplus moves toward whoever can most credibly walk." },
    ],
  },

  cournot: {
    n: 3, cat: "strategic", sim: true,
    own: "Before you decide whether to add a production line, cut price, or invest in differentiation, you need to know which game your industry is actually playing. If you compete on capacity in a commodity, adding a line lowers the market price for everyone including you. If you compete on price in a differentiated category, even modest differentiation restores pricing power. Most strategic errors are not errors of execution. They are the right move played in the wrong industry structure.",
    key: "In quantity competition, capacity destroys industry margin. In price competition, differentiation creates it. Diagnose which one you are in before choosing a lever.",
    diag: "When my nearest competitor adds capacity, does my price fall? If yes, I am in a Cournot world and my capacity decisions are pricing decisions.",
    cases: [
      { t: "Bulk commodity industries", y: "general", b: "Steel, cement, bulk chemicals and shipping approximate quantity competition. Industry-wide capacity additions during upcycles are followed reliably by margin compression, because every producer's expansion lowers the clearing price for all of them. Capacity discipline is the primary margin lever." },
      { t: "Differentiated software and services", y: "general", b: "SaaS and professional services approximate price competition softened by differentiation. Undifferentiated offerings are pushed toward marginal cost by direct comparison, while genuine switching costs or product distinctiveness restore pricing power. Here the lever is differentiation, not restraint." },
    ],
  },

  entry: {
    n: 4, cat: "strategic", sim: true,
    own: "Every moat you claim to have is a commitment claim, and it is only worth something if it is sunk, visible, and painful to reverse. A stated intention to defend a market is worth nothing, because the entrant knows you can quietly change your mind. Capital already spent, capacity already built, contracts already signed and channels already locked are worth something, because they change what you would rationally do on the day entry happens.",
    key: "Deterrence requires costly, observable, irreversible commitment. A bluff that gets called is worse than no bluff, because it publishes your weakness.",
    diag: "If a well-funded competitor entered my main market next quarter, what have I already sunk that would make fighting them rational rather than merely satisfying?",
    cases: [
      { t: "Persistent low-margin operation as a deterrent", y: "general", b: "A firm that operates at structurally thin margins for years signals an unusually long payback tolerance. Potential entrants must assume the incumbent will not blink, because the incumbent has already demonstrated it for a decade. The signal is credible precisely because it has been expensive." },
      { t: "Defensive patent portfolios", y: "general", b: "Large defensive portfolios often generate little licensing revenue, which looks like waste until you read them as entry deterrence. The portfolio raises the legal cost of entry, and the money already spent filing it is the sunk commitment that makes the threat credible." },
    ],
  },

  chicken: {
    n: 5, cat: "strategic", sim: true,
    own: "This is the structure of every standoff you have been in where both sides said the deal was dead. Hostile bids, union negotiations, litigation brinkmanship, and any renegotiation where both parties have threatened to walk. The counterintuitive result is that flexibility is a liability here. The party who can most credibly destroy their own ability to back down captures the surplus, which is why negotiators hire counsel with no discretion and boards adopt provisions they cannot quietly reverse.",
    key: "Rationality requires that someone yields. The advantage goes to whoever can most credibly appear unable to yield, which makes removing your own options a strategy rather than a mistake.",
    diag: "In my current standoff, who has more room to quietly climb down? That party will, and both sides already know it.",
    cases: [
      { t: "Poison pills and takeover defence", y: "general", b: "A shareholder rights plan is a commitment device. It removes the board's ability to accept a hostile bid cheaply, and that removal is the point. The defence works by making capitulation structurally expensive rather than merely undesirable." },
      { t: "Public positions in negotiation", y: "general", b: "Parties who state a red line publicly are deliberately raising their own cost of retreat. The statement is not communication. It is the destruction of an option, performed in front of witnesses so that the other side must price it." },
    ],
  },

  auction: {
    n: 6, cat: "auctions", sim: true,
    own: "Any competitive process where the asset's value is uncertain and roughly the same for everyone puts you here: acquiring a company, bidding for a contract, competing for a scarce hire. Your valuation is not wrong on average. It is wrong conditional on winning, because you only win when your estimate sits at the top of the distribution. That conditioning is the whole problem, and it gets worse as the field grows. Most acquirers never make the adjustment because it feels like bidding to lose.",
    key: "This is structural, not a bias. Even fully rational bidders must shade downward, and the correct discount increases with the number of competitors.",
    diag: "In our last competitive process, did we adjust our number for the fact that winning would itself be evidence we were the most optimistic party in the room?",
    cases: [
      { t: "UK 3G spectrum auction", y: "2000", b: "The auction raised roughly £22.5bn against pre-auction estimates of £2–4bn, and heavy debt loads followed across European telecoms. Analysis attributes the escalation to common-value uncertainty combined with executives treating a licence as existential. Whether the winners were measurably cursed is contested: one event study found no systematic negative market reaction.", s: "LSE Business Review", u: "https://blogs.lse.ac.uk/businessreview/2023/02/13/avoiding-regret-how-mobile-phone-companies-and-others-can-learn-lessons-from-overbidding-in-spectrum-auctions/" },
      { t: "Competitive M&A processes", y: "general", b: "Acquirer returns in contested auctions are persistently weaker than in negotiated deals. The auction format does the damage: it selects for the most optimistic valuation in the room and hands the asset to whoever holds it." },
    ],
  },

  vickrey: {
    n: 7, cat: "auctions", sim: true,
    own: "If you run any allocation process — procurement, internal capital budgeting, dividing a bonus pool, assigning territories — you are choosing an auction format whether you realise it or not, and the format you choose determines whether people tell you the truth. Under first-price rules, everyone shades and you receive strategic numbers. Under second-price rules, truthful reporting becomes the dominant strategy and the numbers you receive are usable.",
    key: "The format of the game changes behaviour more reliably than instruction does. If participants are gaming you, redesign the rules before blaming the people.",
    diag: "Does my budgeting process reward division heads for accurate forecasts, or for inflated ones that survive the haircut I am known to apply?",
    cases: [
      { t: "Online advertising auctions", y: "general", b: "Generalised second-price mechanisms became the standard for search advertising because they reduce the need for bidders to model each other. Truthful bidding is close to optimal, which lowers the cost of participating and raises the quality of the information the platform receives." },
      { t: "Reverse procurement auctions", y: "general", b: "Second-price structures in procurement extract more honest cost information from suppliers than sealed first-price rounds, because suppliers no longer need to guess how much padding their competitors have added." },
    ],
  },

  signal: {
    n: 8, cat: "info", sim: true,
    own: "You cannot prove quality directly, so you spend money to prove it indirectly, and so does everyone selling to you. Your certifications, your office, your client list, your audit, your buyback, your dividend. Each works only while it stays expensive for a weaker firm to imitate. The moment a signal becomes cheap enough for anyone to send, it stops carrying information and you are paying for something that no longer separates you from anyone.",
    key: "A signal works only if it is differentially costly. When a credential gets easy to obtain, its value collapses and a costlier one replaces it.",
    diag: "Which of my quality signals could a materially worse competitor buy this year for the same price I paid? Those have already stopped working.",
    cases: [
      { t: "Dividends and buybacks as credibility", y: "general", b: "A committed dividend is expensive for a firm with unstable cashflow and cheap for one without that problem, which is exactly what makes it informative. The payment itself signals nothing. Its differential cost across firm types does." },
      { t: "Credential inflation", y: "general", b: "As a qualification becomes widely held, its separating power falls and employers move to a costlier screen. The content taught is unchanged. What changed is the cost gap between candidates who can obtain it and candidates who cannot." },
    ],
  },

  lemons: {
    n: 9, cat: "info", sim: true,
    own: "If your buyers cannot tell your quality apart from your worst competitor's, you are priced at the average of the category and your best work is subsidising someone else's worst. This is why good firms exit undifferentiated markets: not because they cannot compete, but because they cannot get paid. The entire industry of warranties, ratings, audits, guarantees and diligence exists to solve exactly this, and every one of them is a mechanism for closing the information gap.",
    key: "Information asymmetry does not merely cause inefficiency. It can unravel the market entirely, and the high-quality participants leave first.",
    diag: "What can a buyer verify about my quality before purchase? If the honest answer is nothing, I am being priced as the average of my category.",
    cases: [
      { t: "Insurance adverse selection", y: "general", b: "When healthy individuals face pools priced at average risk, they exit, which raises the average risk, which raises the price, which drives out the next healthiest tier. Underwriting, risk classification and mandates all exist to interrupt this spiral." },
      { t: "Secondary private-market stakes", y: "general", b: "Stakes in private funds trade at persistent discounts partly because buyers assume sellers hold private information about weaker underlying holdings. The discount is the price of the information gap, and it applies even to genuinely good books." },
    ],
  },

  hazard: {
    n: 10, cat: "info", sim: true,
    own: "Anyone acting on your behalf whose effort you cannot fully observe is running this game on you: sales staff, fund managers, contractors, franchisees, executives. The failure mode is not dishonesty. It is that you built a contract where they hold the upside and you hold the downside, and they responded rationally. Every compensation scheme you have ever written is an answer to this problem, whether or not you were thinking about it when you wrote it.",
    key: "Moral hazard is a contract design problem. Clawbacks, deferral, co-investment and monitoring all work by forcing the agent to hold some of the downside.",
    diag: "For each person acting on my behalf: if this goes badly, what do they personally lose? If the answer is nothing, I have written an option and given it away.",
    cases: [
      { t: "Wells Fargo cross-selling", y: "2016–2020", b: "Sales quotas tied to product counts, without a control holding staff accountable for account legitimacy, produced millions of unauthorised accounts. Around 5,300 employees were dismissed and the bank paid a $185m regulatory penalty in 2016, later followed by a $3bn settlement. The incentive did precisely what it was designed to do.", s: "NPR", u: "https://www.npr.org/sections/thetwo-way/2016/09/08/493130449/wells-fargo-to-pay-around-190-million-over-fake-accounts-that-sparked-bonuses" },
      { t: "Convex compensation and risk-taking", y: "general", b: "Performance fees without clawbacks create asymmetric payoffs: the manager captures upside and the investor absorbs downside. Increased risk-taking follows, not from malice but from correctly reading the contract that was offered." },
    ],
  },

  bank: {
    n: 11, cat: "coord", sim: true,
    own: "Any business funded by money that can leave quickly is exposed to this, and it has nothing to do with whether you are solvent. Confidence-sensitive funding, a concentrated customer base that talks to each other, a supplier who can demand cash terms, a credit line reviewed annually. The run does not require anyone to believe you are failing. It only requires each party to believe the others might move first.",
    key: "Solvency is not sufficient. Liquidity, maturity mismatch, and the coordination problem among your creditors can destroy a solvent business.",
    diag: "Who can withdraw from me fastest, do they talk to each other, and how many of them moving at once would break me?",
    cases: [
      { t: "Silicon Valley Bank", y: "2023", b: "After announcing a $1.8bn securities loss and a capital raise, depositors attempted to withdraw roughly $42bn in a single day, close to a quarter of total deposits. The customer base was concentrated, highly networked and overwhelmingly uninsured, which compressed a classic run into hours.", s: "Federal Reserve OIG", u: "https://oig.federalreserve.gov/reports/board-material-loss-review-silicon-valley-bank-sep2023.pdf" },
      { t: "Deposit insurance as a coordination fix", y: "general", b: "Insurance works by removing the incentive to move first, which removes the need to guess what others will do. The intervention does not improve the loan book. It changes the game from a coordination trap into one with a single obvious action.", s: "FDIC", u: "https://www.fdic.gov/news/speeches/2023/spmar2723.html" },
    ],
  },

  beauty: {
    n: 12, cat: "coord", sim: true,
    own: "Pricing, hiring, positioning and timing are all partly beauty contests. You are not choosing what is best. You are choosing what your market will treat as best, and your competitors are doing the same calculation about you. Any analysis that models fundamentals without modelling what other participants believe about those fundamentals has left out the variable that actually moves the outcome.",
    key: "Reflexivity is not a distortion of markets. It is the permanent structure of any market with heterogeneous participants and uncertain fundamentals.",
    diag: "Am I positioning for what customers value, or for what customers believe other customers value? In most categories the second one prices the first.",
    cases: [
      { t: "Momentum and crowded trades", y: "general", b: "Momentum persists because participants buy what they expect others to buy. The strategy requires no view on fundamental value at all, only a view about the next layer of belief, which is the beauty contest running as a business model." },
      { t: "Bubble dynamics", y: "general", b: "Bubbles reach their late stage when most participants privately believe the asset is overpriced and continue buying because they expect others to keep buying. The consensus on value and the consensus on price come apart entirely." },
    ],
  },

  cascade: {
    n: 13, cat: "coord", sim: true,
    own: "Your industry's consensus may be built on two early opinions and a long queue of people who deferred. When your peers, your board or your analysts all agree, you need to know whether that agreement represents independent judgements converging or a chain of people copying whoever moved first. The two look identical from the outside and are worth completely different amounts. A cascade also means your own private information never enters the pool, so the group is confident and uninformed at the same time.",
    key: "Cascades are informationally fragile. One credible contrarian signal can shatter a consensus that took years to build, because the consensus was never load-bearing.",
    diag: "When my industry agrees on something, how many people actually ran the analysis, and how many are standing behind whoever ran it first?",
    cases: [
      { t: "Analyst rating clustering", y: "general", b: "Once several analysts publish the same view, later analysts face career risk from deviating and informational pressure to conform. Coverage converges without new evidence entering, which is why unexpected disclosures can reverse a whole cohort at once." },
      { t: "Follow-on investment rounds", y: "general", b: "A credible lead investor's commitment triggers co-investors who partly substitute the lead's diligence for their own. The round looks heavily validated while containing much less independent analysis than the participant count suggests." },
    ],
  },

  prospect: {
    n: 14, cat: "behave", sim: true,
    own: "Your customers, your staff and you evaluate every outcome against a reference point rather than in absolute terms, and losses weigh roughly twice as much as equivalent gains. This decides how you price, how you frame a concession, how you report performance, and whether you will hold a failing project too long. The most expensive version in business is the one you run on yourself: risk-seeking in the domain of losses is what keeps doomed projects funded.",
    key: "The reference point is the operating variable. The same outcome framed as avoiding a loss rather than forgoing a gain produces different decisions from the same person.",
    diag: "Which of my current commitments am I continuing because stopping would realise a loss rather than because continuing has positive expected value?",
    cases: [
      { t: "The disposition effect", y: "general", b: "Investors sell winners early and hold losers too long. Gains are evaluated in the risk-averse domain and losses in the risk-seeking domain, so the same person applies two different risk appetites within one portfolio without noticing." },
      { t: "Reference points in pricing", y: "general", b: "Anchoring to a higher reference price changes willingness to pay for an unchanged product. Discount framing works for the same reason: it moves the comparison point rather than the offer." },
    ],
  },

  ultimatum: {
    n: 15, cat: "behave", sim: true,
    own: "You will lose deals that were profitable for both sides because the split felt insulting. This is not sentimentality and it does not disappear with sophisticated counterparties. Fee structures, revenue shares, partner splits, redundancy terms and supplier pricing during scarcity all carry a fairness constraint that binds independently of the arithmetic. Businesses built on the assumption that people accept rational but unfair terms consistently underestimate resistance.",
    key: "Fairness is a binding constraint, not a soft one. People punish perceived unfairness at real personal cost, and they do it reliably enough to plan around.",
    diag: "Would my counterparty describe our split as fair to a peer? If not, I am carrying rejection risk that does not appear anywhere in my model.",
    cases: [
      { t: "Scarcity pricing and reputational cost", y: "general", b: "Suppliers who raise prices sharply during shortages frequently face customer defection that outlasts the shortage. The short-term margin is real and the long-term repricing of the relationship is larger, which is a fairness penalty rather than a market response." },
      { t: "Pay transparency and retention", y: "general", b: "Employees who discover they are paid below peers experience a fairness violation that affects effort and retention even when absolute compensation is strong. The reference point is the peer, not the market." },
    ],
  },

  stag: {
    n: 16, cat: "commit", sim: true,
    own: "The most valuable projects in your business need someone else to commit alongside you: a co-investor, a channel partner, an industry standard, a joint bid. These fail far more often from uncertainty than from betrayal. Nobody in a stag hunt wants to defect. They just cannot afford to be the only one who showed up. If your partnerships keep dying at the commitment stage, the problem is probably confidence rather than incentives, and those need completely different fixes.",
    key: "This is the trust game, and it is distinct from the prisoner's dilemma. There is no temptation to defect. The only barrier is uncertainty about the other side.",
    diag: "Is this partner failing to commit because the deal is bad for them, or because they cannot tell whether I will commit? Those need opposite responses.",
    cases: [
      { t: "Syndicated lending", y: "general", b: "Each bank commits only if it believes the syndicate will fill. A credible lead arranger solves the problem by removing ambiguity about whether others will follow, which is why lead economics are worth paying for." },
      { t: "Industry standard adoption", y: "general", b: "No firm benefits from adopting a standard alone. Consortium structures, public pledges and phased commitments all work by reducing uncertainty about what others will do, rather than by changing anyone's payoff from the standard itself." },
    ],
  },

  attrition: {
    n: 17, cat: "commit", sim: true,
    own: "Price wars, litigation, and subsidised customer acquisition all have this structure, and the arithmetic is unforgiving. In a symmetric contest the expected value to both sides is roughly zero, because the fight consumes the prize. The rational move is usually to concede early, and almost nobody does, because by the time the maths is obvious you have sunk enough that quitting feels like admitting the earlier spending was wasted. Recognising the structure before you are deep in it is the entire advantage.",
    key: "In a symmetric war of attrition the contest dissipates the value of the prize. Sunk costs do not justify continuing, but they reliably make exit feel impossible.",
    diag: "If I entered this fight today knowing only what it will cost from here, would I enter? If not, the money already spent is not a reason to continue.",
    cases: [
      { t: "Subsidised growth races", y: "2010s", b: "Ride-hailing and delivery platforms subsidised below cost for years in winner-take-most markets, each waiting for competitors to exhaust funding. The accumulated subsidy across all participants exceeded the value of the market position that was eventually won." },
      { t: "Patent litigation between resourced firms", y: "general", b: "Both sides continue funding legal costs until one calculates that further spending exceeds the patent's value. Settlements typically arrive after most of the disputed value has already been consumed by the process." },
    ],
  },

  holdup: {
    n: 18, cat: "commit", sim: true,
    own: "The moment you invest in something that only has value inside one relationship — tooling for a single client, integration with one platform, a facility next to one buyer — the other side can reopen the terms and you cannot credibly leave. Worse, the anticipation of this stops efficient investment before it happens. This is the real reason firms integrate vertically, and it explains why control rights are frequently worth more than price terms.",
    key: "Incomplete contracts cannot cover every contingency. Where they fail, the party with the more specific investment bears the risk, which is why control rights outrank price.",
    diag: "What have I built that is worth far less outside this one relationship, and what stops the counterparty from repricing me once they notice?",
    cases: [
      { t: "Supplier tooling lock-in", y: "general", b: "A manufacturer that tools a facility for one buyer's specification has created an asset with little outside value. Renegotiation risk follows automatically, which is why long-term volume commitments are negotiated before the capital is committed rather than after." },
      { t: "Vertical integration decisions", y: "general", b: "Firms integrate upstream or downstream specifically to remove hold-up exposure on a critical input. The decision is frequently misread as a scale or margin play when it is a contracting problem." },
    ],
  },

  mechanism: {
    n: 19, cat: "meta", sim: true,
    own: "If people in your organisation are behaving in ways you dislike, the mechanism is the first suspect and the people are the last. Commission structures, bonus schemes, budget processes, promotion criteria and KPIs are all games you designed, and participants are playing them correctly. Exhortation, culture initiatives and monitoring are attempts to fix by force what the incentive is producing by design, which is why they rarely hold.",
    key: "Inverse game theory: rather than analysing behaviour in a given game, design the game so that self-interested behaviour produces the outcome you want.",
    diag: "What is my compensation structure literally paying for, as opposed to what I intend it to reward? Where those differ, the structure wins.",
    cases: [
      { t: "Cross-selling quotas", y: "2016–2020", b: "A metric that rewarded product count without a countervailing control on legitimacy produced exactly the behaviour it paid for. Subsequent analysis focused on the design of the incentive rather than the ethics of individual staff, because the pattern was too widespread to be individual.", s: "Harvard Law School Forum on Corporate Governance", u: "https://corpgov.law.harvard.edu/2019/02/06/the-wells-fargo-cross-selling-scandal-2/" },
      { t: "Internal capital allocation", y: "general", b: "Division heads inflate projections when they expect a standard haircut, and the haircut exists because projections are inflated. Both sides are responding correctly to a mechanism that rewards distortion. Fixing it requires changing the rule, not the forecasts." },
    ],
  },

  realopt: {
    n: 20, cat: "meta", sim: true,
    own: "Standard investment analysis compares acting now against never acting, which is not the choice you actually face. You can almost always wait, stage the commitment, or buy the right to decide later. That right has value, and the value rises with uncertainty. If you have ever rejected a high-variance project on net present value, you probably undervalued it, because the model you used has no way to price the option to stop.",
    key: "DCF systematically undervalues flexibility under uncertainty. The question shifts from whether the value is positive to what the option is worth and what information would change the decision.",
    diag: "Can I buy the right to decide this later instead of deciding now? What would that right cost, and what would it be worth once the uncertainty resolves?",
    cases: [
      { t: "Staged venture funding", y: "general", b: "Each round is an option exercise conditioned on information revealed since the last one. The staging is not an artefact of caution. It is the mechanism that makes investing under extreme uncertainty rational at all." },
      { t: "Land and resource options", y: "general", b: "Developers acquire options on land rather than buying outright, preserving flexibility while conditions resolve. The option premium is the price of not having to be right today." },
    ],
  },

  schelling: {
    n: 21, cat: "meta", sim: true,
    own: "A large share of what looks like deliberate design in your industry is historical accident that persisted because everyone expected everyone else to keep following it. Payment terms, notice periods, pricing tiers, contract defaults, fiscal calendars. Recognising these as focal points rather than optima does two things: it stops you assuming current convention is efficient, and it shows you that setting a convention is available as a strategy.",
    key: "Focal points have power from mutual expectation rather than from merit. Nothing about them needs to be optimal for them to be extremely stable.",
    diag: "Which conventions in my industry does everyone follow without being able to explain why? Each one is either an opportunity to deviate or an opportunity to set the next one.",
    cases: [
      { t: "Benchmark rate persistence", y: "general", b: "A reference rate embedded in enough contracts becomes self-reinforcing regardless of whether it is the best available measure, because coordinated switching is costly even when unilateral switching is cheap. Replacing one requires deliberate coordination, not merely a better alternative." },
      { t: "Round-number anchoring", y: "general", b: "Offers cluster at salient round numbers because those numbers are mutually obvious, not because they are more accurate. Deliberately pricing off the focal point can shift the whole negotiation range." },
    ],
  },

  cheaptalk: {
    n: 22, cat: "meta", sim: true,
    own: "Most of what you are told in business costs the speaker nothing and cannot be verified in advance. Guidance, projections, pipeline reports, letters of intent, and any assurance that a deal will close. Credibility is not a function of confidence or seniority. It is a function of whether the speaker's interests align with yours, and the test is short: would they say the same thing if the opposite were true?",
    key: "Costless, unverifiable communication is only credible where interests partially align. Where they diverge, a rational listener discounts the message to nothing.",
    diag: "For the last three assurances I acted on: what did the speaker lose if they were wrong? If nothing, I treated cheap talk as information.",
    cases: [
      { t: "Forward guidance", y: "general", b: "Management projections cost nothing to issue and cannot be verified in advance, which is why markets weight them by track record rather than content. Firms with a history of missing are discounted regardless of how the current guidance is worded." },
      { t: "Sell-side price targets", y: "general", b: "Targets carry reputational consequences but no direct cost, and structural incentives push them upward. The persistent optimistic bias is a predictable output of misaligned interests rather than a failure of analysis." },
    ],
  },
};

const Goal = ({ children }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "18px", padding: "10px 14px", background: C.surface, borderLeft: `2px solid ${C.amber}`, borderRadius: "2px", flexWrap: "wrap" }}>
    <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.amber, fontWeight: 600, whiteSpace: "nowrap" }}>Your goal</span>
    <span style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.5 }}>{children}</span>
  </div>
);

const TryThis = ({ items }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.steel}`, borderRadius: "2px", padding: "14px 18px", marginBottom: "18px" }}>
    <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.steel, fontWeight: 600, marginBottom: "9px" }}>Try this next</div>
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: "9px", fontSize: "12.5px", color: C.textSec, lineHeight: 1.5 }}>
          <span style={{ color: C.textFaint, fontFamily: F.mono, flexShrink: 0 }}>&rarr;</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
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

      <Goal>Agree a split that beats your BATNA. Aim to take more than half of the surplus above both outside options.</Goal>

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

      {status !== "playing" && (
        <TryThis items={[
          "Open with the Rubinstein number instead of an even split. See whether they still accept.",
          "Drop patience to 0.5 and reopen. Impatience hands the first mover more of the pie.",
          "Raise your BATNA to 40 and negotiate again. A better walk-away option is worth real points.",
        ]} />
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

      <ModelBrief id="nash" />
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

      <Goal>Walk away with the highest payoff. Waiting pays the most, but only if enough other people also wait.</Goal>

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
          <TryThis items={[
            "Set the climate to Panicked with no insurance and wait ten times. Count the failures.",
            "Keep the climate panicked and switch insurance to 100%. Run it again and compare.",
            "Nothing about the bank's loans changed between those two runs. Only the beliefs did.",
          ]} />

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

      <ModelBrief id="bank" />
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

      <Goal>Land closer to two-thirds of the average than anyone else. You are guessing at other people's guesses.</Goal>

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
          <TryThis items={[
            "Guess 33 next round, which assumes everyone else guesses randomly.",
            "Then guess 22, which assumes everyone else guessed 33. Notice which one wins.",
            "Play six rounds without changing your number. Watch the target move away from you.",
          ]} />

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

      <ModelBrief id="beauty" />
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

      <Goal>Maximise your net payoff: the wage you are offered, minus everything your education cost you.</Goal>

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
          <TryThis items={[
            "Drop the cost multiple to 1.5. The threshold stops separating and the market pools.",
            "Push it to 4 and watch the separating band open up again.",
            "Set education to 0 as a high type. Being good is worthless if nobody can see it.",
          ]} />

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

      <ModelBrief id="signal" />
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

      <Goal>Pick the branch that leaves you with the higher payoff. The tree below shows both outcomes before you commit.</Goal>

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
          <TryThis items={[
            "Build capacity against a weak entrant, then against a strong one. Same move, opposite result.",
            "Stay lean against the weak entrant. Compare what the unbuilt moat cost you.",
            "Read the tree before choosing next time. Both payoffs are visible in advance.",
          ]} />

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

      <ModelBrief id="entry" />
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

      <Goal>Keep as much of the 100 as you can without getting rejected. A rejection pays you nothing.</Goal>

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
          <TryThis items={[
            "Offer 1 to Homo economicus. That is what standard theory predicts you should do.",
            "Offer 1 to a Typical responder ten times. Count how much you actually walk away with.",
            "Find the offer that maximises your average take. It is nowhere near 1.",
          ]} />

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

      <ModelBrief id="ultimatum" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL BRIEF — business framing + case studies, shown at the foot of every model
// ═══════════════════════════════════════════════════════════════════════════════
function ModelBrief({ id }) {
  const m = MODELS[id];
  if (!m) return null;
  const cat = CATS[m.cat];
  return (
    <div style={{ marginTop: "40px", paddingTop: "28px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <span style={{ fontFamily: F.mono, fontSize: "11px", color: C.textFaint }}>MODEL {String(m.n).padStart(2, "0")}</span>
        <Tag color={cat.color}>{cat.label}</Tag>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.amber}`, borderRadius: "2px", padding: "18px 20px", marginBottom: "14px" }}>
        <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.amber, fontWeight: 600, marginBottom: "9px" }}>Where this shows up in your business</div>
        <p style={{ fontSize: "13.5px", color: C.textSec, lineHeight: 1.7, margin: 0 }}>{m.own}</p>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "22px" }}>
        <div style={{ flex: "1 1 260px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "2px", padding: "14px 18px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontWeight: 600, marginBottom: "7px" }}>Key insight</div>
          <p style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.6, margin: 0 }}>{m.key}</p>
        </div>
        <div style={{ flex: "1 1 260px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "2px", padding: "14px 18px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.steel, fontWeight: 600, marginBottom: "7px" }}>Ask yourself</div>
          <p style={{ fontSize: "12.5px", color: C.text, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{m.diag}</p>
        </div>
      </div>

      <Label>Case studies</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {m.cases.map((cs, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "2px", padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "9px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", color: C.text, fontWeight: 500 }}>{cs.t}</span>
              <span style={{ fontSize: "11px", color: C.textFaint, fontFamily: F.mono }}>{cs.y}</span>
            </div>
            <p style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.6, margin: 0 }}>{cs.b}</p>
            {cs.s && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: C.textMut }}>
                Source:{" "}
                {cs.u
                  ? <a href={cs.u} target="_blank" rel="noopener noreferrer" style={{ color: C.steel, textDecoration: "underline", textUnderlineOffset: "2px" }}>{cs.s}</a>
                  : <span style={{ color: C.textMut }}>{cs.s}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC 2×2 MATRIX GAME — powers Chicken and Stag Hunt
// ═══════════════════════════════════════════════════════════════════════════════
function MatrixGame({ onBack, id, title, tag, tagColor, blurb, goal, la, lb, pay, help, oppLogic, oppLabel, debrief, tryThis }) {
  const [hist, setHist] = useState([]);
  const [last, setLast] = useState(null);
  const total = hist.reduce((s, h) => s + pay[h.p + h.o][0], 0);

  const play = (m) => {
    const o = oppLogic(hist);
    const rec = { p: m, o, r: hist.length + 1 };
    setHist(h => [...h, rec]);
    setLast(rec);
  };
  const reset = () => { setHist([]); setLast(null); };
  const cellKey = last ? last.p + last.o : null;
  const cellSty = (k, bg) => ({
    padding: "9px 16px", textAlign: "center", cursor: "help",
    background: cellKey === k ? C.amber + "30" : bg,
    boxShadow: cellKey === k ? `inset 0 0 0 2px ${C.amber}` : "none",
    color: cellKey === k ? C.text : C.textSec, fontWeight: cellKey === k ? 600 : 400,
    transition: "all 0.25s",
  });

  return (
    <div>
      <SimHeader onBack={onBack} title={title} tag={tag} tagColor={tagColor}>{blurb}</SimHeader>
      <Goal>{goal}</Goal>

      <Label>Payoff Matrix (you, them){cellKey ? " — highlighted cell is the last round" : ""}</Label>
      <div style={{ display: "inline-block", border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden", marginBottom: "18px" }}>
        <table style={{ borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12.5px" }}>
          <thead><tr>
            <th style={{ padding: "7px 14px", background: C.surface, color: C.textMut, fontFamily: F.body, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>You \ Them</th>
            <th style={{ padding: "7px 16px", background: C.surface, color: C.green, fontSize: "11px", fontWeight: 500, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>{la}</th>
            <th style={{ padding: "7px 16px", background: C.surface, color: C.red, fontSize: "11px", fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{lb}</th>
          </tr></thead>
          <tbody>
            <tr>
              <td style={{ padding: "7px 14px", color: C.green, fontSize: "11px", fontWeight: 500, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>{la}</td>
              <td title={help.CC} style={{ ...cellSty("CC", C.greenMuted), borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>{pay.CC[0]}, {pay.CC[1]}</td>
              <td title={help.CD} style={{ ...cellSty("CD", "transparent"), borderBottom: `1px solid ${C.border}` }}>{pay.CD[0]}, {pay.CD[1]}</td>
            </tr>
            <tr>
              <td style={{ padding: "7px 14px", color: C.red, fontSize: "11px", fontWeight: 500, borderRight: `1px solid ${C.border}` }}>{lb}</td>
              <td title={help.DC} style={{ ...cellSty("DC", "transparent"), borderRight: `1px solid ${C.border}` }}>{pay.DC[0]}, {pay.DC[1]}</td>
              <td title={help.DD} style={cellSty("DD", C.redMuted)}>{pay.DD[0]}, {pay.DD[1]}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: "11.5px", color: C.textMut, marginBottom: "14px", fontStyle: "italic" }}>{oppLabel}</div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" }}>
        <Btn onClick={() => play("C")} color={C.green}>{la}</Btn>
        <Btn onClick={() => play("D")} color={C.red} textColor="#fff">{lb}</Btn>
        <div style={{ flex: 1 }} />
        <Btn onClick={reset} outline>Reset</Btn>
      </div>

      {last && (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="This Round" value={pay[last.p + last.o][0]} color={pay[last.p + last.o][0] >= pay.CC[0] ? C.green : C.red} />
            <Stat label="Them" value={pay[last.p + last.o][1]} color={C.textSec} />
            <Stat label="Your Total" value={total} color={total >= 0 ? C.green : C.red} />
            <Stat label="Rounds" value={hist.length} />
          </div>
          <Insight tone={pay[last.p + last.o][0] >= pay.CC[0] ? "good" : "bad"}>
            {debrief(last, hist)}
          </Insight>
          <TryThis items={tryThis} />
        </>
      )}

      <ModelBrief id={id} />
    </div>
  );
}

function Chicken({ onBack }) {
  return <MatrixGame
    onBack={onBack} id="chicken" title="Chicken" tag="Brinkmanship" tagColor={C.steel}
    blurb="You and a rival are both escalating. If one of you backs down, the one who held firm takes the prize. If neither backs down, you both take serious damage. If both back down, nothing much happens either way."
    goal="Take the prize without triggering mutual destruction. There is no move that is safe against every opponent."
    la="Back Down" lb="Hold Firm"
    pay={{ CC: [0, 0], CD: [-2, 6], DC: [6, -2], DD: [-10, -10] }}
    help={{ CC: "Both back down. Nothing gained, nothing lost.", CD: "You back down, they hold. They take the prize.", DC: "You hold, they back down. You take the prize.", DD: "Neither backs down. Mutual destruction." }}
    oppLogic={(h) => {
      const yourHolds = h.filter(x => x.p === "D").length;
      const rate = h.length ? yourHolds / h.length : 0.5;
      return Math.random() < 0.55 - rate * 0.35 ? "D" : "C";
    }}
    oppLabel="Your opponent reads your history. The more often you hold firm, the more likely they are to back down."
    debrief={(l) => l.p === "D" && l.o === "D"
      ? "Neither of you moved and you both took the worst outcome on the board. This is the result rational players are trying to avoid, and it happens anyway because backing down is only correct if the other side does not. Hostile bids, strike negotiations and litigation standoffs all end here more often than either side planned."
      : l.p === "D" && l.o === "C"
      ? "You held and they yielded. Notice what actually won it: not being right, but being read as unwilling to move. This is why negotiators appoint counsel with no discretion and why boards adopt defences they cannot quietly reverse. Removing your own flexibility is the strategy."
      : l.p === "C" && l.o === "D"
      ? "You backed down and they took the prize. Yielding was individually correct given what they did, which is exactly the problem. If your counterparty knows you will always calculate that way, they never have to yield."
      : "You both backed down. Nothing was gained or lost. In practice this is what most standoffs should resolve to, and the reason they do not is that each side keeps believing the other will move first."}
    tryThis={[
      "Hold firm five rounds in a row. Watch the opponent's yield rate change as your reputation builds.",
      "Then back down once. See how quickly the reputation you paid for gets discounted.",
      "Ask which real counterparty of yours has the more credible inability to back down.",
    ]}
  />;
}

function StagHunt({ onBack }) {
  return <MatrixGame
    onBack={onBack} id="stag" title="Stag Hunt" tag="Coordination" tagColor={C.green}
    blurb="Two firms can pursue a large joint opportunity that needs both of them, or each can take a small guaranteed one alone. The joint project pays far more, but only if both commit. Nobody gains by defecting here. The only barrier is trust."
    goal="Reach the joint outcome. It pays the most, and it requires believing the other side will show up."
    la="Commit Jointly" lb="Go It Alone"
    pay={{ CC: [8, 8], CD: [0, 3], DC: [3, 0], DD: [3, 3] }}
    help={{ CC: "Both commit. The joint project succeeds.", CD: "You commit alone. Wasted effort.", DC: "They commit alone. You took the safe option.", DD: "Both go alone. Small, certain returns." }}
    oppLogic={(h) => {
      const yourCommits = h.filter(x => x.p === "C").length;
      const trust = h.length ? yourCommits / h.length : 0.5;
      return Math.random() < 0.25 + trust * 0.65 ? "C" : "D";
    }}
    oppLabel="Your partner's willingness to commit tracks how often you have committed. Trust is built, and it is built by going first."
    debrief={(l, h) => l.p === "C" && l.o === "C"
      ? `Both committed and you each took 8, against 3 for the safe option. Note what was required: someone had to move without certainty. This is why lead investors, phased commitments and public pledges exist. They exist to reduce ambiguity, not to change anyone's payoff.`
      : l.p === "C" && l.o === "D"
      ? "You committed and they did not. This is the fear that keeps the joint outcome from happening, and it is worth being precise about what went wrong. They did not betray you for gain. They took the safe option because they were not sure about you."
      : l.p === "D" && l.o === "C"
      ? "You took the safe option while they committed. You got 3 instead of 8, and so did they. Nobody defected for advantage here. The joint outcome was simply left on the table because one side would not go first."
      : `Both took the safe option: 3 each, against the 8 available. ${h.length > 2 ? "You have now done this repeatedly. The failure mode is not selfishness, it is that neither side will move first." : "This is the risk-dominant equilibrium. It is safe, and it is poor."}`}
    tryThis={[
      "Commit five times in a row regardless of what they do. Watch the partner's commit rate climb.",
      "Compare the total you earn from sustained commitment against always taking the safe option.",
      "Name one partnership of yours that died at the commitment stage. Was it incentives, or uncertainty?",
    ]}
  />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURNOT vs BERTRAND
// ═══════════════════════════════════════════════════════════════════════════════
function CournotBertrand({ onBack }) {
  const [mode, setMode] = useState("cournot");
  const [q, setQ] = useState(30);
  const [price, setPrice] = useState(60);
  const [diff, setDiff] = useState(0.3);
  const [res, setRes] = useState(null);
  const MC = 20, A = 120;

  const run = () => {
    if (mode === "cournot") {
      // Simultaneous move: the rival plays the Cournot equilibrium quantity with slight noise.
      // (A best-responding rival would make you a Stackelberg leader, under which
      // over-production becomes optimal and the lesson inverts.)
      const cournotQ = Math.round((A - MC) / 3);
      const q2 = Math.max(0, cournotQ + Math.floor(Math.random() * 5) - 2);
      const p = Math.max(0, A - q - q2);
      const you = Math.round((p - MC) * q), them = Math.round((p - MC) * q2);
      setRes({ mode, q, q2, p, you, them, benchmark: cournotQ, benchProfit: Math.round((A - 2 * cournotQ - MC) * cournotQ) });
    } else {
      // Rival prices just under the monopoly-ish level; differentiation softens the loss
      const rival = Math.max(MC + 1, Math.round(MC + (A - MC) * 0.22));
      const undercut = price > rival;
      // Share depends on price gap and how differentiated the goods are
      const gap = (rival - price) / (A - MC);
      const share = Math.max(0.02, Math.min(0.98, 0.5 + gap * (1 - diff) * 3));
      const demand = Math.max(0, A - price);
      const you = Math.round((price - MC) * demand * share);
      const them = Math.round((rival - MC) * Math.max(0, A - rival) * (1 - share));
      setRes({ mode, price, rival, share: Math.round(share * 100), you, them, undercut, diff });
    }
  };
  const reset = () => setRes(null);

  return (
    <div>
      <SimHeader onBack={onBack} title="Cournot vs Bertrand" tag="Industry Structure" tagColor={C.steel}>
        Two firms, identical costs of {MC} per unit. In Cournot you both choose how much to produce and the market sets the price. In Bertrand you both choose a price and customers buy the cheaper one. Same industry, same costs, radically different outcomes.
      </SimHeader>
      <Goal>Maximise your profit, then switch modes and notice that the winning move reverses.</Goal>

      <Label>Competition type</Label>
      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        {[["cournot", "Cournot (quantity)"], ["bertrand", "Bertrand (price)"]].map(([k, l]) =>
          <Pill key={k} active={mode === k} onClick={() => { setMode(k); reset(); }}>{l}</Pill>)}
      </div>
      <p style={{ fontSize: "11.5px", color: C.textMut, margin: "0 0 18px", fontStyle: "italic" }}>
        {mode === "cournot" ? "Commodities: steel, cement, bulk chemicals, shipping." : "Differentiated goods: software, professional services, consumer brands."}
      </p>

      {!res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          {mode === "cournot" ? (
            <Slider label="Your output" value={q} onChange={setQ} min={0} max={80}
              hint={`Your rival will best-respond. Market price falls as total output rises.`} />
          ) : (
            <>
              <Slider label="Your price" value={price} onChange={setPrice} min={MC + 1} max={100} hint={`Your unit cost is ${MC}.`} />
              <Slider label="Differentiation" value={diff} onChange={setDiff} min={0} max={0.9} step={0.1}
                hint={diff < 0.2 ? "Near-identical products. Customers switch on price alone." : diff > 0.6 ? "Strongly differentiated. Price matters much less." : "Moderately differentiated."} />
            </>
          )}
          <Btn onClick={run}>Run the Market</Btn>
        </div>
      )}

      {res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            {res.mode === "cournot" ? (<>
              <Stat label="Your Output" value={res.q} color={C.amber} />
              <Stat label="Rival Output" value={res.q2} color={C.textSec} />
              <Stat label="Market Price" value={res.p} />
              <Stat label="Your Profit" value={res.you} color={res.you > 0 ? C.green : C.red} />
            </>) : (<>
              <Stat label="Your Price" value={res.price} color={C.amber} />
              <Stat label="Rival Price" value={res.rival} color={C.textSec} />
              <Stat label="Your Share" value={res.share} sub="%" />
              <Stat label="Your Profit" value={res.you} color={res.you > 0 ? C.green : C.red} />
            </>)}
          </div>

          <Insight tone={res.you > (res.mode === "cournot" ? res.benchProfit * 0.9 : 400) ? "good" : "neutral"}>
            {res.mode === "cournot" && res.q > res.benchmark + 8 &&
              `You produced ${res.q}, above the Cournot equilibrium of about ${res.benchmark}. Look at what it did to the price: every extra unit you made lowered the price on every unit you sold, and on every unit your rival sold too. In quantity competition, expansion is a pricing decision disguised as an operations decision. This is why commodity industries destroy their own margins during upcycles.`}
            {res.mode === "cournot" && res.q <= res.benchmark + 8 && res.q >= res.benchmark - 8 &&
              `You produced ${res.q}, close to the Cournot equilibrium of about ${res.benchmark}. Both firms restrict output below the competitive level and both earn positive margins as a result. Nobody colluded. The structure produces the restraint, which is also why it collapses the moment a third or fourth producer enters.`}
            {res.mode === "cournot" && res.q < res.benchmark - 8 &&
              `You produced ${res.q}, well below the equilibrium of about ${res.benchmark}. The price held up, but your rival expanded into the space you left and captured the volume. Restraint only pays when it is mutual, and unilateral restraint is a transfer to your competitor.`}
            {res.mode === "bertrand" && res.diff < 0.3 &&
              `With near-identical products, price is the only thing customers can compare, and your share swings violently on small price differences. This is the Bertrand trap: two firms are enough to push price toward marginal cost of ${MC}. No amount of capacity discipline fixes it, because capacity is not the binding constraint. Differentiation is the only lever.`}
            {res.mode === "bertrand" && res.diff >= 0.3 &&
              `At ${Math.round(res.diff * 100)}% differentiation, you held ${res.share}% of the market at a price of ${res.price}, well above your cost of ${MC}. Differentiation is doing the work here, not price discipline. Every point of genuine product distinctiveness buys you room to price above the competitive floor.`}
          </Insight>

          <TryThis items={[
            "Run Cournot at output 60. Watch what your own expansion does to the price you receive.",
            "Switch to Bertrand with differentiation at 0. Try to earn a profit. You will struggle.",
            "Raise differentiation to 0.8 and price at 70. Compare that profit to the Cournot result.",
          ]} />
          <Btn onClick={reset} outline>Adjust and Rerun</Btn>
        </div>
      )}

      <ModelBrief id="cournot" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VICKREY AUCTION — first-price vs second-price
// ═══════════════════════════════════════════════════════════════════════════════
function VickreyAuction({ onBack }) {
  const [format, setFormat] = useState("second");
  const [bid, setBid] = useState("");
  const [val] = useState(() => 60 + Math.floor(Math.random() * 40));
  const [myVal, setMyVal] = useState(() => 60 + Math.floor(Math.random() * 40));
  const [res, setRes] = useState(null);
  const [hist, setHist] = useState([]);

  const submit = () => {
    const b = parseFloat(bid);
    if (isNaN(b) || b < 0) return;
    const rivals = Array.from({ length: 4 }, (_, i) => {
      const v = 50 + Math.floor(Math.random() * 50);
      const rb = format === "second" ? v : Math.round(v * 0.78);
      return { name: `Bidder ${String.fromCharCode(65 + i)}`, val: v, bid: rb };
    });
    const all = [{ name: "You", val: myVal, bid: b, you: true }, ...rivals].sort((x, y) => y.bid - x.bid);
    const won = all[0].you === true;
    const pays = format === "second" ? all[1].bid : b;
    const surplus = won ? myVal - pays : 0;
    setRes({ all, won, pays, surplus, format, myVal, bid: b });
    setHist(h => [...h, { r: h.length + 1, format, bid: b, val: myVal, won, surplus }]);
  };
  const next = () => { setMyVal(60 + Math.floor(Math.random() * 40)); setBid(""); setRes(null); };
  const reset = () => { setHist([]); next(); };
  const totalS = hist.reduce((s, h) => s + h.surplus, 0);

  return (
    <div>
      <SimHeader onBack={onBack} title="Vickrey Auction" tag="Mechanism Design" tagColor={C.amber}>
        Same asset, same bidders, two different rulebooks. Under first-price rules the winner pays their own bid. Under second-price rules the winner pays the runner-up's bid. That single change flips the optimal strategy from shading to honesty.
      </SimHeader>
      <Goal>Win the asset for less than it is worth to you. Your private valuation is shown before you bid.</Goal>

      <Label>Auction format</Label>
      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        {[["first", "First-price (pay your bid)"], ["second", "Second-price (pay runner-up)"]].map(([k, l]) =>
          <Pill key={k} active={format === k} onClick={() => { setFormat(k); reset(); }}>{l}</Pill>)}
      </div>
      <p style={{ fontSize: "11.5px", color: C.textMut, margin: "0 0 18px", fontStyle: "italic" }}>
        {format === "second" ? "Bidding your true value is the dominant strategy. Shading up or down cannot help you." : "Bidding your true value guarantees zero surplus. You must shade below it."}
      </p>

      {!res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "3px" }}>Worth to You</div>
              <div style={{ fontSize: "34px", fontFamily: F.mono, color: C.amber, fontWeight: 600 }}>{myVal}</div>
              <div style={{ fontSize: "11px", color: C.textMut }}>Known exactly. No uncertainty here.</div>
            </div>
            <div style={{ flex: 1, minWidth: "170px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMut, marginBottom: "6px" }}>Your Bid</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="number" value={bid} onChange={e => setBid(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="0"
                  style={{ width: "130px", padding: "10px 14px", background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: "3px", color: C.text, fontFamily: F.mono, fontSize: "16px", outline: "none" }} />
                <Btn onClick={submit} disabled={!bid || isNaN(parseFloat(bid))}>Submit</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Your Value" value={res.myVal} />
            <Stat label="You Bid" value={res.bid} color={C.amber} />
            <Stat label={res.won ? "You Paid" : "Winner Paid"} value={res.pays} color={C.textSec} />
            <Stat label="Your Surplus" value={res.won ? res.surplus : 0} color={res.surplus > 0 ? C.green : res.surplus < 0 ? C.red : C.textMut} />
          </div>

          <Label>All bids</Label>
          <div style={{ marginBottom: "14px" }}>
            {res.all.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", padding: "5px 10px", borderRadius: "2px", fontFamily: F.mono, fontSize: "12px", background: b.you ? (res.won ? (res.surplus >= 0 ? C.greenMuted : C.redMuted) : C.steelMuted) : "transparent" }}>
                <span style={{ width: "16px", color: i === 0 ? C.amber : C.textMut, fontSize: "10px", textAlign: "center" }}>{i === 0 ? "★" : ""}</span>
                <span style={{ width: "75px", color: b.you ? C.steel : C.textSec, fontWeight: b.you ? 600 : 400 }}>{b.name}</span>
                <span style={{ width: "70px", color: C.textMut, fontSize: "11px" }}>val {b.val}</span>
                <span style={{ color: C.text }}>bid {Math.round(b.bid)}</span>
              </div>
            ))}
          </div>

          <Insight tone={res.surplus > 0 ? "good" : res.surplus < 0 ? "bad" : "neutral"}>
            {res.format === "second" && Math.abs(res.bid - res.myVal) <= 2 &&
              `You bid your true value and ${res.won ? `won, paying only the runner-up's ${res.pays} for something worth ${res.myVal} to you` : "lost, which cost you nothing"}. Under second-price rules this is the dominant strategy: bidding high cannot make you overpay, because you never pay your own bid, and bidding low only costs you auctions you would have profited from.`}
            {res.format === "second" && res.bid < res.myVal - 2 &&
              `You shaded to ${res.bid} against a true value of ${res.myVal}. Under second-price rules shading is pure loss. It cannot reduce what you pay, since you pay the runner-up's bid regardless. It can only cost you auctions you would have won profitably. The format has removed the reason to be strategic.`}
            {res.format === "second" && res.bid > res.myVal + 2 &&
              `You bid ${res.bid} above your value of ${res.myVal}. That is the one genuine risk in a second-price auction: if the runner-up bids between your value and your bid, you win at a price above what the asset is worth to you.`}
            {res.format === "first" && res.bid >= res.myVal - 2 &&
              `You bid ${res.bid} against a value of ${res.myVal}. Under first-price rules, bidding your value guarantees roughly zero surplus even when you win, because you pay exactly what it was worth. The format forces you to shade, which means the format forces you to guess about everyone else.`}
            {res.format === "first" && res.bid < res.myVal - 2 &&
              `You shaded to ${res.bid} from a value of ${res.myVal}, and ${res.won ? `won with ${res.surplus} of surplus` : "lost the auction"}. This is the cost of first-price rules: every bidder must model every other bidder. Switch to second-price and that entire layer of strategic guesswork disappears.`}
          </Insight>

          <TryThis items={[
            "In second-price, bid exactly your value five times. Then shade 20% and compare total surplus.",
            "In first-price, bid your value once. Note that winning earns you nothing.",
            "Ask which format your own procurement process resembles, and what that is costing you in information quality.",
          ]} />
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={next}>Next Auction →</Btn>
            <Btn onClick={reset} outline>Reset</Btn>
          </div>
        </div>
      )}

      {hist.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <Label>Session · {hist.length} auctions</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Total Surplus" value={totalS} color={totalS >= 0 ? C.green : C.red} />
            <Stat label="Won" value={`${hist.filter(h => h.won).length}/${hist.length}`} />
          </div>
        </div>
      )}

      <ModelBrief id="vickrey" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET FOR LEMONS
// ═══════════════════════════════════════════════════════════════════════════════
function Lemons({ onBack }) {
  const [offer, setOffer] = useState(50);
  const [verify, setVerify] = useState(0);
  const [rounds, setRounds] = useState([]);

  const runMarket = () => {
    // Sellers hold goods worth 20-100 to a buyer; seller reservation = 0.8 x quality
    const pool = Array.from({ length: 40 }, () => 20 + Math.floor(Math.random() * 81));
    const willing = pool.filter(qv => qv * 0.65 <= offer);
    const avgQ = willing.length ? Math.round(willing.reduce((a, b) => a + b, 0) / willing.length) : 0;
    // Verification lets the buyer see quality and refuse the worst
    const seen = verify > 0;
    const effectiveQ = seen ? Math.round(avgQ + (100 - avgQ) * verify * 0.6) : avgQ;
    const surplus = willing.length ? effectiveQ - offer : 0;
    const r = { offer, verify, entered: willing.length, pool: pool.length, avgQ, effectiveQ, surplus, best: Math.max(0, ...willing) };
    setRounds(rs => [...rs, { ...r, r: rs.length + 1 }]);
  };
  const reset = () => setRounds([]);
  const last = rounds[rounds.length - 1];

  return (
    <div>
      <SimHeader onBack={onBack} title="Market for Lemons" tag="Adverse Selection" tagColor="#E09050">
        You are a buyer. Forty sellers each hold something worth between 20 and 100 to you, and each knows their own quality while you do not. A seller will only trade if your price beats what the item is worth to them. Set one price for everyone and see who shows up.
      </SimHeader>
      <Goal>Buy above your cost. The trap is that the price you offer determines which sellers accept, and therefore what you are actually buying.</Goal>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
        <Slider label="Your offer price" value={offer} onChange={setOffer} min={10} max={100} hint="Every seller sees the same number." />
        <Slider label="Verification" value={verify} onChange={setVerify} min={0} max={1} step={0.1}
          hint={verify === 0 ? "You cannot inspect anything. You are buying blind." : `You can screen out ${Math.round(verify * 100)}% of the quality gap through diligence, warranties or ratings.`} />
        <Btn onClick={runMarket}>Open the Market</Btn>
      </div>

      {last && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Sellers Entered" value={`${last.entered}/${last.pool}`} color={last.entered > 20 ? C.green : C.red} />
            <Stat label="Avg Quality" value={last.effectiveQ} color={last.effectiveQ >= last.offer ? C.green : C.red} />
            <Stat label="You Paid" value={last.offer} color={C.amber} />
            <Stat label="Per-Unit Surplus" value={last.surplus} color={last.surplus > 0 ? C.green : C.red} />
          </div>

          <Label>Who accepted your price</Label>
          <div style={{ position: "relative", height: "42px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "3px", marginBottom: "6px", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, last.offer / 0.65)}%`, background: C.amber + "18" }} />
            <div style={{ position: "absolute", left: `${Math.min(100, last.offer / 0.65)}%`, top: 0, bottom: 0, width: "2px", background: C.amber }} />
            <div style={{ position: "absolute", left: "6px", top: "12px", fontSize: "10.5px", color: C.amber, fontFamily: F.body }}>accepted (lower quality)</div>
            <div style={{ position: "absolute", right: "6px", top: "12px", fontSize: "10.5px", color: C.textMut, fontFamily: F.body }}>withdrew (higher quality)</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: C.textFaint, fontFamily: F.mono, marginBottom: "16px" }}>
            <span>quality 20</span><span>quality 100</span>
          </div>

          <Insight tone={last.surplus > 0 ? "good" : "bad"}>
            {last.verify === 0 && last.surplus <= 0 &&
              `You offered ${last.offer} and attracted ${last.entered} sellers whose average quality was ${last.effectiveQ}. You lost money on every trade. This is the unravelling: your price attracted precisely the sellers whose goods were worth less than your price, and the ones holding genuinely good inventory withdrew because you were not paying enough. Raising the price does not fix it, because a higher price attracts a higher-quality pool but you also pay more for it.`}
            {last.verify === 0 && last.surplus > 0 &&
              `You cleared ${last.surplus} per unit at a price of ${last.offer}. You found a workable price without any information, which is possible but fragile. Notice that the good sellers still withdrew: the ${last.pool - last.entered} who refused were holding the best inventory in the market, and no price you can profitably offer will bring them in.`}
            {last.verify > 0 &&
              `With ${Math.round(last.verify * 100)}% verification you lifted effective quality from ${last.avgQ} to ${last.effectiveQ}, turning a surplus of ${last.avgQ - last.offer} into ${last.surplus}. The price did not change. What changed is that you could see what you were buying. Every warranty, credit rating, audit and diligence process in commerce exists to do exactly this, and this is what they are worth.`}
          </Insight>

          <TryThis items={[
            "Set verification to 0 and try every price from 30 to 90. Find one that reliably profits. It is hard.",
            "Now set verification to 0.7 and repeat. The same prices become workable.",
            "Ask what a buyer can verify about your business before purchase. If nothing, you are priced at your category average.",
          ]} />
          <Btn onClick={reset} outline>Clear History</Btn>
        </div>
      )}

      {rounds.length > 1 && (
        <div style={{ marginBottom: "10px" }}>
          <Label>Attempts</Label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
              <thead><tr style={{ background: C.surface }}>
                {["#", "Price", "Verify", "Entered", "Avg Qual", "Surplus"].map(h =>
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMut, fontFamily: F.body, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rounds.map(x => (
                  <tr key={x.r}>
                    <td style={{ padding: "5px 10px", color: C.textMut }}>{x.r}</td>
                    <td style={{ padding: "5px 10px", color: C.amber }}>{x.offer}</td>
                    <td style={{ padding: "5px 10px", color: C.textSec }}>{Math.round(x.verify * 100)}%</td>
                    <td style={{ padding: "5px 10px", color: C.textSec }}>{x.entered}</td>
                    <td style={{ padding: "5px 10px", color: C.textSec }}>{x.effectiveQ}</td>
                    <td style={{ padding: "5px 10px", color: x.surplus > 0 ? C.green : C.red }}>{x.surplus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModelBrief id="lemons" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MORAL HAZARD — contract design
// ═══════════════════════════════════════════════════════════════════════════════
function MoralHazard({ onBack }) {
  const [salary, setSalary] = useState(50);
  const [bonus, setBonus] = useState(20);
  const [clawback, setClawback] = useState(false);
  const [defer, setDefer] = useState(false);
  const [res, setRes] = useState(null);
  const [log, setLog] = useState([]);

  const run = () => {
    // Agent picks effort and risk to maximise their own expected payoff
    const upside = bonus / 100;
    const downsideBorne = (clawback ? 0.5 : 0) + (defer ? 0.3 : 0);
    const riskAppetite = Math.max(0, Math.min(1, upside * 2.2 - downsideBorne));
    const effort = Math.max(0.2, Math.min(1, 0.25 + upside * 1.6));

    const win = Math.random() < (0.75 - riskAppetite * 0.42);
    const gross = win
      ? Math.round(100 * effort * (1 + riskAppetite * 1.5))
      : Math.round(-60 * riskAppetite - 10);
    const agentPay = salary + (gross > 0 ? Math.round(gross * upside) : (clawback ? Math.round(gross * upside * 0.5) : 0));
    const principalNet = gross - agentPay;

    const r = { salary, bonus, clawback, defer, riskAppetite: Math.round(riskAppetite * 100), effort: Math.round(effort * 100), win, gross, agentPay, principalNet };
    setRes(r);
    setLog(l => [...l, { ...r, r: l.length + 1 }]);
  };
  const reset = () => { setRes(null); setLog([]); };
  const totalNet = log.reduce((s, x) => s + x.principalNet, 0);

  return (
    <div>
      <SimHeader onBack={onBack} title="Moral Hazard" tag="Contract Design" tagColor="#E09050">
        You are hiring someone to run a business line. You cannot observe their effort or how much risk they take, only the result. You choose the contract. They respond to it rationally. Whatever they do next is something you designed.
      </SimHeader>
      <Goal>Design a contract that maximises what you keep after paying them. Effort and risk-taking both respond to how you pay.</Goal>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
        <Slider label="Base salary" value={salary} onChange={setSalary} min={0} max={100} hint="Guaranteed regardless of outcome." />
        <Slider label="Bonus share of upside" value={bonus} onChange={setBonus} min={0} max={60} suffix="%"
          hint="Higher share buys effort. It also buys risk-taking, because they keep the upside." />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          <Pill active={clawback} color={C.green} onClick={() => setClawback(!clawback)}>Clawback on losses</Pill>
          <Pill active={defer} color={C.green} onClick={() => setDefer(!defer)}>Deferred vesting</Pill>
        </div>
        <Btn onClick={run}>Run the Year</Btn>
      </div>

      {res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Their Effort" value={res.effort} sub="%" color={res.effort > 60 ? C.green : C.textSec} />
            <Stat label="Risk They Took" value={res.riskAppetite} sub="%" color={res.riskAppetite > 50 ? C.red : C.green} />
            <Stat label="Gross Result" value={res.gross} color={res.gross > 0 ? C.green : C.red} />
            <Stat label="You Paid Them" value={res.agentPay} color={C.amber} />
            <Stat label="You Keep" value={res.principalNet} color={res.principalNet > 0 ? C.green : C.red} />
          </div>

          <Insight tone={res.principalNet > 0 ? "good" : "bad"}>
            {res.bonus > 35 && !res.clawback && !res.defer &&
              `You handed over ${res.bonus}% of the upside with no clawback and no deferral. They took ${res.riskAppetite}% risk, which is exactly correct behaviour given the contract: they keep the gains and you absorb the losses. You wrote them a call option and charged nothing for it. The failure here is not their judgement. It is the contract.`}
            {res.bonus > 35 && (res.clawback || res.defer) &&
              `A ${res.bonus}% bonus share bought you ${res.effort}% effort, and the ${res.clawback && res.defer ? "clawback and deferral held" : res.clawback ? "clawback held" : "deferral held"} risk-taking down to ${res.riskAppetite}%. This is the whole solution to moral hazard: make the agent hold some of the downside. Nothing else reliably works, because monitoring cannot see what you cannot observe.`}
            {res.bonus <= 15 &&
              `A ${res.bonus}% bonus share produced only ${res.effort}% effort. Risk-taking stayed low at ${res.riskAppetite}%, which is safe and unproductive. This is the other failure mode: a contract so flat that there is no reason to work hard. The problem is two-sided, and the solution is a share of upside paired with genuine exposure to downside.`}
            {res.bonus > 15 && res.bonus <= 35 &&
              `A ${res.bonus}% share produced ${res.effort}% effort and ${res.riskAppetite}% risk. You are near the workable range. Add a clawback and watch the risk figure fall without losing much effort, which is the trade that good compensation design is looking for.`}
          </Insight>

          <TryThis items={[
            "Set bonus to 60% with no clawback and run five years. Count the blow-ups.",
            "Keep bonus at 60% and switch clawback on. Same upside, very different risk.",
            "Ask what your own team personally loses when something they own goes badly. If nothing, you wrote an option.",
          ]} />
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={run}>Run Another Year →</Btn>
            <Btn onClick={reset} outline>Reset</Btn>
          </div>
        </div>
      )}

      {log.length > 1 && (
        <div style={{ marginBottom: "10px" }}>
          <Label>Track record · {log.length} years</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Cumulative Net" value={totalNet} color={totalNet > 0 ? C.green : C.red} />
            <Stat label="Loss Years" value={log.filter(x => x.gross < 0).length} color={log.filter(x => x.gross < 0).length > 0 ? C.red : C.green} />
          </div>
        </div>
      )}

      <ModelBrief id="hazard" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATION CASCADES
// ═══════════════════════════════════════════════════════════════════════════════
function Cascades({ onBack }) {
  const [pos, setPos] = useState(5);
  const [round, setRound] = useState(null);
  const [choice, setChoice] = useState(null);
  const [hist, setHist] = useState([]);

  const start = () => {
    const truth = Math.random() < 0.5 ? "A" : "B";
    // Each predecessor gets a 70%-accurate private signal, then follows the herd if it is 2+ ahead
    const priors = [];
    for (let i = 0; i < pos - 1; i++) {
      const sig = Math.random() < 0.7 ? truth : (truth === "A" ? "B" : "A");
      const aCount = priors.filter(p => p === "A").length;
      const bCount = priors.filter(p => p === "B").length;
      let act = sig;
      if (aCount - bCount >= 2) act = "A";
      else if (bCount - aCount >= 2) act = "B";
      priors.push(act);
    }
    const mySig = Math.random() < 0.7 ? truth : (truth === "A" ? "B" : "A");
    setRound({ truth, priors, mySig });
    setChoice(null);
  };

  useEffect(() => { start(); }, [pos]);

  const decide = (c) => {
    const correct = c === round.truth;
    setChoice({ c, correct });
    const followed = round.priors.length > 0 && c === round.priors[round.priors.length - 1];
    setHist(h => [...h, { r: h.length + 1, c, correct, ownSignal: round.mySig, followedOwn: c === round.mySig, followed }]);
  };
  const reset = () => { setHist([]); start(); };
  const rightCount = hist.filter(h => h.correct).length;
  const ignoredOwn = hist.filter(h => !h.followedOwn).length;

  if (!round) return null;
  const aC = round.priors.filter(p => p === "A").length;
  const bC = round.priors.filter(p => p === "B").length;
  const cascadeOn = Math.abs(aC - bC) >= 2;

  return (
    <div>
      <SimHeader onBack={onBack} title="Information Cascades" tag="Herding" tagColor={C.red}>
        One of two options is correct. You get a private signal that is right 70% of the time. So did everyone ahead of you, but you can only see what they chose, not what they knew. Once two people lean the same way, everyone after them rationally stops using their own information.
      </SimHeader>
      <Goal>Pick the correct option. Decide how much weight to give your own signal against what the queue did.</Goal>

      <Label>Your position in the queue</Label>
      <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
        {[2, 5, 9].map(v => <Pill key={v} active={pos === v} onClick={() => setPos(v)}>{v === 2 ? "2nd" : v === 5 ? "5th" : "9th"}</Pill>)}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
        <Label>What the people ahead of you chose</Label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
          {round.priors.map((p, i) => (
            <div key={i} style={{ width: "38px", height: "38px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: "15px", fontWeight: 600, background: p === "A" ? C.steelMuted : C.amberMuted, border: `1px solid ${p === "A" ? C.steel : C.amber}50`, color: p === "A" ? C.steel : C.amber }}>{p}</div>
          ))}
          <div style={{ width: "38px", height: "38px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontFamily: F.body, border: `1.5px dashed ${C.borderStrong}`, color: C.textMut }}>YOU</div>
        </div>

        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "16px" }}>
          <Stat label="Your Private Signal" value={round.mySig} color={round.mySig === "A" ? C.steel : C.amber} />
          <Stat label="Queue Tally" value={`${aC}A · ${bC}B`} color={C.textSec} />
          {cascadeOn && <Stat label="Cascade" value="Active" color={C.red} />}
        </div>

        {!choice ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={() => decide("A")} color={C.steel} textColor="#fff">Choose A</Btn>
            <Btn onClick={() => decide("B")} color={C.amber}>Choose B</Btn>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "14px", marginBottom: "16px", flexWrap: "wrap" }}>
              <Stat label="Truth" value={round.truth} color={C.text} />
              <Stat label="You Chose" value={choice.c} color={choice.correct ? C.green : C.red} />
              <Stat label="Result" value={choice.correct ? "Correct" : "Wrong"} color={choice.correct ? C.green : C.red} />
            </div>
            <Insight tone={choice.correct ? "good" : "bad"}>
              {cascadeOn && choice.c !== round.mySig &&
                `You abandoned your own signal and followed the queue. That was rational: with ${Math.max(aC, bC)} people leaning one way, the crowd's information outweighs your single 70% signal. But notice the consequence. Your private information never entered the pool, so the person behind you sees a longer queue and even less real evidence. This is how a consensus built on two early opinions becomes unanimous.`}
              {cascadeOn && choice.c === round.mySig &&
                `You backed your own signal against an active cascade. ${choice.correct ? "It paid this time." : "It cost you this time."} Either way, you did the thing that keeps markets informative: you put private information into the public pool. Cascades are fragile precisely because one credible contrarian breaks them.`}
              {!cascadeOn &&
                `No cascade had formed yet, so the queue carried little information and your own signal was the best evidence available. This is the early part of the sequence where independent judgement still enters the pool. Two more people leaning the same way and it stops.`}
            </Insight>
            <TryThis items={[
              "Play from position 9 ten times, always following the queue. Track your accuracy.",
              "Play from position 9 again, always following your own signal. Compare.",
              "Ask how many people in your industry's consensus actually ran the analysis.",
            ]} />
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={start}>Next Round →</Btn>
              <Btn onClick={reset} outline>Reset</Btn>
            </div>
          </>
        )}
      </div>

      {hist.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <Label>Session · {hist.length} rounds</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Correct" value={`${rightCount}/${hist.length}`} color={rightCount / hist.length >= 0.7 ? C.green : C.red} />
            <Stat label="Ignored Own Signal" value={ignoredOwn} color={C.amber} />
          </div>
        </div>
      )}

      <ModelBrief id="cascade" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROSPECT THEORY — paired choices that expose loss aversion and the reflection effect
// ═══════════════════════════════════════════════════════════════════════════════
const PT_ITEMS = [
  { id: 1, frame: "gain", q: "Your division is projected to lose 600 jobs. Two restructuring plans are on the table.",
    a: "Plan A saves 200 jobs for certain.", b: "Plan B has a 1-in-3 chance of saving all 600, and a 2-in-3 chance of saving none.",
    rational: "identical", note: "Both options save 200 jobs in expectation." },
  { id: 2, frame: "loss", q: "Same division, same 600 jobs. Two plans, described differently.",
    a: "Plan C means 400 jobs are lost for certain.", b: "Plan D has a 1-in-3 chance that nobody is lost, and a 2-in-3 chance that all 600 are lost.",
    rational: "identical", note: "Identical to the first pair. Only the framing changed." },
  { id: 3, frame: "gain", q: "A completed project can be settled two ways.",
    a: "Take a guaranteed £45,000.", b: "Take a 50% chance of £100,000 and a 50% chance of nothing.",
    rational: "b", note: "The gamble is worth £50,000 against a certain £45,000." },
  { id: 4, frame: "loss", q: "A failing project must be resolved.",
    a: "Write off £45,000 now and close it.", b: "A 50% chance of losing nothing and a 50% chance of losing £100,000.",
    rational: "a", note: "The gamble loses £50,000 in expectation against a certain £45,000." },
];

function ProspectTheory({ onBack }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const done = i >= PT_ITEMS.length;
  const item = PT_ITEMS[i];

  const pick = (c) => { setAnswers(a => [...a, { id: item.id, frame: item.frame, choice: c }]); setI(i + 1); };
  const reset = () => { setI(0); setAnswers([]); };

  const g1 = answers.find(a => a.id === 1), g2 = answers.find(a => a.id === 2);
  const g3 = answers.find(a => a.id === 3), g4 = answers.find(a => a.id === 4);
  const framingFlip = g1 && g2 && g1.choice !== g2.choice;
  const reflection = g3 && g4 && g3.choice === "a" && g4.choice === "b";

  return (
    <div>
      <SimHeader onBack={onBack} title="Prospect Theory" tag="Loss Aversion" tagColor="#D07070">
        Four decisions. Two pairs are mathematically identical and only differ in how they are worded. Answer quickly and honestly rather than carefully, because the effect being measured is the one that operates when you are not watching for it.
      </SimHeader>
      <Goal>Answer all four, then see which framing effects moved you. Most people are moved by at least one.</Goal>

      {!done ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "22px", marginBottom: "18px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontWeight: 600, marginBottom: "10px" }}>Decision {i + 1} of {PT_ITEMS.length}</div>
          <p style={{ fontSize: "14px", color: C.text, lineHeight: 1.6, margin: "0 0 18px" }}>{item.q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[["a", item.a], ["b", item.b]].map(([k, txt]) => (
              <button key={k} onClick={() => pick(k)} style={{
                textAlign: "left", padding: "14px 16px", background: C.bg, border: `1px solid ${C.borderStrong}`,
                borderRadius: "3px", color: C.textSec, fontSize: "13px", fontFamily: F.body, cursor: "pointer",
                lineHeight: 1.5, transition: "all 0.12s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.color = C.textSec; }}>
                {txt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "22px", marginBottom: "18px" }}>
          <Label>Your answers</Label>
          <div style={{ marginBottom: "18px" }}>
            {PT_ITEMS.map((it, n) => {
              const ans = answers[n];
              return (
                <div key={it.id} style={{ display: "flex", gap: "10px", padding: "7px 0", borderBottom: n < 3 ? `1px solid ${C.border}` : "none", fontSize: "12.5px", alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.mono, color: C.textMut, width: "18px" }}>{n + 1}</span>
                  <span style={{ color: ans.choice === "a" ? C.green : C.amber, fontFamily: F.mono, width: "80px" }}>{ans.choice === "a" ? "certain" : "gamble"}</span>
                  <span style={{ color: C.textMut, fontSize: "11.5px", flex: 1, minWidth: "180px" }}>{it.note}</span>
                </div>
              );
            })}
          </div>

          <Insight tone={framingFlip || reflection ? "neutral" : "good"} title={framingFlip || reflection ? "The framing moved you." : "You were consistent across framings."}>
            {framingFlip &&
              `Decisions 1 and 2 describe exactly the same outcomes. One was worded as lives saved, the other as lives lost, and you answered them differently. This is the reflection effect, and it is the most robust finding in behavioural decision research. You did not change your mind about the facts. The reference point moved, and your risk appetite moved with it. `}
            {reflection &&
              `Decisions 3 and 4 show the same pattern in money. You took the certain gain and gambled on the loss, which means you applied two different risk appetites within four minutes. In the domain of gains you were risk-averse. In the domain of losses you became risk-seeking. This is what keeps failing projects funded: stopping means realising a certain loss, and continuing preserves the chance of not having lost at all. `}
            {!framingFlip && !reflection &&
              `You answered consistently across both framings, which is unusual and worth noting. Most people flip. The value of knowing this is less about your own answers and more about everyone else's: your customers, your staff and your counterparties are all running the standard pattern, and your framing choices move their decisions. `}
            {`Losses weigh roughly twice as much as equivalent gains. Once you know that, the framing of a concession, a price, a performance report or a write-off is a decision variable rather than a presentational detail.`}
          </Insight>

          <TryThis items={[
            "Rerun and answer decisions 1 and 2 as if they were the same question. Notice the resistance.",
            "Take your current project portfolio. Which ones are alive only because closing them realises a loss?",
            "Reframe your next price increase as avoiding a loss rather than forgoing a gain, and watch the response change.",
          ]} />
          <Btn onClick={reset} outline>Run Again</Btn>
        </div>
      )}

      <ModelBrief id="prospect" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAR OF ATTRITION
// ═══════════════════════════════════════════════════════════════════════════════
function WarOfAttrition({ onBack }) {
  const [prize] = useState(100);
  const [burnRate, setBurnRate] = useState(8);
  const [rivalDepth, setRivalDepth] = useState("matched");
  const [spent, setSpent] = useState(0);
  const [rivalSpent, setRivalSpent] = useState(0);
  const [round, setRound] = useState(0);
  const [outcome, setOutcome] = useState(null);

  const DEPTH = { shallow: 45, matched: 85, deep: 160 };
  const rivalLimit = DEPTH[rivalDepth];

  const stay = () => {
    const r = round + 1;
    const mine = spent + burnRate, theirs = rivalSpent + burnRate;
    setRound(r); setSpent(mine); setRivalSpent(theirs);
    if (theirs >= rivalLimit) setOutcome({ won: true, spent: mine, net: prize - mine, rounds: r });
    else if (mine > 220) setOutcome({ won: false, spent: mine, net: -mine, rounds: r, forced: true });
  };
  const quit = () => setOutcome({ won: false, spent, net: -spent, rounds: round, quit: true });
  const reset = () => { setSpent(0); setRivalSpent(0); setRound(0); setOutcome(null); };

  return (
    <div>
      <SimHeader onBack={onBack} title="War of Attrition" tag="Exit Timing" tagColor="#B080D0">
        You and a rival are both burning cash to win a market worth {prize}. Every round you stay in costs you money whether you win or not. The winner takes the prize minus everything spent. The loser takes nothing minus everything spent.
      </SimHeader>
      <Goal>Finish with a positive net. The prize is {prize}, so every round you stay reduces the maximum you can possibly win.</Goal>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div style={{ minWidth: "210px" }}>
          <Slider label="Burn per round" value={burnRate} onChange={v => { setBurnRate(v); reset(); }} min={2} max={20} hint="What each round of the fight costs you." />
        </div>
        <div>
          <Label>Rival's pockets</Label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[["shallow", "Shallow"], ["matched", "Matched"], ["deep", "Deep"]].map(([k, l]) =>
              <Pill key={k} active={rivalDepth === k} color={k === "deep" ? C.red : k === "shallow" ? C.green : C.amber} onClick={() => { setRivalDepth(k); reset(); }}>{l}</Pill>)}
          </div>
          <p style={{ fontSize: "11.5px", color: C.textMut, margin: "6px 0 0", fontStyle: "italic" }}>You cannot see how deep they are. You only find out by spending.</p>
        </div>
      </div>

      {!outcome && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Rounds In" value={round} />
            <Stat label="You've Spent" value={spent} color={spent > prize ? C.red : C.amber} />
            <Stat label="Max Net If You Win" value={prize - spent} color={prize - spent > 0 ? C.green : C.red} />
          </div>
          {spent >= prize && (
            <div style={{ background: C.redMuted, border: `1px solid ${C.red}30`, borderRadius: "2px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: C.textSec }}>
              You have now spent more than the prize is worth. Winning from here still loses money.
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={stay} color={C.red} textColor="#fff">Stay In (−{burnRate})</Btn>
            <Btn onClick={quit} outline>Concede</Btn>
          </div>
        </div>
      )}

      {outcome && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Outcome" value={outcome.won ? "Won" : "Conceded"} color={outcome.won ? C.green : C.red} />
            <Stat label="Rounds" value={outcome.rounds} />
            <Stat label="Total Spent" value={outcome.spent} color={C.amber} />
            <Stat label="Net" value={outcome.net} color={outcome.net > 0 ? C.green : C.red} />
          </div>
          <Insight tone={outcome.net > 0 ? "good" : "bad"}>
            {outcome.won && outcome.net > 0 &&
              `You won with ${outcome.net} left over. They ran out first. Note how much of the ${prize} prize the fight itself consumed: ${outcome.spent} of it, or ${Math.round(outcome.spent / prize * 100)}%. Winning a war of attrition is rarely as valuable as the scoreboard suggests.`}
            {outcome.won && outcome.net <= 0 &&
              `You won and still lost ${Math.abs(outcome.net)}. This is the defining feature of the model: in a symmetric contest, the expected value to both sides is roughly zero because the fight dissipates the prize. You outlasted them and the prize was already gone.`}
            {!outcome.won && outcome.quit &&
              `You conceded after ${outcome.rounds} rounds, down ${outcome.spent}. Conceding early is usually the correct move and almost nobody does it, because by the time the arithmetic is obvious you have sunk enough that quitting feels like admitting the earlier spending was wasted. It was. That is not a reason to spend more.`}
            {!outcome.won && outcome.forced &&
              `You spent ${outcome.spent} chasing a prize worth ${prize} and had to stop anyway. Every round past ${prize} was guaranteed loss, and you kept going. This is sunk-cost gravity, and it is why recognising the structure before you are deep in it is the entire strategic advantage.`}
          </Insight>
          <TryThis items={[
            "Play against a Deep-pocketed rival and try to win. Then calculate what conceding at round one would have cost.",
            "Raise the burn rate to 20 and play again. Higher stakes shorten the fight and raise the loss.",
            "Name a competitive fight your business is currently in. Would you enter it today at the remaining cost?",
          ]} />
          <Btn onClick={reset} outline>Play Again</Btn>
        </div>
      )}

      <ModelBrief id="attrition" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOLD-UP PROBLEM
// ═══════════════════════════════════════════════════════════════════════════════
function HoldUp({ onBack }) {
  const [invest, setInvest] = useState(0);
  const [protection, setProtection] = useState("none");
  const [res, setRes] = useState(null);

  const PROT = { none: 0, contract: 0.45, integrate: 0.85 };
  const PROT_COST = { none: 0, contract: 8, integrate: 30 };

  const run = () => {
    // Specific investment raises joint value but has no outside value
    const jointValue = Math.round(invest * 2.2);
    const outsideValue = Math.round(invest * 0.15);
    const prot = PROT[protection];
    // Counterparty renegotiates for whatever it can take above your outside option
    const grab = Math.round((jointValue - outsideValue) * 0.55 * (1 - prot));
    const yours = jointValue - grab - invest - PROT_COST[protection];
    setRes({ invest, jointValue, outsideValue, grab, yours, protection, protCost: PROT_COST[protection] });
  };
  const reset = () => setRes(null);

  return (
    <div>
      <SimHeader onBack={onBack} title="Hold-Up Problem" tag="Specific Investment" tagColor="#B080D0">
        You can invest in tooling, integration or a facility that only has value inside one relationship. The investment more than doubles the joint value. Once it is sunk, your counterparty knows you cannot walk away, and reopens the terms.
      </SimHeader>
      <Goal>Invest enough to create value, and keep enough of it. Those two goals fight each other.</Goal>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
        <Slider label="Relationship-specific investment" value={invest} onChange={setInvest} min={0} max={60}
          hint={`Creates ${Math.round(invest * 2.2)} of joint value. Worth only ${Math.round(invest * 0.15)} to anyone else.`} />
        <Label>Protection</Label>
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
          {[["none", "Handshake (free)"], ["contract", "Long-term contract (−8)"], ["integrate", "Vertical integration (−30)"]].map(([k, l]) =>
            <Pill key={k} active={protection === k} color={k === "integrate" ? C.green : k === "contract" ? C.amber : C.textSec} onClick={() => { setProtection(k); setRes(null); }}>{l}</Pill>)}
        </div>
        <p style={{ fontSize: "11.5px", color: C.textMut, margin: "0 0 16px", fontStyle: "italic" }}>
          Protection costs money up front and limits how much they can reopen later.
        </p>
        <Btn onClick={run}>Commit the Capital</Btn>
      </div>

      {res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Value Created" value={res.jointValue} color={C.green} />
            <Stat label="They Took" value={res.grab} color={C.red} />
            <Stat label="Protection Cost" value={res.protCost ? `−${res.protCost}` : "0"} color={C.textSec} />
            <Stat label="You Keep" value={res.yours} color={res.yours > 0 ? C.green : C.red} />
          </div>
          <Insight tone={res.yours > 0 ? "good" : "bad"}>
            {res.protection === "none" && res.invest > 20 &&
              `You sank ${res.invest} on a handshake. The asset is worth ${res.outsideValue} outside this relationship, so your walk-away threat is empty and they took ${res.grab} of the value you created. You did nothing wrong operationally. You created value and then had no mechanism to keep it. This is why anticipated hold-up suppresses efficient investment before it ever happens.`}
            {res.protection === "none" && res.invest <= 20 &&
              `You under-invested, which protected you from hold-up and also left value uncreated. Joint value reached only ${res.jointValue}. This is the deeper cost of the model: the biggest loss is not the value that gets taken, it is the value that never gets built because both sides can see what would happen.`}
            {res.protection === "contract" &&
              `The long-term contract cost ${res.protCost} and cut their grab to ${res.grab}. Contracts help, and they are incomplete by nature: they cannot specify every contingency, and hold-up lives in the gaps. Notice that you paid for protection and still lost ground.`}
            {res.protection === "integrate" &&
              `Integration cost ${res.protCost} up front and reduced their grab to ${res.grab}. Owning the counterparty removes the renegotiation entirely, which is the actual reason firms integrate vertically. It is frequently misread as a scale play when it is a contracting decision.`}
          </Insight>
          <TryThis items={[
            "Invest 60 on a handshake. Then invest 60 with integration. Compare what you keep.",
            "Find the investment level that maximises what you keep with no protection. It is well below the value-maximising level.",
            "Ask what your business has built that is worth far less outside one relationship.",
          ]} />
          <Btn onClick={reset} outline>Adjust and Rerun</Btn>
        </div>
      )}

      <ModelBrief id="holdup" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANISM DESIGN — build the comp scheme, then watch it get played
// ═══════════════════════════════════════════════════════════════════════════════
function MechanismDesign({ onBack }) {
  const [metric, setMetric] = useState("volume");
  const [cap, setCap] = useState(false);
  const [quality, setQuality] = useState(false);
  const [res, setRes] = useState(null);

  const run = () => {
    const team = Array.from({ length: 8 }, () => ({ skill: 0.4 + Math.random() * 0.6 }));
    let revenue = 0, gaming = 0, churn = 0;
    team.forEach(p => {
      let effort = 0.5 + p.skill * 0.4;
      let game = 0;
      if (metric === "volume") { game = 0.55; revenue += 100 * effort; churn += 22 * (1 - (quality ? 0.7 : 0)); }
      if (metric === "revenue") { game = 0.3; revenue += 118 * effort; churn += 13 * (1 - (quality ? 0.7 : 0)); }
      if (metric === "retention") { game = 0.12; revenue += 92 * effort; churn += 4; }
      if (metric === "margin") { game = 0.2; revenue += 105 * effort; churn += 9 * (1 - (quality ? 0.7 : 0)); }
      if (cap) game *= 0.6;
      if (quality) game *= 0.5;
      gaming += game * 100;
    });
    const g = Math.round(gaming / 8), ch = Math.round(churn / 8);
    const net = Math.round(revenue - revenue * (g / 100) * 0.8 - ch * 12);
    setRes({ metric, revenue: Math.round(revenue), gaming: g, churn: ch, net, cap, quality });
  };
  const reset = () => setRes(null);

  const METRICS = {
    volume: "Units sold. Simple, countable, and the easiest thing in the world to inflate.",
    revenue: "Revenue booked. Better, but discounting to hit the number is still rewarded.",
    margin: "Gross margin. Harder to game, and it makes the team price with discipline.",
    retention: "Net revenue retention. Slowest to move and closest to what the business actually wants.",
  };

  return (
    <div>
      <SimHeader onBack={onBack} title="Mechanism Design" tag="Rule Design" tagColor="#70B0C0">
        Eight salespeople. You choose what to pay them on. They will maximise whatever you measure, competently and without malice. This is inverse game theory: instead of predicting behaviour inside a fixed game, you design the game so that self-interest produces what you actually want.
      </SimHeader>
      <Goal>Maximise net value to the business, which is revenue minus the cost of gaming and churn.</Goal>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
        <Label>Pay them on</Label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
          {Object.keys(METRICS).map(k =>
            <Pill key={k} active={metric === k} onClick={() => { setMetric(k); setRes(null); }}>{k[0].toUpperCase() + k.slice(1)}</Pill>)}
        </div>
        <p style={{ fontSize: "11.5px", color: C.textMut, margin: "0 0 16px", fontStyle: "italic" }}>{METRICS[metric]}</p>
        <Label>Controls</Label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          <Pill active={cap} color={C.green} onClick={() => { setCap(!cap); setRes(null); }}>Cap on any single deal</Pill>
          <Pill active={quality} color={C.green} onClick={() => { setQuality(!quality); setRes(null); }}>Quality gate before payout</Pill>
        </div>
        <Btn onClick={run}>Run the Quarter</Btn>
      </div>

      {res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="Headline Revenue" value={res.revenue} color={C.amber} />
            <Stat label="Gaming Rate" value={res.gaming} sub="%" color={res.gaming > 30 ? C.red : C.green} />
            <Stat label="Churn" value={res.churn} sub="%" color={res.churn > 12 ? C.red : C.green} />
            <Stat label="Net Value" value={res.net} color={res.net > 500 ? C.green : C.red} />
          </div>
          <Insight tone={res.net > 550 ? "good" : "bad"}>
            {res.metric === "volume" && !res.quality &&
              `You paid on units and got units. Headline revenue looks strong at ${res.revenue}, and a ${res.gaming}% gaming rate and ${res.churn}% churn ate most of it. Nobody on this team behaved badly. They optimised the number you chose to pay for, which is what a compensation scheme is for. If you dislike the result, the mechanism is the suspect, not the people.`}
            {res.metric === "retention" &&
              `Paying on retention produced the lowest gaming rate at ${res.gaming}% and churn of just ${res.churn}%. Headline revenue is lower, and net value is higher. The metric closest to what the business actually wants is usually the hardest to move and the least attractive to put on a scorecard, which is exactly why it rarely gets chosen.`}
            {(res.metric === "revenue" || res.metric === "margin") &&
              `Paying on ${res.metric} landed you at ${res.gaming}% gaming and ${res.churn}% churn for ${res.net} net. ${res.cap || res.quality ? "Your controls are doing real work here: each one closes a route the team would otherwise take." : "Add a quality gate and rerun. The same metric performs very differently once the payout is conditional."}`}
          </Insight>
          <TryThis items={[
            "Run Volume with no controls, then Retention with both. Compare net value, not headline revenue.",
            "Add the quality gate to your worst-performing metric. Watch how much of the gap it closes.",
            "Write down what your own comp plan literally pays for. Then write down what you want. Where they differ, the plan wins.",
          ]} />
          <Btn onClick={reset} outline>Redesign</Btn>
        </div>
      )}

      <ModelBrief id="mechanism" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════
function RealOptions({ onBack }) {
  const [vol, setVol] = useState(40);
  const [stage, setStage] = useState(false);
  const [res, setRes] = useState(null);
  const [log, setLog] = useState([]);
  const COST = 100, BASE = 115;

  const decide = (action) => {
    const swing = (Math.random() - 0.5) * 2 * (vol / 100) * BASE;
    const revealed = Math.round(BASE + swing);
    let payoff, note;
    if (action === "now") {
      payoff = revealed - COST;
      note = "committed";
    } else if (action === "wait") {
      const proceed = revealed > COST;
      payoff = proceed ? revealed - COST - 8 : -8;
      note = proceed ? "waited, then invested" : "waited, then walked";
    } else {
      const firstGate = Math.round(COST * 0.35);
      const proceed = revealed > COST;
      payoff = proceed ? revealed - COST - 5 : -firstGate;
      note = proceed ? "staged, then completed" : "staged, then killed at gate 1";
    }
    const r = { action, revealed, payoff: Math.round(payoff), note, vol };
    setRes(r);
    setLog(l => [...l, { ...r, r: l.length + 1 }]);
  };
  const reset = () => { setRes(null); setLog([]); };
  const total = log.reduce((s, x) => s + x.payoff, 0);

  return (
    <div>
      <SimHeader onBack={onBack} title="Real Options" tag="Flexibility Value" tagColor="#70B0C0">
        A project costs {COST} and is expected to return about {BASE}, but the true value only becomes clear after you commit. Standard analysis compares investing now against never investing. That is not the choice you have. You can also wait, or stage the commitment and kill it at a gate.
      </SimHeader>
      <Goal>Maximise cumulative payoff over many attempts. The right answer changes as uncertainty rises.</Goal>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
        <Slider label="Uncertainty" value={vol} onChange={v => { setVol(v); setRes(null); }} min={5} max={90} suffix="%"
          hint={vol < 25 ? "Outcomes cluster near the expectation. Little to learn by waiting." : vol > 60 ? "Outcomes are wildly dispersed. The right to walk away is worth a great deal." : "Moderate dispersion."} />
        <Label>Your move</Label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Btn onClick={() => decide("now")}>Invest Now (full {COST})</Btn>
          <Btn onClick={() => decide("wait")} outline>Wait One Period (−8)</Btn>
          <Btn onClick={() => decide("stage")} outline>Stage It (gate at 35)</Btn>
        </div>
      </div>

      {res && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "20px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
            <Stat label="True Value" value={res.revealed} color={res.revealed > COST ? C.green : C.red} />
            <Stat label="Your Move" value={res.action === "now" ? "Committed" : res.action === "wait" ? "Waited" : "Staged"} color={C.amber} />
            <Stat label="Payoff" value={res.payoff} color={res.payoff > 0 ? C.green : C.red} />
          </div>
          <Insight tone={res.payoff > 0 ? "good" : "bad"}>
            {res.action === "now" && res.revealed < COST &&
              `You committed the full {COST} and the project turned out to be worth ${res.revealed}. You lost ${Math.abs(res.payoff)} with no way to stop. This is what a positive expected NPV buys you when there is no option to abandon: the average is fine and the individual outcome can be terrible.`}
            {res.action === "now" && res.revealed >= COST &&
              `Committing paid off this time, returning ${res.payoff}. At ${vol}% uncertainty, that was partly luck. Run the same decision twenty times and compare the total against staging, which trades a small fee for the right to stop.`}
            {res.action !== "now" && res.revealed < COST &&
              `The project turned out to be worth ${res.revealed}, below the ${COST} cost, and you ${res.action === "wait" ? `walked away for just the ${8} waiting cost` : "killed it at the first gate for 35"} instead of losing ${COST - res.revealed}. That saving is the option value, and standard NPV analysis cannot see it because it never models the decision to stop.`}
            {res.action !== "now" && res.revealed >= COST &&
              `You ${res.action === "wait" ? "waited" : "staged"} and then proceeded, netting ${res.payoff}. The flexibility cost you a little on the upside. It is insurance, and the premium is worth paying whenever uncertainty is high enough that walking away is a real possibility.`}
          </Insight>
          <TryThis items={[
            "Set uncertainty to 15% and run ten rounds committing immediately. Then run ten staged. Committing usually wins.",
            "Set uncertainty to 85% and repeat. The answer reverses completely.",
            "Find the uncertainty level where staging starts to beat committing. That is the threshold for your own decisions.",
          ]} />
          <Btn onClick={reset} outline>Clear History</Btn>
        </div>
      )}

      {log.length > 1 && (
        <div style={{ marginBottom: "10px" }}>
          <Label>Attempts · {log.length}</Label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Stat label="Cumulative" value={total} color={total > 0 ? C.green : C.red} />
            <Stat label="Avg per Attempt" value={Math.round(total / log.length)} color={total > 0 ? C.green : C.red} />
          </div>
        </div>
      )}

      <ModelBrief id="realopt" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHELLING FOCAL POINTS
// ═══════════════════════════════════════════════════════════════════════════════
const SCHELLING = [
  { q: "You must meet a stranger in New York City tomorrow. You cannot communicate. Where do you go?",
    opts: ["Grand Central Station", "Times Square", "Central Park", "Brooklyn Bridge"], focal: 0,
    why: "Grand Central under the clock is the classic answer. Nothing makes it a better meeting place than the alternatives. It wins because everyone expects everyone else to pick it." },
  { q: "You and a counterparty must independently name a payment term. Matching means the deal closes.",
    opts: ["30 days", "37 days", "45 days", "60 days"], focal: 0,
    why: "Net 30 is a focal point, not an optimum. No analysis established 30 days as efficient. It persists because deviating unilaterally is costly even when the convention is arbitrary." },
  { q: "Two of you must independently name a number. Matching wins. Any positive whole number is allowed.",
    opts: ["1", "7", "100", "42"], focal: 0,
    why: "One is the most common answer because it is the unique smallest positive integer, which makes it salient in a way no other number is. Salience beats sophistication here." },
  { q: "You must independently pick a price point for a premium product. Matching your competitor stabilises the category.",
    opts: ["$99", "$104", "$117", "$125"], focal: 0,
    why: "Round and near-round numbers dominate because they are mutually obvious. Offers and prices cluster at salient points, which is why deliberately pricing off the focal point moves the whole negotiating range." },
];

function Schelling({ onBack }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const item = SCHELLING[i];
  const done = i >= SCHELLING.length;

  const pick = (n) => {
    // The crowd converges hard on the focal option
    const crowd = Math.random() < 0.72 ? item.focal : Math.floor(Math.random() * item.opts.length);
    const matched = n === crowd;
    if (matched) setScore(s => s + 1);
    setPicked({ n, crowd, matched });
  };
  const next = () => { setI(i + 1); setPicked(null); };
  const reset = () => { setI(0); setPicked(null); setScore(0); };

  return (
    <div>
      <SimHeader onBack={onBack} title="Schelling Focal Points" tag="Coordination" tagColor="#70B0C0">
        Four coordination problems with no communication allowed. You win by matching what the other person independently chooses. There is no correct answer in any objective sense. There is only the answer everyone expects everyone else to give.
      </SimHeader>
      <Goal>Match the other party. Ask what they will expect you to pick, not what is best.</Goal>

      {!done ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "22px", marginBottom: "18px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontWeight: 600, marginBottom: "10px" }}>Problem {i + 1} of {SCHELLING.length}</div>
          <p style={{ fontSize: "14px", color: C.text, lineHeight: 1.6, margin: "0 0 18px" }}>{item.q}</p>
          {!picked ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {item.opts.map((o, n) => (
                <button key={n} onClick={() => pick(n)} style={{
                  padding: "12px 18px", background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: "3px",
                  color: C.textSec, fontSize: "13px", fontFamily: F.body, cursor: "pointer", transition: "all 0.12s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.color = C.textSec; }}>{o}</button>
              ))}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: "14px", marginBottom: "16px", flexWrap: "wrap" }}>
                <Stat label="You Picked" value={item.opts[picked.n]} color={C.steel} />
                <Stat label="They Picked" value={item.opts[picked.crowd]} color={C.amber} />
                <Stat label="Result" value={picked.matched ? "Matched" : "Missed"} color={picked.matched ? C.green : C.red} />
              </div>
              <Insight tone={picked.matched ? "good" : "bad"}>{item.why}</Insight>
              <Btn onClick={next}>{i === SCHELLING.length - 1 ? "See Results" : "Next Problem →"}</Btn>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "22px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "14px", marginBottom: "18px" }}>
            <Stat label="Matched" value={`${score}/${SCHELLING.length}`} color={score >= 3 ? C.green : C.red} />
          </div>
          <Insight tone={score >= 3 ? "good" : "neutral"}>
            {score >= 3
              ? "You found the focal points, which means you were answering the right question: not what is best, but what is obvious to both of us. That reframing is the entire skill. Most of the conventions in your industry are exactly this — stable because everyone expects everyone else to keep following them, and not because anyone established that they were efficient."
              : "You reasoned about which option was better rather than which was more obvious. That is the standard mistake, and it is expensive in practice because coordination problems reward salience over merit. Payment terms, notice periods, pricing tiers and fiscal calendars are all focal points, and none of them were optimised."}
          </Insight>
          <TryThis items={[
            "List three conventions in your industry nobody can justify. Each is a focal point.",
            "Ask which of them you could profitably deviate from, and which you could set for everyone else.",
            "Notice that setting the convention is worth more than following it.",
          ]} />
          <Btn onClick={reset} outline>Run Again</Btn>
        </div>
      )}

      <ModelBrief id="schelling" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHEAP TALK
// ═══════════════════════════════════════════════════════════════════════════════
const TALK = [
  { who: "A broker on a property you are considering", msg: "There is strong interest from another party. I would move quickly.", align: 0.1,
    truth: 0.35, why: "The broker is paid on completion and faces no cost if the claim is false. Interests diverge almost entirely, so the statement carries close to zero information regardless of how confident it sounds." },
  { who: "A supplier who has delivered on time for six years", msg: "We can hit that deadline, but it will be tight.", align: 0.85,
    truth: 0.88, why: "A long relationship and a reputation to protect align their interests with yours. The hedge in the wording is itself informative, because someone with no stake would simply have said yes." },
  { who: "A founder pitching you for investment", msg: "We are close to signing three major enterprise contracts.", align: 0.25,
    truth: 0.4, why: "Costless to say, hard to verify before you commit, and the payoff to saying it is large. The word 'close' does no work. Ask what is signed rather than what is close." },
  { who: "A competitor's CEO in a press interview", msg: "We have no plans to enter that segment.", align: 0.05,
    truth: 0.3, why: "There is no cost to saying this and a clear benefit if it slows you down. Cheap talk from a party whose interests directly oppose yours should be discounted to nothing." },
];

function CheapTalk({ onBack }) {
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [log, setLog] = useState([]);
  const item = TALK[i];
  const done = i >= TALK.length;

  const judge = (believe) => {
    const wasTrue = Math.random() < item.truth;
    const right = believe === wasTrue;
    setAnswered({ believe, wasTrue, right });
    setLog(l => [...l, { i, believe, wasTrue, right }]);
  };
  const next = () => { setI(i + 1); setAnswered(null); };
  const reset = () => { setI(0); setAnswered(null); setLog([]); };
  const score = log.filter(x => x.right).length;

  return (
    <div>
      <SimHeader onBack={onBack} title="Cheap Talk" tag="Credibility" tagColor="#70B0C0">
        Four statements. Each costs the speaker nothing to make and cannot be verified before you act on it. Your job is to decide which ones carry information. The test is not confidence or seniority. It is whether the speaker's interests align with yours.
      </SimHeader>
      <Goal>Judge each statement correctly. Ask what the speaker loses if they turn out to be wrong.</Goal>

      {!done ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "22px", marginBottom: "18px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontWeight: 600, marginBottom: "10px" }}>Statement {i + 1} of {TALK.length}</div>
          <div style={{ fontSize: "12px", color: C.textMut, marginBottom: "8px" }}>{item.who}</div>
          <p style={{ fontSize: "15px", color: C.text, lineHeight: 1.6, margin: "0 0 8px", fontStyle: "italic", paddingLeft: "14px", borderLeft: `2px solid ${C.borderStrong}` }}>{item.msg}</p>

          <div style={{ marginTop: "18px", marginBottom: "18px" }}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMut, fontWeight: 600, marginBottom: "7px" }}>Interest alignment with you</div>
            <div style={{ height: "8px", background: C.bg, borderRadius: "4px", overflow: "hidden", maxWidth: "260px", border: `1px solid ${C.border}` }}>
              <div style={{ height: "100%", width: `${item.align * 100}%`, background: item.align > 0.6 ? C.green : item.align > 0.3 ? C.amber : C.red }} />
            </div>
          </div>

          {!answered ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={() => judge(true)} color={C.green}>Believe It</Btn>
              <Btn onClick={() => judge(false)} color={C.red} textColor="#fff">Discount It</Btn>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: "14px", marginBottom: "16px", flexWrap: "wrap" }}>
                <Stat label="You" value={answered.believe ? "Believed" : "Discounted"} color={C.steel} />
                <Stat label="Reality" value={answered.wasTrue ? "True" : "False"} color={answered.wasTrue ? C.green : C.red} />
                <Stat label="Judgement" value={answered.right ? "Correct" : "Wrong"} color={answered.right ? C.green : C.red} />
              </div>
              <Insight tone={answered.right ? "good" : "bad"}>{item.why}</Insight>
              <Btn onClick={next}>{i === TALK.length - 1 ? "See Results" : "Next Statement →"}</Btn>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "22px", marginBottom: "18px" }}>
          <Stat label="Correct Judgements" value={`${score}/${TALK.length}`} color={score >= 3 ? C.green : C.red} />
          <div style={{ marginTop: "18px" }}>
            <Insight tone={score >= 3 ? "good" : "neutral"}>
              The pattern across all four is the same. Where the speaker's interests aligned with yours, the statement carried information. Where they diverged, it carried almost none, and no amount of confidence, seniority or detail changed that. The practical test fits in one sentence: would they say the same thing if the opposite were true? If yes, you have received no information and should act as though nothing was said.
            </Insight>
          </div>
          <TryThis items={[
            "Take the last three assurances you acted on. What did the speaker lose if they were wrong?",
            "Separate the costly signals from the cheap talk in your own pipeline. Deposits are costly. Interest is not.",
            "Notice which of your own communications are cheap talk, and what that means for how they are received.",
          ]} />
          <Btn onClick={reset} outline>Run Again</Btn>
        </div>
      )}

      <ModelBrief id="cheaptalk" />
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
  { id: "pd",        name: "Prisoner's Dilemma",   desc: "Two firms, twenty rounds, six opponent strategies. Cooperation and retaliation over a relationship that does not end.", finance: "Price wars · Cartel stability · Supplier relationships" },
  { id: "nash",      name: "Nash Bargaining",      desc: "Split a shrinking surplus with adjustable outside options. Your walk-away position sets the outcome, not your argument.", finance: "Salary · Vendor contracts · JV terms" },
  { id: "cournot",   name: "Cournot vs Bertrand",  desc: "Same industry, same costs, two competitive structures. In one, capacity destroys margin. In the other, differentiation creates it.", finance: "Oligopoly analysis · Capacity planning · Pricing strategy" },
  { id: "entry",     name: "Entry Deterrence",     desc: "Commit capital to deter a rival. The threat only works if what you sank is visible and irreversible.", finance: "Moat analysis · Predatory pricing · Capacity investment" },
  { id: "chicken",   name: "Chicken",              desc: "Two parties escalating. The winner is whoever can most credibly destroy their own ability to back down.", finance: "Hostile bids · Union talks · Litigation standoffs" },

  { id: "auction",   name: "Winner's Curse",       desc: "Bid on an asset of uncertain value. Winning is itself evidence that you were the most optimistic party in the room.", finance: "M&A · IPO allocation · Competitive tenders" },
  { id: "vickrey",   name: "Vickrey Auction",      desc: "Same bidders, two rulebooks. Changing who pays what flips the optimal strategy from shading to honesty.", finance: "Ad auctions · Procurement · Internal capital allocation" },

  { id: "signal",    name: "Spence Signaling",     desc: "Prove quality you cannot demonstrate directly. The signal works only while it stays too expensive to fake.", finance: "Credentials · Dividends · Buybacks · IPO underpricing" },
  { id: "lemons",    name: "Market for Lemons",    desc: "Set one price for sellers who know more than you. Watch the good ones leave and the market unravel.", finance: "Insurance · Credit · Secondary private stakes" },
  { id: "hazard",    name: "Moral Hazard",         desc: "Design a contract for someone whose effort you cannot see. Whatever they do next, you designed it.", finance: "Executive comp · Fund incentives · Franchising" },

  { id: "bank",      name: "Bank Run",             desc: "Rational individual withdrawals cascade into failure. Solvency is not enough when creditors cannot coordinate.", finance: "SVB · Repo markets · Confidence-sensitive funding" },
  { id: "beauty",    name: "Beauty Contest",       desc: "Guess two-thirds of the average guess. You are not choosing what is best, you are choosing what others will choose.", finance: "Bubbles · Momentum · Market timing" },
  { id: "cascade",   name: "Information Cascades", desc: "Decide after watching others decide. Once two people lean the same way, everyone stops using their own information.", finance: "Analyst herding · Follow-on rounds · Crowded trades" },

  { id: "prospect",  name: "Prospect Theory",      desc: "Four decisions. Two pairs are mathematically identical and worded differently. Find out which framings move you.", finance: "Disposition effect · Pricing anchors · Project escalation" },
  { id: "ultimatum", name: "Ultimatum Game",       desc: "Propose a split. Rejections that standard theory calls irrational will cost you profitable deals.", finance: "Fee negotiation · Compensation · Scarcity pricing" },

  { id: "stag",      name: "Stag Hunt",            desc: "The joint opportunity pays far more and needs both of you. Nobody wants to defect. The only barrier is trust.", finance: "Syndicated lending · Standard-setting · Consortium R&D" },
  { id: "attrition", name: "War of Attrition",     desc: "Both sides burn cash waiting for the other to quit. The contest consumes the prize while you fight for it.", finance: "Price wars · Patent litigation · Subsidised growth" },
  { id: "holdup",    name: "Hold-Up Problem",      desc: "Invest in something that only has value inside one relationship, then watch the terms reopen.", finance: "Vertical integration · Supplier lock-in · Control rights" },

  { id: "mechanism", name: "Mechanism Design",     desc: "Choose what to pay your team on. They will maximise exactly what you measure, competently and without malice.", finance: "Comp structures · Budgeting · Auction format choice" },
  { id: "realopt",   name: "Real Options",         desc: "Invest now, wait, or stage it. Standard analysis compares acting now against never acting, which is not your actual choice.", finance: "Stage-gate R&D · VC staging · Earn-outs" },
  { id: "schelling", name: "Schelling Focal Points", desc: "Coordinate without communicating. The winning answer is the obvious one, not the best one.", finance: "Benchmarks · Contract defaults · Round-number anchoring" },
  { id: "cheaptalk", name: "Cheap Talk",           desc: "Four statements that cost the speaker nothing. Decide which carry information and which are noise.", finance: "Guidance · Price targets · Letters of intent" },
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
      <div style={{ marginBottom: "56px" }}>
        <div style={{ maxWidth: "540px", marginBottom: "18px" }}>
          <h1 style={{ fontSize: "34px", fontFamily: F.display, fontWeight: 400, color: C.text, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Sagax
          </h1>
          <p style={{ fontSize: "13px", color: C.amber, fontFamily: F.body, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 20px", fontWeight: 500 }}>
            Applied Game Theory for Finance and Negotiation
          </p>
          <p style={{ fontSize: "15px", color: C.textSec, lineHeight: 1.7, margin: "0 0 8px", maxWidth: "440px" }}>
            Interactive simulators for strategic interactions in financial markets: auctions, negotiations, competitive dynamics, coordination failures. Each one uses a real finance scenario and teaches through play.
          </p>
          <p style={{ fontSize: "13px", color: C.textMut, lineHeight: 1.6, margin: "14px 0 0", maxWidth: "440px" }}>
            Make a move. ↓
          </p>
        </div>
        <HeroGame onGoDeeper={() => onNav("pd")} />
      </div>

      {/* ── Simulator Library ── */}
      {Object.entries(CATS).map(([ck, cat]) => {
        const items = SIMS.filter(s => MODELS[s.id] && MODELS[s.id].cat === ck);
        if (!items.length) return null;
        return (
          <div key={ck} style={{ marginBottom: "34px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: cat.color, fontWeight: 600 }}>{cat.label}</span>
              <span style={{ fontSize: "11.5px", color: C.textFaint }}>{cat.blurb}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))", gap: "10px" }}>
              {items.map(sim => (
                <div key={sim.id} onClick={() => onNav(sim.id)}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "18px", cursor: "pointer", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.borderColor = C.borderStrong; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: F.mono, fontSize: "10.5px", color: C.textFaint }}>{String(MODELS[sim.id].n).padStart(2, "0")}</span>
                    {sim.id === "pd" && <Tag color={C.amber}>Start here</Tag>}
                  </div>
                  <h3 style={{ fontSize: "15px", fontFamily: F.body, fontWeight: 500, color: C.text, margin: "0 0 7px" }}>{sim.name} &rarr;</h3>
                  <p style={{ fontSize: "12.5px", color: C.textSec, lineHeight: 1.55, margin: "0 0 8px" }}>{sim.desc}</p>
                  <div style={{ fontSize: "11px", color: C.textMut, fontStyle: "italic" }}>{sim.finance}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

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
        {page === "cournot" && <CournotBertrand onBack={() => setPage("home")} />}
        {page === "chicken" && <Chicken onBack={() => setPage("home")} />}
        {page === "vickrey" && <VickreyAuction onBack={() => setPage("home")} />}
        {page === "lemons" && <Lemons onBack={() => setPage("home")} />}
        {page === "hazard" && <MoralHazard onBack={() => setPage("home")} />}
        {page === "cascade" && <Cascades onBack={() => setPage("home")} />}
        {page === "prospect" && <ProspectTheory onBack={() => setPage("home")} />}
        {page === "stag" && <StagHunt onBack={() => setPage("home")} />}
        {page === "attrition" && <WarOfAttrition onBack={() => setPage("home")} />}
        {page === "holdup" && <HoldUp onBack={() => setPage("home")} />}
        {page === "mechanism" && <MechanismDesign onBack={() => setPage("home")} />}
        {page === "realopt" && <RealOptions onBack={() => setPage("home")} />}
        {page === "schelling" && <Schelling onBack={() => setPage("home")} />}
        {page === "cheaptalk" && <CheapTalk onBack={() => setPage("home")} />}
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
