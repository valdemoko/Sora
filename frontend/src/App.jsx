import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { api, getToken, setToken } from './api';
import { UserProvider } from './context/UserContext';
import LoginRegister from './components/LoginRegister';
import CompleteProfile from './components/CompleteProfile';
import HomePage from './pages/HomePage';
import PhotosPage from './pages/PhotosPage';
import PostsPage from './pages/PostsPage';
import GroupsPage from './pages/GroupsPage';
import ProfilePage from './pages/ProfilePage';
import ChatsPage from './pages/ChatsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import AppLayout from './components/AppLayout';
import Loader from './components/Loader';

// Componente principal de la aplicación. Gestiona la autenticación y las rutas del enrutador de React.
export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Suscripción al evento global de desautorización para forzar el cierre de sesión
  useEffect(() => {
    const handleUnauthorized = () => logout(true);
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  // Validación inicial del token de sesión al iniciar la aplicación
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return undefined;
    }
    api('/me')
      .then((d) => setUser(d.user))
      .catch(() => {
        setToken(null);
      })
      .finally(() => setBooting(false));
    return undefined;
  }, []);

  // Proceso de desconexión del usuario (revocación de sesión local y remota)
  async function logout(skipApi = false) {
    setIsExiting(true);
    const token = getToken();
    if (token && !skipApi) {
      try {
        await api('/logout', { method: 'POST', body: JSON.stringify({}) });
      } catch {
        /* */
      }
    }

    // Espera para coordinar la animación de salida con la destrucción de la sesión
    setTimeout(() => {
      setToken(null);
      setUser(null);
      setIsExiting(false);
      navigate('/login', { state: { fromLogout: true } });
    }, 800);
  }

  // Renderizado del componente de carga mientras se verifica el estado de autenticación
  if (booting) {
    return <Loader />;
  }

  const authenticated = !!user;

  // Redirección forzada a la pantalla de autenticación si no existe sesión activa
  if (!authenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // Redirección a la portada si se intenta acceder a login con una sesión activa
  if (authenticated && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  // Flujo obligatorio de completado de perfil si los datos requeridos están incompletos
  if (user && !user.profile_completed) {
    return (
      <div className="app-root">
        <CompleteProfile onDone={(u) => setUser(u)} onLogout={() => logout()} />
      </div>
    );
  }

  return (
    <UserProvider value={{ user, setUser, logout }}>
      {authenticated ? (
        <AppLayout isExiting={isExiting}>
          {/* Mapeo de rutas protegidas de la aplicación */}
          <Routes>
            {/* Rutas estándar para usuarios generales (redireccionadas al panel si el rol es administrador) */}
            <Route path="/" element={user?.is_admin ? <Navigate to="/admin" replace /> : <HomePage />} />
            <Route path="/photos" element={user?.is_admin ? <Navigate to="/admin" replace /> : <PhotosPage />} />
            <Route path="/posts" element={user?.is_admin ? <Navigate to="/admin" replace /> : <PostsPage />} />
            <Route path="/groups" element={user?.is_admin ? <Navigate to="/admin" replace /> : <GroupsPage />} />
            <Route path="/me" element={user?.is_admin ? <Navigate to="/admin" replace /> : <ProfilePage />} />
            <Route path="/users/:username" element={user?.is_admin ? <Navigate to="/admin" replace /> : <ProfilePage />} />
            <Route path="/chats" element={user?.is_admin ? <Navigate to="/admin" replace /> : <ChatsPage />} />
            <Route path="/chats/:conversationId" element={user?.is_admin ? <Navigate to="/admin" replace /> : <ChatsPage />} />
            <Route path="/notifications" element={user?.is_admin ? <Navigate to="/admin" replace /> : <NotificationsPage />} />
            <Route path="/settings" element={user?.is_admin ? <Navigate to="/admin" replace /> : <SettingsPage />} />

            {/* Panel exclusivo de administración */}
            <Route path="/admin" element={user?.is_admin ? <AdminPage /> : <Navigate to="/" replace />} />

            {/* Redirección por defecto ante rutas inexistentes */}
            <Route path="*" element={<Navigate to={user?.is_admin ? "/admin" : "/"} replace />} />
          </Routes>
        </AppLayout>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginRegister onAuthed={(u) => setUser(u)} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </UserProvider>
  );
}
