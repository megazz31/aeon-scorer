import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CloudWorkspace from './CloudWorkspace.jsx'
import PublicDecksPage from './PublicDecksPage.jsx'
import './styles.css'
import './readability.css'
import './publicDecks.css'

const publicDeckRoute=window.location.pathname==='/decklists-publiques'||window.location.pathname.startsWith('/decklists-publiques/')
const publicLabel=localStorage.getItem('aeon-lang')==='fr'?'Decklists publiques':'Public decks'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {publicDeckRoute?<PublicDecksPage/>:<><CloudWorkspace><App /></CloudWorkspace><a className="publicLibraryShortcut" href="/decklists-publiques"><span>{publicLabel}</span></a></>}
  </React.StrictMode>
)
