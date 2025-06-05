<template>
  <!-- credit form -->
  <div v-if="creditForm" class="credit-form-wrapper">
    <el-form
      :model="formModel"
      :rules="rules"
      ref="ruleFormRef"
      @submit.prevent="handleSubmitCredit"
    >
      <img
        src="../../assets/img/buttons/credits/input-credits.png"
        alt="input-text"
        class="input-credits-text"
      />

      <el-form-item prop="creditValue">
        <el-input
          size="large"
          placeholder="Input Credits..."
          v-model.number="formModel.creditValue"
          @input="handleCreditInput"
        />
      </el-form-item>

      <!-- <el-input size="large" placeholder="Input Credits..." v-model="creditValue" /> -->

      <img
        src="../../assets/img/buttons/credits/add-credits.png"
        alt="add-btn"
        class="add-credits-cta"
        @click="handleSubmitCredit"
      />

      <img
        src="../../assets/img/buttons/actions/ekis.png"
        alt="ekis-btn"
        class="back-cta"
        @click="handleBackToAddCredit"
      />
    </el-form>
  </div>

  <!-- credit homepage -->
  <div v-else class="insufficient-wrapper">
    <div v-if="isEmptyPot" class="credit-wrapper">
      <h1 class="credits">Add Credits</h1>
    </div>

    <div v-else class="credit-wrapper">
      <img
        src="../../assets/img/buttons/credits/insufficient.png"
        alt="all-in-png"
        class="insufficient"
      />
    </div>

    <CreditActions :creditForm="creditForm" @update:credit-form="handleAddCredit" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useGameStore } from '@/stores/game-store'
import { usePlayerRegistration } from '@/stores/player'
import CreditActions from '../currency/CreditActions.vue'
import { useNotification } from '@/composables/game/useNotification'

// const showAllInConfirmation = ref(false)
const creditValue = ref()
const gameStore = useGameStore()
const playerStore = usePlayerRegistration()
const isEmptyPot = ref(false)

const ruleFormRef = ref<FormInstance>()

const rules = reactive<FormRules>({
  creditValue: [
    {
      required: true,
      message: 'Credit is required',
      trigger: 'change',
    },
    {
      type: 'number',
      message: 'Credit must be a number',
      trigger: 'change',
    },
    {
      validator: (rule, value, callback) => {
        if (value > 1000000000) {
          callback(new Error('Credit must be less than 1,000,000'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
})

// Wrap creditValue in an object for validation
const formModel = reactive({
  creditValue,
})

const creditForm = ref(false)
const { showNotification } = useNotification()

const handleAddCredit = () => {
  creditForm.value = true
}

const handleBackToAddCredit = () => {
  creditForm.value = false
}

const getPot = gameStore.getCurrentPlayerPot

if (getPot > 0) {
  isEmptyPot.value = true
}

const handleSubmitCredit = async () => {
  if (!ruleFormRef.value) return
  await ruleFormRef.value.validate((valid) => {
    if (!valid) return

    try {
      // const isValid = ruleFormRef.value?.validate()

      const index = gameStore.currentPlayerIndex

      if (!gameStore.players[index]) {
        gameStore.players[index] = {
          id: '',
          name: '',
          credits: 0,
          randomizedPosition: 0,
          isTurn: false,
          isTurnComplete: false,
        }
      }

      // Update in-game credits

      gameStore.players[index].credits =
        (gameStore.players[index].credits ?? 0) + Number(creditValue.value)

      // Update player registration store
      const playerId = gameStore.players[index]?.id
      if (playerId) {
        const playerIndex = playerStore.players.findIndex((p) => p.id === playerId)
        if (playerIndex !== -1) {
          const currentCredits = playerStore.players[playerIndex].credits || 0
          playerStore.players[playerIndex].credits = currentCredits + Number(creditValue.value)
        }
      }

      // Save updated player data to localStorage
      localStorage.setItem('players', JSON.stringify(playerStore.players))

      // Update game state in localStorage
      gameStore.saveStateToLocalStorage()

      showNotification({
        title: 'Player Cash-In',
        message: `Player Cash-in ${creditValue.value}`,
        type: 'success',
      })

      creditValue.value = null
      creditForm.value = false
    } catch (error) {
      console.error('Error adding credits:', error)
    }
  })
}

const handleCreditInput = (value: string) => {
  const numericValue = Number(value)

  if (!Number.isNaN(numericValue)) {
    if (numericValue > 1000000000) {
      formModel.creditValue = 1000000000
    } else if (numericValue < 0) {
      formModel.creditValue = 0
    } else {
      formModel.creditValue = numericValue
    }
  } else {
    formModel.creditValue = null
  }
}
</script>

<style scoped>
.el-form {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 20px;
}

.input-credits-text {
  width: 250px;
  height: 50px;
}

.back-cta {
  position: absolute;
  top: 0;
  left: 0;
  width: 30px;
  height: 30px;
  cursor: pointer;
}

.add-credits-cta {
  position: absolute;
  top: 30%;
  right: -50%;
  width: 190px;
  height: 60px;
  cursor: pointer;
}

.insufficient-wrapper {
  width: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  padding: 1rem 2rem;
}

.credit-wrapper {
  width: 100%;
}

.insufficient {
  width: 100%;
  height: 40px;
}

.credit-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.back {
  position: absolute;
  top: 0;
  left: -5%;
  width: 30px !important;
  height: 30px !important;
  cursor: pointer;
}

.credits {
  text-align: center;
  text-transform: uppercase;
  color: white;
  letter-spacing: 2px;
}

:deep(.el-form-item__error) {
  font-size: 16px;
}

:deep(.el-input) {
  width: 150px;
}

:deep(.el-input__wrapper) {
  box-shadow: none;
  background-color: black;
}

:deep(.el-input__inner) {
  color: white;
  font-family: 'Baumans';
}

/* Add media queries for iPhone 14 landscape format */
@media (max-width: 932px) and (max-height: 430px) {
  .input-credits-text {
    width: 130px;
    height: 20px;
  }

  .add-credits-cta {
    width: 100px;
    height: 40px;
    right: -60%;
  }

  .back-cta {
    width: 25px;
    height: 25px;
  }

  .insufficient-wrapper {
    padding: 0.5rem 1rem;
  }

  .insufficient {
    width: 130px;
    height: 50px;
  }

  .credits {
    font-size: 1.5rem;
  }

  :deep(.el-input) {
    width: 120px;
  }
}
</style>
