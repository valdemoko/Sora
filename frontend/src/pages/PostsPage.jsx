import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { IconHeart, IconComment, IconSend, IconPoll, IconPlus, IconTrash, IconChevronRight } from '../icons';
import Loader from '../components/Loader';
import ErrorBanner from '../components/ErrorBanner';

// Esta función ordena las respuestas para que las que son contestaciones de otras salgan metidas una dentro de otra (en forma de árbol)
function buildTree(flat) {
  const byId = {};
  flat.forEach((r) => { byId[r.id] = { ...r, children: [] }; });
  const roots = [];
  flat.forEach((r) => {
    const node = byId[r.id];
    if (r.parent_id && byId[r.parent_id]) byId[r.parent_id].children.push(node);
    else roots.push(node);
  });
  return roots;
}

// Este es el componente principal de la página de foros. Muestra la lista de publicaciones y gestiona el crear nuevos posts, votar en encuestas y responder a hilos
export default function PostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pollOptions, setPollOptions] = useState([]);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [likePending, setLikePending] = useState(new Set());
  const [votePending, setVotePending] = useState(new Set());

  // Esta función pide al servidor una página específica de publicaciones y las añade al final de la lista actual
  async function fetchPage(pg = 1) {
    setError('');
    // Si estamos en la carga inicial y el feed está vacío, mostramos el indicador de carga
    if (pg === 1 && posts.length === 0) setLoading(true);
    try {
      const data = await api(`/forum-posts?page=${pg}`);
      // Nos aseguramos de que cada publicación tenga inicializado su array de comentarios para evitar fallos de lectura
      const rows = (data.data || []).map((p) => ({ ...p, replies: p.replies || [] }));
      if (pg === 1) {
        setPosts(rows);
      } else {
        // Si estamos cargando páginas siguientes, combinamos las nuevas publicaciones evitando IDs repetidos
        setPosts((prev) => {
          const filteredRows = rows.filter(r => !prev.some(p => p.id === r.id));
          return [...prev, ...filteredRows];
        });
      }
      // Actualizamos el estado de la paginación con los límites devueltos por el servidor
      setPage(data.current_page || 1);
      setLastPage(data.last_page || 1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    async function init() {
      let initialPosts = [];
      setError('');
      setLoading(true);
      try {
        // Descargamos la primera página de publicaciones del foro al inicializar el componente
        const data = await api('/forum-posts?page=1');
        const rows = (data.data || []).map((p) => ({ ...p, replies: p.replies || [] }));
        setPosts(rows);
        initialPosts = rows;
        setPage(data.current_page || 1);
        setLastPage(data.last_page || 1);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }

      // Busca si venimos redirigidos a un post concreto mediante el parámetro 'postId' en la URL (por ejemplo, desde un perfil)
      const params = new URLSearchParams(window.location.search);
      const postId = parseInt(params.get('postId'), 10);
      if (postId) {
        // Si entramos desde un perfil, limpiamos el ID del enlace de la barra del navegador para que no se quede pegado ahí
        navigate('/posts', { replace: true });

        // Si el post no está en la primera página que acabamos de descargar, lo traemos en exclusiva del servidor
        const exists = initialPosts.some(p => p.id === postId);
        if (!exists) {
          try {
            const data = await api(`/forum-posts/${postId}`);
            if (data?.post) {
              const fetchedPost = { ...data.post, replies: data.replies || [] };
              setPosts(prev => {
                if (prev.some(p => p.id === postId)) return prev;
                return [fetchedPost, ...prev];
              });
            }
          } catch (err) {
            console.error('Error al descargar el post enlazado:', err);
          }
        }

        // Despliega automáticamente la sección de respuestas de ese post enlazado
        setExpandedPostId(postId);
        let attempts = 0;
        // Intenta desplazar suavemente la vista (scroll) hasta el post cuando éste termine de dibujarse en el DOM
        const interval = setInterval(() => {
          const element = document.getElementById('post-' + postId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            clearInterval(interval);
          } else if (attempts > 30) {
            clearInterval(interval);
          }
          attempts++;
        }, 50);
      }
    }
    init();
  }, []);

  // Da un "Me gusta" o lo quita de un post y actualiza el contador de likes en pantalla
  async function toggleLikePost(id) {
    if (!id || likePending.has(id)) return;
    // Bloqueamos el botón para evitar dobles peticiones
    setLikePending(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const data = await api(`/forum-posts/${id}/like`, { method: 'POST', body: JSON.stringify({}) });
      // Modificamos el post en memoria local con la respuesta del servidor
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, liked_by_me: data.liked, likes_count: data.likes_count } : p));
    } catch (e) { console.error(e); }
    finally {
      // Liberamos el botón para que pueda volver a pulsarse
      setLikePending(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // Registra el voto en una opción de la encuesta y actualiza los porcentajes y resultados del post en pantalla
  async function vote(pid, pollOptionId) {
    if (!pid || votePending.has(pid)) return;
    // Bloqueamos clics repetidos en la encuesta de este post
    setVotePending(prev => {
      const next = new Set(prev);
      next.add(pid);
      return next;
    });
    try {
      const data = await api(`/forum-posts/${pid}/vote`, { method: 'POST', body: JSON.stringify({ poll_option_id: pollOptionId }) });
      // Reemplazamos los porcentajes y contador de votos del post conservando sus comentarios
      setPosts((prev) => prev.map((p) => (p.id === pid ? { ...p, ...data.post, replies: p.replies } : p)));
    } catch (e) { console.error(e); }
    finally {
      // Desbloqueamos las opciones de voto
      setVotePending(prev => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  }

  // Envía una nueva respuesta (o comentario) a un post y lo mete directamente en su hilo de discusión
  async function addReply(pid, parentId, text) {
    try {
      const res = await api(`/forum-posts/${pid}/replies`, { method: 'POST', body: JSON.stringify({ body: text, parent_id: parentId || null }) });
      // Inyectamos la respuesta recién creada en la lista local de respuestas del post e incrementamos el contador
      setPosts((prev) => prev.map((p) => p.id === pid ? { ...p, replies: [...(p.replies || []), res.reply], replies_count: (p.replies_count || 0) + 1 } : p));
    } catch (e) { console.error(e); }
  }

  // Publica un post nuevo en el foro con su texto, imagen opcional o encuesta si se han añadido
  async function createPost(e) {
    if (e) e.preventDefault();
    if (!body.trim()) return;
    setError('');

    // Validar el tamaño en el frontend (10 MB = 10485760 bytes)
    if (selectedFile && selectedFile.size > 10485760) {
      setError('La foto pesa demasiado. El límite máximo es de 10 MB.');
      return;
    }

    try {
      // Filtramos las opciones de la encuesta descartando los inputs vacíos
      const activeOptions = pollOptions.filter(o => o.trim());
      const formData = new FormData();
      formData.append('body', body);
      // Adjuntamos la foto al formulario multipart si se seleccionó una
      if (selectedFile) formData.append('image', selectedFile);
      // Agregamos las opciones de la encuesta si el usuario configuró al menos 2
      if (activeOptions.length >= 2) {
        activeOptions.forEach((opt, i) => formData.append(`poll_options[${i}]`, opt));
      }

      const data = await api('/forum-posts', {
        method: 'POST',
        body: formData
      });
      // Reseteamos todos los estados del creador tras la publicación exitosa
      setComposerOpen(false); setBody(''); setPollOptions([]); setSelectedFile(null); setPreviewUrl(null);
      // Agregamos la publicación nueva arriba del todo de la lista local
      setPosts((prev) => [{ ...data.post, replies: [] }, ...prev]);
    } catch (err) {
      let msg = err.message || 'Error al crear la publicación';
      if (msg.includes('greater than') || msg.includes('10240')) {
        msg = 'La foto pesa demasiado. El límite máximo es de 10 MB.';
      }
      setError(msg);
    }
  }

  return (
    <>
      {/* El botón de la esquina inferior que abre el formulario para escribir un post */}
      <button type="button" className="btn-add-square btn-add-fixed" onClick={() => { setError(''); setComposerOpen(true); }}>
        <IconPlus style={{ width: 32, height: 32 }} />
      </button>

      <div className="page-standalone hide-scrollbar">
        <div className="page-content-inner">
          <div className="content-narrow">
            {!composerOpen && <ErrorBanner message={error} onClear={() => setError('')} style={{ marginBottom: 20 }} />}

            {loading && posts.length === 0 ? (
              <Loader />
            ) : posts.length === 0 ? (
              <div className="empty-hint" style={{ padding: 40, textAlign: 'center', width: '100%' }}>
                Aún no hay publicaciones en el foro. ¡Sé el primero en iniciar una conversación!
              </div>
            ) : (
              <div className="posts-feed-column">
                {posts.map((p) => (
                  <article key={p.id} id={`post-${p.id}`} className="feed-card">
                    <div className="feed-header">
                      <div className="feed-user-info">
                        <div className="feed-avatar clickable" onClick={() => navigate(`/users/${p.user.username}`)}>
                          {p.user?.avatar_url ? <img src={p.user.avatar_url} alt="" /> : (p.user?.username || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="feed-meta">
                          <Link className="feed-username clickable" to={`/users/${p.user.username}`}>{p.user.username}</Link>
                        </div>
                      </div>
                    </div>
                    <p className="feed-body">{p.body}</p>
                    {p.image_url && (
                      <div className="feed-media-container" style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <img src={p.image_url} alt="" style={{ width: '100%', display: 'block' }} />
                      </div>
                    )}
                    {p.has_poll && <div className="feed-poll-container"><PollBars post={p} onVote={vote} /></div>}
                    <div className="feed-footer">
                      <button className="feed-action-btn" onClick={() => setExpandedPostId(expandedPostId === p.id ? null : p.id)} style={{ color: expandedPostId === p.id ? 'var(--accent)' : 'inherit' }}><IconComment /> <span>{p.replies_count || 0}</span></button>
                      <button type="button" className={p.liked_by_me ? 'feed-action-btn liked' : 'feed-action-btn'} onClick={() => toggleLikePost(p.id)}><IconHeart /> <span>{p.likes_count}</span></button>
                    </div>
                    {expandedPostId === p.id && (
                      <div className="thread-section" style={{ marginTop: 20 }}>
                        <div className="glass-card-mini" style={{ padding: '24px', background: 'rgba(0,0,0,0.12)', borderRadius: 28, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <ThreadBlock post={p} tree={buildTree(p.replies || [])} addReply={addReply} />
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {page < lastPage && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <button type="button" className="btn-glass" style={{ margin: '0 auto' }} onClick={() => fetchPage(page + 1)}>Cargar más contenido</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ventana flotante (modal) para crear una nueva publicación con texto, foto y encuesta */}
      {composerOpen && (
        <div className="modal-backdrop" onClick={() => { setError(''); setComposerOpen(false); }}>
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <h2 className="auth-hero-title" style={{ textAlign: 'center', marginBottom: 30 }}>Nueva Publicación</h2>
            <ErrorBanner message={error} onClear={() => setError('')} style={{ marginBottom: 20 }} />
            <form onSubmit={createPost} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <textarea
                className="input-glass-std"
                style={{ minHeight: 120, resize: 'none' }}
                required
                placeholder="¿De qué quieres hablar?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />

              <div className="media-composer-section">
                <div
                  className="upload-dropzone-minimal"
                  style={{
                    minHeight: previewUrl ? 200 : 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                  onClick={() => document.getElementById('forum-image-input').click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
                      <IconPlus style={{ width: 16 }} />
                      <span style={{ fontSize: '0.8rem' }}>Añadir imagen (opcional)</span>
                    </div>
                  )}
                  <input
                    id="forum-image-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                      else { setSelectedFile(null); setPreviewUrl(null); }
                    }}
                  />
                </div>
              </div>

              <div className="poll-composer-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: pollOptions.length > 0 ? 15 : 0 }}>
                  <IconPoll style={{ width: 16, color: pollOptions.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span className="section-title-minimal" style={{ margin: 0, fontSize: '0.7rem' }}>Encuesta</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                  <button type="button" className="text-link" onClick={() => setPollOptions([...pollOptions, ''])} style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    {pollOptions.length === 0 ? 'Activar' : 'Añadir'}
                  </button>
                </div>

                {pollOptions.length > 0 && (
                  <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', paddingRight: 5 }}>
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input className="input-glass-std" style={{ padding: '10px 15px', fontSize: '0.85rem' }} placeholder={`Opción ${idx + 1}`} value={opt} onChange={(e) => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }} />
                        <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                          <IconTrash style={{ width: 16 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <button type="button" className="btn-capsule round secondary" style={{ flex: 1 }} onClick={() => { setComposerOpen(false); setPollOptions([]); }}>Cancelar</button>
                <button type="submit" className="btn-capsule round accent" style={{ flex: 1.5 }}>Publicar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Dibuja las opciones de la encuesta de un post mostrando sus barritas con el porcentaje de votos que tiene cada una
function PollBars({ post, onVote }) {
  return (
    <div className="poll-bars">
      {(post.poll_options || []).map((opt) => {
        const isVoted = opt.id === post.my_poll_option_id;
        return (
          <button key={opt.id} type="button" className={`poll-bar-option ${isVoted ? 'voted' : ''}`} onClick={() => onVote(post.id, opt.id)}>
            <div className="poll-bar-track square">
              <div className="poll-bar-fill" style={{ width: `${Math.min(100, opt.percent || 0)}%` }} />
              <div className="poll-bar-content-inside">
                <span className="poll-label">{opt.label}</span>
                <span className="poll-percent">{typeof opt.percent === 'number' ? `${Math.round(opt.percent)}%` : '0%'}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Contenedor que agrupa la caja para escribir una respuesta y la lista de comentarios ordenados que tiene un post expandido
function ThreadBlock({ post, tree, addReply }) {
  const [rootText, setRootText] = useState('');
  return (
    <div className="post-thread">
      <form
        className="photo-side-form"
        style={{ marginBottom: 25, gap: 15 }}
        onSubmit={(e) => { e.preventDefault(); const t = rootText.trim(); if (!t) return; setRootText(''); addReply(post.id, null, t); }}
      >
        <input
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 16px' }}
          placeholder="Escribe tu respuesta..."
          value={rootText}
          onChange={(e) => setRootText(e.target.value)}
        />
        <button className="btn-send-flat" type="submit"><IconSend /></button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tree.map((node) => <ReplyNode key={node.id} node={node} postId={post.id} addReply={addReply} />)}
      </div>
    </div>
  );
}

// Representa un comentario o respuesta individual, mostrando el usuario, fecha, texto, el botón para responderle y las sub-respuestas que tenga
function ReplyNode({ node, postId, addReply }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showChildren, setShowChildren] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="reply-item" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 14 }}>
        {/* Muestra la foto de perfil de quien escribió la respuesta, o su inicial si no tiene foto */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {node.user?.avatar_url ? (
            <img src={node.user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent)' }}>
              {(node.user?.username || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* Muestra el nombre de usuario, la fecha, el texto del comentario y el botón para ver/ocultar respuestas */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{node.user?.username || 'Anon'}</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.25 }}>{new Date(node.created_at).toLocaleDateString()}</span>
            </div>

            {hasChildren && (
              <button
                onClick={() => setShowChildren(!showChildren)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', transition: 'transform 0.3s ease', transform: showChildren ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <IconChevronRight style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, opacity: 0.8, color: 'rgba(255,255,255,0.9)' }}>{node.body}</p>

          <div style={{ marginTop: 6 }}>
            <button className="text-link" style={{ fontSize: '0.6rem', opacity: 0.4 }} onClick={() => setShowReplyForm(!showReplyForm)}>Responder</button>
          </div>

          {showReplyForm && (
            <form
              style={{ marginTop: 15, display: 'flex', gap: 10, alignItems: 'center' }}
              onSubmit={(e) => { e.preventDefault(); const t = replyText.trim(); if (!t) return; setReplyText(''); setShowReplyForm(false); addReply(postId, node.id, t); setShowChildren(true); }}
            >
              <input
                style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: '#fff', padding: '6px 0' }}
                placeholder="Tu respuesta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button className="btn-send-flat" style={{ opacity: 0.7 }} type="submit"><IconSend style={{ width: 14 }} /></button>
            </form>
          )}
        </div>
      </div>

      {hasChildren && showChildren && (
        <div className="reply-children" style={{ marginTop: 15 }}>
          {node.children.map((child) => (
            <ReplyNode key={child.id} node={child} postId={postId} addReply={addReply} />
          ))}
        </div>
      )}

      {!hasChildren && <div style={{ height: 1, background: 'rgba(255,255,255,0.03)', marginTop: 15 }} />}
    </div>
  );
}
