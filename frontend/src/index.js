import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import './index.css';

/**
 * Point d'entree de l'application React.
 *
 * Ordre des providers (important !) :
 *  1. BrowserRouter   -> active le routage (react-router-dom)
 *  2. AuthProvider    -> doit englober Theme/Socket car ces deux contextes
 *                        utilisent `useAuth()` (token, user) en interne
 *  3. ThemeProvider   -> gere le mode clair/sombre
 *  4. SocketProvider  -> ouvre la connexion temps reel une fois authentifie
 */
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
