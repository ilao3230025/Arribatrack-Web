  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
  import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js"
  import {getFirestore, setDoc, doc} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"

  const firebaseConfig = {
    apiKey: "AIzaSyAeYi2ykobg43kBlqTTdO6-yathwPSy-H4",
    authDomain: "arribatrack-46da4.firebaseapp.com",
    databaseURL: "https://arribatrack-46da4-default-rtdb.firebaseio.com",
    projectId: "arribatrack-46da4",
    storageBucket: "arribatrack-46da4.firebasestorage.app",
    messagingSenderId: "269383688596",
    appId: "1:269383688596:web:845c0dc9a4ad80ed7eaf81",
    measurementId: "G-DYG3X35B7B"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  //Input Message
  function showMessage(message, divId){
    var messageDiv=document.getElementById(divId);
    messageDiv.style.display="block";
    messageDiv.innerHTML=message;
    messageDiv.style.opacity=1;
    setTimeout(function(){
       messageDiv.style.opacity=0;
    }, 5000)
  }

  //Register Functionality
  const register=document.getElementById('submitRegister');
  if (register){
  register.addEventListener('click', (event)=>{
    event.preventDefault()
    const firstName=document.getElementById('firstname_input').value;
    const lastName=document.getElementById('lastname_input').value;
    const email=document.getElementById('email_input').value;
    const phone=document.getElementById('phone_input').value;
    const password=document.getElementById('password_input').value;

    const auth=getAuth();
    const db=getFirestore();

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential)=>{
      const user=userCredential.user;
      const userData={
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone
      };
      showMessage('Account Created Successfully', 'registerMessage');
      const docRef=doc(db, "users", user.uid);
      setDoc(docRef, userData)
      .then(()=>{
        window.location.href='index.html';
      })
      .catch((error)=>{
        console.error("error writing document", error);
      });
    })
    .catch((error)=>{
      const errorCode=error.code;
      if(errorCode=='auth/email-already-in-use'){
        showMessage('Email Address Already Exists', 'registerMessage');
      }
      else{
        showMessage('Unable to create User', 'registerMessage');
      }
    })
  });
  }

  //SignIn Functionality
  const signIn=document.getElementById('submitSignIn');
  if (signIn){
  signIn.addEventListener('click', (event)=>{
    event.preventDefault()
    const email=document.getElementById('email_input').value;
    const password=document.getElementById('password_input').value;
    const auth=getAuth();

    signInWithEmailAndPassword(auth, email, password)
    .then((userCredential)=>{
      showMessage('Login is successful', 'signInMessage');
      const user=userCredential.user;
      localStorage.setItem('loggedInUserId', user.uid);
      window.location.href='arribatrack_dashboard.html';
    })
    .catch((error)=>{
      const errorCode=error.code;
      if(errorCode==='auth/invalid-credential'){
        showMessage('Incorrect Email or Password', 'signInMessage');
      }
    })
  });
  }