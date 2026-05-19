import { createContext, useContext } from 'react';

// Contexto global del estado de autenticación del usuario
const UserContext = createContext(null);

export function UserProvider({ value, children }) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Hook personalizado para el acceso directo al contexto del usuario autenticado
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}
