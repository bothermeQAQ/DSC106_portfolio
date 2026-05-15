console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'meta/', title: 'Meta' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/bothermeQAQ', title: 'GitHub Profile' }
];

const BASE_PATH =
  location.hostname === '127.0.0.1' || location.hostname === 'localhost'
    ? '/lab-1/portfolio/'
    : '/DSC106_portfolio/';

function resolveProjectImage(imagePath) {
  if (!imagePath || imagePath.startsWith('http') || imagePath.startsWith('/')) {
    return imagePath;
  }

  return BASE_PATH + imagePath.replace(/^\.\//, '');
}

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

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    return;
  }

  containerElement.innerHTML = '';

  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.textContent = 'No projects available.';
    return;
  }

  for (let project of projects) {
    const article = document.createElement('article');
    const heading = document.createElement(headingLevel);
    heading.textContent = project.title;

    const image = document.createElement('img');
    image.src = resolveProjectImage(project.image);
    image.alt = project.title;

    const description = document.createElement('p');
    description.className = 'project-description';
    description.textContent = project.description;

    const year = document.createElement('p');
    year.className = 'project-year';
    year.textContent = project.year;

    if (project.url) {
      const titleLink = document.createElement('a');
      titleLink.className = 'project-title-link';
      titleLink.href = project.url;
      titleLink.target = '_blank';
      titleLink.rel = 'noopener';
      titleLink.append(heading);

      const imageLink = document.createElement('a');
      imageLink.className = 'project-image-link';
      imageLink.href = project.url;
      imageLink.target = '_blank';
      imageLink.rel = 'noopener';
      imageLink.append(image);

      const visitLink = document.createElement('a');
      visitLink.className = 'project-visit-link';
      visitLink.href = project.url;
      visitLink.target = '_blank';
      visitLink.rel = 'noopener';
      visitLink.textContent = 'Open project';

      article.append(titleLink, imageLink, description, year, visitLink);
    } else {
      article.append(heading, image, description, year);
    }

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
