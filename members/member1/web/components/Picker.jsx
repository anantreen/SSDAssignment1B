/**
 * Picker shared component.
 *
 * Paged searchable actor/property selector reused by booking, reviews and the header.
 * Only ten candidates are loaded per request; selected value remains owned by the
 * parent.
 */

import React, { useState } from "react";
import { Search, Check, Plus } from "lucide-react";
import { money } from "../lib/format.js";
import { qs } from "../lib/query.js";
import { useData } from "../hooks/useData.js";
import { DataState } from "./DataState.jsx";

/**
 * Paged searchable actor/property selector reused by booking, reviews and the header.
 * Only ten candidates are loaded per request; selected value remains owned by the
 * parent.
 */
export function Picker({ entity, value, onSelect, label }) {
  const [search, setSearch] = useState("");
  const [after, setAfter] = useState("");
  const [history, setHistory] = useState([]);
  const resource = useData(`/${entity}?${qs({ search, after, limit: 10 })}`);
  /**
   * Changing search text starts a new result scope, so discard prior cursors.
   */
  function change(v) {
    setSearch(v);
    setAfter("");
    setHistory([]);
  }
  return (
    <div className="picker">
      <label>
        {label}
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label={`Search ${entity}`}
            placeholder={`Search ${entity}…`}
            value={search}
            onChange={(e) => change(e.target.value)}
          />
        </div>
      </label>
      <DataState resource={resource} empty={!resource.data?.items.length}>
        <div className="picker-list">
          {resource.data?.items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`picker-option ${value?.id === item.id ? "selected" : ""}`}
              onClick={() => onSelect(item)}
            >
              <span>
                {item.name ?? item.title}
                <small>
                  #{item.id}{" "}
                  {entity === "guests"
                    ? `· ${money(item.wallet_balance)} available`
                    : `· ${money(item.base_price)} / night`}
                </small>
              </span>
              {value?.id === item.id ? <Check size={17} /> : <Plus size={17} />}
            </button>
          ))}
        </div>
      </DataState>
      <div className="picker-pages">
        <button
          type="button"
          disabled={!history.length}
          onClick={() => {
            setAfter(history.at(-1));
            setHistory((h) => h.slice(0, -1));
          }}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!resource.data?.next}
          onClick={() => {
            setHistory((h) => [...h, after]);
            setAfter(resource.data.next);
          }}
        >
          More {entity}
        </button>
      </div>
    </div>
  );
}
