/**
 * Paged browsing for properties, guests and bookings.
 *
 * The active entity determines the endpoint, filters and card/table presentation.
 * The server sends a bounded page plus a next cursor; older cursors enable Back.
 * Record details belong to Member 1; booking-status actions belong to Member 2.
 */

import React, { useEffect, useState } from "react";
import { MapPin, ArrowUpRight, Search, Leaf } from "lucide-react";
import { money } from "./lib/format.js";
import { qs } from "./lib/query.js";
import { api } from "./lib/api.js";
import { useData } from "./hooks/useData.js";
import { Alert } from "./components/Alert.jsx";
import { DataState } from "./components/DataState.jsx";
import { Pill } from "./components/Pill.jsx";
import { Heading } from "./components/Heading.jsx";
import { Pager } from "./components/Pager.jsx";
import { HouseArt } from "./components/HouseArt.jsx";
import { PropertyDetails } from "./PropertyDetails.jsx";
import { BookingStatusAction } from "../../member2/web/BookingStatusAction.jsx";

/**
 * Render bounded pages and details for the chosen entity.
 * @param {Object|null} actor Guest selected by App; its ID scopes the optional booking
 * filter.
 * @param {Function} onBook Pass a property (or null) to App's booking navigation.
 */
export function Browse({ actor, onBook }) {
  // Filters and pagination belong to the selected entity; details/errors belong to its
  // dialog.
  // Keep individual state declarations separate so each control is easy to locate.
  const [entity, setEntity] = useState("properties");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const [after, setAfter] = useState("");
  const [history, setHistory] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  // Compose the same bounded endpoint request used before this documentation pass.
  // Properties render eight cards; guest/booking tables request twenty records.
  const resource = useData(
    `/${entity}?${qs({ search, after, status: entity === "bookings" ? status : "", guest_id: entity === "bookings" && mine ? actor?.id : "", limit: entity === "properties" ? 8 : 20 })}`,
  );
  /**
   * Filters or actor changes invalidate older page cursors: return to page one.
   */
  function reset() {
    setAfter("");
    setHistory([]);
  }
  useEffect(reset, [actor?.id]);
  /**
   * Fetch authoritative detail data instead of assuming the list contains every field.
   */
  async function open(item) {
    try {
      setDetailError("");
      setDetail(await api(`/${entity}/${item.id}`));
    } catch (e) {
      setDetailError(e.message);
    }
  }
  return (
    <>
      <Heading
        eyebrow="YOUR NEXT CHAPTER"
        title="A place for every possibility."
        description="Discover thoughtful spaces, familiar comforts, and a little room to explore."
      />
      <div className="browse-banner">
        <div>
          <span className="mini-label">
            <Leaf size={15} /> MADE FOR SLOWER DAYS
          </span>
          <h2>
            Good stays.
            <br />
            Great beginnings.
          </h2>
          <p>
            From city corners to quiet courtyards,
            <br />
            find somewhere that feels like you.
          </p>
          <button className="btn light" onClick={() => onBook(null)}>
            Book a stay <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="banner-art">
          <HouseArt variant={0} />
        </div>
        <div className="banner-stamp">
          STAY A LITTLE
          <br />
          <span>longer</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {[
            ["properties", "Properties"],
            ["guests", "Guests"],
            ["bookings", "Bookings"],
          ].map(([key, label]) => (
            <button
              className={entity === key ? "active" : ""}
              key={key}
              onClick={() => {
                setEntity(key);
                setSearch("");
                setStatus("");
                setMine(false);
                setDetailError("");
                reset();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label={`Search ${entity}`}
            placeholder={
              entity === "bookings" ? "Find a booking by ID…" : `Search ${entity}…`
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              reset();
            }}
          />
        </div>
      </div>
      {entity === "bookings" && (
        <div className="filter-row">
          <select
            aria-label="Filter booking status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              reset();
            }}
          >
            <option value="">All statuses</option>
            {["CONFIRMED", "CHECKED_IN", "COMPLETED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => {
                setMine(e.target.checked);
                reset();
              }}
            />{" "}
            Selected guest only
          </label>
        </div>
      )}
      {detailError && <Alert message={detailError} />}
      <DataState resource={resource} empty={!resource.data?.items.length}>
        {entity === "properties" ? (
          <div className="property-grid">
            {resource.data?.items.map((p, i) => (
              <button className="property-card" key={p.id} onClick={() => open(p)}>
                <div className="property-cover">
                  <HouseArt variant={i} />
                  <span className="cover-chip">
                    <Leaf size={12} /> Thoughtful spaces
                  </span>
                </div>
                <div className="property-info">
                  <div className="property-location">
                    <MapPin size={13} />
                    {p.title.split(" ")[0]}
                    <span>#{p.id}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <div className="property-price">
                    <strong>{money(p.base_price)}</strong>
                    <span>/ night</span>
                    <ArrowUpRight size={19} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  {entity === "guests" ? (
                    <>
                      <th>Guest</th>
                      <th>Wallet balance</th>
                      <th>Details</th>
                    </>
                  ) : (
                    <>
                      <th>Booking</th>
                      <th>Guest & property</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Next step</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {resource.data?.items.map((r) => (
                  <tr key={r.id}>
                    {entity === "guests" ? (
                      <>
                        <td>
                          <div className="record-name">
                            {r.name}
                            <small>Guest #{r.id}</small>
                          </div>
                        </td>
                        <td>{money(r.wallet_balance)}</td>
                        <td>
                          <button className="text-btn" onClick={() => open(r)}>
                            View guest <ArrowUpRight size={15} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <button className="text-btn" onClick={() => open(r)}>
                            #{r.id}
                          </button>
                          <small className="cell-small">{r.nights} nights</small>
                        </td>
                        <td>
                          <div className="record-name">
                            {r.guest_name}
                            <small>{r.property_title}</small>
                          </div>
                        </td>
                        <td>{money(r.total_cost)}</td>
                        <td>
                          <Pill status={r.status} />
                        </td>
                        <td>
                          <BookingStatusAction
                            booking={r}
                            onSuccess={resource.reload}
                            onError={setDetailError}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
      <Pager
        label={`Page ${history.length + 1} · ${resource.data?.items.length ?? 0} ${entity}`}
        history={history}
        next={resource.data?.next}
        onNext={() => {
          setHistory((h) => [...h, after]);
          setAfter(resource.data.next);
        }}
        onBack={() => {
          setAfter(history.at(-1));
          setHistory((h) => h.slice(0, -1));
        }}
      />
      {detail && (
        <PropertyDetails
          entity={entity}
          detail={detail}
          onBook={onBook}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
