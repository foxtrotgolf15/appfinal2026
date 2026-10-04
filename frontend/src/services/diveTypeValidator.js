// Servicio para determinar y validar el tipo de buceo según las respuestas del formulario

export const DIVE_TYPES = {
  SEA_LEVEL_AIR: 'Buceo a nivel del mar con descompresión con aire en el agua',
  SEA_LEVEL_O2: 'Buceo a nivel del mar con descompresión con O2 en el agua',
  SEA_LEVEL_CHAMBER: 'Buceo a nivel del mar con descompresión en cámara',
  ALTITUDE_AIR: 'Buceo en altitud con descompresión con aire en el agua',
  ALTITUDE_O2: 'Buceo en altitud con descompresión con O2 en el agua',
  ALTITUDE_CHAMBER: 'Buceo en altitud con descompresión en cámara',
  REPETITIVE_SEA_LEVEL: 'Buceo repetitivo a nivel del mar',
  REPETITIVE_ALTITUDE: 'Buceo repetitivo en altitud',
  EXCEPTIONAL: 'Buceo excepcional'
};

// Tipos de buceo actualmente implementados
const IMPLEMENTED_TYPES = [
  DIVE_TYPES.SEA_LEVEL_AIR,
  DIVE_TYPES.SEA_LEVEL_O2,
  DIVE_TYPES.ALTITUDE_AIR,
  DIVE_TYPES.ALTITUDE_O2
];

/**
 * Determina el tipo de buceo según las respuestas del formulario
 * @param {Object} formData - Datos del formulario
 * @returns {Object} { type: string, isImplemented: boolean, error: string|null }
 */
export const determineDiveType = (formData) => {
  const {
    p1, // Tipo de descompresión preferida
    p2, // Profundidad
    p4, // Altitud
    p4_2, // ¿Realizó ascenso a esta altitud en las últimas 24 horas?
    p5, // Inmersión anterior en 10 min
    p6  // Inmersión en 16h previas
  } = formData;

  const profundidad = parseFloat(p2);
  const altitud = parseFloat(p4 || 0);
  const esAltitud = altitud >= 91.44;
  const esBuceoRepetitivo = p6 === 'si';
  const esInmersionContigua = p5 === 'si';

  let diveType = null;

  // Determinar el tipo de buceo
  if (!esBuceoRepetitivo) {
    // Buceo simple (no repetitivo)
    if (!esAltitud) {
      // Nivel del mar
      if (p1 === 'aire') {
        diveType = DIVE_TYPES.SEA_LEVEL_AIR;
      } else if (p1 === 'o2') {
        diveType = DIVE_TYPES.SEA_LEVEL_O2;
      } else if (p1 === 'camara') {
        diveType = DIVE_TYPES.SEA_LEVEL_CHAMBER;
      }
    } else {
      // Altitud - Validar que P4.2 = "si" (requisito obligatorio)
      if (p4_2 !== 'si') {
        // Si P4.2 no es "si", el tipo de buceo no está implementado
        diveType = null;
      } else {
        if (p1 === 'aire') {
          diveType = DIVE_TYPES.ALTITUDE_AIR;
        } else if (p1 === 'o2') {
          diveType = DIVE_TYPES.ALTITUDE_O2;
        } else if (p1 === 'camara') {
          diveType = DIVE_TYPES.ALTITUDE_CHAMBER;
        }
      }
    }
  } else {
    // Buceo repetitivo
    if (esInmersionContigua) {
      // Inmersión contigua (en 10 min)
      diveType = !esAltitud ? DIVE_TYPES.REPETITIVE_SEA_LEVEL : DIVE_TYPES.REPETITIVE_ALTITUDE;
    } else {
      // Inmersión con intervalo
      diveType = !esAltitud ? DIVE_TYPES.REPETITIVE_SEA_LEVEL : DIVE_TYPES.REPETITIVE_ALTITUDE;
    }
  }

  // Verificar si está implementado
  const isImplemented = IMPLEMENTED_TYPES.includes(diveType);

  return {
    type: diveType,
    isImplemented,
    error: !isImplemented 
      ? (diveType === null || diveType === 'null' || diveType === undefined 
          ? 'Tipo de buceo no implementado' 
          : `El tipo de buceo "${diveType}" aún no está implementado. Por favor, contacte con el desarrollador para añadir este tipo de inmersión.`) 
      : null
  };
};

/**
 * Valida si el formulario corresponde a un tipo de buceo implementado
 * @param {Object} formData - Datos del formulario
 * @returns {Object} { valid: boolean, error: string|null, diveType: string|null }
 */
export const validateDiveType = (formData) => {
  const result = determineDiveType(formData);
  
  return {
    valid: result.isImplemented,
    error: result.error,
    diveType: result.type
  };
};

/**
 * Obtiene información detallada sobre el tipo de buceo
 * @param {Object} formData - Datos del formulario
 * @returns {Object} Información del tipo de buceo
 */
export const getDiveTypeInfo = (formData) => {
  const result = determineDiveType(formData);
  const altitud = parseFloat(formData.p4 || 0);
  
  return {
    type: result.type,
    isImplemented: result.isImplemented,
    isSeaLevel: altitud < 91.44,
    isAltitude: altitud >= 91.44,
    isRepetitive: formData.p6 === 'si',
    decompressionMode: formData.p1,
    error: result.error
  };
};
