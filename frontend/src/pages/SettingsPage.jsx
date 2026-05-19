import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../context/UserContext';
import ConfirmModal from '../components/ConfirmModal';

// Vista de configuraciones generales del perfil del usuario (biografía, imagen de avatar, contraseña y privacidad de la cuenta)
export default function SettingsPage() {
  const { user, setUser, logout } = useUser();
  const navigate = useNavigate();

  // Estado para la sección de ajustes activa
  const [activeTab, setActiveTab] = useState('profile');

  // Datos del formulario de actualización de datos de perfil
  const [form, setForm] = useState({
    username: '',
    description: '',
    email: '',
    is_private: false
  });
  const [avatar, setAvatar] = useState(null);

  // Datos del formulario de cambio de contraseña
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Efecto para la carga inicial de los datos de perfil del usuario autenticado
  useEffect(() => {
    if (user) setForm({
      username: user.username || '',
      description: user.description || '',
      email: user.email || '',
      is_private: user.is_private || false
    });
  }, [user]);

  // Restablecimiento de los mensajes de estado y errores en la vista
  const resetStatus = () => { setError(''); setSuccess(''); };

  // Envío de datos del perfil al servidor (soporta carga de archivo binario para el avatar)
  async function saveProfile(e) {
    if (e) e.preventDefault();
    resetStatus(); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('username', form.username.trim());
      fd.append('description', form.description.trim());
      fd.append('email', form.email.trim());
      fd.append('is_private', form.is_private ? 1 : 0);
      if (avatar) fd.append('avatar', avatar);

      const data = await api('/profile', { method: 'PATCH', body: fd });
      setUser(data.user);
      setSuccess('Perfil actualizado con éxito.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  // Validación y envío de la solicitud de actualización de contraseña
  async function changePassword(e) {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return setError('Las contraseñas no coinciden.');
    resetStatus(); setBusy(true);
    try {
      await api('/profile/password', {
        method: 'POST',
        body: JSON.stringify({ current_password: passwords.current, new_password: passwords.new })
      });
      setSuccess('Contraseña actualizada.');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  // Eliminación física definitiva de la cuenta de usuario tras confirmación explícita
  function deleteAccount() {
    setConfirmConfig({
      message: '¿Estás seguro? Esta acción es irreversible.',
      onConfirm: async () => {
        setConfirmConfig(null);
        setBusy(true);
        try {
          await api('/profile', { method: 'DELETE' });
          logout();
          navigate('/login');
        } catch (err) { setError(err.message); setBusy(false); }
      }
    });
  }

  return (
    <div className="page-standalone hide-scrollbar">
      <div className="page-content-inner" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="settings-layout-wrap" style={{ flex: 1, display: 'flex', gap: 30, minHeight: 0 }}>

          {/* Panel de navegación lateral izquierdo para selección de la sección activa */}
          <aside className="settings-sidebar-nav" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'profile', label: 'Editar Perfil' },
              { id: 'privacy', label: 'Privacidad' },
              { id: 'account', label: 'Cuenta y Seguridad' }
            ].map(tab => (
              <div key={tab.id} className={`settings-nav-item-wrap ${activeTab === tab.id ? 'active' : ''}`}>
                <button className="settings-nav-button" onClick={() => { setActiveTab(tab.id); resetStatus(); }}>
                  {tab.label}
                </button>
              </div>
            ))}
          </aside>

          {/* Contenedor principal de los formularios de configuración */}
          <main className="settings-content-container glass-card hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 40 }}>

            {success && <div className="auth-status-box" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent)', padding: '12px 20px', borderRadius: 12, fontSize: '0.85rem', marginBottom: 20 }}>{success}</div>}
            {error && <div className="auth-status-box err" style={{ marginBottom: 20 }}>{error}</div>}

            {activeTab === 'profile' && (
              <section className="fade-in">
                <h2 className="section-label-tiny" style={{ marginBottom: 20 }}>Detalles del Perfil</h2>
                <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div className="user-avatar-trigger" style={{ width: 80, height: 80, fontSize: '1.8rem' }} onClick={() => document.getElementById('avatar-set').click()}>
                      {avatar ? <img src={URL.createObjectURL(avatar)} alt="" /> : (user?.avatar_url ? <img src={user.avatar_url} alt="" /> : user?.username?.slice(0, 1).toUpperCase())}
                    </div>
                    <button type="button" className="btn-glass" style={{ padding: '8px 16px', fontSize: '0.75rem', borderRadius: 12 }} onClick={() => document.getElementById('avatar-set').click()}>
                      Cambiar Imagen
                    </button>
                    <input id="avatar-set" type="file" accept="image/*" hidden onChange={e => setAvatar(e.target.files[0])} />
                  </div>

                  <div className="field-group-minimal">
                    <label className="section-label-tiny">Usuario</label>
                    <input className="input-glass-std" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required maxLength={32} />
                  </div>

                  <div className="field-group-minimal">
                    <label className="section-label-tiny">Correo</label>
                    <input className="input-glass-std" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>

                  <div className="field-group-minimal">
                    <label className="section-label-tiny">Biografía</label>
                    <textarea className="input-glass-std" style={{ minHeight: 100, resize: 'none' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={500} />
                  </div>

                  <button type="submit" className="btn-capsule round accent" style={{ alignSelf: 'flex-start', padding: '12px 40px' }} disabled={busy}>
                    {busy ? 'Guardando...' : 'Guardar Perfil'}
                  </button>
                </form>
              </section>
            )}

            {activeTab === 'privacy' && (
              <section className="fade-in">
                <h2 className="section-label-tiny" style={{ marginBottom: 20 }}>Privacidad</h2>
                <div className="glass-card-mini" style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 30 }}>
                  <div style={{ flex: 1, paddingRight: 20 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>Cuenta Privada</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Solo tus seguidores podrán ver tus fotos y publicaciones.</p>
                  </div>
                  <button type="button" className={`btn-capsule round ${form.is_private ? 'accent' : 'secondary'}`} style={{ minWidth: 140 }} onClick={() => setForm({ ...form, is_private: !form.is_private })}>
                    {form.is_private ? 'Activada' : 'Desactivada'}
                  </button>
                </div>
                <button className="btn-capsule round accent" style={{ padding: '12px 40px' }} disabled={busy} onClick={saveProfile}>
                  {busy ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </section>
            )}

            {activeTab === 'account' && (
              <section className="fade-in">
                <h2 className="section-label-tiny" style={{ marginBottom: 20 }}>Seguridad</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                  <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <h3 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: 1 }}>Actualizar contraseña</h3>
                    <input className="input-glass-std" type="password" placeholder="Contraseña actual" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} required />
                    <div style={{ display: 'flex', gap: 15 }}>
                      <input className="input-glass-std" type="password" placeholder="Nueva contraseña" style={{ flex: 1 }} value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} required minLength={8} />
                      <input className="input-glass-std" type="password" placeholder="Repetir" style={{ flex: 1 }} value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} required minLength={8} />
                    </div>
                    <button type="submit" className="btn-glass" style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.75rem' }} disabled={busy}>Actualizar contraseña</button>
                  </form>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

                  <div>
                    <h3 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#ff4d4d', marginBottom: 10 }}>Eliminar cuenta</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>Esta acción es irreversible.</p>
                    <button type="button" className="btn-glass" style={{ borderColor: '#ff4d4d', color: '#ff4d4d' }} onClick={deleteAccount}>Eliminar</button>
                  </div>
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
