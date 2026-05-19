import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../context/UserContext';
import { IconChat, IconSend, IconPhotos, IconUnreadDot, IconExit } from '../icons';
import ErrorBanner from '../components/ErrorBanner';
import ConfirmModal from '../components/ConfirmModal';

// Pantalla de chats y mensajes. Permite chatear en privado con amigos o en los canales grupales de las comunidades
export default function ChatsPage() {
  const conversationId = useParams().conversationId;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  // Guardamos la lista de chats abiertos, los mensajes del chat actual, el texto que escribimos y la foto adjunta
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);

  // Buscador de usuarios para abrir nuevos chats privados
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const scrollRef = useRef(null);
  const [error, setError] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Busca usuarios automáticamente cuando escribimos en la cajita, esperando 300ms para no sobrecargar el servidor
  useEffect(() => {
    if (searchQuery.trim().length < 2) return setSearchResults([]);
    const handler = setTimeout(async () => {
      const data = await api(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults((data.users || []).filter(u => u.id !== user?.id && !u.is_admin));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, user]);

  // Carga todas las conversaciones o chats del usuario desde el servidor
  const loadConversations = async () => {
    try {
      const data = await api('/conversations');
      setConversations(data.conversations || []);
    } catch (e) {
      if (e.status !== 401) console.error(e);
    }
  };

  // Carga la lista de mensajes del chat seleccionado en la pantalla
  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      const data = await api(`/conversations/${conversationId}/messages`);
      setMessages(data.messages || []);
    } catch (e) {
      if (e.status !== 401) console.error(e);
    }
  };

  // Actualiza la lista de chats en segundo plano cada 5 segundos de forma automática
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Recarga los mensajes del chat seleccionado cada 5 segundos para que los mensajes nuevos entren solos
  useEffect(() => {
    setError('');
    if (conversationId) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    } else setMessages([]);
  }, [conversationId]);

  // Si venimos de hacer clic en "Enviar mensaje" desde el perfil de alguien, abre o crea directamente ese chat privado
  useEffect(() => {
    const dmUid = location.state?.dmUserId;
    if (dmUid) {
      api('/conversations/dm', { method: 'POST', body: JSON.stringify({ user_id: dmUid }) }).then(data => {
        if (data.conversation?.id) navigate(`/chats/${data.conversation.id}`, { replace: true, state: {} });
      });
    }
  }, [location.state, navigate]);

  // Hace scroll automático hacia abajo en el chat para ver siempre los últimos mensajes que llegan
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, conversationId]);

  // Envía el mensaje de texto, foto o ambos al chat seleccionado, y recarga la lista al instante
  async function send(e) {
    if (e) e.preventDefault();
    if (!body.trim() && !file) return;
    setError('');
    
    // Validar el tamaño en el frontend (10 MB = 10485760 bytes)
    if (file && file.size > 10485760) {
      setError('La foto pesa demasiado. El límite máximo es de 10 MB.');
      return;
    }
    
    try {
      const fd = new FormData();
      if (body.trim()) fd.append('body', body.trim());
      if (file) fd.append('image', file);
      setBody(''); setFile(null);
      await api(`/conversations/${conversationId}/messages`, { method: 'POST', body: fd, isForm: true });
      loadMessages(); loadConversations();
    } catch (e) {
      let msg = e.message || 'Error al enviar el mensaje';
      if (msg.includes('greater than') || msg.includes('10240')) {
        msg = 'La foto pesa demasiado. El límite máximo es de 10 MB.';
      }
      setError(msg);
    }
  }

  // Permite salir de un grupo o borrar un chat privado tras confirmar que estamos seguros
  function handleAction(type, id) {
    const msg = type === 'leave' ? '¿Seguro que quieres salir de este grupo?' : '¿Seguro que quieres borrar este chat?';
    setConfirmConfig({
      message: msg,
      onConfirm: async () => {
        setConfirmConfig(null);
        setError('');
        try {
          if (type === 'leave') await api(`/groups/${id}/leave`, { method: 'POST', body: JSON.stringify({}) });
          else await api(`/conversations/${id}`, { method: 'DELETE' });
          loadConversations();
          navigate('/chats');
        } catch (e) {
          setError(e.message || 'Error al realizar la acción');
        }
      }
    });
  }

  // Filtra los chats que tenemos abiertos según el nombre que escribamos en el buscador de la barra
  const filteredConvs = conversations.filter(c => (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const activeConv = conversations.find(c => String(c.id) === conversationId);

  return (
    <div className="page-standalone" style={{ display: 'flex', flexDirection: 'row', padding: '0 60px 40px 60px', gap: 40, height: '100%' }}>

      {/* Barra lateral izquierda con el buscador de personas y la lista de todos nuestros chats */}
      <aside className="chat-sidebar" style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
        <div className="conversations-list-container hide-scrollbar" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <input
            type="text"
            placeholder="Busca personas o chats..."
            className="input-glass-std"
            style={{ borderRadius: 16, width: '100%', marginBottom: 20 }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 20 }} />

          <div className="conversations-list hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>

            {/* Resultados de usuarios encontrados al usar la barra de búsqueda */}
            {searchQuery.trim().length > 0 && searchResults.map(u => (
              <div key={u.id} className="search-result-item" style={{ padding: 10, gap: 12 }}>
                <div className="clickable" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }} onClick={async () => {
                   const res = await api('/conversations/dm', { method: 'POST', body: JSON.stringify({ user_id: u.id }) });
                   if (res.conversation?.id) { navigate(`/chats/${res.conversation.id}`); setSearchQuery(''); loadConversations(); }
                }}>
                  {u.avatar_url ? <img src={u.avatar_url} className="mini-avatar-img-rounded" style={{ width: 32, height: 32 }} alt="" /> : <div className="placeholder-avatar-mini-rounded" style={{ width: 32, height: 32 }}>{u.username.slice(0, 1).toUpperCase()}</div>}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.username}</span>
                </div>
                <Link to={`/users/${u.username}`} className="text-link-basic" style={{ fontSize: '0.7rem' }}>Perfil</Link>
              </div>
            ))}

            {/* Lista con todas nuestras conversaciones activas y grupos */}
            {(searchQuery.trim() !== '' ? filteredConvs : conversations).map(c => (
              <Link key={c.id} to={`/chats/${c.id}`} className={`conv-card glass-card-mini ${conversationId === String(c.id) ? 'active' : ''}`} onClick={() => setSearchQuery('')}>
                <div className="conv-avatar">
                  {c.image_url ? <img src={c.image_url} alt="" /> : <span>{(c.title || 'Chat').slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="conv-info">
                  <div className="conv-title">{c.title || 'Chat'}</div>
                  <div className="conv-last-msg">{c.last_message?.body || 'Sin mensajes todavía'}</div>
                </div>
                {c.unread_count > 0 && <IconUnreadDot style={{ color: 'var(--accent)' }} />}
              </Link>
            ))}

            {searchQuery.trim() === '' && conversations.length === 0 && <div className="empty-hint" style={{ padding: 20 }}>Ninguna conversación.</div>}
          </div>
        </div>
      </aside>

      {/* Zona principal derecha donde se ve la conversación actual seleccionada */}
      <main className="chat-thread-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
        {activeConv ? (
          <>
            {/* Cabecera del chat actual con la foto, nombre del grupo o usuario y botón para borrarlo o salir */}
            <header className="chat-thread-header glass-card">
              <Link to={activeConv.is_group ? `/groups/${activeConv.group_id}` : `/users/${activeConv.other_username}`} className="active-conv-avatar clickable">
                {activeConv.image_url ? <img src={activeConv.image_url} alt="" /> : <div className="placeholder-avatar-mini-rounded" style={{ background: 'var(--glass-fill)' }}>{(activeConv.title || 'Chat').slice(0, 1).toUpperCase()}</div>}
              </Link>
              <div className="active-conv-meta">
                <Link to={activeConv.is_group ? `/groups/${activeConv.group_id}` : `/users/${activeConv.other_username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 className="active-conv-title clickable">{activeConv.title || 'Chat'}</h3>
                </Link>
              </div>
              <button className="btn-delete-small" style={{ color: '#ff4d4d' }} onClick={() => activeConv.is_group ? handleAction('leave', activeConv.group_id) : handleAction('delete', activeConv.id)}>
                <IconExit style={{ width: 20 }} />
              </button>
            </header>

            {/* Historial de mensajes en forma de burbujas ordenados por fecha y hora */}
            <div className="chat-thread-messages-area glass-card">
              <div ref={scrollRef} className="messages-viewport hide-scrollbar">
                {messages.map(m => {
                  const isMine = m.user_id === user?.id;
                  return (
                    <div key={m.id} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                      {activeConv.is_group && !isMine && <span className="chat-username-tag" style={{ marginLeft: 12, marginBottom: 4, display: 'block' }}>{m.user?.username || m.username}</span>}

                      <div className={m.body ? "message-bubble" : "chat-img-bubble"}>
                        {m.body && <div className="message-text">{m.body}</div>}
                        {m.image_url && (
                          <div className="chat-img-wrap" style={{ marginTop: m.body ? 10 : 0, borderRadius: 12, overflow: 'hidden', maxWidth: 400 }}>
                            <img src={m.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
                          </div>
                        )}
                      </div>
                      <div className="message-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  );
                })}
              </div>

              {/* Caja inferior para escribir el mensaje y añadir fotos */}
              <div className="message-composer-wrap">
                <ErrorBanner message={error} onClear={() => setError('')} style={{ marginBottom: 15 }} />
                <form onSubmit={send} className="composer-form-glass">
                  <label className="composer-file-label" style={{ cursor: 'pointer', color: file ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <IconPhotos style={{ width: 22 }} />
                    <input type="file" accept="image/*" hidden onChange={e => { setFile(e.target.files[0]); setError(''); }} />
                  </label>
                  <input type="text" placeholder="Escribe un mensaje..." className="composer-input" value={body} onChange={e => { setBody(e.target.value); setError(''); }} />
                  {file && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700 }}>{file.name.slice(0, 8)}...</span>}
                  <button type="submit" className="btn-send-flat" disabled={!body.trim() && !file} style={{ color: body.trim() || file ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <IconSend style={{ width: 24 }} />
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 32 }}>
            <IconChat style={{ width: 80, height: 80, opacity: 0.1, marginBottom: 20 }} />
            <p className="empty-hint" style={{ fontSize: '1.1rem' }}>¿Con quién quieres hablar?</p>
          </div>
        )}
      </main>
      {confirmConfig && (
        <ConfirmModal
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => setConfirmConfig(null)}
          confirmText="Confirmar"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
}
