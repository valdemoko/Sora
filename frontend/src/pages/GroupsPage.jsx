import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../context/UserContext';
import { IconPlus, IconEdit } from '../icons';
import Loader from '../components/Loader';

// Pantalla que muestra todos los grupos o comunidades y permite unirse a ellos o administrarlos
export default function GroupsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinPending, setJoinPending] = useState(new Set());

  // Guardamos si la ventana para crear/editar está abierta, a qué grupo afecta y los campos del formulario
  const [showModal, setShowModal] = useState(false); // false | 'create' | 'edit'
  const [targetGroup, setTargetGroup] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);

  // Carga la lista completa de grupos desde el servidor
  async function load() {
    try {
      const data = await api('/groups');
      setGroups(data.groups || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupId = parseInt(params.get('groupId'), 10);
    if (groupId && groups.length > 0) {
      const exists = groups.some(g => g.id === groupId);
      if (exists) join(groupId);
    }
  }, [groups]);

  // Cierra el formulario flotante y limpia los campos para que queden vacíos
  const closeModal = () => {
    setShowModal(false);
    setTargetGroup(null);
    setName('');
    setDescription('');
    setImage(null);
  };

  // Añade al usuario al grupo y abre directamente el chat privado del grupo
  async function join(groupId) {
    if (joinPending.has(groupId)) return;
    setJoinPending(prev => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
    try {
      const data = await api(`/groups/${groupId}/join`, { method: 'POST', body: JSON.stringify({}) });
      if (data.conversation_id) navigate(`/chats/${data.conversation_id}`);
      else load();
    } catch (e) {
      console.error(e);
    } finally {
      setJoinPending(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  }

  // Envía el formulario para crear un grupo nuevo o para editar los datos de uno que ya existe
  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    if (image) fd.append('image', image);

    try {
      if (showModal === 'create') {
        await api('/groups', { method: 'POST', body: fd });
      } else {
        await api(`/groups/${targetGroup.id}`, { method: 'POST', body: fd, query: { _method: 'PATCH' } });
      }
      closeModal();
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      {/* Botón de la esquina inferior derecha para abrir el formulario de crear comunidad */}
      <button type="button" className="btn-add-square btn-add-fixed" onClick={() => setShowModal('create')}>
        <IconPlus style={{ width: 32, height: 32 }} />
      </button>

      <div className="page-standalone hide-scrollbar">
        <div className="page-content-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {loading ? (
            <Loader />
          ) : error ? (
            <div className="error-hint">{error}</div>
          ) : groups.length === 0 ? (
            <div className="empty-hint" style={{ padding: 40, textAlign: 'center', width: '100%' }}>
              Aún no hay comunidades creadas. ¡Sé el primero en crear una!
            </div>
          ) : (
            <div className="groups-container-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 30,
              width: '100%',
              maxWidth: 1200,
              margin: '0 auto'
            }}>
              {groups.map((g) => (
                <article key={g.id} className="glass-card" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  {/* Imagen de perfil del grupo, o un símbolo por defecto si no tiene */}
                  {g.image_url ? (
                    <img src={g.image_url} alt="" style={{ width: 100, height: 100, borderRadius: 20, objectFit: 'cover', border: '1px solid var(--glass-border)' }} />
                  ) : (
                    <div className="placeholder-box" style={{ width: 100, height: 100, borderRadius: 20, background: 'var(--glass-fill)', display: 'grid', placeItems: 'center', fontSize: '2rem', opacity: 0.2 }}>◇</div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800 }}>{g.name}</h3>
                      {/* El botón para editar solo se muestra si nosotros somos los dueños del grupo */}
                      {g.owner_id === user?.id && (
                        <button className="btn-send-flat" onClick={() => {
                          setTargetGroup(g);
                          setName(g.name);
                          setDescription(g.description || '');
                          setShowModal('edit');
                        }}>
                          <IconEdit style={{ opacity: 0.6 }} />
                        </button>
                      )}
                    </div>
                    <p className="hint" style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{g.description || 'Sin descripción.'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>{g.members_count} miembros</span>
                      <button type="button" className="btn-glass" onClick={() => join(g.id)}>Unirse</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ventana flotante (modal) para crear un nuevo grupo o editar el actual */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content-glass fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="auth-hero-title" style={{ textAlign: 'center', marginBottom: 30 }}>
              {showModal === 'create' ? 'Nueva Comunidad' : 'Editar Comunidad'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Zona para hacer clic y seleccionar o cambiar la foto del grupo */}
              <div className="group-avatar-upload-wrap">
                <div 
                  className="group-avatar-upload-circle"
                  onClick={() => document.getElementById('group-img-input').click()}
                >
                  {image ? (
                    <img src={URL.createObjectURL(image)} alt="Preview" />
                  ) : (showModal === 'edit' && targetGroup?.image_url) ? (
                    <img src={targetGroup.image_url} alt="Group Current" />
                  ) : (
                    <span style={{ fontSize: '2rem', opacity: 0.4 }}>＋</span>
                  )}
                </div>
                <button 
                  type="button"
                  className="group-avatar-upload-btn"
                  onClick={() => document.getElementById('group-img-input').click()}
                >
                  {image ? 'Cambiar imagen' : 'Seleccionar imagen (opcional)'}
                </button>
                <input id="group-img-input" type="file" accept="image/*" hidden onChange={(ev) => setImage(ev.target.files?.[0] || null)} />
              </div>

              <input className="input-glass-std" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nombre de la comunidad" maxLength={120} />
              <textarea className="input-glass-std" style={{ minHeight: 100, resize: 'none' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" />


              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <button type="button" className="btn-capsule round secondary" style={{ flex: 1 }} onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-capsule round accent" style={{ flex: 1.5 }}>
                  {showModal === 'create' ? 'Crear grupo' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
