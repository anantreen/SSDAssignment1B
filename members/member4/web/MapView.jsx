/**
 * Workflow 3: interactive origin, nearest pins and search hotspots.
 *
 * React owns origin/filter state; refs retain Leaflet objects between renders.
 * Polling refreshes data every 15 seconds without reloading the page.
 * GeoJSON uses longitude/latitude, while Leaflet expects latitude/longitude.
 */

import React, { useEffect, useRef, useState } from "react";
import { MapPin, ArrowRight, Plus } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { count } from "../../member1/web/lib/format.js";
import { date } from "../../member1/web/lib/format.js";
import { qs } from "../../member1/web/lib/query.js";
import { api } from "../../member1/web/lib/api.js";
import { useData } from "../../member1/web/hooks/useData.js";
import { Alert } from "../../member1/web/components/Alert.jsx";
import { DataState } from "../../member1/web/components/DataState.jsx";
import { Heading } from "../../member1/web/components/Heading.jsx";

/**
 * Render the Leaflet map and latest bounded results for a selectable origin.
 * Lifecycle effects own map/timer cleanup; explicit actions add pins or apply typed
 * coordinates.
 */
export function MapView() {
  // origin drives queries; draft lets the user type coordinates without querying each
  // keystroke.
  const [origin, setOrigin] = useState({
    latitude: 17.385,
    longitude: 78.4867,
  });
  const [draft, setDraft] = useState({ latitude: 17.385, longitude: 78.4867 });
  const [minutes, setMinutes] = useState(60);
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [inputError, setInputError] = useState("");
  const resource = useData(`/search?${qs({ ...origin, minutes })}`);
  // DOM container, Leaflet instance and replaceable data layer have distinct lifetimes.
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  useEffect(() => {
    // The stable reload callback lets polling run without reinstalling its timer on
    // every result.
    const timer = setInterval(resource.reload, 15000);
    return () => clearInterval(timer);
  }, [resource.reload]);
  useEffect(() => {
    // Create the map once. Removing it during cleanup releases listeners and DOM state.
    if (!mapNode.current || mapRef.current) return;
    const map = L.map(mapNode.current, { attributionControl: true }).setView(
      [origin.latitude, origin.longitude],
      13,
    );
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    // A map click updates both committed origin and its editable form values.
    map.on("click", (e) => {
      const next = {
        latitude: Number(e.latlng.lat.toFixed(6)),
        longitude: Number(e.latlng.lng.toFixed(6)),
      };
      setOrigin(next);
      setDraft(next);
      setNotice("Search origin moved to your selected point.");
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Replace the prior results layer so polling does not accumulate duplicate markers.
    layerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;
    // The displayed circle matches the 5,000 metre bound enforced inside MongoDB.
    L.circle([origin.latitude, origin.longitude], {
      radius: 5000,
      color: "#244c38",
      weight: 2,
      fillOpacity: 0.05,
      dashArray: "7 6",
    }).addTo(group);
    L.circleMarker([origin.latitude, origin.longitude], {
      radius: 8,
      color: "#fff",
      weight: 3,
      fillColor: "#c76a42",
      fillOpacity: 1,
    })
      .addTo(group)
      .bindTooltip("Search origin");
    // Hotspot size represents count; sqrt softens size growth so dense cells stay
    // visible.
    for (const h of resource.data?.hotspots ?? [])
      L.circleMarker([h.latitude, h.longitude], {
        radius: Math.min(24, 6 + Math.sqrt(h.count)),
        color: "#244c38",
        weight: 1,
        fillColor: "#73916c",
        fillOpacity: 0.6,
      })
        .addTo(group)
        .bindTooltip(`${h.count} searches in this area`);
    // Swap GeoJSON [longitude, latitude] into Leaflet [latitude, longitude].
    for (const p of resource.data?.nearest ?? [])
      L.circleMarker([p.location.coordinates[1], p.location.coordinates[0]], {
        radius: 3,
        color: "#c76a42",
        fillOpacity: 0.9,
        weight: 0,
      })
        .addTo(group)
        .bindTooltip(`${Math.round(p.distance_meters)} metres away`);
    map.setView([origin.latitude, origin.longitude], 13);
    // Recompute map geometry after layout/data updates, including responsive layouts.
    map.invalidateSize();
  }, [resource.data, origin]);
  /**
   * Append a demo search session at the current origin and immediately refresh the
   * results.
   */
  async function add() {
    setAdding(true);
    setInputError("");
    try {
      await api("/search", { method: "POST", body: JSON.stringify(origin) });
      setNotice("A new search pin has been added. The results have been updated.");
      resource.reload();
    } catch (e) {
      setInputError(e.message);
    } finally {
      setAdding(false);
    }
  }
  /**
   * Validate coordinate ranges before promoting draft values into the queried origin.
   */
  function apply(e) {
    e.preventDefault();
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setInputError(
        "Enter a latitude from −90 to 90 and a longitude from −180 to 180.",
      );
      return;
    }
    setInputError("");
    setOrigin({ latitude, longitude });
  }
  return (
    <>
      <Heading
        eyebrow="FOLLOW THE CURIOSITY"
        title="Where people want to be."
        description="Live search pins and neighborhood hotspots, within five kilometres of you."
        action={
          <button className="btn secondary" onClick={add} disabled={adding}>
            <Plus size={17} />
            {adding ? "Adding…" : "Add a search pin"}
          </button>
        }
      />
      <div className="panel map-controls">
        <form onSubmit={apply}>
          <label>
            Latitude
            <input
              aria-label="Search latitude"
              type="number"
              step="any"
              required
              min="-90"
              max="90"
              value={draft.latitude}
              onChange={(e) => setDraft((v) => ({ ...v, latitude: e.target.value }))}
            />
          </label>
          <label>
            Longitude
            <input
              aria-label="Search longitude"
              type="number"
              step="any"
              required
              min="-180"
              max="180"
              value={draft.longitude}
              onChange={(e) => setDraft((v) => ({ ...v, longitude: e.target.value }))}
            />
          </label>
          <button className="btn" type="submit">
            Explore this area <ArrowRight size={16} />
          </button>
        </form>
        <label>
          Recent searches
          <select
            aria-label="Recent search period"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          >
            <option value="15">Last 15 minutes</option>
            <option value="60">Last hour</option>
            <option value="120">Last 2 hours</option>
          </select>
        </label>
      </div>
      {inputError && <Alert message={inputError} />}
      <div className="map-layout">
        <div className="panel map-panel">
          <div className="section-head">
            <h2>Search activity</h2>
            <span className="live-label">
              <i />
              LIVE · 15s polling
            </span>
          </div>
          <div
            ref={mapNode}
            className="leaflet-map"
            aria-label="Interactive map; click to choose the search origin"
          />
          <div className="map-caption">
            <span>
              <i className="dot terracotta" />
              Search pins
            </span>
            <span>
              <i className="dot green" />
              Grid hotspots
            </span>
            <span>Click anywhere to move the origin · 5 km radius</span>
          </div>
        </div>
        <div className="panel nearest-panel">
          <div className="section-head">
            <h2>Nearby searches</h2>
            <MapPin size={18} />
          </div>
          {notice && (
            <p className="help" role="status">
              {notice}
            </p>
          )}
          <DataState resource={resource} empty={!resource.data?.nearest.length}>
            <p className="help">Nearest 100 pins · sorted by distance</p>
            <div className="nearest-list">
              {resource.data?.nearest.map((p, i) => (
                <div className="nearest-item" key={p._id}>
                  <span className="pin-icon">
                    <MapPin size={18} />
                  </span>
                  <div>
                    <strong>Search pin {i + 1}</strong>
                    <small>
                      {p.location.coordinates[1].toFixed(4)},{" "}
                      {p.location.coordinates[0].toFixed(4)}
                    </small>
                  </div>
                  <span>{Math.round(p.distance_meters)} m</span>
                </div>
              ))}
            </div>
            <p className="help">Checked {date(resource.data?.checked_at)}</p>
          </DataState>
        </div>
      </div>
      <p className="help">
        Map tiles need an internet connection. Search pins and distances come from the
        live database. Hotspots group all recent local pins into approximate 0.5 km grid
        cells.
      </p>
    </>
  );
}
