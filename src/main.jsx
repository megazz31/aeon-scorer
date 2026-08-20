import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CloudWorkspace from './CloudWorkspace.jsx'
import './styles.css'
import './readability.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><CloudWorkspace><App /></CloudWorkspace></React.StrictMode>
)
