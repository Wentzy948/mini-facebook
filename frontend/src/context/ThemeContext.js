import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

/**
 * ThemeContext
 * ------------
 * Gere le mode clair/sombre de toute l'application.
 *
 * Strategie de persistance (en cascade) :
 *  1. Au premier chargement, on regarde le localStorage (theme choisi avant connexion)
 *  2. Sinon, on regarde la preference sauvegardee sur le profil utilisateur (`user.theme`)
 *  3. Sinon, on regarde la preference du systeme (`prefers-color-scheme`)
 *  4. Par defaut : 'light'
 *
 * Le theme est applique en posant l'attribut `data-theme="dark"` ou `data-theme="light"`
 * sur la balise <html>. Tout le CSS (variables.css) reagit a cet attribut.
 *
 * Quand l'utilisateur change le theme, on le sauvegarde dans le localStorage
 * (disponible immediatement, meme avant chargement de l'API) ET, si connecte,
 * on le persiste cote serveur via PUT /api/users/me/theme.
 */
const ThemeContext = createContext(null);

const getInitialTheme = () => {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const { user, updateUser } = useAuth() || {};

  // Applique le theme sur <html data-theme="..."> a chaque changement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Si l'utilisateur se connecte et n'a jamais choisi de theme localement,
  // on applique sa preference sauvegardee sur son profil.
  useEffect(() => {
    if (user && user.theme && !localStorage.getItem('theme-chosen-manually')) {
      setTheme(user.theme);
    }
  }, [user]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-chosen-manually', 'true');

      // Synchronise la preference avec le backend si l'utilisateur est connecte
      if (user) {
        api.put('/users/me/theme', { theme: next }).catch(() => {
          /* echec silencieux : le theme reste fonctionnel localement */
        });
        if (updateUser) updateUser({ theme: next });
      }

      return next;
    });
  }, [user, updateUser]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
