import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Info, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import LegalFooter from './LegalFooter';
import ScrollTimePicker from './ScrollTimePicker';

const FormScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { error: errorFromRoute, formData: savedFormData } = location.state || {};
  const renderCount = React.useRef(0);
  
  // Estado para todas las respuestas (restaurar si vienen de error)
  const [p1, setP1] = useState(savedFormData?.p1 || 'aire');
  const [p2, setP2] = useState(savedFormData?.p2 || '');
  const [p2_1, setP2_1] = useState(savedFormData?.p2_1 || 'ordenador');
  const [p3, setP3] = useState(savedFormData?.p3 || '');
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
    p3: 'Tiempo de fondo',
    p4_1: '¿El ordenador fue calibrado para esta altitud?',
    p4_2: '¿Ha pasado el buzo más de 12h en la altitud indicada?'
  };

  // Función centralizada para validar todas las reglas
  const validarTodasLasReglas = (validarObligatorios = false) => {
    const newErrors = [];

    // Validar campos obligatorios solo cuando se hace clic en calcular
    if (validarObligatorios) {
      const camposFaltantes = [];
      
      // Validar campos básicos obligatorios
      if (!p1) camposFaltantes.push('p1');
      if (!p2 || p2 === '') camposFaltantes.push('p2');
      if (!p3 || p3 === '') camposFaltantes.push('p3');

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

    // Regla 1 de P3 - Solo validar cuando validarObligatorios es true (al hacer clic en Calcular)
    if (validarObligatorios && p3 !== '') {
      const minutos = parseFloat(p3);
      if (isNaN(minutos) || minutos <= 0) {
        newErrors.push('Inserte tiempo de fondo válido');
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
  }, [p1, p2, p2_1, p3, p4, p4_1, p4_2, p6, p5, p6_2, p6_3]);

  // Verificar si todos los campos obligatorios están completos
  const camposObligatoriosCompletos = () => {
    // P1, P2, P3 son obligatorios
    if (!p1 || !p2 || p2 === '' || !p3 || p3 === '') {
      return false;
    }

    // P2.1 es obligatorio si se muestra
    const showP2_1 = p2 !== '' && parseFloat(p2) > 0 && parseFloat(p2) <= 91.4;
    if (showP2_1 && !p2_1) {
      return false;
    }

    return true;
  };

  // Limpiar campos cuando P5 cambia a Si (Regla 5)
  useEffect(() => {
    if (p5 === 'si') {
      setP6_1('');
      setP6_2('');
      setP6_3('');
    }
  }, [p5]);

  const handleCalculate = (e) => {
    e.preventDefault();
    
    // VALIDACIÓN COMPLETA: Ejecutar todas las validaciones como si fuera la primera vez
    const allErrors = validarTodasLasReglas(true); // SÍ validar obligatorios al hacer clic
    
    // Si hay cualquier error, actualizar estado y no avanzar
    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }
    
    // Preparar datos del formulario
    const p6Value = p6 || 'no';
    
    const formDataToSend = {
      p1, p2, p2_1, p3, p4, p4_1, p4_2, p4_2_1, p4_2_2,
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

  // Determinar si mostrar P2.1
  const showP2_1 = p2 !== '' && parseFloat(p2) > 0 && parseFloat(p2) <= 91.4;

  // Determinar si mostrar P4.1
  const showP4_1 = p2_1 === 'ordenador' && p4 !== '' && parseFloat(p4) >= 91.44;

  // Determinar si mostrar P4.2
  const showP4_2 = p4 !== '' && parseFloat(p4) >= 91.44;

  // Determinar si mostrar P5 y subcampos
  const showP5 = p6 === 'si';

  // Determinar si mostrar P6.1, P6.2, P6.3
  const showP6Subcampos = p6 === 'si' && p5 === 'no';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto mb-20">
        <Card className="shadow-xl border-2 border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center">
              Formulario de Inmersión
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
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

            <form className="space-y-6" onSubmit={handleCalculate}>
              {/* P1 */}
              <div className="space-y-2">
                <Label htmlFor="p1">
                  Tipo de descompresión preferida (En el caso que fuera necesario) <span className="text-red-600">*</span>
                </Label>
                <Select value={p1} onValueChange={setP1}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Seleccione una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aire">Descompresión con aire</SelectItem>
                    <SelectItem value="o2">Descompresión con O2 en el agua</SelectItem>
                    <SelectItem value="camara" disabled>Descompresión en cámara</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* P2.1 */}
              {showP2_1 && (
                <div className="space-y-2 pl-4 border-l-4 border-blue-300 bg-blue-50 p-4 rounded">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="p2_1">
                      Instrumento utilizado <span className="text-red-600">*</span>
                    </Label>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center p-1 touch-manipulation">
                            <Info className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 cursor-help hover:text-blue-800 transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 text-sm">
                          <p>En caso de seleccionar la opción Profundímetro neumático se aplicará una corrección automáticamente que compense el peso del aire en la manguera</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select value={p2_1} onValueChange={setP2_1}>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neumatico">Profundímetro neumático</SelectItem>
                      <SelectItem value="ordenador">Ordenador / profundímetro del buzo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* P3 */}
              <div className="space-y-2">
                <ScrollTimePicker
                  id="p3"
                  label={
                    <>
                      Tiempo de fondo <span className="text-red-600">*</span>
                    </>
                  }
                  value={p3}
                  onChange={(value) => setP3(value)}
                />
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
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* P4.1 */}
              {showP4_1 && (
                <div className="space-y-3 pl-4 border-l-4 border-blue-300 bg-blue-50 p-4 rounded">
                  <div className="flex items-center space-x-2">
                    <Label>¿Se ha recalibrado el profundímetro al llegar a la altitud?</Label>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center p-1 touch-manipulation">
                            <Info className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 cursor-help hover:text-blue-800 transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 text-sm">
                          <p>Algunos profundímetros digitales/analógicos disponen de una función para recalibrarlos y poder realizar buceos a altitud con ellos sin aplicar correcciones</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <RadioGroup value={p4_1} onValueChange={setP4_1} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id="p4_1_si" />
                      <Label htmlFor="p4_1_si" className="cursor-pointer">Sí</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="p4_1_no" />
                      <Label htmlFor="p4_1_no" className="cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* P4.2 */}
              {showP4_2 && (
                <div className="space-y-3 pl-4 border-l-4 border-blue-300 bg-blue-50 p-4 rounded">
                  <Label>¿Ha pasado el buzo más de 12h en la altitud indicada?</Label>
                  <RadioGroup value={p4_2} onValueChange={setP4_2} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id="p4_2_si" />
                      <Label htmlFor="p4_2_si" className="cursor-pointer">Sí</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="p4_2_no" />
                      <Label htmlFor="p4_2_no" className="cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>

                  {/* P4.2.1 y P4.2.2 */}
                  {p4_2 === 'no' && (
                    <div className="space-y-4 mt-4 pl-4 border-l-2 border-blue-200">
                      <div className="space-y-2">
                        <Label htmlFor="p4_2_1">Intervalo de tiempo a la altitud actual</Label>
                        <Input
                          id="p4_2_1"
                          type="text"
                          value={p4_2_1}
                          onChange={(e) => setP4_2_1(e.target.value)}
                          placeholder="hh:mm (Ej: 08:30)"
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p4_2_2">¿A qué altitud se encontraba antes de realizar el ascenso?</Label>
                        <Input
                          id="p4_2_2"
                          type="number"
                          step="0.01"
                          value={p4_2_2}
                          onChange={(e) => setP4_2_2(e.target.value)}
                          placeholder="Ej: 500"
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* P6 */}
              <div className="space-y-3">
                <Label>¿Ha realizado el buzo otra inmersión en las 16h previas? (Incluso si no fue necesaria una descompresión)</Label>
                <RadioGroup value={p6} onValueChange={setP6} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="si" id="p6_si" />
                    <Label htmlFor="p6_si" className="cursor-pointer">Sí</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="p6_no" />
                    <Label htmlFor="p6_no" className="cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* P5 y subcampos */}
              {showP5 && (
                <div className="space-y-4 pl-4 border-l-4 border-green-300 bg-green-50 p-4 rounded">
                  <div className="space-y-3">
                    <Label>¿La inmersión anterior se realizó en los 10 minutos previos?</Label>
                    <RadioGroup value={p5} onValueChange={setP5} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="si" id="p5_si" />
                        <Label htmlFor="p5_si" className="cursor-pointer">Sí</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="p5_no" />
                        <Label htmlFor="p5_no" className="cursor-pointer">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {p5 === 'si' && (
                    <div className="space-y-4 pl-4 border-l-2 border-green-200">
                      <div className="space-y-2">
                        <Label htmlFor="p5_1">Profundidad máxima del buceo anterior (metros)</Label>
                        <Input
                          id="p5_1"
                          type="number"
                          step="0.01"
                          value={p5_1}
                          onChange={(e) => setP5_1(e.target.value)}
                          placeholder="Ej: 25"
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p5_2">Tiempo de fondo del buceo anterior</Label>
                        <Input
                          id="p5_2"
                          type="text"
                          value={p5_2}
                          onChange={(e) => setP5_2(e.target.value)}
                          placeholder="mm:ss (Ej: 30:00)"
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* P6.1, P6.2, P6.3 */}
              {showP6Subcampos && (
                <div className="space-y-4 pl-4 border-l-4 border-purple-300 bg-purple-50 p-4 rounded">
                  <div className="space-y-2">
                    <Label htmlFor="p6_1">Grupo de buceo sucesivo al finalizar la inmersión anterior</Label>
                    <Select value={p6_1} onValueChange={setP6_1}>
                      <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccione un grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'Z'].map(letter => (
                          <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p6_2">Intervalo en superficie</Label>
                    <Input
                      id="p6_2"
                      type="text"
                      value={p6_2}
                      onChange={(e) => setP6_2(e.target.value)}
                      placeholder="hh:mm (Ej: 02:30)"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p6_3">¿Realizó el buceo antes de realizar el ascenso o ya en la altitud actual?</Label>
                    <Select value={p6_3} onValueChange={setP6_3}>
                      <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccione una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="antes">Antes de realizar el ascenso</SelectItem>
                        <SelectItem value="actual">En la altitud actual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Botón de calcular */}
              <div className="flex justify-center sm:justify-end pt-4">
                <Button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Calcular inmersión
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <LegalFooter />
    </div>
  );
};

export default FormScreen;