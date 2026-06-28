# FracHIV-SITA Lab

Interactive Flask dashboard for the thesis:

**A Fractional-Order Compartmental Model of HIV Transmission with Social Behaviour Interventions**

The app demonstrates a fractional-order SITA HIV model with Caputo memory, social-behaviour controls, numerical simulation, scenario comparison, memory analysis, and sensitivity analysis.

## Defense Demo Flow

Use the dashboard in this order during presentation:

1. **Baseline** - run the baseline simulation and explain `R0`, final state summary, and interpretation.
2. **Scenarios** - compare no intervention, single controls, combined intervention, ordinary model, and high-memory cases.
3. **Memory** - change/view fractional order `q` and explain how memory affects trajectories.
4. **Sensitivity** - show which parameters increase or reduce `R0`.
5. **Defense** - close with computed baseline summary and generated interpretation.

The **Defense Mode** button prepares this flow by running the baseline simulation and preloading scenario, memory, and sensitivity results.

## Run Locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:5000/dashboard
```

## Production Run

```bash
gunicorn -c gunicorn.conf.py wsgi:app
```

The Gunicorn config uses workers, threads, request timeout protection, access logs, and environment-based port configuration.

## Docker

Build and run:

```bash
docker build -t frachiv-sita-lab .
docker run --rm -p 5000:5000 frachiv-sita-lab
```

## Render Deployment

The repository includes `render.yaml` and `Procfile`.

Render start command:

```bash
gunicorn -c gunicorn.conf.py wsgi:app
```

## Scalable Deployment Recommendation

For a more scalable deployment, containerize the app and deploy it to **Google Cloud Run**.

Suggested architecture:

```text
Browser dashboard
  -> Flask API
  -> Python fractional SITA simulation engine
  -> JSON results
  -> Plotly visualizations
```

## Scalability Enhancements Already Included

- Stateless Flask API design.
- Gunicorn production configuration.
- Dockerfile for container deployment.
- Health endpoint: `/api/health`.
- Input validation and maximum simulation-step limits.
- Downsampled time-series responses for browser performance.
- Lightweight in-memory LRU cache for repeated simulations.
- Backend timing field (`elapsed_ms`) for simulation monitoring.
- Friendly frontend errors for heavy simulations.

## Future Scalability Improvements

- Deploy to Google Cloud Run with autoscaling.
- Add Redis-backed caching if multiple server instances are used.
- Move long simulations to Celery/RQ background jobs.
- Add rate limiting for public deployments.
- Add observability dashboards for request latency, CPU, memory, and errors.

## Main Features

- Fractional-order SITA model using a Caputo-type formulation.
- ABM-type predictor-corrector numerical solver.
- Social behaviour interventions:
  - `u1`: awareness and education
  - `u2`: safer sexual behaviour
  - `u3`: testing and treatment-seeking
  - `u4`: treatment adherence
- Baseline simulation with generated interpretation.
- Scenario comparison.
- Fractional-memory comparison for different `q` values.
- Normalized `R0` sensitivity analysis.
- Defense-focused dashboard mode.
- Local static assets for reliable presentation use.

## Academic Disclaimer

This dashboard is for academic simulation and thesis defense. It is **not** intended for clinical prediction or public-health decision-making without calibration and validation using real surveillance data.

## Test

```bash
python -m pytest -q
```

## Key Parameters

| Parameter | Meaning | Range |
|-----------|---------|-------|
| `Lambda` | Recruitment rate | `>= 0` |
| `mu` | Natural mortality | `>= 0` |
| `beta0` | Baseline transmission rate | `>= 0` |
| `eta` | Treated infectiousness factor | `[0,1]` |
| `tau` | Treatment initiation | `>= 0` |
| `delta` | Infected-to-AIDS progression | `>= 0` |
| `rho` | Treated-to-AIDS progression | `>= 0` |
| `d` | AIDS-related mortality | `>= 0` |
| `q` | Fractional order | `0 < q <= 1` |
| `u1` | Awareness intervention | `[0,1]` |
| `u2` | Safer behaviour intervention | `[0,1]` |
| `u3` | Testing intervention | `[0,1]` |
| `u4` | Adherence intervention | `[0,1]` |
