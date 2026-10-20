import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../context/AppContext";
import { Calculator, CheckCircle2, XCircle, Save } from "lucide-react";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-ET", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DistributionCalc() {
  const { t } = useLang();
  const [gross, setGross] = useState("");
  const [shared, setShared] = useState("");
  const [mesfin, setMesfin] = useState("60");
  const [zewdnesh, setZewdnesh] = useState("40");
  const [monthLabel, setMonthLabel] = useState("");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);

  function handleMesfinChange(val) {
    const n = parseFloat(val) || 0;
    setMesfin(String(n));
    setZewdnesh(String(Math.max(0, 100 - n)));
  }

  function handleZewdneshChange(val) {
    const n = parseFloat(val) || 0;
    setZewdnesh(String(n));
    setMesfin(String(Math.max(0, 100 - n)));
  }

  function calculate() {
    const G = parseFloat(gross) || 0;
    const S = parseFloat(shared) || 0;
    const mRatio = parseFloat(mesfin) / 100 || 0;
    const zRatio = parseFloat(zewdnesh) / 100 || 0;

    const netTotal = G - S;
    const mesfin_net = netTotal * mRatio;
    const zewdnesh_net = netTotal * zRatio;
    const check = Math.round((mesfin_net + zewdnesh_net) * 100) === Math.round(netTotal * 100);

    setResult({ netTotal, mesfin_net, zewdnesh_net, check, mRatio, zRatio, G, S });
    setSaved(false);
  }

  async function saveToFirestore() {
    if (!result) return;
    await addDoc(collection(db, "monthly_overview"), {
      monthLabel: monthLabel || "Unnamed Month",
      grossIncome: result.G,
      sharedExpenses: result.S,
      netTotal: result.netTotal,
      mesfin: result.mesfin_net,
      zewdnesh: result.zewdnesh_net,
      mesfinRatio: result.mRatio,
      zewdneshRatio: result.zRatio,
      auditOk: result.check,
      order: Date.now(),
      createdAt: serverTimestamp(),
    });
    setSaved(true);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.calcTitle}</h1>
          <p className="page-subtitle">{t.calcSubtitle}</p>
        </div>
        <div className="calc-icon-wrap">
          <Calculator size={32} className="calc-icon" />
        </div>
      </div>

      <div className="calc-layout">
        {/* Input Panel */}
        <div className="calc-panel">
          <h2 className="panel-title">📥 Input</h2>
          <div className="field-group">
            <label className="field-label">Month Label</label>
            <input
              id="calc-month"
              className="field-input"
              placeholder="e.g. Hamle 2018"
              value={monthLabel}
              onChange={(e) => setMonthLabel(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{t.grossIncome}</label>
            <input
              id="calc-gross"
              className="field-input field-input--big"
              type="number"
              placeholder="0.00"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{t.sharedExpenses}</label>
            <input
              id="calc-shared"
              className="field-input field-input--big"
              type="number"
              placeholder="0.00"
              value={shared}
              onChange={(e) => setShared(e.target.value)}
            />
          </div>

          {/* Ratio sliders */}
          <div className="ratio-group">
            <div className="ratio-label">
              <span>👤 {t.mesfin}</span>
              <span className="ratio-pct">{mesfin}%</span>
            </div>
            <input
              id="calc-mesfin-ratio"
              type="range"
              min="0"
              max="100"
              value={mesfin}
              onChange={(e) => handleMesfinChange(e.target.value)}
              className="slider slider--indigo"
            />
            <div className="ratio-label">
              <span>👤 {t.zewdnesh}</span>
              <span className="ratio-pct">{zewdnesh}%</span>
            </div>
            <input
              id="calc-zewdnesh-ratio"
              type="range"
              min="0"
              max="100"
              value={zewdnesh}
              onChange={(e) => handleZewdneshChange(e.target.value)}
              className="slider slider--cyan"
            />
            <div className="ratio-bar">
              <div className="ratio-bar-mesfin" style={{ width: `${mesfin}%` }} />
              <div className="ratio-bar-zewdnesh" style={{ width: `${zewdnesh}%` }} />
            </div>
          </div>

          <button id="calc-submit" className="btn-primary w-full" onClick={calculate}>
            <Calculator size={16} /> {t.calculate}
          </button>
        </div>

        {/* Result Panel */}
        <div className="calc-panel">
          <h2 className="panel-title">📤 {t.netIncome}</h2>

          {!result ? (
            <div className="calc-empty">
              <Calculator size={48} className="calc-empty-icon" />
              <p>Enter values and click Calculate</p>
            </div>
          ) : (
            <>
              <div className="result-card result-card--total">
                <p className="result-label">{t.netIncome}</p>
                <h3 className="result-value">{fmt(result.netTotal)} {t.etb}</h3>
              </div>
              <div className="results-row">
                <div className="result-card result-card--indigo">
                  <p className="result-label">👤 {t.mesfin} ({(result.mRatio * 100).toFixed(1)}%)</p>
                  <h3 className="result-value">{fmt(result.mesfin_net)} {t.etb}</h3>
                </div>
                <div className="result-card result-card--cyan">
                  <p className="result-label">👤 {t.zewdnesh} ({(result.zRatio * 100).toFixed(1)}%)</p>
                  <h3 className="result-value">{fmt(result.zewdnesh_net)} {t.etb}</h3>
                </div>
              </div>

              {/* Audit */}
              <div className={`audit-card ${result.check ? "audit-ok" : "audit-fail"}`}>
                {result.check ? (
                  <><CheckCircle2 size={20} /> {t.auditCheck} — {t.passed}</>
                ) : (
                  <><XCircle size={20} /> {t.auditCheck} — {t.failed}</>
                )}
              </div>

              {/* Formula breakdown */}
              <div className="formula-box">
                <p className="formula-title">Breakdown</p>
                <p className="formula-line">
                  Net = {fmt(result.G)} − {fmt(result.S)} = <strong>{fmt(result.netTotal)}</strong>
                </p>
                <p className="formula-line">
                  {t.mesfin} = {fmt(result.netTotal)} × {(result.mRatio * 100).toFixed(0)}% = <strong>{fmt(result.mesfin_net)}</strong>
                </p>
                <p className="formula-line">
                  {t.zewdnesh} = {fmt(result.netTotal)} × {(result.zRatio * 100).toFixed(0)}% = <strong>{fmt(result.zewdnesh_net)}</strong>
                </p>
              </div>

              {/* Save to Firestore */}
              <div className="field-group">
                {saved ? (
                  <div className="save-success">
                    <CheckCircle2 size={16} /> Saved to Dashboard!
                  </div>
                ) : (
                  <button id="calc-save" className="btn-secondary w-full" onClick={saveToFirestore}>
                    <Save size={15} /> Save to Monthly Overview
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
