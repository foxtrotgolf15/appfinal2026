import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import WarningScreen from './WarningScreen';
import { calculateDecompression } from '../services/decompressionCalculator';
import { validateDiveType } from '../services/diveTypeValidator';

const WarningContainer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formData } = location.state || {};

  if (!formData) {
    navigate('/form');
    return null;
  }

  const handleContinue = () => {
    // Validar tipo de buceo
    const validation = validateDiveType(formData);
    
    if (!validation.valid) {
      // Tipo de buceo no implementado, volver al formulario con error
      navigate('/form', { state: { error: validation.error, formData } });
      return;
    }

    // Calcular los resultados
    const resultados = calculateDecompression(formData);

    // Verificar si hay error en el cálculo
    if (resultados.error) {
      // Volver al formulario con el error
      navigate('/form', { state: { error: resultados.error, formData } });
      return;
    }

    // Navegar a resultados
    navigate('/results', {
      state: {
        resultados,
        formData
      }
    });
  };

  return <WarningScreen onContinue={handleContinue} diveType={formData.p1} />;
};

export default WarningContainer;
