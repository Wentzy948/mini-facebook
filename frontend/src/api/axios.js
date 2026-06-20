import axios from 'axios';

/**
 * Instance Axios partagee par toute l'application.
 * --------------------------------------------------
 * - `baseURL` pointe vers l'API backend (definie dans .env via REACT_APP_API_URL)
 * - L'intercepteur de requete ajoute automatiquement le header
 *   `Authorization: Bearer <token>` si un token est present dans le localStorage,
 *   afin qu'on n'ait pas a le faire manuellement dans chaque appel.
 * - L'intercepteur de reponse deconnecte automatiquement l'utilisateur
 *   si le serveur renvoie 401 (token invalide ou expire).
 */
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirige vers la page de connexion si le token n'est plus valide
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Construit l'URL complete vers un fichier uploade (image de profil, post, story...).
 * Le backend renvoie des chemins relatifs comme "/uploads/posts/xxx.jpg",
 * qu'il faut prefixer par l'URL du serveur pour pouvoir les afficher dans <img>.
 */
export const fileUrl = (relativePath) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  return `${API_URL}${relativePath}`;
};

export default api;
