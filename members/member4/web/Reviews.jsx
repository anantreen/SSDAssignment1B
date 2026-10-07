/**
 * Workflow 4 and readable flexible property amenities.
 *
 * The API runs an indexed property-scoped $facet for ratings, tags and average.
 * Missing review groups use safe empty defaults; the catalog can still be shown.
 * Amenity objects are rendered by their actual fields rather than a rigid item list.
 */

import React, { useState } from "react";
import { Home, Star, ChevronDown, Check, Leaf } from "lucide-react";
import { count } from "../../member1/web/lib/format.js";
import { useData } from "../../member1/web/hooks/useData.js";
import { DataState } from "../../member1/web/components/DataState.jsx";
import { Heading } from "../../member1/web/components/Heading.jsx";
import { Modal } from "../../member1/web/components/Modal.jsx";
import { Picker } from "../../member1/web/components/Picker.jsx";

/**
 * Load one property's facet summary and its flexible amenities catalog.
 * reviewData is the response; safe defaults allow an empty review scope to remain
 * readable.
 */
export function Reviews() {
  const [property, setProperty] = useState({ id: 1, title: "Property #1" });
  const [picker, setPicker] = useState(false);
  const resource = useData(`/reviews?property_id=${property.id}`);
  const reviewData = resource.data;
  // A $facet branch returns an array containing at most one overall summary document.
  const overall = reviewData?.overallAverage[0];
  // Empty review scopes have zero reviews; bar widths must avoid division by zero.
  const total = overall?.totalReviews ?? 0;
  // Tag bars compare each count with the largest tag frequency, not total review count.
  const maxTag = Math.max(1, ...(reviewData?.frequentTags ?? []).map((t) => t.count));
  return (
    <>
      <Heading
        eyebrow="THE LITTLE THINGS PEOPLE LOVE"
        title="Every stay has a story."
        description="Guest impressions, favorite details, and a closer look at what’s included."
        action={
          <button className="btn secondary" onClick={() => setPicker(true)}>
            <Home size={16} />
            {property.title}
            <ChevronDown size={16} />
          </button>
        }
      />
      <DataState resource={resource}>
        <div className="review-overview">
          <div className="review-score panel">
            <div className="eyebrow">THE GUEST VERDICT</div>
            <strong>
              {overall?.averageRating ?? "—"}
              <span>/ 5</span>
            </strong>
            <div
              className="stars"
              aria-label={`${overall?.averageRating ?? 0} out of 5 stars`}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={22}
                  fill={
                    n <= Math.round(overall?.averageRating ?? 0) ? "#c5a771" : "none"
                  }
                />
              ))}
            </div>
            <p>From {count(total)} reviews in the past year</p>
          </div>
          <div className="panel rating-panel">
            <h2>A little more detail</h2>
            <p className="muted">Rating distribution</p>
            {[...(reviewData?.ratingDistributions ?? [])].reverse().map((r) => (
              <div className="rating-row" key={r._id}>
                <span>
                  {r._id} <Star size={12} />
                </span>
                <div className="bar-track">
                  <i style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
                </div>
                <span>{count(r.count)}</span>
              </div>
            ))}
          </div>
          <div className="panel tags-panel">
            <h2>Words that keep coming up</h2>
            <p className="muted">Top location tags</p>
            {reviewData?.frequentTags.length ? (
              reviewData.frequentTags.map((t) => (
                <div className="tag-row" key={t._id}>
                  <div>
                    <span>{t._id}</span>
                    <strong>{t.count}</strong>
                  </div>
                  <div className="bar-track">
                    <i style={{ width: `${(t.count / maxTag) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="state">No tags yet.</p>
            )}
          </div>
        </div>
        {!total && (
          <p className="help">
            No reviews for this property in the past year. Its catalog can still be
            explored below.
          </p>
        )}
        <div className="panel catalog">
          <div className="section-head">
            <div>
              <div className="eyebrow">MORE THAN A PLACE TO SLEEP</div>
              <h2>Small comforts. Thoughtful details.</h2>
            </div>
            <Leaf size={25} />
          </div>
          {reviewData?.amenities ? (
            <div className="catalog-grid">
              {Object.entries(reviewData.amenities)
                .filter(([k]) => !["_id", "property_id"].includes(k))
                .map(([key, value]) => (
                  <div key={key}>
                    <h3>{key.replaceAll("_", " ")}</h3>
                    {Array.isArray(value) ? (
                      value.map((v) => (
                        <p key={v}>
                          <Check size={16} />
                          {v}
                        </p>
                      ))
                    ) : typeof value === "object" && value !== null ? (
                      Object.entries(value).map(([k, v]) => (
                        <p key={k}>
                          <Check size={16} />
                          <span>
                            <strong>{k}: </strong>
                            {Array.isArray(v) ? v.join(", ") : String(v)}
                          </span>
                        </p>
                      ))
                    ) : (
                      <p>{String(value)}</p>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="state">
              No amenities catalog is available for this property.
            </p>
          )}
        </div>
      </DataState>
      {picker && (
        <Modal title="Choose a property" onClose={() => setPicker(false)}>
          <Picker
            entity="properties"
            label="Find a stay"
            value={property}
            onSelect={(p) => {
              setProperty(p);
              setPicker(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
