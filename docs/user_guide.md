# User Guide

## Getting Started
1. Open the Simulator page at `/dashboard`
2. Review the default parameters or choose a scenario preset

## Control Panel

### Initial Conditions
- **S₀, I₀, T₀, A₀**: Initial population values for each compartment
- **Years**: Simulation duration
- **Step**: Time step size (smaller = more accurate but slower)

### Fractional Order (q)
- Range: 0.6 to 1.0
- q=1 gives ordinary ODE behavior
- Lower q introduces memory effects (slower dynamics)

### Biological Parameters
- **Λ**: Recruitment rate
- **β₀**: Baseline transmission rate
- **μ**: Natural mortality rate
- **τ**: Base treatment initiation rate
- **δ**: Progression rate I→AIDS
- **ρ**: Progression rate T→AIDS
- **η**: Relative infectiousness of treated (0<η<1)
- **d**: AIDS-induced mortality

### Social Interventions
- **u₁**: Awareness and education intervention
- **u₂**: Safer sexual behaviour (condom use)
- **u₃**: Testing and treatment-seeking
- **u₄**: Treatment adherence

## Simulation Features

### Time Series Plots
- S(t), I(t), T(t), A(t) trajectories
- Peak infection marker highlighted
- Total population N(t)

### Phase Plot (I vs T)
- Animated trajectory showing epidemic progression
- Moving marker indicates current state
- Color shows time progression

### R₀ Gauge
- Real-time calculation of reproduction number
- Color-coded: green (<1), yellow (~1), red (>1)

### Scenario Comparison
- Quick run buttons for different intervention strategies
- Side-by-side comparison of epidemic outcomes

### Sensitivity Analysis
- Normalized sensitivity indices for all parameters
- Identifies most influential parameters

### Memory Effect Comparison
- Compare I(t) curves across q values (1.0, 0.95, 0.85, 0.75)
- Visualizes how fractional order affects dynamics

### R₀ Surface
- 3D surface showing R₀ as function of (u₁, u₂)
- Useful for intervention planning

## Export Options

### CSV Export
- Download time-series data for all compartments
- File: `fractional_hiv_simulation.csv`

### JSON Export
- Download current parameter set
- File: `fractional_hiv_parameters.json`

### Figure Export
- Use Plotly's camera icon (📷) on any chart
- High-resolution PNG export (scale=3 for thesis quality)
- For publication figures, use scale=4-6 in browser