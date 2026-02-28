// ========== PROFESSIONAL USER MANAGEMENT SYSTEM ==========
const STORAGE_KEY = 'registeredUsers';
let editingUserId = null;
let currentPhoto = '';

// camera elements
let streamRef = null;

// ========== STORAGE MANAGEMENT ==========
function getUsers() {
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored ? JSON.parse(stored) : [];
}

function saveUsers(users) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ========== VALIDATION FUNCTIONS ==========
function validateEmail(email) {
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return regex.test(email);
}

function validateUsername(username) {
	return username.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(username);
}

function checkPasswordStrength(password) {
	let strength = 0;
	if (password.length >= 8) strength++;
	if (password.length >= 12) strength++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
	if (/[0-9]/.test(password)) strength++;
	if (/[^a-zA-Z0-9]/.test(password)) strength++;
	return strength;
}

function getPasswordStrengthText(strength) {
	const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
	return texts[strength] || 'Very Weak';
}

// ========== CAPTCHA HELPERS ==========
let captchaValue = 0;
function generateCaptcha() {
	const a = Math.floor(Math.random() * 10) + 1;
	const b = Math.floor(Math.random() * 10) + 1;
	captchaValue = a + b;
	document.getElementById('captchaQuestion').textContent = `${a} + ${b} = ?`;
}

function verifyCaptcha(input) {
	return parseInt(input, 10) === captchaValue;
}

// ========== PASSWORD TOGGLE ==========
function togglePassword(fieldId) {
	const field = document.getElementById(fieldId);
	const button = event.currentTarget;
	const icon = button.querySelector('i');
	
	if (field.type === 'password') {
		field.type = 'text';
		icon.classList.remove('fa-eye');
		icon.classList.add('fa-eye-slash');
	} else {
		field.type = 'password';
		icon.classList.remove('fa-eye-slash');
		icon.classList.add('fa-eye');
	}
}

// ========== PASSWORD STRENGTH INDICATOR ==========
document.addEventListener('DOMContentLoaded', () => {
	const passwordInput = document.getElementById('password');
	const strengthBar = document.getElementById('strengthBar');
	const strengthText = document.getElementById('strengthText');
	
	if (passwordInput) {
		passwordInput.addEventListener('input', () => {
			const password = passwordInput.value;
			const strength = checkPasswordStrength(password);
			const percent = (strength / 5) * 100;
			
			strengthBar.style.width = percent + '%';
			strengthText.textContent = password ? getPasswordStrengthText(strength) : '';
			
			if (strength <= 1) strengthBar.style.background = 'linear-gradient(90deg, #e74c3c, #e74c3c)';
			else if (strength === 2) strengthBar.style.background = 'linear-gradient(90deg, #e67e22, #e74c3c)';
			else if (strength === 3) strengthBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
			else if (strength === 4) strengthBar.style.background = 'linear-gradient(90deg, #27ae60, #f39c12)';
			else strengthBar.style.background = 'linear-gradient(90deg, #27ae60, #27ae60)';
		});
	}
});

// ========== CAMERA HELPERS ==========
function openCamera() {
	const videoEl = document.getElementById('video');
	const preview = document.getElementById('photoPreview');
	const btn = document.getElementById('cameraBtn');
	
	navigator.mediaDevices.getUserMedia({ video: true })
		.then(s => {
			streamRef = s;
			videoEl.srcObject = s;
			videoEl.classList.remove('hidden');
			btn.textContent = 'Capture';
			btn.onclick = capturePhoto;
		});
}

function capturePhoto() {
	const videoEl = document.getElementById('video');
	const canvas = document.getElementById('canvas');
	const preview = document.getElementById('photoPreview');

	canvas.width = videoEl.videoWidth;
	canvas.height = videoEl.videoHeight;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(videoEl, 0, 0);
	currentPhoto = canvas.toDataURL('image/png');
	preview.src = currentPhoto;
	preview.classList.remove('hidden');
	stopCamera();

	const btn = document.getElementById('cameraBtn');
	btn.textContent = 'Retake';
	btn.onclick = openCamera;
}

function stopCamera() {
	if (streamRef) {
		streamRef.getTracks().forEach(t => t.stop());
		streamRef = null;
	}
	const videoEl = document.getElementById('video');
	videoEl.classList.add('hidden');
}

// ========== REGISTRATION ==========
function registerUser(event) {
	event.preventDefault();
	
	const username = document.getElementById('username').value.trim();
	const email = document.getElementById('email').value.trim();
	const password = document.getElementById('password').value;
	const confirm = document.getElementById('confirm').value;
	
	// Clear previous errors
	document.getElementById('usernameError').textContent = '';
	document.getElementById('emailError').textContent = '';
	document.getElementById('confirmError').textContent = '';
	document.getElementById('captchaError').textContent = '';
	
	let hasError = false;
	
	// Validate username
	if (!validateUsername(username)) {
		document.getElementById('usernameError').textContent = 'Username must be 3+ chars (letters, numbers, _, -)';
		hasError = true;
	}
	
	// Validate email
	if (!validateEmail(email)) {
		document.getElementById('emailError').textContent = 'Please enter a valid email address';
		hasError = true;
	}
	
	// Validate password match
	if (password !== confirm) {
		document.getElementById('confirmError').textContent = 'Passwords do not match';
		hasError = true;
	}
	
	// Validate captcha
	const capInput = document.getElementById('captchaAnswer').value.trim();
	if (!verifyCaptcha(capInput)) {
		document.getElementById('captchaError').textContent = 'Incorrect answer';
		hasError = true;
	}
	
	if (password.length < 6) {
		document.getElementById('confirmError').textContent = 'Password must be at least 6 characters';
		hasError = true;
	}
	
	if (hasError) {
		showToast('Please fix the errors above', 'error');
		return;
	}
	
	const users = getUsers();
	
	// Check for duplicates
	if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
		document.getElementById('usernameError').textContent = 'Username already taken';
		showToast('Username already registered', 'error');
		return;
	}
	
	if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
		document.getElementById('emailError').textContent = 'Email already registered';
		showToast('Email already registered', 'error');
		return;
	}
	
	// Add new user (include photo if available)
	users.push({
		id: Date.now(),
		username,
		email,
		created: new Date().toLocaleDateString(),
		photo: currentPhoto || ''
	});
	currentPhoto = ''; // reset stored photo
	// reset preview image
	const preview = document.getElementById('photoPreview');
	if (preview) { preview.src = ''; preview.classList.add('hidden'); }
	// restore camera button state
	const camBtnElem = document.getElementById('cameraBtn');
	if (camBtnElem) { camBtnElem.textContent = 'Take Photo'; camBtnElem.onclick = openCamera; }
	// regenerate captcha for next submission
	generateCaptcha();
	
	saveUsers(users);
	updateTable(users);
	document.getElementById('registrationForm').reset();
	document.getElementById('strengthBar').style.width = '0';
	document.getElementById('strengthText').textContent = '';
	showToast(`User "${username}" registered successfully!`, 'success');
}

// ========== TABLE MANAGEMENT ==========
function updateTable(users) {
	const tbody = document.querySelector('#usersTable tbody');
	const emptyState = document.getElementById('emptyState');
	const totalBadge = document.getElementById('totalUsers');
	
	tbody.innerHTML = '';
	totalBadge.textContent = users.length;
	
	if (users.length === 0) {
		emptyState.classList.add('show');
		document.querySelector('#usersTable thead').style.display = 'none';
		return;
	}
	
	emptyState.classList.remove('show');
	document.querySelector('#usersTable thead').style.display = 'table-header-group';
	
	users.forEach((user, index) => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${user.photo ? `<img src="${user.photo}" class="thumb" alt="avatar">` : ''}</td>
			<td>
				<strong>${escapeHtml(user.username)}</strong>
			</td>
			<td>${escapeHtml(user.email)}</td>
			<td>${user.created}</td>
			<td>
				<div class="action-buttons">
					<button class="btn-edit" onclick="openEditModal(${user.id})">
						<i class="fas fa-edit"></i> Edit
					</button>
					<button class="btn-delete" onclick="removeUser(${user.id})">
						<i class="fas fa-trash"></i> Delete
					</button>
				</div>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

function removeUser(userId) {
	if (confirm('Are you sure you want to delete this user?')) {
		let users = getUsers();
		users = users.filter(u => u.id !== userId);
		saveUsers(users);
		updateTable(users);
		showToast('User deleted successfully', 'success');
	}
}

// ========== EDIT MODAL ==========
function openEditModal(userId) {
	const users = getUsers();
	const user = users.find(u => u.id === userId);
	
	if (!user) return;
	
	editingUserId = userId;
	document.getElementById('editUsername').value = user.username;
	document.getElementById('editEmail').value = user.email;
	const editPhoto = document.getElementById('editPhoto');
	if (editPhoto) {
		editPhoto.src = user.photo || '';
	}
	document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
	document.getElementById('editModal').classList.remove('show');
	editingUserId = null;
}

function saveEditedUser() {
	const newEmail = document.getElementById('editEmail').value.trim();
	
	if (!validateEmail(newEmail)) {
		showToast('Invalid email address', 'error');
		return;
	}
	
	let users = getUsers();
	const userIndex = users.findIndex(u => u.id === editingUserId);
	
	if (userIndex === -1) return;
	
	// Check if email is already taken by another user
	if (users.some(u => u.id !== editingUserId && u.email.toLowerCase() === newEmail.toLowerCase())) {
		showToast('Email already in use by another user', 'error');
		return;
	}
	
	users[userIndex].email = newEmail;
	saveUsers(users);
	updateTable(users);
	closeEditModal();
	showToast('User updated successfully', 'success');
}

// ========== SEARCH & FILTER ==========
function filterUsers(query) {
	const users = getUsers();
	const filtered = users.filter(u =>
		u.username.toLowerCase().includes(query.toLowerCase()) ||
		u.email.toLowerCase().includes(query.toLowerCase())
	);
	updateTable(filtered);
}

// ========== EXPORT FUNCTIONALITY ==========
function exportUsers() {
	const users = getUsers();
	if (users.length === 0) {
		showToast('No users to export', 'error');
		return;
	}
	
	const csv = [
		'Username,Email,Registered Date,Photo',
		...users.map(u => `${u.username},${u.email},${u.created},"${u.photo || ''}"`)
	].join('\n');
	
	const blob = new Blob([csv], { type: 'text/csv' });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	
	showToast(`Exported ${users.length} user(s)`, 'success');
}

// ========== CLEAR ALL ==========
function clearAll() {
	if (confirm('⚠️ This will permanently delete ALL registered users. Are you sure?')) {
		if (confirm('Really sure? This cannot be undone!')) {
			localStorage.removeItem(STORAGE_KEY);
			updateTable([]);
			showToast('All users have been deleted', 'success');
		}
	}
}

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'info') {
	const toast = document.getElementById('toast');
	toast.textContent = message;
	toast.className = `toast show ${type}`;
	
	setTimeout(() => {
		toast.classList.remove('show');
	}, 3500);
}

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// ========== EVENT LISTENERS & INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
	// Form submission
	const form = document.getElementById('registrationForm');
	if (form) {
		form.addEventListener('submit', registerUser);
	}
	
	// Camera button
	const camBtn = document.getElementById('cameraBtn');
	if (camBtn) {
		camBtn.addEventListener('click', openCamera);
	}
	// captcha
	const refresh = document.getElementById('refreshCaptcha');
	if (refresh) {
		refresh.addEventListener('click', generateCaptcha);
	}
	generateCaptcha();
	
	// Search functionality
	const searchInput = document.getElementById('search');
	if (searchInput) {
		searchInput.addEventListener('input', (e) => {
			if (e.target.value === '') {
				updateTable(getUsers());
			} else {
				filterUsers(e.target.value);
			}
		});
	}
	
	// Export button
	const exportBtn = document.getElementById('exportBtn');
	if (exportBtn) {
		exportBtn.addEventListener('click', exportUsers);
	}
	
	// Clear all button
	const clearAllBtn = document.getElementById('clearAll');
	if (clearAllBtn) {
		clearAllBtn.addEventListener('click', clearAll);
	}
	
	// Close modal on escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeEditModal();
		}
	});
	
	// Initialize table
	updateTable(getUsers());
});