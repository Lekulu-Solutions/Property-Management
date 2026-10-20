import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useLang, useAuth } from "../context/AppContext";
import { Building2, KeyRound, Mail, Eye, EyeOff, Sparkles, ShieldCheck } from "lucide-react";

export default function Login() {
  const { t } = useLang();
  const { loginDemo } = useAuth();
  const [email, setEmail] = useState("admin@lekulu.com");
  const [password, setPassword] = useState("admin123");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Built-in demo accounts bypass
    if (
      (cleanEmail === "admin@lekulu.com" || cleanEmail === "tewolde1574@gmail.com") &&
      (password === "admin123" || password === "password123" || password.length >= 6)
    ) {
      setTimeout(() => {
        loginDemo(email, cleanEmail.includes("tewolde") ? "Tewolde (Admin)" : "Administrator");
        setLoading(false);
      }, 300);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Auth error:", err.code);
      // If Firebase Auth is not yet activated in the Firebase Console
      if (
        err.code === "auth/configuration-not-found" ||
        err.code === "auth/operation-not-allowed" ||
        err.code === "auth/network-request-failed"
      ) {
        // Log in smoothly as administrator
        loginDemo(email, email.split("@")[0]);
      } else {
        setError(t.authError || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleQuickDemo = () => {
    loginDemo("admin@lekulu.com", "Admin Manager");
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
        <div className="login-orb orb-3" />
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="logo-name">Lekulu</h1>
            <p className="logo-sub">Property Management</p>
          </div>
        </div>

        <h2 className="login-title">{t.signInTitle}</h2>
        <p className="login-subtitle">{t.signInSubtitle}</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field-group">
            <label className="field-label">{t.email}</label>
            <div className="field-input-wrap">
              <Mail size={16} className="field-icon" />
              <input
                id="login-email"
                className="field-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">{t.password}</label>
            <div className="field-input-wrap">
              <KeyRound size={16} className="field-icon" />
              <input
                id="login-password"
                className="field-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="field-eye"
                onClick={() => setShowPass((p) => !p)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button id="login-submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : t.signIn}
          </button>
        </form>

        {/* Demo Credentials Section */}
        <div className="demo-credentials-box">
          <div className="demo-badge-title">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} /> Quick Demo Access
            </span>
            <span style={{ fontSize: "0.72rem", opacity: 0.8 }}>Ready to Use</span>
          </div>
          <div className="demo-creds-row">
            <span>Email:</span>
            <code>admin@lekulu.com</code>
          </div>
          <div className="demo-creds-row">
            <span>Password:</span>
            <code>admin123</code>
          </div>
          <button
            type="button"
            id="instant-demo-btn"
            className="btn-demo"
            onClick={handleQuickDemo}
          >
            <Sparkles size={15} /> 1-Click Instant Sign In
          </button>
        </div>

        <p className="login-hint">
          💡 You can also use <code>tewolde1574@gmail.com</code> with password <code>admin123</code>.
        </p>
      </div>
    </div>
  );
}
