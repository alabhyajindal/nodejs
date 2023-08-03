if (!geojson) {
  alert('This username does not exist')
  throw new Error()
}

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
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
  updatePlacesList()
})

const editButton = document.getElementById('edit')
const doneButton = document.getElementById('done')
const modal = document.querySelector('.modal')
const input = document.getElementById('input')
const suggestionsDiv = document.getElementById('suggestions-container')
editButton.addEventListener('click', (e) => toggleModal(e))
doneButton.addEventListener('click', (e) => toggleModal(e))
input.addEventListener('keydown', (e) => inputHandler(e))

function toggleModal() {
  modal.classList.toggle('hidden')
  editButton.classList.toggle('hidden')
  console.log(geojson)
}

async function inputHandler(e) {
  if (e.key === 'Enter') {
    suggestionsDiv.innerHTML = ''
    const query = e.target.value
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?types=place&language=en&access_token=${mapboxgl.accessToken}`
    )
    const body = await res.json()
    const suggestions = body.features
    const div = document.createElement('div')

    for (let i = 0; i < suggestions.length; i++) {
      const p = document.createElement('p')
      p.classList.add('suggestion')
      p.textContent = suggestions[i].place_name_en
      div.appendChild(p)
    }
    suggestionsDiv.appendChild(div)
    const suggestionElements = document.querySelectorAll('.suggestion')

    suggestionElements.forEach((element) =>
      element.addEventListener('click', (e) => {
        const selectedSuggestion = suggestions.find((s) => {
          return s.place_name_en === e.target.innerText
        })
        const coordinates = selectedSuggestion.geometry.coordinates
        geojson.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates,
          },
        })
        input.value = ''
        suggestionsDiv.innerHTML = ''
        drawPoints()
        drawLines(true)
        updatePlacesList()
        map.flyTo({
          center: [coordinates[0], coordinates[1]],
          essential: true,
        })
      })
    )
  }
}

async function updatePlacesList() {
  const placesDiv = document.getElementById('places')
  placesDiv.innerHTML = '...'
  const div = document.createElement('div')
  for (let i = 0; i < geojson.features.length; i++) {
    const p = document.createElement('p')
    const coordinate = geojson.features[i].geometry.coordinates
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinate[0]},${coordinate[1]}.json?types=place&language=en&access_token=${mapboxgl.accessToken}`
    )
    const body = await res.json()
    const placeName = body.features[0].place_name_en

    p.textContent = placeName
    div.appendChild(p)
  }
  placesDiv.innerHTML = ''
  placesDiv.appendChild(div)
}
