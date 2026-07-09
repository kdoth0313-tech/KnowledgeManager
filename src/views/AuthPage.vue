<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

const isFirstTime = computed(() => !authStore.isSetup)

async function handleSubmit(): Promise<void> {
  error.value = ''
  if (!password.value) {
    error.value = '请输入密码'
    return
  }

  loading.value = true

  try {
    if (isFirstTime.value) {
      // Set up password for the first time
      if (password.value.length < 4) {
        error.value = '密码至少4位'
        loading.value = false
        return
      }
      if (password.value !== confirmPassword.value) {
        error.value = '两次密码不一致'
        loading.value = false
        return
      }
      const ok = await authStore.setupPassword(password.value)
      if (ok) {
        router.replace({ name: 'home' })
      }
    } else {
      // Login with existing password
      const ok = await authStore.login(password.value)
      if (ok) {
        router.replace({ name: 'home' })
      } else {
        error.value = '密码错误'
      }
    }
  } catch {
    error.value = '出错了，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="auth-brand-icon">📚</span>
        <h1>KnowledgeManager</h1>
        <p v-if="isFirstTime">首次使用，请设置访问密码</p>
        <p v-else>请输入密码以访问知识库</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-field">
          <input
            v-model="password"
            type="password"
            class="form-input"
            :placeholder="isFirstTime ? '设置密码（至少4位）' : '输入密码'"
            autofocus
            @input="error = ''"
          />
        </div>

        <div v-if="isFirstTime" class="form-field">
          <input
            v-model="confirmPassword"
            type="password"
            class="form-input"
            placeholder="确认密码"
            @input="error = ''"
          />
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="form-btn" :disabled="loading">
          {{ loading ? '验证中...' : (isFirstTime ? '设置密码' : '登录') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.auth-card {
  width: 100%;
  max-width: 380px;
}

.auth-brand {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-brand-icon {
  font-size: 2.8rem;
  display: block;
  margin-bottom: 0.5rem;
}

.auth-brand h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.4rem;
}

.auth-brand p {
  color: var(--color-text-muted);
  font-size: 0.88rem;
}

.auth-form {
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.form-field {
  margin-bottom: 0.75rem;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--color-glass);
  color: var(--color-text);
  font-family: inherit;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-input::placeholder {
  color: var(--color-text-faint);
}

.form-error {
  color: var(--color-danger);
  font-size: 0.82rem;
  text-align: center;
  margin-bottom: 0.75rem;
  animation: shake 0.3s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.form-btn {
  width: 100%;
  padding: 0.65rem;
  border: none;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #6c5ce7, #a855f7);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--ease);
  box-shadow: 0 4px 16px rgba(108, 92, 231, 0.35);
}

.form-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(108, 92, 231, 0.45);
}

.form-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
