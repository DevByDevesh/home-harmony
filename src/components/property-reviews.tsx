import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { createPropertyReviewFn, getMyPropertyReviewEligibilityFn, listPropertyReviewsFn } from "@/lib/reviews.functions";

export function PropertyReviews({ slug }: { slug: string }) {
  const { user } = useCurrentUser();
  const fetchReviews = useServerFn(listPropertyReviewsFn);
  const fetchEligibility = useServerFn(getMyPropertyReviewEligibilityFn);
  const reviews = useQuery({ queryKey: ["property-reviews", slug], queryFn: () => fetchReviews({ data: { slug } }) });
  const eligibility = useQuery({
    queryKey: ["property-review-eligibility", slug],
    queryFn: () => fetchEligibility({ data: { slug } }),
    enabled: !!user,
  });
  const create = useServerFn(createPropertyReviewFn);
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    try {
      const result = await create({ data: { slug, rating, comment } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Review submitted");
      setRating(0);
      setComment("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["property-reviews", slug] }),
        qc.invalidateQueries({ queryKey: ["property-review-eligibility", slug] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t submit your review.");
    } finally {
      setBusy(false);
    }
  };

  const data = reviews.data;
  return <section className="property-reviews" aria-labelledby="reviews-title">
    <div className="feature-heading review-heading">
      <div>
        <p className="kicker">REAL EXPERIENCES</p>
        <h2 id="reviews-title">Reviews</h2>
      </div>
      {data?.count ? <strong>{data.average?.toFixed(1)} / 5 · {data.count} review{data.count === 1 ? "" : "s"}</strong> : null}
    </div>

    {user && eligibility.data?.eligible && <div className="profile-card review-form-card">
      <strong>How was your visit?</strong>
      <div className="review-stars" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map(value => <button
          key={value}
          type="button"
          role="radio"
          aria-checked={rating === value}
          aria-label={value + " star" + (value === 1 ? "" : "s")}
          className={rating >= value ? "star-button selected" : "star-button"}
          onClick={() => setRating(value)}
        ><Star size={20} fill="currentColor"/></button>)}
      </div>
      <textarea
        className="review-input"
        maxLength={1000}
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Share what you found useful about the property or visit."
        aria-label="Review"
      />
      <Button disabled={busy || rating === 0} onClick={submit}>{busy ? "Submitting…" : "Submit review"}</Button>
    </div>}

    {user && eligibility.data?.alreadyReviewed && <p className="form-hint">You’ve already reviewed this property.</p>}
    {!user && <p className="form-hint">Sign in and complete a visit to leave a review.</p>}
    {user && eligibility.data && !eligibility.data.eligible && !eligibility.data.alreadyReviewed && <p className="form-hint">Complete a property visit before leaving a review.</p>}

    {!data?.reviews.length ? (
      <p className="chart-empty">No reviews yet. Verified visitor feedback will appear here.</p>
    ) : (
      <div className="review-list">{data.reviews.map(review => <article className="review-card" key={review.id}>
        <div className="review-card-top"><strong>{review.author}</strong><span>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
        <div className="review-stars static" aria-label={review.rating + " out of 5 stars"}>
          {[1, 2, 3, 4, 5].map(value => <Star key={value} size={15} fill={value <= review.rating ? "currentColor" : "none"}/>)}
        </div>
        {review.comment && <p>{review.comment}</p>}
      </article>)}</div>
    )}
  </section>;
}
