// Get current date
const date = new Date();

let day = date.getDate();
let month = date.getMonth() + 1;
let year = date.getFullYear();
let currentDate = `${year}/${('0' + month).slice(-2)}/${('0' + day).slice(-2)}`;

// Initialize the map
const map = L.map('map', {
  preferCanvas: true,
  zoomControl: false, // Recommended when loading large layers.
}).setView([55, -3], 6);

// Tile layers
const Stadia_StamenTerrain = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.{ext}', {
  minZoom: 0,
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ext: 'png',
});

const Stadia_OSMBright = L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.{ext}', {
  minZoom: 0,
  maxZoom: 20,
  attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ext: 'png',
});

const Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
});

const Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
});

// Default map layer
Stadia_StamenTerrain.addTo(map);

// Dictionary to keep track of added KML layers
const kmlLayers = {};

// Base maps
const baseMaps = {
  "OSM": Stadia_OSMBright,
  "Terrain": Stadia_StamenTerrain,
  "World": Esri_WorldStreetMap,
  "Satellite": Esri_WorldImagery,
};

// Function to add KML layer to map
function addKMLLayerToMap(kml_file, layerName, active = false) {
  fetch(kml_file)
    .then(res => res.text())
    .then(kmltext => {
      const parser = new DOMParser();
      const kml = parser.parseFromString(kmltext, 'text/xml');
      const track = new L.KML(kml);
      kmlLayers[layerName] = track;

      if (layerName == "UAS") {
        L.control.layers(baseMaps, kmlLayers).addTo(map);
      }

      if (active) {
        track.addTo(map);
      }
    });
}

// Add airspace KML's with specific layers active by default
addKMLLayerToMap("airspace/ATZ.kml", "ATZ", true);
addKMLLayerToMap("airspace/CTR.kml", "CTR");
addKMLLayerToMap("airspace/DANGER.kml", "DANGER", true);
addKMLLayerToMap("airspace/MATZ.kml", "MATZ", true);
addKMLLayerToMap("airspace/PROHIBITED.kml", "PROHIBITED", true);
addKMLLayerToMap("airspace/RESTRICTED.kml", "RESTRICTED", true);
addKMLLayerToMap("airspace/RMZ.kml", "RMZ", true);
addKMLLayerToMap("airspace/TMA.kml", "TMA");
addKMLLayerToMap("airspace/TMZ.kml", "TMZ", true);
addKMLLayerToMap("airspace/WAVE.kml", "WAVE");
addKMLLayerToMap("airspace/UAS.kml", "UAS");

// Waypoints
const waypoints = [];
const polyline = L.polyline([], { color: 'magenta' }).addTo(map);

map.on('click', function(event) {
  const lat = event.latlng.lat;
  const lng = event.latlng.lng;

  const name = prompt('Enter a name for this waypoint:');
  if (name === null || name.trim() === '') {
    return; // Do not add waypoint if name is empty
  }

  const waypointCircle = L.circle([lat, lng], {
    color: 'black',
    fillColor: 'magenta',
    fillOpacity: 1,
    radius: 150, // Adjust the circle radius as needed
  }).addTo(map);

  waypointCircle.bindPopup(name).openPopup();

  waypoints.push({
    marker: waypointCircle,
    lat: lat,
    lng: lng,
    name: name
  });

  polyline.addLatLng([lat, lng]);
  updateWaypointList();
});

function updateWaypointList() {
  const waypointList = document.getElementById('waypoint-list');
  waypointList.innerHTML = '';

  waypoints.forEach(function(waypoint, index) {
    const waypointItem = document.createElement('li');
    waypointItem.innerHTML = waypoint.name;

    const removeButton = document.createElement('button');
    removeButton.innerHTML = 'Remove';
    removeButton.onclick = function() {
      map.removeLayer(waypoint.marker);
      polyline.setLatLngs(polyline.getLatLngs().filter(function(latlng) {
        return latlng.lat !== waypoint.lat || latlng.lng !== waypoint.lng;
      }));
      waypoints.splice(index, 1);
      updateWaypointList();
    };

    waypointItem.appendChild(removeButton);
    waypointList.appendChild(waypointItem);
  });
}

// Generate PLOG
const generatePlogBtn = document.getElementById('generate-plog-btn');
generatePlogBtn.addEventListener('click', generatePlog);

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

function calculateBearingAndDistance(lat1, lon1, lat2, lon2) {
  const φ1 = degreesToRadians(lat1);
  const φ2 = degreesToRadians(lat2);
  const Δλ = degreesToRadians(lon2 - lon1);

  let y = Math.sin(Δλ) * Math.cos(φ2);
  let x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let brng = radiansToDegrees(Math.atan2(y, x));
  if (brng < 0) {
    brng = 360 + brng;
  }

  const R = 3443.92; // Earth's radius in nautical miles
  const Δσ = Math.acos(Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ));
  const distance = R * Δσ;

  return {
    bearing: brng,
    distance: distance
  };
}

function calculateWindCorrectionAngle(windSpeed, windDirRad, courseRad, airspeed) {
  var windCorrectionAngleRad = Math.asin(windSpeed * Math.sin(windDirRad - courseRad) / airspeed);
  var windCorrectionAngleDeg = (windCorrectionAngleRad * 180) / Math.PI;
  return windCorrectionAngleDeg
}

function calculateGroundSpeed(windSpeed, windDirRad, courseRad, airspeed) {  
  var groundSpeed = Math.round(airspeed * Math.sqrt(1 - Math.pow((windSpeed/airspeed) * Math.sin(windDirRad - courseRad), 2)) - (windSpeed * Math.cos(windDirRad - courseRad)));
  return groundSpeed;
}

function generatePlog() {
  console.log(waypoints);

  const xhr = new XMLHttpRequest();
  const pdfUrl = 'PLOG3-ildf.pdf';
  xhr.open('GET', pdfUrl, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function() {
    if (xhr.status === 200) {
      const pdf_buf = xhr.response;
      console.log('PDF loaded successfully:', pdf_buf);

      const results = [];
      let distance = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        results.push(calculateBearingAndDistance(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng));
        distance = distance + results[i].distance;
      }

      var altitude = +document.getElementById("altitude").value;
      var tas = +document.getElementById("tas").value;
      var windSpeed;
      var windDir;
      if (altitude <= 1000) {
        windSpeed = +document.getElementById("wind-speed-1000").value;
        windDir = +document.getElementById("wind-direction-1000").value;
      }
      else if (altitude < 2000) {
        var differenceSpeed = +document.getElementById("wind-speed-2000").value - +document.getElementById("wind-speed-1000").value;
        var differenceDir = +document.getElementById("wind-direction-2000").value - +document.getElementById("wind-direction-1000").value;
        var scaler = (altitude - 1000) / 1000;  
        windSpeed = (+document.getElementById("wind-speed-1000").value + (differenceSpeed * scaler));
        windDir = (+document.getElementById("wind-direction-1000").value + (differenceDir * scaler));
      }
      else if (altitude < 5000) {
        var differenceSpeed = +document.getElementById("wind-speed-5000").value - +document.getElementById("wind-speed-2000").value;
        var differenceDir = +document.getElementById("wind-direction-5000").value - +document.getElementById("wind-direction-2000").value;
        var scaler = (altitude - 2000) / 3000;
        windSpeed = (+document.getElementById("wind-speed-2000").value + (differenceSpeed * scaler));
        windDir = (+document.getElementById("wind-direction-2000").value + (differenceDir * scaler)); 
      }
      else {
        windSpeed = +document.getElementById("wind-speed-5000").value;
        windDir = +document.getElementById("wind-direction-5000").value;
      }

      const fields = {
        'VFR PLOG': waypoints[1] ? ["  " + waypoints[0].name + " to " + waypoints[waypoints.length - 1].name] : [],
        'from': waypoints[0] ? [waypoints[0].name] : [],
        'to': waypoints[0] ? [waypoints[waypoints.length - 1].name] : [],
        'distance': [distance.toFixed(0) + " NM"],
        'aircraft': [document.getElementById("registration").value],
        'date': [currentDate],
        'wind_5000_dir': [document.getElementById("wind-direction-5000").value],
        'wind_2000_dir': [document.getElementById("wind-direction-2000").value],
        'wind_1000_dir': [document.getElementById("wind-direction-1000").value],
        'wind_5000_kt': [document.getElementById("wind-speed-5000").value],
        'wind_2000_kt': [document.getElementById("wind-speed-2000").value],
        'wind_1000_kt': [document.getElementById("wind-speed-1000").value],
        'Fuel Plan': [document.getElementById("fuel-burn").value],
        'tas': [tas],
        'Station': ["Tain"],
        'Facility': ["DACS"],
        'Frequency': ["122.750"],
        'Station1': ["Lossie"],
        'Facility1': ["LARS"],
        'Frequency1': ["119.575"],
        'Station111': ["Scottish"],
        'Facility111': ["Info"],
        'Frequency111': ["134.850"],
        'Station11': ["Wick"],
        'Facility11': ["Approach/Tower"],
        'Frequency110': ["119.705"],
        'Station13': ["Wick"],
        'Facility13': ["ATIS"],
        'Frequency12': ["113.6"],
        'Station14': ["Kirkwall"],
        'Facility14': ["Approach/Tower"],
        'Frequency13': ["118.305"],
        'Station1111': ["Kirkwall"],
        'Facility12': ["ATIS"],
        'Frequency11': ["108.6"],
        'wind_dir0': waypoints[1] ? [windDir.toFixed(0)] : [],
        'wind_kt0': waypoints[1] ? [windSpeed.toFixed(0)] : [],
        'wind_dir01': waypoints[2] ? [windDir.toFixed(0)] : [],
        'wind_kt01': waypoints[2] ? [windSpeed.toFixed(0)] : [],
        'wind_dir011': waypoints[3] ? [windDir.toFixed(0)] : [],
        'wind_kt012': waypoints[3] ? [windSpeed.toFixed(0)] : [],
        'wind_dir02': waypoints[4] ? [windDir.toFixed(0)] : [],
        'wind_kt011': waypoints[4] ? [windSpeed.toFixed(0)] : [],
        'wind_dir04': waypoints[5] ? [windDir.toFixed(0)] : [],
        'wind_kt': waypoints[5] ? [windSpeed.toFixed(0)] : [],
        'wind_dir': waypoints[6] ? [windDir.toFixed(0)] : [],
        'wind_kt1': waypoints[6] ? [windSpeed.toFixed(0)] : [],
        'wind_dir03': waypoints[7] ? [windDir.toFixed(0)] : [],
        'wind_kt2': waypoints[7] ? [windSpeed.toFixed(0)] : [],
        'dir0': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(0), +tas).toFixed(0)],
        'kt0': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(0), +tas).toFixed(0)],
        'di': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(45), +tas).toFixed(0)],
        'kt01': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(45), +tas).toFixed(0)],
        'dir01': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(90), +tas).toFixed(0)],
        'kt02': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(90), +tas).toFixed(0)],
        'dir011': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(135), +tas).toFixed(0)],
        'kt03': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(135), +tas).toFixed(0)],
        'dir02': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(180), +tas).toFixed(0)],
        'kt04': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(180), +tas).toFixed(0)],
        'dir03': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(225), +tas).toFixed(0)],
        'kt011': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(225), +tas).toFixed(0)],
        'dir': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(270), +tas).toFixed(0)],
        'kt021': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(270), +tas).toFixed(0)],
        'dir1': [+calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(315), +tas).toFixed(0)],
        'kt': [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(315), +tas).toFixed(0)],
      };

      fields['Track T'] = [results[0].bearing.toFixed(0)];
      fields['Dist nm'] = [parseFloat(results[0].distance.toPrecision(2))];
      fields['Hdg T'] = [+results[0].bearing.toFixed(0) + +calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(+results[0].bearing.toFixed(0)), +tas).toFixed(0)];
      fields['GS kt'] = [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(+results[0].bearing.toFixed(0)), +tas).toFixed(0)];

      var time = 0;
      for (let i = 1; i < 8; i++) {
        if (waypoints[i]) {
          fields['ToRow' + i] = [waypoints[i].name];
          fields['Plan AltRow' + i] = [altitude];
          fields['Track T_' + i] = [results[i - 1].bearing.toFixed(0)];
          fields['Dist nm_' + i] = [parseFloat(results[i - 1].distance.toPrecision(2))];
          fields['Hdg T_' + i] = [+results[i - 1].bearing.toFixed(0) + +calculateWindCorrectionAngle(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(+results[i - 1].bearing.toFixed(0)), +tas).toFixed(0)];
          fields['GS kt_' + i] = [+calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(+results[i - 1].bearing.toFixed(0)), +tas).toFixed(0)];
          fields['Hdg MRow' + i] = [+fields['Hdg T_' + i] + 2];
          fields['TimeRow' + i] = [((+parseFloat(results[i - 1].distance.toPrecision(2)) / +calculateGroundSpeed(+windSpeed, +degreesToRadians(+windDir), +degreesToRadians(+results[i - 1].bearing.toFixed(0)), +tas).toFixed(0)) * 60).toFixed(0)];
          time = +time + +fields['TimeRow' + i]
        }
      }

      fields['Taxi'] = [15];
      fields['Taxi1'] = [(15/60 * +document.getElementById("fuel-burn").value).toFixed(1)];
      fields['Trip'] = [time.toFixed(0)];
      fields['Trip1'] = [(time/60 * +document.getElementById("fuel-burn").value).toFixed(1)];
      fields['Contingency'] = [(+fields['Trip'] * 0.05).toFixed(1)];
      fields['Contingency1'] = [(+fields['Trip1'] * 0.05).toFixed(1)];
      fields['Alternate'] = [30];
      fields['Alternate1'] = [(30/60 * +document.getElementById("fuel-burn").value).toFixed(1)];
      fields['Final Reserve'] = [30];
      fields['Final Reserve1'] = [(30/60 * +document.getElementById("fuel-burn").value).toFixed(1)];   
      fields['Extra'] = [0];
      fields['Extra1'] = [0];
      fields['Total Required'] = [(+fields['Taxi'] + +fields['Trip'] + +fields['Contingency'] + +fields['Alternate'] + +fields['Final Reserve'] + +fields['Extra']).toFixed(1)];
      fields['required'] = [(+fields['Taxi1'] + +fields['Trip1'] + +fields['Contingency1'] + +fields['Alternate1'] + +fields['Final Reserve1'] + +fields['Extra1']).toFixed(1) + " Litres"];
      fields['Total Required1'] = [(+fields['Taxi1'] + +fields['Trip1'] + +fields['Contingency1'] + +fields['Alternate1'] + +fields['Final Reserve1'] + +fields['Extra1']).toFixed(1)];



      const out_buf = pdfform().transform(pdf_buf, fields);

      const pdfBlob = new Blob([out_buf], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const newTab = window.open(pdfUrl, '_blank');

      newTab.addEventListener('unload', function() {
        URL.revokeObjectURL(pdfUrl);
      });
    } else {
      console.error('Error loading PDF:', xhr.statusText);
    }
  };

  xhr.onprogress = function(event) {};
  xhr.onerror = function() {
    console.error('Request error while loading PDF.');
  };
  xhr.send();
}
