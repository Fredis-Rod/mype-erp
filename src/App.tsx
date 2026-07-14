import { AuthProvider } from './auth/AuthProvider'
import { BusinessProvider } from './app/BusinessProvider'
import Root from './app/Root'

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Root />
      </BusinessProvider>
    </AuthProvider>
  )
}
