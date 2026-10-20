import { BrowserRouter } from "react-router-dom";
import { AuthProvider, LangProvider, useAuth } from "./context/AppContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";

function AppGate() {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="page-loading">
        <span className="spinner" />
      </div>
    );
  }
  return user ? <Layout /> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
