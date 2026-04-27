export const SERVER_BOUNDS = [
  [1984037,  'Mari'],
  [2631701,  'Ruairi'],
  [4452813,  'Tarlach'],
  [5771331,  'Nao'],
  [8565157,  'Alexina'],
  [Infinity, 'Erinn'],
]

export function getServer(hexId) {
  const num = parseInt(hexId, 16)
  if (isNaN(num)) return 'Unknown'
  for (const [bound, name] of SERVER_BOUNDS) {
    if (num <= bound) return name
  }
  return 'Erinn'
}

export function getRaceBase(raceString) {
  if (!raceString) return 'Unknown'
  return raceString.split(' ')[0]
}
