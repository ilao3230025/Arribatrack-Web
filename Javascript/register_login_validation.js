import { auth, db } from "./firebaseauth.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Element references
const form = document.getElementById('form');
const firstname_input = document.getElementById('firstname_input');
const lastname_input = document.getElementById('lastname_input');
const email_input = document.getElementById('email_input');
const phone_input = document.getElementById('phone_input');
const password_input = document.getElementById('password_input');
const repeat_password_input = document.getElementById('repeat_password_input');
const error_message = document.getElementById('error-message');

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
function getSignupFormErrors(firstname, lastname, email, phone, password, repeatPassword) {
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
  if (!password) {
    errors.push('Password is required');
    password_input.parentElement.classList.add('incorrect');
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
        phone: phone_input.value
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
  password_input,
  repeat_password_input
].filter(input => input !== null);

allInputs.forEach(input => {
  input.addEventListener('input', () => {
    if (input.parentElement.classList.contains('incorrect')) {
      input.parentElement.classList.remove('incorrect');
      error_message.innerText = '';
    }
  });
});