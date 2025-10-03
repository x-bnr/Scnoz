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
  const existing = todayLogs[empId] || {};

  if (!existing.entryTime) {
    // أول مسح = دخول
    todayLogs[empId] = {
      entryTime: timeStr,
      exitTime: null
    };
    showScanResult(`✅ تم تسجيل دخول ${emp.firstName} (${timeStr})`);
  } else if (!existing.exitTime) {
    // ثاني مسح = انصراف
    todayLogs[empId].exitTime = timeStr;
    showScanResult(`✅ تم تسجيل انصراف ${emp.firstName} (${timeStr})`);
  } else {
    // مسح ثالث → تحديث الانصراف
    todayLogs[empId].exitTime = timeStr;
    showScanResult(`🔄 تم تحديث انصراف ${emp.firstName}`);
  }

  logs[dateKey] = todayLogs;
  localStorage.setItem("attendance", JSON.stringify(logs));

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

  const employees = JSON.parse(localStorage.getItem("employees") || "{}");
  const tbody = document.getElementById('attendance-body');
  tbody.innerHTML = "";

  let presentCount = 0, lateCount = 0, absentCount = 0;

  // التكرار على جميع الموظفين (ليس فقط من سجلوا)
  Object.values(employees).forEach(emp => {
    const log = todayLogs[emp.id] || {};
    let status = "غائب";
    let entryTime = "—";
    let exitTime = "—";

    if (log.entryTime) {
      entryTime = log.entryTime;
      const entryMin = timeToMinutes(log.entryTime);
      const startMin = timeToMinutes(emp.startTime || "07:00");
      if (entryMin <= startMin + 15) {
        status = "حاضر";
        presentCount++;
      } else {
        status = "متأخر";
        lateCount++;
      }
    }

    if (log.exitTime) {
      exitTime = log.exitTime;
    }

    if (status === "غائب") absentCount++;

    const row = tbody.insertRow();
    row.insertCell(0).textContent = emp.firstName + " " + emp.lastName;
    row.insertCell(1).textContent = status;
    row.insertCell(2).textContent = entryTime;
    row.insertCell(3).textContent = exitTime;
  });

  // تحديث الإحصائيات
  document.getElementById('present-count').textContent = presentCount;
  document.getElementById('late-count').textContent = lateCount;
  document.getElementById('absent-count').textContent = absentCount;
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
function exportToCSV() {
  const dateKey = new Date().toISOString().split('T')[0];
  const logs = JSON.parse(localStorage.getItem("attendance") || "{}");
  const todayLogs = logs[dateKey] || {};
  const employees = JSON.parse(localStorage.getItem("employees") || "{}");

  let csv = "الاسم,الحالة,وقت الدخول,وقت الانصراف\n";

  Object.values(employees).forEach(emp => {
    const log = todayLogs[emp.id] || {};
    let status = "غائب";
    const entry = log.entryTime || "—";
    const exit = log.exitTime || "—";

    if (log.entryTime) {
      const entryMin = timeToMinutes(log.entryTime);
      const startMin = timeToMinutes(emp.startTime || "07:00");
      status = entryMin <= startMin + 15 ? "حاضر" : "متأخر";
    }

    const name = `${emp.firstName} ${emp.lastName}`;
    csv += `"${name}","${status}","${entry}","${exit}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تقرير_الحضور_${dateKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ربط الزر
document.getElementById('export-btn').addEventListener('click', exportToCSV);

// ربط الأزرار
document.getElementById('start-scan-btn').addEventListener('click', startScan);
document.getElementById('stop-scan-btn').addEventListener('click', stopScan);

// تهيئة أولية
window.onload = () => {
  switchTab('scan');
};

