const FILE_PLACEHOLDER = '[file]'
const IMAGE_PLACEHOLDER = '[image]'

/** Converts Bitrix24 task descriptions (BBCode) to safe plain text for the MVP renderer. */
export function bitrix24BbcodeToText(value: string): string {
  let text = value.replace(/\r\n?/g, '\n')

  text = text.replace(/\[disk\s+file[^\]]*\]/gi, FILE_PLACEHOLDER)
  text = text.replace(/\[img[^\]]*\](.*?)\[\/img\]/gis, IMAGE_PLACEHOLDER)
  text = text.replace(/\[img[^\]]*\]/gi, IMAGE_PLACEHOLDER)
  text = text.replace(
    /\[url=([^\]]+)\](.*?)\[\/url\]/gis,
    (_match, href: string, label: string) => {
      const cleanHref = href.trim()
      const cleanLabel = label.trim()
      return !cleanLabel || cleanLabel === cleanHref ? cleanHref : `${cleanLabel} (${cleanHref})`
    }
  )
  text = text.replace(/\[url\](.*?)\[\/url\]/gis, (_match, href: string) => href.trim())
  text = text.replace(/\[user=[^\]]+\](.*?)\[\/user\]/gis, (_match, label: string) => label)
  text = text.replace(/\[br\s*\/?\]/gi, '\n')
  text = text.replace(/\[\*\]/g, '• ')
  text = text.replace(/\[\/?(?:list|quote|code|left|right|center|justify|table|tr|td|th)\]/gi, '\n')
  text = text.replace(/\[[a-z][^\]]*\]/gi, '')

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
