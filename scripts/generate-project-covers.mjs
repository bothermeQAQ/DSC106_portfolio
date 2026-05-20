import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import sharp from 'sharp';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coversDir = path.join(rootDir, 'assets/project-covers');
const projectsPath = path.join(rootDir, 'lib/projects.json');

const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const requestedSize = process.env.OPENAI_IMAGE_SIZE || '1536x1024';
const outputWidth = Number(process.env.PROJECT_COVER_WIDTH || 1200);
const outputHeight = Number(process.env.PROJECT_COVER_HEIGHT || 900);
const outputFormat = 'png';
const optimizeOnly = process.argv.includes('--optimize-only');
const skipProjectData = process.argv.includes('--skip-project-data');

export const projectCoverPrompts = [
  {
    matchTitle: 'NYC Airbnb Price Prediction',
    slug: 'airbnb-price-intelligence',
    title: 'NYC Airbnb Price Intelligence',
    filename: 'airbnb-price-intelligence.png',
    prompt: [
      'Create a premium 4:3 project cover for a machine learning pricing intelligence product for NYC short-term rental listings.',
      'Visual concept: monochrome NYC street grid and borough-map texture, subtle listing cards, price prediction curve, geospatial signal points, model confidence bands, feature importance marks, and a polished analytics-product feel.',
      'Mood: black crystal studio / white crystal gallery compatible, editorial, intelligent, restrained, cinematic, glassmorphism, soft chrome, data-product UI.',
      'Use mostly graphite, pearl, silver, smoky gray, and very restrained cool blue-gray highlights.',
      'Text is allowed but should be minimal and readable: "NYC Airbnb Price Intelligence", "Machine Learning / Kaggle / Pricing / Geospatial / NLP", "Predict • Explain • Compare".',
      'Avoid official Airbnb logos, brand marks, real platform UI, rainbow color, generic Kaggle poster styling, and childish illustration.'
    ].join(' ')
  },
  {
    matchTitle: 'Warming Unevenly',
    slug: 'warming-unevenly',
    title: 'Warming Unevenly',
    filename: 'warming-unevenly.png',
    prompt: [
      'Create a premium 4:3 project cover for an interactive climate-science data visualization about uneven regional warming under CMIP6 scenarios.',
      'Visual concept: abstract world-region anomaly map, polar amplification around the Arctic, scenario comparison panels, regional heat differences, a linked trend line, a year slider motif, and temperature anomaly contours.',
      'Mood: climate data lab, editorial, precise, scientific, calm but urgent, frosted glass panels, fine grid lines, silver borders, subtle crystalline atmosphere.',
      'Palette: monochrome graphite/pearl/silver with restrained icy blue-gray and faint warm anomaly glow only where needed.',
      'Text is allowed but should be minimal and readable: "Warming Unevenly", "DSC106 Project 3", "Scenario • Compare • Explore".',
      'Avoid generic Earth wallpaper, stock climate disaster imagery, excessive fire colors, official institutional marks, and cartoon styling.'
    ].join(' ')
  },
  {
    matchTitle: 'Bikewatching',
    slug: 'bikewatching',
    title: 'Bikewatching',
    filename: 'bikewatching.png',
    prompt: [
      'Create a premium 4:3 project cover for an urban mobility visualization built with Mapbox and D3 for bike traffic around Boston and Cambridge.',
      'Visual concept: dark street-grid map texture, bike station dots, directional flow arcs, time-filter sweep, density pulses, and small analytic labels that suggest movement without copying a real map screenshot.',
      'Mood: urban data observatory, elegant, technical, quiet, glassy, monochrome, with motion implied through fine lines and station clusters.',
      'Palette: graphite, pearl, silver, soft smoky gray, very subtle cool blue-gray signal accents.',
      'Text is allowed but should be minimal and readable: "Bikewatching", "Urban Mobility / Mapbox / D3", "Flow • Map • Explore".',
      'Avoid official bike-share logos, real map provider logos, colorful transit-map clutter, and generic bicycle poster illustration.'
    ].join(' ')
  },
  {
    matchTitle: 'League of Legends Ban Pick Prediction Model',
    slug: 'lol-ban-pick',
    title: 'Ban Pick Prediction',
    filename: 'lol-ban-pick.png',
    prompt: [
      'Create a premium 4:3 project cover for an esports draft prediction and machine learning analytics project.',
      'Visual concept: abstract champion-select grid, ban and pick slots, probability heat signals, matchup network, strategy lines, model confidence overlays, and predictive draft optimization.',
      'Mood: competitive analysis room, precise, dark, cinematic, polished, analytical, not fantasy illustration.',
      'Palette: black, graphite, pearl, silver, smoky glass, subtle cool blue-gray signals; restrained contrast.',
      'Text is allowed but should be minimal and readable: "Ban Pick Prediction", "Esports Analytics / Machine Learning", "Draft • Predict • Optimize".',
      'Do not use League of Legends logos, Riot marks, champion art, exact game UI, copyrighted assets, or recognizable character silhouettes.'
    ].join(' ')
  },
  {
    matchTitle: 'WeChat Bot Integration for UCSD CSSA',
    slug: 'cssa-wechat-bot',
    title: 'CSSA WeChat Bot',
    filename: 'cssa-wechat-bot.png',
    prompt: [
      'Create a premium 4:3 project cover for student organization automation and operational workflow tooling.',
      'Visual concept: abstract chat bubbles, workflow nodes, notification pipeline, event communication queue, integration system diagram, and club operations dashboard hints.',
      'Mood: calm operations center, precise, helpful, modern, editorial, frosted glass, silver linework, quiet automation.',
      'Palette: pearl, graphite, polished silver, smoky black glass, very subtle cool blue-gray highlights.',
      'Text is allowed but should be minimal and readable: "CSSA WeChat Bot", "Automation / Student Organization Tooling", "Connect • Notify • Operate".',
      'Do not use the official WeChat logo, UCSD marks, official school colors, real app UI, QR codes, or brand icons.'
    ].join(' ')
  }
];

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is missing. Regenerate covers with: OPENAI_API_KEY=... npm run generate:covers'
    );
  }
}

async function ensureCoversDir() {
  await fs.mkdir(coversDir, { recursive: true });
}

async function getImageBuffer(imageData) {
  if (imageData?.b64_json) {
    return Buffer.from(imageData.b64_json, 'base64');
  }

  if (imageData?.url) {
    const response = await fetch(imageData.url);

    if (!response.ok) {
      throw new Error(`Failed to download image URL (${response.status} ${response.statusText})`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error('Image response did not include b64_json or url.');
}

async function optimizeCover(inputBuffer, outputPath) {
  await sharp(inputBuffer, { failOn: 'none' })
    .resize({
      width: outputWidth,
      height: outputHeight,
      fit: 'cover',
      position: sharp.strategy.attention
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false
    })
    .toFile(outputPath);
}

async function generateCover(openai, cover) {
  console.log(`Generating ${cover.filename} with ${imageModel}...`);

  try {
    const response = await openai.images.generate({
      model: imageModel,
      prompt: cover.prompt,
      size: requestedSize,
      quality: 'high',
      output_format: outputFormat
    });

    const imageBuffer = await getImageBuffer(response.data?.[0]);
    const outputPath = path.join(coversDir, cover.filename);
    await optimizeCover(imageBuffer, outputPath);
    console.log(`Saved ${path.relative(rootDir, outputPath)}`);
    return outputPath;
  } catch (error) {
    const message = error?.message || String(error);

    if (
      message.includes('model') ||
      message.includes(imageModel) ||
      error?.code === 'model_not_found'
    ) {
      throw new Error(
        `Image model "${imageModel}" was unavailable for this account/API. ` +
          'The script defaults to the requested gpt-image-2 model; set OPENAI_IMAGE_MODEL only if you intentionally want a fallback.'
      );
    }

    throw error;
  }
}

async function optimizeExistingCovers() {
  await ensureCoversDir();

  for (const cover of projectCoverPrompts) {
    const outputPath = path.join(coversDir, cover.filename);
    const input = await fs.readFile(outputPath);
    await optimizeCover(input, outputPath);
    console.log(`Optimized ${path.relative(rootDir, outputPath)}`);
  }
}

async function updateProjectData() {
  const projects = JSON.parse(await fs.readFile(projectsPath, 'utf8'));
  let changed = false;

  for (const cover of projectCoverPrompts) {
    const project = projects.find((candidate) => candidate.title.includes(cover.matchTitle));

    if (!project) {
      console.warn(`No project data match found for "${cover.matchTitle}".`);
      continue;
    }

    const coverPath = `assets/project-covers/${cover.filename}`;
    if (project.image !== coverPath) {
      project.image = coverPath;
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(projectsPath, `${JSON.stringify(projects, null, 2)}\n`);
    console.log(`Updated ${path.relative(rootDir, projectsPath)} with generated cover paths.`);
  } else {
    console.log('Project data already points at generated cover paths.');
  }
}

async function main() {
  await ensureCoversDir();

  if (optimizeOnly) {
    await optimizeExistingCovers();
    return;
  }

  requireApiKey();

  const openai = new OpenAI();

  for (const cover of projectCoverPrompts) {
    await generateCover(openai, cover);
  }

  if (!skipProjectData) {
    await updateProjectData();
  }
}

main().catch((error) => {
  console.error(`Cover generation failed: ${error.message}`);
  process.exitCode = 1;
});
