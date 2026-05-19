import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../context/UserContext';
import { IconUser, IconSettings, IconBell, IconChat, IconLogo } from '../icons';

// Componente contenedor global y layout de la aplicación (incluye barra superior de navegación y menú de usuario)
export default function AppLayout({ children, isExiting }) {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const navRef = useRef(null);

  // Consulta asíncrona concurrente de notificaciones y conversaciones activas
  async function loadData() {
    if (isExiting) return;
    try {
      const [notifData, convData] = await Promise.all([
        api('/notifications'),
        api('/conversations')
      ]);
      setNotifications(notifData.notifications || []);
      setConversations(convData.conversations || []);
    } catch (e) {
      if (e.status !== 401) console.error(e);
    }
  }

  // Manejo de eventos de clic fuera del contenedor del menú para forzar su cierre automático
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Intervalo cíclico de recarga de datos (cada 5000ms) activo si el usuario está autenticado
  useEffect(() => {
    if (!user || isExiting) return;
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user, isExiting]);

  // Consolidación de métricas de elementos no leídos en notificaciones y chats
  const unreadCount = notifications.filter(n => !n.read_at).length;
  const unreadChats = conversations.some(c => c.unread_count > 0);

  // Mapeo semántico de títulos de páginas según la localización de la ruta activa
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return '';
    if (path.startsWith('/photos')) return 'Galería';
    if (path.startsWith('/posts')) return 'Foros';
    if (path.startsWith('/groups')) return 'Grupos';
    if (path.startsWith('/chats')) return 'Chats';
    if (path.startsWith('/settings')) return 'Ajustes';
    if (path.startsWith('/notifications')) return 'Notificaciones';
    if (path.startsWith('/admin')) return 'Administración';
    if (path.startsWith('/users')) return `Perfil: ${path.split('/')[2] || ''}`;
    return '';
  };

  return (
    <div className={`app-root ${isExiting ? 'is-exiting' : ''}`}>
      <div className="glass-container">
        <div className="app-main-content">
          <header className="app-top-nav-minimal" style={{ height: 'auto', padding: '30px' }}>
            <div className="nav-left" style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
              {/* Logotipo e identificador de marca para el retorno al inicio o al panel administrativo */}
              <Link to={user?.is_admin ? "/admin" : "/"} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'rgba(255,255,255,0.7)', background: 'var(--glass-fill)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '8px 16px', marginLeft: '10px' }}>
                <IconLogo style={{ width: 26, height: 26 }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>Sora</span>
              </Link>

              {/* Separador visual y título descriptivo de la ruta activa */}
              {location.pathname !== '/' && (
                <>
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 5px' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {getPageTitle()}
                  </span>
                </>
              )}
            </div>

            <div className="nav-right-profile" ref={navRef} style={{ background: 'var(--glass-fill)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '8px 16px' }}>
              {/* Accesos rápidos de notificaciones y mensajería condicionados al rol no administrativo */}
              {!user?.is_admin && (
                <>
                  <Link to="/notifications" className="nav-bell-btn" onClick={() => setMenu(false)} title="Notificaciones">
                    <IconBell />
                    {unreadCount > 0 && <span className="notif-badge" />}
                  </Link>
                  <Link to="/chats" className="nav-bell-btn" title="Mensajes">
                    <IconChat unread={unreadChats} />
                  </Link>
                </>
              )}

              {/* Control de avatar e inicialización del despliegue del menú de usuario */}
              <div className="user-avatar-trigger" onClick={() => setMenu(!menu)}>
                {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : (user?.username || '?').slice(0, 1).toUpperCase()}
              </div>

              {/* Panel de opciones desplegable del perfil de usuario */}
              {menu && (
                <div className="dropdown-panel dropdown-compact" style={user?.is_admin ? { minWidth: 160, right: 0 } : {}}>
                  {!user?.is_admin && (
                    <>
                      <Link to={`/users/${user?.username}`} onClick={() => setMenu(false)} className="dropdown-item"><IconUser style={{ width: 16 }} /> Perfil</Link>
                      <Link to="/settings" onClick={() => setMenu(false)} className="dropdown-item"><IconSettings style={{ width: 16 }} /> Ajustes</Link>
                      <div className="dropdown-divider" />
                    </>
                  )}
                  <button
                    className="dropdown-item"
                    style={{ color: '#ff4d4d', justifyContent: 'center', width: '100%', padding: '12px 16px' }}
                    onClick={() => { logout(); setMenu(false); }}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="app-page-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
