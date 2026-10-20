import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../context/AppContext";
import { Plus, Pencil, Trash2, X, Check, TrendingUp, TrendingDown, Calendar } from "lucide-react";

// partner = "mesfin" | "zewdnesh"
export default function AccountLedger({ partner }) {
  const { t } = useLang();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "deposit",
    month: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const colName = partner === "mesfin" ? "mesfin_account" : "zewdnesh_account";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, colName), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [colName]);

  // Compute running balance
  const withBalance = entries.reduce((acc, entry) => {
    const prev = acc.length ? acc[acc.length - 1].runBalance : 0;
    const delta = entry.type === "deduction" ? -Math.abs(entry.amount || 0) : Math.abs(entry.amount || 0);
    return [...acc, { ...entry, runBalance: prev + delta }];
  }, []);

  const totalBalance = withBalance.length ? withBalance[withBalance.length - 1].runBalance : 0;
  const totalDeposits = entries.filter((e) => e.type === "deposit").reduce((s, e) => s + (e.amount || 0), 0);
  const totalDeductions = entries.filter((e) => e.type === "deduction").reduce((s, e) => s + Math.abs(e.amount || 0), 0);

  function resetForm() {
    setForm({
      description: "",
      amount: "",
      type: "deposit",
      month: "",
      date: new Date().toISOString().split("T")[0],
    });
    setEditId(null);
    setShowForm(false);
  }

  async function handleSave() {
    const amount = parseFloat(form.amount);
    if (!form.description || isNaN(amount)) return;
    const dateVal = form.date || new Date().toISOString().split("T")[0];
    const payload = {
      description: form.description,
      amount: Math.abs(amount),
      type: form.type,
      month: form.month,
      date: dateVal,
      order: editId
        ? (entries.find((e) => e.id === editId)?.order || 0)
        : entries.length,
      updatedAt: serverTimestamp(),
    };
    if (editId) {
      await updateDoc(doc(db, colName, editId), payload);
    } else {
      await addDoc(collection(db, colName), { ...payload, createdAt: serverTimestamp() });
    }
    resetForm();
  }

  function startEdit(entry) {
    const defaultDate = entry.date || (entry.createdAt?.toDate ? entry.createdAt.toDate().toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setForm({
      description: entry.description,
      amount: String(entry.amount),
      type: entry.type,
      month: entry.month || "",
      date: defaultDate,
    });
    setEditId(entry.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, colName, id));
    setDeleteTarget(null);
  }

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const partnerLabel = partner === "mesfin" ? t.mesfin : t.zewdnesh;
  const accentClass = partner === "mesfin" ? "accent-indigo" : "accent-cyan";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className={`partner-badge ${accentClass}`}>{partnerLabel}</span>{" "}
            {t.accountTitle}
          </h1>
        </div>
        <button
          id={`add-entry-${partner}`}
          className="btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} /> {t.addEntry}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid stats-grid--3">
        <div className="stat-card stat-card--indigo">
          <TrendingUp size={20} className="stat-icon-sm" />
          <div>
            <p className="stat-label">{t.deposit}</p>
            <h3 className="stat-value">{fmt(totalDeposits)} {t.etb}</h3>
          </div>
        </div>
        <div className="stat-card stat-card--rose">
          <TrendingDown size={20} className="stat-icon-sm" />
          <div>
            <p className="stat-label">{t.deduction}</p>
            <h3 className="stat-value">{fmt(totalDeductions)} {t.etb}</h3>
          </div>
        </div>
        <div className={`stat-card ${totalBalance >= 0 ? "stat-card--emerald" : "stat-card--rose"}`}>
          <div>
            <p className="stat-label">{t.balance}</p>
            <h3 className="stat-value">{fmt(totalBalance)} {t.etb}</h3>
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3 className="form-title">{editId ? t.edit : t.addEntry}</h3>
          <div className="form-row">
            <div className="field-group">
              <label className="field-label">{t.month}</label>
              <input
                className="field-input"
                placeholder="e.g. Hamle 2018"
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.type}</label>
              <select
                className="field-input"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="deposit">{t.deposit}</option>
                <option value="deduction">{t.deduction}</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field-group field-group--grow">
              <label className="field-label">{t.description}</label>
              <input
                className="field-input"
                placeholder={t.description}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={14} style={{ color: "var(--indigo-light)" }} /> {t.calendarDate || "Calendar Date"}
              </label>
              <input
                className="field-input"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.amount}</label>
              <input
                className="field-input"
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-ghost" onClick={resetForm}>
              <X size={15} /> {t.cancel}
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <Check size={15} /> {t.save}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <p className="modal-msg">{t.deleteConfirm}</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>
                {t.cancel}
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteTarget)}>
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : withBalance.length === 0 ? (
        <div className="empty-state">
          <p>{t.noData}</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            <Plus size={15} /> {t.addFirst}
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.month}</th>
                <th>{t.date || "Date / ቀን"}</th>
                <th>{t.description}</th>
                <th>{t.type}</th>
                <th className="text-right">{t.amount}</th>
                <th className="text-right">{t.runningBalance}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {withBalance.map((entry) => (
                <tr key={entry.id} className="table-row">
                  <td className="td-month">{entry.month || "—"}</td>
                  <td>
                    <span className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      <Calendar size={12} /> {entry.date || "—"}
                    </span>
                  </td>
                  <td>{entry.description}</td>
                  <td>
                    <span className={`badge ${entry.type === "deposit" ? "badge--green" : "badge--red"}`}>
                      {entry.type === "deposit" ? t.deposit : t.deduction}
                    </span>
                  </td>
                  <td className={`text-right font-mono ${entry.type === "deposit" ? "text-green" : "text-red"}`}>
                    {entry.type === "deposit" ? "+" : "−"}{fmt(entry.amount)}
                  </td>
                  <td className={`text-right font-mono ${entry.runBalance >= 0 ? "text-green" : "text-red"}`}>
                    {fmt(entry.runBalance)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(entry)} title={t.edit}>
                        <Pencil size={14} />
                      </button>
                      <button className="icon-btn icon-btn--danger" onClick={() => setDeleteTarget(entry.id)} title={t.delete}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-foot">
                <td colSpan={4}>{t.total}</td>
                <td className="text-right font-mono">{fmt(totalDeposits - totalDeductions)}</td>
                <td className={`text-right font-mono ${totalBalance >= 0 ? "text-green" : "text-red"}`}>
                  {fmt(totalBalance)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
