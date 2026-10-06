// Configuración de tu base de datos en jsonbin.io
const BIN_ID = "6ac3ba44ac6210605a15d6f2";
const API_KEY = "$2a$10$QisiU4Ygk8biECvKUeF4IujeSjeYnQ2byPmnfQiaBjxP3a3tqwDwK";
const URL_API = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const calendar = document.getElementById('calendar');
const modal = document.getElementById('modalForm');
const selectedDateText = document.getElementById('selectedDateText');
const nombreInput = document.getElementById('nombre');
const modalidadSelect = document.getElementById('modalidad');

let indiceDiaSeleccionado = 0;
const TOTAL_DIAS = 21;
const FECHA_INICIO = new Date(2026, 9, 12);
const CLAVE_ADMIN = "apostol";

let registros = {};

// Limpia cualquier propiedad inicial que no sea un arreglo de nombres
function normalizarRegistros(datosCrudos) {
  const limpio = {};
  if (datosCrudos && typeof datosCrudos === 'object') {
    Object.keys(datosCrudos).forEach(k => {
      if (Array.isArray(datosCrudos[k])) {
        limpio[k] = datosCrudos[k];
      }
    });
  }
  return limpio;
}

// Cargar datos desde la nube
async function cargarRegistrosDesdeLaNube() {
  calendar.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">Cargando calendario...</p>';
  try {
    const respuesta = await fetch(`${URL_API}/latest`, {
      headers: { "X-Master-Key": API_KEY }
    });
    const datos = await respuesta.json();
    registros = normalizarRegistros(datos.record);
  } catch (error) {
    console.error("Error al cargar datos:", error);
    registros = {};
  }
  renderizarCalendario();
}

// Guardar cambios en la nube
async function guardarEnLaNube() {
  try {
    const resp = await fetch(URL_API, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY
      },
      body: JSON.stringify(registros)
    });
    return resp.ok;
  } catch (error) {
    console.error("Error al guardar:", error);
    alert("Hubo un error de conexión al guardar los datos.");
    return false;
  }
}

function formatearClave(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function obtenerFechaPorIndice(indice) {
  const d = new Date(FECHA_INICIO);
  d.setDate(FECHA_INICIO.getDate() + indice);
  return d;
}

function generarColorNombre(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    fondo: `hsl(${hue}, 70%, 93%)`,
    borde: `hsl(${hue}, 60%, 75%)`
  };
}

function renderizarCalendario() {
  calendar.innerHTML = '';

  for (let i = 0; i < TOTAL_DIAS; i++) {
    const diaActual = obtenerFechaPorIndice(i);
    const claveFecha = formatearClave(diaActual);
    const opcionesTexto = { weekday: 'short', day: 'numeric', month: 'short' };
    const textoFecha = diaActual.toLocaleDateString('es-ES', opcionesTexto);

    const participantesDelDia = Array.isArray(registros[claveFecha]) ? registros[claveFecha] : [];

    let nombresHTML = '';
    if (participantesDelDia.length === 0) {
      nombresHTML = '<li class="empty-notice">Sin participantes aún</li>';
    } else {
      nombresHTML = participantesDelDia
        .map(nombre => {
          const color = generarColorNombre(nombre);
          return `
            <li class="participant-item" style="background-color: ${color.fondo}; border-color: ${color.borde};">
              <span class="nombre-texto">${nombre}</span>
              <button class="btn-eliminar" onclick="eliminarParticipanteEnCadena('${nombre.replace(/'/g, "\\'")}')" title="Eliminar">✕</button>
            </li>
          `;
        })
        .join('');
    }

    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-header">
        <div class="date">${textoFecha}</div>
      </div>
      <ul class="participants-list">${nombresHTML}</ul>
      <button class="btn-anotarse" onclick="abrirModal(${i}, '${textoFecha}')">+ Anotarme</button>
    `;
    calendar.appendChild(card);
  }
}

function abrirModal(indice, textoVisible) {
  indiceDiaSeleccionado = indice;
  selectedDateText.innerText = textoVisible;
  nombreInput.value = '';
  
  // Calcular cuántos días quedan disponibles desde la fecha seleccionada
  const diasRestantes = TOTAL_DIAS - indice;
  
  // Generar las opciones del 1 en adelante
  modalidadSelect.innerHTML = '';
  for (let d = 1; d <= diasRestantes; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    if (d === 1) {
      opt.textContent = '1 día (solo este día)';
    } else if (d === TOTAL_DIAS && indice === 0) {
      opt.textContent = `21 días (Toda la cadena completa)`;
    } else {
      opt.textContent = `${d} días seguidos`;
    }
    modalidadSelect.appendChild(opt);
  }

  // Dejar seleccionado 1 o 3 días por defecto según disponibilidad
  modalidadSelect.value = diasRestantes >= 3 ? '3' : '1';

  modal.classList.remove('hidden');
  nombreInput.focus();
}

function cerrarModal() {
  modal.classList.add('hidden');
}

document.getElementById('registroForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombreLimpio = nombreInput.value.trim();
  const duracion = parseInt(modalidadSelect.value, 10);

  if (!nombreLimpio) return;

  const btnConfirmar = e.target.querySelector('.btn-confirm');
  btnConfirmar.disabled = true;
  btnConfirmar.innerText = "Guardando...";

  try {
    const resp = await fetch(`${URL_API}/latest`, { headers: { "X-Master-Key": API_KEY } });
    const data = await resp.json();
    registros = normalizarRegistros(data.record);

    const indicesDestino = [];
    if (duracion === 21) {
      for (let i = 0; i < TOTAL_DIAS; i++) indicesDestino.push(i);
    } else {
      for (let i = 0; i < duracion; i++) {
        const idx = indiceDiaSeleccionado + i;
        if (idx < TOTAL_DIAS) indicesDestino.push(idx);
      }
    }

    const duplicado = indicesDestino.some(idx => {
      const clave = formatearClave(obtenerFechaPorIndice(idx));
      return (registros[clave] || []).some(n => n.toLowerCase() === nombreLimpio.toLowerCase());
    });

    if (duplicado) {
      alert(`"${nombreLimpio}" ya está registrado en uno de esos días.`);
      btnConfirmar.disabled = false;
      btnConfirmar.innerText = "Confirmar";
      return;
    }

    indicesDestino.forEach(idx => {
      const clave = formatearClave(obtenerFechaPorIndice(idx));
      if (!registros[clave]) registros[clave] = [];
      registros[clave].push(nombreLimpio);
    });

    await guardarEnLaNube();
    cerrarModal();
    renderizarCalendario();
  } catch (err) {
    console.error(err);
    alert("Error de conexión al intentar registrar.");
  } finally {
    btnConfirmar.disabled = false;
    btnConfirmar.innerText = "Confirmar";
  }
});

async function eliminarParticipanteEnCadena(nombreAEliminar) {
  const claveIngresada = prompt(`Contraseña para retirar a "${nombreAEliminar}":`);
  if (!claveIngresada) return;

  if (claveIngresada.trim() !== CLAVE_ADMIN) {
    alert("Contraseña incorrecta.");
    return;
  }

  try {
    const resp = await fetch(`${URL_API}/latest`, { headers: { "X-Master-Key": API_KEY } });
    const data = await resp.json();
    registros = normalizarRegistros(data.record);

    Object.keys(registros).forEach(clave => {
      registros[clave] = registros[clave].filter(n => n.toLowerCase() !== nombreAEliminar.toLowerCase());
      if (registros[clave].length === 0) delete registros[clave];
    });

    await guardarEnLaNube();
    renderizarCalendario();
    alert(`"${nombreAEliminar}" fue eliminado exitosamente.`);
  } catch (err) {
    console.error(err);
    alert("Error al intentar eliminar.");
  }
}

// Iniciar
cargarRegistrosDesdeLaNube();