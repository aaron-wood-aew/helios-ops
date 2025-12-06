# Helios.Ops User Guide: Scientific Data Points

This guide explains the key metrics displayed on the Helios.Ops dashboard and their operational significance.

## 1. Solar Imagery
### GOES-16 SUVI (Solar Ultraviolet Imager)
Visualizes the sun's atmosphere in extreme ultraviolet light.
- **131 Å (Teal)**: Hottest plasma (>10MK). Best for viewing **Solar Flares**.
- **171 Å (Gold)**: Quiet corona (1MK). Shows **Coronal Loops** and magnetic field lines.
- **195 Å (Green)**: Active regions (1.5MK). Good for spotting **Coronal Holes**.
- **284 Å (Yellow)**: Hot corona (2MK).
- **304 Å (Red)**: Chromosphere/Transition Region (50kK). Shows **Filaments** and **Prominences**.

### LASCO C2/C3 (Coronagraphs)
Blocks the sun's disk to see the faint outer atmosphere.
- **Significance**: The primary tool for detecting **Coronal Mass Ejections (CMEs)** heading towards Earth.

## 2. Physics Data
### X-Ray Flux (GOES)
- **Metric**: Irradiance in Watts/m².
- **Significance**: Measures **Solar Flares**.
- **Scale**: A, B, C, M (Minor), X (Major).
- **Impact**: X-Class flares cause immediate **Radio Blackouts** (R-Scale) on the sunlit side of Earth.

### Proton Flux (GOES)
- **Metric**: Particles per cm² sec sr.
- **Significance**: Measures **Solar Radiation Storms**.
- **Impact**: S-Scale (S1-S5). High proton levels endanger satellites, astronauts, and high-latitude aviation (polar routes).

### Electron Flux (GOES)
- **Metric**: Particles (Electrons >2MeV).
- **Significance**: Charging warnings.
- **Impact**: High electron flux causes **Deep Dielectric Charging** on satellites, potentially frying electronics.

### Solar Wind (DSCOVR)
Streaming plasma from the sun.
- **Speed**: Normal ~300-400 km/s. Fast >600 km/s.
- **Density**: Particles/cm³. High density often precedes CME impact.
- **Temperature**: Plasma temp in Kelvin.

### Interplanetary Magnetic Field (IMF)
The magnetic field carried by the solar wind.
- **Bt**: Total strength of the field.
- **Bz**: North/South direction (Important!).
- **Significance**: If **Bz is Negative (South)**, it connects with Earth's North-pointing field, allowing energy to pour in. This triggers **Geomagnetic Storms**.

### Geomagnetic Indices
- **Kp Index**: Global geomagnetic activity (0-9).
    - Kp >= 5: Minor Storm (G1).
    - Kp >= 9: Extreme Storm (G5).
    - **Impact**: Power grids, aurora visibility, spacecraft drag.
- **Dst Index**: Disturbance Storm Time (nT).
    - Measures ring current intensity.
    - Negative values indicate storm strength. (e.g., -50nT is moderate, -200nT is severe).

## 3. Aurora Forecast (OVATION)
- **Hemispheric Power (GW)**: Total energy deposition.
- **View Line**: The red line indicates where the aurora is likely visible on the horizon.
