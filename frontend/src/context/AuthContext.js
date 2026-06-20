import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * AuthContext
 * -----------
 * Gere l'etat d'authentification global de l'application :
 *  - `user`    : l'utilisateur actuellement connecte (ou null)
 *  - `token`   : le JWT stocke en localStorage
 *  - `loading` : true pendant la verification initiale de la session
 *
 * Au chargement de l'app, si un token existe dans le localStorage,
 * on appelle GET /api/auth/me pour verifier qu'il est toujours valide
 * et recuperer les infos a jour de l'utilisateur (cela permet de rester
 * connecte apres un rafraichissement de page).
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setToken(storedToken);
      } catch (error) {
        // Token invalide ou expire : on nettoie la session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Connecte l'utilisateur : appelle l'API, stocke le token et l'utilisateur,
   * puis met a jour l'etat global.
   */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  /**
   * Cree un compte puis connecte automatiquement l'utilisateur
   * (le backend renvoie directement un token a l'inscription).
   */
  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Met a jour partiellement l'utilisateur en memoire (ex: apres avoir change
   * sa bio ou sa photo de profil), sans devoir refaire un appel /auth/me.
   */
  const updateUser = useCallback((partialUser) => {
    setUser((prev) => {
      const updated = { ...prev, ...partialUser };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = { user, token, loading, login, register, logout, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Hook pratique pour acceder au contexte d'authentification : const { user } = useAuth(); */
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
