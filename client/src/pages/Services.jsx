import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { clearToken } from "../lib/auth";

function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "";
  return n <= 0 ? "—" : `₹${n}`;
}

export default function Services() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [services, setServices] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await apiFetch("/api/auth/me");
        if (!cancelled) setMe(data.user);
      } catch {
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    clearToken();
    setMe(null);
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search.trim()) params.set("search", search.trim());
        const data = await apiFetch(`/api/services?${params.toString()}`);
        if (cancelled) return;
        setServices(data.services || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load services");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  return (
    <div className="page">
      <div className="card stack">
        <div className="row space">
          <h1>Find Services</h1>
          <div className="row">
            {me ? (
              <>
                {me.role === "provider" ? (
                  <Link className="btn secondary" to="/provider/services">
                    Provider
                  </Link>
                ) : null}
                {me.role === "admin" ? (
                  <Link className="btn secondary" to="/admin/users">
                    Admin
                  </Link>
                ) : null}
                <button className="btn secondary" type="button" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="btn secondary" to="/register">
                  Register
                </Link>
                <Link className="btn secondary" to="/login">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="row space">
          <input
            className="input"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search services (title, category, location)"
          />
          <div className="row">
            <button className="btn secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <div className="pill">
              Page {page} / {totalPages}
            </div>
            <button className="btn secondary" type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Location</th>
                <th>Price</th>
                <th>Provider</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Loading...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No services found. Create a provider account and add a service from Provider dashboard.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div>{s.title}</div>
                      {s.description ? <div className="muted small">{s.description}</div> : null}
                    </td>
                    <td>{s.category}</td>
                    <td>{s.location || "—"}</td>
                    <td>{formatMoney(s.price)}</td>
                    <td>
                      {s.provider?.id ? (
                        <Link className="muted" style={{ textDecoration: "underline" }} to={`/providers/${s.provider.id}`}>
                          {s.provider.name}
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ width: 120 }}>
                      <Link className="btn" to={`/book?providerId=${encodeURIComponent(s.provider?.id || "")}&serviceId=${encodeURIComponent(s.id)}`}>
                        Book
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
