import React from 'react';

// Modal de confirmación para avisar al usuario antes de borrar o realizar alguna acción importante
export default function ConfirmModal({ message, onConfirm, onClose, confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  return (
    // Fondo oscuro translúcido que cierra la ventana al pulsar fuera
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      
      {/* Contenedor principal con estilo de tarjeta de cristal */}
      <div
        className="modal-content-glass fade-in"
        onClick={e => e.stopPropagation()} // Evita que se cierre al hacer clic dentro del cuadro
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '30px 40px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 25,
          borderRadius: 28
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.5, color: '#fff' }}>
          {message}
        </h3>

        <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
          {/* Botón para cancelar la acción */}
          <button
            type="button"
            className="btn-capsule round secondary"
            style={{ flex: 1, padding: '12px 20px', fontSize: '0.9rem', fontWeight: 600 }}
            onClick={onClose}
          >
            {cancelText}
          </button>
          
          {/* Botón para aceptar la acción */}
          <button
            type="button"
            className="btn-capsule round accent"
            style={{ flex: 1, padding: '12px 20px', fontSize: '0.9rem', fontWeight: 600 }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
