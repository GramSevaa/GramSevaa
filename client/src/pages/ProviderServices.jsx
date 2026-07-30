import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { clearToken } from "../lib/auth";

const emptyForm = { title: "", category: "", description: "", location: "", price: "" };

export default function ProviderServices() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState("");

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

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

  async function loadNotifications() {
    setLoadingNotifications(true);
    setNotificationsError("");
    try {
      const data = await apiFetch("/api/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (err) {
      setNotificationsError(err.message || "Failed to load notifications");
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function loadBookings() {
    setLoadingBookings(true);
    setBookingsError("");
    try {
      const data = await apiFetch("/api/bookings/provider");
      setBookings(data.bookings || []);
    } catch (err) {
      setBookingsError(err.message || "Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  }

  async function loadServices() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/services/mine");
      setServices(data.services || []);
    } catch (err) {
      setError(err.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!me || me.role !== "provider") return;
    loadNotifications();
    loadBookings();
    loadServices();
  }, [me]);

  async function markNotificationRead(n) {
    try {
      const data = await apiFetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
      const readAt = data.notification?.readAt || new Date().toISOString();
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt } : x)));
      if (!n.readAt) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setNotificationsError(err.message || "Failed to mark notification as read");
    }
  }

  async function viewReviewNotification(n) {
    if (!n.readAt) await markNotificationRead(n);
    if (me?.id) navigate(`/providers/${me.id}`);
  }

  async function createService(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const data = await apiFetch("/api/services", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          description: form.description,
          location: form.location,
          price: form.price === "" ? 0 : Number(form.price)
        })
      });
      setForm(emptyForm);
      setServices((prev) => [data.service, ...prev]);
    } catch (err) {
      setError(err.message || "Failed to create service");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(s) {
    try {
      const data = await apiFetch(`/api/services/${s.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !s.isActive }) });
      setServices((prev) => prev.map((x) => (x.id === s.id ? data.service : x)));
    } catch (err) {
      setError(err.message || "Failed to update service");
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
          <h1>Provider Services</h1>
          <div className="error">{meError}</div>
          <Link className="btn" to="/login" state={{ redirectTo: "/provider/services" }}>
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (me?.role !== "provider") {
    return (
      <div className="page">
        <div className="card stack">
          <h1>Forbidden</h1>
          <div className="muted">Only service providers can access this page.</div>
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
            <h1>My Services</h1>
            <div className="muted small">Signed in as {me.email}</div>
          </div>
          <div className="row">
            <Link className="btn secondary" to="/services">
              Browse
            </Link>
            <button className="btn secondary" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="row space">
            <div className="muted small">Notifications{unreadCount > 0 ? ` (Unread: ${unreadCount})` : ""}</div>
            <button className="btn secondary" type="button" onClick={loadNotifications} disabled={loadingNotifications}>
              {loadingNotifications ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {notificationsError ? <div className="error">{notificationsError}</div> : null}

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reviewer</th>
                  <th>Rating</th>
                  <th>When</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No notifications
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.id}>
                      <td>{n.reviewerName || "Anonymous"}</td>
                      <td>{n.rating ? `${n.rating} / 5` : "—"}</td>
                      <td>{n.createdAt ? new Date(n.createdAt).toLocaleString() : "—"}</td>
                      <td>{n.readAt ? "Read" : "New"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn secondary" type="button" onClick={() => viewReviewNotification(n)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="row space">
            <div className="muted small">Bookings</div>
            <button className="btn secondary" type="button" onClick={loadBookings} disabled={loadingBookings}>
              {loadingBookings ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {bookingsError ? <div className="error">{bookingsError}</div> : null}

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Service</th>
                  <th>When</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No bookings yet
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.resident?.name || b.resident?.email || "—"}</td>
                      <td>{b.service?.title || "—"}</td>
                      <td>{b.startAt ? new Date(b.startAt).toLocaleString() : "—"}</td>
                      <td>{b.durationMinutes ? `${b.durationMinutes} min` : "—"}</td>
                      <td>{b.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="stack" onSubmit={createService}>
          <div className="row" style={{ alignItems: "stretch" }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Title</span>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            </label>
            <label className="field" style={{ width: 220 }}>
              <span>Category</span>
              <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} required />
            </label>
          </div>
          <div className="row" style={{ alignItems: "stretch" }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Location</span>
              <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </label>
            <label className="field" style={{ width: 220 }}>
              <span>Price (₹)</span>
              <input value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} inputMode="numeric" />
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </label>

          {error ? <div className="error">{error}</div> : null}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Add service"}
          </button>
        </form>

        <div className="row space">
          <div className="muted small">Your listings</div>
          <button className="btn secondary" type="button" onClick={loadServices} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Location</th>
                <th>Price</th>
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
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No services yet
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
                    <td>{Number(s.price || 0) > 0 ? `₹${s.price}` : "—"}</td>
                    <td>
                      <button className="btn secondary" type="button" onClick={() => toggleActive(s)}>
                        {s.isActive ? "Active" : "Inactive"}
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
