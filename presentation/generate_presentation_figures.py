from __future__ import annotations

import os
import sys
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
os.environ.setdefault("XDG_CACHE_HOME", "/tmp")
os.environ.setdefault("MPLBACKEND", "Agg")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import matplotlib.pyplot as plt
import numpy as np

from model.scenarios import SCENARIOS
from model.sensitivity import compute_sensitivity
from routes.simulation_routes import run_engine


OUT = ROOT / "presentation" / "slide_images"
OUT.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.unicode_minus": False,
})

BASE_PAYLOAD = {
    "initial_conditions": {"S0": 10000, "I0": 150, "T0": 80, "A0": 20},
    "parameters": {
        "Lambda": 100,
        "beta0": 0.30,
        "mu": 0.02,
        "tau": 0.20,
        "delta": 0.10,
        "rho": 0.03,
        "eta": 0.10,
        "d": 0.33,
        "q": 0.95,
        "u1": 0.40,
        "u2": 0.50,
        "u3": 0.60,
        "u4": 0.70,
    },
    "simulation": {"years": 50, "step": 0.2},
}

COLORS = {
    "S": "#00A6D6",
    "I": "#D83F68",
    "T": "#00A889",
    "A": "#D69D00",
    "navy": "#142030",
    "grid": "#D8E2EB",
    "teal": "#007E70",
    "gold": "#CC9900",
    "red": "#B44146",
}


def run(payload):
    result, errors = run_engine(payload, downsample=False)
    if errors:
        raise RuntimeError(errors)
    return result


def copy_payload():
    return {
        "initial_conditions": dict(BASE_PAYLOAD["initial_conditions"]),
        "parameters": dict(BASE_PAYLOAD["parameters"]),
        "simulation": dict(BASE_PAYLOAD["simulation"]),
    }


def style_axis(ax, title, ylabel):
    ax.set_title(title, loc="left", fontsize=22, fontweight="bold", color=COLORS["navy"], pad=14)
    ax.set_xlabel("Time (years)", fontsize=17, fontweight="bold", color=COLORS["navy"], labelpad=12)
    ax.set_ylabel(ylabel, fontsize=17, fontweight="bold", color=COLORS["navy"])
    ax.tick_params(axis="both", labelsize=14, colors=COLORS["navy"])
    ax.grid(True, color=COLORS["grid"], linewidth=1.1)
    ax.set_facecolor("white")
    for spine in ax.spines.values():
        spine.set_color("#AEBBC8")
        spine.set_linewidth(1.1)


def save(fig, filename):
    fig.savefig(OUT / filename, dpi=220, bbox_inches="tight", pad_inches=0.16, facecolor="white")
    plt.close(fig)


def baseline_figure():
    result = run(BASE_PAYLOAD)
    t = np.array(result["time_series"]["time"])
    fig, ax = plt.subplots(figsize=(13.2, 5.05))
    for key, label in [
        ("S", "S(t) Susceptible"),
        ("I", "I(t) Infected"),
        ("T", "T(t) Treated"),
        ("A", "A(t) AIDS stage"),
    ]:
        ax.plot(t, result["time_series"][key], label=label, color=COLORS[key], linewidth=3.6)
    ax.set_yscale("log")
    ax.set_xlim(0, 50)
    ax.set_ylim(1, 13000)
    style_axis(ax, "Baseline SITA trajectories, q = 0.95", "Population (log scale)")
    s = result["summary"]
    ax.scatter([s["time_peak"]], [s["peak_infected"]], s=150, color="white", edgecolor=COLORS["I"], linewidth=3, zorder=5)
    ax.annotate(
        "Peak infected = initial I(0)=150",
        xy=(s["time_peak"], s["peak_infected"]),
        xytext=(4, 420),
        fontsize=15,
        fontweight="bold",
        color=COLORS["I"],
        arrowprops={"arrowstyle": "->", "color": COLORS["I"], "lw": 2},
    )
    ax.annotate(
        f"Final: I={s['final_infected']:.1f}, T={s['final_treated']:.1f}, A={s['final_aids']:.1f}",
        xy=(50, s["final_treated"]),
        xytext=(28, 500),
        fontsize=15,
        fontweight="bold",
        color=COLORS["navy"],
        arrowprops={"arrowstyle": "->", "color": COLORS["teal"], "lw": 2},
    )
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.38), ncol=4, fontsize=14, frameon=False)
    fig.subplots_adjust(left=0.075, right=0.985, top=0.86, bottom=0.36)
    save(fig, "presentation_baseline.png")


def intervention_figure():
    selected = [
        "no_intervention",
        "awareness_only",
        "testing_boost",
        "combined_intervention",
        "strong_combined",
    ]
    palette = ["#52606C", "#007E70", "#004A80", "#B44146", "#00A6D6"]
    short_labels = {
        "no_intervention": "No intervention",
        "awareness_only": "Awareness",
        "testing_boost": "Testing",
        "adherence_support": "Adherence",
        "combined_intervention": "Combined",
        "strong_combined": "Strong combined",
    }
    fig, ax = plt.subplots(figsize=(13.4, 6.05))
    for key, color in zip(selected, palette):
        payload = copy_payload()
        payload["parameters"].update({k: v for k, v in SCENARIOS[key].items() if k in {"q", "u1", "u2", "u3", "u4"}})
        result = run(payload)
        t = np.array(result["time_series"]["time"])
        ax.plot(
            t,
            result["time_series"]["I"],
            label=f"{short_labels[key]}  R0={result['r0']:.2f}",
            color=color,
            linewidth=4.2,
        )
    ax.set_yscale("log")
    ax.set_xlim(0, 50)
    ax.set_ylim(1, 1200)
    style_axis(ax, "Intervention comparison: infected trajectory I(t)", "Infected population (log scale)")
    ax.xaxis.labelpad = 18
    ax.yaxis.labelpad = 10
    ax.text(
        0.985,
        0.92,
        "Lower curve = stronger control",
        transform=ax.transAxes,
        ha="right",
        va="top",
        fontsize=15,
        fontweight="bold",
        color=COLORS["teal"],
        bbox={"boxstyle": "round,pad=0.35", "facecolor": "#E6F7F4", "edgecolor": COLORS["teal"]},
    )
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.58), ncol=3, fontsize=13.2, frameon=False)
    fig.subplots_adjust(left=0.12, right=0.985, top=0.86, bottom=0.48)
    save(fig, "presentation_interventions.png")


def memory_figure():
    q_values = [1.0, 0.95, 0.85, 0.75]
    palette = ["#52606C", "#007E70", "#CC9900", "#B44146"]
    fig, ax = plt.subplots(figsize=(13.2, 5.05))
    for q, color in zip(q_values, palette):
        payload = copy_payload()
        payload["parameters"]["q"] = q
        result = run(payload)
        t = np.array(result["time_series"]["time"])
        final_i = result["summary"]["final_infected"]
        ax.plot(t, result["time_series"]["I"], label=f"q={q:.2f}, final I={final_i:.1f}", color=color, linewidth=3.6)
    ax.set_yscale("log")
    ax.set_xlim(0, 50)
    ax.set_ylim(1, 250)
    style_axis(ax, "Fractional memory effect on I(t)", "Infected population (log scale)")
    ax.text(
        0.985,
        0.92,
        "Changing q changes the memory of past states",
        transform=ax.transAxes,
        ha="right",
        va="top",
        fontsize=16,
        fontweight="bold",
        color=COLORS["gold"],
        bbox={"boxstyle": "round,pad=0.35", "facecolor": "#FFF7E0", "edgecolor": COLORS["gold"]},
    )
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.38), ncol=4, fontsize=13.5, frameon=False)
    fig.subplots_adjust(left=0.075, right=0.985, top=0.86, bottom=0.36)
    save(fig, "presentation_memory.png")


def sensitivity_figure():
    rows = sorted(compute_sensitivity(BASE_PAYLOAD["parameters"]), key=lambda row: row["sensitivity"])
    labels = [row["parameter"] for row in rows]
    values = [row["sensitivity"] for row in rows]
    colors = [COLORS["teal"] if value < 0 else COLORS["red"] for value in values]
    fig, ax = plt.subplots(figsize=(13.2, 5.05))
    bars = ax.barh(labels, values, color=colors, height=0.62)
    style_axis(ax, "Normalized sensitivity of R0", "Parameter")
    ax.set_xlabel("Sensitivity index", fontsize=17, fontweight="bold", color=COLORS["navy"])
    ax.axvline(0, color=COLORS["navy"], linewidth=1.5)
    ax.set_xlim(min(values) - 0.18, max(values) + 0.18)
    for bar, value in zip(bars, values):
        x = value + (0.035 if value >= 0 else -0.035)
        ha = "left" if value >= 0 else "right"
        ax.text(x, bar.get_y() + bar.get_height() / 2, f"{value:+.2f}", va="center", ha=ha, fontsize=13.5, fontweight="bold")
    ax.text(
        0.985,
        0.08,
        "Right: increases R0   |   Left: reduces R0",
        transform=ax.transAxes,
        ha="right",
        va="bottom",
        fontsize=15,
        fontweight="bold",
        color=COLORS["navy"],
        bbox={"boxstyle": "round,pad=0.35", "facecolor": "#E8F2FA", "edgecolor": "#004A80"},
    )
    fig.subplots_adjust(left=0.15, right=0.985, top=0.86, bottom=0.18)
    save(fig, "presentation_sensitivity.png")


if __name__ == "__main__":
    baseline_figure()
    intervention_figure()
    memory_figure()
    sensitivity_figure()
    print(f"Generated presentation figures in {OUT}")
