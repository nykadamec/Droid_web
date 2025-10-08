interface StatusBarProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export default function StatusBar({ status }: StatusBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500 animate-pulse'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Připojeno'
      case 'connecting':
        return 'Připojování...'
      case 'error':
        return 'Chyba připojení'
      default:
        return 'Odpojeno'
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-slate-300">{getStatusText()}</span>
      </div>
      <div className="text-xs text-slate-500">
        Factory Droid Web CLI
      </div>
    </div>
  )
}
