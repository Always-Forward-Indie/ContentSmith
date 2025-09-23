import { Locale } from './config';

type Messages = Record<string, any>;

/**
 * Loads and merges all translation modules for a given locale
 */
export async function loadModularMessages(locale: Locale): Promise<Messages> {
  try {
    // Import the index file which aggregates all modules
    const moduleMessages = await import(`../../messages/modules/${locale}/index.mjs`);
    return moduleMessages.default;
  } catch (error) {
    console.warn(`Failed to load modular translation for locale: ${locale}`, error);
    
    // Fallback: try to load individual modules
    return await loadIndividualModules(locale);
  }
}

/**
 * Fallback: Loads individual modules if index file fails
 */
async function loadIndividualModules(locale: Locale): Promise<Messages> {
  const moduleNames = [
    'common',
    'navigation', 
    'dialogues',
    'quests',
    'editors',
    'errors',
    'home',
    'npcs',
    'skills',
    'skill-schools',
    'skill-scale-types',
    'skill-properties',
    'skill-effects-type',
    'skill-effects',
    'entity-attributes',
    'races',
    'items',
    'item-attributes',
    'items-rarity',
    'item-types'
  ] as const;

  const messages: Messages = {};
  
  // Load each module and merge into the main messages object
  for (const moduleName of moduleNames) {
    try {
      const moduleMessages = await import(`../../messages/modules/${locale}/${moduleName}.json`);
      messages[moduleName] = moduleMessages.default;
    } catch (error) {
      console.warn(`Failed to load translation module: ${moduleName} for locale: ${locale}`, error);
      // Continue loading other modules even if one fails
    }
  }
  
  return messages;
}

/**
 * Loads legacy monolithic translation file
 */
export async function loadLegacyMessages(locale: Locale): Promise<Messages> {
  try {
    const messages = await import(`../../messages/${locale}.json`);
    return messages.default;
  } catch (error) {
    console.warn(`Failed to load legacy translation file for locale: ${locale}`, error);
    return {};
  }
}

/**
 * Loads translations with fallback from modular to legacy format
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  // Try to load modular messages first
  const modularMessages = await loadModularMessages(locale);
  
  // If we have modular messages, use them
  if (Object.keys(modularMessages).length > 0) {
    console.log(`✅ Using modular translations for locale: ${locale}`);
    return modularMessages;
  }
  
  // Fallback to legacy format
  console.log(`🔄 Falling back to legacy translation format for locale: ${locale}`);
  return await loadLegacyMessages(locale);
}