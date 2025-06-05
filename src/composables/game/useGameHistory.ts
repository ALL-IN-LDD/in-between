/**
 * Managing the game history and providing utility functions for logging and retrieving events.
 *
 * @returns {Object} - An object containing various functions to interact with game history.
 */

import { computed } from 'vue'
import { useGameHistoryStore } from '@/stores/game-history'
import type { GameHistoryEvent } from '@/interface/game-history'

export function useGameHistory() {
  const historyStore = useGameHistoryStore()

  // ─────────────────────────────
  // Game History Logic
  // ─────────────────────────────

  /**
   * Get formatted event list for display.
   *
   * @returns {Array} - An array of formatted game history events.
   */
  const formattedEvents = computed(() => {
    return historyStore.events.map(formatEvent)
  })

  /**
   * Format individual event for display.
   *
   * @param {GameHistoryEvent} event - The event to format.
   * @returns {Object} - The formatted event with a timestamp.
   */
  const formatEvent = (event: GameHistoryEvent) => {
    const time = new Date(event.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Add time to the event message
    return {
      ...event,
      formattedMessage: `[${time}] ${event.message}`,
    }
  }

  /**
   * Get events filtered by type.
   *
   * @param {string} type - The type of events to filter.
   * @returns {Array} - An array of formatted events filtered by type.
   */
  const getEventsByType = (type: GameHistoryEvent['type']) => {
    return historyStore.getEventsByType(type).map(formatEvent)
  }

  /**
   * Get events filtered by player.
   *
   * @param {string} playerId - The ID of the player to filter events by.
   * @returns {Array} - An array of formatted events filtered by player.
   */
  const getEventsByPlayer = (playerId: string) => {
    return historyStore.getEventsByPlayer(playerId).map(formatEvent)
  }

  /**
   * Get most recent events.
   *
   * @param {number} [count=10] - The number of recent events to retrieve.
   * @returns {Array} - An array of formatted recent events.
   */
  const getRecentEvents = (count: number = 10) => {
    return historyStore.getLatestEvents(count).map(formatEvent)
  }

  /**
   * Get a logger for a specific player.
   *
   * @param {Object} player - The player object containing id and name.
   * @param {string|number} [player.id] - The ID of the player.
   * @param {string} [player.name] - The name of the player.
   * @returns {Object} - An object containing logging functions for the player.
   */
  const getPlayerLogger = (player: { id?: string | number; name?: string }) => {
    // Ensure playerId and playerName are defined
    const playerId = player.id ? String(player.id) : 'unknown-id' // Fallback value or throw an error
    const playerName = player.name || 'unknown-name' // Fallback value or throw an error

    return {
      logBet: (amount: number) => historyStore.logBet(playerId, playerName, amount),
      logWin: (amount: number) => historyStore.logWin(playerId, playerName, amount),
      logLoss: (amount: number) => historyStore.logLoss(playerId, playerName, amount),
      logFold: () => historyStore.logFold(playerId, playerName),
    }
  }

  /**
   * Check if the history store is empty.
   *
   * @returns {boolean} - True if the history store is empty, false otherwise.
   */

  const isHistoryEmpty = computed(() => {
    return historyStore.events.length === 0
  })

  // Log events using friendly methods (without card parameters)
  const logBet = historyStore.logBet
  const logWin = historyStore.logWin
  const logLoss = historyStore.logLoss
  const logFold = historyStore.logFold
  const logRake = historyStore.logRake
  const logSystemEvent = historyStore.logSystemEvent
  const clearHistory = historyStore.clearHistory

  return {
    allEvents: computed(() => historyStore.events),
    formattedEvents,
    getEventsByType,
    getEventsByPlayer,
    getRecentEvents,
    logBet,
    logWin,
    logLoss,
    logFold,
    logRake,
    logSystemEvent,
    clearHistory,
    isHistoryEmpty,
    getPlayerLogger,
  }
}
