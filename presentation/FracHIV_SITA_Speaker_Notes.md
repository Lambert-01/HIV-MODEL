# FracHIV-SITA Presentation Speaker Notes

## 1. Title
Good morning. My name is NDACYAYISABA Lambert. My project is a fractional-order HIV SITA dashboard with social behaviour interventions. The special part of my work is that the mathematical model is implemented in a live dashboard, so I can show the simulation moving instead of only presenting static equations.

## 2. Background / Motivation
HIV transmission is affected by biomedical factors and also by social behaviour such as awareness, safer sexual behaviour, testing, treatment-seeking, stigma, and adherence. In Rwanda, important progress has been made in HIV prevention and treatment, but continued prevention and adherence support remain relevant. This motivates a model that can represent behaviour and memory.

## 3. Problem Statement
Many ordinary models depend mainly on the current state of the system. But HIV-related behaviour may have memory: past awareness, treatment history, and adherence patterns can still affect current dynamics. Also, many mathematical projects stop at formulas. My project connects the formula, numerical method, and dashboard implementation.

## 4. Objectives
The main objective is to formulate, analyse, and simulate a fractional-order SITA HIV model with social behaviour interventions. The specific objectives are model formulation, threshold analysis, stability-related properties, numerical simulation, scenario comparison, memory comparison, and sensitivity analysis.

## 5. Model Diagram: SITA
The population is divided into susceptible, infected, treated, and AIDS-stage classes. Susceptible individuals may become infected through effective transmission. Infected individuals may enter treatment through testing and treatment-seeking. Infected and treated individuals may progress to AIDS, but adherence intervention reduces progression from treatment to AIDS.

## 6. Fractional-Order Model
The model uses the Caputo derivative of order q. When q equals 1, the model becomes the ordinary differential equation model. When q is less than 1, the model includes memory. The intervention parameters change the effective transmission rate, treatment uptake, and AIDS progression rate.

## 7. Numerical Scheme + Dashboard
The equations are solved using an Adams-Bashforth-Moulton type predictor-corrector method for fractional differential equations. The dashboard allows the user to change parameters and interventions, run simulations, see R0, compare scenarios, test memory effects, perform sensitivity analysis, and export tables or figures.

## 8. Simulation Results
The results show that combined interventions give stronger control than isolated interventions. The memory comparison shows that changing q changes the trajectories, especially infected, treated, and AIDS-stage populations. This supports the idea that fractional memory has visible mathematical and epidemiological meaning.

## 9. Live Demo Plan
For the live demo, I will open https://hiv-model.onrender.com/. I will first show the moving SITA trajectories. Then I will compare no intervention with combined intervention. After that I will compare q=1 with q<1 to show the memory effect. Finally I will show scenario comparison and sensitivity tabs to demonstrate that the dashboard supports the results chapter.

## 10. Conclusion + Recommendations
This project developed a fractional-order SITA HIV model with social behaviour interventions and implemented it as a live dashboard. The main recommendation is to continue combining prevention and treatment-support strategies. Future work can calibrate parameters using Rwanda-specific data and extend the dashboard with uncertainty analysis.
