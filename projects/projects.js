import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('#projects-search');
let query = '';
let selectedIndex = -1;
let currentPieData = [];

function getPieData(projectsGiven) {
  const rolledData = d3.rollups(projectsGiven, (v) => v.length, (d) => d.year);
  return rolledData
    .map(([year, count]) => ({ value: count, label: year }))
    .sort((a, b) => d3.ascending(a.label, b.label));
}

function getProjectsByQuery(projectsGiven, queryGiven) {
  return projectsGiven.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(queryGiven);
  });
}

function syncSelectedIndex(nextPieData) {
  if (selectedIndex === -1) {
    currentPieData = nextPieData;
    return;
  }

  const selectedYear = currentPieData[selectedIndex]?.label;

  if (!selectedYear) {
    selectedIndex = -1;
    currentPieData = nextPieData;
    return;
  }

  const remappedIndex = nextPieData.findIndex((item) => item.label === selectedYear);
  selectedIndex = remappedIndex;
  currentPieData = nextPieData;
}

function getVisibleProjects(projectsByQuery, pieDataGiven) {
  if (selectedIndex === -1) {
    return projectsByQuery;
  }

  const selectedYear = pieDataGiven[selectedIndex]?.label;

  if (!selectedYear) {
    selectedIndex = -1;
    return projectsByQuery;
  }

  return projectsByQuery.filter((project) => String(project.year) === String(selectedYear));
}

function renderPieChart(pieDataGiven) {
  const data = pieDataGiven;

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const pieGenerator = d3.pie().value((d) => d.value);
  const arcs = pieGenerator(data);
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map((d) => d.label));

  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  svg
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d) => colorScale(d.data.label))
    .classed('selected', (_, i) => i === selectedIndex)
    .on('click', (_, d) => {
      const clickedIndex = data.findIndex((item) => item.label === d.data.label);
      selectedIndex = selectedIndex === clickedIndex ? -1 : clickedIndex;
      renderProjectsAndChart();
    });

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (d) => `--color: ${colorScale(d.label)}`)
    .classed('selected', (_, i) => i === selectedIndex)
    .html((d) => `<span class="swatch"></span><span>${d.label} (${d.value})</span>`);
}

function renderProjectsAndChart() {
  const projectsByQuery = getProjectsByQuery(projects, query);
  const pieData = getPieData(projectsByQuery);

  syncSelectedIndex(pieData);

  const visibleProjects = getVisibleProjects(projectsByQuery, pieData);
  renderProjects(visibleProjects, projectsContainer, 'h2');
  renderPieChart(pieData);
}

const projectsTitle = document.querySelector('.projects-title');

if (projectsTitle) {
  projectsTitle.textContent = `${projects.length} Projects`;
}

renderProjectsAndChart();

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();
    renderProjectsAndChart();
  });
}
