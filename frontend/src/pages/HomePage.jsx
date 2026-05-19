import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../context/UserContext';
import { IconSearch, IconPhotos, IconPosts, IconGroups } from '../icons';

// Esta es la pantalla principal de la aplicación. Tiene una barra para buscar usuarios, fotos, posts o grupos, y botones para ir a cada sección
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  // Este efecto hace la búsqueda en el servidor de forma automática cuando el usuario escribe en el buscador, esperando 400ms tras dejar de escribir para no saturar el servidor
  useEffect(() => {
    const handler = setTimeout(async () => {
      const term = q.trim();
      if (term.length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const data = await api(`/search?q=${encodeURIComponent(term)}`);
        // Quitamos de los resultados de búsqueda a nosotros mismos y al administrador del sistema
        if (data?.users) {
          data.users = data.users.filter(u => u.id !== user?.id && !u.is_admin);
        }
        setResults(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(handler);
  }, [q, user]);

  // Cierra la lista de resultados de búsqueda si el usuario hace clic en cualquier otra parte de la pantalla
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setResults(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Comprobación para saber si la búsqueda no ha devuelto absolutamente nada
  const isEmpty = results &&
    (results.users?.length || 0) === 0 &&
    (results.photos?.length || 0) === 0 &&
    (results.posts?.length || 0) === 0 &&
    (results.groups?.length || 0) === 0;

  return (
    <div className="home-minimal-root">
      <div className="home-central-hub" style={{ gap: 80 }}>

        {/* Barra de búsqueda y la lista desplegable de resultados que aparece abajo al escribir */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 700 }} ref={searchRef}>
          <div className="home-main-search">
            <IconSearch style={{ color: loading ? 'var(--accent)' : 'var(--text-muted)', width: 24, height: 24 }} />
            <input
              type="text"
              placeholder="Explorar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ fontSize: '1.2rem', fontWeight: 500 }}
            />
          </div>

          {results && (
            <div className="dropdown-panel search-results-dropdown hide-scrollbar" style={{ marginTop: 20 }}>

              {/* Sección que muestra los usuarios encontrados en la búsqueda */}
              {results.users?.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">Usuarios</div>
                  {results.users.map(u => (
                    <Link key={u.id} to={`/users/${u.username}`} className="search-result-item" onClick={() => setResults(null)}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="search-result-avatar" alt="" style={{ width: 40, height: 40, borderRadius: 12 }} />
                      ) : (
                        <div className="search-result-avatar placeholder" style={{ width: 40, height: 40, borderRadius: 12 }}>{u.username?.slice(0, 1).toUpperCase()}</div>
                      )}
                      <span className="search-result-name" style={{ fontSize: '0.9rem' }}>{u.username}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Sección que muestra las fotos encontradas en la búsqueda */}
              {results.photos?.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">Fotos</div>
                  {results.photos.map(p => (
                    <Link key={p.id} to={`/photos?photoId=${p.id}`} className="search-result-item" onClick={() => setResults(null)}>
                      <img src={p.image_url} className="search-result-avatar" style={{ width: 40, height: 40, borderRadius: 8 }} alt="" />
                      <div className="search-result-info">
                        <span className="search-result-name" style={{ fontSize: '0.9rem' }}>{p.caption || 'Visión capturada'}</span>
                        <span className="search-result-meta" style={{ fontSize: '0.7rem' }}>por {p.user?.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Sección que muestra las publicaciones del foro encontradas en la búsqueda */}
              {results.posts?.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">Foro</div>
                  {results.posts.map(p => (
                    <Link key={p.id} to={`/posts?postId=${p.id}`} className="search-result-item" onClick={() => setResults(null)}>
                      <div className="search-result-info">
                        <span className="search-result-name" style={{ fontSize: '0.9rem' }}>{p.body?.slice(0, 50)}...</span>
                        <span className="search-result-meta" style={{ fontSize: '0.7rem' }}>por {p.user?.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Sección que muestra las comunidades o grupos encontrados en la búsqueda */}
              {results.groups?.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">Grupos</div>
                  {results.groups.map(g => (
                    <Link key={g.id} to={`/groups?groupId=${g.id}`} className="search-result-item" onClick={() => setResults(null)}>
                      <div className="search-result-info">
                        <span className="search-result-name" style={{ fontSize: '0.9rem' }}>{g.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Texto que sale si no se ha encontrado nada que coincida con lo escrito */}
              {isEmpty && (
                <div className="empty-hint" style={{ padding: 30, textAlign: 'center' }}>Ningún resultado encontrado.</div>
              )}
            </div>
          )}
        </div>

        <div className="home-nav-grid">
          {[
            { to: '/photos', icon: <IconPhotos />, label: 'Galería' },
            { to: '/posts', icon: <IconPosts />, label: 'Foros' },
            { to: '/groups', icon: <IconGroups />, label: 'Grupos' }
          ].map((item, idx) => (
            <button key={idx} className="nav-square-btn" onClick={() => navigate(item.to)}>
              <div className="nav-btn-icon-svg">{item.icon}</div>
              <span className="nav-btn-label">{item.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
