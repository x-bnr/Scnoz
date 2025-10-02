let html5QrCode = null;
let currentTab = 'scan';

// التحكم في الأقسام
function switchTab(tabId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`${tabId}-section`).classList.add('active');

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');

  currentTab = tabId;

  if (tabId === 'employees') renderEmployees();
  if (tabId === 'dashboard') loadDashboard();
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    switchTab(tabId);
  });
});

// بدء المسح
function startScan() {
  const readerDiv = document.getElementById('reader');
  readerDiv.innerHTML = "";

  html5QrCode = new Html5Qrcode("reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      handleAttendance(decodedText.trim());
      stopScan();
    },
    (errorMessage) => {}
  ).catch(err => {
    showScanResult("فشل تشغيل الكاميرا: " + err.message, "error");
  });

  document.getElementById('start-scan-btn').style.display = 'none';
  document.getElementById('stop-scan-btn').style.display = 'block';
}

function stopScan() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      document.getElementById('start-scan-btn').style.display = 'block';
      document.getElementById('stop-scan-btn').style.display = 'none';
      document.getElementById('reader').innerHTML = "";
    }).catch(console.error);
  }
}

function showScanResult(msg, type = "success") {
  const el = document.getElementById('scan-result');
  el.textContent = msg;
  el.className = "scan-result show";
  el.style.backgroundColor = type === "error" ? "#ffebee" : "#e8f5e9";
  el.style.color = type === "error" ? "#d32f2f" : "#2e7d32";
  setTimeout(() => el.className = "scan-result", 3000);
}

// معالجة الحضور
function handleAttendance(empId) {
  const employees = JSON.parse(localStorage.getItem("employees") || "{}");
  const emp = employees[empId];
  if (!emp) {
    showScanResult("❌ الموظف غير مسجل!", "error");
    return;
  }

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  let logs = JSON.parse(localStorage.getItem("attendance") || "{}");
  if (!logs[dateKey]) logs[dateKey] = {};

  const todayLogs = logs[dateKey];
  const existing = todayLogs[empId];

  const startMin = timeToMinutes(emp.startTime);
  const endMin = timeToMinutes(emp.endTime);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  let status;
  if (!existing) {
    if (nowMin < startMin - 30) status = "مبكر جدًا";
    else if (nowMin <= startMin + 15) status = "حاضر";
    else if (nowMin <= endMin) status = "متأخر";
    else status = "غائب";
  } else {
    status = "انصراف";
  }

  todayLogs[empId] = {
    name: emp.firstName + " " + emp.lastName,
    time: timeStr,
    status: status
  };

  logs[dateKey] = todayLogs;
  localStorage.setItem("attendance", JSON.stringify(logs));

  showScanResult(`✅ ${status} لـ ${emp.firstName} (${timeStr})`);
  if (currentTab === 'dashboard') loadDashboard();
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// لوحة التحكم
function loadDashboard() {
  const dateKey = new Date().toISOString().split('T')[0];
  const logs = JSON.parse(localStorage.getItem("attendance") || "{}");
  const todayLogs = logs[dateKey] || {};

  let present = 0, late = 0, absent = 0;
  Object.values(todayLogs).forEach(log => {
    if (log.status === "حاضر") present++;
    else if (log.status === "متأخر") late++;
    else if (log.status === "غائب") absent++;
  });

  document.getElementById('present-count').textContent = present;
  document.getElementById('late-count').textContent = late;
  document.getElementById('absent-count').textContent = absent;

  const tbody = document.getElementById('attendance-body');
  tbody.innerHTML = "";

  if (Object.keys(todayLogs).length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">لا توجد سجلات اليوم</td></tr>`;
    return;
  }

  Object.values(todayLogs).forEach(log => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = log.name;
    row.insertCell(1).textContent = log.status;
    row.insertCell(2).textContent = log.time;
  });
}

// إدارة الموظفين
function renderEmployees() {
  const list = document.getElementById('employees-list');
  const employees = JSON.parse(localStorage.getItem("employees") || "{}");
  list.innerHTML = "";

  if (Object.keys(employees).length === 0) {
    list.innerHTML = "<p style='text-align:center;'>لا يوجد موظفين. اضغط على \"إضافة موظف\".</p>";
    return;
  }

  Object.values(employees).forEach(emp => {
    const card = document.createElement('div');
    card.className = 'employee-card';

    const qrContainer = document.createElement('div');
    qrContainer.className = 'qr-preview';
    new QRCode(qrContainer, {
      text: emp.id,
      width: 100,
      height: 100
    });

    card.innerHTML = `
      <h4>${emp.firstName} ${emp.lastName}</h4>
      <p>الكود: ${emp.id}</p>
      <p>المنصب: ${emp.position || '—'}</p>
      <p>الدوام: ${emp.startTime} - ${emp.endTime}</p>
    `;
    card.appendChild(qrContainer);

    list.appendChild(card);
  });
}

// نافذة إضافة موظف
document.getElementById('add-employee-btn').addEventListener('click', () => {
  document.getElementById('employee-modal').style.display = 'block';
});

document.querySelector('#employee-modal .close, .btn-cancel').addEventListener('click', () => {
  document.getElementById('employee-modal').style.display = 'none';
});

document.getElementById('employee-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const emp = {
    id: document.getElementById('emp-id').value,
    firstName: document.getElementById('first-name').value,
    lastName: document.getElementById('last-name').value,
    dob: document.getElementById('dob').value,
    phone: document.getElementById('phone').value,
    position: document.getElementById('position').value,
    startTime: document.getElementById('start-time').value,
    endTime: document.getElementById('end-time').value
  };

  let emps = JSON.parse(localStorage.getItem("employees") || "{}");
  if (emps[emp.id]) {
    alert("كود الموظف مستخدم مسبقًا!");
    return;
  }
  emps[emp.id] = emp;
  localStorage.setItem("employees", JSON.stringify(emps));

  document.getElementById('employee-form').reset();
  document.getElementById('employee-modal').style.display = 'none';
  renderEmployees();
});

// نافذة QR
function showQR(empId) {
  const container = document.getElementById('qr-code-container');
  container.innerHTML = "";
  new QRCode(container, { text: empId, width: 180, height: 180 });
  document.getElementById('qr-modal').style.display = 'block';
}

document.querySelector('#qr-modal .close').addEventListener('click', () => {
  document.getElementById('qr-modal').style.display = 'none';
});

document.getElementById('download-qr').addEventListener('click', () => {
  const canvas = document.querySelector('#qr-code-container canvas');
  if (canvas) {
    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL();
    link.click();
  }
});

// ربط الأزرار
document.getElementById('start-scan-btn').addEventListener('click', startScan);
document.getElementById('stop-scan-btn').addEventListener('click', stopScan);

// تهيئة أولية
window.onload = () => {
  switchTab('scan');
};
