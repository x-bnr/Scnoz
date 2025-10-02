// ==========================
// المتغيرات العامة
// ==========================
let currentTab = 'scan';
const today = new Date().toISOString().split('T')[0];

// ==========================
// التحكم في الأقسام
// ==========================
function switchTab(tabId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`${tabId}-section`).classList.add('active');

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');

  currentTab = tabId;

  if (tabId === 'employees') renderEmployees();
  if (tabId === 'reports') loadReports();
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    switchTab(tabId);
  });
});

// ==========================
// بدء المسح (زمني - يمكن تعديله لاستخدام الكاميرا لاحقًا)
// ==========================
document.getElementById('start-scan-btn').addEventListener('click', () => {
  // في هذا الإصدار، نستخدم زر "بدء المسح" كمثال
  // يمكنك ربطه بـ html5-qrcode لاحقًا
  const resultDiv = document.getElementById('scan-result');
  resultDiv.textContent = "تم تسجيل الحضور بنجاح!";
  resultDiv.className = "scan-result show";
  setTimeout(() => {
    resultDiv.className = "scan-result";
  }, 3000);

  // تحديث التقارير
  if (currentTab === 'reports') loadReports();
});

// ==========================
// إدارة الموظفين
// ==========================
function renderEmployees() {
  const list = document.getElementById('employees-list');
  const employees = JSON.parse(localStorage.getItem("employees") || "{}");
  list.innerHTML = "";

  if (Object.keys(employees).length === 0) {
    list.innerHTML = "<p style='text-align:center; padding:20px;'>لا يوجد موظفين بعد. اضغط على \"إضافة موظف\".</p>";
    return;
  }

  Object.values(employees).forEach(emp => {
    const card = document.createElement('div');
    card.className = 'employee-card';

    card.innerHTML = `
      <div class="employee-card-header">
        <div class="employee-avatar">👤</div>
      </div>
      <div class="employee-info">
        <h3>${emp.firstName} ${emp.lastName}</h3>
        <div class="code">الكود: ${emp.id}</div>
        <div class="detail"><i>✉️</i> ${emp.email || 'غير متوفر'}</div>
        <div class="detail"><i>📱</i> ${emp.phone || 'غير متوفر'}</div>
        <div class="detail"><i>📅</i> ${emp.dob || 'غير محدد'}</div>
        <div class="detail"><i>🕒</i> ${emp.startTime} - ${emp.endTime}</div>
        <div class="qr-container">
          <img src="#" alt="QR Code" onclick="showQR('${emp.id}')">
          <div class="qr-label">امسح الكود للحضور والانصراف</div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

document.getElementById('add-employee-btn').addEventListener('click', () => {
  document.getElementById('employee-modal').style.display = 'block';
});

document.querySelector('#employee-modal .close, #employee-modal .btn-cancel').addEventListener('click', () => {
  document.getElementById('employee-modal').style.display = 'none';
});

document.getElementById('employee-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const emp = {
    id: document.getElementById('emp-id').value,
    firstName: document.getElementById('first-name').value,
    lastName: document.getElementById('last-name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    dob: document.getElementById('dob').value,
    startTime: document.getElementById('start-time').value,
    endTime: document.getElementById('end-time').value
  };

  let employees = JSON.parse(localStorage.getItem("employees") || "{}");
  if (employees[emp.id]) {
    alert("كود الموظف مستخدم مسبقًا!");
    return;
  }
  employees[emp.id] = emp;
  localStorage.setItem("employees", JSON.stringify(employees));

  document.getElementById('employee-form').reset();
  document.getElementById('employee-modal').style.display = 'none';
  renderEmployees();
});

// ==========================
// عرض QR
// ==========================
function showQR(empId) {
  const container = document.getElementById('qr-code-container');
  container.innerHTML = "";
  new QRCode(container, {
    text: empId,
    width: 180,
    height: 180
  });
  document.getElementById('qr-modal').style.display = 'block';
}

document.querySelector('#qr-modal .close').addEventListener('click', () => {
  document.getElementById('qr-modal').style.display = 'none';
});

document.getElementById('download-qr').addEventListener('click', () => {
  const canvas = document.querySelector('#qr-code-container canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'qr-code.png';
  link.href = canvas.toDataURL();
  link.click();
});

// ==========================
// لوحة التقارير
// ==========================
function loadReports() {
  const date = document.getElementById('filter-date').value || today;
  const logs = JSON.parse(localStorage.getItem("attendance") || "{}");
  const todayLogs = logs[date] || {};

  // تحديث الإحصائيات
  let presentCount = 0, lateCount = 0, absentCount = 0;
  Object.values(todayLogs).forEach(log => {
    if (log.status === "حاضر") presentCount++;
    else if (log.status === "متأخر") lateCount++;
    else if (log.status === "غائب") absentCount++;
  });

  document.getElementById('present-count').textContent = presentCount;
  document.getElementById('late-count').textContent = lateCount;
  document.getElementById('absent-count').textContent = absentCount;

  // تحديث قائمة الموظفين في الفلتر
  const empSelect = document.getElementById('filter-employee');
  empSelect.innerHTML = '<option value="all">الكل</option>';
  const employees = JSON.parse(localStorage.getItem("employees") || "{}");
  Object.values(employees).forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.firstName} ${emp.lastName}`;
    empSelect.appendChild(opt);
  });

  // عرض السجلات
  const tbody = document.getElementById('logs-body');
  tbody.innerHTML = "";

  if (Object.keys(todayLogs).length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">لا توجد سجلات</td></tr>`;
    return;
  }

  Object.values(todayLogs).forEach(log => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = log.name;
    row.insertCell(1).textContent = log.status;
    row.insertCell(2).textContent = log.time;
    row.insertCell(3).textContent = date;
  });
}

// ==========================
// فلترة السجلات (مؤقتة - تحتاج إلى تنفيذ كامل لاحقًا)
// ==========================
document.getElementById('filter-date').addEventListener('change', loadReports);
document.getElementById('filter-status').addEventListener('change', loadReports);
document.getElementById('filter-employee').addEventListener('change', loadReports);

// ==========================
// تهيئة أولية
// ==========================
window.onload = () => {
  switchTab('scan');
};
