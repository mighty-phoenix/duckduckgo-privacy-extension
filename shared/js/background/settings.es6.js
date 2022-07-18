const defaultSettings = require('../../data/defaultSettings')
const browserWrapper = require('./wrapper.es6')

/**
 * Settings whose defaults can by managed by the system administrator
 */
const MANAGED_SETTINGS = ['hasSeenPostInstall']
/**
 * Public api
 * Usage:
 * You can use promise callbacks to check readyness before getting and updating
 * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
 */
let settings = {}
let isReady = false
const _ready = init().then(() => {
    isReady = true
    console.log('Settings are loaded')
})

async function init () {
    buildSettingsFromDefaults()
    await buildSettingsFromManagedStorage()
    await buildSettingsFromLocalStorage()
}

function ready () {
    return _ready
}

// Ensures we have cleared up old storage keys we have renamed
function checkForLegacyKeys () {
    const legacyKeys = {
        // Keys to migrate
        whitelisted: 'allowlisted',
        whitelistOptIn: 'allowlistOptIn',

        // Keys to remove
        cookieExcludeList: null,
        'surrogates-etag': null,
        'brokenSiteList-etag': null,
        'surrogateList-etag': null,
        'trackersWhitelist-etag': null,
        'trackersWhitelistTemporary-etag': null
    }
    let syncNeeded = false
    for (const legacyKey in legacyKeys) {
        const key = legacyKeys[legacyKey]
        if (!(legacyKey in settings)) {
            continue
        }
        syncNeeded = true
        const legacyValue = settings[legacyKey]
        if (key && legacyValue) {
            settings[key] = legacyValue
        }
        delete settings[legacyKey]
    }
    if (syncNeeded) {
        syncSettingTolocalStorage()
    }
}

async function buildSettingsFromLocalStorage () {
    const results = await browserWrapper.getFromStorage(['settings'])
    // copy over saved settings from storage
    if (!results) return
    settings = browserWrapper.mergeSavedSettings(settings, results)
    checkForLegacyKeys()
}

async function buildSettingsFromManagedStorage () {
    const results = await browserWrapper.getFromManagedStorage(MANAGED_SETTINGS)
    settings = browserWrapper.mergeSavedSettings(settings, results)
}

function buildSettingsFromDefaults () {
    // initial settings are a copy of default settings
    settings = Object.assign({}, defaultSettings)
}

function syncSettingTolocalStorage () {
    browserWrapper.syncToStorage({ settings: settings })
}

/**
 * @typedef {import('./classes/site.es6.js').allowlistName} allowlistName
 */

/**
 * @typedef {boolean} allowlistedValue
 */

/**
 * @typedef {{[k: string]: allowlistedValue}} allowlistList
 */

/**
 * @typedef {object} userData
 * @property {string} nextAlias
 * @property {string} userName
 * @property {string} existingToken
 * @property {string} [token]
 */

/**
 * @type {((name: 'all') => object | null)
 * & ((name: allowlistName) => allowlistList | null)
 * & ((name: 'lastTdsUpdate') => number | null)
 * & ((name: 'experimentData') => object | null)
 * & ((name: `${string}-etag`) => string | null)
 * & ((name: 'activeExperiment') => object | null)
 * & ((name: `${string}-channel`) => string | null)
 * & ((name: `${string}-lastUpdate`) => number | null)
 * & ((name: 'atb') => string | null)
 * & ((name: 'clickToLoadClicks') => {[k: string]: number} | null)
 * & ((name: 'userData') => userData | null)
 * & ((name: 'failedUpgrades') => number | null)
 * & ((name: 'httpsEverywhereEnabled') => boolean | null)
 * & ((name: 'totalUpgrades') => number | null)
 * & ((name: 'GPC') => boolean | null)
 * & ((name: 'rescheduleCounterMessagingOnStart') => boolean | null)
 * & ((name: 'showCounterMessaging') => boolean | null)
 * & ((name: 'showWelcomeBanner') => boolean | null)
 * & ((name: 'hasSeenPostInstall') => boolean | null)
 * & ((name: 'extiSent') => boolean | null)
 * & ((name: 'set_atb') => string | null)
 * & ((name: 'embeddedTweetsEnabled') => boolean | null)
 * }
 */
const getSetting = (name) => {
    if (!isReady) {
        console.warn(`Settings: getSetting() Settings not loaded: ${name}`)
        return
    }

    // let all and null return all settings
    if (name === 'all') name = null

    if (name) {
        return settings[name]
    } else {
        return settings
    }
}

function updateSetting (name, value) {
    if (!isReady) {
        console.warn(`Settings: updateSetting() Setting not loaded: ${name}`)
        return
    }

    settings[name] = value
    syncSettingTolocalStorage()
}

function removeSetting (name) {
    if (!isReady) {
        console.warn(`Settings: removeSetting() Setting not loaded: ${name}`)
        return
    }
    if (settings[name]) {
        delete settings[name]
        syncSettingTolocalStorage()
    }
}

function logSettings () {
    browserWrapper.getFromStorage(['settings']).then((s) => {
        console.log(s.settings)
    })
}

module.exports = {
    getSetting: getSetting,
    updateSetting: updateSetting,
    removeSetting: removeSetting,
    logSettings: logSettings,
    ready: ready
}
