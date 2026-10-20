import { NavLink } from "react-router-dom";
import { useLang } from "../context/AppContext";
import {
  LayoutDashboard, Home, Wallet, Users, ShoppingBasket,
  Calculator, Settings, Building2, Globe,
} from "lucide-react";

export default function Sidebar({ collapsed, onToggle }) {
  const { t, lang, toggle } = useLang();

  const links = [
    { to: "/", icon: LayoutDashboard, label: t.dashboard },
    { to: "/rents", icon: Home, label: t.monthlyRents },
    { to: "/mesfin", icon: Wallet, label: t.mesfin },
    { to: "/zewdnesh", icon: Users, label: t.zewdnesh },
    { to: "/expenses", icon: ShoppingBasket, label: t.expenses },
    { to: "/distribution", icon: Calculator, label: t.calculator },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Building2 size={22} />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-app-name">{t.appName}</span>
          </div>
        )}
        <button className="sidebar-collapse-btn" onClick={onToggle} title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
          </svg>
        </button>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link--active" : ""}`
            }
          >
            <Icon size={18} className="nav-icon" />
            {!collapsed && <span className="nav-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button
          id="lang-toggle-sidebar"
          className="nav-link lang-btn"
          onClick={toggle}
          title="Toggle Language"
        >
          <Globe size={18} className="nav-icon" />
          {!collapsed && (
            <span className="nav-label">{lang === "en" ? "አማርኛ" : "English"}</span>
          )}
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-link ${isActive ? "nav-link--active" : ""}`
          }
        >
          <Settings size={18} className="nav-icon" />
          {!collapsed && <span className="nav-label">{t.settings}</span>}
        </NavLink>
      </div>
    </aside>
  );
}
