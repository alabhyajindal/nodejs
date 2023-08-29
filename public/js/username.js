mapboxgl.accessToken =
  'pk.eyJ1IjoiYWxhYmh5YWppbmRhbCIsImEiOiJjbGxkeWoxdzkwbW03M2NrYXRmemlxbnE5In0.ysZJru5vWNx536ceoWBX5g'

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: geojson.features[geojson.features.length - 1]?.geometry
    ?.coordinates || [14.421253, 50.087465],
  zoom: 3,
})

function drawPoints() {
  for (const [index, feature] of geojson.features.entries()) {
    const el = document.createElement('div')
    el.className = 'marker'
    if (index === geojson.features.length - 1) {
      el.classList.add('last-marker')
    }
    new mapboxgl.Marker(el).setLngLat(feature.geometry.coordinates).addTo(map)
  }
}

function drawLines(toUpdate = false) {
  const linePoints = geojson.features.map((point) => point.geometry.coordinates)
  const data = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: linePoints,
    },
  }
  if (toUpdate) {
    map.getSource('route').setData(data)
  } else {
    map.addSource('route', {
      type: 'geojson',
      data,
    })
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#2f9e44',
        'line-width': 2,
      },
    })
  }
}

map.on('load', () => {
  drawPoints()
  drawLines()
})
