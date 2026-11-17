import sys
from PIL import Image, ImageDraw, ImageFont

def create_er_diagram(output_path):
    W, H = 2800, 1850
    img = Image.new("RGBA", (W, H), "#0b0f19")
    draw = ImageDraw.Draw(img)

    # Fonts
    font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 36)
    font_subtitle = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
    font_header = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 22)
    font_group = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 15)
    font_body = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
    font_body_bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 16)
    font_badge = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13)
    font_legend = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)

    # Title & Header
    draw.text((60, 45), "Brutus — Instagram Network Observatory", fill="#f8fafc", font=font_title)
    draw.text((60, 95), "Relational Database Entity-Relationship Diagram (PostgreSQL / 3NF & BCNF)", fill="#94a3b8", font=font_subtitle)

    # Table Definitions
    # (id, name, group_label, header_bg, [ (col_name, col_type, [badges]) ], x, y, width)
    tables = {
        "observers": {
            "name": "observers",
            "group": "OBSERVER DOMAIN",
            "header_bg": "#1d4ed8",
            "x": 60, "y": 170, "w": 440,
            "columns": [
                ("observer_id", "VARCHAR(64)", ["PK"]),
                ("username", "VARCHAR(64)", ["UK", "NOT NULL"]),
                ("email", "VARCHAR(255)", ["NOT NULL"]),
                ("created_at", "TIMESTAMPTZ", ["DEFAULT NOW()"])
            ]
        },
        "scans": {
            "name": "scans",
            "group": "COLLECTION & AUDIT",
            "header_bg": "#2563eb",
            "x": 580, "y": 170, "w": 490,
            "columns": [
                ("scan_id", "VARCHAR(64)", ["PK"]),
                ("observer_id", "VARCHAR(64)", ["FK"]),
                ("scan_type", "VARCHAR(32)", ["CHECK"]),
                ("status_code", "VARCHAR(32)", ["FK"]),
                ("reported_count", "INTEGER", ["CHECK >= 0"]),
                ("collected_count", "INTEGER", ["CHECK >= 0"]),
                ("duplicate_count", "INTEGER", ["DEFAULT 0"]),
                ("error_count", "INTEGER", ["DEFAULT 0"]),
                ("confidence_score", "DOUBLE PRECISION", ["CHECK 0..1"]),
                ("started_at", "TIMESTAMPTZ", ["NOT NULL"]),
                ("completed_at", "TIMESTAMPTZ", ["NULL"])
            ]
        },
        "scan_statuses": {
            "name": "scan_statuses",
            "group": "LOOKUP TAXONOMY",
            "header_bg": "#0284c7",
            "x": 1150, "y": 170, "w": 440,
            "columns": [
                ("status_code", "VARCHAR(32)", ["PK"]),
                ("status_label", "VARCHAR(64)", ["NOT NULL"]),
                ("description", "TEXT", ["NULL"]),
                ("is_valid_for_analysis", "BOOLEAN", ["DEFAULT FALSE"])
            ]
        },
        "snapshot_metrics": {
            "name": "snapshot_metrics",
            "group": "TOPOLOGICAL ANALYTICS",
            "header_bg": "#0d9488",
            "x": 1670, "y": 170, "w": 480,
            "columns": [
                ("metric_id", "BIGSERIAL", ["PK"]),
                ("snapshot_id", "VARCHAR(64)", ["FK", "UK"]),
                ("reciprocity_ratio", "DOUBLE PRECISION", ["CHECK 0..1"]),
                ("turnover_rate", "DOUBLE PRECISION", ["CHECK >= 0"]),
                ("network_density", "DOUBLE PRECISION", ["CHECK 0..1"]),
                ("computed_at", "TIMESTAMPTZ", ["DEFAULT NOW()"])
            ]
        },
        "snapshots": {
            "name": "snapshots",
            "group": "NETWORK BASELINE",
            "header_bg": "#059669",
            "x": 580, "y": 720, "w": 490,
            "columns": [
                ("snapshot_id", "VARCHAR(64)", ["PK"]),
                ("observer_id", "VARCHAR(64)", ["FK"]),
                ("scan_id", "VARCHAR(64)", ["FK", "UK"]),
                ("total_followers", "INTEGER", ["DEFAULT 0"]),
                ("total_following", "INTEGER", ["DEFAULT 0"]),
                ("total_mutuals", "INTEGER", ["DEFAULT 0"]),
                ("created_at", "TIMESTAMPTZ", ["DEFAULT NOW()"])
            ]
        },
        "snapshot_relationships": {
            "name": "snapshot_relationships",
            "group": "GRAPH EDGES (N:M)",
            "header_bg": "#7c3aed",
            "x": 1150, "y": 720, "w": 470,
            "columns": [
                ("snapshot_id", "VARCHAR(64)", ["PK", "FK"]),
                ("target_user_id", "VARCHAR(64)", ["PK", "FK"]),
                ("relationship_type_id", "INTEGER", ["FK"]),
                ("observed_at", "TIMESTAMPTZ", ["DEFAULT NOW()"])
            ]
        },
        "relationship_types": {
            "name": "relationship_types",
            "group": "LOOKUP TAXONOMY",
            "header_bg": "#9333ea",
            "x": 1700, "y": 720, "w": 460,
            "columns": [
                ("relationship_type_id", "INTEGER", ["PK"]),
                ("type_code", "VARCHAR(32)", ["UK", "NOT NULL"]),
                ("type_label", "VARCHAR(64)", ["NOT NULL"]),
                ("follows_observer", "BOOLEAN", ["NOT NULL"]),
                ("followed_by_observer", "BOOLEAN", ["NOT NULL"]),
                ("is_mutual", "BOOLEAN", ["NOT NULL"])
            ]
        },
        "users": {
            "name": "users",
            "group": "PROFILE REGISTRY",
            "header_bg": "#4f46e5",
            "x": 60, "y": 1220, "w": 470,
            "columns": [
                ("user_id", "VARCHAR(64)", ["PK"]),
                ("username", "VARCHAR(64)", ["UK", "NOT NULL"]),
                ("full_name", "VARCHAR(128)", ["NULL"]),
                ("avatar_url", "TEXT", ["NULL"]),
                ("is_verified", "BOOLEAN", ["DEFAULT FALSE"]),
                ("is_private", "BOOLEAN", ["DEFAULT FALSE"]),
                ("first_seen_at", "TIMESTAMPTZ", ["DEFAULT NOW()"]),
                ("updated_at", "TIMESTAMPTZ", ["DEFAULT NOW()"])
            ]
        },
        "relationship_deltas": {
            "name": "relationship_deltas",
            "group": "CHURN & TIME-SERIES DIFFS",
            "header_bg": "#c026d3",
            "x": 620, "y": 1220, "w": 520,
            "columns": [
                ("delta_id", "BIGSERIAL", ["PK"]),
                ("from_snapshot_id", "VARCHAR(64)", ["FK"]),
                ("to_snapshot_id", "VARCHAR(64)", ["FK"]),
                ("target_user_id", "VARCHAR(64)", ["FK"]),
                ("change_type_id", "INTEGER", ["FK"]),
                ("detected_at", "TIMESTAMPTZ", ["DEFAULT NOW()"])
            ]
        },
        "change_types": {
            "name": "change_types",
            "group": "LOOKUP TAXONOMY",
            "header_bg": "#e11d48",
            "x": 1230, "y": 1220, "w": 440,
            "columns": [
                ("change_type_id", "INTEGER", ["PK"]),
                ("type_code", "VARCHAR(32)", ["UK", "NOT NULL"]),
                ("description", "VARCHAR(128)", ["NOT NULL"]),
                ("is_churn", "BOOLEAN", ["DEFAULT FALSE"])
            ]
        }
    }

    # Render Table Cards
    row_height = 36
    header_height = 54
    table_bounds = {}

    for t_id, t in tables.items():
        x, y, w = t["x"], t["y"], t["w"]
        n_cols = len(t["columns"])
        h = header_height + n_cols * row_height + 12
        table_bounds[t_id] = (x, y, w, h)

        # Drop shadow
        draw.rounded_rectangle([x + 6, y + 6, x + w + 6, y + h + 6], radius=14, fill="#050811")
        # Card Background
        draw.rounded_rectangle([x, y, x + w, y + h], radius=14, fill="#131b2e", outline="#202c45", width=2)
        # Header Box
        draw.rounded_rectangle([x, y, x + w, y + header_height], radius=14, fill=t["header_bg"])
        # Straighten bottom corners of header
        draw.rectangle([x, y + header_height - 14, x + w, y + header_height], fill=t["header_bg"])

        # Header Text
        draw.text((x + 18, y + 10), t["name"], fill="#ffffff", font=font_header)
        draw.text((x + 18, y + 34), t["group"], fill="#e2e8f0", font=font_group)

        # Column Rows
        curr_y = y + header_height + 6
        for idx, (col_name, col_type, badges) in enumerate(t["columns"]):
            # Row alternating subtle tint
            if idx % 2 == 1:
                draw.rectangle([x + 2, curr_y, x + w - 2, curr_y + row_height], fill="#182239")

            # Column Name
            name_color = "#f8fafc" if any("PK" in b for b in badges) else "#cbd5e1"
            name_font = font_body_bold if any("PK" in b for b in badges) else font_body
            draw.text((x + 18, curr_y + 8), col_name, fill=name_color, font=name_font)

            # Column Type
            draw.text((x + 210, curr_y + 8), col_type, fill="#94a3b8", font=font_body)

            # Badges (PK, FK, UK, etc.)
            badge_x = x + w - 16
            for b in reversed(badges):
                bg_color = "#dc2626" if "PK" in b else ("#2563eb" if "FK" in b else ("#d97706" if "UK" in b else "#334155"))
                tw = int(font_badge.getlength(b)) + 14
                badge_x -= tw
                draw.rounded_rectangle([badge_x, curr_y + 6, badge_x + tw - 4, curr_y + row_height - 6], radius=5, fill=bg_color)
                draw.text((badge_x + 5, curr_y + 9), b, fill="#ffffff", font=font_badge)

            curr_y += row_height

    # Helper function to draw orthogonal relationship connectors
    def draw_connector(start_pt, end_pt, label="", color="#38bdf8", is_dashed=False):
        sx, sy = start_pt
        ex, ey = end_pt
        mid_x = (sx + ex) // 2

        points = [(sx, sy), (mid_x, sy), (mid_x, ey), (ex, ey)]
        for i in range(len(points) - 1):
            p1, p2 = points[i], points[i+1]
            draw.line([p1, p2], fill=color, width=3)

        # Connector circles at endpoints
        draw.ellipse([sx - 5, sy - 5, sx + 5, sy + 5], fill=color, outline="#0b0f19", width=2)
        draw.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], fill=color, outline="#0b0f19", width=2)

        if label:
            lx, ly = mid_x + 8, (sy + ey) // 2
            tw = int(font_group.getlength(label)) + 10
            draw.rounded_rectangle([lx - 4, ly - 3, lx + tw, ly + 18], radius=4, fill="#0f172a", outline="#334155", width=1)
            draw.text((lx, ly), label, fill="#e2e8f0", font=font_group)

    # Connections
    # 1. observers -> scans
    o_b = table_bounds["observers"]
    sc_b = table_bounds["scans"]
    draw_connector((o_b[0] + o_b[2], o_b[1] + 80), (sc_b[0], sc_b[1] + 90), "1 : N (observer_id)", "#38bdf8")

    # 2. scan_statuses -> scans
    ss_b = table_bounds["scan_statuses"]
    draw_connector((ss_b[0], ss_b[1] + 80), (sc_b[0] + sc_b[2], sc_b[1] + 160), "1 : N (status_code)", "#38bdf8")

    # 3. scans -> snapshots
    sn_b = table_bounds["snapshots"]
    draw_connector((sc_b[0] + 180, sc_b[1] + sc_b[3]), (sn_b[0] + 180, sn_b[1]), "1 : 1 (scan_id UK)", "#10b981")

    # 4. observers -> snapshots
    draw_connector((o_b[0] + 220, o_b[1] + o_b[3]), (sn_b[0], sn_b[1] + 90), "1 : N (observer_id)", "#38bdf8")

    # 5. snapshots -> snapshot_metrics
    sm_b = table_bounds["snapshot_metrics"]
    draw_connector((sn_b[0] + sn_b[2], sn_b[1] + 60), (sm_b[0] + 100, sm_b[1] + sm_b[3]), "1 : 1 (snapshot_id UK)", "#10b981")

    # 6. snapshots -> snapshot_relationships
    sr_b = table_bounds["snapshot_relationships"]
    draw_connector((sn_b[0] + sn_b[2], sn_b[1] + 120), (sr_b[0], sr_b[1] + 80), "1 : N (snapshot_id)", "#a855f7")

    # 7. relationship_types -> snapshot_relationships
    rt_b = table_bounds["relationship_types"]
    draw_connector((rt_b[0], rt_b[1] + 80), (sr_b[0] + sr_b[2], sr_b[1] + 120), "1 : N (type_id)", "#a855f7")

    # 8. users -> snapshot_relationships
    u_b = table_bounds["users"]
    draw_connector((u_b[0] + 250, u_b[1]), (sr_b[0] + 60, sr_b[1] + sr_b[3]), "1 : N (target_user_id)", "#a855f7")

    # 9. users -> relationship_deltas
    rd_b = table_bounds["relationship_deltas"]
    draw_connector((u_b[0] + u_b[2], u_b[1] + 120), (rd_b[0], rd_b[1] + 140), "1 : N (target_user_id)", "#ec4899")

    # 10. change_types -> relationship_deltas
    ct_b = table_bounds["change_types"]
    draw_connector((ct_b[0], ct_b[1] + 80), (rd_b[0] + rd_b[2], rd_b[1] + 140), "1 : N (change_type_id)", "#ec4899")

    # 11. snapshots -> relationship_deltas
    draw_connector((sn_b[0] + 320, sn_b[1] + sn_b[3]), (rd_b[0] + 150, rd_b[1]), "1 : N (from/to_snapshot_id)", "#ec4899")

    # Legend / Annotation Box at bottom right
    leg_x, leg_y, leg_w, leg_h = 1750, 1260, 480, 270
    draw.rounded_rectangle([leg_x, leg_y, leg_x + leg_w, leg_y + leg_h], radius=12, fill="#131b2e", outline="#334155", width=2)
    draw.text((leg_x + 20, leg_y + 16), "Schema Cardinality & Key Legend", fill="#f8fafc", font=font_header)

    legends = [
        ("#dc2626", "PK", "Primary Key (Unique entity identifier)"),
        ("#2563eb", "FK", "Foreign Key (Referential constraint)"),
        ("#d97706", "UK", "Unique Key / Candidate Key"),
        ("#38bdf8", "Line", "One-to-Many Relationship (1 : N)"),
        ("#10b981", "Line", "One-to-One Strict Relationship (1 : 1)"),
        ("#a855f7", "Line", "Many-to-Many Associative Edge Table")
    ]
    cur_ly = leg_y + 55
    for color, tag, desc in legends:
        if tag == "Line":
            draw.line([(leg_x + 20, cur_ly + 8), (leg_x + 55, cur_ly + 8)], fill=color, width=3)
            draw.ellipse([leg_x + 18, cur_ly + 6, leg_x + 22, cur_ly + 10], fill=color)
            draw.ellipse([leg_x + 53, cur_ly + 6, leg_x + 57, cur_ly + 10], fill=color)
        else:
            draw.rounded_rectangle([leg_x + 20, cur_ly, leg_x + 55, cur_ly + 20], radius=4, fill=color)
            draw.text((leg_x + 26, cur_ly + 3), tag, fill="#ffffff", font=font_badge)

        draw.text((leg_x + 70, cur_ly + 2), desc, fill="#cbd5e1", font=font_legend)
        cur_ly += 34

    # Save image
    img.save(output_path, "PNG", optimize=True)
    print(f"Saved ER diagram to {output_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "dbms/02_er_diagram.png"
    create_er_diagram(out)
