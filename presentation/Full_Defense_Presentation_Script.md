# Full Thesis Defense Presentation Script

Title:
A Fractional-Order Compartmental Model of HIV Transmission with Social Behaviour Interventions

Recommended total time: 12 to 15 minutes.

## Before You Start

Open these before entering presentation mode:

1. `presentation/FracHIV_SITA_Presentation.pdf`
2. Dashboard in browser:
   `http://127.0.0.1:5001/dashboard`
3. Keep the dashboard already loaded and already run once if possible.

Start dashboard locally:

```bash
cd /Users/apple/HIV-MODEL
PORT=5001 .venv311/bin/python app.py
```

## Opening Words

Good morning honorable panel, my supervisor, lecturers, and colleagues.
My name is NDACYAYISABA Lambert. Today I am presenting my final year project titled:
"A Fractional-Order Compartmental Model of HIV Transmission with Social Behaviour Interventions."

The work combines mathematical modelling, fractional calculus, social behaviour interventions, numerical simulation, and a Python dashboard for visualizing HIV transmission dynamics.

## Slide 1: Title

What to say:

This presentation focuses on three main things. First, the formulation of a fractional-order SITA HIV model. Second, the mathematical analysis of the model, including positivity, boundedness, disease-free equilibrium, R0, and stability. Third, the simulation dashboard used to study memory effects, interventions, sensitivity, and epidemic trajectories.

Transition:
I begin with the background and motivation for the study.

## Slide 2: Background / Motivation

What to say:

HIV transmission is affected by both biological and social factors. In real communities, awareness, safer sexual behaviour, testing, treatment initiation, and adherence can change the disease trajectory.

In Rwanda, HIV prevention and treatment programs have made strong progress, but mathematical models remain useful because they help us compare possible intervention effects before applying them in real settings.

The motivation of this study is to build a model that can include both disease progression and social behaviour interventions, while also allowing memory effects through fractional calculus.

Transition:
This leads to the specific problem addressed in the research.

## Slide 3: Problem Statement

What to say:

Many classical epidemic models use ordinary derivatives. In such models, the future state depends mainly on the current state. However, HIV-related behaviour may not work like that. Previous awareness campaigns, testing habits, stigma reduction, and treatment adherence can continue influencing current transmission.

Therefore, the problem is that ordinary models may not fully represent memory effects in HIV dynamics. This study addresses that by using a Caputo fractional-order model and social behaviour intervention controls.

Transition:
Before the objectives, I briefly show the literature gap addressed by this project.

## Slide 4: Literature Review and Research Gap

What to say:

The report includes a full literature review and mathematical preliminaries chapter. In the presentation, I summarize only the gap.

Classical HIV models commonly use ordinary differential equations and compartments such as SICA or SITA. Previous studies also show that social behaviour, testing, safer sexual practices, stigma, and adherence influence HIV transmission.

Fractional-order epidemic models use Caputo derivatives to capture memory and hereditary effects. However, existing work does not commonly combine fractional HIV dynamics, social behaviour intervention functions, and an interactive simulation dashboard in one framework.

Therefore, the gap addressed in this study is a fractional-order SITA model that connects memory effects, social behaviour interventions, numerical simulation, and dashboard exploration.

Transition:
From this gap, the study was guided by three objectives.

## Slide 5: Objectives

What to say:

The report has three objectives.

The first objective is to formulate a fractional-order SITA HIV model using the Caputo derivative and social behaviour interventions.

The second objective is to analyse positivity, boundedness, disease-free equilibrium, R0, and fractional stability.

The third objective is to implement simulations and a Python dashboard to study memory effects, interventions, sensitivity, and epidemic trajectories.

Short explanation:
So the work moves from model formulation, to mathematical analysis, then to computational simulation.

Transition:
I now describe the structure of the SITA model.

## Slide 6: Model Diagram: SITA

What to say:

The population is divided into four compartments.

S represents susceptible individuals.
I represents infected untreated individuals.
T represents treated individuals.
A represents individuals in the AIDS stage.

Susceptible individuals move to infected through effective transmission. Infected individuals may enter treatment through testing and treatment-seeking. Infected and treated individuals can progress to AIDS, but adherence support reduces progression from treatment to AIDS.

The controls are:
u1 for awareness,
u2 for safer behaviour,
u3 for testing and treatment-seeking,
u4 for adherence.

Transition:
The next slide shows how this diagram becomes a fractional-order mathematical model.

## Slide 7: Fractional-Order Model

What to say:

The model uses the Caputo derivative of order q, where 0 < q <= 1.

When q = 1, the model becomes the ordinary differential equation model. When q < 1, the model includes memory. This means previous states contribute to the current dynamics.

The intervention-adjusted rates are important:
beta_eff is reduced by awareness and safer behaviour.
tau_eff is increased by testing and treatment-seeking.
rho_eff is reduced by adherence support.

These adjusted rates connect the social behaviour part of the study directly to the mathematical equations.

Transition:
After formulating the model, I used a numerical method to solve it.

## Slide 8: Numerical Scheme + Implementation

What to say:

The fractional system is solved using an Adams-Bashforth-Moulton type predictor-corrector scheme.

The Python engine receives initial conditions, biological parameters, fractional order q, and intervention controls. It then computes trajectories for S, I, T, and A. It also computes R0, final summaries, scenario comparisons, memory effects, and sensitivity results.

This is important because the graphs in the dashboard are not manually drawn. They are generated from the model equations.

Transition:
I now show the baseline simulation result.

## Slide 9: Baseline Simulation Result

What to say:

This slide shows the baseline behaviour of the model under the selected parameter values.

The graph tracks S, I, T, and A over time. The infected population reaches a peak and then decreases under the selected intervention settings. The final values summarize how many individuals remain in each compartment at the end of the simulation.

The main message here is that the model can produce interpretable epidemic trajectories from the fractional SITA system.

Transition:
Next, I compare intervention scenarios.

## Slide 10: Simulation Results: Intervention Comparison

What to say:

This result compares different intervention settings.

Single interventions can reduce part of the transmission process, but combined intervention is stronger because it acts on several mechanisms at the same time.

Awareness and safer behaviour reduce transmission. Testing increases movement into treatment. Adherence reduces progression from treatment to AIDS.

Therefore, the simulation supports the public-health idea that combined behavioural and treatment-support interventions are more effective than isolated controls.

Transition:
I now show the effect of the fractional memory order q.

## Slide 11: Simulation Results: Fractional Memory

What to say:

This slide compares different values of q.

When q = 1, the model behaves like an ordinary model. When q is below 1, the model includes fractional memory.

The important point is that changing q changes the trajectories. Therefore, the memory term is not only theoretical; it has a visible effect in the simulation results.

Transition:
The next slide connects the simulation results to the dashboard and sensitivity evidence.

## Slide 12: Dashboard and Sensitivity Evidence

What to say:

The dashboard was developed to make the mathematical model easier to explore.

It allows the user to change parameters, run simulations, compare interventions, study fractional memory, and view sensitivity results.

Sensitivity analysis is important because it shows which parameters have the strongest influence on R0. Parameters with positive sensitivity increase R0, while parameters with negative sensitivity reduce R0.

Transition:
At this point, I will briefly open the dashboard to demonstrate the live simulation.

## Slide 13: Live Dashboard Demonstration

Before leaving the slide, say:

I will now briefly open the dashboard. The purpose is not to show every tab, but to demonstrate that the trajectories and summaries are generated by the Python simulation engine.

### Dashboard Demo Steps

Step 1: Open the dashboard.

Say:
This is the simulation dashboard for the fractional SITA HIV model. The controls are on the left, and the results are displayed in the main area.

Step 2: Use the sidebar.

If the computer is slow, choose:
Fast demo - h = 0.50.

Say:
For the live demonstration, I use a fast simulation mode so the results appear quickly. The same model engine is used; only the numerical step size changes.

Step 3: Click Run Simulation.

Say:
When I click Run Simulation, the backend sends the selected parameters to the Python model, solves the fractional SITA system, and returns the trajectories and summary values.

Step 4: Show the top cards.

Point to:
R0, epidemic status, peak infected, time of peak, final treated, q.

Say:
These cards summarize the computed result. R0 gives the threshold status, peak infected shows the maximum infection level, and q shows the fractional memory order used in the simulation.

Step 5: Show the main SITA graph.

Say:
This graph shows the evolution of S, I, T, and A over time. It is the main graph I would use to explain the epidemic trajectory.

If animation button is visible, click Run only on the main graph.

Say:
The animation helps show the trajectory evolving over time, which is useful for communicating the model during presentation.

Step 6: Show Final State Summary and Baseline Interpretation.

Say:
The dashboard also generates a final state summary and interpretation. This makes the numerical result easier to explain in words.

Step 7: Open Sensitivity tab.

Say:
Now I show one analysis view. The sensitivity tab ranks the parameters according to their influence on R0.

Point to the highest positive and strongest negative bar.

Say:
A positive sensitivity means that increasing that parameter increases R0. A negative sensitivity means that increasing that parameter reduces R0. This helps identify which intervention-related parameters are most influential.

Step 8: Return to presentation.

Say:
This completes the dashboard demonstration. I will now return to the slides for conclusion and recommendations.

## Slide 14: Conclusion + Recommendations

What to say:

In conclusion, this study formulated a fractional-order SITA HIV model using the Caputo derivative and social behaviour interventions.

The study analysed the main mathematical properties, including positivity, boundedness, disease-free equilibrium, R0, and fractional stability.

The study also implemented a Python dashboard to simulate memory effects, intervention scenarios, sensitivity, and epidemic trajectories.

The recommendation is that future work should calibrate the model using Rwanda-specific HIV data, improve parameter estimation, and extend the dashboard into an educational decision-support tool.

Closing:
Thank you for your attention. I am ready to receive your questions and comments.

## If the Dashboard Fails During Defense

Say calmly:

The live dashboard may be affected by the computer or network environment. For that reason, I included dashboard screenshots and simulation results directly in the slides. The Python backend has already been used to generate these results, and I can continue explaining from the prepared figures.

Then continue with Slide 13.

## Questions You Should Be Ready For

Question: Why did you use fractional-order calculus?
Answer:
Fractional-order calculus allows the model to include memory effects. In HIV dynamics, past behaviour, awareness, treatment adherence, and testing history can influence current transmission.

Question: Why the Caputo derivative?
Answer:
The Caputo derivative is suitable because it allows classical initial conditions such as S0, I0, T0, and A0, which are natural for population models.

Question: What does R0 represent?
Answer:
R0 is the basic reproduction number. It is a threshold quantity. If R0 is less than 1, the disease-free equilibrium is expected to be stable. If R0 is greater than 1, infection may persist.

Question: What are the controls u1, u2, u3, and u4?
Answer:
u1 represents awareness, u2 represents safer sexual behaviour, u3 represents testing and treatment-seeking, and u4 represents adherence support.

Question: Is your dashboard a clinical prediction tool?
Answer:
No. It is an academic simulation and visualization tool. For real policy or clinical prediction, the parameters must be calibrated with reliable Rwanda-specific data.

Question: What is the main contribution of your work?
Answer:
The main contribution is combining a fractional-order SITA HIV model, social behaviour interventions, mathematical analysis, numerical simulation, and an interactive Python dashboard in one project.

## Final Rehearsal Rule

Practice the full talk three times:

1. First rehearsal: read the full script slowly.
2. Second rehearsal: speak without reading every word.
3. Third rehearsal: practice with slide changes and dashboard switching.

During the real defense, speak slowly. Do not rush the dashboard. Show fewer things clearly.
