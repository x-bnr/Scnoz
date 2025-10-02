// ==========================
// المتغيرات العامة
// ==========================
let html5QrCode = null;
const today = new Date().toISOString().split('T')[0];
document.getElementById('filter-date').value = today;

// ==========================
// التحكم في الأقسام
// ==========================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  if (sectionId === 'dashboard') loadAttendance();
  if (sectionId === 'employees') renderEmployees();
}

// ==========================
// بدء/إيقاف المسح
// ==========================
document.getElementById('start-scan').onclick = () => {
  startScanner();
};

document.getElementById('stop-scan').onclick = () => {
  if (html5QrCode) html5QrCode.stop().then(() => toggleScanButtons(false));
};

function toggleScanButtons(running) {
  document.getElementById('start-scan').disabled = running;
  document.getElementById('stop-scan').disabled = !running;
}

function startScanner() {
  toggleScanButtons(true);
  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      try {
        const empId = decodedText.trim();
        if (!empId) throw new Error("كود فارغ");
        handleAttendance(empId);
        html5QrCode.stop().then(() => toggleScanButtons(false));
      } catch (e) {
        showScanResult("خطأ: رمز غير صالح", "error");
      }
    },
    (err) => {}
  ).catch(err => {
    showScanResult("فشل تشغيل الكاميرا", "error");
    toggleScanButtons(false);
  });
}

function showScanResult(msg, type = "success") {
  const el = document.getElementById('scan-result');
  el.textContent = msg;
  el.className = type === "error" ? "show" : "show";
  el.style.backgroundColor = type === "error" ? "#f8d7da" : "#d4edda";
  el.style.color = type === "error" ? "#721c24" : "#155724";
}

// ==========================
// تسجيل الحضور/الانصراف
// ==========================
function handleAttendance(empId) {
  const employees = JSON.parse(localStorage.getItem("employees") || "{}");
  const employee = employees[empId];
  if (!employee) {
    showScanResult("موظف غير مسجل!", "error");
    return;
  }

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  // جلب سجلات اليوم
  let logs = JSON.parse(localStorage.getItem("attendance") || "{}");
  if (!logs[dateKey]) logs[dateKey] = {};

  const todayLogs = logs[dateKey];
  const existing = todayLogs[empId];

  const startMin = timeToMinutes(employee.startTime);
  const endMin = timeToMinutes(employee.endTime);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  let status, action;
  if (!existing) {
    // أول مسح = حضور
    if (nowMin < startMin - 30) {
      status = "مبكر جدًا";
    } else if (nowMin <= startMin + 15) {
      status = "حاضر";
    } else if (nowMin <= endMin) {
      status = "متأخر";
    } else {
      status = "غائب (مسح بعد الدوام)";
    }
    action = "حضور";
  } else {
    // ثاني مسح = انصراف
    status = "انصراف";
    action = "انصراف";
  }

  todayLogs[empId] = {
    name: employee.firstName + " " + employee.lastName,
    time: timeStr,
    status: status,
    action: action,
    timestamp: now.getTime()
  };

  logs[dateKey] = todayLogs;
  localStorage.setItem("attendance", JSON.stringify(logs));
  showScanResult(`✅ ${action} مسجل لـ ${employee.firstName} (${status})`);
  loadAttendance(); // تحديث الجدول
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// ==========================
// لوحة التحكم - عرض السجلات
// ==========================
function loadAttendance() {
  const date = document.getElementById('filter-date').value || today;
  const logs = JSON.parse(localStorage.getItem("attendance") || "{}");
  const todayLogs = logs[date] || {};
  const tbody = document.getElementById('attendance-body');
  tbody.innerHTML = "";

  Object.entries(todayLogs).forEach(([empId, log]) => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = log.name;
    row.insertCell(1).textContent = log.time;
    const statusCell = row.insertCell(2);
    statusCell.textContent = log.status;
    statusCell.className = getStatusClass(log.status);
  });
}

function getStatusClass(status) {
  if (status.includes("حاضر") || status === "حاضر") return "status-present";
  if (status.includes("متأخر")) return "status-late";
  if (status.includes("انصراف")) return "status-leave";
  return "status-absent";
}

// ==========================
// إدارة الموظفين
// ==========================
function renderEmployees() {
  const list = document.getElementById('employees-list');
  const employees = JSON.parse(localStorage.getItem("employees") || "{}");
  list.innerHTML = "<h3>قائمة الموظفين</h3>";

  Object.values(employees).forEach(emp => {
    const div = document.createElement('div');
    div.innerHTML = `
      <strong>${emp.firstName} ${emp.lastName}</strong> - ${emp.position}
      <button onclick="showQR('${emp.id}')">عرض QR</button>
      <button onclick="deleteEmployee('${emp.id}')">حذف</button>
    `;
    list.appendChild(div);
  });
}

document.getElementById('add-employee-btn').onclick = () => {
  document.getElementById('employee-modal').style.display = "block";
};

document.querySelector('#employee-modal .close, #employee-modal .cancel').onclick = () => {
  document.getElementById('employee-modal').style.display = "none";
};

document.getElementById('employee-form').onsubmit = (e) => {
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

  let employees = JSON.parse(localStorage.getItem("employees") || "{}");
  if (employees[emp.id]) {
    alert("كود الموظف مستخدم مسبقًا!");
    return;
  }
  employees[emp.id] = emp;
  localStorage.setItem("employees", JSON.stringify(employees));
  document.getElementById('employee-form').reset();
  document.getElementById('employee-modal').style.display = "none";
  renderEmployees();
};

function deleteEmployee(id) {
  if (!confirm("هل أنت متأكد من الحذف؟")) return;
  let employees = JSON.parse(localStorage.getItem("employees") || "{}");
  delete employees[id];
  localStorage.setItem("employees", JSON.stringify(employees));
  renderEmployees();
}

// ==========================
// عرض وتنزيل QR
// ==========================
function showQR(empId) {
  const container = document.getElementById('qr-code-container');
  container.innerHTML = "";
  new QRCode(container, {
    text: empId,
    width: 180,
    height: 180
  });
  document.getElementById('qr-modal').style.display = "block";
}

document.querySelector('#qr-modal .close').onclick = () => {
  document.getElementById('qr-modal').style.display = "none";
};

document.getElementById('download-qr').onclick = () => {
  const canvas = document.querySelector('#qr-code-container canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'qr-code.png';
  link.href = canvas.toDataURL();
  link.click();
};

// ==========================
// تصدير إلى CSV
// ==========================
function exportToCSV() {
  const date = document.getElementById('filter-date').value || today;
  const logs = JSON.parse(localStorage.getItem("attendance") || "{}");
  const todayLogs = logs[date] || {};

  if (Object.keys(todayLogs).length === 0) {
    alert("لا توجد سجلات لهذا اليوم");
    return;
  }

  let csv = "الاسم,الوقت,الحالة\n";
  Object.values(todayLogs).forEach(log => {
    csv += `"${log.name}","${log.time}","${log.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${date}.csv`;
  a.click();
}

// ==========================
// تهيئة أولية
// ==========================
window.onload = () => {
  showSection('scanner');
  document.getElementById('filter-date').onchange = loadAttendance;
};
