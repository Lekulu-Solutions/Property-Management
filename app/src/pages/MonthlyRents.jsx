import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../context/AppContext";
import {
  CheckCircle2,
  Clock,
  Plus,
  Home,
  FileSpreadsheet,
  Layers,
  Edit2,
  X,
  Check,
  Calendar,
  Wallet,
  Users,
  Building2,
  FolderPlus,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
} from "lucide-react";

// Fixed 12 Ethiopian Fiscal Months from Resource/Data.xlsx
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
    defaultRent: 7000,
    splitType: "shared",
    splitAm: "50/50 የጋራ",
    splitEn: "50/50 Shared",
    mesfinRatio: 0.5,
    zewdneshRatio: 0.5,
  },
  {
    id: "unit-02",
    room: "Unit 02",
    nameAm: "ልብነሽ",
    nameEn: "Libnesh",
    defaultRent: 7000,
    splitType: "shared",
    splitAm: "50/50 የጋራ",
    splitEn: "50/50 Shared",
    mesfinRatio: 0.5,
    zewdneshRatio: 0.5,
  },
  {
    id: "unit-03",
    room: "Unit 03",
    nameAm: "ጋዲሴ",
    nameEn: "Gadise",
    defaultRent: 2000,
    splitType: "shared",
    splitAm: "50/50 የጋራ",
    splitEn: "50/50 Shared",
    mesfinRatio: 0.5,
    zewdneshRatio: 0.5,
  },
  {
    id: "unit-04",
    room: "Unit 04",
    nameAm: "ደስታ",
    nameEn: "Desta",
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
    defaultRent: 4000,
    splitType: "mesfin",
    splitAm: "100% መስፍን",
    splitEn: "100% Mesfin",
    mesfinRatio: 1.0,
    zewdneshRatio: 0.0,
  },
  {
    id: "unit-06",
    room: "Unit 06 (Main)",
    nameAm: "ገዛህኝ",
    nameEn: "Gezahegn",
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
  const [selectedMonth, setSelectedMonth] = useState("tikimt");
  const [viewMode, setViewMode] = useState("monthly"); // 'monthly' | 'matrix'

  // Modals
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [newYearModalOpen, setNewYearModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveCodeInput, setApproveCodeInput] = useState("");
  const [approveError, setApproveError] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");

  // Dropdown-Only Form State
  const [formYear, setFormYear] = useState("2019 E.C.");
  const [formMonth, setFormMonth] = useState("tikimt");
  const [formUnitId, setFormUnitId] = useState("unit-01");
  const [formAmount, setFormAmount] = useState(7000);
  const [formStatus, setFormStatus] = useState("paid");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newYearInput, setNewYearInput] = useState("");

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("lekulu_year_sheets", JSON.stringify(yearSheets));
  }, [yearSheets]);

  // Firestore Sync
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
      // offline
    }
  }, []);

  const currentSheet = useMemo(() => {
    return yearSheets[selectedYear] || createDefaultYearSheet(selectedYear);
  }, [yearSheets, selectedYear]);

  const currentMonthPayments = useMemo(() => {
    return currentSheet.months?.[selectedMonth] || {};
  }, [currentSheet, selectedMonth]);

  // Combine fixed units with current month status
  const currentUnitRows = useMemo(() => {
    return FIXED_UNITS.map((u) => {
      const p = currentMonthPayments[u.id] || {
        amount: u.defaultRent,
        status: "pending",
        mesfinShare: u.defaultRent * u.mesfinRatio,
        zewdneshShare: u.defaultRent * u.zewdneshRatio,
      };
      return {
        ...u,
        rent: p.amount,
        mesfin: p.mesfinShare,
        zewdnesh: p.zewdneshShare,
        status: p.status || "pending",
        date: p.date,
      };
    });
  }, [currentMonthPayments]);

  // Monthly totals
  const totalRent = currentUnitRows.reduce((s, u) => s + (Number(u.rent) || 0), 0);
  const totalMesfin = currentUnitRows.reduce((s, u) => s + (Number(u.mesfin) || 0), 0);
  const totalZewdnesh = currentUnitRows.reduce((s, u) => s + (Number(u.zewdnesh) || 0), 0);
  const paidCount = currentUnitRows.filter((u) => u.status === "paid").length;

  // Toggle single status
  const toggleStatus = (unitId) => {
    const unit = currentUnitRows.find((u) => u.id === unitId);
    if (!unit) return;
    const newStatus = unit.status === "paid" ? "pending" : "paid";
    updatePayment(selectedYear, selectedMonth, unitId, unit.rent, newStatus);
  };

  // Toggle entire month paid
  const toggleAllPaid = () => {
    const targetStatus = paidCount === FIXED_UNITS.length ? "pending" : "paid";
    FIXED_UNITS.forEach((u) => {
      const p = currentMonthPayments[u.id] || { amount: u.defaultRent };
      updatePayment(selectedYear, selectedMonth, u.id, p.amount, targetStatus);
    });
  };

  const updatePayment = (year, month, unitId, amount, status, date) => {
    const uDef = FIXED_UNITS.find((u) => u.id === unitId);
    if (!uDef) return;
    const amt = Number(amount) || 0;
    const mShare = amt * uDef.mesfinRatio;
    const zShare = amt * uDef.zewdneshRatio;

    setYearSheets((prev) => {
      const yObj = prev[year] || createDefaultYearSheet(year);
      const mObj = yObj.months || {};
      const targetMonth = mObj[month] || {};
      const existingPayment = targetMonth[unitId] || {};
      const recordDate = date || existingPayment.date || new Date().toISOString().split("T")[0];

      const updatedYear = {
        ...yObj,
        months: {
          ...mObj,
          [month]: {
            ...targetMonth,
            [unitId]: {
              amount: amt,
              status,
              mesfinShare: mShare,
              zewdneshShare: zShare,
              date: recordDate,
            },
          },
        },
      };

      try {
        setDoc(doc(db, "yearly_rent_sheets", year), updatedYear, { merge: true }).catch(() => {});
      } catch {}

      return {
        ...prev,
        [year]: updatedYear,
      };
    });
  };

  const isMonthApproved = currentSheet.months?.[selectedMonth]?.approved === true;

  // Confirm approval with code 8998
  const handleConfirmApproval = (e) => {
    e.preventDefault();
    if (approveCodeInput.trim() !== "8998") {
      setApproveError(t.invalidCode || "Invalid security code. Please enter 8998.");
      return;
    }

    setYearSheets((prev) => {
      const yObj = prev[selectedYear] || createDefaultYearSheet(selectedYear);
      const mObj = yObj.months || {};
      const targetMonth = mObj[selectedMonth] || {};

      const updatedUnits = {};
      FIXED_UNITS.forEach((u) => {
        const p = targetMonth[u.id] || { amount: u.defaultRent };
        updatedUnits[u.id] = {
          amount: p.amount,
          status: "paid",
          mesfinShare: p.amount * u.mesfinRatio,
          zewdneshShare: p.amount * u.zewdneshRatio,
        };
      });

      const updatedYear = {
        ...yObj,
        months: {
          ...mObj,
          [selectedMonth]: {
            ...updatedUnits,
            approved: true,
            approvedAt: new Date().toISOString(),
          },
        },
      };

      try {
        setDoc(doc(db, "yearly_rent_sheets", selectedYear), updatedYear, { merge: true }).catch(() => {});
      } catch {}

      return {
        ...prev,
        [selectedYear]: updatedYear,
      };
    });

    setApproveModalOpen(false);
    setBannerMessage(
      lang === "am"
        ? `የ${curMonthObj.nameAm} (${selectedYear}) የቤት ኪራይ ገቢ በስኬት ጸድቋል!`
        : `${curMonthObj.nameEn} (${selectedYear}) rental income approved and confirmed!`
    );
    setTimeout(() => setBannerMessage(""), 4500);
  };

  const handleUnlockMonth = () => {
    const code = window.prompt(
      lang === "am" ? "ማረጋገጫ ለማንሳት ኮድ ያስገቡ (8998):" : "Enter code to unlock (8998):"
    );
    if (code === "8998") {
      setYearSheets((prev) => {
        const yObj = prev[selectedYear] || createDefaultYearSheet(selectedYear);
        const mObj = yObj.months || {};
        const targetMonth = mObj[selectedMonth] || {};
        const updatedYear = {
          ...yObj,
          months: {
            ...mObj,
            [selectedMonth]: {
              ...targetMonth,
              approved: false,
            },
          },
        };
        try {
          setDoc(doc(db, "yearly_rent_sheets", selectedYear), updatedYear, { merge: true }).catch(() => {});
        } catch {}
        return { ...prev, [selectedYear]: updatedYear };
      });
    } else if (code !== null) {
      alert("Invalid code! (Must be 8998)");
    }
  };

  // Open modal with unit pre-selected
  const openModal = (unit = null) => {
    setFormYear(selectedYear);
    setFormMonth(selectedMonth);
    const u = unit || FIXED_UNITS[0];
    setFormUnitId(u.id);
    const existing = currentMonthPayments[u.id];
    setFormAmount(existing ? existing.amount : u.defaultRent);
    setFormStatus(existing ? existing.status : "paid");
    setFormDate(existing?.date || new Date().toISOString().split("T")[0]);
    setRecordModalOpen(true);
  };

  const handleUnitSelect = (unitId) => {
    setFormUnitId(unitId);
    const u = FIXED_UNITS.find((x) => x.id === unitId);
    if (u) {
      const existing = yearSheets[formYear]?.months?.[formMonth]?.[unitId];
      setFormAmount(existing ? existing.amount : u.defaultRent);
      setFormStatus(existing ? existing.status : "paid");
      setFormDate(existing?.date || new Date().toISOString().split("T")[0]);
    }
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    updatePayment(formYear, formMonth, formUnitId, formAmount, formStatus, formDate);
    setRecordModalOpen(false);
  };

  const handleAddYear = (e) => {
    e.preventDefault();
    const yr = newYearInput.trim();
    if (!yr) return;
    const formatted = yr.toLowerCase().includes("e.c.") || yr.includes("ዓ.ም.") ? yr : `${yr} E.C.`;

    if (!yearSheets[formatted]) {
      const newSheet = createDefaultYearSheet(formatted, "");
      setYearSheets((prev) => ({ ...prev, [formatted]: newSheet }));
      try {
        setDoc(doc(db, "yearly_rent_sheets", formatted), newSheet).catch(() => {});
      } catch {}
    }
    setSelectedYear(formatted);
    setNewYearInput("");
    setNewYearModalOpen(false);
  };

  const curMonthObj = FIXED_ETHIOPIAN_MONTHS.find((m) => m.id === selectedMonth) || FIXED_ETHIOPIAN_MONTHS[1];
  const modalUnitObj = FIXED_UNITS.find((u) => u.id === formUnitId) || FIXED_UNITS[0];

  return (
    <div className="page simple-rents-page">
      {/* ─── 1. Simplified Header & Dropdown Bar ────────────────────────── */}
      <div className="clean-top-bar">
        <div>
          <h1 className="clean-title">{lang === "am" ? "የቤት ኪራይ ገቢ" : "Monthly Rental Income"}</h1>
          <p className="clean-sub">
            {lang === "am" ? "9 ቋሚ ክፍሎች • የመስፍን እና የዘውድነሽ ድርሻ" : "9 Fixed Units • Mesfin & Zewdnesh Allocation"}
          </p>
        </div>

        {/* Dropdown Selectors: Year + Month + Mode */}
        <div className="clean-selectors-group">
          {/* Year Dropdown */}
          <div className="select-box">
            <span className="select-label">{lang === "am" ? "ዓመት" : "Year"}</span>
            <select
              className="clean-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {Object.keys(yearSheets).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div className="select-box">
            <span className="select-label">{lang === "am" ? "ወር" : "Month"}</span>
            <select
              className="clean-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {FIXED_ETHIOPIAN_MONTHS.map((m) => (
                <option key={m.id} value={m.id}>
                  {lang === "am" ? m.nameAm : m.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Add Year Button */}
          <button
            className="clean-btn-ghost"
            onClick={() => setNewYearModalOpen(true)}
            title="Add a new fiscal year sheet"
          >
            + {lang === "am" ? "አዲስ ዓመት" : "New Year"}
          </button>

          {/* Record Rent Button */}
          <button
            className="btn-primary clean-action-btn"
            onClick={() => openModal()}
          >
            <Plus size={16} /> {lang === "am" ? "ክፍያ መዝግብ" : "Record Rent"}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {bannerMessage && (
        <div className="success-notification-bar">
          <CheckCircle2 size={16} />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* ─── 2. Compact Financial Summary Bar ─────────────────────────── */}
      <div className="simple-summary-strip">
        <div className="strip-item">
          <span className="strip-label">
            {lang === "am" ? `የ${curMonthObj.nameAm} ጠቅላላ ኪራይ` : `${curMonthObj.nameEn} Total Rent`}
          </span>
          <span className="strip-val">{fmt(totalRent)} <small>{t.etb}</small></span>
        </div>

        <div className="strip-divider" />

        <div className="strip-item">
          <span className="strip-label text-indigo">
            {lang === "am" ? "የመስፍን ድርሻ (63.8%)" : "Mesfin (63.8%)"}
          </span>
          <span className="strip-val text-indigo">{fmt(totalMesfin)} <small>{t.etb}</small></span>
        </div>

        <div className="strip-divider" />

        <div className="strip-item">
          <span className="strip-label text-violet">
            {lang === "am" ? "የዘውድነሽ ድርሻ (36.2%)" : "Zewdnesh (36.2%)"}
          </span>
          <span className="strip-val text-violet">{fmt(totalZewdnesh)} <small>{t.etb}</small></span>
        </div>

        <div className="strip-divider" />

        <div className="strip-item strip-item-right">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Click All Paid Button */}
            <button
              className={`simple-status-btn ${paidCount === FIXED_UNITS.length ? "status-all-paid" : ""}`}
              onClick={toggleAllPaid}
              title="Click to toggle all units paid"
            >
              {paidCount === FIXED_UNITS.length ? (
                <>
                  <Check size={14} /> {lang === "am" ? "9/9 ሙሉ ተከፍሏል" : "9/9 All Paid"}
                </>
              ) : (
                <>
                  <Clock size={14} /> {paidCount} / 9 {lang === "am" ? "ተከፍሏል (ጠቅሰው ያዘምኑ)" : "Paid (Click all)"}
                </>
              )}
            </button>

            {/* Action Button: Approve Month (Security Code: 8998) */}
            {isMonthApproved ? (
              <div className="approved-seal-badge">
                <ShieldCheck size={15} style={{ color: "#34d399" }} />
                <span>{lang === "am" ? "ጸድቋል (Approved)" : "Approved"}</span>
                <button
                  type="button"
                  className="unlock-mini-btn"
                  onClick={handleUnlockMonth}
                  title="Unlock month (requires 8998)"
                >
                  <Unlock size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="approve-month-btn"
                className="simple-approve-btn"
                onClick={() => {
                  setApproveCodeInput("");
                  setApproveError("");
                  setApproveModalOpen(true);
                }}
                title="Confirm and lock with security code 8998"
              >
                <ShieldCheck size={15} /> {lang === "am" ? "ወሩን አጽድቅ (8998)" : "Approve (8998)"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. View Switcher Tabs (Simple & Minimal) ────────────────── */}
      <div className="simple-view-tabs">
        <button
          className={`simple-tab-btn ${viewMode === "monthly" ? "simple-tab-active" : ""}`}
          onClick={() => setViewMode("monthly")}
        >
          <Layers size={15} />
          <span>{lang === "am" ? `${curMonthObj.nameAm} - ክፍያዎች` : `${curMonthObj.nameEn} List`}</span>
        </button>

        <button
          className={`simple-tab-btn ${viewMode === "matrix" ? "simple-tab-active" : ""}`}
          onClick={() => setViewMode("matrix")}
        >
          <FileSpreadsheet size={15} />
          <span>{lang === "am" ? `${selectedYear} - 12 ወራት ሙሉ ሠንጠረዥ` : `${selectedYear} - 12 Months Matrix`}</span>
        </button>
      </div>

      {/* ─── 4. VIEW A: CLEAN MONTHLY TABLE ───────────────────────────── */}
      {viewMode === "monthly" && (
        <div className="simple-card">
          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Unit</th>
                  <th>Tenant / ተከራይ</th>
                  <th style={{ textAlign: "right" }}>Rent Amount</th>
                  <th>Partner Split Allocation</th>
                  <th style={{ textAlign: "center", width: 130 }}>Status</th>
                  <th style={{ textAlign: "center", width: 70 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentUnitRows.map((u) => {
                  const isPaid = u.status === "paid";
                  return (
                    <tr key={u.id} className="clean-row">
                      <td>
                        <span className="unit-pill">{u.room}</span>
                      </td>
                      <td>
                        <span className="tenant-title">
                          {lang === "am" ? u.nameAm : u.nameEn}
                        </span>
                        <span className="tenant-subtitle">
                          {lang === "am" ? u.nameEn : u.nameAm}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>
                        {fmt(u.rent)} <small style={{ color: "var(--text-muted)" }}>{t.etb}</small>
                      </td>
                      <td>
                        <div className="clean-split-box">
                          <span className="split-badge-clean">
                            {lang === "am" ? u.splitAm : u.splitEn}
                          </span>
                          <span className="split-detail-numbers">
                            {fmt(u.mesfin)} M / {fmt(u.zewdnesh)} Z
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <button
                            className={`pill-status-btn ${isPaid ? "pill-paid" : "pill-pending"}`}
                            onClick={() => toggleStatus(u.id)}
                            title="Click to toggle Paid/Pending"
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
                          {isPaid && u.date && (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                              <Calendar size={10} /> {u.date}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="clean-edit-btn"
                          onClick={() => openModal(u)}
                          title="Edit amount or details via dropdown"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="clean-total-row">
                  <td colSpan="2" style={{ fontWeight: 700 }}>
                    {lang === "am" ? "ጠቅላላ ወርሃዊ ድምር" : "Total Monthly Rent"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--indigo-light)", fontSize: "1.05rem" }}>
                    {fmt(totalRent)} {t.etb}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.85rem", color: "#a5b4fc" }}>
                      {fmt(totalMesfin)} M (63.8%) + {fmt(totalZewdnesh)} Z (36.2%)
                    </span>
                  </td>
                  <td colSpan="2" style={{ textAlign: "center", color: "var(--emerald)", fontWeight: 600 }}>
                    {paidCount} / {FIXED_UNITS.length} {lang === "am" ? "ተከፍሏል" : "Paid"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── 5. VIEW B: 12-MONTH MATRIX (Excel Sheet Style) ─────────────── */}
      {viewMode === "matrix" && (
        <div className="simple-card">
          <div className="table-responsive">
            <table className="clean-table matrix-clean-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>Unit & Tenant</th>
                  <th style={{ minWidth: 110 }}>Split</th>
                  {FIXED_ETHIOPIAN_MONTHS.map((m) => (
                    <th key={m.id} style={{ minWidth: 85, textAlign: "right" }}>
                      {lang === "am" ? m.nameAm : m.nameEn}
                    </th>
                  ))}
                  <th style={{ minWidth: 100, textAlign: "right", color: "var(--indigo-light)" }}>
                    {lang === "am" ? "ዓመታዊ" : "Annual"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {FIXED_UNITS.map((u) => {
                  let annualSum = 0;
                  return (
                    <tr key={u.id} className="clean-row">
                      <td>
                        <strong>{u.room}</strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {lang === "am" ? u.nameAm : u.nameEn}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {lang === "am" ? u.splitAm : u.splitEn}
                      </td>
                      {FIXED_ETHIOPIAN_MONTHS.map((m) => {
                        const p = currentSheet.months?.[m.id]?.[u.id] || { amount: u.defaultRent, status: "pending" };
                        annualSum += Number(p.amount) || 0;
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
                            {isP && <span style={{ color: "var(--emerald)", marginLeft: 2 }}>✓</span>}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--indigo-light)" }}>
                        {fmt(annualSum)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="clean-total-row">
                  <td colSpan="2" style={{ fontWeight: 700 }}>
                    {lang === "am" ? "ጠቅላላ ወርሃዊ ድምር" : "Monthly Total"}
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
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--indigo-light)" }}>
                    {fmt(totalRent * 12)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: RECORD PAYMENT (STRICT DROPDOWNS ONLY) ─────────── */}
      {recordModalOpen && (
        <div className="modal-overlay" onClick={() => setRecordModalOpen(false)}>
          <div className="simple-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{lang === "am" ? "የቤት ኪራይ ክፍያ መዝግብ" : "Record Rent Payment"}</h3>
              <button className="clean-close-btn" onClick={() => setRecordModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="clean-modal-form">
              {/* Year Dropdown */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "1. የበጀት ዓመት ሠንጠረዥ" : "1. Fiscal Year Sheet"}</label>
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

              {/* Month Dropdown */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "2. ወር ምረጥ" : "2. Month"}</label>
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

              {/* Unit Dropdown */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "3. ቋሚ ክፍል / ተከራይ" : "3. Fixed Unit / Tenant"}</label>
                <select
                  className="field-input"
                  value={formUnitId}
                  onChange={(e) => handleUnitSelect(e.target.value)}
                >
                  {FIXED_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.room} — {lang === "am" ? u.nameAm : u.nameEn} ({fmt(u.defaultRent)} ETB • {lang === "am" ? u.splitAm : u.splitEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "የኪራይ መጠን (ብር)" : "Rent Amount (ETB)"}</label>
                <input
                  type="number"
                  className="field-input"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  required
                  min="0"
                />
              </div>

              {/* Auto Split Summary */}
              <div className="clean-split-preview">
                <div className="split-prev-item">
                  <span>{lang === "am" ? "የመስፍን ድርሻ (Auto):" : "Mesfin (Auto):"}</span>
                  <strong style={{ color: "#818cf8" }}>{fmt(formAmount * modalUnitObj.mesfinRatio)} ETB</strong>
                </div>
                <div className="split-prev-item">
                  <span>{lang === "am" ? "የዘውድነሽ ድርሻ (Auto):" : "Zewdnesh (Auto):"}</span>
                  <strong style={{ color: "#c084fc" }}>{fmt(formAmount * modalUnitObj.zewdneshRatio)} ETB</strong>
                </div>
              </div>

              {/* Calendar Date Input */}
              <div className="field-group">
                <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={14} style={{ color: "var(--indigo-light)" }} /> {lang === "am" ? "የክፍያ ቀን (Calendar Date)" : "Payment Calendar Date"}
                </label>
                <input
                  type="date"
                  className="field-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              {/* Status Dropdown */}
              <div className="field-group">
                <label className="field-label">{lang === "am" ? "የክፍያ ሁኔታ" : "Payment Status"}</label>
                <select
                  className="field-input"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                >
                  <option value="paid">{lang === "am" ? "ተከፍሏል (Paid)" : "Paid"}</option>
                  <option value="pending">{lang === "am" ? "በመጠባበቅ ላይ (Pending)" : "Pending"}</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setRecordModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary w-full">
                  <Check size={16} /> {lang === "am" ? "አስቀምጥ" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADD NEW FISCAL YEAR SHEET ───────────────────────── */}
      {newYearModalOpen && (
        <div className="modal-overlay" onClick={() => setNewYearModalOpen(false)}>
          <div className="simple-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{lang === "am" ? "አዲስ ዓመት ሠንጠረዥ ፍጠር" : "New Fiscal Year Sheet"}</h3>
              <button className="clean-close-btn" onClick={() => setNewYearModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddYear} className="clean-modal-form">
              <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {lang === "am"
                  ? "አዲስ ዓመት ሲፈጠር በ9ኙም ቋሚ ክፍሎች እና በ12ቱ ወራት የተዘጋጀ አዲስ ሠንጠረዥ ይከፈታል።"
                  : "Generates a clean 12-month payment sheet for all 9 units in the new fiscal year."}
              </p>

              <div className="field-group">
                <label className="field-label">{lang === "am" ? "የበጀት ዓመት ስም" : "Fiscal Year Name"}</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. 2020 E.C. or 2021 E.C."
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setNewYearModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary w-full">
                  <FolderPlus size={16} /> {lang === "am" ? "ፍጠር" : "Create Sheet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: APPROVE MONTH SECURITY CODE MODAL (Code: 8998) ─── */}
      {approveModalOpen && (
        <div className="modal-overlay" onClick={() => setApproveModalOpen(false)}>
          <div className="simple-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={20} style={{ color: "var(--indigo-light)" }} />
                <h3 className="modal-title">
                  {lang === "am" ? "የወር ኪራይ ገቢን ማጽደቅ" : "Approve Monthly Rent Income"}
                </h3>
              </div>
              <button className="clean-close-btn" onClick={() => setApproveModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="clean-modal-form">
              <div className="clean-split-preview" style={{ flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>
                    {lang === "am" ? "የበጀት ዓመት / ወር:" : "Fiscal Month:"}
                  </span>
                  <strong>{curMonthObj.nameEn} ({curMonthObj.nameAm}) {selectedYear}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>
                    {lang === "am" ? "የሚጸድቀው ጠቅላላ ኪራይ:" : "Total Rent to Confirm:"}
                  </span>
                  <strong style={{ color: "var(--emerald)", fontSize: "1rem" }}>{fmt(totalRent)} ETB</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", paddingTop: 4, borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
                  <span style={{ color: "#818cf8" }}>{fmt(totalMesfin)} ETB (Mesfin)</span>
                  <span style={{ color: "#c084fc" }}>{fmt(totalZewdnesh)} ETB (Zewdnesh)</span>
                </div>
              </div>

              {approveError && (
                <div className="error-banner" style={{ marginTop: 4 }}>
                  {approveError}
                </div>
              )}

              <div className="field-group" style={{ marginTop: 6 }}>
                <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <KeyRound size={14} /> {lang === "am" ? "የማረጋገጫ ኮድ (Security Code)" : "Approval Security Code"}
                </label>
                <input
                  type="password"
                  className="field-input"
                  style={{ textAlign: "center", fontSize: "1.3rem", letterSpacing: "0.3em", fontWeight: 700 }}
                  placeholder="••••"
                  maxLength={4}
                  value={approveCodeInput}
                  onChange={(e) => {
                    setApproveCodeInput(e.target.value);
                    setApproveError("");
                  }}
                  autoFocus
                  required
                />
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", textAlign: "center", marginTop: 2 }}>
                  🔑 {lang === "am" ? "የማረጋገጫ ኮድ: 8998" : "Enter code: 8998 to confirm & lock"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setApproveModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  <Check size={16} /> {lang === "am" ? "አረጋግጥና አጽድቅ" : "Confirm & Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
