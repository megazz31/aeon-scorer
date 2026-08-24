import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CloudWorkspace from './CloudWorkspace.jsx'
import ProductWorkspace from './ProductWorkspace.jsx'
import PublicDecksPage from './PublicDecksPage.jsx'
import TournamentPage from './TournamentPage.jsx'
import GlobalProductChrome from './GlobalProductChrome.jsx'
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

let page
if(publicDeckRoute)page=<GlobalProductChrome><PublicDecksPage/></GlobalProductChrome>
else if(shareRoute)page=<GlobalProductChrome><SharePage/></GlobalProductChrome>
else if(compareRoute)page=<GlobalProductChrome><CompareDecksPage/></GlobalProductChrome>
else if(tablesRoute)page=<GlobalProductChrome><EventTablesPage/></GlobalProductChrome>
else if(tournamentRoute)page=<GlobalProductChrome><TournamentPage/></GlobalProductChrome>
else page=<ProductWorkspace><CloudWorkspace><App /></CloudWorkspace></ProductWorkspace>

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
