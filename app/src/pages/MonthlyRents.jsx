import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";
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
  Sparkles,
  ArrowRight,
  FolderPlus,
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

// 12 Fixed Ethiopian Fiscal Months from Resource/Data.xlsx
export const FIXED_ETHIOPIAN_MONTHS = [
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

// Fixed 9 Property Units from Resource/Data.xlsx
export const FIXED_UNITS = [
  {
    id: "unit-01",
    room: "Unit 01",
    nameAm: "በቀለ",
    nameEn: "Bekele",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 7000,
    splitType: "shared", // 50% Mesfin / 50% Zewdnesh
    splitAm: "50% መስፍን / 50% ዘውድነሽ",
    splitEn: "50% Mesfin / 50% Zewdnesh",
    mesfinRatio: 0.5,
    zewdneshRatio: 0.5,
  },
  {
    id: "unit-02",
    room: "Unit 02",
    nameAm: "ልብነሽ",
    nameEn: "Libnesh",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 7000,
    splitType: "shared",
    splitAm: "50% መስፍን / 50% ዘውድነሽ",
    splitEn: "50% Mesfin / 50% Zewdnesh",
    mesfinRatio: 0.5,
    zewdneshRatio: 0.5,
  },
  {
    id: "unit-03",
    room: "Unit 03",
    nameAm: "ጋዲሴ",
    nameEn: "Gadise",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 2000,
    splitType: "shared",
    splitAm: "50% መስፍን / 50% ዘውድነሽ",
    splitEn: "50% Mesfin / 50% Zewdnesh",
    mesfinRatio: 0.5,
    zewdneshRatio: 0.5,
  },
  {
    id: "unit-04",
    room: "Unit 04",
    nameAm: "ደስታ",
    nameEn: "Desta",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 4000,
    splitType: "mesfin",
    splitAm: "100% መስፍን",
    splitEn: "100% Mesfin",
    mesfinRatio: 1.0,
    zewdneshRatio: 0.0,
  },
  {
    id: "unit-05",
    room: "Unit 05",
    nameAm: "ገነት",
    nameEn: "Genet",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 4000,
    splitType: "mesfin",
    splitAm: "100% መስፍን",
    splitEn: "100% Mesfin",
    mesfinRatio: 1.0,
    zewdneshRatio: 0.0,
  },
  {
    id: "unit-06",
    room: "Main House (Unit 06)",
    nameAm: "ገዛህኝ",
    nameEn: "Gezahegn",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 11000,
    splitType: "mesfin",
    splitAm: "100% መስፍን",
    splitEn: "100% Mesfin",
    mesfinRatio: 1.0,
    zewdneshRatio: 0.0,
  },
  {
    id: "unit-07",
    room: "Unit 07",
    nameAm: "ለምለም",
    nameEn: "Lemlem",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 5000,
    splitType: "zewdnesh",
    splitAm: "100% ዘውድነሽ",
    splitEn: "100% Zewdnesh",
    mesfinRatio: 0.0,
    zewdneshRatio: 1.0,
  },
  {
    id: "unit-08",
    room: "Unit 08",
    nameAm: "አስረስ",
    nameEn: "Asres",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 1300,
    splitType: "zewdnesh",
    splitAm: "100% ዘውድነሽ",
    splitEn: "100% Zewdnesh",
    mesfinRatio: 0.0,
    zewdneshRatio: 1.0,
  },
  {
    id: "unit-09",
    room: "Unit 09",
    nameAm: "ወይንሸት",
    nameEn: "Weynshet",
    categoryAm: "መኖሪያ ቤት",
    categoryEn: "Residential Unit",
    defaultRent: 1000,
    splitType: "zewdnesh",
    splitAm: "100% ዘውድነሽ",
    splitEn: "100% Zewdnesh",
    mesfinRatio: 0.0,
    zewdneshRatio: 1.0,
  },
];

export const DEFAULT_TENANTS = FIXED_UNITS;

// Helper to generate a blank or default year sheet
function createDefaultYearSheet(yearName, markPaidMonth = "tikimt") {
  const monthsData = {};
  FIXED_ETHIOPIAN_MONTHS.forEach((m) => {
    const isPaid = m.id === markPaidMonth;
    monthsData[m.id] = {};
    FIXED_UNITS.forEach((u) => {
      monthsData[m.id][u.id] = {
        amount: u.defaultRent,
        status: isPaid ? "paid" : "pending",
        mesfinShare: u.defaultRent * u.mesfinRatio,
        zewdneshShare: u.defaultRent * u.zewdneshRatio,
      };
    });
  });
  return {
    year: yearName,
    months: monthsData,
  };
}

// Baseline Year Sheets
export const INITIAL_YEAR_SHEETS = {
  "2019 E.C.": createDefaultYearSheet("2019 E.C.", "tikimt"),
  "2020 E.C.": createDefaultYearSheet("2020 E.C.", ""),
};

function fmt(n) {
  return Number(n || 0).toLocaleString("en-ET", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function MonthlyRents() {
  const { t, lang } = useLang();

  // Year Sheets State
  const [yearSheets, setYearSheets] = useState(() => {
    const saved = localStorage.getItem("lekulu_year_sheets");
    return saved ? JSON.parse(saved) : INITIAL_YEAR_SHEETS;
  });
  const [selectedYear, setSelectedYear] = useState("2019 E.C.");

  // Month & View State
  const [selectedMonth, setSelectedMonth] = useState("tikimt");
  const [activeTab, setActiveTab] = useState("schedule"); // 'schedule' | 'matrix'
  const [filterType, setFilterType] = useState("all"); // 'all' | 'mesfin' | 'zewdnesh' | 'shared'
  const [search, setSearch] = useState("");

  // Modals
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [newYearModalOpen, setNewYearModalOpen] = useState(false);

  // Single Record Modal Form (ALL DROPDOWNS)
  const [formYear, setFormYear] = useState("2019 E.C.");
  const [formMonth, setFormMonth] = useState("tikimt");
  const [formUnitId, setFormUnitId] = useState("unit-01");
  const [formAmount, setFormAmount] = useState(7000);
  const [formStatus, setFormStatus] = useState("paid");

  // New Year Form
  const [newYearInput, setNewYearInput] = useState("");

  // Batch Form State for the selected month
  const [batchDraft, setBatchDraft] = useState({});

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("lekulu_year_sheets", JSON.stringify(yearSheets));
  }, [yearSheets]);

  // Firestore Live Listener
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, "yearly_rent_sheets"), (snap) => {
        if (!snap.empty) {
          const cloudData = {};
          snap.docs.forEach((d) => {
            cloudData[d.id] = d.data();
          });
          setYearSheets((prev) => ({ ...prev, ...cloudData }));
        }
      });
      return unsub;
    } catch {
      // offline fallback
    }
  }, []);

  // Current Active Year Sheet
  const currentSheet = useMemo(() => {
    return yearSheets[selectedYear] || createDefaultYearSheet(selectedYear);
  }, [yearSheets, selectedYear]);

  // Current Month's payments for all 9 units
  const currentMonthPayments = useMemo(() => {
    return currentSheet.months?.[selectedMonth] || {};
  }, [currentSheet, selectedMonth]);

  // Unit payments combined with unit metadata
  const unitList = useMemo(() => {
    return FIXED_UNITS.map((u) => {
      const payment = currentMonthPayments[u.id] || {
        amount: u.defaultRent,
        status: "pending",
        mesfinShare: u.defaultRent * u.mesfinRatio,
        zewdneshShare: u.defaultRent * u.zewdneshRatio,
      };
      return {
        ...u,
        currentRent: payment.amount,
        currentMesfinShare: payment.mesfinShare,
        currentZewdneshShare: payment.zewdneshShare,
        status: payment.status || "pending",
      };
    });
  }, [currentMonthPayments]);

  // Filtered Units
  const filteredUnits = useMemo(() => {
    return unitList.filter((item) => {
      const matchesFilter = filterType === "all" || item.splitType === filterType;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
        (item.nameAm && item.nameAm.includes(q)) ||
        (item.room && item.room.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [unitList, filterType, search]);

  // Totals for Current Month
  const totalMonthlyRent = useMemo(
    () => unitList.reduce((sum, u) => sum + (Number(u.currentRent) || 0), 0),
    [unitList]
  );
  const totalMesfinMonthly = useMemo(
    () => unitList.reduce((sum, u) => sum + (Number(u.currentMesfinShare) || 0), 0),
    [unitList]
  );
  const totalZewdneshMonthly = useMemo(
    () => unitList.reduce((sum, u) => sum + (Number(u.currentZewdneshShare) || 0), 0),
    [unitList]
  );

  const mesfinPct = totalMonthlyRent > 0 ? ((totalMesfinMonthly / totalMonthlyRent) * 100).toFixed(1) : 0;
  const zewdneshPct = totalMonthlyRent > 0 ? ((totalZewdneshMonthly / totalMonthlyRent) * 100).toFixed(1) : 0;

  // Annual Totals for Current Year Sheet (Sum of all 12 months)
  const annualSheetTotal = useMemo(() => {
    let grand = 0;
    let mesfin = 0;
    let zewdnesh = 0;
    FIXED_ETHIOPIAN_MONTHS.forEach((m) => {
      const mData = currentSheet.months?.[m.id] || {};
      FIXED_UNITS.forEach((u) => {
        const p = mData[u.id] || { amount: u.defaultRent, mesfinShare: u.defaultRent * u.mesfinRatio, zewdneshShare: u.defaultRent * u.zewdneshRatio };
        grand += Number(p.amount) || 0;
        mesfin += Number(p.mesfinShare) || 0;
        zewdnesh += Number(p.zewdneshShare) || 0;
      });
    });
    return { grand, mesfin, zewdnesh };
  }, [currentSheet]);

  // Chart Data
  const chartData = useMemo(() => {
    return unitList.map((u) => ({
      name: lang === "am" ? u.nameAm : u.nameEn,
      mesfin: u.currentMesfinShare,
      zewdnesh: u.currentZewdneshShare,
      total: u.currentRent,
    }));
  }, [unitList, lang]);

  // Toggle individual status in current month
  const toggleStatus = (unitId) => {
    const currentUnit = unitList.find((u) => u.id === unitId);
    if (!currentUnit) return;
    const newStatus = currentUnit.status === "paid" ? "pending" : "paid";

    updatePaymentRecord(selectedYear, selectedMonth, unitId, currentUnit.currentRent, newStatus);
  };

  // Helper to update a payment in state and firestore
  const updatePaymentRecord = async (year, month, unitId, amount, status) => {
    const unitDef = FIXED_UNITS.find((u) => u.id === unitId);
    if (!unitDef) return;

    const rentNum = Number(amount) || 0;
    const mShare = rentNum * unitDef.mesfinRatio;
    const zShare = rentNum * unitDef.zewdneshRatio;

    setYearSheets((prev) => {
      const yearObj = prev[year] || createDefaultYearSheet(year);
      const monthsObj = yearObj.months || {};
      const targetMonth = monthsObj[month] || {};

      const updatedYear = {
        ...yearObj,
        months: {
          ...monthsObj,
          [month]: {
            ...targetMonth,
            [unitId]: {
              amount: rentNum,
              status,
              mesfinShare: mShare,
              zewdneshShare: zShare,
            },
          },
        },
      };

      // Background sync to Firestore
      try {
        setDoc(doc(db, "yearly_rent_sheets", year), updatedYear, { merge: true }).catch(() => {});
      } catch {
        // offline
      }

      return {
        ...prev,
        [year]: updatedYear,
      };
    });
  };

  // Open Single Record Modal
  const openSingleRecordModal = (unit = null) => {
    setFormYear(selectedYear);
    setFormMonth(selectedMonth);
    const targetUnit = unit || FIXED_UNITS[0];
    setFormUnitId(targetUnit.id);
    const payment = currentMonthPayments[targetUnit.id];
    setFormAmount(payment ? payment.amount : targetUnit.defaultRent);
    setFormStatus(payment ? payment.status : "paid");
    setRecordModalOpen(true);
  };

  // Change selected unit in modal dropdown (auto-fills default amount and split)
  const handleUnitDropdownChange = (unitId) => {
    setFormUnitId(unitId);
    const unitDef = FIXED_UNITS.find((u) => u.id === unitId);
    if (unitDef) {
      const existing = yearSheets[formYear]?.months?.[formMonth]?.[unitId];
      setFormAmount(existing ? existing.amount : unitDef.defaultRent);
      setFormStatus(existing ? existing.status : "paid");
    }
  };

  // Save Single Record
  const handleSaveSingleRecord = (e) => {
    e.preventDefault();
    updatePaymentRecord(formYear, formMonth, formUnitId, formAmount, formStatus);
    setRecordModalOpen(false);
  };

  // Open Batch Month Modal
  const openBatchMonthModal = () => {
    const draft = {};
    FIXED_UNITS.forEach((u) => {
      const p = currentMonthPayments[u.id] || {
        amount: u.defaultRent,
        status: "paid",
      };
      draft[u.id] = {
        amount: p.amount,
        status: p.status,
      };
    });
    setBatchDraft(draft);
    setBatchModalOpen(true);
  };

  // Save Batch Month
  const handleSaveBatchMonth = (e) => {
    e.preventDefault();
    Object.keys(batchDraft).forEach((uId) => {
      const item = batchDraft[uId];
      updatePaymentRecord(selectedYear, selectedMonth, uId, item.amount, item.status);
    });
    setBatchModalOpen(false);
  };

  // Mark all paid in batch draft
  const handleMarkAllBatchPaid = () => {
    setBatchDraft((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], status: "paid" };
      });
      return updated;
    });
  };

  // Create New Year Sheet
  const handleCreateYearSheet = (e) => {
    e.preventDefault();
    const cleanYear = newYearInput.trim();
    if (!cleanYear) return;

    const formattedYear = cleanYear.toLowerCase().includes("e.c.") || cleanYear.includes("ዓ.ም.")
      ? cleanYear
      : `${cleanYear} E.C.`;

    if (yearSheets[formattedYear]) {
      alert("This fiscal year sheet already exists!");
      setSelectedYear(formattedYear);
      setNewYearModalOpen(false);
      return;
    }

    const newSheet = createDefaultYearSheet(formattedYear, "");
    setYearSheets((prev) => ({
      ...prev,
      [formattedYear]: newSheet,
    }));
    try {
      setDoc(doc(db, "yearly_rent_sheets", formattedYear), newSheet).catch(() => {});
    } catch {}

    setSelectedYear(formattedYear);
    setNewYearInput("");
    setNewYearModalOpen(false);
  };

  const currentMonthObj =
    FIXED_ETHIOPIAN_MONTHS.find((m) => m.id === selectedMonth) || FIXED_ETHIOPIAN_MONTHS[1];
  const selectedUnitDef = FIXED_UNITS.find((u) => u.id === formUnitId) || FIXED_UNITS[0];

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="page-title">{t.monthlyRentsTitle}</h1>
            <span className="badge badge--indigo">
              {selectedYear} {lang === "am" ? "የበጀት ሠንጠረዥ" : "Sheet"}
            </span>
          </div>
          <p className="page-subtitle">{t.monthlyRentsSubtitle}</p>
        </div>

        {/* Action Buttons: Add Payment & Batch Record */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            id="batch-record-btn"
            className="btn-secondary"
            onClick={openBatchMonthModal}
            title="Record all 9 units in one click"
          >
            <CheckCircle2 size={16} /> {lang === "am" ? "የወር ክፍያዎችን በአንድ ጊዜ መዝግብ" : "Record Full Month"}
          </button>
          <button
            id="record-rent-btn"
            className="btn-primary"
            onClick={() => openSingleRecordModal()}
          >
            <Plus size={16} /> {lang === "am" ? "ክፍያ መዝግብ (Dropdown)" : "Record Rent Payment"}
          </button>
        </div>
      </div>

      {/* FISCAL YEAR SELECTOR (Yearly Sheets) */}
      <div className="year-sheets-bar">
        <div className="year-sheets-label">
          <FileSpreadsheet size={16} />
          <span>{lang === "am" ? "የበጀት ዓመት ሠንጠረዥ (Year Sheet):" : "Fiscal Year Sheet:"}</span>
        </div>
        <div className="year-pills-list">
          {Object.keys(yearSheets).map((yr) => {
            const isSelected = yr === selectedYear;
            return (
              <button
                key={yr}
                className={`year-pill-btn ${isSelected ? "year-pill-btn--active" : ""}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr}
              </button>
            );
          })}
          <button
            className="add-year-pill-btn"
            onClick={() => setNewYearModalOpen(true)}
            title="Add a brand new yearly sheet"
          >
            <FolderPlus size={14} /> + {lang === "am" ? "አዲስ ዓመት ሠንጠረዥ" : "New Year Sheet"}
          </button>
        </div>
      </div>

      {/* Fixed 12 Ethiopian Months Bar */}
      <div className="months-scroll-container">
        <div className="months-bar">
          {FIXED_ETHIOPIAN_MONTHS.map((m) => {
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

      {/* KPI Stats Cards for Selected Year & Month */}
      <div className="stats-grid" style={{ marginTop: 18 }}>
        {/* Monthly Total Rent */}
        <div className="stat-card stat-card--indigo">
          <div className="stat-icon">
            <Building2 size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">
              {lang === "am" ? `የ${currentMonthObj.nameAm} ወርሃዊ ኪራይ ድምር` : `${currentMonthObj.nameEn} Gross Rent`}
            </p>
            <h3 className="stat-value">
              {fmt(totalMonthlyRent)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              <Calendar size={13} style={{ display: "inline", marginRight: 4 }} />
              {selectedYear} • {currentMonthObj.dates}
            </p>
          </div>
        </div>

        {/* Mesfin's Share */}
        <div className="stat-card stat-card--cyan">
          <div className="stat-icon">
            <Wallet size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">{t.mesfinGross}</p>
            <h3 className="stat-value">
              {fmt(totalMesfinMonthly)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              <Percent size={12} style={{ display: "inline" }} /> {mesfinPct}% {lang === "am" ? "የወሩ ድርሻ" : "of month"}
            </p>
          </div>
        </div>

        {/* Zewdnesh's Share */}
        <div className="stat-card stat-card--violet">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">{t.zewdneshGross}</p>
            <h3 className="stat-value">
              {fmt(totalZewdneshMonthly)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              <Percent size={12} style={{ display: "inline" }} /> {zewdneshPct}% {lang === "am" ? "የወሩ ድርሻ" : "of month"}
            </p>
          </div>
        </div>

        {/* Annual Sheet Total */}
        <div className="stat-card stat-card--emerald">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-body">
            <p className="stat-label">{selectedYear} {lang === "am" ? "ዓመታዊ ድምር" : "Annual Sheet Total"}</p>
            <h3 className="stat-value">
              {fmt(annualSheetTotal.grand)} <span className="stat-currency">{t.etb}</span>
            </h3>
            <p className="stat-sub">
              {FIXED_UNITS.length} {lang === "am" ? "ቋሚ ክፍሎች (100% ተከራይ)" : "Fixed Units (12 Months)"}
            </p>
          </div>
        </div>
      </div>

      {/* View Switcher: Single Month Ledger vs. 12-Month Matrix Sheet */}
      <div className="table-controls-card">
        <div className="tab-pill-group">
          <button
            className={`tab-pill-btn ${activeTab === "schedule" ? "tab-pill-btn--active" : ""}`}
            onClick={() => setActiveTab("schedule")}
          >
            <Layers size={16} /> {lang === "am" ? `${currentMonthObj.nameAm} - የተከራዮች ዝርዝር` : `${currentMonthObj.nameEn} Rent Schedule`}
          </button>
          <button
            className={`tab-pill-btn ${activeTab === "matrix" ? "tab-pill-btn--active" : ""}`}
            onClick={() => setActiveTab("matrix")}
          >
            <FileSpreadsheet size={16} /> {selectedYear} {t.allMonthsMatrix}
          </button>
        </div>

        {activeTab === "schedule" && (
          <div className="filters-search-row">
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
          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t.tenantName}</th>
                    <th>{lang === "am" ? "ክፍል / መለያ" : "Unit / Room"}</th>
                    <th>{t.tenantCategory}</th>
                    <th style={{ textAlign: "right" }}>{t.monthlyRent}</th>
                    <th>{t.ownerSplit}</th>
                    <th style={{ textAlign: "right" }}>{t.mesfinGross}</th>
                    <th style={{ textAlign: "right" }}>{t.zewdneshGross}</th>
                    <th style={{ textAlign: "center" }}>{t.paymentStatus}</th>
                    <th style={{ textAlign: "center" }}>{lang === "am" ? "አርትዕ" : "Edit"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="empty-table-cell">
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((item, idx) => {
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
                            <span className="room-badge">{item.room}</span>
                          </td>
                          <td>
                            <span className="category-tag">
                              {lang === "am" ? item.categoryAm : item.categoryEn}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#fff" }}>
                            {fmt(item.currentRent)} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.etb}</span>
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
                            {fmt(item.currentMesfinShare)} {t.etb}
                          </td>
                          <td style={{ textAlign: "right", color: "#c084fc", fontWeight: 600 }}>
                            {fmt(item.currentZewdneshShare)} {t.etb}
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
                            <button
                              className="icon-action-btn"
                              onClick={() => openSingleRecordModal(item)}
                              title="Edit rent / payment via dropdown"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="table-total-row">
                    <td colSpan="4" style={{ fontWeight: 700 }}>
                      {lang === "am"
                        ? `የ${currentMonthObj.nameAm} (${selectedYear}) ጠቅላላ ኪራይ ድምር`
                        : `${currentMonthObj.nameEn} (${selectedYear}) Total Monthly Rent`}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "var(--indigo-light)", fontSize: "1.05rem" }}>
                      {fmt(totalMonthlyRent)} {t.etb}
                    </td>
                    <td>
                      <span className="badge badge--dark">
                        {mesfinPct}% M / {zewdneshPct}% Z
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#818cf8" }}>
                      {fmt(totalMesfinMonthly)} {t.etb}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#c084fc" }}>
                      {fmt(totalZewdneshMonthly)} {t.etb}
                    </td>
                    <td colSpan="2" style={{ textAlign: "center", color: "var(--emerald)", fontWeight: 600 }}>
                      {unitList.filter((u) => u.status === "paid").length} / {FIXED_UNITS.length} {lang === "am" ? "የተከፈሉ" : "Paid"}
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
                  {lang === "am" ? `${currentMonthObj.nameAm} (${selectedYear}) የኪራይ ድርሻ ግራፍ` : `${currentMonthObj.nameEn} (${selectedYear}) Rent Distribution Chart`}
                </h3>
                <p className="chart-card-sub">
                  {lang === "am"
                    ? "በእያንዳንዱ ቋሚ ክፍል የሚገኘው ወርሃዊ ገቢ እና የመስፍን/የዘውድነሽ ድርሻ"
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
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                {selectedYear} {lang === "am" ? "የ12 ወራት የቤት ኪራይ ማትሪክስ ሠንጠረዥ" : "Full 12-Month Rental Income Matrix Sheet"}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {lang === "am"
                  ? "የ9ኙም ቋሚ ክፍሎች ወርሃዊ የቤት ኪራይ ገቢ እና ዓመታዊ ድምር"
                  : "All 9 fixed units across the 12 Ethiopian months with annual totals"}
              </p>
            </div>
          </div>
          <div className="table-wrapper matrix-wrapper">
            <table className="data-table matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>{t.tenantName}</th>
                  <th style={{ minWidth: 120 }}>{t.ownerSplit}</th>
                  {FIXED_ETHIOPIAN_MONTHS.map((m) => (
                    <th key={m.id} style={{ minWidth: 88, textAlign: "right" }}>
                      <div>{lang === "am" ? m.nameAm : m.nameEn}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 400 }}>
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
                {FIXED_UNITS.map((u) => {
                  let unitAnnualSum = 0;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>
                        {lang === "am" ? u.nameAm : u.nameEn}
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{u.room}</div>
                      </td>
                      <td>
                        <span className="split-badge-sm">
                          {lang === "am" ? u.splitAm : u.splitEn}
                        </span>
                      </td>
                      {FIXED_ETHIOPIAN_MONTHS.map((m) => {
                        const p = currentSheet.months?.[m.id]?.[u.id] || { amount: u.defaultRent, status: "pending" };
                        unitAnnualSum += Number(p.amount) || 0;
                        const isP = p.status === "paid";
                        return (
                          <td
                            key={m.id}
                            style={{
                              textAlign: "right",
                              fontSize: "0.85rem",
                              color: isP ? "#fff" : "var(--text-muted)",
                              fontWeight: isP ? 600 : 400,
                            }}
                          >
                            {fmt(p.amount)}
                            {isP && <span style={{ color: "var(--emerald)", marginLeft: 3 }}>✓</span>}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--indigo-light)", background: "rgba(99, 102, 241, 0.08)" }}>
                        {fmt(unitAnnualSum)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-total-row">
                  <td colSpan="2" style={{ fontWeight: 700 }}>
                    {selectedYear} {lang === "am" ? "ወርሃዊ ድምር" : "Monthly Total"}
                  </td>
                  {FIXED_ETHIOPIAN_MONTHS.map((m) => {
                    const mTotal = FIXED_UNITS.reduce((sum, u) => {
                      const p = currentSheet.months?.[m.id]?.[u.id] || { amount: u.defaultRent };
                      return sum + (Number(p.amount) || 0);
                    }, 0);
                    return (
                      <td key={m.id} style={{ textAlign: "right", fontWeight: 700, color: "#fff" }}>
                        {fmt(mTotal)}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--indigo-light)", background: "rgba(99, 102, 241, 0.2)" }}>
                    {fmt(annualSheetTotal.grand)} {t.etb}
                  </td>
                </tr>
                <tr style={{ background: "rgba(99, 102, 241, 0.05)" }}>
                  <td colSpan="2" style={{ color: "#818cf8", fontWeight: 600 }}>
                    {lang === "am" ? "የመስፍን ድርሻ (Mesfin)" : "Mesfin Gross Share"}
                  </td>
                  {FIXED_ETHIOPIAN_MONTHS.map((m) => {
                    const mesfinTotal = FIXED_UNITS.reduce((sum, u) => {
                      const p = currentSheet.months?.[m.id]?.[u.id] || { mesfinShare: u.defaultRent * u.mesfinRatio };
                      return sum + (Number(p.mesfinShare) || 0);
                    }, 0);
                    return (
                      <td key={m.id} style={{ textAlign: "right", color: "#818cf8", fontSize: "0.85rem" }}>
                        {fmt(mesfinTotal)}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#818cf8" }}>
                    {fmt(annualSheetTotal.mesfin)} {t.etb}
                  </td>
                </tr>
                <tr style={{ background: "rgba(168, 85, 247, 0.05)" }}>
                  <td colSpan="2" style={{ color: "#c084fc", fontWeight: 600 }}>
                    {lang === "am" ? "የዘውድነሽ ድርሻ (Zewdnesh)" : "Zewdnesh Gross Share"}
                  </td>
                  {FIXED_ETHIOPIAN_MONTHS.map((m) => {
                    const zewdneshTotal = FIXED_UNITS.reduce((sum, u) => {
                      const p = currentSheet.months?.[m.id]?.[u.id] || { zewdneshShare: u.defaultRent * u.zewdneshRatio };
                      return sum + (Number(p.zewdneshShare) || 0);
                    }, 0);
                    return (
                      <td key={m.id} style={{ textAlign: "right", color: "#c084fc", fontSize: "0.85rem" }}>
                        {fmt(zewdneshTotal)}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#c084fc" }}>
                    {fmt(annualSheetTotal.zewdnesh)} {t.etb}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 1. SINGLE RECORD PAYMENT MODAL (ALL DROPDOWNS - NO FREE TYPING) */}
      {recordModalOpen && (
        <div className="modal-overlay" onClick={() => setRecordModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {lang === "am" ? "የቤት ኪራይ ክፍያ መዝግብ" : "Record Rent Payment"}
              </h3>
              <button className="modal-close-btn" onClick={() => setRecordModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSingleRecord} className="modal-form">
              {/* Dropdown 1: Fiscal Year Sheet */}
              <div className="field-group">
                <label className="field-label">
                  {lang === "am" ? "1. የበጀት ዓመት ሠንጠረዥ (Year Sheet)" : "1. Fiscal Year Sheet"}
                </label>
                <select
                  className="field-input"
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                >
                  {Object.keys(yearSheets).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Ethiopian Month */}
              <div className="field-group">
                <label className="field-label">
                  {lang === "am" ? "2. ወር ይምረጡ (Ethiopian Month)" : "2. Ethiopian Month"}
                </label>
                <select
                  className="field-input"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                >
                  {FIXED_ETHIOPIAN_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {lang === "am" ? m.nameAm : m.nameEn} ({m.dates})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 3: Fixed Unit / Tenant */}
              <div className="field-group">
                <label className="field-label">
                  {lang === "am" ? "3. ቋሚ ክፍል / ተከራይ ይምረጡ (Fixed Unit)" : "3. Fixed Unit / Tenant"}
                </label>
                <select
                  className="field-input"
                  value={formUnitId}
                  onChange={(e) => handleUnitDropdownChange(e.target.value)}
                >
                  {FIXED_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.room} — {lang === "am" ? u.nameAm : u.nameEn} ({fmt(u.defaultRent)} ETB • {lang === "am" ? u.splitAm : u.splitEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount (Auto-filled from unit default) */}
              <div className="field-group">
                <label className="field-label">
                  {lang === "am" ? "የተከፈለ መጠን / Amount (ETB)" : "Rent Amount (ETB)"}
                </label>
                <input
                  type="number"
                  className="field-input"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  required
                  min="0"
                />
              </div>

              {/* Auto Split Breakdown Display */}
              <div className="auto-split-preview">
                <div className="split-prev-row">
                  <span>{lang === "am" ? "የክፍፍል ደንብ:" : "Split Rule:"}</span>
                  <strong>{lang === "am" ? selectedUnitDef.splitAm : selectedUnitDef.splitEn}</strong>
                </div>
                <div className="split-prev-row">
                  <span style={{ color: "#818cf8" }}>{lang === "am" ? "የመስፍን ድርሻ (Auto):" : "Mesfin Share (Auto):"}</span>
                  <strong style={{ color: "#818cf8" }}>{fmt(formAmount * selectedUnitDef.mesfinRatio)} ETB</strong>
                </div>
                <div className="split-prev-row">
                  <span style={{ color: "#c084fc" }}>{lang === "am" ? "የዘውድነሽ ድርሻ (Auto):" : "Zewdnesh Share (Auto):"}</span>
                  <strong style={{ color: "#c084fc" }}>{fmt(formAmount * selectedUnitDef.zewdneshRatio)} ETB</strong>
                </div>
              </div>

              {/* Dropdown 4: Payment Status */}
              <div className="field-group">
                <label className="field-label">{t.paymentStatus}</label>
                <select
                  className="field-input"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                >
                  <option value="paid">{lang === "am" ? "ተከፍሏል (Paid)" : "Paid"}</option>
                  <option value="pending">{lang === "am" ? "በመጠባበቅ ላይ (Pending)" : "Pending"}</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setRecordModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary w-full">
                  <Check size={16} /> {lang === "am" ? "ክፍያውን መዝግብ" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. BATCH FULL MONTH RECORD MODAL */}
      {batchModalOpen && (
        <div className="modal-overlay" onClick={() => setBatchModalOpen(false)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {lang === "am"
                    ? `የ${currentMonthObj.nameAm} (${selectedYear}) 9ኙንም ክፍሎች በአንድ ጊዜ መዝግብ`
                    : `Record All 9 Units for ${currentMonthObj.nameEn} (${selectedYear})`}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {lang === "am"
                    ? "ለወሩ የተከፈለውን መጠን እና ሁኔታ በአንድ ጠቅታ ያዘምኑ"
                    : "Update amounts and toggle paid/pending status for all units simultaneously"}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setBatchModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBatchMonth}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  onClick={handleMarkAllBatchPaid}
                >
                  <CheckCircle2 size={14} style={{ color: "var(--emerald)" }} /> {lang === "am" ? "ሁሉንም እንደተከፈለ ምልክት አድርግ" : "Mark All as Paid"}
                </button>
              </div>

              <div className="batch-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Unit / Room</th>
                      <th>Tenant</th>
                      <th style={{ width: 140 }}>Rent Amount (ETB)</th>
                      <th>Status Dropdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIXED_UNITS.map((u) => {
                      const itemDraft = batchDraft[u.id] || { amount: u.defaultRent, status: "paid" };
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.room}</td>
                          <td>
                            <span>{lang === "am" ? u.nameAm : u.nameEn}</span>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {lang === "am" ? u.splitAm : u.splitEn}
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="field-input"
                              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                              value={itemDraft.amount}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBatchDraft((prev) => ({
                                  ...prev,
                                  [u.id]: { ...prev[u.id], amount: val },
                                }));
                              }}
                            />
                          </td>
                          <td>
                            <select
                              className="field-input"
                              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                              value={itemDraft.status}
                              onChange={(e) => {
                                const st = e.target.value;
                                setBatchDraft((prev) => ({
                                  ...prev,
                                  [u.id]: { ...prev[u.id], status: st },
                                }));
                              }}
                            >
                              <option value="paid">{lang === "am" ? "ተከፍሏል (Paid)" : "Paid"}</option>
                              <option value="pending">{lang === "am" ? "በመጠባበቅ ላይ (Pending)" : "Pending"}</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setBatchModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary w-full">
                  <Check size={16} /> {lang === "am" ? "ሁሉንም አዘምንና አስቀምጥ" : "Save All Payments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. NEW FISCAL YEAR SHEET MODAL */}
      {newYearModalOpen && (
        <div className="modal-overlay" onClick={() => setNewYearModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {lang === "am" ? "አዲስ የበጀት ዓመት ሠንጠረዥ ፍጠር" : "Create New Fiscal Year Sheet"}
              </h3>
              <button className="modal-close-btn" onClick={() => setNewYearModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateYearSheet} className="modal-form">
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {lang === "am"
                  ? "አዲስ ዓመት ሲፈጠር በኤክሴል እንዳለ አዲስ ሠንጠረዥ (Sheet) ይዘጋጃል። 9ኙም ቋሚ ክፍሎች እና 12ቱ ወራት በራስ-ሰር ይካተታሉ።"
                  : "When a new year is created, a clean 12-month fiscal sheet is generated with all 9 fixed units ready for payment tracking."}
              </p>

              <div className="field-group">
                <label className="field-label">
                  {lang === "am" ? "የበጀት ዓመት ስም (Fiscal Year Name)" : "Fiscal Year Name"}
                </label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. 2020 E.C. or 2021 E.C."
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setNewYearModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary w-full">
                  <FolderPlus size={16} /> {lang === "am" ? "ሠንጠረዡን ፍጠር" : "Create Year Sheet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
