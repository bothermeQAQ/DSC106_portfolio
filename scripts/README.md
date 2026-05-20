# Project Cover Generation

Generate the portfolio project covers with the OpenAI Images API:

```sh
OPENAI_API_KEY=... npm run generate:covers
```

The generator defaults to the requested `gpt-image-2` model and writes optimized 4:3 PNG files to `assets/project-covers/`. It also updates `lib/projects.json` after successful generation so the Projects page uses the new covers.

Useful options:

```sh
npm run optimize:covers
OPENAI_IMAGE_MODEL=gpt-image-2 OPENAI_IMAGE_SIZE=1536x1024 npm run generate:covers
node scripts/generate-project-covers.mjs --skip-project-data
```
