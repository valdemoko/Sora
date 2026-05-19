import { useNavigate } from 'react-router-dom';
import ActionMenu from './ActionMenu';

// Pestaña del perfil destinada a la visualización de grupos o comunidades activas del usuario
export default function GroupsTab({ groups, isSelf, activeMenu, setActiveMenu, onEdit, onDelete, me }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '100%' }}>
      {groups?.map((g) => {
        // Validación de propiedad sobre el grupo basándose en el identificador único del propietario
        const isOwner = Number(g.owner_id) === Number(me?.id);

        return (
          <div key={g.id} className="glass-card" style={{ padding: '25px 30px', borderRadius: 28, display: 'flex', alignItems: 'center', gap: 25, position: 'relative', width: '100%' }}>
            {/* Contenedor interactivo para redirección al detalle de la comunidad */}
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: 25, flex: 1, cursor: 'pointer', overflow: 'hidden' }}
              onClick={() => navigate(`/groups?groupId=${g.id}`)}
            >
              {/* Emblema visual representativo de la comunidad */}
              <div style={{ width: 75, height: 75, borderRadius: 22, overflow: 'hidden', flexShrink: 0 }}>
                {g.image_url ? <img src={g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', fontSize: '1.8rem' }}>👥</div>}
              </div>
              {/* Sumario textual e información cuantitativa de membresía */}
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '1.25rem', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.5 }}>{g.members_count} miembros</div>
              </div>
            </div>
            {/* Menú de administración contextual restringido al usuario propietario en su propio perfil */}
            {isSelf && isOwner && (
              <ActionMenu
                type="group"
                item={g}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
      {/* Alerta informativa en caso de ausencia de pertenencia a comunidades */}
      {!groups?.length && (
        <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
          <p className="empty-hint">Tus grupos saldrán aquí.</p>
        </div>
      )}
    </div>
  );
}
