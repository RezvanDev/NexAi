# Документация проекта AI Call Assistant

## Обзор Архитектуры
Проект представляет собой модульную систему для автоматизации звонков с использованием AI, состоящую из двух основных частей: клиентского приложения (AI Assistant) и управленческой панели (CRM).

### 1. Технологический Стек

**Backend (Серверная часть)**
*   **Платформа**: Node.js
*   **Фреймворк**: Express.js
*   **Язык**: TypeScript
*   **База данных**: PostgreSQL
*   **ORM**: Drizzle ORM + Zod (валидация)
*   **AI провайдер**: OpenAI Realtime API (`gpt-4o-realtime-preview-2024-12-17`)
*   **WebSocket**: Native `ws` библиотека для Realtime audio стриминга

**Frontend (Клиентская часть)**
*   **Основной клиент**: React + Vite (Port 5000)
*   **CRM**: Vanilla HTML/JS + Vite (Port 3001)
*   **Стилизация**: Tailwind CSS

### 2. Структура Базы Данных (PostgreSQL)

Схема определена в `shared/schema.ts` и управляется через Drizzle ORM.

**Таблицы:**

1.  **companies** (Настройки компании и AI агента)
    *   `id`: Primary Key
    *   `name`: Название компании
    *   `agentName`: Имя AI агента
    *   `agentRole`: Роль агента (например, "Менеджер")
    *   `companyContext`: Описание компании для контекста AI
    *   `agentGreeting`: Приветственная фраза
    *   `agentTerminationPhrase`: Фраза завершения звонка
    *   `systemPrompt`: Системные инструкции (скрытые настройки)

2.  **leads** (База клиентов)
    *   `id`: Primary Key
    *   `name`: Имя клиента
    *   `phone`: Телефон
    *   `email`: Email
    *   `companyId`: Foreign Key -> companies.id

3.  **calls** (История звонков)
    *   `id`: Primary Key
    *   `leadId`: Foreign Key -> leads.id
    *   `transcript`: Текст диалога
    *   `summary`: Краткий итог звонка
    *   `status`: Статус (completed, missed)
    *   `duration`: Длительность в секундах
    *   `recordingUrl`: Ссылка на запись (если есть)

### 3. Архитектура Серверов

В проекте параллельно работают два серверных процесса (см. `package.json`):

1.  **Main Server (`server/index.ts`)**
    *   Обслуживает основной функционал звонков.
    *   Поднимает WebSocket сервер на пути `/realtime`.
    *   Выступает прокси-сервером между браузером и OpenAI Realtime API.
    *   Управляет сессиями звонков.

2.  **CRM Server (`crm/server/index.ts`)**
    *   Обслуживает API для CRM панели (`/api/companies`, `/api/leads`).
    *   Отдает статические файлы CRM клиента из папки `crm/client`.
    *   Работает на порту 3001 (по умолчанию).

### 4. Ключевые файлы

*   `server/realtime.ts`: Логика WebSocket соединения с OpenAI. Здесь происходит перенаправление аудиопотоков.
*   `server/storage.ts`: Слой доступа к данным (DAO), методы для чтения/записи в БД.
*   `server/routes.ts`: API маршруты основного сервера.
*   `crm/server/routes.ts`: API маршруты CRM (управление настройками, лидами).
*   `shared/schema.ts`: Единый источник правды для структуры БД.

### 5. Поток данных при звонке

1.  Клиент (React App) инициирует WebRTC/WebSocket соединение с `/realtime`.
2.  Наш сервер принимает соединение и открывает параллельный сокет к `wss://api.openai.com/v1/realtime`.
3.  Сервер запрашивает конфигурацию активной компании из БД (`companies` table).
4.  Системный промпт (инструкции + контекст компании) отправляется в OpenAI как `session.update`.
5.  Аудиоданные транслируются в обе стороны в реальном времени.

### 6. Команды запуска

*   `npm run dev`: Запуск основного сервера.
*   `npm run dev:crm`: Запуск CRM сервера.
*   `npm run db:push`: Применение изменений схемы БД (migrations).
