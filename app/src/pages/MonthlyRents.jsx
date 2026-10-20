import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../context/AppContext";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  Wallet,
  Home,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Edit2,
  Trash2,
  X,
  Check,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from "recharts";

// 12 Ethiopian Months from Resource/Data.xlsx
export const ETHIOPIAN_MONTHS = [
  { id: "meskerem", nameAm: "መስከረም", nameEn: "Meskerem", dates: "Sep 11 – Oct 10" },
  { id: "tikimt", nameAm: "ጥቅምት", nameEn: "Tikimt", dates: "Oct 11 – Nov 9", isCurrent: true },
  { id: "hidar", nameAm: "ኅዳር", nameEn: "Hidar", dates: "Nov 10 – Dec 9" },
  { id: "tahsas", nameAm: "ታኅሣሥ", nameEn: "Tahsas", dates: "Dec 10 – Jan 8" },
  { id: "tir", nameAm: "ጥር", nameEn: "Tir", dates: "Jan 9 – Feb 7" },
  { id: "yekatit", nameAm: "የካቲት", nameEn: "Yekatit", dates: "Feb 8 – Mar 9" },
  { id: "megabit", nameAm: "መጋቢት", nameEn: "Megabit", dates: "Mar 10 – Apr 8" },
  { id: "miazia", nameAm: "ሚያዝያ", nameEn: "Miazia", dates: "Apr 9 – May 8" },
  { id: "ginbot", nameAm: "ግንቦት", nameEn: "Ginbot", dates: "May 9 – Jun 7" },
  { id: "sene", nameAm: "ሰኔ", nameEn: "Sene", dates: "Jun 8 – Jul 7" },
  { id: "hamle", nameAm: "ሐምሌ", nameEn: "Hamle", dates: "Jul 8 – Aug 6" },
  { id: "nehase", nameAm: "ነሐሴ", nameEn: "Nehase", dates: "Aug 7 – Sep 5" },
];

// Exact Baseline Data from Resource/Data.xlsx (Monthly Overview Sheet)
export const DEFAULT_TENANTS = [
  {
    id: "bekele",
    nameAm: "በቀለ",
    nameEn: "Bekele",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "50% መስፍን / 50% ዘውድነሽ",
    splitEn: "50% Mesfin / 50% Zewdnesh",
    splitType: "shared",
    monthlyRent: 7000,
    mesfinShare: 3500,
    zewdneshShare: 3500,
    status: "paid",
    room: "Unit 01",
    location: "Addis Ababa",
  },
  {
    id: "libnesh",
    nameAm: "ልብነሽ",
    nameEn: "Libnesh",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "50% መስፍን / 50% ዘውድነሽ",
    splitEn: "50% Mesfin / 50% Zewdnesh",
    splitType: "shared",
    monthlyRent: 7000,
    mesfinShare: 3500,
    zewdneshShare: 3500,
    status: "paid",
    room: "Unit 02",
    location: "Addis Ababa",
  },
  {
    id: "gadise",
    nameAm: "ጋዲሴ",
    nameEn: "Gadise",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "50% መስፍን / 50% ዘውድነሽ",
    splitEn: "50% Mesfin / 50% Zewdnesh",
    splitType: "shared",
    monthlyRent: 2000,
    mesfinShare: 1000,
    zewdneshShare: 1000,
    status: "paid",
    room: "Unit 03",
    location: "Addis Ababa",
  },
  {
    id: "desta",
    nameAm: "ደስታ",
    nameEn: "Desta",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "100% መስፍን",
    splitEn: "100% Mesfin",
    splitType: "mesfin",
    monthlyRent: 4000,
    mesfinShare: 4000,
    zewdneshShare: 0,
    status: "paid",
    room: "Unit 04",
    location: "Addis Ababa",
  },
  {
    id: "genet",
    nameAm: "ገነት",
    nameEn: "Genet",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "100% መስፍን",
    splitEn: "100% Mesfin",
    splitType: "mesfin",
    monthlyRent: 4000,
    mesfinShare: 4000,
    zewdneshShare: 0,
    status: "paid",
    room: "Unit 05",
    location: "Addis Ababa",
  },
  {
    id: "gezahegn",
    nameAm: "ገዛህኝ",
    nameEn: "Gezahegn",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "100% መስፍን",
    splitEn: "100% Mesfin",
    splitType: "mesfin",
    monthlyRent: 11000,
    mesfinShare: 11000,
    zewdneshShare: 0,
    status: "paid",
    room: "Main House (Unit 06)",
    location: "Addis Ababa",
  },
  {
    id: "lemlem",
    nameAm: "ለምለም",
    nameEn: "Lemlem",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "100% ዘውድነሽ",
    splitEn: "100% Zewdnesh",
    splitType: "zewdnesh",
    monthlyRent: 5000,
    mesfinShare: 0,
    zewdneshShare: 5000,
    status: "paid",
    room: "Unit 07",
    location: "Addis Ababa",
  },
  {
    id: "asres",
    nameAm: "አስረስ",
    nameEn: "Asres",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "100% ዘውድነሽ",
    splitEn: "100% Zewdnesh",
    splitType: "zewdnesh",
    monthlyRent: 1300,
    mesfinShare: 0,
    zewdneshShare: 1300,
    status: "paid",
    room: "Unit 08",
    location: "Addis Ababa",
  },
  {
    id: "weynshet",
    nameAm: "ወይንሸት",
    nameEn: "Weynshet",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    splitAm: "100% ዘውድነሽ",
    splitEn: "100% Zewdnesh",
    splitType: "zewdnesh",
    monthlyRent: 1000,
    mesfinShare: 0,
    zewdneshShare: 1000,
    status: "paid",
    room: "Unit 09",
    location: "Addis Ababa",
  },
];

function fmt(n) {
  return Number(n || 0).toLocaleString("en-ET", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function MonthlyRents() {
  const { t, lang } = useLang();
  const [selectedMonth, setSelectedMonth] = useState("tikimt");
  const [activeTab, setActiveTab] = useState("schedule"); // 'schedule' | 'matrix'
  const [filterType, setFilterType] = useState("all"); // 'all' | 'mesfin' | 'zewdnesh' | 'shared'
  const [search, setSearch] = useState("");
  const [tenants, setTenants] = useState(() => {
    const saved = localStorage.getItem("lekulu_tenants");
    return saved ? JSON.parse(saved) : DEFAULT_TENANTS;
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formNameAm, setFormNameAm] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formRent, setFormRent] = useState("");
  const [formSplitType, setFormSplitType] = useState("shared");

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("lekulu_tenants", JSON.stringify(tenants));
  }, [tenants]);

  // Firestore Live Listener with graceful offline fallback
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "rental_tenants"),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setTenants(list);
          }
        },
        () => {
          // Fallback to local data if firestore not yet populated
        }
      );
      return unsub;
    } catch {
      // offline
    }
  }, []);

  // Filtered Tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesFilter =
        filterType === "all" || tenant.splitType === filterType;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (tenant.nameEn && tenant.nameEn.toLowerCase().includes(q)) ||
        (tenant.nameAm && tenant.nameAm.includes(q)) ||
        (tenant.room && tenant.room.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [tenants, filterType, search]);

  // Aggregate Metrics for Current Month
  const totalRent = useMemo(
    () => tenants.reduce((sum, item) => sum + (Number(item.monthlyRent) || 0), 0),
    [tenants]
  );
  const totalMesfin = useMemo(
    () => tenants.reduce((sum, item) => sum + (Number(item.mesfinShare) || 0), 0),
    [tenants]
  );
  const totalZewdnesh = useMemo(
    () => tenants.reduce((sum, item) => sum + (Number(item.zewdneshShare) || 0), 0),
    [tenants]
  );

  const mesfinPct = totalRent > 0 ? ((totalMesfin / totalRent) * 100).toFixed(1) : 0;
  const zewdneshPct = totalRent > 0 ? ((totalZewdnesh / totalRent) * 100).toFixed(1) : 0;

  // Chart Data: Rent by Tenant
  const chartData = useMemo(() => {
    return tenants.map((tn) => ({
      name: lang === "am" ? tn.nameAm : tn.nameEn,
      mesfin: tn.mesfinShare,
      zewdnesh: tn.zewdneshShare,
      total: tn.monthlyRent,
    }));
  }, [tenants, lang]);

  // Toggle Paid/Pending
  const toggleStatus = (id) => {
    setTenants((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "paid" ? "pending" : "paid" }
          : item
      )
    );
  };

  // Open Modal for Create or Edit
  const openModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormNameAm(tenant.nameAm || "");
      setFormNameEn(tenant.nameEn || "");
      setFormRoom(tenant.room || "");
      setFormRent(tenant.monthlyRent || "");
      setFormSplitType(tenant.splitType || "shared");
    } else {
      setEditingTenant(null);
      setFormNameAm("");
      setFormNameEn("");
      setFormRoom(`Unit ${tenants.length + 1}`);
      setFormRent("");
      setFormSplitType("shared");
    }
    setModalOpen(true);
  };

  const handleSaveTenant = (e) => {
    e.preventDefault();
    const rentNum = Number(formRent) || 0;
    let mShare = 0;
    let zShare = 0;
    let splitAm = "";
    let splitEn = "";

    if (formSplitType === "shared") {
      mShare = rentNum * 0.5;
      zShare = rentNum * 0.5;
      splitAm = "50% መስፍን / 50% ዘውድነሽ";
      splitEn = "50% Mesfin / 50% Zewdnesh";
    } else if (formSplitType === "mesfin") {
      mShare = rentNum;
      zShare = 0;
      splitAm = "100% መስፍን";
      splitEn = "100% Mesfin";
    } else {
      mShare = 0;
      zShare = rentNum;
      splitAm = "100% ዘውድነሽ";
      splitEn = "100% Zewdnesh";
    }

    if (editingTenant) {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingTenant.id
            ? {
                ...t,
                nameAm: formNameAm || t.nameAm,
                nameEn: formNameEn || t.nameEn,
                room: formRoom || t.room,
                monthlyRent: rentNum,
                mesfinShare: mShare,
                zewdneshShare: zShare,
                splitType: formSplitType,
                splitAm,
                splitEn,
              }
            : t
        )
      );
    } else {
      const newId = `tenant-${Date.now()}`;
      const newTenant = {
        id: newId,
        nameAm: formNameAm || formNameEn,
        nameEn: formNameEn || formNameAm,
        categoryAm: "መኖሪያ ቤት",
        categoryEn: "Residential Unit",
        room: formRoom,
        monthlyRent: rentNum,
        mesfinShare: mShare,
        zewdneshShare: zShare,
        splitType: formSplitType,
        splitAm,
        splitEn,
        status: "paid",
        location: "Addis Ababa",
      };
      setTenants((prev) => [...prev, newTenant]);
    }

    setModalOpen(false);
  };

  const handleDeleteTenant = (id) => {
    if (window.confirm("Are you sure you want to delete this tenant unit?")) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const currentMonthObj =
    ETHIOPIAN_MONTHS.find((m) => m.id === selectedMonth) || ETHIOPIAN_MONTHS[1];

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title">{t.monthlyRentsTitle}</h1>
            <span className="badge badge--indigo">2019 E.C.</span>
          </div>
          <p className="page-subtitle">{t.monthlyRentsSubtitle}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            id="add-tenant-btn"
            className="btn-primary"
            onClick={() => openModal()}
          >
            <Plus size={16} /> {t.addTenant}
          </button>
        </div>
      </div>

      {/* Ethiopian Months Bar Selector */}
      <div className="months-scroll-container">
        <div className="months-bar">
          {ETHIOPIAN_MONTHS.map((m) => {
            const isSel = m.id === selectedMonth;
            return (
              <button
                key={m.id}
                className={`month-pill ${isSel ? "month-pill--active" : ""}`}
                onClick={() => setSelectedMonth(m.id)}
              >
                <span className="month-name">
                  {lang === "am" ? m.nameAm : m.nameEn}
                </span>
                <span className="month-dates">{m.dates}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="stats-grid" style={{ marginTop: 18 }}>
        {/* Total Monthly Rent */}
        <div className="stat-card stat-card--indigo">
          <div className="stat-icon">
            <Building2 size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">{t.totalRentCollected}</p>
            <h3 className="stat-value">
              {fmt(totalRent)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              <Calendar size={13} style={{ display: "inline", marginRight: 4 }} />
              {lang === "am" ? currentMonthObj.nameAm : currentMonthObj.nameEn} ({currentMonthObj.dates})
            </p>
          </div>
        </div>

        {/* Mesfin's Rental Share */}
        <div className="stat-card stat-card--cyan">
          <div className="stat-icon">
            <Wallet size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">{t.mesfinGross}</p>
            <h3 className="stat-value">
              {fmt(totalMesfin)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              <Percent size={12} style={{ display: "inline" }} /> {mesfinPct}% {lang === "am" ? "የአጠቃላይ ገቢ" : "of portfolio"}
            </p>
          </div>
        </div>

        {/* Zewdnesh's Rental Share */}
        <div className="stat-card stat-card--violet">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">{t.zewdneshGross}</p>
            <h3 className="stat-value">
              {fmt(totalZewdnesh)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              <Percent size={12} style={{ display: "inline" }} /> {zewdneshPct}% {lang === "am" ? "የአጠቃላይ ገቢ" : "of portfolio"}
            </p>
          </div>
        </div>

        {/* Annual Projected Runrate */}
        <div className="stat-card stat-card--emerald">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">{t.annualRentRunrate}</p>
            <h3 className="stat-value">
              {fmt(totalRent * 12)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              {tenants.length} {lang === "am" ? "የኪራይ ክፍሎች (100% የተከራዩ)" : "Units (100% Occupied)"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="table-controls-card">
        <div className="tab-pill-group">
          <button
            className={`tab-pill-btn ${activeTab === "schedule" ? "tab-pill-btn--active" : ""}`}
            onClick={() => setActiveTab("schedule")}
          >
            <Layers size={16} /> {lang === "am" ? "የተከራዮች ዝርዝር እና ክፍያ" : "Tenant Rent Ledger"}
          </button>
          <button
            className={`tab-pill-btn ${activeTab === "matrix" ? "tab-pill-btn--active" : ""}`}
            onClick={() => setActiveTab("matrix")}
          >
            <FileSpreadsheet size={16} /> {t.allMonthsMatrix}
          </button>
        </div>

        {activeTab === "schedule" && (
          <div className="filters-search-row">
            {/* Filter Pills */}
            <div className="filter-pills">
              <button
                className={`filter-btn ${filterType === "all" ? "filter-btn--active" : ""}`}
                onClick={() => setFilterType("all")}
              >
                {t.filterAll}
              </button>
              <button
                className={`filter-btn ${filterType === "shared" ? "filter-btn--active" : ""}`}
                onClick={() => setFilterType("shared")}
              >
                {t.filterShared}
              </button>
              <button
                className={`filter-btn ${filterType === "mesfin" ? "filter-btn--active" : ""}`}
                onClick={() => setFilterType("mesfin")}
              >
                {t.filterMesfin}
              </button>
              <button
                className={`filter-btn ${filterType === "zewdnesh" ? "filter-btn--active" : ""}`}
                onClick={() => setFilterType("zewdnesh")}
              >
                {t.filterZewdnesh}
              </button>
            </div>

            {/* Search Input */}
            <div className="search-wrap">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={lang === "am" ? "ተከራይ ወይም ክፍል ይፈልጉ..." : "Search tenant or unit..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: SCHEDULE VIEW */}
      {activeTab === "schedule" && (
        <>
          {/* Main Table */}
          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t.tenantName}</th>
                    <th>{lang === "am" ? "ክፍል / አድራሻ" : "Unit / Room"}</th>
                    <th>{t.tenantCategory}</th>
                    <th style={{ textAlign: "right" }}>{t.monthlyRent}</th>
                    <th>{t.ownerSplit}</th>
                    <th style={{ textAlign: "right" }}>{t.mesfinGross}</th>
                    <th style={{ textAlign: "right" }}>{t.zewdneshGross}</th>
                    <th style={{ textAlign: "center" }}>{t.paymentStatus}</th>
                    <th style={{ textAlign: "center" }}>{lang === "am" ? "ድርጊት" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="empty-table-cell">
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((item, idx) => {
                      const isPaid = item.status === "paid";
                      return (
                        <tr key={item.id} className="table-row-hover">
                          <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {String(idx + 1).padStart(2, "0")}
                          </td>
                          <td>
                            <div className="tenant-name-cell">
                              <div className="tenant-avatar">
                                <Home size={15} />
                              </div>
                              <div>
                                <span className="tenant-name-primary">
                                  {lang === "am" ? item.nameAm : item.nameEn}
                                </span>
                                <span className="tenant-name-secondary">
                                  {lang === "am" ? item.nameEn : item.nameAm}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="room-badge">{item.room || "Unit"}</span>
                          </td>
                          <td>
                            <span className="category-tag">
                              {lang === "am" ? item.categoryAm : item.categoryEn}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#fff" }}>
                            {fmt(item.monthlyRent)} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.etb}</span>
                          </td>
                          <td>
                            <span
                              className={`split-badge ${
                                item.splitType === "shared"
                                  ? "split-badge--shared"
                                  : item.splitType === "mesfin"
                                  ? "split-badge--mesfin"
                                  : "split-badge--zewdnesh"
                              }`}
                            >
                              {lang === "am" ? item.splitAm : item.splitEn}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", color: "#818cf8", fontWeight: 600 }}>
                            {fmt(item.mesfinShare)} {t.etb}
                          </td>
                          <td style={{ textAlign: "right", color: "#c084fc", fontWeight: 600 }}>
                            {fmt(item.zewdneshShare)} {t.etb}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className={`status-pill ${isPaid ? "status-pill--paid" : "status-pill--pending"}`}
                              onClick={() => toggleStatus(item.id)}
                              title="Click to toggle status"
                            >
                              {isPaid ? (
                                <>
                                  <CheckCircle2 size={13} /> {t.paid}
                                </>
                              ) : (
                                <>
                                  <Clock size={13} /> {t.pending}
                                </>
                              )}
                            </button>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              <button
                                className="icon-action-btn"
                                onClick={() => openModal(item)}
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="icon-action-btn icon-action-btn--delete"
                                onClick={() => handleDeleteTenant(item.id)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="table-total-row">
                    <td colSpan="4" style={{ fontWeight: 700 }}>
                      {lang === "am" ? "ጠቅላላ ወርሃዊ የቤት ኪራይ ድምር" : "Total Monthly Rental Revenue"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "var(--indigo-light)", fontSize: "1.05rem" }}>
                      {fmt(totalRent)} {t.etb}
                    </td>
                    <td>
                      <span className="badge badge--dark">
                        63.8% M / 36.2% Z
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#818cf8" }}>
                      {fmt(totalMesfin)} {t.etb}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#c084fc" }}>
                      {fmt(totalZewdnesh)} {t.etb}
                    </td>
                    <td colSpan="2" style={{ textAlign: "center", color: "var(--emerald)", fontWeight: 600 }}>
                      100% {lang === "am" ? "ተከፍሏል" : "Collected"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bar Chart: Tenant Rent Contribution */}
          <div className="chart-card" style={{ marginTop: 20 }}>
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">
                  {lang === "am" ? "የተከራዮች ወርሃዊ ኪራይ እና የባለቤት ክፍፍል ግራፍ" : "Monthly Rent by Tenant & Partner Split"}
                </h3>
                <p className="chart-card-sub">
                  {lang === "am"
                    ? "በእያንዳንዱ ክፍል የሚገኘው ወርሃዊ ገቢ እና የመስፍን/የዘውድነሽ ድርሻ"
                    : "Individual unit monthly income allocated to Mesfin and Zewdnesh"}
                </p>
              </div>
            </div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      color: "#fff",
                    }}
                    formatter={(val) => [`${fmt(val)} ETB`, ""]}
                  />
                  <Legend />
                  <Bar
                    dataKey="mesfin"
                    name={lang === "am" ? "የመስፍን ድርሻ" : "Mesfin's Share"}
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="zewdnesh"
                    name={lang === "am" ? "የዘውድነሽ ድርሻ" : "Zewdnesh's Share"}
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: 12-MONTH MATRIX VIEW (Matching Resource/Data.xlsx) */}
      {activeTab === "matrix" && (
        <div className="table-card">
          <div className="table-card-header-inner">
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                {lang === "am" ? "የ2019 ዓ.ም. 12 ወራት የቤት ኪራይ ማትሪክስ" : "2019 E.C. Full 12-Month Rental Income Matrix"}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {lang === "am"
                  ? "የአዲስ አበባ ቤቶች የ12 ወራት ወርሃዊ የቤት ኪራይ ገቢ ሙሉ መዝገብ"
                  : "Complete 12-month fiscal overview per unit and partner gross allocation"}
              </p>
            </div>
          </div>
          <div className="table-wrapper matrix-wrapper">
            <table className="data-table matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>{t.tenantName}</th>
                  <th style={{ minWidth: 120 }}>{t.ownerSplit}</th>
                  <th style={{ minWidth: 95 }}>{t.monthlyRent}</th>
                  {ETHIOPIAN_MONTHS.map((m) => (
                    <th key={m.id} style={{ minWidth: 90, textAlign: "right" }}>
                      <div>{lang === "am" ? m.nameAm : m.nameEn}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>
                        {m.dates.split("–")[0]}
                      </div>
                    </th>
                  ))}
                  <th style={{ minWidth: 110, textAlign: "right", background: "rgba(99, 102, 241, 0.15)" }}>
                    {lang === "am" ? "ዓመታዊ ድምር" : "Annual Total"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tItem) => (
                  <tr key={tItem.id}>
                    <td style={{ fontWeight: 600 }}>
                      {lang === "am" ? tItem.nameAm : tItem.nameEn}
                    </td>
                    <td>
                      <span className="split-badge-sm">
                        {lang === "am" ? tItem.splitAm : tItem.splitEn}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#fff" }}>
                      {fmt(tItem.monthlyRent)}
                    </td>
                    {ETHIOPIAN_MONTHS.map((m) => (
                      <td key={m.id} style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {fmt(tItem.monthlyRent)}
                      </td>
                    ))}
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--indigo-light)", background: "rgba(99, 102, 241, 0.08)" }}>
                      {fmt(tItem.monthlyRent * 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-total-row">
                  <td colSpan="2" style={{ fontWeight: 700 }}>
                    {lang === "am" ? "ጠቅላላ ወርሃዊ ገቢ" : "Monthly Total"}
                  </td>
                  <td style={{ fontWeight: 800, color: "var(--indigo-light)" }}>
                    {fmt(totalRent)}
                  </td>
                  {ETHIOPIAN_MONTHS.map((m) => (
                    <td key={m.id} style={{ textAlign: "right", fontWeight: 700, color: "#fff" }}>
                      {fmt(totalRent)}
                    </td>
                  ))}
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--indigo-light)", background: "rgba(99, 102, 241, 0.2)" }}>
                    {fmt(totalRent * 12)} {t.etb}
                  </td>
                </tr>
                <tr style={{ background: "rgba(99, 102, 241, 0.05)" }}>
                  <td colSpan="2" style={{ color: "#818cf8", fontWeight: 600 }}>
                    {lang === "am" ? "የመስፍን ድርሻ (63.8%)" : "Mesfin Gross Share"}
                  </td>
                  <td style={{ color: "#818cf8", fontWeight: 700 }}>
                    {fmt(totalMesfin)}
                  </td>
                  {ETHIOPIAN_MONTHS.map((m) => (
                    <td key={m.id} style={{ textAlign: "right", color: "#818cf8", fontSize: "0.85rem" }}>
                      {fmt(totalMesfin)}
                    </td>
                  ))}
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#818cf8" }}>
                    {fmt(totalMesfin * 12)} {t.etb}
                  </td>
                </tr>
                <tr style={{ background: "rgba(168, 85, 247, 0.05)" }}>
                  <td colSpan="2" style={{ color: "#c084fc", fontWeight: 600 }}>
                    {lang === "am" ? "የዘውድነሽ ድርሻ (36.2%)" : "Zewdnesh Gross Share"}
                  </td>
                  <td style={{ color: "#c084fc", fontWeight: 700 }}>
                    {fmt(totalZewdnesh)}
                  </td>
                  {ETHIOPIAN_MONTHS.map((m) => (
                    <td key={m.id} style={{ textAlign: "right", color: "#c084fc", fontSize: "0.85rem" }}>
                      {fmt(totalZewdnesh)}
                    </td>
                  ))}
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#c084fc" }}>
                    {fmt(totalZewdnesh * 12)} {t.etb}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TENANT MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTenant ? t.editTenant : t.addTenant}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="modal-form">
              <div className="field-group">
                <label className="field-label">Tenant Name (English)</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Bekele"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label">የተከራይ ስም (አማርኛ)</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="ለምሳሌ፡ በቀለ"
                  value={formNameAm}
                  onChange={(e) => setFormNameAm(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Unit / Room Identifier</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Unit 01 / Main House"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Monthly Rent Amount (ETB)</label>
                <input
                  type="number"
                  className="field-input"
                  placeholder="e.g. 7000"
                  value={formRent}
                  onChange={(e) => setFormRent(e.target.value)}
                  required
                  min="0"
                />
              </div>

              <div className="field-group">
                <label className="field-label">Owner Allocation Split</label>
                <select
                  className="field-input"
                  value={formSplitType}
                  onChange={(e) => setFormSplitType(e.target.value)}
                >
                  <option value="shared">50% Mesfin / 50% Zewdnesh (Shared)</option>
                  <option value="mesfin">100% Mesfin</option>
                  <option value="zewdnesh">100% Zewdnesh</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary w-full">
                  <Check size={16} /> {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
