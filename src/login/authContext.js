import React from 'react';

export const AuthContext = React.createContext({
  userName: '',
  openAuth: () => {},
  logout: () => {},
  notify: () => {},
  sessionExpired: () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}
