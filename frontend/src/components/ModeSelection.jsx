import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Calendar, Clock } from 'lucide-react';

const ModeSelection = () => {
  const navigate = useNavigate();

  const handlePlanMode = () => {
    navigate('/form');
  };

  const handleRealtimeMode = () => {
    navigate('/realtime-form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl mx-auto">
        {/* Título principal */}
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-slate-800 px-2">
            Selecciona modo de uso
          </h1>
        </div>

        {/* Cards de selección */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Card: Planificar inmersión */}
          <Card 
            onClick={handlePlanMode}
            className="group cursor-pointer transform transition-all duration-300 active:scale-95 md:hover:scale-105 hover:shadow-2xl border-2 border-slate-200 hover:border-blue-500 bg-white"
          >
            <CardContent className="p-6 sm:p-8 md:p-10 flex flex-col items-center text-center space-y-4 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-blue-100 group-hover:bg-blue-500 transition-colors duration-300 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-300">
                  Planificar inmersión
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base leading-relaxed px-2">
                  Introduce los parámetros de tu inmersión y calcula las paradas de descompresión necesarias antes de sumergirte.
                </p>
              </div>

              <div className="pt-2 sm:pt-4">
                <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors text-sm sm:text-base">
                  Comenzar
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Calcular en tiempo real */}
          <Card 
            onClick={handleRealtimeMode}
            className="group cursor-pointer transform transition-all duration-300 active:scale-95 md:hover:scale-105 hover:shadow-2xl border-2 border-slate-200 hover:border-green-500 bg-white"
          >
            <CardContent className="p-6 sm:p-8 md:p-10 flex flex-col items-center text-center space-y-4 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-green-100 group-hover:bg-green-500 transition-colors duration-300 flex items-center justify-center flex-shrink-0">
                <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-600 group-hover:text-white transition-colors duration-300" />
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 group-hover:text-green-600 transition-colors duration-300">
                  Calcular en tiempo real
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base leading-relaxed px-2">
                  Inicia un cronómetro al comenzar la inmersión y calcula las paradas de descompresión en tiempo real.
                </p>
              </div>

              <div className="pt-2 sm:pt-4">
                <div className="inline-flex items-center text-green-600 font-semibold group-hover:text-green-700 transition-colors text-sm sm:text-base">
                  Comenzar
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;
