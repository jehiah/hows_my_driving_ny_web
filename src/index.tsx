import * as React from 'react'
import ReactDOM from 'react-dom'

import { CookiesProvider } from "react-cookie"
import { createRoot } from 'react-dom/client';

import { BrowserRouter, Routes, Route} from 'react-router-dom'

import FetchViolations from 'view/FetchViolations'

import { library } from '@fortawesome/fontawesome-svg-core'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAngleDown,
  faAngleUp,
  faBus,
  faCamera,
  faCircle,
  faCopy,
  faParking,
  faTachometerAlt,
  faTimesCircle,
  faTrafficLight
} from '@fortawesome/free-solid-svg-icons'

// Add Font Awesome icons
library.add(
  faAngleDown as IconDefinition,
  faAngleUp as IconDefinition,
  faBus as IconDefinition,
  faCamera as IconDefinition,
  faCircle as IconDefinition,
  faCopy as IconDefinition,
  faParking as IconDefinition,
  faTachometerAlt as IconDefinition,
  faTimesCircle as IconDefinition,
  faTrafficLight as IconDefinition
)

const App = () => {
  return (
    <CookiesProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/:uniqueIdentifier' element={<FetchViolations />} />
          <Route path='/' element={<FetchViolations />} />
        </Routes>
      </BrowserRouter>
    </CookiesProvider>
  )
}

const container = document.getElementById('root');
createRoot(container!).render(
  <App />
)
