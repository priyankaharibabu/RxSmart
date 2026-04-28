// In-memory queue (in production: Redis or Supabase)
const queue = [];
let currentServing = 0;

export async function runQueueAgent(bill) {
  console.log('[Queue Agent] Adding to queue:', bill.tokenNumber);

  const queueEntry = {
    tokenNumber: bill.tokenNumber,
    billId: bill.billId,
    patientName: bill.patient.name,
    status: 'WAITING',
    estimatedWait: bill.estimatedWaitMinutes,
    addedAt: new Date().toISOString(),
    position: queue.length + 1
  };

  queue.push(queueEntry);

  const position = queue.filter(q => q.status === 'WAITING').length;
  const estimatedTime = position * 3; // 3 mins per patient

  console.log('[Queue Agent] Token', bill.tokenNumber, '| Position:', position);

  return {
    success: true,
    data: {
      tokenNumber: bill.tokenNumber,
      position,
      estimatedWaitMinutes: estimatedTime,
      currentlyServing: currentServing,
      queueLength: queue.length,
      message: `Your token #${bill.tokenNumber} is confirmed. ${position === 1 ? 'You are next!' : `${position - 1} patient(s) ahead of you.`}`
    },
    agent: 'Queue Agent'
  };
}

export function getQueueStatus() {
  return {
    queue: queue.slice(-20),
    currentlyServing: currentServing,
    totalWaiting: queue.filter(q => q.status === 'WAITING').length
  };
}

export function serveNext() {
  const nextPatient = queue.find(q => q.status === 'WAITING');
  if (nextPatient) {
    nextPatient.status = 'SERVING';
    currentServing = nextPatient.tokenNumber;
  }
  return nextPatient;
}

export function markServed() {
  const servingPatient = queue.find(q => q.status === 'SERVING');
  if (servingPatient) {
    servingPatient.status = 'SERVED';
    servingPatient.servedAt = new Date().toISOString();
    currentServing = 0; // Clear currently serving
  }
  return servingPatient;
}

export function resetQueue() {
  queue.length = 0; // Clear all queue entries
  currentServing = 0; // Clear currently serving
}
