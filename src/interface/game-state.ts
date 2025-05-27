/**
 * Represents the complete state of the card game
 * Contains all data necessary to track game progress, player actions, and rendering
 */

import type { Player } from './player'
import type { Card } from '@/interface/card'

export interface GameState {
  /** Indicates if the game is starting fresh (first-time launch) */
  freshStart: boolean

  /** All cards in the current deck */
  deck: Card[]

  /** Array of visible cards on the table, can contain null for empty positions */
  faceUpCards: (Card | null)[]

  /** The currently active card in play */
  currentCard: Card | null

  /** The amount the player is currently betting  */
  currentBet: number

  /** Text message to display to the player */
  message: string

  /** Flag indicating if the game has ended */
  gameOver: boolean

  /** Player's choice when equal cards are drawn (higher or lower) */
  equalCardsChoice: 'higher' | 'lower' | null

  /** Flag indicating system is waiting for player's higher/lower decision */
  awaitingEqualChoice: boolean

  // Multiplayer related properties

  /** Whether the game is in multiplayer mode */
  isMultiplayer: boolean

  /** Array of all players in the game */
  players: Player[]

  /** Index of the player whose turn it currently is */
  currentPlayerIndex: number

  /** Total number of rounds completed */
  roundsPlayed: number

  /** Array tracking total winnings for each player */
  winnings: number[]

  /** Array tracking the bets placed by each player in current round */
  betsPlaced: number[]

  /** Flag indicating if the game has officially started */
  gameStarted: boolean

  // Timer related properties

  /** Seconds remaining in current player's turn */
  turnTimeRemaining: number

  /** Whether the turn timer is currently running */
  turnTimerActive: boolean

  /** Reference to the turn timer interval for clearing */
  turnTimerInterval: ReturnType<typeof setTimeout> | null

  /** Flag indicating if the turn timer has been paused */
  turnTimerHalted: boolean

  // Additional game properties

  /** Total amount in the shared pot accessible to all players */
  communalPot: number

  /** Amount deducted from each pot as rake */
  rakeAmount: number

  insufficientPlayers: boolean

  isAllInBet?: boolean
  /** Index of the player who started the current round */
  roundStartPlayerIndex: number

  /** Tracks if we've gone through all players in a round */
  completedFullRound: boolean


  isPotWin: boolean

  foldcount :number

}
