import { IconDots, IconEdit, IconTrash } from '../../icons';

// Componente reutilizable de menú contextual flotante para la ejecución de acciones (Edición / Eliminación) en recursos
export default function ActionMenu({ type, item, activeMenu, setActiveMenu, onEdit, onDelete }) {
  // Determinación de visibilidad basándose en la coincidencia del tipo e identificador del elemento activo
  const isActive = activeMenu?.type === type && activeMenu?.id === item.id;

  return (
    <div style={{ position: 'absolute', top: type === 'photo' ? 15 : 25, right: type === 'photo' ? 15 : 25, zIndex: 100 }}>
      {/* Botón desencadenador del menú desplegable contextual */}
      <button
        className="btn-glass"
        style={{ width: 32, height: 32, padding: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenu(isActive ? null : { type, id: item.id });
        }}
      >
        <IconDots style={{ width: 14 }} />
      </button>

      {isActive && (
        <>
          {/* Telón de fondo invisible para la captura de clics externos y cierre del menú */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            onClick={() => setActiveMenu(null)}
          />
          {/* Panel flotante de opciones */}
          <div className="dropdown-panel dropdown-compact" style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 150,
            padding: 8,
            borderRadius: 18,
            zIndex: 100,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <button
              className="dropdown-item"
              style={{ width: '100%', padding: '10px 15px', gap: 10, borderRadius: 12, fontSize: '0.85rem' }}
              onClick={() => { onEdit(type, item); setActiveMenu(null); }}
            >
              <IconEdit style={{ width: 14 }} /> editar
            </button>
            <div className="dropdown-divider" style={{ margin: '4px 0' }} />
            <button
              className="dropdown-item"
              style={{ width: '100%', padding: '10px 15px', gap: 10, borderRadius: 12, fontSize: '0.85rem', color: '#ff4b4b' }}
              onClick={() => onDelete(type, item.id)}
            >
              <IconTrash style={{ width: 14 }} /> eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
