import React from 'react';
import { Card, CardContent } from './ui/card';

const formatMMSS = (segundos) => {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

const Dato = ({ etiqueta, valor, valorClase = 'text-slate-900', destacado = false }) => (
  <div className={`bg-white rounded-md border px-2.5 py-1.5 md:px-3 md:py-2 ${destacado ? 'border-blue-300' : 'border-slate-200'}`}>
    <div className={`leading-tight ${destacado ? 'text-xs md:text-sm font-semibold text-slate-700' : 'text-[10px] md:text-xs text-slate-500'}`}>{etiqueta}</div>
    <div className={`font-bold font-mono leading-tight ${destacado ? 'text-2xl md:text-4xl font-extrabold' : 'text-base md:text-2xl'} ${valorClase}`}>{valor}</div>
  </div>
);

const Fila = ({ etiqueta, valor, valorClase = 'text-slate-900', destacado = false }) => (
  <div className={`flex items-center justify-between gap-2 bg-white rounded border px-2 py-1 md:px-3 md:py-1.5 ${destacado ? 'border-blue-300' : 'border-slate-200'}`}>
    <span className={`text-[11px] md:text-sm ${destacado ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{etiqueta}</span>
    <span className={`font-mono ${destacado ? 'text-sm md:text-xl font-extrabold' : 'text-xs md:text-base font-bold'} ${valorClase}`}>{valor}</span>
  </div>
);

// Filas de paradas de un escenario: tiempo hasta 1ª parada + cada parada. Sin paradas: ascenso a superficie.
const ListaParadas = ({ esc, color = false, destacado = false }) => {
  const vc = color ? 'text-amber-700' : 'text-slate-700';
  if (esc.paradas.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <Fila etiqueta="Sin paradas" valor="—" destacado={destacado} />
        {esc.superficie && <Fila etiqueta="Ascenso a superficie" valor={esc.superficie} valorClase={vc} destacado={destacado} />}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {esc.primeraParada && (
        <Fila etiqueta="Tiempo hasta 1ª parada" valor={esc.primeraParada} valorClase={vc} destacado={destacado} />
      )}
      {esc.paradas.map((p, i) => (
        <Fila
          key={i}
          etiqueta={`Parada a ${p.profundidad} m${p.o2 ? ' (O₂)' : ''}`}
          valor={formatMMSS(p.segundos)}
          destacado={destacado}
        />
      ))}
    </div>
  );
};

const Bloque = ({ children, className = '', titulo, destacado = false }) => (
  <Card className={`${destacado ? 'border-4 border-blue-600 bg-blue-50 shadow-md' : 'border-2 border-slate-200 bg-slate-50'} ${className}`} data-testid="panel-tiempo-real">
    <CardContent className="p-2.5 md:p-4">
      {titulo && <h2 className={`font-bold tracking-wide uppercase mb-2 ${destacado ? 'text-sm md:text-base text-blue-800' : 'text-xs text-slate-600'}`}>{titulo}</h2>}
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
        <Bloque destacado titulo="Tabulación actual" className="md:col-span-2 md:row-start-1">
          <Vacio texto={msg} />
        </Bloque>
        <Bloque titulo="Siguiente tabulación por tiempo" className="md:col-span-2"><Vacio texto="—" /></Bloque>
        <Bloque titulo="Siguiente tabulación por profundidad" className="md:col-span-2"><Vacio texto="—" /></Bloque>
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
      <Bloque destacado titulo="Tabulación actual" className="md:col-span-2 md:row-start-1">
        <Dos
          izquierda={<>
            <Dato destacado etiqueta="Profundidad tabulada" valor={`${actual.profundidad} m`} />
            <Dato destacado etiqueta="Tiempo tabulado" valor={`${actual.tiempo} min`} />
          </>}
          derecha={<ListaParadas esc={actual} color destacado />}
        />
      </Bloque>

      <Bloque titulo="Siguiente tabulación por tiempo" className="md:col-span-2">
        {siguienteTiempo ? (
          <Dos
            izquierda={<>
              <Dato etiqueta="Tiempo para esta tabla" valor={formatMMSS(restante)} valorClase={colorRestante} />
              <Dato etiqueta="Profundidad" valor={`${siguienteTiempo.profundidad} m`} valorClase="text-slate-700" />
              <Dato etiqueta="Tiempo" valor={`${siguienteTiempo.tiempo} min`} valorClase="text-slate-700" />
            </>}
            derecha={<ListaParadas esc={siguienteTiempo} />}
          />
        ) : (
          <Vacio texto={actual.paradas.length === 0 ? "No hay tiempo con paradas en tabla" : "No hay siguiente tiempo en tabla"} />
        )}
      </Bloque>

      <Bloque titulo="Siguiente tabulación por profundidad" className="md:col-span-2">
        {siguienteProfundidad && !siguienteProfundidad.fueraDeTabla ? (
          <Dos
            izquierda={<>
              <Dato etiqueta="Siguiente profundidad" valor={`${siguienteProfundidad.profundidad} m`} valorClase="text-slate-700" />
              <Dato etiqueta="Tiempo" valor={`${siguienteProfundidad.tiempo} min`} valorClase="text-slate-700" />
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
