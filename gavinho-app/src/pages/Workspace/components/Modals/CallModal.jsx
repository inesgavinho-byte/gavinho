// =====================================================
// CALL MODAL
// Modal de chamadas de voz/vídeo
// =====================================================

import { Phone, Video, Mic, MicOff, EyeOff, Monitor } from 'lucide-react'

export default function CallModal({
  isOpen,
  activeCall,
  callType,
  isMuted,
  isVideoOff,
  isScreenSharing,
  canalAtivo,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall
}) {
  if (!isOpen || !activeCall) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      {/* Call Info */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'var(--accent-olive)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '36px',
          color: 'white'
        }}>
          {callType === 'video' ? <Video size={48} /> : <Phone size={48} />}
        </div>
        <h2 style={{ color: 'white', marginBottom: '8px' }}>
          {activeCall.participants?.[0]?.nome || canalAtivo?.codigo}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>
          {activeCall.status === 'connecting' ? 'A ligar...' : 'Em chamada'}
        </p>
      </div>

      {/* Call Controls */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isMuted ? 'var(--error)' : 'rgba(255,255,255,0.2)',
            border: 'none',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {/* Video Toggle (only for video calls) */}
        {callType === 'video' && (
          <button
            onClick={onToggleVideo}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: isVideoOff ? 'var(--error)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            {isVideoOff ? <EyeOff size={24} /> : <Video size={24} />}
          </button>
        )}

        {/* Screen Share Button */}
        <button
          onClick={onToggleScreenShare}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isScreenSharing ? 'var(--accent-olive)' : 'rgba(255,255,255,0.2)',
            border: 'none',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <Monitor size={24} />
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--error)',
            border: 'none',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
        </button>
      </div>
    </div>
  )
}
