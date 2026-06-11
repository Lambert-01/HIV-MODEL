# FracHIV-SITA Presentation Speaker Notes

## 1. Title
Good morning. My name is NDACYAYISABA Lambert. My project is a fractional-order HIV SITA model with social behaviour interventions and simulation-based analysis. The work connects mathematical modelling, fractional memory, intervention scenarios, and a live simulator for demonstration.

## 2. Background / Motivation
HIV transmission is influenced by biomedical factors and by social behaviour such as awareness, safer behaviour, testing, treatment-seeking, stigma, and adherence. In Rwanda, progress in HIV prevention and treatment motivates continued study of intervention strategies. This project uses mathematics to compare how these factors can influence long-term dynamics.

## 3. Problem Statement
Ordinary models often depend only on the current state. However, HIV-related behaviour can have memory: previous awareness campaigns, testing habits, stigma reduction, and adherence history may still influence present behaviour. The problem is to include this memory and social behaviour in one model that can be simulated clearly.

## 4. Objectives
The main objective is to formulate, analyse, and simulate a fractional-order SITA HIV transmission model with social behaviour interventions. The specific objectives are model formulation, threshold analysis, core mathematical properties, numerical implementation, scenario comparison, memory comparison, and sensitivity interpretation.

## 5. Model Diagram: SITA
The population is divided into susceptible, infected, treated, and AIDS-stage classes. Susceptible individuals can become infected through effective transmission. Infected individuals can enter treatment through testing and treatment-seeking. Infected and treated individuals can progress to AIDS, but adherence intervention reduces progression from treatment to AIDS.

## 6. Fractional-Order Model
The model uses the Caputo derivative of order q. When q equals 1, the model becomes an ordinary differential equation model. When q is less than 1, the model includes memory. The intervention parameters modify transmission, treatment uptake, and progression rates.

## 7. Numerical Scheme + Implementation
The equations are solved using an Adams-Bashforth-Moulton type predictor-corrector method. The numerical engine takes parameters, initial conditions, fractional order, and controls as input, then produces trajectories, R0, intervention comparisons, memory results, and sensitivity rankings.

## 8. Simulation Results: Intervention Comparison
The intervention results show that combined interventions give stronger control than isolated interventions. This is because HIV control is not only about one factor. Awareness, safer behaviour, testing, treatment access, and adherence support work better when applied together.

## 9. Simulation Results: Fractional Memory
The memory comparison shows that changing q changes the trajectories. The ordinary case is q equals 1, while values below 1 represent fractional memory. This supports the main mathematical contribution: fractional calculus changes the simulated dynamics, so it is not just decoration.

## 10. Live Demo, Conclusion + Recommendations
For the live demo, I will open the deployed simulator, run the moving SITA graph, compare no intervention with combined intervention, and compare q equals 1 with q less than 1. The conclusion is that the project combines fractional modelling, social behaviour interventions, numerical simulation, and a working tool for communicating HIV dynamics. Future work should calibrate parameters using Rwanda-specific data.
