import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DevPlaceholder } from './components/DevPlaceholder'
import { AuthProvider } from './hooks/useAuth'
import { LanguageProvider } from './hooks/useLanguage'
import { ProtectedRoute } from './layouts/ProtectedRoute'
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { SmartSearch } from './pages/SmartSearch'
import { Results } from './pages/Results'
import { TrainDetails } from './pages/TrainDetails'
import { PassengerReview } from './pages/PassengerReview'
import { BookingSuccess } from './pages/BookingSuccess'
import { MyBookings } from './pages/MyBookings'
import { BookingDetails } from './pages/BookingDetails'
import { Agent } from './pages/Agent'
import { Status } from './pages/Status'

// Routes per spec/05-technical-spec.md §4. Only Login and Home have
// real implementations in this foundation task — every other screen
// is an explicit placeholder per this task's Strict Boundaries.
function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<SmartSearch />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/train/:trainNumber" element={<TrainDetails />} />
                  <Route path="/checkout/passengers" element={<PassengerReview />} />
                  <Route path="/booking/success/:bookingId" element={<BookingSuccess />} />
                  <Route path="/agent" element={<Agent />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/tatkal" element={<DevPlaceholder title="Tatkal Mode" />} />
                  <Route path="/tatkal/prepare" element={<DevPlaceholder title="Preparation" />} />
                  <Route path="/tatkal/countdown" element={<DevPlaceholder title="Countdown" />} />
                  <Route path="/tatkal/attempt" element={<DevPlaceholder title="Booking Attempt" />} />
                  <Route path="/bookings" element={<MyBookings />} />
                  <Route path="/bookings/:bookingId" element={<BookingDetails />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  )
}

export default App
