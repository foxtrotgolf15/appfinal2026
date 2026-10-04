import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Clock } from 'lucide-react';

const ScrollTimePicker = ({ value, onChange, label, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Convertir minutos a HH:MM:SS
  const minutosAHMS = (minutos) => {
    const totalSegundos = Math.round(minutos * 60);
    const horas = Math.floor(totalSegundos / 3600);
    const mins = Math.floor((totalSegundos % 3600) / 60);
    const segs = totalSegundos % 60;
    return { horas, minutos: mins, segundos: segs };
  };

  // Convertir HH:MM:SS a minutos
  const hmsAMinutos = (horas, minutos, segundos) => {
    return horas * 60 + minutos + segundos / 60;
  };

  const valorInicial = value ? minutosAHMS(parseFloat(value)) : { horas: 0, minutos: 0, segundos: 0 };
  
  const [horas, setHoras] = useState(valorInicial.horas);
  const [minutos, setMinutos] = useState(valorInicial.minutos);
  const [segundos, setSegundos] = useState(valorInicial.segundos);

  const horasRef = useRef(null);
  const minutosRef = useRef(null);
  const segundosRef = useRef(null);

  // Arrays para las opciones
  const horasArray = Array.from({ length: 24 }, (_, i) => i);
  const minutosArray = Array.from({ length: 60 }, (_, i) => i);
  const segundosArray = Array.from({ length: 60 }, (_, i) => i);

  // Sincronizar scroll con estado inicial y cambios externos
  useEffect(() => {
    const timer = setTimeout(() => {
      const itemHeight = 48; // h-12 = 48px
      if (horasRef.current) {
        horasRef.current.scrollTop = horas * itemHeight;
      }
      if (minutosRef.current) {
        minutosRef.current.scrollTop = minutos * itemHeight;
      }
      if (segundosRef.current) {
        segundosRef.current.scrollTop = segundos * itemHeight;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [horas, minutos, segundos]);

  // Actualizar valor cuando cambian las selecciones
  useEffect(() => {
    const totalMinutos = hmsAMinutos(horas, minutos, segundos);
    onChange(totalMinutos.toFixed(2));
  }, [horas, minutos, segundos, onChange]);

  const handleScroll = (ref, setter, max) => {
    if (!ref.current) return;
    
    const itemHeight = 48; // h-12 = 48px
    const scrollTop = ref.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(max - 1, index));
    
    // Solo actualizar si cambió
    setter(prev => {
      if (prev !== clampedIndex) {
        return clampedIndex;
      }
      return prev;
    });
  };

  const formatearTiempo = () => {
    const { horas, minutos: mins, segundos: segs } = minutosAHMS(parseFloat(value || 0));
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
  };

  const handleAceptar = () => {
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 block">
          {label}
        </label>
      )}
      
      {/* Campo de solo lectura que abre el modal */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-slate-300 rounded-lg hover:border-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-lg font-semibold text-slate-700">
          {formatearTiempo()}
        </span>
        <Clock className="w-5 h-5 text-slate-500" />
      </button>

      {/* Modal con el time picker */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar tiempo de fondo</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-center gap-3 bg-slate-50 rounded-lg p-4 sm:p-6 border-2 border-slate-200">
        {/* Columna Horas */}
        <div className="flex flex-col items-center">
          <div className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">Horas</div>
          <div className="relative">
            {/* Indicador de selección */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-full h-12 bg-blue-100 border-2 border-blue-400 rounded-lg"></div>
            </div>
            
            <div
              ref={horasRef}
              onScroll={() => handleScroll(horasRef, setHoras, horasArray.length)}
              className="h-40 w-16 sm:w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative"
              style={{ scrollSnapType: 'y mandatory' }}
            >
              <div className="h-14"></div>
              {horasArray.map((h) => (
                <div
                  key={h}
                  className="h-12 flex items-center justify-center text-xl sm:text-2xl font-bold text-slate-700 snap-center relative z-20"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}
              <div className="h-14"></div>
            </div>
          </div>
        </div>

        <span className="text-3xl sm:text-4xl font-bold text-slate-600 mt-8">:</span>

        {/* Columna Minutos */}
        <div className="flex flex-col items-center">
          <div className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">Minutos</div>
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-full h-12 bg-blue-100 border-2 border-blue-400 rounded-lg"></div>
            </div>
            
            <div
              ref={minutosRef}
              onScroll={() => handleScroll(minutosRef, setMinutos, minutosArray.length)}
              className="h-40 w-16 sm:w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              style={{ scrollSnapType: 'y mandatory' }}
            >
              <div className="h-14"></div>
              {minutosArray.map((m) => (
                <div
                  key={m}
                  className="h-12 flex items-center justify-center text-xl sm:text-2xl font-bold text-slate-700 snap-center relative z-20"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  {String(m).padStart(2, '0')}
                </div>
              ))}
              <div className="h-14"></div>
            </div>
          </div>
        </div>

        <span className="text-3xl sm:text-4xl font-bold text-slate-600 mt-8">:</span>

        {/* Columna Segundos */}
        <div className="flex flex-col items-center">
          <div className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">Segundos</div>
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-full h-12 bg-blue-100 border-2 border-blue-400 rounded-lg"></div>
            </div>
            
            <div
              ref={segundosRef}
              onScroll={() => handleScroll(segundosRef, setSegundos, segundosArray.length)}
              className="h-40 w-16 sm:w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              style={{ scrollSnapType: 'y mandatory' }}
            >
              <div className="h-14"></div>
              {segundosArray.map((s) => (
                <div
                  key={s}
                  className="h-12 flex items-center justify-center text-xl sm:text-2xl font-bold text-slate-700 snap-center relative z-20"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  {String(s).padStart(2, '0')}
                </div>
              ))}
              <div className="h-14"></div>
            </div>
          </div>
        </div>
      </div>

          {/* Mostrar valor total en minutos */}
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-slate-500">
              Total: <span className="font-semibold text-slate-700">{hmsAMinutos(horas, minutos, segundos).toFixed(2)}</span> minutos
            </span>
            <button
              type="button"
              onClick={() => {
                setHoras(0);
                setMinutos(0);
                setSegundos(0);
                if (horasRef.current) horasRef.current.scrollTop = 0;
                if (minutosRef.current) minutosRef.current.scrollTop = 0;
                if (segundosRef.current) segundosRef.current.scrollTop = 0;
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Resetear
            </button>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              onClick={handleAceptar}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScrollTimePicker;
