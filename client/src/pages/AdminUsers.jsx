import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { clearToken } from "../lib/auth";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function AdminUsers() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const canAccess = useMemo(() => me?.role === "admin" && me?.isActive, [me]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingMe(true);
      setMeError("");
      try {
        const data = await apiFetch("/api/auth/me");
        if (!cancelled) setMe(data.user);
      } catch (err) {
        if (!cancelled) setMeError(err.message || "Not signed in");
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search.trim()) params.set("search", search.trim());
        const data = await apiFetch(`/api/admin/users?${params.toString()}`);
        if (cancelled) return;
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [canAccess, page, search]);

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  async function updateUser(id, patch) {
    const data = await apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
  }

  if (loadingMe) {
    return (
      <div className="page">
        <div className="card">Loading...</div>
      </div>
    );
  }

  if (meError) {
    return (
      <div className="page">
        <div className="card stack">
          <h1>Admin User Management</h1>
          <div className="error">{meError}</div>
          <Link className="btn" to="/login">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="page">
        <div className="card stack">
          <h1>Forbidden</h1>
          <div className="muted">Only admins can access this dashboard.</div>
          <button className="btn" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card stack">
        <div className="row space">
          <div>
            <h1>Admin User Management</h1>
            <div className="muted small">
              Signed in as {me.email} • Total users: {total}
            </div>
          </div>
          <button className="btn secondary" type="button" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="row space">
          <input
            className="input"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name or email"
          />
          <div className="row">
            <button className="btn secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <div className="pill">
              Page {page} / {totalPages}
            </div>
            <button
              className="btn secondary"
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="select"
                        value={u.role}
                        onChange={async (e) => {
                          const role = e.target.value;
                          try {
                            await updateUser(u.id, { role });
                          } catch (err) {
                            setError(err.message || "Failed to update role");
                          }
                        }}
                      >
                        <option value="resident">Resident</option>
                        <option value="provider">Provider</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={u.isActive ? "active" : "inactive"}
                        onChange={async (e) => {
                          const isActive = e.target.value === "active";
                          try {
                            await updateUser(u.id, { isActive });
                          } catch (err) {
                            setError(err.message || "Failed to update status");
                          }
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Deactivated</option>
                      </select>
                    </td>
                    <td className="muted">{formatDate(u.createdAt)}</td>
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

