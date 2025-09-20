-- This file creates the database schema as described
-- It will be mounted in the Docker postgres container for initialization

-- Create enum types first
CREATE TYPE node_type AS ENUM ('line','choice_hub','action','jump','end');
CREATE TYPE quest_state AS ENUM ('offered','active','completed','turned_in','failed');  
CREATE TYPE quest_step_type AS ENUM ('collect','kill','talk','reach','custom');

COMMENT ON TYPE node_type IS 'Тип узла диалога: line/choice_hub/action/jump/end';
COMMENT ON TYPE quest_state IS 'Состояние квеста у игрока';
COMMENT ON TYPE quest_step_type IS 'Тип шага квеста (структура в params JSON)';

-- Create additional tables for localization and versioning
CREATE TABLE content_version (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  version_number INT NOT NULL,
  data JSONB NOT NULL,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(entity_type, entity_id, version_number)
);

COMMENT ON TABLE content_version IS 'Версионирование контента для отката и истории изменений';

-- Localization support for UE5 integration
CREATE TABLE localization_key (
  id BIGSERIAL PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'default',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE localization_text (
  id BIGSERIAL PRIMARY KEY,
  key_id BIGINT NOT NULL REFERENCES localization_key(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL, -- 'en', 'ru', 'de', etc.
  text_value TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(key_id, language_code)
);

COMMENT ON TABLE localization_key IS 'Ключи локализации для связи с UE5';
COMMENT ON TABLE localization_text IS 'Переводы текстов для разных языков';

-- Create indexes for performance
CREATE INDEX ix_content_version_entity ON content_version(entity_type, entity_id);
CREATE INDEX ix_localization_key_name ON localization_key(key_name);
CREATE INDEX ix_localization_text_lang ON localization_text(language_code);
CREATE INDEX ix_localization_text_approved ON localization_text(language_code, is_approved);