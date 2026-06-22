# FracHIV-SITA Defense Speaker Notes

## 0. Defense Strategy

Target time: 10 to 12 minutes for slides, then questions.

Main message:
This work formulates a fractional-order SITA HIV model with social behaviour interventions, analyses the main mathematical properties, and implements a Python dashboard to simulate memory effects, interventions, sensitivity, and epidemic trajectories.

Do not try to show every dashboard tab. Use only:

1. Baseline tab: run the SITA time-series graph and mention R0, peak infected, final values.
2. Sensitivity or Scenario tab: show which parameter/control changes R0 most clearly.
3. Return to slides for conclusion and recommendations.

## 1. Title

Good morning. My name is NDACYAYISABA Lambert. My thesis is titled "A Fractional-Order Compartmental Model of HIV Transmission with Social Behaviour Interventions." The work combines mathematical modelling, fractional calculus, social behaviour interventions, numerical simulation, and an interactive Python dashboard.

## 2. Background / Motivation

HIV transmission is not governed only by biological processes. It is also affected by awareness, safer behaviour, testing, treatment initiation, and adherence. These effects are important in Rwanda and in many public-health settings. The motivation of this work is to use a mathematical model that can represent both disease dynamics and behaviour-related interventions.

## 3. Problem Statement

Classical models often use ordinary derivatives, so the future state depends mainly on the current state. However, HIV-related behaviour can have memory: past awareness campaigns, testing habits, adherence history, and stigma reduction can influence present outcomes. The problem is to formulate and simulate a model that includes this memory effect together with social behaviour interventions.

## 4. Literature Review and Research Gap

The report contains a full literature review and mathematical preliminaries chapter. In the defense, I summarize only the research gap. Classical HIV models commonly use ordinary differential equations and treatment compartments such as SICA/SITA. Previous studies show that social behaviour, testing, safer sexual practices, stigma, and adherence influence HIV transmission. Fractional-order epidemic models use Caputo derivatives to capture memory and hereditary effects. The research gap is that existing work does not commonly combine fractional HIV dynamics, social behaviour intervention functions, and an interactive simulation dashboard in one framework.

## 5. Objectives

The report has three objectives:

1. Formulate a fractional-order SITA HIV model using the Caputo derivative and social behaviour interventions.
2. Analyse positivity, boundedness, disease-free equilibrium, R0, and fractional stability.
3. Implement simulations and a Python dashboard to study memory effects, interventions, sensitivity, and epidemic trajectories.

## 6. Model Diagram: SITA

The model divides the population into four compartments: susceptible S, infected I, treated T, and AIDS-stage A. Susceptible individuals become infected through intervention-adjusted transmission. Infected individuals may enter treatment through testing and treatment-seeking. Infected and treated individuals may progress to AIDS, but adherence reduces progression from treatment to AIDS.

## 7. Fractional-Order Model

The model uses the Caputo derivative of order q. When q equals 1, the system becomes an ordinary differential equation model. When q is less than 1, the system includes memory of previous states. The controls u1, u2, u3, and u4 modify transmission, treatment uptake, and AIDS progression.

## 8. Numerical Scheme + Implementation

The system is solved using an Adams-Bashforth-Moulton predictor-corrector scheme for fractional differential equations. The Python engine receives initial conditions, model parameters, fractional order, and intervention controls. It returns trajectories, R0, final summaries, scenario comparisons, memory results, and sensitivity values.

## 9. Baseline Simulation Result

This slide shows the baseline trajectory from the model. I explain the movement of S, I, T, and A over time, then connect the graph to the final summary values: peak infected, final infected, final treated, final AIDS-stage population, and total population.

## 10. Simulation Results: Intervention Comparison

The intervention comparison shows that combined interventions perform better than isolated interventions. Awareness and safer behaviour reduce effective transmission, testing improves movement into treatment, and adherence reduces progression toward AIDS. The model supports the idea that combined behavioural and treatment-support interventions are stronger than a single control.

## 11. Simulation Results: Fractional Memory

This slide compares different values of q. The case q = 1 is the ordinary model. Values below 1 represent fractional memory. The main point is that changing q changes the trajectory, so memory is mathematically and computationally visible in the model.

## 12. Dashboard and Sensitivity Evidence

The dashboard is not separate from the thesis; it is the implementation of the model. Sensitivity analysis ranks parameters according to their influence on R0. In the defense, I can use this slide to say that the dashboard helps convert mathematical results into visual evidence.

## 13. Live Dashboard Demonstration

Before opening the dashboard, say:
"I will now briefly open the dashboard to show that the simulation is generated from the Python model, not manually drawn graphs."

Demo route:

1. Open the dashboard.
2. Use Fast demo mode if the computer is slow.
3. Click Run Simulation.
4. On Baseline, show the SITA time-series graph and R0 card.
5. Click the graph Run animation button if it is visible.
6. Open Sensitivity or Scenarios, show one comparison only.
7. Return to the presentation for conclusion.

Do not open every tab. The goal is to prove the tool works, not to tour the whole system.

## 14. Conclusion + Recommendations

Conclude with three points:

1. A fractional-order SITA model was formulated using the Caputo derivative.
2. The main analytical properties were studied: positivity, boundedness, disease-free equilibrium, R0, and fractional stability.
3. A Python dashboard was implemented to simulate intervention scenarios, memory effects, sensitivity, and epidemic trajectories.

Recommendations:
Future work should calibrate the model with Rwanda-specific HIV data, improve parameter estimation, and extend the dashboard into an educational decision-support tool.

## Short Answers for Likely Questions

Why fractional order?
Because q less than 1 introduces memory, which is useful when past behaviour and intervention history influence current HIV dynamics.

Why Caputo derivative?
The Caputo derivative allows classical initial conditions, making it suitable for compartmental population models.

What does R0 mean?
R0 is the threshold number. If R0 is less than 1, the disease-free equilibrium is expected to be stable; if R0 is greater than 1, infection can persist.

What are u1 to u4?
u1 is awareness, u2 is safer behaviour, u3 is testing and treatment-seeking, and u4 is adherence support.

Is the dashboard a clinical prediction tool?
No. It is an academic simulation and visualization tool. The parameters should be calibrated with real data before policy or clinical use.
