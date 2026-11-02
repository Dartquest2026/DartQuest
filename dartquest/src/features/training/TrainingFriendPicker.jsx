import { useId, useRef } from 'react'
export default function TrainingFriendPicker({ friends, value, disabled, onChange }) {
  const dialog = useRef(null), titleId = useId()
  const selected = friends.find(friend => friend.profileId === value)
  function choose(id) { onChange(id); dialog.current.close() }
  function openPicker() {
    dialog.current.showModal()
    const current = dialog.current.querySelector('[aria-pressed="true"]')
    current?.focus({ preventScroll: true })
    current?.scrollIntoView({ block: 'nearest' })
  }
  return <div className="training-friend-picker"><button className="training-friend-trigger" type="button" aria-label="FREUND EINBLENDEN" aria-haspopup="dialog" disabled={disabled} onClick={openPicker}><span>{selected?.name ?? 'Nur meine Statistik'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><dialog ref={dialog} className="training-friend-dialog" aria-labelledby={titleId}><header><span>STATISTIKVERGLEICH</span><h2 id={titleId}>Mit wem vergleichen?</h2><p>Wähle einen deiner bestätigten Freunde.</p></header><div className="training-friend-options"><button type="button" aria-pressed={!value} onClick={() => choose('')}><span>Nur meine Statistik</span><i aria-hidden="true">{!value ? '✓' : ''}</i></button>{friends.map(friend => <button type="button" key={friend.profileId} aria-pressed={friend.profileId === value} onClick={() => choose(friend.profileId)}><span>{friend.name}</span><i aria-hidden="true">{friend.profileId === value ? '✓' : ''}</i></button>)}{!friends.length && <p>Noch keine Freunde hinzugefügt. Du findest sie unter Community.</p>}</div><button className="training-friend-close" type="button" autoFocus onClick={() => dialog.current.close()}>SCHLIESSEN</button></dialog></div>
}
