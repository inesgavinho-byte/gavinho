// =====================================================
// CHAT SCREEN - Placeholder
// Will be migrated from ObraChat component
// =====================================================

import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../theme'

export default function ChatScreen({ route }) {
  const { obra, user } = route.params || {}

  return (
    <View style={styles.container}>
      <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
      <Text style={styles.title}>Chat da Obra</Text>
      <Text style={styles.subtitle}>
        {obra ? obra.codigo : 'Seleciona uma obra'}
      </Text>
      <Text style={styles.note}>Em desenvolvimento</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontStyle: 'italic',
  },
})
