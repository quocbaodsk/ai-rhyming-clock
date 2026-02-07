'use client'

import { useCallback, useState } from 'react'
import StoryDisplay from './StoryDisplay'
import StoryForm from './StoryForm'

export interface StoryInputs {
  language: string
  age: number
  gender: string
  interests: string[]
  style: string
  lesson: string
}

export default function StoryGenerator() {
  const [storyText, setStoryText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showStory, setShowStory] = useState(false)
  const [error, setError] = useState('')

  const generateStory = useCallback(
    async (inputs: StoryInputs) => {
      setIsGenerating(true)
      setError('')
      setStoryText('')
      setShowStory(true)

      try {
        const response = await fetch('/api/story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to generate story')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setStoryText(accumulated)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        if (!storyText) setShowStory(false)
      } finally {
        setIsGenerating(false)
      }
    },
    [storyText]
  )

  const handleNewStory = useCallback(() => {
    setShowStory(false)
    setStoryText('')
    setError('')
  }, [])

  return (
    <div className='story-container'>
      <div className='story-header'>
        <h1 className='story-title'>Bedtime Stories</h1>
        <p className='story-subtitle'>AI-crafted tales for sweet dreams</p>
      </div>

      {showStory ? <StoryDisplay storyText={storyText} isGenerating={isGenerating} error={error} onNewStory={handleNewStory} /> : <StoryForm onSubmit={generateStory} />}
    </div>
  )
}
