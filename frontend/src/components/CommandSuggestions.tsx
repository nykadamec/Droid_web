import { useEffect, useState } from 'react'

interface CommandSuggestionsProps {
  input: string
  onSelect: (command: string) => void
  visible: boolean
  selectedIndex: number
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

export default function CommandSuggestions({ input, onSelect, visible, selectedIndex }: CommandSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!input || !visible) {
      setSuggestions([])
      return
    }

    // Filtrovat příkazy které začínají inputem
    const filtered = AVAILABLE_COMMANDS.filter(cmd => 
      cmd.toLowerCase().startsWith(input.toLowerCase())
    )

    setSuggestions(filtered)
  }, [input, visible])

  // Export suggestions list přes window pro Terminal
  useEffect(() => {
    if (visible && suggestions.length > 0) {
      (window as any).__commandSuggestions = suggestions
    } else {
      (window as any).__commandSuggestions = []
    }
  }, [suggestions, visible])

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
