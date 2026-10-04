import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

const WarningScreen = ({ onContinue, diveType = 'aire' }) => {
  
  const getWarningColor = () => {
    return diveType === 'o2' ? 'green' : 'orange';
  };

  const getWarningContent = () => {
    if (diveType === 'o2') {
      return {
        title: 'Recuerde',
        bgColor: 'bg-gradient-to-r from-green-600 to-green-700',
        borderColor: 'border-green-200',
        textColor: 'text-green-600',
        warnings: [
          'Podrá cambiar el modo de descompresión más adelante si lo desea.',
          'En la descompresión se respira oxígeno puro solamente en las paradas de 6,1m y 9,1m, todas las paradas más profundas en caso de que existieran se realizaran respirando aire.',
          'El tiempo de la primera parada de Oxígeno debe comenzar cuando el/los buzos están confirmados respirando oxígeno y termina cuando abandonan la parada',
          'Si la exposición acumulada respirando O₂ supera los 30 minutos, la app programará automáticamente pausas ("breaks") de 5 minutos respirando aire, que no cuentan como tiempo de descompresión.',
          'Compruebe que el equipo esté libre de grasas y aceites.',
          'Monitorice constantemente al buzo: riesgo de convulsiones.',
          'No respire O₂ 100% por debajo de 9,1 m de profundidad.',
          'Ante síntomas de toxicidad, cambie a aire inmediatamente.',
          'Si la inmersión excede los límites manejables incluso con oxígeno, se clasificará como "exposición excepcional"'
        ]
      };
    } else {
      return {
        title: 'Recuerde',
        bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-600',
        warnings: [
          'Podrá cambiar el modo de descompresión más adelante si lo desea.',
          'Todas las paradas de descompresión se realizarán bajo el agua respirando aire.',
          'Asegúrese de planificar suficiente suministro de aire para cubrir todas las paradas indicadas.',
          'Respete estrictamente la velocidad máxima de ascenso (9–10 m/min) y cumpla el tiempo completo de cada parada a la profundidad indicada.',
          'Saltarse paradas o ascender demasiado rápido aumenta significativamente el riesgo de enfermedad descompresiva (ED).',
          'En inmersiones muy prolongadas o profundas, puede ser impracticable descomprimir solo con aire. Estas se consideran "exposición excepcional" y requieren oxígeno en el agua o descompresión en superficie para reducir el tiempo.'
        ]
      };
    }
  };

  const warningData = getWarningContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className={`max-w-4xl w-full shadow-2xl border-2 ${warningData.borderColor}`}>
        <CardHeader className={`text-center pb-4 ${warningData.bgColor} text-white rounded-t-lg`}>
          <div className="flex justify-center mb-3">
            <AlertTriangle className="w-16 h-16" strokeWidth={2} />
          </div>
          <CardTitle className="text-2xl font-bold">
            {warningData.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-6 px-8">
          <ul className="space-y-4 text-slate-700 leading-relaxed">
            {warningData.warnings.map((warning, index) => (
              <li key={index} className="flex items-start">
                <span className={`mr-3 ${warningData.textColor} font-bold text-lg`}>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end mt-8">
            <Button
              onClick={onContinue}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-6 text-base transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WarningScreen;