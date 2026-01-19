import {
  ClassifyExercise,
  CycleExercise,
  MatchExercise,
  SequenceExercise,
  FillBlankExercise,
  QuizExercise
} from './exercises'

export default function ExerciseRenderer({ exercise, onComplete }) {
  const props = {
    exercise,
    onComplete,
    showFeedback: true
  }

  switch (exercise.type) {
    case 'classify':
      return <ClassifyExercise {...props} />
    case 'cycle':
      return <CycleExercise {...props} />
    case 'match':
      return <MatchExercise {...props} />
    case 'sequence':
      return <SequenceExercise {...props} />
    case 'fill-blank':
      return <FillBlankExercise {...props} />
    case 'quiz':
      return <QuizExercise {...props} />
    default:
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">
            <span className="text-pt">Tipo de exercício não suportado: {exercise.type}</span>
            <span className="text-en ml-2">(Unsupported exercise type)</span>
          </p>
        </div>
      )
  }
}
