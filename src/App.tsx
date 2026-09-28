import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DetailView } from './views/DetailView'
import { ListView } from './views/ListView'
import { NotFound } from './views/NotFound'
import { RoomsView } from './views/RoomsView'
import { TimelineView } from './views/TimelineView'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ListView />} />
        <Route path="rooms" element={<RoomsView />} />
        <Route path="timeline" element={<TimelineView />} />
        <Route path="artwork/:id" element={<DetailView />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
