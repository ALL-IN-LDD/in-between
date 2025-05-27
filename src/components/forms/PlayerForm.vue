<template>
  <el-form
    ref="ruleFormRef"
    :model="dynamicInputFields"
    :rules="useRegistrationRule"
    label-width="auto"
    class="demo-ruleForm"
    :label-position="labelPosition"
    :size="formSize"
    :max="100000000"
    status-icon
    @submit.prevent="onSubmit"
  >
    <div
      v-for="(field, index) in dynamicInputFields"
      :key="index"
      :class="['item-wrapper', isLastInOddArray(index) ? 'center-item' : '']"
    >
      <el-form-item
        :label="'Name:'"
        :prop="'[' + index + '].name'"
        :rules="useRegistrationRule.name"
      >
        <el-input size="small" v-model="dynamicInputFields[index].name" maxlength="16" />
      </el-form-item>

      <el-form-item
        :label="'Credits:'"
        :prop="'[' + index + '].credits'"
        :rules="useRegistrationRule.credits"
      >
        <el-input
          size="small"
          v-model.number="dynamicInputFields[index].credits"
          @input="onCreditInput($event, index)"
        />
      </el-form-item>
    </div>

    <div class="btn-group">
      <Button btnType="submit" variant="secondary">Continue</Button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ComponentSize, FormInstance, FormProps } from 'element-plus'
import type { Player } from '@/interface/player'
import { useRegistrationRule } from '@/composables/rules/useRegistrationRule'
import { usePlayerRegistration } from '@/stores/player'
import { useRouter } from 'vue-router'

const labelPosition = ref<FormProps['labelPosition']>('left')
const formSize = ref<ComponentSize>('default')
const ruleFormRef = ref<FormInstance>()
const playerRegistration = usePlayerRegistration()
const router = useRouter()

const numberOfPlayers = Number(localStorage.getItem('playerCount')) || 0

// Initialize dynamicInputFields as an array
const dynamicInputFields = ref<Player[]>(
  Array.from({ length: numberOfPlayers }, () => ({ name: '', credits: null })),
)

// Ensure the value does not exceed 1 billion
const onCreditInput = (value: string, index: number) => {
  const numericValue = Number(value)

  if (!Number.isNaN(numericValue)) {
    if (numericValue > 1000000000) {
      dynamicInputFields.value[index].credits = 1000000000
    } else if (numericValue < 0) {
      dynamicInputFields.value[index].credits = 0
    } else {
      dynamicInputFields.value[index].credits = numericValue
    }
  } else {
    dynamicInputFields.value[index].credits = null
  }
}

const onSubmit = async () => {
  try {
    const isValid = await ruleFormRef.value?.validate()
    if (isValid) {
      // Filter out empty entries
      const validPlayers = dynamicInputFields.value.filter(
        (player) => player.name && player.credits,
      )

      // Clear existing players first
      playerRegistration.clearPlayers()

      // Register each valid player individually
      validPlayers.forEach((player) => {
        playerRegistration.registerPlayer({
          id: Math.floor(Math.random() * 10000),
          name: player.name,
          credits: player.credits,
        })
      })
      // Reset the form fields
      ruleFormRef.value?.resetFields()

      // Go to GameZone
      router.push('/game-zone')
    }
  } catch (error) {
    console.error('Error during form submission:', error)
  }
}

const isLastInOddArray = (index: number): boolean => {
  return dynamicInputFields.value.length % 2 !== 0 && index === dynamicInputFields.value.length - 1
}
</script>

<style lang="css" scoped>
/* Form Button Group */
.btn-group {
  display: flex;
  justify-content: center;
  align-items: center;
  grid-column: span 2;
  gap: 10px;
}

/* Form Layout */
.el-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  place-items: start center;
  gap: 2.5rem;
  padding: 2rem 4rem;
}

/* Input Field Wrapper */
.item-wrapper {
  padding: 1rem 1.5rem;
  background-color: white;
  border-radius: 15px;
  height: 160px;
  width: 450px;
  max-width: 450px;
}

/* Center Item */
.center-item {
  grid-column: 1 / -1;
  justify-self: center;
}

/* Deep Styles for Form Inputs */
:deep(.el-form-item.is-error .el-input__wrapper) {
  box-shadow: none;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  letter-spacing: 1.2px;
  font-size: 1.1125em;
  text-transform: uppercase;
  color: black;
}

:deep(.el-input) {
  max-width: 250px;
  width: 250px;
  border: none !important;
}

:deep(.el-input-number) {
  max-width: 250px;
  width: 250px;
  border: none !important;
}

:deep(.el-input__wrapper) {
  padding: 0.2rem 0.5rem;
  border-bottom: 1px solid black;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

:deep(.el-input__inner) {
  font-size: 1em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

@media screen and (max-width: 768px) and (orientation: landscape) {
  .el-form {
    grid-template-columns: 1fr;
    padding: 1rem 2rem;
    gap: 1.5rem;
  }

  .item-wrapper {
    width: 90%;
    max-width: 350px;
    height: auto;
    padding: 0.8rem 1rem;
  }

  .btn-group {
    flex-direction: column;
    gap: 5px;
  }

  :deep(.el-input) {
    width: 100%;
    max-width: 100%;
  }

  :deep(.el-input__wrapper) {
    padding: 0.1rem 0.3rem;
    border-bottom: 1px solid black;
  }

  :deep(.el-input__inner) {
    font-size: 0.9em;
  }
}
</style>
