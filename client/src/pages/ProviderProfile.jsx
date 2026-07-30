import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function stars(rating) {
  const n = Number(rating);
  if (!Number.isFinite(n)) return "";
  return "★★★★★".slice(0, Math.max(0, Math.min(5, Math.round(n)))).padEnd(5, "☆");
}

export default function ProviderProfile() {
  const { id } = useParams();

  const [me, setMe] = useState(null);

  const [provider, setProvider] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formRating, setFormRating] = useState("5");
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const averageLabel = useMemo(() => {
    if (averageRating === null) return "No ratings yet";
    return `${averageRating.toFixed(1)} / 5.0`;
  }, [averageRating]);

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

  async function loadProviderAndReviews(providerId) {
    const [p, r] = await Promise.all([apiFetch(`/api/providers/${providerId}`), apiFetch(`/api/providers/${providerId}/reviews`)]);
    setProvider(p.provider);
    setAverageRating(r.averageRating);
    setReviewCount(r.reviewCount || 0);
    setReviews(r.reviews || []);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        await loadProviderAndReviews(id);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load provider");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submitReview(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const rating = Number(formRating);
      await apiFetch(`/api/providers/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: formComment })
      });
      setFormComment("");
      setSubmitSuccess("Review submitted");
      await loadProviderAndReviews(id);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="card stack">
        <div className="row space">
          <h1>Provider Profile</h1>
          <Link className="btn secondary" to="/services">
            Back
          </Link>
        </div>

        {loading ? <div className="muted">Loading...</div> : null}
        {error ? <div className="error">{error}</div> : null}

        {!loading && !error && provider ? (
          <>
            <div className="stack">
              <div className="row space">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{provider.name}</div>
                  <div className="muted small">{provider.email}</div>
                </div>
                <div className="pill">
                  Avg: {averageLabel} {averageRating === null ? "" : `• ${stars(averageRating)}`}
                </div>
              </div>
              <div className="muted small">Reviews: {reviewCount}</div>
            </div>

            {me?.role === "resident" ? (
              <form className="stack" onSubmit={submitReview}>
                <div className="row" style={{ alignItems: "stretch" }}>
                  <label className="field" style={{ width: 220 }}>
                    <span>Rating</span>
                    <select className="select" value={formRating} onChange={(e) => setFormRating(e.target.value)}>
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                  </label>
                  <label className="field" style={{ flex: 1 }}>
                    <span>Comment</span>
                    <input value={formComment} onChange={(e) => setFormComment(e.target.value)} placeholder="Write a short review" />
                  </label>
                </div>

                {submitError ? <div className="error">{submitError}</div> : null}
                {submitSuccess ? <div className="pill">{submitSuccess}</div> : null}
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit review"}
                </button>
              </form>
            ) : null}

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        No reviews yet
                      </td>
                    </tr>
                  ) : (
                    reviews.map((rv) => (
                      <tr key={rv.id}>
                        <td>{rv.reviewerName}</td>
                        <td>
                          {rv.rating} • {stars(rv.rating)}
                        </td>
                        <td>{rv.comment || "—"}</td>
                        <td className="muted">{formatDate(rv.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
