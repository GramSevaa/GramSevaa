import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { setToken } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = useMemo(() => location.state?.redirectTo || "/admin/users", [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(data.token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Admin Login</h1>
        <form onSubmit={onSubmit} className="stack">
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="muted small">
          Use the seeded admin from server .env (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
        </div>
      </div>
    </div>
  );
}

