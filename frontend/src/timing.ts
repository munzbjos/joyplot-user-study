export const afterVisiblePaint = (callback: (time: number) => void): (() => void) => {
  let first = 0
  let second = 0
  first = requestAnimationFrame(() => {
    second = requestAnimationFrame(() => callback(performance.now()))
  })
  return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
}

export async function preloadAndDecode(urls: string[]): Promise<void> {
  await Promise.all(urls.map(url => new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = async () => {
      try { if (typeof image.decode === 'function') await image.decode(); resolve() }
      catch (error) { reject(error) }
    }
    image.onerror = () => reject(new Error(`Could not load stimulus: ${url}`))
    image.src = url
  })))
}
