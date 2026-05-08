import { useAppStore } from './store/appStore'
import { useKanbanStore } from './store/kanbanStore'
import { useFocusStore } from './store/focusStore'
import { Sidebar } from './shell/Sidebar'
import { TopBar } from './shell/TopBar'
import { Placeholder } from './shell/Placeholder'
import { KanbanScreen } from './kanban/KanbanScreen'
import { CalendarScreen } from './calendar/CalendarScreen'
import { FocusScreen } from './focus/FocusScreen'
import { Dashboard } from './dashboard/Dashboard'
import type { Card } from './types/kanban'

export function App() {
  const { activeScreen, setActive } = useAppStore()
  const { selectCard } = useKanbanStore()
  const { setPendingCardId } = useFocusStore()

  function handleStartFocusFromCard(card: Card) {
    selectCard(null)
    setPendingCardId(card.id)
    setActive('focus')
  }

  function handleGoToCard(cardId: string) {
    selectCard(cardId)
    setActive('kanban')
  }

  function renderScreen() {
    switch (activeScreen) {
      case 'dashboard': return <Dashboard onGoToKanban={() => setActive('kanban')} onGoToCalendar={() => setActive('calendar')} />
      case 'calendar':  return <CalendarScreen />
      case 'kanban':    return <KanbanScreen onStartFocus={handleStartFocusFromCard} />
      case 'focus':     return <FocusScreen onGoToCard={handleGoToCard} />
      case 'finance':   return <Placeholder icon="finance" title="Financeiro" subtitle="Em desenvolvimento — Fase 2" />
    }
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="app__main">
        <TopBar activeScreen={activeScreen} />
        <main className="app__content">
          <div key={activeScreen} className="screen-enter">
            {renderScreen()}
          </div>
        </main>
      </div>
    </div>
  )
}
