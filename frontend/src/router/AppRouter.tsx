import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Home } from '../pages/Home';
import { Specialists } from '../pages/Specialists';
import { SpecialistDetail } from '../pages/SpecialistDetail';
import { Booking } from '../pages/Booking';
import { MyAppointments } from '../pages/MyAppointments';
import { Dashboard } from '../pages/Dashboard';
import { StaffLogin } from '../pages/StaffLogin';
import { ClientLogin } from '../pages/ClientLogin';
import { ClientRegister } from '../pages/ClientRegister';
import { NotFound } from '../pages/NotFound';

export const AppRouter = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        path: '',
        element: <Home />,
      },
      {
        path: 'specialists',
        element: <Specialists />,
      },
      {
        path: 'specialist/:id',
        element: <SpecialistDetail />,
      },
      {
        path: 'booking',
        element: <Booking />,
      },
      {
        path: 'myappointments',
        element: <MyAppointments />,
      },
      {
        path: 'staff/login',
        element: <StaffLogin />,
      },
      {
        path: 'login',
        element: <ClientLogin />,
      },
      {
        path: 'register',
        element: <ClientRegister />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);