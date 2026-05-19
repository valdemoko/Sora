import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

// Agrupa los distintos tipos de notificaciones en categorías para poder filtrarlas en la pantalla
const CATEGORIES = {
  likes: ['like_photo', 'like_post'],
  follows: ['follow', 'follow_request', 'follow_accepted'],
  comments: ['comment_photo', 'comment_post', 'comment_reply'],
};

// Devuelve un texto amigable explicando qué ha pasado en cada tipo de notificación
function getNotificationLabel(n) {
  const actor = n.actor?.username || 'Alguien';
  const labels = {
    like_photo: `${actor} dio like a tu foto`,
    like_post: `${actor} dio like a tu post`,
    follow: `${actor} comenzó a seguirte`,
    follow_request: `${actor} quiere seguirte`,
    follow_accepted: `${actor} aceptó tu solicitud`,
    comment_photo: `${actor} comentó tu foto`,
    comment_post: `${actor} respondió a tu post`,
    comment_reply: `${actor} respondió a tu comentario`,
  };
  return labels[n.type] || `${actor} interactuó contigo`;
}

// Pantalla con la bandeja de entrada de todas las notificaciones recibidas por el usuario
export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState('');
  const [requestPending, setRequestPending] = useState(new Set());

  // Carga la lista de notificaciones desde el servidor
  async function load() {
    try {
      const data = await api('/notifications');
      setItems(data.notifications || []);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  // Filtra de forma eficiente las notificaciones según la pestaña activa (todas, likes, seguidores, comentarios)
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    return items.filter(n => CATEGORIES[activeTab]?.includes(n.type));
  }, [items, activeTab]);

  // Marca una única notificación como leída en el servidor y recarga la lista
  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify({}) });
      load();
    } catch (e) { console.error(e); }
  }

  // Marca todas las notificaciones como leídas a la vez
  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'POST', body: JSON.stringify({}) });
      load();
    } catch (e) { console.error(e); }
  }

  // Permite aceptar o rechazar solicitudes de amistad/seguimiento de cuentas privadas
  async function handleFollowRequest(username, accept, notificationId) {
    if (requestPending.has(notificationId)) return;
    setRequestPending(prev => {
      const next = new Set(prev);
      next.add(notificationId);
      return next;
    });
    try {
      const action = accept ? 'accept' : 'reject';
      await api(`/users/${username}/follow/${action}`, { method: 'POST', body: JSON.stringify({}) });
      await markRead(notificationId);
    } catch (err) {
      setError(err.message);
    } finally {
      setRequestPending(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }

  return (
    <div className="page-standalone hide-scrollbar">
      <div className="page-content-inner">
        <div className="content-narrow" style={{ paddingTop: 40 }}>

          {/* Cabecera superior con la botonera de filtrado y el enlace para marcar todo como leído */}
          <header style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <nav className="glass-card-mini" style={{ display: 'flex', gap: 8, padding: 8, borderRadius: 16 }}>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'likes', label: 'Likes' },
                { id: 'follows', label: 'Seguidores' },
                { id: 'comments', label: 'Comentarios' }
              ].map(t => (
                <button
                  key={t.id}
                  className={`btn-glass ${activeTab === t.id ? 'active' : ''}`}
                  style={{ padding: '6px 16px', fontSize: '0.75rem', borderRadius: 10 }}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <button className="text-link-basic" onClick={markAllRead} style={{ fontSize: '0.8rem' }}>
              Limpiar todas
            </button>
          </header>

          <ErrorBanner message={error} onClear={() => setError('')} style={{ marginBottom: 20 }} />

          {/* Contenedor principal con el historial de notificaciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredItems.map((n) => (
              <div key={n.id} className={`glass-card ${!n.read_at ? 'unread-notif' : ''}`} style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

                  {/* Foto de perfil o letra inicial del usuario que causó la notificación */}
                  <div className="notif-avatar-wrap">
                    {n.actor?.avatar_url ? (
                      <img src={n.actor.avatar_url} alt="" className="mini-avatar-img-rounded" />
                    ) : (
                      <div className="placeholder-avatar-mini-rounded">
                        {n.actor?.username?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Texto de la notificación y fecha en la que se generó */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{getNotificationLabel(n)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>

                    {/* Botones para aceptar o rechazar cuando es una petición de seguimiento */}
                    {n.type === 'follow_request' && !n.read_at && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button className="btn-capsule round accent" style={{ fontSize: '0.65rem', padding: '6px 14px' }} onClick={() => handleFollowRequest(n.actor.username, true, n.id)}>Aceptar</button>
                        <button className="btn-glass" style={{ fontSize: '0.65rem', padding: '6px 14px' }} onClick={() => handleFollowRequest(n.actor.username, false, n.id)}>Rechazar</button>
                      </div>
                    )}
                  </div>

                  {/* Círculo indicador si la notificación no está leída, que permite marcarla como leída al pulsar */}
                  {!n.read_at && n.type !== 'follow_request' && (
                    <button className="btn-send-flat" style={{ padding: 6, opacity: 0.6 }} onClick={() => markRead(n.id)}>
                      <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!filteredItems.length && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.4 }}>
                <p>No tienes notificaciones en esta sección.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
