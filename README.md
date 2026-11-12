# The Quantum Box

A dependency-free interactive model of an electron in a one-dimensional infinite square well. The page is credited to Shubh Gupta.

## Run it

From this directory, run `python3 -m http.server 8000`, then open `http://localhost:8000` in a browser. The model uses plain HTML, CSS, and JavaScript—no build step or package installation is needed.

## Explore

Use the **Quantum state** slider to choose `n = 1…5` and the **Box width** slider to change `L` from 0.50 to 2.00 nm. The wavefunction and probability density, quantized energy in eV, and energy-level ladder update as the controls move. **Measure the particle** draws an `x` position from the displayed probability distribution `|ψₙ(x)|²` and marks the result in the box and on both plots.

## Physics

For an infinite well from `x = 0` to `x = L`, the normalized stationary states are

`ψₙ(x) = √(2/L) sin(nπx/L)`

and

`|ψₙ(x)|² = (2/L) sin²(nπx/L)`.

The allowed energies are `Eₙ = n²h²/(8mL²)`, where `h` is Planck’s constant and `m` is the particle mass. Energies are calculated for an electron and converted to electronvolts. State `n` has `n − 1` interior nodes, and the density integrates to 1 over the box. Position measurement uses rejection sampling with the equivalent normalized sampling weight `sin²(nπx/L)`.

## Files

- `index.html` — page content, model panels, equations, and accessibility labels.
- `styles.css` — responsive scientific-notebook visual design.
- `app.js` — state, physics calculations, accessible controls, canvas plots, and measurement sampling.
- `manus-routes.json` — declared website route.
- `favicon.svg` — custom wave-in-a-box icon.
