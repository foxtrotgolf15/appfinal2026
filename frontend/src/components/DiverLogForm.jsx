import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Download } from 'lucide-react';
import LegalFooter from './LegalFooter';
import { generateDiverLogPDF } from '../services/pdfGenerator';

const DiverLogForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resultados, formData, p7DuracionCambio } = location.state || {};

  // Redirigir si no hay datos
  if (!resultados || !formData) {
    navigate('/form');
    return null;
  }

  // Obtener fecha y hora actuales
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // formato yyyy-mm-dd
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Calcular hora de llegada a superficie sumando duración del buceo
  const calcularHoraLlegada = (horaSalida, duracionBuceo) => {
    if (!horaSalida || !duracionBuceo) return currentTime;
    
    const [horasSalida, minsSalida] = horaSalida.split(':').map(Number);
    const [minsDuracion, segsDuracion] = duracionBuceo.split(':').map(Number);
    
    const totalMinutos = (horasSalida * 60 + minsSalida) + (minsDuracion + Math.ceil(segsDuracion / 60));
    const horasLlegada = Math.floor(totalMinutos / 60) % 24;
    const minsLlegada = totalMinutos % 60;
    
    return `${String(horasLlegada).padStart(2, '0')}:${String(minsLlegada).padStart(2, '0')}`;
  };

  // Estados del formulario
  const [c1, setC1] = useState(''); // Empresa
  const [c2, setC2] = useState(''); // Proyecto
  const [c3, setC3] = useState(currentDate); // Fecha
  const [c4, setC4] = useState(''); // Ubicación
  const [c5, setC5] = useState(''); // Buzo principal
  const [c6, setC6] = useState(''); // Buzo standby
  const [c7, setC7] = useState(''); // Tenders
  const [c8, setC8] = useState(''); // Finalidad
  const [c9, setC9] = useState(currentTime); // Hora abandona superficie
  const [c10, setC10] = useState(calcularHoraLlegada(currentTime, resultados.duracionBuceo || '00:00')); // Hora llega a superficie
  const [c11, setC11] = useState(''); // Modelo casco
  const [c12, setC12] = useState(''); // Estado del buzo
  const [c13, setC13] = useState(''); // Supervisor
  const [c14, setC14] = useState(''); // Observaciones

  // Actualizar hora de llegada cuando cambien la hora de salida o duración
  useEffect(() => {
    const duracionBuceo = resultados?.duracionBuceo || '00:00';
    setC10(calcularHoraLlegada(c9, duracionBuceo));
  }, [c9, resultados]);

  const handleDownloadPDF = async () => {
    const cuestionarioData = {
      c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14
    };

    try {
      await generateDiverLogPDF(cuestionarioData, resultados, formData, p7DuracionCambio);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  const handleBack = () => {
    navigate('/results', { state: { resultados, formData } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto mb-20">
        <Card className="shadow-xl border-2 border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center">
              Cuestionario Parte Digital
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8">
            <form className="space-y-6">
              {/* C1 - Empresa */}
              <div className="space-y-2">
                <Label htmlFor="c1">Empresa</Label>
                <Input
                  id="c1"
                  type="text"
                  value={c1}
                  onChange={(e) => setC1(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C2 - Proyecto */}
              <div className="space-y-2">
                <Label htmlFor="c2">Nombre del proyecto</Label>
                <Input
                  id="c2"
                  type="text"
                  value={c2}
                  onChange={(e) => setC2(e.target.value)}
                  placeholder="Nombre del proyecto"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C3 - Fecha */}
              <div className="space-y-2">
                <Label htmlFor="c3">Fecha</Label>
                <Input
                  id="c3"
                  type="date"
                  value={c3}
                  onChange={(e) => setC3(e.target.value)}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C4 - Ubicación */}
              <div className="space-y-2">
                <Label htmlFor="c4">Ubicación</Label>
                <Input
                  id="c4"
                  type="text"
                  value={c4}
                  onChange={(e) => setC4(e.target.value)}
                  placeholder="Ubicación de la inmersión"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C5 - Buzo principal */}
              <div className="space-y-2">
                <Label htmlFor="c5">Nombre y apellidos del buzo principal</Label>
                <Input
                  id="c5"
                  type="text"
                  value={c5}
                  onChange={(e) => setC5(e.target.value)}
                  placeholder="Nombre completo"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C6 - Buzo standby */}
              <div className="space-y-2">
                <Label htmlFor="c6">Nombre y apellidos del buzo standby</Label>
                <Input
                  id="c6"
                  type="text"
                  value={c6}
                  onChange={(e) => setC6(e.target.value)}
                  placeholder="Nombre completo"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C7 - Tenders */}
              <div className="space-y-2">
                <Label htmlFor="c7">Nombre y apellidos de el/los tenders</Label>
                <Input
                  id="c7"
                  type="text"
                  value={c7}
                  onChange={(e) => setC7(e.target.value)}
                  placeholder="Nombres completos"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C8 - Finalidad */}
              <div className="space-y-2">
                <Label htmlFor="c8">Finalidad de la inmersión</Label>
                <Input
                  id="c8"
                  type="text"
                  value={c8}
                  onChange={(e) => setC8(e.target.value)}
                  placeholder="Finalidad"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C9 - Hora abandona superficie */}
              <div className="space-y-2">
                <Label htmlFor="c9">Hora a la que abandona superficie</Label>
                <Input
                  id="c9"
                  type="time"
                  value={c9}
                  onChange={(e) => setC9(e.target.value)}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C10 - Hora llega a superficie */}
              <div className="space-y-2">
                <Label htmlFor="c10">Hora a la que llega a superficie</Label>
                <Input
                  id="c10"
                  type="time"
                  value={c10}
                  onChange={(e) => setC10(e.target.value)}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">Calculado automáticamente según duración del buceo</p>
              </div>

              {/* C11 - Modelo casco */}
              <div className="space-y-2">
                <Label htmlFor="c11">Modelo de casco/mascarón utilizado</Label>
                <Input
                  id="c11"
                  type="text"
                  value={c11}
                  onChange={(e) => setC11(e.target.value)}
                  placeholder="Modelo"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C12 - Estado del buzo */}
              <div className="space-y-2">
                <Label htmlFor="c12">Estado del buzo al salir</Label>
                <Input
                  id="c12"
                  type="text"
                  value={c12}
                  onChange={(e) => setC12(e.target.value)}
                  placeholder="Estado"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C13 - Supervisor */}
              <div className="space-y-2">
                <Label htmlFor="c13">Nombre del supervisor</Label>
                <Input
                  id="c13"
                  type="text"
                  value={c13}
                  onChange={(e) => setC13(e.target.value)}
                  placeholder="Nombre completo"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* C14 - Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="c14">Observaciones generales</Label>
                <Textarea
                  id="c14"
                  value={c14}
                  onChange={(e) => setC14(e.target.value)}
                  placeholder="Observaciones"
                  rows={4}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-6">
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto font-semibold px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-base border-2 hover:bg-slate-100"
                >
                  <ArrowLeft className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  Volver a resultados
                </Button>
                <Button
                  type="button"
                  onClick={handleDownloadPDF}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Download className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  Descargar hoja de inmersión
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

export default DiverLogForm;