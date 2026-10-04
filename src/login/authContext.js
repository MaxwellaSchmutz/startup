import React from 'react';

export const AuthContext = React.createContext({
  userName: '',
  openAuth: () => {},
  notify: () => {},
  sessionExpired: () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}
