import { auth, db } from "./firebaseauth.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { addSingleChild, removeSingleChild, loadChildren } from "./children.js";

let currentUserId = null;
let currentUserData = null;
let childToRemoveId = null;
let childToRemoveName = null;

// ── Auth State ─────────────────────────────────────────────────────────────
const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
  const loadingScreen = document.getElementById('auth-loading');
  if (loadingScreen) loadingScreen.style.display = 'none';

  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  unsubscribeAuth();
  currentUserId = user.uid;
  initializeSettings(user.uid);
});

// ── Logout ─────────────────────────────────────────────────────────────────
document.getElementById('logout').addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  });
});

// ── Initialize Settings Page ───────────────────────────────────────────────
async function initializeSettings(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      window.location.href = 'index.html';
      return;
    }

    currentUserData = userDoc.data();
    const { firstName, lastName, role, preferences } = currentUserData;

    document.getElementById('settings-user-name').textContent =
      `${firstName} ${lastName} · ${role.charAt(0).toUpperCase() + role.slice(1)}`;

    applyPreferences(preferences || {});

    document.getElementById('dark-mode-toggle').checked =
      preferences?.darkMode || false;
    document.getElementById('large-text-toggle').checked =
      preferences?.largeText || false;

    if (role === 'parent') {
      document.getElementById('children-section').style.display = 'flex';
      await loadChildren(currentUserId, 'children-list');
    }

    setupToggleListeners(userId);

  } catch (error) {
    console.error('Error initializing settings:', error);
  }
}

// ── Apply Preferences to DOM ───────────────────────────────────────────────
function applyPreferences(preferences) {
  document.body.classList.toggle('dark-mode', !!preferences.darkMode);
  document.body.classList.toggle('large-text', !!preferences.largeText);
}

// ── Toggle Listeners ───────────────────────────────────────────────────────
function setupToggleListeners(userId) {
  document.getElementById('dark-mode-toggle').addEventListener('change', async (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle('dark-mode', isDark);
    await savePreference(userId, 'darkMode', isDark);
  });

  document.getElementById('large-text-toggle').addEventListener('change', async (e) => {
    const isLarge = e.target.checked;
    document.body.classList.toggle('large-text', isLarge);
    await savePreference(userId, 'largeText', isLarge);
  });
}

// ── Save Preference to Firestore ───────────────────────────────────────────
async function savePreference(userId, key, value) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      [`preferences.${key}`]: value
    });
    // Also cache in localStorage for instant apply on next page load
    localStorage.setItem(key, value);
    console.log(`Saved preference: ${key} = ${value}`);
  } catch (error) {
    console.error('Error saving preference:', error);
  }
}

// ── Add Child Modal ────────────────────────────────────────────────────────
function openAddChildModal() {
  document.getElementById('new-child-name').value = '';
  document.getElementById('new-child-grade').value = '';
  document.getElementById('new-child-section').value = '';
  document.getElementById('add-child-error').style.display = 'none';
  document.getElementById('add-child-modal').style.display = 'flex';
}

function closeAddChildModal() {
  document.getElementById('add-child-modal').style.display = 'none';
}

async function confirmAddChild() {
  const name = document.getElementById('new-child-name').value.trim();
  const grade = document.getElementById('new-child-grade').value;
  const section = document.getElementById('new-child-section').value.trim();
  const errorEl = document.getElementById('add-child-error');
  const confirmBtn = document.getElementById('confirm-add-child');

  if (!name || !grade || !section) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  try {
    confirmBtn.textContent = 'Adding...';
    confirmBtn.disabled = true;

    await addSingleChild(
      currentUserId,
      currentUserData.assignedDriver,
      name, grade, section
    );

    closeAddChildModal();

    await loadChildren(currentUserId, 'children-list');

  } catch (error) {
    console.error('Error adding child:', error);
    errorEl.style.display = 'block';
    errorEl.textContent = 'Error adding child. Please try again.';
  } finally {
    confirmBtn.textContent = 'Add Child';
    confirmBtn.disabled = false;
  }
}

// ── Remove Child Modal ─────────────────────────────────────────────────────
function openRemoveChildModal(childId, childName) {
  childToRemoveId = childId;
  childToRemoveName = childName;
  document.getElementById('remove-child-message').textContent =
    `Are you sure you want to remove ${childName} from your school service? This cannot be undone.`;
  document.getElementById('remove-child-modal').style.display = 'flex';
}

function closeRemoveChildModal() {
  document.getElementById('remove-child-modal').style.display = 'none';
  childToRemoveId = null;
  childToRemoveName = null;
}

async function confirmRemoveChild() {
  if (!childToRemoveId) return;
  const confirmBtn = document.getElementById('confirm-remove-child');

  try {
    confirmBtn.textContent = 'Removing...';
    confirmBtn.disabled = true;

    await removeSingleChild(
      currentUserId,
      currentUserData.assignedDriver,
      childToRemoveId
    );

    closeRemoveChildModal();

    await loadChildren(currentUserId, 'children-list');

  } catch (error) {
    console.error('Error removing child:', error);
  } finally {
    confirmBtn.textContent = 'Remove';
    confirmBtn.disabled = false;
  }
}

// ── Expose functions to window ─────────────────────────────────────────────
window.openAddChildModal = openAddChildModal;
window.closeAddChildModal = closeAddChildModal;
window.confirmAddChild = confirmAddChild;
window.openRemoveChildModal = openRemoveChildModal;
window.closeRemoveChildModal = closeRemoveChildModal;
window.confirmRemoveChild = confirmRemoveChild;