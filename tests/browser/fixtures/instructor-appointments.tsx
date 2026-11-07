import { createRoot } from 'react-dom/client';
import InstructorAppointments from '../../../components/instructor-appointments';
const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root missing');
createRoot(root).render(<InstructorAppointments />);
