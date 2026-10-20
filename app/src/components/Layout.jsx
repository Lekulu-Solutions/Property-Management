import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./Sidebar";
import Dashboard from "../pages/Dashboard";
import MonthlyRents from "../pages/MonthlyRents";
import AccountLedger from "../pages/AccountLedger";
import Expenses from "../pages/Expenses";
import DistributionCalc from "../pages/DistributionCalc";
import Settings from "../pages/Settings";
import CashFlowBetoch from "../pages/CashFlowBetoch";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cashflow" element={<CashFlowBetoch />} />
          <Route path="/betoch" element={<CashFlowBetoch />} />
          <Route path="/rents" element={<MonthlyRents />} />
          <Route path="/mesfin" element={<AccountLedger partner="mesfin" />} />
          <Route path="/zewdnesh" element={<AccountLedger partner="zewdnesh" />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/distribution" element={<DistributionCalc />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
