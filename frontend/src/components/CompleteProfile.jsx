import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { IconPlus } from '../icons';

// Pantalla obligatoria que aparece tras registrarse para terminar de rellenar la foto y los datos del perfil
export default function CompleteProfile({ onDone, onLogout }) {
  const navigate = useNavigate();
  
  // Guardamos los campos escritos (nombre y biografía), el archivo de imagen y su vista previa
  const [form, setForm] = useState({ username: '', description: '' });
  const [avatar, setAvatar] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Envía los datos de perfil y la foto al servidor para activar y terminar de configurar la cuenta
  async function handleSubmit(e) {
    e.preventDefault();
    if (!avatar) return setError('Por favor, selecciona una foto de perfil.');
    setError(''); setLoading(true);

    try {
      const fd = new FormData();
      fd.append('username', form.username);
      fd.append('description', form.description);
      fd.append('avatar', avatar);
      
      const data = await api('/profile/complete', { method: 'POST', body: fd });
      onDone(data.user);
      navigate('/');
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  }

  return (
    <div className="auth-page-modern">
      <div className="auth-container" style={{ maxWidth: 500 }}>
        
        {/* Título de bienvenida de la parte superior */}
        <div className="auth-brand-minimal">
          <h1 className="logo-text">CASI LISTO</h1>
          <p className="logo-subtitle">Completa los datos de tu cuenta</p>
        </div>

        <div className="modal-content-glass auth-card-modern">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Círculo interactivo para elegir y previsualizar la foto de perfil */}
            <div className="glass-card" style={{ padding: 10, borderRadius: '50%', width: 120, height: 120, margin: '0 auto', position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => document.getElementById('avatar-input').click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                  <IconPlus style={{ opacity: 0.5 }} />
                </div>
              )}
              <input id="avatar-input" type="file" accept="image/*" hidden onChange={e => { const f = e.target.files[0]; if (f) { setAvatar(f); setPreviewUrl(URL.createObjectURL(f)); } else { setAvatar(null); setPreviewUrl(null); } }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Foto de perfil</p>

            {/* Campo para escribir el nombre de usuario único */}
            <div className="glass-card auth-field-block">
              <label className="auth-label">Nombre de Usuario</label>
              <input
                className="auth-input-minimal"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                required
                placeholder="Como te conocerán"
                maxLength={32}
              />
            </div>

            {/* Campo para escribir la descripción o biografía */}
            <div className="glass-card auth-field-block">
              <label className="auth-label">Sobre ti</label>
              <textarea
                className="auth-input-minimal"
                rows={3}
                style={{ resize: 'none' }}
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Una breve biografía..."
                maxLength={500}
              />
            </div>

            {error && <div className="auth-status-box err">{error}</div>}

            <button className="btn-capsule auth-submit-btn" disabled={loading} style={{ marginTop: 10 }}>
              {loading ? 'Guardando...' : 'Finalizar y entrar'}
            </button>

            {onLogout && (
              <button type="button" className="text-link-basic" style={{ marginTop: 10, opacity: 0.5, fontSize: '0.75rem', textAlign: 'center', width: '100%' }} onClick={onLogout}>
                Cerrar sesión y volver
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
