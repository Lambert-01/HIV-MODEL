from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "FracHIV_SITA_Presentation.pptx"
OUT_WPS = ROOT / "FracHIV_SITA_Presentation_WPS.pptx"

SLIDE_W = 13.333333
SLIDE_H = 7.5
EMU = 914400

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

COLORS = {
    "navy": "0A1B30",
    "ink": "142030",
    "muted": "52606C",
    "teal": "007E70",
    "blue": "004A80",
    "gold": "CC9900",
    "red": "B44146",
    "soft_teal": "E6F7F4",
    "soft_blue": "E8F2FA",
    "soft_gold": "FFF7E0",
    "line": "D8E2EB",
    "white": "FFFFFF",
}


def emu(value: float) -> int:
    return int(value * EMU)


def safe(text: str) -> str:
    return escape(text, {'"': "&quot;"})


@dataclass
class Rel:
    rid: str
    rel_type: str
    target: str


@dataclass
class Slide:
    title: str
    body: list[str] = field(default_factory=list)
    shapes: list[str] = field(default_factory=list)
    rels: list[Rel] = field(default_factory=list)


class Deck:
    def __init__(self) -> None:
        self.media: dict[str, Path] = {}
        self.next_media = 1
        self.next_id = 2

    def media_name(self, path: Path) -> str:
        key = str(path)
        if key not in self.media:
            ext = path.suffix.lower().lstrip(".")
            self.media[f"image{self.next_media}.{ext}"] = path
            self.next_media += 1
        for name, existing in self.media.items():
            if existing == path:
                return name
        raise RuntimeError("unreachable")

    def shape_id(self) -> int:
        value = self.next_id
        self.next_id += 1
        return value


deck = Deck()


def solid_fill(color: str, alpha: int | None = None) -> str:
    if alpha is None:
        return f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
    return f'<a:solidFill><a:srgbClr val="{color}"><a:alpha val="{alpha}"/></a:srgbClr></a:solidFill>'


def line(color: str, width: int = 12700, arrow: bool = False) -> str:
    tail = '<a:tailEnd type="triangle"/>' if arrow else ""
    return f'<a:ln w="{width}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill>{tail}</a:ln>'


def tx_body(paras: Iterable[str], size: int = 24, color: str = COLORS["ink"], bold: bool = False,
            bullet: bool = False, align: str = "l", font: str = "Aptos") -> str:
    out = [
        '<p:txBody><a:bodyPr wrap="square" lIns="91440" rIns="91440" tIns="45720" bIns="45720">'
        '<a:normAutofit fontScale="85000" lnSpcReduction="20000"/></a:bodyPr><a:lstStyle/>'
    ]
    for para in paras:
        ppr = f'<a:pPr algn="{align}">'
        if bullet:
            ppr += '<a:buChar char="•"/><a:buFont typeface="Arial"/>'
        ppr += "</a:pPr>"
        out.append(
            f'<a:p>{ppr}<a:r><a:rPr lang="en-US" sz="{size * 100}" '
            f'b="{"1" if bold else "0"}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
            f'<a:latin typeface="{font}"/></a:rPr><a:t>{safe(para)}</a:t></a:r></a:p>'
        )
    out.append("</p:txBody>")
    return "".join(out)


def textbox(x: float, y: float, w: float, h: float, paras: Iterable[str], size: int = 24,
            color: str = COLORS["ink"], bold: bool = False, bullet: bool = False,
            fill: str | None = None, border: str | None = None, align: str = "l") -> str:
    sid = deck.shape_id()
    fill_xml = solid_fill(fill) if fill else "<a:noFill/>"
    line_xml = line(border, 9525) if border else "<a:ln><a:noFill/></a:ln>"
    return (
        f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="Text {sid}"/><p:cNvSpPr txBox="1"/>'
        f'<p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/>'
        f'<a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/>'
        f'</a:prstGeom>{fill_xml}{line_xml}</p:spPr>'
        f'{tx_body(paras, size=size, color=color, bold=bold, bullet=bullet, align=align)}</p:sp>'
    )


def rect_label(x: float, y: float, w: float, h: float, title: str, subtitle: str,
               fill: str, border: str, color: str | None = None) -> str:
    color = color or border
    sid = deck.shape_id()
    paras = [
        f'<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="2000" b="1">'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Aptos Display"/>'
        f'</a:rPr><a:t>{safe(title)}</a:t></a:r></a:p>',
        f'<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1500" b="1">'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Aptos"/>'
        f'</a:rPr><a:t>{safe(subtitle)}</a:t></a:r></a:p>',
    ]
    return (
        f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{safe(title)}"/><p:cNvSpPr/>'
        f'<p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/>'
        f'<a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/>'
        f'</a:prstGeom>{solid_fill(fill)}{line(border)}</p:spPr>'
        f'<p:txBody><a:bodyPr wrap="square" anchor="mid" lIns="91440" rIns="91440" tIns="45720" bIns="45720">'
        f'<a:normAutofit fontScale="85000" lnSpcReduction="15000"/></a:bodyPr><a:lstStyle/>'
        f'{"".join(paras)}</p:txBody></p:sp>'
    )


def picture(path: Path, x: float, y: float, w: float, h: float, rid: str) -> tuple[str, Rel]:
    name = deck.media_name(path)
    sid = deck.shape_id()
    xml = (
        f'<p:pic><p:nvPicPr><p:cNvPr id="{sid}" name="{safe(path.name)}"/><p:cNvPicPr/>'
        f'<p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/>'
        f'<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm>'
        f'<a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/>'
        f'</a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
    )
    return xml, Rel(rid, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", f"../media/{name}")


def connector(x1: float, y1: float, x2: float, y2: float, color: str = COLORS["ink"]) -> str:
    sid = deck.shape_id()
    return (
        f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{sid}" name="Arrow {sid}"/><p:cNvCxnSpPr/>'
        f'<p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="{emu(min(x1, x2))}" y="{emu(min(y1, y2))}"/>'
        f'<a:ext cx="{emu(abs(x2 - x1))}" cy="{emu(abs(y2 - y1))}"/></a:xfrm>'
        f'<a:prstGeom prst="line"><a:avLst/></a:prstGeom>{line(color, 19050, arrow=True)}</p:spPr>'
        f'<p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/>'
        f'</a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="tx1"/>'
        f'</a:fontRef></p:style></p:cxnSp>'
    )


def title_bar(title: str) -> list[str]:
    return [
        textbox(0.55, 0.32, 11.0, 0.42, [title], size=23, color=COLORS["navy"], bold=True),
        textbox(0.55, 0.95, 2.0, 0.03, [""], fill=COLORS["gold"]),
        textbox(2.55, 0.95, 7.6, 0.03, [""], fill=COLORS["teal"]),
    ]


def two_col_slide(title: str, left_tag: str, left: list[str], right_tag: str, right: list[str],
                  bottom: str | None = None) -> Slide:
    shapes = title_bar(title)
    shapes += [
        textbox(0.72, 1.35, 5.15, 0.35, [left_tag], size=15, color=COLORS["gold"], bold=True),
        textbox(0.78, 1.78, 5.25, 3.15, left, size=18, bullet=True),
        textbox(6.65, 1.35, 5.1, 0.35, [right_tag], size=15, color=COLORS["gold"], bold=True),
        textbox(6.72, 1.78, 5.25, 3.15, right, size=18, bullet=True),
    ]
    if bottom:
        shapes.append(textbox(0.95, 5.85, 11.15, 0.7, [bottom], size=17, fill=COLORS["soft_teal"], border=COLORS["teal"]))
    return Slide(title, shapes=shapes)


def build_slides() -> list[Slide]:
    slides: list[Slide] = []

    bg, rel1 = picture(ROOT / "ai_cover_background.png", 0, 0, SLIDE_W, SLIDE_H, "rId2")
    logo, rel2 = picture(ROOT.parent / "thesis" / "logo.png", 0.55, 0.42, 0.8, 0.8, "rId3")
    slides.append(Slide("Title", shapes=[
        bg,
        logo,
        textbox(8.8, 0.48, 3.9, 0.55, ["University of Rwanda", "College of Science and Technology"], size=12, color=COLORS["white"], align="r"),
        textbox(0.75, 2.12, 7.3, 1.45, ["Fractional-Order", "HIV SITA Model"], size=32, color=COLORS["white"], bold=True),
        textbox(0.78, 3.67, 7.0, 0.55, ["Social behaviour interventions and simulation-based analysis"], size=17, color=COLORS["white"]),
        textbox(0.78, 4.58, 5.5, 0.9, ["NDACYAYISABA Lambert", "Supervisor: Dr. MUHIRWA Jean Pierre", "Kigali, Rwanda"], size=14, color=COLORS["white"], bold=False),
        textbox(0.78, 5.75, 4.0, 0.04, [""], fill=COLORS["gold"]),
        textbox(4.86, 5.75, 3.2, 0.04, [""], fill=COLORS["teal"]),
    ], rels=[rel1, rel2]))

    slides.append(Slide("Background / Motivation", shapes=title_bar("Background / Motivation") + [
        textbox(0.72, 1.38, 6.2, 0.35, ["Rwanda-aware public-health motivation"], size=15, color=COLORS["gold"], bold=True),
        textbox(0.82, 1.82, 6.15, 2.25, [
            "HIV transmission is shaped by biology, treatment access, and social behaviour.",
            "Awareness, safer behaviour, testing, treatment-seeking, and adherence can change long-term outcomes.",
            "In Rwanda, prevention and adherence support remain important alongside treatment progress.",
        ], size=18, bullet=True),
        textbox(0.92, 4.62, 5.8, 0.95, ["Why mathematics?", "A model gives a controlled way to compare intervention strategies and understand possible long-term behaviour."], size=15, fill=COLORS["soft_teal"], border=COLORS["teal"]),
        textbox(7.35, 1.35, 3.8, 0.55, ["Context: HIV in Rwanda"], size=17, color=COLORS["white"], bold=True, fill=COLORS["blue"]),
        textbox(7.35, 2.15, 3.8, 0.55, ["Mechanism: Behaviour"], size=17, color=COLORS["white"], bold=True, fill=COLORS["teal"]),
        textbox(7.35, 2.95, 3.8, 0.55, ["Method: Fractional memory"], size=17, color=COLORS["white"], bold=True, fill=COLORS["gold"]),
        textbox(7.35, 3.75, 3.8, 0.55, ["Output: Simulation evidence"], size=17, color=COLORS["white"], bold=True, fill=COLORS["red"]),
    ]))

    slides.append(two_col_slide(
        "Problem Statement",
        "Limitations in ordinary modelling",
        [
            "Ordinary models usually depend only on the present state.",
            "HIV-related behaviour may depend on past awareness, stigma, testing history, and adherence.",
            "Social behaviour is often simplified into fixed rates.",
        ],
        "Need addressed by this project",
        [
            "Include memory using a Caputo fractional derivative.",
            "Represent behavioural interventions through effective rates.",
            "Use numerical simulation to compare scenarios clearly.",
        ],
        "Research focus: How do fractional memory and social behaviour interventions affect simulated HIV dynamics in a SITA framework?",
    ))

    slides.append(Slide("Objectives", shapes=title_bar("Objectives") + [
        textbox(0.75, 1.32, 5.7, 0.38, ["Main objective"], size=15, color=COLORS["gold"], bold=True),
        textbox(0.78, 1.78, 5.75, 0.95, ["To formulate, analyse, and simulate a fractional-order SITA HIV transmission model incorporating social behaviour interventions."], size=18),
        textbox(0.75, 3.05, 5.7, 0.38, ["Specific objectives"], size=15, color=COLORS["gold"], bold=True),
        textbox(0.84, 3.48, 5.8, 2.15, [
            "Formulate the SITA model with Caputo derivative.",
            "Derive threshold quantities including R0.",
            "Establish core analytical properties.",
            "Implement a numerical simulation scheme.",
            "Compare interventions, memory effects, and sensitivity.",
        ], size=16, bullet=True),
        textbox(7.25, 1.45, 3.8, 0.55, ["Model formulation"], size=17, bold=True, fill=COLORS["soft_blue"], border=COLORS["blue"], align="c"),
        textbox(7.25, 2.35, 3.8, 0.55, ["Mathematical analysis"], size=17, bold=True, fill=COLORS["soft_teal"], border=COLORS["teal"], align="c"),
        textbox(7.25, 3.25, 3.8, 0.55, ["Numerical simulation"], size=17, bold=True, fill=COLORS["soft_gold"], border=COLORS["gold"], align="c"),
        textbox(7.25, 4.15, 3.8, 0.55, ["Results interpretation"], size=17, bold=True, fill=COLORS["white"], border=COLORS["red"], align="c"),
        connector(9.15, 2.00, 9.15, 2.35, COLORS["muted"]),
        connector(9.15, 2.90, 9.15, 3.25, COLORS["muted"]),
        connector(9.15, 3.80, 9.15, 4.15, COLORS["muted"]),
    ]))

    slides.append(Slide("Model Diagram: SITA", shapes=title_bar("Model Diagram: SITA") + [
        rect_label(0.82, 2.03, 1.85, 0.78, "S(t)", "Susceptible", COLORS["soft_blue"], COLORS["blue"]),
        rect_label(3.55, 2.03, 1.85, 0.78, "I(t)", "Infected", COLORS["white"], COLORS["red"]),
        rect_label(6.28, 2.03, 1.85, 0.78, "T(t)", "Treated", COLORS["soft_gold"], COLORS["gold"]),
        rect_label(9.02, 2.03, 1.85, 0.78, "A(t)", "AIDS stage", COLORS["soft_teal"], COLORS["teal"]),
        connector(2.67, 2.42, 3.55, 2.42, COLORS["ink"]),
        connector(5.40, 2.42, 6.28, 2.42, COLORS["ink"]),
        connector(8.13, 2.42, 9.02, 2.42, COLORS["ink"]),
        textbox(2.48, 1.48, 1.25, 0.35, ["effective transmission"], size=10, color=COLORS["muted"], align="c"),
        textbox(5.14, 1.48, 1.25, 0.35, ["testing and treatment"], size=10, color=COLORS["muted"], align="c"),
        textbox(7.72, 3.04, 1.4, 0.35, ["reduced progression"], size=10, color=COLORS["muted"], align="c"),
        textbox(1.0, 4.62, 5.3, 1.05, ["State variables", "S susceptible, I infected, T treated, A AIDS-stage population."], size=15, fill=COLORS["soft_blue"], border=COLORS["blue"]),
        textbox(6.95, 4.62, 5.15, 1.05, ["Controls", "u1 awareness, u2 safer behaviour, u3 testing, u4 adherence."], size=15, fill=COLORS["soft_gold"], border=COLORS["gold"]),
    ]))

    slides.append(Slide("Fractional-Order Model", shapes=title_bar("Fractional-Order Model") + [
        textbox(0.72, 1.35, 5.8, 0.35, ["Caputo memory form"], size=15, color=COLORS["gold"], bold=True),
        textbox(0.76, 1.82, 5.8, 0.62, ["D_C^q X(t) = F(t, X(t)),    0 < q <= 1"], size=24, bold=True),
        textbox(0.82, 2.78, 6.15, 1.9, [
            "D_C^q S = Lambda - beta_eff S(I + eta T) - mu S",
            "D_C^q I = beta_eff S(I + eta T) - (tau_eff + delta + mu)I",
            "D_C^q T = tau_eff I - (rho_eff + mu)T",
            "D_C^q A = delta I + rho_eff T - (d + mu)A",
        ], size=16),
        textbox(7.45, 1.55, 4.6, 1.45, [
            "Intervention-adjusted rates",
            "beta_eff = beta0(1-u1)(1-u2)",
            "tau_eff = tau(1+u3)",
            "rho_eff = rho(1-u4)",
        ], size=16, fill=COLORS["soft_gold"], border=COLORS["gold"]),
        textbox(7.45, 3.8, 4.6, 1.05, ["Meaning of q", "q = 1 gives the ordinary model. q < 1 carries memory of past states."], size=16, fill=COLORS["soft_teal"], border=COLORS["teal"]),
    ]))

    slides.append(Slide("Numerical Scheme + Implementation", shapes=title_bar("Numerical Scheme + Implementation") + [
        textbox(0.72, 1.35, 5.15, 0.35, ["Numerical idea"], size=15, color=COLORS["gold"], bold=True),
        textbox(0.82, 1.78, 5.4, 2.65, [
            "Time interval is divided into discrete steps.",
            "A predictor estimates the next state.",
            "A corrector updates the state using fractional-memory weights.",
            "The same engine is used for baseline, memory, intervention, and sensitivity experiments.",
        ], size=18, bullet=True),
        textbox(6.95, 1.28, 4.7, 0.82, ["Inputs", "parameters, initial conditions, q, controls"], size=14, fill=COLORS["soft_blue"], border=COLORS["blue"]),
        textbox(6.95, 2.28, 4.7, 0.82, ["Solver", "fractional ABM-type numerical method"], size=14, fill=COLORS["soft_teal"], border=COLORS["teal"]),
        textbox(6.95, 3.28, 4.7, 0.82, ["Outputs", "trajectories, R0, scenarios, sensitivity"], size=14, fill=COLORS["soft_gold"], border=COLORS["gold"]),
        textbox(6.95, 4.28, 4.7, 0.82, ["Presentation", "moving graphs during the live demo"], size=14, fill=COLORS["white"], border=COLORS["red"]),
        connector(9.3, 2.10, 9.3, 2.28, COLORS["muted"]),
        connector(9.3, 3.10, 9.3, 3.28, COLORS["muted"]),
        connector(9.3, 4.10, 9.3, 4.28, COLORS["muted"]),
        textbox(0.98, 5.65, 10.85, 0.72, ["Presentation link: the mathematical model is explained in the slides; moving graphs are shown separately during the live demonstration."], size=16, fill=COLORS["soft_gold"], border=COLORS["gold"]),
    ]))

    pic, rel = picture(ROOT.parent / "thesis" / "mainChartlinear.png", 0.70, 1.38, 6.9, 4.65, "rId2")
    slides.append(Slide("Baseline Simulation Result", shapes=title_bar("Baseline Simulation Result") + [
        pic,
        textbox(8.05, 1.35, 3.9, 0.35, ["Computed baseline"], size=15, color=COLORS["gold"], bold=True),
        textbox(8.10, 1.78, 3.9, 1.35, [
            "R0 = 0.430, below the epidemic threshold.",
            "Peak infected population is 150 at t = 0 years.",
            "Final values after 50 years: I = 3.1, T = 94.3, A = 3.6.",
        ], size=15, bullet=True),
        textbox(8.05, 3.62, 4.0, 1.12, ["Interpretation", "The baseline intervention-adjusted configuration leads toward disease-free behaviour in the simulation."], size=14, fill=COLORS["soft_teal"], border=COLORS["teal"]),
        textbox(8.05, 5.08, 4.0, 0.76, ["Defense point", "These numbers come from the Python simulation engine and match the dashboard summary table."], size=13, fill=COLORS["soft_gold"], border=COLORS["gold"]),
    ], rels=[rel]))

    pic, rel = picture(ROOT.parent / "thesis" / "combinedInterventionsChart.png", 0.72, 1.42, 6.8, 4.6, "rId2")
    slides.append(Slide("Simulation Results: Intervention Comparison", shapes=title_bar("Simulation Results: Intervention Comparison") + [
        pic,
        textbox(8.05, 1.45, 3.9, 0.35, ["Main interpretation"], size=15, color=COLORS["gold"], bold=True),
        textbox(8.10, 1.88, 3.85, 2.1, [
            "Single interventions help, but each targets only one mechanism.",
            "Combined intervention acts on transmission, treatment uptake, and progression.",
            "The combined strategy gives stronger simulated control than isolated changes.",
        ], size=16, bullet=True),
        textbox(8.05, 4.52, 3.95, 0.95, ["Public-health meaning", "Prevention and treatment support should work together."], size=15, fill=COLORS["soft_teal"], border=COLORS["teal"]),
    ], rels=[rel]))

    pic, rel = picture(ROOT.parent / "thesis" / "memoryChart.png", 0.72, 1.42, 6.8, 4.6, "rId2")
    slides.append(Slide("Simulation Results: Fractional Memory", shapes=title_bar("Simulation Results: Fractional Memory") + [
        pic,
        textbox(8.05, 1.45, 3.9, 0.35, ["Why q matters"], size=15, color=COLORS["gold"], bold=True),
        textbox(8.10, 1.88, 3.85, 1.85, [
            "q = 1 represents the ordinary model.",
            "Smaller q values strengthen the memory effect.",
            "Different q values produce visibly different trajectories.",
        ], size=16, bullet=True),
        textbox(8.05, 4.38, 3.95, 1.0, ["Defense point", "Fractional calculus is not decorative; it changes the simulated dynamics."], size=15, fill=COLORS["soft_gold"], border=COLORS["gold"]),
    ], rels=[rel]))

    pic, rel = picture(ROOT.parent / "thesis" / "sensitivityChart.png", 0.72, 1.42, 6.8, 4.6, "rId2")
    dash, rel_dash = picture(ROOT.parent / "thesis" / "dashboardBaselineFigure.png", 8.10, 4.12, 3.7, 1.78, "rId3")
    slides.append(Slide("Dashboard and Sensitivity Evidence", shapes=title_bar("Dashboard and Sensitivity Evidence") + [
        pic,
        textbox(8.05, 1.45, 3.9, 0.35, ["Main evidence"], size=15, color=COLORS["gold"], bold=True),
        textbox(8.10, 1.88, 3.85, 1.75, [
            "Transmission-related quantities dominate R0 sensitivity.",
            "Safer behaviour and awareness reduce R0 strongly.",
            "Dashboard outputs support thesis discussion and live defense.",
        ], size=15, bullet=True),
        dash,
    ], rels=[rel, rel_dash]))

    slides.append(two_col_slide(
        "Live Demo, Conclusion + Recommendations",
        "Live demo plan",
        [
            "Open the deployed simulator.",
            "Run the moving SITA graph.",
            "Compare no intervention with combined intervention.",
            "Compare q = 1 with q < 1.",
            "Show scenario and sensitivity views briefly.",
        ],
        "Conclusion",
        [
            "The SITA HIV model was extended using fractional memory.",
            "Behavioural interventions were represented through effective rates.",
            "Numerical simulations support combined intervention strategies.",
            "Future work should calibrate parameters with Rwanda-specific data.",
        ],
        "Final message: this project connects mathematical analysis, numerical simulation, and a working interactive tool for explaining HIV intervention dynamics.",
    ))

    return slides


def slide_xml(slide: Slide) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<p:sld xmlns:a="{a}" xmlns:r="{r}" xmlns:p="{p}"><p:cSld><p:spTree>'
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/>'
        '<a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
        '{shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
    ).format(a=NS["a"], r=NS["r"], p=NS["p"], shapes="".join(slide.shapes))


def rels_xml(rels: list[Rel]) -> str:
    body = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
    ]
    for rel in rels:
        body.append(f'<Relationship Id="{rel.rid}" Type="{rel.rel_type}" Target="{rel.target}"/>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(body) + "</Relationships>"
    )


def write_deck(path: Path, slides: list[Slide]) -> None:
    with ZipFile(path, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types(slides))
        z.writestr("_rels/.rels", package_rels())
        z.writestr("docProps/core.xml", core_props())
        z.writestr("docProps/app.xml", app_props(len(slides)))
        z.writestr("ppt/presentation.xml", presentation_xml(len(slides)))
        z.writestr("ppt/_rels/presentation.xml.rels", presentation_rels(len(slides)))
        z.writestr("ppt/theme/theme1.xml", theme_xml())
        z.writestr("ppt/slideMasters/slideMaster1.xml", master_xml())
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", master_rels())
        z.writestr("ppt/slideLayouts/slideLayout1.xml", layout_xml())
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", layout_rels())
        z.writestr("ppt/presProps.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentationPr xmlns:p="{p}"/>'.format(p=NS["p"]))
        z.writestr("ppt/viewProps.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:viewPr xmlns:p="{p}"/>'.format(p=NS["p"]))
        z.writestr("ppt/tableStyles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:tblStyleLst xmlns:a="{a}" def="{{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}}"/>'.format(a=NS["a"]))
        for i, slide in enumerate(slides, start=1):
            z.writestr(f"ppt/slides/slide{i}.xml", slide_xml(slide))
            z.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", rels_xml(slide.rels))
        for name, src in deck.media.items():
            z.write(src, f"ppt/media/{name}")


def content_types(slides: list[Slide]) -> str:
    slide_overrides = "".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, len(slides) + 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
{slide_overrides}</Types>'''


def package_rels() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''


def core_props() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Fractional-Order HIV SITA Model</dc:title><dc:creator>NDACYAYISABA Lambert</dc:creator>
<cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2026-06-11T00:00:00Z</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-11T00:00:00Z</dcterms:modified></cp:coreProperties>'''


def app_props(count: int) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>WPS Presentation</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat>
<Slides>{count}</Slides><Company>University of Rwanda</Company></Properties>'''


def presentation_xml(count: int) -> str:
    ids = "".join(f'<p:sldId id="{255+i}" r:id="rId{i}"/>' for i in range(1, count + 1))
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="{NS["a"]}" xmlns:r="{NS["r"]}" xmlns:p="{NS["p"]}">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId{count+1}"/></p:sldMasterIdLst>
<p:sldIdLst>{ids}</p:sldIdLst><p:sldSz cx="{emu(SLIDE_W)}" cy="{emu(SLIDE_H)}" type="screen16x9"/>
<p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle>
</p:presentation>'''


def presentation_rels(count: int) -> str:
    rels = [
        f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        for i in range(1, count + 1)
    ]
    rels += [
        f'<Relationship Id="rId{count+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>',
        f'<Relationship Id="rId{count+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>',
        f'<Relationship Id="rId{count+3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>',
        f'<Relationship Id="rId{count+4}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>',
        f'<Relationship Id="rId{count+5}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>',
    ]
    return '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(rels) + "</Relationships>"


def theme_xml() -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="{NS["a"]}" name="SITA Professional"><a:themeElements><a:clrScheme name="SITA">
<a:dk1><a:srgbClr val="{COLORS["navy"]}"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="{COLORS["ink"]}"/></a:dk2><a:lt2><a:srgbClr val="F7FAFC"/></a:lt2>
<a:accent1><a:srgbClr val="{COLORS["teal"]}"/></a:accent1><a:accent2><a:srgbClr val="{COLORS["gold"]}"/></a:accent2>
<a:accent3><a:srgbClr val="{COLORS["blue"]}"/></a:accent3><a:accent4><a:srgbClr val="{COLORS["red"]}"/></a:accent4>
<a:accent5><a:srgbClr val="7A8794"/></a:accent5><a:accent6><a:srgbClr val="C7D5E1"/></a:accent6>
<a:hlink><a:srgbClr val="{COLORS["blue"]}"/></a:hlink><a:folHlink><a:srgbClr val="{COLORS["teal"]}"/></a:folHlink></a:clrScheme>
<a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Clean"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'''


def master_xml() -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="{NS["a"]}" xmlns:r="{NS["r"]}" xmlns:p="{NS["p"]}"><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>'''


def master_rels() -> str:
    return '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>'''


def layout_xml() -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="{NS["a"]}" xmlns:r="{NS["r"]}" xmlns:p="{NS["p"]}" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'''


def layout_rels() -> str:
    return '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>'''


if __name__ == "__main__":
    slides = build_slides()
    write_deck(OUT, slides)
    write_deck(OUT_WPS, slides)
    print(f"Wrote {OUT}")
    print(f"Wrote {OUT_WPS}")
