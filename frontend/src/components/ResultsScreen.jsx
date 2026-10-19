import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Info, ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import LegalFooter from './LegalFooter';
import Timer from './Timer';
import Stopwatch from './Stopwatch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import { calculateDecompression } from '../services/decompressionCalculator';

const ResultsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resultados: resultadosIniciales, formData: formDataInicial } = location.state || {};

  const [resultados, setResultados] = useState(resultadosIniciales);
  const [formData, setFormData] = useState(formDataInicial);
  const [modoDescompresion, setModoDescompresion] = useState(formData?.p1 || 'aire');
  const [mostrarTiemposAltitud, setMostrarTiemposAltitud] = useState(false);
  const [p7DuracionCambio, setP7DuracionCambio] = useState('03:00'); // Default 3:00
  const [p7RespuestaGuardada, setP7RespuestaGuardada] = useState('03:00'); // Respuesta guardada para PDF
  const [p7FueGuardado, setP7FueGuardado] = useState(false); // Rastrea si P7 ha sido guardado explícitamente
  const [mostrarAvisoP7, setMostrarAvisoP7] = useState(false); // Controla si mostrar aviso de P7
  const { toast } = useToast();

  // Función para guardar la respuesta P7
  const guardarRespuestaP7 = () => {
    setP7RespuestaGuardada(p7DuracionCambio);
    setP7FueGuardado(true); // Marcar como guardado
    setMostrarAvisoP7(false); // Ocultar aviso si estaba visible
    toast({
      title: "Respuesta P7 guardada",
      description: `Duración del ascenso + el cambio a O2 guardada: ${p7DuracionCambio}`,
    });
  };

  // Función para calcular tiempo de descompresión total
  const calcularTiempoDescompresionTotal = () => {
    const esO2 = resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2';
    const esSinParadas = resultados.tipoInmersion === 'SIN_PARADAS';
    
    // Si es sin paradas, devolver directamente el tiempo de ascenso
    if (esSinParadas && resultados.tiempoHastaSuperficie) {
      return resultados.tiempoHastaSuperficie;
    }
    
    // Sumar todos los temporizadores de la pantalla
    let tiempoTotalSegundos = 0;
    
    // Tiempo hasta primera parada - SIEMPRE se suma
    if (resultados.tiempoHastaPrimeraParada) {
      const [mins, secs] = resultados.tiempoHastaPrimeraParada.split(':').map(Number);
      tiempoTotalSegundos += (mins * 60 + (secs || 0));
    }
    
    // Tiempo desde última parada (si existe)  
    if (resultados.tiempoDesdeUltimaParada) {
      const [mins, secs] = resultados.tiempoDesdeUltimaParada.split(':').map(Number);
      tiempoTotalSegundos += (mins * 60 + (secs || 0));
    }
    
    // Paradas con breaks para O2 (SIN ventilación - esa será P7)
    if (esO2 && resultados.paradasConBreaks) {
      resultados.paradasConBreaks.forEach(elemento => {
        if (elemento.tipo === 'BREAK' || elemento.tipo === 'PARADA_O2' || elemento.tipo === 'PARADA_AIRE') {
          tiempoTotalSegundos += (elemento.duracion * 60);
        }
        // NO SUMAR VENTILACION - será reemplazada por P7
      });
    }
    
    // Paradas normales para aire
    if (!esO2 && resultados.paradas) {
      resultados.paradas.forEach(parada => {
        tiempoTotalSegundos += (parada.duracion * 60);
      });
    }
    
    // Tiempo hasta superficie (sin paradas)
    if (resultados.tiempoHastaSuperficie) {
      const [mins, secs] = resultados.tiempoHastaSuperficie.split(':').map(Number);
      tiempoTotalSegundos += (mins * 60 + (secs || 0));
    }
    
    const formatearTiempo = (segundos) => {
      const mins = Math.floor(segundos / 60);
      const secs = segundos % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    
    const tiempoBase = formatearTiempo(tiempoTotalSegundos);
    
    if (esO2 && !esSinParadas) {
      // Para O2 CON paradas: mostrar rango (no sabemos P7 exacto todavía)
      const tiempoMax = formatearTiempo(tiempoTotalSegundos + 180); // +3 min
      return `entre ${tiempoBase} y ${tiempoMax}`;
    } else {
      // Para aire o sin paradas: mostrar tiempo exacto
      return tiempoBase;
    }
  };
  
  // Función para determinar si la primera parada es de O2
  const primeraParadaEsO2 = () => {
    if ((resultados.tipoCalculoEspecifico !== 'SEA_LEVEL_O2' && resultados.tipoCalculoEspecifico !== 'ALTITUDE_O2') || !resultados.paradas || resultados.paradas.length === 0) {
      return false;
    }
    
    const primeraParada = resultados.paradas[0];
    return primeraParada.profundidad === 9.1 || primeraParada.profundidad === 6.1;
  };

  // Función para calcular tiempo exacto incluyendo P7 (para PDF)
  const calcularTiempoExactoConP7 = () => {
    const esO2 = resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2';
    
    // Usar el tiempo base del cálculo original
    let [mins, secs] = resultados.tiempoDescompresionTotal.split(':').map(Number);
    let tiempoTotalSegundos = (mins * 60 + (secs || 0));
    
    // Si es O2, añadir P7
    if (esO2 && p7DuracionCambio) {
      const [p7Mins, p7Secs] = p7DuracionCambio.split(':').map(Number);
      tiempoTotalSegundos += (p7Mins * 60 + (p7Secs || 0));
    }
    
    const mins2 = Math.floor(tiempoTotalSegundos / 60);
    const secs2 = tiempoTotalSegundos % 60;
    return `${String(mins2).padStart(2, '0')}:${String(secs2).padStart(2, '0')}`;
  };

  if (!resultados || !formData) {
    navigate('/form');
    return null;
  }

  const handleChangeModoDescompresion = (nuevoModo) => {
    setModoDescompresion(nuevoModo);
    const nuevosResultados = calculateDecompression({
      ...formData,
      p1: nuevoModo
    });
    setResultados(nuevosResultados);
  };

  const handleNuevaInmersion = () => {
    navigate('/form');
  };

  const handleRellenarHoja = () => {
    // Validar que P7 esté guardado para buceos O2 CON paradas
    if ((resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2') && resultados.tipoInmersion !== 'SIN_PARADAS') {
      if (!p7FueGuardado) {
        // P7 nunca fue guardado explícitamente
        setMostrarAvisoP7(true); // Mostrar aviso visual
        toast({
          variant: "destructive",
          title: "Error: P7 no guardado",
          description: "Debe guardar la respuesta P7 antes de rellenar la hoja de buceo. Haga click en 'Guardar respuesta'.",
        });
        return; // NO permitir continuar
      }
    }
    
    // Si llegamos aquí, P7 está guardado o no es buceo O2
    navigate('/diver-log', { state: { resultados, formData, p7DuracionCambio: p7RespuestaGuardada } });
  };

  const mostrarSelectorModo = resultados.exposicion && resultados.exposicion !== 'Normal';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto mb-20">
        {/* Exposición y Selector de Modo */}
        {mostrarSelectorModo && (
          <Card className="mb-6 shadow-xl border-2 border-amber-200">
            <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-6 h-6" />
                <span>Exposición: {resultados.exposicion}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Cambio de modo de descompresión
                </label>
                <Select value={modoDescompresion} onValueChange={handleChangeModoDescompresion}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aire">Descompresión con aire</SelectItem>
                    <SelectItem value="o2">Descompresión con O2 en el agua</SelectItem>
                    <SelectItem value="camara" disabled>Descompresión en cámara</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultados Principales */}
        <Card className="shadow-xl border-2 border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center">
              Resultados de la Inmersión
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-8 space-y-6">
            {/* Tabla Original y Datos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800 border-b-2 border-blue-300 pb-2">
                  Tabla Original
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Tabla de origen:</span> {resultados.tablaOriginal}</p>
                  <p><span className="font-medium">Profundidad tabulada:</span> {resultados.profundidadTabulada}m</p>
                  <p><span className="font-medium">Tiempo tabulado:</span> {resultados.tiempoTabulado} min</p>
                  <p><span className="font-medium">Modo de descompresión:</span> {resultados.tipoInmersion === 'SIN_PARADAS' ? 'Inmersión sin descompresión' : resultados.modoDescompresion}</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800 border-b-2 border-blue-300 pb-2">
                  Datos de la Inmersión
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Tiempo de fondo:</span> {resultados.tiempoDeFondo}</p>
                  <p><span className="font-medium">Profundidad de lectura:</span> {resultados.profundidad}m</p>
                  <p><span className="font-medium">Profundidad máxima corregida:</span> {resultados.profundidadMaximaCorregida.toFixed(2)}m</p>
                  {resultados.altitud && (
                    <p><span className="font-medium">Altitud:</span> {resultados.altitud}m</p>
                  )}
                  {resultados.profundidadEquivalente && (
                    <p><span className="font-medium">Profundidad equivalente a nivel del mar:</span> {resultados.profundidadEquivalente.toFixed(2)}m</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Tipo de Inmersión */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Tipo de Inmersión</h3>
              <p className="text-slate-700">
                {resultados.tipoInmersion === 'SIN_PARADAS' 
                  ? 'Inmersión sin paradas de descompresión'
                  : resultados.tipoInmersion
                }
              </p>
            </div>

            <Separator />

            {/* Tiempo de Descompresión Total (dinámico según tipo) */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {(resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2') && resultados.tipoInmersion !== 'SIN_PARADAS'
                  ? 'Tiempo de Descompresión Total Estimado'
                  : 'Tiempo de Descompresión Total'
                }
              </h3>
              <p className="text-2xl font-bold text-blue-700">{calcularTiempoDescompresionTotal()}</p>
              {(resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2') && resultados.tipoInmersion !== 'SIN_PARADAS' && (
                <p className="text-sm text-blue-600 mt-1">
                  * El rango depende de la duración real del cambio a O₂
                </p>
              )}
            </div>

            <Separator />

            {/* Consumo de O2 - Solo para buceo con O2 CON paradas */}
            {(resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2') && resultados.consumoO2 && resultados.tipoInmersion !== 'SIN_PARADAS' && (
              <div className="bg-green-400 p-4 rounded-lg border border-green-600">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Consumo aproximado de O₂</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-900"><span className="font-medium">Total en litros:</span> {resultados.consumoO2.litros}L</p>
                  </div>
                  <div>
                    <p className="text-gray-900"><span className="font-medium">Volumen de botellas de O2 necesarias (200 atm):</span> {resultados.consumoO2.botella200atm}L</p>
                  </div>
                </div>
              </div>
            )}

            {(resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2') && (
              <Separator />
            )}

            {/* Detalles de Paradas o Sin Paradas */}
            {resultados.tipoInmersion === 'SIN_PARADAS' ? (
              <div className="space-y-4">
                <div className="bg-green-400 p-4 rounded-lg border border-green-600">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Inmersión sin paradas de descompresión
                  </h3>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-2">Tiempo límite sin descompresión</h4>
                  <p className="text-xl font-bold text-slate-700 mb-3">{resultados.tiempoLimiteSinDeco} minutos</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-2">Tiempo de ascenso a superficie</h4>
                  <p className="text-xl font-bold text-slate-700 mb-3">{resultados.tiempoHastaSuperficie}</p>
                  <Timer 
                    duracion={resultados.tiempoHastaSuperficie} 
                    label="Tiempo de ascenso a superficie"
                  />
                </div>
              </div>
            ) : (resultados.tipoCalculoEspecifico === 'SEA_LEVEL_O2' || resultados.tipoCalculoEspecifico === 'ALTITUDE_O2') ? (
              // Renderizado específico para O2
              <div className="space-y-4">
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                  <h3 className="text-lg font-semibold text-cyan-800 mb-2">
                    Descompresión con O₂ en el agua
                  </h3>
                </div>

                {/* Tiempo hasta la primera parada - SIEMPRE se muestra */}
                {resultados.tiempoHastaPrimeraParada && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-medium text-slate-800 mb-2">Tiempo hasta la primera parada</h4>
                    <p className="text-xl font-bold text-slate-700 mb-3">{resultados.tiempoHastaPrimeraParada}</p>
                    <Timer 
                      duracion={resultados.tiempoHastaPrimeraParada} 
                      label="Tiempo hasta la primera parada"
                    />
                  </div>
                )}

                {/* Renderizar secuencia completa con breaks para O2 */}
                {resultados.paradasConBreaks && resultados.paradasConBreaks.map((elemento, index) => {
                  if (elemento.tipo === 'VENTILACION') {
                    return (
                      <div key={index} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-2">
                          {elemento.descripcion}
                        </h4>
                        <p className="text-yellow-700 mb-3">Duración máxima permitida: 3 minutos</p>
                        
                        {/* Cronómetro primero */}
                        <div className="mb-4">
                          <Stopwatch label={`Cronómetro para ${elemento.descripcion.toLowerCase()}`} />
                        </div>
                        
                        {/* Campo P7 - Duración del ascenso + el cambio a O2 debajo del cronómetro */}
                        <div className="mb-2">
                          <Label htmlFor="p7_duracion" className="text-sm font-medium text-yellow-800">
                            Duración del ascenso + el cambio a O2 (mm:ss):
                          </Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Input
                              id="p7_duracion"
                              type="text"
                              value={p7DuracionCambio}
                              onChange={(e) => setP7DuracionCambio(e.target.value)}
                              placeholder="03:00"
                              className="max-w-32 text-center"
                            />
                            <Button
                              onClick={guardarRespuestaP7}
                              size="sm"
                              className={p7FueGuardado 
                                ? "bg-green-500 hover:bg-green-600 text-white px-3 py-1" 
                                : "bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1"
                              }
                            >
                              {p7FueGuardado ? "✓ Guardado" : "Guardar respuesta"}
                            </Button>
                          </div>
                          {p7FueGuardado && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Respuesta guardada: {p7RespuestaGuardada}
                            </p>
                          )}
                          {!p7FueGuardado && (
                            <p className="text-xs text-red-600 mt-1">
                              ⚠️ Debe guardar la respuesta antes de continuar
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  } else if (elemento.tipo === 'BREAK') {
                    return (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">{elemento.descripcion}</h4>
                        <p className="text-blue-700">Respirando aire - No cuenta como tiempo efectivo de descompresión</p>
                        <p className="text-lg font-bold text-blue-800 mb-3">{elemento.duracion}:00</p>
                        <Timer 
                          duracion={`${elemento.duracion}:00`} 
                          label={primeraParadaEsO2() 
                            ? elemento.descripcion.replace('Ascenso y parada a', 'Parada a')
                            : elemento.descripcion
                          }
                        />
                      </div>
                    );
                  } else if (elemento.tipo === 'PARADA_O2') {
                    return (
                      <div key={index} className="bg-green-400 p-4 rounded-lg border border-green-600">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {primeraParadaEsO2() 
                            ? elemento.descripcion.replace('Ascenso y parada a', 'Parada a')
                            : elemento.descripcion
                          }
                        </h4>
                        <p className="text-gray-900">Respirando O₂ puro - {elemento.duracion} minutos</p>
                        <p className="text-lg font-bold text-gray-900 mb-3">{elemento.duracion.toFixed(2)}:00</p>
                        <Timer 
                          duracion={`${Math.floor(elemento.duracion)}:${String(Math.round((elemento.duracion % 1) * 60)).padStart(2, '0')}`} 
                          label={primeraParadaEsO2() 
                            ? elemento.descripcion.replace('Ascenso y parada a', 'Parada a')
                            : elemento.descripcion
                          }
                        />
                      </div>
                    );
                  } else if (elemento.tipo === 'PARADA_AIRE') {
                    return (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">{elemento.descripcion}</h4>
                        <p className="text-blue-700">Respirando aire - {elemento.duracion} minutos</p>
                        <p className="text-lg font-bold text-blue-800 mb-3">{elemento.duracion}:00</p>
                        <Timer 
                          duracion={`${elemento.duracion}:00`} 
                          label={primeraParadaEsO2() 
                            ? elemento.descripcion.replace('Ascenso y parada a', 'Parada a')
                            : elemento.descripcion
                          }
                        />
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Tiempo de ascenso desde la última parada - ÚLTIMO BLOQUE */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-2">Tiempo de ascenso desde la última parada a superficie</h4>
                  <p className="text-xl font-bold text-slate-700 mb-3">{resultados.tiempoDesdeUltimaParada}</p>
                  <Timer 
                    duracion={resultados.tiempoDesdeUltimaParada} 
                    label="Tiempo de ascenso desde la última parada a superficie"
                  />
                </div>
              </div>
            ) : (
              // Renderizado estándar para aire
              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">
                    Inmersión con paradas de descompresión
                  </h3>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-2">Tiempo hasta la primera parada</h4>
                  <p className="text-xl font-bold text-slate-700 mb-3">{resultados.tiempoHastaPrimeraParada}</p>
                  <Timer 
                    duracion={resultados.tiempoHastaPrimeraParada} 
                    label="Tiempo hasta la primera parada"
                  />
                </div>

                {/* Lista de Paradas */}
                <div className="space-y-4">
                  {resultados.paradas && resultados.paradas.map((parada, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h4 className="font-semibold text-blue-900">
                            {index === 0 
                              ? `Parada a ${parada.profundidad}m de profundidad`
                              : `Ascenso y parada a ${parada.profundidad}m de profundidad`
                            }
                          </h4>
                          <p className="text-blue-700">Duración: {parada.duracion} minutos</p>
                        </div>
                        {index > 0 && resultados.paradaConAscenso && resultados.paradaConAscenso[index - 1] && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex items-center p-1 touch-manipulation">
                                  <Info className="w-7 h-7 sm:w-6 sm:h-6 text-blue-600 cursor-help hover:text-blue-800 transition-colors" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 text-sm">
                                <p>Tiempo de ascenso desde parada anterior: {resultados.paradaConAscenso[index - 1].tiempoAscensoDesdeAnterior}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Timer 
                        duracion={`${parada.duracion}:00`} 
                        label={index === 0 
                          ? `Parada a ${parada.profundidad}m de profundidad`
                          : `Ascenso y parada a ${parada.profundidad}m de profundidad`
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-2">Tiempo de ascenso desde la última parada a superficie</h4>
                  <p className="text-xl font-bold text-slate-700 mb-3">{resultados.tiempoDesdeUltimaParada}</p>
                  <Timer 
                    duracion={resultados.tiempoDesdeUltimaParada} 
                    label="Tiempo de ascenso desde la última parada a superficie"
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Grupo de Buceo Sucesivo Final */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Grupo de Buceo Sucesivo Final</h3>
              {resultados.grupoBuceoSucesivoFinal === '**' ? (
                <div className="flex items-start space-x-2">
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    Buceo sucesivo no permitido
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center p-1 touch-manipulation">
                          <Info className="w-7 h-7 sm:w-6 sm:h-6 text-red-600 cursor-help hover:text-red-800 transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 text-sm">
                        <p>No se permiten inmersiones repetitivas más profundas de 6,1m tras esa inmersión. El buzo debe realizar un intervalo en superficie de 18 horas antes de efectuar otra inmersión más profunda de 6,1m</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-red-700 font-medium">Intervalo en superficie requerido: 18h</p>
                </div>
              ) : (
                <Badge className="text-lg px-4 py-2 bg-green-500 hover:bg-green-600">
                  Grupo {resultados.grupoBuceoSucesivoFinal}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Volar o Ascender a Altitud */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Volar o ascender a altitud después del buceo
              </h3>
              
              <Button
                onClick={() => setMostrarTiemposAltitud(!mostrarTiemposAltitud)}
                variant="outline"
                className="w-full sm:w-auto mb-4 border-2 border-blue-300 hover:bg-blue-50 transition-all duration-200 text-xs sm:text-sm px-3 sm:px-4 py-3 sm:py-2"
              >
                {mostrarTiemposAltitud ? (
                  <>
                    <span className="hidden sm:inline">Ocultar tiempos tras la inmersión para ascender a altitud</span>
                    <span className="sm:hidden">Ocultar tiempos para ascender a altitud</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Mostrar tiempos tras la inmersión para ascender a altitud</span>
                    <span className="sm:hidden">Mostrar tiempos para ascender a altitud</span>
                  </>
                )}
              </Button>

              {mostrarTiemposAltitud && (
                <>
                  {resultados.grupoBuceoSucesivoFinal === '**' ? (
                    // Mensaje especial para grupo **
                    <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
                      <p className="text-red-800 font-semibold text-center">
                        Inmersión excepcional, espere 48h antes de volar
                      </p>
                    </div>
                  ) : (
                    // Tabla normal de tiempos
                    <>
                      <p className="text-sm text-slate-600 mb-4">
                        Tiempos mínimos (hh:mm) que deben transcurrir en superficie para poder ascender a cada altitud:
                      </p>
                      {Number(resultados.altitud) >= 2438.4 && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-300 mb-4">
                          <p className="text-sm text-green-800">
                            Sitio de buceo a 2438 m (8000 ft) o más: no se requiere intervalo en superficie antes de un vuelo comercial,
                            ya que volar supone un aumento de la presión atmosférica y no una disminución.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {resultados.tiemposAltitud && resultados.tiemposAltitud.map((item, index) => (
                          <div key={index} className="bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-slate-700">{item.altitud}:</span>
                              <span className="text-slate-900 font-semibold">{item.valor}</span>
                            </div>
                            {item.nota && (
                              <p className="text-xs text-blue-600 mt-1">{item.nota}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Aviso si P7 no fue guardado para buceos O2 con paradas - SOLO después de intentar continuar */}
            {mostrarAvisoP7 && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-800 font-medium">
                    Rellenar duración del cambio
                  </p>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-6">
              <Button
                onClick={handleNuevaInmersion}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-semibold px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-base border-2 hover:bg-slate-100"
              >
                <ArrowLeft className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Calcular nueva inmersión</span>
                <span className="sm:hidden">Nueva inmersión</span>
              </Button>
              <Button
                onClick={handleRellenarHoja}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <FileText className="mr-2 w-5 h-5" />
                Rellenar hoja de buceo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <LegalFooter />
    </div>
  );
};

export default ResultsScreen;