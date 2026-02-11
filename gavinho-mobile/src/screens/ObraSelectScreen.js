// =====================================================
// OBRA SELECT SCREEN
// Shown when user has multiple obras to choose from
// =====================================================

import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, borderRadius, shadows } from '../theme'

export default function ObraSelectScreen({ obras, user, onSelect }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="construct" size={32} color={colors.primary} />
        </View>
        <Text style={styles.greeting}>Olá, {user?.nome}!</Text>
        <Text style={styles.subtitle}>Seleciona a obra onde vais trabalhar</Text>
      </View>

      <FlatList
        data={obras}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="construct-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardCode}>{item.codigo}</Text>
              <Text style={styles.cardName}>{item.nome}</Text>
              {item.status && (
                <View style={[
                  styles.statusBadge,
                  item.status === 'em_curso' && styles.statusActive,
                  item.status === 'concluída' && styles.statusDone,
                  item.status === 'pausada' && styles.statusPaused,
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'em_curso' && styles.statusTextActive,
                    item.status === 'concluída' && styles.statusTextDone,
                    item.status === 'pausada' && styles.statusTextPaused,
                  ]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    backgroundColor: colors.borderLight,
  },
  statusActive: { backgroundColor: '#dcfce7' },
  statusDone: { backgroundColor: '#dbeafe' },
  statusPaused: { backgroundColor: '#fef3c7' },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusTextActive: { color: '#16a34a' },
  statusTextDone: { color: '#2563eb' },
  statusTextPaused: { color: '#d97706' },
})
