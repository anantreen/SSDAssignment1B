"""Render the documented relational diagram with Pillow (optional diagram-generation dependency).

Canvas positions are in pixels. A table box contains a title band and schema rows;
connectors describe foreign-key cardinality and the wallet trigger relationship.
This draws an artifact only: it does not discover a live schema or mutate databases.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
# Choose a platform-available font; bold falls back to that same font if necessary.
font = next(
    (
        p
        for p in [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
        if Path(p).exists()
    ),
    "DejaVuSans.ttf",
)
bold = next(
    (
        p
        for p in [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        if Path(p).exists()
    ),
    font,
)
# f loads a requested font size; img is the canvas and d its drawing context.
f = lambda n, b=False: ImageFont.truetype(bold if b else font, n)
# The fixed canvas/palette matches the shipped diagram; only source readability changes
# here.
img = Image.new("RGB", (1800, 1150), "#f7f6f2")
d = ImageDraw.Draw(img)
d.text((70, 40), "StaySpot · relational database", font=f(39, True), fill="#244c38")
d.text(
    (72, 100),
    "PostgreSQL schema / Project 3 / corrected nights and immutable wallet ledger",
    font=f(21),
    fill="#77816d",
)


def box(x, y, w, title, lines):
    """Draw one table summary at (x, y) with width w; return its computed pixel height.
    The line count determines height so column notes cannot collapse into the title band.
    """
    h = 73 + len(lines) * 35
    d.rounded_rectangle(
        (x, y, x + w, y + h), radius=14, fill="#ffffff", outline="#cbd6c2", width=2
    )
    d.rounded_rectangle((x, y, x + w, y + 57), radius=14, fill="#244c38")
    d.rectangle((x, y + 30, x + w, y + 57), fill="#244c38")
    d.text((x + 19, y + 14), title, font=f(24, True), fill="white")
    for i, line in enumerate(lines):
        d.text((x + 19, y + 76 + i * 35), line, font=f(19), fill="#44583a")
    return h


box(
    60,
    230,
    410,
    "guests",
    [
        "PK  id · identity integer",
        "name · varchar(120) · not null",
        "wallet_balance · numeric(10,2)",
        "CHECK balance >= 0",
    ],
)
box(
    655,
    215,
    485,
    "bookings",
    [
        "PK  id · identity integer",
        "FK  guest_id → guests.id",
        "FK  property_id → properties.id",
        "total_cost · numeric(10,2) > 0",
        "nights · integer · 1 to 365",
        "status · confirmed / checked_in",
        "              / completed",
        "created_at · timestamptz",
    ],
)
box(
    1330,
    230,
    410,
    "properties",
    [
        "PK  id · identity integer",
        "title · varchar(255)",
        "base_price · numeric(10,2) > 0",
        "latitude · -90 to 90",
        "longitude · -180 to 180",
    ],
)
box(
    655,
    685,
    485,
    "wallet_audit_logs",
    [
        "PK  id · identity bigint",
        "FK  guest_id → guests.id",
        "amount_changed · signed numeric",
        "action_type · debit / credit",
        "balance_after · numeric >= 0",
        "timestamp · clock_timestamp()",
        "Immutable UPDATE/DELETE/TRUNCATE",
    ],
)
box(
    60,
    720,
    410,
    "analytics_refresh_state",
    ["PK  name · text", "refreshed_at · timestamptz"],
)
box(
    1330,
    720,
    410,
    "mv_property_summary",
    [
        "Unique property_id index",
        "total_bookings",
        "total_nights_booked",
        "total_revenue",
        "Refresh concurrently + timestamp",
    ],
)


def edge(points, label, xy):
    """Draw a connector polyline, an arrowhead at its final point and a label at xy."""
    d.line(points, fill="#8ca178", width=4)
    x, y = points[-1]
    d.polygon([(x, y), (x - 13, y - 7), (x - 13, y + 7)], fill="#8ca178")
    d.text(xy, label, font=f(18, True), fill="#627e4c")


edge([(470, 337), (655, 337)], "1 → many", (508, 303))
# Properties FK is oriented towards the bookings table.
d.line([(1330, 356), (1140, 356)], fill="#8ca178", width=4)
d.polygon([(1140, 356), (1153, 349), (1153, 363)], fill="#8ca178")
d.text((1176, 321), "1 → many", font=f(18, True), fill="#627e4c")
edge(
    [(265, 443), (265, 620), (566, 620), (566, 788), (655, 788)],
    "guest wallet trigger",
    (294, 586),
)
d.text(
    (62, 1064),
    "Partial unique index: bookings(guest_id) WHERE status = 'CHECKED_IN'",
    font=f(22, True),
    fill="#a86844",
)
d.text(
    (62, 1101),
    "Solid connectors show foreign-key relationships; summaries are materialized, not independent financial records.",
    font=f(17),
    fill="#849079",
)
# Write the optimized PNG into docs/; existing diagram pixels are not changed by
# annotation.
img.save(root / "docs/relational_erd.png", optimize=True)
