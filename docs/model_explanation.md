# Model Explanation

## Fractional-Order SITA Model

The model divides the population into susceptible S, infected untreated I, treated T, and AIDS-stage A compartments.

The fractional order q controls memory. When q equals 1, the model behaves like an ordinary differential equation model. When q is below 1, past states influence the current trajectory.

The intervention controls are u1 awareness, u2 safer behaviour, u3 testing and treatment-seeking, and u4 treatment adherence.

## Mathematical Foundation

### Gamma Function
The Gamma function appears in the definition of fractional integrals and derivatives:
$$\Gamma(z) = \int_0^\infty x^{z-1}e^{-x}\,dx, \quad z>0$$

### Mittag-Leffler Function
The one-parameter Mittag-Leffler function generalises the exponential function:
$$E_q(z) = \sum_{k=0}^{\infty}\frac{z^k}{\Gamma(qk+1)}, \quad q>0$$

When q=1, $E_1(z) = e^z$, recovering the ordinary model.

### Basic Reproduction Number
With social interventions, the effective reproduction number is:
$$\Rzero = \frac{\beta_0(1-u_1)(1-u_2)}{\tau(1+u_3)+\delta+\mu}\left(1+\frac{\eta\tau(1+u_3)}{\rho(1-u_4)+\mu}\right)$$

### Fractional Stability Criterion
For the disease-free equilibrium to be stable:
$$|\arg(\lambda_i)| > \frac{q\pi}{2}$$
for all eigenvalues $\lambda_i$ of the Jacobian.

## Numerical Method

The Adams-Bashforth-Moulton predictor-corrector method is used with O(h²) accuracy:

**Predictor (Adams-Bashforth):**
$$y_{n+1}^P = y_0 + \frac{h^q}{\Gamma(q+1)}\sum_{j=0}^{n}b_{j,n+1}f(t_j,y_j)$$

**Corrector (Adams-Moulton):**
$$y_{n+1} = y_0 + \frac{h^q}{\Gamma(q+2)}\left[f(t_{n+1},y_{n+1}^P)+\sum_{j=0}^{n}a_{j,n+1}f(t_j,y_j)\right]$$