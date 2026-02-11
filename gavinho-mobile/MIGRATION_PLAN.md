# Gavinho Obras - Plano de Migração para App Nativa

## Stack
- **Framework**: React Native (Expo SDK 53)
- **Navegação**: React Navigation 7 (Stack + Bottom Tabs)
- **Backend**: Supabase (mesmo projeto `vctcppuvqjstscbzdykn`)
- **Auth tokens**: expo-secure-store (encrypted native storage)
- **Build & Deploy**: Expo EAS Build → Google Play + App Store
- **Notificações**: expo-notifications (FCM para Android, APNs para iOS)

## Fases de Migração

### Fase 1 - Fundação (Semana 1) ✅ Em progresso
- [x] Criar projeto Expo com blank template
- [x] Instalar dependências (Supabase, Navigation, expo-*)
- [x] Configurar app.json (bundleId, permissões, plugins)
- [x] Supabase client com SecureStore adapter
- [x] Design system (colors, spacing, shadows)
- [x] Login screen (dual: trabalhador + gestão)
- [x] Obra selection screen
- [x] Navegação: Stack + Bottom Tabs
- [x] Placeholder screens (Chat, Tarefas, Diário, Galeria)
- [ ] Criar conta EAS Build
- [ ] Gerar primeiro build de teste (Expo Go ou dev-client)

### Fase 2 - Chat (Semana 2)
- [ ] ChatScreen: mensagens em tempo real (Supabase Realtime)
- [ ] Envio de texto, fotos (expo-image-picker), localização
- [ ] @GARVIS mention → trigger Edge Function
- [ ] Pull-to-refresh, scroll infinito
- [ ] Push notifications para novas mensagens

### Fase 3 - Tarefas (Semana 2-3)
- [ ] Lista de tarefas com filtros (todas, minhas, pendentes, urgentes)
- [ ] Criação de tarefas (admin/gestão/encarregado)
- [ ] Quick status update (swipe actions nativas)
- [ ] Due-soon alerts com local notifications
- [ ] Task detail modal com status buttons

### Fase 4 - Galeria (Semana 3)
- [ ] Grid nativo de fotos (FlatList com Image)
- [ ] Upload múltiplo com expo-image-picker
- [ ] Câmara nativa (expo-camera)
- [ ] Lightbox com pinch-to-zoom (react-native-reanimated)
- [ ] Auto-metadata (GPS, data, user) no upload
- [ ] Compressão de imagem nativa antes do upload

### Fase 5 - Diário de Obra (Semana 3-4)
- [ ] Criar/editar entradas do diário
- [ ] Anexar fotos e condições meteorológicas
- [ ] Assinatura digital (react-native-signature-capture)
- [ ] Geração de PDF (react-native-pdf-lib)

### Fase 6 - Presenças & Materiais (Semana 4)
- [ ] Check-in/check-out com GPS nativo (expo-location)
- [ ] Geofencing para validação automática
- [ ] Pedido de materiais com formulário
- [ ] Histórico de requisições

### Fase 7 - Polimento & Store (Semana 5)
- [ ] Splash screen animado
- [ ] App icon final (design do G)
- [ ] Offline mode robusto (expo-sqlite para cache)
- [ ] Deep linking (gavinho-obras://)
- [ ] Analytics (expo-analytics ou Sentry)
- [ ] Testes em dispositivos reais (iOS + Android)
- [ ] Screenshots para as stores
- [ ] Submissão Google Play (review ~2-3 dias)
- [ ] Submissão App Store (review ~1-2 semanas)

## Estrutura do Projeto

```
gavinho-mobile/
├── App.js                      # Entry point
├── app.json                    # Expo config (bundleId, permissions)
├── src/
│   ├── screens/                # Full-screen components
│   │   ├── LoginScreen.js      # Phone+PIN / Email+Password
│   │   ├── ObraSelectScreen.js # Multi-obra selection
│   │   ├── ChatScreen.js       # Real-time chat
│   │   ├── TarefasScreen.js    # Task management
│   │   ├── DiarioScreen.js     # Diary entries
│   │   └── GaleriaScreen.js    # Photo gallery
│   ├── components/             # Reusable UI components
│   ├── navigation/             # React Navigation config
│   │   └── AppNavigator.js     # Stack + Bottom Tabs
│   ├── lib/                    # External service clients
│   │   └── supabase.js         # Supabase + SecureStore
│   ├── hooks/                  # Custom hooks (shared logic)
│   ├── utils/                  # Formatters, helpers
│   │   ├── storage.js          # SecureStore wrapper
│   │   └── format.js           # Date, time formatters
│   └── theme/                  # Design system
│       └── index.js            # Colors, spacing, shadows
├── assets/                     # Icons, splash, fonts
└── eas.json                    # EAS Build config
```

## O Que Reutilizamos do Web

| Componente | Reutilização | Notas |
|-----------|-------------|-------|
| Supabase queries | ~90% | Mesmas tabelas, mesmas queries |
| Lógica de auth | ~85% | Mesmo flow, diferente storage |
| Formatadores | 100% | formatDate, formatDateTime, etc |
| Notifications util | ~70% | createNotification() reutilizável |
| Realtime subscriptions | ~90% | Mesmo padrão Supabase channels |
| UI/Styles | 0% | Reescrito com componentes nativos |
| Navigation | 0% | React Navigation vs React Router |

## Requisitos para Publicação

### Google Play Store
- Conta de developer ($25 one-time)
- App icon 512x512 PNG
- Feature graphic 1024x500
- Pelo menos 2 screenshots
- Privacy policy URL
- Target API level 34+

### Apple App Store
- Conta Apple Developer ($99/ano)
- App icon 1024x1024 PNG
- Screenshots para iPhone (6.7", 6.5", 5.5")
- Privacy policy URL
- App Review (1-2 semanas primeira vez)

## EAS Build Setup

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar builds
eas build:configure

# Build Android (APK para testes)
eas build --platform android --profile preview

# Build iOS (requer Apple Developer account)
eas build --platform ios --profile preview

# Submit to stores
eas submit --platform android
eas submit --platform ios
```
