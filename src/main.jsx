import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CloudWorkspace from './CloudWorkspace.jsx'
import ProductWorkspace from './ProductWorkspace.jsx'
import PublicDecksPage from './PublicDecksPage.jsx'
import TournamentPage from './TournamentPage.jsx'
import { CompareDecksPage,EventTablesPage,SharePage } from './ProductRouteShell.jsx'
import './styles.css'
import './readability.css'
import './publicDecks.css'
import './ux.css'

const path=window.location.pathname
const publicDeckRoute=path==='/decklists-publiques'||path.startsWith('/decklists-publiques/')
const shareRoute=path.startsWith('/a/')
const compareRoute=path==='/pod'
const tablesRoute=path==='/match'
const tournamentRoute=path==='/tournoi'
const publicLabel=localStorage.getItem('aeon-lang')==='fr'?'Decklists publiques':'Public decks'

let page
if(publicDeckRoute)page=<PublicDecksPage/>
else if(shareRoute)page=<SharePage/>
else if(compareRoute)page=<CompareDecksPage/>
else if(tablesRoute)page=<EventTablesPage/>
else if(tournamentRoute)page=<TournamentPage/>
else page=<><ProductWorkspace><CloudWorkspace><App /></CloudWorkspace></ProductWorkspace><a className="publicLibraryShortcut" href="/decklists-publiques"><span>{publicLabel}</span></a></>

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
