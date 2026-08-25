require('dotenv').config()

const readline = require('readline')

const mineflayer = require('mineflayer')
const {
  pathfinder,
  Movements,
  goals: { GoalNear },
} = require('mineflayer-pathfinder')

function envInt(name, fallback) {
  const raw = process.env[name]
  const value = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(value) ? value : fallback
}

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^minecraft:/, '')
    .replace(/[\s-]+/g, '_')
    .replace(/[^0-9a-zа-яё_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function unique(values) {
  return [...new Set(values)]
}

function isIntegerString(value) {
  return /^-?\d+$/.test(String(value ?? ''))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatError(error) {
  if (!error) return 'unknown error'
  if (typeof error === 'string') return error
  return error.message || error.toString()
}

function positionKey(pos) {
  return `${pos.x},${pos.y},${pos.z}`
}

const config = {
  host: process.env.MC_HOST || 'localhost',
  port: envInt('MC_PORT', 25565),
  username: process.env.MC_USERNAME || 'ResourceBot',
  auth: process.env.MC_AUTH || 'offline',
  version: process.env.MC_VERSION?.trim() || '',
  owner: normalizeName(process.env.MC_OWNER || ''),
  prefix: process.env.MC_PREFIX || '!',
  chatCommands: process.env.MC_CHAT_COMMANDS === 'true',
  searchRadius: Math.max(1, envInt('MC_SEARCH_RADIUS', 64)),
  candidateLimit: Math.max(1, envInt('MC_CANDIDATE_LIMIT', 24)),
  reportEvery: Math.max(1, envInt('MC_REPORT_EVERY', 4)),
}

const RESOURCE_PRESETS = {
  wood: [
    'oak_log',
    'spruce_log',
    'birch_log',
    'jungle_log',
    'acacia_log',
    'dark_oak_log',
    'mangrove_log',
    'cherry_log',
    'crimson_stem',
    'warped_stem',
  ],
  logs: [
    'oak_log',
    'spruce_log',
    'birch_log',
    'jungle_log',
    'acacia_log',
    'dark_oak_log',
    'mangrove_log',
    'cherry_log',
    'crimson_stem',
    'warped_stem',
  ],
  tree: [
    'oak_log',
    'spruce_log',
    'birch_log',
    'jungle_log',
    'acacia_log',
    'dark_oak_log',
    'mangrove_log',
    'cherry_log',
    'crimson_stem',
    'warped_stem',
  ],
  дерево: [
    'oak_log',
    'spruce_log',
    'birch_log',
    'jungle_log',
    'acacia_log',
    'dark_oak_log',
    'mangrove_log',
    'cherry_log',
    'crimson_stem',
    'warped_stem',
  ],
  stone: ['stone'],
  камень: ['stone'],
  cobblestone: ['cobblestone'],
  булыжник: ['cobblestone'],
  dirt: ['dirt'],
  земля: ['dirt'],
  sand: ['sand', 'red_sand'],
  песок: ['sand', 'red_sand'],
  gravel: ['gravel'],
  гравий: ['gravel'],
  clay: ['clay'],
  глина: ['clay'],
  coal: ['coal_ore', 'deepslate_coal_ore'],
  уголь: ['coal_ore', 'deepslate_coal_ore'],
  iron: ['iron_ore', 'deepslate_iron_ore'],
  железо: ['iron_ore', 'deepslate_iron_ore'],
  gold: ['gold_ore', 'deepslate_gold_ore', 'nether_gold_ore'],
  золото: ['gold_ore', 'deepslate_gold_ore', 'nether_gold_ore'],
  diamond: ['diamond_ore', 'deepslate_diamond_ore'],
  алмаз: ['diamond_ore', 'deepslate_diamond_ore'],
  redstone: ['redstone_ore', 'deepslate_redstone_ore'],
  редстоун: ['redstone_ore', 'deepslate_redstone_ore'],
  copper: ['copper_ore', 'deepslate_copper_ore'],
  медь: ['copper_ore', 'deepslate_copper_ore'],
  quartz: ['nether_quartz_ore'],
  кварц: ['nether_quartz_ore'],
  emerald: ['emerald_ore', 'deepslate_emerald_ore'],
  изумруд: ['emerald_ore', 'deepslate_emerald_ore'],
  ancient_debris: ['ancient_debris'],
  древние_обломки: ['ancient_debris'],
  obsidian: ['obsidian'],
  обсидиан: ['obsidian'],
}

const CHEST_SORT_CATEGORIES = {
  wood: new Set([
    'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log',
    'dark_oak_log', 'mangrove_log', 'cherry_log', 'crimson_stem',
    'warped_stem', 'oak_planks', 'spruce_planks', 'birch_planks',
    'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'mangrove_planks',
    'cherry_planks', 'crimson_planks', 'warped_planks', 'stick',
  ]),
  stone: new Set([
    'stone', 'cobblestone', 'deepslate', 'cobbled_deepslate', 'andesite',
    'diorite', 'granite', 'tuff', 'blackstone', 'basalt', 'smooth_stone',
  ]),
}

function itemCategory(itemName) {
  const normalized = normalizeName(itemName)
  for (const [category, itemNames] of Object.entries(CHEST_SORT_CATEGORIES)) {
    if (itemNames.has(normalized)) return category
  }
  return null
}

function categoryLabel(category) {
  return category === 'wood' ? 'wood' : 'stone'
}

function findNearbyChests() {
  const chestIds = ['chest', 'trapped_chest']
    .map((name) => bot.registry.blocksByName[name]?.id)
    .filter((id) => Number.isInteger(id))

  if (!chestIds.length) return []

  return bot.findBlocks({
    matching: chestIds,
    maxDistance: config.searchRadius,
    count: config.candidateLimit,
  })
    .map((pos) => bot.blockAt(pos))
    .filter(Boolean)
    .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))
}

async function sortInventoryIntoChests() {
  if (activeJob) {
    bot.chat('Stop the current task first with !stop.')
    return
  }

  const pending = bot.inventory.items().filter((item) => itemCategory(item.name))
  if (!pending.length) {
    bot.chat('There is no wood or stone in the inventory.')
    return
  }

  const chestBlocks = findNearbyChests()
  if (!chestBlocks.length) {
    bot.chat('No chests found nearby.')
    return
  }

  const foundCategories = new Map()
  for (const chestBlock of chestBlocks) {
    let container
    try {
      await bot.pathfinder.goto(new GoalNear(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z, 1))
      container = await bot.openContainer(chestBlock)
      const categories = new Set(container.containerItems().map((item) => itemCategory(item.name)).filter(Boolean))
      for (const category of categories) {
        if (!foundCategories.has(category)) foundCategories.set(category, chestBlock)
      }
      container.close()
    } catch (error) {
      if (container) container.close()
      console.log(`[sort] Cannot inspect chest: ${formatError(error)}`)
    }
  }

  let moved = 0
  for (const category of ['wood', 'stone']) {
    const chestBlock = foundCategories.get(category)
    if (!chestBlock) continue

    let container
    try {
      await bot.pathfinder.goto(new GoalNear(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z, 1))
      container = await bot.openContainer(chestBlock)
      const matching = bot.inventory.items().filter((item) => itemCategory(item.name) === category)
      for (const item of matching) {
        await container.deposit(item.type, item.metadata, item.count)
        moved += item.count
      }
      container.close()
      bot.chat(`Sorted ${categoryLabel(category)}: ${matching.reduce((sum, item) => sum + item.count, 0)} items.`)
    } catch (error) {
      if (container) container.close()
      console.log(`[sort] Cannot deposit ${category}: ${formatError(error)}`)
      bot.chat(`Could not deposit ${categoryLabel(category)}: ${formatError(error)}`)
    }
  }

  if (!foundCategories.size) {
    bot.chat('Put at least one wood item in the wood chest and one stone item in the stone chest, then retry.')
  } else if (moved > 0) {
    bot.chat(`Sorting complete. Moved ${moved} items.`)
  }
}

const botOptions = {
  host: config.host,
  port: config.port,
  username: config.username,
  auth: config.auth,
}

if (config.version) {
  botOptions.version = config.version
}

const bot = mineflayer.createBot(botOptions)
bot.loadPlugin(pathfinder)

let defaultMovements = null
let activeJob = null
let firstSpawnSeen = false
const features = {
  autoSort: false,
  autoEat: false,
  autoLogin: false,
}

function canControl(username) {
  if (username === '__console__') return true
  if (!config.owner) return true
  return normalizeName(username) === config.owner
}

function listExamples() {
  return [
    `${config.prefix}gather wood 32`,
    `${config.prefix}gather железо 16`,
    `${config.prefix}gather nether_quartz_ore 8`,
  ].join(' | ')
}

function helpMessage() {
  return `Команды: ${config.prefix}gather <ресурс> [кол-во], ${config.prefix}stop, ${config.prefix}status. Примеры: ${listExamples()}`
}

function statusMessage() {
  if (!activeJob) return 'Сейчас я свободен.'
  return `Сейчас собираю ${activeJob.resourceLabel}: ${activeJob.mined}/${activeJob.targetCount}.`
}

function stopActiveJob() {
  if (!activeJob) return false

  activeJob.cancelled = true
  bot.pathfinder.setGoal(null)
  bot.pathfinder.stop()
  bot.stopDigging()
  bot.clearControlStates()
  return true
}

function parseGatherRequest(tokens) {
  if (!tokens.length) return null

  let amount = 32
  let resourceTokens = tokens

  if (tokens.length > 1 && isIntegerString(tokens[0])) {
    amount = Math.max(1, Number.parseInt(tokens[0], 10))
    resourceTokens = tokens.slice(1)
  } else if (tokens.length > 1 && isIntegerString(tokens[tokens.length - 1])) {
    amount = Math.max(1, Number.parseInt(tokens[tokens.length - 1], 10))
    resourceTokens = tokens.slice(0, -1)
  }

  const resource = normalizeName(resourceTokens.join(' '))
  if (!resource) return null

  return { resource, amount }
}

function resolveResourceBlocks(resourceInput) {
  const key = normalizeName(resourceInput)
  const blockNames = RESOURCE_PRESETS[key] || [key]
  const blockIds = []
  const missing = []

  for (const name of blockNames) {
    const block = bot.registry.blocksByName[name]
    if (block) {
      blockIds.push(block.id)
    } else {
      missing.push(name)
    }
  }

  return {
    key,
    blockNames,
    blockIds: unique(blockIds),
    missing,
  }
}

async function equipBestTool(block) {
  const tool = bot.pathfinder.bestHarvestTool(block)
  if (!tool) return

  const held = bot.heldItem
  if (held && held.type === tool.type && held.metadata === tool.metadata) return

  await bot.equip(tool, 'hand')
}

async function gatherResource(resourceInput, targetCount) {
  const lookup = resolveResourceBlocks(resourceInput)

  if (!lookup.blockIds.length) {
    const availableExamples = Object.keys(RESOURCE_PRESETS)
      .slice(0, 8)
      .join(', ')
    bot.chat(`Не знаю ресурс "${resourceInput}". Попробуй что-то вроде: ${availableExamples}`)
    return
  }

  if (lookup.missing.length > 0) {
    console.log(`[gather] Some block names are unavailable in this version: ${lookup.missing.join(', ')}`)
  }

  const job = {
    resourceInput,
    resourceLabel: resourceInput.replace(/_/g, ' '),
    targetCount: Math.max(1, targetCount),
    mined: 0,
    cancelled: false,
    visited: new Set(),
  }

  activeJob = job

  bot.chat(`Начинаю собирать ${job.resourceLabel} x${job.targetCount}.`)

  try {
    await bot.waitForChunksToLoad()

    while (!job.cancelled && job.mined < job.targetCount) {
      const candidates = bot.findBlocks({
        matching: lookup.blockIds,
        maxDistance: config.searchRadius,
        count: config.candidateLimit,
      })

      const nextPosition = candidates.find((pos) => !job.visited.has(positionKey(pos)))
      if (!nextPosition) {
        break
      }

      job.visited.add(positionKey(nextPosition))

      const block = bot.blockAt(nextPosition)
      if (!block || !lookup.blockIds.includes(block.type)) {
        continue
      }

      try {
        await equipBestTool(block)
        await bot.pathfinder.goto(new GoalNear(block.position.x, block.position.y, block.position.z, 1))

        if (job.cancelled) {
          break
        }

        const liveBlock = bot.blockAt(block.position)
        if (!liveBlock || !lookup.blockIds.includes(liveBlock.type)) {
          continue
        }

        if (!bot.canDigBlock(liveBlock)) {
          await bot.lookAt(liveBlock.position.offset(0.5, 0.5, 0.5), true).catch(() => {})
        }

        await bot.dig(liveBlock, true)
        job.mined += 1

        if (
          job.mined === 1 ||
          job.mined % config.reportEvery === 0 ||
          job.mined >= job.targetCount
        ) {
          bot.chat(`Собрано ${job.mined}/${job.targetCount}.`)
        }

        await sleep(150)
      } catch (error) {
        if (job.cancelled) {
          break
        }

        console.log(`[gather] Failed to collect ${job.resourceLabel}: ${formatError(error)}`)
        job.visited.add(positionKey(nextPosition))
      }
    }

    if (job.cancelled) {
      bot.chat('Остановил сбор.')
    } else if (job.mined >= job.targetCount) {
      bot.chat(`Готово. Собрал ${job.mined}/${job.targetCount} ${job.resourceLabel}.`)
    } else {
      bot.chat(`Больше не нашёл ${job.resourceLabel} рядом. Собрал ${job.mined}/${job.targetCount}.`)
    }
  } catch (error) {
    if (!job.cancelled) {
      console.log(`[gather] Unexpected failure: ${formatError(error)}`)
      bot.chat(`Не смог закончить сбор: ${formatError(error)}`)
    }
  } finally {
    if (activeJob === job) {
      activeJob = null
    }

    bot.pathfinder.setGoal(null)
    bot.stopDigging()
    bot.clearControlStates()

    if (features.autoSort && !job.cancelled && job.mined > 0) {
      await sortInventoryIntoChests()
    }
  }
}

function russianHelpMessage() {
  return [
    '\u043f\u043e\u043c\u043e\u0449',
    'Game:\u0414\u0430\u0431\u0438\u0442\u044c <\u0431\u043b\u043e\u043a> <\u0441\u043a\u043e\u043b\u044c\u043a\u043e>',
    '\u0412\u043a\u043b <\u043a\u043e\u043c\u0430\u043d\u0434\u0443> | \u0412\u0438\u043a\u043b <\u043a\u043e\u043c\u0430\u043d\u0434\u0443>',
    'prind mss <\u0442\u0435\u043a\u0441\u0442> | prind command | prind help',
    'join-to-server <ip> | join-to-server-port <ip> <port>',
  ].join(' | ')
}

function featureStatus() {
  return `auto-сорд=${features.autoSort ? 'вкл' : 'викл'}, auto-йеда=${features.autoEat ? 'вкл' : 'викл'}, auto-логин=${features.autoLogin ? 'вкл' : 'викл'}`
}

async function handleRussianCommand(username, message) {
  const tokens = message.trim().split(/\s+/)
  const raw = tokens.shift() || ''
  const command = raw.toLowerCase()
  const normalizedCommand = command.replace(':', '')

  if (command === '\u043f\u043e\u043c\u043e\u0449') {
    bot.chat(russianHelpMessage())
    return true
  }

  if (normalizedCommand === 'game\u0434\u0430\u0431\u0438\u0442\u044c') {
    const request = parseGatherRequest(tokens)
    if (!request) {
      bot.chat('Game:Дабить <блок> <сколько>')
      return true
    }
    if (activeJob) {
      bot.chat('У меня уже есть задача. Сначала введи stop.')
      return true
    }
    await gatherResource(request.resource, request.amount)
    return true
  }

  if (command === 'вкл' || command === 'викл') {
    const featureName = (tokens.join('-') || '').toLowerCase()
    const enabled = command === 'вкл'
    if (featureName.includes('сорд') || featureName.includes('sort')) features.autoSort = enabled
    else if (featureName.includes('йеда') || featureName.includes('eat')) features.autoEat = enabled
    else if (featureName.includes('логин') || featureName.includes('login')) features.autoLogin = enabled
    else {
      bot.chat('Доступно: auto-сорд, auto-йеда, auto-логин.')
      return true
    }
    bot.chat(`${enabled ? 'Вкл' : 'Викл'} ${featureName}. ${featureStatus()}`)
    return true
  }

  if (command === 'вкл' || command === 'викл') return true

  if (command === 'prind') {
    const subcommand = (tokens.shift() || '').toLowerCase()
    if (subcommand === 'mss') bot.chat(tokens.join(' '))
    else if (subcommand === 'command') bot.chat('/home, /sethome, /msg, /spawn, /kit, /tp, /register, /login')
    else if (subcommand === 'help') bot.chat(russianHelpMessage())
    else bot.chat('prind mss, prind command, prind help')
    return true
  }

  if (command === 'join-to-server' || command === 'join-to-server-port') {
    bot.chat(`Server target: ${tokens.join(':') || 'not specified'}`)
    return true
  }

  return false
}

async function handleChat(username, message) {
  if (!username || username === bot.username) return
  if (!config.chatCommands && username !== '__console__') return
  if (!canControl(username)) return
  if (!message.startsWith(config.prefix)) return

  const body = message.slice(config.prefix.length).trim()
  if (!body) return

  if (await handleRussianCommand(username, body)) return

  const commandPreview = normalizeName(body.split(/\s+/)[0])
  if (['sort', 'sortchests', 'deposit'].includes(commandPreview)) {
    await sortInventoryIntoChests()
    return
  }

  const parts = body.split(/\s+/)
  const command = normalizeName(parts.shift())

  if (['help', 'h', 'помощь'].includes(command)) {
    bot.chat(helpMessage())
    return
  }

  if (['status', 'state', 'статус'].includes(command)) {
    bot.chat(statusMessage())
    return
  }

  if (['stop', 'cancel', 'halt', 'стоп'].includes(command)) {
    if (stopActiveJob()) {
      bot.chat('Останавливаюсь.')
    } else {
      bot.chat('Сейчас я ничего не добываю.')
    }
    return
  }

  if (['gather', 'mine', 'collect', 'собери', 'копай', 'добывай', 'сбор'].includes(command)) {
    if (activeJob) {
      bot.chat('У меня уже есть задача. Сначала напиши !stop.')
      return
    }

    const request = parseGatherRequest(parts)
    if (!request) {
      bot.chat(`Синтаксис: ${config.prefix}gather <ресурс> [кол-во]`)
      return
    }

    await gatherResource(request.resource, request.amount)
    return
  }

  bot.chat(`Не знаю команду. Напиши ${config.prefix}help`)
}

bot.on('spawn', () => {
  defaultMovements = new Movements(bot)
  defaultMovements.canDig = true
  defaultMovements.allow1by1towers = true
  defaultMovements.allowSprinting = true
  bot.pathfinder.setMovements(defaultMovements)
  bot.clearControlStates()

  if (activeJob) {
    activeJob.cancelled = true
    bot.pathfinder.setGoal(null)
    bot.stopDigging()
  }

  console.log(`Spawned as ${bot.username}`)

  if (!firstSpawnSeen) {
    firstSpawnSeen = true
    bot.chat(`Готов. Напиши ${config.prefix}help`)
  }
})

bot.on('chat', (username, message) => {
  void handleChat(username, message).catch((error) => {
    console.log(`[chat] ${formatError(error)}`)
  })
})

bot.on('death', () => {
  stopActiveJob()
})

bot.on('kicked', (reason, loggedIn) => {
  console.warn('[kicked]', reason, loggedIn)
})

bot.on('end', (reason) => {
  console.log('[end]', reason)
})

bot.on('error', (error) => {
  console.error('[error]', error)
})

process.on('SIGINT', () => {
  console.log('Shutting down...')
  stopActiveJob()
  bot.quit('SIGINT')
  process.exit(0)
})

const consoleInput = readline.createInterface({ input: process.stdin, output: process.stdout })
consoleInput.on('line', (line) => {
  const command = line.trim()
  if (!command) return
  if (command.startsWith('/')) {
    bot.chat(command)
    return
  }
  void handleChat('__console__', `${config.prefix}${command}`).catch((error) => {
    console.log(`[console] ${formatError(error)}`)
  })
})

console.log(`Connecting to ${config.host}:${config.port} as ${config.username}`)
if (config.owner) {
  console.log(`Command owner: ${config.owner}`)
} else {
  console.log('No MC_OWNER set, so anyone can control the bot.')
}
