const RM_CENTER = [-33.47, -70.67];
const map = L.map('map', { zoomControl: true, preferCanvas: true }).setView(RM_CENTER, 10);

const baseNormal = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);
const baseSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Esri'
});
L.control.layers({ 'Mapa': baseNormal, 'Satelital': baseSatelite }, null, { position: 'topright' }).addTo(map);

const layerPorticos = L.layerGroup().addTo(map);
const layerConsulta = new L.FeatureGroup().addTo(map);
const markerById = new Map();
let features = [];
let visibles = [];
let seleccionados = [];
let marcadorConsulta = null;

const drawControl = new L.Control.Draw({
  position: 'topleft',
  draw: {
    polyline: false,
    marker: false,
    circlemarker: false,
    rectangle: { shapeOptions: { color: '#007639', weight: 2 } },
    polygon: { allowIntersection: false, shapeOptions: { color: '#007639', weight: 2 } },
    circle: { shapeOptions: { color: '#007639', weight: 2 } }
  },
  edit: { featureGroup: layerConsulta, edit: false, remove: false }
});
map.addControl(drawControl);

function props(f) { return f.properties || {}; }
function coords(f) {
  const [lng, lat] = f.geometry.coordinates;
  return { lat, lng };
}

function icono(seleccionado = false) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="portico-dot${seleccionado ? ' selected' : ''}"></div>`,
    iconSize: seleccionado ? [18,18] : [13,13],
    iconAnchor: seleccionado ? [9,9] : [6,6]
  });
}

function popupHtml(f) {
  const p = props(f);
  const c = coords(f);
  return `<div class="popup-card">
    <div class="popup-title">${escapeHtml(p.descripcio || 'Pórtico')}</div>
    <div class="popup-row"><span>Autopista</span><strong>${escapeHtml(nombreAutopistaLargo(p.contrato))}</strong></div>
    <div class="popup-row"><span>Tramo</span><strong>${escapeHtml(p.tramo || 'S/I')}</strong></div>
    <div class="popup-row"><span>Comuna</span><strong>${escapeHtml(p.nom_comuna || 'S/I')}</strong></div>
    <div class="popup-row"><span>Tipo</span><strong>${escapeHtml(p.tipo_peaje || 'S/I')}</strong></div>
    <div class="popup-row"><span>Coord.</span><strong>${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}</strong></div>
  </div>`;
}

function filtrosActuales() {
  return {
    texto: document.getElementById('busqueda').value.toLowerCase().trim(),
    autopista: document.getElementById('filtroAutopista').value
  };
}

function cumpleFiltros(f) {
  const p = props(f);
  const { texto, autopista } = filtrosActuales();
  if (autopista !== 'TODAS' && p.contrato !== autopista) return false;
  const bolsa = `${p.descripcio || ''} ${p.contrato || ''} ${p.tramo || ''} ${p.nom_comuna || ''}`.toLowerCase();
  return !texto || bolsa.includes(texto);
}

function renderPuntos() {
  layerPorticos.clearLayers();
  markerById.clear();
  visibles = features.filter(cumpleFiltros);
  visibles.forEach(f => {
    const p = props(f);
    const c = coords(f);
    const marker = L.marker([c.lat, c.lng], { icon: icono(false), title: p.descripcio || 'Pórtico' })
      .bindPopup(popupHtml(f))
      .addTo(layerPorticos);
    markerById.set(p.objectid ?? f.id, marker);
  });
  document.getElementById('visiblesDatos').textContent = visibles.length;
  renderGrupos(visibles);
}

function renderGrupos(lista) {
  const grupos = new Map();
  lista.forEach(f => {
    const nombre = props(f).contrato || 'Sin autopista';
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    grupos.get(nombre).push(f);
  });
  const ordenados = [...grupos.entries()].sort((a,b) => nombreAutopistaLargo(a[0]).localeCompare(nombreAutopistaLargo(b[0]), 'es'));
  document.getElementById('gruposAutopista').innerHTML = ordenados.map(([nombre, items]) => `
    <details>
      <summary>${escapeHtml(nombreAutopistaLargo(nombre))} (${items.length})</summary>
      <div class="group-list">${items.sort((a,b) => (props(a).descripcio || '').localeCompare(props(b).descripcio || '', 'es')).map(f =>
        `<button class="group-item" data-id="${props(f).objectid ?? f.id}">${escapeHtml(props(f).descripcio)}</button>`
      ).join('')}</div>
    </details>`).join('');

  document.querySelectorAll('.group-item').forEach(btn => btn.addEventListener('click', () => enfocarPorId(btn.dataset.id)));
}

function enfocarPorId(id) {
  const f = features.find(x => String(props(x).objectid ?? x.id) === String(id));
  if (!f) return;
  const c = coords(f);
  map.setView([c.lat, c.lng], 16);
  const m = markerById.get(props(f).objectid ?? f.id);
  if (m) m.openPopup();
}

function pintarSeleccion(lista) {
  seleccionados = lista;
  const ids = new Set(lista.map(f => props(f).objectid ?? f.id));
  markerById.forEach((marker, id) => marker.setIcon(icono(ids.has(id))));
  document.getElementById('seleccionadosDatos').textContent = lista.length;
  document.getElementById('resultadoCantidad').textContent = lista.length;
}

function renderResultados(lista, puntoReferencia = null) {
  const resultado = document.getElementById('resultado');
  if (!lista.length) {
    resultado.innerHTML = 'No se encontraron pórticos en la selección.';
    pintarSeleccion([]);
    return;
  }
  const ordenados = [...lista].map(f => ({
    f,
    distancia: puntoReferencia ? distanciaKm(puntoReferencia, coords(f)) : null
  })).sort((a,b) => puntoReferencia ? a.distancia - b.distancia : (props(a.f).descripcio || '').localeCompare(props(b.f).descripcio || '', 'es'));

  resultado.innerHTML = ordenados.map(({f, distancia}) => {
    const p = props(f);
    return `<article class="result-item" data-id="${p.objectid ?? f.id}">
      <div class="result-title">${escapeHtml(p.descripcio || 'Pórtico')}</div>
      <div class="result-meta">${escapeHtml(nombreAutopistaLargo(p.contrato))}<br>${escapeHtml(p.tramo || '')} · ${escapeHtml(p.nom_comuna || '')}${distancia !== null ? `<br><span class="distance">${distancia < 1 ? Math.round(distancia*1000)+' m' : distancia.toFixed(2)+' km'}</span>` : ''}</div>
    </article>`;
  }).join('');
  document.querySelectorAll('.result-item').forEach(el => el.addEventListener('click', () => enfocarPorId(el.dataset.id)));
  pintarSeleccion(lista);
}

function seleccionarPorCapa(layer) {
  const lista = visibles.filter(f => {
    const c = coords(f);
    const ll = L.latLng(c.lat, c.lng);
    if (layer instanceof L.Circle) return layer.getLatLng().distanceTo(ll) <= layer.getRadius();
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) return puntoEnPoligono(ll, layer.getLatLngs()[0]);
    return false;
  });
  renderResultados(lista);
}

function puntoEnPoligono(punto, vertices) {
  let dentro = false;
  const x = punto.lng, y = punto.lat;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].lng, yi = vertices[i].lat;
    const xj = vertices[j].lng, yj = vertices[j].lat;
    const intersecta = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

function limpiarSeleccion() {
  layerConsulta.clearLayers();
  if (marcadorConsulta) { map.removeLayer(marcadorConsulta); marcadorConsulta = null; }
  pintarSeleccion([]);
  document.getElementById('resultado').innerHTML = 'Selecciona un punto o dibuja un área sobre el mapa.';
}

function cargarFiltroAutopistas() {
  const nombres = [...new Set(features.map(f => props(f).contrato).filter(Boolean))]
    .sort((a,b) => nombreAutopistaLargo(a).localeCompare(nombreAutopistaLargo(b), 'es'));
  const select = document.getElementById('filtroAutopista');
  select.innerHTML = '<option value="TODAS">Todas las autopistas</option>' + nombres.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(nombreAutopistaLargo(n))}</option>`).join('');
}

map.on('click', e => {
  layerConsulta.clearLayers();
  if (marcadorConsulta) map.removeLayer(marcadorConsulta);
  marcadorConsulta = L.circleMarker(e.latlng, { radius: 8, color: '#fff', fillColor: '#e85d04', fillOpacity: 1, weight: 3 }).addTo(map);
  renderResultados(visibles, e.latlng);
});

map.on(L.Draw.Event.CREATED, e => {
  limpiarSeleccion();
  layerConsulta.addLayer(e.layer);
  seleccionarPorCapa(e.layer);
});

document.getElementById('busqueda').addEventListener('input', () => { renderPuntos(); limpiarSeleccion(); });
document.getElementById('filtroAutopista').addEventListener('change', () => { renderPuntos(); limpiarSeleccion(); });
document.getElementById('btnCentrar').addEventListener('click', () => map.setView(RM_CENTER, 10));
document.getElementById('btnLimpiar').addEventListener('click', limpiarSeleccion);
document.getElementById('btnTodos').addEventListener('click', () => renderResultados(visibles));
document.getElementById('btnUbicacion').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('El navegador no permite geolocalización.');
  navigator.geolocation.getCurrentPosition(pos => {
    const punto = L.latLng(pos.coords.latitude, pos.coords.longitude);
    map.setView(punto, 14);
    if (marcadorConsulta) map.removeLayer(marcadorConsulta);
    marcadorConsulta = L.circleMarker(punto, { radius: 9, color: '#fff', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }).addTo(map);
    renderResultados(visibles, punto);
  }, () => alert('No fue posible obtener la ubicación. Revisa los permisos del navegador.'), { enableHighAccuracy: true, timeout: 10000 });
});

async function iniciar() {
  try {
    const resp = await fetch('data/porticos_rm.geojson');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const geojson = await resp.json();
    features = Array.isArray(geojson.features) ? geojson.features : [];
    document.getElementById('totalDatos').textContent = features.length;
    cargarFiltroAutopistas();
    renderPuntos();
    document.getElementById('resultadoCantidad').textContent = '0';
  } catch (error) {
    console.error(error);
    document.getElementById('resultado').innerHTML = '<strong>No fue posible cargar la base.</strong><br>Abre el proyecto mediante GitHub Pages o un servidor local; no directamente con doble clic.';
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
