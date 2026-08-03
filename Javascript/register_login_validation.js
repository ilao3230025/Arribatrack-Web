import { auth, db } from "./firebaseauth.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { setDoc, doc, getDocs, collection, query, where} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Element references
const form = document.getElementById('form');
const firstname_input = document.getElementById('firstname_input');
const lastname_input = document.getElementById('lastname_input');
const email_input = document.getElementById('email_input');
const phone_input = document.getElementById('phone_input');
const role_input = document.getElementById('role_input');
const driver_select = document.getElementById('driver_select');
const driver_select_div = document.getElementById('driver-select-div');
const plate_input = document.getElementById('plate_input');
const plate_number_div = document.getElementById('plate-number-div');
const password_input = document.getElementById('password_input');
const repeat_password_input = document.getElementById('repeat_password_input');
const error_message = document.getElementById('error-message');

// Show/hide fields based on role selection
if (role_input) {
  role_input.addEventListener('change', async () => {
    const selectedRole = role_input.value;

    // Reset both fields
    driver_select_div.style.display = 'none';
    plate_number_div.style.display = 'none';

    if (selectedRole === 'parent') {
      driver_select_div.style.display = 'flex';
      await loadDriversIntoSelect(); // fetch drivers from Firestore
    } else if (selectedRole === 'driver') {
      plate_number_div.style.display = 'flex';
    }
  });
}

// Load drivers from Firestore into the select dropdown
async function loadDriversIntoSelect() {
  try {
    driver_select.innerHTML = '<option value="" disabled selected>Loading drivers...</option>';

    const driversQuery = query(
      collection(db, 'users'),
      where('role', '==', 'driver')
    );

    const driversSnapshot = await getDocs(driversQuery);

    if (driversSnapshot.empty) {
      driver_select.innerHTML = '<option value="" disabled selected>No drivers available</option>';
      return;
    }

    driver_select.innerHTML = '<option value="" disabled selected>Select your Driver</option>';

    driversSnapshot.forEach((driverDoc) => {
      const driver = driverDoc.data();
      const option = document.createElement('option');
      option.value = driverDoc.id; // store driver's UID as value
      option.textContent = `${driver.firstName} ${driver.lastName}${driver.plateNumber ? ' — ' + driver.plateNumber : ''}`;
      driver_select.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading drivers:', error);
    driver_select.innerHTML = '<option value="" disabled selected>Error loading drivers</option>';
  }
}

// Message helper
function showMessage(message, divId) {
  const messageDiv = document.getElementById(divId);
  if (!messageDiv) return;
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = 1;
  setTimeout(() => {
    messageDiv.style.opacity = 0;
  }, 5000);
}

// Validation functions
function getSignupFormErrors(firstname, lastname, email, phone, role, password, repeatPassword) {
  let errors = [];

  if (!firstname) {
    errors.push('Firstname is required');
    firstname_input.parentElement.classList.add('incorrect');
  }
  if (!lastname) {
    errors.push('Lastname is required');
    lastname_input.parentElement.classList.add('incorrect');
  }
  if (!email) {
    errors.push('Email is required');
    email_input.parentElement.classList.add('incorrect');
  }
  if (!phone) {
    errors.push('Contact number is required');
    phone_input.parentElement.classList.add('incorrect');
  }
  if (!role) {
    errors.push('Please select a role');
    role_input.parentElement.classList.add('incorrect');
  }
  if (!password) {
    errors.push('Password is required');
    password_input.parentElement.classList.add('incorrect');
  }
  // Validate driver selection if parent
  if (role === 'parent' && driver_select && !driver_select.value) {
    errors.push('Please select your assigned driver');
    driver_select.parentElement.classList.add('incorrect');
  }
  // Validate plate number if driver
  if (role === 'driver' && plate_input && !plate_input.value.trim()) {
    errors.push('Please enter your plate number');
    plate_input.parentElement.classList.add('incorrect');
  }
  if (password && password.length < 8) {
    errors.push('Password must have at least 8 characters');
    password_input.parentElement.classList.add('incorrect');
  }
  if (password !== repeatPassword) {
    errors.push('Passwords do not match');
    password_input.parentElement.classList.add('incorrect');
    repeat_password_input.parentElement.classList.add('incorrect');
  }

  return errors;
}

function getLoginFormErrors(email, password) {
  let errors = [];

  if (!email) {
    errors.push('Email is required');
    email_input.parentElement.classList.add('incorrect');
  }
  if (!password) {
    errors.push('Password is required');
    password_input.parentElement.classList.add('incorrect');
  }

  return errors;
}

// Form submit handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Determine if register or login based on presence of firstname input
  const isRegister = firstname_input !== null;

  if (isRegister) {
    // REGISTER
    const errors = getSignupFormErrors(
      firstname_input.value,
      lastname_input.value,
      email_input.value,
      phone_input.value,
      role_input.value,
      password_input.value,
      repeat_password_input.value
    );

    if (errors.length > 0) {
      error_message.innerText = errors.join('. ');
      return;
    }

    // Validation passed — proceed with Firebase registration
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email_input.value,
        password_input.value
      );

      const user = userCredential.user;
      const userData = {
        firstName: firstname_input.value,
        lastName: lastname_input.value,
        email: email_input.value,
        phone: phone_input.value,
        role: role_input.value,

      // Save assignedDriver if parent
      ...(role_input.value === 'parent' && driver_select?.value
        ? { assignedDriver: driver_select.value }
        : {}),

      // Save plateNumber if driver
      ...(role_input.value === 'driver' && plate_input?.value
        ? { plateNumber: plate_input.value.trim() }
        : {})
      };

      await setDoc(doc(db, "users", user.uid), userData);
      showMessage('Account created successfully', 'registerMessage');

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        showMessage('Email address already exists', 'registerMessage');
      } else {
        showMessage('Unable to create account', 'registerMessage');
        console.error(error);
      }
    }

  } else {
    // LOGIN 
    const errors = getLoginFormErrors(
      email_input.value,
      password_input.value
    );

    if (errors.length > 0) {
      error_message.innerText = errors.join('. ');
      return;
    }

    // Validation passed — proceed with Firebase login
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email_input.value,
        password_input.value
      );

      const user = userCredential.user;
      localStorage.setItem('loggedInUserId', user.uid);
      showMessage('Login successful', 'signInMessage');

      setTimeout(() => {
        window.location.href = 'arribatrack_dashboard.html';
      }, 1500);

    } catch (error) {
      if (error.code === 'auth/invalid-credential') {
        showMessage('Incorrect email or password', 'signInMessage');
      } else {
        showMessage('Unable to sign in', 'signInMessage');
        console.error(error);
      }
    }
  }
});

//Clear incorrect state on input
const allInputs = [
  firstname_input,
  lastname_input,
  email_input,
  phone_input,
  role_input,
  driver_select,
  plate_input,
  password_input,
  repeat_password_input
].filter(input => input !== null);

allInputs.forEach(input => {
  const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
  input.addEventListener(eventType, () => {
    if (input.parentElement.classList.contains('incorrect')) {
      input.parentElement.classList.remove('incorrect');
      error_message.innerText = '';
    }
  });
});