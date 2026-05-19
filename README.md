# FlowBot

Telegram-бот + Mini App: ежедневник с карточками прогресса и шарингом через inline-режим.

## Возможности MVP

- **Бот:** `/start`, `/plan`, `/progress`, `/streak`, `/help`
- **Mini App:** цели на сегодня, недельный календарь, MainButton «Поделиться»
- **Inline:** `@yourbot день` / `неделя` — PNG-карточки прогресса
- **Серии:** ≥1 выполненная задача в день продлевает streak
- **Напоминания:** 8:00 и 20:00 (cron, timezone из `TZ`)
- **Безопасность:** проверка `initData` (HMAC) на всех API Mini App

## Стек

Node.js · TypeScript · Express · grammY · SQLite (better-sqlite3) · node-canvas

## Деплой на Vercel (публичная ссылка)

Пошаговая инструкция для новичков: **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)**

Кратко: GitHub → Vercel → Turso (база) → переменные окружения → Deploy → `setWebhook` в Telegram.

После деплоя Mini App будет по адресу: `https://ваш-проект.vercel.app/app`

## Быстрый старт

### 1. BotFather

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Укажите команды, описание, фото
3. **Menu Button → Web App** → URL: `https://your-domain.com/app`
4. Включите **Inline Mode**
5. Создайте Mini App (если используете `t.me/bot/app`): URL тот же

### 2. Установка

```bash
cd flowbot
npm install
cp .env.example .env
# Заполните BOT_TOKEN, WEBHOOK_URL, WEBAPP_URL, BOT_USERNAME
```

### 3. Сборка и запуск

```bash
npm run build
npm start
```

Для разработки без HTTPS (только polling + локальный Mini App через ngrok):

```bash
npm run dev
```

### 4. Webhook (production)

```env
BOT_TOKEN=123456:ABC...
WEBHOOK_URL=https://your-domain.com
WEBAPP_URL=https://your-domain.com
BOT_USERNAME=your_bot_name
PORT=3000
DATABASE_PATH=./data/flowbot.db
TZ=Europe/Moscow
```

Telegram отправляет обновления на `https://your-domain.com/webhook`.

Для локальной отладки используйте [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# WEBHOOK_URL и WEBAPP_URL = https://xxxx.ngrok-free.app
```

## Структура

```
flowbot/
├── src/
│   ├── index.ts              # Express + webhook + polling
│   ├── bot/                  # grammY handlers, cards, scheduler
│   ├── webapp/               # API + public Mini App
│   ├── database/             # SQLite schema + queries
│   └── shared/               # config, types
├── data/                     # SQLite DB + generated cards (gitignored)
└── scripts/copy-assets.js    # Копирует public + schema в dist/
```

## API Mini App

Все запросы требуют заголовок `X-Telegram-Init-Data` (или `initData` в body).

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/today` | План и задачи на дату |
| GET | `/api/week` | Недельная сводка |
| POST | `/api/tasks` | Добавить задачу |
| PATCH | `/api/tasks/:id` | Обновить задачу |
| DELETE | `/api/tasks/:id` | Удалить задачу |
| POST | `/api/card` | Сгенерировать PNG карточку |

## Inline-режим

- `@bot день` — карточка сегодня (PNG)
- `@bot неделя` — сводка за неделю
- Любой другой текст — поиск по названиям задач

## Прямые ссылки Mini App

- Планирование: `https://t.me/BOT_USERNAME/app?startapp=plan`
- Шаринг: `https://t.me/BOT_USERNAME/app?startapp=shared`

## Зависимости canvas

На Linux может понадобиться:

```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

На Windows обычно достаточно `npm install` (prebuilt binaries).

## Лицензия

MIT
