# Thesis Defense Readiness Checklist

## Files to Send or Carry

- `presentation/FracHIV_SITA_Presentation.pdf` for safe presenting.
- `presentation/FracHIV_SITA_Presentation_WPS.pptx` if the room computer uses WPS.
- `presentation/FracHIV_SITA_Presentation.pptx` if Microsoft PowerPoint is available.
- `thesis/thesis.pdf` as the final report.
- `presentation/FracHIV_SITA_Speaker_Notes.md` for rehearsal.

## Best Live Demo Route

Use this route during the defense:

1. Open the dashboard.
2. Keep run mode on Fast demo if the computer feels slow; Balanced is also safe.
3. Click Run Simulation.
4. Stay on Baseline and show:
   - SITA compartment time series.
   - R0 card.
   - peak infected and final state summary.
5. Click the animation Run button only on the main SITA graph.
6. Open Sensitivity, show the R0 sensitivity ranking.
7. Return to the presentation for Conclusion and Recommendations.

Do not show every tab unless the panel asks. The dashboard is intentionally rich, but the defense should be selective.

## What to Say Before the Dashboard

"I will briefly open the dashboard to demonstrate that the trajectories and summaries are generated from the Python simulation engine. I will show the baseline SITA trajectory, the threshold result, and one analysis view."

## What to Avoid

- Do not spend time explaining every sidebar parameter.
- Do not open every animation type.
- Do not rely on internet during the demo; run locally if possible.
- Do not claim the dashboard gives clinical predictions. Say it is an academic simulation tool.

## Quick Commands

Start local dashboard:

```bash
cd /Users/apple/HIV-MODEL
.venv311/bin/python app.py
```

Then open:

```text
http://127.0.0.1:5000/dashboard
```

Stop running Python servers if needed:

```bash
pkill -f "python.*app.py"
```

Run tests:

```bash
cd /Users/apple/HIV-MODEL
.venv311/bin/python -m pytest -q
```

## Likely Questions

Why fractional calculus?
It captures memory effects. Past behaviour, awareness, testing habits, and adherence can influence present dynamics.

Why Caputo derivative?
It supports classical initial conditions, which are natural for compartmental population models.

What is the meaning of R0?
It is the epidemic threshold. If R0 is less than 1, disease-free stability is expected; if it is greater than 1, persistence is possible.

What are u1, u2, u3, and u4?
u1 is awareness, u2 is safer behaviour, u3 is testing and treatment-seeking, and u4 is adherence support.

What is the limitation?
Parameters are not fully calibrated with Rwanda-specific surveillance data, so results are simulation evidence rather than clinical or policy prediction.
