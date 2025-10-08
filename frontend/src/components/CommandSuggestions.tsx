import { useEffect, useState } from 'react'

interface CommandSuggestionsProps {
  input: string
  onSelect: (command: string) => void
  visible: boolean
  onNavigate?: (direction: 'up' | 'down') => void
}

// Seznam dostupných příkazů
const AVAILABLE_COMMANDS = [
  'droid',
  'ls',
  'cd',
  'pwd',
  'cat',
  'echo',
  'mkdir',
  'rm',
  'cp',
  'mv',
  'touch',
  'grep',
  'find',
  'which',
  'whoami',
  'clear',
  'exit',
  'help',
  'history',
  'ps',
  'top',
  'htop',
  'vim',
  'nano',
  'git',
  'npm',
  'node',
  'python',
  'python3',
  'curl',
  'wget',
  'tar',
  'zip',
  'unzip',
  'chmod',
  'chown',
  'df',
  'du',
  'free',
  'kill',
  'ping',
  'ssh',
  'scp',
  'rsync'
].sort()

export default function CommandSuggestions({ input, onSelect, visible, onNavigate }: CommandSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Export aktuálně vybraný příkaz pro parent
  useEffect(() => {
    if (suggestions.length > 0 && visible) {
      // Parent může získat vybraný příkaz
    }
  }, [selectedIndex, suggestions, visible])

  useEffect(() => {
    if (!input || !visible) {
      setSuggestions([])
      setSelectedIndex(0)
      return
    }

    // Filtrovat příkazy které začínají inputem
    const filtered = AVAILABLE_COMMANDS.filter(cmd => 
      cmd.toLowerCase().startsWith(input.toLowerCase())
    )

    setSuggestions(filtered)
    setSelectedIndex(0)
  }, [input, visible])

  // Veřejná metoda pro získání aktuálně vybraného příkazu
  const getSelectedCommand = () => {
    if (suggestions.length > 0) {
      return suggestions[selectedIndex]
    }
    return null
  }

  // Export metody přes useEffect a callback
  useEffect(() => {
    // Přidat metodu na window pro přístup z Terminalu
    if (visible && suggestions.length > 0) {
      (window as any).__commandSuggestionSelected = getSelectedCommand()
    } else {
      (window as any).__commandSuggestionSelected = null
    }
  }, [selectedIndex, suggestions, visible])

  const handleNavigate = (direction: 'up' | 'down') => {
    if (direction === 'down') {
      setSelectedIndex(prev => (prev + 1) % suggestions.length)
    } else {
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
    }
    onNavigate?.(direction)
  }

  // Expose navigation via window for Terminal component
  useEffect(() => {
    if (visible && suggestions.length > 0) {
      (window as any).__commandSuggestionNavigate = handleNavigate;
      (window as any).__commandSuggestionComplete = () => onSelect(suggestions[selectedIndex])
    } else {
      (window as any).__commandSuggestionNavigate = null;
      (window as any).__commandSuggestionComplete = null
    }
  }, [visible, suggestions, selectedIndex, onSelect, handleNavigate])

  if (!visible || suggestions.length === 0) {
    return null
  }

  return (
    <div className="absolute left-4 bottom-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
      <div className="py-1">
        {suggestions.map((cmd, index) => (
          <div
            key={cmd}
            className={`px-4 py-2 cursor-pointer transition-colors ${
              index === selectedIndex
                ? 'bg-cyan-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
            onClick={() => onSelect(cmd)}
          >
            <span className="font-mono text-sm">{cmd}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-1 text-xs text-slate-500 border-t border-slate-700">
        <kbd className="px-1 py-0.5 bg-slate-900 rounded">Tab</kbd> pro dokončení, 
        <kbd className="px-1 py-0.5 bg-slate-900 rounded ml-1">↑↓</kbd> navigace
      </div>
    </div>
  )
}
