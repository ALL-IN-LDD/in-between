<!-- Game Call-to-Action Component
  Displays game action buttons like "All-In", "Bet", "Fold", and "Credit Form".
  The component shows different options based on whether the player is adding credit or choosing a bet.

  Props:
    - addCredit: boolean — Controls whether the "Credit Form" should be shown.

  Emits:
    - close-bet: event — Emitted when the bet form is closed.

-->

<template>
  <div v-if="chooseBet" class="actions-wrapper">
    <!-- Bet form component shown when chooseBet is true -->
    <BetForm @close-bet="handeBackOption" v-model:chooseBet="chooseBet" />
  </div>

  <div v-else class="actions-wrapper">
    <div v-if="addCredit" class="btn-wrapper">
      <!-- All-in option button -->
      <img
        src="../../assets/img/buttons/cta/all-in.png"
        alt="all-in-png"
        class="all-in-cta"
        :class="{ 'disabled-button': !canGoAllIn }"
        :title="!canGoAllIn ? allInTooltipText : ''"
        @click="canGoAllIn && handleAllIn()"
        id="btn7"
      />

      <!-- Bet option button -->
      <img
        src="../../assets/img/buttons/cta/bet.png"
        alt="bet-btn"
        class="bet-cta"
        @click="handleBetOption"
        id="btn8"
      />

      <!-- Fold option button -->
      <img
        src="../../assets/img/buttons/cta/fold.png"
        alt="fold-btn"
        class="fold-cta"
        @click="handleFold"
        id="btn9"
      />
    </div>

    <!-- Credit form section shown when addCredit is false -->
    <div v-else class="credit">
      <CreditForm :addCredit="addCredit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game-store'

/**
 * Flagger whether to show the bet form
 */
const chooseBet = ref(false)

/**
 * Props from parent component
 */
defineProps({
  /**
   * Controls whether the "Credit Form" should be shown.
   * If `true`, the credit form is displayed instead of betting options.
   */
  addCredit: {
    type: Boolean,
    default: false,
  },
})

const gameStore = useGameStore()

/**
 * Player's available credits - simplified to use only playerPots
 */

const playerCredits = computed(() => {
  const player = gameStore.players[gameStore.currentPlayerIndex]
  return player?.credits ?? 0
})

/**
 * Determines if player can go all-in based on available credits compared to communal pot
 */
const canGoAllIn = computed(() => {
  // Player can only go all-in if they have at least as much credit as the communal pot
  return playerCredits.value >= gameStore.communalPot && gameStore.communalPot > 0
})

/**
 * Get tooltip text for disabled all-in button
 */
const allInTooltipText = computed(() => {
  if (gameStore.communalPot <= 0) {
    return 'No pot available to go All-In'
  }
  return `You need ${gameStore.communalPot} credits to match the pot for All-In`
})

/**
 * Handle all-in bet action
 */
const handleAllIn = () => {
  const allInAmount = Math.min(playerCredits.value, gameStore.communalPot)
  if (allInAmount > 0) {
    // Check for equal cards before placing bet
    gameStore.checkForEqualCardsAndProcess()

    // Place the bet
    gameStore.placeBet(allInAmount)

    // Set the all-in flag to true so tax can be applied if player wins
    gameStore.setAllInFlag(true)

    // Draw the third card to determine outcome
    gameStore.drawThirdCard()
    gameStore.foldcount = 0
  }
}

/**
 * Handle opening the bet form
 */
const handleBetOption = () => {
  if (playerCredits.value > 100) {
    chooseBet.value = true
    gameStore.foldcount = 0
  }
}

/**
 * Handle closing the bet form
 */
const handeBackOption = () => {
  console.log('Closing bet form')
  chooseBet.value = false
}

/**
 * Handle folding action
 */
const handleFold = () => {
  gameStore.fold()
}

// ─────────────────────────────
// Watchers
// ─────────────────────────────

// Watch: Changes to player credits
watch(playerCredits, (newValue) => {
  console.log('Player credits changed:', newValue)
  if (newValue <= 0 && chooseBet.value) {
    chooseBet.value = false
  }
})
</script>

<style lang="css" scoped>
.actions-wrapper {
  position: relative;
  width: 100%;
  height: 100%;

  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 20px;
  z-index: 999;
  @media (max-width: 932px) and (max-height: 430px) {
    gap: 0;
  }
}

.el-form {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.btn-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;

  /* Reduce gap on smaller screens */
  @media screen and (max-width: 768px) {
    gap: 15px;
  }

  /* Further reduce gap for very small screens */
  @media screen and (max-width: 480px) {
    gap: 10px;
  }

  /* Adjust for landscape mode on mobile devices */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    gap: 12px;
  }

  /* Specific adjustments for iPhone-sized devices in landscape */
  @media screen and (orientation: landscape) and (max-width: 932px) and (max-height: 430px) {
    gap: 8px;
  }
}

.credit-form-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 1rem 2rem;
  border-radius: 20px;
}

.input-credits-text {
  width: 250px;
  height: 50px;
}

.all-in-cta,
.fold-cta {
  margin-top: 20px;
  width: 250px;
  height: 80px;
  cursor: pointer;

  /* Responsive sizing for mobile devices */
  @media screen and (max-width: 768px) {
    width: 200px;
    height: 65px;
  }

  /* Even smaller for very small screens */
  @media screen and (max-width: 480px) {
    width: 180px;
    height: 58px;
  }

  /* Landscape mode on mobile devices */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    width: 170px;
    height: 55px;
    margin-top: 10px;
  }

  /* Specific adjustments for iPhone-sized devices in landscape */
  @media screen and (orientation: landscape) and (max-width: 932px) and (max-height: 430px) {
    width: 150px;
    height: 50px;
    margin-top: 5px;
  }
}

.bet-cta {
  margin-top: 20px;
  width: 250px;
  height: 85px;
  margin-bottom: 5px;
  cursor: pointer;

  /* Responsive sizing for mobile devices */
  @media screen and (max-width: 768px) {
    width: 200px;
    height: 68px;
  }

  /* Even smaller for very small screens */
  @media screen and (max-width: 480px) {
    width: 180px;
    height: 62px;
  }

  /* Landscape mode on mobile devices */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    width: 170px;
    height: 58px;
    margin-top: 10px;
  }

  /* Specific adjustments for iPhone-sized devices in landscape */
  @media screen and (orientation: landscape) and (max-width: 932px) and (max-height: 430px) {
    width: 150px;
    height: 52px;
    margin-top: 5px;
    margin-bottom: 2px;
  }
}

.back-cta {
  position: absolute;
  top: 0;
  left: 0;
  width: 30px;
  height: 30px;
  cursor: pointer;
}

.deal-cta {
  margin-top: 15px;
  width: 220px;
  height: 50px;
  cursor: pointer;

  /* Responsive sizing for mobile */
  @media screen and (max-width: 768px) {
    width: 180px;
    height: 42px;
    margin-top: 10px;
  }

  /* Even smaller for very small screens */
  @media screen and (max-width: 480px) {
    width: 160px;
    height: 38px;
  }

  /* Landscape mode on mobile devices */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    width: 150px;
    height: 35px;
    margin-top: 8px;
  }

  /* Specific adjustments for iPhone-sized devices in landscape */
  @media screen and (orientation: landscape) and (max-width: 932px) and (max-height: 430px) {
    width: 130px;
    height: 30px;
    margin-top: 5px;
  }
}

.el-input {
  max-width: 250px;
  width: 150px;
}

.slider-demo-block {
  width: 100%;
}

.credit {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.insufficient {
  width: 100%;
  height: 40px;
}

.credit-wrapper {
  width: 100%;
}

.credit-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.credit-actions img {
  width: 280px;
  height: 70px;
  cursor: pointer;

  /* Responsive sizing for mobile */
  @media screen and (max-width: 768px) {
    width: 220px;
    height: 55px;
  }

  /* Even smaller for very small screens */
  @media screen and (max-width: 480px) {
    width: 180px;
    height: 45px;
  }

  /* Landscape mode on mobile devices */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    width: 200px;
    height: 50px;
  }

  /* Specific adjustments for iPhone-sized devices in landscape */
  @media screen and (orientation: landscape) and (max-width: 932px) and (max-height: 430px) {
    width: 160px;
    height: 40px;
  }
}

.add-credits-cta {
  position: absolute;
  top: 30%;
  right: -20%;
  width: 190px;
  height: 60px;
  cursor: pointer;

  /* Responsive sizing for mobile */
  @media screen and (max-width: 768px) {
    width: 160px;
    height: 50px;
    right: -15%;
  }

  /* Even smaller for very small screens */
  @media screen and (max-width: 480px) {
    width: 140px;
    height: 45px;
  }

  /* Landscape mode on mobile devices */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    width: 130px;
    height: 42px;
    right: -12%;
  }

  /* Specific adjustments for iPhone-sized devices in landscape */
  @media screen and (orientation: landscape) and (max-width: 932px) and (max-height: 430px) {
    width: 110px;
    height: 36px;
    right: -10%;
  }
}

:deep(.el-input) {
  width: 150px;
}

:deep(.el-slider) {
  display: flex;
  flex-direction: row-reverse;
  gap: 20px;
}

:deep(.el-input__wrapper) {
  box-shadow: none;
  background-color: black;
}

:deep(.el-input__inner) {
  color: white;
  font-family: 'Baumans';
}

:deep(.el-slider__bar) {
  background-color: #ffd700;
}

:deep(.el-slider__button) {
  background-color: black;
  border: none;
}

.disabled-button {
  opacity: 0.5;
  filter: grayscale(70%);
  cursor: not-allowed !important;
}

/* Dialog styling enhancements */
.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}

:deep(.game-dialog) {
  display: flex;
  align-items: center;
  justify-items: center;
  align-content: center;
  justify-content: center;
  border-radius: 10px;
}

:deep(.el-dialog) {
  display: flex !important;
  flex-direction: column;
  margin: 0 auto !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
}

:deep(.el-dialog__header) {
  margin: 0;
  text-align: center;
  font-weight: bold;
  padding-top: 20px;
  font-family: 'Baumans', sans-serif;
}

:deep(.el-dialog__body) {
  text-align: center;
  padding: 20px;
  font-family: 'Baumans', sans-serif;
}

:deep(.dialog-overlay) {
  background-color: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(3px);
}

:deep(.el-button) {
  font-family: 'Baumans', sans-serif;
  min-width: 100px;
}

:deep(.el-overlay) {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2000;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  overflow: auto;
  display: flex;
  align-items: center;
  justify-items: center;
  align-content: center;
  justify-content: center;
}
</style>
