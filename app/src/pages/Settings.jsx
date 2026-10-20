import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useLang, useAuth } from "../context/AppContext";
import { Globe, LogOut, User, Shield, Info } from "lucide-react";

export default function Settings() {
  const { t, lang, toggle } = useLang();
  const { user, logout } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.settings}</h1>
          <p className="page-subtitle">App preferences and account info</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Language */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Globe size={20} className="settings-icon settings-icon--indigo" />
            <div>
              <h3 className="settings-card-title">Language / ቋንቋ</h3>
              <p className="settings-card-sub">Toggle between English and Amharic</p>
            </div>
          </div>
          <div className="lang-toggle-row">
            <span className={lang === "en" ? "lang-active" : "lang-inactive"}>English</span>
            <button
              id="lang-toggle-btn"
              className={`toggle-btn ${lang === "am" ? "toggle-btn--on" : ""}`}
              onClick={toggle}
            >
              <span className="toggle-knob" />
            </button>
            <span className={lang === "am" ? "lang-active" : "lang-inactive"}>አማርኛ</span>
          </div>
        </div>

        {/* Account Info */}
        <div className="settings-card">
          <div className="settings-card-header">
            <User size={20} className="settings-icon settings-icon--violet" />
            <div>
              <h3 className="settings-card-title">Account / መለያ</h3>
              <p className="settings-card-sub">Signed-in user information</p>
            </div>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Email</span>
            <span className="settings-info-value">{user?.email || "—"}</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">UID</span>
            <span className="settings-info-value muted">{user?.uid?.slice(0, 12)}...</span>
          </div>
          <button
            id="sign-out-btn"
            className="btn-danger w-full mt-4"
            onClick={() => (logout ? logout() : signOut(auth))}
          >
            <LogOut size={15} /> {t.logout}
          </button>
        </div>

        {/* Firebase Setup */}
        <div className="settings-card settings-card--wide">
          <div className="settings-card-header">
            <Shield size={20} className="settings-icon settings-icon--cyan" />
            <div>
              <h3 className="settings-card-title">Firebase Setup Guide</h3>
              <p className="settings-card-sub">How to connect your Firebase project</p>
            </div>
          </div>
          <ol className="setup-steps">
            <li>
              Go to{" "}
              <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="link">
                console.firebase.google.com
              </a>{" "}
              and create a new project.
            </li>
            <li>In <strong>Authentication</strong> → Enable <em>Email/Password</em> sign-in, then add a user.</li>
            <li>In <strong>Firestore Database</strong> → Create database in production mode.</li>
            <li>
              In <strong>Project Settings → Your apps</strong> → Add a web app, copy the config object.
            </li>
            <li>
              Paste it into{" "}
              <code className="code-inline">src/firebase.js</code> replacing the placeholder values.
            </li>
            <li>
              Set Firestore rules to allow authenticated reads/writes:
              <pre className="code-block">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
            </li>
          </ol>
        </div>

        {/* App Info */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Info size={20} className="settings-icon settings-icon--amber" />
            <div>
              <h3 className="settings-card-title">About</h3>
            </div>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">App</span>
            <span className="settings-info-value">Lekulu Property Management</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Version</span>
            <span className="settings-info-value">1.0.0</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Stack</span>
            <span className="settings-info-value">React + Vite + Firebase</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Data Source</span>
            <span className="settings-info-value">Data.xlsx (Firestore-synced)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
