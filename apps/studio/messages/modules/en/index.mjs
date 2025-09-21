/**
 * Module loader for next-intl
 * 
 * This module combines all translation modules into a single object
 * for use with next-intl. This approach provides several benefits:
 * 
 * 1. Modular organization - translations are split by feature/component
 * 2. Better maintainability - smaller, focused files are easier to manage
 * 3. Scalability - new features can add their own translation modules
 * 4. Type safety - each module can have its own TypeScript definitions
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadJson = (filename) => JSON.parse(readFileSync(join(__dirname, filename), 'utf8'));

const common = loadJson('common.json');
const navigation = loadJson('navigation.json');
const dialogues = loadJson('dialogues.json');
const quests = loadJson('quests.json');
const editors = loadJson('editors.json');
const errors = loadJson('errors.json');
const home = loadJson('home.json');

export default {
  common,
  navigation,
  dialogues,
  quests,
  editors,
  errors,
  home,
};