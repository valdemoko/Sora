import { useNavigate } from 'react-router-dom';
import ActionMenu from './ActionMenu';

// Pestaña del perfil destinada a la visualización de la galería fotográfica del usuario
export default function PhotosTab({ photos, isSelf, activeMenu, setActiveMenu, onEdit, onDelete }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
      {photos?.map((ph) => (
        <div key={ph.id} className="glass-card-mini" style={{ padding: 10, borderRadius: 24, position: 'relative' }}>
          {/* Contenedor interactivo para la visualización escalada de la fotografía */}
          <div 
            style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '1', cursor: 'pointer' }}
            onClick={() => navigate(`/photos?photoId=${ph.id}`)}
          >
            <img src={ph.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {/* Menú contextual de opciones restringido al propietario de la publicación */}
          {isSelf && (
            <ActionMenu
              type="photo"
              item={ph}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      ))}
      {/* Alerta informativa en caso de ausencia de imágenes publicadas */}
      {!photos?.length && (
        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
          <p className="empty-hint">Tus fotos saldrán aquí.</p>
        </div>
      )}
    </div>
  );
}
