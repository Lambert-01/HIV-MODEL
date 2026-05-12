# Equations

The dashboard follows the thesis SITA model with fractional derivatives:

## Fractional-Order SITA Model

$$\CaputoD{t}{q}S(t) = \Lambda - \lambda(t)S - \mu S$$

$$\CaputoD{t}{q}I(t) = \lambda(t)S - [\tau(1+u_3) + \delta + \mu]I$$

$$\CaputoD{t}{q}T(t) = \tau(1+u_3)I - [\rho(1-u_4) + \mu]T$$

$$\CaputoD{t}{q}A(t) = \delta I + \rho(1-u_4)T - (\mu + d)A$$

## Effective Transmission and Interventions

**Effective transmission rate:**
$$\beta_{\text{eff}}(t) = \beta_0(1-u_1(t))(1-u_2(t))$$

**Force of infection:**
$$\lambda(t) = \frac{\beta_{\text{eff}}(t)(I + \eta T)}{N}$$

**Effective treatment uptake:**
$$\tau_{\text{eff}}(t) = \tau(1+u_3(t))$$

**Effective treated-to-AIDS progression:**
$$\rho_{\text{eff}}(t) = \rho(1-u_4(t))$$

## Basic Reproduction Number

With interventions, the basic reproduction number is:

$$\Rzero = \frac{\beta_0(1-u_1)(1-u_2)}{\tau(1+u_3)+\delta+\mu}\left(1+\frac{\eta\tau(1+u_3)}{\rho(1-u_4)+\mu}\right)$$

## Disease-Free Equilibrium

At the disease-free equilibrium ($I=T=A=0$):
$$E_0 = \left(\frac{\Lambda}{\mu}, 0, 0, 0\right)$$

## Fractional Stability Criterion

The disease-free equilibrium is locally asymptotically stable if all eigenvalues $\lambda_i$ of the Jacobian satisfy:
$$|\arg(\lambda_i)| > \frac{q\pi}{2}$$

## Numerical Method: Adams-Bashforth-Moulton

For the Caputo fractional system $\CaputoD{t}{q}y(t) = f(t,y)$:

**Predictor:**
$$y_{n+1}^P = y_0 + \frac{h^q}{\Gamma(q+1)}\sum_{j=0}^{n}b_{j,n+1}f(t_j,y_j)$$

**Corrector:**
$$y_{n+1} = y_0 + \frac{h^q}{\Gamma(q+2)}\left[f(t_{n+1},y_{n+1}^P)+\sum_{j=0}^{n}a_{j,n+1}f(t_j,y_j)\right]$$