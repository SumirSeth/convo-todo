import { marked } from 'marked'

export const useUseMarkdown = () => {
  const renderMarkdown = (markdown: string) => {
    try {
      return marked.parse(markdown)
    } catch (error) {
      console.error('Error rendering markdown:', error)
      return markdown
    } 
  }

  return { renderMarkdown }
}
