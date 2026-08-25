import { useEffect, useMemo, useState } from 'react'
import { fetchPreconCatalog, fetchUserSavedDecks, extractDeckCommanderNames, POPULAR_PRECON_PRESETS } from './deckPickerSource.js'

const lang = () => (typeof localStorage !== 'undefined' && localStorage.getItem('aeon-lang') === 'fr' ? 'fr' : 'en')
const t = (en, fr) => (lang() === 'fr' ? fr : en)

export default function DeckPickerModal({
  isOpen,
  onClose,
  onSelect,
  multiSelect = false,
  targetSlot = null,
  initialSelection = []
}) {
  const [tab, setTab] = useState('precons') // 'mydecks' | 'precons' | 'presets'
  const [search, setSearch] = useState('')
  const [colorFilter, setColorFilter] = useState('ALL')
  const [precons, setPrecons] = useState([])
  const [userDecks, setUserDecks] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDecks, setSelectedDecks] = useState(initialSelection || [])

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    Promise.all([
      fetchPreconCatalog().catch(() => []),
      fetchUserSavedDecks().catch(() => [])
    ]).then(([catalog, saved]) => {
      setPrecons(catalog || [])
      setUserDecks(saved || [])
      if (saved && saved.length > 0 && tab !== 'presets') {
        setTab('mydecks')
      }
    }).finally(() => {
      setLoading(false)
    })
  }, [isOpen])

  const filteredPrecons = useMemo(() => {
    const q = search.toLowerCase().trim()
    return precons.filter(p => {
      const matchText = !q || p.name.toLowerCase().includes(q) || (p.commanderName || '').toLowerCase().includes(q) || (p.setCode || '').toLowerCase().includes(q)
      const matchColor = colorFilter === 'ALL' || (colorFilter === 'C' ? (p.colorIdentity || []).length === 0 : (p.colorIdentity || []).includes(colorFilter))
      return matchText && matchColor
    })
  }, [precons, search, colorFilter])

  const filteredUserDecks = useMemo(() => {
    const q = search.toLowerCase().trim()
    return userDecks.filter(d => {
      const cmdStr = extractDeckCommanderNames(d).join(' ').toLowerCase()
      return !q || d.name.toLowerCase().includes(q) || cmdStr.includes(q) || (d.commander_name || '').toLowerCase().includes(q)
    })
  }, [userDecks, search])

  if (!isOpen) return null

  function handleSinglePick(deckRef, deckMeta) {
    onSelect(deckRef, deckMeta)
    onClose()
  }

  function toggleMultiPick(deckRef, deckMeta) {
    setSelectedDecks(prev => {
      const exists = prev.some(x => x.ref === deckRef)
      if (exists) return prev.filter(x => x.ref !== deckRef)
      return [...prev, { ref: deckRef, meta: deckMeta }]
    })
  }

  function handleConfirmMulti() {
    onSelect(selectedDecks)
    onClose()
  }

  function applyPreset(preset) {
    if (multiSelect) {
      const items = preset.slugs.map(slug => {
        const found = precons.find(p => p.slug === slug)
        return {
          ref: `precon:${slug}`,
          meta: found ? { name: found.name, commander: found.commanderName, median: found.analysis?.median } : { name: slug }
        }
      })
      onSelect(items)
      onClose()
    } else {
      // Pick first
      const slug = preset.slugs[0]
      const found = precons.find(p => p.slug === slug)
      handleSinglePick(`precon:${slug}`, found ? { name: found.name, commander: found.commanderName, median: found.analysis?.median } : { name: slug })
    }
  }

  return (
    <div className="deckPickerBackdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="deckPickerModal" onClick={e => e.stopPropagation()}>
        <div className="deckPickerHeader">
          <div>
            <span className="sectionEyebrow">{targetSlot !== null ? `${t('SLOT', 'SLOT')} ${targetSlot + 1}` : t('DECK SELECTOR', 'SÉLECTEUR DE DECKS')}</span>
            <h2>{multiSelect ? t('Choose decks to add', 'Choisir des decks à ajouter') : t('Select a deck', 'Sélectionner un deck')}</h2>
          </div>
          <button className="deckPickerClose" onClick={onClose} aria-label={t('Close', 'Fermer')}>✕</button>
        </div>

        <div className="deckPickerTabs">
          <button
            className={`deckPickerTab ${tab === 'mydecks' ? 'active' : ''}`}
            onClick={() => setTab('mydecks')}
          >
            {t('My Saved Decks', 'Mes Decks')} {userDecks.length > 0 ? `(${userDecks.length})` : ''}
          </button>
          <button
            className={`deckPickerTab ${tab === 'precons' ? 'active' : ''}`}
            onClick={() => setTab('precons')}
          >
            {t('Precon Library', 'Catalogue Précons')} ({precons.length})
          </button>
          <button
            className={`deckPickerTab ${tab === 'presets' ? 'active' : ''}`}
            onClick={() => setTab('presets')}
          >
            {t('Quick Presets', 'Presets Rapides')}
          </button>
        </div>

        {tab !== 'presets' && (
          <div className="deckPickerFilters">
            <input
              type="search"
              className="deckPickerSearch"
              placeholder={tab === 'mydecks' ? t('Search my decks…', 'Rechercher dans mes decks…') : t('Search by name, commander, set…', 'Rechercher par nom, commandant, extension…')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {tab === 'precons' && (
              <div className="deckPickerColorChips">
                {['ALL', 'W', 'U', 'B', 'R', 'G', 'C'].map(c => (
                  <button
                    key={c}
                    className={`deckPickerColorChip ${colorFilter === c ? 'active' : ''}`}
                    onClick={() => setColorFilter(c)}
                  >
                    {c === 'ALL' ? t('All', 'Tous') : c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="deckPickerBody">
          {loading && <div className="deckPickerLoading">{t('Loading catalog and decks…', 'Chargement du catalogue et des decks…')}</div>}

          {!loading && tab === 'mydecks' && (
            <div className="deckPickerList">
              {userDecks.length === 0 ? (
                <div className="deckPickerEmpty">
                  <p>{t('No saved decks found on your account. Sign in and analyze a deck list to save it.', 'Aucun deck sauvegardé sur votre compte. Connectez-vous et analysez un deck pour le sauvegarder.')}</p>
                </div>
              ) : filteredUserDecks.length === 0 ? (
                <div className="deckPickerEmpty"><p>{t('No deck matches your search.', 'Aucun deck ne correspond à votre recherche.')}</p></div>
              ) : (
                filteredUserDecks.map(deck => {
                  const ref = `saved:${deck.id}`
                  const cmdNames = extractDeckCommanderNames(deck)
                  const cmdDisplay = cmdNames.join(' + ') || deck.commander_name || ''
                  const meta = { name: deck.name, commander: cmdDisplay, median: deck.latest?.median ?? deck.latest?.result?.profile?.median }
                  const isSelected = selectedDecks.some(x => x.ref === ref)
                  return (
                    <div
                      key={deck.id}
                      className={`deckPickerItem ${isSelected ? 'selected' : ''}`}
                      onClick={() => multiSelect ? toggleMultiPick(ref, meta) : handleSinglePick(ref, meta)}
                    >
                      {multiSelect && <input type="checkbox" checked={isSelected} readOnly />}
                      <div className="deckPickerItemInfo">
                        <strong>{deck.name}</strong>
                        <small>{cmdDisplay || t('No commander specified', 'Aucun commandant spécifié')}</small>
                      </div>
                      {meta.median != null && <span className="deckPickerScore">{meta.median}</span>}
                      {!multiSelect && <button className="deckPickerChooseBtn">{t('Select', 'Choisir')}</button>}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {!loading && tab === 'precons' && (
            <div className="deckPickerList">
              {filteredPrecons.length === 0 ? (
                <div className="deckPickerEmpty"><p>{t('No preconstructed deck found.', 'Aucun préconstruit trouvé.')}</p></div>
              ) : (
                filteredPrecons.map(precon => {
                  const ref = `precon:${precon.slug}`
                  const meta = { name: precon.name, commander: precon.commanderName, median: precon.analysis?.median, setCode: precon.setCode }
                  const isSelected = selectedDecks.some(x => x.ref === ref)
                  return (
                    <div
                      key={precon.slug}
                      className={`deckPickerItem ${isSelected ? 'selected' : ''}`}
                      onClick={() => multiSelect ? toggleMultiPick(ref, meta) : handleSinglePick(ref, meta)}
                    >
                      {multiSelect && <input type="checkbox" checked={isSelected} readOnly />}
                      {precon.commanderImageUrl && (
                        <img src={precon.commanderImageUrl} alt={precon.commanderName} className="deckPickerThumb" loading="lazy" />
                      )}
                      <div className="deckPickerItemInfo">
                        <strong>{precon.name} <span className="deckPickerSetCode">{precon.setCode}</span></strong>
                        <small>{precon.commanderName}</small>
                      </div>
                      {precon.analysis?.median != null && (
                        <span className="deckPickerScore" title={t('Median power score', 'Score de puissance médiane')}>
                          {precon.analysis.median}
                        </span>
                      )}
                      {!multiSelect && <button className="deckPickerChooseBtn">{t('Select', 'Choisir')}</button>}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {!loading && tab === 'presets' && (
            <div className="deckPickerPresetsList">
              {POPULAR_PRECON_PRESETS.map(preset => (
                <div key={preset.id} className="deckPickerPresetCard" onClick={() => applyPreset(preset)}>
                  <div>
                    <strong>{lang() === 'fr' ? preset.labelFr : preset.labelEn}</strong>
                    <small>{preset.slugs.length} {t('official precons', 'préconstruits officiels')} ({preset.slugs.slice(0, 3).join(', ')}...)</small>
                  </div>
                  <button className="deckPickerChooseBtn">{t('Apply preset', 'Appliquer')}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {multiSelect && (
          <div className="deckPickerFooter">
            <span>{selectedDecks.length} {t('deck(s) selected', 'deck(s) sélectionné(s)')}</span>
            <div className="productActions">
              <button onClick={() => setSelectedDecks([])}>{t('Clear selection', 'Tout effacer')}</button>
              <button className="productPrimary" onClick={handleConfirmMulti} disabled={selectedDecks.length === 0}>
                {t(`Add ${selectedDecks.length} deck(s)`, `Ajouter ${selectedDecks.length} deck(s)`)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
