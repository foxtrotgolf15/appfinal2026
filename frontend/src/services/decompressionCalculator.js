import table1Data from '@/data/table_1.json';
import table4Data from '@/data/table_4.json';

export const calculateDecompression = (formData) => {
  try {
    console.log('DEBUG: Iniciando cálculo de descompresión con datos:', formData);
    
    // Determinar tipo de buceo
    const altitudParsed = parseFloat(formData.p4 || 0);
    const altitud = isNaN(altitudParsed) ? 0 : altitudParsed;
    const esAltitud = altitud >= 91.44;
    const esBuceoRepetitivo = formData.p6 === 'si';
    
    console.log(`DEBUG: Altitud: ${altitud}, Es altitud: ${esAltitud}, Es repetitivo: ${esBuceoRepetitivo}`);
    
    // Buceos en altitud
    if (esAltitud && !esBuceoRepetitivo) {
      if (formData.p1 === 'o2') {
        console.log('DEBUG: Usando calculateAltitudeO2Decompression');
        return calculateAltitudeO2Decompression(formData);
      } else if (formData.p1 === 'aire') {
        console.log('DEBUG: Usando calculateAltitudeAirDecompression');
        return calculateAltitudeAirDecompression(formData);
      }
    }
    
    // Buceos a nivel del mar
    if (!esAltitud && !esBuceoRepetitivo) {
      if (formData.p1 === 'o2') {
        console.log('DEBUG: Usando calculateSeaLevelO2Decompression');
        return calculateSeaLevelO2Decompression(formData);
      } else if (formData.p1 === 'aire') {
        console.log('DEBUG: Usando calculateStandardDecompression (aire nivel del mar)');
        return calculateStandardDecompression(formData);
      }
    }
    
    // Fallback para otros tipos
    console.log('DEBUG: Usando calculateStandardDecompression (fallback)');
    return calculateStandardDecompression(formData);

  } catch (error) {
    console.error('Error en cálculo de descompresión:', error);
    console.error('Stack trace:', error.stack);
    return {
      error: 'Error en el cálculo de descompresión: ' + error.message,
      errorType: 'CALCULATION_ERROR'
    };
  }
};

// Función para buceo con O2 a nivel del mar
const calculateSeaLevelO2Decompression = (formData) => {
  // Obtener altitud para mostrar siempre en resultados (aunque no sea buceo en altitud)
  const altitud = parseFloat(formData.p4 || 0);
  
  // Paso 1: Profundidad
  const profundidad = parseFloat(formData.p2);

  // Paso 2: Profundidad Máxima Corregida
  let profundidadMaximaCorregida = profundidad;
  
  if (formData.p2_1 === 'neumatico') {
    if (profundidad >= 0 && profundidad <= 30.43) {
      profundidadMaximaCorregida = profundidad + 0.30;
    } else if (profundidad > 30.43 && profundidad <= 60.86) {
      profundidadMaximaCorregida = profundidad + 0.61;
    } else if (profundidad > 60.86 && profundidad <= 91.30) {
      profundidadMaximaCorregida = profundidad + 1.22;
    } else if (profundidad > 91.30 && profundidad <= 121.73) {
      profundidadMaximaCorregida = profundidad + 2.13;
    }
  }

  // Regla 1 de Paso 2: Verificar si está fuera de tablas
  if (profundidadMaximaCorregida > 91.4) {
    return {
      error: 'Inmersión fuera de tablas',
      errorType: 'OUT_OF_TABLES'
    };
  }

  // Convertir tiempo de fondo de mm:ss a minutos (manejar ambos formatos: "62" o "62:00")
  let tiempoDeFondoMinutos;
  if (formData.p3.includes(':')) {
    const [minutes, seconds] = formData.p3.split(':').map(Number);
    tiempoDeFondoMinutos = Math.ceil(minutes + (seconds || 0) / 60);
  } else {
    // Si no tiene ':', asumir que es solo minutos
    tiempoDeFondoMinutos = Math.ceil(parseFloat(formData.p3));
  }
  
  console.log(`DEBUG: Tiempo de fondo parseado: ${formData.p3} -> ${tiempoDeFondoMinutos} minutos`);

  // Paso 3: Buscar en tabla 1 específicamente para O2
  const resultado = buscarEnTabla1ParaO2(profundidadMaximaCorregida, tiempoDeFondoMinutos);

  if (resultado.error) {
    return resultado;
  }

  // Calcular tiempos de ascenso con lógica específica para O2
  const tiemposAscenso = calcularTiemposAscensoO2(resultado, profundidadMaximaCorregida);

  // Obtener tiempos mínimos para ascender a altitud
  const tiemposAltitud = obtenerTiemposAltitud(resultado.grupoBuceoSucesivoFinal);

  // Calcular duración del buceo
  const duracionBuceo = calcularDuracionBuceo(formData.p3, tiemposAscenso.tiempoDescompresionTotal);

  // Calcular consumo de O2
  const consumoO2 = calcularConsumoO2(resultado.paradasO2);

  const resultadoFinal = {
    ...resultado,
    profundidad,
    profundidadMaximaCorregida,
    tiempoDeFondo: formData.p3,
    tiempoDeFondoMinutos,
    ...tiemposAscenso,
    tiemposAltitud,
    tipoInmersion: resultado.tipoInmersion === 'SIN_PARADAS' 
      ? 'SIN_PARADAS' 
      : 'Buceo a nivel del mar con descompresión con O2 en el agua',
    duracionBuceo,
    consumoO2,
    tipoCalculoEspecifico: 'SEA_LEVEL_O2',
    // Asegurar que paradasConBreaks esté presente
    paradasConBreaks: tiemposAscenso.paradasConBreaks || resultado.paradasO2 || []
  };
  
  if (altitud && altitud > 0) {
    resultadoFinal.altitud = altitud;
  }
  
  return resultadoFinal;
};

// Función original para cálculo estándar (aire)
const calculateStandardDecompression = (formData) => {
  // Obtener altitud para mostrar siempre en resultados (aunque no sea buceo en altitud)
  const altitud = parseFloat(formData.p4 || 0);
  
  // Paso 1: Profundidad
  const profundidad = parseFloat(formData.p2);

  // Paso 2: Profundidad Máxima Corregida
  let profundidadMaximaCorregida = profundidad;
  
  if (formData.p2_1 === 'neumatico') {
    if (profundidad >= 0 && profundidad <= 30.43) {
      profundidadMaximaCorregida = profundidad + 0.30;
    } else if (profundidad > 30.43 && profundidad <= 60.86) {
      profundidadMaximaCorregida = profundidad + 0.61;
    } else if (profundidad > 60.86 && profundidad <= 91.30) {
      profundidadMaximaCorregida = profundidad + 1.22;
    } else if (profundidad > 91.30 && profundidad <= 121.73) {
      profundidadMaximaCorregida = profundidad + 2.13;
    }
  }

  // Regla 1 de Paso 2: Verificar si está fuera de tablas
  if (profundidadMaximaCorregida > 91.4) {
    return {
      error: 'Inmersión fuera de tablas',
      errorType: 'OUT_OF_TABLES'
    };
  }

  // Convertir tiempo de fondo de mm:ss a minutos (manejar ambos formatos: "62" o "62:00")
  let tiempoDeFondoMinutos;
  if (formData.p3.includes(':')) {
    const [minutes, seconds] = formData.p3.split(':').map(Number);
    tiempoDeFondoMinutos = Math.ceil(minutes + (seconds || 0) / 60);
  } else {
    // Si no tiene ':', asumir que es solo minutos
    tiempoDeFondoMinutos = Math.ceil(parseFloat(formData.p3));
  }
  
  console.log(`DEBUG: Tiempo de fondo parseado: ${formData.p3} -> ${tiempoDeFondoMinutos} minutos`);

  // Paso 3: Buscar en tabla 1
  const resultado = buscarEnTabla1(profundidadMaximaCorregida, tiempoDeFondoMinutos, formData.p1);

  if (resultado.error) {
    return resultado;
  }

  // Paso 4 y 5: Calcular tiempos de ascenso
  const tiemposAscenso = calcularTiemposAscenso(resultado, profundidadMaximaCorregida);

  // Paso 7: Obtener tiempos mínimos para ascender a altitud
  const tiemposAltitud = obtenerTiemposAltitud(resultado.grupoBuceoSucesivoFinal);

  // Calcular duración del buceo
  const duracionBuceo = calcularDuracionBuceo(formData.p3, tiemposAscenso.tiempoDescompresionTotal);

  return {
    ...resultado,
    profundidad,
    profundidadMaximaCorregida,
    tiempoDeFondo: formData.p3,
    tiempoDeFondoMinutos,
    ...tiemposAscenso,
    tiemposAltitud,
    tipoInmersion: resultado.tipoInmersion === 'SIN_PARADAS' 
      ? 'SIN_PARADAS' 
      : getTipoInmersion(formData.p1),
    duracionBuceo,
    altitud
  };
};

const buscarEnTabla1 = (profundidadMaximaCorregida, tiempoDeFondo, modoDescompresion) => {
  // Filtrar por profundidad >= profundidadMaximaCorregida y ordenar
  const entradasProfundidad = table1Data
    .filter(entry => entry.profundidad >= profundidadMaximaCorregida)
    .sort((a, b) => a.profundidad - b.profundidad);

  if (entradasProfundidad.length === 0) {
    return { error: 'No se encontró profundidad en las tablas', errorType: 'NO_DEPTH_FOUND' };
  }

  // Obtener profundidades únicas
  const profundidadesUnicas = [...new Set(entradasProfundidad.map(e => e.profundidad))];

  // Buscar en cada profundidad hasta encontrar una con tiempo suficiente
  let profundidadTabulada = null;
  let entradasConTiempo = [];

  for (const profundidad of profundidadesUnicas) {
    // Filtrar entradas con esta profundidad
    const entradasConProfundidad = entradasProfundidad.filter(
      entry => entry.profundidad === profundidad
    );

    // Buscar tiempo >= tiempoDeFondo
    const candidatos = entradasConProfundidad.filter(
      entry => entry.tiempo >= tiempoDeFondo
    );

    if (candidatos.length > 0) {
      // Encontramos una profundidad con tiempo suficiente
      profundidadTabulada = profundidad;
      entradasConTiempo = candidatos;
      break;
    }
  }

  // Si no se encontró ninguna profundidad con tiempo suficiente
  if (!profundidadTabulada || entradasConTiempo.length === 0) {
    return { error: 'Inmersión fuera de tablas US Navy', errorType: 'OUT_OF_TABLES' };
  }

  // Obtener todas las entradas con la profundidad seleccionada para cálculos adicionales
  const entradasConProfundidad = entradasProfundidad.filter(
    entry => entry.profundidad === profundidadTabulada
  );

  // Primero buscar entrada con No/No/No
  const entradaSinDeco = entradasConTiempo.find(
    entry => entry['descompresión con aire'] === 'No' &&
             entry['descompresión con O2 en el agua'] === 'No' &&
             entry['descompresión en cámara'] === 'No'
  );

  if (entradaSinDeco) {
    // Obtener tiempo límite sin deco
    const tiempoLimiteSinDeco = Math.max(...entradasConProfundidad
      .filter(e => e['descompresión con aire'] === 'No' &&
                   e['descompresión con O2 en el agua'] === 'No' &&
                   e['descompresión en cámara'] === 'No')
      .map(e => e.tiempo));

    const resultado = {
      tabulacion: entradaSinDeco,
      profundidadTabulada,
      tiempoTabulado: entradaSinDeco.tiempo,
      modoDescompresion: 'Descompresión con aire',
      tipoInmersion: 'SIN_PARADAS',
      tiempoLimiteSinDeco,
      grupoBuceoSucesivoFinal: entradaSinDeco['Grupo de Buceo Sucesivo final'],
      tablaOriginal: entradaSinDeco['Tabla original'],
      exposicion: determinarExposicion(entradaSinDeco)
    };
    
    return resultado;
  }

  // Buscar con Si en el modo preferido
  const modoKey = getModoKey(modoDescompresion);
  const entradaConDeco = entradasConTiempo.find(entry => entry[modoKey] === 'Si');

  if (!entradaConDeco) {
    return { error: 'No se encontró entrada válida para el modo de descompresión', errorType: 'NO_MODE_FOUND' };
  }

  // Extraer paradas de descompresión
  const paradas = extraerParadas(entradaConDeco);

  const resultado = {
    tabulacion: entradaConDeco,
    profundidadTabulada,
    tiempoTabulado: entradaConDeco.tiempo,
    modoDescompresion: modoDescompresion,
    tipoInmersion: paradas.length > 0 ? 'CON_PARADAS' : 'SIN_PARADAS',
    paradas,
    grupoBuceoSucesivoFinal: entradaConDeco['Grupo de Buceo Sucesivo final'],
    tablaOriginal: entradaConDeco['Tabla original'],
    exposicion: determinarExposicion(entradaConDeco),
    periodosCamara: entradaConDeco['Periodos en cámara']
  };
  
  return resultado;
};

const getModoKey = (modo) => {
  const modoMap = {
    'aire': 'descompresión con aire',
    'o2': 'descompresión con O2 en el agua',
    'camara': 'descompresión en cámara'
  };
  return modoMap[modo] || 'descompresión con aire';
};

const getTipoInmersion = (modo) => {
  const tipoMap = {
    'aire': 'Buceo a nivel del mar con descompresión con aire en el agua',
    'o2': 'Buceo a nivel del mar con descompresión con O2 en el agua',
    'camara': 'Buceo a nivel del mar con descompresión en cámara'
  };
  return tipoMap[modo] || tipoMap['aire'];
};

const extraerParadas = (entrada) => {
  const profundidades = [39.6, 36.6, 33.5, 30.5, 27.4, 24.4, 21.3, 18.3, 15.2, 12.2, 9.1, 6.1];
  const paradas = [];

  profundidades.forEach(prof => {
    const key = `parada a ${prof}m de profundidad`;
    const duracion = entrada[key];
    if (duracion !== null && duracion !== undefined && duracion > 0) {
      paradas.push({
        profundidad: prof,
        duracion: duracion
      });
    }
  });

  return paradas;
};

const determinarExposicion = (entrada) => {
  const etiquetas = [
    'Descompresión con O2 en el agua o descompresion en camara recomendada',
    'Usar excepcionalmente la descompresion con aire, la descompresión con O2 en el agua o descompresion en camara es obligatoria',
    'Usar excepcionalmente descompresión con O2 en el agua, la descompresion en camara es obligatoria',
    'Exposición excepcional, la descompresion en camara obligatoria',
    'Exposición excepcional'
  ];

  for (const etiqueta of etiquetas) {
    if (entrada[etiqueta] === 'Si') {
      return etiqueta;
    }
  }

  return 'Normal';
};

const calcularTiemposAscenso = (resultado, profundidadMaximaCorregida) => {
  const velocidadAscenso = 9; // metros/minuto

  if (resultado.tipoInmersion === 'SIN_PARADAS') {
    const tiempoHastaSuperficieSegundos = Math.ceil((profundidadMaximaCorregida / velocidadAscenso) * 60);
    return {
      tiempoHastaSuperficie: formatearTiempo(tiempoHastaSuperficieSegundos),
      tiempoDescompresionTotal: formatearTiempo(tiempoHastaSuperficieSegundos)
    };
  } else {
    // Con paradas
    const paradas = resultado.paradas || [];
    if (paradas.length === 0) {
      const tiempoHastaSuperficieSegundos = Math.ceil((profundidadMaximaCorregida / velocidadAscenso) * 60);
      return {
        tiempoHastaSuperficie: formatearTiempo(tiempoHastaSuperficieSegundos),
        tiempoDescompresionTotal: formatearTiempo(tiempoHastaSuperficieSegundos)
      };
    }

    const primeraParada = paradas[0];
    const ultimaParada = paradas[paradas.length - 1];

    const tiempoHastaPrimeraParadaSegundos = Math.ceil(
      ((profundidadMaximaCorregida - primeraParada.profundidad) / velocidadAscenso) * 60
    );

    const tiempoDesdeUltimaParadaSegundos = Math.ceil(
      (ultimaParada.profundidad / velocidadAscenso) * 60
    );

    // Calcular tiempo total de paradas (en minutos)
    const tiempoTotalParadas = paradas.reduce((sum, parada) => sum + parada.duracion, 0);

    const tiempoDescompresionTotalSegundos = tiempoHastaPrimeraParadaSegundos + 
                                              (tiempoTotalParadas * 60) + 
                                              tiempoDesdeUltimaParadaSegundos;

    return {
      tiempoHastaPrimeraParada: formatearTiempo(tiempoHastaPrimeraParadaSegundos),
      tiempoDesdeUltimaParada: formatearTiempo(tiempoDesdeUltimaParadaSegundos),
      tiempoDescompresionTotal: formatearTiempo(tiempoDescompresionTotalSegundos),
      paradaConAscenso: paradas.map((p, index) => {
        if (index === 0) return null;
        const distancia = paradas[index - 1].profundidad - p.profundidad;
        const tiempoAscensoSegundos = (distancia / velocidadAscenso) * 60;
        return {
          ...p,
          tiempoAscensoDesdeAnterior: formatearTiempo(tiempoAscensoSegundos)
        };
      }).filter(p => p !== null)
    };
  }
};

const formatearTiempo = (segundos) => {
  const mins = Math.floor(segundos / 60);
  const secs = Math.floor(segundos % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const normalizarTiempoAltitud = (tiempo) => {
  if (!tiempo) return tiempo;
  
  // Si tiene formato hh:mm:ss, convertir a hh:mm
  const partes = tiempo.split(':');
  if (partes.length === 3) {
    // Formato hh:mm:ss -> hh:mm (sin cero inicial)
    const horas = parseInt(partes[0], 10);
    return `${horas}:${partes[1]}`;
  }
  
  // Si ya está en formato hh:mm, eliminar cero inicial
  if (partes.length === 2) {
    const horas = parseInt(partes[0], 10);
    return `${horas}:${partes[1]}`;
  }
  
  // Si no tiene formato reconocido, devolver tal cual
  return tiempo;
};

const obtenerTiemposAltitud = (grupo) => {
  const entrada = table4Data.find(e => e['Grupo de buceo sucesivo'] === grupo);
  
  if (!entrada) return [];

  const altitudes = [
    { altitud: '304,8m', valor: normalizarTiempoAltitud(entrada['304,8m']) },
    { altitud: '609,6m', valor: normalizarTiempoAltitud(entrada['609,6m']) },
    { altitud: '914,4m', valor: normalizarTiempoAltitud(entrada['914,4m']) },
    { altitud: '1219,2m', valor: normalizarTiempoAltitud(entrada['1219,2m']) },
    { altitud: '1524m', valor: normalizarTiempoAltitud(entrada['1524m']) },
    { altitud: '1828,8m', valor: normalizarTiempoAltitud(entrada['1828,8m']) },
    { altitud: '2133,6m', valor: normalizarTiempoAltitud(entrada['2133,6m']) },
    { altitud: '2438,4m', valor: normalizarTiempoAltitud(entrada['2438,4m']), nota: 'Opción en caso de vuelo comercial' },
    { altitud: '2743,2m', valor: normalizarTiempoAltitud(entrada['2743,2m']) },
    { altitud: '3048m', valor: normalizarTiempoAltitud(entrada['3048m']) }
  ];

  return altitudes;
};

export const calcularDuracionBuceo = (tiempoDeFondo, tiempoDescompresionTotal) => {
  // Convertir ambos tiempos a segundos y sumar
  let mins1, secs1;
  if (tiempoDeFondo.includes(':')) {
    [mins1, secs1] = tiempoDeFondo.split(':').map(Number);
  } else {
    mins1 = parseFloat(tiempoDeFondo);
    secs1 = 0;
  }
  
  const [mins2, secs2] = tiempoDescompresionTotal.split(':').map(Number);
  
  const totalSegundos = (mins1 * 60 + (secs1 || 0)) + (mins2 * 60 + (secs2 || 0));
  
  return formatearTiempo(totalSegundos);
};

// Funciones específicas para buceo con O2

const buscarEnTabla1ParaO2 = (profundidadMaximaCorregida, tiempoDeFondo) => {
  console.log(`DEBUG: Buscando en tabla para profundidad ${profundidadMaximaCorregida}m y tiempo ${tiempoDeFondo}min`);
  
  // Filtrar por profundidad >= profundidadMaximaCorregida
  const entradasProfundidad = table1Data.filter(
    entry => entry.profundidad >= profundidadMaximaCorregida
  );

  console.log(`DEBUG: Entradas con profundidad >= ${profundidadMaximaCorregida}m: ${entradasProfundidad.length}`);
  
  if (entradasProfundidad.length === 0) {
    return { error: 'No se encontró profundidad en las tablas', errorType: 'NO_DEPTH_FOUND' };
  }

  // Obtener la primera profundidad
  const profundidadTabulada = entradasProfundidad[0].profundidad;
  console.log(`DEBUG: Profundidad tabulada seleccionada: ${profundidadTabulada}m`);

  // Filtrar entradas con esa profundidad
  const entradasConProfundidad = entradasProfundidad.filter(
    entry => entry.profundidad === profundidadTabulada
  );

  console.log(`DEBUG: Entradas para profundidad ${profundidadTabulada}m: ${entradasConProfundidad.length}`);
  
  // Mostrar tiempos disponibles para debug
  const tiemposDisponibles = entradasConProfundidad.map(e => e.tiempo).sort((a, b) => a - b);
  console.log(`DEBUG: Tiempos disponibles para ${profundidadTabulada}m:`, tiemposDisponibles);

  // Buscar tiempo >= tiempoDeFondo
  const entradasConTiempo = entradasConProfundidad.filter(
    entry => entry.tiempo >= tiempoDeFondo
  );

  console.log(`DEBUG: Entradas con tiempo >= ${tiempoDeFondo}min: ${entradasConTiempo.length}`);

  // Si no se encuentra tiempo válido en esta profundidad, buscar en profundidades mayores
  if (entradasConTiempo.length === 0) {
    console.log(`DEBUG: No se encontró tiempo válido en ${profundidadTabulada}m. Buscando en profundidades mayores...`);
    
    // Obtener todas las profundidades mayores disponibles
    const profundidadesMayores = [...new Set(table1Data
      .filter(entry => entry.profundidad > profundidadTabulada)
      .map(entry => entry.profundidad))]
      .sort((a, b) => a - b);
    
    console.log(`DEBUG: Profundidades mayores disponibles:`, profundidadesMayores);
    
    // Intentar con cada profundidad mayor
    for (const profMayor of profundidadesMayores) {
      const entradasProfMayor = table1Data.filter(entry => entry.profundidad === profMayor);
      const entradasConTiempoMayor = entradasProfMayor.filter(entry => entry.tiempo >= tiempoDeFondo);
      
      console.log(`DEBUG: Buscando en ${profMayor}m: ${entradasConTiempoMayor.length} entradas con tiempo >= ${tiempoDeFondo}min`);
      
      if (entradasConTiempoMayor.length > 0) {
        // Verificar si hay entrada con O2=Si
        const entradaConO2Mayor = entradasConTiempoMayor.find(entry => entry['descompresión con O2 en el agua'] === 'Si');
        
        if (entradaConO2Mayor) {
          console.log(`DEBUG: ✓ Entrada encontrada en profundidad mayor ${profMayor}m con tiempo ${entradaConO2Mayor.tiempo}min`);
          
          // Extraer paradas
          const paradas = extraerParadas(entradaConO2Mayor);
          const paradasO2 = organizarParadasO2(paradas);
          const tieneParadas = paradas.length > 0;
          
          return {
            tabulacion: entradaConO2Mayor,
            profundidadTabulada: profMayor,
            tiempoTabulado: entradaConO2Mayor.tiempo,
            modoDescompresion: 'Descompresión con O2 en el agua',
            tipoInmersion: tieneParadas ? 'CON_PARADAS' : 'SIN_PARADAS',
            paradas,
            paradasO2,
            grupoBuceoSucesivoFinal: entradaConO2Mayor['Grupo de Buceo Sucesivo final'],
            tablaOriginal: entradaConO2Mayor['Tabla original'],
            exposicion: determinarExposicion(entradaConO2Mayor)
          };
        }
      }
    }
    
    // Si llegamos aquí, no se encontró en ninguna profundidad
    return { error: 'Inmersión fuera de tablas US Navy', errorType: 'OUT_OF_TABLES' };
  }

  // Primero buscar entrada con No/No/No
  const entradaSinDeco = entradasConTiempo.find(
    entry => entry['descompresión con aire'] === 'No' &&
             entry['descompresión con O2 en el agua'] === 'No' &&
             entry['descompresión en cámara'] === 'No'
  );

  if (entradaSinDeco) {
    // Obtener tiempo límite sin deco
    const tiempoLimiteSinDeco = Math.max(...entradasConProfundidad
      .filter(e => e['descompresión con aire'] === 'No' &&
                   e['descompresión con O2 en el agua'] === 'No' &&
                   e['descompresión en cámara'] === 'No')
      .map(e => e.tiempo));

    return {
      tabulacion: entradaSinDeco,
      profundidadTabulada,
      tiempoTabulado: entradaSinDeco.tiempo,
      modoDescompresion: 'Descompresión con O2 en el agua',
      tipoInmersion: 'SIN_PARADAS',
      tiempoLimiteSinDeco,
      grupoBuceoSucesivoFinal: entradaSinDeco['Grupo de Buceo Sucesivo final'],
      tablaOriginal: entradaSinDeco['Tabla original'],
      exposicion: determinarExposicion(entradaSinDeco)
    };
  }

  // Buscar con Si en descompresión con O2 en el agua
  const entradaConO2 = entradasConTiempo.find(
    entry => entry['descompresión con O2 en el agua'] === 'Si'
  );

  console.log(`DEBUG: Entrada con O2=Si encontrada:`, entradaConO2);

  if (!entradaConO2) {
    console.log(`DEBUG: No se encontró entrada con descompresión con O2 = Si`);
    return { error: 'Inmersión fuera de tablas US Navy', errorType: 'OUT_OF_TABLES' };
  }

  console.log(`DEBUG: Extrayendo paradas de la entrada...`);
  // Extraer paradas de descompresión
  const paradas = extraerParadas(entradaConO2);
  console.log(`DEBUG: Paradas extraídas:`, paradas);
  
  // Organizar paradas específicamente para O2
  const paradasO2 = organizarParadasO2(paradas);

  // Determinar si tiene paradas
  const tieneParadas = paradas.length > 0;

  return {
    tabulacion: entradaConO2,
    profundidadTabulada,
    tiempoTabulado: entradaConO2.tiempo,
    modoDescompresion: 'Descompresión con O2 en el agua',
    tipoInmersion: tieneParadas ? 'CON_PARADAS' : 'SIN_PARADAS',
    paradas,
    paradasO2,
    grupoBuceoSucesivoFinal: entradaConO2['Grupo de Buceo Sucesivo final'],
    tablaOriginal: entradaConO2['Tabla original'],
    exposicion: determinarExposicion(entradaConO2)
  };
};

const organizarParadasO2 = (paradas) => {
  if (!paradas || paradas.length === 0) return [];

  console.log('Paradas originales recibidas:', paradas);

  // Organizar paradas: todas respirando aire excepto 9.1m y 6.1m que son con O2
  const paradasOrganizadas = paradas.map(parada => ({
    ...parada,
    respirando: (parada.profundidad === 9.1 || parada.profundidad === 6.1) ? 'O2' : 'aire'
  }));

  console.log('Paradas organizadas:', paradasOrganizadas);

  // Calcular breaks de O2 según las reglas
  return calcularBreaksO2(paradasOrganizadas);
};

const calcularBreaksO2 = (paradas) => {
  let contadorO2 = 0; // En segundos acumulados de O2
  let runO2 = 0; // Segundos de O2 seguidos desde el último break
  const totalO2 = paradas.filter(p => p.respirando === 'O2').reduce((acc, p) => acc + p.duracion * 60, 0);
  const resultado = [];
  
  let primeraParadaO2 = true;
  
  // Determinar si hay paradas más profundas que 12.19m
  const paradaMasProfunda = Math.max(...paradas.map(p => p.profundidad));
  const hayParadasProfundas = paradaMasProfunda > 12.19;
  
  for (let i = 0; i < paradas.length; i++) {
    const parada = paradas[i];
    
    if (parada.respirando === 'aire') {
      // Parada respirando aire - siempre incluye "Ascenso y" excepto la primera
      const descripcion = i === 0
        ? `Parada a ${parada.profundidad}m`
        : `Ascenso y parada a ${parada.profundidad}m`;
      
      resultado.push({
        tipo: 'PARADA_AIRE',
        descripcion: descripcion,
        duracion: parada.duracion,
        profundidad: parada.profundidad,
        respirando: 'aire'
      });
    } else if (parada.respirando === 'O2') {
      // Si es la primera parada de O2, insertar ventilación
      if (primeraParadaO2) {
        // Regla simplificada: depende de si hay paradas más profundas que 12.19m
        const descripcionVentilacion = hayParadasProfundas
          ? 'Ascenso, ventilación y cambio a O2'
          : 'Ventilación y cambio a O2';
        
        resultado.push({
          tipo: 'VENTILACION',
          descripcion: descripcionVentilacion,
          duracion: 3, // 3 minutos
          profundidad: parada.profundidad
        });
        primeraParadaO2 = false;
      }
      
      // Regla del manual (Tabla 9-9, Rev 7): se respira O2 de forma continua mientras el tramo
      // completo (lo ya respirado + lo que queda por respirar) no pase de 35 min.
      // Si lo pasa, se respiran 30 min, break de 5 min con aire, y se vuelve a evaluar.
      // Equivale a: nº de breaks = 0 si O2 total <= 35 min; si no, ceil((total - 35) / 30).
      const LIMITE_SIN_BREAK = 35 * 60;
      const TRAMO_O2 = 30 * 60;
      const tramos = [];
      {
        let resto = parada.duracion * 60, run = runO2, consumido = contadorO2;
        while (resto > 0) {
          const sinMasBreaks = run + (totalO2 - consumido) <= LIMITE_SIN_BREAK;
          const t = sinMasBreaks ? resto : Math.min(resto, TRAMO_O2 - run);
          run += t; consumido += t; resto -= t;
          const hayBreak = !sinMasBreaks && run === TRAMO_O2 && consumido < totalO2;
          tramos.push({ segundos: t, hayBreak });
          if (hayBreak) run = 0;
        }
      }

      tramos.forEach((tr, k) => {
        const parteActual = k + 1;
        const varias = tramos.length > 1;
        let descripcionParada;
        if (parada.profundidad === 9.1 && hayParadasProfundas) {
          descripcionParada = varias ? `Parada a ${parada.profundidad}m (Parte ${parteActual})` : `Parada a ${parada.profundidad}m`;
        } else if (parteActual === 1) {
          const base = i === 0 ? `Parada a ${parada.profundidad}m` : `Ascenso y parada a ${parada.profundidad}m`;
          descripcionParada = varias ? `${base} (Parte ${parteActual})` : base;
        } else {
          descripcionParada = `Parada a ${parada.profundidad}m (Parte ${parteActual})`;
        }
        resultado.push({
          tipo: 'PARADA_O2',
          descripcion: descripcionParada,
          duracion: Math.round((tr.segundos / 60) * 100) / 100,
          duracionSegundos: tr.segundos,
          profundidad: parada.profundidad,
          respirando: 'O2'
        });
        contadorO2 += tr.segundos;
        runO2 = tr.hayBreak ? 0 : runO2 + tr.segundos;
        if (tr.hayBreak) {
          resultado.push({
            tipo: 'BREAK',
            descripcion: 'Break respirando aire',
            duracion: 5,
            profundidad: parada.profundidad,
            respirando: 'aire'
          });
        }
      });
    }
  }
  
  console.log('Resultado final de calcularBreaksO2:', resultado);
  return resultado;
};

const calcularTiemposAscensoO2 = (resultado, profundidadMaximaCorregida) => {
  const velocidadAscenso = 9; // metros/minuto

  if (resultado.tipoInmersion === 'SIN_PARADAS') {
    const tiempoHastaSuperficieSegundos = Math.ceil((profundidadMaximaCorregida / velocidadAscenso) * 60);
    return {
      tiempoHastaSuperficie: formatearTiempo(tiempoHastaSuperficieSegundos),
      tiempoDescompresionTotal: formatearTiempo(tiempoHastaSuperficieSegundos)
    };
  }
  
  // Con paradas - lógica específica para O2
  const paradasO2 = resultado.paradasO2 || [];
  const paradas = resultado.paradas || [];
  
  if (paradas.length === 0) {
    const tiempoHastaSuperficieSegundos = Math.ceil((profundidadMaximaCorregida / velocidadAscenso) * 60);
    return {
      tiempoHastaSuperficie: formatearTiempo(tiempoHastaSuperficieSegundos),
      tiempoDescompresionTotal: formatearTiempo(tiempoHastaSuperficieSegundos)
    };
  }

  const primeraParada = paradas[0];
  const ultimaParada = paradas[paradas.length - 1];

  const tiempoHastaPrimeraParadaSegundos = Math.ceil(
    ((profundidadMaximaCorregida - primeraParada.profundidad) / velocidadAscenso) * 60
  );

  const tiempoDesdeUltimaParadaSegundos = Math.ceil(
    (ultimaParada.profundidad / velocidadAscenso) * 60
  );

  // Calcular tiempo total incluyendo breaks y ventilación
  // La ventilación de 3 min NO cuenta en el total de ascenso con O2 (criterio del manual)
  const tiempoTotalParadasYBreaks = paradasO2.reduce((sum, elemento) => {
    if (elemento.tipo === 'VENTILACION') return sum;
    return sum + (elemento.duracion * 60); // Convertir a segundos
  }, 0);

  // Los tiempos de parada de la Tabla 9-9 ya incluyen el ascenso entre paradas (salvo hasta la primera),
  // igual que en la ruta de aire; sumarlo otra vez duplicaba ~20 s por tramo.
  // Única excepción (manual): el viaje hasta la primera parada de O2 sí se suma cuando vienen paradas de aire antes.
  let tiempoEntreParadas = 0;
  const iPrimeraO2 = paradas.findIndex(p => p.profundidad <= 9.1);
  if (iPrimeraO2 > 0) {
    const distancia = paradas[iPrimeraO2 - 1].profundidad - paradas[iPrimeraO2].profundidad;
    tiempoEntreParadas = (distancia / velocidadAscenso) * 60;
  }

  const tiempoDescompresionTotalSegundos = tiempoHastaPrimeraParadaSegundos + 
                                          tiempoTotalParadasYBreaks + 
                                          tiempoEntreParadas + 
                                          tiempoDesdeUltimaParadaSegundos;

  return {
    tiempoHastaPrimeraParada: formatearTiempo(tiempoHastaPrimeraParadaSegundos),
    tiempoDesdeUltimaParada: formatearTiempo(tiempoDesdeUltimaParadaSegundos),
    tiempoDescompresionTotal: formatearTiempo(tiempoDescompresionTotalSegundos),
    paradasConBreaks: paradasO2
  };
};

const calcularConsumoO2 = (paradasO2) => {
  if (!paradasO2 || paradasO2.length === 0) return { litros: 0, botella200atm: 0 };

  let tiempoTotal9_1m = 0;
  let tiempoTotal6_1m = 0;

  paradasO2.forEach(elemento => {
    if (elemento.respirando === 'O2') {
      if (elemento.profundidad === 9.1) {
        tiempoTotal9_1m += elemento.duracion;
      } else if (elemento.profundidad === 6.1) {
        tiempoTotal6_1m += elemento.duracion;
      }
    }
  });

  // Consumo aproximado de O2 = (Duración a 9.1m × 38.2) + (Duración a 6.1m × 32.2)
  const consumoLitros = (tiempoTotal9_1m * 38.2) + (tiempoTotal6_1m * 32.2);
  
  // Capacidad de botella a 200atm (redondeado hacia arriba)
  const botella200atm = Math.ceil(consumoLitros / 200);

  return {
    litros: Math.round(consumoLitros * 100) / 100, // Redondear a 2 decimales
    botella200atm,
    tiempos: {
      '9.1m': tiempoTotal9_1m,
      '6.1m': tiempoTotal6_1m
    }
  };
};

/**
 * Calcula consumo de O2 para buceos en altitud
 * Usa la presión real en altitud para calcular el consumo correcto
 * @param {number} palt - Factor de presión en altitud
 * @param {Array} paradasConBreaks - Paradas con breaks y profundidades convertidas
 */
const calcularConsumoO2Altitud = (palt, paradasConBreaks) => {
  if (!paradasConBreaks || paradasConBreaks.length === 0) return { litros: 0, botella200atm: 0 };

  const volumenRespiratorioBase = 20; // litros/minuto a nivel del mar
  let consumoTotal = 0;
  let tiemposDetallados = {};

  // Iterar sobre paradasConBreaks para calcular consumo según presión real
  paradasConBreaks.forEach(elemento => {
    if (elemento.respirando === 'O2' && elemento.profundidad && elemento.duracion) {
      // Calcular presión absoluta en altitud: Palt + (profundidad_real / 10)
      const presionAbsoluta = palt + (elemento.profundidad / 10);
      
      // Consumo = volumen_respiratorio_base × presión_absoluta × duración
      const consumoElemento = volumenRespiratorioBase * presionAbsoluta * elemento.duracion;
      consumoTotal += consumoElemento;
      
      // Registrar tiempos por profundidad para referencia
      const profKey = `${elemento.profundidad}m`;
      if (!tiemposDetallados[profKey]) {
        tiemposDetallados[profKey] = 0;
      }
      tiemposDetallados[profKey] += elemento.duracion;
    }
  });

  // Capacidad de botella a 200atm (redondeado hacia arriba)
  const botella200atm = Math.ceil(consumoTotal / 200);

  return {
    litros: Math.round(consumoTotal * 100) / 100,
    botella200atm,
    tiempos: tiemposDetallados
  };
};


// ============================================
// FUNCIONES PARA BUCEOS EN ALTITUD
// ============================================

/**
 * Calcula Palt y profundidad equivalente para buceos en altitud
 */
const calcularProfundidadEquivalente = (profundidadCorregida, altitud) => {
  // Palt = (1 - (0.0065 × P4) / 288.15)^5.255
  const palt = Math.pow((1 - (0.0065 * altitud) / 288.15), 5.255);
  
  // Profundidad Equivalente = Profundidad Corregida × (1/Palt)
  const profundidadEquivalente = profundidadCorregida * (1 / palt);
  
  // Palt a 5 decimales; Profundidad Equivalente a 2 decimales (redondeada hacia arriba)
  return {
    palt: Math.round(palt * 100000) / 100000,
    // Siempre hacia ARRIBA (valor más restrictivo); el 1e-6 evita que el ruido de coma flotante suba un escalón de más
    profundidadEquivalente: Math.ceil(profundidadEquivalente * 100 - 1e-6) / 100
  };
};

/**
 * Convierte profundidades de tabla a profundidades reales en altitud
 * Guarda tanto la profundidad original como la convertida
 */
const convertirProfundidadesParadas = (paradas, palt) => {
  if (!paradas) return paradas;
  
  return paradas.map(parada => ({
    ...parada,
    profundidadOriginal: parada.profundidad, // Guardar profundidad original de tabla
    profundidad: Math.round(parada.profundidad * palt * 100) / 100 // Profundidad convertida
  }));
};

/**
 * Convierte paradas con breaks a profundidades reales en altitud
 */
const convertirParadasConBreaks = (paradasConBreaks, palt) => {
  if (!paradasConBreaks) return paradasConBreaks;
  
  return paradasConBreaks.map(elemento => {
    const nuevaProfundidad = elemento.profundidad 
      ? Math.round(elemento.profundidad * palt * 100) / 100 
      : elemento.profundidad;
    
    // Actualizar también la descripción si contiene una profundidad
    let nuevaDescripcion = elemento.descripcion;
    if (elemento.profundidad && nuevaDescripcion) {
      // Buscar patrones como "a 6.1m" o "a 9.1m" y reemplazar con la profundidad convertida
      const profundidadOriginal = Math.round(elemento.profundidad / palt * 100) / 100;
      nuevaDescripcion = nuevaDescripcion.replace(
        new RegExp(`a ${profundidadOriginal}m`, 'g'),
        `a ${nuevaProfundidad}m`
      );
    }
    
    return {
      ...elemento,
      profundidad: nuevaProfundidad,
      descripcion: nuevaDescripcion
    };
  });
};

// Función para buceo con aire en altitud
const calculateAltitudeAirDecompression = (formData) => {
  // Paso 1: Profundidad
  const profundidad = parseFloat(formData.p2);
  const altitud = parseFloat(formData.p4);

  // Paso 2: Profundidad Máxima Corregida
  let profundidadMaximaCorregida = profundidad;
  
  if (formData.p2_1 === 'neumatico') {
    // Profundímetro neumático usa misma corrección que nivel del mar
    if (profundidad >= 0 && profundidad <= 30.43) {
      profundidadMaximaCorregida = profundidad + 0.30;
    } else if (profundidad > 30.43 && profundidad <= 60.86) {
      profundidadMaximaCorregida = profundidad + 0.61;
    } else if (profundidad > 60.86 && profundidad <= 91.30) {
      profundidadMaximaCorregida = profundidad + 1.22;
    } else if (profundidad > 91.30 && profundidad <= 121.73) {
      profundidadMaximaCorregida = profundidad + 2.13;
    }
  } else if (formData.p2_1 === 'ordenador' && formData.p4_1 === 'no') {
    // Ordenador en altitud con P4.1 = "no" aplica corrección especial
    const correccion = Math.floor(altitud / 304.8) * 0.3;
    profundidadMaximaCorregida = profundidad + correccion;
  }

  // Verificar si está fuera de tablas
  if (profundidadMaximaCorregida > 91.4) {
    return {
      error: 'Inmersión fuera de tablas',
      errorType: 'OUT_OF_TABLES'
    };
  }

  // Paso 3: Calcular Palt y Profundidad Equivalente
  const { palt, profundidadEquivalente } = calcularProfundidadEquivalente(profundidadMaximaCorregida, altitud);

  // Verificar profundidad equivalente
  if (profundidadEquivalente > 91.4) {
    return {
      error: 'Inmersión fuera de tablas',
      errorType: 'OUT_OF_TABLES'
    };
  }

  // Paso 4: Parsear P3 (tiempo de fondo)
  let tiempoDeFondoMinutos;
  if (formData.p3.includes(':')) {
    const [minutes, seconds] = formData.p3.split(':').map(Number);
    tiempoDeFondoMinutos = minutes + (seconds / 60);
  } else {
    tiempoDeFondoMinutos = parseFloat(formData.p3);
  }

  console.log(`DEBUG: Tiempo de fondo parseado: ${formData.p3} -> ${tiempoDeFondoMinutos} minutos`);

  // Paso 5: Buscar en tabla 1 usando profundidad equivalente
  const resultado = buscarEnTabla1(profundidadEquivalente, tiempoDeFondoMinutos, formData.p1);

  if (resultado.error) {
    return resultado;
  }

  // Paso 6: Convertir profundidades de paradas a reales
  const paradasReales = convertirProfundidadesParadas(resultado.paradas, palt);

  // Paso 7: Calcular tiempos de ascenso con profundidades reales
  const tiemposAscenso = calcularTiemposAscenso(
    { ...resultado, paradas: paradasReales }, 
    profundidadMaximaCorregida
  );

  // Paso 8: Obtener tiempos mínimos para ascender a altitud
  const tiemposAltitud = obtenerTiemposAltitud(resultado.grupoBuceoSucesivoFinal);

  // Calcular duración del buceo
  const duracionBuceo = calcularDuracionBuceo(formData.p3, tiemposAscenso.tiempoDescompresionTotal);

  return {
    ...resultado,
    profundidad,
    profundidadMaximaCorregida,
    profundidadEquivalente,
    palt,
    tiempoDeFondo: formData.p3,
    tiempoDeFondoMinutos,
    ...tiemposAscenso,
    tiemposAltitud,
    tipoInmersion: resultado.tipoInmersion === 'SIN_PARADAS' 
      ? 'SIN_PARADAS' 
      : 'Buceo en altitud con descompresión con aire en el agua',
    duracionBuceo,
    paradas: paradasReales,
    altitud
  };
};

// Función para buceo con O2 en altitud
const calculateAltitudeO2Decompression = (formData) => {
  // Paso 1: Profundidad
  const profundidad = parseFloat(formData.p2);
  const altitud = parseFloat(formData.p4);

  // Paso 2: Profundidad Máxima Corregida
  let profundidadMaximaCorregida = profundidad;
  
  if (formData.p2_1 === 'neumatico') {
    if (profundidad >= 0 && profundidad <= 30.43) {
      profundidadMaximaCorregida = profundidad + 0.30;
    } else if (profundidad > 30.43 && profundidad <= 60.86) {
      profundidadMaximaCorregida = profundidad + 0.61;
    } else if (profundidad > 60.86 && profundidad <= 91.30) {
      profundidadMaximaCorregida = profundidad + 1.22;
    } else if (profundidad > 91.30 && profundidad <= 121.73) {
      profundidadMaximaCorregida = profundidad + 2.13;
    }
  } else if (formData.p2_1 === 'ordenador' && formData.p4_1 === 'no') {
    const correccion = Math.floor(altitud / 304.8) * 0.3;
    profundidadMaximaCorregida = profundidad + correccion;
  }

  if (profundidadMaximaCorregida > 91.4) {
    return {
      error: 'Inmersión fuera de tablas',
      errorType: 'OUT_OF_TABLES'
    };
  }

  // Paso 3: Calcular Palt y Profundidad Equivalente
  const { palt, profundidadEquivalente } = calcularProfundidadEquivalente(profundidadMaximaCorregida, altitud);

  if (profundidadEquivalente > 91.4) {
    return {
      error: 'Inmersión fuera de tablas',
      errorType: 'OUT_OF_TABLES'
    };
  }

  // Paso 4: Parsear P3
  let tiempoDeFondoMinutos;
  if (formData.p3.includes(':')) {
    const [minutes, seconds] = formData.p3.split(':').map(Number);
    tiempoDeFondoMinutos = minutes + (seconds / 60);
  } else {
    tiempoDeFondoMinutos = parseFloat(formData.p3);
  }

  // Paso 5: Buscar en tabla para O2 usando profundidad equivalente
  const resultado = buscarEnTabla1ParaO2(profundidadEquivalente, tiempoDeFondoMinutos);

  if (resultado.error) {
    return resultado;
  }

  // Paso 6: Convertir profundidades a reales
  const paradasO2Reales = convertirProfundidadesParadas(resultado.paradasO2, palt);
  const paradasReales = convertirProfundidadesParadas(resultado.paradas, palt);

  // Paso 7: Calcular tiempos de ascenso O2 con profundidades reales
  const tiemposAscenso = calcularTiemposAscensoO2(
    { ...resultado, paradasO2: paradasO2Reales, paradas: paradasReales },
    profundidadMaximaCorregida,
    formData.p3
  );

  // Paso 7b: Actualizar descripciones con profundidades convertidas para TODAS las paradas
  if (tiemposAscenso.paradasConBreaks) {
    tiemposAscenso.paradasConBreaks = tiemposAscenso.paradasConBreaks.map(elemento => {
      if (elemento.profundidad && elemento.descripcion) {
        // Calcular profundidad original (antes de conversión)
        const profundidadOriginal = Math.round((elemento.profundidad / palt) * 10) / 10;
        
        // Reemplazar cualquier mención de "a [profundidad_original]m" con "a [profundidad_convertida]m"
        let nuevaDescripcion = elemento.descripcion.replace(
          new RegExp(`a ${profundidadOriginal}m`, 'g'),
          `a ${elemento.profundidad}m`
        );
        
        return { ...elemento, descripcion: nuevaDescripcion };
      }
      return elemento;
    });
  }

  // Paso 8: Tiempos altitud
  const tiemposAltitud = obtenerTiemposAltitud(resultado.grupoBuceoSucesivoFinal);

  // Calcular duración buceo
  const duracionBuceo = calcularDuracionBuceo(formData.p3, tiemposAscenso.tiempoDescompresionTotal);

  // Calcular consumo O2 con presión real en altitud
  const consumoO2 = calcularConsumoO2Altitud(palt, tiemposAscenso.paradasConBreaks);

  return {
    ...resultado,
    profundidad,
    profundidadMaximaCorregida,
    profundidadEquivalente,
    palt,
    tiempoDeFondo: formData.p3,
    tiempoDeFondoMinutos,
    ...tiemposAscenso,
    tiemposAltitud,
    tipoInmersion: resultado.tipoInmersion === 'SIN_PARADAS' 
      ? 'SIN_PARADAS' 
      : 'Buceo en altitud con descompresión con O2 en el agua',
    duracionBuceo,
    consumoO2,
    tipoCalculoEspecifico: 'ALTITUDE_O2',
    paradas: paradasO2Reales,
    paradasO2: paradasO2Reales,
    altitud
  };
};