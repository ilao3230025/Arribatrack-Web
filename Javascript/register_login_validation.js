const form = document.getElementById('form')
const firstname_input = document.getElementById('firstname_input')
const lastname_input = document.getElementById('lastname_input')
const email_input = document.getElementById('email_input')
const phone_input = document.getElementById('phone_input')
const password_input = document.getElementById('password_input')
const repeat_password_input = document.getElementById('repeat_password_input')
const error_message = document.getElementById('error-message')

form.addEventListener('submit', (e) => {
    let errors = []

    if(firstname_input){
        //if we have a firstname input, then we are in the signup
        errors = getSignupFormErrors(firstname_input.value, lastname_input.value, email_input.value, phone_input.value, password_input.value, repeat_password_input.value)
    }
    else{
        //If we don't have a firstname input, then we are in the login
        errors = getLoginFormErrors(email_input.value, password_input.value)
    }

    if(errors.length > 0){
        //If there are any errors inside the array
        e.preventDefault()
        error_message.innerText = errors.join(". ")
    }
})

function getSignupFormErrors(firstname, lastname, email, phone, password, repeatPassword){
    let errors = []

    if(firstname === '' || firstname == null){
        errors.push('Firstname is required')
        firstname_input.parentElement.classList.add('incorrect')
    }
    if(lastname === '' || lastname == null){
        errors.push('Lastname is required')
        lastname_input.parentElement.classList.add('incorrect')
    } 
    if(email === '' || email == null){
        errors.push('Email is required')
        email_input.parentElement.classList.add('incorrect')
    }
    if(phone === '' || phone == null){
        errors.push('Contact Number is required')
        phone_input.parentElement.classList.add('incorrect')
    }
    if(password === '' || password == null){
        errors.push('Password is required')
        password_input.parentElement.classList.add('incorrect')
    }
    if(password.length < 8){
        errors.push('Password must have at least 8 characters')
        password_input.parentElement.classList.add('incorrect')
    } 
    if(password !== repeatPassword){
        errors.push('Password does not match repeated password')
        password_input.parentElement.classList.add('incorrect')
        repeat_password_input.parentElement.classList.add('incorrect')
    }

    return errors;
}

function getLoginFormErrors(email, password){
    let errors = []
    
    if(email === '' || email == null){
        errors.push('Email is required')
        email_input.parentElement.classList.add('incorrect')
    } 
    if(password === '' || password == null){
        errors.push('Password is required')
        password_input.parentElement.classList.add('incorrect')
    }

    return errors;
}

const allInputs = [firstname_input, lastname_input, email_input, phone_input, password_input, repeat_password_input].filter(input => input != null)

allInputs.forEach(input => {
    input.addEventListener('input', () => {
        if(input.parentElement.classList.contains('incorrect')){
            input.parentElement.classList.remove('incorrect')
            error_message.innerText = ''
        }
    })
})