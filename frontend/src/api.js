const TOKEN_KEY = 'social_token';

// URL base para el cliente HTTP de la API REST
export const API_BASE =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Recuperación del token de sesión almacenado en localStorage
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Persistencia o eliminación del token de sesión
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Cliente HTTP personalizado para solicitudes fetch a la API (gestión de cabeceras, token Sanctum y excepciones)
export async function api(path, options = {}) {
  // Inicialización de cabeceras de aceptación de JSON
  const headers = { Accept: 'application/json', ...(options.headers || {}) };

  // Inyección automática del token de portador (Bearer Token) si existe sesión activa
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Establecimiento de tipo de contenido por defecto excepto para cargas multipart (FormData)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Ejecución de la solicitud HTTP
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let data = {};
  const text = await res.text();

  // Deserialización segura de la respuesta JSON
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  // Control de errores de red o HTTP (status >= 400)
  if (!res.ok) {
    // Emisión de evento global de desautorización ante expiración o invalidez del token
    if (res.status === 401) {
      window.dispatchEvent(new Event('unauthorized'));
    }

    // Extracción y normalización del mensaje de error
    const msg = data.errors ? Object.values(data.errors).flat()[0] : (data.message || 'Error en la petición');

    // Construcción de la excepción enriquecida
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // Retorno de los datos deserializados en caso de éxito
  return data;
}
