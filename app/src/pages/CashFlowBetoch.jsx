import { useState, useEffect, useMemo } from "react";
import { useLang } from "../context/AppContext";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Check,
  Calendar,
  Building,
  Home,
  Trees,
  HandCoins,
  Receipt,
  Trash2,
  ChevronDown,
  Layers,
} from "lucide-react";

const ETH_MONTHS = [
  { id: "Meskerem", en: "Meskerem", am: "መስከረም", short: "Mes" },
  { id: "Tikimt", en: "Tikimt", am: "ጥቅምት", short: "Tik" },
  { id: "Hidar", en: "Hidar", am: "ኅዳር", short: "Hid" },
  { id: "Tahsas", en: "Tahsas", am: "ታኅሣሥ", short: "Tah" },
  { id: "Tir", en: "Tir", am: "ጥር", short: "Tir" },
  { id: "Yekatit", en: "Yekatit", am: "የካቲት", short: "Yek" },
  { id: "Megabit", en: "Megabit", am: "መጋቢት", short: "Meg" },
  { id: "Miazia", en: "Miazia", am: "ሚያዝያ", short: "Mia" },
  { id: "Ginbot", en: "Ginbot", am: "ግንቦት", short: "Gin" },
  { id: "Sene", en: "Sene", am: "ሰኔ", short: "Sen" },
  { id: "Hamle", en: "Hamle", am: "ሐምሌ", short: "Ham" },
  { id: "Nehase", en: "Nehase", am: "ነሐሴ", short: "Neh" },
];

const GROUPS = [
  { id: "Condominium", name: "Condominium", emoji: "🏢", color: "#1c8a5f" },
  { id: "Building 72", name: "Building 72", emoji: "🏘️", color: "#2563eb" },
  { id: "Hawassa lots", name: "Hawassa lots", emoji: "🌿", color: "#10b981" },
  { id: "Ekub savings", name: "Ekub savings", emoji: "🤝", color: "#8b5cf6" },
  { id: "Taxes & family", name: "Taxes & family", emoji: "🧾", color: "#f59e0b" },
];

function getInitialTransactions() {
  const data2018 = [
    { year: "2018 EC", month: "Yekatit", group: "Condominium", name: "Condominium rent", amount: 21000, date: "2018-06-10" },
    { year: "2018 EC", month: "Megabit", group: "Condominium", name: "Condominium rent", amount: 21000, date: "2018-07-10" },
    { year: "2018 EC", month: "Miazia", group: "Condominium", name: "Condominium rent", amount: 21000, date: "2018-08-10" },
    { year: "2018 EC", month: "Ginbot", group: "Condominium", name: "Condominium rent", amount: 21000, date: "2018-09-10" },
    { year: "2018 EC", month: "Sene", group: "Condominium", name: "Condominium rent", amount: 14000, date: "2018-10-10" },
    { year: "2018 EC", month: "Hamle", group: "Condominium", name: "Condominium rent", amount: 30000, date: "2018-11-10" },

    { year: "2018 EC", month: "Yekatit", group: "Building 72", name: "Building 72 rent", amount: 34500, date: "2018-06-15" },
    { year: "2018 EC", month: "Megabit", group: "Building 72", name: "Building 72 rent", amount: 34500, date: "2018-07-15" },
    { year: "2018 EC", month: "Miazia", group: "Building 72", name: "Building 72 rent", amount: 34500, date: "2018-08-15" },
    { year: "2018 EC", month: "Ginbot", group: "Building 72", name: "Building 72 rent", amount: 34500, date: "2018-09-15" },
    { year: "2018 EC", month: "Sene", group: "Building 72", name: "Building 72 rent", amount: 34500, date: "2018-10-15" },
    { year: "2018 EC", month: "Hamle", group: "Building 72", name: "Building 72 rent", amount: 34500, date: "2018-11-15" },
    { year: "2018 EC", month: "Nehase", group: "Building 72", name: "Building 72 rent", amount: 34500, date: "2018-12-15" },

    { year: "2018 EC", month: "Tir", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-05-20" },
    { year: "2018 EC", month: "Yekatit", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-06-20" },
    { year: "2018 EC", month: "Megabit", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-07-20" },
    { year: "2018 EC", month: "Miazia", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-08-20" },
    { year: "2018 EC", month: "Ginbot", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-09-20" },
    { year: "2018 EC", month: "Sene", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-10-20" },
    { year: "2018 EC", month: "Hamle", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-11-20" },
    { year: "2018 EC", month: "Nehase", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2018-12-20" },

    { year: "2018 EC", month: "Yekatit", group: "Taxes & family", name: "Ema allowance", amount: -5500, date: "2018-06-05" },
    { year: "2018 EC", month: "Nehase", group: "Taxes & family", name: "Property tax", amount: -14560, date: "2018-12-05" },
    { year: "2018 EC", month: "Nehase", group: "Taxes & family", name: "Rental income tax", amount: -5840, date: "2018-12-10" },

    { year: "2018 EC", month: "Megabit", group: "Hawassa lots", name: "Hawassa monitoring", amount: -7850, date: "2018-07-12" },
    { year: "2018 EC", month: "Nehase", group: "Hawassa lots", name: "Hawassa monitoring", amount: -18500, date: "2018-12-08" },

    { year: "2018 EC", month: "Ginbot", group: "Building 72", name: "Caretakers", amount: -1200, date: "2018-09-30" },
    { year: "2018 EC", month: "Sene", group: "Building 72", name: "Caretakers", amount: -1200, date: "2018-10-30" },
    { year: "2018 EC", month: "Hamle", group: "Building 72", name: "Caretakers", amount: -1200, date: "2018-11-30" },
    { year: "2018 EC", month: "Nehase", group: "Building 72", name: "Caretakers", amount: -1200, date: "2018-12-30" },

    { year: "2018 EC", month: "Year-end", group: "Ekub savings", name: "Ekub payout", amount: 446000, date: "2018-13-01" },
    { year: "2018 EC", month: "Year-end", group: "Taxes & family", name: "Ema ticket", amount: -142622, date: "2018-13-02" },
  ];

  const data2019 = [
    { year: "2019 EC", month: "Meskerem", group: "Condominium", name: "Condominium rent", amount: 30000, date: "2019-01-10" },
    { year: "2019 EC", month: "Meskerem", group: "Building 72", name: "Building 72 rent", amount: 37500, date: "2019-01-15" },
    { year: "2019 EC", month: "Tikimt", group: "Building 72", name: "Building 72 rent", amount: 12500, date: "2019-02-15" },
    { year: "2019 EC", month: "Meskerem", group: "Ekub savings", name: "Ekub contribution", amount: -50000, date: "2019-01-20" },
    { year: "2019 EC", month: "Meskerem", group: "Hawassa lots", name: "Hawassa monitoring", amount: -6500, date: "2019-01-12" },
    { year: "2019 EC", month: "Meskerem", group: "Building 72", name: "Caretakers", amount: -1200, date: "2019-01-30" },
    { year: "2019 EC", month: "Tikimt", group: "Building 72", name: "Caretakers", amount: -1200, date: "2019-02-28" },
    { year: "2019 EC", month: "Hidar", group: "Building 72", name: "Caretakers", amount: -1200, date: "2019-03-30" },
    { year: "2019 EC", month: "Meskerem", group: "Building 72", name: "Water pump", amount: -1000, date: "2019-01-22" },
    { year: "2019 EC", month: "Meskerem", group: "Taxes & family", name: "Exercise books", amount: -1800, date: "2019-01-25" },
  ];

  return [...data2018, ...data2019];
}

const OPENING_CASH = {
  "2018 EC": 0,
  "2019 EC": 236828,
  "2020 EC": 260000,
};

function fmt(n) {
  return Number(n || 0).toLocaleString("en-ET", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function CashFlowBetoch() {
  const { lang } = useLang();
  const [selectedYear, setSelectedYear] = useState("2019 EC");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form State for + Add Transaction
  const [entryType, setEntryType] = useState("in"); // "in" | "out"
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formGroup, setFormGroup] = useState("Condominium");
  const [formMonth, setFormMonth] = useState("Meskerem");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("betoch_transactions");
      return saved ? JSON.parse(saved) : getInitialTransactions();
    } catch {
      return getInitialTransactions();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("betoch_transactions", JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  // Current Year Totals
  const yearTx = useMemo(() => {
    return transactions.filter((t) => t.year === selectedYear);
  }, [transactions, selectedYear]);

  const opening = OPENING_CASH[selectedYear] || 0;
  const moneyIn = yearTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const moneyOut = yearTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const leftOver = moneyIn - moneyOut;
  const closingCash = opening + leftOver;

  // Month-by-month calculation
  const { monthTotals, maxMonthlyVal } = useMemo(() => {
    let maxVal = 1;
    const totals = ETH_MONTHS.map((m) => {
      const inAmt = yearTx.filter((t) => t.month === m.id && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const outAmt = yearTx.filter((t) => t.month === m.id && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      if (inAmt > maxVal) maxVal = inAmt;
      if (outAmt > maxVal) maxVal = outAmt;
      return { ...m, inAmt, outAmt };
    });
    return { monthTotals: totals, maxMonthlyVal: maxVal };
  }, [yearTx]);

  // Property Groups Calculation
  const propertyCards = useMemo(() => {
    let maxNet = 1;
    const list = GROUPS.map((g) => {
      const net = yearTx.filter((t) => t.group === g.id).reduce((s, t) => s + t.amount, 0);
      if (Math.abs(net) > maxNet) maxNet = Math.abs(net);
      return { ...g, net };
    });
    return { list, maxNet };
  }, [yearTx]);

  // Filtered Activity List
  const activityList = useMemo(() => {
    let list = [...yearTx];
    if (selectedMonth) {
      list = list.filter((t) => t.month === selectedMonth);
    }
    list.reverse();
    return list;
  }, [yearTx, selectedMonth]);

  const displayedActivity = showAllActivity ? activityList : activityList.slice(0, 7);

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0 || !formNote.trim()) return;

    const signedAmount = entryType === "in" ? amt : -amt;
    const newTx = {
      year: selectedYear,
      month: formMonth,
      group: formGroup,
      name: formNote.trim(),
      amount: signedAmount,
      date: formDate || new Date().toISOString().split("T")[0],
    };

    setTransactions((prev) => [...prev, newTx]);
    setSheetOpen(false);
    setFormAmount("");
    setFormNote("");
  };

  const handleDeleteEntry = (tx) => {
    if (window.confirm("Delete this entry?")) {
      setTransactions((prev) => prev.filter((t) => t !== tx));
    }
  };

  const selectedMonthObj = ETH_MONTHS.find((m) => m.id === selectedMonth);

  return (
    <div className="page" style={{ maxWidth: 840, margin: "0 auto", paddingBottom: 90 }}>
      {/* ─── 1. TOP BAR ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Betoch</h1>
          <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--emerald)" }}>ቤቶች</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: 6 }}>
            {lang === "am" ? "የገንዘብ እንቅስቃሴ እና የቀን መቁጠሪያ" : "Cash Flow & Calendar"}
          </span>
        </div>

        {/* Year Toggle Pills */}
        <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 999, padding: 3 }}>
          {["2018 EC", "2019 EC", "2020 EC"].map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => {
                setSelectedYear(yr);
                setSelectedMonth(null);
              }}
              style={{
                border: "none",
                background: selectedYear === yr ? "var(--emerald)" : "transparent",
                color: selectedYear === yr ? "#fff" : "var(--text-muted)",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: selectedYear === yr ? "0 2px 8px rgba(16, 185, 129, 0.35)" : "none",
              }}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. HERO CARD ───────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(145deg, #0e4d3a 0%, #1f8f68 100%)",
          borderRadius: 28,
          padding: "32px 28px",
          color: "#ffffff",
          overflow: "hidden",
          boxShadow: "0 16px 36px rgba(14, 77, 58, 0.28)",
          marginBottom: 16,
        }}
      >
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.08)", top: -60, right: -50, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.08)", bottom: -40, left: "20%", pointerEvents: "none" }} />

        <div style={{ fontSize: "0.95rem", fontWeight: 500, opacity: 0.88, marginBottom: 6 }}>
          {lang === "am" ? "በእጅ ያለ ጠቅላላ ጥሬ ገንዘብ" : "Total cash on hand"}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: "3.2rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {fmt(closingCash)}
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 600, opacity: 0.85 }}>ETB</span>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255, 255, 255, 0.16)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.22)",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: "0.84rem",
            fontWeight: 600,
          }}
        >
          {leftOver >= 0 ? "▲ +" : "▼ -"}
          {fmt(Math.abs(leftOver))} ETB {lang === "am" ? "በዚህ ዓመት" : "this year"}
        </div>
      </div>

      {/* ─── 3. THREE STAT CARDS ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <div className="stat-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: 16 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            {lang === "am" ? "ገቢ (Money in)" : "Money in"}
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--emerald)", marginTop: 4 }}>
            {fmt(moneyIn)} ETB
          </span>
        </div>

        <div className="stat-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: 16 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            {lang === "am" ? "ወጪ (Money out)" : "Money out"}
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--rose)", marginTop: 4 }}>
            {fmt(moneyOut)} ETB
          </span>
        </div>

        <div className="stat-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: 16 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            {lang === "am" ? "የተረፈ (Left over)" : "Left over"}
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: leftOver >= 0 ? "var(--emerald)" : "var(--rose)", marginTop: 4 }}>
            {fmt(leftOver)} ETB
          </span>
        </div>
      </div>

      {/* ─── 4. MONTH BY MONTH CHART CARD ───────────────────── */}
      <div className="simple-card" style={{ padding: "22px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
            {lang === "am" ? "ወርሃዊ የቀን መቁጠሪያ ገቢና ወጪ" : "Month by month"}
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {selectedMonthObj ? (
              <span style={{ color: "var(--emerald)", cursor: "pointer" }} onClick={() => setSelectedMonth(null)}>
                <strong>{selectedMonthObj.en} ({selectedMonthObj.am})</strong>: +{fmt(monthTotals.find((x) => x.id === selectedMonth)?.inAmt)} / -{fmt(monthTotals.find((x) => x.id === selectedMonth)?.outAmt)} ETB (tap to clear)
              </span>
            ) : (
              lang === "am" ? "ወሩን ነክተው ያጣሩ" : "Tap a month to filter"
            )}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 6, height: 180, alignItems: "center", position: "relative", marginBottom: 8 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--border)", pointerEvents: "none" }} />
          {monthTotals.map((m) => {
            const inHeight = Math.round((m.inAmt / maxMonthlyVal) * 75);
            const outHeight = Math.round((m.outAmt / maxMonthlyVal) * 75);
            const isSel = selectedMonth === m.id;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMonth(isSel ? null : m.id)}
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                  borderRadius: 8,
                  padding: 2,
                  background: isSel ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  transition: "background 0.2s",
                }}
              >
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 12,
                      height: inHeight,
                      background: "var(--emerald)",
                      borderRadius: "6px 6px 2px 2px",
                      transition: "height 0.5s ease",
                    }}
                  />
                </div>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 12,
                      height: outHeight,
                      background: "var(--rose)",
                      borderRadius: "2px 2px 6px 6px",
                      transition: "height 0.5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Month labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 6, textAlign: "center" }}>
          {ETH_MONTHS.map((m) => (
            <span
              key={m.id}
              onClick={() => setSelectedMonth(selectedMonth === m.id ? null : m.id)}
              style={{
                fontSize: "0.72rem",
                fontWeight: selectedMonth === m.id ? 700 : 500,
                color: selectedMonth === m.id ? "var(--emerald)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {lang === "am" ? m.am : m.short}
            </span>
          ))}
        </div>
      </div>

      {/* ─── 5. YOUR PROPERTIES ─────────────────────────────── */}
      <div className="simple-card" style={{ padding: "22px 20px", marginBottom: 18 }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 14 }}>
          {lang === "am" ? "የንብረት እና የቁጠባ ክፍሎች" : "Your properties"}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {propertyCards.list.map((p) => {
            const isPos = p.net >= 0;
            const pct = Math.max(8, Math.min(100, Math.round((Math.abs(p.net) / propertyCards.maxNet) * 100)));
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.35rem",
                    background: isPos ? "rgba(16, 185, 129, 0.14)" : "rgba(244, 63, 94, 0.14)",
                    flexShrink: 0,
                  }}
                >
                  {p.emoji}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{p.name}</span>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", width: "100%" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: isPos ? "var(--emerald)" : "var(--rose)",
                        borderRadius: 999,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: "0.96rem", fontWeight: 700, color: isPos ? "var(--emerald)" : "var(--rose)", whiteSpace: "nowrap" }}>
                  {isPos ? "+" : ""}{fmt(p.net)} ETB
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 6. RECENT ACTIVITY (WITH CALENDAR RECORD) ───────── */}
      <div className="simple-card" style={{ padding: "22px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
            {lang === "am" ? "የቅርብ ጊዜ እንቅስቃሴዎች" : "Recent activity"}
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {selectedMonth ? `Filtered: ${selectedMonth}` : "All entries"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayedActivity.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
              No transactions recorded for this period.
            </div>
          ) : (
            displayedActivity.map((tx, idx) => {
              const isIncome = tx.amount > 0;
              const gObj = GROUPS.find((g) => g.id === tx.group) || { emoji: "💵" };
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        background: isIncome ? "rgba(16, 185, 129, 0.14)" : "rgba(244, 63, 94, 0.14)",
                      }}
                    >
                      {gObj.emoji}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.92rem", fontWeight: 600 }}>{tx.name}</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{tx.month} · {tx.group}</span>
                        {tx.date && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
                            <Calendar size={11} /> {tx.date}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "0.96rem", fontWeight: 700, color: isIncome ? "var(--emerald)" : "var(--rose)" }}>
                      {isIncome ? "+" : ""}{fmt(tx.amount)} ETB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(tx)}
                      style={{ background: "transparent", border: "none", color: "var(--rose)", cursor: "pointer", padding: 4 }}
                      title="Delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {activityList.length > 7 && (
          <button
            type="button"
            onClick={() => setShowAllActivity(!showAllActivity)}
            style={{
              width: "100%",
              marginTop: 12,
              padding: 10,
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 10,
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showAllActivity ? "Show less" : `Show all (${activityList.length})`}
          </button>
        )}
      </div>

      {/* ─── 7. FLOATING + ADD PILL BUTTON ──────────────────── */}
      <button
        type="button"
        className="fab-btn"
        onClick={() => {
          setFormDate(new Date().toISOString().split("T")[0]);
          setFormAmount("");
          setFormNote("");
          setEntryType("in");
          setSheetOpen(true);
        }}
        title="Add new income or expense with calendar date"
      >
        <Plus size={18} />
        <span>+ {lang === "am" ? "መዝግብ" : "Add"}</span>
      </button>

      {/* ─── 8. BOTTOM SHEET / MODAL ────────────────────────── */}
      {sheetOpen && (
        <div className="modal-overlay" onClick={() => setSheetOpen(false)}>
          <div className="simple-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{lang === "am" ? "አዲስ ገቢ / ወጪ መዝግብ" : "New Cash Entry"}</h3>
              <button className="clean-close-btn" onClick={() => setSheetOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="clean-modal-form">
              {/* Type Toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 3, gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setEntryType("in")}
                  style={{
                    border: "none",
                    borderRadius: 9,
                    padding: "9px 0",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    background: entryType === "in" ? "var(--emerald)" : "transparent",
                    color: entryType === "in" ? "#fff" : "var(--text-muted)",
                  }}
                >
                  Money in (ገቢ)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("out")}
                  style={{
                    border: "none",
                    borderRadius: 9,
                    padding: "9px 0",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    background: entryType === "out" ? "var(--rose)" : "transparent",
                    color: entryType === "out" ? "#fff" : "var(--text-muted)",
                  }}
                >
                  Money out (ወጪ)
                </button>
              </div>

              {/* Amount */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "መጠን (ብር)" : "Amount (ETB)"}</label>
                <input
                  type="number"
                  className="field-input"
                  placeholder="0"
                  min="1"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </div>

              {/* Calendar Date Input */}
              <div className="field-group">
                <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={14} style={{ color: "var(--indigo-light)" }} /> {lang === "am" ? "የቀን መቁጠሪያ (Calendar Date)" : "Calendar Date"}
                </label>
                <input
                  type="date"
                  className="field-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              {/* Note */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "መግለጫ" : "Note / Description"}</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Condominium rent"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  required
                />
              </div>

              {/* Property Group */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "የንብረት ምድብ" : "Property / Group"}</label>
                <select className="field-input" value={formGroup} onChange={(e) => setFormGroup(e.target.value)}>
                  {GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.emoji}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ethiopian Month */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "ወር" : "Ethiopian Month"}</label>
                <select className="field-input" value={formMonth} onChange={(e) => setFormMonth(e.target.value)}>
                  {ETH_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.en} ({m.am})
                    </option>
                  ))}
                  <option value="Year-end">Year-end (ዓመት ማጠቃለያ)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-secondary w-full" onClick={() => setSheetOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  style={{ background: entryType === "in" ? "var(--emerald)" : "var(--rose)" }}
                >
                  <Check size={16} /> Save entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
