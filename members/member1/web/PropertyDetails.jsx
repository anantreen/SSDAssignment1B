/**
 * Existing property/record details dialog.
 *
 * Renders the full record returned by a detail endpoint, preserving monetary strings.
 * Only property records expose Book this stay, forwarding the selected record to App.
 */

import React from "react";
import { ArrowRight } from "lucide-react";
import { Modal } from "./components/Modal.jsx";
import { HouseArt } from "./components/HouseArt.jsx";

/**
 * Render the existing detail modal for a property, guest or booking.
 * @param {Object} props entity selects the title/action; detail contains the fetched
 * fields.
 * onBook selects this property; onClose returns modal visibility control to Browse.
 */
export function PropertyDetails({ entity, detail, onBook, onClose }) {
  return (
    <Modal
      title={entity === "properties" ? "Your stay, at a glance" : "Record details"}
      onClose={onClose}
    >
      {entity === "properties" && <HouseArt variant={detail.id} />}
      <dl className="detail-list">
        {Object.entries(detail).map(([k, v]) => (
          <div key={k}>
            <dt>{k.replaceAll("_", " ")}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
      </dl>
      {entity === "properties" && (
        <button
          className="btn"
          onClick={() => {
            onBook(detail);
            onClose();
          }}
        >
          Book this stay <ArrowRight size={17} />
        </button>
      )}
    </Modal>
  );
}
