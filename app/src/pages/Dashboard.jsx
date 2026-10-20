import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../context/AppContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Users, Wallet, ArrowUpRight, ArrowDownRight, Home, ChevronRight } from "lucide-react";
import { DEFAULT_TENANTS } from "./MonthlyRents";

const COLORS = ["#6366f1", "#22d3ee"];

const BASELINE_ENTRIES = [
  { id: "meskerem2019", monthLabel: "Meskerem (መስከረም)", netTotal: 41500, mesfin: 26600, zewdnesh: 14900, gross: 42300, order: 1 },
  { id: "tikimt2019", monthLabel: "Tikimt (ጥቅምት)", netTotal: 41500, mesfin: 26600, zewdnesh: 14900, gross: 42300, order: 2 },
  { id: "hidar2019", monthLabel: "Hidar (ኅዳር)", netTotal: 41500, mesfin: 26600, zewdnesh: 14900, gross: 42300, order: 3 },
  { id: "tahsas2019", monthLabel: "Tahsas (ታኅሣሥ)", netTotal: 41500, mesfin: 26600, zewdnesh: 14900, gross: 42300, order: 4 },
  { id: "tir2019", monthLabel: "Tir (ጥር)", netTotal: 41500, mesfin: 26600, zewdnesh: 14900, gross: 42300, order: 5 },
  { id: "yekatit2019", monthLabel: "Yekatit (የካቲት)", netTotal: 41500, mesfin: 26600, zewdnesh: 14900, gross: 42300, order: 6 },
];

function StatCard({ icon: Icon, label, value, sub, trend, color, linkTo }) {
  const content = (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-icon">
        <Icon size={22} />
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
        {sub && (
          <p className="stat-sub">
            {trend === "up" ? (
              <ArrowUpRight size={13} className="trend-up" />
            ) : trend === "down" ? (
              <ArrowDownRight size={13} className="trend-down" />
            ) : null}
            {sub}
          </p>
        )}
      </div>
    </div>
  );

  return linkTo ? (
    <Link to={linkTo} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  ) : (
    content
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString("en-ET", {
    style: "decimal",
    minimumFractionDigits: 0,
  });
}

export default function Dashboard() {
  const { t, lang } = useLang();
  const [entries, setEntries] = useState(BASELINE_ENTRIES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, "monthly_overview"), (snap) => {
        if (!snap.empty) {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setEntries(data);
        }
      });
      return unsub;
    } catch {
      // offline fallback
    }
  }, []);

  const totalNet = entries.reduce((s, e) => s + (e.netTotal || 0), 0);
  const totalMesfin = entries.reduce((s, e) => s + (e.mesfin || 0), 0);
  const totalZewdnesh = entries.reduce((s, e) => s + (e.zewdnesh || 0), 0);
  const totalGrossRent = 42300; // Baseline monthly rent from Excel

  const pieData = [
    { name: t.mesfin, value: totalMesfin },
    { name: t.zewdnesh, value: totalZewdnesh },
  ];

  const chartData = entries.map((e) => ({
    month: e.monthLabel || e.id,
    net: e.netTotal || 0,
    mesfin: e.mesfin || 0,
    zewdnesh: e.zewdnesh || 0,
  }));

  if (loading) {
    return (
      <div className="page-loading">
        <span className="spinner" />
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.dashboardTitle}</h1>
          <p className="page-subtitle">{t.dashboardSubtitle}</p>
        </div>
        <Link to="/rents" className="btn-primary" style={{ textDecoration: "none" }}>
          <Home size={16} /> {lang === "am" ? "ወርሃዊ ኪራዮችን ይመልከቱ" : "View Monthly Rents"}
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard
          icon={Home}
          label={lang === "am" ? "ወርሃዊ የቤት ኪራይ (ጠቅላላ)" : "Monthly Gross Rent"}
          value={`${fmt(totalGrossRent)} ${t.etb}`}
          sub={lang === "am" ? "9 ተከራዮች (100% የተከራዩ)" : "9 Active Units (100% Occupied)"}
          color="indigo"
          linkTo="/rents"
        />
        <StatCard
          icon={TrendingUp}
          label={t.totalIncome}
          value={`${fmt(totalNet)} ${t.etb}`}
          sub={lang === "am" ? "የተጣራ ገቢ (ወጪ ተቀንሶ)" : "Net Operating Income"}
          color="emerald"
        />
        <StatCard
          icon={Wallet}
          label={t.mesfinsShare}
          value={`${fmt(totalMesfin)} ${t.etb}`}
          sub={totalNet ? `${((totalMesfin / totalNet) * 100).toFixed(1)}%` : "—"}
          color="violet"
          linkTo="/mesfin"
        />
        <StatCard
          icon={Users}
          label={t.zewdneshsShare}
          value={`${fmt(totalZewdnesh)} ${t.etb}`}
          sub={totalNet ? `${((totalZewdnesh / totalNet) * 100).toFixed(1)}%` : "—"}
          color="cyan"
          linkTo="/zewdnesh"
        />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Area Chart */}
        <div className="chart-card chart-card--wide">
          <h2 className="chart-title">{t.incomeChart}</h2>
          {chartData.length === 0 ? (
            <EmptyState label={t.noData} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMesfin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gZewdnesh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(v, n) => [`${fmt(v)} ETB`, n]}
                />
                <Legend />
                <Area type="monotone" dataKey="mesfin" name={t.mesfin} stroke="#6366f1" fill="url(#gMesfin)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="zewdnesh" name={t.zewdnesh} stroke="#22d3ee" fill="url(#gZewdnesh)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="chart-card">
          <h2 className="chart-title">{t.partnerSplit}</h2>
          {totalNet === 0 ? (
            <EmptyState label={t.noData} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                    formatter={(v) => [`${fmt(v)} ETB`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((d, i) => (
                  <div key={i} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: COLORS[i] }} />
                    <span className="pie-name">{d.name}</span>
                    <span className="pie-val">{fmt(d.value)} {t.etb}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="chart-card chart-card--full">
          <h2 className="chart-title">{t.totalIncome} — {t.allTime}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                formatter={(v) => [`${fmt(v)} ETB`]}
              />
              <Legend />
              <Bar dataKey="mesfin" name={t.mesfin} fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="zewdnesh" name={t.zewdnesh} fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="empty-state">
      <p>{label}</p>
    </div>
  );
}
