# FracHIV-SITA Lab

A Flask-based fractional-order HIV SITA simulation dashboard for an Applied Mathematics final-year thesis.

## Run

```powershell
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000/dashboard`.

## Main Features

- **Fractional-order SITA simulation** with an Adams-Bashforth-Moulton-type predictor-corrector method for Caputo fractional differential equations
- **Social behaviour interventions** for awareness, safer behaviour, testing, and adherence
- **R₀ calculation** with intervention effects
- **Time-series plots** for S(t), I(t), T(t), A(t), N(t)
- **Animated phase plot** (I vs T) with moving marker showing epidemic progression
- **R₀ Gauge** with color-coded epidemic status
- **Scenario comparison** across no-intervention, single-intervention, combined, ordinary-model, and high-memory strategies
- **Sensitivity analysis** with normalized indices
- **Memory effect comparison** across fractional orders (q = 1.0, 0.95, 0.85, 0.75)
- **R₀ surface visualization** as function of (u₁, u₂)
- **CSV/JSON export** for data and parameters
- **High-resolution figure export** (scale=3 for thesis quality)

## Key Enhancements

1. **ABM-Type Predictor-Corrector Solver**: Improved over a simple fractional Euler approximation; numerical accuracy depends on step size, fractional order, and solution smoothness.
2. **Research Modules**: Parameters, interventions, R0/stability, baseline results, scenarios, phase analysis, memory effects, sensitivity, surfaces, heatmaps, and exports.
3. **Thesis-Ready Interpretation**: Automatic stability text, scenario interpretation, and copyable results text.
4. **Enhanced Documentation**: Mathematical formulas, API endpoints, and usage guidance.

## Defense Notes

The dashboard currently uses CDN links for Bootstrap, Font Awesome, Google Fonts, and Plotly. For an offline defense, download those assets into `static/vendor/` and update `templates/base.html` to load local files.

## Test

```powershell
python -m pytest tests -p no:cacheprovider
```

## Model Parameters

| Parameter | Meaning | Range |
|-----------|---------|-------|
| Λ | Recruitment rate | >0 |
| μ | Natural mortality | >0 |
| β₀ | Transmission rate | >0 |
| η | Treated infectiousness | 0<η<1 |
| τ | Treatment initiation | >0 |
| δ | I→AIDS progression | >0 |
| ρ | T→AIDS progression | >0 |
| d | AIDS mortality | >0 |
| q | Fractional order | 0<q≤1 |
| u₁ | Awareness intervention | [0,1] |
| u₂ | Safer behaviour | [0,1] |
| u₃ | Testing intervention | [0,1] |
| u₄ | Adherence intervention | [0,1] |
