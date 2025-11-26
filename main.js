// Landsat 9: Median NDVI & LST (2025-04-01 to 2025-11-01)

// User parameters
var startDate = '2025-04-01';
var endDate   = '2025-11-01';
var aoi = ee.Geometry.Polygon(
        [[[50.76773280566376, 36.43435043635281],
          [50.76773280566376, 35.245424719861525],
          [52.20419520800751, 35.245424719861525],
          [52.20419520800751, 36.43435043635281]]]);
Map.addLayer(aoi);

var exportScale = 30;
var exportCrs   = 'EPSG:4326';
var folderName  = 'GEE_Exports';

// Cloud/shadow mask (Landsat C2 L2)
function maskL9Collection2SR(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
               .and(qa.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(mask);
}

// NDVI
function addNDVI(image) {
  var ndvi = image.select('SR_B5').subtract(image.select('SR_B4'))
                  .divide(image.select('SR_B5').add(image.select('SR_B4')))
                  .rename('NDVI');
  return image.addBands(ndvi);
}

// LST (emissivity-based)
function addLST(image) {
  var img = image.bandNames().contains('NDVI') ? image : addNDVI(image);

  var BT_K = img.select('ST_B10').multiply(0.00341802).add(149.0).rename('BT_K');

  var ndvi = img.select('NDVI');
  var Pv = ndvi.subtract(0.2).divide(0.5 - 0.2).clamp(0,1).pow(2).rename('Pv');
  var emissivity = Pv.multiply(0.004).add(0.986).rename('emissivity');

  var lambda = 10.895e-6;
  var rho = 1.438e-2;

  var lst = BT_K.divide(
    ee.Image(1).add(lambda * BT_K.divide(rho).multiply(emissivity.log()))
  ).rename('LST_K');

  var lstC = lst.subtract(273.15).rename('LST_C');
  return img.addBands([BT_K, emissivity, lst, lstC]);
}

// Load Landsat 9 collection
var collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterDate(startDate, endDate)
  .filterBounds(aoi)
  .filter(ee.Filter.lt('CLOUD_COVER', 50))
  .map(maskL9Collection2SR)
  .map(addNDVI)
  .map(addLST);

print('Collection size:', collection.size());
print('Sample image:', collection.first());

// Median composite
var medianImage = collection.median()
  .select(['NDVI','LST_C','LST_K','emissivity','BT_K']);

Map.centerObject(aoi, 10);
Map.addLayer(medianImage.select('NDVI'), {min:-0.2, max:0.8}, 'NDVI (median)');
Map.addLayer(medianImage.select('LST_C'), {min:-10, max:40}, 'LST (median °C)');

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

// Optional LST extras
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

// Correlation NDVI–LST
var samples = medianImage.select(['NDVI','LST_C']).sample({
  region: aoi,
  scale: exportScale,
  numPixels: 8000,
  geometries: false
});

var corr = samples.reduceColumns({
  reducer: ee.Reducer.pearsonsCorrelation(),
  selectors: ['NDVI', 'LST_C']
});
print('Correlation (NDVI vs LST):', corr);

// Scatter plot
var chart = ui.Chart.feature.byFeature(samples, 'NDVI', ['LST_C'])
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Median NDVI vs Median LST (°C)',
    hAxis: {title: 'NDVI'},
    vAxis: {title: 'LST (°C)'},
    pointSize: 2,
    trendlines: {0:{type:'linear', color:'red', lineWidth:2}}
  });
print(chart);
