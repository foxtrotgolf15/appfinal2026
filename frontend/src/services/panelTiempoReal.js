import table1Data from '@/data/table_1.json';
import { calculateDecompression } from './decompressionCalculator';

/**
 * Siguiente tiempo de la tabla (el inmediatamente superior) para una profundidad tabulada.
 * Devuelve null si el tiempo tabulado ya es el último de esa profundidad.
 */
export const siguienteTiempoTabla = (profundidadTabulada, tiempoTabulado) => {
  let siguiente = null;
  for (const fila of table1Data) {
    if (fila.profundidad !== profundidadTabulada) continue;
    const t = Number(fila.tiempo);
    if (t > tiempoTabulado && (siguiente === null || t < siguiente)) siguiente = t;
  }
  return siguiente;
};

/**
 * Datos en vivo para el panel del modo "tiempo real".
 * `minutos` = tiempo de fondo transcurrido (decimal). Se tabula por el valor inmediato superior,
 * que con tiempos de tabla enteros equivale a tabular por ceil(minutos).
 */
export const calcularPanelTiempoReal = (campos, minutos) => {
  const { p1, p2, p2_1, p4, p4_1, p4_2, p4_2_1, p4_2_2 } = campos;
  const profundidad = parseFloat(p2);
  if (!p2 || !(profundidad > 0)) return { estado: 'sin_profundidad' };
  if (profundidad > 91.4) return { estado: 'error', mensaje: 'Inmersión fuera de tablas' };
  if (!p2_1) return { estado: 'falta_instrumento' };

  const minutosTabulacion = Math.max(1, Math.ceil(minutos - 1e-9));
  const modo = p1 === 'o2' ? 'o2' : 'aire';
  const formData = {
    p1: modo, p2, p2_1,
    p3: String(minutosTabulacion),
    p4: p4 || '0', p4_1, p4_2, p4_2_1, p4_2_2,
    p6: 'no'
  };

  // El motor escribe mucho en consola; se silencia mientras se calcula en vivo.
  const logOriginal = console.log;
  const errorOriginal = console.error;
  console.log = () => {};
  console.error = () => {};
  let r;
  try {
    r = calculateDecompression(formData);
  } catch (e) {
    r = { error: e.message };
  } finally {
    console.log = logOriginal;
    console.error = errorOriginal;
  }

  if (!r || r.error || r.profundidadTabulada === undefined || r.tiempoTabulado === undefined) {
    return { estado: 'error', mensaje: (r && r.error) || 'No se puede calcular con los datos actuales' };
  }

  return {
    estado: 'ok',
    modo,
    asumido: !p1,
    profundidadTabulada: r.profundidadTabulada,
    tiempoTabulado: r.tiempoTabulado,
    siguienteTiempo: siguienteTiempoTabla(r.profundidadTabulada, r.tiempoTabulado),
    descompresionTotal: r.tiempoDescompresionTotal
  };
};
