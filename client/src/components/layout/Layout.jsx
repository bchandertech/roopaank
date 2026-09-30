import { Outlet } from 'react-router-dom'
import Header from './Header'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <>
      <TopBar />
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  )
}
