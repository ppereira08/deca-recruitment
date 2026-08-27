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
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');

let key = sessionStorage.getItem('adminKey') || '';
let fields = [];


function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}


function formatDate(isoString) {
  const d = new Date(isoString);

  if (Number.isNaN(d.getTime())) {
    return escapeHtml(isoString);
  }

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}


<<<<<<< HEAD
=======
/*
 * Every admin API request sends the key in a request header.
 *
 * IMPORTANT:
 * ADMIN_KEY itself does NOT belong here.
 *
 * The server should compare:
 *
 * req.headers['x-admin-key']
 *
 * against:
 *
 * process.env.ADMIN_KEY
 */
>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(key ? { 'x-admin-key': key } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(path, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}


function logout() {
  sessionStorage.removeItem('adminKey');

  key = '';
  fields = [];

  loginView.hidden = false;
  dashboardView.hidden = true;

  loginStatus.textContent = '';
  document.getElementById('admin-key').value = '';

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  document
    .querySelector('[data-tab="builder"]')
    ?.classList.add('active');

  document.getElementById('tab-builder').hidden = false;
  document.getElementById('tab-submissions').hidden = true;
}


function needsOptions(type) {
  return [
    'select',
    'radio',
    'checkbox-group'
  ].includes(type);
}


function renderBuilder() {
  builderList.innerHTML = '';

  fields.forEach((f, i) => {
    const card = document.createElement('div');

    card.className = 'card builder-card';

    card.innerHTML = `
      <div class="builder-head">

        <strong>
          Field ${i + 1}
        </strong>

        <div class="builder-tools">

          <button
            class="btn btn-ghost"
            data-act="up"
            type="button"
            ${i === 0 ? 'disabled' : ''}
          >
            ↑
          </button>

          <button
            class="btn btn-ghost"
            data-act="down"
            type="button"
            ${i === fields.length - 1 ? 'disabled' : ''}
          >
            ↓
          </button>

          <button
            class="btn btn-danger"
            data-act="del"
            type="button"
          >
            Delete
          </button>

        </div>

      </div>


      <div class="builder-row">

        <div class="builder-col">

          <label>
            Question label
          </label>

          <input
            type="text"
            data-prop="label"
            value="${escapeHtml(f.label)}"
          />

        </div>


        <div class="builder-col">

          <label>
            Type
          </label>

          <select data-prop="type">

            ${TYPES.map(
              ([v, t]) =>
                `<option value="${v}" ${
                  f.type === v ? 'selected' : ''
                }>${t}</option>`
            ).join('')}

          </select>

        </div>


        <label class="builder-check">

          <input
            type="checkbox"
            data-prop="required"
            ${f.required ? 'checked' : ''}
          />

          Required

        </label>

      </div>


      <div class="builder-row">

        <div class="builder-col">

          <label>
            Placeholder
          </label>

          <input
            type="text"
            data-prop="placeholder"
            value="${escapeHtml(f.placeholder)}"
          />

        </div>


        <div class="builder-col">

          <label>
            Choices (one per line)
          </label>

          <textarea
            data-prop="options"
            rows="3"
            ${needsOptions(f.type) ? '' : 'hidden'}
          >${escapeHtml((f.options || []).join('\n'))}</textarea>

        </div>

      </div>
    `;


    card.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      const act = button?.dataset.act;

      if (!act) return;

      if (act === 'up' && i > 0) {
        [fields[i - 1], fields[i]] =
          [fields[i], fields[i - 1]];
      }

      if (act === 'down' && i < fields.length - 1) {
        [fields[i + 1], fields[i]] =
          [fields[i], fields[i + 1]];
      }

      if (act === 'del') {
        if (!confirm(`Remove "${f.label}" from the form?`)) {
          return;
        }

        fields.splice(i, 1);
      }

      renderBuilder();
    });


    card.addEventListener('change', () => {
      f.label =
        card
          .querySelector('[data-prop="label"]')
          .value
          .trim();

      f.type =
        card
          .querySelector('[data-prop="type"]')
          .value;

      f.required =
        card
          .querySelector('[data-prop="required"]')
          .checked;

      f.placeholder =
        card
          .querySelector('[data-prop="placeholder"]')
          .value
          .trim();

      const optsEl =
        card.querySelector('[data-prop="options"]');

      optsEl.hidden = !needsOptions(f.type);

      f.options =
        optsEl.value
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean);
    });


    builderList.appendChild(card);
  });
}


function cleanValue(v) {
  if (Array.isArray(v)) {
    return v
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (v == null) {
    return '';
  }

  return String(v).trim();
}


function renderSubmissions(data) {
  const submissions = data.submissions || [];
  const formFields = data.fields || [];

  document.getElementById('subs-count').textContent =
    `${submissions.length} response${
      submissions.length === 1 ? '' : 's'
    } received`;


  if (!submissions.length) {
    subsTable.innerHTML =
      '<tr><td class="table-empty">No submissions yet — share the site with your chapter!</td></tr>';

    return;
  }


  const cols = formFields.map((f) => f.label);


  const head =
    `<tr>
      <th>Submitted</th>
      ${cols
        .map((c) => `<th>${escapeHtml(c)}</th>`)
        .join('')}
      <th></th>
    </tr>`;


  const rows = submissions
    .map((s) => {
      const cells = cols
        .map(
          (c) =>
            `<td>${escapeHtml(
              cleanValue(s.data?.[c])
            )}</td>`
        )
        .join('');

      return `
        <tr>

          <td class="nowrap">
            ${formatDate(s.created_at)}
          </td>

          ${cells}

          <td>
            <button
              class="btn btn-danger"
              data-id="${escapeHtml(s.id)}"
              type="button"
            >
              Delete
            </button>
          </td>

        </tr>
      `;
    })
    .join('');


  subsTable.innerHTML = head + rows;
}


async function loadSubmissions() {
  try {
    const data =
      await api('/api/admin/submissions');

    renderSubmissions(data);

  } catch (err) {

    if (err.message !== 'Unauthorized') {
      alert(err.message);
    }

  }
}


<<<<<<< HEAD
=======
/*
 * Tabs
 */

>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
document
  .querySelectorAll('.tab-btn[data-tab]')
  .forEach((btn) => {

    btn.addEventListener('click', () => {

      document
        .querySelectorAll('.tab-btn[data-tab]')
        .forEach((b) => b.classList.remove('active'));

      btn.classList.add('active');

      const isBuilder =
        btn.dataset.tab === 'builder';

      document.getElementById('tab-builder').hidden =
        !isBuilder;

      document.getElementById('tab-submissions').hidden =
        isBuilder;

      if (btn.dataset.tab === 'submissions') {
        loadSubmissions();
      }

    });

  });


<<<<<<< HEAD
=======
/*
 * Logout
 */

>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
document
  .getElementById('logout-btn')
  .addEventListener('click', logout);


<<<<<<< HEAD
=======
/*
 * Login
 */

>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
loginForm.addEventListener('submit', async (e) => {

  e.preventDefault();

  loginStatus.textContent = '';
  loginStatus.className = 'form-status';

  const enteredKey =
    document
      .getElementById('admin-key')
      .value
      .trim();

  if (!enteredKey) {
    loginStatus.textContent =
      'Enter the admin key.';

    loginStatus.className =
      'form-status error';

    return;
  }

  key = enteredKey;

  const loginButton =
    document.getElementById('login-btn');

  loginButton.disabled = true;
  loginButton.textContent = 'Checking…';


  try {

<<<<<<< HEAD
=======
    /*
     * This request verifies the key server-side.
     *
     * The server compares the submitted x-admin-key
     * against process.env.ADMIN_KEY.
     */
>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
    await api('/api/admin/submissions');


    sessionStorage.setItem('adminKey', key);

    loginView.hidden = true;
    dashboardView.hidden = false;

    const res =
      await api('/api/form');

    fields = res.fields || [];

    renderBuilder();

    await loadSubmissions();

  } catch (err) {

    key = '';

    loginStatus.textContent =
      err.message === 'Unauthorized'
        ? 'Incorrect admin key.'
        : err.message;

    loginStatus.className =
      'form-status error';

  } finally {

    loginButton.disabled = false;
    loginButton.textContent = 'Unlock Dashboard';

  }

});


<<<<<<< HEAD
=======
/*
 * Add field
 */

>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
document
  .getElementById('add-field-btn')
  .addEventListener('click', () => {

    fields.push({
      label: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: ''
    });

    renderBuilder();

    builderList
      .lastElementChild
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

  });


<<<<<<< HEAD
=======
/*
 * Save form
 */

>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
document
  .getElementById('save-form-btn')
  .addEventListener('click', async () => {

    builderStatus.textContent = '';
    builderStatus.className = 'form-status';


    try {

      const res =
        await api('/api/admin/form', {
          method: 'PUT',

          body: JSON.stringify({
            fields: fields.map(
              ({
                label,
                type,
                required,
                options,
                placeholder
              }) => ({
                label,
                type,
                required,
                options,
                placeholder
              })
            )
          })
        });


      fields = res.fields || [];

      renderBuilder();

      builderStatus.textContent =
        'Form saved — changes are live.';

      builderStatus.className =
        'form-status success';

    } catch (err) {

      builderStatus.textContent =
        err.message;

      builderStatus.className =
        'form-status error';

    }

  });

<<<<<<< HEAD
=======

/*
 * Delete submission
 */
>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19

subsTable.addEventListener('click', async (e) => {

  const button =
    e.target.closest('button[data-id]');

  const id = button?.dataset.id;

  if (!id) return;

  if (!confirm('Delete this submission?')) {
    return;
  }


  try {

    await api(
      `/api/admin/submissions/${encodeURIComponent(id)}`,
      {
        method: 'DELETE'
      }
    );

    await loadSubmissions();

  } catch (err) {

    alert(err.message);

  }

});


<<<<<<< HEAD
=======
/*
 * Refresh
 */

>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
document
  .getElementById('refresh-btn')
  .addEventListener(
    'click',
    loadSubmissions
  );


<<<<<<< HEAD
=======
/*
 * Export CSV
 *
 * Do NOT put the admin key in the URL.
 *
 * The key is sent as an HTTP header instead.
 */

>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
document
  .getElementById('export-btn')
  .addEventListener('click', async () => {

    const button =
      document.getElementById('export-btn');

    button.disabled = true;
    button.textContent = 'Exporting…';


    try {

      const res =
        await fetch('/api/admin/export', {
          headers: {
            'x-admin-key': key
          }
        });


      if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
      }


      if (!res.ok) {
        let message = 'Export failed.';

        try {
          const data = await res.json();
          message = data.error || message;
        } catch {}

        throw new Error(message);
      }


      const blob =
        await res.blob();

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement('a');

      a.href = url;
      a.download = 'deca-submissions.csv';

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

    } catch (err) {

      if (err.message !== 'Unauthorized') {
        alert(err.message);
      }

    } finally {

      button.disabled = false;
      button.textContent = 'Export CSV';

    }

  });

<<<<<<< HEAD
=======

/*
 * Restore existing session.
 */
>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19

(async () => {

  if (!key) {
    return;
  }


  try {

    const [formRes] =
      await Promise.all([
        api('/api/form'),
        api('/api/admin/submissions')
      ]);


    fields =
      formRes.fields || [];


    loginView.hidden = true;
    dashboardView.hidden = false;

    renderBuilder();

    await loadSubmissions();

  } catch {

    logout();

  }

<<<<<<< HEAD
})();
=======
})();
>>>>>>> 9c9804e723602e4398093764c04c1b3104e05a19
