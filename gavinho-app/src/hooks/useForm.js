// =====================================================
// useForm - Custom hook para gestão de formulários
// =====================================================

import { useState, useCallback } from 'react'

/**
 * Hook para gestão de formulários com validação
 *
 * @param {Object} initialValues - Valores iniciais do formulário
 * @param {Object} options - Opções adicionais
 * @param {Function} options.validate - Função de validação
 * @param {Function} options.onSubmit - Callback de submit
 *
 * @returns {object} - Form state e handlers
 *
 * @example
 * const form = useForm({
 *   nome: '',
 *   email: ''
 * }, {
 *   validate: (values) => {
 *     const errors = {}
 *     if (!values.nome) errors.nome = 'Nome é obrigatório'
 *     return errors
 *   },
 *   onSubmit: async (values) => {
 *     await saveData(values)
 *   }
 * })
 *
 * <input
 *   value={form.values.nome}
 *   onChange={(e) => form.handleChange('nome', e.target.value)}
 * />
 * {form.errors.nome && <span>{form.errors.nome}</span>}
 *
 * <button onClick={form.handleSubmit} disabled={form.isSubmitting}>
 *   Guardar
 * </button>
 */
export function useForm(initialValues, options = {}) {
  const { validate, onSubmit } = options

  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Atualizar um campo
  const handleChange = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)

    // Limpar erro do campo ao editar
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }, [errors])

  // Atualizar múltiplos campos
  const setFieldValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }))
    setIsDirty(true)
  }, [])

  // Marcar campo como touched
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }))

    // Validar campo individual se validate existir
    if (validate) {
      const fieldErrors = validate(values)
      if (fieldErrors[field]) {
        setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }))
      }
    }
  }, [validate, values])

  // Validar todos os campos
  const validateForm = useCallback(() => {
    if (!validate) return true

    const validationErrors = validate(values)
    setErrors(validationErrors)

    return Object.keys(validationErrors).length === 0
  }, [validate, values])

  // Submit do formulário
  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) {
      e.preventDefault()
    }

    // Marcar todos como touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {})
    setTouched(allTouched)

    // Validar
    if (validate) {
      const validationErrors = validate(values)
      setErrors(validationErrors)

      if (Object.keys(validationErrors).length > 0) {
        return false
      }
    }

    // Submeter
    if (onSubmit) {
      setIsSubmitting(true)
      try {
        await onSubmit(values)
        setIsDirty(false)
        return true
      } catch (err) {
        console.error('Form submit error:', err)
        return false
      } finally {
        setIsSubmitting(false)
      }
    }

    return true
  }, [values, validate, onSubmit])

  // Reset ao estado inicial
  const reset = useCallback((newInitialValues) => {
    setValues(newInitialValues ?? initialValues)
    setErrors({})
    setTouched({})
    setIsDirty(false)
    setIsSubmitting(false)
  }, [initialValues])

  // Definir erro manualmente
  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  return {
    // Estado
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid: Object.keys(errors).length === 0,

    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    reset,

    // Setters
    setValues,
    setFieldValues,
    setFieldError,
    setErrors,

    // Validação
    validateForm,

    // Helper para campo (pode ser usado com spread)
    getFieldProps: (field) => ({
      value: values[field] ?? '',
      onChange: (e) => handleChange(field, e.target?.value ?? e),
      onBlur: () => handleBlur(field)
    })
  }
}

export default useForm
