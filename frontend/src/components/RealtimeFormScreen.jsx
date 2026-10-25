import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Info, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import LegalFooter from './LegalFooter';
import ScrollTimePicker from './ScrollTimePicker';
import PanelTiempoReal from './PanelTiempoReal';
import { calcularPanelTiempoReal } from '../services/panelTiempoReal';

const RealtimeFormScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { error: errorFromRoute, formData: savedFormData } = location.state || {};
  const renderCount = useRef(0);
  
  // Estado del cronómetro
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // en segundos
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Estado para todas las respuestas (restaurar si vienen de error)
  const [p1, setP1] = useState(savedFormData?.p1 || 'aire');
  const [p2, setP2] = useState(savedFormData?.p2 || '');
  const [p2_1, setP2_1] = useState(savedFormData?.p2_1 || 'ordenador');
  // P3 se calcula automáticamente del cronómetro
  const [p4, setP4] = useState(savedFormData?.p4 || '0');
  const [p4_1, setP4_1] = useState(savedFormData?.p4_1 || '');
  const [p4_2, setP4_2] = useState(savedFormData?.p4_2 || '');
  const [p4_2_1, setP4_2_1] = useState(savedFormData?.p4_2_1 || '');
  const [p4_2_2, setP4_2_2] = useState(savedFormData?.p4_2_2 || '');
  const [p5, setP5] = useState(savedFormData?.p5 || '');
  const [p5_1, setP5_1] = useState(savedFormData?.p5_1 || '');
  const [p5_2, setP5_2] = useState(savedFormData?.p5_2 || '');
  const [p6, setP6] = useState(savedFormData?.p6 || 'no');
  const [p6_1, setP6_1] = useState(savedFormData?.p6_1 || '');
  const [p6_2, setP6_2] = useState(savedFormData?.p6_2 || '');
  const [p6_3, setP6_3] = useState(savedFormData?.p6_3 || '');

  // Estado para errores
  const [errors, setErrors] = useState([]);
  const [calculationError, setCalculationError] = useState(errorFromRoute || null);

  // Mapeo de campos a títulos legibles
  const camposTitulos = {
    p1: 'Tipo de descompresión preferida',
    p2: 'Profundidad de lectura',
    p2_1: 'Instrumento de medición',
    p4_1: '¿El ordenador fue calibrado para esta altitud?',
    p4_2: '¿Ha pasado el buzo más de 12h en la altitud indicada?'
  };

  // Formatear tiempo del cronómetro
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Convertir segundos a formato mm:ss para P3
  const formatTimeForP3 = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Funciones del cronómetro
  const startStopwatch = () => {
    if (!isRunning) {
      setIsRunning(true);
      startTimeRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
  };

  const stopAndCalculate = () => {
    if (isRunning) {
      setIsRunning(false);
      clearInterval(intervalRef.current);
      
      // Validar y calcular con el tiempo del cronómetro como P3
      handleCalculate(elapsedTime);
    }
  };

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Wake Lock API para mantener la pantalla activa
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isRunning) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock activado');
        }
      } catch (err) {
        console.log('Wake Lock error:', err);
      }
    };

    if (isRunning) {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
        console.log('Wake Lock liberado');
      }
    };
  }, [isRunning]);

  // Función centralizada para validar todas las reglas
  const validarTodasLasReglas = (validarObligatorios = false, tiempoDeFondo = null) => {
    const newErrors = [];

    // Validar campos obligatorios solo cuando se hace clic en calcular
    if (validarObligatorios) {
      const camposFaltantes = [];
      
      // Validar campos básicos obligatorios
      if (!p1) camposFaltantes.push('p1');
      if (!p2 || p2 === '') camposFaltantes.push('p2');
      
      // Verificar que el cronómetro tenga tiempo
      if (!tiempoDeFondo || tiempoDeFondo <= 0) {
        newErrors.push('Debe iniciar el cronómetro y registrar tiempo de fondo antes de calcular');
        return newErrors;
      }

      // P2.1 es obligatorio si se muestra
      if ((p1 === 'aire' || p1 === 'o2') && (!p2_1 || p2_1 === '')) {
        camposFaltantes.push('p2_1');
      }

      // Validaciones de altitud (P4 > 91.44)
      const altitud = parseFloat(p4 || 0);
      if (altitud > 91.44) {
        // P4.1 es obligatoria si P2.1 = "ordenador"
        if (p2_1 === 'ordenador' && (!p4_1 || p4_1 === '')) {
          camposFaltantes.push('p4_1');
        }
        
        // P4.2 es obligatoria siempre que P4 > 91.44
        if (!p4_2 || p4_2 === '') {
          camposFaltantes.push('p4_2');
        }
      }
      
      // Si hay campos faltantes, construir mensaje específico
      if (camposFaltantes.length > 0) {
        const titulosCampos = camposFaltantes.map(campo => camposTitulos[campo] || campo);
        if (titulosCampos.length === 1) {
          newErrors.push(`Complete el campo: ${titulosCampos[0]}`);
        } else {
          newErrors.push(`Complete los campos: ${titulosCampos.join(', ')}`);
        }
        return newErrors;
      }
    }

    // Regla 1 de P2
    if (p2 !== '' && parseFloat(p2) === 0) {
      newErrors.push('Introduzca una profundidad válida');
    }

    // Regla 3 de P2 - validar profundidad corregida considerando el instrumento
    if (p2 !== '' && p2_1 !== '') {
      const profundidad = parseFloat(p2);
      let profundidadMaximaCorregida = profundidad;
      
      if (p2_1 === 'neumatico') {
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
      
      if (profundidadMaximaCorregida > 91.4) {
        newErrors.push('Inmersión fuera de tablas');
      }
    }

    // Regla 4 de P4
    if (p4 !== '' && parseFloat(p4) >= 3048) {
      newErrors.push('Esta exposición debe planificarse específicamente por un médico hiperbárico');
    }

    // Regla 3 de P6.2
    if (p6_2 !== '' && p6 === 'si' && p5 === 'no') {
      const [hours, minutes] = p6_2.split(':').map(Number);
      const totalMinutes = hours * 60 + (minutes || 0);
      if (totalMinutes > 960 || totalMinutes <= 10) {
        newErrors.push('Revise P 6');
      }
    }

    // Regla 4 de P6.3
    if (p6_3 === 'antes' && p6 === 'si' && p5 === 'no') {
      newErrors.push('Si realizó un buceo previo a ascender a altitud debe dejar 16h de intervalo en superficie para poder realizar un nuevo buceo');
    }

    return newErrors;
  };

  // Validaciones y lógica condicional
  useEffect(() => {
    renderCount.current += 1;
    
    // No limpiar error en los primeros 2 renders (inicialización + restauración de datos)
    if (renderCount.current <= 2) {
      const newErrors = validarTodasLasReglas(false);
      setErrors(newErrors);
      return;
    }

    // A partir del tercer render, limpiar error cuando el usuario modifica campos
    if (calculationError) {
      setCalculationError(null);
    }

    const newErrors = validarTodasLasReglas(false);
    setErrors(newErrors);
  }, [p1, p2, p2_1, p4, p4_1, p4_2, p6, p5, p6_2, p6_3]);

  // Limpiar campos cuando P5 cambia a Si (Regla 5)
  useEffect(() => {
    if (p5 === 'si') {
      setP6_1('');
      setP6_2('');
      setP6_3('');
    }
  }, [p5]);

  const handleCalculate = (tiempoEnSegundos) => {
    // Convertir segundos a formato mm:ss para P3
    const p3Value = formatTimeForP3(tiempoEnSegundos);
    
    // VALIDACIÓN COMPLETA: Ejecutar todas las validaciones
    const allErrors = validarTodasLasReglas(true, tiempoEnSegundos);
    
    // Si hay cualquier error, actualizar estado y no avanzar
    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }
    
    // Preparar datos del formulario
    const p6Value = p6 || 'no';
    
    const formDataToSend = {
      p1, p2, p2_1, 
      p3: p3Value, // Usar el tiempo del cronómetro
      p4, p4_1, p4_2, p4_2_1, p4_2_2,
      p5, p5_1, p5_2, p6: p6Value, p6_1, p6_2, p6_3
    };
    
    // VALIDACIÓN: Validar tipo de buceo
    const { validateDiveType } = require('../services/diveTypeValidator');
    const validation = validateDiveType(formDataToSend);
    
    if (!validation.valid) {
      // Tipo de buceo no implementado, mostrar error
      setErrors([validation.error]);
      return;
    }
    
    // Si todas las validaciones pasan, navegar a la pantalla de advertencias
    navigate('/warning', { state: { formData: formDataToSend } });
  };


  // Determinar si mostrar P4.1
  const showP4_1 = p2_1 === 'ordenador' && p4 !== '' && parseFloat(p4) >= 91.44;

  // Determinar si mostrar P4.2
  const showP4_2 = p4 !== '' && parseFloat(p4) >= 91.44;

  // Determinar si mostrar P5 y subcampos
  const showP5 = p6 === 'si';

  // Determinar si mostrar P6.1, P6.2, P6.3
  const showP6Subcampos = p6 === 'si' && p5 === 'no';

  // Datos en vivo: solo se recalculan al cambiar los campos o al pasar al siguiente minuto de tabla
  const minutoTabulacion = Math.max(1, Math.ceil(elapsedTime / 60));
  const panel = useMemo(
    () => calcularPanelTiempoReal({ p1, p2, p2_1, p4, p4_1, p4_2, p4_2_1, p4_2_2 }, minutoTabulacion),
    [p1, p2, p2_1, p4, p4_1, p4_2, p4_2_1, p4_2_2, minutoTabulacion]
  );

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen md:h-screen md:overflow-hidden">
      <div className="md:grid md:grid-cols-2 md:gap-4 md:h-full md:p-4 max-w-7xl mx-auto">
        {/* Cronómetro + datos en vivo: fijo arriba en vertical, mitad izquierda en pantallas anchas */}
        <aside className="sticky top-0 z-30 bg-slate-50 px-2 pt-2 pb-2 border-b border-slate-200 shadow-sm md:static md:z-auto md:bg-transparent md:p-0 md:pb-16 md:border-0 md:shadow-none md:overflow-y-auto">
          <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
            <CardContent className="p-2 md:p-2 md:tall:p-8">
              <div className="flex items-center justify-between gap-2 md:tall:block md:tall:text-center md:tall:space-y-4">
                <div>
                  <h3 className="hidden md:tall:block text-xl font-semibold text-slate-700">Tiempo de Inmersión</h3>
                  <div className="text-2xl min-[400px]:text-3xl md:text-2xl md:tall:text-7xl font-mono font-bold text-green-700">
                    {formatTime(elapsedTime)}
                  </div>
                </div>
                <div className="flex gap-1.5 md:gap-2 md:tall:flex-wrap md:tall:justify-center md:tall:gap-4 md:tall:pt-4">
                  {!isRunning && (
                    <Button
                      onClick={startStopwatch}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 text-sm md:text-base md:h-10 md:tall:h-12 md:px-4 md:tall:px-8 md:tall:min-w-[140px]"
                    >
                      <ArrowDownToLine className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                      Abandonar superficie
                    </Button>
                  )}
                  {isRunning && (
                    <Button
                      onClick={stopAndCalculate}
                      className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold px-3 text-sm md:text-base md:h-10 md:tall:h-12 md:px-4 md:tall:px-8 md:tall:min-w-[140px]"
                    >
                      <ArrowUpFromLine className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                      Abandonar fondo
                    </Button>
                  )}
                </div>
              </div>
              {!isRunning && elapsedTime === 0 && (
                <p className="hidden md:tall:block text-sm text-slate-600 italic text-center mt-4">
                  Presiona "Abandonar superficie" para comenzar a registrar el tiempo de inmersión
                </p>
              )}
            </CardContent>
          </Card>
          <h1 className="mt-2 md:tall:mt-4 rounded-md bg-gradient-to-r from-green-600 to-green-700 py-1 md:tall:py-3 text-center text-sm md:tall:text-2xl font-bold text-white">
            Cálculo en Tiempo Real
          </h1>
          <PanelTiempoReal panel={panel} elapsedTime={elapsedTime} />
        </aside>
        <main className="px-2 py-4 md:p-0 md:overflow-y-auto">
      <div className="max-w-4xl mx-auto mb-20">
        <div className="space-y-4">
            {/* Botón Calcular inmersión - Visible cuando cronómetro está detenido */}
            {!isRunning && elapsedTime > 0 && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col items-center space-y-3">
                    <p className="text-center text-slate-700 font-medium">
                      Completa los campos del formulario y presiona el botón para calcular la descompresión
                    </p>
                    <Button 
                      onClick={() => handleCalculate(elapsedTime)}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
                    >
                      Calcular inmersión
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(errors.length > 0 || calculationError) && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {calculationError && (
                      <li key="calculation-error">{calculationError}</li>
                    )}
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <form className="space-y-4">
              {/* Viñeta: profundidad máxima (+ tipo de profundímetro, de menor importancia) */}
              <Card className="shadow-md border-2 border-slate-200">
                <CardContent className="p-4 space-y-3">
                  {/* P2 */}
                  <div className="space-y-2">
                    <Label htmlFor="p2">
                      Profundidad máxima (metros) <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="p2"
                      type="number"
                      step="0.01"
                      value={p2}
                      onChange={(e) => setP2(e.target.value)}
                      placeholder="Ej: 30.5"
                      className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* P2.1 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-normal text-slate-500">Tipo de profundímetro</Label>
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex items-center p-1 touch-manipulation">
                              <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 text-sm">
                            <p>En caso de seleccionar la opción Neumático se aplicará una corrección automáticamente que compense el peso del aire en la manguera</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={p2_1} onValueChange={setP2_1}>
                      <SelectTrigger className="h-8 w-36 text-xs text-slate-600 transition-all duration-200 focus:ring-2 focus:ring-green-500">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ordenador">Digital</SelectItem>
                        <SelectItem value="neumatico">Neumático</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Viñeta: tipo de descompresión, altitud y resto de preguntas */}
              <Card className="shadow-md border-2 border-slate-200">
                <CardContent className="p-4 space-y-6">
              {/* P1 */}
              <div className="space-y-2">
                <Label htmlFor="p1">
                  Tipo de descompresión preferida <span className="text-red-600">*</span>
                </Label>
                <Select value={p1} onValueChange={setP1}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-green-500">
                    <SelectValue placeholder="Seleccione una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aire">Descompresión con aire</SelectItem>
                    <SelectItem value="o2">Descompresión con O2 en el agua</SelectItem>
                    <SelectItem value="camara" disabled>Descompresión en cámara</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* P4 */}
              <div className="space-y-2">
                <Label htmlFor="p4">Altitud del lugar de trabajo (metros)</Label>
                <Input
                  id="p4"
                  type="number"
                  step="0.01"
                  value={p4}
                  onChange={(e) => setP4(e.target.value)}
                  placeholder="Ej: 0"
                  className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* P4.1 */}
              {showP4_1 && (
                <div className="space-y-3 pl-4 border-l-4 border-green-300 bg-green-50 p-4 rounded">
                  <div className="flex items-center space-x-2">
                    <Label>¿Se ha recalibrado el profundímetro al llegar a la altitud?</Label>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center p-1 touch-manipulation">
                            <Info className="w-6 h-6 sm:w-5 sm:h-5 text-green-600 cursor-help hover:text-green-800 transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 text-sm">
                          <p>Algunos profundímetros digitales/analógicos disponen de una función para recalibrarlos y poder realizar buceos a altitud con ellos sin aplicar correcciones</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <RadioGroup value={p4_1} onValueChange={setP4_1}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id="p4_1-si" />
                      <Label htmlFor="p4_1-si">Si</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="p4_1-no" />
                      <Label htmlFor="p4_1-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* P4.2 */}
              {showP4_2 && (
                <div className="space-y-3 pl-4 border-l-4 border-green-300 bg-green-50 p-4 rounded">
                  <Label>¿Ha pasado el buzo más de 12h en la altitud indicada?</Label>
                  <RadioGroup value={p4_2} onValueChange={setP4_2}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id="p4_2-si" />
                      <Label htmlFor="p4_2-si">Si</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="p4_2-no" />
                      <Label htmlFor="p4_2-no">No</Label>
                    </div>
                  </RadioGroup>
                  {p4_2 === 'no' && (
                    <div className="space-y-4 mt-4 pl-4 border-l-2 border-green-200">
                      <div className="space-y-2">
                        <Label htmlFor="p4_2_1">Altitud desde la que viene el buzo (metros)</Label>
                        <Input
                          id="p4_2_1"
                          type="number"
                          step="0.01"
                          value={p4_2_1}
                          onChange={(e) => setP4_2_1(e.target.value)}
                          placeholder="Ej: 100"
                          className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p4_2_2">Tiempo en la altitud de trabajo (horas)</Label>
                        <Input
                          id="p4_2_2"
                          type="number"
                          step="0.1"
                          value={p4_2_2}
                          onChange={(e) => setP4_2_2(e.target.value)}
                          placeholder="Ej: 6.5"
                          className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* P6 */}
              <div className="space-y-2">
                <Label>¿Ha realizado el buzo otra inmersión en las 16h previas? (Incluso si no fue necesaria una descompresión)</Label>
                <RadioGroup value={p6} onValueChange={setP6}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="si" id="p6-si" />
                    <Label htmlFor="p6-si">Si</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="p6-no" />
                    <Label htmlFor="p6-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* P5 */}
              {showP5 && (
                <div className="space-y-3 pl-4 border-l-4 border-amber-300 bg-amber-50 p-4 rounded">
                  <Label>¿La última inmersión superó los 6 metros de profundidad?</Label>
                  <RadioGroup value={p5} onValueChange={setP5}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id="p5-si" />
                      <Label htmlFor="p5-si">Si</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="p5-no" />
                      <Label htmlFor="p5-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* P6.1, P6.2, P6.3 */}
              {showP6Subcampos && (
                <div className="space-y-4 pl-4 border-l-4 border-purple-300 bg-purple-50 p-4 rounded">
                  <div className="space-y-2">
                    <Label htmlFor="p6_1">Profundidad máxima del buceo anterior (metros)</Label>
                    <Input
                      id="p6_1"
                      type="number"
                      step="0.01"
                      value={p6_1}
                      onChange={(e) => setP6_1(e.target.value)}
                      placeholder="Ej: 18.5"
                      className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p6_2">Intervalo en superficie desde última inmersión (hh:mm)</Label>
                    <ScrollTimePicker
                      id="p6_2"
                      value={p6_2}
                      onChange={(value) => setP6_2(value)}
                      label=""
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>¿El buzo ha ascendido a altitud?</Label>
                    <RadioGroup value={p6_3} onValueChange={setP6_3}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="antes" id="p6_3-antes" />
                        <Label htmlFor="p6_3-antes">El buzo ascendió a altitud antes del último buceo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="despues" id="p6_3-despues" />
                        <Label htmlFor="p6_3-despues">El buzo ascendió a altitud después del último buceo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="p6_3-no" />
                        <Label htmlFor="p6_3-no">El buzo no ha ascendido a altitud</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              <div className="pt-4 text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Presiona "Abandonar fondo" en el cronómetro para calcular la descompresión
                </p>
              </div>
                </CardContent>
              </Card>
            </form>
        </div>
        <LegalFooter />
      </div>
        </main>
      </div>
    </div>
  );
};

export default RealtimeFormScreen;
