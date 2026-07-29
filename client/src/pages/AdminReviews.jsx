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

export default function AdminReviews() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);

  const [provider, setProvider] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [rating, setRating] = useState("");

  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
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
        if (provider.trim()) params.set("provider", provider.trim());
        if (reviewer.trim()) params.set("reviewer", reviewer.trim());
        if (rating) params.set("rating", rating);
        const data = await apiFetch(`/api/admin/reviews?${params.toString()}`);
        if (cancelled) return;
        setReviews(data.reviews || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load reviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [canAccess, page, provider, reviewer, rating]);

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  async function deleteReview(r) {
    const ok = window.confirm("Delete this review? This will remove it from public view.");
    if (!ok) return;
    setError("");
    try {
      await apiFetch(`/api/admin/reviews/${r.id}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((x) => x.id !== r.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err.message || "Failed to delete review");
    }
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
          <h1>Admin Review Moderation</h1>
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
            <h1>Admin Review Moderation</h1>
            <div className="muted small">
              Signed in as {me.email} • Total reviews: {total}
            </div>
          </div>
          <div className="row">
            <Link className="btn secondary" to="/admin/users">
              Users
            </Link>
            <button className="btn secondary" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="row" style={{ alignItems: "stretch" }}>
          <label className="field" style={{ flex: 1 }}>
            <span>Provider id</span>
            <input
              value={provider}
              onChange={(e) => {
                setPage(1);
                setProvider(e.target.value);
              }}
              placeholder="ObjectId"
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Reviewer id</span>
            <input
              value={reviewer}
              onChange={(e) => {
                setPage(1);
                setReviewer(e.target.value);
              }}
              placeholder="ObjectId"
            />
          </label>
          <label className="field" style={{ width: 180 }}>
            <span>Rating</span>
            <select
              className="select"
              value={rating}
              onChange={(e) => {
                setPage(1);
                setRating(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </label>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              setProvider("");
              setReviewer("");
              setRating("");
              setPage(1);
            }}
          >
            Clear
          </button>
        </div>

        <div className="row space">
          <div className="muted small">Latest first</div>
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
                <th>Provider</th>
                <th>Reviewer</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Loading reviews...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No reviews found
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>{r.provider?.name || "—"}</div>
                      <div className="muted small">{r.provider?.email || ""}</div>
                      <div className="muted small">{r.provider?.id || ""}</div>
                    </td>
                    <td>
                      <div>{r.reviewer?.name || "—"}</div>
                      <div className="muted small">{r.reviewer?.email || ""}</div>
                      <div className="muted small">{r.reviewer?.id || ""}</div>
                    </td>
                    <td>{r.rating}</td>
                    <td style={{ maxWidth: 360 }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{r.comment || "—"}</div>
                    </td>
                    <td className="muted">{formatDate(r.createdAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn secondary" type="button" onClick={() => deleteReview(r)}>
                        Delete
                      </button>
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

