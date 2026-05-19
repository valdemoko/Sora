import { useEffect, useState } from 'react';
import { api } from '../api';
import { useUser } from '../context/UserContext';
import { IconTrash } from '../icons';
import ErrorBanner from '../components/ErrorBanner';
import ConfirmModal from '../components/ConfirmModal';

// Pantalla de administración del sistema. Permite ver estadísticas generales, gestionar los permisos de los usuarios y moderar el contenido (posts y fotos)
export default function AdminPage() {
  const { user } = useUser();
  
  // Guardamos las métricas globales, los usuarios registrados y los posts y fotos listos para moderar
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [mod, setMod] = useState({ forum_posts: [], photos: [] });
  const [activeTab, setActiveTab] = useState('users');
  const [expanded, setExpanded] = useState(new Set());
  const [error, setError] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Pide al servidor toda la información administrativa (métricas, usuarios y listas de contenido) al mismo tiempo
  async function load() {
    setError('');
    try {
      const [s, u, m] = await Promise.all([
        api('/admin/stats'),
        api('/admin/users'),
        api('/admin/moderation'),
      ]);
      setStats(s.counts || null);
      setUsers(u.users || []);
      setMod({ forum_posts: m.forum_posts || [], photos: m.photos || [] });
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  // Muestra u oculta las respuestas de un post o los comentarios de una foto en la lista de moderación
  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Borra permanentemente del servidor un recurso (usuario, post, foto, respuesta o comentario) tras confirmación
  function handleDelete(type, id) {
    setConfirmConfig({
      message: '¿Seguro que quieres eliminar esto?',
      onConfirm: async () => {
        setConfirmConfig(null);
        const paths = {
          user: `/admin/users/${id}`,
          post: `/admin/forum-posts/${id}`,
          photo: `/admin/photos/${id}`,
          reply: `/admin/forum-replies/${id}`,
          comment: `/admin/photo-comments/${id}`
        };
        try {
          await api(paths[type], { method: 'DELETE' });
          load();
        } catch (e) { setError(e.message); }
      }
    });
  }

  // Hace administrador a un usuario o le quita los privilegios de administrador
  async function toggleAdmin(id) {
    try {
      await api(`/admin/users/${id}/toggle-admin`, { method: 'POST', body: JSON.stringify({}) });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="page-standalone hide-scrollbar">
      <div className="page-content-inner" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        <div className="settings-layout-wrap" style={{ flex: 1, display: 'flex', gap: 30, minHeight: 0 }}>
          
          {/* Menú lateral izquierdo con las pestañas de navegación y las métricas globales */}
          <aside className="settings-sidebar-nav" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['users', 'posts', 'photos'].map(id => (
              <div key={id} className={`settings-nav-item-wrap ${activeTab === id ? 'active' : ''}`}>
                <button className="settings-nav-button" onClick={() => setActiveTab(id)}>
                  {id === 'users' ? 'Usuarios' : id === 'posts' ? 'Foros' : 'Fotos'}
                </button>
              </div>
            ))}
            
            {stats && (
              <div className="glass-card" style={{ marginTop: 'auto', padding: 20, borderRadius: 20, fontSize: '0.8rem' }}>
                <div className="section-label-tiny" style={{ marginBottom: 12 }}>Métricas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Usuarios:</span> <strong>{stats.users}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Posts:</span> <strong>{stats.forum_posts}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fotos:</span> <strong>{stats.photos}</strong></div>
                </div>
              </div>
            )}
          </aside>

          {/* Zona principal derecha donde se muestra el listado correspondiente a la pestaña activa */}
          <main className="settings-content-container glass-card hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 40 }}>
            <ErrorBanner message={error} onClear={() => setError('')} style={{ marginBottom: 20 }} />

            {/* Pestaña de Usuarios: muestra la lista de personas registradas y permite eliminarlas o hacerlas administradoras */}
            {activeTab === 'users' && (
              <section className="fade-in">
                <h2 className="section-label-tiny" style={{ marginBottom: 25 }}>Cuentas de la Plataforma</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {users.map(u => (
                    <div key={u.id} className="glass-card" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div className="placeholder-avatar-mini-rounded" style={{ width: 36, height: 36, overflow: 'hidden' }}>
                          {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.username?.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.username}</div>
                            {u.is_admin && <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, opacity: 0.6 }}>ADMIN</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="text-link-basic" style={{ color: 'var(--accent)', fontSize: '0.7rem' }} onClick={() => toggleAdmin(u.id)} disabled={u.id === user?.id}>
                          {u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                        </button>
                        <button 
                          className="btn-glass" 
                          style={{ padding: '6px 12px', fontSize: '0.7rem', color: '#ff4d4d' }} 
                          onClick={() => handleDelete('user', u.id)} 
                          disabled={u.is_admin}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pestaña de Foros: muestra las publicaciones recientes y sus respuestas, y permite eliminarlas */}
            {activeTab === 'posts' && (
              <section className="fade-in">
                <h2 className="section-label-tiny" style={{ marginBottom: 25 }}>Publicaciones Recientes</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {mod.forum_posts.map(p => (
                    <div key={p.id} className="glass-card" style={{ padding: 20, borderRadius: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="placeholder-avatar-mini-rounded" style={{ width: 28, height: 28, overflow: 'hidden' }}>
                            {p.user?.avatar_url ? <img src={p.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.user?.username || 'A').slice(0, 1).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.user?.username || 'Anónimo'}</span>
                        </div>
                        <button 
                          className="btn-glass" 
                          style={{ padding: '6px 12px', fontSize: '0.7rem', color: '#ff4d4d' }} 
                          onClick={() => handleDelete('post', p.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                      {p.image_url && <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 15 }}><img src={p.image_url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} /></div>}
                      <div style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.8 }}>{p.body}</div>
                      {p.replies?.length > 0 && (
                        <div style={{ marginTop: 15 }}>
                          <button className="text-link-basic" style={{ fontSize: '0.7rem', color: 'var(--accent)' }} onClick={() => toggleExpand(`post-${p.id}`)}>
                            {expanded.has(`post-${p.id}`) ? 'Ocultar respuestas' : `Ver ${p.replies.length} respuestas`}
                          </button>
                          {expanded.has(`post-${p.id}`) && (
                            <div className="fade-in" style={{ marginTop: 10, padding: 15, background: 'rgba(0,0,0,0.2)', borderRadius: 16 }}>
                              {p.replies.map(r => (
                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <div style={{ fontSize: '0.8rem' }}><strong>@{r.user?.username}:</strong> {r.body}</div>
                                  <button 
                                    className="btn-glass" 
                                    style={{ padding: '4px 8px', fontSize: '0.65rem', color: '#ff4d4d' }} 
                                    onClick={() => handleDelete('reply', r.id)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pestaña de Fotos: muestra la galería de fotos subidas y sus comentarios con la opción de eliminarlos */}
            {activeTab === 'photos' && (
              <section className="fade-in">
                <h2 className="section-label-tiny" style={{ marginBottom: 25 }}>Galería de Fotos</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 30 }}>
                  {mod.photos.map(p => (
                    <div key={p.id} className="glass-card" style={{ borderRadius: 24, overflow: 'hidden' }}>
                      <div style={{ position: 'relative', height: 200 }}>
                        <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          className="btn-glass" 
                          style={{ position: 'absolute', top: 15, right: 15, background: 'rgba(0, 0, 0, 0.6)', padding: '6px 12px', fontSize: '0.7rem', color: '#ff4d4d', border: 'none' }} 
                          onClick={() => handleDelete('photo', p.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                      <div style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div className="placeholder-avatar-mini-rounded" style={{ width: 24, height: 24, overflow: 'hidden' }}>
                            {p.user?.avatar_url ? <img src={p.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.user?.username || 'A').slice(0, 1).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.user?.username}</span>
                        </div>
                        {p.caption && <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>{p.caption}</p>}
                        {p.comments?.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <button className="text-link-basic" style={{ fontSize: '0.7rem', color: 'var(--accent)' }} onClick={() => toggleExpand(`photo-${p.id}`)}>
                              {expanded.has(`photo-${p.id}`) ? 'Ocultar comentarios' : `Ver ${p.comments.length} comentarios`}
                            </button>
                            {expanded.has(`photo-${p.id}`) && (
                              <div className="fade-in" style={{ marginTop: 10, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 16 }}>
                                {p.comments.map(c => (
                                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ fontSize: '0.75rem' }}><strong>@{c.user?.username}:</strong> {c.body}</div>
                                    <button 
                                      className="btn-glass" 
                                      style={{ padding: '4px 8px', fontSize: '0.65rem', color: '#ff4d4d' }} 
                                      onClick={() => handleDelete('comment', c.id)}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
      {confirmConfig && (
        <ConfirmModal
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => setConfirmConfig(null)}
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
}
