import { useNavigate } from 'react-router-dom';
import ActionMenu from './ActionMenu';

// Pestaña del perfil destinada a la visualización del listado de publicaciones del usuario en el foro
export default function PostsTab({ posts, isSelf, activeMenu, setActiveMenu, onEdit, onDelete }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {posts?.map((po) => (
        <div key={po.id} className="glass-card" style={{ padding: 35, borderRadius: 28, width: '100%', position: 'relative' }}>
          {/* Menú contextual de opciones restringido al propietario del post */}
          {isSelf && (
            <ActionMenu
              type="post"
              item={po}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
          {/* Contenedor interactivo para acceder al hilo completo de discusión */}
          <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/posts?postId=${po.id}`)}>
            <p style={{ fontSize: '1.05rem', marginBottom: 20, lineHeight: 1.7, color: 'rgba(255,255,255,0.9)', paddingRight: 40 }}>{po.body}</p>
            {/* Contadores agregados de interacción (reacciones y respuestas recibidas) */}
            <div style={{ display: 'flex', gap: 25, opacity: 0.4, fontSize: '0.8rem', fontWeight: 700 }}>
              <span>{po.likes_count} likes</span>
              <span>{po.replies_count} respuestas</span>
            </div>
          </div>
        </div>
      ))}
      {/* Alerta informativa en caso de ausencia de aportaciones del usuario en el foro */}
      {!posts?.length && (
        <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
          <p className="empty-hint">Tus foros saldrán aquí.</p>
        </div>
      )}
    </div>
  );
}
