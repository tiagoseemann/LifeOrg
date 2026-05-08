import { useAppStore } from './store/appStore'
import { Sidebar } from './shell/Sidebar'
import { TopBar } from './shell/TopBar'
import { Placeholder } from './shell/Placeholder'

export function App() {
  const { activeScreen } = useAppStore()

  function renderScreen() {
    switch (activeScreen) {
      case 'dashboard': return <Placeholder icon="dashboard" title="Dashboard" subtitle="Em breve" />
      case 'calendar':  return <Placeholder icon="calendar"  title="Calendário" subtitle="Em breve" />
      case 'kanban':    return <Placeholder icon="kanban"    title="Kanban" subtitle="Em breve" />
      case 'focus':     return <Placeholder icon="focus"     title="Foco" subtitle="Em breve" />
      case 'finance':   return <Placeholder icon="finance"   title="Financeiro" subtitle="Em desenvolvimento — Fase 2" />
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
