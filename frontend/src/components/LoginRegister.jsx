import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setToken } from '../api';
import { IconPlus } from '../icons';
import '../transitions.css';

// Pantalla unificada para iniciar sesión, registrarse paso a paso o recuperar la contraseña
export default function LoginRegister({ onAuthed }) {
  const navigate = useNavigate();

  // Guardamos si estamos en login, registro o recuperar contraseña, y en qué paso del registro nos encontramos
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(1);

  // Guardamos temporalmente los datos escritos en el formulario
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirmation: '',
    username: '',
    description: ''
  });

  // Guardamos la foto seleccionada y su vista previa para el avatar
  const [avatar, setAvatar] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [success, setSuccess] = useState('');

  // Función auxiliar para actualizar un campo del formulario
  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Termina el proceso de entrada guardando el token y haciendo la animación suave de salida
  const finishAuth = (user, token) => {
    setToken(token);
    setIsTransitioning(true);
    setTimeout(() => {
      onAuthed(user);
      navigate('/');
    }, 850);
  };

  // Se ejecuta al hacer clic en enviar el formulario, manejando el login, el registro paso a paso o la recuperación de contraseña
  async function handleSubmit(e) {
    e.preventDefault();
    if (isTransitioning) return;
    setError(''); setSuccess(''); setLoading(true);

    try {
      if (mode === 'register') {
        if (step === 1) {
          if (form.password !== form.passwordConfirmation) throw new Error('Las contraseñas no coinciden');
          setStep(2);
        } else {
          const fd = new FormData();
          Object.entries(form).forEach(([k, v]) => fd.append(k === 'passwordConfirmation' ? 'password_confirmation' : k, v));
          if (avatar) {
            fd.append('avatar', avatar);
          }
          const data = await api('/register', { method: 'POST', body: fd });
          finishAuth(data.user, data.token);
        }
      } else if (mode === 'forgot') {
        const data = await api('/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password, password_confirmation: form.passwordConfirmation }),
        });
        setSuccess(data.message);
        setTimeout(() => setMode('login'), 2000);
      } else {
        const data = await api('/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        finishAuth(data.user, data.token);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const isRegister = mode === 'register';

  return (
    <div className={`auth-page-modern ${isTransitioning ? 'is-transitioning' : ''}`}>
      {/* Vídeo en bucle que sirve de fondo decorativo para la pantalla */}
      <video className="auth-video-full" autoPlay muted loop playsInline>
        <source src="/login_video.mp4" type="video/mp4" />
      </video>

      <div className={`auth-split-container ${isRegister ? 'register-mode' : ''} ${isTransitioning ? 'is-transitioning' : ''}`}>

        {/* Lado del formulario con los campos para escribir */}
        <div className={`auth-panel form-side ${isRegister ? 'active-right' : ''}`}>
          <h2 className="auth-hero-title">
            {mode === 'forgot' ? 'Recuperar acceso' : (isRegister ? (step === 1 ? 'Crea tu cuenta' : 'Personaliza tu perfil') : 'Entrar')}
          </h2>

          <div className="auth-form-wrapper">
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>

              {step === 1 ? (
                <div className="auth-input-group">
                  <input className="input-glass-std" type="email" placeholder="Correo electrónico" value={form.email} onChange={e => updateForm('email', e.target.value)} required />
                  <input className="input-glass-std" type="password" placeholder={mode === 'forgot' ? "Nueva contraseña" : "Contraseña"} value={form.password} onChange={e => updateForm('password', e.target.value)} required minLength={8} />
                  {(isRegister || mode === 'forgot') && (
                    <input className="input-glass-std" type="password" placeholder="Confirmar contraseña" value={form.passwordConfirmation} onChange={e => updateForm('passwordConfirmation', e.target.value)} required />
                  )}
                  {mode === 'login' && (
                    <div style={{ textAlign: 'center', marginTop: 10 }}>
                      <span className="text-link-basic" style={{ fontSize: '0.75rem', opacity: 0.5 }} onClick={() => setMode('forgot')}>¿Olvidaste tu contraseña?</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="auth-input-group">
                  {/* Zona circular interactiva para subir y previsualizar la foto de perfil (avatar) */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <div className="glass-card" style={{ padding: 4, borderRadius: '50%', width: 80, height: 80, position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => document.getElementById('avatar-input').click()}>
                      {previewUrl ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}><IconPlus style={{ opacity: 0.5, width: 24 }} /></div>
                      )}
                      <input id="avatar-input" type="file" accept="image/*" hidden onChange={e => { const f = e.target.files[0]; if (f) { setAvatar(f); setPreviewUrl(URL.createObjectURL(f)); } else { setAvatar(null); setPreviewUrl(null); } }} />
                    </div>
                  </div>
                  <input className="input-glass-std" placeholder="Nombre de usuario" value={form.username} onChange={e => updateForm('username', e.target.value)} required maxLength={32} />
                  <textarea className="input-glass-std" placeholder="Escribe una breve biografía..." value={form.description} onChange={e => updateForm('description', e.target.value)} style={{ resize: 'none' }} rows={2} maxLength={500} />
                  <button type="button" className="text-link-basic" style={{ marginTop: 10, opacity: 0.5, fontSize: '0.75rem', textAlign: 'center', width: '100%' }} onClick={() => setStep(1)}>Volver</button>
                </div>
              )}

              {error && <div className="auth-status-box err">{error}</div>}
              {success && <div className="auth-status-box" style={{ background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent)', padding: 12, borderRadius: 12, fontSize: '0.85rem', marginBottom: 20, textAlign: 'center' }}>{success}</div>}

              <button className="auth-btn-main" disabled={loading} style={{ margin: '0 auto', display: 'block' }}>
                {loading ? '...' : (mode === 'forgot' ? 'Restablecer' : (isRegister ? (step === 1 ? 'Siguiente' : 'Finalizar') : 'Entrar'))}
              </button>
            </form>
          </div>
        </div>

        {/* Lado informativo derecho con el botón para cambiar entre registrarse e iniciar sesión */}
        <div className={`auth-panel overlay-side ${isRegister ? 'active-right' : ''}`}>
          <div className="auth-overlay-content">
            <h2>{mode === 'forgot' ? '¿Recordaste?' : (isRegister ? (step === 1 ? '¿Ya tienes cuenta?' : '¡Casi llegamos!') : '¿Nuevo aquí?')}</h2>
            <p>
              {mode === 'forgot' ? 'Vuelve atrás para acceder a tu cuenta.' : (isRegister ? (step === 1 ? 'Inicia sesión para volver a conectar.' : 'Completa tu información de perfil.') : 'Crea tu cuenta hoy para empezar a publicar.')}
            </p>
            {step === 1 && (
              <button type="button" className="auth-btn-main" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); setSuccess(''); }}>
                {isRegister ? 'Entrar' : 'Registrarse'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
