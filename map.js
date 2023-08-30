var map = L.map('map', {
    preferCanvas: true, zoomControl: false // recommended when loading large layers.
});
map.setView(new L.LatLng(55, -3), 6);

var Stadia_StamenTerrain = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 0,
	maxZoom: 18,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'png'
});


var Stadia_OSMBright = L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 0,
	maxZoom: 20,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'png'
});
Stadia_OSMBright.addTo(map);
 
var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
});


var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// Dictionary to keep track of added KML layers
const kmlLayers = {};

var baseMaps = {
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
        // Create new KML overlay
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmltext, 'text/xml');
        const track = new L.KML(kml);
        kmlLayers[layerName] = track; // Store the layer

        if (layerName == "UAS") {
            L.control.layers(baseMaps, kmlLayers).addTo(map); // Update layer control
        }

        if (active) {
            track.addTo(map); // Add the layer to the map if active
        }
    });
}

// Add airspace KML's with specific layers active
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


// waypoints
var waypoints = [];
var polyline = L.polyline([], { color: 'magenta' }).addTo(map);

map.on('click', function(event) {
  var lat = event.latlng.lat;
  var lng = event.latlng.lng;

  var name = prompt('Enter a name for this waypoint:');
  if (name === null || name.trim() === '') {
    return; // Do not add waypoint if name is empty
  }

  var waypointCircle = L.circle([lat, lng], {
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
  var waypointList = document.getElementById('waypoint-list');
  waypointList.innerHTML = '';

  waypoints.forEach(function(waypoint, index) {
    var waypointItem = document.createElement('li');
    waypointItem.innerHTML = waypoint.name;

    var removeButton = document.createElement('button');
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




//// PLOG ////
// Add event listener to the "Generate Plog" button
const generatePlogBtn = document.getElementById('generate-plog-btn');
generatePlogBtn.addEventListener('click', generatePlog);

// Function to generate the Plog
function generatePlog() {
  console.log(waypoints);

  var xhr = new XMLHttpRequest();
var pdfUrl = 'PLOG3.pdf';
xhr.open('GET', pdfUrl, true);
xhr.responseType = 'arraybuffer';
xhr.onload = function () {
  if (xhr.status === 200) {
    var pdf_buf = xhr.response; // Define pdf_buf here
    console.log('PDF loaded successfully:', pdf_buf);

    var fields = {
        'ToRow1': waypoints[0] ? [waypoints[0]["name"]] : [],
        'ToRow2': waypoints[1] ? [waypoints[1]["name"]] : [],
        'ToRow3': waypoints[2] ? [waypoints[2]["name"]] : [],
        'ToRow4': waypoints[3] ? [waypoints[3]["name"]] : [],
        'ToRow5': waypoints[4] ? [waypoints[4]["name"]] : [],
        'ToRow6': waypoints[5] ? [waypoints[5]["name"]] : [],
        'ToRow7': waypoints[6] ? [waypoints[6]["name"]] : [],
      };

    var out_buf = pdfform().transform(pdf_buf, fields);

    var pdfBlob = new Blob([out_buf], { type: 'application/pdf' });
    var pdfUrl = URL.createObjectURL(pdfBlob);

    var newTab = window.open(pdfUrl, '_blank');

    newTab.addEventListener('unload', function() {
      URL.revokeObjectURL(pdfUrl);
    });
  } else {
    console.error('Error loading PDF:', xhr.statusText);
  }
};  
xhr.onprogress = function (event) {
};
xhr.onerror = function () {
  console.error('Request error while loading PDF.');
};
xhr.send();

}

