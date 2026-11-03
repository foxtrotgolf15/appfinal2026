import table1Data from '@/data/table_1.json';

// Datos derivados de la propia table_1.json: si la tabla cambia (profundidades de parada,
// profundidad máxima), la app se adapta sin tocar números a mano.
const CLAVE_PARADA = /^parada a ([0-9]+(?:\.[0-9]+)?)m de profundidad$/;

// Profundidades de parada de mayor a menor, tal como aparecen en las columnas de la tabla.
export const PROFUNDIDADES_PARADA = Object.keys(table1Data[0])
  .map((k) => { const m = k.match(CLAVE_PARADA); return m ? parseFloat(m[1]) : null; })
  .filter((v) => v !== null)
  .sort((a, b) => b - a);

export const claveParada = (prof) => `parada a ${prof}m de profundidad`;

// Paradas con O2: las dos más someras (a nivel del mar 9 y 6 m).
export const PROF_O2_PROFUNDA = PROFUNDIDADES_PARADA[PROFUNDIDADES_PARADA.length - 2];
export const PROF_O2_SOMERA = PROFUNDIDADES_PARADA[PROFUNDIDADES_PARADA.length - 1];

// Profundidad máxima de la tabla (fuera de ella: "Inmersión fuera de tablas").
export const PROFUNDIDAD_MAXIMA_TABLA = Math.max(...table1Data.map((f) => Number(f.profundidad)));
