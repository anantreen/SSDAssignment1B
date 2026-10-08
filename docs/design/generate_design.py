#!/usr/bin/env python3
"""Build StaySpot's editable wireframes and source-inspired UI reference screens.

Run from any directory with Python 3 and Pillow installed. The scene descriptions
below are the single source for SVG exports, PNG previews and Excalidraw elements.
No website code, API or database is modified. Data is a documented demo snapshot.
"""

from __future__ import annotations

import hashlib
import html
import json
import math
import re
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
TOKENS = json.loads((ROOT / "design_tokens.json").read_text())
ASSETS = json.loads((ROOT / "source-assets/source-assets.json").read_text())
WIDTH, HEIGHT = 1440, 1280
COLORS = TOKENS["colors"] | {
    "white": "#ffffff",
    "error": "#fff0e8",
    "transparent": "transparent",
}
WIRE_COLORS = {
    "paper": "#fafafa",
    "surface": "#ffffff",
    "forest": "#555555",
    "terracotta": "#555555",
    "ink": "#292929",
    "muted": "#777777",
    "line": "#cccccc",
    "sage": "#eeeeee",
    "gold": "#999999",
    "white": "#ffffff",
    "error": "#eeeeee",
    "transparent": "transparent",
}
NAV = [
    ("Browse", "LayoutGrid"),
    ("Book a stay", "CalendarPlus"),
    ("Audit trail", "ReceiptText"),
    ("Analytics", "ChartNoAxesCombined"),
    ("Search map", "MapPin"),
    ("Reviews", "Star"),
]
PROPERTIES = [
    ("Hyderabad", "Hyderabad Terrace Retreat 1", "5,089"),
    ("Delhi", "Delhi Terrace Retreat 2", "4,458"),
    ("Mumbai", "Mumbai Terrace Retreat 3", "3,981"),
    ("Bengaluru", "Bengaluru Garden Studio 4", "3,000"),
    ("Chennai", "Chennai Garden Studio 5", "1,821"),
    ("Hyderabad", "Hyderabad Terrace Retreat 6", "5,082"),
    ("Delhi", "Delhi Terrace Retreat 7", "4,294"),
    ("Mumbai", "Mumbai Courtyard House 8", "1,924"),
]


def font(size, bold=False, serif=False):
    """Use local fonts for previews; SVG retains the application's font stack."""
    name = "Georgia" if serif else "Arial"
    suffix = " Bold" if bold else ""
    # Apple's Helvetica includes ₹; the older Arial shipped here does not.
    helvetica = Path("/System/Library/Fonts/Helvetica.ttc")
    if not serif and helvetica.exists():
        return ImageFont.truetype(str(helvetica), round(size), index=1 if bold else 0)
    candidates = [
        Path(f"/System/Library/Fonts/Supplemental/{name}{suffix}.ttf"),
        Path(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
            if bold
            else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        ),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), round(size))
    return ImageFont.load_default()


class Scene:
    """Small vector vocabulary with explicit semantic groups for easy editing."""

    def __init__(self, screen, wire=False):
        self.screen = screen
        self.wire = wire
        self.items = []
        self.group = "shell"

    def add(self, kind, **values):
        self.items.append({"kind": kind, "group": self.group, **values})

    def rect(self, x, y, w, h, fill="surface", stroke="line", radius=9, opacity=100):
        self.add(
            "rect",
            x=x,
            y=y,
            w=w,
            h=h,
            fill=fill,
            stroke=stroke,
            radius=radius,
            opacity=opacity,
        )

    def ellipse(self, x, y, w, h, fill="sage", stroke="line", dashed=False):
        self.add("ellipse", x=x, y=y, w=w, h=h, fill=fill, stroke=stroke, dashed=dashed)

    def line(self, points, color="line", width=1, dashed=False):
        self.add("line", points=points, color=color, width=width, dashed=dashed)

    def text(
        self, x, y, value, size=13, color="ink", bold=False, serif=False, max_width=None
    ):
        """Wrap deliberately within a declared width; keep editable line breaks."""
        if max_width:
            wrapped = []
            measure = font(size, bold, serif and not self.wire)
            for paragraph in str(value).split("\n"):
                current = ""
                for word in paragraph.split(" "):
                    candidate = f"{current} {word}".strip()
                    if current and measure.getlength(candidate) > max_width:
                        wrapped.append(current)
                        current = word
                    else:
                        current = candidate
                wrapped.append(current)
            value = "\n".join(wrapped)
        self.add(
            "text",
            x=x,
            y=y,
            text=str(value),
            size=size,
            color=color,
            bold=bold,
            serif=serif and not self.wire,
        )

    def icon(self, name, x, y, size=20, color="forest", filled=False):
        self.add(
            "icon",
            name=name,
            x=x,
            y=y,
            w=size,
            h=size,
            color=color,
            filled=filled and not self.wire,
        )

    def art(self, x, y, w, h, variant=0):
        if self.wire:
            self.rect(x, y, w, h, "sage", radius=0)
            self.line([(x, y), (x + w, y + h)])
            self.line([(x + w, y), (x, y + h)])
            self.text(x + 12, y + h / 2 - 9, "Property illustration", 11, "muted")
        else:
            self.add("art", x=x, y=y, w=w, h=h, variant=variant % 4)

    def button(self, x, y, w, label, primary=True, icon=None, h=40):
        self.rect(
            x,
            y,
            w,
            h,
            "forest" if primary else "surface",
            "forest" if primary else "line",
            6,
        )
        self.text(x + 16, y + 13, label, 11, "white" if primary else "forest", True)
        if icon:
            self.icon(icon, x + w - 30, y + 11, 17, "white" if primary else "forest")

    def field(self, x, y, w, label, value, dropdown=False):
        self.text(x, y, label, 10, "muted")
        self.rect(x, y + 20, w, 38, radius=6)
        self.text(x + 12, y + 33, value, 11)
        if dropdown:
            self.icon("ChevronDown", x + w - 25, y + 31, 15, "muted")

    def panel(self, name, x, y, w, h, title=None, fill="surface"):
        self.group = name
        self.rect(x, y, w, h, fill)
        if title:
            self.text(x + 24, y + 25, title, 19, bold=True)

    def heading(self, eyebrow, title, description):
        self.text(262, 126, eyebrow, 9, "muted", True)
        self.text(262, 151, title, 39, serif=True)
        self.text(262, 213, description, 13, "muted")

    def shell(self, active, wallet="50,000.00"):
        """Mirror the 220 px rail, 88 px topbar and 42 px content inset."""
        self.rect(0, 0, WIDTH, HEIGHT, "paper", "transparent", 0)
        self.rect(0, 0, 220, 1190, "surface", radius=0)
        self.rect(22, 34, 37, 37, "forest", "transparent", 10)
        self.icon("Home", 28, 40, 25, "white")
        self.text(68, 42, "StaySpot", 26, "forest", True)
        self.text(181, 42, ".", 26, "terracotta", True)
        self.text(34, 123, "YOUR WORKSPACE", 9, "muted", True)
        for i, (label, icon) in enumerate(NAV):
            y = 150 + i * 53
            selected = label == active
            if selected:
                self.rect(22, y, 176, 47, "sage", "transparent", 7)
                self.ellipse(178, y + 21, 5, 5, "forest", "transparent")
            self.icon(icon, 36, y + 14, 19, "forest" if selected else "muted")
            self.text(
                69, y + 16, label, 13, "forest" if selected else "muted", selected
            )
        self.icon("Leaf", 34, 534, 32, "muted")
        self.text(
            34, 587, "A little closer\nto feeling at\nhome.", 21, "forest", serif=True
        )
        self.text(34, 695, "VACATION RENTALS &\nEXPERIENCES", 8, "muted")
        self.line([(32, 755), (188, 755)])
        self.text(32, 772, "Project 03           SSD · 2026", 10, "muted")
        self.rect(220, 0, 1220, 88, "surface", radius=0)
        self.text(262, 39, "Workspace    /", 11, "muted")
        self.text(349, 39, active, 11)
        self.ellipse(1096, 41, 6, 6, "forest", "transparent")
        self.text(1108, 39, "Live databases", 10, "muted")
        self.ellipse(1215, 27, 33, 33, "sage", "transparent")
        self.text(1223, 38, "AR", 10, "forest", True)
        self.text(1258, 31, "Ananya Rao", 11, bold=True)
        self.text(1258, 49, f"₹{wallet} in wallet", 10, "muted")
        self.icon("ChevronDown", 1381, 37, 15, "muted")

    def footer(self, note):
        """Keep assignment annotations outside the product's content region."""
        self.group = "assignment-notes"
        self.line([(262, 1185), (1398, 1185)])
        self.text(
            262,
            1203,
            "StaySpot · Thoughtful stays, meaningful experiences.",
            9,
            "muted",
        )
        self.rect(0, 1240, WIDTH, 40, "sage", "transparent", 0)
        self.text(22, 1254, f"DESIGN NOTE · {note}", 11, "forest")


def foundation(s):
    """A design-document page, not a new application or login screen."""
    s.rect(0, 0, WIDTH, HEIGHT, "paper", "transparent", 0)
    s.text(48, 38, "00 / FOUNDATIONS & USERS · MEMBER 1", 11, "forest", True)
    s.text(48, 76, "StaySpot. Thoughtful stays.", 44, serif=True)
    s.text(
        48,
        145,
        "Existing UI system, demo users and shared component reference.",
        16,
        "muted",
    )
    s.panel("guest-role", 48, 206, 648, 195, "Guest · demo actor")
    s.text(
        72,
        265,
        "Browse → inspect a property → book → check in → complete.",
        16,
        max_width=590,
    )
    s.text(
        72,
        315,
        "Switch Ananya Rao in the header. Wallet example: ₹50,000.00.\nThe current app uses a demo actor picker; it has no login page.",
        13,
        "muted",
    )
    s.panel("manager-role", 720, 206, 672, 195, "Property manager / analyst")
    s.text(
        744,
        265,
        "Browse guests and bookings. Inspect audit history, revenue,\nsearch hotspots, reviews and accessibility.",
        16,
    )
    s.text(
        744,
        330,
        "These are usage personas, not separate authenticated roles.",
        13,
        "muted",
    )
    s.panel("palette", 48, 427, 648, 225, "Source palette")
    for i, color in enumerate(["forest", "paper", "sage", "terracotta", "ink", "gold"]):
        x = 72 + i * 100
        s.rect(x, 490, 80, 62, color, radius=6)
        s.text(x, 565, color.title(), 11, bold=True)
        s.text(x, 585, COLORS[color], 10, "muted")
    s.panel("typography", 720, 427, 672, 225, "Typography & layout")
    s.text(744, 485, "A place for every possibility.", 30, serif=True)
    s.text(744, 539, "Georgia display · system sans / Inter body", 14)
    s.text(
        744,
        574,
        "1440 desktop · 220 rail · 88 header · 42 main inset\n9 px cards · 6 px controls · 39 px screen title",
        13,
        "muted",
    )
    s.panel("shared-controls", 48, 680, 1344, 205, "Shared controls & states")
    s.button(72, 744, 185, "Confirm booking", icon="ArrowRight")
    s.button(275, 744, 140, "Refresh totals", False, "RefreshCw")
    s.field(440, 720, 260, "Picker / search", "Search properties…")
    s.rect(732, 744, 140, 40, "sage")
    s.text(749, 758, "Checked in", 11, "forest")
    s.text(906, 750, "Loading…    /    No results\nError message + Retry", 13, "muted")
    s.text(
        72,
        820,
        "Modal · cursor pager · alert · table · HouseArt · heading · pill · accessible focus",
        14,
    )
    s.panel("ownership", 48, 913, 1344, 268, "Four-member ownership")
    rows = [
        (
            "Member 1",
            "00 Foundations · 01 Browse · 02 Details",
            "Shared React + PostgreSQL schema",
        ),
        (
            "Member 2",
            "03 Booking · 04 Status · 05 Audit",
            "Procedure + index + wallet trigger",
        ),
        ("Member 3", "06 Analytics", "Window functions + materialized totals"),
        (
            "Member 4",
            "07 Map · 08 Reviews & Amenities",
            "MongoDB aggregation pipelines",
        ),
    ]
    for i, row in enumerate(rows):
        y = 982 + i * 43
        s.text(72, y, row[0], 13, "forest", True)
        s.text(214, y, row[1], 13)
        s.text(810, y, row[2], 13, "muted")
    s.footer(
        "Documentation page; exact palette comes from web/src/style.css. No product behavior added."
    )


def browse(s):
    s.shell("Browse")
    s.heading(
        "YOUR NEXT CHAPTER",
        "A place for every possibility.",
        "Discover thoughtful spaces, familiar comforts, and a little room to explore.",
    )
    s.group = "browse-banner"
    s.rect(262, 258, 1136, 250, "forest", "transparent")
    s.icon("Leaf", 298, 286, 15, "white")
    s.text(320, 290, "MADE FOR SLOWER DAYS", 8, "white", True)
    s.text(298, 317, "Good stays.\nGreat beginnings.", 31, "white", serif=True)
    s.text(
        298,
        402,
        "From city corners to quiet courtyards,\nfind somewhere that feels like you.",
        11,
        "white",
    )
    s.button(298, 450, 140, "Book a stay", False, "ArrowUpRight", 36)
    s.art(810, 264, 570, 237)
    s.group = "browse-toolbar"
    for x, name in [(262, "Properties"), (353, "Guests"), (420, "Bookings")]:
        s.text(x, 555, name, 13, "forest" if x == 262 else "muted", x == 262)
    s.line([(262, 579), (326, 579)], "forest", 2)
    s.rect(1127, 542, 271, 38, radius=6)
    s.icon("Search", 1140, 552, 18, "muted")
    s.text(1166, 556, "Search properties…", 10, "muted")
    for i, (city, title, price) in enumerate(PROPERTIES):
        x, y = 262 + (i % 4) * 289, 602 + (i // 4) * 251
        s.group = f"property-{i+1}"
        s.rect(x, y, 269, 232)
        s.art(x + 5, y + 1, 259, 135, i)
        s.rect(x + 11, y + 11, 108, 25, "surface", "transparent", 2)
        s.icon("Leaf", x + 17, y + 17, 12, "muted")
        s.text(x + 32, y + 19, "Thoughtful spaces", 8, "muted")
        s.icon("MapPin", x + 13, y + 150, 12, "muted")
        s.text(x + 30, y + 151, city, 9, "muted")
        s.text(x + 240, y + 151, f"#{i+1}", 8, "muted")
        s.text(x + 14, y + 174, title, 11, bold=True)
        s.text(x + 14, y + 204, f"₹{price}.00", 13, "forest", True)
        s.text(x + 95, y + 207, "/ night", 9, "muted")
        s.icon("ArrowUpRight", x + 239, y + 204, 16, "muted")
    s.text(262, 1120, "Page 1 · 8 properties · up to 20 records per page", 9, "muted")
    s.button(1318, 1107, 35, "‹", False, h=33)
    s.button(1363, 1107, 35, "›", False, h=33)
    s.footer(
        "Member 1 · Browse.jsx · cards open the detail modal; Book a stay passes the property to Booking."
    )


def details(s):
    # A property is shown in a modal over Browse, exactly as the current component.
    browse(s)
    s.group = "modal-backdrop"
    s.rect(0, 0, WIDTH, 1240, "#283229", "transparent", 0, opacity=38)
    s.panel("property-modal", 434, 194, 572, 836, "Your stay, at a glance")
    s.icon("X", 957, 218, 20, "muted")
    s.art(458, 266, 524, 275, 1)
    fields = [
        ("id", "1"),
        ("title", "Hyderabad Terrace Retreat 1"),
        ("base price", "5089.00"),
        ("latitude", "17.420147"),
        ("longitude", "78.511706"),
    ]
    for i, (label, value) in enumerate(fields):
        y = 566 + i * 52
        s.text(458, y, label, 12, "muted")
        s.text(624, y, value, 13)
        s.line([(458, y + 30), (982, y + 30)])
    s.button(458, 923, 185, "Book this stay", icon="ArrowRight")
    s.footer(
        "Member 1 · PropertyDetails.jsx · read-only property record; editable design layers; close returns to Browse."
    )


def booking(s):
    s.shell("Book a stay", "44,911.00")
    s.heading(
        "MAKE YOURSELF AT HOME",
        "Let’s book your next stay.",
        "Pick a place, choose your nights, and leave the rest to us.",
    )
    s.panel("booking-form", 262, 258, 666, 597, "The little details")
    s.icon("CalendarPlus", 882, 283, 21, "muted")
    s.field(286, 332, 618, "01 · Choose your property", "Search properties…")
    for i, (_, title, price) in enumerate(PROPERTIES[:5]):
        y = 406 + i * 46
        s.rect(286, y, 618, 46, "sage" if i == 0 else "surface", radius=0)
        s.text(298, y + 11, title, 11, "forest")
        s.text(298, y + 28, f"#{i+1} · ₹{price}.00 / night", 8, "muted")
        s.icon("Check" if i == 0 else "Plus", 876, y + 15, 16, "muted")
    s.text(286, 649, "Previous", 9, "muted")
    s.text(820, 649, "More properties", 9, "muted")
    s.field(286, 684, 300, "02 · Number of nights", "1")
    s.field(604, 684, 300, "03 · Start your stay", "Check in now", True)
    s.text(
        286,
        760,
        "Only one checked-in stay per guest is allowed. Confirmed reservations can coexist.",
        10,
        "muted",
    )
    s.button(286, 788, 618, "Confirm booking", icon="ArrowRight", h=42)
    s.group = "wallet"
    s.rect(954, 258, 444, 150, "forest", "transparent")
    s.icon("Wallet", 979, 283, 18, "white")
    s.text(1006, 289, "YOUR STAY WALLET", 8, "white")
    s.text(978, 330, "₹44,911.00", 31, "white", True)
    s.text(978, 373, "Ananya Rao · Available balance", 9, "white")
    s.panel("quote", 954, 432, 444, 276, "Your stay summary")
    s.text(978, 507, "Hyderabad Terrace Retreat 1", 15, "forest", True)
    s.text(978, 554, "₹5,089.00 × 1 nights", 12, "muted")
    s.text(1290, 554, "₹5,089.00", 12, "forest", True)
    s.line([(978, 583), (1374, 583)])
    s.text(978, 608, "Total", 14, "muted")
    s.text(1285, 608, "₹5,089.00", 14, "forest", True)
    s.text(
        978,
        647,
        "The database calculates the final price and books only when your wallet can cover it.",
        10,
        "muted",
        max_width=386,
    )
    s.panel("booking-receipt", 262, 880, 1136, 198)
    s.rect(286, 904, 1088, 46, "sage", radius=5)
    s.icon("CircleCheck", 301, 917, 18)
    s.text(329, 921, "You’re all set. Booking #50017 is checked in.", 11, "forest")
    for x, label, value in [
        (286, "Balance before", "₹50,000.00"),
        (902, "Balance after", "₹44,911.00"),
        (1215, "Trigger-created audit #100019", "DEBIT ₹5,089.00"),
    ]:
        s.text(x, 973, label, 9, "muted")
        s.text(x, 995, value, 16, "forest", True)
    s.text(
        286,
        1034,
        "Booking, wallet debit, and audit entry were committed together. Visit Bookings to advance this stay.",
        11,
        "muted",
    )
    s.footer(
        "Member 2 · Transaction.jsx · sample success receipt; 1–365 nights; 365-night insufficient-funds variant is in the state board."
    )


def status(s):
    s.shell("Browse", "44,911.00")
    s.heading(
        "YOUR NEXT CHAPTER",
        "A place for every possibility.",
        "Discover thoughtful spaces, familiar comforts, and a little room to explore.",
    )
    s.group = "bookings-toolbar"
    for x, label in [(262, "Properties"), (353, "Guests"), (420, "Bookings")]:
        s.text(x, 279, label, 13, "forest" if label == "Bookings" else "muted")
    s.line([(420, 302), (487, 302)], "forest", 2)
    s.field(262, 326, 220, "Filter booking status", "All statuses", True)
    s.rect(514, 351, 15, 15, "surface", radius=2)
    s.icon("Check", 514, 351, 15)
    s.text(540, 353, "Selected guest only", 12)
    s.field(1090, 326, 308, "Search", "Find a booking by ID…")
    s.rect(262, 411, 1136, 59, "error", radius=5)
    s.text(
        282,
        434,
        "This guest already has a checked-in stay. Complete it before checking in again.",
        12,
        "terracotta",
    )
    s.panel("booking-table", 262, 493, 1136, 351)
    headers = [
        (286, "BOOKING"),
        (416, "PROPERTY"),
        (800, "NIGHTS"),
        (908, "STATUS"),
        (1190, "NEXT ACTION"),
    ]
    for x, label in headers:
        s.text(x, 519, label, 9, "muted", True)
    data = [
        ("#50017", "Hyderabad Terrace Retreat 1", "1", "CHECKED_IN", "Complete stay"),
        ("#50018", "Delhi Terrace Retreat 2", "2", "CONFIRMED", "Check in"),
        ("#50014", "Mumbai Terrace Retreat 3", "3", "COMPLETED", "All done"),
    ]
    for i, row in enumerate(data):
        y = 580 + i * 78
        s.line([(286, y - 20), (1374, y - 20)])
        for j, ((x, _), value) in enumerate(zip(headers, row)):
            if j == 3:
                s.rect(x, y - 8, 149, 30, "sage", "transparent", 4)
                s.text(x + 10, y + 1, value, 10, "forest")
            else:
                s.text(x, y, value, 12, "forest" if j == 4 else "ink")
    s.text(286, 809, "Page 1 · up to 20 records per page", 9, "muted")
    s.panel("transition-annotation", 262, 887, 1136, 218, "State sequence · annotation")
    for i, label in enumerate(["CONFIRMED", "CHECKED_IN", "COMPLETED"]):
        x = 286 + i * 357
        s.rect(x, 956, 293, 47, "sage")
        s.text(x + 24, 973, label, 14, "forest", True)
        if i < 2:
            s.icon("ArrowRight", x + 312, 969, 23)
    s.text(
        286,
        1032,
        "Only the next legal transition is offered. At most one CHECKED_IN stay per guest.",
        13,
    )
    s.text(
        286,
        1064,
        "A rejected transition keeps the current status and wallet balance unchanged.",
        12,
        "muted",
    )
    s.footer(
        "Member 2 · BookingStatusAction.jsx lives inside Browse → Bookings; annotation panel explains behavior, not a new app screen."
    )


def audit(s):
    s.shell("Audit trail", "44,911.00")
    s.heading(
        "EVERY RUPEE, ACCOUNTED FOR",
        "A clear trail. Peace of mind.",
        "Read-only wallet history for Ananya Rao.",
    )
    for x, w, label, value in [
        (262, 314, "AVAILABLE IN WALLET", "₹44,911.00"),
        (596, 313, "PAGE OPENING BALANCE", "₹50,000.00"),
    ]:
        s.panel(label, x, 258, w, 99)
        s.text(x + 24, 283, label, 8, "muted")
        s.text(x + 24, 312, value, 24, "forest", True)
    s.panel("immutable", 929, 258, 469, 99, fill="sage")
    s.icon("CircleCheck", 953, 294, 24)
    s.text(995, 292, "Always recorded. Never edited.", 12, "forest", True)
    s.text(
        995, 319, "Every wallet change leaves an immutable audit entry.", 10, "muted"
    )
    s.panel("audit-table", 262, 383, 1136, 675, "Wallet activity")
    s.field(1074, 405, 145, "From", "dd/mm/yyyy")
    s.field(1231, 405, 143, "To", "dd/mm/yyyy")
    columns = [
        (286, "ENTRY"),
        (440, "DATE & TIME"),
        (768, "TYPE"),
        (925, "CHANGE"),
        (1127, "RUNNING BALANCE"),
    ]
    for x, label in columns:
        s.text(x, 500, label, 9, "muted", True)
    for i in range(8):
        y = 550 + i * 52
        credit = i % 2 == 0
        values = [
            f"#{1+i*1000}",
            "7 Oct 2026, 12:42 pm",
            "Credit" if credit else "Debit",
            "+₹10.00" if credit else "−₹10.00",
            "₹50,010.00" if credit else "₹50,000.00",
        ]
        s.line([(286, y - 20), (1374, y - 20)])
        for j, ((x, _), value) in enumerate(zip(columns, values)):
            if j == 2:
                s.rect(
                    x, y - 5, 52, 24, "sage" if credit else "error", "transparent", 4
                )
                s.text(x + 8, y + 3, value, 9, "forest" if credit else "terracotta")
            else:
                s.text(
                    x,
                    y,
                    value,
                    11,
                    (
                        "forest"
                        if j == 3 and credit
                        else "terracotta" if j == 3 else "ink"
                    ),
                    j == 4,
                )
    s.text(286, 1017, "Page 1 · up to 20 records per page", 9, "muted")
    s.button(1318, 1005, 35, "‹", False, h=33)
    s.button(1363, 1005, 35, "›", False, h=33)
    s.footer(
        "Member 2 · Audit.jsx · representative first eight rows; date filters and cursor pagination preserve running balances."
    )


def analytics(s):
    s.shell("Analytics", "44,911.00")
    s.heading(
        "A LITTLE PERSPECTIVE",
        "Good places. Growing stories.",
        "See where your stays are taking you, one seven-day average at a time.",
    )
    s.button(1258, 188, 140, "Refresh totals", False, "RefreshCw")
    for i, (label, value, icon) in enumerate(
        [
            ("Gross booked revenue", "₹67,98,00,241.00", "ChartNoAxesCombined"),
            ("Nights booked", "1,99,802", "CalendarPlus"),
            ("Total bookings", "50,013", "Home"),
            ("Properties", "2,000", "LayoutGrid"),
        ]
    ):
        x = 262 + i * 289
        s.panel(f"metric-{i}", x, 258, 269, 142)
        s.icon(icon, x + 18, 282, 18, "muted")
        s.text(x + 45, 287, label, 9, "muted")
        s.text(x + 18, 325, value, 22, "forest", True)
        s.text(x + 18, 372, "Lifetime materialized totals", 8, "muted")
    s.text(1160, 417, "Last refreshed 7 Oct 2026, 01:27 pm", 9, "muted")
    s.panel("revenue-chart", 262, 454, 1136, 388, "Revenue, with room to grow")
    s.text(
        286,
        510,
        "Seven-day moving average · top 4 displayed properties · UTC",
        11,
        "muted",
    )
    s.field(1074, 474, 145, "From", "08/09/2026")
    s.field(1231, 474, 143, "To", "07/10/2026")
    for i, label in enumerate(["₹9k", "₹7k", "₹5k", "₹2k", "₹0k"]):
        y = 567 + i * 47
        s.text(298, y - 6, label, 10, "muted")
        s.line([(338, y), (1355, y)], dashed=True)
    values = [
        [4, 4, 9, 9, 5.5, 5.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [3.8, 3.8, 0, 0, 0, 0, 0, 2, 2, 2, 8, 8, 6, 8.8, 3, 3],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 6, 4, 4, 7.8, 4.6],
        [0, 0, 3.8, 3.8, 3.8, 4.4, 2, 2, 2, 1.4, 0, 0, 0, 0, 5.3, 5.3],
    ]
    for i, series in enumerate(values):
        color = ["forest", "terracotta", "muted", "gold"][i]
        s.line(
            [
                (338 + j * (1017 / 15), 755 - v * (188 / 9))
                for j, v in enumerate(series)
            ],
            color,
            3,
        )
    for i, label in enumerate(["8 Sept", "15 Sept", "22 Sept", "29 Sept", "7 Oct"]):
        s.text(338 + i * 248, 782, label, 10, "muted")
    s.text(
        286,
        819,
        "● Hyderabad Skyline Loft 1931    ● Chennai Garden Studio 555    ● Hyderabad Courtyard House 1026    ● Hyderabad Garden Studio 836",
        8,
        "muted",
    )
    s.panel("daily-rank-table", 262, 866, 1136, 310, "Places on the rise")
    s.text(
        286,
        920,
        "Top 12 properties by lifetime revenue; equal daily seven-day averages share a dense rank.",
        11,
        "muted",
    )
    columns = [
        (286, "RANK"),
        (390, "PROPERTY"),
        (785, "7-DAY AVERAGE"),
        (1010, "DAY REVENUE"),
        (1210, "LIFETIME NIGHTS"),
    ]
    for x, label in columns:
        s.text(x, 958, label, 9, "muted", True)
    rows = [
        ("1", "Hyderabad Garden Studio 836", "₹5,031.00", "₹0.00", "178"),
        ("2", "Hyderabad Courtyard House 1026", "₹4,344.00", "₹0.00", "180"),
        ("3", "Chennai Garden Studio 555", "₹3,019.43", "₹0.00", "187"),
        ("4", "Hyderabad Courtyard House 1836", "₹1,548.57", "₹0.00", "143"),
        ("5", "Hyderabad Garden Studio 236", "₹0.00", "₹0.00", "154"),
        ("5", "Mumbai Courtyard House 243", "₹0.00", "₹0.00", "153"),
    ]
    for i, row in enumerate(rows):
        y = 993 + i * 32
        s.line([(286, y - 11), (1374, y - 11)])
        for (x, _), value in zip(columns, row):
            s.text(x, y, value, 11)
    s.footer(
        "Member 3 · Analytics.jsx · sample chart/rank excerpt; zero-filled days, seven-day window and tie-preserving dense ranks."
    )


def map_view(s):
    s.shell("Search map", "44,911.00")
    s.heading(
        "FOLLOW THE CURIOSITY",
        "Where people want to be.",
        "Live search pins and neighborhood hotspots, within five kilometres of you.",
    )
    s.button(1243, 188, 155, "Add a search pin", False, "Plus")
    s.panel("map-controls", 262, 258, 1136, 90)
    s.field(280, 278, 190, "Latitude", "17.385")
    s.field(484, 278, 200, "Longitude", "78.4867")
    s.button(696, 289, 140, "Explore this area", icon="ArrowRight")
    s.field(1230, 278, 150, "Recent searches", "Last hour", True)
    s.panel("map-activity", 262, 372, 692, 592, "Search activity")
    s.text(847, 399, "LIVE · 15s polling", 8, "forest")
    s.group = "schematic-map"
    s.rect(263, 435, 690, 431, "sage", radius=0)
    # Native vector streets and marks keep this illustration editable. It is not
    # a geographic tile capture; the real application continues to use Leaflet.
    s.line(
        [(278, 728), (419, 692), (495, 756), (630, 735), (780, 658), (940, 683)],
        "gold",
        18,
    )
    for offset in range(0, 600, 85):
        s.line([(290 + offset, 440), (345 + offset, 866)], "surface", 6)
    for offset in range(0, 380, 67):
        s.line([(263, 471 + offset), (953, 460 + offset)], "surface", 5)
    s.line([(266, 490), (485, 575), (657, 527), (950, 598)], "gold", 9)
    s.line([(350, 435), (470, 618), (729, 650), (908, 866)], "gold", 9)
    s.ellipse(389, 469, 431, 359, "transparent", "forest", True)
    for i in range(26):
        x = 573 + math.sin(i * 1.6) * (30 + (i % 6) * 12)
        y = 667 + math.cos(i * 2.1) * (25 + (i % 4) * 15)
        s.ellipse(x, y, 8, 8, "terracotta", "surface")
    for x, y, size in [
        (371, 560, 23),
        (486, 497, 18),
        (700, 536, 24),
        (758, 666, 27),
        (473, 741, 22),
        (657, 795, 20),
    ]:
        s.ellipse(x, y, size, size, "forest", "surface")
    s.ellipse(598, 641, 14, 14, "white", "forest")
    s.text(591, 767, "Hyderabad", 15, "forest", True)
    s.text(277, 841, "SCHEMATIC · not geographic tiles", 9, "forest", True)
    s.button(275, 448, 31, "+", False, h=31)
    s.button(275, 480, 31, "−", False, h=31)
    s.text(
        280,
        887,
        "● Search pins     ● Grid hotspots     Click to move origin · 5 km radius",
        9,
        "muted",
    )
    s.panel("nearby-searches", 978, 372, 420, 592, "Nearby searches")
    s.text(1002, 446, "Nearest 100 pins · sorted by distance", 11, "muted")
    for i, distance in enumerate(
        ["0 m", "0 m", "0 m", "29 m", "51 m", "189 m", "229 m"]
    ):
        y = 496 + i * 55
        s.rect(1002, y + 2, 30, 30, "sage", "transparent", 5)
        s.icon("MapPin", 1009, y + 8, 17, "muted")
        s.text(1043, y + 6, f"Search pin {i+1}", 10, "forest")
        s.text(1043, y + 24, "17.3850, 78.4867", 8, "muted")
        s.text(1340, y + 10, distance, 8, "muted")
        s.line([(1002, y + 45), (1374, y + 45)])
    s.text(1002, 923, "Checked 7 Oct 2026, 01:28 pm", 10, "muted")
    s.text(
        262,
        995,
        "Map tiles need internet. Hotspots group recent local pins into approximate 0.5 km grid cells.",
        11,
        "muted",
    )
    s.footer(
        "Member 4 · MapView.jsx · schematic map; real app uses Leaflet. Filters: 15/60/120 minutes; up to 25 hotspots."
    )


def reviews(s):
    s.shell("Reviews", "44,911.00")
    s.heading(
        "THE LITTLE THINGS PEOPLE LOVE",
        "Every stay has a story.",
        "Guest impressions, favorite details, and a closer look at what’s included.",
    )
    s.button(1243, 188, 155, "Property #1", False, "ChevronDown")
    s.panel("review-score", 262, 258, 283, 339, fill="sage")
    s.text(340, 294, "THE GUEST VERDICT", 9, "muted", True)
    s.text(337, 335, "4.21", 58, "forest", True, True)
    s.text(451, 371, "/ 5", 20, "muted")
    for i in range(5):
        s.icon("Star", 338 + i * 27, 404, 21, "gold", filled=i < 4)
    s.text(337, 449, "From 28 reviews in the past year", 9, "muted")
    s.panel("rating-distribution", 565, 258, 389, 339, "A little more detail")
    s.text(589, 313, "Rating distribution", 10, "muted")
    for i, count in enumerate([14, 9, 3, 1, 1]):
        y = 353 + i * 30
        s.text(589, y - 4, str(5 - i), 10, "muted")
        s.icon("Star", 599, y - 5, 12, "muted")
        s.rect(621, y, 275, 6, "sage", "transparent", 3)
        s.rect(621, y, 275 * count / 28, 6, "muted", "transparent", 3)
        s.text(920, y - 4, str(count), 9, "muted")
    s.panel("frequent-tags", 974, 258, 424, 339, "Words that keep coming up")
    s.text(998, 313, "Top location tags", 10, "muted")
    for i, (label, count) in enumerate(
        [
            ("Scenic View", 13),
            ("Great Workspace", 12),
            ("Quiet Neighborhood", 12),
            ("Downtown", 10),
            ("Near Transit", 6),
        ]
    ):
        y = 354 + i * 44
        s.text(998, y, label, 9, "muted")
        s.text(1362, y, str(count), 9, "muted")
        s.rect(998, y + 19, 376, 6, "sage", "transparent", 3)
        s.rect(998, y + 19, 376 * count / 13, 6, "gold", "transparent", 3)
    s.panel("property-amenities", 262, 622, 1136, 231)
    s.text(286, 648, "MORE THAN A PLACE TO SLEEP", 9, "muted", True)
    s.text(286, 674, "Small comforts. Thoughtful details.", 28, serif=True)
    s.icon("Leaf", 1350, 658, 25, "muted")
    s.line([(286, 720), (1374, 720)])
    for x, title, values in [
        (286, "House Rules", ["No smoking", "Quiet hours 10 PM to 8 AM"]),
        (616, "Accessibility Features", ["Elevator", "Wide doorways"]),
        (
            946,
            "Amenities",
            ["essentials: Wi-Fi, Kitchen, Workspace", "outdoors: Balcony, Garden"],
        ),
    ]:
        s.text(x, 739, title, 11, "forest", True)
        for i, value in enumerate(values):
            y = 776 + i * 31
            s.icon("Check", x, y - 3, 16, "muted")
            s.text(x + 24, y, value, 11, "muted")
    s.footer(
        "Member 4 · Reviews.jsx · property selector opens a picker; MongoDB supplies rating bins, tag counts and flexible amenities."
    )


def interaction_states(s):
    """Separate annotations keep alternative states out of the main UI mockups."""
    s.rect(0, 0, WIDTH, HEIGHT, "paper", "transparent", 0)
    s.text(48, 38, "SUPPLEMENT / SHARED INTERACTION STATES", 11, "forest", True)
    s.text(48, 79, "The paths beyond the happy path.", 40, serif=True)
    s.text(
        48,
        143,
        "Independent demo scenarios from the existing components. This is a design annotation board.",
        14,
        "muted",
    )
    cards = [
        (
            "Success · Member 2",
            "You’re all set. Booking #50017 is checked in.",
            "1 night × ₹5,089 = ₹5,089\nBefore ₹50,000 → after ₹44,911\nTrigger audit #100019 · DEBIT ₹5,089",
            "sage",
        ),
        (
            "Insufficient balance · Member 2",
            "Insufficient wallet balance.",
            "365 nights × ₹5,089 = ₹18,57,485\nWallet ₹50,000 cannot cover this booking.\nBooking, debit and audit are rolled back.",
            "error",
        ),
        (
            "Active-stay constraint · Member 2",
            "This guest already has a checked-in stay.",
            "Complete it before checking in again.\nExisting stay remains CHECKED_IN.\nRejected reservation remains CONFIRMED.",
            "error",
        ),
        (
            "Loading / empty · All members",
            "Loading…   →   No results for these filters.",
            "DataState covers fetches and empty result sets.\nKeep filters available so the user can revise them.\nNo reviews: no average; preserve empty bins.",
            "sage",
        ),
        (
            "Error / retry · All members",
            "Request failed. Try again.",
            "Alert explains the request failure.\nDataState provides Retry for read errors.\nHeader: Offline when database health fails.",
            "error",
        ),
        (
            "Demo guest picker · Member 1",
            "Switch your demo guest",
            "Search guests… → paged list → select actor\nHeader name and wallet refresh.\nBookings and audit can follow the selected guest.",
            "sage",
        ),
    ]
    for i, (title, message, body, fill) in enumerate(cards):
        x, y = 48 + (i % 2) * 684, 210 + (i // 2) * 312
        s.panel(f"state-{i}", x, y, 660, 280, title)
        s.rect(x + 24, y + 65, 612, 45, fill, radius=5)
        s.text(
            x + 40, y + 81, message, 12, "forest" if fill == "sage" else "terracotta"
        )
        s.text(x + 24, y + 135, body, 15, "muted")
        if i == 4:
            s.button(x + 24, y + 222, 92, "Retry", False, "RefreshCw", 34)
        elif i == 5:
            s.button(x + 24, y + 222, 191, "Ananya Rao · #1", False, "Check", 34)
    s.footer(
        "Alternative states are annotations. Source: Transaction, BookingStatusAction, DataState, App, Picker and Reviews."
    )


BUILDERS = [
    foundation,
    browse,
    details,
    booking,
    status,
    audit,
    analytics,
    map_view,
    reviews,
]
SLUGS = [
    "00_foundations",
    "01_browse",
    "02_property_details",
    "03_book_stay",
    "04_booking_status",
    "05_wallet_audit",
    "06_analytics",
    "07_search_map",
    "08_reviews",
]


def color(value, wire=False):
    palette = WIRE_COLORS if wire else COLORS
    return palette.get(value, value)


def asset_svg(item):
    """Return source vectors, without flattening a component into a bitmap."""
    if item["kind"] == "art":
        return ASSETS["house"][item["variant"]]
    source = ASSETS["icons"][item["name"]].replace("#244c38", color(item["color"]))
    if item.get("filled"):
        source = source.replace('fill="none"', f'fill="{color(item["color"])}"')
    return source


def svg(scene):
    """Export native rectangles, paths and text; all content remains editable."""
    result = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img">',
        f'<title>StaySpot — {html.escape(scene.screen["name"])}</title>',
    ]
    last_group = None
    for item in scene.items:
        if item["group"] != last_group:
            if last_group is not None:
                result.append("</g>")
            result.append(f'<g data-section="{html.escape(item["group"])}">')
            last_group = item["group"]
        kind = item["kind"]
        if kind in ("rect", "ellipse"):
            fill, stroke = color(item["fill"], scene.wire), color(
                item["stroke"], scene.wire
            )
            dash = ' stroke-dasharray="7 6"' if item.get("dashed") else ""
            if kind == "rect":
                geometry = f'x="{item["x"]}" y="{item["y"]}" width="{item["w"]}" height="{item["h"]}" rx="{item["radius"]}"'
                tag = "rect"
            else:
                geometry = f'cx="{item["x"]+item["w"]/2}" cy="{item["y"]+item["h"]/2}" rx="{item["w"]/2}" ry="{item["h"]/2}"'
                tag = "ellipse"
            result.append(
                f'<{tag} {geometry} fill="{fill}" stroke="{stroke}" opacity="{item.get("opacity", 100)/100}"{dash}/>'
            )
        elif kind == "line":
            points = " ".join(f"{x},{y}" for x, y in item["points"])
            dash = ' stroke-dasharray="5 6"' if item["dashed"] else ""
            result.append(
                f'<polyline points="{points}" fill="none" stroke="{color(item["color"], scene.wire)}" stroke-width="{item["width"]}"{dash}/>'
            )
        elif kind == "text":
            family = (
                "Georgia, Times New Roman, serif"
                if item["serif"]
                else "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif"
            )
            weight = 700 if item["bold"] else 400
            result.append(
                f'<text x="{item["x"]}" y="{item["y"]+item["size"]*0.85}" font-family="{family}" font-size="{item["size"]}" font-weight="{weight}" fill="{color(item["color"], scene.wire)}">'
            )
            for i, line in enumerate(item["text"].split("\n")):
                result.append(
                    f'<tspan x="{item["x"]}" dy="{0 if i == 0 else item["size"]*1.4}">{html.escape(line)}</tspan>'
                )
            result.append("</text>")
        else:
            source = asset_svg(item)
            if scene.wire:
                source = source.replace(
                    color(item.get("color", "forest")),
                    color(item.get("color", "forest"), True),
                )
            # A nested SVG has its own viewBox so source artwork preserves proportions.
            source = re.sub(
                r"<svg\b[^>]*",
                lambda m: re.sub(r'\s(?:width|height)="[^"]*"', "", m[0]),
                source,
                count=1,
            )
            source = source.replace(
                "<svg ",
                f'<svg x="{item["x"]}" y="{item["y"]}" width="{item["w"]}" height="{item["h"]}" preserveAspectRatio="none" ',
                1,
            )
            result.append(source)
    if last_group is not None:
        result.append("</g>")
    result.append("</svg>")
    return "\n".join(result)


def arc_points(start, values, relative):
    """Convert an SVG elliptical arc from endpoint form to sampled center form."""
    rx, ry, degrees, large, sweep, x, y = values
    end = (x + start[0], y + start[1]) if relative else (x, y)
    rx, ry = abs(rx), abs(ry)
    if not rx or not ry or end == start:
        return [end]
    phi = math.radians(degrees)
    cosine, sine = math.cos(phi), math.sin(phi)
    dx, dy = (start[0] - end[0]) / 2, (start[1] - end[1]) / 2
    xp, yp = cosine * dx + sine * dy, -sine * dx + cosine * dy
    scale = xp * xp / (rx * rx) + yp * yp / (ry * ry)
    if scale > 1:
        rx, ry = rx * math.sqrt(scale), ry * math.sqrt(scale)
    numerator = max(0, rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp)
    denominator = rx * rx * yp * yp + ry * ry * xp * xp
    factor = math.sqrt(numerator / denominator) if denominator else 0
    if bool(large) == bool(sweep):
        factor = -factor
    cxp, cyp = factor * rx * yp / ry, -factor * ry * xp / rx
    cx = cosine * cxp - sine * cyp + (start[0] + end[0]) / 2
    cy = sine * cxp + cosine * cyp + (start[1] + end[1]) / 2
    theta = math.atan2((yp - cyp) / ry, (xp - cxp) / rx)
    end_theta = math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx)
    delta = (end_theta - theta) % (2 * math.pi)
    if not sweep:
        delta -= 2 * math.pi
    points = []
    for step in range(1, 25):
        angle = theta + delta * step / 24
        points.append(
            (
                cx + cosine * rx * math.cos(angle) - sine * ry * math.sin(angle),
                cy + sine * rx * math.cos(angle) + cosine * ry * math.sin(angle),
            )
        )
    return points


def path_points(data):
    """Sample the SVG line/quadratic/cubic commands used by HouseArt and Lucide.

    This renderer is for offline preview PNGs only. The SVG export retains the
    original, exact source paths. Curves are sampled into 16 segments per command.
    """
    tokens = re.findall(r"[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?", data)
    paths, points, cursor, start, control = [], [], (0, 0), (0, 0), None
    i, command = 0, "M"
    arities = {"M": 2, "L": 2, "H": 1, "V": 1, "Q": 4, "T": 2, "C": 6, "S": 4, "A": 7}
    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
        upper, relative = command.upper(), command.islower()
        if upper == "Z":
            points.append(start)
            paths.append(points)
            points, cursor, control = [], start, None
            command = "M"
            continue
        if upper not in arities or i + arities[upper] > len(tokens):
            break
        values = [float(n) for n in tokens[i : i + arities[upper]]]
        i += arities[upper]
        old = cursor

        def pair(index):
            return (
                values[index] + (old[0] if relative else 0),
                values[index + 1] + (old[1] if relative else 0),
            )

        if upper in ("M", "L"):
            cursor = pair(0)
            if upper == "M":
                if points:
                    paths.append(points)
                points, start = [], cursor
                command = "l" if relative else "L"
            points.append(cursor)
            control = None
        elif upper in ("H", "V"):
            cursor = (
                (values[0] + (old[0] if relative else 0), old[1])
                if upper == "H"
                else (old[0], values[0] + (old[1] if relative else 0))
            )
            points.append(cursor)
            control = None
        elif upper in ("Q", "T", "C", "S"):
            if upper == "Q":
                c1, end = pair(0), pair(2)
            elif upper == "T":
                c1 = (
                    (2 * old[0] - control[0], 2 * old[1] - control[1])
                    if control
                    else old
                )
                end = pair(0)
            elif upper == "C":
                c1, c2, end = pair(0), pair(2), pair(4)
            else:
                c1 = (
                    (2 * old[0] - control[0], 2 * old[1] - control[1])
                    if control
                    else old
                )
                c2, end = pair(0), pair(2)
            for step in range(1, 17):
                t, u = step / 16, 1 - step / 16
                if upper in ("Q", "T"):
                    point = tuple(
                        u * u * old[k] + 2 * u * t * c1[k] + t * t * end[k]
                        for k in (0, 1)
                    )
                else:
                    point = tuple(
                        u**3 * old[k]
                        + 3 * u * u * t * c1[k]
                        + 3 * u * t * t * c2[k]
                        + t**3 * end[k]
                        for k in (0, 1)
                    )
                points.append(point)
            cursor, control = end, c1 if upper in ("Q", "T") else c2
        else:
            arc = arc_points(old, values, relative)
            points.extend(arc)
            cursor = arc[-1]
            control = None
    if points:
        paths.append(points)
    return paths


def draw_source(draw, item, wire):
    """Render source illustration primitives to PNG without a browser session."""
    root = ET.fromstring(asset_svg(item))
    viewbox = [float(v) for v in root.attrib.get("viewBox", "0 0 24 24").split()]
    sx, sy = item["w"] / viewbox[2], item["h"] / viewbox[3]

    def point(x, y):
        return (item["x"] + float(x) * sx, item["y"] + float(y) * sy)

    for node in root.iter():
        tag = node.tag.split("}")[-1]
        attrs = root.attrib | node.attrib
        fill, stroke = attrs.get("fill", "none"), attrs.get("stroke", "none")
        if wire:
            stroke = (
                color(item.get("color", "forest"), True) if stroke != "none" else "none"
            )
        fill = None if fill in ("none", "transparent") else fill
        stroke = None if stroke in ("none", "transparent") else stroke
        width = max(1, round(float(attrs.get("stroke-width", 1)) * sx))
        if tag == "rect":
            x, y = float(attrs.get("x", 0)), float(attrs.get("y", 0))
            box = [
                point(x, y),
                point(x + float(attrs["width"]), y + float(attrs["height"])),
            ]
            draw.rounded_rectangle(
                box,
                radius=float(attrs.get("rx", 0)) * sx,
                fill=fill,
                outline=stroke,
                width=width,
            )
        elif tag in ("circle", "ellipse"):
            cx, cy = float(attrs["cx"]), float(attrs["cy"])
            rx, ry = float(attrs.get("r", attrs.get("rx", 0))), float(
                attrs.get("r", attrs.get("ry", 0))
            )
            draw.ellipse(
                [point(cx - rx, cy - ry), point(cx + rx, cy + ry)],
                fill=fill,
                outline=stroke,
                width=width,
            )
        elif tag == "path":
            for path in path_points(attrs["d"]):
                pts = [point(x, y) for x, y in path]
                if fill and len(pts) >= 3:
                    draw.polygon(pts, fill=fill)
                if stroke and len(pts) >= 2:
                    draw.line(pts, fill=stroke, width=width, joint="curve")
        elif tag in ("polygon", "polyline"):
            numbers = [float(n) for n in re.findall(r"[-\d.]+", attrs["points"])]
            pts = [point(numbers[i], numbers[i + 1]) for i in range(0, len(numbers), 2)]
            if fill:
                draw.polygon(pts, fill=fill)
            if stroke:
                draw.line(pts, fill=stroke, width=width)
        elif tag == "line":
            draw.line(
                [point(attrs["x1"], attrs["y1"]), point(attrs["x2"], attrs["y2"])],
                fill=stroke,
                width=width,
            )


def png(scene):
    """Produce an offline visual QA image from the same vector scene."""
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(canvas)
    for item in scene.items:
        kind = item["kind"]
        if kind in ("rect", "ellipse"):
            box = [item["x"], item["y"], item["x"] + item["w"], item["y"] + item["h"]]
            fill, stroke = color(item["fill"], scene.wire), color(
                item["stroke"], scene.wire
            )
            fill = None if fill == "transparent" else fill
            stroke = None if stroke == "transparent" else stroke
            if kind == "rect":
                if item.get("opacity", 100) < 100:
                    overlay = Image.new("RGBA", canvas.size)
                    overlay_draw = ImageDraw.Draw(overlay)
                    overlay_draw.rounded_rectangle(box, item["radius"], fill=fill)
                    alpha = overlay.getchannel("A").point(
                        lambda a: round(a * item["opacity"] / 100)
                    )
                    canvas.paste(overlay, (0, 0), alpha)
                else:
                    draw.rounded_rectangle(
                        box, item["radius"], fill=fill, outline=stroke
                    )
            else:
                draw.ellipse(box, fill=fill, outline=stroke)
        elif kind == "text":
            for i, line in enumerate(item["text"].split("\n")):
                preview_text(draw, item, line, i, scene.wire)
        elif kind == "line":
            draw.line(
                item["points"],
                fill=color(item["color"], scene.wire),
                width=round(item["width"]),
                joint="curve",
            )
        else:
            draw_source(draw, item, scene.wire)
    return canvas


def preview_text(draw, item, text, line_number, wire):
    """Use a glyph fallback for annotation arrows omitted from macOS Helvetica."""
    main_font = font(item["size"], item["bold"], item["serif"])
    fallback_path = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
    fallback = (
        ImageFont.truetype(str(fallback_path), item["size"])
        if fallback_path.exists()
        else main_font
    )
    x = item["x"]
    baseline = item["y"] + line_number * item["size"] * 1.4 + item["size"] * 0.85
    for run in re.split(r"([→☆])", text):
        selected = fallback if run in ("→", "☆") else main_font
        draw.text(
            (x, baseline),
            run,
            font=selected,
            fill=color(item["color"], wire),
            anchor="ls",
        )
        x += selected.getlength(run)


def identifier(value):
    """Deterministic IDs keep frame/group links stable when regenerating exports."""
    return hashlib.sha256(value.encode()).hexdigest()[:20]


def excalidraw(scenes):
    """Create actual editable elements, not screenshots inside an Excalidraw file.

    Frames contain grouped rectangles, text, ellipses and vector lines. Excalidraw
    uses its built-in Helvetica font; the SVG UI exports retain Georgia/system sans.
    """
    elements = []
    timestamp = 1791417600000  # Stable document metadata, 8 October 2026 UTC.

    def element(kind, label, x, y, w, h, frame=None, group=None, **extra):
        key = identifier(label)
        base = {
            "id": key,
            "type": kind,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "angle": 0,
            "strokeColor": "#292929",
            "backgroundColor": "transparent",
            "fillStyle": "solid",
            "strokeWidth": 1,
            "strokeStyle": "solid",
            "roundness": None,
            "roughness": 0,
            "opacity": 100,
            "seed": int(key[:7], 16),
            "version": 1,
            "versionNonce": int(key[7:14], 16),
            "index": None,
            "isDeleted": False,
            "groupIds": [group] if group else [],
            "frameId": frame,
            "boundElements": None,
            "updated": timestamp,
            "link": None,
            "locked": False,
        }
        base.update(extra)
        elements.append(base)
        return key

    for number, scene in enumerate(scenes):
        ox, oy = (number % 3) * (WIDTH + 120), (number // 3) * (HEIGHT + 140)
        prefix = ("wire" if scene.wire else "ui") + ":" + scene.screen["id"]
        frame = element(
            "frame",
            prefix + ":frame",
            ox,
            oy,
            WIDTH,
            HEIGHT,
            name=f'{scene.screen["id"]} {scene.screen["name"]} · Member {scene.screen["member"]}',
        )
        for i, item in enumerate(scene.items):
            label = f"{prefix}:{i}"
            group = identifier(prefix + ":" + item["group"])
            common = {"frame": frame, "group": group}
            kind = item["kind"]
            if kind in ("rect", "ellipse"):
                element(
                    "rectangle" if kind == "rect" else "ellipse",
                    label,
                    ox + item["x"],
                    oy + item["y"],
                    item["w"],
                    item["h"],
                    **common,
                    backgroundColor=color(item["fill"], scene.wire),
                    strokeColor=color(item["stroke"], scene.wire),
                    opacity=item.get("opacity", 100),
                    strokeStyle="dashed" if item.get("dashed") else "solid",
                    roundness={"type": 3} if item.get("radius", 0) else None,
                )
            elif kind == "text":
                measure = font(item["size"])
                lines = item["text"].split("\n")
                w = max(measure.getlength(line) for line in lines) + 8
                h = len(lines) * item["size"] * 1.4
                element(
                    "text",
                    label,
                    ox + item["x"],
                    oy + item["y"],
                    w,
                    h,
                    **common,
                    strokeColor=color(item["color"], scene.wire),
                    fontSize=item["size"],
                    fontFamily=2,
                    text=item["text"],
                    originalText=item["text"],
                    textAlign="left",
                    verticalAlign="top",
                    containerId=None,
                    autoResize=True,
                    lineHeight=1.4,
                )
            elif kind == "line":
                add_excal_line(
                    element,
                    label,
                    item["points"],
                    ox,
                    oy,
                    common,
                    color(item["color"], scene.wire),
                    item["width"],
                    dashed=item["dashed"],
                )
            else:
                # Convert source SVG icons/art into native Excalidraw primitives.
                root = ET.fromstring(asset_svg(item))
                viewbox = [
                    float(v) for v in root.attrib.get("viewBox", "0 0 24 24").split()
                ]
                sx, sy = item["w"] / viewbox[2], item["h"] / viewbox[3]
                for j, node in enumerate(root.iter()):
                    tag = node.tag.split("}")[-1]
                    attrs = root.attrib | node.attrib
                    fill, stroke = attrs.get("fill", "none"), attrs.get(
                        "stroke", "none"
                    )
                    fill = "transparent" if fill == "none" else fill
                    stroke = "transparent" if stroke == "none" else stroke
                    if scene.wire and stroke != "transparent":
                        stroke = color(item.get("color", "forest"), True)
                    width = float(attrs.get("stroke-width", 1)) * sx
                    sublabel = f"{label}:svg:{j}"
                    if tag in ("rect", "circle", "ellipse"):
                        if tag == "rect":
                            x, y = float(attrs.get("x", 0)), float(attrs.get("y", 0))
                            w, h = float(attrs["width"]), float(attrs["height"])
                        else:
                            rx = float(attrs.get("r", attrs.get("rx", 0)))
                            ry = float(attrs.get("r", attrs.get("ry", 0)))
                            x, y = float(attrs["cx"]) - rx, float(attrs["cy"]) - ry
                            w, h = rx * 2, ry * 2
                        element(
                            "rectangle" if tag == "rect" else "ellipse",
                            sublabel,
                            ox + item["x"] + x * sx,
                            oy + item["y"] + y * sy,
                            w * sx,
                            h * sy,
                            **common,
                            backgroundColor=fill,
                            strokeColor=stroke,
                            strokeWidth=width,
                        )
                    elif tag in ("path", "polyline", "polygon", "line"):
                        if tag == "path":
                            paths = path_points(attrs["d"])
                        elif tag == "line":
                            paths = [
                                [
                                    (float(attrs["x1"]), float(attrs["y1"])),
                                    (float(attrs["x2"]), float(attrs["y2"])),
                                ]
                            ]
                        else:
                            nums = [
                                float(n)
                                for n in re.findall(r"[-\d.]+", attrs["points"])
                            ]
                            paths = [
                                [(nums[k], nums[k + 1]) for k in range(0, len(nums), 2)]
                            ]
                        for k, path in enumerate(paths):
                            pts = [
                                (item["x"] + x * sx, item["y"] + y * sy)
                                for x, y in path
                            ]
                            if fill != "transparent" and pts:
                                pts.append(pts[0])
                            add_excal_line(
                                element,
                                f"{sublabel}:{k}",
                                pts,
                                ox,
                                oy,
                                common,
                                stroke,
                                width,
                                fill=fill,
                            )
    document = {
        "type": "excalidraw",
        "version": 2,
        "source": "https://excalidraw.com",
        "elements": elements,
        "files": {},
        "appState": {
            "viewBackgroundColor": "#f3f3ef",
            "theme": "light",
            "zoom": {"value": 0.22},
            "scrollX": 60,
            "scrollY": 100,
            "frameRendering": {
                "enabled": True,
                "name": True,
                "outline": True,
                "clip": True,
            },
        },
    }
    # Structural checks are meaningful for an importable editable document.
    ids = [element["id"] for element in elements]
    assert len(ids) == len(set(ids)), "Duplicate element IDs"
    frames = {e["id"] for e in elements if e["type"] == "frame"}
    assert len(frames) == len(scenes), "Missing screen frame"
    assert all(e["frameId"] is None or e["frameId"] in frames for e in elements)
    assert all(e["width"] >= 0 and e["height"] >= 0 for e in elements)
    return document


def add_excal_line(
    element,
    label,
    points,
    ox,
    oy,
    common,
    stroke,
    width,
    fill="transparent",
    dashed=False,
):
    """Normalize a polyline's bounds while preserving each point's position."""
    if len(points) < 2:
        return
    x, y = min(p[0] for p in points), min(p[1] for p in points)
    w, h = max(p[0] for p in points) - x, max(p[1] for p in points) - y
    element(
        "line",
        label,
        ox + x,
        oy + y,
        w,
        h,
        **common,
        points=[[px - x, py - y] for px, py in points],
        strokeColor=stroke,
        backgroundColor=fill,
        strokeWidth=width,
        strokeStyle="dashed" if dashed else "solid",
        polygon=fill != "transparent",
        startBinding=None,
        endBinding=None,
        startArrowhead=None,
        endArrowhead=None,
    )


def overview(scenes, previews, name):
    """A readable contact sheet for reviewers who do not use Excalidraw."""
    thumb_w, thumb_h, margin, label_h = 560, 498, 36, 62
    board = Image.new("RGB", (1824, 1820), "#f3f3ef")
    draw = ImageDraw.Draw(board)
    draw.text(
        (36, 25), "StaySpot / " + name, font=font(32, True), fill=COLORS["forest"]
    )
    draw.text(
        (36, 71),
        "Nine project-specific screens · editable vectors · four-member ownership",
        font=font(15),
        fill=COLORS["muted"],
    )
    for i, (scene, preview) in enumerate(zip(scenes, previews)):
        x, y = margin + (i % 3) * (thumb_w + margin), 119 + (i // 3) * (
            thumb_h + label_h
        )
        draw.text(
            (x, y),
            f'{scene.screen["id"]} {scene.screen["name"]}',
            font=font(17, True),
            fill=COLORS["ink"],
        )
        draw.text(
            (x, y + 24),
            f'Member {scene.screen["member"]}',
            font=font(12),
            fill=COLORS["muted"],
        )
        board.paste(
            preview.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS), (x, y + 47)
        )
    board.save(ROOT / f"{name.lower().replace(' ', '-')}-overview.png", optimize=True)


def main():
    scenes_by_mode, previews_by_mode = {}, {}
    for wire, folder in [(True, "wireframes"), (False, "ui-mockups")]:
        target = ROOT / folder
        target.mkdir(exist_ok=True)
        scenes, previews = [], []
        for screen, builder, slug in zip(TOKENS["screens"], BUILDERS, SLUGS):
            scene = Scene(screen, wire)
            builder(scene)
            validate_scene(scene)
            image = png(scene)
            vector = svg(scene)
            ET.fromstring(vector)  # Reject malformed XML before publishing it.
            (target / f"{slug}.svg").write_text(vector)
            image.save(target / f"{slug}.png", optimize=True)
            scenes.append(scene)
            previews.append(image)
        scenes_by_mode[wire], previews_by_mode[wire] = scenes, previews
        document = excalidraw(scenes)
        board_name = "StaySpot-wireframes" if wire else "StaySpot-ui-reference"
        (ROOT / f"{board_name}.excalidraw").write_text(json.dumps(document, indent=2))
        overview(scenes, previews, "Wireframes" if wire else "UI reference")
        print(
            f"{folder}: {len(scenes)} screens; {len(document['elements'])} editable elements"
        )
    state_screen = {"id": "09", "name": "Interaction states", "member": "1–4"}
    state = Scene(state_screen, False)
    interaction_states(state)
    validate_scene(state)
    state_vector = svg(state)
    ET.fromstring(state_vector)
    (ROOT / "interaction-states.svg").write_text(state_vector)
    png(state).save(ROOT / "interaction-states.png", optimize=True)
    (ROOT / "StaySpot-interaction-states.excalidraw").write_text(
        json.dumps(excalidraw([state]), indent=2)
    )
    print(
        "Alternative states: 6 scenarios; all SVG and Excalidraw structure checks passed"
    )


def validate_scene(scene):
    """Catch clipped text before writing any export, including annotation strips."""
    for item in scene.items:
        if item["kind"] != "text":
            continue
        measure = font(item["size"], item["bold"], item["serif"])
        lines = item["text"].split("\n")
        right = item["x"] + max(measure.getlength(line) for line in lines)
        bottom = item["y"] + len(lines) * item["size"] * 1.4
        assert 0 <= item["x"] and right <= WIDTH, item["text"]
        assert 0 <= item["y"] and bottom <= HEIGHT, item["text"]


if __name__ == "__main__":
    main()
