const form = document.getElementById('interest-form');
const fieldsContainer = document.getElementById('form-fields');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

let fields = [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderField(f) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const reqMark = f.required ? ' <span class="req">*</span>' : '';
  const id = `field-${f.id}`;

  if (f.type === 'checkbox-group') {
    wrap.innerHTML = `<label>${escapeHtml(f.label)}${reqMark}</label>
      <div class="choice-group">${f.options
        .map((o, i) => `<label><input type="checkbox" name="${id}" value="${escapeHtml(o)}"> ${escapeHtml(o)}</label>`)
        .join('')}</div>`;
    return wrap;
  }

  const labelHtml = `<label for="${id}">${escapeHtml(f.label)}${reqMark}</label>`;

  if (f.type === 'select' || f.type === 'radio') {
    if (f.type === 'select') {
      wrap.innerHTML = `${labelHtml}<select id="${id}" name="${id}" ${f.required ? 'required' : ''}>
        <option value="">Select one…</option>
        ${f.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
      </select>`;
    } else {
      wrap.innerHTML = `${labelHtml}<div class="choice-group">
        ${f.options.map((o) => `<label><input type="radio" name="${id}" value="${escapeHtml(o)}"> ${escapeHtml(o)}</label>`).join('')}
      </div>`;
    }
    return wrap;
  }

  if (f.type === 'textarea') {
    wrap.innerHTML = `${labelHtml}<textarea id="${id}" name="${id}" placeholder="${escapeHtml(f.placeholder)}"
      ${f.required ? 'required' : ''}></textarea>`;
    return wrap;
  }

  const typeMap = { email: 'email', tel: 'tel', text: 'text' };
  const inputType = typeMap[f.type] || 'text';
  wrap.innerHTML = `${labelHtml}<input type="${inputType}" id="${id}" name="${id}"
    placeholder="${escapeHtml(f.placeholder)}" ${f.required ? 'required' : ''}>`;
  return wrap;
}

function collect() {
  const values = {};
  for (const f of fields) {
    const id = `field-${f.id}`;
    if (f.type === 'checkbox-group') {
      values[f.label] = [...fieldsContainer.querySelectorAll(`input[name="${id}"]:checked`)].map((c) => c.value);
    } else if (f.type === 'radio') {
      const sel = fieldsContainer.querySelector(`input[name="${id}"]:checked`);
      values[f.label] = sel ? sel.value : '';
    } else {
      values[f.label] = fieldsContainer.querySelector(`#${CSS.escape(id)}`)?.value ?? '';
    }
  }
  return values;
}

async function init() {
  try {
    const res = await fetch('/api/form');
    const data = await res.json();
    fields = data.fields;
    fields.forEach((f) => fieldsContainer.appendChild(renderField(f)));
  } catch {
    statusEl.textContent = 'Could not load the form. Please refresh the page.';
    statusEl.className = 'form-status error';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  statusEl.className = 'form-status';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collect())
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    form.innerHTML =
      '<h3 style="color:var(--navy);text-align:center;font-size:24px;">You\'re on the list! 🎉</h3>' +
      '<p style="text-align:center;color:var(--muted);margin-top:10px;">Thanks for your interest — a DECA officer will reach out soon with meeting details.</p>';
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'form-status error';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Interest Form';
  }
});

init();
