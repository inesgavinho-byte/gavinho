// =====================================================
// APP NAVIGATOR
// Stack + Bottom Tab navigation
// =====================================================

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'

// Screens
import ChatScreen from '../screens/ChatScreen'
import TarefasScreen from '../screens/TarefasScreen'
import DiarioScreen from '../screens/DiarioScreen'
import GaleriaScreen from '../screens/GaleriaScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function MainTabs({ route }) {
  const { obra, user } = route.params || {}

  return (
    <Tab.Navigator
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Chat: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Tarefas: focused ? 'checkbox' : 'checkbox-outline',
            Diário: focused ? 'book' : 'book-outline',
            Galeria: focused ? 'images' : 'images-outline',
          }
          return <Ionicons name={icons[tabRoute.name]} size={22} color={color} />
        },
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} initialParams={{ obra, user }} />
      <Tab.Screen name="Tarefas" component={TarefasScreen} initialParams={{ obra, user }} />
      <Tab.Screen
        name="Diário"
        component={DiarioScreen}
        initialParams={{ obra, user }}
      />
      <Tab.Screen name="Galeria" component={GaleriaScreen} initialParams={{ obra, user }} />
    </Tab.Navigator>
  )
}

export default function AppNavigator({ obra, user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textWhite,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabs}
        initialParams={{ obra, user }}
        options={{
          headerTitle: obra ? `${obra.codigo} — ${obra.nome}` : 'Gavinho Obras',
        }}
      />
    </Stack.Navigator>
  )
}
