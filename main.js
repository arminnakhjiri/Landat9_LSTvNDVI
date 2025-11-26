// Landsat 9: Median NDVI & LST (2025-04-01 to 2025-11-01)

// USER PARAMETERS
var startDate = '2025-04-01';
var endDate = '2025-11-01';
// Replace with your own geometry
var aoi = /* color: #d63000 */ee.Geometry.Polygon(
        [[[50.76773280566376, 36.43435043635281],
          [50.76773280566376, 35.245424719861525],
          [52.20419520800751, 35.245424719861525],
          [52.20419520800751, 36.43435043635281]]]);
Map.addLayer(aoi);

var exportScale = 30;
var exportCrs = 'EPSG:4326';
var folderName = 'GEE_Exports';

// Cloud & shadow mask (QA_PIXEL bits 3 & 4)
function maskL9Collection2SR(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
               .and(qa.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(mask);
}

// NDVI
function addNDVI(image) {
  var nir = image.select('SR_B5');
  var red = image.select('SR_B4');
  var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
  return image.addBands(ndvi);
}

// LST with NDVI-based emissivity
function addLST(image) {
  var img = image;
  if (!img.bandNames().contains('NDVI')) {
    img = addNDVI(img);
  }
  var BT_K = img.select('ST_B10').multiply(0.00341802).add(149.0).rename('BT_K');
  var ndvi = img.select('NDVI');
  var Pv = ndvi.subtract(0.2).divide(0.3).clamp(0,1).pow(2);
  var emissivity = Pv.multiply(0.004).add(0.986).rename('emissivity');
  var lambda = 10.895e-6;
  var rho = 1.438e-2;
  var lst = BT_K.divide( ee.Image(1).add(ee.Image(lambda).multiply(BT_K).divide(rho).multiply(emissivity.log())) )
                .rename('LST_K');
  var lstC = lst.subtract(273.15).rename('LST_C');
  return img.addBands(BT_K).addBands(emissivity).addBands(lst).addBands(lstC);
}

// Collection
var collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
                    .filterDate(startDate, endDate)
                    .filterBounds(aoi)
                    .filter(ee.Filter.lt('CLOUD_COVER', 50))
                    .map(maskL9Collection2SR)
                    .map(addNDVI)
                    .map(addLST);

print('Filtered collection size:', collection.size());

// Median composite
var medianImage = collection.median()
                  .select(['NDVI','LST_C','LST_K','emissivity','BT_K']);
Map.centerObject(aoi, 10);
Map.addLayer(medianImage.select('NDVI'), {min: -0.2, max: 0.8}, 'NDVI (median)');
Map.addLayer(medianImage.select('LST_C'), {min: -10, max: 40}, 'LST (median, °C)');

// Export NDVI
Export.image.toDrive({
  image: medianImage.select('NDVI'),
  description: 'L9_median_NDVI_20250401_20251101',
  folder: folderName,
  fileNamePrefix: 'L9_median_NDVI_20250401_20251101',
  region: aoi,
  scale: exportScale,
  crs: exportCrs,
  maxPixels: 1e13
});

// Export LST (°C)
Export.image.toDrive({
  image: medianImage.select('LST_C'),
  description: 'L9_median_LST_C_20250401_20251101',
  folder: folderName,
  fileNamePrefix: 'L9_median_LST_C_20250401_20251101',
  region: aoi,
  scale: exportScale,
  crs: exportCrs,
  maxPixels: 1e13
});

// Export extra layers
Export.image.toDrive({
  image: medianImage.select(['LST_K','emissivity','BT_K']),
  description: 'L9_median_LST_extra_20250401_20251101',
  folder: folderName,
  fileNamePrefix: 'L9_median_LST_extra_20250401_20251101',
  region: aoi,
  scale: exportScale,
  crs: exportCrs,
  maxPixels: 1e13
});

// Correlation & scatter
var stacked = medianImage.select(['NDVI','LST_C']);
var samples = stacked.sample({region: aoi, scale: exportScale, numPixels: 5000});
var corr = samples.reduceColumns({reducer: ee.Reducer.pearsonsCorrelation(), selectors: ['NDVI', 'LST_C']});
print('Correlation (NDVI vs LST):', corr);

var chart = ui.Chart.feature.byFeature(samples, 'NDVI', ['LST_C'])
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Median NDVI vs Median LST (°C)',
    hAxis: {title: 'NDVI'},
    vAxis: {title: 'LST (°C)'},
    pointSize: 2,
    trendlines: {0: {type: 'linear', color: 'red', lineWidth: 2, opacity: 0.8}}
  });
print(chart);
