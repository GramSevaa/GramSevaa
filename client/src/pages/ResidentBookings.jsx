import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { clearToken } from "../lib/auth";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function ResidentBookings() {
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const message = location.state?.message || "";

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

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
    if (!me || me.role !== "resident") return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/api/bookings/mine");
        if (!cancelled) setBookings(data.bookings || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load bookings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [me]);

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
          <h1>My Bookings</h1>
          <div className="error">{meError}</div>
          <Link className="btn" to="/login" state={{ redirectTo: "/resident/bookings" }}>
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (me?.role !== "resident") {
    return (
      <div className="page">
        <div className="card stack">
          <h1>Forbidden</h1>
          <div className="muted">Only residents can access this page.</div>
          <button className="btn secondary" type="button" onClick={logout}>
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
            <h1>My Bookings</h1>
            <div className="muted small">Signed in as {me.email}</div>
          </div>
          <div className="row">
            <Link className="btn secondary" to="/services">
              Browse
            </Link>
            <Link className="btn secondary" to="/book">
              New booking
            </Link>
            <button className="btn secondary" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {message ? <div className="pill">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Service</th>
                <th>When</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Loading...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No bookings yet
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.provider?.name || "—"}</td>
                    <td>{b.service?.title || "—"}</td>
                    <td>{b.startAt ? formatDateTime(b.startAt) : "—"}</td>
                    <td>{b.durationMinutes ? `${b.durationMinutes} min` : "—"}</td>
                    <td>{b.status}</td>
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

