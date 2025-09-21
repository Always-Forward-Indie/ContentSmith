/**
 * Модуль загрузки для next-intl
 * 
 * Этот модуль объединяет все модули переводов в единый объект
 * для использования с next-intl. Такой подход дает несколько преимуществ:
 * 
 * 1. Модульная организация - переводы разделены по функциям/компонентам
 * 2. Лучшая поддерживаемость - меньшие, сфокусированные файлы легче управлять
 * 3. Масштабируемость - новые функции могут добавлять свои модули переводов
 * 4. Типобезопасность - каждый модуль может иметь свои TypeScript определения
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