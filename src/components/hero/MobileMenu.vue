<script setup lang="ts">
// Мобильное меню на Popover API: открывается и без JS, остров только закрывает его по клику на ссылку.
// Макета открытого состояния пока нет — временный вид из токенов.
import { ref } from 'vue';

// два корневых элемента (кнопка и панель) — служебные атрибуты Astro не наследуем
defineOptions({ inheritAttrs: false });

defineProps<{ links: { href: string; label: string }[]; contact: { href: string; label: string } }>();

const panel = ref<HTMLElement>();
const close = () => panel.value?.hidePopover?.();
</script>

<template>
  <button class="burger" type="button" popovertarget="mobile-menu" aria-controls="mobile-menu" aria-label="Меню">
    <slot name="icon" />
  </button>
  <nav id="mobile-menu" ref="panel" class="menu" popover aria-label="Меню">
    <ul class="menu__list">
      <li v-for="link in links" :key="link.href">
        <a class="menu__link" :href="link.href" @click="close">{{ link.label }}</a>
      </li>
    </ul>
    <a class="menu__contact" :href="contact.href" @click="close">
      {{ contact.label }}
      <slot name="arrow" />
    </a>
  </nav>
</template>

<style scoped>
.burger {
  display: grid;
  place-items: center;
  /* иконка 24 px, зона нажатия 44 px */
  width: 44px;
  height: 44px;
  margin: -10px;
  color: var(--color-accent);
  cursor: pointer;
}

.burger:focus-visible,
.menu a:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

.menu {
  pointer-events: auto; /* слой сцены вокруг пропускает клики */
  inset: 96px 0 0;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 32px 20px;
  border: 0;
  background: var(--color-bg);
  color: var(--color-text);
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    overlay 0.2s allow-discrete,
    display 0.2s allow-discrete;
}

.menu:popover-open {
  display: flex;
  flex-direction: column;
  gap: 32px;
  opacity: 1;
  transform: none;
}

@starting-style {
  .menu:popover-open {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.menu__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.menu__link {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}

.menu__contact {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid currentColor;
  color: var(--color-accent);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
</style>
