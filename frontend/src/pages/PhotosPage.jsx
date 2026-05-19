import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { IconHeart, IconSend, IconPlus, IconChevronLeft, IconChevronRight } from '../icons';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Loader from '../components/Loader';
import ErrorBanner from '../components/ErrorBanner';

// Pantalla de la galería de fotos. Muestra las imágenes en un carrusel que gira infinitamente y permite ver/añadir comentarios a cada foto
export default function PhotosPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const hasLoaded = useRef(false);

  // Guardamos las fotos, cuál está seleccionada y los datos de movimiento/animación del carrusel
  const [photos, setPhotos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dir, setDir] = useState(0); // -1: izquierda, 1: derecha, 0: centro

  // Guardamos los comentarios de la foto activa, el texto del nuevo comentario y si se está abriendo la ventana de subir foto
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [likePending, setLikePending] = useState(new Set());

  function openUploadModal() {
    setUploadError('');
    setUploadModalOpen(true);
  }

  // Datos temporales para cuando el usuario va a subir una nueva foto (título, archivo e imagen previa)
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Carga la lista completa de fotos disponibles al abrir la página
  async function load() {
    try {
      const data = await api('/photos/carousel?t=' + Date.now());
      setPhotos(data.photos || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!hasLoaded.current) { load(); hasLoaded.current = true; }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const photoId = parseInt(params.get('photoId'), 10);
    if (photoId && photos.length > 0) {
      const idx = photos.findIndex(p => p.id === photoId);
      if (idx !== -1) {
        setActiveIndex(idx);
        setCarouselIndex(idx);
      }
    }
  }, [photos]);

  const activePhoto = photos[activeIndex];

  // Cada vez que cambiamos de foto en el carrusel, actualiza la lista lateral de comentarios con los de la foto nueva
  useEffect(() => {
    const currentPhoto = photos[activeIndex];
    if (currentPhoto) {
      setComments(currentPhoto.comments || []);
    } else {
      setComments([]);
    }
  }, [activeIndex, photos]);

  // Envía un comentario para la foto activa y lo añade al instante a la lista en pantalla
  async function handleSendComment(e) {
    e.preventDefault();
    if (!newComment.trim() || !activePhoto) return;
    try {
      const res = await api(`/photos/${activePhoto.id}/comments`, { method: 'POST', body: JSON.stringify({ body: newComment }) });
      // Actualización reactiva en memoria local para optimizar el tiempo de respuesta visual
      setPhotos(prev => prev.map(p => p.id === activePhoto.id ? { ...p, comments: [...(p.comments || []), res.comment], comments_count: (p.comments_count || 0) + 1 } : p));
      setNewComment('');
    } catch (e) { console.error(e); }
  }

  // Da o quita el "Me gusta" de una foto y actualiza el contador de likes
  async function toggleLike(pid) {
    if (!pid || likePending.has(pid)) return;
    setLikePending(prev => {
      const next = new Set(prev);
      next.add(pid);
      return next;
    });
    try {
      const data = await api(`/photos/${pid}/like`, { method: 'POST', body: JSON.stringify({}) });
      setPhotos(prev => prev.map(p => p.id === pid ? { ...p, liked_by_me: data.liked, likes_count: data.likes_count } : p));
    } catch (e) { console.error(e); }
    finally {
      setLikePending(prev => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  }

  // Sube una nueva foto al servidor con su descripción y la añade al principio de la galería
  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile || uploading) return;
    setUploadError('');

    // Validar el tamaño en el frontend (10 MB = 10485760 bytes)
    if (selectedFile.size > 10485760) {
      setUploadError('La foto pesa demasiado. El límite máximo es de 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', selectedFile);
      if (caption) fd.append('caption', caption);
      const res = await api('/photos', { method: 'POST', body: fd });
      setPhotos(prev => [res.photo, ...prev]);
      setActiveIndex(0);
      setCarouselIndex(0);
      setUploadModalOpen(false);
      setCaption(''); setSelectedFile(null); setPreviewUrl(null);
    } catch (err) {
      let msg = err.message || 'Error en la petición';
      if (msg.includes('greater than') || msg.includes('10240')) {
        msg = 'La foto pesa demasiado. El límite máximo es de 10 MB.';
      }
      setUploadError(msg);
    }
    finally { setUploading(false); }
  }

  // Mueve el carrusel a la izquierda o derecha de forma infinita calculando la siguiente foto
  function scroll(direction) {
    if (isAnimating || photos.length < 2) return;
    const newIdx = (carouselIndex + direction + photos.length) % photos.length;
    setActiveIndex(newIdx);

    // Si entramos desde una foto específica por enlace, limpiamos el enlace en el navegador al movernos
    if (window.location.search.includes('photoId')) {
      navigate('/photos', { replace: true });
    }

    setDir(direction);
    setIsAnimating(true);
    setTimeout(() => {
      setCarouselIndex(newIdx);
      setDir(0);
      setIsAnimating(false);
    }, 400);
  }

  // Dibuja la ventana flotante (modal) para subir una foto
  function renderUploadModal() {
    if (!uploadModalOpen) return null;
    return (
      <div className="modal-backdrop" onClick={() => setUploadModalOpen(false)}>
        <div className="modal-content-glass fade-in" onClick={e => e.stopPropagation()}>
          <h2 className="auth-hero-title" style={{ textAlign: 'center', marginBottom: 30 }}>Nueva publicación</h2>
          <ErrorBanner message={uploadError} onClear={() => setUploadError('')} style={{ marginBottom: 20 }} />
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="upload-dropzone" style={{ minHeight: 180 }} onClick={() => document.getElementById('photo-input').click()}>
              {previewUrl ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} /> : (
                <div style={{ textAlign: 'center', opacity: 0.6 }}>
                  <IconPlus style={{ width: 48, marginBottom: 10, color: 'var(--accent)' }} />
                  <p style={{ fontSize: '0.8rem' }}>Seleccionar foto</p>
                </div>
              )}
              <input id="photo-input" type="file" accept="image/*" hidden onChange={e => { const f = e.target.files[0]; if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); } else { setSelectedFile(null); setPreviewUrl(null); } }} />
            </div>

            <textarea className="input-glass-std" style={{ minHeight: 80, resize: 'none' }} placeholder="Escribe una descripción..." value={caption} onChange={e => setCaption(e.target.value)} maxLength={500} />

            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <button type="button" className="btn-capsule round secondary" style={{ flex: 1 }} onClick={() => setUploadModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-capsule round accent" style={{ flex: 1.5 }} disabled={!selectedFile || uploading}>{uploading ? 'Revelando...' : 'Publicar'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Muestra una pantalla de carga o un aviso si no hay fotos todavía
  if (loading && photos.length === 0) return <div className="page-standalone"><Loader /></div>;
  if (!loading && photos.length === 0) return (
    <div className="page-standalone">
      <div className="empty-hint">Aún no hay fotos en la galería. ¡Sé el primero en subir una!</div>
      <button className="btn-add-square btn-add-fixed" onClick={openUploadModal}><IconPlus /></button>
      {renderUploadModal()}
    </div>
  );

  // Calcula la foto anterior, la actual y la siguiente para que el carrusel pueda girar infinitamente
  const prevPhoto = photos[(carouselIndex - 1 + photos.length) % photos.length];
  const activeCarouselPhoto = photos[carouselIndex];
  const nextPhoto = photos[(carouselIndex + 1) % photos.length];

  return (
    <div className="page-standalone hide-scrollbar" style={{ padding: 0 }}>
      <main className="photos-main-layout-integrated">

        {/* Carrusel de fotos con las flechas de navegación a los lados */}
        <section className="photos-carousel-section-integrated">
          <button className="btn-add-square btn-add-fixed" style={{ bottom: 40, right: 10, width: 64, height: 64 }} onClick={openUploadModal}>
            <IconPlus style={{ width: 32, height: 32 }} />
          </button>

          {photos.length > 1 && (
            <>
              <button className="nav-arrow-overlay" style={{ left: 30 }} onClick={() => scroll(-1)}><IconChevronLeft /></button>
              <button className="nav-arrow-overlay" style={{ right: 30 }} onClick={() => scroll(1)}><IconChevronRight /></button>
            </>
          )}

          <div className="photos-carousel-viewport-single">
            <div style={{
              display: 'flex', height: '100%', width: '300%',
              transform: `translateX(calc(-33.333% + ${-dir * 33.333}%))`,
              transition: isAnimating ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
            }}>
              {[prevPhoto, activeCarouselPhoto, nextPhoto].map((p, i) => (
                <div key={`${p.id}-${i}`} className="photo-carousel-item">
                  <img src={p.image_url} alt="" className="photo-display-img" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Panel lateral derecho con el autor, su descripción, el botón de Like y la zona de comentarios */}
        <aside className="photos-side-panel-integrated">
          <div className="side-panel-card author-card">
            <div className="side-panel-author">
              <div className="side-panel-author-info">
                <div className="user-avatar-trigger clickable" onClick={() => navigate(`/users/${activePhoto.user?.username}`)}>
                  {activePhoto.user?.avatar_url ? <img src={activePhoto.user.avatar_url} alt="" /> : (activePhoto.user?.username || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="clickable" onClick={() => navigate(`/users/${activePhoto.user?.username}`)}>
                  <h4 className="author-name">{activePhoto.user?.username}</h4>
                  <p className="photo-caption-side">{activePhoto.caption}</p>
                </div>
              </div>
              <button className={`btn-like-svg ${activePhoto.liked_by_me ? 'liked' : ''}`} onClick={() => toggleLike(activePhoto.id)}>
                <IconHeart /> <span>{activePhoto.likes_count}</span>
              </button>
            </div>
          </div>

          <div className="side-panel-card comments-card">
            <div className="side-panel-header"><h3 className="section-title-minimal" style={{ margin: 0 }}>Comentarios</h3></div>
            <div className="side-panel-messages hide-scrollbar">
              {comments.map(c => (
                <div key={c.id} className="comment-bubble">
                  <span className="comment-author clickable" onClick={() => navigate(`/users/${c.user?.username}`)}>{c.user?.username}</span>
                  <p className="comment-text">{c.body}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="empty-hint" style={{ padding: 20 }}>Ningún comentario todavía.</p>}
            </div>
            <div className="side-panel-footer">
              <form className="photo-side-form" onSubmit={handleSendComment}>
                <input placeholder="Añadir comentario..." value={newComment} onChange={e => setNewComment(e.target.value)} required />
                <button className="btn-send-flat" type="submit"><IconSend /></button>
              </form>
            </div>
          </div>
        </aside>
      </main>

      {renderUploadModal()}
    </div>
  );
}