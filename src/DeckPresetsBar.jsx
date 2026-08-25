import { useEffect, useState } from 'react'
import { fetchUserSavedDecks, POPULAR_PRECON_PRESETS } from './deckPickerSource.js'

const lang = () => (typeof localStorage !== 'undefined' && localStorage.getItem('aeon-lang') === 'fr' ? 'fr' : 'en')
const t = (en, fr) => (lang() === 'fr' ? fr : en)

export default function DeckPresetsBar({
  onSelectRefs,
  onOpenModal,
  mode = 'pod' // 'pod' | 'match' | 'tournament'
}) {
  const [hasUserDecks, setHasUserDecks] = useState(false)
  const [userDeckCount, setUserDeckCount] = useState(0)

  useEffect(() => {
    fetchUserSavedDecks().then(decks => {
      if (decks && decks.length > 0) {
        setHasUserDecks(true)
        setUserDeckCount(decks.length)
      }
    }).catch(() => {})
  }, [])

  async function loadMyDecks() {
    const decks = await fetchUserSavedDecks()
    if (!decks || decks.length === 0) return
    const refs = decks.map(d => `saved:${d.id}`)
    onSelectRefs(refs)
  }

  function loadPreset(presetId) {
    const preset = POPULAR_PRECON_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    const refs = preset.slugs.map(s => `precon:${s}`)
    onSelectRefs(refs)
  }

  return (
    <div className="deckPresetsBar">
      <span className="deckPresetsLabel">⚡ {t('Quick Fill:', 'Préremplissage rapide :')}</span>
      <div className="deckPresetsButtons">
        {hasUserDecks && (
          <button
            type="button"
            className="deckPresetBtn myDecksBtn"
            onClick={loadMyDecks}
            title={t('Fill with your saved decks', 'Remplir avec vos decks sauvegardés')}
          >
            {t('My Decks', 'Mes Decks')} ({userDeckCount})
          </button>
        )}
        <button
          type="button"
          className="deckPresetBtn"
          onClick={() => loadPreset('balanced-4')}
          title={t('Fill with 4 balanced preconstructed decks (median ~47–55)', 'Remplir avec 4 préconstruits équilibrés (médiane ~47–55)')}
        >
          {t('4 Balanced Precons', '4 Précons Équilibrés')}
        </button>
        <button
          type="button"
          className="deckPresetBtn"
          onClick={() => loadPreset('diverse-4')}
          title={t('Fill with 4 distinct archetypes (Aggro, Spells, Vampires, Energy)', 'Remplir avec 4 archétypes variés')}
        >
          {t('4 Diverse Archetypes', '4 Archétypes Variés')}
        </button>
        {(mode === 'match' || mode === 'tournament') && (
          <button
            type="button"
            className="deckPresetBtn"
            onClick={() => loadPreset('modern-8')}
            title={t('Fill with 8 recent preconstructed decks', 'Remplir avec 8 préconstruits récents')}
          >
            {t('8 Modern Precons', '8 Précons Récents')}
          </button>
        )}
        {onOpenModal && (
          <button
            type="button"
            className="deckPresetBtn deckPickerOpenBtn"
            onClick={onOpenModal}
          >
            {t('Browse Catalog…', 'Parcourir le catalogue…')}
          </button>
        )}
      </div>
    </div>
  )
}
