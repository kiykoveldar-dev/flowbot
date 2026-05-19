# Как выложить FlowBot на Vercel (пошагово для новичка)

Vercel — это хостинг, который даёт вам **публичную ссылку** вида `https://ваш-проект.vercel.app`.  
FlowBot на Vercel работает так:

- **Mini App** (планировщик) открывается в браузере и в Telegram
- **Бот** получает сообщения через webhook (не нужен постоянно включённый сервер)
- **База данных** хранится в **Turso** (облачный SQLite), потому что на Vercel нельзя сохранять файлы навсегда

---

## Что понадобится (бесплатно)


| Сервис                                          | Зачем                                           |
| ----------------------------------------------- | ----------------------------------------------- |
| [GitHub](https://github.com)                    | Хранить код (Vercel подключается к репозиторию) |
| [Vercel](https://vercel.com)                    | Хостинг и публичная ссылка                      |
| [Turso](https://turso.tech)                     | База данных                                     |
| Telegram + [@BotFather](https://t.me/BotFather) | Ваш бот                                         |


---

## Шаг 1. Создайте бота в Telegram

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram.
2. Отправьте `/newbot` и следуйте подсказкам.
3. Сохраните **токен** бота (длинная строка вида `123456789:AAH...`).
4. Запомните **username** бота (например `my_flowbot` без `@`).
5. В BotFather:
  - `/setdescription` — «Ежедневник + шаринг прогресса…»
  - `/setcommands` — start, plan, progress, streak, help
  - **Bot Settings → Inline Mode → Turn on**
  - **Bot Settings → Menu Button → Configure** — URL укажете после деплоя (`https://ваш-проект.vercel.app/app`)

---

## Шаг 2. Создайте базу данных Turso

1. Зарегистрируйтесь на [turso.tech](https://turso.tech).
2. Нажмите **Create Database**, имя например `flowbot`.
3. Откройте базу → вкладка **Connect**.
4. Скопируйте:
  - **URL** → это `TURSO_DATABASE_URL` (начинается с `libsql://`)
  - **Token** → это `TURSO_AUTH_TOKEN`

> Turso на бесплатном тарифе подходит для MVP и тысяч пользователей.

---

## Шаг 3. Загрузите код на GitHub

1. Установите [Git](https://git-scm.com/) если ещё нет.
2. Откройте терминал в папке `flowbot` (там где `package.json`).
3. Выполните:

```bash
git init
git add .
git commit -m "FlowBot MVP"
```

1. На GitHub создайте **новый пустой репозиторий** (без README).
2. Подключите и отправьте код (замените URL на свой):

```bash
git remote add origin https://github.com/ВАШ_ЛОГИН/flowbot.git
git branch -M main
git push -u origin main
```

---

## Шаг 4. Подключите проект к Vercel

1. Зайдите на [vercel.com](https://vercel.com) → **Sign Up** (можно через GitHub).
2. **Add New… → Project**.
3. Выберите репозиторий `flowbot`.
4. **Root Directory** — укажите `flowbot`, если репозиторий содержит папку `flowbot` внутри; если весь репозиторий — это только flowbot, оставьте `.`
5. **Framework Preset** — Other (или оставьте авто).
6. **Build Command:** `npm run build` (уже в `vercel.json`).
7. Пока **не нажимайте Deploy** — сначала добавьте переменные (шаг 5).

---

## Шаг 5. Переменные окружения в Vercel

В настройках проекта → **Settings → Environment Variables** добавьте:


| Имя                  | Значение                       | Пример                           |
| -------------------- | ------------------------------ | -------------------------------- |
| `BOT_TOKEN`          | Токен от BotFather             | `123456:AAH...`                  |
| `BOT_USERNAME`       | Username бота без @            | `my_flowbot`                     |
| `WEBHOOK_URL`        | URL проекта на Vercel          | `https://flowbot-xxx.vercel.app` |
| `WEBAPP_URL`         | То же самое                    | `https://flowbot-xxx.vercel.app` |
| `TURSO_DATABASE_URL` | URL из Turso                   | `libsql://flowbot-xxx.turso.io`  |
| `TURSO_AUTH_TOKEN`   | Токен Turso                    | `eyJ...`                         |
| `CRON_SECRET`        | Любая длинная случайная строка | `my-super-secret-8f3a2b`         |
| `TZ`                 | Часовой пояс                   | `Europe/Moscow`                  |


**Важно:** `WEBHOOK_URL` и `WEBAPP_URL` вы узнаете **после первого деплоя**. Тогда:

1. Скопируйте домен вида `https://flowbot-xxx.vercel.app`
2. Вставьте в обе переменные
3. **Redeploy** проект (Deployments → … → Redeploy)

`LOCAL_DEV` на Vercel **не включайте**.

---

## Шаг 6. Первый деплой

1. Нажмите **Deploy**.
2. Дождитесь зелёной галочки **Ready**.
3. Откройте ссылку `https://ваш-проект.vercel.app/health` — должно быть:
  `{"ok":true,"service":"flowbot","turso":true,...}`
4. Mini App: `https://ваш-проект.vercel.app/app`

---

## Шаг 7. Привяжите бота к Vercel

После того как `WEBHOOK_URL` указывает на ваш домен Vercel:

1. Откройте в браузере (подставьте свой токен и домен):

```
https://api.telegram.org/bot<ВАШ_BOT_TOKEN>/setWebhook?url=https://ваш-проект.vercel.app/webhook
```

1. В ответе должно быть `"ok":true`.
2. В BotFather → Menu Button → URL:
  `https://ваш-проект.vercel.app/app`
3. Если используете Mini App через `t.me/bot/app` — в BotFather настройте Web App URL на тот же адрес.

Проверка: напишите боту `/start` — должно прийти приветствие.

---

## Шаг 8. Напоминания (8:00 и 20:00)

На Vercel расписание задано в `vercel.json` (время **UTC**):

- 05:00 UTC ≈ 08:00 Москва (летом/зимой может отличаться на 1 час)
- 17:00 UTC ≈ 20:00 Москва

На **Pro**-тарифе Vercel cron надёжнее; на Hobby — тоже работает, но с ограничениями.

Переменная `CRON_SECRET` защищает endpoint от посторонних вызовов.

---

## Шаг 9. Проверочный чеклист

- `/health` отвечает `ok: true`
- `/app` открывается в браузере (в Telegram — полный функционал)
- `/start` в боте работает
- Добавление целей в Mini App сохраняется (Turso)
- Inline `@вашбот день` показывает карточку

---

## Частые проблемы

### «Application error» / 500 на Vercel

- Проверьте **Logs** в Vercel → Deployments → Functions.
- Убедитесь, что заданы `TURSO_DATABASE_URL` и `TURSO_AUTH_TOKEN`.

### Бот не отвечает

- Проверьте webhook:  
`https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- `url` должен быть `https://ваш-проект.vercel.app/webhook`

### Mini App пишет «Ошибка загрузки»

- Открывайте **из Telegram**, не просто в браузере (нужен `initData`).
- `WEBAPP_URL` должен совпадать с доменом Vercel.

### База пустая после деплоя

- Схема создаётся автоматически при первом запросе.
- Откройте `/app` из Telegram и добавьте задачу.

---

## Обновление сайта после изменений в коде

```bash
git add .
git commit -m "Описание изменений"
git push
```

Vercel сам пересоберёт проект за 1–2 минуты.

---

## Альтернатива без GitHub

Установите Vercel CLI:

```bash
npm i -g vercel
cd flowbot
vercel
```

Следуйте вопросам в терминале. Переменные окружения добавьте в панели Vercel, как в шаге 5.

---

Готово. Ваша публичная ссылка: `**https://ваш-проект.vercel.app/app**`