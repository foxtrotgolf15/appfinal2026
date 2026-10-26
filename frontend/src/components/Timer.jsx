import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Play, Pause, RotateCcw, Bell } from 'lucide-react';

const Timer = ({ duracion, label, inicioTs }) => {
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [estaActivo, setEstaActivo] = useState(false);
  const [notificacionEnviada, setNotificacionEnviada] = useState(false);
  const [mostrarDialogoReset, setMostrarDialogoReset] = useState(false);
  const [mostrarDialogoAlarma, setMostrarDialogoAlarma] = useState(false);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const vibracionIntervalRef = useRef(null);

  // Convertir duración mm:ss a segundos totales
  const parsearDuracion = (duracionStr) => {
    if (!duracionStr) return 0;
    const partes = String(duracionStr).split(':');
    if (partes.length === 2) {
      const [mins, secs] = partes.map(num => parseInt(num) || 0);
      return mins * 60 + secs;
    }
    return 0;
  };

  // Inicializar temporizador
  const inicializar = () => {
    const segundosTotales = parsearDuracion(duracion);
    setTiempoRestante(segundosTotales);
    setEstaActivo(false);
    setNotificacionEnviada(false);
  };

  // Arranque automático: si llega la hora de inicio (pulsar "Abandonar fondo"),
  // se descuentan los segundos ya transcurridos y el cronómetro empieza solo.
  useEffect(() => {
    if (!inicioTs) return;
    const total = parsearDuracion(duracion);
    const transcurridos = Math.max(0, Math.floor((Date.now() - inicioTs) / 1000));
    const restante = Math.max(0, total - transcurridos);
    setTiempoRestante(restante);
    setNotificacionEnviada(false);
    setEstaActivo(restante > 0);
    // eslint-disable-next-line
  }, []);

  // Solicitar permisos de notificación al montar el componente
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup al desmontar: detener alarmas
    return () => {
      detenerSonido();
      detenerVibracion();
    };
  }, []);

  // Lógica del temporizador
  useEffect(() => {
    if (estaActivo && tiempoRestante !== null) {
      intervalRef.current = setInterval(() => {
        setTiempoRestante((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setEstaActivo(false);
            
            // Ejecutar notificación y sonido con manejo de errores
            try {
              enviarNotificacion();
            } catch (err) {
              console.error('Error al enviar notificación:', err);
            }
            
            try {
              reproducirSonido();
            } catch (err) {
              console.error('Error al reproducir sonido:', err);
            }
            
            // Mostrar modal de alarma
            setMostrarDialogoAlarma(true);
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [estaActivo, tiempoRestante]);

  const iniciarVibracionContinua = () => {
    // Detener vibración previa si existe
    detenerVibracion();
    
    // Verificar soporte de vibración
    if (!('vibrate' in navigator)) {
      console.warn('Vibration API no soportada en este dispositivo');
      return;
    }
    
    // Patrón de vibración más largo para Android: [vibrar, pausa, vibrar, pausa, ...]
    // 1000ms vibración, 500ms pausa, 1000ms vibración, 1000ms pausa entre ciclos
    const patronVibracion = [1000, 500, 1000, 1000];
    
    const vibrar = () => {
      try {
        // Usar patrón infinito con el patrón definido
        navigator.vibrate(patronVibracion);
      } catch (err) {
        console.error('Error al vibrar:', err);
      }
    };
    
    // Vibrar inmediatamente
    vibrar();
    
    // Repetir el patrón cada 3.5 segundos (duración total del patrón)
    vibracionIntervalRef.current = setInterval(vibrar, 3500);
    
    console.log('Vibración continua iniciada');
  };

  const detenerVibracion = () => {
    console.log('Deteniendo vibración...');
    
    if (vibracionIntervalRef.current) {
      clearInterval(vibracionIntervalRef.current);
      vibracionIntervalRef.current = null;
    }
    
    if ('vibrate' in navigator) {
      try {
        // Detener vibración con array vacío (más compatible que 0)
        navigator.vibrate([]);
        navigator.vibrate(0);
        console.log('Vibración detenida');
      } catch (err) {
        console.error('Error al detener vibración:', err);
      }
    }
  };

  const enviarNotificacion = () => {
    if (notificacionEnviada) return;
    
    setNotificacionEnviada(true);

    // Notificación del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ Temporizador Finalizado', {
        body: `${label} ha finalizado`,
        icon: '/icon-192.png',
        tag: 'timer-notification',
        requireInteraction: true
      });
    }

    // Iniciar vibración continua
    iniciarVibracionContinua();
  };

  const detenerSonido = () => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch (err) {
        console.error('Error al cerrar AudioContext:', err);
      }
    }
  };

  const reproducirSonido = () => {
    try {
      // Verificar si Web Audio API está disponible
      if (!window.AudioContext && !window.webkitAudioContext) {
        console.warn('Web Audio API no está disponible en este navegador');
        return;
      }

      // Detener sonido previo si existe
      detenerSonido();

      // Crear una alarma más larga y estridente usando Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // En algunos navegadores móviles, el contexto puede estar suspendido
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.error('Error al reanudar AudioContext:', err);
        });
      }
      
      // Configuración de la alarma: 3 ciclos de beeps agudos
      const reproducirBeep = (startTime, frequency, duration) => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = 'square'; // Más estridente que 'sine'

          // Volumen más alto (0.5 en lugar de 0.3)
          gainNode.gain.setValueAtTime(0.5, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        } catch (err) {
          console.error('Error al reproducir beep:', err);
        }
      };

      // Reproducir 3 ciclos de beeps con frecuencias alternas (más estridente)
      const beepDuration = 0.4; // Duración de cada beep
      const pauseDuration = 0.15; // Pausa entre beeps
      const cycleTime = beepDuration + pauseDuration;

      // Primer ciclo: frecuencia alta (1200 Hz)
      reproducirBeep(audioContext.currentTime, 1200, beepDuration);
      reproducirBeep(audioContext.currentTime + cycleTime, 1000, beepDuration);
      reproducirBeep(audioContext.currentTime + cycleTime * 2, 1200, beepDuration);
      
      // Segundo ciclo después de una pausa corta
      reproducirBeep(audioContext.currentTime + cycleTime * 3 + 0.3, 1200, beepDuration);
      reproducirBeep(audioContext.currentTime + cycleTime * 4 + 0.3, 1000, beepDuration);
      reproducirBeep(audioContext.currentTime + cycleTime * 5 + 0.3, 1200, beepDuration);
    } catch (err) {
      console.error('Error al reproducir sonido:', err);
      // Si falla el audio, al menos asegurar que la UI sigue funcionando
    }
  };

  const iniciarPausar = () => {
    // Test de vibración con interacción del usuario (requerido en móviles)
    if ('vibrate' in navigator && tiempoRestante === null) {
      try {
        // Vibración corta de confirmación (50ms)
        navigator.vibrate(50);
        console.log('Test de vibración exitoso');
      } catch (err) {
        console.warn('No se pudo probar vibración:', err);
      }
    }
    
    // Inicializar AudioContext con interacción del usuario (requerido en móviles)
    try {
      if (window.AudioContext || window.webkitAudioContext) {
        const tempContext = new (window.AudioContext || window.webkitAudioContext)();
        if (tempContext.state === 'suspended') {
          tempContext.resume().then(() => {
            tempContext.close();
          }).catch(err => {
            console.warn('No se pudo inicializar audio:', err);
          });
        } else {
          tempContext.close();
        }
      }
    } catch (err) {
      console.warn('Error al inicializar audio context:', err);
    }
    
    if (tiempoRestante === null) {
      inicializar();
      setEstaActivo(true);
    } else {
      setEstaActivo(!estaActivo);
    }
  };

  const solicitarReiniciar = () => {
    setMostrarDialogoReset(true);
  };

  const confirmarReiniciar = () => {
    inicializar();
    setMostrarDialogoReset(false);
  };

  const cancelarReiniciar = () => {
    setMostrarDialogoReset(false);
  };

  const detenerAlarma = () => {
    // Detener sonido
    detenerSonido();
    
    // Detener vibración
    detenerVibracion();
    
    // Cerrar modal
    setMostrarDialogoAlarma(false);
  };

  const formatearTiempo = (segundos) => {
    if (segundos === null) return duracion;
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progreso = tiempoRestante !== null 
    ? ((parsearDuracion(duracion) - tiempoRestante) / parsearDuracion(duracion)) * 100 
    : 0;

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border-2 border-indigo-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Bell className={`w-5 h-5 ${tiempoRestante === 0 ? 'text-red-600 animate-bounce' : 'text-indigo-600'}`} />
            <span className="text-sm font-medium text-slate-700">Temporizador</span>
          </div>
          <div className={`text-2xl font-bold ${
            tiempoRestante === 0 ? 'text-red-600 animate-pulse' : 
            estaActivo ? 'text-green-600' : 'text-indigo-700'
          }`}>
            {formatearTiempo(tiempoRestante)}
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              tiempoRestante === 0 ? 'bg-red-600' : 'bg-gradient-to-r from-indigo-500 to-blue-500'
            }`}
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={iniciarPausar}
            size="sm"
            className={`flex-1 ${
              estaActivo 
                ? 'bg-orange-500 hover:bg-orange-600' 
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
            } text-white transition-all duration-200`}
          >
            {estaActivo ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                {tiempoRestante === null ? 'Iniciar' : 'Reanudar'}
              </>
            )}
          </Button>
          <Button
            onClick={solicitarReiniciar}
            size="sm"
            variant="outline"
            className="border-2 border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
            disabled={tiempoRestante === null && !estaActivo}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {tiempoRestante === 0 && (
          <div className="mt-2 text-center">
            <span className="text-xs font-semibold text-red-600 animate-pulse">
              ¡TIEMPO FINALIZADO!
            </span>
          </div>
        )}
      </div>

      {/* Diálogo de confirmación para resetear */}
      <AlertDialog open={mostrarDialogoReset} onOpenChange={setMostrarDialogoReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reinicio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea resetear el temporizador?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelarReiniciar}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarReiniciar} className="bg-red-600 hover:bg-red-700">
              Sí, resetear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de alarma cuando finaliza el temporizador */}
      <AlertDialog open={mostrarDialogoAlarma} onOpenChange={setMostrarDialogoAlarma}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-center text-red-600 flex items-center justify-center gap-2">
              <Bell className="w-8 h-8 animate-bounce" />
              ¡Temporizador Finalizado!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-lg font-semibold pt-4">
              {label} finalizada
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction 
              onClick={detenerAlarma} 
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 text-base"
            >
              Detener Alarma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Timer;