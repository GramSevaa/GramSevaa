import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { setToken } from "../lib/auth";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("resident");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role })
      });
      setToken(data.token);
      navigate(role === "provider" ? "/provider/services" : "/services", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card stack">
        <div className="row space">
          <h1>Create account</h1>
          <Link className="btn secondary" to="/login">
            Login
          </Link>
        </div>

        <form onSubmit={onSubmit} className="stack">
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <label className="field">
            <span>Account type</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="resident">Resident</option>
              <option value="provider">Service Provider</option>
            </select>
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

