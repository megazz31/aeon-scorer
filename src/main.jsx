import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CloudWorkspace from './CloudWorkspace.jsx'
import ProductWorkspace from './ProductWorkspace.jsx'
import PublicDecksPage from './PublicDecksPage.jsx'
import { PodMatchPage,SharedAnalysisPage } from './ProductPages.jsx'
import './styles.css'
import './readability.css'
import './publicDecks.css'

const path=window.location.pathname
const publicDeckRoute=path==='/decklists-publiques'||path.startsWith('/decklists-publiques/')
const shareRoute=path.startsWith('/a/')
const podRoute=path==='/pod'
const publicLabel=localStorage.getItem('aeon-lang')==='fr'?'Decklists publiques':'Public decks'

let page
if(publicDeckRoute)page=<PublicDecksPage/>
else if(shareRoute)page=<SharedAnalysisPage/>
else if(podRoute)page=<PodMatchPage/>
else page=<><ProductWorkspace><CloudWorkspace><App /></CloudWorkspace></ProductWorkspace><a className="publicLibraryShortcut" href="/decklists-publiques"><span>{publicLabel}</span></a></>

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
