'use client'

interface StoryDisplayProps {
  storyText: string
  isGenerating: boolean
  error: string
  onNewStory: () => void
}

export default function StoryDisplay({ storyText, isGenerating, error, onNewStory }: StoryDisplayProps) {
  // Split title from body: first line is the title
  const lines = storyText.split('\n')
  const title =
    lines[0]
      ?.replace(/^#+\s*/, '')
      .replace(/^\*+/, '')
      .replace(/\*+$/, '')
      .trim() || ''
  const body = lines.slice(1).join('\n').trim()

  return (
    <div className='story-display'>
      {error && (
        <div className='story-error'>
          <p>{error}</p>
          <button className='story-btn-secondary' onClick={onNewStory}>
            Try Again
          </button>
        </div>
      )}

      {!error && !storyText && isGenerating && (
        <div className='story-loading'>
          <div className='story-loading-glow' />
          <p className='story-loading-text'>Crafting your story…</p>
          <p className='story-loading-hint'>This usually takes a few seconds</p>
        </div>
      )}

      {storyText && (
        <div className='story-book'>
          {title && <h2 className='story-book-title'>{title}</h2>}
          <div className='story-book-body'>
            {body.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
            {isGenerating && <span className='story-cursor'>▌</span>}
          </div>
          {!isGenerating && (
            <div className='story-actions'>
              <button className='story-btn-primary' onClick={onNewStory}>
                New Story
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
