function distanciaKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[c]);
}

function nombreAutopistaLargo(nombre) {
  const equivalencias = {
    'Concesión Internacional Sistema Oriente Poniente Costanera Norte': 'Costanera Norte',
    'Sistema Norte-Sur': 'Sistema Norte–Sur',
    'Concesión Américo Vespucio Oriente Tramo El Salto - Príncipe de Gales': 'Américo Vespucio Oriente',
    'Sistema Américo Vespucio Norponiente, Av. El Salto - Ruta 78': 'Vespucio Norte',
    'Sistema Américo Vespucio Sur. Ruta 78 - Av. Grecia': 'Vespucio Sur',
    'Ruta 5, Tramo Santiago - Los Vilos': 'Ruta 5 Santiago–Los Vilos',
    'Acceso Vial Aeropuerto Arturo Merino Benítez': 'Acceso Vial Aeropuerto'
  };
  return equivalencias[nombre] || nombre || 'Sin autopista';
}
