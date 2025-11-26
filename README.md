# Landsat 9 – Seasonal Median NDVI & Land Surface Temperature (LST)  
**April – November 2025 | Google Earth Engine Script**

This self-contained Google Earth Engine (JavaScript) script generates high-quality, cloud-free seasonal composites from **Landsat 9 Collection 2 Level-2** data for the 2025 growing season (April 1 – November 1).

### What it produces:
- **Median NDVI** (vegetation greenness & health)
- **Median Land Surface Temperature** in °C (physically corrected LST)
- Auxiliary layers: LST in Kelvin, NDVI-derived emissivity, brightness temperature
- **Pixel-wise Pearson correlation** between median NDVI and median LST
- Interactive **scatter plot** (NDVI vs LST) with linear trendline directly in the Code Editor
- Automatic export of all products to Google Drive at 30 m resolution

### Key Features
- Robust cloud & cloud-shadow masking using QA_PIXEL bit flags (Collection 2)
- Accurate NDVI from surface reflectance bands (SR_B5 & SR_B4)
- Full LST retrieval from ST_B10 with:
  - Proper scaling (0.00341802 × ST_B10 + 149)
  - NDVI-based fractional vegetation (Pv) → emissivity (ε = 0.004×Pv + 0.986)
  - Planck correction for atmospheric & emissivity effects
- Median reducer composite (ideal for seasonal summaries and reducing outliers)
- Built-in statistical analysis and visualization (no external tools needed)

### Ideal for
- Urban heat island studies
- Vegetation–temperature relationship analysis
- Agricultural monitoring
- Climate & land-cover change research
- Teaching advanced remote sensing workflows

### How to Use
1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Paste the script (`L9_Median_NDVI_LST_2025.js`)
3. Draw or import your own Area of Interest (AOI) and replace the example polygon
4. Run → Maps appear instantly
5. Three GeoTIFFs automatically export to your Google Drive folder: `GEE_Exports`

### Output Files (Drive)
- `L9_median_NDVI_20250401_20251101.tif`
- `L9_median LST_C_20250401_20251101.tif`
- `L9_median_LST_extra_20250401_20251101.tif` (LST_K, emissivity, BT_K)

## Requirements
- Google Earth Engine account (free)
- Basic JavaScript knowledge
- A drawn or imported geometry as AOI

## Notes
- The example AOI covers part of Tehran, Iran — easily changeable
- Cloud cover filter (<50%) can be adjusted for stricter/looser quality
- Emissivity model is optimized for mixed urban–vegetated landscapes (works very well in semi-arid regions)

## Author
**Armin Nakhjiri**  
Remote Sensing Scientist & Educator  
✉️ Nakhjiri.Armin@gmail.com  

---

*Empowering the next generation of geospatial analysts — one script at a time.*
