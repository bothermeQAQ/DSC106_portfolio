import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

const repoUrl = 'https://github.com/bothermeQAQ/DSC106_portfolio';
const formatInteger = d3.format(',');
const colors = d3.scaleOrdinal(d3.schemeTableau10);

let commitProgress = 100;
let timeScale;
let commitMaxTime;
let data = [];
let commits = [];
let filteredCommits = [];
let scroller;
let fileScroller;

const chartConfig = {
  width: 1000,
  height: 600,
  margin: { top: 24, right: 28, bottom: 46, left: 54 }
};

const chartState = {
  svg: null,
  dots: null,
  brush: null,
  brushGroup: null,
  xScale: null,
  yScale: null,
  usableArea: null,
  currentCommits: [],
  currentSelection: null
};

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateTime(date, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  return date.toLocaleString([], options);
}

async function loadData() {
  return d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(`${row.date}T00:00${row.timezone}`),
    datetime: new Date(row.datetime)
  }));
}

function processCommits(rows) {
  return d3
    .groups(rows, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: `${repoUrl}/commit/${commit}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: false,
        writable: false,
        enumerable: false
      });

      return ret;
    })
    .sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function getLinesForCommits(commitsToUse) {
  return commitsToUse.flatMap((d) => d.lines);
}

function getFilesForCommits(commitsToUse) {
  const lines = getLinesForCommits(commitsToUse);

  return d3
    .groups(lines, (d) => d.file)
    .map(([name, fileLines]) => ({
      name,
      lines: d3.sort(fileLines, (d) => d.line)
    }))
    .sort(
      (a, b) =>
        d3.descending(a.lines.length, b.lines.length) || d3.ascending(a.name, b.name)
    );
}

function getCommitFileCount(commit) {
  return new Set(commit.lines.map((line) => line.file)).size;
}

function renderCommitInfo(rows, commitsToUse) {
  const stats = d3.select('#stats');
  stats.selectAll('*').remove();

  const dl = stats.append('dl').attr('class', 'stats');
  const addStat = (label, value) => {
    dl.append('dt').html(label);
    dl.append('dd').text(value);
  };

  const files = d3.rollups(rows, (v) => v.length, (d) => d.file);
  const longestFile = d3.greatest(files, (d) => d[1]);
  const authors = d3.group(rows, (d) => d.author).size;
  const avgLineLength = d3.mean(rows, (d) => d.length) ?? 0;
  const maxDepth = d3.max(rows, (d) => d.depth) ?? 0;
  const busiestHour = d3.greatest(
    d3.rollups(commitsToUse, (v) => v.length, (d) => d.datetime.getHours()),
    (d) => d[1]
  );

  addStat('Total <abbr title="Lines of code">LOC</abbr>', formatInteger(rows.length));
  addStat('Total commits', formatInteger(commitsToUse.length));
  addStat('Files', formatInteger(files.length));
  addStat('Authors', formatInteger(authors));
  addStat('Longest file', longestFile ? `${longestFile[0]} (${longestFile[1]} lines)` : 'N/A');
  addStat('Average line length', d3.format('.1f')(avgLineLength));
  addStat('Maximum depth', maxDepth);
  addStat('Busiest commit hour', busiestHour ? `${busiestHour[0]}:00 (${busiestHour[1]} commits)` : 'N/A');
}

function renderTooltipContent(commit) {
  const tooltip = d3.select('#commit-tooltip');
  const date = commit.datetime.toLocaleDateString();
  const time = commit.datetime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  tooltip.html(`
    <dl>
      <dt>Commit</dt>
      <dd><a href="${commit.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(commit.id)}</a></dd>
      <dt>Date</dt>
      <dd>${escapeHTML(date)}</dd>
      <dt>Time</dt>
      <dd>${escapeHTML(time)} ${escapeHTML(commit.timezone)}</dd>
      <dt>Author</dt>
      <dd>${escapeHTML(commit.author)}</dd>
      <dt>Lines edited</dt>
      <dd>${formatInteger(commit.totalLines)}</dd>
    </dl>
  `);
}

function updateTooltipVisibility(isVisible) {
  d3.select('#commit-tooltip')
    .classed('visible', isVisible)
    .attr('aria-hidden', String(!isVisible));
}

function updateTooltipPosition(event) {
  d3.select('#commit-tooltip')
    .style('left', `${event.clientX + 14}px`)
    .style('top', `${event.clientY + 14}px`);
}

function renderSelectionCount(selectedCommits) {
  const count = selectedCommits.length;
  d3.select('#selection-count').text(
    count === 0 ? 'No commits selected' : `${count} commit${count === 1 ? '' : 's'} selected`
  );
}

function renderLanguageBreakdown(selectedCommits) {
  const container = d3.select('#language-breakdown');
  container.selectAll('*').remove();

  if (selectedCommits.length === 0) {
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);
  const breakdown = d3.rollups(lines, (v) => v.length, (d) => d.type);

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    container.append('dt').text(language);
    container
      .append('dd')
      .text(`${formatInteger(count)} lines (${d3.format('.1~%')(proportion)})`);
  }
}

function getUsableArea() {
  const { width, height, margin } = chartConfig;

  return {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
}

function getPlotTimeDomain(commitsToUse) {
  const [minTime, maxTime] = d3.extent(commitsToUse, (d) => d.datetime);

  if (!minTime || !maxTime) {
    return timeScale ? timeScale.domain() : [new Date(), new Date()];
  }

  if (+minTime === +maxTime) {
    const fullDomain = timeScale ? timeScale.domain() : [minTime, maxTime];
    const padding = Math.max((fullDomain[1] - fullDomain[0]) * 0.02, 60 * 60 * 1000);
    return [new Date(+minTime - padding), new Date(+maxTime + padding)];
  }

  return [minTime, maxTime];
}

function getRadiusScale(commitsToUse) {
  const [minLines, maxLines] = d3.extent(commitsToUse, (d) => d.totalLines);
  const domainMax = maxLines ?? 1;

  return d3
    .scaleSqrt()
    .domain([Math.min(0, minLines ?? 0), domainMax || 1])
    .range([4, 28]);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }

  const [[x0, y0], [x1, y1]] = selection;
  const x = chartState.xScale(commit.datetime);
  const y = chartState.yScale(commit.hourFrac);
  return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function brushed(event) {
  chartState.currentSelection = event.selection;
  const selectedCommits = chartState.currentSelection
    ? chartState.currentCommits.filter((commit) => isCommitSelected(chartState.currentSelection, commit))
    : [];

  chartState.dots
    .selectAll('circle')
    .classed('selected', (commit) => selectedCommits.includes(commit));

  renderSelectionCount(selectedCommits);
  renderLanguageBreakdown(selectedCommits);
}

function showTooltip(event, commit) {
  d3.select(event.currentTarget).style('fill-opacity', 1);
  renderTooltipContent(commit);
  updateTooltipVisibility(true);
  updateTooltipPosition(event);
}

function hideTooltip(event) {
  d3.select(event.currentTarget).style('fill-opacity', 0.7);
  updateTooltipVisibility(false);
}

function bindCircleEvents(selection) {
  selection
    .on('pointerover', showTooltip)
    .on('pointermove', updateTooltipPosition)
    .on('pointerout', hideTooltip)
    .on('mouseover', showTooltip)
    .on('mousemove', updateTooltipPosition)
    .on('mouseout', hideTooltip);
}

function renderScatterPlot(rows, commitsToUse) {
  const { width, height } = chartConfig;
  const usableArea = getUsableArea();

  const chart = d3.select('#chart');
  chart.selectAll('*').remove();

  const svg = chart
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Scatterplot showing commits by date and time of day');

  const xScale = d3
    .scaleTime()
    .range([usableArea.left, usableArea.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => `${String(d).padStart(2, '0')}:00`)
    .tickValues(d3.range(0, 25, 3));

  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickValues(d3.range(0, 25, 3))
        .tickSize(-usableArea.width)
        .tickFormat('')
    );

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`);

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('x', (usableArea.left + usableArea.right) / 2)
    .attr('y', height - 8)
    .attr('text-anchor', 'middle')
    .text('Commit date');

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(usableArea.top + usableArea.bottom) / 2)
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .text('Time of day');

  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom]
    ])
    .on('start brush end', brushed);

  chartState.svg = svg;
  chartState.xScale = xScale;
  chartState.yScale = yScale;
  chartState.usableArea = usableArea;
  chartState.brush = brush;
  chartState.brushGroup = svg.append('g').attr('class', 'brush').call(brush);
  chartState.dots = svg.append('g').attr('class', 'dots');

  updateScatterPlot(rows, commitsToUse, { resetBrush: false });
}

function updateScatterPlot(rows, commitsToUse = filteredCommits, { resetBrush = true } = {}) {
  if (!chartState.svg || !chartState.dots) {
    return;
  }

  chartState.currentCommits = commitsToUse;
  chartState.xScale.domain(getPlotTimeDomain(commitsToUse)).nice();

  const xAxis = d3.axisBottom(chartState.xScale);
  const xAxisGroup = chartState.svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const rScale = getRadiusScale(commitsToUse);
  const sortedCommits = d3.sort(commitsToUse, (d) => -d.totalLines);

  const circles = chartState.dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => chartState.xScale(d.datetime))
    .attr('cy', (d) => chartState.yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7);

  bindCircleEvents(circles);

  if (resetBrush) {
    chartState.brushGroup.call(chartState.brush.move, null);
  }
}

function updateTimeDisplay() {
  const timeElement = d3.select('#commit-time');

  if (timeElement.empty() || !commitMaxTime) {
    return;
  }

  timeElement
    .attr('datetime', commitMaxTime.toISOString())
    .text(commitMaxTime.toLocaleString());
}

function updateFileDisplay(commitsToUse) {
  const files = getFilesForCommits(commitsToUse);
  const filesContainer = d3.select('#files');

  const fileRows = filesContainer
    .selectAll('div.file-row')
    .data(files, (d) => d.name)
    .join(
      (enter) => {
        const row = enter.append('div').attr('class', 'file-row');
        const term = row.append('dt');
        term.append('code');
        term.append('small');
        row.append('dd');
        return row;
      },
      (update) => update,
      (exit) => exit.remove()
    )
    .order();

  fileRows.select('dt > code').text((d) => d.name);
  fileRows
    .select('dt > small')
    .text((d) => `${formatInteger(d.lines.length)} line${d.lines.length === 1 ? '' : 's'}`);

  fileRows
    .select('dd')
    .selectAll('div.loc')
    .data((d) => d.lines, (line) => `${line.file}:${line.line}:${line.commit}`)
    .join('div')
    .attr('class', 'loc')
    .style('--color', (d) => colors(d.type))
    .attr('title', (d) => `${d.type} line ${d.line}`);
}

function setActiveStep(containerSelector, activeElement) {
  d3.select(containerSelector)
    .selectAll('.step')
    .classed('is-active', function () {
      return this === activeElement;
    });
}

function syncToCommitTime(maxTime, { resetBrush = true } = {}) {
  commitMaxTime = maxTime;
  commitProgress = Math.max(0, Math.min(100, timeScale(commitMaxTime)));
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  d3.select('#commit-progress').property('value', commitProgress);
  updateTimeDisplay();
  renderCommitInfo(getLinesForCommits(filteredCommits), filteredCommits);
  updateScatterPlot(data, filteredCommits, { resetBrush });
  updateFileDisplay(filteredCommits);
}

function onTimeSliderChange(event) {
  commitProgress = Number(event.currentTarget.value);
  commitMaxTime = timeScale.invert(commitProgress);
  syncToCommitTime(commitMaxTime);
}

function renderScatterStory(commitsToUse) {
  d3.select('#scatter-story')
    .selectAll('div.step')
    .data(commitsToUse, (d) => d.id)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => {
      const commitLabel = i === 0 ? 'First commit' : `Commit ${i + 1}`;
      const fileCount = getCommitFileCount(d);
      const commitNoun = i === 0 ? 'snapshot' : 'step';
      return `
        <p class="step-date">
          <time datetime="${d.datetime.toISOString()}">${escapeHTML(formatDateTime(d.datetime, { dateStyle: 'long', timeStyle: 'short' }))}</time>
        </p>
        <h3><a href="${d.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(commitLabel)}</a></h3>
        <p>This ${commitNoun} edited ${formatInteger(d.totalLines)} line${d.totalLines === 1 ? '' : 's'} across ${formatInteger(fileCount)} file${fileCount === 1 ? '' : 's'}.</p>
        <p>The scatter plot shows how the portfolio history expands up to this commit.</p>
      `;
    });
}

function renderFileStory(commitsToUse) {
  d3.select('#files-story')
    .selectAll('div.step')
    .data(commitsToUse, (d) => d.id)
    .join('div')
    .attr('class', 'step')
    .html((d) => {
      const commitsSoFar = commitsToUse.filter((commit) => commit.datetime <= d.datetime);
      const files = getFilesForCommits(commitsSoFar);
      const totalLines = d3.sum(files, (file) => file.lines.length);
      const biggestFile = files[0];
      const biggestFileText = biggestFile
        ? `<code>${escapeHTML(biggestFile.name)}</code> leads with ${formatInteger(biggestFile.lines.length)} line${biggestFile.lines.length === 1 ? '' : 's'}`
        : 'No files have appeared yet';

      return `
        <p class="step-date">
          <time datetime="${d.datetime.toISOString()}">${escapeHTML(formatDateTime(d.datetime, { dateStyle: 'long', timeStyle: 'short' }))}</time>
        </p>
        <h3>${formatInteger(totalLines)} line${totalLines === 1 ? '' : 's'} in ${formatInteger(files.length)} file${files.length === 1 ? '' : 's'}</h3>
        <p>${biggestFileText} at this point in the codebase.</p>
        <p>The file-size view updates to show which files are carrying the most code.</p>
      `;
    });
}

function onStepEnter(response) {
  const commit = response.element.__data__;
  setActiveStep('#scatter-story', response.element);
  syncToCommitTime(commit.datetime);
}

function onFileStepEnter(response) {
  const commit = response.element.__data__;
  setActiveStep('#files-story', response.element);
  syncToCommitTime(commit.datetime);
}

function setupScrollytelling() {
  scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step'
    })
    .onStepEnter(onStepEnter);

  fileScroller = scrollama();
  fileScroller
    .setup({
      container: '#scrolly-2',
      step: '#scrolly-2 .step'
    })
    .onStepEnter(onFileStepEnter);

  window.addEventListener('resize', () => {
    scroller.resize();
    fileScroller.resize();
  });
}

async function init() {
  data = await loadData();
  commits = processCommits(data);
  filteredCommits = commits;

  timeScale = d3
    .scaleTime()
    .domain([d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)])
    .range([0, 100]);
  commitMaxTime = timeScale.invert(commitProgress);
  colors.domain([...new Set(data.map((d) => d.type))]);

  renderSelectionCount([]);
  renderLanguageBreakdown([]);
  renderScatterPlot(data, commits);
  renderScatterStory(commits);
  renderFileStory(commits);

  d3.select('#commit-progress').on('input', onTimeSliderChange);
  syncToCommitTime(commitMaxTime, { resetBrush: false });
  setupScrollytelling();
}

init().catch((error) => {
  console.error('Failed to load code statistics:', error);
  document.querySelector('#chart')?.insertAdjacentHTML(
    'afterend',
    '<p class="error">Could not load code statistics.</p>'
  );
});
