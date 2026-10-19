import html2pdf from 'html2pdf.js';

// Función para convertir transliteración ASCII
const transliterarASCII = (texto) => {
  const map = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N',
    'ü': 'u', 'Ü': 'U'
  };
  
  return texto.split('').map(char => map[char] || char).join('');
};

// Función para limpiar el nombre del buzo para usar como nombre de archivo
const limpiarNombreBuzo = (nombre) => {
  if (!nombre) return 'SinNombre';
  
  // Transliterar caracteres especiales
  const nombreLimpio = transliterarASCII(nombre)
    .replace(/\s+/g, '') // Remover todos los espacios
    .replace(/[^a-zA-Z0-9]/g, '') // Remover caracteres especiales
    .trim();
  
  return nombreLimpio || 'SinNombre';
};

// Generar ID único
const generarID = (fecha, proyecto, horaLlegada) => {
  // Convertir fecha dd/mm/yyyy o yyyy-mm-dd a yyyymmdd
  let fechaParts;
  if (fecha.includes('/')) {
    fechaParts = fecha.split('/');
    fecha = `${fechaParts[2]}${fechaParts[1]}${fechaParts[0]}`;
  } else {
    fecha = fecha.replace(/-/g, '');
  }

  // Primeras 4 letras del proyecto (transliterado y mayúsculas)
  const proyectoASCII = transliterarASCII(proyecto || '');
  let proyectoCode = proyectoASCII.substring(0, 4).toUpperCase();
  // Rellenar con x si faltan caracteres
  proyectoCode = proyectoCode.padEnd(4, 'X');

  // Hora hhmm
  const horaCode = horaLlegada.replace(':', '');

  // Combinar y eliminar espacios
  return `${fecha}${proyectoCode}${horaCode}`.replace(/\s/g, '');
};

// Obtener el nombre del modo de profundímetro
const getTipoProfundimetro = (p2_1) => {
  if (p2_1 === 'neumatico') return 'Profundímetro neumático';
  if (p2_1 === 'ordenador') return 'Ordenador / profundímetro del buzo';
  return '';
};

// Formatear fecha de yyyy-mm-dd a dd/mm/yyyy
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
};

export const generateDiverLogPDF = async (cuestionarioData, resultados, formData, p7DuracionCambio = null) => {
  try {
    // Cargar el HTML template
    const response = await fetch('/Hoja_de_Inmersion_.html');
    let htmlContent = await response.text();

    // Generar el ID
    const id = generarID(cuestionarioData.c3, cuestionarioData.c2, cuestionarioData.c10);

    // Formatear fecha
    const fechaFormateada = formatearFecha(cuestionarioData.c3);

    // Construir tabla original con profundidad y tiempo tabulado
    const tablaOriginal = `${resultados.tablaOriginal || ''} (Prof. tab: ${resultados.profundidadTabulada}m, Tiempo tab: ${resultados.tiempoTabulado} min)`;

    // Determinar tipo de profundímetro
    const tipoProfundimetro = getTipoProfundimetro(formData.p2_1);

    // Preparar los datos de las paradas
    const paradasData = {};
    const profundidadesParadas = [39.6, 36.6, 33.5, 30.5, 27.4, 24.4, 21.3, 18.3, 15.2, 12.2, 9.1, 6.1];
    
    const esO2 = resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2';
    const esAltitud = resultados.paradas && resultados.paradas.length > 0 && resultados.paradas[0].profundidadOriginal !== undefined;
    
    if (esO2 && resultados.paradasConBreaks) {
      // Para O2: usar paradasConBreaks y sumar todas las partes + contar breaks
      const paradaPorProfundidad = {};
      
      // PRIMERO: Agregar paradas de AIRE desde resultados.paradas
      if (resultados.paradas) {
        resultados.paradas.forEach(parada => {
          if (parada.respirando === 'aire') {
            const profKey = esAltitud && parada.profundidadOriginal 
              ? parada.profundidadOriginal 
              : parada.profundidad;
            
            if (!paradaPorProfundidad[profKey]) {
              paradaPorProfundidad[profKey] = { duracionTotal: 0, breaks: 0 };
            }
            
            paradaPorProfundidad[profKey].duracionTotal += parada.duracion;
          }
        });
      }
      
      // SEGUNDO: Agregar paradas de O2 y breaks desde paradasConBreaks
      resultados.paradasConBreaks.forEach(elemento => {
        if (elemento.tipo === 'PARADA_O2' && elemento.profundidad) {
          // Determinar profundidad original (para altitud) o usar directamente
          const profKey = esAltitud && resultados.paradas 
            ? resultados.paradas.find(p => Math.abs(p.profundidad - elemento.profundidad) < 0.5)?.profundidadOriginal || elemento.profundidad
            : elemento.profundidad;
          
          if (!paradaPorProfundidad[profKey]) {
            paradaPorProfundidad[profKey] = { duracionTotal: 0, breaks: 0 };
          }
          
          paradaPorProfundidad[profKey].duracionTotal += elemento.duracion;
        } else if (elemento.tipo === 'BREAK' && elemento.profundidad) {
          // Contar breaks por profundidad
          const profKey = esAltitud && resultados.paradas 
            ? resultados.paradas.find(p => Math.abs(p.profundidad - elemento.profundidad) < 0.5)?.profundidadOriginal || elemento.profundidad
            : elemento.profundidad;
          
          if (!paradaPorProfundidad[profKey]) {
            paradaPorProfundidad[profKey] = { duracionTotal: 0, breaks: 0 };
          }
          
          paradaPorProfundidad[profKey].breaks += 1;
        }
      });
      
      // Formatear datos
      Object.keys(paradaPorProfundidad).forEach(prof => {
        const data = paradaPorProfundidad[prof];
        const duracionRedondeada = Math.round(data.duracionTotal);
        
        if (data.breaks > 0) {
          const breakText = data.breaks === 1 ? 'break' : 'breaks';
          paradasData[parseFloat(prof)] = `${duracionRedondeada} min + ${data.breaks} ${breakText} de 5 min`;
        } else {
          paradasData[parseFloat(prof)] = `${duracionRedondeada} min`;
        }
      });
      
    } else if (esAltitud) {
      // En altitud sin O2: usar profundidadOriginal guardada durante el cálculo
      resultados.paradas.forEach(parada => {
        if (parada.profundidadOriginal) {
          paradasData[parada.profundidadOriginal] = parada.duracion;
        }
      });
    } else {
      // A nivel del mar sin O2: mapeo directo por profundidad
      profundidadesParadas.forEach(prof => {
        const parada = resultados.paradas?.find(p => p.profundidad === prof);
        paradasData[prof] = parada ? parada.duracion : null;
      });
    }

    // Función para convertir duración a segundos
    const duracionASegundos = (duracionStr) => {
      if (!duracionStr) return 0;
      
      if (typeof duracionStr === 'number') {
        return duracionStr * 60; // Asumimos que es en minutos
      }
      
      if (duracionStr.includes(':')) {
        const [mins, secs] = duracionStr.split(':').map(Number);
        return (mins * 60 + (secs || 0));
      } else {
        return parseFloat(duracionStr) * 60; // Asumimos minutos
      }
    };

    // Verificar si la primera parada es de O2 (6.1m o 9.1m o sus equivalentes en altitud)
    const primeraParadaEsO2 = () => {
      const esO2 = resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2';
      if (!esO2 || !resultados.paradas || resultados.paradas.length === 0) {
        return false;
      }
      const primeraParada = resultados.paradas[0];
      
      // Para nivel del mar, verificar exactamente 9.1m o 6.1m
      if (resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2') {
        return primeraParada.profundidad === 9.1 || primeraParada.profundidad === 6.1;
      }
      
      // Para altitud, verificar si está cerca de los equivalentes de 9.1m o 6.1m
      // Las paradas de O2 en altitud estarían entre 7-9m (para 9.1m) o 5-6.5m (para 6.1m)
      return (primeraParada.profundidad >= 7 && primeraParada.profundidad <= 9.5) ||
             (primeraParada.profundidad >= 5 && primeraParada.profundidad <= 6.5);
    };

    // Calcular tiempo exacto para PDF (solo sumando temporizadores visibles en pantalla)
    const calcularTiempoExactoParaPDF = () => {
      let totalSegundos = 0;
      const esO2 = resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2';
      const esSinParadas = resultados.tipoInmersion === 'SIN_PARADAS';
      
      if (esO2) {
        // Para SIN_PARADAS: usar directamente el tiempoHastaSuperficie
        if (esSinParadas) {
          const partes = resultados.tiempoHastaSuperficie.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos = mins * 60 + secs;
        } else {
          // Para CON_PARADAS: sumar todos los componentes
          // 1. Tiempo hasta primera parada - SIEMPRE se suma
          if (resultados.tiempoHastaPrimeraParada) {
            const partes = resultados.tiempoHastaPrimeraParada.split(':');
            const mins = parseInt(partes[0]) || 0;
            const secs = parseInt(partes[1]) || 0;
            totalSegundos += (mins * 60 + secs);
          }
          
          // 2. Paradas y breaks (omitir ventilación)
          if (resultados.paradasConBreaks) {
            resultados.paradasConBreaks.forEach(elemento => {
              if (elemento.tipo !== 'VENTILACION') {
                const duracionFloat = parseFloat(elemento.duracion);
                totalSegundos += (duracionFloat * 60);
              }
            });
          }
          
          // 3. Tiempo desde última parada
          if (resultados.tiempoDesdeUltimaParada) {
            const partes = resultados.tiempoDesdeUltimaParada.split(':');
            const mins = parseInt(partes[0]) || 0;
            const secs = parseInt(partes[1]) || 0;
            totalSegundos += (mins * 60 + secs);
          }
          
          // 4. P7 (duración real del cambio) - SOLO para CON_PARADAS
          if (p7DuracionCambio && p7DuracionCambio.includes(':')) {
            const partes = p7DuracionCambio.split(':');
            const mins = parseInt(partes[0]) || 0;
            const secs = parseInt(partes[1]) || 0;
            totalSegundos += (mins * 60 + secs);
          }
        }
        
      } else {
        // Para aire: usar tiempo original
        const partes = resultados.tiempoDescompresionTotal.split(':');
        const mins = parseInt(partes[0]) || 0;
        const secs = parseInt(partes[1]) || 0;
        totalSegundos = mins * 60 + secs;
      }
      
      const mins = Math.floor(totalSegundos / 60);
      const secs = totalSegundos % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const tiempoDescompresionExacto = calcularTiempoExactoParaPDF();

    // Determinar label para tiempo de descompresión
    const labelTiempoDescompresion = resultados.tipoInmersion === 'SIN_PARADAS' 
      ? 'Tiempo de ascenso:' 
      : 'Tiempo de descompresión total:';

    // Calcular duración total del buceo: P3 + todos los temporizadores + P7 (si O2)
    const calcularDuracionTotalBuceo = () => {
      let totalSegundos = 0;
      const esO2 = resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2';
      const esSinParadas = resultados.tipoInmersion === 'SIN_PARADAS';
      
      // 1. Sumar P3 (tiempo de fondo)
      if (resultados.tiempoDeFondo) {
        const partes = resultados.tiempoDeFondo.split(':');
        const mins = parseInt(partes[0]) || 0;
        const secs = parseInt(partes[1]) || 0;
        totalSegundos += (mins * 60 + secs);
      }
      
      // 2. Si es SIN PARADAS: simplemente sumar P3 + Tiempo de Descompresión Total
      if (esSinParadas) {
        if (resultados.tiempoHastaSuperficie) {
          const partes = resultados.tiempoHastaSuperficie.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos += (mins * 60 + secs);
        }
      } else if (esO2) {
        // Para O2 CON PARADAS: tiempo hasta primera parada - SIEMPRE se suma
        if (resultados.tiempoHastaPrimeraParada) {
          const partes = resultados.tiempoHastaPrimeraParada.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos += (mins * 60 + secs);
        }
        
        // Paradas y breaks (omitir ventilación porque será reemplazada por P7)
        if (resultados.paradasConBreaks) {
          resultados.paradasConBreaks.forEach(elemento => {
            if (elemento.tipo !== 'VENTILACION') {
              const duracionFloat = parseFloat(elemento.duracion);
              totalSegundos += (duracionFloat * 60);
            }
          });
        }
        
        // Tiempo desde última parada
        if (resultados.tiempoDesdeUltimaParada) {
          const partes = resultados.tiempoDesdeUltimaParada.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos += (mins * 60 + secs);
        }
        
        // P7 (duración real del cambio)
        if (p7DuracionCambio && p7DuracionCambio.includes(':')) {
          const partes = p7DuracionCambio.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos += (mins * 60 + secs);
        }
      } else {
        // Para Aire CON PARADAS: tiempo hasta primera parada
        if (resultados.tiempoHastaPrimeraParada) {
          const partes = resultados.tiempoHastaPrimeraParada.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos += (mins * 60 + secs);
        }
        
        // Paradas
        if (resultados.paradas) {
          resultados.paradas.forEach(parada => {
            totalSegundos += (parada.duracion * 60);
          });
        }
        
        // Tiempo desde última parada o hasta superficie
        if (resultados.tiempoDesdeUltimaParada) {
          const partes = resultados.tiempoDesdeUltimaParada.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos += (mins * 60 + secs);
        } else if (resultados.tiempoHastaSuperficie) {
          const partes = resultados.tiempoHastaSuperficie.split(':');
          const mins = parseInt(partes[0]) || 0;
          const secs = parseInt(partes[1]) || 0;
          totalSegundos += (mins * 60 + secs);
        }
      }
      
      const mins = Math.floor(totalSegundos / 60);
      const secs = totalSegundos % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const duracionTotalBuceo = calcularDuracionTotalBuceo();

    // Reemplazar los valores en ambas páginas
    // Función auxiliar para reemplazar en ambas páginas
    const reemplazarEnAmbasPaginas = (campo, valor, ocultar = false) => {
      if (ocultar) {
        // Ocultar el campo completo
        const regex = new RegExp(`<div class="field"[^>]*>\\s*<div class="label">${campo}</div>\\s*<div class="value[^"]*">[^<]*</div>\\s*</div>`, 'g');
        htmlContent = htmlContent.replace(regex, '');
      } else {
        // Reemplazar el valor (incluyendo posibles clases adicionales como "notes")
        const regex = new RegExp(`(<div class="label">${campo}</div>\\s*<div class="value[^"]*">)[^<]*(</div>)`, 'g');
        htmlContent = htmlContent.replace(regex, `$1${valor}$2`);
      }
    };

    // Campos del header (aparecen en ambas páginas)
    reemplazarEnAmbasPaginas('Empresa', cuestionarioData.c1);
    reemplazarEnAmbasPaginas('Proyecto', cuestionarioData.c2);
    reemplazarEnAmbasPaginas('ID', id);
    reemplazarEnAmbasPaginas('Fecha', fechaFormateada);
    reemplazarEnAmbasPaginas('Ubicación', cuestionarioData.c4);
    reemplazarEnAmbasPaginas('Altitud', `${formData.p4 || 0}m`);
    reemplazarEnAmbasPaginas('Buzo principal', cuestionarioData.c5);
    reemplazarEnAmbasPaginas('Buzo standby', cuestionarioData.c6);

    // Datos técnicos (solo página 1)
    reemplazarEnAmbasPaginas('Tabla original', tablaOriginal);
    reemplazarEnAmbasPaginas('Tenders / asistentes', cuestionarioData.c7);
    reemplazarEnAmbasPaginas('Casco / mascarón utilizado', cuestionarioData.c11);
    reemplazarEnAmbasPaginas('Finalidad de la inmersión', cuestionarioData.c8);
    reemplazarEnAmbasPaginas('Tipo de profundímetro', tipoProfundimetro);
    reemplazarEnAmbasPaginas('Lectura de profundidad', `${formData.p2}m`);
    reemplazarEnAmbasPaginas('Hora que abandona superficie', cuestionarioData.c9);
    reemplazarEnAmbasPaginas('Hora que llega a superficie', cuestionarioData.c10);
    reemplazarEnAmbasPaginas('Profundidad Máxima Corregida', `${resultados.profundidadMaximaCorregida.toFixed(2)}m`);
    
    // Ocultar campos de buceo repetitivo (para este tipo de buceo)
    reemplazarEnAmbasPaginas('Profundidad del buceo anterior', '', true);
    
    // Profundidad equivalente - solo para buceos en altitud
    if (resultados.profundidadEquivalente) {
      reemplazarEnAmbasPaginas('Profundidad equivalente a nivel del mar', `${resultados.profundidadEquivalente.toFixed(2)}m`);
    } else {
      reemplazarEnAmbasPaginas('Profundidad equivalente a nivel del mar', '', true);
    }
    
    reemplazarEnAmbasPaginas('Hora que llega a altitud', '', true);
    
    reemplazarEnAmbasPaginas('Duración total del buceo', duracionTotalBuceo);
    
    reemplazarEnAmbasPaginas('Tiempo de fondo del buceo anterior', '', true);
    reemplazarEnAmbasPaginas('Intervalo en superficie', '', true);
    reemplazarEnAmbasPaginas('Tiempo de fondo', formData.p3);
    
    // Rellenar también el nuevo campo TIEMPO DE FONDO usando su id
    htmlContent = htmlContent.replace(
      /<div class="value" id="tiempoFondo"><\/div>/g,
      `<div class="value" id="tiempoFondo">${formData.p3}</div>`
    );
    
    reemplazarEnAmbasPaginas('Grupo de buceo sucesivo de la inmersión anterior', '', true);
    reemplazarEnAmbasPaginas('Grupo de buceo sucesivo al final del intervalo en superficie', '', true);
    
    reemplazarEnAmbasPaginas('Tipo de inmersión', resultados.tipoInmersion);
    reemplazarEnAmbasPaginas('Nº de periodos', '', true);
    reemplazarEnAmbasPaginas('Penalización', '', true);
    reemplazarEnAmbasPaginas('Tiempo de nitrógeno residual', '', true);
    reemplazarEnAmbasPaginas('Sistema utilizado', 'Suministro de superficie');
    
    // Reemplazar el label y valor de tiempo de descompresión
    const regexTiempoDescompresion = new RegExp('(<div class="label">)Tiempo de descompresión total(<\\/div>\\s*<div class="value">)[^<]*(</div>)', 'g');
    htmlContent = htmlContent.replace(
      regexTiempoDescompresion,
      '$1' + labelTiempoDescompresion + '$2' + tiempoDescompresionExacto + '$3'
    );
    
    reemplazarEnAmbasPaginas('Mezcla de gases', 'Aire');

    // Paradas (página 2)
    if (esAltitud) {
      // En altitud: primero cambiar TODOS los labels de profundidades originales a equivalentes
      resultados.paradas.forEach(parada => {
        if (parada.profundidadOriginal && parada.profundidad) {
          const labelOriginal = `Parada a ${parada.profundidadOriginal.toString().replace('.', ',')} m →`;
          const labelEquivalente = `Parada a ${parada.profundidad.toString().replace('.', ',')} m →`;
          
          // Reemplazar el label en el HTML
          const regex = new RegExp(labelOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          htmlContent = htmlContent.replace(regex, labelEquivalente);
        }
      });
      
      // Ahora rellenar valores y ocultar los que no tienen parada
      profundidadesParadas.forEach(prof => {
        const valor = paradasData[prof];
        const parada = resultados.paradas?.find(p => p.profundidadOriginal === prof);
        if (parada && valor) {
          // Rellenar con la profundidad equivalente
          const campoEquivalente = `Parada a ${parada.profundidad.toString().replace('.', ',')} m →`;
          // Si valor es string (ya formateado), usarlo directo; si es número, agregar " min"
          const valorFormateado = typeof valor === 'string' ? valor : `${valor} min`;
          reemplazarEnAmbasPaginas(campoEquivalente, valorFormateado);
        } else {
          // Ocultar el campo original que no tiene parada
          const campoOriginal = `Parada a ${prof.toString().replace('.', ',')} m →`;
          reemplazarEnAmbasPaginas(campoOriginal, '', true);
        }
      });
    } else {
      // A nivel del mar: usar el campo original
      profundidadesParadas.forEach(prof => {
        const valor = paradasData[prof];
        const campo = `Parada a ${prof.toString().replace('.', ',')} m →`;
        if (valor === null || valor === undefined) {
          reemplazarEnAmbasPaginas(campo, '', true);
        } else {
          // Si valor es string (ya formateado), usarlo directo; si es número, agregar " min"
          const valorFormateado = typeof valor === 'string' ? valor : `${valor} min`;
          reemplazarEnAmbasPaginas(campo, valorFormateado);
        }
      });
    }

    // Ocultar campos de cámara y transición
    reemplazarEnAmbasPaginas('Transición 12,2 m \\(agua\\) → superficie → cámara 15,2 m', '', true);
    reemplazarEnAmbasPaginas('Cámara a 15,2 m', '', true);
    reemplazarEnAmbasPaginas('Cámara a 12,2 m', '', true);
    reemplazarEnAmbasPaginas('Cámara a 9,1 m', '', true);

    // Grupo de buceo sucesivo final
    let grupoBuceoTexto = resultados.grupoBuceoSucesivoFinal;
    if (resultados.grupoBuceoSucesivoFinal === '**') {
      grupoBuceoTexto = 'Buceo sucesivo no permitido - 18h intervalo requerido';
    }
    reemplazarEnAmbasPaginas('Grupo de buceo sucesivo', grupoBuceoTexto);
    
    reemplazarEnAmbasPaginas('Estado del buzo', cuestionarioData.c12);
    reemplazarEnAmbasPaginas('Observaciones generales', cuestionarioData.c14);
    reemplazarEnAmbasPaginas('Supervisor', cuestionarioData.c13);

    // Generar nombre de archivo: NombreBuzo + ID
    const nombreBuzoLimpio = limpiarNombreBuzo(cuestionarioData.c5);
    const nombreArchivo = `${nombreBuzoLimpio}${id}.pdf`;
    
    // Configurar opciones de html2pdf
    const opt = {
      margin: 0,
      filename: nombreArchivo,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Generar y descargar el PDF
    await html2pdf().set(opt).from(htmlContent).save();

  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
};

// Función auxiliar para calcular duración del buceo
const calcularDuracionBuceo = (tiempoDeFondo, tiempoDescompresionTotal) => {
  const [mins1, secs1] = tiempoDeFondo.split(':').map(Number);
  const [mins2, secs2] = tiempoDescompresionTotal.split(':').map(Number);
  
  const totalSegundos = (mins1 * 60 + (secs1 || 0)) + (mins2 * 60 + (secs2 || 0));
  
  const mins = Math.floor(totalSegundos / 60);
  const secs = totalSegundos % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
