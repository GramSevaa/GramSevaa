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

  const [provider, setProvider] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const averageLabel = useMemo(() => {
    if (averageRating === null) return "No ratings yet";
    return `${averageRating.toFixed(1)} / 5.0`;
  }, [averageRating]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const [p, r] = await Promise.all([apiFetch(`/api/providers/${id}`), apiFetch(`/api/providers/${id}/reviews`)]);
        if (cancelled) return;
        setProvider(p.provider);
        setAverageRating(r.averageRating);
        setReviewCount(r.reviewCount || 0);
        setReviews(r.reviews || []);
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

