const check = document.querySelector('#check')
const input = document.querySelector('input')
const message = document.querySelector('#message')
const p = document.querySelector('p')
const submit = document.querySelector('#submit')

const URI = document.currentScript.getAttribute('uri')

async function checkUsername() {
  const res = await fetch(`${URI}/api/profiles/check`, {
    method: 'POST',
    body: JSON.stringify({ username: input.value }),
    headers: {
      'Content-type': 'application/json',
    },
  })
  const body = await res.json()
  return body
}

function displayMessage(isAvailable) {
  if (isAvailable) {
    p.textContent = 'Username is available'
    submit.style.display = 'block'
  } else {
    p.textContent = 'Username is not available'
    submit.style.display = 'none'
  }
}

async function submitUsername() {
  const res = await fetch(`${URI}/api/profiles/submit`, {
    method: 'POST',
    body: JSON.stringify({
      email: '${email}',
      username: input.value,
    }),
    headers: {
      'Content-type': 'application/json',
    },
  })
  const body = await res.json()
  return body
}

check.addEventListener('click', async (e) => {
  const res = await checkUsername()
  displayMessage(res.data.available)
})

submit.addEventListener('click', async (e) => {
  const res = await submitUsername()
  if (res.status === 'success') {
    window.location.href = URI + '/' + input.value
  }
})
