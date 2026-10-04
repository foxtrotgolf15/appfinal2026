import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { FileText, Home } from 'lucide-react';

const LegalFooter = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mode-selection')}
            className="text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Inicio</span>
          </Button>
          
          <div className="h-4 w-px bg-slate-600"></div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Términos legales</span>
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-amber-600 flex items-center space-x-2">
              <FileText className="w-6 h-6" />
              <span>Aviso y exención de responsabilidad</span>
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-slate max-w-none mt-4">
            <p className="text-slate-700 leading-relaxed text-justify mb-4">
              Esta aplicación se ofrece únicamente con fines de información y no sustituye a la formación profesional, a las tablas oficiales de descompresión ni a las normas establecidas por la empresa o la autoridad competente. Los cálculos, procedimientos y datos incluidos se basan en la REVISION 7 CHANGE A del U.S. Navy Diving Manual (distribución pública), pero pueden contener errores o haber sido modificados por actualizaciones posteriores.
            </p>
            <p className="text-slate-700 leading-relaxed text-justify">
              El desarrollador declina cualquier responsabilidad por lesiones, daños a personas o bienes o cualquier consecuencia derivada del uso o mal uso de la información contenida en esta aplicación. El usuario y el supervisor de la inmersión son los únicos responsables de planificar y ejecutar las inmersiones, verificar la exactitud de los datos y cumplir la normativa vigente. No utilice esta aplicación si no dispone de la formación y certificación adecuada y no emprenda procedimientos sugeridos por la aplicación a menos que, a su juicio, el riesgo esté justificado y asuma toda la responsabilidad.
            </p>
          </div>
          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setOpen(false)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all duration-300"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LegalFooter;