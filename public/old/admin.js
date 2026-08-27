const TYPES = [
  ['text', 'Short Text'],
  ['email', 'Email'],
  ['tel', 'Phone'],
  ['textarea', 'Long Text'],
  ['select', 'Dropdown'],
  ['radio', 'Single Choice'],
  ['checkbox-group', 'Multiple Choice (Checkboxes)']
];

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const builderList = document.getElementById('builder-list');
const builderStatus = document.getElementById('builder-status');
const subsTable = document.getElementById('subs-table');

let key = sessionStorage.getItem('adminKey') || '';
let fields = [];

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', 'x-admin-key': key } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function logout() {
  sessionStorage.removeItem('adminKey');
  key = '';
  loginView.hidden = false;
  dashboardView.hidden = true;
}

function needsOptions(type) {
  return ['select', 'radio', 'checkbox-group'].includes(type);
}

function renderBuilder() {
  builderList.innerHTML = '';
  fields.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'card builder-card';
    card.innerHTML = `
      <div class="builder-head">
        <strong>Field ${i + 1}</strong>
        <div class="builder-tools">
          <button class="btn btn-ghost" data-act="up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-ghost" data-act="down" ${i === fields.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-danger" data-act="del">Delete</button>
        </div>
      </div>
      <div class="builder-row">
        <div class="builder-col">
          <label>Question label</label>
          <input type="text" data-prop="label" value="${escapeHtml(f.label)}">
        </div>
        <div class="builder-col">
          <label>Type</label>
          <select data-prop="type">${TYPES.map(([v, t]) => `<option value="${v}" ${f.type === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
        </div>
        <label class="builder-check"><input type="checkbox" data-prop="required" ${f.required ? 'checked' : ''}> Required</label>
      </div>
      <div class="builder-row">
        <div class="builder-col">
          <label>Placeholder</label>
          <input type="text" data-prop="placeholder" value="${escapeHtml(f.placeholder)}">
        </div>
        <div class="builder-col">
          <label>Choices (one per line)</label>
          <textarea data-prop="options" rows="3" ${needsOptions(f.type) ? '' : 'hidden'}>${escapeHtml(f.options.join('\n'))}</textarea>
        </div>
      </div>`;
    card.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (!act) return;
      if (act === 'up') [fields[i - 1], fields[i]] = [fields[i], fields[i - 1]];
      if (act === 'down') [fields[i + 1], fields[i]] = [fields[i], fields[i + 1]];
      if (act === 'del') {
        if (!confirm(`Remove "${f.label}" from the form?`)) return;
        fields.splice(i, 1);
      }
      renderBuilder();
    });
    card.addEventListener('change', () => {
      f.label = card.querySelector('[data-prop="label"]').value;
      f.type = card.querySelector('[data-prop="type"]').value;
      f.required = card.querySelector('[data-prop="required"]').checked;
      f.placeholder = card.querySelector('[data-prop="placeholder"]').value.trim();
      const optsEl = card.querySelector('[data-prop="options"]');
      optsEl.hidden = !needsOptions(f.type);
      f.options = optsEl.value.split('\n').map((o) => o.trim()).filter(Boolean);
    });
    builderList.appendChild(card);
  });
}

function renderSubmissions(data) {
  document.getElementById('subs-count').textContent =
    `${data.submissions.length} response${data.submissions.length === 1 ? '' : 's'} received`;
  if (!data.submissions.length) {
    subsTable.innerHTML = '<tr><td style="color:var(--muted);padding:24px;text-align:center;">No submissions yet — share the site with your chapter!</td></tr>';
    return;
  }
  const cols = data.fields.map((f) => f.label);
  const head = `<tr><th>Submitted</th>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}<th></th></tr>`;
  const rows = data.submissions
    .map(
      (s) =>
        `<tr><td class="nowrap">${escapeHtml(s.created_at)}</td>${cols
          .map((c) => `<td>${escapeHtml(Array.isArray(s.data[c]) ? s.data[c].join(', ') : s.data[c] ?? '')}</td>`)
          .join('')}<td><button class="btn btn-danger" data-id="${s.id}">Delete</button></td></tr>`
    )
    .join('');
  subsTable.innerHTML = head + rows;
}

async function loadSubmissions() {
  try {
    renderSubmissions(await api('/api/admin/submissions'));
  } catch (err) {
    if (err.message !== 'Unauthorized') alert(err.message);
  }
}

document.querySelectorAll('.tab-btn').forEach((btn) =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-builder').hidden = btn.dataset.tab !== 'builder';
    document.getElementById('tab-submissions').hidden = btn.dataset.tab !== 'submissions';
    if (btn.dataset.tab === 'submissions') loadSubmissions();
  })
);

document.getElementById('login-btn').addEventListener('click', async () => {
  key = document.getElementById('admin-key').value.trim();
  try {
    await api('/api/admin/submissions');
    sessionStorage.setItem('adminKey', key);
    loginView.hidden = true;
    dashboardView.hidden = false;
    const res = await api('/api/form');
    fields = res.fields;
    renderBuilder();
    loadSubmissions();
  } catch (err) {
    document.getElementById('login-status').textContent =
      err.message === 'Unauthorized' ? 'Incorrect admin key.' : err.message;
  }
});

document.getElementById('add-field-btn').addEventListener('click', () => {
  fields.push({ label: '', type: 'text', required: false, options: [], placeholder: '' });
  renderBuilder();
  builderList.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.getElementById('save-form-btn').addEventListener('click', async () => {
  builderStatus.textContent = '';
  builderStatus.className = 'form-status';
  try {
    const res = await api('/api/admin/form', {
      method: 'PUT',
      body: JSON.stringify({
        fields: fields.map(({ label, type, required, options, placeholder }) => ({ label, type, required, options, placeholder }))
      })
    });
    fields = res.fields;
    renderBuilder();
    builderStatus.textContent = 'Form saved — changes are live.';
    builderStatus.className = 'form-status success';
  } catch (err) {
    builderStatus.textContent = err.message;
    builderStatus.className = 'form-status error';
  }
});

subsTable.addEventListener('click', async (e) => {
  const id = e.target.closest('button')?.dataset.id;
  if (!id || !confirm('Delete this submission?')) return;
  try {
    await api(`/api/admin/submissions/${id}`, { method: 'DELETE' });
    loadSubmissions();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('refresh-btn').addEventListener('click', loadSubmissions);
document.getElementById('export-btn').addEventListener('click', (e) => {
  e.preventDefault();
  window.open(`/api/admin/export?k=${encodeURIComponent(key)}`, '_blank');
});

(async () => {
  if (!key) return;
  try {
    const [formRes] = await Promise.all([api('/api/form'), api('/api/admin/submissions')]);
    fields = formRes.fields;
    loginView.hidden = true;
    dashboardView.hidden = false;
    renderBuilder();
    loadSubmissions();
  } catch {}
})();
