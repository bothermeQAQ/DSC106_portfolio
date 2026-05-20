import { fetchJSON, renderProjects, fetchGitHubData } from './global.js?v=portfolio-v2-20260520d';

const projects = await fetchJSON('./lib/projects.json?v=portfolio-v2-20260520d');
const featuredProjects = projects.filter((project) => project.featured);
const latestProjects = [...featuredProjects, ...projects.filter((project) => !project.featured)].slice(0, 3);
const projectsContainer = document.querySelector('.projects');
const githubData = await fetchGitHubData('bothermeQAQ');
const profileStats = document.querySelector('#profile-stats');

renderProjects(latestProjects, projectsContainer, 'h2');

if (profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}
