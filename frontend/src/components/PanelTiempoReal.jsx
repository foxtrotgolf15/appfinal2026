import React from 'react';
import { Card, CardContent } from './ui/card';

const formatMMSS = (segundos) => {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

const Dato = ({ etiqueta, valor, valorClase = 'text-slate-900' }) => (
  <div className="bg-white rounded-md border border-slate-200 px-2.5 py-1.5 md:px-3 md:py-2">
    <div className="text-[10px] leading-tight md:text-xs text-slate-500">{etiqueta}</div>
    <div className={`text-base md:text-2xl font-bold font-mono leading-tight ${valorClase}`}>{valor}</div>
  </div>
);

const Fila = ({ etiqueta, valor, valorClase = 'text-slate-900' }) => (
  <div className="flex items-center justify-between gap-2 bg-white rounded border border-slate-200 px-2 py-1 md:px-3 md:py-1.5">
    <span className="text-[11px] md:text-sm text-slate-700">{etiqueta}</span>
    <span className={`text-xs md:text-base font-bold font-mono ${valorClase}`}>{valor}</span>
  </div>
);

// Filas de paradas de un escenario: tiempo hasta 1ª parada + cada parada. Sin paradas: ascenso a superficie.
const ListaParadas = ({ esc }) => {
  if (esc.paradas.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <Fila etiqueta="Sin paradas" valor="—" />
        {esc.superficie && <Fila etiqueta="Ascenso a superficie" valor={esc.superficie} valorClase="text-amber-700" />}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {esc.primeraParada && (
        <Fila etiqueta="Tiempo hasta 1ª parada" valor={esc.primeraParada} valorClase="text-amber-700" />
      )}
      {esc.paradas.map((p, i) => (
        <Fila
          key={i}
          etiqueta={`Parada a ${p.profundidad} m${p.o2 ? ' (O₂)' : ''}`}
          valor={formatMMSS(p.segundos)}
        />
      ))}
    </div>
  );
};

const Bloque = ({ children, className = '', titulo }) => (
  <Card className={`border-2 border-slate-200 bg-slate-50 ${className}`} data-testid="panel-tiempo-real">
    <CardContent className="p-2.5 md:p-4">
      {titulo && <h2 className="text-xs font-bold tracking-wide text-slate-600 uppercase mb-2">{titulo}</h2>}
      {children}
    </CardContent>
  </Card>
);

const Dos = ({ izquierda, derecha }) => (
  <div className="grid grid-cols-[1fr_1.4fr] gap-2 md:gap-3 items-start">
    <div className="flex flex-col gap-1.5 md:gap-2">{izquierda}</div>
    {derecha}
  </div>
);

const MENSAJES = {
  sin_profundidad: 'Introduce la profundidad máxima para ver los datos de tabulación',
  falta_instrumento: 'Selecciona el tipo de profundímetro'
};

const Vacio = ({ texto }) => <p className="text-sm text-slate-500 text-center py-3">{texto}</p>;

// Devuelve tres tarjetas (tabulación actual, siguiente tiempo, siguiente profundidad)
// para colocarlas directamente en la cuadrícula de la pantalla.
const PanelTiempoReal = ({ panel, elapsedTime }) => {
  if (panel.estado !== 'ok') {
    const msg = panel.estado === 'error' ? panel.mensaje : MENSAJES[panel.estado];
    return (
      <>
        <Bloque titulo="Tabulación actual" className="md:col-span-2 md:row-start-1">
          <Vacio texto={msg} />
        </Bloque>
        <Bloque className="md:col-span-2"><Vacio texto="—" /></Bloque>
        <Bloque className="md:col-span-2"><Vacio texto="—" /></Bloque>
      </>
    );
  }

  const { actual, siguienteTiempo, siguienteProfundidad } = panel;
  // Con paradas: hasta el siguiente cambio de tiempo tabulado. Sin paradas: hasta cumplir el último
  // tiempo sin parada (justo antes del primer tiempo que ya tiene parada).
  const limite = siguienteTiempo && siguienteTiempo.limiteSinParada !== undefined
    ? siguienteTiempo.limiteSinParada
    : actual.tiempo;
  const restante = Math.max(0, limite * 60 - elapsedTime);
  const colorRestante = restante <= 30 ? 'text-red-600' : restante <= 120 ? 'text-amber-600' : 'text-green-700';

  return (
    <>
      <Bloque titulo="Tabulación actual" className="md:col-span-2 md:row-start-1">
        <Dos
          izquierda={<>
            <Dato etiqueta="Profundidad tabulada" valor={`${actual.profundidad} m`} />
            <Dato etiqueta="Tiempo tabulado" valor={`${actual.tiempo} min`} />
          </>}
          derecha={<ListaParadas esc={actual} />}
        />
      </Bloque>

      <Bloque className="md:col-span-2">
        {siguienteTiempo ? (
          <Dos
            izquierda={<>
              <Dato etiqueta="Tiempo para siguiente tabla" valor={formatMMSS(restante)} valorClase={colorRestante} />
              <Dato etiqueta="Profundidad" valor={`${siguienteTiempo.profundidad} m`} />
              <Dato etiqueta="Tiempo" valor={`${siguienteTiempo.tiempo} min`} />
            </>}
            derecha={<ListaParadas esc={siguienteTiempo} />}
          />
        ) : (
          <Vacio texto={actual.paradas.length === 0 ? "No hay tiempo con paradas en tabla" : "No hay siguiente tiempo en tabla"} />
        )}
      </Bloque>

      <Bloque className="md:col-span-2">
        {siguienteProfundidad && !siguienteProfundidad.fueraDeTabla ? (
          <Dos
            izquierda={<>
              <Dato etiqueta="Siguiente profundidad" valor={`${siguienteProfundidad.profundidad} m`} />
              <Dato etiqueta="Tiempo" valor={`${siguienteProfundidad.tiempo} min`} />
            </>}
            derecha={<ListaParadas esc={siguienteProfundidad} />}
          />
        ) : (
          <Vacio texto={siguienteProfundidad ? `No hay en tabla (${siguienteProfundidad.profundidad} m con este tiempo)` : 'No hay siguiente profundidad en tabla'} />
        )}
      </Bloque>
    </>
  );
};

export default PanelTiempoReal;
