/**
 * Manages the entire gameplay state.
 * Documentation: src/docs/stores/gameStore.md
 */

import { defineStore } from 'pinia'
import { createDeck } from '@/utils/gameplay/deck/createDeckUtil'
import { shuffle } from '@/utils/gameplay/deck/shuffleDeck'
import { cards } from '@/utils/data/cards'
import type { Card } from '@/interface/card'
import type { GameState } from '@/interface/game-state'
import type { Player } from '@/interface/player'
import { usePlayerRegistration } from '@/stores/player'
import { usePlayerStore } from '@/stores/player-count'
import { useGameHistory } from '@/composables/game/useGameHistory'
import { useTaxation } from '@/composables/tax/useTaxation'
import { inject } from 'vue'
// import { defineEmits } from 'vue'
import {
  INITIAL_TURN_TIME,
  RAKE_AMOUNT,
  TRANSITION_DELAY,
  RANK_ORDER,
} from '@/const/game-constants'
import { showWinModal, showLoseModal, showFoldModal } from '@/utils/gameplay/pop-ups/modalUtil'
import { useNotification } from '@/composables/game/useNotification'

const { showNotification } = useNotification()

// ─────────────────────────────
// Initial State Factory
// ─────────────────────────────
const createInitialState = (): GameState => ({
  freshStart: false,
  deck: [],
  faceUpCards: [null, null],
  currentCard: null,
  currentBet: 0,
  message: '',
  gameOver: false,
  equalCardsChoice: null,
  awaitingEqualChoice: false,
  players: [],
  currentPlayerIndex: 0,
  roundsPlayed: 0,
  winnings: [],
  betsPlaced: [],
  gameStarted: false,
  communalPot: 0,
  rakeAmount: RAKE_AMOUNT,
  turnTimeRemaining: INITIAL_TURN_TIME,
  turnTimerActive: false,
  turnTimerInterval: null,
  turnTimerHalted: false,
  isMultiplayer: true,
  isAllInBet: false,
  insufficientPlayers: false,
  roundStartPlayerIndex: 0,
  completedFullRound: false,
  isPotWin: false,
  foldcount: 0,
})

export const useGameStore = defineStore('game', {
  state: (): GameState => {
    // Check if we should use saved state
    try {
      const savedState = localStorage.getItem('gameState')
      if (savedState) {
        return JSON.parse(savedState) as GameState
      }
    } catch (e) {
      console.error('Failed to parse saved game state:', e)
    }
    return createInitialState()
  },

  getters: {
    getTotalPot: (state) => {
      return state.players.reduce((acc, player) => acc + (player.credits ?? 0), 0)
    },
    getCurrentPlayerPot: (state) => state.players[state.currentPlayerIndex]?.credits || 0,
    canPlaceBet: (state) => !state.gameOver && !state.awaitingEqualChoice && state.currentBet === 0,
    canDrawCard: (state) => !state.gameOver && state.currentBet > 0 && !state.awaitingEqualChoice,
    activePlayerName: (state) => {
      return state.players[state.currentPlayerIndex]?.name || 'Player'
    },
    getCommunalPot: (state) => state.communalPot,
    getCardsLeft: (state) => state.deck.length,
    createDeck: (state) => state.deck.length,
  },

  actions: {
    // ─────────────────────────────
    // CARD UTILITY FUNCTIONS
    // ─────────────────────────────

    getCardId(suit: string, rank: string): string {
      const card = cards.find((card) => card.suit === suit && card.rank === rank)
      return card?.id || ''
    },

    ensureCardHasId(card: Card | null): Card | null {
      if (!card) return null
      if (!card.id && card.suit && card.rank) {
        return { ...card, id: this.getCardId(card.suit, card.rank) }
      }
      return card
    },

    // ─────────────────────────────
    // STORAGE FUNCTIONS
    // ─────────────────────────────

    saveStateToLocalStorage() {
      localStorage.setItem('gameState', JSON.stringify(this.$state))
    },

    initGameState() {
      try {
        const savedCard = localStorage.getItem('currentCard')
        if (savedCard) {
          this.currentCard = JSON.parse(savedCard)
        }
      } catch (e) {
        console.error('Failed to load saved card:', e)
      }
    },

    // ─────────────────────────────
    // GAME LIFECYCLE FUNCTIONS
    // ─────────────────────────────

    setupGame(players: Player[]) {
      this.players = players
      this.isMultiplayer = players.length > 1

      // Get actual player credits from storage
      const playerStore = usePlayerRegistration()
      playerStore.loadPlayersFromStorage()

      this.betsPlaced = new Array(players.length).fill(0)
      this.winnings = new Array(players.length).fill(0)
      this.currentPlayerIndex = 0

      this.saveStateToLocalStorage()
      this.startTurnTimer()
    },

    startGame() {
      localStorage.removeItem('currentCard')

      // Create and shuffle deck
      const createdDeck = createDeck()
      this.deck = shuffle(createdDeck)

      // Load players
      const playerStore = usePlayerRegistration()
      playerStore.loadPlayersFromStorage()
      this.roundStartPlayerIndex = 0
      this.completedFullRound = false
      // Check deck has enough cards
      if (this.deck.length < 3) {
        this.message = 'Error initializing deck. Please refresh.'
        return
      }

      // Draw initial cards
      try {
        const card1 = this.ensureCardHasId(this.deck.pop() || null)
        const card2 = this.ensureCardHasId(this.deck.pop() || null)

        if (!card1 || !card2) {
          throw new Error('Failed to draw cards from deck')
        }

        this.faceUpCards = [card1, card2]
      } catch (error) {
        console.error('Error drawing initial cards:', error)
        this.message = 'Error drawing cards. Please restart.'
        return
      }

      // Initialize game state
      this.communalPot = 0
      this.currentCard = null
      this.currentBet = 0
      this.gameOver = false
      this.equalCardsChoice = null
      this.awaitingEqualChoice = false
      this.roundsPlayed = 0
      this.gameStarted = true

      // Collect rake to start first round
      this.collectRake()
      this.message = `Game started! ${this.activePlayerName}'s turn to place a bet.`

      this.startTurnTimer()
      this.saveStateToLocalStorage()
    },

    resetGame() {
      const allPlayers = usePlayerRegistration()
      const playerCount = usePlayerStore()

      allPlayers.clearPlayers()
      playerCount.clearPlayerCount()
      localStorage.removeItem('gameState')

      this.$reset()
      this.freshStart = true
    },

    checkMinimumPlayers() {
      if (this.players.length <= 2 && this.gameStarted) {
        this.insufficientPlayers = true
        this.message = 'Not enough players to continue. Starting new game...'

        // Save final stats before reset
        const finalStats = this.getGameStats()
        console.log('Final game stats:', finalStats)

        // Reset the game after a short delay
        setTimeout(() => {
          this.resetGame()

          // Redirect to home/setup page
          // Note: You'll need to implement this navigation in your Vue component
          this.message = 'Please set up a new game with more players.'
        }, TRANSITION_DELAY)

        return true
      }
      return false
    },

    // Modify the gameOver action
    endGame() {
      this.gameOver = true
      this.stopTurnTimer()

      // Check if we need to force restart due to low player count
      if (this.checkMinimumPlayers()) {
        return
      }

      // Handle normal game over scenario
      this.message = 'Game Over! Final standings:'
      const stats = this.getGameStats()
      console.log('Game Over Stats:', stats)

      // Save final state
      this.saveStateToLocalStorage()
    },
    collectRakeAfterFullRound() {
      // Only collect if we have a communal pot and players
      if (this.communalPot <= 0 || this.players.length === 0) return

      const playerStore = usePlayerRegistration()
      let totalRakeCollected = 0

      // For multiplayer mode, collect rake from each registered player
      for (let i = 0; i < this.players.length; i++) {
        const playerId = this.players[i]?.id
        if (!playerId) continue

        const registeredPlayerIndex = playerStore.players.findIndex((p) => p.id === playerId)
        if (registeredPlayerIndex === -1) continue

        const registeredPlayer = playerStore.players[registeredPlayerIndex]
        const playerCredits = registeredPlayer.credits || 0

        // Collect rake or what player has if less
        const collectedAmount = Math.min(playerCredits, this.rakeAmount)
        registeredPlayer.credits = playerCredits - collectedAmount
        this.communalPot += collectedAmount
        totalRakeCollected += collectedAmount

        // Update player's pot in the game
        this.players[i].credits = registeredPlayer.credits
      }

      // Save updated player data
      localStorage.setItem('players', JSON.stringify(playerStore.players))

      // Show notification about rake collection
      showNotification({
        title: 'Rake Collected',
        message: `Full round completed! Rake of ${totalRakeCollected} credits has been added to the pot.`,
        type: 'info',
      })

      this.message = `Full round completed! Rake of ${this.rakeAmount} collected from all players.`

      // Reset the round completion flag
      this.completedFullRound = false
    },
    // ─────────────────────────────
    // PLAYER TURN FUNCTIONS
    // ─────────────────────────────
    nextPlayerTurn() {
      // Calculate the next player index
      const nextPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length

      // Check if we've completed a full round
      // (if the next player would be the one who started the round)
      if (nextPlayerIndex === this.roundStartPlayerIndex) {
        // We've gone through all players in the round
        this.completedFullRound = true

        // Collect rake if there's money in the pot
        if (this.communalPot > 0) {
          this.collectRakeAfterFullRound()
        }

        // Update starting player for next round (skip the previous first player)
        this.roundStartPlayerIndex = (this.roundStartPlayerIndex + 1) % this.players.length

        // Skip directly to the new starting player
        this.currentPlayerIndex = this.roundStartPlayerIndex

        console.log(
          `New round starting with Player: ${this.players[this.currentPlayerIndex]?.name}`,
        )
      } else {
        // Normal progression to next player
        this.currentPlayerIndex = nextPlayerIndex
      }

      // Reset current player's state
      this.currentCard = null
      this.currentBet = 0
      this.message = `${this.activePlayerName}'s turn. Place your bet.`

      this.startTurnTimer()
      this.saveStateToLocalStorage()
    },

    placeBet(betAmount: number) {
      const currentPot = this.players[this.currentPlayerIndex].credits || 0

      if (betAmount > currentPot) {
        this.message = 'Bet exceeds the pot amount!'
        return
      }

      this.currentBet = betAmount
      this.betsPlaced[this.currentPlayerIndex] = betAmount
      this.message = `${this.activePlayerName} bet placed: ${betAmount}`

      this.saveStateToLocalStorage()

      // Entry to game history
      const gameHistory = useGameHistory()
      const { logBet } = gameHistory.getPlayerLogger(this.players[this.currentPlayerIndex])
      logBet(betAmount)
    },

    cancelBet() {
      if (this.currentBet > 0) {
        this.currentBet = 0
        this.message = 'Bet canceled.'
        this.saveStateToLocalStorage()
        this.startTurnTimer()
      }
    },

    fold() {
      this.stopTurnTimer()
      this.message = `${this.players[this.currentPlayerIndex].name} folded and skipped their turn.`

      // Show fold modal
      showFoldModal()

      // Game history entry: FOLD
      const gameHistory = useGameHistory()
      const { logFold } = gameHistory.getPlayerLogger(this.players[this.currentPlayerIndex])
      logFold()

      this.roundsPlayed++
      this.saveStateToLocalStorage()

      this.foldcount++
      if (this.foldcount >= 10) {
        this.gameOver = true
      }

      // Move to next player's turn
      setTimeout(() => {
        this.nextPlayerTurn()
        this.drawNewFaceUpCards()
      }, TRANSITION_DELAY)

      // this.foldcount = 0
      // console.log('ilan', this.foldcount)
    },

    Timeout() {
      this.nextPlayerTurn()
      this.drawNewFaceUpCards()
    },
    TRANSITION_DELAY,

    autoFold() {
      if (this.gameStarted && !this.gameOver) {
        console.log('Time ran out - auto-folding')
        this.fold()
        // Don't call the regular fold here, we handle it specially
      }
      if (this.getCurrentPlayerPot === 0) {
        console.log('the pot is 0')
        this.quitPlayer()
      }
    },

    quitPlayer() {
      const playerStore = usePlayerRegistration()
      // const emit = defineEmits(['update:isCancelDialog'])
      const handleBackToMainCta = inject('addCredit') as () => void

      try {
        const index = this.currentPlayerIndex
        const playerId = this.players[index]?.id
        const playerName = this.players[index]?.name

        if (playerId) {
          playerStore.players = playerStore.players.filter((p) => p.id !== playerId)
          localStorage.setItem('players', JSON.stringify(playerStore.players))
          this.players.splice(index, 1)
          this.saveStateToLocalStorage()

          // emit('update:isCancelDialog', false)

          showNotification({
            title: 'Player Left',
            message: `${playerName} has quit the game`,
            type: 'success',
          })
          handleBackToMainCta()
          this.Timeout()
        }
      } catch (error) {
        console.error('Error removing player:', error)
      }
    },

    handleEqualCardsChoice(choice: 'higher' | 'lower') {
      // Stop the timer only after the player chooses
      this.stopTurnTimer()
      this.equalCardsChoice = choice
      this.awaitingEqualChoice = false
      // Now allow drawing the third card
      this.drawThirdCard()
      this.saveStateToLocalStorage()
    },

    /**
     * Checks if the face-up cards are equal and handles the game flow accordingly
     */
    checkForEqualCardsAndProcess() {
      const [card1, card2] = this.faceUpCards
      if (card1 && card2 && card1.rank === card2.rank) {
        // Cards are equal, set awaiting choice state
        this.awaitingEqualChoice = true
        this.message = 'Cards are equal! Choose to play higher or lower.'
        // Don't draw the third card yet - wait for player choice
      } else {
        // Cards are not equal, proceed with drawing the third card
        this.drawThirdCard()
      }
    },

    // ─────────────────────────────
    // CARD DRAWING & GAMEPLAY
    // ─────────────────────────────

    drawNewFaceUpCards() {
      if (this.deck.length < 2) {
        this.message += ' Not enough cards to continue. Game over.'
        this.gameOver = true
        return
      }

      const newCard1 = this.ensureCardHasId(this.deck.pop() || null)
      const newCard2 = this.ensureCardHasId(this.deck.pop() || null)

      if (!newCard1 || !newCard2) {
        this.message += ' Error drawing cards. Game over.'
        this.gameOver = true
        return
      }

      this.faceUpCards = [newCard1, newCard2]
    },

    drawThirdCard() {
      // Only allow drawing if not awaiting equal choice
      if (this.awaitingEqualChoice) {
        this.message = 'Choose higher or lower before drawing the card.'
        return
      }

      this.stopTurnTimer()

      if (this.currentBet <= 0) {
        this.message = 'Please place a bet first!'
        return
      }

      const drawnCard = this.deck.pop()
      if (!drawnCard) {
        this.message = 'No more cards in the deck!'
        this.gameOver = true
        return
      }

      // Set current card with ID
      this.currentCard = this.ensureCardHasId(drawnCard)
      localStorage.setItem('currentCard', JSON.stringify(this.currentCard))

      // Process game result
      this.processGameResult()

      // Check if game should end
      if (this.deck.length < 3) {
        this.message += ' Not enough cards to continue. Game over.'
        this.endGame()
        return
      }

      // Handle next round
      this.handleNextRound()
    },

    isAllInBet: false, // Flag to track if the current bet is an all-in

    // Add this method to set the all-in flag
    setAllInFlag(isAllIn: boolean) {
      this.isAllInBet = isAllIn
      this.saveStateToLocalStorage()
    },

    processGameResult() {
      // Extract card values
      const [card1, card2] = this.faceUpCards
      const r1 = card1?.rank ? RANK_ORDER[card1.rank.toString()] || 0 : 0
      const r2 = card2?.rank ? RANK_ORDER[card2.rank.toString()] || 0 : 0
      const r3 = this.currentCard?.rank ? RANK_ORDER[this.currentCard.rank.toString()] || 0 : 0

      // Find min/max values
      const lower = Math.min(r1, r2)
      const higher = Math.max(r1, r2)

      let winAmount = 0
      let resultMessage = ''

      // Handle equal cards case
      if (r1 === r2) {
        if (!this.equalCardsChoice && !this.awaitingEqualChoice) {
          // Await player input, but DO NOT stop the timer
          this.awaitingEqualChoice = true
          this.message = 'Cards are equal! Choose to play higher or lower.'
          // Do NOT draw or process further until player chooses
          return
        }

        // Only process result if player has made a choice
        if (!this.equalCardsChoice) {
          // Still waiting for player input, do not proceed
          return
        }

        winAmount = this.processEqualCardsResult(r1, r3)
        resultMessage = this.getEqualCardsMessage(card1?.rank, r1, r3)
      }
      // Handle consecutive cards case
      else if (higher - lower === 1) {
        winAmount = -this.currentBet
        this.communalPot += this.currentBet
        resultMessage = 'Lose! Cards are consecutive.'
      }
      // Handle standard case (cards with gap)
      else {
        if (r3 > lower && r3 < higher) {
          // Win
          winAmount = this.currentBet
          this.communalPot -= this.currentBet
          resultMessage = `Win! ${this.currentCard?.rank} is between ${card1?.rank} and ${card2?.rank}. You win ${this.currentBet} credits!`
        } else if (r3 === r1 || r3 === r2) {
          // Double loss
          winAmount = -this.currentBet * 2
          this.communalPot += this.currentBet * 2
          resultMessage = `Lose! Card matches one of the face-up cards. You lose double your bet!`
        } else {
          // Regular loss
          winAmount = -this.currentBet
          this.communalPot += this.currentBet
          resultMessage = `Lose! ${this.currentCard?.rank} is not between ${card1?.rank} and ${card2?.rank}.`
        }
      }

      // Reset state
      this.awaitingEqualChoice = false
      this.equalCardsChoice = null

      const player = this.players[this.currentPlayerIndex]
      const playerName = player?.name || `Player ${this.currentPlayerIndex + 1}`

      // IMPORTANT: Apply tax if this is a win from an all-in bet
      if (winAmount > 0 && this.isAllInBet) {
        // Import taxation composable
        const { processTax } = useTaxation()

        // Process tax on the win amount
        const taxAmount = processTax(
          player?.id,
          winAmount,
          true, // isAllIn = true
        )

        // Adjust win amount after tax
        if (taxAmount > 0) {
          winAmount -= taxAmount

          // Update result message to include tax information
          resultMessage = resultMessage.replace(
            `You win ${this.currentBet} credits!`,
            `You win ${winAmount} credits! (${taxAmount} tax deducted)`,
          )
        }
      }

      // Update player credits and game state
      this.updatePlayerCredits(winAmount)
      this.message = `${playerName}: ${resultMessage}`

      // Show appropriate modal based on outcome
      if (winAmount > 0) {
        showWinModal()
      } else {
        showLoseModal()
      }

      // Get the player logger for the current player
      const gameHistory = useGameHistory()
      const { logWin, logLoss } = gameHistory.getPlayerLogger(player)

      // Log the win or loss based on winAmount
      if (winAmount > 0) {
        logWin(winAmount) // Pass isAllIn flag to the logger
      } else {
        logLoss(Math.abs(winAmount))
      }

      this.roundsPlayed++
      this.currentBet = 0

      // Reset the all-in flag
      this.isAllInBet = false

      if (this.communalPot <= 0.01 && winAmount > 0) {
        // Update starting player for next round (skip the previous first player)
        this.roundStartPlayerIndex = (this.roundStartPlayerIndex + 1) % this.players.length

        // Reset to the new starting player instead of moving to next player
        this.currentPlayerIndex = this.roundStartPlayerIndex

        // Add message indicating new round
        this.message += ' Pot won! Starting new round.'

        // Collect rake for the new round
        this.collectRake()

        // Flag that we're handling a pot win (new flag)
        this.isPotWin = true

        // Save state before transition
        this.saveStateToLocalStorage()

        // Handle next round with a slight delay
        setTimeout(() => {
          this.drawNewFaceUpCards()
        }, TRANSITION_DELAY)

        return // Exit early to prevent the regular next turn handling
      }

      this.saveStateToLocalStorage()
    },

    processEqualCardsResult(faceUpRank: number, drawnRank: number): number {
      if (this.equalCardsChoice === 'higher') {
        if (drawnRank > faceUpRank) {
          // Win
          this.communalPot -= this.currentBet
          return this.currentBet
        } else {
          // Lose
          this.communalPot += this.currentBet
          return -this.currentBet
        }
      } else if (this.equalCardsChoice === 'lower') {
        if (drawnRank < faceUpRank) {
          // Win
          this.communalPot -= this.currentBet
          return this.currentBet
        } else {
          // Lose
          this.communalPot += this.currentBet
          return -this.currentBet
        }
      }
      return 0
    },

    getEqualCardsMessage(
      cardRank: string | undefined,
      faceUpRank: number,
      drawnRank: number,
    ): string {
      if (this.equalCardsChoice === 'higher') {
        return drawnRank > faceUpRank
          ? `Win! ${this.currentCard?.rank} is higher than ${cardRank}. You win ${this.currentBet} credits!`
          : `Lose! ${this.currentCard?.rank} is not higher than ${cardRank}.`
      } else {
        return drawnRank < faceUpRank
          ? `Win! ${this.currentCard?.rank} is lower than ${cardRank}. You win ${this.currentBet} credits!`
          : `Lose! ${this.currentCard?.rank} is not lower than ${cardRank}.`
      }
    },

    updatePlayerCredits(winAmount: number) {
      const currentPlayer = this.players[this.currentPlayerIndex]

      // Update player's pot in the game

      if (currentPlayer) {
        currentPlayer.credits = (currentPlayer.credits ?? 0) + winAmount
      }

      // Update registered player's credits
      const playerStore = usePlayerRegistration()
      const playerId = this.players[this.currentPlayerIndex]?.id

      if (playerId) {
        const playerIndex = playerStore.players.findIndex((p) => p.id === playerId)
        if (playerIndex !== -1) {
          const registeredPlayer = playerStore.players[playerIndex]
          registeredPlayer.credits = Math.max(0, (registeredPlayer.credits || 0) + winAmount)
        }
      }

      // Track winnings
      if (winAmount > 0) {
        this.winnings[this.currentPlayerIndex] += winAmount
      }

      // Save updated player data
      localStorage.setItem('players', JSON.stringify(playerStore.players))
    },
    handleNextRound() {
      // Check if we're handling a pot win scenario
      if (this.isPotWin) {
        // Draw new face-up cards and properly reset the player's state for new round
        setTimeout(() => {
          // Reset the current card (third card)
          this.currentCard = null

          // Draw new face-up cards
          this.drawNewFaceUpCards()

          // Reset current player's state for the new round
          this.currentBet = 0
          this.message = `${this.activePlayerName}'s turn. Place your bet.`

          // Start the turn timer for the new player
          this.startTurnTimer()

          // Reset the pot win flag
          this.isPotWin = false

          // Save the updated state
          this.saveStateToLocalStorage()
        }, TRANSITION_DELAY)
        return
      }

      // Regular case - move to next player
      setTimeout(() => {
        this.nextPlayerTurn()
        this.drawNewFaceUpCards()
      }, TRANSITION_DELAY)
    },

    // ─────────────────────────────
    // MONETARY FUNCTIONS
    // ─────────────────────────────

    collectRake() {
      const playerStore = usePlayerRegistration()

      // For multiplayer mode, collect rake from each registered player
      for (let i = 0; i < this.players.length; i++) {
        const playerId = this.players[i]?.id
        if (!playerId) continue

        const registeredPlayerIndex = playerStore.players.findIndex((p) => p.id === playerId)
        if (registeredPlayerIndex === -1) {
          // Ensure the player object exists and has the required properties
          this.players[i] = {
            id: '',
            name: '',
            credits: 0,
            randomizedPosition: 0,
            isTurn: false,
            isTurnComplete: false,
          }
          continue
        }

        const registeredPlayer = playerStore.players[registeredPlayerIndex]
        const playerCredits = registeredPlayer.credits || 0

        // Collect rake or what player has if less
        const collectedAmount = Math.min(playerCredits, this.rakeAmount)
        registeredPlayer.credits = playerCredits - collectedAmount
        this.communalPot += collectedAmount

        // Update player's pot in the game

        this.players[i].credits = registeredPlayer.credits
      }

      // Save updated player data
      localStorage.setItem('players', JSON.stringify(playerStore.players))

      this.message = `New round started! Rake of ${this.rakeAmount} collected from players.`
      this.saveStateToLocalStorage()
    },

    // ─────────────────────────────
    // TIMER FUNCTIONS
    // ─────────────────────────────

    startTurnTimer() {
      this.stopTurnTimer()
      this.turnTimeRemaining = INITIAL_TURN_TIME
      this.turnTimerActive = true

      this.turnTimerInterval = setInterval(() => {
        this.turnTimeRemaining--
        if (this.turnTimeRemaining <= 0) {
          this.stopTurnTimer()
          this.autoFold()
        }
      }, 1000)
    },

    stopTurnTimer() {
      if (this.turnTimerInterval) {
        clearInterval(this.turnTimerInterval)
        this.turnTimerInterval = null
      }
      this.turnTimerActive = false
    },

    haltTurnTimer() {
      if (this.turnTimerActive && this.turnTimerInterval) {
        clearInterval(this.turnTimerInterval)
        this.turnTimerInterval = null
        this.turnTimerHalted = true
      }
    },

    resumeTurnTimer() {
      if (this.turnTimerHalted) {
        this.turnTimerInterval = setInterval(() => {
          this.turnTimeRemaining--
          if (this.turnTimeRemaining <= 0) {
            this.stopTurnTimer()
            this.autoFold()
          }
        }, 1000)
        this.turnTimerHalted = false
      }
    },

    // ─────────────────────────────
    // UTILITY FUNCTIONS
    // ─────────────────────────────

    getGameStats() {
      return {
        roundsPlayed: this.roundsPlayed,
        playerStats: this.players.map((player, index) => ({
          name: player.name,
          currentPot: this.players[index].credits,
          totalWinnings: this.winnings[index],
        })),
      }
    },

    // Add a new reshuffleDeck action
    reshuffleDeck() {
      // Create and shuffle a new deck
      const createdDeck = createDeck()
      this.deck = shuffle(createdDeck)

      // Reset only the necessary state for continuation
      this.gameOver = false
      this.message = 'Deck has been reshuffled! Game continues.'

      // Draw new face-up cards
      if (this.deck.length >= 2) {
        const card1 = this.deck.pop()
        const card2 = this.deck.pop()

        if (card1 && card2) {
          this.faceUpCards = [this.ensureCardHasId(card1), this.ensureCardHasId(card2)]
        }
      }

      // Reset the current player's state
      this.currentCard = null
      this.currentBet = 0

      // Start the turn timer again
      this.startTurnTimer()

      // Save state to localStorage
      this.saveStateToLocalStorage()
    },

    removeCardFromDeck(card: Card) {
      const cardIndex = this.deck.findIndex((deckCard) => deckCard.id === card.id)
      if (cardIndex !== -1) {
        this.deck.splice(cardIndex, 1) // Remove the card from the deck
      }
    },
  },
})
