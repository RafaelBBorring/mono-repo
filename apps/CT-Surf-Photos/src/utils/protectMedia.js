export function applyMediaProtection() {
  const prevent = (e) => e.preventDefault()
  document.addEventListener('contextmenu', prevent)
  const images = document.getElementsByTagName('img')
  const handleDrag = (e) => e.preventDefault()
  Array.from(images).forEach(img => img.addEventListener('dragstart', handleDrag))

  return () => {
    document.removeEventListener('contextmenu', prevent)
    Array.from(images).forEach(img => img.removeEventListener('dragstart', handleDrag))
  }
}
