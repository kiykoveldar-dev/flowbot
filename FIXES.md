# FlowBot fixes

Исправлено:
- сломанная разметка модального окна в `src/webapp/public/index.html`
- открытие/закрытие окна добавления цели в `src/webapp/public/script.js`
- стили модального окна в `src/webapp/public/style.css`

После замены файлов:
1. `git add .`
2. `git commit -m "fix mini app modal"`
3. `git push`
4. дождаться Ready в Vercel
5. полностью закрыть Telegram и открыть Mini App заново
