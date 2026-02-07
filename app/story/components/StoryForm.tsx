'use client'

import { useState } from 'react'
import type { StoryInputs } from './StoryGenerator'

const LANGUAGE_OPTIONS = [
  { value: 'vi', label: '🇻🇳 Tiếng Việt' },
  { value: 'en', label: '🇬🇧 English' },
]

const INTEREST_OPTIONS = ['Dinosaurs', 'Space', 'Animals', 'Princesses', 'Robots', 'Nature', 'Sports', 'Music', 'Pirates', 'Magic', 'Superheroes', 'Ocean', 'Fairies', 'Cars', 'Cooking']

const STYLE_OPTIONS = [
  { value: 'funny', label: 'Funny', emoji: '😄', desc: 'Silly and laugh-out-loud' },
  { value: 'adventurous', label: 'Adventurous', emoji: '🗺️', desc: 'Exciting quests and journeys' },
  { value: 'gentle', label: 'Gentle', emoji: '🌙', desc: 'Calm and soothing' },
  { value: 'magical', label: 'Magical', emoji: '✨', desc: 'Enchanting and wondrous' },
  { value: 'mysterious', label: 'Mysterious', emoji: '🔮', desc: 'Curious and intriguing' },
]

const GENDER_OPTIONS = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Any' },
]

const LESSON_SUGGESTIONS = ['Sharing with others', 'Being brave', 'Kindness matters', 'Honesty is important', 'Believing in yourself', 'Teamwork', 'Patience pays off', 'Being a good friend', 'Trying new things']

interface StoryFormProps {
  onSubmit: (inputs: StoryInputs) => void
}

export default function StoryForm({ onSubmit }: StoryFormProps) {
  const [language, setLanguage] = useState('en')
  const [age, setAge] = useState(5)
  const [gender, setGender] = useState('prefer-not-to-say')
  const [interests, setInterests] = useState<string[]>([])
  const [customInterest, setCustomInterest] = useState('')
  const [style, setStyle] = useState('')
  const [lesson, setLesson] = useState('')

  const toggleInterest = (interest: string) => {
    setInterests(prev => (prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]))
  }

  const addCustomInterest = () => {
    const trimmed = customInterest.trim()
    if (trimmed && !interests.includes(trimmed)) {
      setInterests(prev => [...prev, trimmed])
      setCustomInterest('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomInterest()
    }
  }

  const isValid = age > 0 && interests.length > 0 && style && lesson.trim()

  const handleSubmit = () => {
    if (isValid) {
      onSubmit({ language, age, gender, interests, style, lesson: lesson.trim() })
    }
  }

  return (
    <div className='story-form'>
      {/* Language */}
      <div className='story-field'>
        <label className='story-label'>Story language</label>
        <div className='story-pills'>
          {LANGUAGE_OPTIONS.map(opt => (
            <button key={opt.value} className={`story-pill${language === opt.value ? ' story-pill-active' : ''}`} onClick={() => setLanguage(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div className='story-field'>
        <label className='story-label'>How old is the child?</label>
        <div className='story-age-control'>
          <button className='story-age-btn' onClick={() => setAge(a => Math.max(1, a - 1))} aria-label='Decrease age'>
            −
          </button>
          <span className='story-age-value'>{age}</span>
          <button className='story-age-btn' onClick={() => setAge(a => Math.min(12, a + 1))} aria-label='Increase age'>
            +
          </button>
          <span className='story-age-unit'>years old</span>
        </div>
      </div>

      {/* Gender */}
      <div className='story-field'>
        <label className='story-label'>Main character</label>
        <div className='story-pills'>
          {GENDER_OPTIONS.map(opt => (
            <button key={opt.value} className={`story-pill${gender === opt.value ? ' story-pill-active' : ''}`} onClick={() => setGender(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className='story-field'>
        <label className='story-label'>What are they interested in?</label>
        <p className='story-hint'>Select one or more, or add your own</p>
        <div className='story-chips'>
          {INTEREST_OPTIONS.map(interest => (
            <button key={interest} className={`story-chip${interests.includes(interest) ? ' story-chip-active' : ''}`} onClick={() => toggleInterest(interest)}>
              {interest}
            </button>
          ))}
        </div>
        <div className='story-custom-input'>
          <input type='text' className='story-input' placeholder='Add a custom interest…' value={customInterest} onChange={e => setCustomInterest(e.target.value)} onKeyDown={handleKeyDown} maxLength={40} />
          <button className='story-input-add' onClick={addCustomInterest} disabled={!customInterest.trim()}>
            Add
          </button>
        </div>
        {interests.filter(i => !INTEREST_OPTIONS.includes(i)).length > 0 && (
          <div className='story-chips story-chips-custom'>
            {interests
              .filter(i => !INTEREST_OPTIONS.includes(i))
              .map(interest => (
                <button key={interest} className='story-chip story-chip-active' onClick={() => toggleInterest(interest)}>
                  {interest} ×
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Style */}
      <div className='story-field'>
        <label className='story-label'>What kind of story?</label>
        <div className='story-style-grid'>
          {STYLE_OPTIONS.map(opt => (
            <button key={opt.value} className={`story-style-card${style === opt.value ? ' story-style-active' : ''}`} onClick={() => setStyle(opt.value)}>
              <span className='story-style-emoji'>{opt.emoji}</span>
              <span className='story-style-name'>{opt.label}</span>
              <span className='story-style-desc'>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lesson */}
      <div className='story-field'>
        <label className='story-label'>What lesson should the story teach?</label>
        <input type='text' className='story-input story-input-full' placeholder='e.g., Being kind to others' value={lesson} onChange={e => setLesson(e.target.value)} maxLength={100} />
        <div className='story-suggestions'>
          {LESSON_SUGGESTIONS.map(s => (
            <button key={s} className={`story-suggestion${lesson === s ? ' story-suggestion-active' : ''}`} onClick={() => setLesson(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button className='story-generate-btn' onClick={handleSubmit} disabled={!isValid}>
        Create Bedtime Story
      </button>
    </div>
  )
}
