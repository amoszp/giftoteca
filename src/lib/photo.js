// Read an image file and shrink it to at most `max` px on its long side, as a JPEG data URL.
export function readPhoto(file, max = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la foto.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Este archivo no es una imagen.'))
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * k)
        canvas.height = Math.round(img.height * k)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
