const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

export function formatPostTime(value, now = new Date()) {
  if (!value) return ''
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)

  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (minutes >= 0 && minutes < 60) return `${Math.max(1, minutes)}분 전`

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const writtenDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if ((today.getTime() - writtenDay.getTime()) / 86400000 === 1) return '어제'

  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}.${weekdays[date.getDay()]} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
