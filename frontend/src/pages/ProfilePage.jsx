import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../context/UserContext';
import { IconChat, IconLock } from '../icons';

// Importamos las pestañas internas del perfil (fotos, posts y grupos) y el formulario flotante para editar
import PhotosTab from '../components/profile/PhotosTab';
import PostsTab from '../components/profile/PostsTab';
import GroupsTab from '../components/profile/GroupsTab';
import EditModal from '../components/profile/EditModal';
import Loader from '../components/Loader';
import ErrorBanner from '../components/ErrorBanner';
import ConfirmModal from '../components/ConfirmModal';

// Pantalla de perfil, que sirve tanto para ver nuestro propio perfil como el de otros usuarios
export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useUser();
  const id = username || me?.username;
  const isSelf = username ? String(username) === String(me?.username) : true;
  const navigate = useNavigate();

  // Guardamos todos los datos del perfil cargado, si está cargando, errores y pestaña activa
  const [studio, setStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [followPending, setFollowPending] = useState(false);
  const [activeTab, setActiveTab] = useState('photos');
  // Guardamos si estamos editando una foto/post, los nuevos textos a guardar y si está guardándose
  const [editItem, setEditItem] = useState(null); // { type: 'photo'|'post'|'group', data: {} }
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // { type, id }
  const [confirmConfig, setConfirmConfig] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setActionError('');
        const data = await api(`/users/${id}/studio`);
        if (!cancel) {
          setStudio(data);
          document.title = 'Sora';
          setLoading(false);
        }
      } catch (e) {
        if (!cancel) {
          setError(e.message || 'Error al cargar el perfil');
          setLoading(false);
        }
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  // Permite seguir o dejar de seguir a este usuario (o enviar solicitud si su cuenta es privada)
  async function toggleFollow() {
    if (followPending) return;
    const p = studio?.profile;
    if (!p) return;
    setFollowPending(true);
    const path = `/users/${p.username}/follow`;
    setActionError('');
    try {
      // Si ya seguimos al usuario o la solicitud está pendiente, cancelamos la relación (DELETE)
      if (p.is_following || p.follow_requested) {
        await api(path, { method: 'DELETE' });
        setStudio((s) => ({
          ...s,
          profile: {
            ...s.profile,
            is_following: false,
            follow_requested: false,
            followers_count: s.profile.followers_count - (p.is_following ? 1 : 0)
          }
        }));
      } else {
        // Si no lo seguimos, enviamos una solicitud de seguimiento (POST)
        const res = await api(path, { method: 'POST' });
        setStudio((s) => ({
          ...s,
          profile: {
            ...s.profile,
            is_following: res.accepted,
            follow_requested: !res.accepted,
            // Si el perfil es público (res.accepted es true), incrementamos el contador de seguidores local al instante
            followers_count: s.profile.followers_count + (res.accepted ? 1 : 0)
          }
        }));
      }
    } catch (e) {
      setActionError(e.message || 'Error al procesar la solicitud de seguimiento');
    } finally {
      setFollowPending(false);
    }
  }

  // Abre la pantalla de chat privado directo con este usuario
  function openDm() {
    if (!studio?.profile) return;
    navigate('/chats', { state: { dmUserId: studio.profile.id } });
  }

  // Prepara y abre el formulario para editar un post, foto o grupo propio
  function startEdit(type, data) {
    setActionError('');
    setEditItem({ type, data });
    // Inicializamos el formulario con los campos específicos del recurso que vamos a editar
    if (type === 'photo') setEditForm({ caption: data.caption || '' });
    if (type === 'post') setEditForm({ body: data.body || '' });
    if (type === 'group') setEditForm({ name: data.name, description: data.description || '', image: null });
  }

  // Guarda los cambios realizados en el formulario de edición y actualiza la pantalla al instante
  async function saveEdit(e) {
    if (e) e.preventDefault();
    setActionError('');

    // Validar el tamaño en el frontend si se sube una imagen de grupo (10 MB = 10485760 bytes)
    if (editItem.type === 'group' && editForm.image && editForm.image.size > 10485760) {
      setActionError('La foto pesa demasiado. El límite máximo es de 10 MB.');
      return;
    }

    setSaving(true);
    try {
      let url = '';
      let method = 'PATCH';
      let body = JSON.stringify(editForm);
      let isForm = false;

      // Determinamos la ruta de la API y el formato de datos (JSON o FormData) según el tipo de recurso
      if (editItem.type === 'photo') url = `/photos/${editItem.data.id}`;
      if (editItem.type === 'post') url = `/forum-posts/${editItem.data.id}`;
      if (editItem.type === 'group') {
        url = `/groups/${editItem.data.id}`;
        if (editForm.image) {
          // Si cambiamos la foto del grupo, enviamos los datos en formato FormData (para subir la foto)
          const fd = new FormData();
          fd.append('name', editForm.name);
          fd.append('description', editForm.description);
          fd.append('image', editForm.image);
          fd.append('_method', 'PATCH');
          body = fd;
          isForm = true;
          method = 'POST';
        } else {
          // Si solo cambiamos textos, enviamos una solicitud JSON normal
          body = JSON.stringify({
            name: editForm.name,
            description: editForm.description
          });
        }
      }

      // Enviamos la petición de actualización al servidor
      const res = await api(url, { method, body, isForm });

      // Actualizamos los datos en memoria para que el cambio se vea al instante sin recargar la página
      setStudio(prev => {
        const next = { ...prev };
        if (editItem.type === 'photo') {
          next.photos = next.photos.map(x => x.id === editItem.data.id ? { ...x, caption: editForm.caption } : x);
        }
        if (editItem.type === 'post') {
          next.posts = next.posts.map(x => x.id === editItem.data.id ? { ...x, body: editForm.body } : x);
        }
        if (editItem.type === 'group') {
          next.groups = next.groups.map(x => x.id === editItem.data.id ? { ...x, name: res.group.name, description: res.group.description, image_url: res.group.image_url } : x);
        }
        return next;
      });

      setEditItem(null);
    } catch (e) {
      let msg = e.message || 'Error al guardar los cambios';
      if (msg.includes('greater than') || msg.includes('10240')) {
        msg = 'La foto pesa demasiado. El límite máximo es de 10 MB.';
      }
      setActionError(msg);
    }
    finally { setSaving(false); }
  }

  // Pregunta si estamos seguros y borra para siempre una foto, post o grupo
  function handleDelete(type, id) {
    // Mostramos la ventana flotante de confirmación antes de proceder a la eliminación física
    setConfirmConfig({
      message: '¿Estás seguro de que quieres eliminar esto?',
      onConfirm: async () => {
        setConfirmConfig(null);
        setActionError('');
        try {
          let url = '';
          if (type === 'photo') url = `/photos/${id}`;
          if (type === 'post') url = `/forum-posts/${id}`;
          if (type === 'group') url = `/groups/${id}`;

          // Solicitamos al servidor borrar permanentemente el elemento
          await api(url, { method: 'DELETE' });

          // Quitamos el elemento borrado de la pantalla inmediatamente sin recargar
          setStudio(prev => {
            const next = { ...prev };
            if (type === 'photo') next.photos = next.photos.filter(x => x.id !== id);
            if (type === 'post') next.posts = next.posts.filter(x => x.id !== id);
            if (type === 'group') next.groups = next.groups.filter(x => x.id !== id);
            return next;
          });
          setActiveMenu(null);
        } catch (e) {
          setActionError(e.message || 'Error al eliminar el elemento');
        }
      }
    });
  }

  // Si los datos aún se están descargando de internet, muestra el círculo de carga
  if (loading) return <div className="page-standalone"><Loader /></div>;
  // Si ha habido algún problema al cargar, muestra el error en pantalla
  if (error) return <div className="page-standalone"><div className="empty-hint">{error}</div></div>;

  const p = studio.profile;

  return (
    <div className="page-standalone hide-scrollbar fade-in">

      <main className="profile-page-content">
        <ErrorBanner message={actionError} onClear={() => setActionError('')} style={{ width: '100%', marginBottom: 20 }} />

        {/* La cabecera superior con la foto de perfil, el nombre y la biografía */}
        <section className="glass-card" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
          {/* El bloque central con la foto circular y el texto descriptivo */}
          <div style={{ padding: 50, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="profile-avatar-wrap" style={{ width: 140, height: 140, margin: '0 auto 20px', borderRadius: '50%', background: 'var(--glass-fill)', display: 'grid', placeItems: 'center', fontSize: '3rem', fontWeight: 800, overflow: 'hidden' }}>
              {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.username.slice(0, 1).toUpperCase()}
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 10, letterSpacing: '-1px' }}>{p.username}</h1>
            <p style={{ opacity: 0.6, fontSize: '1.05rem', maxWidth: 500, margin: '0 auto' }}>{p.description || 'Sin biografía'}</p>
          </div>

          {/* Marcadores numéricos de publicaciones, seguidores y seguidos */}
          <div style={{ padding: '35px 50px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40 }}>
            <div className="stat-box" style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{p.total_posts}</div>
              <div className="section-label-tiny">Posts</div>
            </div>
            <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
            <div className="stat-box" style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{p.followers_count}</div>
              <div className="section-label-tiny">Seguidores</div>
            </div>
            <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
            <div className="stat-box" style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{p.following_count}</div>
              <div className="section-label-tiny">Siguiendo</div>
            </div>
          </div>
        </section>

        {/* Botones de acción para seguir o abrir chat (solo si es el perfil de otro usuario) */}
        {!isSelf && (
          <div style={{ display: 'flex', gap: 15, maxWidth: 450, margin: '0 auto', width: '100%' }}>
            <button
              className={`btn-capsule round ${p.is_following ? 'secondary' : (p.follow_requested ? 'secondary' : 'accent')}`}
              style={{ flex: 1, padding: '20px' }}
              onClick={toggleFollow}
              disabled={followPending}
            >
              {p.is_following ? 'Siguiendo' : (p.follow_requested ? 'Solicitado' : 'Seguir')}
            </button>
            {(p.is_following || !p.is_private) && (
              <button className="btn-glass" style={{ width: 65, height: 65, borderRadius: 22 }} onClick={openDm}>
                <IconChat style={{ width: 22 }} />
              </button>
            )}
          </div>
        )}

        {/* Pestañas de contenido del perfil (solo se muestran si es público, si le seguimos o si somos nosotros mismos) */}
        {(isSelf || p.is_following || !p.is_private) ? (
          <section className="glass-card" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>

            {/* Alternancia de pestañas (Galería, Foros, Grupos) */}
            <nav style={{ display: 'flex', padding: 10, gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { id: 'photos', label: 'Galería' },
                { id: 'posts', label: 'Foros' },
                { id: 'groups', label: 'Grupos' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="btn-glass"
                  style={{
                    flex: 1,
                    padding: '16px 0',
                    borderRadius: 18,
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: activeTab === t.id ? 'var(--accent)' : 'transparent',
                    color: activeTab === t.id ? '#000' : '#fff',
                    border: 'none',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Pintamos el contenido de la pestaña seleccionada (fotos, posts o grupos) */}
            <div style={{ padding: '40px 30px', minHeight: 400, width: '100%' }}>
              {activeTab === 'photos' && (
                <PhotosTab
                  photos={studio.photos}
                  isSelf={isSelf}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              )}

              {activeTab === 'posts' && (
                <PostsTab
                  posts={studio.posts}
                  isSelf={isSelf}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              )}

              {activeTab === 'groups' && (
                <GroupsTab
                  groups={studio.groups}
                  isSelf={isSelf}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  me={me}
                />
              )}
            </div>
          </section>
        ) : (
          <section className="glass-card" style={{ padding: 100, textAlign: 'center', width: '100%' }}>
            <div style={{ marginBottom: 25, color: 'rgba(255,255,255,0.4)' }}>
              <IconLock style={{ width: 80, height: 80 }} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 12, letterSpacing: '-1px' }}>Esta cuenta es privada</h2>
            <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Sigue a {p.username} para ver sus fotos y publicaciones.</p>
          </section>
        )}
      </main>

      {/* Ventana flotante (modal) para editar la descripción de una foto, post o grupo */}
      <EditModal
        editItem={editItem}
        editForm={editForm}
        setEditForm={setEditForm}
        onSave={saveEdit}
        onCancel={() => setEditItem(null)}
        saving={saving}
        error={actionError}
      />

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
