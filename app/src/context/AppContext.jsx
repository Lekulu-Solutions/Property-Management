import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import translations from "../i18n";

// ─── Language Context ────────────────────────────────────────────────────────
export const LangContext = createContext(null);
export function useLang() {
  return useContext(LangContext);
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const t = translations[lang];
  const toggle = () => {
    const next = lang === "en" ? "am" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
  };
  return (
    <LangContext.Provider value={{ lang, t, toggle }}>
      {children}
    </LangContext.Provider>
  );
}

// ─── Auth Context ────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const savedDemo = localStorage.getItem("demo_user");
    if (savedDemo) {
      try {
        setUser(JSON.parse(savedDemo));
        return;
      } catch {
        localStorage.removeItem("demo_user");
      }
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!localStorage.getItem("demo_user")) {
        setUser(u || null);
      }
    });
    return unsub;
  }, []);

  const loginDemo = (email = "admin@lekulu.com", displayName = "Administrator") => {
    const demoUser = {
      uid: "demo-admin-lekulu",
      email: email,
      displayName: displayName,
      isDemo: true,
    };
    localStorage.setItem("demo_user", JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = async () => {
    localStorage.removeItem("demo_user");
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Sign out error", e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
