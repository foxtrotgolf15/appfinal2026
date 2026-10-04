import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle } from 'lucide-react';

const LegalWarning = () => {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (accepted) {
      navigate('/mode-selection');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-2 sm:p-4">
      <Card className="max-w-3xl w-full shadow-2xl border-2 border-slate-200">
        <CardHeader className="text-center pb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg p-4 sm:p-6">
          <div className="flex justify-center mb-3">
            <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16" strokeWidth={2} />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">
            Aviso y exención de responsabilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="prose prose-slate max-w-none mb-6">
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed text-justify mb-4">
              Esta aplicación se ofrece únicamente con fines de información y no sustituye a la formación profesional, a las tablas oficiales de descompresión ni a las normas establecidas por la empresa o la autoridad competente. Los cálculos, procedimientos y datos incluidos se basan en la REVISION 7 CHANGE A del U.S. Navy Diving Manual (distribución pública), pero pueden contener errores o haber sido modificados por actualizaciones posteriores.
            </p>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed text-justify">
              El desarrollador declina cualquier responsabilidad por lesiones, daños a personas o bienes o cualquier consecuencia derivada del uso o mal uso de la información contenida en esta aplicación. El usuario y el supervisor de la inmersión son los únicos responsables de planificar y ejecutar las inmersiones, verificar la exactitud de los datos y cumplir la normativa vigente. No utilice esta aplicación si no dispone de la formación y certificación adecuada y no emprenda procedimientos sugeridos por la aplicación a menos que, a su juicio, el riesgo esté justificado y asuma toda la responsabilidad.
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-terms"
                checked={accepted}
                onCheckedChange={setAccepted}
                className="mt-1"
              />
              <label
                htmlFor="accept-terms"
                className="text-sm font-medium text-slate-700 leading-relaxed cursor-pointer select-none"
              >
                He leído y acepto las condiciones de uso y la exención de responsabilidad
              </label>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleContinue}
              disabled={!accepted}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4 sm:py-6 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Entendido, quiero continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalWarning;