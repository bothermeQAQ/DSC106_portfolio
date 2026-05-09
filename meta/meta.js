import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const repoUrl = 'https://github.com/bothermeQAQ/DSC106_portfolio';

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
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

function renderCommitInfo(data, commits) {
  const stats = d3.select('#stats');
  stats.selectAll('*').remove();

  const dl = stats.append('dl').attr('class', 'stats');
  const addStat = (label, value) => {
    dl.append('dt').html(label);
    dl.append('dd').text(value);
  };

  const files = d3.rollups(data, (v) => v.length, (d) => d.file);
  const longestFile = d3.greatest(files, (d) => d[1]);
  const authors = d3.group(data, (d) => d.author).size;
  const avgLineLength = d3.mean(data, (d) => d.length) ?? 0;
  const maxDepth = d3.max(data, (d) => d.depth) ?? 0;
  const busiestHour = d3.greatest(
    d3.rollups(commits, (v) => v.length, (d) => d.datetime.getHours()),
    (d) => d[1]
  );

  addStat('Total <abbr title="Lines of code">LOC</abbr>', d3.format(',')(data.length));
  addStat('Total commits', d3.format(',')(commits.length));
  addStat('Files', d3.format(',')(files.length));
  addStat('Authors', d3.format(',')(authors));
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
      <dd>${d3.format(',')(commit.totalLines)}</dd>
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
      .text(`${d3.format(',')(count)} lines (${d3.format('.1~%')(proportion)})`);
  }
}

function renderScatterPlot(commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 24, right: 28, bottom: 46, left: 54 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines ?? 0, maxLines ?? 1])
    .range([4, 28]);

  const chart = d3.select('#chart');
  chart.selectAll('*').remove();

  const svg = chart
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Scatterplot showing commits by date and time of day');

  const xAxis = d3.axisBottom(xScale);
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
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

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

  function isCommitSelected(selection, commit) {
    if (!selection) {
      return false;
    }

    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  function brushed(event) {
    const selection = event.selection;
    const selectedCommits = selection
      ? commits.filter((commit) => isCommitSelected(selection, commit))
      : [];

    dots
      .selectAll('circle')
      .classed('selected', (commit) => selectedCommits.includes(commit));

    renderSelectionCount(selectedCommits);
    renderLanguageBreakdown(selectedCommits);
  }

  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom]
    ])
    .on('start brush end', brushed);

  svg.append('g').attr('class', 'brush').call(brush);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const dots = svg.append('g').attr('class', 'dots');
  const showTooltip = (event, commit) => {
    d3.select(event.currentTarget).style('fill-opacity', 1);
    renderTooltipContent(commit);
    updateTooltipVisibility(true);
    updateTooltipPosition(event);
  };
  const hideTooltip = (event) => {
    d3.select(event.currentTarget).style('fill-opacity', 0.7);
    updateTooltipVisibility(false);
  };

  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('pointerover', showTooltip)
    .on('pointermove', updateTooltipPosition)
    .on('pointerout', hideTooltip)
    .on('mouseover', showTooltip)
    .on('mousemove', updateTooltipPosition)
    .on('mouseout', hideTooltip);
}

async function init() {
  const data = await loadData();
  const commits = processCommits(data);

  renderCommitInfo(data, commits);
  renderSelectionCount([]);
  renderLanguageBreakdown([]);
  renderScatterPlot(commits);
}

init().catch((error) => {
  console.error('Failed to load code statistics:', error);
  document.querySelector('#chart')?.insertAdjacentHTML(
    'afterend',
    '<p class="error">Could not load code statistics.</p>'
  );
});
