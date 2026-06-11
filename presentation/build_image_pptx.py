from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from datetime import datetime, timezone
from xml.sax.saxutils import escape

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "presentation" / "slide_images"
OUT = ROOT / "presentation" / "FracHIV_SITA_Presentation_WPS.pptx"
OUT_MAIN = ROOT / "presentation" / "FracHIV_SITA_Presentation.pptx"
W, H = 1600, 900

COLORS = {
    "navy": "#0A1B30",
    "ink": "#142030",
    "teal": "#007E70",
    "blue": "#004A80",
    "gold": "#CC9900",
    "red": "#B44146",
    "muted": "#525E6C",
    "softteal": "#E6F7F4",
    "softblue": "#E8F2FA",
    "softgold": "#FFF7E0",
    "line": "#D8E2EB",
    "white": "#FFFFFF",
}

FONT_DIR = ROOT / "static" / "vendor" / "fonts" / "google" / "inter"
REG = str(FONT_DIR / "Inter-Regular.ttf")
MED = str(FONT_DIR / "Inter-Medium.ttf")
BOLD = str(FONT_DIR / "Inter-Bold.ttf")
EXTRA = str(FONT_DIR / "Inter-ExtraBold.ttf")


def font(size, weight="regular"):
    path = {"regular": REG, "medium": MED, "bold": BOLD, "extra": EXTRA}.get(weight, REG)
    return ImageFont.truetype(path, size)


def wrap(draw, text, fnt, max_width):
    lines = []
    for para in text.split("\n"):
        words = para.split()
        line = ""
        for word in words:
            test = f"{line} {word}".strip()
            if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width or not line:
                line = test
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def text(draw, xy, content, size=28, fill=COLORS["ink"], weight="regular", max_width=None, line_gap=8):
    fnt = font(size, weight)
    x, y = xy
    lines = wrap(draw, content, fnt, max_width) if max_width else content.split("\n")
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += size + line_gap
    return y


def title(draw, title_text, subtitle=None):
    text(draw, (70, 46), title_text, 42, COLORS["ink"], "extra")
    if subtitle:
        text(draw, (70, 96), subtitle, 18, COLORS["muted"], "regular")
    draw.rectangle((70, 127, 300, 130), fill=COLORS["gold"])
    draw.rectangle((305, 127, 1180, 130), fill=COLORS["teal"])


def card(draw, box, heading, body, fill, accent, body_size=24):
    x1, y1, x2, y2 = box
    draw.rectangle(box, fill=fill)
    draw.rectangle((x1, y1, x1 + 9, y2), fill=accent)
    if heading:
        text(draw, (x1 + 32, y1 + 23), heading, 22, accent, "bold")
        body_y = y1 + 58
    else:
        body_y = y1 + 20
    text(draw, (x1 + 32, body_y), body, body_size, COLORS["ink"], "regular", max_width=x2 - x1 - 56, line_gap=6)


def bullets(draw, xy, items, size=28, max_width=640):
    x, y = xy
    fnt = font(size, "regular")
    for item in items:
        draw.text((x, y + 3), "•", font=font(size + 2, "bold"), fill=COLORS["ink"])
        lines = wrap(draw, item, fnt, max_width)
        yy = y
        for line in lines:
            draw.text((x + 28, yy), line, font=fnt, fill=COLORS["ink"])
            yy += size + 6
        y = yy + 8


def fit_image(path, box):
    img = Image.open(path).convert("RGBA")
    x1, y1, x2, y2 = box
    bw, bh = x2 - x1, y2 - y1
    scale = min(bw / img.width, bh / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (bw, bh), (255, 255, 255, 0))
    canvas.alpha_composite(img, ((bw - nw) // 2, (bh - nh) // 2))
    return canvas


def equation_png(lines, out, width=760, height=260, fontsize=22):
    fig = plt.figure(figsize=(width / 100, height / 100), dpi=100)
    fig.patch.set_alpha(0)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis("off")
    y = 0.86
    for line in lines:
        ax.text(0.02, y, line, fontsize=fontsize, color=COLORS["ink"], va="top")
        y -= 0.17
    fig.savefig(out, transparent=True)
    plt.close(fig)
    return Image.open(out).convert("RGBA")


def blank():
    return Image.new("RGB", (W, H), COLORS["white"])


def save_slide(img, i):
    OUT_DIR.mkdir(exist_ok=True)
    path = OUT_DIR / f"slide_{i:02d}.png"
    img.save(path)
    return path


def arrow(draw, start, end, color=COLORS["ink"], width=4):
    draw.line((start, end), fill=color, width=width)
    x1, y1 = start
    x2, y2 = end
    import math

    ang = math.atan2(y2 - y1, x2 - x1)
    size = 16
    pts = [
        (x2, y2),
        (x2 - size * math.cos(ang - 0.45), y2 - size * math.sin(ang - 0.45)),
        (x2 - size * math.cos(ang + 0.45), y2 - size * math.sin(ang + 0.45)),
    ]
    draw.polygon(pts, fill=color)


def build_slides():
    paths = []

    # 1 cover
    cover = Image.open(ROOT / "presentation" / "ai_cover_background.png").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    d = ImageDraw.Draw(cover, "RGBA")
    d.rectangle((0, 0, W, H), fill=(10, 27, 48, 65))
    logo = Image.open(ROOT / "thesis" / "logo.png").convert("RGBA").resize((86, 88), Image.Resampling.LANCZOS)
    cover.paste(logo, (72, 55), logo)
    text(d, (1160, 64), "University of Rwanda\nCollege of Science and Technology", 22, COLORS["white"], "regular", 360, 5)
    text(d, (80, 278), "Fractional-Order\nHIV SITA Model", 58, COLORS["white"], "extra", 650, 6)
    text(d, (84, 462), "Social behaviour interventions and memory effects", 28, COLORS["white"], "medium")
    text(d, (84, 548), "NDACYAYISABA Lambert\nSupervisor: Dr. MUHIRWA Jean Pierre\nKigali, Rwanda", 24, COLORS["white"], "regular", 620, 6)
    d.rectangle((84, 690, 390, 695), fill=COLORS["gold"])
    d.rectangle((402, 690, 660, 695), fill=COLORS["teal"])
    paths.append(save_slide(cover, 1))

    # 2
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Background / Motivation", "Rwanda-aware public-health motivation")
    bullets(d, (105, 210), [
        "HIV transmission is shaped by biology, treatment access, and social behaviour.",
        "Awareness, safer behaviour, testing, treatment-seeking, and adherence can change long-term outcomes.",
        "In Rwanda, prevention and adherence support remain important alongside treatment progress.",
    ], 30, 720)
    card(d, (110, 645, 780, 765), "Why mathematics?", "A model gives a controlled way to compare intervention strategies and understand possible long-term behaviour.", COLORS["softteal"], COLORS["teal"], 24)
    for j, (a, b, c) in enumerate([
        ("Rwanda context", "HIV prevention", COLORS["blue"]),
        ("Mechanism", "Social behaviour", COLORS["teal"]),
        ("Method", "Fractional memory", COLORS["gold"]),
        ("Output", "Simulation evidence", COLORS["red"]),
    ]):
        y = 185 + j * 120
        d.rectangle((960, y, 1305, y + 88), fill=c)
        text(d, (985, y + 16), f"{a}\n{b}", 23, COLORS["white"], "bold", 300, 2)
    paths.append(save_slide(img, 2))

    # 3
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Problem Statement")
    card(d, (90, 190, 750, 455), "Limitations in ordinary modelling", "Ordinary models usually depend only on the present state. HIV-related behaviour may depend on past awareness, stigma, testing history, and adherence.", COLORS["softblue"], COLORS["blue"], 25)
    card(d, (850, 190, 1510, 455), "Need addressed by this project", "Include memory using a Caputo derivative, represent behavioural interventions through effective rates, and compare scenarios through simulation.", COLORS["softteal"], COLORS["teal"], 25)
    card(d, (190, 620, 1410, 745), "Research focus", "How do fractional memory and social behaviour interventions affect simulated HIV dynamics in a SITA framework?", COLORS["softgold"], COLORS["gold"], 27)
    paths.append(save_slide(img, 3))

    # 4
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Objectives")
    text(d, (90, 185), "Main objective", 25, COLORS["gold"], "bold")
    text(d, (90, 235), "To formulate, analyse, and simulate a fractional-order SITA HIV transmission model incorporating social behaviour interventions.", 29, COLORS["ink"], "regular", 705, 7)
    text(d, (90, 390), "Specific objectives", 25, COLORS["gold"], "bold")
    bullets(d, (90, 440), [
        "Formulate the SITA model with Caputo derivative.",
        "Derive threshold quantities including R0.",
        "Establish core analytical properties.",
        "Implement a numerical simulation scheme.",
        "Compare interventions, memory effects, and sensitivity.",
    ], 25, 680)
    for j, (label, col) in enumerate([("Model\nformulation", COLORS["blue"]), ("Mathematical\nanalysis", COLORS["teal"]), ("Numerical\nsimulation", COLORS["gold"]), ("Results\ninterpretation", COLORS["red"])]):
        y = 185 + j * 115
        d.rectangle((975, y, 1300, y + 82), fill=col)
        text(d, (1000, y + 14), label, 24, COLORS["white"], "bold", 280, 2)
    paths.append(save_slide(img, 4))

    # 5 model diagram
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Model Diagram: SITA")
    boxes = [
        ("S(t)\nSusceptible", 135, 300, COLORS["blue"], COLORS["softblue"]),
        ("I(t)\nInfected", 460, 300, COLORS["red"], "#FFF2F3"),
        ("T(t)\nTreated", 785, 300, COLORS["gold"], COLORS["softgold"]),
        ("A(t)\nAIDS stage", 1110, 300, COLORS["teal"], COLORS["softteal"]),
    ]
    centers = []
    for label, x0, y0, col, fill in boxes:
        d.rounded_rectangle((x0, y0, x0 + 235, y0 + 110), radius=8, fill=fill, outline=col, width=3)
        text(d, (x0 + 42, y0 + 27), label, 27, col, "extra", 170, 2)
        centers.append((x0 + 235, y0 + 55))
    arrow(d, (370, 355), (455, 355), COLORS["ink"])
    arrow(d, (695, 355), (780, 355), COLORS["ink"])
    arrow(d, (1020, 355), (1105, 355), COLORS["ink"])
    arrow(d, (560, 430), (1110, 430), COLORS["muted"], 3)
    arrow(d, (905, 430), (1170, 410), COLORS["muted"], 3)
    arrow(d, (55, 355), (132, 355), COLORS["ink"])
    arrow(d, (1345, 355), (1505, 355), COLORS["ink"])
    text(d, (385, 270), "effective\ntransmission", 18, COLORS["muted"], "medium", 120, 2)
    text(d, (705, 270), "testing and\ntreatment", 18, COLORS["muted"], "medium", 130, 2)
    text(d, (705, 455), "progression / reduced progression", 18, COLORS["muted"], "medium")
    text(d, (45, 318), "recruitment", 17, COLORS["muted"], "medium")
    text(d, (1370, 318), "mortality", 17, COLORS["muted"], "medium")
    card(d, (130, 650, 765, 760), "State variables", "S susceptible, I infected, T treated, A AIDS-stage population.", COLORS["softblue"], COLORS["blue"], 25)
    card(d, (855, 650, 1490, 760), "Controls", "u1 awareness, u2 safer behaviour, u3 testing, u4 adherence.", COLORS["softgold"], COLORS["gold"], 25)
    paths.append(save_slide(img, 5))

    # 6 equations
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Fractional-Order Model")
    text(d, (95, 190), "Caputo memory form", 26, COLORS["gold"], "bold")
    eq = equation_png([
        r"$^{C}D_t^q X(t)=F(t,X(t)),\quad 0<q\leq 1$",
        r"$^{C}D_t^q S=\Lambda-\beta_{\mathrm{eff}}S(I+\eta T)-\mu S$",
        r"$^{C}D_t^q I=\beta_{\mathrm{eff}}S(I+\eta T)-(\tau_{\mathrm{eff}}+\delta+\mu)I$",
        r"$^{C}D_t^q T=\tau_{\mathrm{eff}}I-(\rho_{\mathrm{eff}}+\mu)T$",
        r"$^{C}D_t^q A=\delta I+\rho_{\mathrm{eff}}T-(d+\mu)A$",
    ], OUT_DIR / "equations.png", 820, 430, 19)
    img.paste(eq, (90, 240), eq)
    card(d, (955, 210, 1510, 405), "Intervention-adjusted rates", "βeff = β0(1-u1)(1-u2)\nτeff = τ(1+u3)\nρeff = ρ(1-u4)", COLORS["softgold"], COLORS["gold"], 27)
    card(d, (955, 505, 1510, 660), "Meaning of q", "q = 1 gives the ordinary model. q < 1 carries memory of past states.", COLORS["softteal"], COLORS["teal"], 27)
    paths.append(save_slide(img, 6))

    # 7 implementation
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Numerical Scheme + Implementation")
    bullets(d, (105, 200), [
        "Time interval is divided into discrete steps.",
        "A predictor estimates the next state.",
        "A corrector updates the state using fractional-memory weights.",
        "The same engine is used for baseline, memory, intervention, and sensitivity experiments.",
    ], 30, 660)
    flow = [
        ("Inputs: parameters, initial conditions, q, controls", COLORS["softblue"], COLORS["blue"]),
        ("Fractional ABM-type solver", COLORS["softteal"], COLORS["teal"]),
        ("Outputs: trajectories, R0, scenarios, sensitivity", COLORS["softgold"], COLORS["gold"]),
        ("Interactive visualization during live demo", "#FFFFFF", COLORS["red"]),
    ]
    for j, (body, fill, accent) in enumerate(flow):
        y = 170 + j * 108
        card(d, (920, y, 1500, y + 88), "", body, fill, accent, 24)
        if j < len(flow) - 1:
            arrow(d, (1210, y + 82), (1210, y + 104), COLORS["muted"], 3)
    card(d, (160, 700, 1440, 790), "Important distinction", "The slides explain the research; the live simulator is used only during the demo to show moving graphs.", COLORS["softgold"], COLORS["gold"], 25)
    paths.append(save_slide(img, 7))

    # 8 graph
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Simulation Results: Intervention Comparison")
    graph = fit_image(ROOT / "thesis" / "combinedInterventionsChart.png", (70, 170, 920, 650))
    img.paste(graph, (70, 170), graph)
    bullets(d, (975, 210), [
        "Single interventions help, but each targets only one mechanism.",
        "Combined intervention acts on transmission, treatment uptake, and progression.",
        "The combined strategy gives stronger simulated control than isolated changes.",
    ], 26, 460)
    card(d, (975, 610, 1480, 720), "Public-health meaning", "Prevention and treatment support should work together.", COLORS["softteal"], COLORS["teal"], 25)
    paths.append(save_slide(img, 8))

    # 9 memory
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Simulation Results: Fractional Memory")
    graph = fit_image(ROOT / "thesis" / "memoryChart.png", (70, 170, 920, 650))
    img.paste(graph, (70, 170), graph)
    bullets(d, (975, 215), [
        "q = 1 represents the ordinary model.",
        "Smaller q values strengthen the memory effect.",
        "Different q values produce visibly different trajectories.",
    ], 28, 460)
    card(d, (975, 595, 1480, 720), "Defense point", "Fractional calculus is not decorative; it changes the simulated dynamics.", COLORS["softgold"], COLORS["gold"], 25)
    paths.append(save_slide(img, 9))

    # 10
    img = blank(); d = ImageDraw.Draw(img)
    title(d, "Live Demo, Conclusion + Recommendations")
    text(d, (90, 190), "Live demo plan", 26, COLORS["gold"], "bold")
    bullets(d, (90, 240), [
        "Open the deployed simulator.",
        "Run the moving SITA graph.",
        "Compare no intervention with combined intervention.",
        "Compare q = 1 with q < 1.",
        "Show scenario and sensitivity views briefly.",
    ], 25, 610)
    text(d, (850, 190), "Conclusion", 26, COLORS["gold"], "bold")
    bullets(d, (850, 240), [
        "The SITA HIV model was extended using fractional memory.",
        "Behavioural interventions were represented through effective rates.",
        "Simulations support combined intervention strategies.",
        "Future work should calibrate parameters with Rwanda-specific data.",
    ], 25, 600)
    card(d, (130, 700, 1470, 795), "Final message", "This project connects mathematical analysis, numerical simulation, and a working interactive tool for explaining HIV intervention dynamics.", COLORS["softteal"], COLORS["teal"], 25)
    paths.append(save_slide(img, 10))
    return paths


def make_pptx(slide_paths, out):
    cx, cy = 12192000, 6858000
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    slide_overrides = "".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n'
        for i in range(1, len(slide_paths) + 1)
    )
    content_types = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>{slide_overrides}</Types>'''
    root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'''
    pres_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'''
    pres_rels += "".join(
        f'<Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        for i in range(1, len(slide_paths) + 1)
    )
    pres_rels += "</Relationships>"
    slide_ids = "".join(f'<p:sldId id="{255+i}" r:id="rId{i+1}"/>' for i in range(1, len(slide_paths) + 1))
    presentation = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>{slide_ids}</p:sldIdLst><p:sldSz cx="{cx}" cy="{cy}" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>'''
    master = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>'''
    master_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'''
    layout = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'''
    layout_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>'''
    theme = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="FracHIV"><a:themeElements><a:clrScheme name="FracHIV"><a:dk1><a:srgbClr val="0A1B30"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="142030"/></a:dk2><a:lt2><a:srgbClr val="E8F2FA"/></a:lt2><a:accent1><a:srgbClr val="007E70"/></a:accent1><a:accent2><a:srgbClr val="004A80"/></a:accent2><a:accent3><a:srgbClr val="CC9900"/></a:accent3><a:accent4><a:srgbClr val="B44146"/></a:accent4><a:accent5><a:srgbClr val="525E6C"/></a:accent5><a:accent6><a:srgbClr val="D8E2EB"/></a:accent6><a:hlink><a:srgbClr val="004A80"/></a:hlink><a:folHlink><a:srgbClr val="007E70"/></a:folHlink></a:clrScheme><a:fontScheme name="Inter"><a:majorFont><a:latin typeface="Inter"/></a:majorFont><a:minorFont><a:latin typeface="Inter"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>'''
    core = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Fractional-Order HIV SITA Model</dc:title><dc:creator>NDACYAYISABA Lambert</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified></cp:coreProperties>'''
    app = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft PowerPoint</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>{len(slide_paths)}</Slides></Properties>'''
    with ZipFile(out, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", root_rels)
        z.writestr("docProps/core.xml", core)
        z.writestr("docProps/app.xml", app)
        z.writestr("ppt/presentation.xml", presentation)
        z.writestr("ppt/_rels/presentation.xml.rels", pres_rels)
        z.writestr("ppt/slideMasters/slideMaster1.xml", master)
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", master_rels)
        z.writestr("ppt/slideLayouts/slideLayout1.xml", layout)
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", layout_rels)
        z.writestr("ppt/theme/theme1.xml", theme)
        for i, path in enumerate(slide_paths, 1):
            z.write(path, f"ppt/media/slide_{i:02d}.png")
            slide = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="slide_{i:02d}.png"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'''
            rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/slide_{i:02d}.png"/></Relationships>'''
            z.writestr(f"ppt/slides/slide{i}.xml", slide)
            z.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", rels)


if __name__ == "__main__":
    slides = build_slides()
    make_pptx(slides, OUT)
    make_pptx(slides, OUT_MAIN)
    print(f"built {OUT}")
    print(f"built {OUT_MAIN}")
