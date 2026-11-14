# Travelapp

Планировщик путешествий: маршрут по дням, конструктор с картой и шторкой, каталог мест, расходы и заметки.

## Запуск

Требуется Node.js 22+ и npm.

```sh
npm ci
npm run build
npx serve dist
```

Откройте адрес, который покажет сервер. Основные маршруты: `/#japan`, `/#new`, `/#trip/<id>`.

## Документация

- [Спецификация сервиса](docs/SERVICE_SPEC.md) — как что работает сейчас
- [Пайплайн мест](docs/PLACES_PIPELINE.md) — как подтягиваются достопримечательности
- [Аудит и идеи](docs/AUDIT.md)
- [Бэклог](docs/BACKLOG.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [Сценарии и ограничения](docs/FLOWS.md)
- [Данные и публикация](docs/DATA.md)
- [Метаданные мест](docs/place-meta.md)

Макеты: https://www.figma.com/design/aUQnGXZkcguG0Sow8bTp1h/Untitled

Сборка — `dist/`. Зависимости и сборка не хранятся в Git.
