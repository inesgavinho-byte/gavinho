import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'valentina-progress'

const defaultProgress = {
  chapters: {},
  currentChapter: null,
  currentSection: null,
  currentExercise: 0,
  completedExercises: []
}

export function useProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...defaultProgress, ...JSON.parse(stored) } : defaultProgress
    } catch {
      return defaultProgress
    }
  })

  // Save to localStorage whenever progress changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }, [progress])

  // Mark an exercise as completed
  const markExerciseComplete = useCallback((chapterId, sectionId, exerciseIndex) => {
    setProgress(prev => {
      const exerciseKey = `${chapterId}-${sectionId}-${exerciseIndex}`
      if (prev.completedExercises.includes(exerciseKey)) {
        return prev
      }
      return {
        ...prev,
        completedExercises: [...prev.completedExercises, exerciseKey]
      }
    })
  }, [])

  // Check if an exercise is completed
  const isExerciseComplete = useCallback((chapterId, sectionId, exerciseIndex) => {
    const exerciseKey = `${chapterId}-${sectionId}-${exerciseIndex}`
    return progress.completedExercises.includes(exerciseKey)
  }, [progress.completedExercises])

  // Get progress for a chapter (percentage)
  const getChapterProgress = useCallback((chapterId, totalExercises) => {
    const completed = progress.completedExercises.filter(key =>
      key.startsWith(`${chapterId}-`)
    ).length
    return totalExercises > 0 ? Math.round((completed / totalExercises) * 100) : 0
  }, [progress.completedExercises])

  // Get completed count for a chapter
  const getCompletedCount = useCallback((chapterId) => {
    return progress.completedExercises.filter(key =>
      key.startsWith(`${chapterId}-`)
    ).length
  }, [progress.completedExercises])

  // Set current position
  const setCurrentPosition = useCallback((chapterId, sectionId, exerciseIndex) => {
    setProgress(prev => ({
      ...prev,
      currentChapter: chapterId,
      currentSection: sectionId,
      currentExercise: exerciseIndex
    }))
  }, [])

  // Reset progress for a chapter
  const resetChapterProgress = useCallback((chapterId) => {
    setProgress(prev => ({
      ...prev,
      completedExercises: prev.completedExercises.filter(key =>
        !key.startsWith(`${chapterId}-`)
      )
    }))
  }, [])

  // Reset all progress
  const resetAllProgress = useCallback(() => {
    setProgress(defaultProgress)
  }, [])

  return {
    progress,
    markExerciseComplete,
    isExerciseComplete,
    getChapterProgress,
    getCompletedCount,
    setCurrentPosition,
    resetChapterProgress,
    resetAllProgress
  }
}
