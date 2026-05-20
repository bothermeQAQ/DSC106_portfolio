import { fetchJSON, renderProjects } from '../global.js?v=portfolio-v2-20260520d';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json?v=portfolio-v2-20260520d');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('#projects-search');
const projectChartPalette = [
  'var(--chart-bar-strong)',
  'var(--chart-dot)',
  'var(--chart-highlight)',
  'var(--chart-bar-muted)'
];
let query = '';

function getProjectsByYear(projectsGiven) {
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

function renderProjectsBarChart(projectsGiven) {
  const data = getProjectsByYear(projectsGiven);
  const svg = d3.select('#projects-bar-plot');
  const legend = d3.select('.chart-legend');
  const width = 720;
  const height = 360;
  const margin = { top: 26, right: 170, bottom: 62, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxValue = d3.max(data, (d) => d.value) ?? 1;
  const maxBar = data.find((d) => d.value === maxValue);

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => String(d.label)))
    .range([0, innerWidth])
    .padding(0.22);

  const yScale = d3
    .scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([innerHeight, 0]);

  const colorScale = d3
    .scaleOrdinal(projectChartPalette)
    .domain(data.map((d) => String(d.label)));

  svg.attr('viewBox', `0 0 ${width} ${height}`).selectAll('*').remove();

  const chart = svg
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  chart
    .selectAll('rect.bar')
    .data(data)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', (d) => xScale(String(d.label)))
    .attr('y', (d) => yScale(d.value))
    .attr('width', xScale.bandwidth())
    .attr('height', (d) => innerHeight - yScale(d.value))
    .attr('fill', (d) => colorScale(String(d.label)));

  chart
    .append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale));

  chart
    .append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickValues(d3.range(0, maxValue + 1))
        .tickFormat((d) => (Number.isInteger(d) ? d : ''))
    );

  chart
    .append('text')
    .attr('class', 'axis-label')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 46)
    .attr('text-anchor', 'middle')
    .text('Year');

  chart
    .append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -48)
    .attr('text-anchor', 'middle')
    .text('Number of Projects');

  if (maxBar) {
    const x = xScale(String(maxBar.label));
    const y = yScale(maxBar.value);
    const barCenterX = x + xScale.bandwidth() / 2;
    const labelX = barCenterX + 56;
    const labelY = Math.max(y - 24, 14);

    chart
      .append('rect')
      .attr('class', 'annotation-outline')
      .attr('x', x)
      .attr('y', y)
      .attr('width', xScale.bandwidth())
      .attr('height', innerHeight - y)
      .attr('fill', 'none');

    chart
      .append('line')
      .attr('class', 'annotation-line')
      .attr('x1', barCenterX)
      .attr('y1', y)
      .attr('x2', labelX - 8)
      .attr('y2', labelY)
      .attr('marker-end', 'url(#arrow)');

    chart
      .append('text')
      .attr('class', 'annotation')
      .attr('x', labelX)
      .attr('y', labelY)
      .attr('dominant-baseline', 'middle')
      .text(`${maxBar.label}: ${maxBar.value} projects`);
  }

  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 5)
    .attr('refY', 5)
    .attr('markerWidth', 5)
    .attr('markerHeight', 5)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('class', 'annotation-arrow');

  legend.selectAll('li').remove();
  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (d) => `--color: ${colorScale(String(d.label))}`)
    .html((d) => `<span class="swatch"></span><span>${d.label} (${d.value})</span>`);
}

function renderProjectCards() {
  const projectsByQuery = getProjectsByQuery(projects, query);
  renderProjects(projectsByQuery, projectsContainer, 'h2');
}

const projectsTitle = document.querySelector('.projects-title');

if (projectsTitle) {
  projectsTitle.textContent = `${projects.length} Projects`;
}

renderProjectsBarChart(projects);
renderProjectCards();

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();
    renderProjectCards();
  });
}
