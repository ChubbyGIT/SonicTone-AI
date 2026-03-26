/**
 * main.jsx — Application Entry Point
 * ------------------------------------
 * The root render call: mounts the React <App /> tree into the
 * <div id="root"> container defined in index.html.
 *
 * React.StrictMode is kept on to surface potential issues during
 * development (double invocations, deprecated API warnings, etc.).
 * It has no effect in production builds.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'  // global styles, Tailwind layers, custom animations

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)