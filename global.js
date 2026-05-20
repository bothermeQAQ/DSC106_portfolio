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

const THEME_STORAGE_KEY = 'portfolioTheme';
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: light)');

function resolveProjectImage(imagePath) {
  if (!imagePath || imagePath.startsWith('http') || imagePath.startsWith('/')) {
    return imagePath;
  }

  return BASE_PATH + imagePath.replace(/^\.\//, '');
}

function isPlaceholderProjectImage(imagePath) {
  return !imagePath || imagePath.includes('/empty.svg');
}

function getPrimaryProjectUrl(project) {
  return project.liveUrl || project.url || project.sourceUrl || '';
}

function createProjectMedia(project) {
  const primaryUrl = getPrimaryProjectUrl(project);
  const media = isPlaceholderProjectImage(project.image)
    ? createGeneratedProjectThumb(project)
    : createProjectImage(project);

  if (!primaryUrl) {
    return media;
  }

  const link = document.createElement('a');
  link.className = 'project-image-link';
  link.href = primaryUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.append(media);
  return link;
}

function createProjectImage(project) {
  const image = document.createElement('img');
  image.src = resolveProjectImage(project.image);
  image.alt = project.title;
  return image;
}

function createGeneratedProjectThumb(project) {
  const thumb = document.createElement('div');
  const label = document.createElement('span');
  const title = document.createElement('strong');
  const detail = document.createElement('span');

  thumb.className = 'project-generated-thumb';
  label.className = 'project-generated-thumb__label';
  title.className = 'project-generated-thumb__title';
  detail.className = 'project-generated-thumb__detail';

  label.textContent = project.category || 'Portfolio Project';
  title.textContent = project.title;
  detail.textContent = project.year;

  thumb.append(label, title, detail);
  return thumb;
}

function createProjectTitle(project, heading) {
  const primaryUrl = getPrimaryProjectUrl(project);

  if (!primaryUrl) {
    return heading;
  }

  const titleLink = document.createElement('a');
  titleLink.className = 'project-title-link';
  titleLink.href = primaryUrl;
  titleLink.target = '_blank';
  titleLink.rel = 'noopener';
  titleLink.append(heading);
  return titleLink;
}

function createProjectMeta(project) {
  const meta = document.createElement('p');
  const year = document.createElement('span');

  meta.className = 'project-meta';
  year.className = 'project-year';
  year.textContent = project.year;
  meta.append(year);

  if (project.category) {
    const category = document.createElement('span');
    category.className = 'project-category';
    category.textContent = project.category;
    meta.append(category);
  }

  return meta;
}

function createProjectTags(project) {
  if (!Array.isArray(project.tags) || project.tags.length === 0) {
    return null;
  }

  const tags = document.createElement('ul');
  tags.className = 'project-tags';

  for (const tag of project.tags.slice(0, 8)) {
    const item = document.createElement('li');
    item.textContent = tag;
    tags.append(item);
  }

  return tags;
}

function createProjectActions(project) {
  const actions = document.createElement('div');
  actions.className = 'project-actions';

  const links = [
    { url: project.liveUrl || project.url, label: 'View Live' },
    { url: project.sourceUrl, label: 'Source' }
  ].filter((link, index, linksGiven) => {
    return link.url && linksGiven.findIndex((candidate) => candidate.url === link.url) === index;
  });

  for (const link of links) {
    const anchor = document.createElement('a');
    anchor.className = 'project-visit-link';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.textContent = link.label;
    actions.append(anchor);
  }

  return actions.children.length > 0 ? actions : null;
}

function getStoredTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const legacyTheme = localStorage.getItem('colorScheme');

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      return legacyTheme;
    }
  } catch {
    return null;
  }

  return null;
}

function getSystemTheme() {
  return systemThemeQuery.matches ? 'light' : 'dark';
}

function applyTheme(theme, { persist = false } = {}) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage failures; the visible theme should still change.
    }
  }

  window.dispatchEvent(
    new CustomEvent('portfolio-theme-change', {
      detail: { theme: nextTheme }
    })
  );

  return nextTheme;
}

function renderThemeToggle(container) {
  const button = document.createElement('button');
  const icon = document.createElement('span');
  const text = document.createElement('span');

  button.type = 'button';
  button.className = 'theme-toggle';
  icon.className = 'theme-toggle__icon';
  text.className = 'theme-toggle__text';
  icon.setAttribute('aria-hidden', 'true');

  button.append(icon, text);
  container.append(button);

  function update(theme) {
    const label = theme === 'light' ? 'Light' : 'Dark';
    const nextLabel = theme === 'light' ? 'dark' : 'light';

    text.textContent = label;
    button.dataset.theme = theme;
    button.setAttribute('aria-pressed', String(theme === 'light'));
    button.setAttribute('aria-label', `Switch to ${nextLabel} theme`);
  }

  button.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    update(applyTheme(nextTheme, { persist: true }));
  });

  window.addEventListener('portfolio-theme-change', (event) => {
    update(event.detail.theme);
  });

  update(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
}

applyTheme(getStoredTheme() || document.documentElement.dataset.theme || getSystemTheme());

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

renderThemeToggle(nav);

systemThemeQuery.addEventListener('change', () => {
  if (!getStoredTheme()) {
    applyTheme(getSystemTheme());
  }
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
    article.className = 'project-card';

    if (project.featured) {
      article.classList.add('project-card--featured');
    }

    if (project.category) {
      article.dataset.category = project.category;
    }

    const heading = document.createElement(headingLevel);
    heading.textContent = project.title;

    const description = document.createElement('p');
    description.className = 'project-description';
    description.textContent = project.description;

    const cardParts = [
      createProjectTitle(project, heading),
      createProjectMedia(project),
      createProjectMeta(project),
      description
    ];

    if (project.result) {
      const result = document.createElement('p');
      result.className = 'project-result';
      result.textContent = project.result;
      cardParts.push(result);
    }

    const tags = createProjectTags(project);
    const actions = createProjectActions(project);

    if (tags) {
      cardParts.push(tags);
    }

    if (actions) {
      cardParts.push(actions);
    }

    article.append(...cardParts);
    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
