import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { clearToken } from "../lib/auth";

function toYmdLocal(date) {
  const d = date instanceof Date ? date : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildSlotIsoLocal(dateYmd, timeHm) {
  const [h, m] = String(timeHm).split(":").map((x) => Number.parseInt(x, 10));
  const [y, mo, d] = String(dateYmd).split("-").map((x) => Number.parseInt(x, 10));
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(m)) return "";
  const dt = new Date(y, mo - 1, d, h, m, 0, 0);
  return dt.toISOString();
}

function slotList() {
  const slots = [];
  for (let h = 9; h <= 17; h += 1) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

export default function Book() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const presetProviderId = params.get("providerId") || "";
  const presetServiceId = params.get("serviceId") || "";

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [meError, setMeError] = useState("");

  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState(presetProviderId);

  const [dateYmd, setDateYmd] = useState(() => toYmdLocal(new Date()));
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedTimes, setBookedTimes] = useState(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const availableSlots = useMemo(() => {
    const all = slotList();
    return all.map((t) => ({ time: t, isBooked: bookedTimes.has(t) }));
  }, [bookedTimes]);

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
        if (!cancelled) setMeError(err.message || "Please login");
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
    let cancelled = false;
    async function run() {
      try {
        const data = await apiFetch("/api/providers");
        if (cancelled) return;
        setProviders(data.providers || []);
        const firstId = (data.providers || [])[0]?.id || "";
        if (firstId) setProviderId((prev) => prev || firstId);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load providers");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!providerId || !dateYmd) return;
    let cancelled = false;
    async function run() {
      setError("");
      try {
        const qs = new URLSearchParams({ providerId, date: dateYmd });
        const data = await apiFetch(`/api/bookings/availability?${qs.toString()}`);
        if (cancelled) return;
        const times = new Set();
        for (const b of data.booked || []) {
          const d = new Date(b.startAt);
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          times.add(`${hh}:${mm}`);
        }
        setBookedTimes(times);
        setSelectedTime((prev) => (prev && times.has(prev) ? "" : prev));
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load availability");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [providerId, dateYmd]);

  async function submitBooking(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!providerId) return setError("Please select a provider");
    if (!dateYmd) return setError("Please select a date");
    if (!selectedTime) return setError("Please select a time slot");

    const startAtIso = buildSlotIsoLocal(dateYmd, selectedTime);
    if (!startAtIso) return setError("Invalid date/time");

    setSubmitting(true);
    try {
      const data = await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ providerId, serviceId: presetServiceId || undefined, startAt: startAtIso, durationMinutes: 60 })
      });
      setSuccess(data.booking);
      navigate("/resident/bookings", { replace: true, state: { message: "Booking submitted" } });
    } catch (err) {
      setError(err.message || "Booking failed");
    } finally {
      setSubmitting(false);
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
          <h1>Book a Service</h1>
          <div className="error">{meError}</div>
          <div className="row">
            <Link className="btn" to="/login" state={{ redirectTo: `${location.pathname}${location.search}` }}>
              Login
            </Link>
            <Link className="btn secondary" to="/register">
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (me?.role !== "resident") {
    return (
      <div className="page">
        <div className="card stack">
          <h1>Forbidden</h1>
          <div className="muted">Only residents can create bookings.</div>
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
          <h1>Booking Request</h1>
          <div className="row">
            <Link className="btn secondary" to="/services">
              Back
            </Link>
            <button className="btn secondary" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={submitBooking} className="stack">
          <label className="field">
            <span>Service Provider</span>
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
              <option value="" disabled>
                Select provider
              </option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input type="date" value={dateYmd} onChange={(e) => setDateYmd(e.target.value)} required />
          </label>

          <div className="field">
            <span>Available time slots</span>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {availableSlots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  className={`btn secondary`}
                  disabled={s.isBooked}
                  onClick={() => setSelectedTime(s.time)}
                  style={{
                    opacity: s.isBooked ? 0.45 : 1,
                    borderColor: selectedTime === s.time ? "rgba(37,99,235,0.9)" : undefined
                  }}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </div>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit booking request"}
          </button>

          {success ? (
            <div className="pill">
              Booking saved: {new Date(success.startAt).toLocaleString()} • Status: {success.status}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
