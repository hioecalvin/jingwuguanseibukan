import { createRoot } from 'react-dom/client';
import AdvancePaymentForm from '../../../components/advance-payment-form';
import AdvancePaymentReviews from '../../../components/admin/advance-payment-reviews';
import ChargeFeeAdjustment from '../../../components/admin/charge-fee-adjustment';
const mode=new URLSearchParams(location.search).get('mode');
createRoot(document.getElementById('fixture-root')!).render(<main className="mx-auto max-w-3xl p-3">
  <h1>Multi-month payment fixture</h1>
  {mode==='waiver'?<ChargeFeeAdjustment charge={{id:'charge-1',amount:300000,currency:'IDR',billing_month:'2026-07-01'}} onComplete={async()=>{}}/>:
    mode==='review'?<AdvancePaymentReviews dojoId="dojo-1" onComplete={async()=>{}}/>:
    <AdvancePaymentForm mode={mode==='admin'?'admin':'member'} memberships={[{id:'membership-1',label:'0101 Fixture Member — Aikido',unpaidMonths:['2026-09-01','2026-07-01']}]} onComplete={async()=>{}}/>}
</main>);
