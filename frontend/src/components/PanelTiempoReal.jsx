import React from 'react';
import { Card, CardContent } from './ui/card';

const formatMMSS = (segundos) => {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

const Dato = ({ etiqueta, valor, clase = '', valorClase = 'text-slate-900' }) => (
  <div className={`bg-white rounded border border-slate-200 px-2 py-1 md:p-2 md:tall:p-4 ${clase}`}>
    <div className="text-[10px] leading-tight md:text-xs md:tall:text-sm text-slate-500">{etiqueta}</div>
    <div className={`text-base md:text-xl md:tall:text-3xl font-bold font-mono leading-tight ${valorClase}`}>{valor}</div>
  </div>
);

const MENSAJES = {
  sin_profundidad: 'Introduce la profundidad máxima para ver los datos de tabulación',
  falta_instrumento: 'Selecciona el instrumento de medición de profundidad'
};

const PanelTiempoReal = ({ panel, elapsedTime }) => {
  if (panel.estado !== 'ok') {
    return (
      <Card className="mt-2 md:mt-4 border-2 border-slate-200" data-testid="panel-tiempo-real">
        <CardContent className="p-2 md:p-3 md:tall:p-6">
          <p className="text-xs md:text-base text-slate-600 text-center">
            {panel.estado === 'error' ? panel.mensaje : MENSAJES[panel.estado]}
          </p>
        </CardContent>
      </Card>
    );
  }

  const restante = Math.max(0, panel.tiempoTabulado * 60 - elapsedTime);
  const colorRestante = restante <= 30 ? 'text-red-600' : restante <= 120 ? 'text-amber-600' : 'text-green-700';

  return (
    <Card className="mt-2 md:mt-4 border-2 border-slate-200 bg-slate-50" data-testid="panel-tiempo-real">
      <CardContent className="p-2 md:p-3 md:tall:p-6">
        <div className="grid grid-cols-2 gap-1.5 md:gap-2 md:tall:gap-4">
          <Dato etiqueta="Profundidad tabulada" valor={`${panel.profundidadTabulada} m`} />
          <Dato etiqueta="Tiempo tabulado" valor={`${panel.tiempoTabulado} min`} />
          <Dato
            etiqueta="Siguiente tiempo de tabla"
            valor={panel.siguienteTiempo !== null ? `${panel.siguienteTiempo} min` : '—'}
          />
          <Dato
            etiqueta="Faltan para tabular por el siguiente"
            valor={formatMMSS(restante)}
            valorClase={colorRestante}
          />
          <Dato
            clase="col-span-2"
            etiqueta={`Descompresión total (mm:ss) · con ${panel.modo === 'o2' ? 'O2' : 'aire'}${panel.asumido ? ' (sin elegir tipo)' : ''}`}
            valor={panel.descompresionTotal}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PanelTiempoReal;
