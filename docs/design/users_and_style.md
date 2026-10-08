# Users and design decisions

**Guest:** browse properties, book within their wallet balance, see a trigger-generated debit, and advance a stay through check-in and completion.

**Property manager / analyst:** browse the guest and booking records, inspect financial history, compare seven-day revenue, refresh property totals, explore search hotspots, and understand reviews and accessibility.

Use the actor picker in the header for demo identity. No login is required. Active stay uniqueness applies only to CHECKED_IN, as in the assignment; multiple confirmed reservations are allowed.

Visual language: forest green (#244c38), warm paper (#f7f6f2), terracotta (#c76a42), dark ink (#242d26), muted sage. System sans-serif body with Georgia display headlines avoids external font dependencies. A persistent navigation rail, shared buttons, cards, chips, fields, alerts, paginated tables and accessible modal keep screens consistent. Mobile navigation wraps and content stacks. All data regions show loading, empty and retryable error states. Charts use SVG plus equivalent numeric tables; Leaflet supplies map interaction.

Wireframes were prepared before UI code. They document Browse, Transaction, Audit Trail, Analytics, Search Map and Reviews. Final screenshots are captured separately after testing.

The [current design handover](README.md) expands those early sketches into the supplied nine-screen member allocation, with editable Excalidraw boards, native SVG references and interaction-state annotations. The designs document the existing application; the source stylesheet and UI behavior remain unchanged.
