import { useEffect, useRef } from 'react';

/**
 * Componente reutilizable y autocontenido para mostrar banners de error estilizados
 * con un temporizador automático que oculta el error después de un tiempo definido.
 *
 * @param {string} message - El mensaje de error a mostrar.
 * @param {function} onClear - Callback para limpiar el estado del error en el componente padre.
 * @param {number} [duration=5000] - Duración en milisegundos antes de ocultar el error.
 * @param {object} [style] - Estilos inline opcionales.
 */
export default function ErrorBanner({ message, onClear, duration = 5000, style }) {
  const onClearRef = useRef(onClear);

  // Mantener el ref actualizado con la versión más reciente de la función callback
  useEffect(() => {
    onClearRef.current = onClear;
  }, [onClear]);

  useEffect(() => {
    if (!message) return;

    // Configurar temporizador para limpiar el error automáticamente
    const timer = setTimeout(() => {
      if (onClearRef.current) onClearRef.current();
    }, duration);

    // Limpieza del temporizador en caso de que el mensaje cambie o el componente se desmonte
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message) return null;

  return (
    <div className="error-hint fade-in" style={style}>
      {message}
    </div>
  );
}
