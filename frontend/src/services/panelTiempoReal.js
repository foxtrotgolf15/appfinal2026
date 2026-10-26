import table1Data from '@/data/table_1.json';
import { calculateDecompression } from './decompressionCalculator';

/**
 * Siguiente tiempo de la tabla (el inmediatamente superior) para una profundidad tabulada.
 * Devuelve null si el tiempo tabulado ya es el último de esa profundidad.
 */
const PROFUNDIDADES_TABLA = [...new Set(table1Data.map((f) => Number(f.profundidad)))].sort((a, b) => a - b);

/** Siguiente profundidad de la tabla (la inmediatamente mayor). null si ya es la última. */
export const siguienteProfundidadTabla = (profundidadTabulada) => {
  const sig = PROFUNDIDADES_TABLA.find((d) => d > profundidadTabulada);
  return sig === undefined ? null : sig;
};

export const siguienteTiempoTabla = (profundidadTabulada, tiempoTabulado) => {
  let siguiente = null;
  for (const fila of table1Data) {
    if (fila.profundidad !== profundidadTabulada) continue;
    const t = Number(fila.tiempo);
    if (t > tiempoTabulado && (siguiente === null || t < siguiente)) siguiente = t;
  }
  return siguiente;
};


// El motor escribe mucho en consola; se silencia mientras se calcula en vivo.
const calcularSilencioso = (formData) => {
  const logOriginal = console.log;
  const errorOriginal = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return calculateDecompression(formData);
  } catch (e) {
    return { error: e.message };
  } finally {
    console.log = logOriginal;
    console.error = errorOriginal;
  }
};

const resultadoValido = (r) =>
  r && !r.error && r.profundidadTabulada !== undefined && r.tiempoTabulado !== undefined;

// Resumen de un cálculo del motor para mostrarlo en el panel.
// Solo paradas (aire u O2) con su duración; sin breaks de aire ni ventilación.
const resumir = (r) => {
  const elementos = Array.isArray(r.paradasConBreaks) && r.paradasConBreaks.length > 0
    ? r.paradasConBreaks.filter((e) => e.tipo === 'PARADA_AIRE' || e.tipo === 'PARADA_O2')
    : (r.paradas || []);
  return {
    profundidad: r.profundidadTabulada,
    tiempo: r.tiempoTabulado,
    primeraParada: r.tiempoHastaPrimeraParada || null,
    superficie: r.tiempoHastaSuperficie || null,
    paradas: elementos.map((e) => ({
      profundidad: e.profundidad,
      segundos: Math.round((Number(e.duracion) || 0) * 60),
      o2: e.tipo === 'PARADA_O2'
    }))
  };
};

/**
 * Datos en vivo para el panel del modo "tiempo real".
 * `minutos` = tiempo de fondo transcurrido (decimal). Se tabula por el valor inmediato superior,
 * que con tiempos de tabla enteros equivale a tabular por ceil(minutos).
 * Devuelve tres escenarios: actual, siguiente tiempo (misma profundidad) y siguiente profundidad
 * (mismo tiempo transcurrido). Cada uno con sus paradas.
 */
export const calcularPanelTiempoReal = (campos, minutos) => {
  const { p1, p2, p2_1, p4, p4_1, p4_2, p4_2_1, p4_2_2 } = campos;
  const profundidad = parseFloat(p2);
  if (!p2 || !(profundidad > 0)) return { estado: 'sin_profundidad' };
  if (profundidad > 91.4) return { estado: 'error', mensaje: 'Inmersión fuera de tablas' };
  if (!p2_1) return { estado: 'falta_instrumento' };

  const minutosTabulacion = Math.max(1, Math.ceil(minutos - 1e-9));
  const modo = p1 === 'o2' ? 'o2' : 'aire';
  const base = {
    p1: modo, p2_1,
    p4: p4 || '0', p4_1, p4_2, p4_2_1, p4_2_2,
    p6: 'no'
  };
  const calcular = (prof, tiempo) => calcularSilencioso({ ...base, p2: String(prof), p3: String(tiempo) });

  const r = calcular(p2, minutosTabulacion);
  if (!resultadoValido(r)) {
    return { estado: 'error', mensaje: (r && r.error) || 'No se puede calcular con los datos actuales' };
  }
  const actual = resumir(r);

  // Siguiente tiempo de la tabla, misma profundidad
  const tSig = siguienteTiempoTabla(r.profundidadTabulada, r.tiempoTabulado);
  let siguienteTiempo = null;
  if (tSig !== null) {
    const rt = calcular(p2, tSig);
    if (resultadoValido(rt)) siguienteTiempo = resumir(rt);
  }

  // Siguiente profundidad de la tabla, con el mismo tiempo transcurrido.
  // Se usa la mayor profundidad real que aún tabula en esa profundidad (caso más conservador
  // para el tiempo de ascenso); a nivel del mar es la propia profundidad de tabla.
  let siguienteProfundidad = null;
  const dSig = siguienteProfundidadTabla(r.profundidadTabulada);
  if (dSig !== null) {
    let lo = profundidad;
    let hi = 91.4;
    // Si a 91.4 m todavía tabula en dSig, ese es el límite
    if (calcular(hi, minutosTabulacion).profundidadTabulada <= dSig + 1e-9) lo = hi;
    else {
      for (let i = 0; i < 14 && hi - lo > 0.01; i++) {
        const mid = (lo + hi) / 2;
        if (calcular(mid, 1).profundidadTabulada <= dSig + 1e-9) lo = mid; else hi = mid;
      }
    }
    const pSig = Math.round(lo * 100) / 100;
    const rp = calcular(pSig, minutosTabulacion);
    if (resultadoValido(rp) && rp.profundidadTabulada === dSig) siguienteProfundidad = resumir(rp);
    else siguienteProfundidad = { fueraDeTabla: true, profundidad: dSig };
  }

  return { estado: 'ok', modo, asumido: !p1, actual, siguienteTiempo, siguienteProfundidad };
};
