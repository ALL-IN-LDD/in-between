<template>
  <el-dialog v-model="mainMenuVisible" title="Warning" width="400" align-center>
    <!-- Close button -->
    <el-row justify="end" :gutter="24">
      <el-col :span="4">
        <img
          src="../../assets/img/buttons/actions/ekis.png"
          alt="back-btn"
          class="close-btn"
          @click="closeMainMenu"
        />
      </el-col>
    </el-row>

    <!-- Title section -->
    <el-row justify="center" :gutter="24">
      <el-col :span="30"><p class="title-main-menu">Main Menu</p></el-col>
    </el-row>

    <!-- Menu buttons -->
    <div class="menu-btn-cont">
      <img
        src="../../assets/img/buttons/main-menu/how-to-play.png"
        alt="how-to-play-btn"
        class="main-menu-btns"
        @click="toggleTour"
      />

      <img
        src="../../assets/img/buttons/main-menu/game-rules.png"
        alt="game-rules-btn"
        class="main-menu-rules-btns"
        @click="toggleRules"
      />

      <img
        src="../../assets/img/buttons/main-menu/restart-game.png"
        alt="restart-game-btn"
        class="main-menu-btns"
        @click="startNewGame"
      />
    </div>

    <!-- Footer section (empty) -->
    <template #footer>
      <div class="dialog-footer"></div>
    </template>
  </el-dialog>
  <HowToPlayDialog v-model="showTour" />
  <GameRules v-model="showRules" />

  <!-- Additional 'How to Play' Dialog -->
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameLifeCycle } from '@/composables/game/useGameLifeCycle'
import eventBus from '@/eventBus'
import { useGameStore } from '@/stores/game-store'
import GameRules from './GameRules.vue'
import HowToPlayDialog from './HowToPlayDialog.vue'
// import GameRules from '@/components/dialog/GameRules.vue'

const gameStore = useGameStore()
const showRules = ref(false)

const mainMenuVisible = ref(false)
// const activeNames = ref(false)

const { startNewGame } = useGameLifeCycle()

const closeMainMenu = () => {
  mainMenuVisible.value = false
}

const toggleRules = () => {
  showRules.value = !showRules.value
  console.log(showRules.value)
}

onMounted(() => {
  eventBus.on('toggle-main-menu', () => {
    mainMenuVisible.value = true
  })
})

onUnmounted(() => {
  eventBus.off('toggle-main-menu')
})

watch(mainMenuVisible, (newValue) => {
  eventBus.emit('untoggle-main-menu', newValue)
})

const showTour = ref(false)

console.log('First state: ', showTour.value)

const toggleTour = () => {
  // console.log('🖱️ How To Play button clicked')
  showTour.value = !showTour.value
  eventBus.emit('toggle-tour', showTour.value)
  mainMenuVisible.value = false // CAUSE OF BUG

  if (showTour.value) {
    gameStore.haltTurnTimer()
  } else {
    gameStore.resumeTurnTimer()
  }
}
</script>

<style scoped>
.main-menu-btns {
  width: 70%;
  cursor: pointer;
}
.main-menu-rules-btns {
  width: 81%;
  cursor: pointer;
}
.title-main-menu {
  margin-bottom: 0;
  font-size: 4rem;
  padding-bottom: 0.5em;
  color: #000;
}

.close-btn {
  padding-top: 1em;
  width: 40%;
  cursor: pointer;
}

.menu-btn-cont {
  align-items: center;
  display: flex;
  flex-direction: column;
}

.el-dialog__header.show-close {
  padding-right: 0;
}
.test {
  font-size: 50px;
  font-weight: bold;
}
.el-carousel__item h3 {
  color: #475669;
  opacity: 0.75;
  line-height: 300px;
  margin: 0;
  text-align: center;
}

.el-dialog__wrapper {
  display: flex;
  align-items: center; /* Vertically center the dialog */
  justify-content: center; /* Horizontally center the dialog */
}

.test {
  margin: 1em 0; /* Example styling for the guideline text */
}
</style>
