import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const DEFAULT_VAULT_DIR = '/Users/neo/Dropbox/NeoSys/projects/WorldOfEndlessRain';
const vaultDir = process.env.WOER_VAULT_DIR ?? DEFAULT_VAULT_DIR;

const loreFiles = [
  'lore.md',
  'world_physics.md',
  'races.md',
  'hearts.md',
  'lightning_types.md',
  'society.md',
  'city.md',
  'factions.md',
  'characters.md',
  'philosophy.md'
];

const metaPath = path.join(__dirname, 'lore-meta.json');
const targetLoreDir = path.join(projectRoot, 'src/content/lore');
const sourceImagesDir = path.join(vaultDir, 'imgs');
const targetImagesDir = path.join(projectRoot, 'public/imgs');

function frontmatterValue(value) {
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

function buildFrontmatter(meta, sourceFile) {
  const lines = [
    '---',
    `title: ${frontmatterValue(meta.title)}`,
    `subtitle: ${frontmatterValue(meta.subtitle)}`,
    `order: ${frontmatterValue(meta.order)}`
  ];

  if (meta.emoji) {
    lines.push(`emoji: ${frontmatterValue(meta.emoji)}`);
  }

  lines.push(`sourceFile: ${frontmatterValue(sourceFile)}`);
  lines.push('---', '');

  return lines.join('\n');
}

async function syncLoreFiles() {
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));

  await rm(targetLoreDir, { recursive: true, force: true });
  await mkdir(targetLoreDir, { recursive: true });
  await mkdir(targetImagesDir, { recursive: true });

  for (const sourceFile of loreFiles) {
    const slug = sourceFile.replace(/\.md$/u, '');
    const fileMeta = meta[slug];
    if (!fileMeta) {
      throw new Error(`Missing metadata for ${slug}`);
    }

    const sourcePath = path.join(vaultDir, sourceFile);
    const targetPath = path.join(targetLoreDir, sourceFile);
    const markdown = await readFile(sourcePath, 'utf8');
    const frontmatter = buildFrontmatter(fileMeta, sourceFile);

    await writeFile(targetPath, `${frontmatter}${markdown.trim()}\n`);
    console.log(`synced ${sourceFile}`);
  }

  await cp(sourceImagesDir, targetImagesDir, {
    recursive: true,
    force: true
  });

  console.log(`copied imgs -> ${path.relative(projectRoot, targetImagesDir)}`);
}

syncLoreFiles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
