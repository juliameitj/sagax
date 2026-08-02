import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#0C0C10",
  surface: "#14141C",
  surfaceHover: "#1A1A24",
  border: "#222233",
  borderStrong: "#333344",
  accent: "#6C8EEF",
  accentMuted: "#6C8EEF20",
  gold: "#E2B340",
  goldMuted: "#E2B34020",
  red: "#E06060",
  redMuted: "#E0606020",
  green: "#5CB87A",
  greenMuted: "#5CB87A20",
  textPrimary: "#E0DDD6",
  textSecondary: "#9090A0",
  textMuted: "#606070",
  textFaint: "#404050",
};

const F = {
  display: "'Georgia', 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function Btn({ children, onClick, variant = "default", disabled = false, style = {} }) {
  const base = {
    padding: "8px 18px",
    borderRadius: "3px",
    fontSize: "13px",
    fontFamily: F.body,
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.12s",
    border: "none",
    fontWeight: 500,
    opacity: disabled ? 0.4 : 1,
    letterSpacing: "0.01em",
  };
  const variants = {
    default: { background: C.accent, color: "#fff" },
    outline: { background: "transparent", border: `1.5px solid ${C.border}`, color: C.textSecondary },
    gold: { background: C.gold, color: "#111" },
    red: { background: C.red, color: "#fff" },
    green: { background: C.green, color: "#111" },
    ghost: { background: "transparent", color: C.textSecondary, padding: "8px 12px" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Tag({ children, color = C.accent }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "100px",
      fontSize: "10.5px",
      fontFamily: F.body,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      fontWeight: 600,
      color,
      background: color + "18",
      border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      color: C.textMuted,
      fontFamily: F.body,
      fontWeight: 600,
      marginBottom: "10px",
    }}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATOR 1 — PRISONER'S DILEMMA TOURNAMENT
// ═══════════════════════════════════════════════════════════════════════════════

const PD_PAYOFFS = {
  CC: [3, 3],
  CD: [0, 5],
  DC: [5, 0],
  DD: [1, 1],
};

const PD_LABELS = {
  C: "Cooperate",
  D: "Defect",
};

const FINANCE_LABELS = {
  C: "Hold Price",
  D: "Undercut",
};

const STRATEGIES = {
  tit_for_tat: { name: "Tit-for-Tat", desc: "Cooperates first, then mirrors your last move.", color: C.accent },
  always_defect: { name: "Always Defect", desc: "Defects every round regardless.", color: C.red },
  always_coop: { name: "Always Cooperate", desc: "Cooperates every round regardless.", color: C.green },
  grudger: { name: "Grudger", desc: "Cooperates until you defect once, then defects forever.", color: C.gold },
  random: { name: "Random", desc: "50/50 chance of cooperating or defecting each round.", color: C.textSecondary },
  pavlov: { name: "Pavlov", desc: "Repeats last move if it got a good payoff, switches if it didn't.", color: "#C080E0" },
};

function getStrategyMove(id, history) {
  const n = history.length;
  switch (id) {
    case "always_defect": return "D";
    case "always_coop": return "C";
    case "random": return Math.random() < 0.5 ? "C" : "D";
    case "tit_for_tat": return n === 0 ? "C" : history[n - 1].player;
    case "grudger": return history.some((r) => r.player === "D") ? "D" : "C";
    case "pavlov": {
      if (n === 0) return "C";
      const last = history[n - 1];
      const payoff = PD_PAYOFFS[last.opponent + last.player][1];
      return payoff >= 3 ? last.opponent : last.opponent === "C" ? "D" : "C";
    }
    default: return "C";
  }
}

function PrisonersDilemma({ onBack }) {
  const [opponent, setOpponent] = useState("tit_for_tat");
  const [history, setHistory] = useState([]);
  const [showFinance, setShowFinance] = useState(true);
  const [roundLimit] = useState(20);
  const historyEndRef = useRef(null);

  const labels = showFinance ? FINANCE_LABELS : PD_LABELS;
  const gameOver = history.length >= roundLimit;

  const scores = useMemo(() => {
    let p = 0, o = 0;
    history.forEach((r) => {
      const [ps, os] = PD_PAYOFFS[r.player + r.opponent];
      p += ps;
      o += os;
    });
    return { player: p, opponent: o };
  }, [history]);

  const play = useCallback((move) => {
    if (gameOver) return;
    const opMove = getStrategyMove(opponent, history);
    setHistory((prev) => [...prev, { player: move, opponent: opMove, round: prev.length + 1 }]);
  }, [opponent, history, gameOver]);

  const reset = () => setHistory([]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history]);

  const strat = STRATEGIES[opponent];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: "12px", fontFamily: F.body, padding: 0, marginBottom: "12px" }}>
          ← Back to library
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontFamily: F.display, color: C.textPrimary, fontWeight: 400 }}>
            Prisoner's Dilemma
          </h2>
          <Tag color={C.accent}>Market Strategy</Tag>
        </div>
        <p style={{ color: C.textSecondary, fontSize: "13.5px", lineHeight: 1.65, margin: "10px 0 0", maxWidth: "640px", fontFamily: F.body }}>
          Two competing firms independently choose whether to maintain prices or undercut.
          If both hold, both profit moderately. If one undercuts while the other holds, the undercutter
          captures the market. If both undercut, a price war destroys margins for everyone. Play 20 rounds
          against different strategies and see which approach wins.
        </p>
      </div>

      {/* Payoff Matrix */}
      <div style={{ marginBottom: "24px" }}>
        <SectionLabel>Payoff Matrix</SectionLabel>
        <div style={{ display: "inline-block", border: `1px solid ${C.border}`, borderRadius: "3px", overflow: "hidden" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12.5px" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 14px", background: C.surface, color: C.textMuted, fontWeight: 400, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, textAlign: "left", fontFamily: F.body, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  You \ Opponent
                </th>
                <th style={{ padding: "8px 18px", background: C.surface, color: C.green, fontWeight: 500, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, textAlign: "center", fontSize: "11px" }}>
                  {labels.C}
                </th>
                <th style={{ padding: "8px 18px", background: C.surface, color: C.red, fontWeight: 500, borderBottom: `1px solid ${C.border}`, textAlign: "center", fontSize: "11px" }}>
                  {labels.D}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px 14px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, color: C.green, fontWeight: 500, fontSize: "11px" }}>{labels.C}</td>
                <td style={{ padding: "10px 18px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, textAlign: "center", background: C.greenMuted, color: C.textPrimary }}>3, 3</td>
                <td style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, textAlign: "center", background: C.redMuted, color: C.textPrimary }}>0, 5</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 14px", borderRight: `1px solid ${C.border}`, color: C.red, fontWeight: 500, fontSize: "11px" }}>{labels.D}</td>
                <td style={{ padding: "10px 18px", borderRight: `1px solid ${C.border}`, textAlign: "center", color: C.textPrimary }}>5, 0</td>
                <td style={{ padding: "10px 18px", textAlign: "center", background: "#E0606010", color: C.textPrimary }}>1, 1</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "6px", fontSize: "11px", color: C.textMuted, fontFamily: F.body }}>
          Format: your payoff, opponent's payoff
          <button onClick={() => setShowFinance(!showFinance)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: "11px", fontFamily: F.body, marginLeft: "10px", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            {showFinance ? "Show abstract labels" : "Show finance framing"}
          </button>
        </div>
      </div>

      {/* Opponent Selector */}
      <div style={{ marginBottom: "24px" }}>
        <SectionLabel>Opponent Strategy</SectionLabel>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(STRATEGIES).map(([id, s]) => (
            <button
              key={id}
              onClick={() => { setOpponent(id); setHistory([]); }}
              style={{
                padding: "6px 14px",
                borderRadius: "100px",
                border: opponent === id ? `1.5px solid ${s.color}` : `1.5px solid ${C.border}`,
                background: opponent === id ? s.color + "18" : "transparent",
                color: opponent === id ? s.color : C.textMuted,
                fontSize: "12px",
                fontFamily: F.body,
                cursor: "pointer",
                transition: "all 0.12s",
                fontWeight: opponent === id ? 500 : 400,
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: C.textMuted, margin: "8px 0 0", fontFamily: F.body, fontStyle: "italic" }}>
          {strat.desc}
        </p>
      </div>

      {/* Game Controls */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
        <Btn onClick={() => play("C")} variant="green" disabled={gameOver}>
          {labels.C}
        </Btn>
        <Btn onClick={() => play("D")} variant="red" disabled={gameOver}>
          {labels.D}
        </Btn>
        <div style={{ flex: 1 }} />
        <Btn onClick={reset} variant="outline">Reset</Btn>
      </div>

      {/* Scoreboard */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "12px 20px", minWidth: "120px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "4px" }}>You</div>
          <div style={{ fontSize: "24px", fontFamily: F.mono, color: C.textPrimary, fontWeight: 600 }}>{scores.player}</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "12px 20px", minWidth: "120px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "4px" }}>{strat.name}</div>
          <div style={{ fontSize: "24px", fontFamily: F.mono, color: strat.color, fontWeight: 600 }}>{scores.opponent}</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "12px 20px", minWidth: "80px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "4px" }}>Round</div>
          <div style={{ fontSize: "24px", fontFamily: F.mono, color: C.textPrimary, fontWeight: 600 }}>{history.length}<span style={{ fontSize: "14px", color: C.textMuted }}>/{roundLimit}</span></div>
        </div>
      </div>

      {/* Game Over Insight */}
      {gameOver && (
        <div style={{
          background: scores.player > scores.opponent ? C.greenMuted : scores.player < scores.opponent ? C.redMuted : C.accentMuted,
          border: `1px solid ${scores.player > scores.opponent ? C.green : scores.player < scores.opponent ? C.red : C.accent}30`,
          borderRadius: "3px",
          padding: "14px 18px",
          marginBottom: "20px",
        }}>
          <div style={{ fontSize: "13.5px", color: C.textPrimary, fontFamily: F.body, fontWeight: 500, marginBottom: "6px" }}>
            {scores.player > scores.opponent ? "You won." : scores.player < scores.opponent ? `${strat.name} won.` : "Draw."}
          </div>
          <div style={{ fontSize: "12.5px", color: C.textSecondary, fontFamily: F.body, lineHeight: 1.6 }}>
            {opponent === "always_defect" && scores.player < scores.opponent &&
              "Against a permanent defector, there is no cooperation to exploit. The best you can do is also defect — mutual destruction at 1 point per round. In markets, this is the price war equilibrium that antitrust regulators worry about."}
            {opponent === "always_defect" && scores.player >= scores.opponent &&
              "You matched or beat Always Defect — likely by defecting yourself. When your opponent will never cooperate, the rational response is to defect every round. This is the Nash equilibrium of the one-shot game."}
            {opponent === "tit_for_tat" && scores.player > scores.opponent &&
              "You beat Tit-for-Tat — probably by defecting early to steal a surplus. But notice the total combined payoff: mutual cooperation (3+3=6 per round) beats mutual defection (1+1=2). Exploiting a cooperative partner is individually rational but collectively wasteful."}
            {opponent === "tit_for_tat" && scores.player <= scores.opponent &&
              "Tit-for-Tat is remarkably effective: it cooperates first (signaling goodwill), retaliates immediately (punishing exploitation), and forgives instantly (restoring cooperation). Robert Axelrod's 1984 tournaments proved it the strongest simple strategy in repeated interactions."}
            {opponent === "always_coop" &&
              "Against unconditional cooperation, defection is always dominant — you get 5 instead of 3 every round. In finance: a counterparty who never walks away from a deal leaves value on the table. The lesson: cooperate with reciprocators, not with pushovers."}
            {opponent === "grudger" && history.some((r) => r.player === "D") &&
              "Grudger cooperates until betrayed, then defects forever. One defection costs you the entire cooperative surplus for all remaining rounds. In business: some relationships, once broken, cannot be repaired. The option value of maintaining trust is often higher than a one-time exploitation gain."}
            {opponent === "grudger" && !history.some((r) => r.player === "D") &&
              "You cooperated throughout and achieved the maximum mutual payoff. Against a Grudger, sustained cooperation is the optimal strategy — the cost of a single defection cascades through all remaining rounds."}
            {opponent === "random" &&
              "Against a random player, your strategy doesn't matter much — outcomes are driven by noise, not reciprocity. In markets, this is the equivalent of trading against a counterparty whose behavior you can't model. The rational response is to defect (guarantee 1 or 5 vs. risk 0 or 3)."}
            {opponent === "pavlov" &&
              "Pavlov (Win-Stay, Lose-Shift) adapts based on outcomes, not your moves. It performs well in noisy environments because it can recover from accidental defections. In finance, Pavlov resembles momentum strategies — repeat what worked, reverse what didn't."}
          </div>
        </div>
      )}

      {/* Round History */}
      {history.length > 0 && (
        <div>
          <SectionLabel>Round History</SectionLabel>
          <div style={{
            maxHeight: "220px",
            overflowY: "auto",
            border: `1px solid ${C.border}`,
            borderRadius: "3px",
            scrollbarWidth: "thin",
            scrollbarColor: `${C.borderStrong} ${C.surface}`,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
                  {["Rnd", "You", "Opponent", "Your Payoff", "Their Payoff"].map((h, i) => (
                    <th key={h} style={{
                      padding: "7px 12px",
                      textAlign: i === 0 ? "center" : "left",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: C.textMuted,
                      fontFamily: F.body,
                      fontWeight: 500,
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const [pp, op] = PD_PAYOFFS[r.player + r.opponent];
                  return (
                    <tr key={r.round} style={{ borderBottom: `1px solid ${C.border}08` }}>
                      <td style={{ padding: "6px 12px", textAlign: "center", color: C.textMuted }}>{r.round}</td>
                      <td style={{ padding: "6px 12px", color: r.player === "C" ? C.green : C.red }}>{labels[r.player]}</td>
                      <td style={{ padding: "6px 12px", color: r.opponent === "C" ? C.green : C.red }}>{labels[r.opponent]}</td>
                      <td style={{ padding: "6px 12px", color: pp >= 3 ? C.green : pp === 0 ? C.red : C.textSecondary }}>+{pp}</td>
                      <td style={{ padding: "6px 12px", color: op >= 3 ? C.green : op === 0 ? C.red : C.textSecondary }}>+{op}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div ref={historyEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATOR 2 — SEALED-BID AUCTION (Winner's Curse)
// ═══════════════════════════════════════════════════════════════════════════════

function SealedBidAuction({ onBack }) {
  const [numBidders, setNumBidders] = useState(5);
  const [bid, setBid] = useState("");
  const [results, setResults] = useState(null);
  const [roundHistory, setRoundHistory] = useState([]);
  const [signal, setSignal] = useState(null);
  const [cumulativePnL, setCumulativePnL] = useState(0);

  // Generate a new round
  const generateRound = useCallback(() => {
    // True value uniformly distributed 40-160
    const trueValue = Math.floor(Math.random() * 120) + 40;
    // Each bidder gets a noisy signal: trueValue + noise(-30, +30)
    const playerSignal = trueValue + Math.floor(Math.random() * 61) - 30;
    setSignal(playerSignal);
    setBid("");
    setResults(null);
    return trueValue;
  }, []);

  const [trueValue, setTrueValue] = useState(() => {
    const tv = Math.floor(Math.random() * 120) + 40;
    const ps = tv + Math.floor(Math.random() * 61) - 30;
    // We'll store these in a ref-like approach via state
    return { value: tv, signal: ps };
  });

  useEffect(() => {
    setSignal(trueValue.signal);
  }, [trueValue]);

  const newRound = () => {
    const tv = Math.floor(Math.random() * 120) + 40;
    const ps = tv + Math.floor(Math.random() * 61) - 30;
    setTrueValue({ value: tv, signal: ps });
    setSignal(ps);
    setBid("");
    setResults(null);
  };

  const submitBid = () => {
    const playerBid = parseFloat(bid);
    if (isNaN(playerBid) || playerBid < 0) return;

    const tv = trueValue.value;

    // Generate AI bids: each gets their own signal and bids signal * (0.85-1.0) — slight strategic shading
    const aiBids = [];
    for (let i = 0; i < numBidders; i++) {
      const aiSignal = tv + Math.floor(Math.random() * 61) - 30;
      const shade = 0.85 + Math.random() * 0.15;
      aiBids.push({
        name: `Bidder ${String.fromCharCode(65 + i)}`,
        signal: aiSignal,
        bid: Math.round(aiSignal * shade),
      });
    }

    const allBids = [
      { name: "You", signal: signal, bid: playerBid },
      ...aiBids,
    ].sort((a, b) => b.bid - a.bid);

    const winner = allBids[0];
    const won = winner.name === "You";
    const pnl = won ? tv - playerBid : 0;

    const newPnL = cumulativePnL + pnl;
    setCumulativePnL(newPnL);

    setResults({
      trueValue: tv,
      allBids,
      winner,
      won,
      pnl,
      playerBid,
    });

    setRoundHistory((prev) => [
      ...prev,
      { round: prev.length + 1, trueValue: tv, playerBid, won, pnl, numBidders: numBidders + 1 },
    ]);
  };

  const resetAll = () => {
    setCumulativePnL(0);
    setRoundHistory([]);
    newRound();
  };

  const winsCount = roundHistory.filter((r) => r.won).length;
  const cursedCount = roundHistory.filter((r) => r.won && r.pnl < 0).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: "12px", fontFamily: F.body, padding: 0, marginBottom: "12px" }}>
          ← Back to library
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontFamily: F.display, color: C.textPrimary, fontWeight: 400 }}>
            Sealed-Bid Auction
          </h2>
          <Tag color={C.gold}>Winner's Curse</Tag>
        </div>
        <p style={{ color: C.textSecondary, fontSize: "13.5px", lineHeight: 1.65, margin: "10px 0 0", maxWidth: "640px", fontFamily: F.body }}>
          An asset has an unknown true value. You and {numBidders} AI bidders each receive a noisy private
          estimate (your "signal") and submit sealed bids simultaneously. Highest bid wins and pays
          their bid. The catch: the winner is systematically the bidder who <em>overestimated the most</em>.
          This is the winner's curse — winning is evidence you overpaid.
        </p>
      </div>

      {/* Bidder Count Selector */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>Number of Competitors</SectionLabel>
        <div style={{ display: "flex", gap: "6px" }}>
          {[3, 5, 8, 12].map((n) => (
            <button
              key={n}
              onClick={() => { setNumBidders(n); resetAll(); }}
              style={{
                padding: "6px 16px",
                borderRadius: "100px",
                border: numBidders === n ? `1.5px solid ${C.accent}` : `1.5px solid ${C.border}`,
                background: numBidders === n ? C.accentMuted : "transparent",
                color: numBidders === n ? C.accent : C.textMuted,
                fontSize: "12.5px",
                fontFamily: F.mono,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "11.5px", color: C.textMuted, margin: "6px 0 0", fontFamily: F.body, fontStyle: "italic" }}>
          More bidders intensifies the curse — the maximum overestimate grows with the field.
        </p>
      </div>

      {/* Signal & Bid Input */}
      {!results && signal !== null && (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: "3px",
          padding: "20px",
          marginBottom: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "4px" }}>
                Your Private Signal
              </div>
              <div style={{ fontSize: "32px", fontFamily: F.mono, color: C.accent, fontWeight: 600 }}>
                {signal}
              </div>
              <div style={{ fontSize: "11px", color: C.textMuted, fontFamily: F.body, marginTop: "2px" }}>
                True value = signal ± 30 (uniform noise)
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "6px" }}>
                Your Bid
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number"
                  value={bid}
                  onChange={(e) => setBid(e.target.value)}
                  placeholder="Enter bid..."
                  onKeyDown={(e) => e.key === "Enter" && submitBid()}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: C.bg,
                    border: `1px solid ${C.borderStrong}`,
                    borderRadius: "3px",
                    color: C.textPrimary,
                    fontFamily: F.mono,
                    fontSize: "16px",
                    outline: "none",
                    maxWidth: "160px",
                  }}
                />
                <Btn onClick={submitBid} disabled={!bid || isNaN(parseFloat(bid))}>
                  Submit Bid
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: "3px",
          padding: "20px",
          marginBottom: "20px",
        }}>
          {/* True Value Reveal */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "16px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "4px" }}>True Value</div>
              <div style={{ fontSize: "28px", fontFamily: F.mono, color: C.textPrimary, fontWeight: 600 }}>{results.trueValue}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "4px" }}>Your Bid</div>
              <div style={{ fontSize: "28px", fontFamily: F.mono, color: results.won ? C.gold : C.textSecondary, fontWeight: 600 }}>{results.playerBid}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, fontFamily: F.body, marginBottom: "4px" }}>Result</div>
              <div style={{ fontSize: "28px", fontFamily: F.mono, color: results.won ? (results.pnl >= 0 ? C.green : C.red) : C.textMuted, fontWeight: 600 }}>
                {results.won ? (results.pnl >= 0 ? `+${results.pnl}` : results.pnl) : "Lost"}
              </div>
            </div>
          </div>

          {/* Bid Ranking */}
          <SectionLabel>All Bids (highest first)</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "16px" }}>
            {results.allBids.map((b, i) => {
              const isPlayer = b.name === "You";
              const isWinner = i === 0;
              const overpaid = b.bid > results.trueValue;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 12px",
                    borderRadius: "2px",
                    background: isPlayer ? (isWinner ? (results.pnl >= 0 ? C.greenMuted : C.redMuted) : C.accentMuted) : "transparent",
                    fontFamily: F.mono,
                    fontSize: "12.5px",
                  }}
                >
                  <span style={{ width: "20px", color: isWinner ? C.gold : C.textMuted, fontSize: "10px", textAlign: "center" }}>
                    {isWinner ? "★" : ""}
                  </span>
                  <span style={{ width: "80px", color: isPlayer ? C.accent : C.textSecondary, fontWeight: isPlayer ? 600 : 400 }}>
                    {b.name}
                  </span>
                  <span style={{ width: "60px", color: C.textMuted, fontSize: "11px" }}>
                    sig: {b.signal}
                  </span>
                  <span style={{ width: "60px", color: overpaid ? C.red : C.green }}>
                    bid: {Math.round(b.bid)}
                  </span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                    <div style={{
                      height: "6px",
                      width: `${Math.min(100, (b.bid / (results.trueValue * 1.5)) * 100)}%`,
                      background: overpaid ? C.red + "60" : C.green + "60",
                      borderRadius: "3px",
                      minWidth: "4px",
                    }} />
                  </div>
                </div>
              );
            })}
            {/* True value marker */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "4px 12px",
              borderTop: `1px dashed ${C.textMuted}40`,
              marginTop: "4px",
              fontFamily: F.mono,
              fontSize: "11px",
              color: C.textMuted,
            }}>
              <span style={{ width: "20px" }} />
              <span>True value: {results.trueValue} — bids above this line overpaid</span>
            </div>
          </div>

          {/* Insight */}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: "3px",
            padding: "14px 16px",
            marginBottom: "14px",
          }}>
            <div style={{ fontSize: "12.5px", color: C.textSecondary, fontFamily: F.body, lineHeight: 1.65 }}>
              {results.won && results.pnl < 0 &&
                `Winner's curse in action. You won by bidding ${results.playerBid} for an asset worth ${results.trueValue}, losing ${Math.abs(results.pnl)} points. Winning a common-value auction is Bayesian bad news — it means your signal was likely an overestimate. The rational adjustment: shade your bid below your signal. With ${numBidders + 1} bidders, a good rule of thumb is to bid ~${Math.round(70 - numBidders)}% of your signal.`}
              {results.won && results.pnl >= 0 &&
                `Good bid — you won at ${results.playerBid} for an asset worth ${results.trueValue}, profiting ${results.pnl}. You shaded enough to avoid the curse. The key insight: in common-value auctions, you should bid as if your signal is the highest in the room — because if you win, it was.`}
              {!results.won &&
                `You didn't win this round. The winner bid ${Math.round(results.allBids[0].bid)} for an asset worth ${results.trueValue}${results.allBids[0].bid > results.trueValue ? ` — and overpaid by ${Math.round(results.allBids[0].bid) - results.trueValue}. The curse strikes again.` : `, netting a ${results.trueValue - Math.round(results.allBids[0].bid)} profit.`} Not winning a common-value auction is often the correct outcome.`}
            </div>
          </div>

          <Btn onClick={newRound}>Next Round →</Btn>
        </div>
      )}

      {/* Cumulative Stats */}
      {roundHistory.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel>Session Stats ({roundHistory.length} rounds)</SectionLabel>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "10px 16px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, fontFamily: F.body }}>Cumulative P&L</div>
              <div style={{ fontSize: "20px", fontFamily: F.mono, color: cumulativePnL >= 0 ? C.green : C.red, fontWeight: 600 }}>
                {cumulativePnL >= 0 ? `+${cumulativePnL}` : cumulativePnL}
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "10px 16px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, fontFamily: F.body }}>Win Rate</div>
              <div style={{ fontSize: "20px", fontFamily: F.mono, color: C.textPrimary, fontWeight: 600 }}>
                {winsCount}/{roundHistory.length}
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "10px 16px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, fontFamily: F.body }}>Cursed Wins</div>
              <div style={{ fontSize: "20px", fontFamily: F.mono, color: cursedCount > 0 ? C.red : C.green, fontWeight: 600 }}>
                {cursedCount}
              </div>
            </div>
            <Btn onClick={resetAll} variant="outline" style={{ alignSelf: "center" }}>Reset Session</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATOR LIBRARY (LANDING PAGE)
// ═══════════════════════════════════════════════════════════════════════════════

const LIBRARY = [
  {
    id: "prisoners_dilemma",
    name: "Prisoner's Dilemma",
    category: "Market Strategy",
    categoryColor: C.accent,
    status: "live",
    desc: "Two firms choose pricing strategies. Play 20 rounds against six AI strategies — Tit-for-Tat, Grudger, Pavlov, and more. See how cooperation and defection play out over repeated interactions.",
    finance: "Competitive pricing, cartel stability, supplier relationships, repeated negotiations.",
  },
  {
    id: "sealed_bid",
    name: "Sealed-Bid Auction",
    category: "Winner's Curse",
    categoryColor: C.gold,
    status: "live",
    desc: "Bid against AI opponents for an asset with uncertain common value. Discover why the winner of a common-value auction systematically overpays — and how to correct for it.",
    finance: "IPO book-building, M&A competitive bidding, oil lease auctions, art auction strategy.",
  },
  {
    id: "nash_bargaining",
    name: "Nash Bargaining",
    category: "Negotiation",
    categoryColor: C.green,
    status: "coming",
    desc: "Two-player bargaining with adjustable disagreement payoffs, patience parameters, and outside options. See how BATNA strength reshapes the negotiated outcome.",
    finance: "Salary negotiation, deal structuring, vendor contracts, partnership terms.",
  },
  {
    id: "bank_run",
    name: "Bank Run",
    category: "Coordination Crisis",
    categoryColor: C.red,
    status: "coming",
    desc: "Model the Diamond-Dybvig bank run game. Individually rational withdrawals cascade into systemic failure. See why deposit insurance and lender-of-last-resort change the equilibrium.",
    finance: "Liquidity crises, money market fund runs, SVB-style deposit flights.",
  },
  {
    id: "beauty_contest",
    name: "Keynesian Beauty Contest",
    category: "Second-Order Thinking",
    categoryColor: "#C080E0",
    status: "coming",
    desc: "Guess 2/3 of the average guess. See how layers of strategic reasoning converge toward zero — and why markets overshoot when players think at different depths.",
    finance: "Speculative bubbles, momentum trading, market timing psychology.",
  },
  {
    id: "signaling",
    name: "Job Market Signaling",
    category: "Information Asymmetry",
    categoryColor: "#E09050",
    status: "coming",
    desc: "Model Spence's signaling game: education as a signal of ability even when it doesn't increase productivity. Adjust costs, pooling equilibria, and separating equilibria.",
    finance: "CFA/MBA credential value, IPO underpricing as signaling, management guidance credibility.",
  },
  {
    id: "entry_deterrence",
    name: "Entry Deterrence",
    category: "Competitive Moats",
    categoryColor: "#70B0C0",
    status: "coming",
    desc: "An incumbent signals capacity to deter an entrant. Adjust cost structures, commitment credibility, and information asymmetry. See when bluffs work and when they don't.",
    finance: "Competitive moat analysis for equity research, predatory pricing, capacity investment.",
  },
  {
    id: "ultimatum",
    name: "Ultimatum Game",
    category: "Behavioral Anomalies",
    categoryColor: "#D07070",
    status: "coming",
    desc: "Propose a split of 100 points. See how 'irrational' rejections of unfair offers emerge — and what that implies about the limits of homo economicus in financial markets.",
    finance: "Final-offer arbitration, fee negotiation, fairness norms in deal-making.",
  },
];

function Library({ onSelect }) {
  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{
          fontSize: "28px",
          fontFamily: F.display,
          fontWeight: 400,
          color: C.textPrimary,
          margin: "0 0 4px",
          letterSpacing: "-0.01em",
        }}>
          Strategy<span style={{ color: C.accent }}>Lab</span>
        </h1>
        <p style={{
          fontSize: "13px",
          color: C.textMuted,
          fontFamily: F.body,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          margin: "0 0 16px",
        }}>
          Interactive Game Theory for Finance & Negotiation
        </p>
        <p style={{
          fontSize: "14px",
          color: C.textSecondary,
          fontFamily: F.body,
          lineHeight: 1.7,
          margin: 0,
          maxWidth: "600px",
        }}>
          Play through the strategic interactions that shape financial markets: auctions,
          negotiations, competitive dynamics, and coordination problems. Each simulator is
          framed with real-world finance context and reveals the insight through experience,
          not lecture.
        </p>
      </div>

      {/* Simulator Grid */}
      <SectionLabel>Simulator Library</SectionLabel>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "10px",
      }}>
        {LIBRARY.map((sim) => {
          const isLive = sim.status === "live";
          return (
            <div
              key={sim.id}
              onClick={isLive ? () => onSelect(sim.id) : undefined}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: "3px",
                padding: "18px",
                cursor: isLive ? "pointer" : "default",
                transition: "all 0.12s",
                opacity: isLive ? 1 : 0.55,
                position: "relative",
              }}
              onMouseEnter={(e) => { if (isLive) { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.borderColor = C.borderStrong; } }}
              onMouseLeave={(e) => { if (isLive) { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; } }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Tag color={sim.categoryColor}>{sim.category}</Tag>
                {!isLive && (
                  <span style={{
                    fontSize: "10px",
                    color: C.textMuted,
                    fontFamily: F.body,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>
              <h3 style={{
                fontSize: "15.5px",
                fontFamily: F.body,
                fontWeight: 500,
                color: C.textPrimary,
                margin: "0 0 8px",
              }}>
                {sim.name}{isLive ? " →" : ""}
              </h3>
              <p style={{
                fontSize: "12.5px",
                color: C.textSecondary,
                fontFamily: F.body,
                lineHeight: 1.55,
                margin: "0 0 10px",
              }}>
                {sim.desc}
              </p>
              <div style={{
                fontSize: "11px",
                color: C.textMuted,
                fontFamily: F.body,
                fontStyle: "italic",
                lineHeight: 1.5,
              }}>
                {sim.finance}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pedagogical Philosophy */}
      <div style={{
        marginTop: "36px",
        padding: "20px",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: "3px",
      }}>
        <SectionLabel>How StrategyLab Teaches</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
          {[
            { title: "Play First", desc: "Every simulator starts with a decision — not a definition. You form intuitions through action before encountering theory." },
            { title: "Finance-Framed", desc: "Each game is contextualized with a real financial scenario: M&A bidding, salary negotiation, competitive pricing, portfolio construction." },
            { title: "Adjustable Parameters", desc: "Change the number of players, payoff structures, information asymmetry, and discount rates. See how the equilibrium shifts." },
            { title: "Insight, Not Lecture", desc: "After you play, a brief debrief explains the key result in one paragraph. The theory follows the experience." },
          ].map((p) => (
            <div key={p.title}>
              <div style={{ fontSize: "13px", color: C.textPrimary, fontFamily: F.body, fontWeight: 500, marginBottom: "5px" }}>{p.title}</div>
              <div style={{ fontSize: "12px", color: C.textMuted, fontFamily: F.body, lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function StrategyLab() {
  const [activeSim, setActiveSim] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.textPrimary,
      fontFamily: F.body,
    }}>
      <div style={{
        maxWidth: "880px",
        margin: "0 auto",
        padding: "28px 24px 60px",
      }}>
        {activeSim === null && <Library onSelect={setActiveSim} />}
        {activeSim === "prisoners_dilemma" && <PrisonersDilemma onBack={() => setActiveSim(null)} />}
        {activeSim === "sealed_bid" && <SealedBidAuction onBack={() => setActiveSim(null)} />}
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: "16px 24px",
        maxWidth: "880px",
        margin: "0 auto",
      }}>
        <span style={{ fontSize: "11px", color: C.textFaint, fontFamily: F.body }}>
          StrategyLab · Interactive game theory for finance professionals · Educational content, not investment advice
        </span>
      </footer>
    </div>
  );
}
