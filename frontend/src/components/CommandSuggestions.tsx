import { useEffect, useState } from 'react'

interface CommandSuggestionsProps {
  input: string
  onSelect: (command: string) => void
  visible: boolean
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

export default function CommandSuggestions({ input, onSelect, visible }: CommandSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Tab' && suggestions.length > 0) {
        e.preventDefault()
        onSelect(suggestions[selectedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, suggestions, selectedIndex, onSelect])

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
