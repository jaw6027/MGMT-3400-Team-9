import { months } from './review.js';
import { parseBillText } from './bill-parser.js';
import { readBillImage } from './bill-ocr.js';

export function setupBillImport(onApply) {
  const picker = document.querySelector('#bill-image');
  const dialog = document.querySelector('#bill-import-dialog');
  const editForm = document.querySelector('#bill-import-form');
  const reading = document.querySelector('#bill-reading');
  const status = document.querySelector('#bill-import-status');
  const destination = document.querySelector('#bill-destination');
  const confirm = document.querySelector('#bill-import-confirm');
  const replace = document.querySelector('#bill-replace');
  const replaceLabel = document.querySelector('#bill-replace-label');
  const monthSelect = document.querySelector('#import-month');
  months.forEach((month, index) => monthSelect.add(new Option(month, String(index))));
  let controller = null;
  let task = 0;

  function updateDestination() {
    const month = monthSelect.value;
    const kwh = month === '' ? null : document.getElementById(`bill-kwh-${month}`);
    const cost = month === '' ? null : document.getElementById(`bill-cost-${month}`);
    const occupied = kwh && (kwh.value !== '' || cost.value !== '');
    replaceLabel.hidden = !occupied;
    replace.required = Boolean(occupied);
    confirm.disabled = month === '' || !editForm.checkValidity();
    destination.textContent = month === '' ? 'Select the month to add to your table.' : occupied
      ? `${months[Number(month)]} already has usage ${kwh.value || '(blank)'} kWh and cost $${cost.value || '(blank)'}. Confirm replacement below; other months will stay unchanged.`
      : `Only ${months[Number(month)]} will be added to your table.`;
  }
  function fillDraft(draft) {
    for (const [key, id] of [['month', 'import-month'], ['kwh', 'import-kwh'], ['cost', 'import-cost']]) {
      document.getElementById(id).value = draft[key].value ?? '';
      const note = document.getElementById(`import-${key}-note`);
      note.textContent = draft[key].status;
      note.classList.toggle('uncertain', draft[key].value === null);
    }
    reading.hidden = true;
    editForm.hidden = false;
    updateDestination();
  }
  document.querySelector('#choose-bill').addEventListener('click', () => picker.click());
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    task += 1;
    const currentTask = task;
    controller?.abort();
    const activeController = new AbortController();
    controller = activeController;
    const signal = activeController.signal;
    editForm.reset();
    editForm.hidden = true;
    reading.hidden = false;
    status.textContent = 'Preparing private image reading on your device…';
    if (!dialog.open) dialog.showModal();
    const timer = setTimeout(() => activeController.abort(), 90000);
    try {
      const draft = await readBillImage(file, { signal, onProgress: percent => {
        if (currentTask === task) status.textContent = percent === null ? 'Loading local image reader…' : `Reading bill on your device… ${percent}%`;
      } });
      if (currentTask !== task || !dialog.open) return;
      status.textContent = 'Reading finished. Check every field against your bill; nothing has been added yet.';
      fillDraft(draft);
    } catch (error) {
      if (currentTask !== task || !dialog.open) return;
      status.textContent = signal.aborted ? 'Reading stopped or timed out. You can enter the three values manually, or cancel and try another image.' : error.message;
      fillDraft(parseBillText(''));
    } finally {
      clearTimeout(timer);
      if (currentTask === task) controller = null;
    }
  });
  function clearBillDraft() {
    task += 1;
    controller?.abort();
    controller = null;
    editForm.reset();
    status.textContent = '';
    for (const key of ['month', 'kwh', 'cost']) document.getElementById(`import-${key}-note`).textContent = '';
    destination.textContent = '';
  }
  function dismissBillDraft() {
    clearBillDraft();
    dialog.close();
  }
  document.querySelector('#bill-import-cancel').addEventListener('click', dismissBillDraft);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismissBillDraft(); });
  // A queued close event from a previous upload must not erase a newly opened draft.
  dialog.addEventListener('close', () => { if (!dialog.open) clearBillDraft(); });
  editForm.addEventListener('input', event => {
    if (['import-month', 'import-kwh', 'import-cost'].includes(event.target.id)) {
      document.querySelector('#bill-reviewed').checked = false;
      const note = document.getElementById(`${event.target.id}-note`);
      note.textContent = 'Edited — verify against your original bill.';
      note.classList.remove('uncertain');
    }
    if (event.target === monthSelect) replace.checked = false;
    updateDestination();
  });
  editForm.addEventListener('submit', event => {
    event.preventDefault();
    updateDestination();
    if (confirm.disabled || !editForm.reportValidity()) return;
    const month = Number(monthSelect.value);
    onApply(month, Number(document.querySelector('#import-kwh').value), Number(document.querySelector('#import-cost').value));
    dismissBillDraft();
    const message = document.querySelector('#bill-added-status');
    message.textContent = `${months[month]} added from your reviewed values. The bill image and extracted text were discarded; other months were unchanged.`;
    document.getElementById(`bill-kwh-${month}`).focus();
  });
}
