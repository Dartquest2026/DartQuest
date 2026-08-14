import { getAvatarUrl } from '../../features/profile/avatarStorage'

function PlayerAvatar({ name, avatarPath, className = '', cacheKey = '' }) {
  const url = getAvatarUrl(avatarPath, cacheKey)
  return <div className={className}>{url ? <img src={url} alt={`Profilbild von ${name}`} /> : name?.slice(0, 1).toUpperCase()}</div>
}

export default PlayerAvatar
