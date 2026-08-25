import { useState } from 'react'
import DeckPickerModal from './DeckPickerModal.jsx'

const lang = () => (typeof localStorage !== 'undefined' && localStorage.getItem('aeon-lang') === 'fr' ? 'fr' : 'en')
const t = (en, fr) => (lang() === 'fr' ? fr : en)

export default function DeckSlotPicker({
  value,
  onChange,
  slotIndex = 0,
  placeholder = ''
}) {
  const [modalOpen, setModalOpen] = useState(false)

  function handleSelect(ref) {
    onChange(ref)
  }

  return (
    <div className="deckSlotPicker">
      <div className="deckSlotInputWrapper">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || `${t('Deck', 'Deck')} ${slotIndex + 1} · https://…/a/…`}
          className="deckSlotInput"
        />
        {value && (
          <button
            type="button"
            className="deckSlotClearBtn"
            onClick={() => onChange('')}
            title={t('Clear', 'Effacer')}
            aria-label={t('Clear', 'Effacer')}
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="button"
        className="deckSlotChooseBtn"
        onClick={() => setModalOpen(true)}
        title={t('Choose from library, saved decks, or presets', 'Choisir depuis la bibliothèque, mes decks ou les presets')}
      >
        <span aria-hidden="true">⚡</span> {t('Choose', 'Choisir')}
      </button>

      <DeckPickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelect}
        multiSelect={false}
        targetSlot={slotIndex}
      />
    </div>
  )
}
