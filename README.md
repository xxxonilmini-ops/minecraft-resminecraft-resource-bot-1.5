# Minecraft Resource Bot

Бот для Minecraft Java Edition 1.16.5. Он добывает ресурсы по команде и сортирует дерево и камень по сундукам. Команды выполняются только из отдельной CMD-консоли.

## Возможности

- добыча ресурсов: `Game:Дабить wood 32`;
- поиск ближайших блоков и выбор инструмента;
- сортировка дерева и камня по сундукам командой `sort`;
- управление из `.NET 8` CMD-консоли;
- команды из Minecraft-чата отключены через `MC_CHAT_COMMANDS=false`.

## Требования

- Node.js 18 или новее;
- .NET 8 SDK или новее;
- Minecraft Java Edition 1.16.5;
- локальный или удалённый сервер Minecraft.

## Установка

```powershell
npm install
Copy-Item .env.example .env
```

Открой `.env` и укажи адрес сервера, ник бота и способ авторизации. Для локального offline-сервера подходят `MC_AUTH=offline` и `MC_HOST=localhost`.

Проверка кода:

```powershell
npm run check
dotnet build MinecraftResourceBot.Console.csproj
```

## Запуск консоли

Для отдельного окна CMD запусти [start-console.cmd](start-console.cmd). Команды вводятся без `!`:

```text
Game:Дабить wood 32
sort
status
stop
exit
```

Команда `Game:Дабить` принимает название ресурса и количество. Например: `Game:Дабить stone 64`.

## Сортировка сундуков

Положи хотя бы один деревянный предмет в сундук для дерева и один каменный предмет в сундук для камня. Бот осмотрит ближайшие сундуки и запомнит их категории. После этого `sort` переложит подходящие предметы из инвентаря.

Для автоматической сортировки после добычи:

```text
Вкл auto-сорд
```

## Локальный тестовый сервер

Папка `test-server` содержит настройки тестового сервера 1.16.5. Серверный `.jar` не включается в GitHub. Скачай его командой:

```powershell
cd test-server
powershell -ExecutionPolicy Bypass -File .\download-server.ps1
```

После ознакомления с Minecraft EULA измени `eula=false` на `eula=true` в `test-server/eula.txt`, затем запусти `start-server.ps1`.

## Безопасность

Не публикуй `.env`, пароли Microsoft или серверные токены. Файл `.env` исключён через `.gitignore`. Для публичного сервера рекомендуется включить `online-mode=true`.
