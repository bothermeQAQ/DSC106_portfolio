console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/bothermeQAQ', title: 'GitHub Profile' }
];

const BASE_PATH =
  location.hostname === '127.0.0.1' || location.hostname === 'localhost'
    ? '/lab-1/portfolio/'
    : '/DSC106_portfolio/';

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  let a = document.createElement('a');

  if (url.startsWith('http')) {
    a.href = url;
    a.target = '_blank';
  } else {
    a.href = BASE_PATH + url;
  }

  a.textContent = title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

let select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
}

if ('colorScheme' in localStorage) {
  let savedColorScheme = localStorage.colorScheme;
  setColorScheme(savedColorScheme);
  select.value = savedColorScheme;
}

select.addEventListener('input', function (event) {
  let colorScheme = event.target.value;
  setColorScheme(colorScheme);
  localStorage.colorScheme = colorScheme;
});

let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let url = form.action + '?';
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  url += params.join('&');
  location.href = url;
});