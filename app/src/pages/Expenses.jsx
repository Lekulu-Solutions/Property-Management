import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../context/AppContext";
import { Plus, Pencil, Trash2, X, Check, ShoppingCart, Receipt } from "lucide-react";

const CATEGORIES = {
  groceries: { en: "Groceries / አስቤዛ", icon: "🛒" },
  utilities: { en: "Utilities / አገልግሎቶች", icon: "💡" },
  maintenance: { en: "Maintenance / ጥገና", icon: "🔧" },
  tax: { en: "Tax / ግብር", icon: "📋" },
  other: { en: "Other / ሌላ", icon: "📦" },
};

const INITIAL_GROCERIES = [
  { description: "5L ዘይት / Cooking Oil (5L)", amount: 2000, category: "groceries" },
  { description: "ጨው / Salt", amount: 70, category: "groceries" },
  { description: "ስኳር / Sugar", amount: 530, category: "groceries" },
  { description: "ድፍን ምስር / Whole Brown Lentils", amount: 0, category: "groceries" },
  { description: "ክክ ምስር / Split Red Lentils", amount: 0, category: "groceries" },
  { description: "ድንች / Potatoes", amount: 65, category: "groceries" },
];

export default function Expenses() {
  const { t } = useLang();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [form, setForm] = useState({ description: "", amount: "", category: "groceries" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "expenses"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setExpenses(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function seedGroceries() {
    setSeeding(true);
    for (const item of INITIAL_GROCERIES) {
      await addDoc(collection(db, "expenses"), {
        ...item,
        createdAt: serverTimestamp(),
      });
    }
    setSeeding(false);
  }

  function resetForm() {
    setForm({ description: "", amount: "", category: "groceries" });
    setEditId(null);
    setShowForm(false);
  }

  async function handleSave() {
    const amount = parseFloat(form.amount);
    if (!form.description) return;
    const payload = {
      description: form.description,
      amount: isNaN(amount) ? 0 : amount,
      category: form.category,
      updatedAt: serverTimestamp(),
    };
    if (editId) {
      await updateDoc(doc(db, "expenses", editId), payload);
    } else {
      await addDoc(collection(db, "expenses"), { ...payload, createdAt: serverTimestamp() });
    }
    resetForm();
  }

  function startEdit(entry) {
    setForm({ description: entry.description, amount: String(entry.amount || ""), category: entry.category || "other" });
    setEditId(entry.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, "expenses", id));
    setDeleteTarget(null);
  }

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered =
    activeTab === "all"
      ? expenses
      : expenses.filter((e) => e.category === activeTab);

  const totalAll = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.expensesTitle}</h1>
          <p className="page-subtitle">{t.expensesSubtitle}</p>
        </div>
        <div className="header-actions">
          {expenses.length === 0 && (
            <button className="btn-ghost" onClick={seedGroceries} disabled={seeding}>
              <ShoppingCart size={15} /> Import from Excel
            </button>
          )}
          <button id="add-expense-btn" className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> {t.addExpense}
          </button>
        </div>
      </div>

      {/* Total Card */}
      <div className="expense-total-card">
        <Receipt size={28} className="expense-total-icon" />
        <div>
          <p className="stat-label">{t.totalExpenses}</p>
          <h2 className="expense-total-value">{fmt(totalAll)} {t.etb}</h2>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="tabs">
        {[["all", "All / ሁሉም", "🗂️"], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.en, v.icon])].map(
          ([key, label, icon]) => (
            <button
              key={key}
              className={`tab ${activeTab === key ? "tab--active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {icon} {label}
            </button>
          )
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3 className="form-title">{editId ? t.edit : t.addExpense}</h3>
          <div className="form-row">
            <div className="field-group field-group--grow">
              <label className="field-label">{t.item}</label>
              <input
                className="field-input"
                placeholder={t.description}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.price}</label>
              <input
                className="field-input"
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.category}</label>
              <select
                className="field-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.en}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-ghost" onClick={resetForm}><X size={15} /> {t.cancel}</button>
            <button className="btn-primary" onClick={handleSave}><Check size={15} /> {t.save}</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <p className="modal-msg">{t.deleteConfirm}</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>{t.cancel}</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteTarget)}>{t.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>{t.noData}</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            <Plus size={15} /> {t.addFirst}
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-count">{filtered.length} items</span>
            <span className="table-subtotal">{t.total}: <strong>{fmt(totalFiltered)} {t.etb}</strong></span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.item}</th>
                <th>{t.category}</th>
                <th className="text-right">{t.price}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="table-row">
                  <td>{e.description}</td>
                  <td>
                    <span className="badge badge--blue">
                      {CATEGORIES[e.category]?.icon} {CATEGORIES[e.category]?.en || e.category}
                    </span>
                  </td>
                  <td className="text-right font-mono">
                    {e.amount ? fmt(e.amount) : <span className="muted">—</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(e)}><Pencil size={14} /></button>
                      <button className="icon-btn icon-btn--danger" onClick={() => setDeleteTarget(e.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-foot">
                <td colSpan={2}>{t.total}</td>
                <td className="text-right font-mono">{fmt(totalFiltered)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
