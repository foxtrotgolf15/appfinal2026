import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Play, Pause, RotateCcw } from 'lucide-react';

const Stopwatch = ({ label }) => {
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [estaActivo, setEstaActivo] = useState(false);
  const [mostrarDialogoReset, setMostrarDialogoReset] = useState(false);
  const intervalRef = useRef(null);

  // Formatear tiempo en mm:ss
  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Lógica del cronómetro
  useEffect(() => {
    if (estaActivo) {
      intervalRef.current = setInterval(() => {
        setTiempoTranscurrido((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [estaActivo]);

  // Limpiar interval al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const iniciarPausar = () => {
    setEstaActivo(!estaActivo);
  };

  const manejarReset = () => {
    if (tiempoTranscurrido > 0) {
      setMostrarDialogoReset(true);
    } else {
      resetear();
    }
  };

  const resetear = () => {
    clearInterval(intervalRef.current);
    setTiempoTranscurrido(0);
    setEstaActivo(false);
    setMostrarDialogoReset(false);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-gray-800 mb-2">
          {formatearTiempo(tiempoTranscurrido)}
        </div>
        <div className="text-sm text-gray-600">
          {label}
        </div>
      </div>

      <div className="flex justify-center space-x-2">
        <Button
          onClick={iniciarPausar}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          {estaActivo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{estaActivo ? 'Pausar' : 'Iniciar'}</span>
        </Button>

        <Button
          onClick={manejarReset}
          variant="outline" 
          size="sm"
          className="flex items-center space-x-1"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </Button>
      </div>

      <AlertDialog open={mostrarDialogoReset} onOpenChange={setMostrarDialogoReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar reset?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea reiniciar el cronómetro? Se perderá el tiempo registrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetear}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Stopwatch;