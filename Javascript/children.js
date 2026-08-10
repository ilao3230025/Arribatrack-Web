import { auth, db } from "./firebaseauth.js";
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// ── Child Form Counter ─────────────────────────────────────────────────────
let childFormCount = 0;

// ── Add Child Form (used in first login modal on dashboard) ────────────────
export function addChildForm(existingData = null) {
  childFormCount++;
  const formId = `child-form-${childFormCount}`;
  const container = document.getElementById('children-form-list');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'child-form';
  div.id = formId;
  div.innerHTML = `
    <button class="remove-child-button" onclick="removeChildForm('${formId}')">✕</button>
    <label>Child's Full Name</label>
    <input type="text" class="child-name" placeholder="e.g. Juan dela Cruz"
      value="${existingData?.name || ''}">
    <label>Grade Level</label>
    <select class="child-grade">
      <option value="" disabled ${!existingData ? 'selected' : ''}>Select Grade</option>
      ${['Nursery','Kinder','Prep','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6',
         'Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']
        .map(g => `<option value="${g}" ${existingData?.grade === g ? 'selected' : ''}>${g}</option>`)
        .join('')}
    </select>
    <label>Section</label>
    <input type="text" class="child-section" placeholder="e.g. Sampaguita"
      value="${existingData?.section || ''}">
  `;

  container.appendChild(div);
}

// ── Remove Child Form ──────────────────────────────────────────────────────
export function removeChildForm(formId) {
  const form = document.getElementById(formId);
  if (form) form.remove();
}

// ── Save Children (first login) ────────────────────────────────────────────
export async function saveChildren(userId, assignedDriverId) {
  const errorEl = document.getElementById('first-login-error');
  const childForms = document.querySelectorAll('.child-form');

  if (childForms.length === 0) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Please add at least one child.';
    return false;
  }

  const children = [];
  let hasError = false;

  childForms.forEach((form) => {
    const name = form.querySelector('.child-name').value.trim();
    const grade = form.querySelector('.child-grade').value;
    const section = form.querySelector('.child-section').value.trim();

    if (!name || !grade || !section) {
      hasError = true;
      return;
    }
    children.push({ name, grade, section });
  });

  if (hasError) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Please fill in all fields for each child.';
    return false;
  }

  try {
    for (const child of children) {
      const childRef = await addDoc(
        collection(db, 'users', userId, 'children'),
        { ...child, parentId: userId }
      );

      if (assignedDriverId) {
        await addDoc(
          collection(db, 'users', assignedDriverId, 'students'),
          {
            ...child,
            parentId: userId,
            childId: childRef.id,
            attendance: 'present'
          }
        );
      }
    }
    return true;

  } catch (error) {
    console.error('Error saving children:', error);
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'Error saving. Please try again.';
    }
    return false;
  }
}

// ── Load Children into a list ──────────────────────────────────────────────
export async function loadChildren(userId, listElementId, onRemove) {
  const childrenList = document.getElementById(listElementId);
  if (!childrenList) return;

  childrenList.innerHTML =
    '<li style="opacity:0.5; font-size:0.85rem; text-align:left;">Loading...</li>';

  try {
    const childrenSnapshot = await getDocs(
      collection(db, 'users', userId, 'children')
    );

    childrenList.innerHTML = '';

    if (childrenSnapshot.empty) {
      childrenList.innerHTML =
        '<li style="opacity:0.5; font-size:0.85rem; text-align:left; padding: 8px 0;">No children added yet.</li>';
      return;
    }

    childrenSnapshot.forEach((childDoc) => {
      const child = childDoc.data();
      const childId = childDoc.id;

      const li = document.createElement('li');
      li.className = 'child-item';
      li.id = `child-item-${childId}`;
      li.innerHTML = `
        <div class="child-item-info">
          <span class="child-item-name">${child.name}</span>
          <span class="child-item-details">${child.grade} — ${child.section}</span>
        </div>
        <button class="remove-child-btn"
          onclick="openRemoveChildModal('${childId}', '${child.name}')">
          Remove
        </button>
      `;
      childrenList.appendChild(li);
    });

  } catch (error) {
    console.error('Error loading children:', error);
    childrenList.innerHTML =
      '<li style="color:#e74c3c; font-size:0.85rem;">Error loading children.</li>';
  }
}

// ── Add Single Child (settings page) ──────────────────────────────────────
export async function addSingleChild(userId, assignedDriverId, name, grade, section) {
  const childRef = await addDoc(
    collection(db, 'users', userId, 'children'),
    { name, grade, section, parentId: userId }
  );

  if (assignedDriverId) {
    await addDoc(
      collection(db, 'users', assignedDriverId, 'students'),
      {
        name, grade, section,
        parentId: userId,
        childId: childRef.id,
        attendance: 'present'
      }
    );
  }

  return childRef.id;
}

// ── Remove Single Child ────────────────────────────────────────────────────
export async function removeSingleChild(userId, assignedDriverId, childId) {
  // Remove from parent's children subcollection
  await deleteDoc(doc(db, 'users', userId, 'children', childId));

  // Remove matching student from driver's students subcollection
  if (assignedDriverId) {
    const studentsSnapshot = await getDocs(
      collection(db, 'users', assignedDriverId, 'students')
    );

    for (const studentDoc of studentsSnapshot.docs) {
      if (studentDoc.data().childId === childId) {
        await deleteDoc(
          doc(db, 'users', assignedDriverId, 'students', studentDoc.id)
        );
        break;
      }
    }
  }
}